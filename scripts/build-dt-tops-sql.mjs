import { readFile, writeFile } from 'node:fs/promises';

const baseUrl = new URL('../supabase/dt_fantasy_bebidas.sql', import.meta.url);
const topsUrl = new URL('../supabase/dt_tops_rayos.sql', import.meta.url);
const bundleUrl = new URL('../ComandosSQL_DTFantasyTOPS.txt', import.meta.url);
const base = await readFile(baseUrl, 'utf8');
const current = await readFile(topsUrl, 'utf8');
const match = base.match(/create or replace function public\.thc_fantasy_guardar\([\s\S]*?\$save\$;/);
if (!match) throw new Error('No se encontro el guardado base de Bebidas.');
let save = match[0]
  .replace('  first_round integer;', '  first_round integer;\n  transition_data jsonb;\n  rayos_delta smallint := 0;\n  rayos_total bigint;')
  .replace('  insert into public.fantasy_partidas (user_id,', `  transition_data := thc_private.fantasy_validar_resultado(actor, p_partida);
  p_partida := pg_catalog.jsonb_set(p_partida, '{standings}', thc_private.fantasy_tabla(p_partida->'fixture', p_partida->'standings'));
  insert into thc_private.fantasy_carreras_rayos(partida_id, user_id) values ((transition_data->>'partida_id')::uuid, actor) on conflict do nothing;
  insert into thc_private.fantasy_rayos(user_id) values(actor) on conflict do nothing;
  insert into public.fantasy_partidas (id, user_id,`)
  .replace('  values (actor, p_partida', "  values ((transition_data->>'partida_id')::uuid, actor, p_partida")
  .replace("  return pg_catalog.jsonb_build_object('id', saved.id, 'energia_revision', saved.energia_revision);", `  if (transition_data->>'registrar')::boolean then
    insert into thc_private.fantasy_resultados_rayos(partida_id, jornada, user_id, goles_favor, goles_contra, rayos)
    values(saved.id, (transition_data->>'jornada')::smallint, actor, (transition_data->>'goles_favor')::smallint, (transition_data->>'goles_contra')::smallint, (transition_data->>'rayos')::smallint)
    on conflict do nothing returning rayos into rayos_delta;
    rayos_delta := coalesce(rayos_delta, 0);
    if rayos_delta <> 0 then
      update thc_private.fantasy_rayos set rayos = rayos + rayos_delta,
        victorias = victorias + case when rayos_delta = 2 then 1 else 0 end,
        empates = empates + case when rayos_delta = 1 then 1 else 0 end,
        derrotas = derrotas + case when rayos_delta = -1 then 1 else 0 end,
        actualizado_en = now() where user_id = actor;
    end if;
  end if;
  select rayos into rayos_total from thc_private.fantasy_rayos where user_id = actor;
  return pg_catalog.jsonb_build_object('id', saved.id, 'energia_revision', saved.energia_revision, 'rayos_delta', rayos_delta, 'rayos', rayos_total);`);
const begin = '-- BEGIN GENERATED GUARDED CAREER SAVE';
const end = '-- END GENERATED GUARDED CAREER SAVE';
const startIndex = current.indexOf(begin);
const endIndex = current.indexOf(end);
if (startIndex < 0 || endIndex < startIndex) throw new Error('Faltan marcadores del guardado TOPS.');
const tops = current.slice(0, startIndex) + begin + '\n' + save + '\n' + current.slice(endIndex);
const body = source => source.replace(/^begin;\s*/im, '').replace(/^commit;\s*$/gim, '').replace(/^notify pgrst,[^\n]*$/gim, '').trim();
// Reuse Bebidas definitions without rerunning its historical one-time fitness gift.
const dependencies = body(base).replace(/do \$fitness_patch\$[\s\S]*?\$fitness_patch\$;/, '').trim();
const bundle = `-- DT FANTASY: Bebidas + TOPS / rayos. Copia TODO este archivo en SQL Editor y ejecuta.
-- Reaplicable. No borra perfiles, monedas ni carreras. Resultados nuevos: +2 / +1 / -1.
-- El ranking no otorga ventajas por VIP, rol o permisos. Los rayos sobreviven a rescindir.
-- El motor sigue en el navegador; no es una certificacion contra resultados manipulados.
-- Las partidas anteriores conservan progreso y no reciben puntos retroactivos.
\nbegin;
\n${dependencies}
\n${body(tops)}
\ncommit;
notify pgrst, 'reload schema';\n`;
if (process.argv.includes('--check')) {
  if (current !== tops || await readFile(bundleUrl, 'utf8').catch(() => '') !== bundle) throw new Error('Los archivos SQL DT Fantasy no coinciden. Ejecuta node scripts/build-dt-tops-sql.mjs.');
  console.log('DT Fantasy TOPS SQL and standalone copy/paste bundle are current.');
} else {
  await writeFile(topsUrl, tops);
  await writeFile(bundleUrl, bundle);
  console.log('Generated guarded DT Fantasy save and standalone TOPS SQL bundle.');
}
