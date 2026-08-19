#!/usr/bin/env node
/**
 * Install a license key on THIS machine only (encrypted in local data folder).
 * Usage:
 *   node scripts/install-license.js --file scripts/.license-keys/generated/license-....key
 *   node scripts/install-license.js --key "PAYLOAD.SIGNATURE"
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--file') args.file = argv[++i];
    else if (argv[i] === '--key') args.key = argv[++i];
    else if (argv[i] === '--data-dir') args.dataDir = argv[++i];
  }
  return args;
}

const args = parseArgs(process.argv);

if (args.dataDir) {
  process.env.DATA_DIR = path.resolve(args.dataDir);
}

let licenseKey = args.key;
if (!licenseKey && args.file) {
  licenseKey = fs.readFileSync(path.resolve(args.file), 'utf8').trim();
}

if (!licenseKey) {
  console.error('Provide --file <path> or --key "<license>"');
  process.exit(1);
}

const { activateLicense } = await import('../backend/src/services/licenseService.js');

try {
  const status = activateLicense(licenseKey);
  console.log('License installed successfully on this computer.');
  console.log(`Licensed to: ${status.holder}`);
  console.log(`Machine ID:  ${status.machineId}`);
  console.log(`Expires:     ${status.expiresAt ? status.expiresAt.slice(0, 10) : 'Never'}`);
} catch (err) {
  console.error(`Failed: ${err.message}`);
  process.exit(1);
}
