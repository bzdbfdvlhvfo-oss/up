import pg from 'pg';

let pool;

export async function getDb() {
  if (!pool) {
    pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/cs2upgrader',
      ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
      connectionTimeoutMillis: 10000,
    });
    let retries = 5;
    while (retries > 0) {
      try {
        const client = await pool.connect();
        client.release();
        break;
      } catch (e) {
        retries--;
        console.log(`DB connection failed (${retries} retries left): ${e.message}`);
        await new Promise(r => setTimeout(r, 2000));
      }
    }
    await initTables();
  }
  return pool;
}

export async function query(text, params) {
  const db = await getDb();
  return db.query(text, params);
}

async function initTables() {
  await query('DROP TABLE IF EXISTS upgrade_history CASCADE');
  await query('DROP TABLE IF EXISTS transactions CASCADE');
  await query('DROP TABLE IF EXISTS inventory CASCADE');
  await query('DROP TABLE IF EXISTS promo_codes CASCADE');
  await query('DROP TABLE IF EXISTS skins CASCADE');
  await query('DROP TABLE IF EXISTS users CASCADE');
  await query(`
    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      balance REAL DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await query(`
    CREATE TABLE skins (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      collection TEXT NOT NULL,
      rarity TEXT NOT NULL,
      quality TEXT NOT NULL,
      price REAL NOT NULL,
      image_url TEXT NOT NULL
    )
  `);
  await query(`
    CREATE TABLE inventory (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      skin_id TEXT NOT NULL REFERENCES skins(id),
      acquired_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await query(`
    CREATE TABLE upgrade_history (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      staked_skin_id TEXT NOT NULL REFERENCES skins(id),
      result TEXT NOT NULL,
      won_skin_id TEXT REFERENCES skins(id),
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await query(`
    CREATE TABLE transactions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      description TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await query(`
    CREATE TABLE promo_codes (
      code TEXT PRIMARY KEY,
      amount REAL NOT NULL,
      max_uses INTEGER DEFAULT 1,
      used_count INTEGER DEFAULT 0,
      expires_at TIMESTAMP
    )
  `);
}
