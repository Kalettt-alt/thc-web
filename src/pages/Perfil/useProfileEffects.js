import { useSyncExternalStore } from 'react';
import { useReducedMotion } from 'framer-motion';

const KEY = 'thc:profile-effects:v1';
const VALID = new Set(['auto', 'full', 'calm', 'off']);
const listeners = new Set();
let preference;

function getPreference() {
  if (preference === undefined) {
    try {
      const stored = window.localStorage.getItem(KEY);
      preference = VALID.has(stored) ? stored : 'auto';
    } catch { preference = 'auto'; }
  }
  return preference;
}

function changed(event) {
  if (event.key !== KEY && event.key !== null) return;
  preference = undefined;
  for (const listener of listeners) listener();
}

function subscribe(listener) {
  if (!listeners.size) window.addEventListener('storage', changed);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (!listeners.size) window.removeEventListener('storage', changed);
  };
}

function setPreference(value) {
  if (!VALID.has(value)) return;
  preference = value;
  try { window.localStorage.setItem(KEY, value); } catch { /* The choice still works for this visit. */ }
  for (const listener of listeners) listener();
}

export function useProfileEffects() {
  const selected = useSyncExternalStore(subscribe, getPreference, () => 'auto');
  const reducedMotion = useReducedMotion();
  return { preference: selected, effectsMode: selected === 'auto' ? (reducedMotion === false ? 'full' : 'calm') : selected, setPreference };
}
