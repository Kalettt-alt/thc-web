export const MATCH_DISPLAY_KEY = 'thc-fantasy-display';
export const DEFAULT_MATCH_DISPLAY = Object.freeze({ detailedPitch: true, showRadar: true });

export function normalizeMatchDisplay(value) {
  return {
    detailedPitch: typeof value?.detailedPitch === 'boolean' ? value.detailedPitch : true,
    showRadar: typeof value?.showRadar === 'boolean' ? value.showRadar : true
  };
}

export function readMatchDisplay(storage) {
  try { return normalizeMatchDisplay(JSON.parse((storage ?? globalThis.localStorage).getItem(MATCH_DISPLAY_KEY))); }
  catch { return { ...DEFAULT_MATCH_DISPLAY }; }
}

export function saveMatchDisplay(value, storage) {
  try { (storage ?? globalThis.localStorage).setItem(MATCH_DISPLAY_KEY, JSON.stringify(normalizeMatchDisplay(value))); return true; }
  catch { return false; }
}
