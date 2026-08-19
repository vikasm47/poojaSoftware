import { Router } from 'express';
import { activateLicense, getLicenseStatus } from '../services/licenseService.js';

const router = Router();

router.get('/status', (_req, res) => {
  res.json(getLicenseStatus());
});

router.post('/activate', (req, res) => {
  try {
    const { licenseKey } = req.body;
    if (!licenseKey?.trim()) {
      return res.status(400).json({ error: 'License key is required' });
    }
    const status = activateLicense(licenseKey);
    res.json(status);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
