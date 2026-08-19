import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.join(__dirname, '../.env') });
if (process.env.DATA_DIR) {
  dotenv.config({ path: path.join(process.env.DATA_DIR, '..', '.env') });
}

function resolveGoogleApiKey() {
  const key = (process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || '').trim();
  if (!key) return '';
  if (key.includes('your-google-api-key') || key.includes('your-key-here')) return '';
  if (!key.startsWith('AIza')) return '';
  return key;
}

export const config = {
  port: parseInt(process.env.PORT || '3847', 10),
  jwtSecret: process.env.JWT_SECRET || 'pooja-shop-dev-secret-change-me',
  googleApiKey: resolveGoogleApiKey(),
  googleAiModel: process.env.GOOGLE_AI_MODEL || 'gemini-3.6-flash',
  shopName: process.env.SHOP_NAME || 'My Shop',
  defaultPin: process.env.DEFAULT_PIN || '1234',
  dataDir: process.env.DATA_DIR || path.join(__dirname, '../../data'),
  uploadsDir: process.env.UPLOADS_DIR || path.join(__dirname, '../../data/uploads'),
  frontendDist: process.env.FRONTEND_DIST || path.join(__dirname, '../../frontend/dist'),
};
