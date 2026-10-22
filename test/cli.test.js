import assert from 'node:assert/strict';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';

import { normalise } from '../src/cli.js';
import { dataDir, definitionUrl } from '../src/store.js';
import { cli, EXAMPLE_DIR } from './helpers.js';

const EXAMPLE_URL = pathToFileURL(EXAMPLE_DIR).href + '/';

async function fetched(t) {
  const cl = cli(t);
  const r = await cl('repo', 'add', 'public.changelog.cl', EXAMPLE_URL, '--fetch');
  assert.equal(r.code, 0, r.err);
  return cl;
}

test('commands are case-insensitive and aliased', () => {
  assert.deepEqual(normalise(['List', 'Applications']), ['list', 'applications']);
  assert.deepEqual(normalise(['Repos', 'RM', 'X']), ['repo', 'remove', 'X']);
  assert.deepEqual(normalise(['Help', 'Show']), ['help', 'show']);
  assert.deepEqual(normalise(['show', 'Com.Example', '-ur']), ['show', 'Com.Example', '-ur']);
});

test('definition URL is derived from a directory URL or used as given', () => {
  assert.equal(definitionUrl('https://x.org/repository/', 'pub'), 'https://x.org/repository/pub.cldef');
  assert.equal(definitionUrl('https://x.org/a/my.cldef', 'pub'), 'https://x.org/a/my.cldef');
});

test('data directory follows CL_HOME and platform conventions', () => {
  assert.match(dataDir({ CL_HOME: '/tmp/x' }), /x$/);
  assert.match(dataDir({ APPDATA: 'C:\\Users\\a\\AppData\\Roaming' }, 'win32'), /changelog\.cl$/);
  assert.equal(dataDir({ XDG_DATA_HOME: '/data' }, 'linux'), '/data/changelog.cl');
});

test('list applications, versions and repos', async (t) => {
  const cl = await fetched(t);
  let r = await cl('List', 'Applications');
  assert.match(r.out, /^\| Application +\| Application ID +\| Repository +\| Last Updated +\| Latest Version +\| URL/);
  assert.match(r.out, /\| Example Widgets +\| com\.example\.widgets +\| public\.changelog\.cl \| 2026-09-14 +\| 2\.1\.0 /);

  r = await cl('list', 'applications', '--search', 'weather', '--json');
  assert.deepEqual(JSON.parse(r.out).map((a) => a.id), ['org.example.weather-api']);

  r = await cl('list', 'versions', 'com.example.widgets');
  assert.match(r.out, /\| 2\.0\.1 +\| 2026-08-02 +\| Yanked /);

  r = await cl('list', 'repos', '--json');
  assert.equal(JSON.parse(r.out)[0].fetchRequired, false);
});

test('show modes', async (t) => {
  const cl = await fetched(t);
  let r = await cl('show', 'com.example.widgets');
  assert.ok(r.out.startsWith('com.example.widgets | Example Widgets | public.changelog.cl\n'));
  assert.match(r.out, /## \[2\.1\.0\]/);
  assert.doesNotMatch(r.out, /Unreleased|## \[2\.0\.0/);

  assert.match((await cl('show', 'com.example.widgets', '-ur')).out, /Dark mode/);
  assert.match((await cl('show', 'com.example.widgets', '--yanked')).out, /2\.0\.1.*YANKED/);
  assert.match((await cl('show', 'com.example.widgets', '-s', '1.4.0')).out, /CSV export/);
  assert.match((await cl('show', 'com.example.widgets', '-f')).out, /1\.4\.0[\s\S]*\[1\.4\.0\]: /);

  r = await cl('show', 'com.example.widgets', '-q');
  assert.ok(r.out.startsWith('# Changelog'));

  r = await cl('show', 'org.example.weather-api', '-ur');
  assert.equal(r.code, 1);
  assert.match(r.err, /no unreleased changes/);

  r = await cl('show', 'com.example.widgets', '-f', '-y');
  assert.equal(r.code, 2);
});

test('application IDs in several repositories need --repo', async (t) => {
  const cl = await fetched(t);
  await cl('repo', 'add', 'mirror', EXAMPLE_URL + 'public.changelog.cl.cldef', '--fetch');
  let r = await cl('show', 'cl.changelog');
  assert.equal(r.code, 1);
  assert.match(r.err, /Please use --repo or -r, application ID conflict encountered/);
  r = await cl('show', 'cl.changelog', '-r', 'mirror');
  assert.ok(r.out.startsWith('cl.changelog | Changelog.cl | mirror'));
});

test('repo update and remove', async (t) => {
  const cl = await fetched(t);
  let r = await cl('repo', 'update', 'public.changelog.cl', '-n', 'repo.changelog.cl');
  assert.equal(r.code, 0, r.err);
  // Renaming keeps the fetched data and the .cldef URL.
  assert.match((await cl('show', 'cl.changelog')).out, /\| repo\.changelog\.cl/);
  assert.equal((await cl('repo', 'fetch', 'repo.changelog.cl')).code, 0);

  r = await cl('repo', 'update', 'repo.changelog.cl', '-u', 'https://example.invalid/');
  assert.match((await cl('list', 'repos')).out, /Never +\| Yes/);

  r = await cl('repo', 'remove', 'repo.changelog.cl');
  assert.equal(r.code, 0);
  assert.match((await cl('list', 'repos')).out, /No repositories registered/);
  assert.equal((await cl('repo', 'remove', 'nope')).code, 1);
});

test('usage errors and help', async (t) => {
  const cl = cli(t);
  assert.equal((await cl('repo', 'fetch')).code, 2);
  assert.equal((await cl('repo', 'add', 'only-name')).code, 2);
  assert.equal((await cl('repo', 'add', '../evil', 'http://x/')).code, 1);
  assert.equal((await cl('bogus')).code, 2);
  assert.match((await cl('help', 'Show')).out, /--unreleased/);
  assert.match((await cl('show', '--help')).out, /--unreleased/);
  assert.match((await cl()).out, /Commands:/);
  assert.match((await cl('--version')).out, /^changelog\.cl \d+\.\d+\.\d+$/);
  assert.match((await cl('show', 'x')).err, /cl repo fetch -a/);
});
