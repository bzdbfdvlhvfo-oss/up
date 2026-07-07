const BASE = '/api';

async function request(url, opts = {}) {
  const res = await fetch(BASE + url, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

export function login(username) {
  return request('/auth/login', { method: 'POST', body: JSON.stringify({ username }) });
}

export function getSkins(filters = {}) {
  const params = new URLSearchParams(filters).toString();
  return request(`/skins${params ? '?' + params : ''}`);
}

export function getSkin(id) {
  return request(`/skins/${id}`);
}

export function getInventory(userId) {
  return request(`/users/${userId}/inventory`);
}

export function buySkin(userId, skinId) {
  return request(`/users/${userId}/skins/${skinId}/buy`, { method: 'POST' });
}

export function sellSkin(userId, inventoryId) {
  return request(`/users/${userId}/inventory/${inventoryId}/sell`, { method: 'POST' });
}

export function upgrade(userId, inventoryIds) {
  return request(`/users/${userId}/upgrade`, { method: 'POST', body: JSON.stringify({ inventoryIds }) });
}

export function getBalance(userId) {
  return request(`/users/${userId}/balance`);
}

export function getTransactions(userId) {
  return request(`/users/${userId}/transactions`);
}

export function getUpgradeHistory(userId) {
  return request(`/users/${userId}/upgrade-history`);
}

export function redeemPromo(userId, code) {
  return request(`/users/${userId}/promo`, { method: 'POST', body: JSON.stringify({ code }) });
}
