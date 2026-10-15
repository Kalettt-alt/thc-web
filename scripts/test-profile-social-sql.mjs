import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const runtime = process.argv[2] || '.qa/profile-social-runtime/node_modules/@electric-sql/pglite/dist/index.js';
const { PGlite } = await import(pathToFileURL(resolve(runtime)).href);
const db = new PGlite();
const sql = await readFile(new URL('../ComandosSQL_PerfilesAmigos.txt', import.meta.url), 'utf8');
const users = Array.from({ length: 7 }, (_, i) => `${i + 1}`.repeat(8) + '-' + `${i + 1}`.repeat(4) + '-4' + `${i + 1}`.repeat(3) + '-8' + `${i + 1}`.repeat(3) + '-' + `${i + 1}`.repeat(12));
const [a, b, c, hidden, trueno, legacy, fresh] = users;
const query = async (statement, values = []) => (await db.query(statement, values)).rows;
const role = async (name = 'postgres', id = '') => {
  await db.exec('reset role');
  await query("select set_config('request.jwt.claim.sub',$1,false), set_config('request.jwt.claim.role',$2,false)", [id, name === 'postgres' ? '' : name]);
  if (name !== 'postgres') await db.exec(`set role ${name}`);
};
const rpc = async (name, values = []) => (await query(`select public.${name}(${values.map((_, i) => '$' + (i + 1)).join(',')}) as value`, values))[0].value;
const state = target => rpc('thc_perfil_amistad_estado', [target]);
const list = target => rpc('thc_perfil_amigos', [target]);
const action = (target, type) => rpc('thc_perfil_amistad_accion', [target, type]);
const notification = (id, type) => rpc('thc_perfil_amistad_notificacion', [id, type]);
const rejected = (operation, code = '42501') => assert.rejects(operation, error => error.code === code);
let checks = 0;
const check = async (name, operation) => { await operation(); checks++; console.log('OK ' + name); };
const bootstrap = `create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    create function auth.role() returns text language sql stable as $$select nullif(current_setting('request.jwt.claim.role',true),'')$$;
    grant usage on schema auth to anon,authenticated,service_role;
    create table public.perfiles(
      id uuid primary key references auth.users(id),discord_nombre text not null,apodo text,avatar_url text,
      nivel_rol integer default 0,bio text default 'Sin estado...',perfil_publico boolean default true,
      sobres_disponibles integer default 0,tema_perfil text default 'default',color_pixel text default '#A855F7',
      avatar_scale numeric default 1,avatar_pos_x integer default 50,avatar_pos_y integer default 50,banner_pos_y integer default 50
    );
    alter table public.perfiles enable row level security;
    grant select,insert,update on public.perfiles to authenticated;
    grant all on public.perfiles to service_role;
    create policy own_profile on public.perfiles for all to authenticated using(id=auth.uid()) with check(id=auth.uid());
    create policy public_profile on public.perfiles for select to anon,authenticated using(perfil_publico);
    create function public.thc_profile_appearance_guard() returns trigger language plpgsql as $$begin return new; end$$;
    comment on function public.thc_profile_appearance_guard() is 'THC profile appearance guard v2: ten themes, owner VIP 10; ordinary edits, existing RLS and pack balances preserved.';
    create trigger thc_profile_appearance_guard before insert or update on public.perfiles for each row execute function public.thc_profile_appearance_guard();
    create table public.amigos(id uuid primary key default gen_random_uuid(),user_id_1 uuid not null references auth.users(id),user_id_2 uuid not null references auth.users(id),estado text default 'pendiente',creado_en timestamptz default now());
    create table public.notificaciones(id uuid primary key default gen_random_uuid(),usuario_id uuid references public.perfiles(id),actor_id uuid references public.perfiles(id),tipo text not null,enlace_id uuid not null,leida boolean default false,creado_en timestamptz default now(),comentario_id text,contenido text);
    grant all on public.amigos,public.notificaciones to anon,authenticated;
    grant insert(user_id_1,user_id_2,estado),update(estado) on public.amigos to authenticated;
    grant update(usuario_id,actor_id,tipo,contenido) on public.notificaciones to authenticated;
    create policy legacy_all_amigos on public.amigos for all to anon,authenticated using(true) with check(true);
    create policy legacy_all_notif on public.notificaciones for all to anon,authenticated using(true) with check(true);
`;
let originalProfiles;
let requestId;
let rejectedId;
let acceptedId;
let firstCount;
let legacyId;

try {
  await db.exec(bootstrap);
  for (let i = 0; i < users.length; i++) {
    await query('insert into auth.users values($1)', [users[i]]);
    await query("insert into public.perfiles(id,discord_nombre,apodo,nivel_rol,perfil_publico,tema_perfil,sobres_disponibles) values($1,$2,$3,$4,$5,$6,7)",
      [users[i], 'Discord' + i, i === 0 ? 'Mi apodo' : null, i === 0 ? 10 : i === 4 ? 15 : 0, i !== 3, i === 5 ? 'estadio' : 'default']);
  }
  originalProfiles = await query('select id,discord_nombre,apodo,nivel_rol,sobres_disponibles from public.perfiles order by id');
  legacyId = (await query("insert into public.amigos(user_id_1,user_id_2,estado,creado_en) values($1,$2,'pendiente',now()-interval '2 days') returning id", [a, legacy]))[0].id;
  const duplicateId = (await query("insert into public.amigos(user_id_1,user_id_2,estado) values($1,$2,'aceptado') returning id", [legacy, a]))[0].id;
  await query("insert into public.notificaciones(usuario_id,actor_id,tipo,enlace_id) values($1,$2,'solicitud_amistad',$3)", [legacy, a, legacyId]);
  await check('one atomic bundle preserves names, IDs, nicknames, roles and balances; archives duplicate IDs', async () => {
    await db.exec(sql);
    assert.deepEqual(await query('select id,discord_nombre,apodo,nivel_rol,sobres_disponibles from public.perfiles order by id'), originalProfiles);
    const legacyRows = await query('select id,thc_archivada from public.amigos order by id');
    assert.equal(legacyRows.length, 2);
    assert.equal(legacyRows.find(row => row.id === legacyId).thc_archivada, true);
    assert.equal(legacyRows.find(row => row.id === duplicateId).thc_archivada, false);
    assert.equal((await query('select tema_perfil from public.perfiles where id=$1', [legacy]))[0].tema_perfil, 'default');
    assert.equal((await query('select leida from public.notificaciones where enlace_id=$1', [legacyId]))[0].leida, true);
    assert.equal((await query("select count(*)::integer as count from pg_class where oid in ('public.amigos'::regclass,'public.perfiles'::regclass,'public.notificaciones'::regclass) and relrowsecurity"))[0].count, 3);
  });
  await role('authenticated', a);
  await check('first request persists; repeated sends and refreshes keep one request and one notification', async () => {
    const result = await action(b, 'enviar');
    assert.equal(result.estado, 'sent'); requestId = result.solicitud_id;
    assert.deepEqual(await state(b), result);
    for (let i = 0; i < 5; i++) assert.deepEqual(await action(b, 'enviar'), result);
    assert.equal((await list(a)).enviadas[0].solicitud_id, requestId);
    await role();
    assert.equal((await query('select count(*)::integer as count from public.notificaciones where enlace_id=$1', [requestId]))[0].count, 1);
    await role('authenticated', a);
  });
  await check('sender cannot accept or reject its own outgoing request; no-op remove keeps pending notification', async () => {
    await rejected(() => action(b, 'aceptar'));
    await rejected(() => action(b, 'rechazar'));
    assert.equal((await action(b, 'eliminar')).estado, 'sent');
    await role(); assert.equal((await query('select leida from public.notificaciones where enlace_id=$1', [requestId]))[0].leida, false);
    await role('authenticated', a);
  });
  await role('authenticated', b);
  await check('reciprocal send does not duplicate or auto-accept; recipient sees incoming across reload', async () => {
    assert.equal((await state(a)).estado, 'received');
    assert.equal((await action(a, 'enviar')).estado, 'received');
    assert.equal((await list(b)).recibidas[0].solicitud_id, requestId);
    await rejected(() => action(a, 'cancelar'));
  });
  await role('authenticated', c);
  await check('third party cannot inspect pending data or answer a stolen notification ID', async () => {
    assert.equal((await state(a)).estado, 'none');
    assert.deepEqual((await list(a)).enviadas, []);
    assert.deepEqual((await list(b)).recibidas, []);
    assert.equal((await query("select id from public.amigos where estado='pendiente'")).length, 0);
    assert.equal((await query('select id from public.notificaciones')).length, 0);
    await rejected(() => notification(requestId, 'aceptar'));
  });
  await role('authenticated', b);
  await check('reject is idempotent and preserves historical IDs; resend gets a fresh notification', async () => {
    assert.equal((await action(a, 'rechazar')).estado, 'none');
    assert.equal((await action(a, 'rechazar')).estado, 'none');
    rejectedId = requestId;
    await role('authenticated', a);
    requestId = (await action(b, 'enviar')).solicitud_id;
    assert.notEqual(requestId, rejectedId);
    await role('authenticated', b);
    assert.equal((await notification(rejectedId, 'aceptar')).estado, 'received');
    assert.equal((await state(a)).solicitud_id, requestId);
  });
  await check('accept through notifications confirms both sides and public friends list; repeats are safe', async () => {
    assert.equal((await notification(requestId, 'aceptar')).estado, 'friends'); acceptedId = requestId;
    assert.equal((await notification(requestId, 'aceptar')).estado, 'friends');
    await role('authenticated', a);
    assert.equal((await state(b)).estado, 'friends');
    assert.equal((await list(a)).amigos.find(friend => friend.id === b).discord_nombre, 'Discord1');
    await role('anon');
    const publicList = await list(b);
    assert.equal(publicList.amigos[0].nombre, 'Mi apodo');
    assert.deepEqual(publicList.recibidas, []); assert.deepEqual(publicList.enviadas, []);
  });
  await check('anonymous visitors cannot send, cancel, respond or mutate friendship rows', async () => {
    await rejected(() => action(a, 'enviar'));
    await rejected(() => notification(requestId, 'rechazar'));
    await rejected(() => query("insert into public.amigos(user_id_1,user_id_2) values($1,$2)", [b, c]));
    await rejected(() => query("update public.amigos set estado='aceptado'"));
    await rejected(() => query('delete from public.amigos'));
  });
  await role('authenticated', a);
  await check('direct mutation and legacy column grants cannot bypass atomic friendship API', async () => {
    await rejected(() => query("insert into public.amigos(user_id_1,user_id_2,estado) values($1,$2,'aceptado')", [a, c]));
    await rejected(() => query("update public.amigos set estado='pendiente' where id=$1", [acceptedId]));
    await rejected(() => query('delete from public.amigos where id=$1', [acceptedId]));
    await rejected(() => query("insert into public.notificaciones(usuario_id,actor_id,tipo,enlace_id) values($1,$2,'solicitud_amistad',$3)", [b, a, acceptedId]));
  });
  await check('restrictive guards remain safe even if broad table grants are accidentally restored later', async () => {
    await role();
    await db.exec('grant insert,update,delete on public.amigos to authenticated');
    await role('authenticated', a);
    await rejected(() => query("insert into public.amigos(user_id_1,user_id_2,estado) values($1,$2,'aceptado')", [a, c]));
    assert.equal((await query("update public.amigos set estado='pendiente' where id=$1 returning id", [acceptedId])).length, 0);
    assert.equal((await query('delete from public.amigos where id=$1 returning id', [acceptedId])).length, 0);
    assert.equal((await state(b)).estado, 'friends');
    await role();
    await db.exec('revoke insert,update,delete on public.amigos from authenticated');
    await role('authenticated', a);
  });
  await check('self requests, invalid commands and requests to private profiles are refused', async () => {
    assert.equal((await state(a)).estado, 'self');
    await rejected(() => action(a, 'enviar'), '22023');
    await rejected(() => action(b, 'hack'), '22023');
    await rejected(() => action(hidden, 'enviar'));
  });
  await role('authenticated', hidden);
  await check('a private user may request a public profile; own friends stay visible but public lists hide private identity', async () => {
    const incoming = await action(a, 'enviar'); assert.equal(incoming.estado, 'sent');
    await role('authenticated', a); assert.equal((await action(hidden, 'aceptar')).estado, 'friends');
    assert.equal((await list(a)).amigos.some(friend => friend.id === hidden), true);
    await role('anon');
    assert.equal((await list(a)).amigos.some(friend => friend.id === hidden), false);
    assert.deepEqual((await list(hidden)).amigos, []);
    assert.equal((await query('select id from public.amigos where user_id_1=$1 or user_id_2=$1', [hidden])).length, 0);
  });
  await role('authenticated', a);
  await check('remove an accepted friendship and cancel a pending request are persistent and idempotent', async () => {
    assert.equal((await action(b, 'eliminar')).estado, 'none');
    assert.equal((await action(b, 'eliminar')).estado, 'none');
    assert.equal((await action(b, 'enviar')).estado, 'sent');
    assert.equal((await action(b, 'cancelar')).estado, 'none');
    assert.equal((await action(b, 'cancelar')).estado, 'none');
    assert.deepEqual((await list(a)).enviadas, []);
  });
  await role('authenticated', b);
  await check('notification RLS restricts reads and marks to recipient; content and recipient immutable', async () => {
    const mine = await query('select id from public.notificaciones where usuario_id=$1', [b]);
    assert.ok(mine.length > 0);
    assert.equal((await query('update public.notificaciones set leida=true where id=$1 returning id', [mine[0].id])).length, 1);
    await rejected(() => query('update public.notificaciones set usuario_id=$1 where id=$2', [a, mine[0].id]));
    await rejected(() => query("update public.notificaciones set contenido='alterado' where id=$1", [mine[0].id]));
    await role('authenticated', c);
    assert.equal((await query('update public.notificaciones set leida=true where id=$1 returning id', [mine[0].id])).length, 0);
    assert.equal((await query('delete from public.notificaciones where id=$1 returning id', [mine[0].id])).length, 0);
  });
  await role();
  await check('full bundle reruns without changing data and keeps legacy notification references', async () => {
    const before = await query('select * from public.amigos order by id');
    firstCount = before.length;
    await db.exec(sql);
    assert.deepEqual(await query('select * from public.amigos order by id'), before);
    assert.equal((await query('select count(*)::integer as count from public.amigos'))[0].count, firstCount);
    assert.deepEqual(await query('select id,discord_nombre,apodo,nivel_rol,sobres_disponibles from public.perfiles order by id'), originalProfiles);
  });
  await role('authenticated', trueno);
  await check('bundle upgrades existing v2 theme guard: VIP Trueno has new themes; VIP keeps base; role cannot be forged', async () => {
    assert.equal((await query("update public.perfiles set tema_perfil='prisma' where id=$1 returning tema_perfil", [trueno]))[0].tema_perfil, 'prisma');
    await role('authenticated', a);
    await rejected(() => query("update public.perfiles set tema_perfil='prisma' where id=$1", [a]));
    assert.equal((await query("update public.perfiles set tema_perfil='aurora' where id=$1 returning tema_perfil", [a]))[0].tema_perfil, 'aurora');
    await rejected(() => query('update public.perfiles set nivel_rol=15 where id=$1', [a]));
  });
  await role();
  await check('all friendship definer functions have fixed search_path and no public write grants', async () => {
    const functions = await query("select proname,prosecdef,proconfig from pg_proc where proname like 'thc_perfil_am%' or proname='thc_perfil_visible'");
    assert.ok(functions.length >= 5);
    for (const fn of functions) { assert.equal(fn.prosecdef, true); assert.ok(fn.proconfig.includes('search_path=""')); }
    assert.equal((await query("select has_table_privilege('authenticated','public.amigos','INSERT') as allowed"))[0].allowed, false);
    assert.equal((await query("select has_column_privilege('authenticated','public.amigos','estado','UPDATE') as allowed"))[0].allowed, false);
  });
  await check('old full unique index upgrades; cancel then resend works without removing its old row', async () => {
    const oldDb = new PGlite();
    try {
      await oldDb.exec(bootstrap);
      for (const id of [a, b]) {
        await oldDb.query('insert into auth.users values($1)', [id]);
        await oldDb.query("insert into public.perfiles(id,discord_nombre) values($1,'Nombre')", [id]);
      }
      await oldDb.exec('create unique index thc_friends_pair_unique on public.amigos(least(user_id_1,user_id_2),greatest(user_id_1,user_id_2));');
      await oldDb.exec(sql);
      await oldDb.query("select set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claim.role','authenticated',false)", [a]);
      await oldDb.exec('set role authenticated');
      const before = (await oldDb.query("select public.thc_perfil_amistad_accion($1,'enviar') as value", [b])).rows[0].value;
      await oldDb.query("select public.thc_perfil_amistad_accion($1,'cancelar')", [b]);
      const after = (await oldDb.query("select public.thc_perfil_amistad_accion($1,'enviar') as value", [b])).rows[0].value;
      assert.notEqual(after.solicitud_id, before.solicitud_id);
      await oldDb.exec('reset role');
      assert.equal((await oldDb.query('select count(*)::integer as count from public.amigos')).rows[0].count, 2);
    } finally { await oldDb.close(); }
  });
  await check('failure in later social stage rolls back appearance edits too', async () => {
    const rollbackDb = new PGlite();
    try {
      await rollbackDb.exec(bootstrap);
      await rollbackDb.query('insert into auth.users values($1)', [a]);
      await rollbackDb.query("insert into public.perfiles(id,discord_nombre,tema_perfil) values($1,'No tocar','estadio')", [a]);
      await rollbackDb.exec('drop table public.amigos');
      await assert.rejects(() => rollbackDb.exec(sql));
      await rollbackDb.exec('rollback');
      assert.equal((await rollbackDb.query('select tema_perfil from public.perfiles')).rows[0].tema_perfil, 'estadio');
      assert.equal((await rollbackDb.query("select obj_description('public.thc_profile_appearance_guard()'::regprocedure,'pg_proc') as comment")).rows[0].comment.includes('v2:'), true);
    } finally { await rollbackDb.close(); }
  });
  console.log(`${checks} profile friendship SQL scenarios passed locally. No remote Supabase data changed.`);
} catch (error) {
  console.error({ message: error.message, code: error.code, detail: error.detail, position: error.position });
  process.exitCode = 1;
} finally { await db.close(); }
