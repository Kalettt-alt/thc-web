import { COUNTRY_ASSETS_UT } from './countryAssetsUT.js';

export const FIELD_STATS = [['pac', 'PAC'], ['sho', 'SHO'], ['pas', 'PAS'], ['dri', 'DRI'], ['def', 'DEF'], ['phy', 'PHY']];
export const KEEPER_STATS = [['gk_div', 'DIV'], ['gk_han', 'HAN'], ['gk_kic', 'KIC'], ['gk_ref', 'REF'], ['gk_spd', 'SPE'], ['gk_pos', 'POS']];
export const CARD_DESIGNS = Object.freeze({
  bronce: 'BRONCE_CARD.png', plata: 'SILVER_CARD.png', oro: 'GOLD_CARD.png',
  plus: 'PLUS_CARD.png', ultimate: 'ULTIMATE_CARD.png',
});
export const CARD_RARITIES = Object.freeze([...Object.keys(CARD_DESIGNS), 'especial']);
export const EXAMPLE_CARD = Object.freeze({ id: 'preview', nombre: 'Tu próximo jugador', pos: 'CM', grl: 75, pac: 72, sho: 68, pas: 80, dri: 77, def: 65, phy: 73, color: 'especial', ejemplo: true });

export function normalizeCardRarity(value) {
  const rarity = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return rarity === 'especial' ? 'plus' : Object.hasOwn(CARD_DESIGNS, rarity) ? rarity : 'plata';
}

export function clampCardRating(value, fallback = 0) {
  return Number.isFinite(value) ? Math.max(0, Math.min(99, Math.round(value))) : fallback;
}

const optionalCardRating = value => Number.isFinite(value) ? clampCardRating(value) : undefined;

export function cardStatFields(player) {
  return player?.pos === 'GK' && KEEPER_STATS.some(([key]) => Number.isFinite(player[key])) ? KEEPER_STATS : FIELD_STATS;
}

export function displayCardPosition(value) {
  const positions = { GK: 'POR', CB: 'DFC', LB: 'LI', RB: 'LD', LWB: 'CAI', RWB: 'CAD', CDM: 'MCD', CM: 'MC', CAM: 'MCO', LM: 'MI', RM: 'MD', LW: 'EI', RW: 'ED', CF: 'SD', ST: 'DC' };
  return positions[value] || (typeof value === 'string' ? value.slice(0, 5) : '');
}

const vertical = (first, middle, last) => `<path fill="${first}" d="M0 0h20v40H0z"/><path fill="${middle}" d="M20 0h20v40H20z"/><path fill="${last}" d="M40 0h20v40H40z"/>`;
const horizontal = (first, middle, last) => `<path fill="${first}" d="M0 0h60v13.34H0z"/><path fill="${middle}" d="M0 13.33h60v13.34H0z"/><path fill="${last}" d="M0 26.66h60V40H0z"/>`;
const countryData = {
  PE: ['Perú', ['peru', 'per'], vertical('#d91023', '#fff', '#d91023')],
  AR: ['Argentina', ['argentina', 'arg'], horizontal('#74acdf', '#fff', '#74acdf') + '<circle cx="30" cy="20" r="3.5" fill="#f6b40e"/>'],
  BR: ['Brasil', ['brasil', 'brazil', 'bra'], '<path fill="#009739" d="M0 0h60v40H0z"/><path fill="#ffdf00" d="m30 5 25 15-25 15L5 20z"/><circle cx="30" cy="20" r="10" fill="#002776"/><path d="M21 17q10-1 18 8" fill="none" stroke="#fff" stroke-width="2"/>'],
  UY: ['Uruguay', ['uruguay', 'ury'], '<path fill="#fff" d="M0 0h60v40H0z"/><path fill="#5a9bd4" d="M0 8h60v4H0zM0 16h60v4H0zM0 24h60v4H0zM0 32h60v4H0z"/><path fill="#fff" d="M0 0h23v22H0z"/><circle cx="11" cy="11" r="6" fill="#f9c324"/>'],
  CL: ['Chile', ['chile', 'chl'], '<path fill="#fff" d="M0 0h60v40H0z"/><path fill="#d52b1e" d="M0 20h60v20H0z"/><path fill="#0039a6" d="M0 0h20v20H0z"/><path fill="#fff" d="m10 4 1.6 4.6h4.9l-4 2.9 1.5 4.6-4-2.9-4 2.9 1.5-4.6-4-2.9h4.9z"/>'],
  CO: ['Colombia', ['colombia', 'col'], '<path fill="#fcd116" d="M0 0h60v20H0z"/><path fill="#003893" d="M0 20h60v10H0z"/><path fill="#ce1126" d="M0 30h60v10H0z"/>'],
  EC: ['Ecuador', ['ecuador', 'ecu'], '<path fill="#ffdd00" d="M0 0h60v20H0z"/><path fill="#034ea2" d="M0 20h60v10H0z"/><path fill="#ed1c24" d="M0 30h60v10H0z"/>'],
  PY: ['Paraguay', ['paraguay', 'pry'], horizontal('#d52b1e', '#fff', '#0038a8') + '<circle cx="30" cy="20" r="3" fill="none" stroke="#228b22" stroke-width="1.2"/>'],
  BO: ['Bolivia', ['bolivia', 'bol'], horizontal('#d52b1e', '#f9e300', '#007934')],
  VE: ['Venezuela', ['venezuela', 'ven'], horizontal('#ffcc00', '#00247d', '#cf142b') + '<path fill="#fff" d="M20 20h2v2h-2zM25 18h2v2h-2zM30 17h2v2h-2zM35 18h2v2h-2zM40 20h2v2h-2z"/>'],
  MX: ['México', ['mexico', 'mex'], vertical('#006847', '#fff', '#ce1126') + '<circle cx="30" cy="22" r="4" fill="#90713c"/>'],
  ES: ['España', ['espana', 'spain', 'esp'], '<path fill="#aa151b" d="M0 0h60v40H0z"/><path fill="#f1bf00" d="M0 10h60v20H0z"/>'],
  PT: ['Portugal', ['portugal', 'prt'], '<path fill="#006600" d="M0 0h24v40H0z"/><path fill="#f00" d="M24 0h36v40H24z"/><circle cx="24" cy="20" r="7" fill="#ffcc00"/><path fill="#fff" d="M21 15h6v10h-6z"/>'],
  FR: ['Francia', ['francia', 'france', 'fra'], vertical('#0055a4', '#fff', '#ef4135')],
  DE: ['Alemania', ['alemania', 'germany', 'deu', 'ger'], horizontal('#111', '#dd0000', '#ffce00')],
  IT: ['Italia', ['italia', 'italy', 'ita'], vertical('#009246', '#fff', '#ce2b37')],
  NL: ['Países Bajos', ['paises bajos', 'holanda', 'netherlands', 'nld', 'ned'], horizontal('#ae1c28', '#fff', '#21468b')],
  BE: ['Bélgica', ['belgica', 'belgium', 'bel'], vertical('#111', '#fdda24', '#ef3340')],
  GB: ['Reino Unido', ['reino unido', 'united kingdom', 'gbr'], '<path fill="#012169" d="M0 0h60v40H0z"/><path d="m0 0 60 40M60 0 0 40" stroke="#fff" stroke-width="8"/><path d="m0 0 60 40M60 0 0 40" stroke="#c8102e" stroke-width="3"/><path d="M30 0v40M0 20h60" stroke="#fff" stroke-width="12"/><path d="M30 0v40M0 20h60" stroke="#c8102e" stroke-width="6"/>'],
  EN: ['Inglaterra', ['inglaterra', 'england', 'eng'], '<path fill="#fff" d="M0 0h60v40H0z"/><path d="M30 0v40M0 20h60" stroke="#ce1124" stroke-width="8"/>'],
  US: ['Estados Unidos', ['estados unidos', 'united states', 'usa'], '<path fill="#fff" d="M0 0h60v40H0z"/><path fill="#b31942" d="M0 0h60v3.08H0zM0 6.15h60v3.08H0zM0 12.3h60v3.08H0zM0 18.45h60v3.08H0zM0 24.6h60v3.08H0zM0 30.75h60v3.08H0zM0 36.92h60V40H0z"/><path fill="#0a3161" d="M0 0h26v21.53H0z"/><path fill="#fff" d="M5 4h2v2H5zM12 4h2v2h-2zM19 4h2v2h-2zM8 10h2v2H8zM16 10h2v2h-2zM5 16h2v2H5zM12 16h2v2h-2zM19 16h2v2h-2z"/>'],
  JP: ['Japón', ['japon', 'japan', 'jpn'], '<path fill="#fff" d="M0 0h60v40H0z"/><circle cx="30" cy="20" r="11" fill="#bc002d"/>'],
  CA: ['Canadá', ['canada', 'can'], '<path fill="#fff" d="M0 0h60v40H0z"/><path fill="#d80621" d="M0 0h15v40H0zM45 0h15v40H45z"/><path fill="#d80621" d="m30 7 3 8 5-2-1 7 5 2-9 7v6h-6v-6l-9-7 5-2-1-7 5 2z"/>'],
};
countryData.FO = ['Islas Feroe', ['feroe', 'faroe islands', 'fro'], ''];
countryData.VA = ['Vaticano', ['vaticano', 'vatican', 'vat'], ''];
countryData.RU = ['Rusia', ['rusia', 'russia', 'rus'], ''];
countryData.SM = ['San Marino', ['sanmarino', 'san marino', 'smr'], ''];
countryData.US[1].push('eeuu', 'ee.uu.');
const normalizeCountryName = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
const countryAliases = new Map(Object.entries(countryData).flatMap(([code, [name, aliases]]) => [code, name, ...aliases].map(alias => [normalizeCountryName(alias), code])));
const countryFlags = new Map(Object.entries(countryData).map(([code, [, , shapes]]) => [code, `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 40">${shapes}</svg>`)}`]));

export function cardCountry(value) {
  const input = typeof value === 'object' && value ? value.nacionalidad || value.pais_codigo || '' : value;
  const raw = typeof input === 'string' ? input.trim().slice(0, 60) : '';
  const code = countryAliases.get(normalizeCountryName(raw)) || (/^[a-z]{2}$/i.test(raw) ? raw.toUpperCase() : null);
  return { code, name: countryData[code]?.[0] || raw || 'Sin país', flagUrl: COUNTRY_ASSETS_UT[code] || countryFlags.get(code) || null };
}

export function cardAsset(value, designs = {}) {
  if (typeof value !== 'string' || !value.trim()) return null;
  const local = designs[`./cartas/${value}`];
  if (local) return local;
  if (/^\/(?!\/)[^\s\\]*$/.test(value)) return value;
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? url.href : null; } catch { return null; }
}

export function catalogCard(card, copyId = null) {
  return {
    id: copyId ? `ut:${copyId}` : card.id, carta_id: card.id, club_carta_id: copyId,
    nombre: card.nombre, pos: card.posicion, grl: clampCardRating(card.grl),
    pac: optionalCardRating(card.ritmo), sho: optionalCardRating(card.tiro), pas: optionalCardRating(card.pase), dri: optionalCardRating(card.regate), def: optionalCardRating(card.defensa), phy: optionalCardRating(card.fisico),
    gk_div: optionalCardRating(card.estirada), gk_han: optionalCardRating(card.paradas), gk_kic: optionalCardRating(card.saque), gk_ref: optionalCardRating(card.reflejos),
    gk_spd: optionalCardRating(card.velocidad_por), gk_pos: optionalCardRating(card.posicionamiento),
    color: card.rareza, imagen_url: card.imagen_url, diseno_url: card.diseno_url,
    club: card.club, nacionalidad: card.nacionalidad, pais_codigo: cardCountry(card.nacionalidad).code,
    codigo: card.codigo, posiciones_secundarias: card.posiciones_secundarias || [], ejemplo: card.es_ejemplo,
  };
}

export function isUtSchemaMissing(error) {
  return ['PGRST202', 'PGRST205', '42P01', '42883'].includes(error?.code);
}

export function utRequestError(error, fallback) {
  if (isUtSchemaMissing(error)) return 'El catálogo todavía no está activado.';
  if (error?.name === 'AbortError' || /fetch|network|timeout/i.test(error?.message || '')) return 'No se pudo confirmar la conexión. Vuelve a intentarlo.';
  return typeof error?.message === 'string' && error.message.length < 220 ? error.message : fallback;
}
