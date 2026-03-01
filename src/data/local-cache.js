const CACHE_KEY = 'tf_pro_v2';

export function loadFromCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Cache load error:', e);
  }
  return null;
}

export function saveToCache(data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Cache save error:', e);
  }
}

export function hasLegacyData() {
  return !!localStorage.getItem(CACHE_KEY);
}

export function markMigrated() {
  localStorage.setItem('tf_pro_migrated', 'true');
}

export function isMigrated() {
  return localStorage.getItem('tf_pro_migrated') === 'true';
}
