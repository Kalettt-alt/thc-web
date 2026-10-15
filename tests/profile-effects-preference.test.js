import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../src/pages/Perfil/useProfileEffects.js', import.meta.url), 'utf8');
const moduleUrl = javascript => `data:text/javascript,${encodeURIComponent(javascript)}`;
const reactMock = moduleUrl(`export function useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot) {
  globalThis.__profileEffectsTest.subscribe = subscribe;
  globalThis.__profileEffectsTest.serverSnapshot = getServerSnapshot;
  return getSnapshot();
}`);
const motionMock = moduleUrl('export function useReducedMotion() { return globalThis.__profileEffectsTest.reduced; }');
let sequence = 0;

// Replace only imported hooks: the preference/store implementation remains the real source.
async function loadHook({ preference, reduced = false, storageBlocked = false } = {}) {
  const stored = new Map([['thc:home-motion:v1', 'off']]);
  if (preference !== undefined) stored.set('thc:profile-effects:v1', preference);
  const listeners = new Map();
  const harness = { reduced };
  globalThis.__profileEffectsTest = harness;
  globalThis.window = {
    localStorage: {
      getItem(key) { if (storageBlocked) throw new Error('Blocked'); return stored.get(key) ?? null; },
      setItem(key, value) { if (storageBlocked) throw new Error('Blocked'); stored.set(key, value); },
    },
    addEventListener(name, callback) { listeners.set(name, callback); },
    removeEventListener(name, callback) { if (listeners.get(name) === callback) listeners.delete(name); },
  };
  const injected = source.replace("from 'react'", `from '${reactMock}'`).replace("from 'framer-motion'", `from '${motionMock}'`);
  const { useProfileEffects } = await import(moduleUrl(`${injected}\n// isolated preference test ${++sequence}`));
  return { render: useProfileEffects, harness, listeners, stored };
}

test('Auto respeta la preferencia del sistema y nunca hereda la pausa del inicio', async () => {
  try {
    for (const [reduced, expected] of [[false, 'full'], [true, 'calm'], [null, 'calm']]) {
      const env = await loadHook({ reduced });
      assert.equal(env.render().preference, 'auto');
      assert.equal(env.render().effectsMode, expected);
      assert.equal(env.harness.serverSnapshot(), 'auto');
    }
    const invalid = await loadHook({ preference: 'injected-class', reduced: false });
    assert.equal(invalid.render().effectsMode, 'full');
    assert.equal(invalid.render().preference, 'auto');
  } finally { delete globalThis.window; delete globalThis.__profileEffectsTest; }
});

test('Animados es una elección explícita y Pausados/Suaves se conservan entre vistas', async () => {
  try {
    for (const preference of ['full', 'calm', 'off']) {
      const env = await loadHook({ preference, reduced: true });
      assert.equal(env.render().effectsMode, preference);
      let notifications = 0;
      const unsubscribe = env.harness.subscribe(() => notifications++);
      env.render().setPreference('auto');
      assert.equal(env.render().effectsMode, 'calm');
      assert.equal(env.stored.get('thc:profile-effects:v1'), 'auto');
      assert.equal(notifications, 1);
      env.render().setPreference('invalid');
      assert.equal(notifications, 1);
      unsubscribe();
      assert.equal(env.listeners.size, 0);
    }
  } finally { delete globalThis.window; delete globalThis.__profileEffectsTest; }
});

test('sin almacenamiento el control sigue funcionando y las otras pestañas sincronizan solo su clave', async () => {
  try {
    const blocked = await loadHook({ storageBlocked: true });
    blocked.render().setPreference('off');
    assert.equal(blocked.render().effectsMode, 'off');

    const env = await loadHook({ preference: 'full' });
    env.render();
    let notifications = 0;
    const cleanupFirst = env.harness.subscribe(() => notifications++);
    const cleanupSecond = env.harness.subscribe(() => notifications++);
    assert.equal(env.listeners.size, 1);
    env.stored.set('thc:profile-effects:v1', 'off');
    env.listeners.get('storage')({ key: 'thc:home-motion:v1' });
    assert.equal(env.render().effectsMode, 'full');
    assert.equal(notifications, 0);
    env.listeners.get('storage')({ key: 'thc:profile-effects:v1' });
    assert.equal(env.render().effectsMode, 'off');
    assert.equal(notifications, 2);
    cleanupFirst();
    assert.equal(env.listeners.size, 1);
    cleanupSecond();
    assert.equal(env.listeners.size, 0);
  } finally { delete globalThis.window; delete globalThis.__profileEffectsTest; }
});
