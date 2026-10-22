// Output helpers: Markdown-style tables (as in the design docs) and JSON.

export function table(headers, rows) {
  const cells = [headers.map(String), ...rows.map((row) => row.map((c) => (c == null ? '' : String(c))))];
  const widths = headers.map((_, i) => Math.max(...cells.map((r) => r[i].length)));
  const line = (row) => '| ' + row.map((c, i) => c.padEnd(widths[i])).join(' | ') + ' |';
  return [line(cells[0]), '|' + widths.map((w) => '-'.repeat(w + 2)).join('|') + '|', ...cells.slice(1).map(line)].join(
    '\n',
  );
}

export function toJson(data) {
  return JSON.stringify(data, null, 2);
}
