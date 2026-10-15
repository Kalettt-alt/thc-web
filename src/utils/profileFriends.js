const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STATES = new Set(['none', 'sent', 'received', 'friends', 'self']);
const ACTIONS = new Set(['enviar', 'cancelar', 'aceptar', 'rechazar', 'eliminar']);
export const PROFILE_FRIENDS_EVENT = 'thc:profile-friends-changed';

function profileId(value) {
  if (typeof value !== 'string' || !UUID.test(value)) throw new Error('No se pudo identificar el perfil.');
  return value;
}

export function profileFriendsError(error) {
  if (['PGRST202', '42883', '42P01'].includes(error?.code)) return 'Amigos está pendiente de activar en Supabase.';
  if (error?.code === '42501') return 'No tienes permiso para realizar esta acción.';
  if (error?.code === '28000') return 'Inicia sesión para gestionar tus amigos.';
  if (error?.code === '22023' && error?.message) return error.message;
  return 'No se pudo actualizar Amigos. Inténtalo de nuevo.';
}

async function rpc(client, name, args, signal) {
  let result;
  try {
    let request = client.rpc(name, args);
    if (signal && typeof request?.abortSignal === 'function') request = request.abortSignal(signal);
    result = await request;
  } catch (cause) {
    throw Object.assign(new Error('No se pudo conectar. Inténtalo de nuevo.'), { cause });
  }
  if (result?.error) throw Object.assign(new Error(profileFriendsError(result.error)), { code: result.error.code, cause: result.error });
  if (!result || result.data === null || result.data === undefined) throw new Error('Supabase no confirmó el estado de Amigos.');
  return result.data;
}

export function confirmProfileFriendship(data) {
  if (!data || !STATES.has(data.estado) || !Object.hasOwn(data, 'solicitud_id')) throw new Error('Supabase no confirmó el estado de Amigos.');
  if (data.solicitud_id !== null && (typeof data.solicitud_id !== 'string' || !UUID.test(data.solicitud_id))) throw new Error('La respuesta de Amigos está incompleta.');
  if (['sent', 'received', 'friends'].includes(data.estado) && !data.solicitud_id) throw new Error('La respuesta de Amigos está incompleta.');
  return data;
}

export async function getProfileFriendship(client, targetId, { signal } = {}) {
  return confirmProfileFriendship(await rpc(client, 'thc_perfil_amistad_estado', { p_perfil_id: profileId(targetId) }, signal));
}

export async function changeProfileFriendship(client, targetId, action, { signal } = {}) {
  if (!ACTIONS.has(action)) throw new Error('Selecciona una acción de amistad válida.');
  return confirmProfileFriendship(await rpc(client, 'thc_perfil_amistad_accion', { p_perfil_id: profileId(targetId), p_accion: action }, signal));
}

function confirmPerson(person) {
  if (!person || typeof person.id !== 'string' || !UUID.test(person.id)) throw new Error('La lista de Amigos está incompleta.');
  const name = [person.apodo, person.nombre, person.discord_nombre].find(value => typeof value === 'string' && value.trim());
  if (!name) throw new Error('La lista de Amigos está incompleta.');
  return { ...person, nombre: name.trim() };
}

export async function listProfileFriends(client, targetId, { signal } = {}) {
  const data = await rpc(client, 'thc_perfil_amigos', { p_perfil_id: profileId(targetId) }, signal);
  if (!data || !['amigos', 'recibidas', 'enviadas'].every(key => Array.isArray(data[key]))) throw new Error('Supabase no confirmó la lista de Amigos.');
  return Object.fromEntries(['amigos', 'recibidas', 'enviadas'].map(key => [key, data[key].map(confirmPerson)]));
}

export function emitProfileFriendsChange(ids = []) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(PROFILE_FRIENDS_EVENT, { detail: { profiles: ids.filter(Boolean) } }));
}

export function profileFriendPath(id) {
  return `/perfil/${profileId(id)}`;
}
