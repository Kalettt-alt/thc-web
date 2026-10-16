import assert from 'node:assert/strict';
import test from 'node:test';
import { confirmFantasyTops, fantasyRayosForResult, fantasyTopsError } from '../src/pages/THCFantasy/fantasyTops.js';
import { saveFantasySnapshot } from '../src/pages/THCFantasy/fantasyPersistence.js';

test('rayos are determined only by win, draw or loss, including scoreless draws', () => {
  assert.equal(fantasyRayosForResult(1, 0), 2);
  assert.equal(fantasyRayosForResult(0, 0), 1);
  assert.equal(fantasyRayosForResult(4, 4), 1);
  assert.equal(fantasyRayosForResult(0, 1), -1);
  assert.throws(() => fantasyRayosForResult(-1, 0));
  assert.throws(() => fantasyRayosForResult('2', 1));
});

test('TOPS accepts negative rayos and private rows without exposing a profile link', () => {
  const row = { posicion: 12, rayos: -1, victorias: 0, empates: 0, derrotas: 1, nombre: 'Perfil privado', perfil_id: null, avatar_url: null };
  const data = { jugadores: [row], yo: null, total: 12, offset: 0 };
  assert.equal(confirmFantasyTops(data), data);
  assert.throws(() => confirmFantasyTops({ ...data, jugadores: [{ ...row, perfil_id: 'Jugador' }] }));
  assert.throws(() => confirmFantasyTops({ ...data, jugadores: [{ ...row, rayos: NaN }] }));
  assert.throws(() => confirmFantasyTops({ ...data, jugadores: [{ ...row, victorias: -1 }] }));
  assert.match(fantasyTopsError({ code: 'PGRST202' }), /pendiente de activar/);
});

test('career save forwards career identity and exposes only a server-confirmed reward', async () => {
  const confirmed = { id: 'saved', energia_revision: 0, rayos: 2, rayos_delta: 2 };
  const snapshot = { partida_id: 'career', energia_revision: 0 };
  let payload;
  let reward;
  const client = { auth: { getUser: async () => ({ data: { user: { id: 'user' } }, error: null }) }, rpc: async (name, args) => { payload = { name, args }; return { data: confirmed, error: null }; } };
  assert.equal(await saveFantasySnapshot(client, snapshot, 'user', () => true, 500, result => { reward = result; }), true);
  assert.equal(payload.name, 'thc_fantasy_guardar');
  assert.equal(payload.args.p_partida.partida_id, 'career');
  assert.equal(reward, confirmed);
  client.rpc = async () => ({ error: { message: 'Rejected', code: '22023' } });
  reward = null;
  await assert.rejects(() => saveFantasySnapshot(client, snapshot, 'user', () => true, 500, result => { reward = result; }));
  assert.equal(reward, null);
});
