import { useSyncExternalStore } from 'react';

const STORAGE_KEY = 'thc:home-motion:v1';
const listeners = new Set();
let motionEnabled;

function getSnapshot() {
  if (motionEnabled === undefined) {
    try { motionEnabled = window.localStorage.getItem(STORAGE_KEY) !== 'off'; }
    catch { motionEnabled = true; }
  }
  return motionEnabled;
}

function notify() {
  for (const listener of listeners) listener();
}

function onStorage(event) {
  if (event.key !== STORAGE_KEY && event.key !== null) return;
  motionEnabled = undefined;
  getSnapshot();
  notify();
}

function subscribe(listener) {
  if (!listeners.size) window.addEventListener('storage', onStorage);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (!listeners.size) window.removeEventListener('storage', onStorage);
  };
}

export function setHomeMotion(value) {
  motionEnabled = Boolean(value);
  try { window.localStorage.setItem(STORAGE_KEY, motionEnabled ? 'on' : 'off'); }
  catch { notify(); return; }
  notify();
}

export function useHomeMotion() {
  const enabled = useSyncExternalStore(subscribe, getSnapshot, () => false);
  return {
    motionEnabled: enabled,
    setMotionEnabled: setHomeMotion,
    toggleMotion: () => setHomeMotion(!getSnapshot()),
  };
}
