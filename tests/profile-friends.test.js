import test from 'node:test';
import assert from 'node:assert/strict';
import { changeProfileFriendship, confirmProfileFriendship, getProfileFriendship, listProfileFriends, profileFriendPath } from '../src/utils/profileFriends.js';

const personId = '11111111-1111-4111-8111-111111111111';
const relationshipId = '22222222-2222-4222-8222-222222222222';

test('solicitudes y respuestas usan una única RPC confirmada, sin duplicar notificaciones desde el cliente', async () => {
  const calls = [];
  const client = { rpc: async (name, args) => { calls.push({ name, args }); return { data: { estado: args.p_accion === 'aceptar' ? 'friends' : 'sent', solicitud_id: relationshipId }, error: null }; } };
  assert.equal((await changeProfileFriendship(client, personId, 'enviar')).estado, 'sent');
  assert.equal((await changeProfileFriendship(client, personId, 'aceptar')).estado, 'friends');
  assert.deepEqual(calls, ['enviar', 'aceptar'].map(action => ({ name: 'thc_perfil_amistad_accion', args: { p_perfil_id: personId, p_accion: action } })));
});

test('revisitar el perfil lee la relación persistida en servidor', async () => {
  const client = { rpc: async (name, args) => {
    assert.equal(name, 'thc_perfil_amistad_estado'); assert.deepEqual(args, { p_perfil_id: personId });
    return { data: { estado: 'received', solicitud_id: relationshipId }, error: null };
  } };
  assert.equal((await getProfileFriendship(client, personId)).estado, 'received');
});

test('errores de permisos, instalación y red no se interpretan como lista vacía o amistad inexistente', async () => {
  for (const [code, pattern] of [['42501', /permiso/], ['PGRST202', /Supabase/]]) {
    await assert.rejects(getProfileFriendship({ rpc: async () => ({ data: null, error: { code } }) }, personId), pattern);
    await assert.rejects(listProfileFriends({ rpc: async () => ({ data: null, error: { code } }) }, personId), pattern);
  }
  await assert.rejects(getProfileFriendship({ rpc: () => { throw new TypeError('Failed to fetch'); } }, personId), /conectar/);
});

test('respuesta incompleta nunca confirma envío ni inventa amigos', async () => {
  for (const data of [null, { estado: 'sent', solicitud_id: null }, { estado: 'unknown', solicitud_id: null }, { estado: 'none' }]) {
    assert.throws(() => confirmProfileFriendship(data), /confirmó|incompleta/);
  }
  await assert.rejects(listProfileFriends({ rpc: async () => ({ data: { amigos: [] }, error: null }) }, personId), /confirmó/);
});

test('lista usa UUID para rutas aunque haya apodos y nombres idénticos', async () => {
  const value = { amigos: [{ id: personId, nombre: 'Jugador', apodo: 'Mi apodo', discord_nombre: 'discord_user' }], recibidas: [], enviadas: [] };
  const client = { rpc: async () => ({ data: value, error: null }) };
  const friends = await listProfileFriends(client, personId);
  assert.equal(friends.amigos[0].nombre, 'Mi apodo');
  assert.equal(profileFriendPath(friends.amigos[0].id), `/perfil/${personId}`);
});

test('UUID y acciones inválidas se rechazan antes de contactar Supabase', async () => {
  let calls = 0;
  const client = { rpc: async () => { calls++; } };
  await assert.rejects(changeProfileFriendship(client, personId, 'inventar'), /válida/);
  await assert.rejects(changeProfileFriendship(client, 'Jugador', 'enviar'), /identificar/);
  await assert.rejects(listProfileFriends(client, 'Jugador'), /identificar/);
  assert.equal(calls, 0);
});

test('lectura RPC propaga AbortSignal para descartar respuestas al cambiar de perfil', async () => {
  const controller = new AbortController();
  let received;
  const client = { rpc: () => ({ abortSignal: signal => { received = signal; return Promise.resolve({ data: { estado: 'none', solicitud_id: null }, error: null }); } }) };
  assert.equal((await getProfileFriendship(client, personId, { signal: controller.signal })).estado, 'none');
  assert.equal(received, controller.signal);
});
