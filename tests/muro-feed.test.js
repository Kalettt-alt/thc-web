import test from 'node:test';
import assert from 'node:assert/strict';
import { muroFeedBeforeFilter, muroFeedCursor, readMuroPage, readMuroVotes } from '../src/pages/Muro/muroFeed.js';

const id = '11111111-1111-4111-8111-111111111111';
const createdAt = '2026-10-13T12:00:00.123456+00:00';

test('Muro history cursor preserves PostgreSQL microseconds and breaks equal dates by ID', () => {
  const cursor = muroFeedCursor({ id, creado_en: createdAt });
  assert.equal(cursor.createdAt, createdAt);
  assert.equal(muroFeedBeforeFilter(cursor), `creado_en.lt.${createdAt},and(creado_en.eq.${createdAt},id.lt.${id})`);
  assert.throws(() => muroFeedBeforeFilter({ id, createdAt: `${createdAt},autor_id.eq.other` }));
});

test('Muro history loads 170 visible tiles plus a cursor without a global photo limit', async () => {
  const rows = Array.from({ length: 171 }, () => ({ id, creado_en: createdAt }));
  const calls = [];
  const query = {
    select(...args) { calls.push(['select', ...args]); return this; },
    order(...args) { calls.push(['order', ...args]); return this; },
    limit(value) { calls.push(['limit', value]); return this; },
    or(value) { calls.push(['or', value]); return this; },
    then(resolve) { resolve({ data: rows, count: 2500, error: null }); },
  };
  const client = { from: () => query };
  const page = await readMuroPage(client);
  assert.equal(page.rows.length, 170);
  assert.equal(page.count, 2500);
  assert.equal(page.next.createdAt, createdAt);
  assert.deepEqual(calls.find(call => call[0] === 'limit'), ['limit', 171]);
  await readMuroPage(client, page.next);
  assert.match(calls.find(call => call[0] === 'or')[1], /id\.lt\./);
});

test('Muro vote totals read additional batches instead of stopping at Supabase default row limit', async () => {
  const votes = Array.from({ length: 1200 }, () => ({ publicacion_id: id, usuario_id: id, tipo: 1 }));
  const ranges = [];
  const query = {
    select() { return this; }, in() { return this; }, order() { return this; },
    range(start, end) { ranges.push([start, end]); return Promise.resolve({ data: votes.slice(start, end + 1), error: null }); },
  };
  assert.equal((await readMuroVotes({ from: () => query }, [id])).length, 1200);
  assert.deepEqual(ranges, [[0, 499], [500, 999], [1000, 1499]]);
});
