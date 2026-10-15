import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../utils/supabase';
import { RUTAS } from '../../utils/rutas';
import { Bell, CheckCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { confirmProfileFriendship, emitProfileFriendsChange } from '../../utils/profileFriends';

export default function NotificacionesMenu({ session, isOpen, onToggle }) {
  const [notificaciones, setNotificaciones] = useState([]);
  const [errorCarga, setErrorCarga] = useState(false);
  const [accionPendiente, setAccionPendiente] = useState(null);
  const pendiente = useRef(false);
  const navigate = useNavigate();
  const userId = session?.user?.id;
  const noLeidas = notificaciones.filter(n => !n.leida).length;

  useEffect(() => {
    if (!userId) return;
    let activo = true;
    let solicitud = 0;
    const cargar = async () => {
      const numero = ++solicitud;
      try {
        const { data, error } = await supabase.from('notificaciones')
          .select('*, actor:perfiles!notificaciones_actor_id_fkey(apodo, discord_nombre, avatar_url)')
          .eq('usuario_id', userId).order('creado_en', { ascending: false }).limit(20);
        if (error) throw error;
        if (activo && numero === solicitud) { setNotificaciones(data || []); setErrorCarga(false); }
      } catch { if (activo && numero === solicitud) setErrorCarga(true); }
    };
    cargar();
    const canal = supabase.channel(`notif_sistema_${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notificaciones', filter: `usuario_id=eq.${userId}` }, cargar).subscribe();
    return () => { activo = false; supabase.removeChannel(canal); };
  }, [userId]);

  const marcarLeida = async id => {
    const { error } = await supabase.from('notificaciones').update({ leida: true }).eq('id', id).eq('usuario_id', userId).select('id').single();
    if (error) throw error;
    setNotificaciones(prev => prev.map(n => n.id === id ? { ...n, leida: true } : n));
  };

  const gestionarAmistad = async (notificacion, aceptar) => {
    if (pendiente.current) return;
    pendiente.current = true; setAccionPendiente(notificacion.id);
    try {
      const resultado = await supabase.rpc('thc_perfil_amistad_notificacion', { p_solicitud_id: notificacion.enlace_id, p_accion: aceptar ? 'aceptar' : 'rechazar' });
      if (resultado.error) throw resultado.error;
      const amistad = confirmProfileFriendship(resultado.data);
      emitProfileFriendsChange([userId, notificacion.actor_id]);
      if (aceptar ? amistad.estado !== 'friends' : amistad.estado !== 'none') throw new Error('La solicitud ya cambió. Revisa Amigos en tu perfil.');
      toast.success(aceptar ? 'Amistad aceptada.' : 'Solicitud rechazada.');
      try { await marcarLeida(notificacion.id); }
      catch { toast.error('Solicitud procesada; no se pudo actualizar la notificación.'); }
    } catch { toast.error('No se pudo procesar la solicitud. Actualiza la página e inténtalo de nuevo.'); }
    finally { pendiente.current = false; setAccionPendiente(null); }
  };

  const marcarTodasLeidas = async () => {
    if (pendiente.current) return;
    pendiente.current = true; setAccionPendiente('todas');
    try {
      const { data, error } = await supabase.from('notificaciones').update({ leida: true }).eq('usuario_id', userId).eq('leida', false).select('id');
      if (error) throw error;
      if (!data?.length && noLeidas) throw new Error('No se pudo confirmar la actualización.');
      setNotificaciones(prev => prev.map(n => ({ ...n, leida: true })));
      toast.success('Notificaciones marcadas como leídas.');
    } catch { toast.error('No se pudieron marcar las notificaciones como leídas.'); }
    finally { pendiente.current = false; setAccionPendiente(null); }
  };

  const abrirInteraccion = async notificacion => {
    if (!notificacion.leida) {
      try { await marcarLeida(notificacion.id); }
      catch { toast.error('No se pudo marcar la notificación como leída.'); }
    }
    onToggle();
    navigate(`${RUTAS.FORO}/${encodeURIComponent(notificacion.enlace_id)}${notificacion.comentario_id ? `#${encodeURIComponent(notificacion.comentario_id)}` : ''}`);
  };

  return (
    <div className="thc-navbar-action">
      <button aria-label="Abrir notificaciones" aria-expanded={isOpen} onClick={onToggle} className={`relative w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-colors border ${isOpen ? 'bg-[#F47A20] text-black border-[#F47A20]' : 'bg-[#111] border-white/5 text-[#AAA] hover:text-white hover:bg-white/5'}`}>
        <Bell size={18} />{noLeidas > 0 && <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white text-[9px] font-black flex items-center justify-center rounded-full">{noLeidas}</span>}
      </button>
      <AnimatePresence>
        {isOpen && <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="thc-navbar-popup bg-[#0A0A0A]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl z-50">
          <div className="px-5 py-4 border-b border-white/5 flex justify-between items-center gap-3"><p className="text-xs text-white font-black uppercase tracking-widest">Notificaciones</p>{noLeidas > 0 && <button disabled={!!accionPendiente} onClick={marcarTodasLeidas} className="text-[#F47A20] hover:text-white disabled:opacity-50" aria-label="Marcar todas como leídas"><CheckCheck size={18} /></button>}</div>
          {errorCarga && <p role="status" className="px-5 py-3 text-xs text-red-300">No se pudieron actualizar las notificaciones.</p>}
          <div className="max-h-[min(350px,50dvh)] overflow-y-auto custom-scrollbar">
            {notificaciones.length === 0 ? <p className="p-8 text-center text-[#888] text-xs">No tienes notificaciones.</p> : notificaciones.map(n => <div key={n.id} className={`p-4 border-b border-white/5 flex items-start gap-3 ${n.leida ? 'opacity-60' : 'bg-white/5'}`}>
              <img loading="lazy" src={n.actor?.avatar_url || '/imagenes/LogoTHC.png'} className="w-8 h-8 rounded-full object-cover border border-white/10 shrink-0" alt="" />
              <div className="min-w-0 flex-1"><p className="text-xs text-[#AAA] break-words">{n.tipo === 'solicitud_amistad' ? 'Solicitud de amistad de ' : 'Interacción de '}<span className="font-bold text-white">{n.actor?.apodo || n.actor?.discord_nombre || 'Jugador'}</span></p>
                {n.contenido && <p className="text-xs text-[#999] mt-1 line-clamp-2 break-words">{n.contenido}</p>}
                {n.tipo === 'solicitud_amistad' && !n.leida ? <div className="flex flex-wrap gap-2 mt-3"><button disabled={!!accionPendiente} onClick={() => gestionarAmistad(n, true)} className="bg-[#F47A20] text-black px-3 py-2 text-xs font-bold rounded-lg disabled:opacity-50">Aceptar</button><button disabled={!!accionPendiente} onClick={() => gestionarAmistad(n, false)} className="bg-[#111] border border-white/10 text-white px-3 py-2 text-xs rounded-lg disabled:opacity-50">Rechazar</button></div> : ['comentario', 'respuesta', 'mencion', 'voto_post', 'voto_comentario'].includes(n.tipo) && <button onClick={() => abrirInteraccion(n)} className="text-[#F47A20] text-xs font-bold mt-2 hover:text-white">Ver conversación</button>}
              </div>
            </div>)}
          </div>
        </motion.div>}
      </AnimatePresence>
    </div>
  );
}
