import test from 'node:test';
import assert from 'node:assert/strict';
import { createForumDraft, disposeForumDraft, saveForumDraft, validateForumFiles } from '../src/utils/forumMedia.js';

const authorId = '11111111-1111-4111-8111-111111111111';
const png = name => new File([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0])], name, { type: 'image/png' });
const attachment = (id, name = 'foto.png') => ({ id, file: png(name) });

function mock({ lostInsert = false, failUpload = 0, failRead = false } = {}) {
  const uploads = [], removed = [], inserts = [], rows = new Map();
  const bucket = {
    async upload(path, file, options) {
      uploads.push({ path, file, options });
      return { error: uploads.length === failUpload ? { message: 'red' } : null };
    },
    getPublicUrl(path) { return { data: { publicUrl: `https://demo.supabase.co/storage/v1/object/public/foro_media/${path}` } }; },
    async remove(paths) { removed.push(...paths); return { error: null }; },
  };
  const client = {
    storage: { from(name) { assert.equal(name, 'foro_media'); return bucket; } },
    from(table) {
      assert.ok(['foro_publicaciones', 'foro_comentarios'].includes(table));
      let values;
      const filters = {};
      return {
        insert(data) { values = data; return this; }, select() { return this; }, eq(key, value) { filters[key] = value; return this; },
        async single() {
          inserts.push(values); rows.set(values.id, values);
          return lostInsert ? { error: { message: 'respuesta perdida' }, data: null } : { data: values, error: null };
        },
        async maybeSingle() {
          if (failRead) return { error: { message: 'sin conexión' }, data: null };
          const row = rows.get(filters.id);
          return { data: row?.autor_id === filters.autor_id ? row : null, error: null };
        },
      };
    },
  };
  return { client, uploads, removed, inserts, rows };
}

test('Foro valida firmas reales, peso y máximo de adjuntos del PC', async () => {
  assert.equal((await validateForumFiles([png('uno.png')])).length, 1);
  await assert.rejects(validateForumFiles([png('uno.png')], 4), /4 imágenes/);
  await assert.rejects(validateForumFiles([new File(['html'], 'falso.png', { type: 'image/png' })]), /formato/);
  await assert.rejects(validateForumFiles([new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'grande.png', { type: 'image/png' })]), /menos/);
});

test('Publicación y respuesta guardan URL del archivo propio, con MIME y sin sobrescribir', async () => {
  for (const table of ['foro_publicaciones', 'foro_comentarios']) {
    const state = mock(); const draft = createForumDraft();
    const row = await saveForumDraft(state.client, { draft, table, authorId, values: { contenido: 'Prueba' }, attachments: [attachment('foto')] });
    assert.equal(row.id, draft.id); assert.equal(row.autor_id, authorId);
    assert.match(state.uploads[0].path, new RegExp(`^${authorId}/foro/[a-f0-9-]+\\.png$`));
    assert.deepEqual(state.uploads[0].options, { contentType: 'image/png', upsert: false });
    assert.equal(row.imagenes.length, 1); assert.equal(draft.saved, true);
  }
});

test('Si se pierde la respuesta de publicación, el reintento recupera el mismo UUID', async () => {
  const state = mock({ lostInsert: true }); const draft = createForumDraft();
  const args = { draft, table: 'foro_publicaciones', authorId, values: { contenido: 'Prueba' }, attachments: [attachment('foto')] };
  const first = await saveForumDraft(state.client, args);
  const second = await saveForumDraft(state.client, args);
  assert.equal(first.id, second.id); assert.equal(state.inserts.length, 1); assert.equal(state.uploads.length, 1);
  assert.equal(state.removed.length, 0);
});

test('Un fallo en la segunda imagen reutiliza la primera subida al reintentar', async () => {
  const state = mock({ failUpload: 2 }); const draft = createForumDraft();
  const args = { draft, table: 'foro_publicaciones', authorId, values: { contenido: 'Prueba' }, attachments: [attachment('uno'), attachment('dos')] };
  await assert.rejects(saveForumDraft(state.client, args), /subir/);
  assert.equal(state.inserts.length, 0);
  const row = await saveForumDraft(state.client, args);
  assert.equal(state.uploads.length, 3); assert.equal(row.imagenes.length, 2);
});

test('Cancelar borra solo los archivos del borrador que no están publicados', async () => {
  const state = mock({ failUpload: 2 }); const draft = createForumDraft();
  await assert.rejects(saveForumDraft(state.client, { draft, table: 'foro_comentarios', authorId, values: {}, attachments: [attachment('uno'), attachment('dos')] }));
  assert.equal(await disposeForumDraft(state.client, { draft, table: 'foro_comentarios', authorId }), true);
  assert.deepEqual(state.removed, [state.uploads[0].path]);
});

test('Una conexión incierta no borra imágenes que podrían haberse publicado', async () => {
  const state = mock({ failRead: true }); const draft = createForumDraft();
  draft.uploads.set('foto', { path: `${authorId}/foro/foto.png`, url: 'https://demo.supabase.co/foto.png' });
  assert.equal(await disposeForumDraft(state.client, { draft, table: 'foro_publicaciones', authorId }), false);
  assert.equal(state.removed.length, 0); assert.equal(draft.uploads.size, 1);
});
