#!/usr/bin/env node
/**
 * One-time setup: creates RSA key pair.
 * Public key  -> backend/src/keys/license-public.pem  (safe to commit)
 * Private key -> scripts/.license-keys/license-private.pem (NEVER commit)
 */
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const publicPath = path.join(root, 'backend/src/keys/license-public.pem');
const privateDir = path.join(root, 'scripts/.license-keys');
const privatePath = path.join(privateDir, 'license-private.pem');

if (fs.existsSync(privatePath)) {
  console.log('License keys already exist.');
  console.log(`Public:  ${publicPath}`);
  console.log(`Private: ${privatePath}`);
  process.exit(0);
}

const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

fs.mkdirSync(path.dirname(publicPath), { recursive: true });
fs.mkdirSync(privateDir, { recursive: true });
fs.writeFileSync(publicPath, publicKey, { mode: 0o644 });
fs.writeFileSync(privatePath, privateKey, { mode: 0o600 });

console.log('License key pair created.');
console.log(`Public key:  ${publicPath}`);
console.log(`Private key: ${privatePath}`);
console.log('\nKeep the private key ONLY on your machine. Never commit scripts/.license-keys/');
