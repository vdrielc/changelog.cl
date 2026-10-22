// Fetching a repository: .cldef -> .cllst files -> changed .cl files.
//
// Everything is downloaded into a staging directory first and swapped in only when the
// whole fetch succeeds, so a failed fetch never damages the existing offline copy.

import fs from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import * as records from './records.js';
import { isSafeName, sha1, sha1File } from './store.js';
import { VERSION } from './version.js';

export const USER_AGENT = `changelog.cl/${VERSION} (+https://github.com/vdrielc/changelog.cl)`;
const TIMEOUT_MS = 30_000;

export class FetchError extends Error {
  constructor(message) {
    super(message);
    this.name = 'FetchError';
  }
}

/** Default getter: http(s) via fetch, plus file:// for local or offline repositories. */
export async function get(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new FetchError(`Invalid URL ${JSON.stringify(url)}`);
  }
  if (parsed.protocol === 'file:') {
    try {
      return await readFile(fileURLToPath(parsed));
    } catch (err) {
      throw new FetchError(`${url}: ${err.code === 'ENOENT' ? 'file not found' : err.message}`);
    }
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new FetchError(`Unsupported URL scheme in ${JSON.stringify(url)}`);
  }
  let response;
  try {
    response = await fetch(parsed, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    const reason = err.name === 'TimeoutError' ? 'timed out' : (err.cause?.code ?? err.cause?.message ?? err.message);
    throw new FetchError(`${url}: ${reason}`);
  }
  if (!response.ok) throw new FetchError(`${url}: HTTP ${response.status} ${response.statusText}`.trimEnd());
  return Buffer.from(await response.arrayBuffer());
}

function decode(data, url) {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(data);
  } catch {
    throw new FetchError(`${url}: not valid UTF-8 text`);
  }
}

function resolve(relative, base) {
  try {
    return new URL(relative, base).href;
  } catch {
    throw new FetchError(`${base}: invalid URL ${JSON.stringify(relative)}`);
  }
}

function findCaseInsensitive(dir, fileName) {
  if (!fs.existsSync(dir)) return null;
  const wanted = fileName.toLowerCase();
  const hit = fs.readdirSync(dir).find((f) => f.toLowerCase() === wanted);
  return hit ? path.join(dir, hit) : null;
}

/**
 * Fetch one repository into the store. `getter` can be swapped out in tests.
 * Returns { repo, lists, downloaded, unchanged, removed, warnings }.
 */
export async function fetchRepo(store, repo, getter = get) {
  const result = { repo: repo.name, lists: 0, downloaded: [], unchanged: [], removed: [], warnings: [] };
  const finalDir = store.repoDir(repo.name);
  const staging = finalDir + '.fetching';
  fs.rmSync(staging, { recursive: true, force: true });
  fs.mkdirSync(path.join(staging, 'lists'), { recursive: true });
  fs.mkdirSync(path.join(staging, 'cl'));

  try {
    // 1. Definition
    const cldefUrl = repo.definitionUrl;
    const cldefBytes = await getter(cldefUrl);
    const cldef = records.parseOne(decode(cldefBytes, cldefUrl), cldefUrl);
    fs.writeFileSync(path.join(staging, `${repo.name}.cldef`), cldefBytes);

    const listUrls = cldef.get('cllstFileList').split(/\s+/).filter(Boolean).map((u) => resolve(u, cldefUrl));
    if (!listUrls.length) throw new FetchError(`${cldefUrl}: cllstFileList is empty`);

    // 2. Lists, stored as 000.cllst, 001.cllst ... to keep .cldef order and avoid clashes
    //    between same-named lists on different hosts. clFileURLs are made absolute so the
    //    local copy is self-contained.
    const wanted = new Map(); // lower-case id -> { appId, clUrl, hash }
    for (const [index, listUrl] of listUrls.entries()) {
      const entries = records.parse(decode(await getter(listUrl), listUrl), listUrl);
      for (const rec of entries) {
        const appId = rec.get('ApplicationID');
        const clUrl = rec.get('clFileURL');
        if (!appId || !clUrl) {
          result.warnings.push(`${listUrl}: entry without ApplicationID/clFileURL skipped`);
          continue;
        }
        if (!isSafeName(appId)) {
          result.warnings.push(`${listUrl}: invalid ApplicationID ${JSON.stringify(appId)} skipped`);
          continue;
        }
        rec.set('clFileURL', resolve(clUrl, listUrl));
        if (wanted.has(appId.toLowerCase())) {
          result.warnings.push(`${listUrl}: duplicate ApplicationID ${JSON.stringify(appId)} ignored (first listing wins)`);
          continue;
        }
        wanted.set(appId.toLowerCase(), { appId, clUrl: rec.get('clFileURL'), hash: rec.get('Hash').toLowerCase() });
      }
      const name = `${String(index).padStart(3, '0')}.cllst`;
      fs.writeFileSync(path.join(staging, 'lists', name), records.dump(entries, `Fetched from ${listUrl}`), 'utf8');
      result.lists += 1;
    }

    // 3. Changelogs: reuse local copies whose hash matches, download the rest.
    for (const { appId, clUrl, hash } of wanted.values()) {
      const existing = findCaseInsensitive(path.join(finalDir, 'cl'), `${appId}.cl`);
      const target = path.join(staging, 'cl', `${appId}.cl`);
      if (existing && hash && sha1File(existing) === hash) {
        fs.copyFileSync(existing, target);
        result.unchanged.push(appId);
        continue;
      }
      const data = await getter(clUrl);
      const actual = sha1(data);
      if (hash && actual !== hash) {
        result.warnings.push(
          `${appId}: downloaded file does not match the Hash in its .cllst ` +
            `(expected ${hash.slice(0, 10)}..., got ${actual.slice(0, 10)}...); ` +
            (existing ? 'kept the previous copy' : 'not stored'),
        );
        if (existing) fs.copyFileSync(existing, target);
        continue;
      }
      fs.writeFileSync(target, data);
      result.downloaded.push(appId);
    }

    const oldCl = path.join(finalDir, 'cl');
    if (fs.existsSync(oldCl)) {
      const kept = new Set(fs.readdirSync(path.join(staging, 'cl')).map((f) => f.toLowerCase()));
      result.removed = fs
        .readdirSync(oldCl)
        .filter((f) => f.endsWith('.cl') && !kept.has(f.toLowerCase()))
        .map((f) => f.slice(0, -3))
        .sort();
    }

    // 4. Swap the staged copy in.
    const backup = finalDir + '.old';
    fs.rmSync(backup, { recursive: true, force: true });
    if (fs.existsSync(finalDir)) fs.renameSync(finalDir, backup);
    fs.renameSync(staging, finalDir);
    fs.rmSync(backup, { recursive: true, force: true });
  } catch (err) {
    fs.rmSync(staging, { recursive: true, force: true });
    throw err;
  }

  store.markFetched(repo.name);
  return result;
}
