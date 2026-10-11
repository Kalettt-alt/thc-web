export function createDebouncedStorageWriter({ write, onError, delay = 500 }) {
  let timer;
  let pending;
  const flush = () => {
    clearTimeout(timer);
    timer = undefined;
    if (!pending) return;
    const snapshot = pending;
    pending = undefined;
    try {
      write(snapshot.key, JSON.stringify(snapshot.value));
    } catch (error) {
      onError?.(error);
    }
  };
  return {
    queue(key, value) {
      clearTimeout(timer);
      pending = { key, value };
      timer = setTimeout(flush, delay);
    },
    flush,
  };
}