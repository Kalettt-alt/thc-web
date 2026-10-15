import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const modulePath = process.argv[2] || '.qa/profile-social-runtime/node_modules/@electric-sql/pglite/dist/index.js';
const { PGlite } = await import(pathToFileURL(resolve(modulePath)).href);
const db = new PGlite();
const owner = '11111111-1111-4111-8111-111111111111';
const vip = '22222222-2222-4222-8222-222222222222';
const fresh = '33333333-3333-4333-8333-333333333333';
const trueno = '44444444-4444-4444-8444-444444444444';
const sql = await readFile(new URL('../supabase/profile_appearance_guard.sql', import.meta.url), 'utf8');
const query = async (statement, values = []) => (await db.query(statement, values)).rows;
const role = async (name, id = '') => {
  await db.exec('reset role');
  await query("select set_config('request.jwt.claim.sub',$1,false), set_config('request.jwt.claim.role',$2,false)", [id, name === 'postgres' ? '' : name]);
  await db.exec(`set role ${name}`);
};
const rejected = (action, code = '42501') => assert.rejects(action, error => error.code === code);
let scenarios = 0;
const check = async (name, fn) => { await fn(); scenarios++; console.log(`OK ${name}`); };

try {
  await db.exec(`
    create role anon;
    create role authenticated;
    create role service_role bypassrls;
    create schema auth;
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    create function auth.role() returns text language sql stable as $$select nullif(current_setting('request.jwt.claim.role',true),'')$$;
    grant usage on schema auth to anon, authenticated, service_role;
    create table public.perfiles (
      id uuid primary key, discord_nombre text not null, nivel_rol integer default 0,
      apodo text, bio text default 'Sin estado...', avatar_url text, sobres_disponibles integer default 0,
      tema_perfil text default 'default', color_pixel text default '#A855F7',
      avatar_scale numeric default 1, avatar_pos_x integer default 50, avatar_pos_y integer default 50, banner_pos_y integer default 50
    );
    alter table public.perfiles enable row level security;
    grant select, insert, update on public.perfiles to authenticated;
    grant all on public.perfiles to service_role;
    create policy owner_write on public.perfiles for all to authenticated using (id=auth.uid()) with check (id=auth.uid());
    create policy public_view on public.perfiles for select to authenticated using (true);
    create function public.thc_profile_appearance_guard() returns trigger language plpgsql as $$ begin return new; end $$;
    comment on function public.thc_profile_appearance_guard() is 'THC profile appearance guard v1: isolated invoker validation; existing RLS and pack balances are preserved.';
    create trigger thc_profile_appearance_guard before insert or update on public.perfiles for each row execute function public.thc_profile_appearance_guard();
  `);
  await query('insert into public.perfiles (id,discord_nombre,nivel_rol) values ($1,\'regular\',9),($2,\'vip\',10),($3,\'trueno\',15)', [owner, vip, trueno]);
  await check('upgrades the known v1 guard and keeps RLS enabled', async () => {
    await db.exec(sql);
    assert.equal((await query("select relrowsecurity from pg_class where oid='public.perfiles'::regclass"))[0].relrowsecurity, true);
    assert.equal((await query("select prosecdef from pg_proc where oid='public.thc_profile_appearance_guard()'::regprocedure"))[0].prosecdef, false);
  });
  await role('authenticated', owner);
  await check('level 9 retains ordinary identity and image editing', async () => {
    const rows = await query('update public.perfiles set bio=\'Nuevo estado\',avatar_url=\'https://example.com/avatar.png\',avatar_scale=1.4 where id=$1 returning bio,avatar_scale', [owner]);
    assert.equal(rows[0].bio, 'Nuevo estado');
    assert.equal(Number(rows[0].avatar_scale), 1.4);
  });
  await check('level 9 cannot choose any theme or color nor promote itself', async () => {
    await rejected(() => query('update public.perfiles set tema_perfil=\'club\' where id=$1', [owner]));
    await rejected(() => query('update public.perfiles set color_pixel=\'#ffffff\' where id=$1', [owner]));
    await rejected(() => query('update public.perfiles set nivel_rol=10,tema_perfil=\'club\' where id=$1', [owner]));
  });
  await check('a visitor cannot edit another profile even if it can read its stored theme', async () => {
    assert.equal((await query('update public.perfiles set tema_perfil=\'vinilo\' where id=$1 returning id', [vip])).length, 0);
    assert.equal((await query('select tema_perfil from public.perfiles where id=$1', [vip]))[0].tema_perfil, 'default');
  });
  await role('authenticated', vip);
  await check('VIP level 10 can save its seven themes on its own profile', async () => {
    for (const theme of ['default', 'twc', 'pixel', 'club', 'editorial', 'aurora', 'terminal']) {
      const result = await query('update public.perfiles set tema_perfil=$1,color_pixel=\'#aabbcc\' where id=$2 returning tema_perfil', [theme, vip]);
      assert.equal(result[0].tema_perfil, theme);
    }
  });
  await check('VIP level 10 cannot select Trueno themes or retired Estadio', async () => {
    for (const theme of ['vinilo', 'eclipse', 'prisma', 'orbita', 'circuito', 'lienzo', 'cromo']) {
      await rejected(() => query('update public.perfiles set tema_perfil=$1 where id=$2', [theme, vip]));
    }
    await rejected(() => query('update public.perfiles set tema_perfil=\'estadio\' where id=$1', [vip]), '22023');
  });
  await check('even VIP cannot inject a theme/color or use invalid image coordinates', async () => {
    await rejected(() => query('update public.perfiles set tema_perfil=\'eclipse evil-class\' where id=$1', [vip]), '22023');
    await rejected(() => query('update public.perfiles set color_pixel=\'url(javascript:1)\' where id=$1', [vip]), '22023');
    await rejected(() => query('update public.perfiles set avatar_pos_x=101 where id=$1', [vip]), '22023');
  });
  await role('authenticated', owner);
  await check('public reads preserve the selected theme for other users', async () => {
    assert.equal((await query('select tema_perfil from public.perfiles where id=$1', [vip]))[0].tema_perfil, 'terminal');
  });
  await role('authenticated', trueno);
  await check('VIP Trueno level 15 can save all fourteen themes', async () => {
    for (const theme of ['default', 'twc', 'pixel', 'club', 'editorial', 'aurora', 'terminal', 'vinilo', 'eclipse', 'prisma', 'orbita', 'circuito', 'lienzo', 'cromo']) {
      assert.equal((await query('update public.perfiles set tema_perfil=$1 where id=$2 returning tema_perfil', [theme, trueno]))[0].tema_perfil, theme);
    }
  });
  await role('authenticated', fresh);
  await check('normal registration works; a new account cannot bootstrap VIP/custom themes', async () => {
    await rejected(() => query('insert into public.perfiles(id,discord_nombre,nivel_rol) values($1,\'fresh\',10)', [fresh]));
    await rejected(() => query('insert into public.perfiles(id,discord_nombre,tema_perfil) values($1,\'fresh\',\'eclipse\')', [fresh]));
    assert.equal((await query('insert into public.perfiles(id,discord_nombre) values($1,\'fresh\') returning tema_perfil', [fresh]))[0].tema_perfil, 'default');
  });
  await role('service_role');
  await check('server administration can change roles without changing existing balances', async () => {
    const row = (await query('update public.perfiles set nivel_rol=0,sobres_disponibles=4 where id=$1 returning nivel_rol,tema_perfil', [vip]))[0];
    assert.equal(row.nivel_rol, 0);
    assert.equal(row.tema_perfil, 'terminal');
  });
  await role('authenticated', vip);
  await check('former VIP keeps its saved appearance but can only restore canonical defaults', async () => {
    await query('update public.perfiles set bio=\'Todavía puedo editar\' where id=$1', [vip]);
    await rejected(() => query('update public.perfiles set tema_perfil=\'vinilo\' where id=$1', [vip]));
    await rejected(() => query('update public.perfiles set tema_perfil=\'default\',color_pixel=\'#ff0000\' where id=$1', [vip]));
    const row = (await query('update public.perfiles set tema_perfil=\'default\',color_pixel=\'#A855F7\' where id=$1 returning tema_perfil,sobres_disponibles', [vip]))[0];
    assert.equal(row.tema_perfil, 'default');
    assert.equal(row.sobres_disponibles, 4);
  });
  await role('anon');
  await check('anonymous callers cannot write profiles or call the trigger directly', async () => {
    await rejected(() => query('update public.perfiles set tema_perfil=\'pixel\''));
    await rejected(() => query('select public.thc_profile_appearance_guard()'));
  });
  await role('postgres');
  await check('the migration is repeatable and does not reset profile data, roles or packs', async () => {
    const before = await query('select * from public.perfiles order by id');
    await db.exec(sql);
    assert.deepEqual(await query('select * from public.perfiles order by id'), before);
  });
  console.log(`${scenarios} profile SQL scenarios passed in isolated PostgreSQL. No remote data modified.`);
} catch (error) {
  console.error({ message: error.message, code: error.code, position: error.position, detail: error.detail });
  process.exitCode = 1;
} finally {
  await db.close();
}
