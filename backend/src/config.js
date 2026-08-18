import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.join(__dirname, '../.env') });

export const config = {
  port: parseInt(process.env.PORT || '3847', 10),
  jwtSecret: process.env.JWT_SECRET || 'pooja-shop-dev-secret-change-me',
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
  shopName: process.env.SHOP_NAME || 'My Pooja Shop',
  defaultPin: process.env.DEFAULT_PIN || '1234',
  dataDir: process.env.DATA_DIR || path.join(__dirname, '../../data'),
  uploadsDir: process.env.UPLOADS_DIR || path.join(__dirname, '../../data/uploads'),
};
