export const MURO_WEEKLY_LIMIT = 3;

// The server owns both time and cycle membership. Never infer the current cycle
// from the public feed: older photos remain there after their quota expires.
export function parseMuroQuota(payload, receivedAt = Date.now()) {
  if (!payload || payload.limite !== MURO_WEEKLY_LIMIT || !Number.isInteger(payload.usadas) || payload.usadas < 0) {
    throw new Error('No se pudo confirmar el límite del Muro.');
  }
  const serverNow = Date.parse(payload.ahora);
  const restart = payload.reinicio === null ? null : Date.parse(payload.reinicio);
  const available = Math.max(0, MURO_WEEKLY_LIMIT - payload.usadas);
  if (!Number.isFinite(serverNow) || (restart !== null && !Number.isFinite(restart)) || payload.disponibles !== available) {
    throw new Error('No se pudo confirmar el límite del Muro.');
  }
  return { used: payload.usadas, available, restart, refreshAt: restart === null ? null : receivedAt + Math.max(0, restart - serverNow) };
}

export function muroQuotaLabel(quota) {
  if (!quota) return 'Comprobando tus cupos…';
  return `${quota.available} ${quota.available === 1 ? 'foto disponible' : 'fotos disponibles'} · máximo 3 por semana`;
}

export function muroQuotaRestartLabel(quota) {
  if (!quota?.restart) return 'Tu semana empieza cuando publiques la primera foto.';
  const date = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(quota.restart);
  return `${quota.available ? 'Este ciclo termina' : 'Vuelves a tener 3 cupos'} el ${date}.`;
}

export function isMuroQuotaError(error) {
  return `${error?.message || ''} ${error?.details || ''}`.includes('THC_MURO_WEEKLY_LIMIT');
}

export function muroStoragePath(url, userId, storageOrigin) {
  try {
    const value = new URL(url);
    const ownOrigin = new URL(storageOrigin).origin;
    const prefix = '/storage/v1/object/public/muro_media/';
    if (value.origin !== ownOrigin || !value.pathname.startsWith(prefix)) return null;
    const path = decodeURIComponent(value.pathname.slice(prefix.length));
    return path.startsWith(`${userId}_`) && !path.includes('/') ? path : null;
  } catch {
    return null;
  }
}
