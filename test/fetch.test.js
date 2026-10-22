import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';

import { sha1File } from '../src/store.js';
import { cli, copyExample, EXAMPLE_DIR, serve } from './helpers.js';

function setHash(repoDir, listFile, appId, hash) {
  const file = path.join(repoDir, listFile);
  const text = fs.readFileSync(file, 'utf8');
  const re = new RegExp(`(ApplicationID: ${appId.replace(/\./g, '\\.')}[\\s\\S]*?Hash: )[0-9a-f]*`);
  fs.writeFileSync(file, text.replace(re, `$1${hash}`));
}

test('example repository hashes are up to date (run npm run build-example)', () => {
  for (const list of ['libraries.cllst', 'opensource.cllst']) {
    const text = fs.readFileSync(path.join(EXAMPLE_DIR, list), 'utf8');
    for (const [, file, hash] of text.matchAll(/clFileURL: (\S+)[\s\S]*?Hash: ([0-9a-f]+)/g)) {
      assert.equal(sha1File(path.join(EXAMPLE_DIR, file)), hash, file);
    }
  }
});

test('fetches over HTTP, then only downloads what changed', async (t) => {
  const repoDir = copyExample(t);
  const base = await serve(t, repoDir);
  const cl = cli(t);

  let r = await cl('repo', 'add', 'public.changelog.cl', base, '--fetch');
  assert.equal(r.code, 0, r.err);
  assert.match(r.out, /3 application\(s\) from 2 list\(s\); 3 downloaded, 0 unchanged/);

  r = await cl('repo', 'fetch', 'public.changelog.cl');
  assert.match(r.out, /0 downloaded, 3 unchanged/);

  // Publish a new version of one changelog.
  const widgets = path.join(repoDir, 'com.example.widgets.cl');
  fs.writeFileSync(widgets, fs.readFileSync(widgets, 'utf8').replace('## [Unreleased]', '## [Unreleased]\n\n## [2.2.0] - 2026-10-20\n- New'));
  setHash(repoDir, 'libraries.cllst', 'com.example.widgets', sha1File(widgets));

  r = await cl('repo', 'fetch', '-a');
  assert.match(r.out, /1 downloaded, 2 unchanged/);
  r = await cl('show', 'com.example.widgets', '-q');
  assert.match(r.out, /## \[2\.2\.0\] - 2026-10-20/);
});

test('a .cl file that does not match its hash is not stored', async (t) => {
  const repoDir = copyExample(t);
  setHash(repoDir, 'libraries.cllst', 'com.example.widgets', '0'.repeat(40));
  const cl = cli(t);
  await cl('repo', 'add', 'pub', pathToFileURL(repoDir).href + '/public.changelog.cl.cldef');
  const r = await cl('repo', 'fetch', 'pub');
  assert.equal(r.code, 0);
  assert.match(r.err, /com\.example\.widgets: downloaded file does not match the Hash/);
  assert.match(r.out, /2 application\(s\)/);
  assert.match((await cl('show', 'com.example.widgets')).err, /has not been downloaded/);
});

test('a failed fetch keeps the previous offline copy', async (t) => {
  const repoDir = copyExample(t);
  const cl = cli(t);
  await cl('repo', 'add', 'pub', pathToFileURL(repoDir).href + '/public.changelog.cl.cldef', '--fetch');

  fs.rmSync(path.join(repoDir, 'libraries.cllst')); // breaks the next fetch half way
  const r = await cl('repo', 'fetch', 'pub');
  assert.equal(r.code, 3);
  assert.match(r.err, /fetch failed: .*libraries\.cllst: file not found/);
  assert.match((await cl('show', 'org.example.weather-api', '-q')).out, /## \[3\.0\.0\]/);
});

test('removed applications disappear after a fetch', async (t) => {
  const repoDir = copyExample(t);
  const cl = cli(t);
  await cl('repo', 'add', 'pub', pathToFileURL(repoDir).href, '--fetch');
  const def = path.join(repoDir, 'public.changelog.cl.cldef');
  // The repository was added as "pub", so its .cldef is looked up as pub.cldef.
  assert.match((await cl('list', 'repos')).out, /\| pub +\|.*\| Never +\| Yes/);
  fs.copyFileSync(def, path.join(repoDir, 'pub.cldef'));
  await cl('repo', 'fetch', 'pub');
  fs.writeFileSync(path.join(repoDir, 'pub.cldef'), fs.readFileSync(def, 'utf8').replace(/libraries\.cllst\s*$/m, ''));
  const r = await cl('repo', 'fetch', 'pub');
  assert.match(r.out, /1 application\(s\) from 1 list\(s\); 0 downloaded, 1 unchanged, 2 removed/);
  assert.doesNotMatch((await cl('list', 'apps')).out, /widgets/);
});

test('HTTP errors are reported', async (t) => {
  const base = await serve(t, copyExample(t));
  const cl = cli(t);
  await cl('repo', 'add', 'missing', base);
  const r = await cl('repo', 'fetch', 'missing');
  assert.equal(r.code, 3);
  assert.match(r.err, /missing\.cldef: HTTP 404/);
});
