import { getDb } from '../db/database.js';
import { config } from '../config.js';

export const GOOGLE_AI_MODELS = [
  { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash (recommended)' },
  { id: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash Lite' },
  { id: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
  { id: 'gemini-1.5-flash-8b', label: 'Gemini 1.5 Flash 8B' },
  { id: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
  { id: 'gemini-2.5-flash-preview-05-20', label: 'Gemini 2.5 Flash (preview)' },
];

export function getSetting(key) {
  const row = getDb().prepare('SELECT value FROM app_settings WHERE key = ?').get(key);
  return row?.value || '';
}

export function setSetting(key, value) {
  getDb().prepare(`
    INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
  `).run(key, value);
}

export function getGoogleApiKey() {
  const fromDb = getSetting('google_api_key').trim();
  if (fromDb && fromDb.startsWith('AIza')) return fromDb;
  return config.googleApiKey;
}

export function getGoogleAiModel() {
  const fromDb = getSetting('google_ai_model').trim();
  const valid = GOOGLE_AI_MODELS.some((m) => m.id === fromDb);
  if (valid) return fromDb;
  return config.googleAiModel;
}

export function hasValidGoogleApiKey() {
  const key = getGoogleApiKey();
  return Boolean(key && key.startsWith('AIza'));
}

export function getAiSettings() {
  const key = getGoogleApiKey();
  return {
    hasApiKey: hasValidGoogleApiKey(),
    apiKeyMasked: key ? `${key.slice(0, 8)}...${key.slice(-4)}` : '',
    model: getGoogleAiModel(),
    models: GOOGLE_AI_MODELS,
    source: getSetting('google_api_key') ? 'database' : (config.googleApiKey ? 'env' : 'none'),
  };
}

export function saveAiSettings({ apiKey, model }) {
  if (apiKey !== undefined && apiKey !== '') {
    if (!apiKey.startsWith('AIza')) {
      throw new Error('Invalid Google API key format. Key should start with AIza');
    }
    setSetting('google_api_key', apiKey.trim());
  }
  if (model) {
    const valid = GOOGLE_AI_MODELS.some((m) => m.id === model);
    if (!valid) throw new Error('Invalid model selected');
    setSetting('google_ai_model', model);
  }
  return getAiSettings();
}

export function getShopId() {
  return getDb().prepare('SELECT id FROM shops LIMIT 1').get().id;
}

export function listCategories() {
  const shopId = getShopId();
  return getDb().prepare(
    'SELECT c.*, (SELECT COUNT(*) FROM items i WHERE i.shop_id = c.shop_id AND i.category = c.name) as item_count FROM categories c WHERE c.shop_id = ? ORDER BY c.sort_order, c.name'
  ).all(shopId);
}

export function getCategoryNames() {
  return listCategories().map((c) => c.name);
}

export function createCategory(name) {
  const shopId = getShopId();
  const trimmed = name?.trim();
  if (!trimmed) throw new Error('Category name is required');

  try {
    const result = getDb().prepare(
      'INSERT INTO categories (shop_id, name, sort_order) VALUES (?, ?, (SELECT COALESCE(MAX(sort_order), -1) + 1 FROM categories WHERE shop_id = ?))'
    ).run(shopId, trimmed, shopId);
    return getDb().prepare('SELECT * FROM categories WHERE id = ?').get(result.lastInsertRowid);
  } catch (err) {
    if (err.message?.includes('UNIQUE') || err.message?.includes('unique')) {
      throw new Error('Category already exists');
    }
    throw err;
  }
}

export function updateCategory(id, name) {
  const shopId = getShopId();
  const trimmed = name?.trim();
  if (!trimmed) throw new Error('Category name is required');

  const existing = getDb().prepare('SELECT * FROM categories WHERE id = ? AND shop_id = ?').get(id, shopId);
  if (!existing) throw new Error('Category not found');

  getDb().transaction(() => {
    getDb().prepare('UPDATE items SET category = ? WHERE shop_id = ? AND category = ?').run(trimmed, shopId, existing.name);
    getDb().prepare('UPDATE categories SET name = ? WHERE id = ?').run(trimmed, id);
  })();

  return getDb().prepare('SELECT * FROM categories WHERE id = ?').get(id);
}

export function deleteCategory(id) {
  const shopId = getShopId();
  const existing = getDb().prepare('SELECT * FROM categories WHERE id = ? AND shop_id = ?').get(id, shopId);
  if (!existing) throw new Error('Category not found');

  const itemCount = getDb().prepare('SELECT COUNT(*) as c FROM items WHERE shop_id = ? AND category = ?').get(shopId, existing.name).c;
  if (itemCount > 0) {
    throw new Error(`Cannot delete — ${itemCount} item(s) use this category. Reassign them first.`);
  }

  getDb().prepare('DELETE FROM categories WHERE id = ?').run(id);
  return { message: 'Category deleted' };
}
