import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PROFILE_THEMES } from '../src/utils/profileThemes.js';

const sql = await readFile(new URL('../supabase/profile_appearance_guard.sql', import.meta.url), 'utf8');
const values = source => [...source.matchAll(/'([^']+)'/g)].map(match => match[1]);
const allowedThemes = values(sql.match(/new\.tema_perfil <> all\(array\[([^\]]+)\]/)?.[1] || '');
const truenoThemes = values(sql.match(/web_request and theme_changed and new\.tema_perfil = any\(array\[([^\]]+)\]/)?.[1] || '');

test('los estilos que guarda la web siguen siendo compatibles con el guard SQL v3 instalado', () => {
  assert.deepEqual(PROFILE_THEMES.map(theme => theme.id), allowedThemes);
  assert.deepEqual(PROFILE_THEMES.filter(theme => theme.minLevel === 15).map(theme => theme.id), truenoThemes);
  assert.match(sql, /coalesce\(old\.nivel_rol, 0\) < 15/);
  assert.equal(PROFILE_THEMES.find(theme => theme.name === 'Casino')?.id, 'cromo');
  assert.equal(allowedThemes.includes('casino'), false);
});

test('las copias para Supabase conservan los mismos permisos y los IDs de los estilos', async () => {
  for (const path of ['../ComandosSQL_PerfilesVIP.txt', '../ComandosSQL_Perfiles.txt']) {
    assert.equal((await readFile(new URL(path, import.meta.url), 'utf8')).replace(/\r\n/g, '\n'), sql.replace(/\r\n/g, '\n'));
  }
  for (const path of ['../supabase/profile_social.sql', '../ComandosSQL_PerfilesAmigos.txt']) {
    const bundled = await readFile(new URL(path, import.meta.url), 'utf8');
    assert.deepEqual(values(bundled.match(/new\.tema_perfil <> all\(array\[([^\]]+)\]/)?.[1] || ''), allowedThemes);
    assert.deepEqual(values(bundled.match(/web_request and theme_changed and new\.tema_perfil = any\(array\[([^\]]+)\]/)?.[1] || ''), truenoThemes);
  }
});
