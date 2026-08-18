#!/usr/bin/env node
/**
 * Export a compact sales/inventory snapshot for the Marketing Agent.
 * No API key or running server required — reads local SQLite directly.
 *
 * Usage:
 *   node scripts/export-advisor-context.js
 *   node scripts/export-advisor-context.js --out docs/marketing/latest-context.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDatabase } from '../backend/src/db/database.js';
import { getAdvisorContext } from '../backend/src/services/reportService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function parseArgs() {
  const args = process.argv.slice(2);
  let outPath = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--out' && args[i + 1]) {
      outPath = args[i + 1];
      i++;
    }
  }
  return { outPath };
}

async function main() {
  const { outPath } = parseArgs();

  await initDatabase();
  const context = getAdvisorContext();

  const snapshot = {
    exportedAt: new Date().toISOString(),
    ...context,
  };

  const json = JSON.stringify(snapshot, null, 2);

  if (outPath) {
    const resolved = path.isAbsolute(outPath) ? outPath : path.join(__dirname, '..', outPath);
    fs.mkdirSync(path.dirname(resolved), { recursive: true });
    fs.writeFileSync(resolved, json, 'utf8');
    console.error(`Wrote ${resolved}`);
  } else {
    console.log(json);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
