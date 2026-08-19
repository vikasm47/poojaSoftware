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

router.get('/:id', (req, res) => {
  const db = getDb();
  const shopId = getShopId();
  const purchase = db.prepare(`
    SELECT p.*, i.name as item_name, i.category, i.sku, i.unit
    FROM purchases p
    JOIN items i ON i.id = p.item_id
    WHERE p.id = ? AND p.shop_id = ?
  `).get(req.params.id, shopId);

  if (!purchase) return res.status(404).json({ error: 'Purchase not found' });
  res.json(purchase);
});

router.post('/', (req, res) => {
  const db = getDb();
  const shopId = getShopId();
  const { items, item_id, qty, cost_price_at_purchase, supplier, purchase_date } = req.body;

  if (Array.isArray(items) && items.length > 0) {
    const user = db.prepare('SELECT id FROM users LIMIT 1').get();
    const date = purchase_date || new Date().toISOString();
    const defaultSupplier = supplier || '';

    try {
      const purchaseIds = db.transaction(() => {
        const ids = [];
        const insertPurchase = db.prepare(`
          INSERT INTO purchases (shop_id, user_id, purchase_date, item_id, qty, cost_price_at_purchase, supplier, total_amount)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        const updateStock = db.prepare(`
          UPDATE items SET stock_qty = stock_qty + ?, cost_price = ?, updated_at = datetime('now') WHERE id = ?
        `);

        for (const line of items) {
          if (!line.item_id || !line.qty) {
            throw new Error('Each item needs item_id and qty');
          }

          const item = db.prepare('SELECT * FROM items WHERE id = ?').get(line.item_id);
          if (!item) throw new Error(`Item ${line.item_id} not found`);

          const cost = parseFloat(line.cost_price_at_purchase) ?? item.cost_price;
          const quantity = parseFloat(line.qty);
          const totalAmount = cost * quantity;
          const lineSupplier = line.supplier || defaultSupplier || item.supplier;

          const result = insertPurchase.run(
            shopId,
            user?.id,
            date,
            line.item_id,
            quantity,
            cost,
            lineSupplier,
            totalAmount
          );

          updateStock.run(quantity, cost, line.item_id);
          ids.push(result.lastInsertRowid);
        }

        return ids;
      })();

      const purchases = purchaseIds.map((id) => db.prepare(`
        SELECT p.*, i.name as item_name, i.category, i.unit
        FROM purchases p JOIN items i ON i.id = p.item_id WHERE p.id = ?
      `).get(id));

      return res.status(201).json({ purchases, count: purchases.length });
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  }

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

router.put('/:id', (req, res) => {
  const db = getDb();
  const shopId = getShopId();
  const purchaseId = parseInt(req.params.id, 10);
  const { item_id, qty, cost_price_at_purchase, supplier, purchase_date } = req.body;

  const existing = db.prepare('SELECT * FROM purchases WHERE id = ? AND shop_id = ?').get(purchaseId, shopId);
  if (!existing) return res.status(404).json({ error: 'Purchase not found' });

  if (!item_id || !qty) {
    return res.status(400).json({ error: 'Item and quantity are required' });
  }

  const item = db.prepare('SELECT * FROM items WHERE id = ?').get(item_id);
  if (!item) return res.status(404).json({ error: 'Item not found' });

  const cost = parseFloat(cost_price_at_purchase) ?? item.cost_price;
  const quantity = parseFloat(qty);
  const totalAmount = cost * quantity;

  try {
    db.transaction(() => {
      const oldItem = db.prepare('SELECT * FROM items WHERE id = ?').get(existing.item_id);
      if (oldItem.stock_qty < existing.qty) {
        throw new Error(`Cannot update — only ${oldItem.stock_qty} ${oldItem.unit} left in stock from this purchase`);
      }

      db.prepare(`
        UPDATE items SET stock_qty = stock_qty - ?, updated_at = datetime('now') WHERE id = ?
      `).run(existing.qty, existing.item_id);

      const newItem = db.prepare('SELECT * FROM items WHERE id = ?').get(item_id);

      db.prepare(`
        UPDATE items SET stock_qty = stock_qty + ?, cost_price = ?, updated_at = datetime('now') WHERE id = ?
      `).run(quantity, cost, item_id);

      db.prepare(`
        UPDATE purchases
        SET purchase_date = ?, item_id = ?, qty = ?, cost_price_at_purchase = ?, supplier = ?, total_amount = ?
        WHERE id = ? AND shop_id = ?
      `).run(
        purchase_date || existing.purchase_date,
        item_id,
        quantity,
        cost,
        supplier ?? existing.supplier ?? newItem.supplier,
        totalAmount,
        purchaseId,
        shopId
      );
    })();

    const purchase = db.prepare(`
      SELECT p.*, i.name as item_name, i.category FROM purchases p JOIN items i ON i.id = p.item_id WHERE p.id = ?
    `).get(purchaseId);

    res.json(purchase);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', (req, res) => {
  const db = getDb();
  const shopId = getShopId();
  const purchaseId = parseInt(req.params.id, 10);

  const existing = db.prepare('SELECT * FROM purchases WHERE id = ? AND shop_id = ?').get(purchaseId, shopId);
  if (!existing) return res.status(404).json({ error: 'Purchase not found' });

  const item = db.prepare('SELECT * FROM items WHERE id = ?').get(existing.item_id);
  if (item.stock_qty < existing.qty) {
    return res.status(400).json({
      error: `Cannot delete — only ${item.stock_qty} ${item.unit} remain in stock from this purchase`,
    });
  }

  try {
    db.transaction(() => {
      db.prepare(`
        UPDATE items SET stock_qty = stock_qty - ?, updated_at = datetime('now') WHERE id = ?
      `).run(existing.qty, existing.item_id);

      db.prepare('DELETE FROM purchases WHERE id = ? AND shop_id = ?').run(purchaseId, shopId);
    })();

    res.json({ message: 'Purchase deleted and stock adjusted' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
