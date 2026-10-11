import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readTierListServerEnv, tierListVitePlugin } from '../server/tierListVitePlugin.js';

test('archivo privado solo admite nombres de servidor y no acepta hooks con prefijo VITE', t => {
  const directory = mkdtempSync(join(tmpdir(), 'thc-discord-config-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const filename = join(directory, '.env.server');
  writeFileSync(filename, 'DISCORD_TIERLIST_WEBHOOK="private-test"\nTHC_ALLOWED_ORIGINS=http://localhost:5173\nVITE_DISCORD_WEBHOOK=unsafe\nSUPABASE_SERVICE_ROLE_KEY=unsafe\n');
  assert.deepEqual(readTierListServerEnv(filename), { DISCORD_TIERLIST_WEBHOOK: 'private-test', THC_ALLOWED_ORIGINS: 'http://localhost:5173' });
  assert.deepEqual(readTierListServerEnv(join(directory, 'missing')), {});
});

test('servidor local adapta multipart sin perder el PNG, valida Auth y evita enviar en GET/OPTIONS', async t => {
  const directory = mkdtempSync(join(tmpdir(), 'thc-discord-server-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  writeFileSync(join(directory, '.env.server'), 'DISCORD_TIERLIST_WEBHOOK=https://discord.com/api/webhooks/123/test-only\nTHC_ALLOWED_ORIGINS=\n');
  let middleware;
  let sent = 0;
  let quotas = 0;
  const server = createServer((req, res) => middleware(req, res, () => { res.statusCode = 404; res.end(); }));
  const plugin = tierListVitePlugin({ VITE_SUPABASE_URL: 'https://example.supabase.co', VITE_SUPABASE_ANON_KEY: 'public-test' }, {
    fetchImpl: async (url, options) => {
      if (url.endsWith('/user')) {
        assert.equal(options.headers.Authorization, 'Bearer current.user.token');
        return Response.json({ id: 'test-user' });
      }
      if (url.includes('/rpc/')) { quotas++; return Response.json(true); }
      const image = options.body.get('files[0]');
      assert.equal(image.name, 'THC_TierList.png');
      assert.equal(image.type, 'image/png');
      sent++;
      return new Response(null, { status: 204 });
    },
  });
  plugin.configureServer({ config: { root: directory, server: {} }, httpServer: server, middlewares: { use(value) { middleware = value; } } });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const url = `${origin}/api/compartir-tierlist`;
  const headers = { Origin: origin, Authorization: 'Bearer current.user.token' };
  assert.equal((await fetch(url, { method: 'OPTIONS', headers: { Origin: origin } })).status, 204);
  assert.equal((await (await fetch(url, { headers: { Authorization: headers.Authorization } })).json()).ready, true);
  assert.equal(sent, 0);
  assert.equal(quotas, 0);
  const body = new FormData();
  body.append('file', new File([Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64')], 'capture.png', { type: 'image/png' }));
  const response = await fetch(url, { method: 'POST', headers, body });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).success, true);
  assert.equal(sent, 1);
  assert.equal(quotas, 1);
  assert.equal((await fetch(url, { method: 'POST', headers: { ...headers, Origin: 'https://untrusted.example' }, body })).status, 403);
  assert.equal(sent, 1);
});
