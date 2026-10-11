import test from 'node:test';
import assert from 'node:assert/strict';
import { createHandler, isValidPng } from '../supabase/functions/compartir-tierlist/handler.js';

const config = { supabaseUrl: 'https://example.supabase.co', anonKey: 'test-public-key', webhook: 'https://discord.com/api/webhooks/123/test-only', allowedOrigins: 'http://localhost:5173' };
const request = (body, origin = 'http://localhost:5173', authorization = 'Bearer test.jwt.token') => new Request('https://example.supabase.co/functions/v1/compartir-tierlist', { method: 'POST', headers: { origin, authorization }, body });
const pngForm = () => {
  const form = new FormData();
  form.append('file', new File([Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64')], 'tier.png', { type: 'image/png' }));
  return form;
};

test('rechaza origen o sesión ausente sin contactar Discord', async () => {
  const handler = createHandler({ ...config, fetchImpl: () => { throw new Error('No debe haber llamadas'); } });
  assert.equal((await handler(request(pngForm(), 'https://untrusted.example'))).status, 403);
  assert.equal((await handler(request(pngForm(), undefined, ''))).status, 401);
});

test('valida auth y cuota antes del envío y desactiva menciones', async () => {
  const calls = [];
  const handler = createHandler({ ...config, fetchImpl: async (url, options) => {
    calls.push(url);
    if (url.endsWith('/user')) return Response.json({ id: 'test-user', user_metadata: { preferred_username: '@everyone' } });
    if (url.includes('/rpc/')) return Response.json(true);
    const payload = JSON.parse(options.body.get('payload_json'));
    assert.deepEqual(payload.allowed_mentions.parse, []);
    assert.equal(payload.content.includes('@everyone'), false);
    return new Response(null, { status: 204 });
  } });
  assert.equal((await handler(request(pngForm()))).status, 200);
  assert.equal(calls.length, 3);
});

test('cuota agotada y PNG falsificado nunca se envían al webhook', async () => {
  let sent = false;
  const handler = createHandler({ ...config, fetchImpl: async url => {
    if (url.endsWith('/user')) return Response.json({ id: 'test-user' });
    if (url.includes('/rpc/')) return Response.json(false);
    sent = true;
    return new Response(null, { status: 204 });
  } });
  assert.equal((await handler(request(pngForm()))).status, 429);
  const fake = new FormData();
  fake.append('file', new File(['<svg onload="alert(1)">'], 'fake.png', { type: 'image/png' }));
  assert.equal((await handler(request(fake))).status, 400);
  assert.equal(sent, false);
});


test('cancela streams lentos sin consumir cuota ni contactar Discord', async () => {
  let cancelled = false;
  let calls = 0;
  const handler = createHandler({ ...config, bodyReadTimeoutMs: 10, fetchImpl: async url => {
    calls++;
    assert.equal(url.endsWith('/user'), true);
    return Response.json({ id: 'test-user' });
  } });
  const body = new ReadableStream({ cancel() { cancelled = true; } });
  const upload = new Request('https://example.supabase.co/functions/v1/compartir-tierlist', {
    method: 'POST', body, duplex: 'half', headers: { origin: 'http://localhost:5173', authorization: 'Bearer test.jwt.token', 'Content-Type': 'multipart/form-data; boundary=test' }
  });
  assert.equal((await handler(upload)).status, 408);
  assert.equal(cancelled, true);
  assert.equal(calls, 1);
});

test('preflight funciona aunque falte webhook y diagnóstico no consume cuota ni envía', async () => {
  const missing = createHandler({ ...config, webhook: '', fetchImpl: () => assert.fail('Sin llamadas') });
  const options = new Request('https://example.supabase.co/functions/v1/compartir-tierlist', { method: 'OPTIONS', headers: { Origin: 'http://localhost:5173' } });
  assert.equal((await missing(options)).status, 204);
  const notReady = await missing(new Request(options.url, { headers: { Origin: 'http://localhost:5173', Authorization: 'Bearer test.jwt.token' } }));
  assert.equal((await notReady.json()).code, 'SERVER_NOT_CONFIGURED');
  let calls = 0;
  const ready = createHandler({ ...config, fetchImpl: async url => {
    calls++;
    assert.equal(url.endsWith('/user'), true);
    return Response.json({ id: 'test-user' });
  } });
  const response = await ready(new Request(options.url, { headers: { Origin: 'http://localhost:5173', Authorization: 'Bearer test.jwt.token' } }));
  assert.equal((await response.json()).ready, true);
  assert.equal(calls, 1);
});

test('distingue cuota no configurada y canal retirado sin revelar información privada', async () => {
  const calls = [];
  const noQuota = createHandler({ ...config, fetchImpl: async url => {
    calls.push(url);
    return url.endsWith('/user') ? Response.json({ id: 'test-user' }) : Response.json({ code: 'PGRST202', message: 'Private internal details' }, { status: 404 });
  } });
  const quotaResponse = await noQuota(request(pngForm()));
  assert.equal((await quotaResponse.json()).code, 'QUOTA_NOT_CONFIGURED');
  assert.equal(calls.some(url => url.includes('discord.com')), false);
  const gone = createHandler({ ...config, fetchImpl: async (url, options) => {
    if (url.endsWith('/user')) return Response.json({ id: 'test-user' });
    if (url.includes('/rpc/')) return Response.json(true);
    assert.equal(options.redirect, 'error');
    assert.equal(new URL(url).searchParams.get('wait'), 'true');
    return new Response(null, { status: 404 });
  } });
  const goneResponse = await gone(request(pngForm()));
  const body = await goneResponse.json();
  assert.equal(body.code, 'WEBHOOK_UNAVAILABLE');
  assert.equal(JSON.stringify(body).includes('test-only'), false);
});

test('un encabezado PNG aislado, dimensiones enormes y datos después de IEND son inválidos', async () => {
  const valid = new Uint8Array(await pngForm().get('file').arrayBuffer());
  assert.equal(isValidPng(valid), true);
  assert.equal(isValidPng(valid.slice(0, 8)), false);
  const oversized = valid.slice();
  new DataView(oversized.buffer).setUint32(16, 100000);
  assert.equal(isValidPng(oversized), false);
  const extra = new Uint8Array(valid.byteLength + 1);
  extra.set(valid);
  assert.equal(isValidPng(extra), false);
});
