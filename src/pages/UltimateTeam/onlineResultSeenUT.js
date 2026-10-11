const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const keyFor = userId => UUID.test(userId || '') ? `thc:ut:online:last-dismissed:${userId}` : null;

export function readDismissedOnlineMatchId(storage, userId) {
  const key = keyFor(userId);
  if (!key || !storage) return null;
  try {
    const value = storage.getItem(key);
    return UUID.test(value || '') ? value : null;
  } catch { return null; }
}

export function dismissOnlineMatch(storage, userId, matchId) {
  const key = keyFor(userId);
  if (!key || !storage || !UUID.test(matchId || '')) return false;
  try { storage.setItem(key, matchId); return true; }
  catch { return false; }
}
