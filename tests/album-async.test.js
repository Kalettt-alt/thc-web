import test from 'node:test';
import assert from 'node:assert/strict';
import { withAlbumTimeout } from '../src/utils/albumAsync.js';

test('las consultas completadas conservan su resultado y cancelan el temporizador', async context => {
  context.mock.timers.enable({ apis: ['setTimeout'] });
  const clear = context.mock.method(globalThis, 'clearTimeout');
  assert.deepEqual(await withAlbumTimeout(Promise.resolve({ success: true }), 20), { success: true });
  assert.equal(clear.mock.callCount(), 1);
  context.mock.timers.tick(21);
});

test('los fallos reales conservan el error original sin convertirlo en timeout', async context => {
  context.mock.timers.enable({ apis: ['setTimeout'] });
  const clear = context.mock.method(globalThis, 'clearTimeout');
  const error = Object.assign(new Error('Permiso denegado'), { code: '42501' });
  await assert.rejects(withAlbumTimeout(Promise.reject(error), 20), value => value === error);
  assert.equal(clear.mock.callCount(), 1);
  context.mock.timers.tick(21);
});

test('una petición colgada termina con NETWORK_TIMEOUT y las respuestas tardías se ignoran', async context => {
  context.mock.timers.enable({ apis: ['setTimeout'] });
  let resolveLate;
  const source = new Promise(resolve => { resolveLate = resolve; });
  const request = withAlbumTimeout(source, 20);
  const rejected = assert.rejects(request, error => error.code === 'NETWORK_TIMEOUT');
  context.mock.timers.tick(20);
  await rejected;
  resolveLate({ success: true });
  await assert.rejects(request, error => error.code === 'NETWORK_TIMEOUT');
});

test('rechaza tiempos inválidos y acepta valores o promesas', async () => {
  assert.equal(await withAlbumTimeout(7, 20), 7);
  for (const timeout of [0, -1, Infinity, NaN]) await assert.rejects(withAlbumTimeout(Promise.resolve(), timeout), RangeError);
});
