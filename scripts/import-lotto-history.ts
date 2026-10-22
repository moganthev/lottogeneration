import { readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { createHistory } from '../src/features/lotto/services/historyValidation';
import { parseLottoCsv } from './lotto-csv';

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    'source-url': { type: 'string' },
    'source-name': { type: 'string' },
    'retrieved-at': { type: 'string' },
    output: {
      type: 'string',
      default: 'src/features/lotto/data/lotto-history.json',
    },
  },
});

async function main() {
  if (
    positionals.length !== 1 ||
    !values['source-url'] ||
    !values['source-name']
  )
    throw new Error(
      'Usage: npm run data:import -- input.csv --source-url https://... --source-name "출처" [--retrieved-at ISO] [--output path]',
    );
  const bytes = await readFile(positionals[0]);
  const now = new Date().toISOString();
  const source = {
    name: values['source-name'],
    url: values['source-url'],
    retrievedAt: values['retrieved-at'] ?? now,
    sha256: createHash('sha256').update(bytes).digest('hex'),
  };
  const history = await createHistory(
    parseLottoCsv(bytes.toString('utf8')),
    source,
    now,
  );
  const output = resolve(values.output);
  const temporary = `${output}.${process.pid}.tmp`;
  try {
    await writeFile(temporary, `${JSON.stringify(history, null, 2)}\n`, {
      flag: 'wx',
    });
    await rename(temporary, output);
  } finally {
    await unlink(temporary).catch(() => {});
  }
  console.log(
    `Imported ${history.metadata.drawCount} draws: ${history.metadata.firstDraw}–${history.metadata.latestDraw} (latest date ${history.metadata.latestDrawDate})`,
  );
  console.log(
    `Source SHA-256: ${source.sha256}\nData SHA-256: ${history.metadata.dataSha256}`,
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
