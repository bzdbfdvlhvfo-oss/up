import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = join(__dirname, '..', 'data', 'skins.json');
const API_URL = 'https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/skins.json';

function normalize(name) {
  return name
    .replace(/^★\s*/, '')
    .replace(/['']/g, '')
    .replace(/[^a-zA-Z0-9 |]/g, '')
    .trim()
    .toLowerCase();
}

function buildIndex(apiSkins) {
  const exact = new Map();
  const byWeapon = new Map();
  const allLower = [];

  for (const s of apiSkins) {
    if (!s.name) continue;
    exact.set(s.name, s);
    allLower.push({ key: normalize(s.name), skin: s });

    const parts = s.name.split(' | ');
    if (parts.length === 2) {
      const weapon = parts[0].replace(/^★\s*/, '').trim();
      if (!byWeapon.has(weapon)) byWeapon.set(weapon, []);
      byWeapon.get(weapon).push(s);
    }
  }
  return { exact, byWeapon, allLower };
}

function findMatch(name, { exact, byWeapon, allLower }) {
  const nKey = normalize(name);

  // 1. Exact match by normalized name
  const exactMatch = allLower.find(e => e.key === nKey);
  if (exactMatch) return exactMatch.skin;

  const parts = name.split(' | ');
  if (parts.length !== 2) return null;

  const weapon = parts[0].replace(/^★\s*/, '').trim();
  const pattern = parts[1].trim();
  const pLower = pattern.toLowerCase();

  // 2. Try weapon + pattern includes
  const weaponSkins = byWeapon.get(weapon);
  if (weaponSkins) {
    const byPattern = weaponSkins.filter(s => {
      const sp = s.name.split(' | ');
      return sp.length === 2 && sp[1].toLowerCase().includes(pLower);
    });
    if (byPattern.length === 1) return byPattern[0];
    if (byPattern.length > 1) {
      byPattern.sort((a, b) => a.name.length - b.name.length);
      return byPattern[0];
    }

    // Try matching reversed word order
    const patternWords = pLower.split(/\s+/).filter(w => w.length > 2);
    for (const ws of weaponSkins) {
      const apiPat = ws.name.split(' | ')[1]?.toLowerCase() || '';
      const matchCount = patternWords.filter(w => apiPat.includes(w)).length;
      if (matchCount === patternWords.length && patternWords.length > 0) return ws;
    }

    // Fallback: any skin from same weapon with matching first word
    const firstWord = patternWords[0];
    if (firstWord) {
      const fw = weaponSkins.filter(s => {
        const apiPat = s.name.split(' | ')[1]?.toLowerCase() || '';
        return apiPat.includes(firstWord);
      });
      if (fw.length === 1) return fw[0];
    }
  }

  // 3. Search by pattern name across all skins
  const allByPattern = allLower.filter(e => {
    const ep = e.key.split(' | ');
    return ep.length === 2 && ep[1].includes(pLower);
  });
  if (allByPattern.length === 1) return allByPattern[0].skin;
  if (allByPattern.length > 1) {
    allByPattern.sort((a, b) => a.key.length - b.key.length);
    return allByPattern[0].skin;
  }

  // 4. Weapon-specific fallback: get any skin for this weapon
  if (weaponSkins && weaponSkins.length > 0) {
    return weaponSkins[Math.floor(Math.random() * weaponSkins.length)];
  }

  return null;
}

async function main() {
  const localSkins = JSON.parse(readFileSync(DATA_PATH, 'utf-8'));
  console.log(`Read ${localSkins.length} local skins`);

  console.log('Fetching skin data from CSGO-API...');
  const response = await fetch(API_URL);
  if (!response.ok) throw new Error(`API request failed: ${response.status}`);
  const apiSkins = await response.json();

  // Filter to only weapon skins (not gloves, stickers, etc.)
  const weaponSkins = apiSkins.filter(s => s.name && s.name.includes(' | ') && s.image);
  console.log(`Received ${apiSkins.length} items, filtered to ${weaponSkins.length} weapon skins`);

  const index = buildIndex(weaponSkins);

  let matched = 0;
  let notFound = 0;
  let fallback = 0;

  for (const skin of localSkins) {
    const apiSkin = findMatch(skin.name, index);

    if (apiSkin) {
      if (normalize(apiSkin.name) === normalize(skin.name)) {
        skin.image_url = apiSkin.image || '';
        matched++;
      } else {
        // Fuzzy match or fallback
        skin.image_url = apiSkin.image || '';
        console.log(`  Fuzzy: "${skin.name}" -> "${apiSkin.name}"`);
        fallback++;
      }
    } else {
      console.warn(`  NO MATCH: "${skin.name}"`);
      notFound++;
    }
  }

  writeFileSync(DATA_PATH, JSON.stringify(localSkins, null, 2), 'utf-8');
  console.log(`\nDone! ${matched} exact, ${fallback} fuzzy, ${notFound} not found`);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
