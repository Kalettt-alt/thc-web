import test from 'node:test';
import assert from 'node:assert/strict';
import { groupAlbumInventory, summarizeAlbumInventory, filterAlbumInventory, normalizeAlbumSearch, matchesAlbumCromo, albumOfferAvailability, filterAlbumOffers, albumTimeRemaining, albumErrorMessage, albumOperationParams, isAmbiguousAlbumError, isValidAlbumMarketReceipt } from '../src/utils/albumCollection.js';

const now = Date.parse('2026-10-03T12:00:00Z');
const catalog = { U_001: { name: 'José', categoria: 'Jugadores', nacionalidad: 'Perú' }, U_002: { name: 'Lukk', categoria: 'Jugadores' }, JR_001: { name: 'Álex', categoria: 'Reconocidos' } };
const liveOffer = { id: '33333333-3333-4333-8333-333333333333', estado: 'activo', version_mercado: 2, fecha_expiracion: '2026-10-04T12:00:00Z', cromo_ofrece: 'U_001', cromo_pide: 'U_002' };

test('el inventario distingue copias, repetidas, pegadas y reservas sin confundir la primera copia', () => {
  const items = groupAlbumInventory([
    { cromo_id: 'U_001', cantidad: 1, pegada: false },
    { cromo_id: 'U_001', cantidad: 2, pegada: true },
    { cromo_id: 'U_002', cantidad: 1, pegada: false },
    { cromo_id: 'JR_001', cantidad: 2, pegada: false },
  ], [liveOffer], now);
  assert.deepEqual(items.find(item => item.id === 'U_001'), { id: 'U_001', cantidad: 3, pegada: true, reservadas: 1, libres: 2, repetidas: 2, disponiblesMercado: 1, paraPegar: false });
  assert.equal(items.find(item => item.id === 'U_002').disponiblesMercado, 0);
  assert.deepEqual(summarizeAlbumInventory(items), { tipos: 3, copias: 6, pegadas: 1, paraPegar: 2, libres: 5, repetidas: 3, reservadas: 1, disponiblesMercado: 2 });
});

test('las ofertas vencidas o del mercado anterior no reservan de nuevo y los datos inválidos no generan copias', () => {
  const items = groupAlbumInventory([
    { cromo_id: 'U_001', cantidad: '2', pegada: true },
    { cromo_id: 'U_002', cantidad: -1 },
    { cromo_id: 'U_002', cantidad: null, pegada: true },
    { cromo_id: '../imagen', cantidad: 8 },
    { cromo_id: 'U_002', cantidad: 1.4 },
    { cromo_id: 'U_002', cantidad: NaN },
  ], [{ ...liveOffer, version_mercado: 1 }, { ...liveOffer, fecha_expiracion: new Date(now).toISOString() }, { ...liveOffer, estado: 'aceptado' }], now);
  assert.equal(items.length, 1);
  assert.equal(items[0].disponiblesMercado, 1);
  assert.equal(items[0].reservadas, 0);
  const overReserved = groupAlbumInventory([{ cromo_id: 'U_001', cantidad: 2 }], [liveOffer, liveOffer], now)[0];
  assert.equal(overReserved.disponiblesMercado, 0);
});

test('la búsqueda admite acentos, categoría, nacionalidad, ID y palabras en cualquier orden', () => {
  assert.equal(normalizeAlbumSearch('  JOSÉ Perú  '), 'jose peru');
  assert.equal(matchesAlbumCromo('U_001', catalog, 'peru jose', 'U'), true);
  assert.equal(matchesAlbumCromo('U_001', catalog, 'jugadores U_001'), true);
  assert.equal(matchesAlbumCromo('U_001', catalog, 'jose', 'JR'), false);
  assert.equal(matchesAlbumCromo('U_001', catalog, 'jose argentina'), false);
  assert.equal(matchesAlbumCromo('JR_001', catalog, 'alex', 'JR'), true);
});

test('filtros y orden no modifican la colección original y repetidas incluye la copia sin pegar', () => {
  const items = groupAlbumInventory([{ cromo_id: 'JR_001', cantidad: 2 }, { cromo_id: 'U_002', cantidad: 1, pegada: true }, { cromo_id: 'U_001', cantidad: 3 }]);
  const before = items.map(item => item.id);
  assert.deepEqual(filterAlbumInventory(items, catalog, { status: 'para_pegar', sort: 'cantidad' }).map(item => item.id), ['U_001', 'JR_001']);
  assert.deepEqual(filterAlbumInventory(items, catalog, { status: 'repetidas', sort: 'nombre' }).map(item => item.id), ['JR_001', 'U_001']);
  assert.deepEqual(filterAlbumInventory(items, catalog, { status: 'pegadas' }).map(item => item.id), ['U_002']);
  assert.deepEqual(filterAlbumInventory(items, catalog).map(item => item.id), ['U_001', 'U_002', 'JR_001']);
  assert.deepEqual(items.map(item => item.id), before);
});

test('aceptar una oferta requiere una repetida disponible y nunca la única copia de la colección', () => {
  const rows = [{ cromo_id: 'U_002', cantidad: 1, pegada: false }];
  assert.equal(albumOfferAvailability(liveOffer, groupAlbumInventory(rows), now).canAccept, false);
  rows[0].cantidad = 2;
  assert.equal(albumOfferAvailability(liveOffer, groupAlbumInventory(rows), now).canAccept, true);
  const held = groupAlbumInventory(rows, [{ ...liveOffer, cromo_ofrece: 'U_002' }], now);
  assert.match(albumOfferAvailability(liveOffer, held, now).reason, /reservadas/);
  assert.equal(albumOfferAvailability({ ...liveOffer, version_mercado: 1 }, held, now).canAccept, false);
  assert.equal(albumOfferAvailability({ ...liveOffer, fecha_expiracion: 'inválida' }, held, now).canAccept, false);
});

test('el mercado puede mostrar solo intercambios posibles o cromos que todavía no tengo', () => {
  const items = groupAlbumInventory([{ cromo_id: 'U_002', cantidad: 2 }]);
  const offers = [liveOffer, { ...liveOffer, cromo_ofrece: 'JR_001', cromo_pide: 'U_001' }, { ...liveOffer, version_mercado: 1 }, { ...liveOffer, fecha_expiracion: new Date(now).toISOString() }];
  assert.equal(filterAlbumOffers(offers, catalog, items, { onlyAvailable: true, now }).length, 1);
  assert.equal(filterAlbumOffers(offers, catalog, items, { onlyMissing: true, search: 'alex jose', now }).length, 1);
  assert.equal(filterAlbumOffers(offers, catalog, items, { category: 'JR', now }).length, 1);
});

test('el tiempo restante no declara vencida una oferta con segundos disponibles', () => {
  assert.equal(albumTimeRemaining(new Date(now + 1000).toISOString(), now), '1 min');
  assert.equal(albumTimeRemaining(new Date(now + 3600000).toISOString(), now), '1 h');
  assert.equal(albumTimeRemaining(new Date(now + 25 * 3600000).toISOString(), now), '1 d 1 h');
  assert.equal(albumTimeRemaining(new Date(now).toISOString(), now), 'Vencida');
  assert.equal(albumTimeRemaining(null, now), 'Vencida');
});

test('los errores de instalación y negocio son didácticos sin exponer mensajes SQL internos', () => {
  assert.match(albumErrorMessage({ code: 'PGRST202' }), /ComandosSQL.txt/);
  assert.match(albumErrorMessage({ code: 'P0001', details: 'ALBUM_NO_COPIES' }), /repetida/);
  assert.equal(albumErrorMessage({ code: '42501', message: 'SQL private stack password' }, 'Reintenta.'), 'Reintenta.');
  assert.equal(isAmbiguousAlbumError({ code: 'P0001' }), false);
  assert.equal(isAmbiguousAlbumError(new TypeError('Failed to fetch')), true);
});

test('las solicitudes conservan el UUID de reintento y solo aceptan argumentos previstos', () => {
  const requestId = '11111111-1111-4111-8111-111111111111';
  assert.deepEqual(albumOperationParams({ kind: 'create', ofrece: 'U_001', pide: 'JR_001', requestId }), { p_ofrece: 'U_001', p_pide: 'JR_001', p_solicitud_id: requestId });
  assert.deepEqual(albumOperationParams({ kind: 'accept', offerId: liveOffer.id, requestId }), { p_oferta_id: liveOffer.id, p_solicitud_id: requestId });
  assert.equal(albumOperationParams({ kind: 'create', ofrece: 'U_001', pide: 'U_001', requestId }), null);
  assert.equal(albumOperationParams({ kind: 'cancel', offerId: '../fake', requestId }), null);
  assert.equal(albumOperationParams({ kind: 'other', offerId: liveOffer.id, requestId }), null);
});

test('solo un recibo confirmado de la operación exacta permite borrar la solicitud pendiente', () => {
  const operation = { kind: 'accept', offerId: liveOffer.id };
  const receipt = { success: true, oferta_id: liveOffer.id, estado: 'completado', version_mercado: 2 };
  assert.equal(isValidAlbumMarketReceipt(receipt, operation), true);
  for (const invalid of [null, { ...receipt, success: 'true' }, { ...receipt, version_mercado: '2' }, { ...receipt, estado: 'activo' }, { ...receipt, oferta_id: 'invalid' }, { ...receipt, oferta_id: '44444444-4444-4444-8444-444444444444' }]) assert.equal(isValidAlbumMarketReceipt(invalid, operation), false);
  assert.equal(isValidAlbumMarketReceipt({ ...receipt, estado: 'activo' }, { kind: 'create' }), true);
  assert.equal(isValidAlbumMarketReceipt({ ...receipt, estado: 'cancelado' }, { kind: 'cancel', offerId: liveOffer.id }), true);
});
