import { isUtSchemaMissing } from './utCards.js';

export async function saveUtSquad(client, squad, expectedUserId) {
  const { data: { user }, error: authError } = await client.auth.getUser();
  if (authError || !user || user.id !== expectedUserId) throw new Error('Tu sesión cambió. Vuelve a entrar al club.');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const request = client.rpc('thc_ut_guardar_plantilla', { p_plantilla: { formacion: squad.formacion, titulares: squad.titulares, suplentes: squad.suplentes, reservas: squad.reservas } });
    let result = await (request.abortSignal ? request.abortSignal(controller.signal) : request);
    if (isUtSchemaMissing(result.error) && ![...squad.titulares,...squad.suplentes,...squad.reservas].some(p => p?.club_carta_id)) {
      const fallback = client.from('plantillas_ut').upsert({user_id:user.id,formacion:squad.formacion,titulares:squad.titulares,suplentes:squad.suplentes,reservas:squad.reservas,actualizado_en:new Date().toISOString()},{onConflict:'user_id'}).select('formacion,titulares,suplentes,reservas').single();
      result = await (fallback.abortSignal ? fallback.abortSignal(controller.signal) : fallback);
    }
    if (result.error) throw result.error;
    const saved = Array.isArray(result.data) ? result.data[0] : result.data;
    if (!saved || !Array.isArray(saved.titulares)) throw new Error('No se pudo confirmar el guardado. Vuelve a intentarlo.');
    return saved;
  } finally { clearTimeout(timeout); }
}
