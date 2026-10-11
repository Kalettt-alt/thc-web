import assert from 'node:assert/strict';
import test from 'node:test';
import { deletePlaylistTrack, playlistAfterDeletion } from '../src/pages/UltimateTeam/playlistUTActions.js';

const owner = '11111111-1111-4111-8111-111111111111';
const track = '22222222-2222-4222-8222-222222222222';
function setup({ data = [{ id: track }], error = null, session = owner, authError = null, pending = false } = {}) {
  const calls = [];
  const query = {
    delete() { calls.push(['delete']); return this; },
    eq(...args) { calls.push(['eq', ...args]); return this; },
    select(value) { calls.push(['select', value]); return this; },
    abortSignal(signal) { calls.push(['signal', signal]); return pending ? new Promise(() => {}) : Promise.resolve({ data, error }); },
  };
  return { calls, client: { auth: { getUser: async () => ({ data: { user: session ? { id: session } : null }, error: authError }) }, from(name) { calls.push(['from', name]); return query; } } };
}

test('el borrado usa la sesión actual, filtra propietario e ID y confirma exactamente una fila', async () => {
  const context = setup();
  assert.equal(await deletePlaylistTrack(context.client, { trackId: track, userId: owner }), track);
  assert.deepEqual(context.calls.slice(0, 5), [['from', 'PlaylistUT'], ['delete'], ['eq', 'id', track], ['eq', 'user_id', owner], ['select', 'id']]);
});

test('RLS que devuelve cero filas o un ID diferente nunca produce éxito', async () => {
  for (const data of [[], null, [{ id: 'other' }], [{ id: track }, { id: track }]]) {
    const context = setup({ data });
    await assert.rejects(deletePlaylistTrack(context.client, { trackId: track, userId: owner }), error => error.code === 'PLAYLIST_NOT_DELETED');
  }
});

test('sesión ausente o distinta no ejecuta DELETE y permisos de base de datos son visibles', async () => {
  for (const session of [null, 'other-user']) {
    const context = setup({ session });
    await assert.rejects(deletePlaylistTrack(context.client, { trackId: track, userId: owner }), /sesión cambió/);
    assert.equal(context.calls.length, 0);
  }
  const denied = setup({ data: null, error: { code: '42501' } });
  await assert.rejects(deletePlaylistTrack(denied.client, { trackId: track, userId: owner }), /No tienes permiso/);
});

test('timeout aborta una conexión pendiente y permite reintentar', async () => {
  const context = setup({ pending: true });
  await assert.rejects(deletePlaylistTrack(context.client, { trackId: track, userId: owner, timeoutMs: 10 }), error => error.code === 'PLAYLIST_TIMEOUT');
  assert.equal(context.calls.find(([name]) => name === 'signal')[1].aborted, true);
  assert.equal(await deletePlaylistTrack(setup().client, { trackId: track, userId: owner }), track);
});

test('fallos de red no aseguran que la base conservó el registro y piden comprobar la playlist', async () => {
  const context = setup();
  context.client.auth.getUser = async () => { throw new TypeError('Failed to fetch'); };
  await assert.rejects(deletePlaylistTrack(context.client, { trackId: track, userId: owner }), /comprobar el borrado antes de reintentar/);
  assert.equal(context.calls.length, 0);
});

test('borrar una anterior conserva la canción actual y borrar la actual elige la siguiente y pausa', () => {
  const songs = ['a', 'b', 'c'].map(id => ({ id }));
  const before = playlistAfterDeletion(songs, 2, 'a');
  assert.equal(before.playlist[before.currentIdx].id, 'c');
  assert.equal(before.removedCurrent, false);
  const current = playlistAfterDeletion(songs, 1, 'b');
  assert.equal(current.playlist[current.currentIdx].id, 'c');
  assert.equal(current.removedCurrent, true);
  const last = playlistAfterDeletion(songs, 2, 'c');
  assert.equal(last.currentIdx, 1);
  const only = playlistAfterDeletion([{ id: 'a' }], 0, 'a');
  assert.deepEqual(only, { playlist: [], currentIdx: 0, removedCurrent: true });
  assert.equal(songs.length, 3);
});
