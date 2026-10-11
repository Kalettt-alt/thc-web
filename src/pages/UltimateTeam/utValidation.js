import { CARD_RARITIES, clampCardRating } from './utCards.js';
import { JUGADORES_BASE } from './data/jugadoresBase.js';
import { arrangeSquad } from './squadUT.js';

export const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const starterMetadata = new Map(JUGADORES_BASE.map(player => [player.id, player]));

export async function validateLogoFile(file) {
  if (!file || !['image/png', 'image/jpeg'].includes(file.type)) throw new Error('El escudo debe ser una imagen PNG o JPG.');
  if (file.size === 0 || file.size > MAX_LOGO_BYTES) throw new Error('El escudo debe pesar como máximo 2 MB.');
  const bytes = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  const png = [137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value);
  const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if ((file.type === 'image/png' && !png) || (file.type === 'image/jpeg' && !jpeg)) throw new Error('El archivo no corresponde a una imagen PNG o JPG válida.');
  return file.type === 'image/png' ? 'png' : 'jpg';
}

export function validateClubForm(formData, leagues) {
  const text = (value, max) => typeof value === 'string' && value.trim().length > 0 && value.trim().length <= max && !Array.from(value).some(character => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127);
  if (!text(formData.nombre, 20)) return 'Escribe un nombre de club de hasta 20 caracteres.';
  if (!/^[A-Z]{3}$/.test(formData.abreviatura.trim())) return 'La abreviatura debe contener exactamente 3 letras de A a Z.';
  if (!leagues.some(league => league.id === formData.liga?.id)) return 'Selecciona una liga válida.';
  if (!text(formData.estadio, 30)) return 'Escribe un nombre de estadio de hasta 30 caracteres.';
  const nicknames = formData.apodos.filter(value => value.trim());
  if (nicknames.length < 1 || nicknames.length > 3 || nicknames.some(value => !text(value, 15))) return 'Añade entre 1 y 3 apodos de hasta 15 caracteres.';
  const colors = formData.equipacion.camiseta.colores;
  if (colors.length < 2 || colors.length > 4 || colors.some(color => !/^#[0-9a-f]{6}$/i.test(color))) return 'Selecciona entre 2 y 4 colores válidos.';
  if (!formData.logoFile) return 'Selecciona el escudo del club.';
  return null;
}

export function normalizePlayerList(value, maxLength) {
  return Array.isArray(value) ? value.slice(0, maxLength).map((player, index) => {
    if (!player || typeof player !== 'object' || Array.isArray(player)) return null;
    const starter = starterMetadata.get(player.id);
    const color = typeof player.color === 'string' ? player.color.trim().toLowerCase() : player.rareza;
    const normalized = { ...player, id: typeof player.id === 'string' ? player.id.slice(0, 100) : `slot-${index}`, nombre: typeof player.nombre === 'string' ? player.nombre.slice(0, 80) : 'Jugador', pos: typeof player.pos === 'string' ? player.pos.slice(0, 5) : '', grl: clampCardRating(player.grl), color: CARD_RARITIES.includes(color) ? color : 'plata', posiciones_secundarias: Array.isArray(player.posiciones_secundarias) ? player.posiciones_secundarias.filter(pos => typeof pos === 'string' && pos.length <= 5).slice(0, 5) : [] };
    for (const key of ['pac','sho','pas','dri','def','phy','gk_div','gk_han','gk_kic','gk_ref','gk_spd','gk_pos']) normalized[key] = Number.isFinite(player[key]) ? clampCardRating(player[key]) : undefined;
    for (const key of ['club','nacionalidad','pais_codigo','imagen_url','diseno_url','club_carta_id','carta_id','codigo']) normalized[key] = typeof player[key] === 'string' ? player[key].slice(0, 2048) : null;
    if (starter && !normalized.nacionalidad) normalized.nacionalidad = starter.nacionalidad;
    if (starter && !normalized.pais_codigo) normalized.pais_codigo = starter.pais_codigo;
    return normalized;
  }) : [];
}

export function buildStarterSquad(players) {
  const { titulares, suplentes, reservas } = arrangeSquad({ titulares:[], suplentes:[], reservas:players }, '4-3-3', { naturalOnly:true });
  return { titulares, suplentes, reservas };
}

export const UT_DEFAULT_CONFIG = {
  avatar: 'TH', angle: 0, textColor: '#FFFFFF', colorCount: 3,
  colors: ['#E56E56', '#C14B3A', '#9E3222'], extrapolation: 0, volMaster: 50,
  animacionSobres: 'avanzado', graficos: 'alto', kickKeys: ['Space', 'C', 'V']
};

export function normalizeUtConfig(value) {
  const config = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const color = (value, fallback) => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
  const number = (value, max, fallback) => Number.isFinite(value) ? Math.max(0, Math.min(max, Math.round(value))) : fallback;
  return {
    avatar: typeof config.avatar === 'string' ? config.avatar.slice(0, 2) : 'TH',
    angle: number(config.angle, 360, 0), textColor: color(config.textColor, '#FFFFFF'),
    colorCount: [1, 2, 3].includes(config.colorCount) ? config.colorCount : 3,
    colors: UT_DEFAULT_CONFIG.colors.map((fallback, index) => color(config.colors?.[index], fallback)),
    extrapolation: number(config.extrapolation, 500, 0), volMaster: number(config.volMaster, 100, 50),
    animacionSobres: ['avanzado', 'normal'].includes(config.animacionSobres) ? config.animacionSobres : 'avanzado',
    graficos: ['alto', 'normal', 'bajo'].includes(config.graficos) ? config.graficos : 'alto',
    kickKeys: UT_DEFAULT_CONFIG.kickKeys.map((fallback, index) => typeof config.kickKeys?.[index] === 'string' && config.kickKeys[index].length > 0 && config.kickKeys[index].length <= 16 ? config.kickKeys[index] : fallback)
  };
}

export function readUtConfig() {
  try { return normalizeUtConfig(JSON.parse(localStorage.getItem('thc_config') || '{}')); }
  catch { return normalizeUtConfig({}); }
}
