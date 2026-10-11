import { readFile, writeFile } from 'node:fs/promises';

const sources = [
  ['Club y permisos', 'ut_club_policies.sql'],
  ['Cartas, sobres y guardado de plantilla', 'ultimate_team_cartas.sql'],
  ['Cinco diseños de cartas', 'ultimate_team_card_designs.sql'],
  ['Playlist y borrado de canciones', 'playlist_ut_policies.sql'],
  ['Online, posiciones y stamina', 'ut_online_matches.sql'],
];
const sections = [];
for (const [title, file] of sources) {
  const source = (await readFile(new URL(`../supabase/${file}`, import.meta.url), 'utf8')).replace(/\r\n/g, '\n');
  if (!/^\s*(?:--[^\n]*\n)*\s*begin;/i.test(source) || !/\bcommit;\s*$/i.test(source)) throw new Error(`${file} debe tener una transacción completa.`);
  const body = source.replace(/\bbegin;/i, '').replace(/\bcommit;\s*$/i, '').trim();
  sections.push(`-- ${title}\n-- Fuente: supabase/${file}\n${body}`);
}
const output = `-- ACTUALIZACIÓN ULTIMATE TEAM · 10 OCTUBRE 2026\n-- Copia y ejecuta TODO este archivo en Supabase > SQL Editor > New query.\n-- Incluye los requisitos anteriores de UT, las cartas, Música y Online con RLS.\n-- No modifica saldos existentes ni reparte sobres ni activa cartas de ejemplo.\n-- Una sola transacción: si falla una parte, no se aplica ninguna.\n-- No hace falta ejecutar por separado los archivos de UT incluidos aquí.\nbegin;\n\n${sections.join('\n\n')}\n\ncommit;\n`;
const destination = new URL('../ComandosSQL_ActualizacionUT.txt', import.meta.url);
if (process.argv.includes('--check')) {
  if ((await readFile(destination, 'utf8')).replace(/\r\n/g, '\n') !== output) throw new Error('El archivo combinado no coincide con sus fuentes. Regénéralo.');
  console.log('ComandosSQL_ActualizacionUT.txt coincide con las cinco migraciones.');
} else {
  await writeFile(destination, output, 'utf8');
  console.log('ComandosSQL_ActualizacionUT.txt creado.');
}
