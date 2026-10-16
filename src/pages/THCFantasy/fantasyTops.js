export const FANTASY_TOPS_PAGE_SIZE = 25;

export function fantasyRayosForResult(ours, theirs) {
  if (![ours, theirs].every(score => Number.isInteger(score) && score >= 0 && score <= 30)) throw new Error('Marcador inválido.');
  return ours > theirs ? 2 : ours === theirs ? 1 : -1;
}

export function fantasyTopsError(error) {
  if (['PGRST202', '42883', '42P01'].includes(error?.code)) return 'TOPS está pendiente de activar en Supabase.';
  if (error?.code === '42501') return 'Inicia sesión para consultar la clasificación global.';
  if (error?.name === 'AbortError') return 'La clasificación tardó demasiado. Vuelve a intentarlo.';
  return 'No se pudo cargar TOPS. Revisa tu conexión y vuelve a intentarlo.';
}

export function confirmFantasyTops(data) {
  const totals = value => value && ['rayos', 'victorias', 'empates', 'derrotas'].every(key => Number.isSafeInteger(value[key])) && value.victorias >= 0 && value.empates >= 0 && value.derrotas >= 0;
  if (!data || !Number.isSafeInteger(data.total) || data.total < 0 || !Number.isInteger(data.offset) || data.offset < 0 || !Array.isArray(data.jugadores) || data.jugadores.length > 50 || data.yo !== null && !totals(data.yo)) throw new Error('La respuesta de TOPS está incompleta.');
  if (data.jugadores.some(person => !totals(person) || !Number.isSafeInteger(person.posicion) || person.posicion < 1 || typeof person.nombre !== 'string' || person.perfil_id !== null && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(person.perfil_id))) throw new Error('La clasificación de TOPS está incompleta.');
  return data;
}
