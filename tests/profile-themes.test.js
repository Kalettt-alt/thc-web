import test from 'node:test';
import assert from 'node:assert/strict';
import { PROFILE_THEME_IDS, safeProfileTheme } from '../src/utils/media.js';
import { PROFILE_THEMES, canPersonalizeProfile, canUseProfileTheme, getAvailableThemes, getProfileTheme, getProfileThemeStyle, saveProfileTheme } from '../src/utils/profileThemes.js';

function mockClient({ userId = 'owner', level = 15, response, error } = {}) {
  const writes = [];
  return {
    writes,
    auth: { getSession: async () => ({ data: { session: { user: { id: userId } } } }) },
    from() {
      let payload;
      return {
        select() { return this; },
        update(value) { payload = value; writes.push(value); return this; },
        eq() { return this; },
        async single() { return payload ? { data: response === undefined ? { id: 'owner', ...payload } : response, error } : { data: { id: 'owner', nivel_rol: level } }; },
      };
    },
  };
}

test('retira Estadio, conserva los IDs antiguos y distingue los catorce estilos', () => {
  assert.deepEqual(PROFILE_THEMES.map(item => item.id), PROFILE_THEME_IDS);
  assert.equal(PROFILE_THEMES.length, 14);
  assert.deepEqual(PROFILE_THEMES.filter(theme => theme.animated).map(theme => theme.id), ['aurora', 'vinilo', 'eclipse', 'prisma', 'orbita', 'circuito', 'lienzo', 'cromo']);
  assert.equal(safeProfileTheme('estadio'), 'default');
  assert.equal(getProfileTheme('estadio').id, 'default');
  for (const id of PROFILE_THEME_IDS) assert.equal(safeProfileTheme(id), id);
  assert.equal(getProfileTheme('twc').name, 'Agua');
  assert.equal(getProfileTheme('cromo').name, 'Casino');
  for (const invalid of ['editorial other-class', 'url(javascript:1)', {}, null]) assert.equal(safeProfileTheme(invalid), 'default');
});

test('el color personal solo entra en Pixel Art y no puede inyectar estilos', () => {
  assert.equal(getProfileTheme('pixel', '#ABC123').accent, '#ABC123');
  assert.equal(getProfileTheme('club', '#ABC123').accent, '#FF8126');
  assert.equal(getProfileThemeStyle('pixel', 'red;}body{display:none')['--accent'], '#A855F7');
  assert.equal(getProfileThemeStyle('editorial')['--profile-text'], '#27271F');
});

test('rechaza otra sesión, rol insuficiente y estilos inválidos antes de escribir', async () => {
  for (const options of [{ userId: 'other' }, { level: 9 }, { level: 0 }, { level: NaN }]) {
    const client = mockClient(options);
    await assert.rejects(saveProfileTheme({ client, userId: 'owner', themeId: 'club', color: '#A855F7' }));
    assert.equal(client.writes.length, 0);
  }
  const client = mockClient();
  await assert.rejects(saveProfileTheme({ client, userId: 'owner', themeId: 'class attack', color: '#A855F7' }));
  assert.equal(client.writes.length, 0);
});

test('nivel 10 permite los estilos VIP del perfil propio y Aurora está incluido', async () => {
  assert.equal(canPersonalizeProfile({ userId: 'owner', profileId: 'owner', level: 10 }), true);
  assert.equal(canPersonalizeProfile({ userId: 'owner', profileId: 'other', level: 100 }), false);
  assert.equal(canPersonalizeProfile({ userId: null, profileId: null, level: 100 }), false);
  assert.equal(canPersonalizeProfile({ userId: 'owner', profileId: 'owner', level: 9 }), false);
  for (const themeId of ['default', 'twc', 'pixel', 'club', 'editorial', 'aurora', 'terminal']) {
    const client = mockClient({ level: 10 });
    const saved = await saveProfileTheme({ client, userId: 'owner', themeId, color: '#A855F7' });
    assert.equal(saved.tema_perfil, themeId);
    assert.equal(client.writes.length, 1);
  }
});

test('VIP Trueno requiere nivel 15 comprobado de nuevo en la base, no en la selección cliente', async () => {
  const premiumIds = ['vinilo', 'eclipse', 'prisma', 'orbita', 'circuito', 'lienzo', 'cromo'];
  for (const themeId of premiumIds) {
    const vip = mockClient({ level: 10 });
    await assert.rejects(saveProfileTheme({ client: vip, userId: 'owner', themeId, color: '#A855F7' }), /VIP Trueno/);
    assert.equal(vip.writes.length, 0);
    const premium = mockClient({ level: 15 });
    assert.equal((await saveProfileTheme({ client: premium, userId: 'owner', themeId, color: '#A855F7' })).tema_perfil, themeId);
    assert.equal(premium.writes.length, 1);
  }
});

test('los permisos de vista previa mantienen Aurora para VIP y el resto animado para VIP Trueno', () => {
  assert.deepEqual(getAvailableThemes(0).map(theme => theme.id), ['default']);
  assert.deepEqual(getAvailableThemes(9).map(theme => theme.id), ['default']);
  assert.deepEqual(getAvailableThemes(10).map(theme => theme.id), ['default', 'twc', 'pixel', 'club', 'editorial', 'aurora', 'terminal']);
  assert.deepEqual(getAvailableThemes(14).map(theme => theme.id), getAvailableThemes(10).map(theme => theme.id));
  assert.equal(getAvailableThemes(15).length, 14);
  assert.equal(getAvailableThemes(100).length, 14);
  assert.equal(canUseProfileTheme('vinilo', 10), false);
  assert.equal(canUseProfileTheme('aurora', 10), true);
  assert.equal(canUseProfileTheme('estadio', 100), false);
  assert.equal(canUseProfileTheme('unknown', 100), false);
  assert.equal(canUseProfileTheme('cromo', Number.NaN), false);
  assert.equal(canUseProfileTheme('cromo', '15'), true);
});

test('un ID Estadio enviado directamente nunca entra en una escritura nueva', async () => {
  const client = mockClient({ level: 100 });
  await assert.rejects(saveProfileTheme({ client, userId: 'owner', themeId: 'estadio', color: '#A855F7' }), /válidos/);
  assert.equal(client.writes.length, 0);
});

test('solo confirma el estilo que la base devuelve para el mismo usuario', async () => {
  const args = { userId: 'owner', themeId: 'aurora', color: '#A855F7' };
  assert.deepEqual(await saveProfileTheme({ ...args, client: mockClient() }), { id: 'owner', tema_perfil: 'aurora', color_pixel: '#A855F7' });
  for (const response of [null, { id: 'owner' }, { id: 'other', tema_perfil: 'aurora', color_pixel: '#A855F7' }, { id: 'owner', tema_perfil: 'default', color_pixel: '#A855F7' }]) {
    await assert.rejects(saveProfileTheme({ ...args, client: mockClient({ response }) }));
  }
});
