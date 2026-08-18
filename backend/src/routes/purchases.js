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
    SELECT p.*, i.name as item_name, i.category, i.sku, i.unit
    FROM purchases p
    JOIN items i ON i.id = p.item_id
    WHERE p.shop_id = ?
  `;
  const params = [shopId];

  if (from) { sql += ' AND date(p.purchase_date) >= date(?)'; params.push(from); }
  if (to) { sql += ' AND date(p.purchase_date) <= date(?)'; params.push(to); }

  sql += ' ORDER BY p.purchase_date DESC LIMIT ?';
  params.push(parseInt(limit, 10));

  res.json(db.prepare(sql).all(...params));
});

router.post('/', (req, res) => {
  const db = getDb();
  const shopId = getShopId();
  const { item_id, qty, cost_price_at_purchase, supplier, purchase_date } = req.body;

  if (!item_id || !qty) {
    return res.status(400).json({ error: 'Item and quantity are required' });
  }

  const item = db.prepare('SELECT * FROM items WHERE id = ?').get(item_id);
  if (!item) return res.status(404).json({ error: 'Item not found' });

  const cost = parseFloat(cost_price_at_purchase) ?? item.cost_price;
  const quantity = parseFloat(qty);
  const totalAmount = cost * quantity;
  const user = db.prepare('SELECT id FROM users LIMIT 1').get();

  const createPurchase = db.transaction(() => {
    const result = db.prepare(`
      INSERT INTO purchases (shop_id, user_id, purchase_date, item_id, qty, cost_price_at_purchase, supplier, total_amount)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      shopId,
      user?.id,
      purchase_date || new Date().toISOString(),
      item_id,
      quantity,
      cost,
      supplier || item.supplier,
      totalAmount
    );

    db.prepare(`
      UPDATE items SET stock_qty = stock_qty + ?, cost_price = ?, updated_at = datetime('now') WHERE id = ?
    `).run(quantity, cost, item_id);

    return result.lastInsertRowid;
  });

  const purchaseId = createPurchase();
  const purchase = db.prepare(`
    SELECT p.*, i.name as item_name, i.category FROM purchases p JOIN items i ON i.id = p.item_id WHERE p.id = ?
  `).get(purchaseId);

  res.status(201).json(purchase);
});

export default router;
