import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../../utils/supabase';
import { createFantasyDrinkClient, drinkErrorMessage, pendingFantasyDrink } from './fantasyDrinks';
import { saveFantasySnapshot } from './fantasyPersistence';

export default function useFantasyDrinks({ userId, snapshot, persistence, onRecovered }) {
  const [count, setCount] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(() => { try { return Boolean(pendingFantasyDrink(localStorage, userId)); } catch { return false; } });
  const using = useRef(false);
  const mounted = useRef(false);
  const activeUser = useRef(null);
  const actor = useMemo(() => createFantasyDrinkClient(supabase, userId, {
    storage: { getItem: key => localStorage.getItem(key), setItem: (key, value) => localStorage.setItem(key, value), removeItem: key => localStorage.removeItem(key) },
    isActive: () => mounted.current && activeUser.current === userId
  }), [userId]);

  const refresh = useCallback(async () => {
    if (!userId) return;
    try {
      const result = await actor.status();
      if (!mounted.current || activeUser.current !== userId) return;
      setCount(result.bebidas);
      setPending(Boolean(actor.pending()));
      setError('');
    } catch (failure) {
      if (mounted.current && activeUser.current === userId) setError(drinkErrorMessage(failure));
    }
  }, [actor, userId]);

  useEffect(() => {
    mounted.current = true;
    activeUser.current = userId;
    void Promise.resolve().then(refresh);
    return () => { mounted.current = false; activeUser.current = null; };
  }, [refresh, userId]);

  const consume = async summary => {
    if (using.current) return { ok: false, error: 'La bebida se está confirmando.' };
    using.current = true;
    setBusy(true);
    setError('');
    const matchSnapshot = summary ? { ...snapshot, titulares: summary.lineup, reservas: summary.reservas, tactica: summary.formation || snapshot.tactica } : snapshot;
    try {
      await persistence.pauseForDelete();
      const result = await actor.consume({
        energiaRevision: snapshot.energia_revision || 0,
        beforeConsume: () => saveFantasySnapshot(supabase, matchSnapshot, userId, () => mounted.current && activeUser.current === userId)
      });
      if (!mounted.current || activeUser.current !== userId) return { ok: false, error: 'La bebida se guardó. Vuelve a abrir la carrera.' };
      onRecovered({ ...result, formation: summary?.formation || snapshot.tactica });
      setCount(result.bebidas);
      setPending(false);
      return { ok: true, remaining: result.bebidas, ...result };
    } catch (failure) {
      const message = drinkErrorMessage(failure);
      if (mounted.current && activeUser.current === userId) {
        setError(message);
        let uncertain;
        try { uncertain = Boolean(actor.pending()); } catch { uncertain = false; }
        setPending(uncertain);
      }
      return { ok: false, error: message };
    } finally {
      using.current = false;
      if (mounted.current && activeUser.current === userId) setBusy(false);
      let uncertain;
      try { uncertain = Boolean(actor.pending()); } catch { uncertain = false; }
      if (mounted.current && activeUser.current === userId && !uncertain) persistence.resume();
    }
  };

  return { count, busy, error, pending, refresh, consume };
}
