import test from 'node:test';
import assert from 'node:assert/strict';
import { CLUB_IDENTITY_COLUMNS, clubLogoSource, ownClubLogoPath, saveClubIdentity } from '../src/pages/UltimateTeam/clubIdentityUT.js';

const userId = '11111111-1111-4111-8111-111111111111';
const projectUrl = 'https://club-review.supabase.co';
const club = { user_id: userId, nombre: 'Club THC', abreviatura: 'THC', logo_url: `${projectUrl}/storage/v1/object/public/logos_clubes/${userId}_logo.png` };

function clientFor(result, authUser = userId) {
  const calls = [];
  const client = {
    auth: { getUser: async () => ({ data: { user: authUser ? { id: authUser } : null }, error: null }) },
    from: table => {
      calls.push({ table });
      return {
        upsert: (payload, options) => {
          calls.push({ payload, options });
          return { select: columns => { calls.push({ columns }); return { single: async () => result }; } };
        },
      };
    },
  };
  return { client, calls };
}

test('crear club entrega la identidad confirmada por la base de datos al tutorial', async () => {
  const confirmed = { ...club, nombre: 'Nombre confirmado', estadio: 'Estadio THC' };
  const { client, calls } = clientFor({ data: confirmed, error: null });
  assert.equal(await saveClubIdentity(client, club, userId), confirmed);
  assert.deepEqual(calls[1], { payload: [club], options: { onConflict: 'user_id' } });
  assert.equal(calls[2].columns, CLUB_IDENTITY_COLUMNS);
  assert.ok(calls[2].columns.includes('nombre'));
  assert.ok(calls[2].columns.includes('logo_url'));
});

test('crear club rechaza error RLS y respuestas sin identidad confirmada', async () => {
  const error = { code: '42501', message: 'Permiso insuficiente' };
  await assert.rejects(saveClubIdentity(clientFor({ data: null, error }).client, club, userId), value => value === error);
  for (const data of [null, { user_id: userId }, { ...club, user_id: 'otro-usuario' }]) {
    await assert.rejects(saveClubIdentity(clientFor({ data, error: null }).client, club, userId), /confirmar/);
  }
});

test('sesión distinta o perdida no escribe ni devuelve identidad inventada', async () => {
  for (const current of [null, 'otra-sesion']) {
    const { client, calls } = clientFor({ data: club, error: null }, current);
    await assert.rejects(saveClubIdentity(client, club, userId), /sesión/);
    assert.equal(calls.length, 0);
  }
  const { client, calls } = clientFor({ data: club, error: null });
  await assert.rejects(saveClubIdentity(client, { ...club, user_id: 'otro' }, userId), /sesión/);
  assert.equal(calls.length, 0);
});

test('un escudo privado se puede recuperar solo del bucket propio del proyecto', () => {
  for (const kind of ['public', 'sign', 'authenticated']) {
    assert.equal(ownClubLogoPath(`${projectUrl}/storage/v1/object/${kind}/logos_clubes/${userId}_logo.png?token=old`, projectUrl, userId), `${userId}_logo.png`);
  }
  assert.equal(ownClubLogoPath(club.logo_url.replace('.png', '.jpg'), projectUrl, userId), `${userId}_logo.jpg`);
});

test('recuperación del escudo no firma otros usuarios, buckets, proyectos ni paths', () => {
  const paths = [
    club.logo_url.replace('club-review', 'otro'),
    club.logo_url.replace('logos_clubes', 'privado'),
    club.logo_url.replace(userId, '22222222-2222-4222-8222-222222222222'),
    club.logo_url.replace(`${userId}_logo.png`, `carpeta/${userId}_logo.png`),
    club.logo_url.replace(`${userId}_logo.png`, `../${userId}_logo.png`),
    club.logo_url.replace('.png', '.svg'),
    club.logo_url.replace('https:', 'http:'),
  ];
  for (const path of paths) assert.equal(ownClubLogoPath(path, projectUrl, userId), null);
  assert.equal(ownClubLogoPath(club.logo_url, projectUrl, null), null);
});

test('imagen de identidad conserva HTTPS y assets locales; rechaza esquemas de ejecución', () => {
  assert.equal(clubLogoSource(club.logo_url), club.logo_url);
  assert.equal(clubLogoSource('/imagenes/LogoTHC.png'), '/imagenes/LogoTHC.png');
  for (const value of ['javascript:alert(1)', 'data:image/svg+xml,test', '//otro.example/img.png', '/\\otro.example/img.png', 'https://user:pass@otro.example/img.png', '', null]) {
    assert.equal(clubLogoSource(value), null);
  }
});
