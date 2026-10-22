#!/usr/bin/env node
import { main } from '../src/cli.js';

// Exit quietly when piped into something that closes early, e.g. `cl show x | head`.
process.stdout.on('error', (err) => {
  if (err.code === 'EPIPE') process.exit(0);
  throw err;
});

main().then(
  (code) => {
    process.exitCode = code;
  },
  (err) => {
    process.stderr.write(`cl: unexpected error: ${err?.stack ?? err}\n`);
    process.exitCode = 1;
  },
);
