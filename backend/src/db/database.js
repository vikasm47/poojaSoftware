import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { config } from '../config.js';

let db;

export function getDb() {
  if (!db) throw new Error('Database not initialized');
  return db;
}

export function initDatabase() {
  fs.mkdirSync(config.dataDir, { recursive: true });
  fs.mkdirSync(config.uploadsDir, { recursive: true });

  const dbPath = path.join(config.dataDir, 'pooja_shop.db');
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS shops (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      address TEXT,
      phone TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shop_id INTEGER NOT NULL,
      username TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      pin TEXT,
      role TEXT NOT NULL DEFAULT 'owner',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (shop_id) REFERENCES shops(id)
    );

    CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shop_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      sku TEXT NOT NULL,
      cost_price REAL NOT NULL DEFAULT 0,
      selling_price REAL NOT NULL DEFAULT 0,
      stock_qty REAL NOT NULL DEFAULT 0,
      unit TEXT NOT NULL DEFAULT 'piece',
      reorder_threshold REAL NOT NULL DEFAULT 5,
      supplier TEXT,
      supplier_contact TEXT,
      photo_path TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (shop_id) REFERENCES shops(id),
      UNIQUE(shop_id, sku)
    );

    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shop_id INTEGER NOT NULL,
      user_id INTEGER,
      sale_date TEXT NOT NULL DEFAULT (datetime('now')),
      discount REAL NOT NULL DEFAULT 0,
      payment_mode TEXT NOT NULL DEFAULT 'cash',
      total_amount REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (shop_id) REFERENCES shops(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS sale_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER NOT NULL,
      item_id INTEGER NOT NULL,
      qty REAL NOT NULL,
      price_at_sale REAL NOT NULL,
      cost_at_sale REAL NOT NULL DEFAULT 0,
      FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
      FOREIGN KEY (item_id) REFERENCES items(id)
    );

    CREATE TABLE IF NOT EXISTS purchases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shop_id INTEGER NOT NULL,
      user_id INTEGER,
      purchase_date TEXT NOT NULL DEFAULT (datetime('now')),
      item_id INTEGER NOT NULL,
      qty REAL NOT NULL,
      cost_price_at_purchase REAL NOT NULL,
      supplier TEXT,
      total_amount REAL NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (shop_id) REFERENCES shops(id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (item_id) REFERENCES items(id)
    );

    CREATE TABLE IF NOT EXISTS report_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shop_id INTEGER NOT NULL,
      period_type TEXT NOT NULL,
      period_key TEXT NOT NULL,
      data_json TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (shop_id) REFERENCES shops(id),
      UNIQUE(shop_id, period_type, period_key)
    );

    CREATE TABLE IF NOT EXISTS advisor_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shop_id INTEGER NOT NULL,
      cache_key TEXT NOT NULL,
      response_json TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (shop_id) REFERENCES shops(id),
      UNIQUE(shop_id, cache_key)
    );

    CREATE INDEX IF NOT EXISTS idx_items_shop ON items(shop_id);
    CREATE INDEX IF NOT EXISTS idx_items_category ON items(category);
    CREATE INDEX IF NOT EXISTS idx_sales_shop_date ON sales(shop_id, sale_date);
    CREATE INDEX IF NOT EXISTS idx_purchases_shop_date ON purchases(shop_id, purchase_date);
  `);

  seedDefaultData();
  return db;
}

function seedDefaultData() {
  const shopCount = db.prepare('SELECT COUNT(*) as c FROM shops').get().c;
  if (shopCount > 0) return;

  const insertShop = db.prepare('INSERT INTO shops (name) VALUES (?)');
  const shopResult = insertShop.run(config.shopName);
  const shopId = shopResult.lastInsertRowid;

  const pinHash = bcrypt.hashSync(config.defaultPin, 10);
  db.prepare(
    'INSERT INTO users (shop_id, username, password_hash, pin, role) VALUES (?, ?, ?, ?, ?)'
  ).run(shopId, 'owner', pinHash, config.defaultPin, 'owner');

  const categories = [
    ['Brass Diya Set', 'Diyas', 'DIY-001', 45, 80, 50, 'piece', 10],
    ['Agarbatti Premium Pack', 'Incense', 'INC-001', 25, 45, 100, 'packet', 20],
    ['Ganesha Idol Small', 'Idols', 'IDL-001', 120, 250, 15, 'piece', 5],
    ['Pooja Thali Brass', 'Thalis', 'THL-001', 180, 350, 12, 'piece', 5],
    ['Camphor Box', 'Camphor', 'CAM-001', 30, 55, 40, 'box', 10],
    ['Kumkum Sindoor Set', 'Kumkum/Sindoor', 'KUM-001', 15, 30, 60, 'piece', 15],
    ['Marigold Garland', 'Garlands', 'GAR-001', 20, 40, 25, 'piece', 8],
    ['Brass Bell Small', 'Miscellaneous', 'BEL-001', 80, 150, 20, 'piece', 5],
  ];

  const insertItem = db.prepare(`
    INSERT INTO items (shop_id, name, category, sku, cost_price, selling_price, stock_qty, unit, reorder_threshold)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const item of categories) {
    insertItem.run(shopId, ...item);
  }
}

export function getStockStatus(stockQty, reorderThreshold) {
  if (stockQty <= 0) return 'out_of_stock';
  if (stockQty <= reorderThreshold) return 'low_stock';
  return 'in_stock';
}

export function formatItem(row) {
  if (!row) return null;
  return {
    ...row,
    stock_status: getStockStatus(row.stock_qty, row.reorder_threshold),
  };
}
