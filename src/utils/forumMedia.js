import { validateImageFile } from './media.js';

export const FORUM_IMAGE_LIMIT = 4;
export const FORUM_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const FORUM_MEDIA_BUCKET = 'foro_media';
export const FORUM_IMAGE_ACCEPT = 'image/png,image/jpeg,image/webp,image/gif';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FORUM_TABLES = new Set(['foro_publicaciones', 'foro_comentarios']);

export async function validateForumFiles(files, currentCount = 0) {
  const selected = Array.from(files || []);
  if (selected.length + currentCount > FORUM_IMAGE_LIMIT) {
    throw new Error('Puedes adjuntar hasta 4 imágenes.');
  }
  await Promise.all(selected.map(file => validateImageFile(file, { maxBytes: FORUM_IMAGE_MAX_BYTES })));
  return selected;
}

export function createForumDraft() {
  return { id: crypto.randomUUID(), uploads: new Map(), attempted: false, saved: false };
}

async function readDraft(client, table, draft, authorId) {
  const { data, error } = await client.from(table).select('*').eq('id', draft.id).eq('autor_id', authorId).maybeSingle();
  if (error) throw error;
  return data;
}

async function removeUploads(client, uploads) {
  if (!uploads.length) return true;
  try {
    const { error } = await client.storage.from(FORUM_MEDIA_BUCKET).remove(uploads.map(upload => upload.path));
    return !error;
  } catch {
    return false;
  }
}

// A draft keeps its UUID and successful uploads after a failed request. A retry can
// confirm the already-created row instead of creating another post or response.
export async function saveForumDraft(client, { draft, table, authorId, values, attachments }) {
  if (!FORUM_TABLES.has(table) || !UUID_PATTERN.test(authorId || '')) throw new Error('No se pudo confirmar tu perfil.');
  const selected = attachments || [];
  if (selected.length > FORUM_IMAGE_LIMIT) throw new Error('Puedes adjuntar hasta 4 imágenes.');
  if (draft.attempted) {
    let existing;
    try { existing = await readDraft(client, table, draft, authorId); }
    catch { throw new Error('No se pudo confirmar el envío anterior. Reintenta cuando vuelva la conexión.'); }
    if (existing) {
      draft.saved = true;
      return existing;
    }
  }

  const bucket = client.storage.from(FORUM_MEDIA_BUCKET);
  const urls = [];
  for (const attachment of selected) {
    let upload = draft.uploads.get(attachment.id);
    if (!upload) {
      const extension = await validateImageFile(attachment.file, { maxBytes: FORUM_IMAGE_MAX_BYTES });
      const path = `${authorId}/foro/${crypto.randomUUID()}.${extension}`;
      const { error } = await bucket.upload(path, attachment.file, { contentType: attachment.file.type, upsert: false });
      if (error) throw new Error('No se pudo subir la imagen. Revisa la conexión y la configuración de Foro en Supabase.');
      const { data } = bucket.getPublicUrl(path);
      const url = data?.publicUrl;
      if (!url || !url.startsWith('https://')) {
        await removeUploads(client, [{ path }]);
        throw new Error('No se pudo obtener la dirección de la imagen.');
      }
      upload = { path, url };
      draft.uploads.set(attachment.id, upload);
    }
    urls.push(upload.url);
  }

  draft.attempted = true;
  let result;
  try {
    result = await client.from(table).insert({ ...values, id: draft.id, autor_id: authorId, imagenes: urls }).select('*').single();
  } catch (error) {
    result = { error };
  }
  let data = result.data;
  if (result.error || !data) {
    try { data = await readDraft(client, table, draft, authorId); }
    catch { throw new Error('No se pudo confirmar el envío. Tu borrador sigue aquí para reintentar.'); }
    if (!data) throw new Error('No se pudo publicar. Tu borrador sigue aquí para reintentar.');
  }
  draft.saved = true;
  const attached = new Set(data.imagenes || []);
  await removeUploads(client, [...draft.uploads.values()].filter(upload => !attached.has(upload.url)));
  return data;
}

// Never remove a file that belongs to a confirmed post. If the connection is
// uncertain, leave the upload intact rather than break an already-published image.
export async function disposeForumDraft(client, { draft, table, authorId }) {
  if (!draft || !draft.uploads.size || draft.saved) return true;
  if (!FORUM_TABLES.has(table) || !UUID_PATTERN.test(authorId || '')) return false;
  let existing;
  try { existing = await readDraft(client, table, draft, authorId); }
  catch { return false; }
  const attached = new Set(existing?.imagenes || []);
  const removed = await removeUploads(client, [...draft.uploads.values()].filter(upload => !attached.has(upload.url)));
  if (removed) draft.uploads.clear();
  return removed;
}
