import test from 'node:test';
import assert from 'node:assert/strict';
import { beginPackRequest, readPendingPack, finishPackRequest, validatePackResult, packErrorMessage } from '../src/utils/albumPack.js';

const user = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
const request = '33333333-3333-4333-8333-333333333333';
const next = '44444444-4444-4444-8444-444444444444';
function storage() {
  const map = new Map();
  return { getItem: key => map.get(key) ?? null, setItem: (key, value) => map.set(key, value), removeItem: key => map.delete(key) };
}
const receipt = () => ({ success: true, cartas: ['U_001', 'U_001'], detalles: [
  { id: 'U_001', isNew: true, cantidad: 1 }, { id: 'U_001', isNew: false, cantidad: 2 },
], sobres_restantes: 0 });

test('opening retry after a lost response reuses the persisted operation, even after remount', () => {
  const store = storage();
  assert.equal(beginPackRequest(store, user, () => request), request);
  assert.equal(beginPackRequest(store, user, () => next), request);
  assert.equal(readPendingPack(store, user), request);
  assert.equal(beginPackRequest(store, other, () => next), next);
});
test('acknowledgement cannot clear another tab’s pending operation', () => {
  const store = storage();
  beginPackRequest(store, user, () => request);
  finishPackRequest(store, user, next);
  assert.equal(readPendingPack(store, user), request);
  finishPackRequest(store, user, request);
  assert.equal(readPendingPack(store, user), null);
  assert.equal(beginPackRequest(store, user, () => next), next);
});
test('storage failure prevents an unrepeatable mutation', () => {
  assert.throws(() => beginPackRequest({ ...storage(), setItem: () => {} }, user, () => request), /ALBUM_STORAGE_UNAVAILABLE/);
  assert.throws(() => beginPackRequest(storage(), 'anonymous', () => request), /ALBUM_AUTH_REQUIRED/);
});
test('server receipt distinguishes a new card from its duplicate in the same pack', () => {
  const result = validatePackResult(receipt());
  assert.deepEqual(result.cards.map(card => card.isNew), [true, false]);
  assert.equal(result.remaining, 0);
});
test('invalid or incomplete success cannot acknowledge a potentially committed request', () => {
  for (const value of [null, { ...receipt(), success: false }, { ...receipt(), sobres_restantes: -1 },
    { ...receipt(), cartas: ['<script>'] }, { ...receipt(), detalles: [] },
    { ...receipt(), detalles: [{ id: 'U_001', isNew: 'true', cantidad: 1 }, receipt().detalles[1]] }]) {
    assert.throws(() => validatePackResult(value), /ALBUM_INVALID_RECEIPT/);
  }
});
test('error feedback does not expose database details or internals', () => {
  assert.match(packErrorMessage({ message: 'ALBUM_PACK_SIZE_UNCONFIGURED' }), /configuración/);
  assert.match(packErrorMessage({ code: 'PGRST202' }), /actualización/);
  assert.match(packErrorMessage({ name: 'SecurityError', message: 'Access is denied' }), /almacenamiento/);
  assert.match(packErrorMessage({ code: 'P0001', details: 'ALBUM_PACK_SIZE_UNCONFIGURED' }), /configuración/);
  assert.doesNotMatch(packErrorMessage({ message: 'secret connection string leaked' }), /secret|connection/);
});
