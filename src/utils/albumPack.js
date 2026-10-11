import { CROMOS_DATA } from './UsuariosTHC.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const requestKey = userId => `thc:album-pack:v2:${userId}`;

export function validatePackResult(data) {
  if (data?.success !== true || !Array.isArray(data.cartas) || !data.cartas.length || data.cartas.length > 20 ||
      !Number.isSafeInteger(data.sobres_restantes) || data.sobres_restantes < 0 ||
      !Array.isArray(data.detalles) || data.detalles.length !== data.cartas.length) {
    throw new Error('ALBUM_INVALID_RECEIPT');
  }
  const cards = data.cartas.map((id, index) => {
    const detail = data.detalles[index];
    if (typeof id !== 'string' || !Object.hasOwn(CROMOS_DATA, id) || detail?.id !== id || typeof detail.isNew !== 'boolean' ||
        !Number.isSafeInteger(detail.cantidad) || detail.cantidad < 1) throw new Error('ALBUM_INVALID_RECEIPT');
    return { id, isNew: detail.isNew, cantidad: detail.cantidad, isFlipped: false };
  });
  return { cards, remaining: data.sobres_restantes };
}

export function readPendingPack(storage, userId) {
  if (!UUID.test(userId || '')) return null;
  const id = storage.getItem(requestKey(userId));
  return UUID.test(id || '') ? id : null;
}

export function beginPackRequest(storage, userId, createUUID) {
  if (!UUID.test(userId || '')) throw new Error('ALBUM_AUTH_REQUIRED');
  const previous = readPendingPack(storage, userId);
  if (previous) return previous;
  const id = createUUID();
  if (!UUID.test(id)) throw new Error('ALBUM_REQUEST_INVALID');
  storage.setItem(requestKey(userId), id);
  if (readPendingPack(storage, userId) !== id) throw new Error('ALBUM_STORAGE_UNAVAILABLE');
  return id;
}

export function finishPackRequest(storage, userId, id) {
  if (readPendingPack(storage, userId) === id) storage.removeItem(requestKey(userId));
}

export function packErrorMessage(error) {
  const message = `${error?.name || ''} ${error?.code || ''} ${error?.message || ''} ${error?.details || ''}`;
  if (/ALBUM_PACK_SIZE_UNCONFIGURED/.test(message)) return 'La apertura de sobres está pendiente de configuración. Tus sobres se conservan.';
  if (/PGRST202|42883/.test(message)) return 'Falta activar la actualización del Álbum. Tus sobres se conservan.';
  if (/ALBUM_NO_PACKS|sin sobres|no tienes sobres/i.test(message)) return 'Ya no tienes sobres disponibles. Actualiza tu saldo para comprobarlo.';
  if (/ALBUM_AUTH_REQUIRED|sesión|session|JWT|PGRST301/i.test(message)) return 'Tu sesión ha vencido. Vuelve a entrar para continuar.';
  if (/ALBUM_STORAGE_UNAVAILABLE|SecurityError|QuotaExceededError/i.test(message)) return 'Permite el almacenamiento del navegador para abrir sobres y recuperar un envío interrumpido.';
  return 'No pudimos confirmar la apertura. Reintenta aquí para recuperar el mismo sobre.';
}
