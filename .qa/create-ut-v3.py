from pathlib import Path
import re

root=Path(r'C:\THC')
source=(root/'supabase/ut_simulation_v2.sql').read_text(encoding='utf-8')
def function(name):
    match=re.search(r'create or replace function '+re.escape(name)+r'\([\s\S]*?\$fn\$;',source)
    if not match: raise RuntimeError(name)
    return match.group()
def replace(text,before,after):
    if before not in text: raise RuntimeError('Missing SQL replacement: '+before)
    return text.replace(before,after)

duration="""create or replace function thc_private.ut_online_duration(p_version integer)
returns integer language sql immutable set search_path='' as $fn$
  select case when p_version>=3 then 120 else 180 end;
$fn$;"""
elapsed="""create or replace function thc_private.ut_online_elapsed(p_start timestamptz,p_now timestamptz,p_version integer)
returns integer language sql immutable set search_path='' as $fn$
  select greatest(0,least(thc_private.ut_online_duration(p_version),
    case when p_version<2 then floor(extract(epoch from p_now-p_start))::integer
      when p_now<p_start+(thc_private.ut_online_duration(p_version)/2)*interval '1 second' then floor(extract(epoch from p_now-p_start))::integer
      when p_now<p_start+(thc_private.ut_online_duration(p_version)/2+12)*interval '1 second' then thc_private.ut_online_duration(p_version)/2
      else floor(extract(epoch from p_now-p_start))::integer-12 end));
$fn$;"""
fatigue=function('thc_private.ut_online_fatigue').replace('ut_online_fatigue(p_team jsonb,p_seconds integer)','ut_online_fatigue_duration(p_team jsonb,p_seconds integer,p_duration integer)').replace('/180.0','/p_duration::numeric')
advance=function('thc_private.ut_online_advance')
advance=replace(advance,"patterns text[]:=", "total_duration integer; half_duration integer; opportunity_step integer;\n  patterns text[]:=")
advance=replace(advance,'game.simulation_version<>2','game.simulation_version not in (2,3)')
advance=replace(advance,'upto:=thc_private.ut_online_elapsed(game.started_at,p_now,2);', "total_duration:=thc_private.ut_online_duration(game.simulation_version); half_duration:=total_duration/2;\n  opportunity_step:=case when game.simulation_version>=3 then 16 else 23 end;\n  upto:=thc_private.ut_online_elapsed(game.started_at,p_now,game.simulation_version);")
advance=advance.replace('ut_online_fatigue(home_team,1)','ut_online_fatigue_duration(home_team,1,total_duration)').replace('ut_online_fatigue(away_team,1)','ut_online_fatigue_duration(away_team,1,total_duration)')
advance=advance.replace('tick=90','tick=half_duration').replace('tick=91','tick=half_duration+1').replace('tick=180','tick=total_duration')
advance=advance.replace(',23)',',opportunity_step)').replace('/23','/opportunity_step').replace('floor(tick/2.0)','floor(tick*90.0/total_duration)')
cleanup=function('thc_private.ut_online_cleanup').replace('game.simulation_version=2','game.simulation_version>=2')
payload=function('thc_private.ut_online_payload')
payload=replace(payload,'phase text; raw_seconds numeric;', 'phase text; raw_seconds numeric; total_duration integer; half_duration integer;')
payload=replace(payload,'raw_seconds:=extract(epoch from v_now-game.started_at);', 'raw_seconds:=extract(epoch from v_now-game.started_at);\n      total_duration:=thc_private.ut_online_duration(game.simulation_version); half_duration:=total_duration/2;')
payload=payload.replace('elapsed>=180','elapsed>=total_duration').replace('raw_seconds<90','raw_seconds<half_duration').replace('game.simulation_version=2 and raw_seconds<102','game.simulation_version>=2 and raw_seconds<half_duration+12')
payload=payload.replace("'duration_seconds',180", "'duration_seconds',total_duration").replace('case when game.simulation_version=2 then 12','case when game.simulation_version>=2 then 12').replace('ceil(102-raw_seconds)','ceil(half_duration+12-raw_seconds)')
search=function('public.thc_ut_online_buscar')
search=replace(search,"begins,begins+interval '192 seconds',2,", "begins,begins+interval '132 seconds',3,")
coach=function('public.thc_ut_online_tactica')
coach=coach.replace('game.simulation_version<>2','game.simulation_version not in (2,3)').replace('game.active_seconds>=180','game.active_seconds>=thc_private.ut_online_duration(game.simulation_version)').replace('floor(active_seconds/2.0)','floor(active_seconds*90.0/thc_private.ut_online_duration(simulation_version))')
acl=source[source.index('do $functions$'):].replace('commit;','').strip()
header="""-- ULTIMATE TEAM · PARTIDOS DE DOS MINUTOS · 13 OCTUBRE 2026
-- Copia TODO en Supabase SQL Editor. Requiere Online v2 ya instalado.
-- Los nuevos encuentros duran 60 + 12 de descanso + 60 segundos.
-- Los partidos v1/v2 en curso conservan su reloj y resultados.
-- Conserva RLS, GRL ±3, energía, cinco cambios y peticiones idempotentes.
begin;
do $requirements$
begin
  if to_regprocedure('thc_private.ut_online_advance(uuid,timestamp with time zone)') is null then
    raise exception 'Instala primero ComandosSQL_OnlineUT.txt o ComandosSQL_ActualizacionUT.txt.';
  end if;
end $requirements$;
alter table public.ut_online_partidas drop constraint if exists ut_online_v2_duration;
alter table public.ut_online_partidas drop constraint if exists ut_online_v3_duration;
alter table public.ut_online_partidas add constraint ut_online_v3_duration check(
  ends_at=started_at+case simulation_version when 3 then interval '132 seconds' when 2 then interval '192 seconds' else interval '180 seconds' end);
alter table public.ut_online_partidas drop constraint if exists ut_online_v2_cursor;
alter table public.ut_online_partidas drop constraint if exists ut_online_v3_cursor;
alter table public.ut_online_partidas add constraint ut_online_v3_cursor check(
  simulation_version in (1,2,3) and active_seconds between 0 and case when simulation_version=3 then 120 else 180 end);
"""
output=header+'\n\n'.join([duration,elapsed,fatigue,advance,cleanup,payload,search,coach])+'\n\n'+acl+'\ncommit;\n'
(root/'supabase/ut_simulation_v3.sql').write_text(output,encoding='utf-8')
(root/'ComandosSQL_UTPartidos2Min.txt').write_text(output,encoding='utf-8')
print('Parche v3 generado; conserva las funciones y las reglas v1/v2.')
