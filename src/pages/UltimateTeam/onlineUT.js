const UUID_PATTERN = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export const ONLINE_POLL_MS = 5000;
export const ONLINE_GRL_RANGE = 3;

export function onlineUtError(error) {
  if (['PGRST202', '42P01', '42883'].includes(error?.code)) return 'Online UT está pendiente de activar. Ejecuta ComandosSQL_OnlineUT.txt en Supabase.';
  if (error?.code === '42501') return 'Tu sesión no tiene permiso para entrar a Online UT. Inicia sesión de nuevo.';
  if (['22023', '55000', 'P0001'].includes(error?.code) && typeof error.message === 'string') return error.message;
  if (error?.name === 'AbortError' || error?.code === '57014') return 'La conexión tardó demasiado. Reintenta para recuperar la misma búsqueda.';
  return 'No se pudo conectar con Online UT. Comprueba tu conexión y vuelve a intentarlo.';
}

async function request(client, name, args = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const pending = client.rpc(name, args);
    const { data, error } = await (typeof pending.abortSignal === 'function' ? pending.abortSignal(controller.signal) : pending);
    if (error) throw Object.assign(new Error(onlineUtError(error)), { cause: error, code: error.code });
    if (!data || !['idle', 'waiting', 'playing', 'finished'].includes(data.status) || !Number.isInteger(data.online_count) || data.online_count < 0) {
      throw new Error('El servidor no pudo confirmar el estado de Online UT.');
    }
    return data;
  } catch (error) {
    if (error?.cause || error?.message === 'El servidor no pudo confirmar el estado de Online UT.') throw error;
    throw Object.assign(new Error(onlineUtError(error)), { cause: error, code: error?.code });
  } finally {
    clearTimeout(timeout);
  }
}

export const getOnlineStatus = client => request(client, 'thc_ut_online_estado');
export const heartbeatOnlineQueue = client => request(client, 'thc_ut_online_heartbeat');
export function cancelOnlineQueue(client, requestId = null) {
  if (requestId !== null && !UUID_PATTERN.test(requestId)) return Promise.reject(new Error('La búsqueda no tiene un identificador válido.'));
  return request(client, 'thc_ut_online_cancelar', requestId === null ? {} : { p_request_id: requestId });
}
export function joinOnlineQueue(client, requestId = crypto.randomUUID()) {
  if (!UUID_PATTERN.test(requestId)) return Promise.reject(new Error('La búsqueda no tiene un identificador válido.'));
  return request(client, 'thc_ut_online_buscar', { p_request_id: requestId });
}
