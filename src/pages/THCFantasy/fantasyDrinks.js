const requestKey = userId => `thc:fantasy:drink-request:${userId}`;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function pendingFantasyDrink(storage, userId) {
  const value = storage.getItem(requestKey(userId));
  return value && UUID.test(value) ? value : null;
}

export function validateDrinkReceipt(data, consumed = false) {
  if (!data || !Number.isInteger(data.bebidas) || data.bebidas < 0 || data.bebidas > 2) throw new Error('El servidor no confirmó tus Bebidas THC.');
  if (consumed && (!Number.isSafeInteger(data.energia_revision) || data.energia_revision < 1 || !data.titulares || Array.isArray(data.titulares) || typeof data.titulares !== 'object' || !Array.isArray(data.reservas))) throw new Error('No se confirmó la recuperación de tu plantilla. Vuelve a consultar el uso.');
  return data;
}

export function drinkErrorMessage(error) {
  if (error?.code === 'PGRST202' || error?.code === '42883') return 'Bebida THC está pendiente de activar. Puedes seguir jugando.';
  if (error?.code === '40001') return 'La carrera cambió en otra pestaña. Recarga antes de continuar.';
  if (/failed to fetch|network|fetcherror/i.test(error?.message || '')) return 'Se perdió la conexión. Confirma el mismo uso para recuperar el resultado.';
  return error?.message || 'No se pudo confirmar la bebida. Reintenta el mismo uso.';
}

export function createFantasyDrinkClient(client, userId, { storage, makeId = () => crypto.randomUUID(), isActive = () => true, timeoutMs = 15000 } = {}) {
  let inFlight = null;
  const withDeadline = async operation => {
    let timer;
    const controller = new AbortController();
    const bounded = typeof operation?.abortSignal === 'function' ? operation.abortSignal(controller.signal) : operation;
    try {
      return await Promise.race([bounded, new Promise((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(new Error('La conexión está tardando. Reintenta para confirmar el mismo uso.')); }, timeoutMs); })]);
    } finally { clearTimeout(timer); }
  };
  const authenticate = async () => {
    const { data: { user } = {}, error } = await withDeadline(client.auth.getUser());
    if (error || !user || user.id !== userId) throw new Error('Inicia sesión con la cuenta de esta carrera.');
    if (!isActive()) throw new Error('La carrera ya no está abierta.');
  };
  return {
    async status() {
      await authenticate();
      const { data, error } = await withDeadline(client.rpc('thc_fantasy_bebidas_estado'));
      if (error) throw error;
      return validateDrinkReceipt(data);
    },
    pending() { return pendingFantasyDrink(storage, userId); },
    consume({ beforeConsume, energiaRevision = 0 } = {}) {
      if (inFlight) return inFlight;
      inFlight = (async () => {
        await authenticate();
        let id = pendingFantasyDrink(storage, userId);
        if (!id) {
          if (beforeConsume) await withDeadline(beforeConsume());
          if (!isActive()) throw new Error('La carrera ya no está abierta.');
          id = makeId();
          if (!UUID.test(id)) throw new Error('No se pudo preparar el uso de la bebida.');
          storage.setItem(requestKey(userId), id);
        }
        const { data, error } = await withDeadline(client.rpc('thc_fantasy_usar_bebida', { p_solicitud_id: id, p_energia_revision: energiaRevision }));
        if (error) {
          if (['42501', 'P0001', 'P0002', '22023', '40001', 'PGRST202', '42883'].includes(error.code)) storage.removeItem(requestKey(userId));
          throw error;
        }
        const result = validateDrinkReceipt(data, true);
        storage.removeItem(requestKey(userId));
        return result;
      })().finally(() => { inFlight = null; });
      return inFlight;
    }
  };
}
