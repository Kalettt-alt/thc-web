import test from 'node:test';
import assert from 'node:assert/strict';
import { validatePublicSupabaseConfig } from '../src/utils/supabaseConfig.js';

const key = role => `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({ role })).toString('base64url')}.test`;
test('permite clave anon y rechaza secretos del servidor en la compilación web', () => {
  assert.equal(validatePublicSupabaseConfig('https://example.supabase.co', key('anon')).key, key('anon'));
  for (const secret of [key('service_role'), key('supabase_admin'), 'sb_secret_test']) assert.throws(() => validatePublicSupabaseConfig('https://example.supabase.co', secret));
  assert.throws(() => validatePublicSupabaseConfig('', key('anon')));
  assert.throws(() => validatePublicSupabaseConfig('http://example.com', key('anon')));
  assert.equal(validatePublicSupabaseConfig('http://localhost:54321', key('anon')).url, 'http://localhost:54321');
});
