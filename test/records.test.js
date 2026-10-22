import assert from 'node:assert/strict';
import { test } from 'node:test';

import { dump, FormatError, parse, parseOne } from '../src/records.js';

test('parses records separated by blank lines, with comments and continuations', () => {
  const recs = parse(`# comment
ApplicationID: a.b
ApplicationName: First

applicationid: c.d
Description: line one
  line two
`);
  assert.equal(recs.length, 2);
  assert.equal(recs[0].get('applicationID'), 'a.b');
  assert.equal(recs[1].get('ApplicationID'), 'c.d', 'keys are case-insensitive');
  assert.equal(recs[1].get('Description'), 'line one line two');
  assert.equal(recs[1].get('Missing', 'x'), 'x');
});

test('values may contain colons (URLs)', () => {
  const [rec] = parse('clFileURL: https://example.com:8080/a.cl\r\n');
  assert.equal(rec.get('clFileURL'), 'https://example.com:8080/a.cl');
});

test('rejects malformed lines with a location', () => {
  assert.throws(() => parse('Key value\n', 'x.cllst'), (e) => e instanceof FormatError && /x\.cllst:1/.test(e.message));
  assert.throws(() => parse('  orphan continuation\n'), FormatError);
});

test('parseOne merges records and rejects empty files', () => {
  const rec = parseOne('A: 1\n\nB: 2\n');
  assert.equal(rec.get('A'), '1');
  assert.equal(rec.get('B'), '2');
  assert.throws(() => parseOne('# only a comment\n'), FormatError);
});

test('dump round-trips', () => {
  const text = 'A: 1\nB: two words\n\nA: 3\n';
  const again = parse(dump(parse(text), 'header'));
  assert.deepEqual(again.map((r) => r.entries()), parse(text).map((r) => r.entries()));
});
