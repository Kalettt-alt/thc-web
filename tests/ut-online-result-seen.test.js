import assert from 'node:assert/strict';
import test from 'node:test';
import { dismissOnlineMatch, readDismissedOnlineMatchId } from '../src/pages/UltimateTeam/onlineResultSeenUT.js';

const owner = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
const matchId = '33333333-3333-4333-8333-333333333333';

test('solo el resumen cerrado se recuerda por usuario y se guarda únicamente su ID', () => {
  const entries = new Map();
  const storage = { getItem: key => entries.get(key) || null, setItem: (key, value) => entries.set(key, value) };
  assert.equal(readDismissedOnlineMatchId(storage, owner), null);
  assert.equal(dismissOnlineMatch(storage, owner, matchId), true);
  assert.equal(readDismissedOnlineMatchId(storage, owner), matchId);
  assert.equal(readDismissedOnlineMatchId(storage, other), null);
  assert.deepEqual([...entries.values()], [matchId]);
  assert.equal(dismissOnlineMatch(storage, null, matchId), false);
  assert.equal(dismissOnlineMatch(storage, owner, '<script>'), false);
  assert.equal(entries.size, 1);
});

test('storage bloqueado o un ID corrupto no ocultan ni bloquean resultados', () => {
  const unavailable = { getItem: () => { throw new Error('Blocked'); }, setItem: () => { throw new Error('Blocked'); } };
  assert.equal(readDismissedOnlineMatchId(unavailable, owner), null);
  assert.equal(dismissOnlineMatch(unavailable, owner, matchId), false);
  assert.equal(readDismissedOnlineMatchId({ getItem: () => 'corrupt' }, owner), null);
  assert.equal(readDismissedOnlineMatchId(null, owner), null);
});
