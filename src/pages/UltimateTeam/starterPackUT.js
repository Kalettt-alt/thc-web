import { cardStatFields, isUtSchemaMissing } from './utCards.js';
import { STARTER_PACK_SIZE, STARTER_POOL_SIZE, STARTER_ALLOWED_POSITIONS } from './data/starterPoolUT.js';

export function validateStarterReceipt(data) {
  if (!data || data.pool_size!==STARTER_POOL_SIZE || !Array.isArray(data.cartas) || data.cartas.length!==STARTER_PACK_SIZE ||
      new Set(data.cartas.map(player=>player?.id)).size!==STARTER_PACK_SIZE ||
      data.cartas.some(player=>!/^p(?:[1-9]|[1-5]\d|6[0-7])$/.test(player?.id||'') || typeof player.nombre!=='string' || !STARTER_ALLOWED_POSITIONS.includes(player.pos) || !Number.isInteger(player.grl) || player.grl<0 || player.grl>99 || cardStatFields(player).some(([key])=>!Number.isInteger(player[key])||player[key]<0||player[key]>99))) {
    throw new Error('No se pudo confirmar el sobre inicial. Vuelve a intentarlo.');
  }
  return data.cartas;
}

export async function openStarterPackUT(client) {
  const {data:{user},error:authError}=await client.auth.getUser();
  if(authError||!user)throw new Error('Inicia sesión para abrir tu sobre inicial.');
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),15000);
  try {
    const request=client.rpc('thc_ut_abrir_sobre_inicial');
    const {data,error}=await(request.abortSignal?request.abortSignal(controller.signal):request);
    if(isUtSchemaMissing(error))throw new Error('El sobre inicial necesita la actualización de Supabase. Pide al administrador activar el catálogo inicial.');
    if(error)throw error;
    return validateStarterReceipt(data);
  } finally { clearTimeout(timeout); }
}

export async function readStarterCardsUT(client) {
  const request=client.rpc('thc_ut_cartas_iniciales');
  const {data,error}=await request;
  if(isUtSchemaMissing(error))return []; // Older clubs keep their saved squad until the migration is installed.
  if(error)throw error;
  return Array.isArray(data)?data:[];
}
