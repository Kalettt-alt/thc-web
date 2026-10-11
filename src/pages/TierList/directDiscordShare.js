const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const SNOWFLAKE = /^\d{17,20}$/;

const MESSAGES = {
  INVALID_WEBHOOK: 'Pega un webhook válido de discord.com.',
  INVALID_IMAGE: 'No pudimos generar la imagen. Inténtalo de nuevo.',
  IMAGE_TOO_LARGE: 'La imagen pesa demasiado. Reduce el tablero o las fotos subidas.',
  WEBHOOK_UNAVAILABLE: 'Ese webhook ya no está disponible. Copia uno nuevo desde Discord.',
  RATE_LIMITED: 'Discord pide una pausa. Espera un momento antes de volver a enviar.',
  INVALID_CHANNEL: 'Discord rechazó el envío. Revisa el webhook; los canales de foro necesitan el ID del hilo.',
  DISCORD_UNAVAILABLE: 'Discord no pudo completar el envío. Inténtalo más tarde.',
  TIMEOUT: 'Discord tardó demasiado en responder. Revisa el canal antes de volver a enviar.',
  NETWORK_ERROR: 'No pudimos confirmar el envío. Revisa tu conexión y el canal antes de reintentar.',
};

export class DirectDiscordShareError extends Error {
  constructor(code) {
    super(MESSAGES[code] || MESSAGES.NETWORK_ERROR);
    this.name = 'DirectDiscordShareError';
    this.code = code;
  }
}

export function validateDiscordWebhook(value) {
  let url;
  try { url = new URL(String(value || '').trim()); }
  catch { throw new DirectDiscordShareError('INVALID_WEBHOOK'); }
  if (url.protocol !== 'https:' || url.hostname !== 'discord.com' || url.port || url.username || url.password || url.hash
    || !/^\/api\/(?:v10\/)?webhooks\/\d{17,20}\/[\w-]{60,200}$/.test(url.pathname)) {
    throw new DirectDiscordShareError('INVALID_WEBHOOK');
  }
  for (const [key, entry] of url.searchParams) {
    if (key !== 'wait' && (key !== 'thread_id' || !SNOWFLAKE.test(entry))) {
      throw new DirectDiscordShareError('INVALID_WEBHOOK');
    }
  }
  if (url.searchParams.getAll('thread_id').length > 1) throw new DirectDiscordShareError('INVALID_WEBHOOK');
  url.searchParams.set('wait', 'true');
  return url.toString();
}

export async function sendTierListToWebhook(webhook, image, { fetchImpl = fetch, timeoutMs = 25000 } = {}) {
  const endpoint = validateDiscordWebhook(webhook);
  if (!(image instanceof Blob) || image.type !== 'image/png' || !image.size) throw new DirectDiscordShareError('INVALID_IMAGE');
  if (image.size > MAX_IMAGE_BYTES) throw new DirectDiscordShareError('IMAGE_TOO_LARGE');
  const body = new FormData();
  body.append('files[0]', image, 'THC_TierList.png');
  body.append('payload_json', JSON.stringify({ allowed_mentions: { parse: [] }, attachments: [{ id: 0, filename: 'THC_TierList.png' }] }));
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(endpoint, {
      method: 'POST', body, signal: controller.signal, credentials: 'omit', redirect: 'error', referrerPolicy: 'no-referrer',
    });
    if (!response.ok) {
      const code = { 400: 'INVALID_CHANNEL', 401: 'WEBHOOK_UNAVAILABLE', 403: 'WEBHOOK_UNAVAILABLE', 404: 'WEBHOOK_UNAVAILABLE', 413: 'IMAGE_TOO_LARGE', 429: 'RATE_LIMITED' }[response.status];
      throw new DirectDiscordShareError(code || 'DISCORD_UNAVAILABLE');
    }
    const message = await response.json().catch(() => null);
    if (!SNOWFLAKE.test(message?.id || '')) throw new DirectDiscordShareError('NETWORK_ERROR');
    return { success: true };
  } catch (error) {
    if (error instanceof DirectDiscordShareError) throw error;
    throw new DirectDiscordShareError(controller.signal.aborted ? 'TIMEOUT' : 'NETWORK_ERROR');
  } finally {
    clearTimeout(timeout);
  }
}
