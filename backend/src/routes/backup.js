import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { getDb } from '../db/database.js';
import { config } from '../config.js';

const router = Router();

router.get('/export', (_req, res) => {
  const dbPath = path.join(config.dataDir, 'vimms.db');
  if (!fs.existsSync(dbPath)) {
    return res.status(404).json({ error: 'Database not found' });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Content-Disposition', `attachment; filename=vimms-backup-${timestamp}.db`);
  fs.createReadStream(dbPath).pipe(res);
});

router.post('/import', (req, res) => {
  res.status(501).json({
    error: 'To restore backup, replace the database file at data/vimms.db and restart the app',
  });
});

router.get('/stats', (_req, res) => {
  const db = getDb();
  const stats = {
    items: db.prepare('SELECT COUNT(*) as c FROM items').get().c,
    sales: db.prepare('SELECT COUNT(*) as c FROM sales').get().c,
    purchases: db.prepare('SELECT COUNT(*) as c FROM purchases').get().c,
    dbPath: path.join(config.dataDir, 'vimms.db'),
  };
  res.json(stats);
});

export default router;
