#!/usr/bin/env node
// Serves examples/public-repo over HTTP so you can try `cl` against a real web server:
//
//   npm run serve-example
//   cl repo add public.changelog.cl http://localhost:8787/ --fetch

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'examples', 'public-repo');
const port = Number(process.env.PORT) || 8787;

export function createServer(dir = root) {
  return http.createServer((req, res) => {
    const name = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '');
    const file = path.join(dir, name);
    // Plain files only: no directory listings, nothing outside the folder.
    if (!name || name.includes('/') || name.includes('\\') || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found\n');
      return;
    }
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    fs.createReadStream(file).pipe(res);
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  createServer().listen(port, () => {
    console.log(`Serving ${root} on http://localhost:${port}/`);
    console.log(`Try: cl repo add public.changelog.cl http://localhost:${port}/ --fetch`);
  });
}
