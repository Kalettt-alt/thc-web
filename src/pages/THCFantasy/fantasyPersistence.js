export async function saveFantasySnapshot(client, snapshot, userId, shouldSave = () => true, timeoutMs = 15000) {
  const request = async operation => {
    let timer;
    const controller = new AbortController();
    const bounded = typeof operation?.abortSignal === 'function' ? operation.abortSignal(controller.signal) : operation;
    try {
      return await Promise.race([bounded, new Promise((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(new Error('No se confirmó el guardado a tiempo. Revisa tu conexión y vuelve a intentarlo.')); }, timeoutMs); })]);
    } finally { clearTimeout(timer); }
  };
  const { data: { user }, error: authError } = await request(client.auth.getUser());
  if (authError || !user || !userId || user.id !== userId) throw new Error('Inicia sesión con la cuenta de esta carrera para guardar tu progreso.');
  if (!shouldSave()) return false;
  if (typeof client.rpc === 'function') {
    const { data, error } = await request(client.rpc('thc_fantasy_guardar', {
      p_partida: snapshot,
      p_energia_revision: snapshot.energia_revision || 0
    }));
    if (!error) {
      if (!data?.id) throw new Error('El servidor no confirmó el guardado.');
      return true;
    }
    if (error.code !== 'PGRST202' && error.code !== '42883') {
      if (error.code === '40001') throw new Error('La energía cambió en otra pestaña. Recarga para recuperar la carrera actual.');
      throw error;
    }
    if (!shouldSave()) return false;
  }
  const legacySnapshot = Object.fromEntries(Object.entries(snapshot).filter(([key]) => key !== 'energia_revision'));
  const { data, error } = await request(client.from('fantasy_partidas').upsert({
    ...legacySnapshot, user_id: userId, actualizado_en: new Date().toISOString()
  }, { onConflict: 'user_id' }).select('id').single());
  if (error) throw error;
  if (!data) throw new Error('El servidor no confirmó el guardado.');
  return true;
}
