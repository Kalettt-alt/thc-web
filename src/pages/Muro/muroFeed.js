export const MURO_GALLERY_PAGE_SIZE = 170;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/;

export function muroFeedCursor(row) {
  if (!row || !UUID.test(row.id || '') || !TIMESTAMP.test(row.creado_en || '') || !Number.isFinite(Date.parse(row.creado_en))) return null;
  // Preserve PostgreSQL microseconds. Converting through Date would truncate
  // the tie-break timestamp and could silently skip older images on a page.
  return { id: row.id, createdAt: row.creado_en };
}

export function muroFeedBeforeFilter(cursor) {
  if (!cursor || !UUID.test(cursor.id || '') || !TIMESTAMP.test(cursor.createdAt || '') || !Number.isFinite(Date.parse(cursor.createdAt))) {
    throw new Error('No se pudo recuperar la página del Muro.');
  }
  const date = cursor.createdAt;
  return `creado_en.lt.${date},and(creado_en.eq.${date},id.lt.${cursor.id})`;
}

export async function readMuroVotes(client, ids) {
  if (!ids.length) return [];
  const result = [];
  const batchSize = 500;
  for (let start = 0; ; start += batchSize) {
    const { data, error } = await client.from('muro_votos').select('publicacion_id, usuario_id, tipo')
      .in('publicacion_id', ids).order('id', { ascending: true }).range(start, start + batchSize - 1);
    if (error) throw error;
    result.push(...(data || []));
    if (!data || data.length < batchSize) return result;
  }
}

export async function readMuroPage(client, cursor = null) {
  let query = client.from('muro_publicaciones')
    .select('*, autor:perfiles!muro_publicaciones_autor_id_fkey(discord_nombre, avatar_url)', cursor ? undefined : { count: 'exact' })
    .order('creado_en', { ascending: false }).order('id', { ascending: false })
    .limit(MURO_GALLERY_PAGE_SIZE + 1);
  if (cursor) query = query.or(muroFeedBeforeFilter(cursor));
  const { data, count, error } = await query;
  if (error) throw error;
  const rows = data || [];
  const visible = rows.slice(0, MURO_GALLERY_PAGE_SIZE);
  return { rows: visible, count, next: rows.length > MURO_GALLERY_PAGE_SIZE ? muroFeedCursor(visible.at(-1)) : null };
}
