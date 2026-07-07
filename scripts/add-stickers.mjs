import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = join(__dirname, '..', 'data', 'skins.json');
const API_URL = 'https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/stickers.json';

const PRICE_MAP = {
  'High Grade': 150,
  'Remarkable': 800,
  'Exotic': 4000,
  'Extraordinary': 25000,
  'Contraband': 100000,
  'Base Grade': 50,
};

async function main() {
  const response = await fetch(API_URL);
  const allStickers = await response.json();

  // Pick popular players + capsules
  const keywords = ['s1mple', 'ZywOo', 'donk', 'm0NESY', 'NiKo', 'device', 'Capsule', 'Paris', 'Antwerp', 'Rio',
    'Shanghai', 'Cologne', 'Major', 'Katowice', 'Stockholm', 'Boston', 'London', 'Berlin', 'Krakow', 'Atlanta'];
  
  const picked = new Set();
  const items = [];

  for (const kw of keywords) {
    const matches = allStickers.filter(s => 
      !picked.has(s.id) && s.name && s.image && s.name.includes(kw)
    );
    // Pick up to 2 per keyword (gold/holo)
    const picks = matches.slice(0, 2);
    for (const p of picks) {
      picked.add(p.id);
      const rarityName = p.rarity?.name || 'High Grade';
      const basePrice = PRICE_MAP[rarityName] || 500;
      const priceVariance = 0.7 + Math.random() * 0.6;
      items.push({
        id: uuidv4(),
        name: p.name,
        collection: p.collection || '',
        rarity: rarityName,
        quality: '',
        image_url: p.image || '',
        price: Math.round(basePrice * priceVariance),
        category: 'sticker',
      });
    }
  }

  console.log(`Picked ${items.length} stickers`);

  const existing = JSON.parse(readFileSync(DATA_PATH, 'utf-8'));
  // Remove any existing sticker items
  const cleanExisting = existing.filter(s => s.category !== 'sticker' && s.category !== 'charm');
  const allItems = [...cleanExisting, ...items];
  
  writeFileSync(DATA_PATH, JSON.stringify(allItems, null, 2), 'utf-8');
  console.log(`Total items: ${allItems.length} (${existing.length - cleanExisting.length} removed, ${items.length} added)`);
}

main().catch(e => { console.error(e); process.exit(1); });
