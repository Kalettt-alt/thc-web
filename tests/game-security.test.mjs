import test from 'node:test';
import assert from 'node:assert/strict';
import { validateLogoFile, MAX_LOGO_BYTES, validateClubForm, normalizePlayerList, normalizeUtConfig, buildStarterSquad } from '../src/pages/UltimateTeam/utValidation.js';
import { JUGADORES_BASE } from '../src/pages/UltimateTeam/data/jugadoresBase.js';
import { validateFantasySave } from '../src/pages/THCFantasy/fantasyValidation.js';

const validCareer = () => ({ club_id: 'home', jornada_actual: 0, tactica: '4-3-3 OFENSIVO', titulares: { gk: { id: 'p1', name: 'Portero', pos: 'GK', grl: 70, energia: 100 } }, reservas: [], fixture: [[{ local: 'home', visitante: 'away' }]], standings: Object.fromEntries(['home', 'away'].map(id => [id, { id, name: id, pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, pts: 0, dg: 0 }])) });

test('logo upload rejects active content disguised as PNG, MIME mismatch and oversized input', async () => {
  await assert.rejects(validateLogoFile(new Blob(['<script>alert(1)</script>'], { type: 'image/png' })));
  await assert.rejects(validateLogoFile(new Blob([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], { type: 'image/jpeg' })));
  await assert.rejects(validateLogoFile(new Blob([new Uint8Array(MAX_LOGO_BYTES + 1)], { type: 'image/png' })));
  await assert.rejects(validateLogoFile(new Blob(['<svg/>'], { type: 'image/svg+xml' })));
  assert.equal(await validateLogoFile(new Blob([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], { type: 'image/png' })), 'png');
});

test('club submission validates the entire form even when wizard controls are bypassed', () => {
  const form = { nombre: ' Club ', abreviatura: 'THC', liga: { id: 'premier' }, estadio: 'Estadio', apodos: ['Hinchas'], equipacion: { camiseta: { colores: ['#112233', '#AABBCC'] } }, logoFile: {} };
  assert.equal(validateClubForm(form, [{ id: 'premier' }]), null);
  assert.match(validateClubForm({ ...form, abreviatura: '12!' }, [{ id: 'premier' }]), /abreviatura/);
  assert.match(validateClubForm({ ...form, liga: { id: 'inventada' } }, [{ id: 'premier' }]), /liga/);
  assert.match(validateClubForm({ ...form, nombre: 'Club\nmalformado' }, [{ id: 'premier' }]), /nombre/);
});

test('automatic starter squad matches pitch slots and never duplicates or mutates cards', () => {
  const input = structuredClone(JUGADORES_BASE);
  const squad = buildStarterSquad(input);
  assert.deepEqual(squad.titulares.map(player => player.pos), ['LW', 'ST', 'RW', 'CM', 'CAM', 'CM', 'LB', 'CB', 'CB', 'RB', 'GK']);
  assert.equal(new Set([...squad.titulares, ...squad.suplentes, ...squad.reservas].map(player => player.id)).size, 23);
  assert.deepEqual(input, JUGADORES_BASE);
});

test('corrupt stored squad and config values do not become React children or huge arrays', () => {
  const squad = normalizePlayerList([null, 3, { nombre: { malicious: true }, grl: '99', pos: {}, color: 'inventado' }], 11);
  assert.equal(squad[2].nombre, 'Jugador');
  assert.equal(squad[2].grl, 0);
  assert.equal(squad[2].pos, '');
  assert.deepEqual(normalizePlayerList({}, 11), []);
  const config = normalizeUtConfig({ colorCount: -1, colors: null, volMaster: 0, extrapolation: 1000000, kickKeys: { 0: {} } });
  assert.equal(config.colorCount, 3);
  assert.equal(config.colors.length, 3);
  assert.equal(config.volMaster, 0);
  assert.equal(config.extrapolation, 500);
  assert.equal(config.kickKeys[0], 'Space');
});

test('saved Fantasy career rejects invalid JSON shapes and references before UI loads', () => {
  const career = validCareer();
  assert.equal(validateFantasySave(career), true);
  assert.equal(validateFantasySave({ ...career, reservas: {} }), false);
  assert.equal(validateFantasySave({ ...career, jornada_actual: 20 }), false);
  assert.equal(validateFantasySave({ ...career, fixture: [[{ local: 'home', visitante: 'unknown' }]] }), false);
  assert.equal(validateFantasySave({ ...career, titulares: { gk: { id: 'p1', name: {}, pos: 'GK', grl: 70, energia: 100 } } }), false);
});


test('Fantasy persistence never writes a previous account career into a new account', async () => {
  const { saveFantasySnapshot } = await import('../src/pages/THCFantasy/fantasyPersistence.js');
  let writes = 0;
  const client = { auth: { getUser: async () => ({ data: { user: { id: 'new-user' } }, error: null }) }, from: () => { writes++; throw new Error('Unexpected database write'); } };
  await assert.rejects(saveFantasySnapshot(client, validCareer(), 'old-user'), /cuenta/);
  assert.equal(writes, 0);
});

test('Fantasy persistence checks database failures and writes that return no row', async () => {
  const { saveFantasySnapshot } = await import('../src/pages/THCFantasy/fantasyPersistence.js');
  const failure = new Error('Disconnected');
  const client = result => ({ auth: { getUser: async () => ({ data: { user: { id: 'owner' } }, error: null }) }, from: () => ({ upsert: () => ({ select: () => ({ single: async () => result }) }) }) });
  await assert.rejects(saveFantasySnapshot(client({ data: null, error: failure }), validCareer(), 'owner'), /Disconnected/);
  await assert.rejects(saveFantasySnapshot(client({ data: null, error: null }), validCareer(), 'owner'), /confirmó/);
  assert.equal(await saveFantasySnapshot(client({ data: { id: 'save-id' }, error: null }), validCareer(), 'owner'), true);
});

test('Fantasy persistence drops stale or deleted snapshots after delayed authentication', async () => {
  const { saveFantasySnapshot } = await import('../src/pages/THCFantasy/fantasyPersistence.js');
  let resolveAuth;
  let writes = 0;
  let allowed = true;
  const client = { auth: { getUser: () => new Promise(resolve => { resolveAuth = resolve; }) }, from: () => { writes++; throw new Error('Unexpected write'); } };
  const saving = saveFantasySnapshot(client, validCareer(), 'owner', () => allowed);
  allowed = false;
  resolveAuth({ data: { user: { id: 'owner' } }, error: null });
  assert.equal(await saving, false);
  assert.equal(writes, 0);
});


test('Fantasy club lookup distinguishes duplicate IDs across leagues without changing stored IDs', async () => {
  const { resolveFantasyClub } = await import('../src/pages/THCFantasy/equiposFantasy.js');
  assert.equal(resolveFantasyClub({ id: 'nacional', liga: 'COL' }).name, 'Atlético Nacional');
  assert.equal(resolveFantasyClub({ id: 'nacional', liga: 'URU' }).name, 'Nacional');
  assert.equal(resolveFantasyClub({ id: 'racing', liga: 'ESP' }).name, 'Real Racing Club de Santander');
  assert.equal(resolveFantasyClub({ id: 'racing', liga: 'ARG' }).name, 'Racing Club');
  assert.equal(resolveFantasyClub({ id: 'nacional', liga: 'COL' }).id, 'nacional');
});
