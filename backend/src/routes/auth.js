import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { getDb } from '../db/database.js';
import { signToken } from '../middleware/auth.js';
import { isLicensed } from '../services/licenseService.js';
import { config } from '../config.js';

const router = Router();

router.post('/login', (req, res) => {
  if (!isLicensed()) {
    return res.status(403).json({
      error: 'Activate your VIMMS license before logging in.',
      code: 'LICENSE_REQUIRED',
    });
  }
  const { pin, password } = req.body;
  const db = getDb();

  const user = db.prepare('SELECT * FROM users LIMIT 1').get();
  if (!user) {
    return res.status(500).json({ error: 'No user configured' });
  }

  const pinToCheck = pin || password;
  const valid = bcrypt.compareSync(pinToCheck, user.password_hash) || pinToCheck === user.pin;

  if (!valid) {
    return res.status(401).json({ error: 'Invalid PIN or password' });
  }

  const shop = db.prepare('SELECT * FROM shops WHERE id = ?').get(user.shop_id);
  const token = signToken(user);

  res.json({
    token,
    user: { id: user.id, username: user.username, role: user.role },
    shop: { id: shop.id, name: shop.name, address: shop.address, phone: shop.phone },
  });
});

router.post('/change-pin', (req, res) => {
  const { currentPin, newPin } = req.body;
  if (!newPin || newPin.length < 4) {
    return res.status(400).json({ error: 'New PIN must be at least 4 characters' });
  }

  const db = getDb();
  const user = db.prepare('SELECT * FROM users LIMIT 1').get();
  const valid = bcrypt.compareSync(currentPin, user.password_hash) || currentPin === user.pin;

  if (!valid) {
    return res.status(401).json({ error: 'Current PIN is incorrect' });
  }

  const hash = bcrypt.hashSync(newPin, 10);
  db.prepare('UPDATE users SET password_hash = ?, pin = ? WHERE id = ?').run(hash, newPin, user.id);
  res.json({ message: 'PIN updated successfully' });
});

router.get('/shop', (req, res) => {
  const db = getDb();
  const shop = db.prepare('SELECT * FROM shops LIMIT 1').get();
  res.json(shop);
});

router.put('/shop', (req, res) => {
  const { name, address, phone } = req.body;
  const db = getDb();
  const shop = db.prepare('SELECT id FROM shops LIMIT 1').get();

  db.prepare('UPDATE shops SET name = ?, address = ?, phone = ? WHERE id = ?').run(
    name || 'My Shop',
    address || null,
    phone || null,
    shop.id
  );

  res.json(db.prepare('SELECT * FROM shops WHERE id = ?').get(shop.id));
});

export default router;
