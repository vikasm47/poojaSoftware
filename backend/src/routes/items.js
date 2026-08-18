import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { getDb, formatItem, getStockStatus } from '../db/database.js';
import { getCategoryNames } from '../services/settingsService.js';
import { config } from '../config.js';

const router = Router();

const storage = multer.diskStorage({
  destination: config.uploadsDir,
  filename: (_req, file, cb) => {
    cb(null, `${uuidv4()}${path.extname(file.originalname)}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

const CATEGORIES = [
  'Diyas', 'Incense', 'Idols', 'Thalis', 'Garlands',
  'Camphor', 'Kumkum/Sindoor', 'Puja Kits', 'Miscellaneous',
];

function getCategoriesList() {
  try {
    const names = getCategoryNames();
    return names.length > 0 ? names : CATEGORIES;
  } catch {
    return CATEGORIES;
  }
}

function getShopId() {
  const db = getDb();
  return db.prepare('SELECT id FROM shops LIMIT 1').get().id;
}

function generateSku(category, shopId) {
  const prefix = category.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X');
  const db = getDb();
  const count = db.prepare('SELECT COUNT(*) as c FROM items WHERE shop_id = ? AND category = ?').get(shopId, category).c;
  return `${prefix}-${String(count + 1).padStart(3, '0')}`;
}

router.get('/categories', (_req, res) => {
  res.json(getCategoriesList());
});

router.get('/', (req, res) => {
  const db = getDb();
  const shopId = getShopId();
  const { category, stock_status, search, min_price, max_price } = req.query;

  let sql = 'SELECT * FROM items WHERE shop_id = ?';
  const params = [shopId];

  if (category) {
    sql += ' AND category = ?';
    params.push(category);
  }
  if (search) {
    sql += ' AND (name LIKE ? OR sku LIKE ? OR supplier LIKE ?)';
    const term = `%${search}%`;
    params.push(term, term, term);
  }
  if (min_price) {
    sql += ' AND selling_price >= ?';
    params.push(parseFloat(min_price));
  }
  if (max_price) {
    sql += ' AND selling_price <= ?';
    params.push(parseFloat(max_price));
  }

  sql += ' ORDER BY name ASC';
  let items = db.prepare(sql).all(...params).map(formatItem);

  if (stock_status) {
    items = items.filter((i) => i.stock_status === stock_status);
  }

  res.json(items);
});

router.get('/alerts/low-stock', (_req, res) => {
  const db = getDb();
  const shopId = getShopId();
  const items = db.prepare('SELECT * FROM items WHERE shop_id = ? ORDER BY stock_qty ASC').all(shopId)
    .map(formatItem)
    .filter((i) => i.stock_status === 'low_stock' || i.stock_status === 'out_of_stock');

  res.json(items);
});

router.get('/:id', (req, res) => {
  const db = getDb();
  const item = db.prepare('SELECT * FROM items WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Item not found' });
  res.json(formatItem(item));
});

router.post('/', upload.single('photo'), (req, res) => {
  const db = getDb();
  const shopId = getShopId();
  const {
    name, category, sku, cost_price, selling_price, stock_qty,
    unit, reorder_threshold, supplier, supplier_contact,
  } = req.body;

  if (!name || !category) {
    return res.status(400).json({ error: 'Name and category are required' });
  }

  const finalSku = sku || generateSku(category, shopId);
  const photoPath = req.file ? `/uploads/${req.file.filename}` : null;

  try {
    const result = db.prepare(`
      INSERT INTO items (shop_id, name, category, sku, cost_price, selling_price, stock_qty, unit, reorder_threshold, supplier, supplier_contact, photo_path)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      shopId, name, category, finalSku,
      parseFloat(cost_price) || 0,
      parseFloat(selling_price) || 0,
      parseFloat(stock_qty) || 0,
      unit || 'piece',
      parseFloat(reorder_threshold) || 5,
      supplier || null,
      supplier_contact || null,
      photoPath
    );

    const item = db.prepare('SELECT * FROM items WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(formatItem(item));
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'SKU already exists' });
    }
    throw err;
  }
});

router.put('/:id', upload.single('photo'), (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM items WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Item not found' });

  const {
    name, category, sku, cost_price, selling_price, stock_qty,
    unit, reorder_threshold, supplier, supplier_contact,
  } = req.body;

  const photoPath = req.file ? `/uploads/${req.file.filename}` : existing.photo_path;

  db.prepare(`
    UPDATE items SET
      name = ?, category = ?, sku = ?, cost_price = ?, selling_price = ?,
      stock_qty = ?, unit = ?, reorder_threshold = ?, supplier = ?,
      supplier_contact = ?, photo_path = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(
    name ?? existing.name,
    category ?? existing.category,
    sku ?? existing.sku,
    cost_price !== undefined ? parseFloat(cost_price) : existing.cost_price,
    selling_price !== undefined ? parseFloat(selling_price) : existing.selling_price,
    stock_qty !== undefined ? parseFloat(stock_qty) : existing.stock_qty,
    unit ?? existing.unit,
    reorder_threshold !== undefined ? parseFloat(reorder_threshold) : existing.reorder_threshold,
    supplier ?? existing.supplier,
    supplier_contact ?? existing.supplier_contact,
    photoPath,
    req.params.id
  );

  res.json(formatItem(db.prepare('SELECT * FROM items WHERE id = ?').get(req.params.id)));
});

router.delete('/:id', (req, res) => {
  const db = getDb();
  const result = db.prepare('DELETE FROM items WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Item not found' });
  res.json({ message: 'Item deleted' });
});

router.post('/bulk-import', (req, res) => {
  const db = getDb();
  const shopId = getShopId();
  const { items } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Items array is required' });
  }

  const insert = db.prepare(`
    INSERT INTO items (shop_id, name, category, sku, cost_price, selling_price, stock_qty, unit, reorder_threshold, supplier)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const imported = [];
  const errors = [];

  const importMany = db.transaction((rows) => {
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        if (!row.name || !row.category) {
          errors.push({ row: i + 1, error: 'Name and category required' });
          continue;
        }
        const sku = row.sku || generateSku(row.category, shopId);
        const result = insert.run(
          shopId, row.name, row.category, sku,
          parseFloat(row.cost_price) || 0,
          parseFloat(row.selling_price) || 0,
          parseFloat(row.stock_qty) || 0,
          row.unit || 'piece',
          parseFloat(row.reorder_threshold) || 5,
          row.supplier || null
        );
        imported.push(result.lastInsertRowid);
      } catch (err) {
        errors.push({ row: i + 1, error: err.message });
      }
    }
  });

  importMany(items);
  res.json({ imported: imported.length, errors });
});

export default router;
