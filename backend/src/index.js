import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDatabase } from './db/database.js';
import { authMiddleware } from './middleware/auth.js';
import { config } from './config.js';

import authRoutes from './routes/auth.js';
import itemsRoutes from './routes/items.js';
import salesRoutes from './routes/sales.js';
import purchasesRoutes from './routes/purchases.js';
import reportsRoutes from './routes/reports.js';
import advisorRoutes from './routes/advisor.js';
import backupRoutes from './routes/backup.js';
import adminRoutes from './routes/admin.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

const frontendDist = config.frontendDist;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(config.uploadsDir));
app.use(express.static(frontendDist));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', shop: config.shopName });
});

app.use('/api/auth', authRoutes);

app.use('/api/items', authMiddleware, itemsRoutes);
app.use('/api/sales', authMiddleware, salesRoutes);
app.use('/api/purchases', authMiddleware, purchasesRoutes);
app.use('/api/reports', authMiddleware, reportsRoutes);
app.use('/api/advisor', authMiddleware, advisorRoutes);
app.use('/api/backup', authMiddleware, backupRoutes);
app.use('/api/admin', authMiddleware, adminRoutes);

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  const indexPath = path.join(frontendDist, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) res.status(404).json({ error: 'Frontend not found', path: frontendDist });
  });
});

async function start() {
  await initDatabase();
  app.listen(config.port, () => {
    console.log(`VIMMS API running on http://localhost:${config.port}`);
    console.log(`Serving frontend from: ${frontendDist}`);
  });
}

start().catch((err) => {
  console.error('Failed to start VIMMS backend:', err);
  process.exit(1);
});

export default app;
