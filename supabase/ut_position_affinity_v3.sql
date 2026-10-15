-- ULTIMATE TEAM · AFINIDAD DE LOS MEDIOCAMPISTAS · 13 OCTUBRE 2026
-- Copia TODO en Supabase SQL Editor después de instalar Online UT.
-- MD/MI (RM/LM) y MC (CM) se adaptan entre sí con una penalización de 3 GRL.
-- Conserva puestos secundarios sin penalización, ED↔MD en 2 y portero fuera del arco en 40.
-- No modifica cartas, cuentas, saldos, plantillas guardadas ni resultados anteriores.
begin;
do $requirements$
begin
  if to_regprocedure('thc_private.ut_online_position_penalty(jsonb,text)') is null then
    raise exception 'Instala primero ComandosSQL_OnlineUT.txt o ComandosSQL_ActualizacionUT.txt.';
  end if;
end $requirements$;

create or replace function thc_private.ut_online_position_penalty(p_player jsonb,p_target text)
returns integer language plpgsql immutable set search_path='' as $fn$
declare source text:=p_player->>'pos'; source_family text; target_family text;
begin
  if source=p_target or coalesce(p_player->'posiciones_secundarias' @> to_jsonb(array[p_target]),false) then return 0; end if;
  if source='GK' or p_target='GK' then return 40; end if;
  source_family:=case when source in ('CB','LB','RB','LWB','RWB') then 'DEF' when source in ('CM','CDM','CAM') then 'MID'
    when source in ('ST','CF') then 'ATT' when source in ('LW','RW','LM','RM') then 'WIDE' else null end;
  target_family:=case when p_target in ('CB','LB','RB','LWB','RWB') then 'DEF' when p_target in ('CM','CDM','CAM') then 'MID'
    when p_target in ('ST','CF') then 'ATT' when p_target in ('LW','RW','LM','RM') then 'WIDE' else null end;
  if (source in ('LW','LM') and p_target in ('LW','LM')) or (source in ('RW','RM') and p_target in ('RW','RM')) then return 2; end if;
  if (source in ('LM','RM') and p_target='CM') or (source='CM' and p_target in ('LM','RM')) then return 3; end if;
  if source_family='WIDE' and target_family='WIDE' then return 6; end if;
  if source_family=target_family then
    if source_family='DEF' and ((source in ('LB','LWB') and p_target in ('RB','RWB')) or (source in ('RB','RWB') and p_target in ('LB','LWB'))) then return 6; end if;
    return 3;
  end if;
  if (source_family='DEF' and target_family in ('ATT','WIDE')) or (target_family='DEF' and source_family in ('ATT','WIDE')) then return 18; end if;
  if (source_family='DEF' and target_family='MID') or (source_family='MID' and target_family='DEF') then return 10; end if;
  if (source_family='MID' and target_family='ATT') or (source_family='ATT' and target_family='MID') then return 9; end if;
  if (source_family='MID' and target_family='WIDE') or (source_family='WIDE' and target_family='MID') then return 6; end if;
  if (source_family='WIDE' and target_family='ATT') or (source_family='ATT' and target_family='WIDE') then return 5; end if;
  return 18;
end $fn$;

revoke all on function thc_private.ut_online_position_penalty(jsonb,text) from public,anon,authenticated;
notify pgrst,'reload schema';
commit;
