import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from '../config.js';
import { getMachineId } from '../lib/machineId.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_KEY_PATH = path.join(__dirname, '../keys/license-public.pem');
const STORAGE_PEPPER = 'vimms-license-storage-v1';

let publicKeyCache = null;

function getPublicKey() {
  if (publicKeyCache) return publicKeyCache;
  if (!fs.existsSync(PUBLIC_KEY_PATH)) {
    throw new Error('License public key missing. Run: node scripts/setup-license-keys.js');
  }
  publicKeyCache = fs.readFileSync(PUBLIC_KEY_PATH, 'utf8');
  return publicKeyCache;
}

function getLicenseFilePath() {
  return path.join(config.dataDir, 'license.dat');
}

function getStorageKey() {
  return crypto.scryptSync(`${getMachineId()}|${STORAGE_PEPPER}`, 'vimms-license-salt', 32);
}

function encrypt(text) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getStorageKey(), iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

function decrypt(blob) {
  const buf = Buffer.from(blob, 'base64');
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const data = buf.subarray(28);
  const decipher = crypto.createDecipheriv('aes-256-gcm', getStorageKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}

function parseLicenseKey(licenseKey) {
  const trimmed = licenseKey?.trim();
  if (!trimmed || !trimmed.includes('.')) {
    throw new Error('Invalid license key format');
  }

  const [payloadB64, signature] = trimmed.split('.');
  const verify = crypto.createVerify('RSA-SHA256');
  verify.update(payloadB64);
  verify.end();

  const valid = verify.verify(getPublicKey(), signature, 'base64url');
  if (!valid) throw new Error('License signature is invalid');

  const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
  if (payload.v !== 1) throw new Error('Unsupported license version');
  if (payload.mid !== getMachineId()) {
    throw new Error('This license is for a different computer');
  }
  if (payload.exp && Date.now() > payload.exp) {
    throw new Error('License has expired');
  }

  return payload;
}

function readStoredLicenseKey() {
  const filePath = getLicenseFilePath();
  if (!fs.existsSync(filePath)) return null;
  try {
    const encrypted = fs.readFileSync(filePath, 'utf8');
    return decrypt(encrypted);
  } catch {
    return null;
  }
}

function writeStoredLicenseKey(licenseKey) {
  const filePath = getLicenseFilePath();
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, encrypt(licenseKey.trim()), { mode: 0o600 });
}

export function getLicenseStatus() {
  const machineId = getMachineId();
  const storedKey = readStoredLicenseKey();

  if (!storedKey) {
    return {
      valid: false,
      machineId,
      holder: null,
      expiresAt: null,
      edition: null,
      needsActivation: true,
    };
  }

  try {
    const payload = parseLicenseKey(storedKey);
    return {
      valid: true,
      machineId,
      holder: payload.holder || 'Licensed User',
      expiresAt: payload.exp ? new Date(payload.exp).toISOString() : null,
      edition: payload.ed || 'standard',
      needsActivation: false,
    };
  } catch (err) {
    return {
      valid: false,
      machineId,
      holder: null,
      expiresAt: null,
      edition: null,
      needsActivation: true,
      error: err.message,
    };
  }
}

export function isLicensed() {
  return getLicenseStatus().valid;
}

export function activateLicense(licenseKey) {
  const payload = parseLicenseKey(licenseKey);
  writeStoredLicenseKey(licenseKey);
  return {
    valid: true,
    machineId: getMachineId(),
    holder: payload.holder || 'Licensed User',
    expiresAt: payload.exp ? new Date(payload.exp).toISOString() : null,
    edition: payload.ed || 'standard',
    needsActivation: false,
  };
}

export { getMachineId };
