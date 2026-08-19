import crypto from 'crypto';
import os from 'os';

export function getMachineId() {
  const raw = [
    os.hostname(),
    os.platform(),
    os.arch(),
    os.userInfo().username,
  ].join('|');
  return crypto.createHash('sha256').update(raw).digest('hex').slice(0, 24).toUpperCase();
}
