import { PROFILE_THEME_IDS, safeHexColor, safeProfileTheme } from './media.js';
import { withAlbumTimeout } from './albumAsync.js';

export const PROFILE_THEMES = Object.freeze([
  { id: 'default', name: 'Original', minLevel: 0, description: 'La identidad de THC.', accent: '#F47A20', bg: '#080807', panel: '#121210', text: '#F5F1E8', muted: '#AAA79F', line: '#33312C', radius: '24px', avatarRadius: '50%' },
  { id: 'twc', name: 'Agua', minLevel: 10, description: 'Azul eléctrico. Trazos firmes.', accent: '#00C8FF', bg: '#07182D', panel: '#081D37', text: '#EFFAFF', muted: '#A3C4D8', line: '#267BA1', radius: '0px', avatarRadius: '0px' },
  { id: 'pixel', name: 'Pixel Art', minLevel: 10, description: 'Tu color. Tu partida.', accent: '#A855F7', bg: '#060606', panel: '#0C0C0C', text: '#F4F4F4', muted: '#B8B8B8', line: '#555555', radius: '0px', avatarRadius: '0px' },
  { id: 'club', name: 'Club', minLevel: 10, description: 'Tu ficha de jugador.', accent: '#FF8126', bg: '#101511', panel: '#1B251E', text: '#FCF4DD', muted: '#B7C2AF', line: '#3D5040', radius: '6px', avatarRadius: '22% 22% 40% 40%' },
  { id: 'editorial', name: 'Editorial', minLevel: 10, description: 'Tu banner es la portada.', accent: '#BC3F23', bg: '#F1EBDE', panel: '#F8F3E8', text: '#27271F', muted: '#706C60', line: '#C9C2B0', radius: '0px', avatarRadius: '2px' },
  { id: 'aurora', name: 'Aurora', minLevel: 10, description: 'Luces que fluyen a tu ritmo.', animated: true, accent: '#CEB5FF', bg: '#110D23', panel: '#201936', text: '#F9F5FF', muted: '#BAB0CA', line: '#49405F', radius: '30px', avatarRadius: '32%' },
  { id: 'terminal', name: 'Terminal', minLevel: 10, description: 'Tu perfil, desde la consola.', accent: '#8DE59B', bg: '#090F0C', panel: '#101A14', text: '#D9E8DC', muted: '#8DAD94', line: '#304739', radius: '5px', avatarRadius: '3px' },
  { id: 'vinilo', name: 'Vinilo', minLevel: 15, description: 'Discos girando y ondas en tu estudio.', animated: true, accent: '#F2B873', bg: '#1B1015', panel: '#35202A', text: '#FFF0DC', muted: '#C9AFAF', line: '#6A444A', radius: '18px', avatarRadius: '50%' },
  { id: 'eclipse', name: 'Eclipse', minLevel: 15, description: 'Una corona solar que respira en la oscuridad.', animated: true, accent: '#FFC978', bg: '#080A10', panel: '#171923', text: '#FFF4DE', muted: '#BDB8AE', line: '#4C4135', radius: '28px', avatarRadius: '50%' },
  { id: 'prisma', name: 'Prisma', minLevel: 15, description: 'Cristales flotantes y luz que cambia de color.', animated: true, accent: '#84FFD6', bg: '#130D25', panel: '#2A1D40', text: '#FBF5FF', muted: '#CCBCE0', line: '#795B99', radius: '18px', avatarRadius: '8px' },
  { id: 'orbita', name: 'Órbita', minLevel: 15, description: 'Planetas en movimiento y meteoros a tu alrededor.', animated: true, accent: '#9BC7FF', bg: '#050C20', panel: '#12213C', text: '#F1F6FF', muted: '#AFBEDB', line: '#3C5278', radius: '24px', avatarRadius: '50%' },
  { id: 'circuito', name: 'Circuito', minLevel: 15, description: 'Pulsos de energía recorren tu red.', animated: true, accent: '#C8FF68', bg: '#070A18', panel: '#11182C', text: '#F2F8E8', muted: '#B1BACE', line: '#35435C', radius: '12px', avatarRadius: '20px' },
  { id: 'lienzo', name: 'Lienzo', minLevel: 15, description: 'Tinta viva y pinceladas que dibujan tu espacio.', animated: true, accent: '#A54631', bg: '#F1E6D1', panel: '#FFF8E9', text: '#3D2C25', muted: '#7B5E51', line: '#C3AB95', radius: '3px', avatarRadius: '4px' },
  // Conserva el ID anterior para que los perfiles guardados y las políticas SQL sigan funcionando.
  { id: 'cromo', name: 'Casino', minLevel: 15, description: 'Mosaicos, ruleta y fichas en un casino pintado.', animated: true, accent: '#DDAE39', bg: '#0D2019', panel: '#17352A', text: '#F3E6C6', muted: '#C4CEB7', line: '#DFD1A8', radius: '2px', avatarRadius: '3px' },
].map(theme => Object.freeze(theme)));

export function canPersonalizeProfile({ userId, profileId, level }) {
  return Boolean(userId && userId === profileId && Number.isFinite(Number(level)) && Number(level) >= 10);
}

export function canUseProfileTheme(themeId, level) {
  const theme = PROFILE_THEMES.find(item => item.id === themeId);
  const numericLevel = Number(level);
  return Boolean(theme && Number.isFinite(numericLevel) && numericLevel >= theme.minLevel);
}

export function getAvailableThemes(level) {
  return PROFILE_THEMES.filter(theme => canUseProfileTheme(theme.id, level));
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
  if (!canUseProfileTheme(themeId, permissions.nivel_rol)) throw new Error('Este estilo requiere VIP Trueno · nivel 15.');
  const { data, error } = await withAlbumTimeout(client.from('perfiles').update({ tema_perfil: themeId, color_pixel: color }).eq('id', userId).select('id,tema_perfil,color_pixel').single());
  if (error) throw new Error('No se pudo guardar el estilo. Inténtalo de nuevo.');
  if (!data || data.id !== userId || data.tema_perfil !== themeId || data.color_pixel?.toLowerCase() !== color.toLowerCase()) {
    throw new Error('No llegó la confirmación del estilo. Revisa tu perfil antes de reintentar.');
  }
  return { id: data.id, tema_perfil: data.tema_perfil, color_pixel: safeHexColor(data.color_pixel) };
}
