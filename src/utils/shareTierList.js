const MAX_FILE_BYTES = 5 * 1024 * 1024;
const SAME_ORIGIN_MAX_FILE_BYTES = 4 * 1024 * 1024;

const messages = {
  SESSION_EXPIRED: 'Tu sesión expiró. Vuelve a iniciar sesión con Discord.',
  AUTH_UNAVAILABLE: 'No pudimos comprobar tu sesión. Inténtalo de nuevo.',
  FUNCTION_NOT_DEPLOYED: 'El envío a Discord aún no está habilitado. Falta publicar el servicio de envío.',
  ORIGIN_NOT_ALLOWED: 'El envío a Discord no está habilitado para esta dirección de la página.',
  SERVER_NOT_CONFIGURED: 'El envío a Discord está pendiente de configuración por el administrador.',
  QUOTA_NOT_CONFIGURED: 'Falta habilitar el control de envíos a Discord. Avísale al administrador.',
  QUOTA_UNAVAILABLE: 'No pudimos comprobar el límite de envíos. Inténtalo más tarde.',
  RATE_LIMITED: 'Alcanzaste el límite de envíos. Espera al menos un minuto e inténtalo más tarde.',
  DISCORD_RATE_LIMITED: 'Discord está recibiendo demasiados envíos. Inténtalo más tarde.',
  WEBHOOK_UNAVAILABLE: 'El canal de Discord ya no está disponible para recibir imágenes. Avísale al administrador.',
  DISCORD_UNAVAILABLE: 'Discord no pudo recibir la imagen. Inténtalo más tarde.',
  UPLOAD_TOO_LARGE: 'La captura pesa demasiado. Reduce el tamaño del tablero.',
  INVALID_IMAGE: 'No pudimos generar una captura PNG válida. Inténtalo de nuevo.',
  UPLOAD_TIMEOUT: 'La subida tardó demasiado. Revisa tu conexión e inténtalo de nuevo.',
  NETWORK_ERROR: 'No pudimos conectar con el envío a Discord. Revisa tu conexión; si persiste, avísale al administrador.',
};

export class TierListShareError extends Error {
  constructor(code) {
    super(messages[code] || messages.NETWORK_ERROR);
    this.name = 'TierListShareError';
    this.code = code;
  }
}

export async function getTierListError(error, data) {
  let payload = data;
  const response = error?.context;
  if (!payload && response?.clone) payload = await response.clone().json().catch(() => null);
  if (messages[payload?.code]) return new TierListShareError(payload.code);
  const code = {
    401: 'SESSION_EXPIRED', 403: 'ORIGIN_NOT_ALLOWED', 404: 'FUNCTION_NOT_DEPLOYED',
    408: 'UPLOAD_TIMEOUT', 413: 'UPLOAD_TOO_LARGE', 429: 'RATE_LIMITED',
    503: 'SERVER_NOT_CONFIGURED', 502: 'DISCORD_UNAVAILABLE',
  }[response?.status] || 'NETWORK_ERROR';
  return new TierListShareError(code);
}

async function getFreshToken(supabase, now) {
  let result;
  try { result = await supabase.auth.getSession(); }
  catch { throw new TierListShareError('AUTH_UNAVAILABLE'); }
  if (result.error) throw new TierListShareError('AUTH_UNAVAILABLE');
  let session = result.data?.session;
  if (!session?.access_token) throw new TierListShareError('SESSION_EXPIRED');
  if (session.expires_at && session.expires_at * 1000 <= now + 60000) {
    try { result = await supabase.auth.refreshSession(); }
    catch { throw new TierListShareError('AUTH_UNAVAILABLE'); }
    if (result.error) throw new TierListShareError('SESSION_EXPIRED');
    session = result.data?.session;
  }
  if (!/^[a-z\d_-]+\.[a-z\d_-]+\.[a-z\d_-]+$/i.test(session?.access_token || '')) {
    throw new TierListShareError('SESSION_EXPIRED');
  }
  return session.access_token;
}

async function invokeTierList(supabase, options, { transport = import.meta.env?.VITE_TIERLIST_TRANSPORT || 'vercel', fetchImpl = fetch } = {}) {
  if (transport === 'supabase') return supabase.functions.invoke('compartir-tierlist', options);
  if (transport !== 'vercel') throw new TierListShareError('SERVER_NOT_CONFIGURED');
  const response = await fetchImpl('/api/compartir-tierlist', {
    method: options.method || 'POST', headers: options.headers, body: options.body,
    signal: AbortSignal.timeout(60000), credentials: 'same-origin', redirect: 'error',
  });
  const data = await response.clone().json().catch(() => null);
  return { data, error: response.ok ? null : { context: response } };
}

export async function prepareTierListShare(supabase, { now = Date.now(), ...settings } = {}) {
  const token = await getFreshToken(supabase, now);
  let result;
  try {
    result = await invokeTierList(supabase, {
      method: 'GET', headers: { Authorization: `Bearer ${token}` },
    }, settings);
  } catch (error) { throw error instanceof TierListShareError ? error : new TierListShareError('NETWORK_ERROR'); }
  if (result.error || !result.data?.ready) throw await getTierListError(result.error, result.data);
  return token;
}

export async function shareTierListImage(supabase, blob, settings = {}) {
  if (!blob || blob.type !== 'image/png' || !blob.size) throw new TierListShareError('INVALID_IMAGE');
  const limit = (settings.transport || import.meta.env?.VITE_TIERLIST_TRANSPORT) === 'supabase' ? MAX_FILE_BYTES : SAME_ORIGIN_MAX_FILE_BYTES;
  if (blob.size > limit) throw new TierListShareError('UPLOAD_TOO_LARGE');
  const token = await getFreshToken(supabase, Date.now());
  const body = new FormData();
  body.append('file', blob, 'THC_TierList.png');
  let result;
  try {
    result = await invokeTierList(supabase, {
      body, headers: { Authorization: `Bearer ${token}` },
    }, settings);
  } catch (error) { throw error instanceof TierListShareError ? error : new TierListShareError('NETWORK_ERROR'); }
  if (result.error || !result.data?.success) throw await getTierListError(result.error, result.data);
  return result.data;
}
