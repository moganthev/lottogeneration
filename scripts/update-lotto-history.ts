import { createHash } from 'node:crypto';
import { readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { format, resolveConfig } from 'prettier';
import {
  createHistory,
  validateHistoryDocument,
} from '../src/features/lotto/services/historyValidation';
import { CSV_HEADER } from './lotto-csv';
import { fetchOfficialUpdate, OFFICIAL_RESULT_PAGE } from './official-lotto';

const { values } = parseArgs({
  options: { 'dry-run': { type: 'boolean', default: false } },
});
const output = 'src/features/lotto/data/lotto-history.json';
const csvPath = 'data/sources/lotto-official-latest.csv';
const provenancePath = 'data/sources/lotto-official-latest.source.json';
const sha256 = (text: string) =>
  createHash('sha256').update(text).digest('hex');

async function main() {
  const input: unknown = JSON.parse(await readFile(output, 'utf8'));
  const current = await validateHistoryDocument(input);
  const now = new Date();
  const update = await fetchOfficialUpdate(current, { now });
  if (!update) {
    console.log(
      `No new official result. Keeping ${current.metadata.latestDraw} draws and all existing files unchanged.`,
    );
    return;
  }
  const csv = `${CSV_HEADER.join(',')}\n${update.draws
    .map((draw) =>
      [draw.drawNo, draw.drawDate, ...draw.numbers, draw.bonus].join(','),
    )
    .join('\n')}\n`;
  const source = {
    name: '동행복권 로또6/45 공개 추첨 결과',
    url: update.sourceUrl,
    retrievedAt: now.toISOString(),
    sha256: sha256(csv),
  };
  const history = await createHistory(update.draws, source, now.toISOString());
  const provenance = {
    sourceName: source.name,
    sourceUrl: source.url,
    pageUrl: OFFICIAL_RESULT_PAGE,
    retrievedAt: source.retrievedAt,
    originalResponseSha256: sha256(update.sourceText),
    confirmationUrl: update.confirmationUrl,
    confirmationResponseSha256: sha256(update.confirmationText),
    csvSha256: source.sha256,
    drawCount: history.metadata.drawCount,
    usage:
      'Public factual draw numbers and dates only; no site text, images, logos, prize tables or software copied.',
  };
  const json = async (value: unknown, path: string) =>
    format(JSON.stringify(value), {
      ...(await resolveConfig(path)),
      parser: 'json',
    });
  const files = [
    [csvPath, csv],
    [provenancePath, await json(provenance, provenancePath)],
    [output, await json(history, output)],
  ];
  if (!values['dry-run']) {
    const staged = files.map(([path, text]) => ({
      path,
      text,
      temporary: `${path}.${process.pid}.tmp`,
    }));
    try {
      // Stage everything first and replace production JSON last. A failed fetch,
      // validation or write never replaces the app's existing history.
      for (const file of staged)
        await writeFile(file.temporary, file.text, { flag: 'wx' });
      for (const file of staged) await rename(file.temporary, file.path);
    } finally {
      await Promise.all(
        staged.map((file) => unlink(file.temporary).catch(() => {})),
      );
    }
  }
  console.log(
    `${values['dry-run'] ? 'Verified (dry run)' : 'Updated'} official history: ${current.metadata.latestDraw} → ${history.metadata.latestDraw} (${history.metadata.latestDrawDate}).`,
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
