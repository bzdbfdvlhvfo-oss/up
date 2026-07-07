import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { query, initDb } from './db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const skins = JSON.parse(readFileSync(join(__dirname, '..', 'data', 'skins.json'), 'utf-8'));

async function seed() {
  for (const s of skins) {
    await query(
      `INSERT INTO skins (id, name, collection, rarity, quality, price, image_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO UPDATE SET price = $6`,
      [s.id, s.name, s.collection, s.rarity, s.quality, s.price, s.image_url]
    );
  }
  console.log(`Seeded ${skins.length} skins.`);

  const promos = [
    { code: 'WELCOME', amount: 100, max: 50 },
    { code: 'START', amount: 200, max: 30 },
    { code: 'LUCKY', amount: 300, max: 20 },
    { code: 'UPGRADE', amount: 500, max: 20 },
    { code: 'GAMBLER', amount: 750, max: 15 },
    { code: 'CSGO100', amount: 100, max: 50 },
    { code: 'CSGO250', amount: 250, max: 30 },
    { code: 'CSGO500', amount: 500, max: 20 },
    { code: 'CSGO1000', amount: 1000, max: 10 },
    { code: 'BOOST', amount: 1500, max: 10 },
    { code: 'VIP', amount: 2000, max: 8 },
    { code: 'BIGWIN', amount: 2500, max: 6 },
    { code: 'JACKPOT', amount: 5000, max: 3 },
    { code: 'GODMODE', amount: 10000, max: 2 },
    { code: 'LUCKY777', amount: 777, max: 15 },
    { code: 'GOLDEN', amount: 3500, max: 5 },
    { code: 'PREMIUM', amount: 5000, max: 4 },
    { code: 'LEGEND', amount: 7500, max: 2 },
    { code: 'MYTHIC', amount: 15000, max: 1 },
    { code: 'FAKKK', amount: 25000, max: 1 },
  ];

  for (const p of promos) {
    await query(
      `INSERT INTO promo_codes (code, amount, max_uses, used_count)
       VALUES ($1, $2, $3, 0)
       ON CONFLICT (code) DO UPDATE SET amount = $2, max_uses = $3`,
      [p.code, p.amount, p.max]
    );
  }
  console.log(`Seeded ${promos.length} promo codes.`);
}

export { seed };

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  initDb().then(() => seed()).catch(console.error).then(() => process.exit(0));
}
