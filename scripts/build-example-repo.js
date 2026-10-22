#!/usr/bin/env node
// Refreshes examples/public-repo: copies CHANGELOG.md in as cl.changelog.cl, then fills
// in Hash, LatestVersion and LastChangedDate in every .cllst entry.
//
// This is a development helper for the bundled example, not part of the `cl` CLI.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import * as changelog from '../src/changelog.js';
import * as records from '../src/records.js';
import { sha1File } from '../src/store.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoDir = path.join(root, 'examples', 'public-repo');

fs.copyFileSync(path.join(root, 'CHANGELOG.md'), path.join(repoDir, 'cl.changelog.cl'));

for (const file of fs.readdirSync(repoDir).filter((f) => f.endsWith('.cllst'))) {
  const full = path.join(repoDir, file);
  const text = fs.readFileSync(full, 'utf8');
  const header = text.split('\n').filter((l) => l.startsWith('# ')).map((l) => l.slice(2)).join('\n');
  const entries = records.parse(text, full);
  for (const rec of entries) {
    const clPath = path.join(repoDir, rec.get('clFileURL'));
    const log = changelog.parse(fs.readFileSync(clPath, 'utf8'));
    const latest = log.latest();
    rec.set('LastChangedDate', log.versions.find((v) => v.date)?.date ?? '');
    rec.set('LatestVersion', latest?.version ?? '');
    rec.set('Hash', sha1File(clPath));
  }
  fs.writeFileSync(full, records.dump(entries, header));
  console.log(`updated ${path.relative(root, full)} (${entries.length} entries)`);
}
