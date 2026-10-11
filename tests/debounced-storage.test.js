import assert from 'node:assert/strict';
import test from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';
import { createDebouncedStorageWriter } from '../src/utils/debouncedStorage.js';

test('agrupa cambios y conserva el último antes de salir', async () => {
  const calls = [];
  const writer = createDebouncedStorageWriter({ write: (key, value) => calls.push([key, JSON.parse(value)]), delay: 30 });
  writer.queue('usuario-1', { title: 'Primero' });
  writer.queue('usuario-1', { title: 'Último' });
  assert.equal(calls.length, 0);
  writer.flush();
  assert.deepEqual(calls, [['usuario-1', { title: 'Último' }]]);
  await delay(50);
  assert.equal(calls.length, 1);
});

test('guardar al cambiar de cuenta mantiene cada clave', () => {
  const calls = [];
  const writer = createDebouncedStorageWriter({ write: (key, value) => calls.push([key, JSON.parse(value)]) });
  writer.queue('usuario-1', { title: 'Tablero A' });
  writer.flush();
  writer.queue('usuario-2', { title: 'Tablero B' });
  writer.flush();
  assert.deepEqual(calls, [['usuario-1', { title: 'Tablero A' }], ['usuario-2', { title: 'Tablero B' }]]);
});

test('el guardado automático informa fallos sin romper la navegación', async () => {
  let reported = 0;
  const writer = createDebouncedStorageWriter({ write: () => { throw new Error('QuotaExceededError'); }, onError: () => { reported += 1; }, delay: 5 });
  writer.queue('usuario', { title: 'Tablero' });
  await delay(20);
  assert.equal(reported, 1);
  writer.flush();
  assert.equal(reported, 1);
});