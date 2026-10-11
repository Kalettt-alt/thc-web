import test from 'node:test';
import assert from 'node:assert/strict';
import { PROFILE_THEME_IDS, safeProfileTheme } from '../src/utils/media.js';
import { PROFILE_THEMES, canPersonalizeProfile, getProfileTheme, getProfileThemeStyle, saveProfileTheme } from '../src/utils/profileThemes.js';

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

test('mantiene los siete valores antiguos y admite diez estilos explícitos', () => {
  assert.deepEqual(PROFILE_THEMES.map(item => item.id), PROFILE_THEME_IDS);
  assert.equal(PROFILE_THEMES.length, 10);
  assert.deepEqual(PROFILE_THEMES.filter(theme => theme.animated).map(theme => theme.id), ['estadio', 'vinilo', 'eclipse']);
  for (const id of PROFILE_THEME_IDS) assert.equal(safeProfileTheme(id), id);
  assert.equal(getProfileTheme('twc').name, 'Agua');
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

test('nivel 10 permite personalizar solo el perfil propio y guarda los tres temas animados', async () => {
  assert.equal(canPersonalizeProfile({ userId: 'owner', profileId: 'owner', level: 10 }), true);
  assert.equal(canPersonalizeProfile({ userId: 'owner', profileId: 'other', level: 100 }), false);
  assert.equal(canPersonalizeProfile({ userId: null, profileId: null, level: 100 }), false);
  assert.equal(canPersonalizeProfile({ userId: 'owner', profileId: 'owner', level: 9 }), false);
  for (const themeId of ['estadio', 'vinilo', 'eclipse']) {
    const client = mockClient({ level: 10 });
    const saved = await saveProfileTheme({ client, userId: 'owner', themeId, color: '#A855F7' });
    assert.equal(saved.tema_perfil, themeId);
    assert.equal(client.writes.length, 1);
  }
});

test('solo confirma el estilo que la base devuelve para el mismo usuario', async () => {
  const args = { userId: 'owner', themeId: 'aurora', color: '#A855F7' };
  assert.deepEqual(await saveProfileTheme({ ...args, client: mockClient() }), { id: 'owner', tema_perfil: 'aurora', color_pixel: '#A855F7' });
  for (const response of [null, { id: 'owner' }, { id: 'other', tema_perfil: 'aurora', color_pixel: '#A855F7' }, { id: 'owner', tema_perfil: 'default', color_pixel: '#A855F7' }]) {
    await assert.rejects(saveProfileTheme({ ...args, client: mockClient({ response }) }));
  }
});
