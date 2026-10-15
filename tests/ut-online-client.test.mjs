import test from 'node:test';
import assert from 'node:assert/strict';
import { cancelOnlineQueue, getOnlineStatus, heartbeatOnlineQueue, joinOnlineQueue, updateOnlineTactics, onlineUtError, ONLINE_GRL_RANGE, ONLINE_POLL_MS } from '../src/pages/UltimateTeam/onlineUT.js';

const requestId = '11111111-1111-4111-8111-111111111111';
const payload = { status: 'waiting', online_count: 1, server_now: '2026-10-10T12:00:00Z', queue_grl: 71, match: null, team: { grl: 71, stamina: 100, titulares: [] } };

test('servicio Online envía solo solicitudUUID y recupera el estadoautoritative sin modificarlo', async () => {
  const calls = [];
  const client = { rpc: async (name, args) => { calls.push({ name, args }); return { data: payload, error: null }; } };
  assert.equal(await joinOnlineQueue(client, requestId), payload);
  assert.deepEqual(calls[0], { name: 'thc_ut_online_buscar', args: { p_request_id: requestId } });
  assert.equal(await getOnlineStatus(client), payload);
  assert.equal(await heartbeatOnlineQueue(client), payload);
  assert.equal(await cancelOnlineQueue(client), payload);
  assert.deepEqual(calls.slice(1).map(call => call.name), ['thc_ut_online_estado', 'thc_ut_online_heartbeat', 'thc_ut_online_cancelar']);
  assert.ok(calls.slice(1).every(call => Object.keys(call.args).length === 0));
  assert.equal(ONLINE_GRL_RANGE, 3); assert.equal(ONLINE_POLL_MS, 2000);
});

test('táctica envía IDs, revisión y operación idempotente; nunca GRL ni stamina del cliente', async () => {
  const calls = [];
  const client = { rpc: async (name, args) => { calls.push({ name, args }); return { data: payload }; } };
  const titulares = Array.from({ length: 11 }, (_, index) => `p${index + 1}`);
  await updateOnlineTactics(client, { matchId: requestId, revision: 2, requestId, titulares, formacion: '4-4-2', mentalidad: 'ofensiva', grl: 99, stamina: 100 });
  assert.deepEqual(calls[0], { name: 'thc_ut_online_tactica', args: { p_match_id: requestId, p_revision: 2, p_request_id: requestId, p_titulares: titulares, p_formacion: '4-4-2', p_mentalidad: 'ofensiva' } });
  await assert.rejects(updateOnlineTactics(client, { matchId: requestId, revision: 2, titulares: Array(11).fill('p1'), formacion: '4-4-2', mentalidad: 'ofensiva' }), /alineación/);
  assert.equal(calls.length, 1);
});

test('identificadorinválido se rechaza antes de escribir en Supabase', async () => {
  let calls = 0;
  await assert.rejects(joinOnlineQueue({ rpc: () => { calls++; } }, 'not-a-uuid'), /identificador/);
  await assert.rejects(cancelOnlineQueue({ rpc: () => { calls++; } }, 'not-a-uuid'), /identificador/);
  assert.equal(calls, 0);
});

test('cancelar una búsqueda incierta envía su UUID para impedir que se reactive después', async () => {
  const calls = [];
  const client = { rpc: async (name, args) => { calls.push({ name, args }); return { data: { ...payload, status: 'idle' }, error: null }; } };
  assert.equal((await cancelOnlineQueue(client, requestId)).status, 'idle');
  assert.deepEqual(calls, [{ name: 'thc_ut_online_cancelar', args: { p_request_id: requestId } }]);
});

test('fallo RLS, red y esquema sinactivar ofrecen error y nunca inventan rival', async () => {
  for (const code of ['42501', 'PGRST202', '22023']) {
    const error = { code, message: 'Completa los once puestos.' };
    const client = { rpc: async () => ({ data: null, error }) };
    await assert.rejects(getOnlineStatus(client), result => result.code === code && result.cause === error);
  }
  await assert.rejects(getOnlineStatus({ rpc: () => { throw new TypeError('Network lost'); } }), /conexión/);
  assert.match(onlineUtError({ code: 'PGRST202' }), /ComandosSQL_OnlineUT/);
});

test('una respuesta incompleta no confirma búsqueda ni partido', async () => {
  for (const data of [null, { status: 'playing' }, { status: 'offline', online_count: 1 }, { status: 'waiting', online_count: -1 }]) {
    await assert.rejects(getOnlineStatus({ rpc: async () => ({ data, error: null }) }), /confirmar/);
  }
});

test('llamada real de RPC recibe señal abortable y marcador server se conserva', async () => {
  let signal;
  const value = { ...payload, status: 'finished', match: { id: requestId, home_goals: 2, away_goals: 1 } };
  const client = { rpc: () => ({ abortSignal: controllerSignal => { signal = controllerSignal; return Promise.resolve({ data: value, error: null }); } }) };
  assert.equal((await getOnlineStatus(client)).match.home_goals, 2);
  assert.ok(signal instanceof AbortSignal); assert.equal(signal.aborted, false);
});
