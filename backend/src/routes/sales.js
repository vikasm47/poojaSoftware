import { Router } from 'express';
import { getDb } from '../db/database.js';

const router = Router();

function getShopId() {
  return getDb().prepare('SELECT id FROM shops LIMIT 1').get().id;
}

router.get('/', (req, res) => {
  const db = getDb();
  const shopId = getShopId();
  const { from, to, limit = 50 } = req.query;

  let sql = `
    SELECT s.*, GROUP_CONCAT(i.name || ' x' || si.qty, ', ') as items_summary
    FROM sales s
    LEFT JOIN sale_items si ON si.sale_id = s.id
    LEFT JOIN items i ON i.id = si.item_id
    WHERE s.shop_id = ?
  `;
  const params = [shopId];

  if (from) { sql += ' AND date(s.sale_date) >= date(?)'; params.push(from); }
  if (to) { sql += ' AND date(s.sale_date) <= date(?)'; params.push(to); }

  sql += ' GROUP BY s.id ORDER BY s.sale_date DESC LIMIT ?';
  params.push(parseInt(limit, 10));

  res.json(db.prepare(sql).all(...params));
});

router.get('/:id', (req, res) => {
  const db = getDb();
  const sale = db.prepare('SELECT * FROM sales WHERE id = ?').get(req.params.id);
  if (!sale) return res.status(404).json({ error: 'Sale not found' });

  const items = db.prepare(`
    SELECT si.*, i.name, i.category, i.sku, i.unit
    FROM sale_items si
    JOIN items i ON i.id = si.item_id
    WHERE si.sale_id = ?
  `).all(sale.id);

  res.json({ ...sale, items });
});

router.post('/', (req, res) => {
  const db = getDb();
  const shopId = getShopId();
  const { items, discount = 0, payment_mode = 'cash', sale_date } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'At least one item is required' });
  }

  const user = db.prepare('SELECT id FROM users LIMIT 1').get();

  const createSale = db.transaction(() => {
    let subtotal = 0;
    const lineItems = [];

    for (const line of items) {
      const item = db.prepare('SELECT * FROM items WHERE id = ?').get(line.item_id);
      if (!item) throw new Error(`Item ${line.item_id} not found`);
      if (item.stock_qty < line.qty) {
        throw new Error(`Insufficient stock for ${item.name}. Available: ${item.stock_qty}`);
      }

      const price = line.price_at_sale ?? item.selling_price;
      const cost = item.cost_price;
      subtotal += price * line.qty;
      lineItems.push({ item, qty: line.qty, price, cost });
    }

    const totalAmount = Math.max(0, subtotal - (parseFloat(discount) || 0));

    const saleResult = db.prepare(`
      INSERT INTO sales (shop_id, user_id, sale_date, discount, payment_mode, total_amount)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      shopId,
      user?.id,
      sale_date || new Date().toISOString(),
      parseFloat(discount) || 0,
      payment_mode,
      totalAmount
    );

    const saleId = saleResult.lastInsertRowid;

    const insertLine = db.prepare(`
      INSERT INTO sale_items (sale_id, item_id, qty, price_at_sale, cost_at_sale)
      VALUES (?, ?, ?, ?, ?)
    `);
    const updateStock = db.prepare(`
      UPDATE items SET stock_qty = stock_qty - ?, updated_at = datetime('now') WHERE id = ?
    `);

    for (const line of lineItems) {
      insertLine.run(saleId, line.item.id, line.qty, line.price, line.cost);
      updateStock.run(line.qty, line.item.id);
    }

    return saleId;
  });

  try {
    const saleId = createSale();
    const sale = db.prepare('SELECT * FROM sales WHERE id = ?').get(saleId);
    const saleItems = db.prepare(`
      SELECT si.*, i.name, i.category FROM sale_items si JOIN items i ON i.id = si.item_id WHERE si.sale_id = ?
    `).all(saleId);
    res.status(201).json({ ...sale, items: saleItems });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/:id', (req, res) => {
  const db = getDb();
  const shopId = getShopId();
  const saleId = parseInt(req.params.id, 10);
  const { items, discount = 0, payment_mode = 'cash', sale_date } = req.body;

  const existing = db.prepare('SELECT * FROM sales WHERE id = ? AND shop_id = ?').get(saleId, shopId);
  if (!existing) return res.status(404).json({ error: 'Sale not found' });

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'At least one item is required' });
  }

  const updateSale = db.transaction(() => {
    const oldLines = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(saleId);
    const restoreStock = db.prepare(`
      UPDATE items SET stock_qty = stock_qty + ?, updated_at = datetime('now') WHERE id = ?
    `);

    for (const line of oldLines) {
      restoreStock.run(line.qty, line.item_id);
    }

    db.prepare('DELETE FROM sale_items WHERE sale_id = ?').run(saleId);

    let subtotal = 0;
    const lineItems = [];

    for (const line of items) {
      const item = db.prepare('SELECT * FROM items WHERE id = ?').get(line.item_id);
      if (!item) throw new Error(`Item ${line.item_id} not found`);
      if (item.stock_qty < line.qty) {
        throw new Error(`Insufficient stock for ${item.name}. Available: ${item.stock_qty}`);
      }

      const price = line.price_at_sale ?? item.selling_price;
      const cost = item.cost_price;
      subtotal += price * line.qty;
      lineItems.push({ item, qty: line.qty, price, cost });
    }

    const totalAmount = Math.max(0, subtotal - (parseFloat(discount) || 0));

    db.prepare(`
      UPDATE sales
      SET sale_date = ?, discount = ?, payment_mode = ?, total_amount = ?
      WHERE id = ? AND shop_id = ?
    `).run(
      sale_date || existing.sale_date,
      parseFloat(discount) || 0,
      payment_mode,
      totalAmount,
      saleId,
      shopId
    );

    const insertLine = db.prepare(`
      INSERT INTO sale_items (sale_id, item_id, qty, price_at_sale, cost_at_sale)
      VALUES (?, ?, ?, ?, ?)
    `);
    const deductStock = db.prepare(`
      UPDATE items SET stock_qty = stock_qty - ?, updated_at = datetime('now') WHERE id = ?
    `);

    for (const line of lineItems) {
      insertLine.run(saleId, line.item.id, line.qty, line.price, line.cost);
      deductStock.run(line.qty, line.item.id);
    }
  });

  try {
    updateSale();
    const sale = db.prepare('SELECT * FROM sales WHERE id = ?').get(saleId);
    const saleItems = db.prepare(`
      SELECT si.*, i.name, i.category FROM sale_items si JOIN items i ON i.id = si.item_id WHERE si.sale_id = ?
    `).all(saleId);
    res.json({ ...sale, items: saleItems });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', (req, res) => {
  const db = getDb();
  const shopId = getShopId();
  const saleId = parseInt(req.params.id, 10);

  const existing = db.prepare('SELECT * FROM sales WHERE id = ? AND shop_id = ?').get(saleId, shopId);
  if (!existing) return res.status(404).json({ error: 'Sale not found' });

  try {
    db.transaction(() => {
      const lines = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(saleId);
      const restoreStock = db.prepare(`
        UPDATE items SET stock_qty = stock_qty + ?, updated_at = datetime('now') WHERE id = ?
      `);

      for (const line of lines) {
        restoreStock.run(line.qty, line.item_id);
      }

      db.prepare('DELETE FROM sale_items WHERE sale_id = ?').run(saleId);
      db.prepare('DELETE FROM sales WHERE id = ? AND shop_id = ?').run(saleId, shopId);
    })();

    res.json({ message: 'Sale deleted and stock restored' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
