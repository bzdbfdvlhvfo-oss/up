import express from 'express';
import cors from 'cors';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { query, initDb } from './db.js';
import { initBot } from './bot.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'frontend', 'dist')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, '..', 'frontend', 'dist', 'index.html')));

function hash(pw) {
  return crypto.createHash('sha256').update(pw + 'cs2salt').digest('hex');
}

// Auth
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
    const exist = await query('SELECT id FROM users WHERE username = $1', [username]);
    if (exist.rows[0]) return res.status(400).json({ error: 'Username already taken' });
    const id = uuidv4();
    await query('INSERT INTO users (id, username, password, balance) VALUES ($1,$2,$3,0)', [id, username, hash(password)]);
    res.json({ id, username, balance: 0 });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username) return res.status(400).json({ error: 'Username required' });
    const result = await query('SELECT * FROM users WHERE username = $1', [username]);
    const user = result.rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.password && user.password !== hash(password || '')) return res.status(403).json({ error: 'Wrong password' });
    res.json({ id: user.id, username: user.username, balance: user.balance });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Skins
app.get('/api/skins', async (req, res) => {
  try {
    const { rarity, quality, search, min, max, category } = req.query;
    let q = 'SELECT * FROM skins WHERE 1=1';
    const p = []; let i = 1;
    if (rarity) { q += ` AND rarity = $${i++}`; p.push(rarity); }
    if (quality) { q += ` AND quality = $${i++}`; p.push(quality); }
    if (search) { q += ` AND name ILIKE $${i++}`; p.push(`%${search}%`); }
    if (min) { q += ` AND price >= $${i++}`; p.push(parseFloat(min)); }
    if (max) { q += ` AND price <= $${i++}`; p.push(parseFloat(max)); }
    if (category) { q += ` AND category = $${i++}`; p.push(category); }
    q += ' ORDER BY price DESC';
    const r = await query(q, p);
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/skins/:id', async (req, res) => {
  try {
    const r = await query('SELECT * FROM skins WHERE id = $1', [req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ error: 'Skin not found' });
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Inventory
app.get('/api/users/:userId/inventory', async (req, res) => {
  try {
    const r = await query(`SELECT i.id as inventory_id, i.acquired_at, i.withdrawn_at, s.* FROM inventory i JOIN skins s ON s.id = i.skin_id WHERE i.user_id = $1 ORDER BY s.price DESC`, [req.params.userId]);
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/users/:userId/skins/:skinId/buy', async (req, res) => {
  try {
    const { userId, skinId } = req.params;
    const u = (await query('SELECT * FROM users WHERE id = $1', [userId])).rows[0];
    const skin = (await query('SELECT * FROM skins WHERE id = $1', [skinId])).rows[0];
    if (!u || !skin) return res.status(404).json({ error: 'Not found' });
    if (u.balance < skin.price) return res.status(400).json({ error: 'Недостаточно средств' });
    const invId = uuidv4();
    await query('UPDATE users SET balance = balance - $1 WHERE id = $2', [skin.price, userId]);
    await query('INSERT INTO inventory (id, user_id, skin_id) VALUES ($1,$2,$3)', [invId, userId, skinId]);
    await query('INSERT INTO transactions (id,user_id,type,amount,description) VALUES ($1,$2,$3,$4,$5)',
      [uuidv4(), userId, 'buy', -skin.price, `Куплен ${skin.name} (${skin.quality})`]);
    res.json({ success: true, inventory_id: invId, balance: (await query('SELECT balance FROM users WHERE id = $1', [userId])).rows[0].balance });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/users/:userId/inventory/:inventoryId/sell', async (req, res) => {
  try {
    const { userId, inventoryId } = req.params;
    const item = (await query('SELECT * FROM inventory WHERE id = $1 AND user_id = $2', [inventoryId, userId])).rows[0];
    if (!item) return res.status(404).json({ error: 'Item not found' });
    const skin = (await query('SELECT * FROM skins WHERE id = $1', [item.skin_id])).rows[0];
    const price = Math.round(skin.price * 0.85);
    await query('UPDATE users SET balance = balance + $1 WHERE id = $2', [price, userId]);
    await query('DELETE FROM inventory WHERE id = $1', [inventoryId]);
    await query('INSERT INTO transactions (id,user_id,type,amount,description) VALUES ($1,$2,$3,$4,$5)',
      [uuidv4(), userId, 'sell', price, `Продан ${skin.name} (${skin.quality})`]);
    res.json({ success: true, balance: (await query('SELECT balance FROM users WHERE id = $1', [userId])).rows[0].balance });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Upgrade — price-based, with multiplier/chance selection
app.post('/api/users/:userId/upgrade', async (req, res) => {
  try {
    const { userId } = req.params;
    const { inventoryId, mode, value } = req.body; // mode: 'chance' or 'multiplier', value: the chance % or multiplier number
    if (!inventoryId) return res.status(400).json({ error: 'Select a skin' });

    const inv = (await query('SELECT * FROM inventory WHERE id = $1 AND user_id = $2', [inventoryId, userId])).rows[0];
    if (!inv) return res.status(400).json({ error: 'Skin not found in inventory' });
    const skin = (await query('SELECT * FROM skins WHERE id = $1', [inv.skin_id])).rows[0];
    const stakedPrice = skin.price;

    let multiplier;
    if (mode === 'chance') {
      const chance = Math.min(95, Math.max(1, parseFloat(value) || 50));
      multiplier = Math.round((100 / chance) * 100) / 100;
    } else {
      multiplier = Math.min(10, Math.max(1.01, parseFloat(value) || 2));
    }

    const chance = Math.round((1 / multiplier) * 98 * 100) / 100;
    const targetMin = Math.round(stakedPrice * multiplier * 0.9);
    const targetMax = Math.round(stakedPrice * multiplier * 1.4);

    // Find skins in the price range
    const targets = (await query('SELECT * FROM skins WHERE price >= $1 AND price <= $2 ORDER BY price ASC', [targetMin, targetMax])).rows;
    if (targets.length === 0) {
      return res.status(400).json({ error: 'No suitable target skins found in this range' });
    }

    const roll = Math.random() * 100;
    const won = roll <= chance;
    let wonSkin = null;

    await query('DELETE FROM inventory WHERE id = $1', [inventoryId]);

    if (won) {
      wonSkin = targets[Math.floor(Math.random() * targets.length)];
      const newInvId = uuidv4();
      await query('INSERT INTO inventory (id, user_id, skin_id) VALUES ($1,$2,$3)', [newInvId, userId, wonSkin.id]);
      await query('INSERT INTO upgrade_history (id, user_id, staked_skin_id, result, won_skin_id, multiplier) VALUES ($1,$2,$3,$4,$5,$6)',
        [uuidv4(), userId, skin.id, 'win', wonSkin.id, multiplier]);
    } else {
      await query('INSERT INTO upgrade_history (id, user_id, staked_skin_id, result, multiplier) VALUES ($1,$2,$3,$4,$5)',
        [uuidv4(), userId, skin.id, 'lose', multiplier]);
    }

    res.json({
      success: true, won, chance, roll: Math.round(roll * 100) / 100,
      multiplier, staked: { id: skin.id, name: skin.name, price: stakedPrice },
      won_skin: wonSkin ? { id: wonSkin.id, name: wonSkin.name, price: wonSkin.price, rarity: wonSkin.rarity, quality: wonSkin.quality } : null,
      balance: (await query('SELECT balance FROM users WHERE id = $1', [userId])).rows[0].balance
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// User info
app.get('/api/users/:userId', async (req, res) => {
  try {
    const u = (await query('SELECT id, username, balance, telegram_chat_id, telegram_sub_checked FROM users WHERE id = $1', [req.params.userId])).rows[0];
    if (!u) return res.status(404).json({ error: 'User not found' });
    res.json({ ...u, telegram_linked: !!u.telegram_chat_id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Balance
app.get('/api/users/:userId/balance', async (req, res) => {
  try {
    const u = (await query('SELECT id, username, balance FROM users WHERE id = $1', [req.params.userId])).rows[0];
    if (!u) return res.status(404).json({ error: 'User not found' });
    res.json(u);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/users/:userId/transactions', async (req, res) => {
  try {
    res.json((await query('SELECT * FROM transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50', [req.params.userId])).rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/users/:userId/upgrade-history', async (req, res) => {
  try {
    res.json((await query(`SELECT h.*, s.name as staked_name FROM upgrade_history h JOIN skins s ON s.id = h.staked_skin_id WHERE h.user_id = $1 ORDER BY h.created_at DESC LIMIT 20`, [req.params.userId])).rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Promo
app.post('/api/users/:userId/promo', async (req, res) => {
  try {
    const { userId } = req.params;
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'Введите промокод' });
    const promo = (await query('SELECT * FROM promo_codes WHERE code = $1', [code.toUpperCase()])).rows[0];
    if (!promo) return res.status(400).json({ error: 'Промокод не найден' });
    if (!promo.active) return res.status(400).json({ error: 'Промокод деактивирован' });
    if (promo.used_count >= promo.max_uses) return res.status(400).json({ error: 'Промокод уже использован' });
    await query('UPDATE users SET balance = balance + $1 WHERE id = $2', [promo.amount, userId]);
    await query('UPDATE promo_codes SET used_count = used_count + 1 WHERE code = $1', [code.toUpperCase()]);
    await query('INSERT INTO transactions (id,user_id,type,amount,description) VALUES ($1,$2,$3,$4,$5)',
      [uuidv4(), userId, 'promo', promo.amount, `Промокод ${promo.code}: +${promo.amount}₽`]);
    res.json({ success: true, amount: promo.amount, balance: (await query('SELECT balance FROM users WHERE id = $1', [userId])).rows[0].balance });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/promo-codes', async (req, res) => {
  try {
    res.json((await query('SELECT code, amount, max_uses, used_count FROM promo_codes WHERE active = true ORDER BY amount DESC')).rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Withdraw to Steam (simulated)
app.post('/api/users/:userId/inventory/:inventoryId/withdraw', async (req, res) => {
  try {
    const { userId, inventoryId } = req.params;
    const item = (await query('SELECT * FROM inventory WHERE id = $1 AND user_id = $2', [inventoryId, userId])).rows[0];
    if (!item) return res.status(404).json({ error: 'Item not found' });
    if (item.withdrawn_at) return res.status(400).json({ error: 'Уже выведен' });
    const skin = (await query('SELECT * FROM skins WHERE id = $1', [item.skin_id])).rows[0];
    await query('UPDATE inventory SET withdrawn_at = NOW() WHERE id = $1', [inventoryId]);
    await query('INSERT INTO transactions (id,user_id,type,amount,description) VALUES ($1,$2,$3,$4,$5)',
      [uuidv4(), userId, 'withdraw', 0, `Выведен в Steam: ${skin.name} StatTrak™ ✓`]);
    res.json({ success: true, message: 'Скин выведен в Steam', inventory_id: inventoryId });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

async function start() {
  try { await initDb(); console.log('Database ready'); }
  catch (e) { console.error('DB init failed:', e); process.exit(1); }
  initBot(query);
  app.listen(PORT, '0.0.0.0', () => console.log(`Server on port ${PORT}`));
}
start();
