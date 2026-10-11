import { PROFILE_THEME_IDS, safeHexColor, safeProfileTheme } from './media.js';
import { withAlbumTimeout } from './albumAsync.js';

export const PROFILE_THEMES = Object.freeze([
  { id: 'default', name: 'Original', description: 'La identidad de THC.', accent: '#F47A20', bg: '#080807', panel: '#121210', text: '#F5F1E8', muted: '#AAA79F', line: '#33312C', radius: '24px', avatarRadius: '50%' },
  { id: 'twc', name: 'Agua', description: 'Azul eléctrico. Trazos firmes.', accent: '#00C8FF', bg: '#07182D', panel: '#081D37', text: '#EFFAFF', muted: '#A3C4D8', line: '#267BA1', radius: '0px', avatarRadius: '0px' },
  { id: 'pixel', name: 'Pixel Art', description: 'Tu color. Tu partida.', accent: '#A855F7', bg: '#060606', panel: '#0C0C0C', text: '#F4F4F4', muted: '#B8B8B8', line: '#555555', radius: '0px', avatarRadius: '0px' },
  { id: 'club', name: 'Club', description: 'Tu ficha de jugador.', accent: '#FF8126', bg: '#101511', panel: '#1B251E', text: '#FCF4DD', muted: '#B7C2AF', line: '#3D5040', radius: '6px', avatarRadius: '22% 22% 40% 40%' },
  { id: 'editorial', name: 'Editorial', description: 'Una portada propia.', accent: '#BC3F23', bg: '#F1EBDE', panel: '#F8F3E8', text: '#27271F', muted: '#706C60', line: '#C9C2B0', radius: '0px', avatarRadius: '2px' },
  { id: 'aurora', name: 'Aurora', description: 'Cristal y luz suave.', accent: '#CEB5FF', bg: '#110D23', panel: '#201936', text: '#F9F5FF', muted: '#BAB0CA', line: '#49405F', radius: '30px', avatarRadius: '32%' },
  { id: 'terminal', name: 'Terminal', description: 'Orden. Precisión. Juego.', accent: '#CAEF65', bg: '#10130F', panel: '#181D15', text: '#F0F3E7', muted: '#ACB79F', line: '#465137', radius: '2px', avatarRadius: '2px' },
  { id: 'estadio', name: 'Estadio', description: 'Bajo las luces del partido.', animated: true, accent: '#FF8126', bg: '#0D0E10', panel: '#181A1D', text: '#F5F1E8', muted: '#B4B2AE', line: '#44413D', radius: '8px', avatarRadius: '16px' },
  { id: 'vinilo', name: 'Vinilo', description: 'Tu perfil, en otra frecuencia.', animated: true, accent: '#F0BA85', bg: '#26121B', panel: '#391D2B', text: '#F8EBDD', muted: '#C7AAB5', line: '#6F4456', radius: '20px', avatarRadius: '50%' },
  { id: 'eclipse', name: 'Eclipse', description: 'Una órbita propia.', animated: true, accent: '#D8CB9F', bg: '#090909', panel: '#131313', text: '#F6F4EF', muted: '#AEA99D', line: '#3E3A31', radius: '40px', avatarRadius: '50%' },
].map(theme => Object.freeze(theme)));

export function canPersonalizeProfile({ userId, profileId, level }) {
  return Boolean(userId && userId === profileId && Number.isFinite(Number(level)) && Number(level) >= 10);
}

export function getProfileTheme(id, color) {
  const safeId = safeProfileTheme(id);
  const theme = PROFILE_THEMES.find(item => item.id === safeId);
  return { ...theme, className: `${safeId}-active`, accent: safeId === 'pixel' ? safeHexColor(color) : theme.accent };
}

export function getProfileThemeStyle(id, color) {
  const theme = getProfileTheme(id, color);
  return {
    '--accent': theme.accent,
    '--profile-bg': theme.bg,
    '--profile-panel': theme.panel,
    '--profile-text': theme.text,
    '--profile-muted': theme.muted,
    '--profile-line': theme.line,
    '--profile-radius': theme.radius,
    '--profile-avatar-radius': theme.avatarRadius,
  };
}

export async function saveProfileTheme({ client, userId, themeId, color }) {
  if (!userId || !PROFILE_THEME_IDS.includes(themeId) || !/^#[0-9a-f]{6}$/i.test(color)) {
    throw new Error('Selecciona un estilo y un color válidos.');
  }
  const { data: auth, error: authError } = await withAlbumTimeout(client.auth.getSession());
  if (authError || auth?.session?.user?.id !== userId) throw new Error('Tu sesión cambió. Vuelve a entrar para guardar.');
  const { data: permissions, error: permissionsError } = await withAlbumTimeout(client.from('perfiles').select('id,nivel_rol').eq('id', userId).single());
  if (permissionsError || !canPersonalizeProfile({ userId, profileId: permissions?.id, level: permissions?.nivel_rol })) throw new Error('Los estilos personalizados requieren VIP · nivel 10.');
  const { data, error } = await withAlbumTimeout(client.from('perfiles').update({ tema_perfil: themeId, color_pixel: color }).eq('id', userId).select('id,tema_perfil,color_pixel').single());
  if (error) throw new Error('No se pudo guardar el estilo. Inténtalo de nuevo.');
  if (!data || data.id !== userId || data.tema_perfil !== themeId || data.color_pixel?.toLowerCase() !== color.toLowerCase()) {
    throw new Error('No llegó la confirmación del estilo. Revisa tu perfil antes de reintentar.');
  }
  return { id: data.id, tema_perfil: data.tema_perfil, color_pixel: safeHexColor(data.color_pixel) };
}
