import { readFile, writeFile } from 'node:fs/promises';

const appearancePath = new URL('../supabase/profile_appearance_guard.sql', import.meta.url);
const socialPath = new URL('../supabase/profile_social_core.sql', import.meta.url);
const appearance = (await readFile(appearancePath, 'utf8')).replace(/\r\n/g, '\n');
const social = (await readFile(socialPath, 'utf8')).replace(/\r\n/g, '\n');
const body = source => source.replace(/^begin;\s*$/m, '').replace(/^commit;\s*$/m, '').trim();
const guard = body(appearance).split('\nselect t.tgname,')[0].trim();
const output = `-- THC · Perfiles y amigos · 12 de octubre de 2026.
-- Copia este archivo COMPLETO en el SQL Editor de Supabase y ejecútalo como postgres.
-- Reemplaza apariencia v1/v2/v3 y agrega los RPC de amistades; puede repetirse.
-- VIP >= 10: Original, Agua, Pixel Art, Club, Editorial, Aurora y Terminal.
-- VIP Trueno >= 15: todos los anteriores más Vinilo, Eclipse, Prisma, Órbita, Circuito, Lienzo y Cromo.
-- Estadio se retira -> Original. No modifica ningún ID, nombre de Discord, apodo, rol, saldo ni inventario.
-- Las filas de amistad duplicadas quedan archivadas; las notificaciones conservan sus referencias.
-- Publica también los archivos frontend actualizados. No repitas luego scripts antiguos de amigos/perfiles.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';
alter table public.perfiles enable row level security;

${guard}

${body(social)}

commit;
`;
const paths = ['../supabase/profile_social.sql', '../ComandosSQL_PerfilesAmigos.txt'];
if (process.argv.includes('--check')) {
  for (const path of paths) {
    if (await readFile(new URL(path, import.meta.url), 'utf8') !== output) throw new Error(`${path} está desactualizado`);
  }
  for (const path of ['../ComandosSQL_PerfilesVIP.txt', '../ComandosSQL_Perfiles.txt']) {
    if ((await readFile(new URL(path, import.meta.url), 'utf8')).replace(/\r\n/g, '\n') !== appearance) throw new Error(`${path} está desactualizado`);
  }
  console.log('SQL de perfiles/amigos y copias coinciden con sus fuentes.');
} else {
  for (const path of paths) await writeFile(new URL(path, import.meta.url), output, 'utf8');
  for (const path of ['../ComandosSQL_PerfilesVIP.txt', '../ComandosSQL_Perfiles.txt']) await writeFile(new URL(path, import.meta.url), appearance, 'utf8');
  console.log('ComandosSQL_PerfilesAmigos.txt generado; guard v3 sincronizado.');
}
