import { readFile, writeFile } from 'node:fs/promises';

const sources = [
  ['Club y permisos', 'ut_club_policies.sql'],
  ['Cartas, sobres y guardado de plantilla', 'ultimate_team_cartas.sql'],
  ['Cinco diseños de cartas', 'ultimate_team_card_designs.sql'],
  ['Playlist y borrado de canciones', 'playlist_ut_policies.sql'],
  ['Online, posiciones y stamina', 'ut_online_matches.sql'],
  ['Afinidad entre mediocampistas', 'ut_position_affinity_v3.sql'],
  ['Sobre inicial: 23 cartas de un catálogo de 67', 'ut_starter_pool_v2.sql'],
];
const sections = [];
for (const [title, file] of sources) {
  const source = (await readFile(new URL(`../supabase/${file}`, import.meta.url), 'utf8')).replace(/\r\n/g, '\n');
  if (!/^\s*(?:--[^\n]*\n)*\s*begin;/i.test(source) || !/\bcommit;\s*$/i.test(source)) throw new Error(`${file} debe tener una transacción completa.`);
  const body = source.replace(/\bbegin;/i, '').replace(/\bcommit;\s*$/i, '').trim();
  sections.push(`-- ${title}\n-- Fuente: supabase/${file}\n${body}`);
}
const output = `-- ACTUALIZACIÓN ULTIMATE TEAM · 15 OCTUBRE 2026\n-- Copia y ejecuta TODO este archivo en Supabase > SQL Editor > New query.\n-- Incluye UT, cartas, Música, Online v4 y sobre inicial con RLS.\n-- Partidos nuevos: 60 s por mitad + 4–8 s para cerrar la jugada; descanso de 12 s.\n-- Veinte jugadas distintas, cambios y tácticas; los encuentros antiguos conservan su reloj.\n-- Catálogo inicial: 67 jugadores; entrega única de 23 distintos desde el tutorial.\n-- Conserva saldos, plantillas y cartas iniciales existentes; no activa cartas de ejemplo.\n-- Una sola transacción: si falla una parte, no se aplica ninguna.\n-- No hace falta ejecutar por separado los archivos de UT incluidos aquí.\nbegin;\n\n${sections.join('\n\n')}\n\ncommit;\n`;
const destination = new URL('../ComandosSQL_ActualizacionUT.txt', import.meta.url);
if (process.argv.includes('--check')) {
  if ((await readFile(destination, 'utf8')).replace(/\r\n/g, '\n') !== output) throw new Error('El archivo combinado no coincide con sus fuentes. Regénéralo.');
  console.log(`ComandosSQL_ActualizacionUT.txt coincide con sus ${sources.length} fuentes.`);
} else {
  await writeFile(destination, output, 'utf8');
  console.log('ComandosSQL_ActualizacionUT.txt creado.');
}
