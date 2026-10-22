// The `cl` command line interface. See design/command-line.md.

import fs from 'node:fs';
import { parseArgs } from 'node:util';

import * as changelog from './changelog.js';
import { FetchError, fetchRepo } from './fetch.js';
import { table, toJson } from './output.js';
import { FormatError } from './records.js';
import { Store, StoreError } from './store.js';
import { VERSION } from './version.js';

export class CLIError extends Error {
  constructor(message, code = 1) {
    super(message);
    this.name = 'CLIError';
    this.code = code;
  }
}

// -- help text ----------------------------------------------------------------

const HELP = {
  '': `changelog.cl ${VERSION}: fetch and read functional changelogs from self-hosted repositories.

Usage: cl COMMAND [options]

Commands:
  list applications             List applications in all fetched repositories
  list versions APP_ID          List the versions of an application
  list repos                    List registered repositories
  show APP_ID                   Show an application's changelog (latest release by default)
  repo add NAME URL             Register a repository
  repo update NAME [-u URL] [-n NEW_NAME]
  repo remove NAME              Unregister a repository and delete its local copy
  repo fetch [NAME | -a]        Download the latest changes from one or all repositories
  help [COMMAND]                Show help for a command, e.g. "cl help show"

Options:
  -h, --help                    Show help
  -v, --version                 Show the version

Commands are case-insensitive: "cl List Applications" works too.
Data is stored in {dataDir} (override with CL_HOME).`,

  list: `Usage: cl list applications | versions APP_ID | repos

  applications   List applications in all fetched repositories
  versions       List the versions of an application
  repos          List registered repositories

See "cl help list applications" and friends for options.`,

  'list applications': `Usage: cl list applications [-r REPO] [--search TEXT] [--json]

List the applications in all fetched repositories.

  -r, --repo REPO     Only this repository
  --search TEXT       Only applications whose ID or name contains TEXT
  --json              Output JSON`,

  'list versions': `Usage: cl list versions APP_ID [-r REPO] [--json]

List the versions in an application's changelog, newest first.

  -r, --repo REPO     Repository to use if the ID exists in several
  --json              Output JSON`,

  'list repos': `Usage: cl list repos [--json]

List registered repositories, when they were last fetched and whether a fetch is
required (never fetched, local files missing or changed, or older than 7 days).

  --json              Output JSON`,

  show: `Usage: cl show APP_ID [mode] [-r REPO] [-q]

Show changelog entries for APP_ID as Markdown.

Mode (pick one; default --latest):
  -l,  --latest            Latest released, non-yanked version
  -ur, --unreleased        The Unreleased section
  -y,  --yanked            Yanked versions
  -f,  --full              The full changelog
  -s,  --specific VERSION  A specific version

Options:
  -r, --repo REPO          Repository to use if the ID exists in several
  -q, --quiet              Omit the "APP_ID | name | repository" header line

Example: cl show com.keepachangelog -s 0.0.1 -r public.changelog.cl`,

  repo: `Usage: cl repo add | update | remove | fetch ...

  add NAME URL                       Register a repository
  update NAME [-u URL] [-n NEW_NAME] Change a repository's URL or name
  remove NAME                        Unregister a repository and delete its local copy
  fetch [NAME | -a]                  Download the latest changes`,

  'repo add': `Usage: cl repo add NAME URL [--fetch]

Register a repository. URL is the directory containing NAME.cldef, or the full
URL of a .cldef file. http(s):// and file:// URLs are supported.

  --fetch             Fetch it straight away

Example: cl repo add public.changelog.cl https://public.changelog.cl/repository/`,

  'repo update': `Usage: cl repo update NAME [-u NEW_URL] [-n NEW_NAME]

  -u, --url NEW_URL   New URL (fetch again afterwards)
  -n, --name NEW_NAME New name`,

  'repo remove': `Usage: cl repo remove NAME

Unregister a repository and delete its local copy.`,

  'repo fetch': `Usage: cl repo fetch NAME
       cl repo fetch -a

Download a repository's .cldef and .cllst files, then any .cl files that are new
or whose hash changed. If the fetch fails the previous local copy is kept.

  -a, --all           Fetch all repositories`,
};

// -- argument handling ----------------------------------------------------------

const ALIASES = {
  list: {
    applications: 'applications', application: 'applications', apps: 'applications', app: 'applications',
    versions: 'versions', version: 'versions',
    repos: 'repos', repo: 'repos', repositories: 'repos', repository: 'repos',
  },
  repo: { add: 'add', update: 'update', remove: 'remove', rm: 'remove', delete: 'remove', fetch: 'fetch' },
};

/** Lower-case and alias the command words so "cl List Applications" works. */
export function normalise(argv) {
  const args = [...argv];
  if (!args.length || args[0].startsWith('-')) return args;
  args[0] = args[0].toLowerCase();
  if (args[0] === 'repos') args[0] = 'repo';
  if (ALIASES[args[0]] && args[1] && !args[1].startsWith('-')) {
    args[1] = ALIASES[args[0]][args[1].toLowerCase()] ?? args[1];
  }
  if (args[0] === 'help') return ['help', ...normalise(args.slice(1).map((a) => a.toLowerCase()))];
  return args;
}

function parse(args, options, { min = 0, max = min, usage }) {
  let parsed;
  try {
    parsed = parseArgs({ args, options: { help: { type: 'boolean', short: 'h' }, ...options }, allowPositionals: true });
  } catch (err) {
    throw new CLIError(`${err.message.split('\n')[0]}\n${usage}`, 2);
  }
  if (parsed.values.help) return parsed;
  const n = parsed.positionals.length;
  if (n < min || n > max) throw new CLIError(`Wrong number of arguments.\n${usage}`, 2);
  return parsed;
}

const usageOf = (topic) => HELP[topic].split('\n')[0];

// -- commands -------------------------------------------------------------------

function findApp(store, appId, repoName) {
  if (repoName) store.getRepo(repoName); // validates the name
  const all = store.allApplications();
  const matches = all.filter(
    (a) => a.appId.toLowerCase() === appId.toLowerCase() && (!repoName || a.repo.toLowerCase() === repoName.toLowerCase()),
  );
  if (!matches.length) {
    const where = repoName ? ` in repository ${JSON.stringify(repoName)}` : '';
    const hint = all.length ? '' : " Run 'cl repo fetch -a' if you haven't fetched yet.";
    throw new CLIError(`Unknown application ID ${JSON.stringify(appId)}${where}. See: cl list applications.${hint}`);
  }
  if (matches.length > 1) {
    throw new CLIError(
      `Please use --repo or -r, application ID conflict encountered (${matches.map((a) => a.repo).join(', ')})`,
    );
  }
  const [app] = matches;
  if (!app.available) {
    throw new CLIError(`The changelog for ${JSON.stringify(app.appId)} has not been downloaded. Run: cl repo fetch ${app.repo}`);
  }
  return app;
}

const load = (app) => changelog.parse(fs.readFileSync(app.path, 'utf8'));

function listApplications(store, args, io) {
  const { values } = parse(args, { repo: { type: 'string', short: 'r' }, search: { type: 'string' }, json: { type: 'boolean' } }, { usage: usageOf('list applications') });
  if (values.help) return io.out(HELP['list applications']);
  let apps = values.repo ? store.applications(store.getRepo(values.repo)) : store.allApplications();
  if (values.search) {
    const needle = values.search.toLowerCase();
    apps = apps.filter((a) => a.appId.toLowerCase().includes(needle) || a.name.toLowerCase().includes(needle));
  }
  apps.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }) || a.repo.localeCompare(b.repo));
  if (values.json) {
    return io.out(toJson(apps.map((a) => ({
      application: a.name, id: a.appId, repository: a.repo,
      lastUpdated: a.lastChanged || null, latestVersion: a.latestVersion || null, url: a.url || null,
    }))));
  }
  if (!apps.length) {
    return io.out('No applications found.' + (store.repos().length ? '' : ' Add a repository first: cl repo add NAME URL'));
  }
  io.out(table(
    ['Application', 'Application ID', 'Repository', 'Last Updated', 'Latest Version', 'URL'],
    apps.map((a) => [a.name, a.appId, a.repo, a.lastChanged, a.latestVersion, a.url]),
  ));
}

function listVersions(store, args, io) {
  const { values, positionals } = parse(args, { repo: { type: 'string', short: 'r' }, json: { type: 'boolean' } }, { min: 1, usage: usageOf('list versions') });
  if (values.help) return io.out(HELP['list versions']);
  const app = findApp(store, positionals[0], values.repo);
  const rows = load(app).versions.map((v) => ({ version: v.version, releaseDate: v.date || null, status: v.status, repository: app.repo }));
  if (values.json) return io.out(toJson({ application: app.name, id: app.appId, versions: rows }));
  io.out(`${app.name}\n${app.appId}\n`);
  if (!rows.length) return io.out('No versions found in this changelog.');
  io.out(table(['Version', 'Release Date', 'Status', 'Repository'], rows.map((r) => [r.version, r.releaseDate, r.status, r.repository])));
}

function listRepos(store, args, io) {
  const { values } = parse(args, { json: { type: 'boolean' } }, { usage: usageOf('list repos') });
  if (values.help) return io.out(HELP['list repos']);
  const repos = store.repos();
  if (values.json) {
    return io.out(toJson(repos.map((r) => ({ repository: r.name, url: r.url, lastFetch: r.lastFetch || null, fetchRequired: store.fetchRequired(r) }))));
  }
  if (!repos.length) return io.out('No repositories registered. Add one with: cl repo add NAME URL');
  io.out(table(
    ['Repository', 'URL', 'Last Fetch', 'Fetch Required'],
    repos.map((r) => [r.name, r.url, r.lastFetch ? r.lastFetch.slice(0, 10) : 'Never', store.fetchRequired(r) ? 'Yes' : 'No']),
  ));
}

function show(store, args, io) {
  // "-ur" is a two-letter short switch in the design; node's parser only takes one letter.
  args = args.map((a) => (a === '-ur' ? '--unreleased' : a));
  const { values, positionals } = parse(args, {
    latest: { type: 'boolean', short: 'l' },
    unreleased: { type: 'boolean' },
    yanked: { type: 'boolean', short: 'y' },
    full: { type: 'boolean', short: 'f' },
    specific: { type: 'string', short: 's' },
    repo: { type: 'string', short: 'r' },
    quiet: { type: 'boolean', short: 'q' },
  }, { min: 1, usage: usageOf('show') });
  if (values.help) return io.out(HELP.show);

  const modes = ['latest', 'unreleased', 'yanked', 'full', 'specific'].filter((m) => values[m] !== undefined);
  if (modes.length > 1) throw new CLIError(`Choose one of --${modes.join(', --')}`, 2);
  const mode = modes[0] ?? 'latest';

  const app = findApp(store, positionals[0], values.repo);
  const log = load(app);
  let body;
  if (mode === 'full') {
    body = log.raw.trimEnd();
  } else {
    let sections;
    if (mode === 'latest') {
      const latest = log.latest();
      if (!latest) throw new CLIError(`${app.appId} has no released versions yet. Try: cl show ${app.appId} --unreleased`);
      sections = [latest];
    } else if (mode === 'specific') {
      const found = log.find(values.specific);
      if (!found) throw new CLIError(`Version ${JSON.stringify(values.specific)} not found. See: cl list versions ${app.appId}`);
      sections = [found];
    } else if (mode === 'unreleased') {
      sections = log.unreleased();
      if (!sections.length) throw new CLIError(`${app.appId} has no unreleased changes`);
    } else {
      sections = log.yanked();
      if (!sections.length) throw new CLIError(`${app.appId} has no yanked versions`);
    }
    body = [log.preamble.trim(), ...sections.map((s) => s.render())].filter(Boolean).join('\n\n');
  }
  if (!values.quiet) io.out(`${app.appId} | ${app.name} | ${app.repo}\n`);
  io.out(body);
}

async function repo(store, args, io) {
  const action = args[0];
  const rest = args.slice(1);
  if (!action || action === '-h' || action === '--help') return io.out(HELP.repo);

  if (action === 'add') {
    const { values, positionals } = parse(rest, { fetch: { type: 'boolean' } }, { min: 2, usage: usageOf('repo add') });
    if (values.help) return io.out(HELP['repo add']);
    const added = store.addRepo(positionals[0], positionals[1]);
    io.out(`Added ${added.name} (${added.definitionUrl})`);
    if (values.fetch) return doFetch(store, [added.name], io);
    io.out(`Run 'cl repo fetch ${added.name}' to download it.`);
    return 0;
  }
  if (action === 'update') {
    const { values, positionals } = parse(rest, { url: { type: 'string', short: 'u' }, name: { type: 'string', short: 'n' } }, { min: 1, usage: usageOf('repo update') });
    if (values.help) return io.out(HELP['repo update']);
    if (!values.url && !values.name) throw new CLIError('Nothing to update: use -u NEW_URL and/or -n NEW_NAME', 2);
    const updated = store.updateRepo(positionals[0], { url: values.url, newName: values.name });
    io.out(`Updated ${updated.name} (${updated.url})`);
    if (values.url) io.out(`The URL changed; run 'cl repo fetch ${updated.name}' to refresh.`);
    return 0;
  }
  if (action === 'remove') {
    const { values, positionals } = parse(rest, {}, { min: 1, usage: usageOf('repo remove') });
    if (values.help) return io.out(HELP['repo remove']);
    io.out(`Removed ${store.removeRepo(positionals[0]).name}`);
    return 0;
  }
  if (action === 'fetch') {
    const { values, positionals } = parse(rest, { all: { type: 'boolean', short: 'a' } }, { max: 1, usage: usageOf('repo fetch') });
    if (values.help) return io.out(HELP['repo fetch']);
    if (positionals.length && values.all) throw new CLIError('Use either a repository NAME or -a, not both', 2);
    if (!positionals.length && !values.all) throw new CLIError('Specify a repository NAME, or -a to fetch all', 2);
    const names = values.all ? store.repos().map((r) => r.name) : positionals;
    if (!names.length) {
      io.out('No repositories registered. Add one with: cl repo add NAME URL');
      return 0;
    }
    return doFetch(store, names, io);
  }
  throw new CLIError(`Unknown repo action ${JSON.stringify(action)}.\n${HELP.repo}`, 2);
}

async function doFetch(store, names, io) {
  let failures = 0;
  for (const name of names) {
    const r = store.getRepo(name);
    let result;
    try {
      result = await fetchRepo(store, r, io.get);
    } catch (err) {
      if (!(err instanceof FetchError || err instanceof FormatError)) throw err;
      failures += 1;
      io.err(`${r.name}: fetch failed: ${err.message}`);
      io.err(`${r.name}: the previous local copy (if any) was kept.`);
      continue;
    }
    const apps = result.downloaded.length + result.unchanged.length;
    let summary = `${result.repo}: ${apps} application(s) from ${result.lists} list(s); ` +
      `${result.downloaded.length} downloaded, ${result.unchanged.length} unchanged`;
    if (result.removed.length) summary += `, ${result.removed.length} removed`;
    io.out(summary);
    for (const w of result.warnings) io.err(`  warning: ${w}`);
  }
  return failures ? 3 : 0;
}

// -- entry point ------------------------------------------------------------------

/**
 * Run the CLI. Returns the exit code: 0 ok, 1 error, 2 usage error, 3 fetch failed.
 * `io` lets tests capture output and replace the network getter.
 */
export async function main(argv = process.argv.slice(2), io = {}) {
  const out = io.out ?? ((s) => process.stdout.write(s + '\n'));
  const err = io.err ?? ((s) => process.stderr.write(s + '\n'));
  const ctx = { out, err, get: io.get };
  const store = io.store ?? new Store();
  const args = normalise(argv);
  const [command, sub, ...rest] = args;

  try {
    if (!command || command === '-h' || command === '--help') {
      out(HELP[''].replace('{dataDir}', store.root));
    } else if (command === '-v' || command === '--version') {
      out(`changelog.cl ${VERSION}`);
    } else if (command === 'help') {
      const topic = args.slice(1).join(' ');
      if (!(topic in HELP)) throw new CLIError(`No help for ${JSON.stringify(topic)}. Try: cl help`);
      out(HELP[topic].replace('{dataDir}', store.root));
    } else if (command === 'list') {
      const handlers = { applications: listApplications, versions: listVersions, repos: listRepos };
      if (!sub || sub === '-h' || sub === '--help') out(HELP.list);
      else if (!handlers[sub]) throw new CLIError(`Unknown list ${JSON.stringify(sub)}.\n${HELP.list}`, 2);
      else handlers[sub](store, rest, ctx);
    } else if (command === 'show') {
      show(store, args.slice(1), ctx);
    } else if (command === 'repo') {
      return (await repo(store, args.slice(1), ctx)) ?? 0;
    } else {
      throw new CLIError(`Unknown command ${JSON.stringify(command)}. Try: cl help`, 2);
    }
  } catch (e) {
    if (e instanceof CLIError || e instanceof StoreError || e instanceof FormatError) {
      err(`cl: error: ${e.message}`);
      return e.code ?? 1;
    }
    throw e;
  }
  return 0;
}
