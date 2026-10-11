import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Readable } from 'node:stream';
import { createHandler } from '../supabase/functions/compartir-tierlist/handler.js';
import { getTierListBackendConfig } from './tierListConfig.js';

export function readTierListServerEnv(filename) {
  let contents;
  try { contents = readFileSync(filename, 'utf8'); }
  catch (error) { if (error.code === 'ENOENT') return {}; throw new Error('No se pudo leer la configuración privada del envío.', { cause: error }); }
  const values = {};
  for (const line of contents.split(/\r?\n/)) {
    const match = line.match(/^\s*(DISCORD_TIERLIST_WEBHOOK|THC_ALLOWED_ORIGINS)\s*=\s*(.*?)\s*$/);
    if (!match) continue;
    const raw = match[2];
    values[match[1]] = /^(['"]).*\1$/.test(raw) ? raw.slice(1, -1) : raw.replace(/\s+#.*$/, '');
  }
  return values;
}

export function tierListVitePlugin(publicEnv = {}, { fetchImpl } = {}) {
  return {
    name: 'thc-tierlist-server',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url?.split('?')[0] !== '/api/compartir-tierlist') return next();
        try {
          const privateEnv = readTierListServerEnv(resolve(server.config.root, '.env.server'));
          const env = { ...publicEnv, ...process.env, ...privateEnv };
          const address = server.httpServer?.address();
          const port = typeof address === 'object' && address ? address.port : server.config.server.port || 5173;
          if (!env.THC_ALLOWED_ORIGINS) env.THC_ALLOWED_ORIGINS = `http://localhost:${port},http://127.0.0.1:${port}`;
          const headers = new Headers();
          for (const [name, value] of Object.entries(req.headers)) if (value !== undefined) headers.set(name, Array.isArray(value) ? value.join(',') : value);
          const request = new Request(`http://localhost:${port}${req.url}`, {
            method: req.method, headers,
            ...(['GET', 'HEAD'].includes(req.method) ? {} : { body: Readable.toWeb(req), duplex: 'half' }),
          });
          const response = await createHandler({ ...getTierListBackendConfig(env), ...(fetchImpl ? { fetchImpl } : {}) })(request);
          res.statusCode = response.status;
          response.headers.forEach((value, name) => res.setHeader(name, value));
          res.end(Buffer.from(await response.arrayBuffer()));
        } catch {
          res.statusCode = 503;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: false, code: 'SERVER_NOT_CONFIGURED', message: 'El envío a Discord está pendiente de configuración.' }));
        }
      });
    },
  };
}
