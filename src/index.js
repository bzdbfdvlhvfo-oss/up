import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { query } from './db.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: '*' }));
app.use(express.json());

function getUpgradeTargetRarity(currentRarity) {
  const tiers = ['Industrial', 'Mil-Spec', 'Restricted', 'Classified', 'Covert'];
  const idx = tiers.indexOf(currentRarity);
  if (idx === -1 || idx >= tiers.length - 1) return null;
  return tiers[idx + 1];
}

async function randomSkinByRarity(rarity, excludeId) {
  let result;
  if (excludeId) {
    result = await query('SELECT * FROM skins WHERE rarity = $1 AND id != $2', [rarity, excludeId]);
  } else {
    result = await query('SELECT * FROM skins WHERE rarity = $1', [rarity]);
  }
  if (result.rows.length === 0) return null;
  return result.rows[Math.floor(Math.random() * result.rows.length)];
}

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: 'Username required' });
    let result = await query('SELECT * FROM users WHERE username = $1', [username]);
    let user = result.rows[0];
    if (!user) {
      const id = uuidv4();
      await query('INSERT INTO users (id, username, balance) VALUES ($1, $2, 0)', [id, username]);
      user = { id, username, balance: 0 };
    }
    res.json(user);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/skins', async (req, res) => {
  try {
    const { rarity, quality, search } = req.query;
    let q = 'SELECT * FROM skins WHERE 1=1';
    const params = [];
    let idx = 1;
    if (rarity) { q += ` AND rarity = $${idx++}`; params.push(rarity); }
    if (quality) { q += ` AND quality = $${idx++}`; params.push(quality); }
    if (search) { q += ` AND name ILIKE $${idx++}`; params.push(`%${search}%`); }
    q += ' ORDER BY price DESC';
    const result = await query(q, params);
    res.json(result.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/skins/:id', async (req, res) => {
  try {
    const result = await query('SELECT * FROM skins WHERE id = $1', [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Skin not found' });
    res.json(result.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/users/:userId/inventory', async (req, res) => {
  try {
    const result = await query(`
      SELECT i.id as inventory_id, i.acquired_at, s.*
      FROM inventory i JOIN skins s ON s.id = i.skin_id
      WHERE i.user_id = $1 ORDER BY s.price DESC
    `, [req.params.userId]);
    res.json(result.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/users/:userId/skins/:skinId/buy', async (req, res) => {
  try {
    const { userId, skinId } = req.params;
    const userResult = await query('SELECT * FROM users WHERE id = $1', [userId]);
    const skinResult = await query('SELECT * FROM skins WHERE id = $1', [skinId]);
    const user = userResult.rows[0];
    const skin = skinResult.rows[0];
    if (!user || !skin) return res.status(404).json({ error: 'User or skin not found' });
    if (user.balance < skin.price) return res.status(400).json({ error: 'Недостаточно средств' });

    const invId = uuidv4();
    await query('UPDATE users SET balance = balance - $1 WHERE id = $2', [skin.price, userId]);
    await query('INSERT INTO inventory (id, user_id, skin_id) VALUES ($1, $2, $3)', [invId, userId, skinId]);
    await query('INSERT INTO transactions (id, user_id, type, amount, description) VALUES ($1, $2, $3, $4, $5)',
      [uuidv4(), userId, 'buy', -skin.price, `Куплен ${skin.name} (${skin.quality})`]);

    const bal = await query('SELECT balance FROM users WHERE id = $1', [userId]);
    res.json({ success: true, inventory_id: invId, balance: bal.rows[0].balance });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/users/:userId/inventory/:inventoryId/sell', async (req, res) => {
  try {
    const { userId, inventoryId } = req.params;
    const itemResult = await query('SELECT * FROM inventory WHERE id = $1 AND user_id = $2', [inventoryId, userId]);
    const item = itemResult.rows[0];
    if (!item) return res.status(404).json({ error: 'Item not found' });

    const skinResult = await query('SELECT * FROM skins WHERE id = $1', [item.skin_id]);
    const skin = skinResult.rows[0];
    const sellPrice = Math.round(skin.price * 0.85);

    await query('UPDATE users SET balance = balance + $1 WHERE id = $2', [sellPrice, userId]);
    await query('DELETE FROM inventory WHERE id = $1', [inventoryId]);
    await query('INSERT INTO transactions (id, user_id, type, amount, description) VALUES ($1, $2, $3, $4, $5)',
      [uuidv4(), userId, 'sell', sellPrice, `Продан ${skin.name} (${skin.quality})`]);

    const bal = await query('SELECT balance FROM users WHERE id = $1', [userId]);
    res.json({ success: true, balance: bal.rows[0].balance });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/users/:userId/upgrade', async (req, res) => {
  try {
    const { userId } = req.params;
    const { inventoryIds } = req.body;
    if (!inventoryIds || inventoryIds.length === 0) return res.status(400).json({ error: 'Select at least one skin' });

    const userResult = await query('SELECT * FROM users WHERE id = $1', [userId]);
    if (!userResult.rows[0]) return res.status(404).json({ error: 'User not found' });

    const stakedSkins = [];
    let totalValue = 0;
    for (const invId of inventoryIds) {
      const invResult = await query('SELECT * FROM inventory WHERE id = $1 AND user_id = $2', [invId, userId]);
      const inv = invResult.rows[0];
      if (!inv) return res.status(400).json({ error: `Item ${invId} not found` });
      const skinResult = await query('SELECT * FROM skins WHERE id = $1', [inv.skin_id]);
      stakedSkins.push({ inv, skin: skinResult.rows[0] });
      totalValue += skinResult.rows[0].price;
    }

    const minRarity = stakedSkins.reduce((min, s) => {
      const tiers = ['Industrial', 'Mil-Spec', 'Restricted', 'Classified', 'Covert'];
      const idx = tiers.indexOf(s.skin.rarity);
      const minIdx = tiers.indexOf(min);
      return idx < minIdx ? s.skin.rarity : min;
    }, 'Covert');

    const upgradeTier = getUpgradeTargetRarity(minRarity);
    if (!upgradeTier) return res.status(400).json({ error: 'Cannot upgrade - already max rarity' });

    const baseChance = totalValue > 0 ? Math.min(30, Math.round((totalValue / 18000) * 30)) : 5;
    const chance = Math.max(5, baseChance);
    const roll = Math.random() * 100;
    const won = roll <= chance;

    let historyId, wonSkin = null;

    if (won) {
      wonSkin = await randomSkinByRarity(upgradeTier, null);
      if (wonSkin) {
        const invId = uuidv4();
        await query('INSERT INTO inventory (id, user_id, skin_id) VALUES ($1, $2, $3)', [invId, userId, wonSkin.id]);
        historyId = uuidv4();
        await query('INSERT INTO upgrade_history (id, user_id, staked_skin_id, result, won_skin_id) VALUES ($1, $2, $3, $4, $5)',
          [historyId, userId, stakedSkins[0].skin.id, 'win', wonSkin.id]);
      }
    } else {
      for (const s of stakedSkins) {
        await query('DELETE FROM inventory WHERE id = $1', [s.inv.id]);
      }
      historyId = uuidv4();
      await query('INSERT INTO upgrade_history (id, user_id, staked_skin_id, result) VALUES ($1, $2, $3, $4)',
        [historyId, userId, stakedSkins[0].skin.id, 'lose']);
    }

    const bal = await query('SELECT balance FROM users WHERE id = $1', [userId]);
    res.json({
      success: true,
      won,
      chance,
      roll: Math.round(roll * 100) / 100,
      won_skin: wonSkin || null,
      staked_value: Math.round(totalValue),
      balance: bal.rows[0].balance
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/users/:userId/balance', async (req, res) => {
  try {
    const result = await query('SELECT id, username, balance FROM users WHERE id = $1', [req.params.userId]);
    if (!result.rows[0]) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/users/:userId/transactions', async (req, res) => {
  try {
    const result = await query('SELECT * FROM transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50', [req.params.userId]);
    res.json(result.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/users/:userId/upgrade-history', async (req, res) => {
  try {
    const result = await query(`
      SELECT h.*, s.name as staked_name
      FROM upgrade_history h JOIN skins s ON s.id = h.staked_skin_id
      WHERE h.user_id = $1 ORDER BY h.created_at DESC LIMIT 20
    `, [req.params.userId]);
    res.json(result.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Promo code
app.post('/api/users/:userId/promo', async (req, res) => {
  try {
    const { userId } = req.params;
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'Введите промокод' });

    const userResult = await query('SELECT * FROM users WHERE id = $1', [userId]);
    if (!userResult.rows[0]) return res.status(404).json({ error: 'User not found' });

    const promoResult = await query('SELECT * FROM promo_codes WHERE code = $1', [code.toUpperCase()]);
    const promo = promoResult.rows[0];
    if (!promo) return res.status(400).json({ error: 'Промокод не найден' });
    if (promo.used_count >= promo.max_uses) return res.status(400).json({ error: 'Промокод уже использован' });
    if (promo.expires_at && new Date(promo.expires_at) < new Date()) return res.status(400).json({ error: 'Промокод истёк' });

    await query('UPDATE users SET balance = balance + $1 WHERE id = $2', [promo.amount, userId]);
    await query('UPDATE promo_codes SET used_count = used_count + 1 WHERE code = $1', [code.toUpperCase()]);
    await query('INSERT INTO transactions (id, user_id, type, amount, description) VALUES ($1, $2, $3, $4, $5)',
      [uuidv4(), userId, 'promo', promo.amount, `Промокод ${promo.code}: +${promo.amount}₽`]);

    const bal = await query('SELECT balance FROM users WHERE id = $1', [userId]);
    res.json({ success: true, amount: promo.amount, balance: bal.rows[0].balance });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Promo codes list (admin)
app.get('/api/promo-codes', async (req, res) => {
  try {
    const result = await query('SELECT code, amount, max_uses, used_count, expires_at FROM promo_codes ORDER BY amount DESC');
    res.json(result.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

async function autoSeed() {
  try {
    const result = await query('SELECT COUNT(*) as count FROM skins');
    if (parseInt(result.rows[0].count) === 0) {
      console.log('Database empty, running seed...');
      const { seed } = await import('./seed.js');
      await seed();
      console.log('Auto-seed complete.');
    }
  } catch (e) {
    console.log('Auto-seed check failed:', e.message);
  }
}

process.on('uncaughtException', (e) => console.error('UNCAUGHT:', e));
process.on('unhandledRejection', (e) => console.error('UNHANDLED:', e));

app.listen(PORT, '0.0.0.0', async () => {
  console.log(`CS2 Upgrader API running on port ${PORT}`);
  try { await autoSeed(); } catch (e) { console.error('Seed error:', e); }
});
