import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../utils/supabase';
import { RUTAS } from '../../utils/rutas';
import { withAlbumTimeout } from '../../utils/albumAsync';
import PerfilVista from './PerfilVista';
import PerfilEdit from './PerfilEdit';

export default function Perfil({ session }) {
  const { username } = useParams();
  const profileIdRoute = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(username || '');
  const userId = session?.user?.id;
  const routeKey = username ? `public:${username}` : `owner:${userId || ''}`;
  const currentRoute = useRef(routeKey);
  const [snapshot, setSnapshot] = useState({ routeKey: '', perfil: null, etiquetas: [], error: '' });
  const [editingId, setEditingId] = useState(null);
  const [retry, setRetry] = useState(0);
  const profile = snapshot.routeKey === routeKey ? snapshot.perfil : null;
  const error = snapshot.routeKey === routeKey ? snapshot.error : '';
  const isOwnProfile = Boolean(userId && profile?.id === userId);

  useEffect(() => {
    currentRoute.current = routeKey;
    return () => { currentRoute.current = null; };
  }, [routeKey]);

  useEffect(() => {
    const queryValue = username || userId;
    if (!queryValue) return;
    let active = true;
    const controller = new AbortController();
    const load = async () => {
      try {
        const { data, error: queryError } = await withAlbumTimeout(supabase.from('perfiles').select('*').eq(username && !profileIdRoute ? 'discord_nombre' : 'id', queryValue).maybeSingle().abortSignal(controller.signal));
        if (queryError) throw queryError;
        if (!data) throw new Error('PROFILE_MISSING');
        const { data: tags } = await withAlbumTimeout(supabase.from('perfil_etiquetas').select('*').eq('user_id', data.id).abortSignal(controller.signal));
        if (active) setSnapshot({ routeKey, perfil: data, etiquetas: tags || [], error: '' });
      } catch (problem) {
        if (!active) return;
        controller.abort();
        setSnapshot({ routeKey, perfil: null, etiquetas: [], error: problem.message === 'PROFILE_MISSING' ? 'Este perfil no está disponible.' : 'No pudimos cargar el perfil. Puedes reintentar.' });
      }
    };
    load();
    return () => { active = false; controller.abort(); };
  }, [username, userId, profileIdRoute, routeKey, retry]);

  useEffect(() => {
    if (!profile?.id) return;
    let active = true;
    const watchedRoute = routeKey;
    const channel = supabase.channel(`profile-appearance:${profile.id}:${userId || 'guest'}`).on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'perfiles', filter: `id=eq.${profile.id}` }, payload => {
      if (!active || currentRoute.current !== watchedRoute || payload.new?.id !== profile.id) return;
      setSnapshot(previous => previous.routeKey === watchedRoute && previous.perfil?.id === payload.new.id ? { ...previous, perfil: { ...previous.perfil, ...payload.new } } : previous);
    }).subscribe();
    return () => { active = false; supabase.removeChannel(channel); };
  }, [profile?.id, routeKey, userId]);

  const updateProfile = changes => {
    if (currentRoute.current !== routeKey || !isOwnProfile) return;
    setSnapshot(previous => previous.routeKey === routeKey && previous.perfil?.id === userId ? { ...previous, perfil: { ...previous.perfil, ...changes } } : previous);
  };

  if (!username && !userId) return <div className="min-h-screen bg-[#080807] text-[#F5F1E8] flex flex-col items-center justify-center gap-5 p-6"><h1 className="text-3xl font-bold">Tu perfil THC</h1><p>Inicia sesión para personalizarlo.</p><Link to={RUTAS.INICIO} className="text-[#F47A20]">Volver al inicio</Link></div>;
  if (error) return <div role="alert" className="min-h-screen bg-[#080807] text-[#F5F1E8] flex flex-col items-center justify-center gap-5 p-6"><h1 className="text-2xl font-bold text-center">{error}</h1><button onClick={() => setRetry(value => value + 1)} className="rounded-full bg-[#F47A20] px-6 py-3 font-bold text-black">Reintentar</button><Link to={RUTAS.INICIO}>Volver al inicio</Link></div>;
  if (!profile) return <div role="status" className="min-h-screen bg-[#080807] flex items-center justify-center font-bold text-[#F47A20]">Cargando perfil…</div>;

  return editingId === profile.id && isOwnProfile
    ? <PerfilEdit key={profile.id} perfil={profile} session={session} onBack={() => setEditingId(null)} onUpdate={updateProfile} />
    : <PerfilVista key={`${profile.id}:${isOwnProfile ? 'owner' : 'visitor'}`} perfil={profile} etiquetas={snapshot.etiquetas} isOwnProfile={isOwnProfile} onEdit={() => setEditingId(profile.id)} session={session} onUpdate={updateProfile} />;
}
