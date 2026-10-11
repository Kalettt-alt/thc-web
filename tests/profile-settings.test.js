import test from 'node:test';
import assert from 'node:assert/strict';
import { createProfileSettings, profileSettingsUpdates, profileNicknameCooldown, spotifyTrack, profileImageUrl } from '../src/utils/profileSettings.js';

const now = Date.parse('2026-10-03T12:00:00Z');
const profile = { apodo: 'Jugador', bio: 'Hola', nivel_rol: 0, posicion: 'Cualquiera', widget_1: 'Ninguno', widget_2: 'Ninguno' };

test('las imágenes admiten archivos locales y HTTPS sin contenido activo ni credenciales', () => {
  assert.equal(profileImageUrl('/imagenes/LogoTHC.png'), '/imagenes/LogoTHC.png');
  assert.equal(profileImageUrl('https://cdn.example.com/avatar.jpg'), 'https://cdn.example.com/avatar.jpg');
  for (const value of ['javascript:alert(1)', 'data:image/svg+xml,<svg/>', '//example.com/avatar', '/\\example.com/avatar', 'https://user:secret@example.com/avatar', 'http://example.com/avatar', null]) assert.equal(profileImageUrl(value), null);
});

test('el encuadre corrupto se acota sin alterar el perfil cargado', () => {
  const corrupt = { ...profile, avatar_scale: 'NaN', avatar_pos_x: 800, avatar_pos_y: -9, banner_pos_y: null };
  const form = createProfileSettings(corrupt);
  assert.equal(form.avatar_scale, 1);
  assert.equal(form.avatar_pos_x, 100);
  assert.equal(form.avatar_pos_y, 0);
  assert.equal(form.banner_pos_y, 50);
  assert.equal(corrupt.avatar_pos_x, 800);
  assert.equal(form.posicion, 'Cualquiera');
});

test('guardar respeta cooldown y límites aunque se eludan los controles', () => {
  const cooldown = { ...profile, ultimo_cambio_apodo: new Date(now - 86400000).toISOString() };
  assert.equal(profileNicknameCooldown(cooldown, now), 6);
  assert.throws(() => profileSettingsUpdates({ ...createProfileSettings(cooldown), apodo: 'Otro' }, cooldown, now), /apodo/);
  assert.throws(() => profileSettingsUpdates({ ...createProfileSettings(profile), bio: 'a'.repeat(151) }, profile, now), /150/);
  assert.throws(() => profileSettingsUpdates({ ...createProfileSettings(profile), posicion: 'falso' }, profile, now), /posición/);
  const saved = profileSettingsUpdates({ ...createProfileSettings(cooldown), bio: 'Nuevo estado', avatar_scale: 999 }, cooldown, now);
  assert.equal(saved.avatar_scale, 2.5);
  assert.equal(saved.bio, 'Nuevo estado');
  assert.equal(Object.hasOwn(saved, 'ultimo_cambio_apodo'), false);
  assert.equal(Object.hasOwn(saved, 'tema_perfil'), false);
  assert.equal(Object.hasOwn(saved, 'nivel_rol'), false);
});

test('el guardado no concede un segundo widget ni sobres desde el formulario', () => {
  const form = { ...createProfileSettings(profile), widget_2: 'Ultimate Team', sobres_disponibles: 99, nivel_rol: 100, tema_perfil: 'club' };
  const saved = profileSettingsUpdates(form, profile, now);
  assert.equal(saved.widget_2, 'Ninguno');
  assert.equal(Object.hasOwn(saved, 'sobres_disponibles'), false);
  assert.equal(Object.hasOwn(saved, 'nivel_rol'), false);
  assert.equal(Object.hasOwn(saved, 'tema_perfil'), false);
  assert.equal(profileSettingsUpdates(form, { ...profile, nivel_rol: 15 }, now).widget_2, 'Ultimate Team');
});

test('Spotify acepta enlaces localizados y rechaza hosts falsos o contenido activo', () => {
  const id = '4uLU6hMCjMI75M1A2tKUQC';
  assert.equal(spotifyTrack(`https://open.spotify.com/intl-es/track/${id}?si=abc`).url, `https://open.spotify.com/track/${id}`);
  for (const invalid of [`https://open.spotify.com.evil.test/track/${id}`, `http://open.spotify.com/track/${id}`, `https://secret@open.spotify.com/track/${id}`, 'javascript:alert(1)', `https://open.spotify.com/playlist/${id}`]) assert.equal(spotifyTrack(invalid), null);
  const form = { ...createProfileSettings(profile), cancion_url: `https://open.spotify.com/track/${id}?si=abc` };
  assert.equal(profileSettingsUpdates(form, profile, now).cancion_url, `https://open.spotify.com/track/${id}`);
});
