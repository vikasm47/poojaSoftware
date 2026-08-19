#!/usr/bin/env node
/**
 * Generate a signed license key for a specific machine.
 * Usage:
 *   node scripts/generate-license.js
 *   node scripts/generate-license.js --holder "Vidhi Shop"
 *   node scripts/generate-license.js --machine-id ABC123 --expires 2027-12-31
 *
 * Output is written to scripts/.license-keys/generated/ (gitignored), not the repo root.
 */
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getMachineId } from '../backend/src/lib/machineId.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const privatePath = path.join(__dirname, '.license-keys/license-private.pem');
const outDir = path.join(__dirname, '.license-keys/generated');

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--holder') args.holder = argv[++i];
    else if (argv[i] === '--machine-id') args.machineId = argv[++i];
    else if (argv[i] === '--expires') args.expires = argv[++i];
    else if (argv[i] === '--edition') args.edition = argv[++i];
  }
  return args;
}

if (!fs.existsSync(privatePath)) {
  console.error('Private key not found. Run: node scripts/setup-license-keys.js');
  process.exit(1);
}

const args = parseArgs(process.argv);
const machineId = (args.machineId || getMachineId()).toUpperCase();
const holder = args.holder || 'Licensed User';
const edition = args.edition || 'standard';
const exp = args.expires ? new Date(args.expires).getTime() : null;

if (args.expires && Number.isNaN(exp)) {
  console.error('Invalid --expires date. Use YYYY-MM-DD');
  process.exit(1);
}

const payload = {
  v: 1,
  mid: machineId,
  holder,
  iat: Date.now(),
  exp,
  ed: edition,
};

const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
const sign = crypto.createSign('RSA-SHA256');
sign.update(payloadB64);
sign.end();
const signature = sign.sign(fs.readFileSync(privatePath, 'utf8'), 'base64url');
const licenseKey = `${payloadB64}.${signature}`;

fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, `license-${machineId}-${Date.now()}.key`);
fs.writeFileSync(outFile, licenseKey, { mode: 0o600 });

console.log('License generated for this machine only.');
console.log(`Machine ID: ${machineId}`);
console.log(`Holder:     ${holder}`);
console.log(`Expires:    ${exp ? new Date(exp).toISOString().slice(0, 10) : 'Never'}`);
console.log(`Saved to:   ${outFile}`);
console.log('\nLicense key (give to customer or install locally — do NOT commit):');
console.log(licenseKey);
