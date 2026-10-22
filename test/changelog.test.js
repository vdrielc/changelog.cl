import assert from 'node:assert/strict';
import { test } from 'node:test';

import { parse } from '../src/changelog.js';

const SAMPLE = `# Changelog
Intro text.

## [Unreleased]
### Added
- Something new

## [1.1.0] - 2026-05-01 [YANKED]
- Bad release

## 1.0.0 - 2026-04-01
### Fixed
- A bug

\`\`\`
## not a heading inside a code block
\`\`\`

## [0.9.0]
- Undated

[Unreleased]: https://example.com/compare/v1.0.0...HEAD
[1.0.0]: https://example.com/releases/v1.0.0
`;

test('splits preamble, versions and link references', () => {
  const log = parse(SAMPLE);
  assert.equal(log.preamble, '# Changelog\nIntro text.\n');
  assert.deepEqual(log.versions.map((v) => v.version), ['Unreleased', '1.1.0', '1.0.0', '0.9.0']);
  assert.deepEqual(log.versions.map((v) => v.status), ['Unreleased', 'Yanked', 'Released', 'Released']);
  assert.equal(log.versions[2].date, '2026-04-01');
  assert.equal(log.versions[3].date, '');
  assert.match(log.versions[2].text, /not a heading inside a code block/);
  assert.deepEqual(log.versions[2].links, ['[1.0.0]: https://example.com/releases/v1.0.0']);
});

test('latest skips unreleased and yanked versions', () => {
  const log = parse(SAMPLE);
  assert.equal(log.latest().version, '1.0.0');
  assert.equal(log.unreleased().length, 1);
  assert.deepEqual(log.yanked().map((v) => v.version), ['1.1.0']);
});

test('find ignores a leading v and case', () => {
  const log = parse(SAMPLE);
  assert.equal(log.find('v1.0.0').version, '1.0.0');
  assert.equal(log.find('unreleased').version, 'Unreleased');
  assert.equal(log.find('2.0.0'), null);
});

test('render appends the version link', () => {
  const rendered = parse(SAMPLE).find('1.0.0').render();
  assert.ok(rendered.startsWith('## 1.0.0 - 2026-04-01'));
  assert.ok(rendered.endsWith('[1.0.0]: https://example.com/releases/v1.0.0'));
});

test('a changelog with only unreleased changes has no latest', () => {
  assert.equal(parse('# Changelog\n\n## [Unreleased]\n- wip\n').latest(), null);
});
