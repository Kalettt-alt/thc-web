import test from 'node:test';
import assert from 'node:assert/strict';
import { careerEnergy, fitnessAdjustedRating, hasTiredCareerPlayers, prepareCareerFitness, restoreCareerSquad } from '../src/pages/THCFantasy/careerEnergy.js';
import { createFantasyDrinkClient, pendingFantasyDrink, validateDrinkReceipt } from '../src/pages/THCFantasy/fantasyDrinks.js';
import { saveFantasySnapshot } from '../src/pages/THCFantasy/fantasyPersistence.js';

const firstId = '3f63c504-ef93-4442-9072-c2263a3caaa1';
const secondId = '3f63c504-ef93-4442-9072-c2263a3caaa2';
const player = (id, energia = 100) => ({ id, name: id, pos: 'MID', grl: 78, energia });
const save = (round = 0, played = false) => ({ club_id: 'club', club_nombre: 'Club', liga: 'ARG', jornada_actual: round, tactica: '4-3-3 OFENSIVO', titulares: { mc1: player('starter', 45), empty: null }, reservas: [player('reserve', 70)], fixture: [[{ local: 'club', visitante: 'rival', jugado: played }], [{ local: 'rival', visitante: 'club', jugado: false }]], standings: {}, energia_revision: 0 });
const storage = () => {
  const values = new Map();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
};
const authenticated = async () => ({ data: { user: { id: 'user' } }, error: null });
const receipt = (bebidas = 1, revision = 1) => ({ bebidas, energia_revision: revision, ...restoreCareerSquad(save().titulares, save().reservas) });

test('a new first date restores all starters and reserves without touching the fixture or original JSON', () => {
  const old = save();
  const result = prepareCareerFitness(old);
  assert.equal(result.titulares.mc1.energia, 100);
  assert.equal(result.reservas[0].energia, 100);
  assert.equal(result.titulares.empty, null);
  assert.equal(old.titulares.mc1.energia, 45);
  assert.equal(old.reservas[0].energia, 70);
  assert.strictEqual(result.fixture, old.fixture);
});

test('a finished first date and later dates preserve fatigue instead of giving energy on reload', () => {
  for (const old of [save(0, true), save(1, true)]) {
    const result = prepareCareerFitness(old);
    assert.equal(result.titulares.mc1.energia, 45);
    assert.equal(result.reservas[0].energia, 70);
  }
});

test('fatigue affects the squad selection score and never makes energy negative or above one hundred', () => {
  assert.equal(careerEnergy(-10), 0);
  assert.equal(careerEnergy(130), 100);
  assert.equal(careerEnergy(NaN), 100);
  assert.ok(fitnessAdjustedRating({ grl: 90, energia: 15 }) < fitnessAdjustedRating({ grl: 78, energia: 100 }));
  assert.equal(hasTiredCareerPlayers(save().titulares, save().reservas), true);
  const restored = restoreCareerSquad(save().titulares, save().reservas);
  assert.equal(hasTiredCareerPlayers(restored.titulares, restored.reservas), false);
});

test('drink response never supplies a fabricated default balance and rejects incomplete restoration', () => {
  for (const wrong of [null, {}, { bebidas: -1 }, { bebidas: 3 }, { bebidas: '2' }]) assert.throws(() => validateDrinkReceipt(wrong));
  assert.throws(() => validateDrinkReceipt({ bebidas: 1 }, true));
  assert.equal(validateDrinkReceipt(receipt(), true).bebidas, 1);
});

test('double click shares one pending drink request and saves the squad before consuming', async () => {
  let calls = 0;
  let saves = 0;
  let respond;
  const disk = storage();
  const client = { auth: { getUser: authenticated }, rpc: async (name, args) => {
    calls++;
    assert.equal(name, 'thc_fantasy_usar_bebida');
    assert.equal(args.p_solicitud_id, firstId);
    assert.equal(saves, 1);
    return new Promise(resolve => { respond = resolve; });
  } };
  const actor = createFantasyDrinkClient(client, 'user', { storage: disk, makeId: () => firstId });
  const first = actor.consume({ beforeConsume: async () => { saves++; } });
  const second = actor.consume({ beforeConsume: async () => { saves++; } });
  assert.strictEqual(first, second);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(calls, 1);
  assert.equal(pendingFantasyDrink(disk, 'user'), firstId);
  respond({ data: receipt(), error: null });
  assert.equal((await first).bebidas, 1);
  assert.equal(pendingFantasyDrink(disk, 'user'), null);
});

test('a lost server response survives remount and retries the original UUID without overwriting recovered stamina', async () => {
  const disk = storage();
  let beforeSaves = 0;
  let debit = 0;
  const confirmed = new Map();
  const client = { auth: { getUser: authenticated }, rpc: async (_name, args) => {
    if (!confirmed.has(args.p_solicitud_id)) {
      debit++;
      confirmed.set(args.p_solicitud_id, receipt());
      return { data: null, error: new Error('Lost response') };
    }
    return { data: { ...confirmed.get(args.p_solicitud_id), reintentado: true }, error: null };
  } };
  const first = createFantasyDrinkClient(client, 'user', { storage: disk, makeId: () => firstId });
  await assert.rejects(first.consume({ beforeConsume: async () => { beforeSaves++; } }), /Lost response/);
  const remount = createFantasyDrinkClient(client, 'user', { storage: disk, makeId: () => secondId });
  assert.equal((await remount.consume({ beforeConsume: async () => { beforeSaves++; } })).reintentado, true);
  assert.equal(debit, 1);
  assert.equal(beforeSaves, 1);
  assert.equal(remount.pending(), null);
});

test('timeout preserves a request for reconciliation while a database rejection safely releases it', async () => {
  const disk = storage();
  const slow = createFantasyDrinkClient({ auth: { getUser: authenticated }, rpc: () => new Promise(() => {}) }, 'user', { storage: disk, makeId: () => firstId, timeoutMs: 15 });
  await assert.rejects(slow.consume(), /conexión/);
  assert.equal(slow.pending(), firstId);
  const denied = createFantasyDrinkClient({ auth: { getUser: authenticated }, rpc: async () => ({ data: null, error: { code: 'P0001', message: 'No drinks' } }) }, 'user', { storage: disk });
  await assert.rejects(denied.consume(), error => error.code === 'P0001' && error.message === 'No drinks');
  assert.equal(denied.pending(), null);
});

test('cancelled initialization and a different account cannot dispatch a drink or save its balance locally', async () => {
  let resolveAuth;
  let active = true;
  let calls = 0;
  const client = { auth: { getUser: () => new Promise(resolve => { resolveAuth = resolve; }) }, rpc: () => { calls++; } };
  const actor = createFantasyDrinkClient(client, 'user', { storage: storage(), makeId: () => firstId, isActive: () => active });
  const consuming = actor.consume();
  active = false;
  resolveAuth({ data: { user: { id: 'user' } }, error: null });
  await assert.rejects(consuming, /no está abierta/);
  assert.equal(calls, 0);
  const wrongUser = createFantasyDrinkClient({ ...client, auth: { getUser: async () => ({ data: { user: { id: 'other' } }, error: null }) } }, 'user', { storage: storage(), makeId: () => firstId });
  await assert.rejects(wrongUser.status(), /cuenta/);
  assert.equal(calls, 0);
});

test('a failing browser request log or a failed prerequisite save never spends a drink', async () => {
  let calls = 0;
  const client = { auth: { getUser: authenticated }, rpc: () => { calls++; } };
  const blockedDisk = { getItem: () => null, setItem: () => { throw new Error('Blocked storage'); } };
  await assert.rejects(createFantasyDrinkClient(client, 'user', { storage: blockedDisk, makeId: () => firstId }).consume(), /Blocked storage/);
  await assert.rejects(createFantasyDrinkClient(client, 'user', { storage: storage(), makeId: () => firstId }).consume({ beforeConsume: async () => { throw new Error('Save failed'); } }), /Save failed/);
  assert.equal(calls, 0);
});

test('Fantasy guarded saves send the energy revision and never use a legacy upsert after an economic conflict', async () => {
  let writes = 0;
  let args;
  const client = { auth: { getUser: authenticated }, rpc: async (_name, value) => { args = value; return { data: null, error: { code: '40001', message: 'Stale energy' } }; }, from: () => { writes++; } };
  await assert.rejects(saveFantasySnapshot(client, { ...save(), energia_revision: 3 }, 'user'), /energía cambió/);
  assert.equal(args.p_energia_revision, 3);
  assert.equal(writes, 0);
});

test('an absent migration preserves ordinary career saving until the SQL is installed', async () => {
  let legacy;
  const client = { auth: { getUser: authenticated }, rpc: async () => ({ data: null, error: { code: 'PGRST202' } }), from: () => ({ upsert: value => { legacy = value; return { select: () => ({ single: async () => ({ data: { id: 'career' }, error: null }) }) }; } }) };
  assert.equal(await saveFantasySnapshot(client, { ...save(), energia_revision: 0 }, 'user'), true);
  assert.equal('energia_revision' in legacy, false);
  assert.equal(legacy.user_id, 'user');
});

test('a stalled guarded save times out without falling back to an unprotected write', async () => {
  let legacyWrites = 0;
  const client = { auth: { getUser: authenticated }, rpc: () => new Promise(() => {}), from: () => { legacyWrites++; } };
  await assert.rejects(saveFantasySnapshot(client, save(), 'user', () => true, 15), /guardado a tiempo/);
  assert.equal(legacyWrites, 0);
});
