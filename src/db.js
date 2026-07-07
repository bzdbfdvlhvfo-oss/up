import pg from 'pg';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

let pool;

export async function initDb() {
  const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/cs2upgrader';
  pool = new pg.Pool({
    connectionString,
    ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 15000,
  });
  let retries = 10;
  while (retries > 0) {
    try {
      const client = await pool.connect();
      client.release();
      break;
    } catch (e) {
      retries--;
      console.log(`DB connect retry (${retries} left): ${e.message}`);
      await new Promise(r => setTimeout(r, 3000));
    }
  }
  if (retries === 0) throw new Error('Could not connect to database');
  await initTables();
  await autoSeed();
}

export async function query(text, params) {
  return pool.query(text, params);
}

async function initTables() {
  await query(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL DEFAULT '',
    balance REAL DEFAULT 0, created_at TIMESTAMP DEFAULT NOW()
  )`);
  await query(`CREATE TABLE IF NOT EXISTS skins (
    id TEXT PRIMARY KEY, name TEXT NOT NULL,
    collection TEXT NOT NULL DEFAULT '', rarity TEXT NOT NULL,
    quality TEXT NOT NULL, price REAL NOT NULL, image_url TEXT NOT NULL DEFAULT ''
  )`);
  await query(`CREATE TABLE IF NOT EXISTS inventory (
    id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id),
    skin_id TEXT NOT NULL REFERENCES skins(id), acquired_at TIMESTAMP DEFAULT NOW()
  )`);
  await query(`CREATE TABLE IF NOT EXISTS upgrade_history (
    id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id),
    staked_skin_id TEXT NOT NULL REFERENCES skins(id),
    result TEXT NOT NULL, won_skin_id TEXT REFERENCES skins(id),
    multiplier REAL DEFAULT 1, created_at TIMESTAMP DEFAULT NOW()
  )`);
  await query(`CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id),
    type TEXT NOT NULL, amount REAL NOT NULL, description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
  )`);
  await query(`CREATE TABLE IF NOT EXISTS promo_codes (
    code TEXT PRIMARY KEY, amount REAL NOT NULL,
    max_uses INTEGER DEFAULT 1, used_count INTEGER DEFAULT 0, expires_at TIMESTAMP
  )`);
  // Migrate old tables that may be missing columns
  await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS password TEXT DEFAULT ''`).catch(() => {});
  await query(`ALTER TABLE upgrade_history ADD COLUMN IF NOT EXISTS multiplier REAL DEFAULT 1`).catch(() => {});
  await query(`ALTER TABLE upgrade_history ADD COLUMN IF NOT EXISTS won_skin_id TEXT REFERENCES skins(id)`).catch(() => {});
  await query(`ALTER TABLE skins ADD COLUMN IF NOT EXISTS category TEXT DEFAULT ''`).catch(() => {});
  console.log('Tables ready');
}

async function autoSeed() {
  console.log('Seeding data...');
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const skins = JSON.parse(readFileSync(join(__dirname, '..', 'data', 'skins.json'), 'utf-8'));
  let count = 0;
  for (const s of skins) {
    const r = await query(`INSERT INTO skins (id, name, collection, rarity, quality, price, image_url, category) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (id) DO UPDATE SET price=$6, image_url=$7, category=$8`,
      [s.id, s.name, s.collection || '', s.rarity, s.quality, s.price, s.image_url || '', s.category || '']);
    if (r.rowCount > 0) count++;
  }
  const promos = [
    { code: 'WELCOME', amount: 100, max: 50 }, { code: 'START', amount: 200, max: 30 },
    { code: 'LUCKY', amount: 300, max: 20 }, { code: 'UPGRADE', amount: 500, max: 20 },
    { code: 'GAMBLER', amount: 750, max: 15 }, { code: 'CSGO100', amount: 100, max: 50 },
    { code: 'CSGO250', amount: 250, max: 30 }, { code: 'CSGO500', amount: 500, max: 20 },
    { code: 'CSGO1000', amount: 1000, max: 10 }, { code: 'BOOST', amount: 1500, max: 10 },
    { code: 'VIP', amount: 2000, max: 8 }, { code: 'BIGWIN', amount: 2500, max: 6 },
    { code: 'JACKPOT', amount: 5000, max: 3 }, { code: 'GODMODE', amount: 10000, max: 2 },
    { code: 'LUCKY777', amount: 777, max: 15 }, { code: 'GOLDEN', amount: 3500, max: 5 },
    { code: 'PREMIUM', amount: 5000, max: 4 }, { code: 'LEGEND', amount: 7500, max: 2 },
    { code: 'MYTHIC', amount: 15000, max: 1 }, { code: 'FAKKK', amount: 25000, max: 1 },
    { code: 'GODLIKE', amount: 600000, max: 1 },
    { code: 'HUGE', amount: 100000, max: 100 }, { code: 'BIG', amount: 10000, max: 1000 },
    { code: 'SMALL', amount: 1000, max: 10000 },
  ];
  for (const p of promos) {
    await query(`INSERT INTO promo_codes (code, amount, max_uses, used_count) VALUES ($1,$2,$3,0) ON CONFLICT (code) DO NOTHING`,
      [p.code, p.amount, p.max]);
  }
  console.log(`Seeded ${skins.length} skins, ${promos.length} promo codes`);
}
