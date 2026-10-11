export const ALBUM_CATEGORIES = [
  { id: 'TODOS', label: 'Todas las categorías' },
  { id: 'U', label: 'Jugadores' },
  { id: 'V', label: 'Vips' },
  { id: 'JR', label: 'Reconocidos' },
  { id: 'BL', label: 'Blacklist' },
  { id: 'ES', label: 'Ex-Staff' },
  { id: 'S', label: 'Staff' },
  { id: 'M', label: 'Momentos' },
];

const numberOfCopies = value => Number.isSafeInteger(Number(value)) && Number(value) > 0 ? Number(value) : 0;
const naturalOrder = new Intl.Collator('es', { numeric: true, sensitivity: 'base' });

export function normalizeAlbumSearch(value) {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

export function isLiveAlbumOffer(offer, now = Date.now()) {
  return offer?.estado === 'activo' && Number.isFinite(Date.parse(offer.fecha_expiracion)) && Date.parse(offer.fecha_expiracion) > now;
}

export function groupAlbumInventory(rows = [], offers = [], now = Date.now()) {
  const grouped = new Map();
  for (const row of rows) {
    if (typeof row?.cromo_id !== 'string' || !/^[A-Z]+_\d{3}$/.test(row.cromo_id)) continue;
    const quantity = numberOfCopies(row.cantidad);
    if (!quantity) continue;
    const item = grouped.get(row.cromo_id) || { id: row.cromo_id, cantidad: 0, pegada: false, reservadas: 0 };
    item.cantidad += quantity;
    item.pegada ||= row.pegada === true;
    grouped.set(item.id, item);
  }
  for (const offer of offers) {
    if (Number(offer.version_mercado) !== 2 || !isLiveAlbumOffer(offer, now)) continue;
    const item = grouped.get(offer.cromo_ofrece);
    if (item) item.reservadas += 1;
  }
  return [...grouped.values()].map(item => ({
    ...item,
    libres: Math.max(0, item.cantidad - (item.pegada ? 1 : 0)),
    repetidas: Math.max(0, item.cantidad - 1),
    disponiblesMercado: Math.max(0, item.cantidad - 1 - item.reservadas),
    paraPegar: !item.pegada && item.cantidad > 0,
  })).sort((a, b) => naturalOrder.compare(a.id, b.id));
}

export function summarizeAlbumInventory(items = []) {
  return items.reduce((total, item) => ({
    tipos: total.tipos + 1,
    copias: total.copias + item.cantidad,
    pegadas: total.pegadas + Number(item.pegada),
    paraPegar: total.paraPegar + Number(item.paraPegar),
    libres: total.libres + item.libres,
    repetidas: total.repetidas + item.repetidas,
    reservadas: total.reservadas + item.reservadas,
    disponiblesMercado: total.disponiblesMercado + item.disponiblesMercado,
  }), { tipos: 0, copias: 0, pegadas: 0, paraPegar: 0, libres: 0, repetidas: 0, reservadas: 0, disponiblesMercado: 0 });
}

export function matchesAlbumCromo(id, catalog, search = '', category = 'TODOS') {
  if (typeof id !== 'string' || (category !== 'TODOS' && id.split('_')[0] !== category)) return false;
  const metadata = catalog[id] || {};
  const haystack = normalizeAlbumSearch([id, metadata.name, metadata.categoria, metadata.pos, metadata.nacionalidad].join(' '));
  return normalizeAlbumSearch(search).split(/\s+/).filter(Boolean).every(term => haystack.includes(term));
}

export function filterAlbumInventory(items, catalog, { search = '', category = 'TODOS', status = 'todos', sort = 'id' } = {}) {
  const matchesStatus = item => ({
    todos: true,
    para_pegar: item.paraPegar,
    repetidas: item.repetidas > 0,
    pegadas: item.pegada,
    disponibles: item.disponiblesMercado > 0,
  })[status] ?? false;
  const result = items.filter(item => matchesStatus(item) && matchesAlbumCromo(item.id, catalog, search, category));
  return result.sort((a, b) => {
    if (sort === 'cantidad') return b.cantidad - a.cantidad || naturalOrder.compare(a.id, b.id);
    if (sort === 'disponibles') return b.disponiblesMercado - a.disponiblesMercado || naturalOrder.compare(a.id, b.id);
    if (sort === 'nombre') return naturalOrder.compare(catalog[a.id]?.name || a.id, catalog[b.id]?.name || b.id) || naturalOrder.compare(a.id, b.id);
    const categoryA = ALBUM_CATEGORIES.findIndex(category => category.id === a.id.split('_')[0]);
    const categoryB = ALBUM_CATEGORIES.findIndex(category => category.id === b.id.split('_')[0]);
    return categoryA - categoryB || naturalOrder.compare(a.id, b.id);
  });
}

export function albumOfferAvailability(offer, inventory, now = Date.now()) {
  if (Number(offer?.version_mercado) !== 2) return { canAccept: false, reason: 'Oferta anterior: pendiente de revisión.' };
  if (!isLiveAlbumOffer(offer, now)) return { canAccept: false, reason: 'Esta oferta ya no está disponible.' };
  const payment = inventory.find(item => item.id === offer.cromo_pide);
  if (!payment || payment.cantidad <= 1) return { canAccept: false, reason: `Te falta una repetida de ${offer.cromo_pide}.` };
  if (payment.disponiblesMercado <= 0) return { canAccept: false, reason: 'Tus copias de este cromo están reservadas en otras ofertas.' };
  return { canAccept: true, reason: 'Puedes intercambiar conservando una copia.' };
}

export function filterAlbumOffers(offers, catalog, inventory, { search = '', category = 'TODOS', onlyAvailable = false, onlyMissing = false, now = Date.now() } = {}) {
  const held = new Set(inventory.map(item => item.id));
  return offers.filter(offer => {
    if (Number(offer.version_mercado) !== 2 || !isLiveAlbumOffer(offer, now)) return false;
    if (onlyAvailable && !albumOfferAvailability(offer, inventory, now).canAccept) return false;
    if (onlyMissing && held.has(offer.cromo_ofrece)) return false;
    const categoryMatches = category === 'TODOS' || offer.cromo_ofrece?.split('_')[0] === category || offer.cromo_pide?.split('_')[0] === category;
    const text = normalizeAlbumSearch([offer.cromo_ofrece, offer.cromo_pide, catalog[offer.cromo_ofrece]?.name, catalog[offer.cromo_pide]?.name, catalog[offer.cromo_ofrece]?.categoria, catalog[offer.cromo_pide]?.categoria, offer.perfiles?.discord_nombre].join(' '));
    return categoryMatches && normalizeAlbumSearch(search).split(/\s+/).filter(Boolean).every(term => text.includes(term));
  });
}

export function albumTimeRemaining(expiresAt, now = Date.now()) {
  const remaining = Date.parse(expiresAt) - now;
  if (!Number.isFinite(remaining) || remaining <= 0) return 'Vencida';
  const minutes = Math.ceil(remaining / 60000);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h${minutes % 60 ? ` ${minutes % 60} min` : ''}`;
  return `${Math.floor(hours / 24)} d${hours % 24 ? ` ${hours % 24} h` : ''}`;
}

export function albumErrorMessage(error, fallback = 'No se pudo completar la operación. Inténtalo de nuevo.') {
  const code = `${error?.details || ''} ${error?.message || ''}`;
  if (['PGRST202', 'PGRST204', '42703', '42883'].includes(error?.code)) return 'Falta activar la actualización del álbum en Supabase. El administrador debe ejecutar ComandosSQL.txt.';
  const reasons = {
    ALBUM_NO_COPIES: 'Ya no tienes una repetida disponible para este intercambio. Actualiza tu inventario.',
    ALBUM_NO_PACKS: 'No te quedan sobres disponibles. Tu colección sigue guardada.',
    ALBUM_WEIGHTS_UNAVAILABLE: 'El administrador debe revisar los pesos de los cromos antes de abrir sobres.',
    ALBUM_OFFER_LIMIT: 'Puedes mantener hasta 2 ofertas activas. Cancela una o espera a que venza.',
    ALBUM_OFFER_UNAVAILABLE: 'La oferta ya fue aceptada, cancelada o venció. Actualiza el mercado.',
    ALBUM_LEGACY_OFFER: 'Esta oferta pertenece al mercado anterior y necesita revisión del administrador.',
    ALBUM_INVALID_CROMO: 'El cromo seleccionado no pertenece a esta colección.',
    ALBUM_INVALID_CARD: 'El cromo seleccionado no pertenece a esta colección.',
    ALBUM_SAME_CROMO: 'Elige dos cromos diferentes para intercambiar.',
    ALBUM_SELF_OFFER: 'No puedes aceptar tu propia oferta.',
    ALBUM_UNAUTHENTICATED: 'Tu sesión terminó. Vuelve a iniciar sesión.',
    ALBUM_AUTH_REQUIRED: 'Tu sesión terminó. Vuelve a iniciar sesión.',
    ALBUM_PROFILE_MISSING: 'No encontramos tu perfil. Vuelve a iniciar sesión antes de continuar.',
    ALBUM_REQUEST_REQUIRED: 'La solicitud no es válida. Actualiza la página antes de continuar.',
    ALBUM_PACK_SIZE_UNCONFIGURED: 'El administrador debe configurar la cantidad de cartas del sobre anterior con el último bloque de ComandosSQL.txt.',
    ALBUM_NOT_OWNER: 'Solo puedes cancelar tus propias ofertas.',
    ALBUM_REQUEST_CONFLICT: 'La solicitud cambió. Revisa el resultado anterior antes de repetirla.',
  };
  return Object.entries(reasons).find(([key]) => code.includes(key))?.[1] || fallback;
}

export function isAmbiguousAlbumError(error) {
  return !error?.code || /^(?:NETWORK|FETCH|TIMEOUT)/i.test(error.code);
}

export function albumOperationParams(operation) {
  if (!operation || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(operation.requestId || '')) return null;
  if (operation.kind === 'create' && /^[A-Z]+_\d{3}$/.test(operation.ofrece || '') && /^[A-Z]+_\d{3}$/.test(operation.pide || '') && operation.ofrece !== operation.pide) {
    return { p_ofrece: operation.ofrece, p_pide: operation.pide, p_solicitud_id: operation.requestId };
  }
  if (['accept', 'cancel'].includes(operation.kind) && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(operation.offerId || '')) {
    return { p_oferta_id: operation.offerId, p_solicitud_id: operation.requestId };
  }
  return null;
}

export function isValidAlbumMarketReceipt(receipt, operation) {
  const expectedState = { create: 'activo', accept: 'completado', cancel: 'cancelado' }[operation?.kind];
  if (!expectedState || receipt?.success !== true || receipt.version_mercado !== 2 || receipt.estado !== expectedState || typeof receipt.oferta_id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(receipt.oferta_id)) return false;
  return operation.kind === 'create' || (typeof operation.offerId === 'string' && receipt.oferta_id.toLowerCase() === operation.offerId.toLowerCase());
}
