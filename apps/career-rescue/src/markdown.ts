function cells(line: string): string[] | null {
  if (!line.trim().startsWith('|') || !line.trim().endsWith('|')) return null;
  const result: string[] = [];
  let cell = '', code = 0;
  const source = line.trim().slice(1, -1);
  for (let index = 0; index < source.length; index++) {
    const char = source[index];
    if (char === '\\' && index + 1 < source.length) { cell += char + source[++index]; continue; }
    if (char === '`') { let length = 1; while (source[index + length] === '`') length++; if (code === length) code = 0; else if (!code) code = length; cell += '`'.repeat(length); index += length - 1; continue; }
    if (char === '|' && !code) { result.push(cell.trim()); cell = ''; } else cell += char;
  }
  result.push(cell.trim());
  return result;
}
const delimiter = (value: string) => /^:?-{3,}:?$/.test(value);
const row = (values: string[]) => '| ' + values.map(value => value.replace(/<br\s*\/?\s*>/gi, '；')).join(' | ') + ' |';
function collapsed(line: string): string[] | null {
  const pipe = line.indexOf('|'); if (pipe < 0) return null;
  const values = cells(line.slice(pipe)); if (!values) return null;
  // Repeated outer pipes separate complete rows. Verify column counts first:
  // an empty cell inside a regular table must never become a row boundary.
  for (let width = 2; width <= 12; width++) {
    if (values.length < width * 2 + 1 || values[width] !== '' || !values.slice(width + 1, width * 2 + 1).every(delimiter)) continue;
    const groups: string[][] = [values.slice(0, width), values.slice(width + 1, width * 2 + 1)];
    let cursor = width * 2 + 1, valid = true;
    while (cursor < values.length) {
      if (values[cursor++] !== '' || cursor + width > values.length) { valid = false; break; }
      groups.push(values.slice(cursor, cursor + width)); cursor += width;
    }
    if (!valid) continue;
    const heading = line.slice(0, pipe).trim();
    return [...(heading ? [heading, ''] : []), ...groups.map(row)];
  }
  return null;
}
/** Repair only unambiguous tables; preserve prose, escapes and fenced code. */
export function normalizeMarkdown(text: string): string {
  const lines = text.replace(/\r\n?/g, '\n').split('\n'), expanded: string[] = [];
  let fence: { char: string; length: number } | null = null;
  for (const line of lines) {
    const marker = line.match(/^\s{0,3}(`{3,}|~{3,})/);
    if (marker) {
      if (!fence) fence = { char: marker[1][0], length: marker[1].length };
      else if (marker[1][0] === fence.char && marker[1].length >= fence.length && !line.slice(marker[0].length).trim()) fence = null;
      expanded.push(line); continue;
    }
    expanded.push(...((!fence ? collapsed(line) : null) ?? [line]));
  }
  const result: string[] = []; fence = null;
  for (let index = 0; index < expanded.length; index++) {
    const line = expanded[index], marker = line.match(/^\s{0,3}(`{3,}|~{3,})/);
    if (marker) { if (!fence) fence = { char: marker[1][0], length: marker[1].length }; else if (marker[1][0] === fence.char && marker[1].length >= fence.length && !line.slice(marker[0].length).trim()) fence = null; result.push(line); continue; }
    const header = !fence ? cells(line) : null, separator = header ? cells(expanded[index + 1] ?? '') : null;
    if (!header || !separator || header.length !== separator.length || !separator.every(delimiter)) { result.push(line); continue; }
    if (result.length && result.at(-1)?.trim()) result.push('');
    result.push(line.replace(/<br\s*\/?\s*>/gi, '；'), expanded[index + 1]); index++;
    while (index + 1 < expanded.length) { const next = cells(expanded[index + 1]); if (!next || next.length !== header.length) break; result.push(expanded[index + 1].replace(/<br\s*\/?\s*>/gi, '；')); index++; }
    if (expanded[index + 1]?.trim()) result.push('');
  }
  return result.join('\n');
}
