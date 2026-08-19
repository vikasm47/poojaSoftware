import { isLicensed } from '../services/licenseService.js';

export function licenseMiddleware(req, res, next) {
  if (isLicensed()) return next();
  return res.status(403).json({
    error: 'A valid license is required. Activate VIMMS on this computer.',
    code: 'LICENSE_REQUIRED',
  });
}
