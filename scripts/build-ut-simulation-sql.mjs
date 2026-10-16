import { readFile, writeFile } from 'node:fs/promises';

const basePath = new URL('../supabase/ut_online_matches.sql', import.meta.url);
const patchPath = new URL('../supabase/ut_simulation_v2.sql', import.meta.url);
const thirdPath = new URL('../supabase/ut_simulation_v3.sql', import.meta.url);
const fourthPath = new URL('../supabase/ut_live_match_v4.sql', import.meta.url);
const marker = '-- BEGIN UT SIMULATION V2';
const base = (await readFile(basePath, 'utf8')).replace(/\r\n/g, '\n').split(marker)[0].replace(/\bcommit;\s*$/i, '').trimEnd();
const patch = (await readFile(patchPath, 'utf8')).replace(/\r\n/g, '\n');
const body = patch.replace(/\bbegin;/i, '').replace(/\bcommit;\s*$/i, '').trim();
const thirdPatch = (await readFile(thirdPath, 'utf8')).replace(/\r\n/g, '\n');
const thirdBody = thirdPatch.replace(/\bbegin;/i, '').replace(/\bcommit;\s*$/i, '').trim();
const fourthPatch = (await readFile(fourthPath,'utf8')).replace(/\r\n/g,'\n');
const fourthBody = fourthPatch.replace(/\bbegin;/i,'').replace(/\bcommit;\s*$/i,'').trim();
const combined = `${base}\n\n${marker}\n${body}\n\n-- BEGIN UT SIMULATION V3\n${thirdBody}\n\n-- BEGIN UT SIMULATION V4\n${fourthBody}\ncommit;\n`;
const onlinePath = new URL('../ComandosSQL_OnlineUT.txt', import.meta.url);
const updatePath = new URL('../ComandosSQL_UTSimulacion.txt', import.meta.url);
const thirdOutput = new URL('../ComandosSQL_UTPartidos2Min.txt', import.meta.url);
if (process.argv.includes('--check')) {
  if ((await readFile(basePath, 'utf8')).replace(/\r\n/g, '\n') !== combined || (await readFile(onlinePath, 'utf8')).replace(/\r\n/g, '\n') !== combined || (await readFile(updatePath, 'utf8')).replace(/\r\n/g, '\n') !== patch || (await readFile(thirdOutput, 'utf8')).replace(/\r\n/g, '\n') !== thirdPatch) throw new Error('Los SQL de simulación no coinciden con su fuente.');
  console.log('SQL completo, actualizaciones v2/v3/v4 y copias TXT coinciden.');
} else {
  await writeFile(basePath, combined, 'utf8');
  await writeFile(onlinePath, combined, 'utf8');
  await writeFile(updatePath, patch, 'utf8');
  await writeFile(thirdOutput, thirdPatch, 'utf8');
  console.log('SQL Online v4 y actualizaciones generados.');
}
