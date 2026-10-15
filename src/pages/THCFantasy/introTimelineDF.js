export const INTRO_DURATION_MS = 40000;
export const INTRO_SCENE_TIMES_MS = [0, 6200, 12900, 19600, 26500, 33400];

// El reloj y Saltar intro comparten una finalización única; desmontar cancela todo.
export function createIntroTimeline({ onPhase, onComplete, duration = INTRO_DURATION_MS, timers = globalThis }) {
  let stopped = false;
  const pending = new Set();
  const clear = () => { for (const timer of pending) timers.clearTimeout(timer); pending.clear(); };
  const finish = () => {
    if (stopped) return false;
    stopped = true;
    clear();
    onComplete();
    return true;
  };
  const cancel = () => { stopped = true; clear(); };
  for (let phase = 1; phase < INTRO_SCENE_TIMES_MS.length; phase++) {
    pending.add(timers.setTimeout(() => { if (!stopped) onPhase(phase); }, Math.round(duration * INTRO_SCENE_TIMES_MS[phase] / INTRO_DURATION_MS)));
  }
  pending.add(timers.setTimeout(finish, duration));
  return { finish, cancel };
}

export function createContractSigning({ onStamp, onTransition = () => {}, onComplete, timers = globalThis }) {
  let cancelled = false;
  const pending = [];
  pending.push(timers.setTimeout(() => { if (!cancelled) onStamp(); }, 1150));
  pending.push(timers.setTimeout(() => { if (!cancelled) onTransition(); }, 2150));
  pending.push(timers.setTimeout(() => {
    if (cancelled) return;
    cancelled = true;
    onComplete();
  }, 3300));
  return { cancel: () => { cancelled = true; pending.forEach(timer => timers.clearTimeout(timer)); } };
}
