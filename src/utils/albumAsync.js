export function withAlbumTimeout(promise, ms = 20000) {
  if (!Number.isFinite(ms) || ms <= 0) return Promise.reject(new RangeError('El tiempo de espera debe ser positivo.'));
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const error = new Error('La conexión tardó demasiado en responder.');
      error.code = 'NETWORK_TIMEOUT';
      reject(error);
    }, ms);
  });
  return Promise.race([Promise.resolve(promise), timeout]).finally(() => clearTimeout(timer));
}
