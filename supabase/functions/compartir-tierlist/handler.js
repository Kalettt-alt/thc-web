const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_BODY_BYTES = MAX_FILE_BYTES + 64 * 1024;

async function boundedFormData(request, timeoutMs) {
  const reader = request.body?.getReader();
  if (!reader) throw new Error('empty');
  const chunks = [];
  let size = 0;
  let timer;
  const deadline = new Promise((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error('timeout'));
      reader.cancel().catch(() => {});
    }, timeoutMs);
  });
  try {
    for (;;) {
      const { value, done } = await Promise.race([reader.read(), deadline]);
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY_BYTES) { await reader.cancel(); throw new Error('size'); }
      chunks.push(value);
    }
  } finally {
    clearTimeout(timer);
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return new Response(bytes, { headers: { 'Content-Type': request.headers.get('content-type') || '' } }).formData();
}

export function isValidPng(bytes) {
  if (bytes.byteLength < 57 || ![137, 80, 78, 71, 13, 10, 26, 10].every((byte, i) => bytes[i] === byte)) return false;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 8;
  let hasHeader = false;
  let hasPixels = false;
  while (offset + 12 <= bytes.byteLength) {
    const length = view.getUint32(offset);
    if (length > bytes.byteLength - offset - 12) return false;
    const type = String.fromCharCode(...bytes.slice(offset + 4, offset + 8));
    if (!hasHeader) {
      if (type !== 'IHDR' || length !== 13) return false;
      const width = view.getUint32(offset + 8);
      const height = view.getUint32(offset + 12);
      if (!width || !height || width > 12000 || height > 12000 || width * height > 32000000) return false;
      const depth = bytes[offset + 16];
      const color = bytes[offset + 17];
      const depths = { 0: [1, 2, 4, 8, 16], 2: [8, 16], 3: [1, 2, 4, 8], 4: [8, 16], 6: [8, 16] };
      if (!depths[color]?.includes(depth) || bytes[offset + 18] || bytes[offset + 19] || bytes[offset + 20] > 1) return false;
      hasHeader = true;
    } else if (type === 'IHDR') return false;
    if (type === 'IDAT' && length) hasPixels = true;
    offset += length + 12;
    if (type === 'IEND') return length === 0 && hasPixels && offset === bytes.byteLength;
  }
  return false;
}

function getWebhookTarget(webhook) {
  try {
    const target = new URL(webhook);
    if (target.protocol !== 'https:' || target.hostname !== 'discord.com' || target.username || target.password || target.port ||
      !/^\/api(?:\/v\d+)?\/webhooks\/\d+\/[a-z\d_-]+$/i.test(target.pathname)) return null;
    target.search = '?wait=true';
    target.hash = '';
    return target.toString();
  } catch { return null; }
}

export function createHandler({ supabaseUrl, anonKey, webhook, allowedOrigins, fetchImpl = fetch, bodyReadTimeoutMs = 15000 }) {
  const origins = new Set((allowedOrigins || '').split(',').map(value => value.trim()).filter(Boolean));
  const target = getWebhookTarget(webhook);
  return async request => {
    const origin = request.headers.get('origin') || (request.method === 'GET' ? new URL(request.url).origin : '');
    const cors = {
      'Access-Control-Allow-Origin': origins.has(origin) ? origin : 'null',
      'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info, x-retry-count, traceparent, tracestate, baggage, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Vary': 'Origin',
      'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
    };
    const reply = (status, code, message, extra = {}, body = {}) => Response.json({ success: status === 200, code, message, ...body }, { status, headers: { ...cors, ...extra } });
    if (!origins.size) return reply(503, 'SERVER_NOT_CONFIGURED', 'El envío a Discord está pendiente de configuración.');
    if (!origins.has(origin)) return reply(403, 'ORIGIN_NOT_ALLOWED', 'El envío no está habilitado para esta dirección.');
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (!['GET', 'POST'].includes(request.method)) return reply(405, 'METHOD_NOT_ALLOWED', 'Método no permitido.');
    if (!supabaseUrl || !anonKey || !target) return reply(503, 'SERVER_NOT_CONFIGURED', 'El envío a Discord está pendiente de configuración.');
    const authorization = request.headers.get('authorization');
    if (!/^Bearer [a-z\d_-]+\.[a-z\d_-]+\.[a-z\d_-]+$/i.test(authorization || '')) return reply(401, 'SESSION_EXPIRED', 'Inicia sesión con Discord.');
    if (Number(request.headers.get('content-length')) > MAX_BODY_BYTES) return reply(413, 'UPLOAD_TOO_LARGE', 'Imagen demasiado grande.');
    const headers = { apikey: anonKey, Authorization: authorization };
    let user;
    try {
      const response = await fetchImpl(`${supabaseUrl}/auth/v1/user`, { headers, signal: AbortSignal.timeout(10000), redirect: 'error' });
      if (!response.ok) {
        return response.status >= 500 || response.status === 429
          ? reply(502, 'AUTH_UNAVAILABLE', 'No pudimos comprobar tu sesión.')
          : reply(401, 'SESSION_EXPIRED', 'Tu sesión expiró.');
      }
      user = await response.json();
      if (!user.id) return reply(401, 'SESSION_EXPIRED', 'Tu sesión expiró.');
    } catch { return reply(502, 'AUTH_UNAVAILABLE', 'No pudimos comprobar tu sesión.'); }
    if (request.method === 'GET') return reply(200, 'READY', 'El servicio está disponible.', {}, { ready: true });
    let form;
    try { form = await boundedFormData(request, bodyReadTimeoutMs); }
    catch (error) {
      if (error.message === 'timeout') return reply(408, 'UPLOAD_TIMEOUT', 'La subida tardó demasiado. Inténtalo de nuevo.');
      if (error.message === 'size') return reply(413, 'UPLOAD_TOO_LARGE', 'Imagen demasiado grande.');
      return reply(400, 'INVALID_IMAGE', 'La captura no es un PNG válido.');
    }
    const file = form.get('file');
    if (!(file instanceof File) || file.type !== 'image/png' || !file.size) return reply(400, 'INVALID_IMAGE', 'Envía una captura PNG de menos de 5 MB.');
    if (file.size > MAX_FILE_BYTES) return reply(413, 'UPLOAD_TOO_LARGE', 'Imagen demasiado grande.');
    if (!isValidPng(new Uint8Array(await file.arrayBuffer()))) return reply(400, 'INVALID_IMAGE', 'La captura no es un PNG válido.');
    try {
      const response = await fetchImpl(`${supabaseUrl}/rest/v1/rpc/reservar_envio_tierlist`, {
        method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: '{}', signal: AbortSignal.timeout(10000), redirect: 'error',
      });
      if (!response.ok) {
        const details = await response.json().catch(() => ({}));
        return reply(503, response.status === 404 || details.code === 'PGRST202' || details.code === '42883' ? 'QUOTA_NOT_CONFIGURED' : 'QUOTA_UNAVAILABLE', 'No pudimos comprobar el límite de envíos.');
      }
      const reserved = await response.json();
      if (reserved === false) return reply(429, 'RATE_LIMITED', 'Alcanzaste el límite de envíos. Inténtalo más tarde.', { 'Retry-After': '60' });
      if (reserved !== true) return reply(503, 'QUOTA_UNAVAILABLE', 'No pudimos comprobar el límite de envíos.');
    } catch { return reply(503, 'QUOTA_UNAVAILABLE', 'No pudimos comprobar el límite de envíos.'); }
    const username = String(user.user_metadata?.preferred_username || 'Un miembro de THC').replace(/[@`<>\r\n]/g, '').slice(0, 80);
    const payload = new FormData();
    payload.append('payload_json', JSON.stringify({ content: `${username} comparte su Tier List ⚡`, allowed_mentions: { parse: [] } }));
    payload.append('files[0]', file, 'THC_TierList.png');
    try {
      const result = await fetchImpl(target, { method: 'POST', body: payload, signal: AbortSignal.timeout(20000), redirect: 'error' });
      if (result.status === 429) return reply(429, 'DISCORD_RATE_LIMITED', 'Discord está recibiendo demasiados envíos.');
      if ([401, 403, 404].includes(result.status)) return reply(502, 'WEBHOOK_UNAVAILABLE', 'El canal de Discord no está disponible para recibir imágenes.');
      if (!result.ok) return reply(502, 'DISCORD_UNAVAILABLE', 'Discord no pudo recibir la imagen.');
      return reply(200, 'SENT', 'Tier List enviada.');
    } catch { return reply(502, 'DISCORD_UNAVAILABLE', 'No pudimos confirmar que Discord recibiera la imagen.'); }
  };
}
