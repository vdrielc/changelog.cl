// Parser and writer for the `Key: value` record syntax used by .cldef and .cllst files.
// See design/file-formats.md for the specification.

export class FormatError extends Error {
  constructor(message) {
    super(message);
    this.name = 'FormatError';
  }
}

/** An ordered set of fields with case-insensitive keys. */
export class Record {
  constructor(fields = []) {
    this._fields = new Map(); // lower-case key -> [key, value]
    for (const [key, value] of fields) this.set(key, value);
  }

  set(key, value) {
    this._fields.set(key.toLowerCase(), [key, value]);
    return this;
  }

  get(key, fallback = '') {
    const item = this._fields.get(key.toLowerCase());
    return item ? item[1] : fallback;
  }

  has(key) {
    return this._fields.has(key.toLowerCase());
  }

  entries() {
    return [...this._fields.values()];
  }
}

/** Parse text into a list of records separated by blank lines. */
export function parse(text, source = '<string>') {
  const records = [];
  let current = []; // [key, value] pairs, mutable for continuation lines

  const flush = () => {
    if (current.length) {
      records.push(new Record(current.map(([k, v]) => [k, v.trim()])));
      current = [];
    }
  };

  const lines = text.replace(/^﻿/, '').split(/\r?\n/);
  lines.forEach((raw, i) => {
    const lineNo = i + 1;
    const line = raw.trimEnd();
    if (!line.trim()) return flush();
    if (line.trimStart().startsWith('#')) return;
    if (/^\s/.test(line)) {
      if (!current.length) {
        throw new FormatError(`${source}:${lineNo}: continuation line without a field`);
      }
      current[current.length - 1][1] += ' ' + line.trim();
      return;
    }
    const colon = line.indexOf(':');
    const key = colon > 0 ? line.slice(0, colon).trim() : '';
    if (!key || /\s/.test(key)) {
      throw new FormatError(`${source}:${lineNo}: expected 'Key: value', got ${JSON.stringify(line)}`);
    }
    current.push([key, line.slice(colon + 1).trim()]);
  });
  flush();
  return records;
}

/** Parse a file that holds a single record (e.g. a .cldef). Multiple records are merged. */
export function parseOne(text, source = '<string>') {
  const records = parse(text, source);
  if (!records.length) throw new FormatError(`${source}: file is empty`);
  const merged = new Record();
  for (const record of records) {
    for (const [key, value] of record.entries()) merged.set(key, value);
  }
  return merged;
}

/** Serialise records back to text. */
export function dump(records, header = '') {
  const out = [];
  if (header) {
    for (const line of header.split('\n')) out.push(`# ${line}`.trimEnd());
    out.push('');
  }
  for (const record of records) {
    for (const [key, value] of record.entries()) out.push(`${key}: ${value}`.trimEnd());
    out.push('');
  }
  return out.join('\n');
}
