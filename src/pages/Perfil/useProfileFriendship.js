import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../../utils/supabase';
import { changeProfileFriendship, emitProfileFriendsChange, getProfileFriendship, listProfileFriends, PROFILE_FRIENDS_EVENT } from '../../utils/profileFriends';

function useFriendsResource({ profileId, actorId, loader, enabled = true }) {
  const key = `${actorId || 'public'}:${profileId || ''}`;
  const [resource, setResource] = useState({ key: null, data: null, error: '', loading: false });
  const lifecycle = useRef(null);
  const refresh = useCallback(async () => {
    const cycle = lifecycle.current;
    if (!cycle?.active || cycle.key !== key || !enabled) return;
    cycle.controller?.abort();
    const controller = new AbortController();
    cycle.controller = controller;
    const sequence = ++cycle.sequence;
    // Defer the pending state so effect-driven refreshes do not synchronously rerender.
    await Promise.resolve();
    if (!cycle.active || sequence !== cycle.sequence) return;
    setResource(previous => ({ key, data: previous.key === key ? previous.data : null, error: '', loading: true }));
    try {
      const data = await loader(supabase, profileId, { signal: controller.signal });
      if (cycle.active && sequence === cycle.sequence) setResource({ key, data, error: '', loading: false });
    } catch (error) {
      if (cycle.active && sequence === cycle.sequence && !controller.signal.aborted) setResource(previous => ({ key, data: previous.key === key ? previous.data : null, error: error.message, loading: false }));
    }
  }, [key, profileId, loader, enabled]);

  const replace = useCallback(data => {
    const cycle = lifecycle.current;
    if (!cycle?.active || cycle.key !== key) return false;
    ++cycle.sequence;
    cycle.controller?.abort();
    setResource({ key, data, error: '', loading: false });
    return true;
  }, [key]);

  useEffect(() => {
    const cycle = { active: true, key, sequence: 0, controller: null, focusedAt: 0 };
    lifecycle.current = cycle;
    if (enabled) void refresh();
    const focus = () => {
      if (document.visibilityState === 'hidden' || Date.now() - cycle.focusedAt < 1200) return;
      cycle.focusedAt = Date.now();
      void refresh();
    };
    const changed = event => {
      const profiles = event.detail?.profiles;
      if (!profiles?.length || profiles.includes(profileId)) void refresh();
    };
    window.addEventListener('focus', focus);
    document.addEventListener('visibilitychange', focus);
    window.addEventListener(PROFILE_FRIENDS_EVENT, changed);
    return () => {
      cycle.active = false;
      ++cycle.sequence;
      cycle.controller?.abort();
      window.removeEventListener('focus', focus);
      document.removeEventListener('visibilitychange', focus);
      window.removeEventListener(PROFILE_FRIENDS_EVENT, changed);
    };
  }, [key, profileId, enabled, refresh]);

  const current = resource.key === key ? resource : { data: null, loading: enabled, error: '' };
  return { ...current, refresh, replace };
}

export function useProfileFriendship({ profileId, actorId, isOwnProfile = false, onRelationshipChange }) {
  const enabled = Boolean(actorId && profileId && !isOwnProfile && actorId !== profileId);
  const resource = useFriendsResource({ profileId, actorId, loader: getProfileFriendship, enabled });
  const [mutation, setMutation] = useState(null);
  const lock = useRef(null);
  const identity = `${actorId || ''}:${profileId || ''}`;
  const activeIdentity = useRef(null);
  useEffect(() => {
    activeIdentity.current = { identity };
    return () => { activeIdentity.current = null; };
  }, [identity]);

  const act = useCallback(async action => {
    if (!enabled || lock.current?.identity === identity) return null;
    const request = { identity };
    const activeCycle = activeIdentity.current;
    lock.current = request;
    setMutation({ identity, action, error: '' });
    try {
      const confirmed = await changeProfileFriendship(supabase, profileId, action);
      emitProfileFriendsChange([actorId, profileId]);
      if (activeIdentity.current === activeCycle && activeCycle?.identity === identity) {
        resource.replace(confirmed);
        setMutation(null);
        onRelationshipChange?.(confirmed);
      }
      return confirmed;
    } catch (error) {
      if (activeIdentity.current === activeCycle && activeCycle?.identity === identity) setMutation({ identity, action: null, error: error.message });
      return null;
    } finally { if (lock.current === request) lock.current = null; }
  }, [enabled, identity, actorId, profileId, resource, onRelationshipChange]);

  const retry = useCallback(() => {
    if (lock.current?.identity === identity) return;
    setMutation(null);
    return resource.refresh();
  }, [resource, identity]);

  return {
    state: enabled ? resource.data?.estado : isOwnProfile || actorId === profileId ? 'self' : 'signed-out',
    loading: enabled && resource.loading,
    pending: mutation?.identity === identity ? mutation.action : null,
    error: mutation?.identity === identity && mutation.error ? mutation.error : resource.error,
    refresh: retry,
    act,
  };
}

export function useProfileFriends({ profileId, actorId }) {
  return useFriendsResource({ profileId, actorId, loader: listProfileFriends, enabled: Boolean(profileId) });
}
