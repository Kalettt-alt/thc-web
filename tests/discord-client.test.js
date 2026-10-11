import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareTierListShare, shareTierListImage, getTierListError } from '../src/utils/shareTierList.js';
import { getTierListBackendConfig } from '../server/tierListConfig.js';

const now = Date.now();
const current = { access_token: 'fresh.user.token', expires_at: now / 1000 + 3600 };
const client = (session = current) => ({ auth: { getSession: async () => ({ data: { session } }), refreshSession: async () => ({ data: { session: current } }) }, functions: { invoke: () => assert.fail('No debe llamar Supabase Functions para el transporte local') } });
const png = new Blob(['test-png-client'], { type: 'image/png' });

test('diagnóstico usa JWT actual y no sube imagen; POST vuelve a comprobar sesión', async () => {
  const calls = [];
  const supabase = client({ access_token: 'expired.user.token', expires_at: now / 1000 - 10 });
  let refreshed = 0;
  supabase.auth.refreshSession = async () => { refreshed++; return { data: { session: current } }; };
  const settings = { now, fetchImpl: async (url, options) => {
    calls.push(options);
    assert.equal(url, '/api/compartir-tierlist');
    assert.equal(options.headers.Authorization, 'Bearer fresh.user.token');
    return Response.json(options.method === 'GET' ? { ready: true } : { success: true });
  } };
  await prepareTierListShare(supabase, settings);
  assert.equal(calls[0].body, undefined);
  supabase.auth.getSession = async () => ({ data: { session: current } });
  await shareTierListImage(supabase, png, settings);
  assert.equal(calls[1].body.get('file').name, 'THC_TierList.png');
  assert.equal(refreshed, 1);
});

test('sesión ausente, key pública en lugar de JWT e imagen grande no disparan envío', async () => {
  const settings = { fetchImpl: () => assert.fail('Sin llamadas') };
  await assert.rejects(prepareTierListShare(client(null), settings), error => error.code === 'SESSION_EXPIRED');
  await assert.rejects(prepareTierListShare(client({ access_token: 'sb_publishable_invalid' }), settings), error => error.code === 'SESSION_EXPIRED');
  await assert.rejects(shareTierListImage(client(), new Blob([new Uint8Array(4 * 1024 * 1024 + 1)], { type: 'image/png' }), settings), error => error.code === 'UPLOAD_TOO_LARGE');
});

test('errores mostrados distinguen publicación, cuota, sesión y configuración; nunca muestran el mensaje privado', async () => {
  for (const [status, code] of [[404, 'FUNCTION_NOT_DEPLOYED'], [401, 'SESSION_EXPIRED'], [429, 'RATE_LIMITED']]) {
    assert.equal((await getTierListError({ context: new Response('private', { status }) })).code, code);
  }
  const error = await getTierListError({ context: Response.json({ code: 'QUOTA_NOT_CONFIGURED', message: 'https://secret.example/token' }, { status: 503 }) });
  assert.equal(error.code, 'QUOTA_NOT_CONFIGURED');
  assert.equal(error.message.includes('secret.example'), false);
});

test('transporte Supabase envía explícitamente el JWT y conserva diagnóstico GET', async () => {
  const supabase = client();
  let invocation;
  supabase.functions.invoke = async (name, options) => {
    assert.equal(name, 'compartir-tierlist');
    invocation = options;
    return { data: { ready: true }, error: null };
  };
  await prepareTierListShare(supabase, { transport: 'supabase', now });
  assert.equal(invocation.method, 'GET');
  assert.equal(invocation.headers.Authorization, 'Bearer fresh.user.token');
});

test('Vercel permite solo nombres de dominio de sus variables y orígenes explícitos, sin confiar en Host', () => {
  const settings = getTierListBackendConfig({
    VERCEL_URL: 'demo-unique.vercel.app', VERCEL_BRANCH_URL: 'demo-branch.vercel.app', VERCEL_PROJECT_PRODUCTION_URL: 'demo.vercel.app',
    THC_ALLOWED_ORIGINS: 'https://thc.example', VITE_SUPABASE_URL: 'https://example.supabase.co', VITE_SUPABASE_ANON_KEY: 'public',
    DISCORD_TIERLIST_WEBHOOK: 'private', HOST: 'attacker.example',
  });
  assert.equal(settings.webhook, 'private');
  assert.deepEqual(new Set(settings.allowedOrigins.split(',')), new Set(['https://thc.example', 'https://demo-unique.vercel.app', 'https://demo-branch.vercel.app', 'https://demo.vercel.app']));
  assert.equal(getTierListBackendConfig({ VERCEL_URL: 'fake.example/path', HOST: 'attacker.example' }).allowedOrigins, '');
});
