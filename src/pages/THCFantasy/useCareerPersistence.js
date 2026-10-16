import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../../utils/supabase';
import { saveFantasySnapshot } from './fantasyPersistence';

export default function useCareerPersistence(snapshot, userId) {
  const [savedKey, setSavedKey] = useState(null);
  const [failedKey, setFailedKey] = useState(null);
  const [paused, setPaused] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [rayos, setRayos] = useState(null);
  const chain = useRef(Promise.resolve());
  const version = useRef(0);
  const pending = useRef(null);
  const deleting = useRef(false);
  const mounted = useRef(false);
  const snapshotKey = JSON.stringify(snapshot);

  const enqueue = useCallback((entry, currentVersion) => {
    chain.current = chain.current.catch(() => {}).then(async () => {
      if (currentVersion !== version.current || deleting.current) return;
      try {
        const saved = await saveFantasySnapshot(supabase, entry.snapshot, userId, () => currentVersion === version.current && !deleting.current, 15000, result => {
          if (mounted.current && Number.isSafeInteger(result.rayos)) setRayos(result.rayos);
          if (mounted.current && [2, 1, -1].includes(result.rayos_delta)) toast(`${result.rayos_delta > 0 ? '+' : '−'}${Math.abs(result.rayos_delta)} ${Math.abs(result.rayos_delta) === 1 ? 'rayo' : 'rayos'} · TOPS`, { icon: '⚡', id: `fantasy-rayos-${result.id}-${entry.snapshot.jornada_actual}` });
        });
        if (!saved) return;
        if (currentVersion === version.current) {
          pending.current = null;
          toast.dismiss('fantasy-save-error');
          if (mounted.current) {
            setSavedKey(entry.key);
            setFailedKey(null);
          }
        }
      } catch (error) {
        console.error('Error guardando carrera:', error);
        if (currentVersion === version.current) {
          if (mounted.current) setFailedKey(entry.key);
          toast.error(error instanceof Error ? error.message : 'No se pudo guardar tu carrera. Vuelve a intentarlo.', { id: 'fantasy-save-error' });
        }
      }
    });
    return chain.current;
  }, [userId]);

  const flushPending = useCallback(() => {
    if (pending.current && !deleting.current) enqueue(pending.current, ++version.current);
  }, [enqueue]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      flushPending();
    };
  }, [flushPending]);

  useEffect(() => {
    if (paused || !snapshot) return;
    const entry = { snapshot, key: snapshotKey };
    pending.current = entry;
    const currentVersion = ++version.current;
    const timer = setTimeout(() => enqueue(entry, currentVersion), 1000);
    return () => clearTimeout(timer);
  }, [snapshot, snapshotKey, attempt, paused, enqueue]);

  const retry = () => { setFailedKey(null); setAttempt(value => value + 1); };
  const pauseForDelete = async () => {
    deleting.current = true;
    pending.current = null;
    ++version.current;
    setPaused(true);
    await chain.current;
  };
  const resume = () => { deleting.current = false; setPaused(false); retry(); };
  const saveError = failedKey === snapshotKey;
  const isSaving = !!snapshot && !paused && !saveError && savedKey !== snapshotKey;

  useEffect(() => {
    if (paused || (!isSaving && !saveError)) return;
    const warnUnsaved = event => { if (!deleting.current) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', warnUnsaved);
    return () => window.removeEventListener('beforeunload', warnUnsaved);
  }, [isSaving, saveError, paused]);

  return { isSaving, saveError, retry, pauseForDelete, resume, rayos };
}
