import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { playerPositionPenalty } from '../src/pages/UltimateTeam/squadUT.js';

const runtime = process.argv[2] || '.qa/sql-muro-runtime/node_modules/@electric-sql/pglite/dist/index.js';
const { PGlite } = await import(pathToFileURL(resolve(runtime)).href);
const db = new PGlite();
const online = await readFile(new URL('../supabase/ut_online_matches.sql', import.meta.url), 'utf8');
const sql = await readFile(new URL('../supabase/ut_position_affinity_v3.sql', import.meta.url), 'utf8');
const mirror = await readFile(new URL('../ComandosSQL_UTAfinidadPosiciones.txt', import.meta.url), 'utf8');
const original = online.match(/create or replace function thc_private\.ut_online_position_penalty\(p_player jsonb,p_target text\)[\s\S]*?end \$fn\$;/)?.[0];
assert.ok(original);
const positions = ['GK', 'CB', 'LB', 'RB', 'LWB', 'RWB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'CF', 'ST'];
const penalty = async (player, target) => (await db.query('select thc_private.ut_online_position_penalty($1::jsonb,$2) as result', [JSON.stringify(player), target])).rows[0].result;
let checks = 0;
const check = async (name, fn) => { await fn(); checks++; console.log(`OK ${name}`); };

try {
  await db.exec('create role anon; create role authenticated; create schema thc_private;');
  await db.exec(original);
  await check('archivo para copiar coincide exactamente; parche compila y se aplica dos veces', async () => {
    assert.equal(sql, mirror); await db.exec(sql); await db.exec(sql);
  });
  await check('cliente y servidor coinciden en los225 pares de posiciones canónicas', async () => {
    for (const source of positions) {
      for (const target of positions) assert.equal(await penalty({ pos: source }, target), playerPositionPenalty({ pos: source }, target), `${source}→${target}`);
    }
  });
  await check('MD/MI↔MC adaptan a3, ED↔MD a2, portero40 y familias restantes conservadas', async () => {
    for (const [source, target, expected] of [['RM', 'CM', 3], ['CM', 'RM', 3], ['LM', 'CM', 3], ['CM', 'LM', 3], ['RW', 'RM', 2], ['RM', 'RW', 2], ['GK', 'CM', 40], ['CM', 'GK', 40], ['RM', 'CDM', 6], ['CM', 'LW', 6], ['RM', 'LM', 6], ['CB', 'ST', 18]]) {
      assert.equal(await penalty({ pos: source }, target), expected, `${source}→${target}`);
    }
  });
  await check('posición secundaria evita penalización incluso entreGK y campo; dato inválido no cuenta', async () => {
    for (const [source, target] of [['RM', 'CM'], ['GK', 'LW'], ['ST', 'GK']]) {
      const player = { pos: source, posiciones_secundarias: [target] };
      assert.equal(await penalty(player, target), 0); assert.equal(playerPositionPenalty(player, target), 0);
      const invalid = { pos: source, posiciones_secundarias: target };
      assert.equal(await penalty(invalid, target), playerPositionPenalty(invalid, target));
    }
  });
  await check('helper sigue privado, inmutable y con search_path fijo', async () => {
    const functionState = (await db.query(`select p.provolatile,p.proconfig,
      has_function_privilege('anon',p.oid,'execute') as anon_allowed,
      has_function_privilege('authenticated',p.oid,'execute') as auth_allowed
      from pg_proc p join pg_namespace n on n.oid=p.pronamespace
      where n.nspname='thc_private' and p.proname='ut_online_position_penalty'`)).rows[0];
    assert.equal(functionState.provolatile, 'i'); assert.ok(functionState.proconfig.includes('search_path=""'));
    assert.equal(functionState.anon_allowed, false); assert.equal(functionState.auth_allowed, false);
  });
  console.log(`${checks} escenarios de afinidad SQL aprobados; incluye225 comparaciones cliente/servidor (PGlite local).`);
} catch (error) {
  console.error(error.code || error.name, error.message, error.where || ''); process.exitCode = 1;
} finally {
  await db.close();
}
