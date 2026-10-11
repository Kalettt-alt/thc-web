export async function deletePlaylistTrack(client, { trackId, userId, timeoutMs = 15000 }) {
  if (!trackId || !userId) throw new Error('Inicia sesión para eliminar esta canción.');
  const controller = new AbortController();
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      const error = new Error('No llegó la confirmación. Actualiza la página para comprobar el borrado antes de reintentar.');
      error.code = 'PLAYLIST_TIMEOUT';
      reject(error);
    }, timeoutMs);
  });
  try {
    return await Promise.race([timeout, (async () => {
      const { data: auth, error: authError } = await client.auth.getUser();
      if (controller.signal.aborted) throw new Error('Solicitud cancelada.');
      if (authError || auth?.user?.id !== userId) {
        throw Object.assign(new Error('Tu sesión cambió. Vuelve a entrar antes de eliminar canciones.'), { code: 'PLAYLIST_SESSION_CHANGED' });
      }
      const { data, error } = await client.from('PlaylistUT').delete()
        .eq('id', trackId).eq('user_id', userId).select('id').abortSignal(controller.signal);
      if (error) {
        const message = error.code === '42501'
          ? 'No tienes permiso para eliminar esta canción. Tu playlist se ha conservado.'
          : 'No llegó la confirmación. Actualiza la página para comprobar el borrado antes de reintentar.';
        throw Object.assign(new Error(message), { code: error.code });
      }
      if (!Array.isArray(data) || data.length !== 1 || data[0]?.id !== trackId) {
        throw Object.assign(new Error('No se pudo confirmar el borrado. Actualiza la página y vuelve a intentarlo.'), { code: 'PLAYLIST_NOT_DELETED' });
      }
      return trackId;
    })()]);
  } catch (error) {
    if (error.code) throw error;
    throw new Error('No llegó la confirmación. Actualiza la página para comprobar el borrado antes de reintentar.', { cause: error });
  } finally {
    clearTimeout(timer);
  }
}

export function playlistAfterDeletion(playlist, currentIdx, trackId) {
  const deletedIndex = playlist.findIndex(song => song.id === trackId);
  if (deletedIndex < 0) return { playlist, currentIdx, removedCurrent: false };
  const remaining = playlist.filter(song => song.id !== trackId);
  const removedCurrent = deletedIndex === currentIdx;
  const nextIndex = removedCurrent
    ? Math.max(0, Math.min(currentIdx, remaining.length - 1))
    : deletedIndex < currentIdx ? Math.max(0, currentIdx - 1) : currentIdx;
  return { playlist: remaining, currentIdx: nextIndex, removedCurrent };
}
