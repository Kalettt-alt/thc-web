import test from 'node:test';
import assert from 'node:assert/strict';
import { CARD_DESIGNS, normalizeCardRarity, clampCardRating, cardCountry, displayCardPosition, catalogCard, cardStatFields, FIELD_STATS, KEEPER_STATS } from '../src/pages/UltimateTeam/utCards.js';
import { normalizePlayerList } from '../src/pages/UltimateTeam/utValidation.js';
import { JUGADORES_BASE } from '../src/pages/UltimateTeam/data/jugadoresBase.js';

test('cinco tipos usan las plantillas entregadas y especial sigue siendo un alias visual', () => {
  assert.deepEqual(Object.values(CARD_DESIGNS), ['BRONCE_CARD.png', 'SILVER_CARD.png', 'GOLD_CARD.png', 'PLUS_CARD.png', 'ULTIMATE_CARD.png']);
  assert.equal(normalizeCardRarity('especial'), 'plus');
  assert.equal(normalizeCardRarity('ULTIMATE'), 'ultimate');
  assert.equal(normalizeCardRarity('__proto__'), 'plata');
  const input = ['bronce', 'plata', 'oro', 'plus', 'ultimate', 'especial'].map((color, i) => ({ id: `card-${i}`, color, grl: 72 }));
  assert.deepEqual(normalizePlayerList(input, 10).map(card => card.color), input.map(card => card.color));
});

test('GRL y estadísticas se limitan a 99 sin elevar cartas por su tipo', () => {
  assert.equal(clampCardRating(150), 99);
  assert.equal(clampCardRating(-5), 0);
  assert.equal(clampCardRating(NaN), 0);
  const card = catalogCard({ id: 'catalog', nombre: 'Carta', posicion: 'CM', rareza: 'ultimate', grl: 75, ritmo: 103, tiro: -8, pase: 72, nacionalidad: 'PE' }, 'owned');
  assert.equal(card.grl, 75);
  assert.equal(card.pac, 99);
  assert.equal(card.sho, 0);
  const reloaded = normalizePlayerList([card], 11)[0];
  assert.equal(reloaded.color, 'ultimate');
  assert.equal(reloaded.carta_id, 'catalog');
  assert.equal(reloaded.club_carta_id, 'owned');
  assert.equal(reloaded.pais_codigo, 'PE');
});

test('banderas locales admiten nombres con acentos y no fabrican un país desconocido', () => {
  assert.equal(cardCountry('Perú').code, 'PE');
  assert.equal(cardCountry('PER').code, 'PE');
  assert.equal(cardCountry('ARG').code, 'AR');
  assert.ok(cardCountry({ nacionalidad: 'Perú' }).flagUrl.startsWith('data:image/svg+xml,'));
  assert.equal(cardCountry('País sin catalogar').flagUrl, null);
  assert.equal(cardCountry('País sin catalogar').name, 'País sin catalogar');
  assert.equal(displayCardPosition('CM'), 'MC');
  assert.equal(displayCardPosition('GK'), 'POR');
});

test('país del tutorial se recupera en guardados anteriores sin cambiar stats ni IDs', () => {
  const legacy = { ...JUGADORES_BASE[0] };
  delete legacy.nacionalidad;
  delete legacy.pais_codigo;
  const reloaded = normalizePlayerList([legacy], 11)[0];
  assert.equal(reloaded.nacionalidad, 'PE');
  assert.equal(reloaded.id, 'p1');
  for (const key of ['grl', 'pac', 'sho', 'pas', 'dri', 'def', 'phy']) assert.equal(reloaded[key], legacy[key]);
  assert.equal(JUGADORES_BASE.length, 23);
  assert.ok(JUGADORES_BASE.every(card => card.grl < 99));
  assert.equal(normalizePlayerList([{ id: 'catalog-card', nacionalidad: 'AR', grl: 76 }], 11)[0].nacionalidad, 'AR');
});

test('porteros iniciales conservan su modelo de seis stats y los datos ausentes no se vuelven cero', () => {
  const starter = JUGADORES_BASE[0];
  assert.equal(cardStatFields(starter), FIELD_STATS);
  const actual = catalogCard({ id: 'keeper', nombre: 'Portero', posicion: 'GK', grl: 75, estirada: 80, ritmo: 45 });
  assert.equal(actual.gk_div, 80);
  assert.equal(actual.gk_han, undefined);
  assert.equal(cardStatFields(actual), KEEPER_STATS);
  assert.equal(cardStatFields(catalogCard({ id: 'unknown', posicion: 'GK' })), FIELD_STATS);
});
