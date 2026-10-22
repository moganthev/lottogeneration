import { validateLottoHistory } from '../src/features/lotto/services/historyValidation';

export const CSV_HEADER = [
  'drawNo',
  'drawDate',
  'n1',
  'n2',
  'n3',
  'n4',
  'n5',
  'n6',
  'bonus',
];

// Deliberately narrow CSV contract. Use spreadsheet "CSV UTF-8" export with these columns.
export function parseLottoCsv(text: string) {
  const lines = text
    .replace(/^\uFEFF/, '')
    .trim()
    .split(/\r?\n/);
  if (lines.shift() !== CSV_HEADER.join(','))
    throw new Error(`CSV header must be: ${CSV_HEADER.join(',')}`);
  const integer = (value: string, row: number) => {
    if (!/^\d+$/.test(value))
      throw new Error(
        `CSV row ${row}: invalid integer ${JSON.stringify(value)}`,
      );
    return Number(value);
  };
  const rows = lines.map((line, index) => {
    const cells = line
      .split(',')
      .map((value) => value.trim().replace(/^"([^"\r\n]*)"$/, '$1'));
    if (cells.length !== CSV_HEADER.length)
      throw new Error(`CSV row ${index + 2}: expected 9 columns`);
    return {
      drawNo: integer(cells[0], index + 2),
      drawDate: cells[1],
      numbers: cells.slice(2, 8).map((value) => integer(value, index + 2)),
      bonus: integer(cells[8], index + 2),
    };
  });
  return validateLottoHistory(rows);
}
