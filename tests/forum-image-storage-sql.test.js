import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sql = await readFile(new URL('../supabase/forum_image_storage.sql', import.meta.url), 'utf8');
const statements = sql.replace(/^--.*$/gm, '');
const ownFilePattern = '^11111111-1111-4111-8111-111111111111/foro/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.(png|jpg|jpeg|webp|gif)$';

test('el archivo para copiar coincide con el parche aislado de imágenes del Foro', async () => {
  assert.equal(await readFile(new URL('../ComandosSQL_ImagenesForo.txt', import.meta.url), 'utf8'), sql);
  assert.match(statements, /^\s*begin;/i);
  assert.match(statements, /commit;\s*$/i);
  assert.match(sql, /relrowsecurity/);
  assert.doesNotMatch(statements, /(?:delete from|update|insert into|alter table)\s+public\.(?:perfiles|amigos|notificaciones|foro_publicaciones|foro_comentarios|votos_publicaciones|votos_comentarios)\b/i);
});

test('Storage limita tamaño y tipos, protege la carpeta propia y no permite sobrescritura', () => {
  assert.match(sql, /values \('foro_media', 'foro_media', true, 5242880, array\['image\/png', 'image\/jpeg', 'image\/webp', 'image\/gif'\]\)/);
  for (const operation of ['insert', 'delete', 'select', 'update']) {
    assert.match(sql, new RegExp(`create policy thc_forum_media_${operation}_guard on storage\\.objects\\s+as restrictive for ${operation} to public`, 'i'));
  }
  assert.match(sql, /as restrictive for update to public\s+using \(bucket_id <> 'foro_media'\)\s+with check \(bucket_id <> 'foro_media'\)/);
  assert.match(sql, /split_part\(name, '\/', 1\) = \(select auth\.uid\(\)\)::text/);
  assert.doesNotMatch(statements, /grant\s+(?:all|update)\b/i);
  const pattern = new RegExp(ownFilePattern);
  const base = '11111111-1111-4111-8111-111111111111/foro/22222222-2222-4222-8222-222222222222';
  for (const extension of ['png', 'jpg', 'jpeg', 'webp', 'gif']) assert.ok(pattern.test(`${base}.${extension}`));
  for (const invalid of [`${base}.svg`, `${base}.png.html`, `${base}.png/other`, `${base.replace('11111111', '33333333')}.png`, `${base.replace('/foro/', '/')}.png`]) assert.equal(pattern.test(invalid), false);
  assert.ok(sql.includes('/foro/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.(png|jpg|jpeg|webp|gif)$'));
});

test('IDs de recuperación solo conceden columnas necesarias y mantienen autoría propia bajo RLS', () => {
  for (const table of ['foro_publicaciones', 'foro_comentarios']) {
    assert.match(sql, new RegExp(`grant insert \\(id, imagenes\\) on public\\.${table} to authenticated`, 'i'));
    assert.match(sql, new RegExp(`create policy thc_forum_upload_author_guard on public\\.${table}\\s+as restrictive for insert to authenticated\\s+with check \\(autor_id = \\(select auth\\.uid\\(\\)\\)\\)`, 'i'));
  }
  assert.doesNotMatch(statements, /(?:create|drop)\s+policy\s+(?:thc_foro_|thc_perfil_|thc_friends_)/i);
});
