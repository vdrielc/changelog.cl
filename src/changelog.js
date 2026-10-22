// Parser for .cl files, which use the Keep a Changelog markdown format.

// "## [1.0.0] - 2017-06-20", "## 1.0.0 - 2017-06-20 [YANKED]", "## [Unreleased]"
const HEADING = /^##(?!#)\s*(.*?)\s*$/;
const VERSION = /^\[?([^\]\s]+)\]?(?:\s*[-–—]\s*(\d{4}-\d{2}-\d{2}))?(.*)$/;
const YANKED = /\[\s*YANKED\s*\]|\bYANKED\b/i;
const LINK_DEF = /^\[([^\]]+)\]:\s*\S+/;

export class Version {
  constructor({ version, date = '', yanked = false }) {
    this.version = version;
    this.date = date;
    this.yanked = yanked;
    this.text = ''; // the full section including its "## " heading
    this.links = []; // matching link reference definition lines
  }

  get unreleased() {
    return this.version.toLowerCase() === 'unreleased';
  }

  get status() {
    if (this.unreleased) return 'Unreleased';
    return this.yanked ? 'Yanked' : 'Released';
  }

  render() {
    let body = this.text.trimEnd();
    if (this.links.length) body += '\n\n' + this.links.join('\n');
    return body;
  }
}

export class Changelog {
  constructor(preamble, versions, raw) {
    this.preamble = preamble;
    this.versions = versions;
    this.raw = raw;
  }

  /** The newest released, non-yanked version (files are newest-first). */
  latest() {
    return this.versions.find((v) => !v.unreleased && !v.yanked) ?? null;
  }

  unreleased() {
    return this.versions.filter((v) => v.unreleased);
  }

  yanked() {
    return this.versions.filter((v) => v.yanked);
  }

  find(version) {
    const norm = (s) => s.trim().replace(/^v/i, '').toLowerCase();
    const wanted = norm(version);
    return this.versions.find((v) => norm(v.version) === wanted) ?? null;
  }
}

export function parse(text) {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/);

  // Split off trailing link reference definitions ("[1.0.0]: https://...").
  const links = new Map();
  let end = lines.length;
  while (end > 0) {
    const line = lines[end - 1].trim();
    const match = LINK_DEF.exec(line);
    if (line && !match) break;
    if (match) links.set(match[1].trim().toLowerCase(), line);
    end -= 1;
  }

  const preamble = [];
  const versions = [];
  let current = null;
  let inFence = false;

  const close = () => {
    if (current) versions[versions.length - 1].text = current.join('\n').trimEnd() + '\n';
  };

  for (const line of lines.slice(0, end)) {
    if (/^\s*(```|~~~)/.test(line)) inFence = !inFence;
    const heading = inFence ? null : HEADING.exec(line);
    if (heading) {
      close();
      const match = VERSION.exec(heading[1]);
      versions.push(
        match
          ? new Version({ version: match[1], date: match[2] ?? '', yanked: YANKED.test(match[3] ?? '') })
          : new Version({ version: heading[1] }),
      );
      current = [line];
    } else if (current) {
      current.push(line);
    } else {
      preamble.push(line);
    }
  }
  close();

  for (const v of versions) {
    const ref = links.get(v.version.toLowerCase());
    if (ref) v.links.push(ref);
  }

  return new Changelog(preamble.join('\n').trim() + '\n', versions, text);
}
