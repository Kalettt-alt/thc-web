import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { readTierListServerEnv } from '../server/tierListVitePlugin.js';

const values = {};
for (const filename of ['.env', '.env.local']) {
  try {
    const contents = await readFile(new URL(`../${filename}`, import.meta.url), 'utf8');
    for (const line of contents.split(/\r?\n/)) {
      const match = line.match(/^\s*(?:export\s+)?([A-Z][A-Z\d_]*)\s*=\s*(.*?)\s*$/);
      if (!match) continue;
      const raw = match[2];
      values[match[1]] = /^(['"]).*\1$/.test(raw) ? raw.slice(1, -1) : raw.replace(/\s+#.*$/, '');
    }
  } catch (error) {
    if (error.code !== 'ENOENT') console.log(`${filename}: no se pudo leer`);
  }
}
try {
  Object.assign(values, readTierListServerEnv(new URL('../.env.server', import.meta.url)));
} catch {
  console.log('.env.server: no se pudo leer la configuración privada');
}
console.log(`Transporte de envío: ${values.VITE_TIERLIST_TRANSPORT || 'vercel (servidor local o /api de Vercel)'}`);
for (const name of ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY', 'SUPABASE_ACCESS_TOKEN', 'DISCORD_TIERLIST_WEBHOOK', 'THC_ALLOWED_ORIGINS']) {
  if (process.env[name]) values[name] = process.env[name];
  console.log(`${name}: ${values[name] ? 'presente' : 'ausente'}`);
}
const key = values.VITE_SUPABASE_ANON_KEY;
console.log(`Clave pública: ${key?.startsWith('sb_publishable_') ? 'publishable' : key?.split('.').length === 3 ? 'JWT heredada' : 'no identificada'}`);
const cli = spawnSync(process.platform === 'win32' ? 'where.exe' : 'which', ['supabase'], { encoding: 'utf8', windowsHide: true });
console.log(`CLI Supabase: ${cli.status === 0 ? 'disponible' : 'no instalado en PATH'}`);

if (process.argv.includes('--remote')) {
  let target;
  try {
    target = new URL(values.VITE_SUPABASE_URL);
    if (target.protocol !== 'https:' || !/^[a-z\d-]+\.supabase\.co$/i.test(target.hostname) || target.username || target.password || target.port) throw new Error();
    if (!key || key.startsWith('sb_secret_')) throw new Error();
    if (key.split('.').length === 3) {
      const claims = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString());
      if (claims.role !== 'anon') throw new Error();
    } else if (!key.startsWith('sb_publishable_')) throw new Error();
  } catch {
    console.log('Diagnóstico remoto: falta una URL de proyecto y clave pública válidas.');
    process.exitCode = 1;
  }
  if (!process.exitCode) {
    try {
      const response = await fetch(new URL('/functions/v1/compartir-tierlist', target), {
        method: 'OPTIONS', headers: { apikey: key, Origin: 'http://localhost:5173', 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'authorization,apikey,content-type' }, signal: AbortSignal.timeout(15000),
      });
      const payload = await response.json().catch(() => ({}));
      const code = /^[A-Z][A-Z_]{1,60}$/.test(payload.code || '') ? payload.code : '';
      const label = response.status === 404 ? 'FUNCTION_NOT_DEPLOYED' : response.status === 204 ? 'PREFLIGHT_OK' : code || `HTTP_${response.status}`;
      console.log(`Diagnóstico remoto (sin enviar ni consumir cuota): ${label}`);
      console.log(`Origen localhost habilitado: ${response.headers.get('access-control-allow-origin') === 'http://localhost:5173' ? 'sí' : 'no'}`);
    } catch {
      console.log('Diagnóstico remoto: no se pudo conectar al proyecto. No se enviaron imágenes.');
      process.exitCode = 1;
    }
  }
}
