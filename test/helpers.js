import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { main } from '../src/cli.js';
import { Store } from '../src/store.js';
import { createServer } from '../scripts/serve-example-repo.js';

export const EXAMPLE_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'examples', 'public-repo');

export function tempDir(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cl-test-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}

/** A copy of the example repository that a test can modify. */
export function copyExample(t) {
  const dir = path.join(tempDir(t), 'repo');
  fs.cpSync(EXAMPLE_DIR, dir, { recursive: true });
  return dir;
}

/** Serve a directory over HTTP on a random port; returns its base URL. */
export async function serve(t, dir) {
  const server = createServer(dir);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  return `http://127.0.0.1:${server.address().port}/`;
}

/** Run the CLI against a store, capturing output. */
export function cli(t, store = new Store(tempDir(t))) {
  const run = async (...argv) => {
    const out = [];
    const err = [];
    const code = await main(argv, { store, out: (s) => out.push(s), err: (s) => err.push(s) });
    return { code, out: out.join('\n'), err: err.join('\n') };
  };
  run.store = store;
  return run;
}
