import test from 'node:test';
import assert from 'node:assert/strict';
import { validateDiscordWebhook, sendTierListToWebhook } from '../src/pages/TierList/directDiscordShare.js';

const endpoint = `https://discord.com/api/webhooks/123456789012345678/${'a'.repeat(68)}`;
const png = new Blob(['fake-local-test-image'], { type: 'image/png' });
test('direct webhook accepts official routes, waits for confirmation and supports a thread', () => {
  assert.equal(validateDiscordWebhook(` ${endpoint} `), `${endpoint}?wait=true`);
  assert.equal(validateDiscordWebhook(`${endpoint.replace('/api/', '/api/v10/')}?thread_id=123456789012345678&wait=false`), `${endpoint.replace('/api/', '/api/v10/')}?thread_id=123456789012345678&wait=true`);
});
test('direct webhook rejects alternate hosts, credentials, schemes and paths before networking', async () => {
  for (const url of [endpoint.replace('https:', 'http:'), endpoint.replace('discord.com', 'discord.com.evil.test'), endpoint.replace('discord.com', 'evil.test@discord.com'), endpoint.replace('discord.com', 'discord.com:444'), `${endpoint}/messages/123`, `${endpoint}#secret`, `${endpoint}?thread_id=other`, `${endpoint}?thread_id=123456789012345678&thread_id=123456789012345679`, `${endpoint}?url=https://other.test`, endpoint.replace('/webhooks/', '/%77ebhooks/')]) {
    await assert.rejects(sendTierListToWebhook(url, png, { fetchImpl: () => assert.fail('must not fetch') }), { code: 'INVALID_WEBHOOK' });
  }
});
test('direct upload sends only image and mention-safe payload, omits credentials and refuses redirects', async () => {
  let calls = 0;
  const result = await sendTierListToWebhook(endpoint, png, { fetchImpl: async (url, options) => {
    calls++;
    assert.equal(url, `${endpoint}?wait=true`);
    assert.equal(options.method, 'POST'); assert.equal(options.credentials, 'omit'); assert.equal(options.redirect, 'error'); assert.equal(options.referrerPolicy, 'no-referrer');
    assert.equal(options.body.get('files[0]').name, 'THC_TierList.png');
    assert.deepEqual(JSON.parse(options.body.get('payload_json')).allowed_mentions, { parse: [] });
    assert.equal(options.headers, undefined);
    return Response.json({ id: '123456789012345678' });
  } });
  assert.equal(calls, 1); assert.deepEqual(result, { success: true });
});
test('invalid or oversized captures never reach Discord', async () => {
  for (const [image, code] of [[null, 'INVALID_IMAGE'], [new Blob(['jpeg'], { type: 'image/jpeg' }), 'INVALID_IMAGE'], [new Blob([new Uint8Array(8 * 1024 * 1024 + 1)], { type: 'image/png' }), 'IMAGE_TOO_LARGE']]) {
    await assert.rejects(sendTierListToWebhook(endpoint, image, { fetchImpl: () => assert.fail('must not fetch') }), { code });
  }
});
test('API rejection is actionable without exposing endpoint or response secrets', async () => {
  for (const [status, code] of [[400, 'INVALID_CHANNEL'], [403, 'WEBHOOK_UNAVAILABLE'], [404, 'WEBHOOK_UNAVAILABLE'], [429, 'RATE_LIMITED'], [500, 'DISCORD_UNAVAILABLE']]) {
    let calls = 0;
    await assert.rejects(sendTierListToWebhook(endpoint, png, { fetchImpl: async () => { calls++; return Response.json({ message: endpoint }, { status }); } }), error => error.code === code && !error.message.includes('aaaa'));
    assert.equal(calls, 1);
  }
});
test('unconfirmed responses and network failure never claim successful delivery or automatically retry', async () => {
  await assert.rejects(sendTierListToWebhook(endpoint, png, { fetchImpl: async () => new Response(null, { status: 204 }) }), { code: 'NETWORK_ERROR' });
  await assert.rejects(sendTierListToWebhook(endpoint, png, { fetchImpl: async () => { throw new Error(endpoint); } }), error => error.code === 'NETWORK_ERROR' && !error.message.includes(endpoint));
});
test('timeout cancels only this request and asks to check channel before retry', async () => {
  await assert.rejects(sendTierListToWebhook(endpoint, png, { timeoutMs: 5, fetchImpl: (_url, options) => new Promise((_resolve, reject) => options.signal.addEventListener('abort', () => reject(new Error('aborted')))) }), { code: 'TIMEOUT' });
});
