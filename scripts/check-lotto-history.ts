import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { validateHistoryDocument } from '../src/features/lotto/services/historyValidation';

async function main() {
  const document: unknown = JSON.parse(
    await readFile('src/features/lotto/data/lotto-history.json', 'utf8'),
  );
  const history = await validateHistoryDocument(document);
  const sourceFile = process.argv[2];
  if (sourceFile) {
    const hash = createHash('sha256')
      .update(await readFile(sourceFile))
      .digest('hex');
    if (hash !== history.metadata.source.sha256)
      throw new Error('Source CSV hash mismatch');
  }
  console.log(
    `Validated ${history.metadata.drawCount} historical draws (${history.metadata.firstDraw}–${history.metadata.latestDraw}), metadata and data SHA-256${sourceFile ? ', source CSV SHA-256' : ''}.`,
  );
}
main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
