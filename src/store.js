// Local storage: registered repositories and their fetched copies.
//
// Layout (under the data directory, see dataDir()):
//
//   repos.conf                      registered repositories (record syntax)
//   repos/<name>/<name>.cldef       fetched definition
//   repos/<name>/lists/<n>.cllst    fetched list files, in .cldef order
//   repos/<name>/cl/<app_id>.cl     fetched changelogs

import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import * as records from './records.js';

export const STALE_AFTER_DAYS = 7;
const SAFE_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

export class StoreError extends Error {
  constructor(message) {
    super(message);
    this.name = 'StoreError';
  }
}

/** Where changelog.cl keeps its state. Override with the CL_HOME environment variable. */
export function dataDir(env = process.env, platform = process.platform) {
  if (env.CL_HOME) return path.resolve(env.CL_HOME.replace(/^~(?=$|[\\/])/, os.homedir()));
  if (platform === 'win32') {
    return path.join(env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), 'changelog.cl');
  }
  if (platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Application Support', 'changelog.cl');
  }
  return path.join(env.XDG_DATA_HOME || path.join(os.homedir(), '.local', 'share'), 'changelog.cl');
}

export function isSafeName(name) {
  return SAFE_NAME.test(name);
}

export function checkName(name, what = 'name') {
  if (!isSafeName(name)) {
    throw new StoreError(`Invalid ${what} ${JSON.stringify(name)}: use letters, digits, '.', '-' and '_' only`);
  }
  return name;
}

export function sha1(data) {
  return createHash('sha1').update(data).digest('hex');
}

export function sha1File(file) {
  return sha1(fs.readFileSync(file));
}

/**
 * The .cldef URL for a repository added as `cl repo add NAME URL`. A URL ending in
 * .cldef is used as is; otherwise it is a directory containing NAME.cldef.
 */
export function definitionUrl(url, name) {
  if (/\.cldef$/i.test(url.split('?')[0])) return url;
  return url.replace(/\/+$/, '') + '/' + name + '.cldef';
}

export class Store {
  constructor(root = dataDir()) {
    this.root = root;
  }

  // -- repository registry --------------------------------------------------

  get configPath() {
    return path.join(this.root, 'repos.conf');
  }

  repos() {
    if (!fs.existsSync(this.configPath)) return [];
    const text = fs.readFileSync(this.configPath, 'utf8');
    return records.parse(text, this.configPath).map((r) => ({
      name: r.get('Name'),
      url: r.get('URL'),
      definitionUrl: r.get('DefinitionURL') || definitionUrl(r.get('URL'), r.get('Name')),
      lastFetch: r.get('LastFetch'),
    }));
  }

  saveRepos(repos) {
    fs.mkdirSync(this.root, { recursive: true });
    const recs = repos.map((r) => {
      const rec = new records.Record([
        ['Name', r.name],
        ['URL', r.url],
        ['DefinitionURL', r.definitionUrl],
      ]);
      if (r.lastFetch) rec.set('LastFetch', r.lastFetch);
      return rec;
    });
    const text = records.dump(recs, 'Repositories registered with changelog.cl. Managed by `cl repo`.');
    const tmp = this.configPath + '.tmp';
    fs.writeFileSync(tmp, text, 'utf8');
    fs.renameSync(tmp, this.configPath);
  }

  getRepo(name) {
    const repo = this.repos().find((r) => r.name.toLowerCase() === name.toLowerCase());
    if (!repo) throw new StoreError(`Unknown repository ${JSON.stringify(name)}. See: cl list repos`);
    return repo;
  }

  addRepo(name, url) {
    checkName(name, 'repository name');
    const repos = this.repos();
    if (repos.some((r) => r.name.toLowerCase() === name.toLowerCase())) {
      throw new StoreError(`Repository ${JSON.stringify(name)} already exists. Use: cl repo update`);
    }
    const repo = { name, url, definitionUrl: definitionUrl(url, name), lastFetch: '' };
    this.saveRepos([...repos, repo]);
    return repo;
  }

  updateRepo(name, { url, newName } = {}) {
    const repos = this.repos();
    const repo = this.getRepo(name);
    const index = repos.findIndex((r) => r.name === repo.name);
    if (newName && newName.toLowerCase() !== repo.name.toLowerCase()) {
      checkName(newName, 'repository name');
      if (repos.some((r) => r.name.toLowerCase() === newName.toLowerCase())) {
        throw new StoreError(`Repository ${JSON.stringify(newName)} already exists`);
      }
      const oldDir = this.repoDir(repo.name);
      const oldDef = path.join(oldDir, `${repo.name}.cldef`);
      if (fs.existsSync(oldDef)) fs.renameSync(oldDef, path.join(oldDir, `${newName}.cldef`));
      if (fs.existsSync(oldDir)) fs.renameSync(oldDir, this.repoDir(newName));
      repo.name = newName;
    } else if (newName) {
      repo.name = newName; // case-only change
    }
    // The .cldef URL is kept on a rename so the repository keeps working.
    if (url) {
      repo.url = url;
      repo.definitionUrl = definitionUrl(url, repo.name);
      repo.lastFetch = ''; // the local copy came from the old URL
    }
    repos[index] = repo;
    this.saveRepos(repos);
    return repo;
  }

  removeRepo(name) {
    const repo = this.getRepo(name);
    this.saveRepos(this.repos().filter((r) => r.name !== repo.name));
    fs.rmSync(this.repoDir(repo.name), { recursive: true, force: true });
    return repo;
  }

  markFetched(name, when = new Date()) {
    const stamp = when.toISOString().replace(/\.\d{3}Z$/, 'Z');
    this.saveRepos(this.repos().map((r) => (r.name === name ? { ...r, lastFetch: stamp } : r)));
  }

  // -- fetched content ------------------------------------------------------

  repoDir(name) {
    return path.join(this.root, 'repos', checkName(name, 'repository name'));
  }

  /**
   * Applications listed by a repository's fetched .cllst files, in list order.
   * If two lists in one repository name the same ApplicationID the first wins.
   */
  applications(repo) {
    const base = this.repoDir(repo.name);
    const listsDir = path.join(base, 'lists');
    if (!fs.existsSync(listsDir)) return [];
    const apps = new Map();
    const files = fs.readdirSync(listsDir).filter((f) => f.endsWith('.cllst')).sort();
    for (const file of files) {
      const full = path.join(listsDir, file);
      for (const rec of records.parse(fs.readFileSync(full, 'utf8'), full)) {
        const appId = rec.get('ApplicationID');
        if (!appId || !isSafeName(appId) || apps.has(appId.toLowerCase())) continue;
        const clPath = path.join(base, 'cl', `${appId}.cl`);
        apps.set(appId.toLowerCase(), {
          appId,
          name: rec.get('ApplicationName') || appId,
          url: rec.get('ApplicationURL'),
          repo: repo.name,
          lastChanged: rec.get('LastChangedDate'),
          latestVersion: rec.get('LatestVersion'),
          hash: rec.get('Hash').toLowerCase(),
          clUrl: rec.get('clFileURL'),
          path: clPath,
          available: fs.existsSync(clPath),
        });
      }
    }
    return [...apps.values()];
  }

  allApplications() {
    return this.repos().flatMap((r) => this.applications(r));
  }

  /** True if the local copy is missing, incomplete or older than STALE_AFTER_DAYS. */
  fetchRequired(repo, now = new Date()) {
    if (!repo.lastFetch) return true;
    const fetched = new Date(repo.lastFetch);
    if (Number.isNaN(fetched.getTime())) return true;
    if ((now - fetched) / 86_400_000 >= STALE_AFTER_DAYS) return true;
    return this.applications(repo).some((a) => !a.available || (a.hash && sha1File(a.path) !== a.hash));
  }
}
