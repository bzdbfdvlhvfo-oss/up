import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = join(__dirname, '..', 'data', 'skins.json');
const API_URL = 'https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/skins.json';

function buildFuzzyIndex(apiSkins) {
  const exact = new Map();
  const byWeapon = new Map();

  for (const s of apiSkins) {
    if (!s.name) continue;
    exact.set(s.name, s);

    const parts = s.name.split(' | ');
    if (parts.length === 2) {
      const weapon = parts[0];
      if (!byWeapon.has(weapon)) byWeapon.set(weapon, []);
      byWeapon.get(weapon).push(s);
    }
  }

  return { exact, byWeapon };
}

function findMatch(name, { exact, byWeapon }) {
  const exactMatch = exact.get(name);
  if (exactMatch) return exactMatch;

  const parts = name.split(' | ');
  if (parts.length !== 2) return null;

  const [weapon, pattern] = parts;
  const weaponSkins = byWeapon.get(weapon);
  if (!weaponSkins) return null;

  const pLower = pattern.toLowerCase();

  const candidates = weaponSkins.filter((s) => {
    const apiParts = s.name.split(' | ');
    if (apiParts.length !== 2) return false;
    const apiPattern = apiParts[1];
    return apiPattern.toLowerCase().includes(pLower);
  });

  if (candidates.length === 0) {
    const candidates2 = weaponSkins.filter((s) => {
      const apiParts = s.name.split(' | ');
      if (apiParts.length !== 2) return false;
      const apiPattern = apiParts[1];
      const words = pLower.split(/\s+/);
      return words.some((w) => w.length >= 3 && apiPattern.toLowerCase().includes(w));
    });
    if (candidates2.length === 1) return candidates2[0];
    return null;
  }

  if (candidates.length === 1) return candidates[0];

  candidates.sort((a, b) => a.name.length - b.name.length);
  return candidates[0];
}

async function main() {
  const localSkins = JSON.parse(readFileSync(DATA_PATH, 'utf-8'));
  console.log(`Read ${localSkins.length} local skins`);

  console.log('Fetching skin data from CSGO-API...');
  const response = await fetch(API_URL);
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }
  const apiSkins = await response.json();
  console.log(`Received ${apiSkins.length} items from API`);

  const index = buildFuzzyIndex(apiSkins);

  let matched = 0;
  let notFound = 0;

  for (const skin of localSkins) {
    const apiSkin = findMatch(skin.name, index);

    if (apiSkin) {
      skin.image_url = apiSkin.image || '';
      matched++;
    } else {
      console.warn(`Warning: No match for "${skin.name}"`);
      notFound++;
    }
  }

  writeFileSync(DATA_PATH, JSON.stringify(localSkins, null, 2), 'utf-8');
  console.log(`\nDone! ${matched} matched, ${notFound} not found, ${localSkins.length} total`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
