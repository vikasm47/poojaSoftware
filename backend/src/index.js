import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDatabase } from './db/database.js';
import { authMiddleware } from './middleware/auth.js';
import { licenseMiddleware } from './middleware/license.js';
import { config } from './config.js';
import { getLicenseStatus } from './services/licenseService.js';

import authRoutes from './routes/auth.js';
import licenseRoutes from './routes/license.js';
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
  const license = getLicenseStatus();
  res.json({
    status: 'ok',
    shop: config.shopName,
    version: '1.0.0',
    capabilities: ['admin', 'advisor', 'backup', 'license'],
    license: {
      valid: license.valid,
      needsActivation: license.needsActivation,
    },
  });
});

app.use('/api/license', licenseRoutes);
app.use('/api/auth', authRoutes);

app.use('/api/items', licenseMiddleware, authMiddleware, itemsRoutes);
app.use('/api/sales', licenseMiddleware, authMiddleware, salesRoutes);
app.use('/api/purchases', licenseMiddleware, authMiddleware, purchasesRoutes);
app.use('/api/reports', licenseMiddleware, authMiddleware, reportsRoutes);
app.use('/api/advisor', licenseMiddleware, authMiddleware, advisorRoutes);
app.use('/api/backup', licenseMiddleware, authMiddleware, backupRoutes);
app.use('/api/admin', licenseMiddleware, authMiddleware, adminRoutes);

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
