import { getLimites } from './perfilLimites.js';

export const PROFILE_POSITIONS = ['Cualquiera', 'GK', 'DFC', 'MC', 'DEL'];
export const PROFILE_WIDGETS = ['Ninguno', 'Álbum Virtual', 'Ultimate Team', 'Tier List Oficial', 'Foro Comunitario', 'Central de Noticias', 'Estadísticas Globales'];
const text = value => typeof value === 'string' ? value : '';

export function profileNumber(value, minimum, maximum, fallback) {
  const number = Number(value);
  return value !== null && value !== '' && Number.isFinite(number) ? Math.min(maximum, Math.max(minimum, number)) : fallback;
}

export function profileImageUrl(value) {
  if (typeof value !== 'string' || [...value].some(character => character.charCodeAt(0) <= 32)) return null;
  if (value.startsWith('/') && !value.startsWith('//') && !value.includes('\\')) return value;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

export function spotifyTrack(value) {
  if (!text(value).trim()) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.hostname !== 'open.spotify.com' || url.username || url.password || url.port) return null;
    const match = url.pathname.match(/^\/(?:intl-[a-z]{2}\/)?track\/([A-Za-z0-9]{22})\/?$/);
    return match ? { id: match[1], url: `https://open.spotify.com/track/${match[1]}`, embed: `https://open.spotify.com/embed/track/${match[1]}?theme=0` } : null;
  } catch { return null; }
}

export function createProfileSettings(profile) {
  return {
    apodo: text(profile.apodo), bio: text(profile.bio),
    posicion: PROFILE_POSITIONS.includes(profile.posicion) ? profile.posicion : 'Cualquiera',
    avatar_url: text(profile.avatar_url), banner_url: text(profile.banner_url),
    widget_1: PROFILE_WIDGETS.includes(profile.widget_1) ? profile.widget_1 : 'Ninguno',
    widget_2: PROFILE_WIDGETS.includes(profile.widget_2) ? profile.widget_2 : 'Ninguno',
    avatar_scale: profileNumber(profile.avatar_scale, 1, 2.5, 1),
    avatar_pos_x: profileNumber(profile.avatar_pos_x, 0, 100, 50),
    avatar_pos_y: profileNumber(profile.avatar_pos_y, 0, 100, 50),
    banner_pos_y: profileNumber(profile.banner_pos_y, 0, 100, 50),
    cancion_url: text(profile.cancion_url),
  };
}

export function profileNicknameCooldown(profile, now = Date.now()) {
  const lastChange = Date.parse(profile.ultimo_cambio_apodo);
  if (!Number.isFinite(lastChange)) return 0;
  return Math.max(0, Math.ceil(getLimites(profile.nivel_rol).apodoDias - (now - lastChange) / 86400000));
}

export function profileSettingsUpdates(form, profile, now = Date.now()) {
  const limits = getLimites(profile.nivel_rol);
  if (typeof form.bio !== 'string' || form.bio.length > limits.bio) throw new Error(`Tu estado admite hasta ${limits.bio} caracteres.`);
  if (typeof form.apodo !== 'string' || form.apodo.trim().length > 20) throw new Error('El apodo admite hasta 20 caracteres.');
  if (!PROFILE_POSITIONS.includes(form.posicion)) throw new Error('Selecciona una posición válida.');
  if (!PROFILE_WIDGETS.includes(form.widget_1) || (limits.widgets > 1 && !PROFILE_WIDGETS.includes(form.widget_2))) throw new Error('Selecciona una sección válida.');
  const song = spotifyTrack(form.cancion_url);
  if (text(form.cancion_url).trim() && !song) throw new Error('Usa el enlace HTTPS de una canción de Spotify.');
  const updates = {
    bio: form.bio, posicion: form.posicion,
    avatar_url: text(form.avatar_url), banner_url: text(form.banner_url),
    widget_1: form.widget_1,
    widget_2: limits.widgets > 1 ? form.widget_2 : createProfileSettings(profile).widget_2,
    avatar_scale: profileNumber(form.avatar_scale, 1, 2.5, 1),
    avatar_pos_x: Math.round(profileNumber(form.avatar_pos_x, 0, 100, 50)),
    avatar_pos_y: Math.round(profileNumber(form.avatar_pos_y, 0, 100, 50)),
    banner_pos_y: Math.round(profileNumber(form.banner_pos_y, 0, 100, 50)),
    cancion_url: song?.url || '',
  };
  if (form.apodo.trim() !== text(profile.apodo).trim()) {
    if (profileNicknameCooldown(profile, now) > 0) throw new Error('Todavía no puedes cambiar el apodo. Los demás cambios siguen en tu borrador.');
    updates.apodo = form.apodo.trim() || null;
    updates.ultimo_cambio_apodo = new Date(now).toISOString();
  }
  return updates;
}
