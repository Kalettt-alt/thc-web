export const CLUB_IDENTITY_COLUMNS = 'user_id,nombre,abreviatura,logo_url,liga,colores,estadio,apodos';

export async function saveClubIdentity(client, club, userId) {
  const { data: { user }, error: authError } = await client.auth.getUser();
  if (authError || !user || user.id !== userId || club.user_id !== userId) {
    throw new Error('Tu sesión cambió. Inicia sesión de nuevo antes de guardar el club.');
  }
  const { data, error } = await client.from('equipos_ut')
    .upsert([club], { onConflict: 'user_id' })
    .select(CLUB_IDENTITY_COLUMNS)
    .single();
  if (error) throw error;
  if (!data || data.user_id !== userId || !data.nombre?.trim()) {
    throw new Error('No se pudo confirmar el guardado del club.');
  }
  return data;
}

export function clubLogoSource(value) {
  if (typeof value !== 'string') return null;
  const source = value.trim();
  if (!source || source.length > 2048) return null;
  if (source.startsWith('/') && !source.startsWith('//') && !source.includes('\\')) return source;
  try {
    const url = new URL(source);
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : null;
  } catch {
    return null;
  }
}

export function ownClubLogoPath(value, projectUrl, userId) {
  if (typeof userId !== 'string' || !/^[a-f0-9-]{36}$/i.test(userId)) return null;
  try {
    const url = new URL(value);
    const project = new URL(projectUrl);
    if (url.origin !== project.origin || url.protocol !== 'https:') return null;
    const match = url.pathname.match(/^\/storage\/v1\/object\/(?:public|sign|authenticated)\/logos_clubes\/(.+)$/);
    if (!match) return null;
    const path = decodeURIComponent(match[1]);
    return [`${userId}_logo.png`, `${userId}_logo.jpg`].includes(path) ? path : null;
  } catch {
    return null;
  }
}
