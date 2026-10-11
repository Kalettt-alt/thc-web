import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../utils/supabase';
import { RUTAS } from '../../utils/rutas';
import { MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function MensajesMenu({ session, isOpen, onToggle }) {
  const [mensajesNoLeidos, setMensajesNoLeidos] = useState([]);
  const [errorCarga, setErrorCarga] = useState(false);
  const navigate = useNavigate();
  const userId = session?.user?.id;

  useEffect(() => {
    if (!userId) return;
    let activo = true;
    let solicitud = 0;
    const cargarMensajes = async () => {
      const numero = ++solicitud;
      try {
        const { data: msgs, error } = await supabase.from('mensajes')
          .select('id, emisor_id, contenido, imagen_url, creado_en')
          .eq('receptor_id', userId).eq('leido', false)
          .order('creado_en', { ascending: false }).limit(100);
        if (error) throw error;
        const ids = [...new Set((msgs || []).map(msg => msg.emisor_id))];
        let autores = [];
        if (ids.length) {
          const resultado = await supabase.from('perfiles').select('id, discord_nombre, apodo, avatar_url').in('id', ids);
          if (resultado.error) throw resultado.error;
          autores = resultado.data || [];
        }
        if (!activo || numero !== solicitud) return;
        const perfiles = new Map(autores.map(autor => [autor.id, autor]));
        const grupos = new Map();
        (msgs || []).forEach(msg => {
          if (!grupos.has(msg.emisor_id)) grupos.set(msg.emisor_id, { id: msg.emisor_id, emisor: perfiles.get(msg.emisor_id), mensajes: [] });
          grupos.get(msg.emisor_id).mensajes.push(msg);
        });
        setMensajesNoLeidos([...grupos.values()]);
        setErrorCarga(false);
      } catch {
        if (activo && numero === solicitud) setErrorCarga(true);
      }
    };
    cargarMensajes();
    const canal = supabase.channel(`notif_mensajes_${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mensajes', filter: `receptor_id=eq.${userId}` }, cargarMensajes).subscribe();
    return () => { activo = false; supabase.removeChannel(canal); };
  }, [userId]);

  const abrirMensajes = () => { onToggle(); navigate(RUTAS.MENSAJES); };
  return (
    <div className="thc-navbar-action">
      <button aria-label="Abrir mensajes" aria-expanded={isOpen} onClick={onToggle} className={`relative w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-colors border ${isOpen ? 'bg-[#F47A20] text-black border-[#F47A20]' : 'bg-[#111] border-white/5 text-[#AAA] hover:text-white hover:bg-white/5'}`}>
        <MessageSquare size={18} />
        {mensajesNoLeidos.length > 0 && <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white text-[9px] font-black flex items-center justify-center rounded-full">{mensajesNoLeidos.length}</span>}
      </button>
      <AnimatePresence>
        {isOpen && <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="thc-navbar-popup bg-[#0A0A0A]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl z-50">
          <div className="px-6 py-4 border-b border-white/5"><p className="text-xs text-[#F47A20] font-black uppercase tracking-widest">Mensajes</p></div>
          {errorCarga && <p role="status" className="px-5 py-3 text-xs text-red-300">No se pudieron actualizar los mensajes.</p>}
          <div className="max-h-[min(300px,50dvh)] overflow-y-auto custom-scrollbar">
            {mensajesNoLeidos.length === 0 ? <p className="p-8 text-center text-[#888] text-xs">No tienes mensajes sin leer.</p> : mensajesNoLeidos.map(grupo => (
              <button key={grupo.id} onClick={abrirMensajes} className="w-full text-left p-4 border-b border-white/5 hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-3 mb-2">
                  <img src={grupo.emisor?.avatar_url || '/imagenes/LogoTHC.png'} className="w-8 h-8 rounded-full border border-white/10 object-cover shrink-0" alt="" />
                  <span className="font-black text-white text-xs truncate">{grupo.emisor?.apodo || grupo.emisor?.discord_nombre || 'Jugador'}</span>
                  <span className="ml-auto bg-[#F47A20] text-black text-[9px] font-black px-2 py-1 rounded-md shrink-0">{grupo.mensajes.length}</span>
                </div>
                <p className="text-xs text-white/50 truncate pl-11">{grupo.mensajes[0].imagen_url ? 'Imagen recibida' : grupo.mensajes[0].contenido}</p>
              </button>
            ))}
          </div>
          <button onClick={abrirMensajes} className="w-full py-4 bg-[#111] hover:bg-[#F47A20] text-[#F47A20] hover:text-black font-black uppercase tracking-widest text-xs rounded-b-2xl transition-colors">Abrir mensajes</button>
        </motion.div>}
      </AnimatePresence>
    </div>
  );
}
