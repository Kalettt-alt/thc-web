import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { isMuroQuotaError, muroQuotaLabel, muroStoragePath, parseMuroQuota } from '../src/pages/Muro/muroQuota.js';

const serverNow = '2026-10-13T12:00:00.000Z';
const payload = (used, restart = '2026-10-15T12:00:00.000Z') => ({ limite: 3, usadas: used, disponibles: Math.max(0, 3 - used), reinicio: restart, ahora: serverNow });

test('Muro quota uses the server clock despite an incorrect local clock', () => {
  const localClock = Date.parse('2001-01-01T00:00:00Z');
  const quota = parseMuroQuota(payload(2), localClock);
  assert.equal(quota.available, 1);
  assert.equal(quota.refreshAt - localClock, 2 * 24 * 60 * 60 * 1000);
  assert.equal(muroQuotaLabel(quota), '1 foto disponible · máximo 3 por semana');
});

test('Muro quota accepts grandfathered counts above three without negative free slots', () => {
  const quota = parseMuroQuota(payload(7));
  assert.equal(quota.available, 0);
  assert.equal(quota.used, 7);
  assert.equal(parseMuroQuota(payload(0, null)).refreshAt, null);
});

test('Muro quota fails closed for missing RPC or inconsistent counts', () => {
  for (const invalid of [null, {}, { ...payload(2), disponibles: 3 }, { ...payload(1), ahora: 'invalid' }, { ...payload(1), reinicio: 'invalid' }, { ...payload(1), usadas: -1 }]) {
    assert.throws(() => parseMuroQuota(invalid));
  }
  assert.equal(isMuroQuotaError({ message: 'THC_MURO_WEEKLY_LIMIT', code: 'P0001' }), true);
  assert.equal(isMuroQuotaError({ message: 'Connection failed' }), false);
});

test('Muro delete can clean only the current users file in the configured Storage origin', () => {
  const user = '11111111-1111-4111-8111-111111111111';
  const prefix = 'https://example.supabase.co/storage/v1/object/public/muro_media/';
  const path = `${user}_33333333-3333-4333-8333-333333333333.jpg`;
  assert.equal(muroStoragePath(prefix + path, user, prefix + '_'), path);
  assert.equal(muroStoragePath(prefix + path.replace(user, 'other'), user, prefix + '_'), null);
  assert.equal(muroStoragePath(prefix + path + '/other', user, prefix + '_'), null);
  assert.equal(muroStoragePath('https://other.example/' + path, user, prefix + '_'), null);
});

test('Muro SQL copy/paste file mirrors the isolated migration', async () => {
  const sql = await readFile(new URL('../supabase/muro_weekly_quota.sql', import.meta.url), 'utf8');
  const mirror = await readFile(new URL('../ComandosSQL_LimiteMuro.txt', import.meta.url), 'utf8');
  assert.equal(mirror, sql);
});
