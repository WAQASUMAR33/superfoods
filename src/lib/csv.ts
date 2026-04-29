/** Escape a field for UTF-8 CSV (Excel opens these files directly). */
export function escapeCsvCell(v: string | number | boolean | null | undefined): string {
  const s = v === null || v === undefined ? "" : String(v);
  if (/[\r\n,"]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/** Build a CSV string with header row; uses CRLF line endings for Windows/Excel. */
export function rowsToCsv(headers: string[], rows: (string | number | boolean | null | undefined)[][]): string {
  const out: string[] = [headers.map(escapeCsvCell).join(",")];
  for (const row of rows) {
    out.push(row.map(escapeCsvCell).join(","));
  }
  return out.join("\r\n");
}
