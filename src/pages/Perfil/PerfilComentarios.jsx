import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../utils/supabase';
import { Link } from 'react-router-dom';
import { RUTAS } from '../../utils/rutas';
import { MessageSquare, Send, Trash2, Clock, ShieldAlert, Ban } from 'lucide-react';
import { obtenerRango } from '../../utils/roles';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

export default function PerfilComentarios({ perfilId, session }) {
  const [comentarios, setComentarios] = useState([]);
  const [nuevoComentario, setNuevoComentario] = useState('');
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [errorCarga, setErrorCarga] = useState(false);
  const [recarga, setRecarga] = useState(0);
  const [borrandoId, setBorrandoId] = useState(null);
  const enviandoRef = useRef(false);

  const miUsuario = session?.user;
  const esMiPerfil = miUsuario?.id === perfilId;

                     
  const misComentariosCount = comentarios.filter(c => c.autor_id === miUsuario?.id).length;
  const limiteAlcanzado = misComentariosCount >= 2;

  useEffect(() => {
    let activo = true;
    const cargarComentarios = async () => {
      setCargando(true);
      setErrorCarga(false);
      try {
        const { data, error } = await supabase.from('perfil_comentarios')
          .select('*, autor:perfiles!perfil_comentarios_autor_id_fkey(discord_nombre, apodo, avatar_url, nivel_rol)')
          .eq('perfil_id', perfilId).order('creado_en', { ascending: false });
        if (error) throw error;
        if (activo) setComentarios(data || []);
      } catch {
        if (activo) { setErrorCarga(true); toast.error('No se pudieron cargar los comentarios del perfil.'); }
      } finally { if (activo) setCargando(false); }
    };
    cargarComentarios();
    

  return () => { activo = false; };
  }, [perfilId, recarga]);

  const enviarComentario = async event => {
    event.preventDefault();
    if (!miUsuario || !nuevoComentario.trim() || enviandoRef.current || esMiPerfil || limiteAlcanzado) return;
    enviandoRef.current = true; setEnviando(true);
    const toastId = toast.loading('Firmando perfil...');
    try {
      const { data, error } = await supabase.from('perfil_comentarios').insert({
        perfil_id: perfilId, autor_id: miUsuario.id, contenido: nuevoComentario.trim(),
      }).select('*, autor:perfiles!perfil_comentarios_autor_id_fkey(discord_nombre, apodo, avatar_url, nivel_rol)').single();
      if (error) throw error;
      setComentarios(prev => [data, ...prev]); setNuevoComentario('');
      toast.success('Firma publicada.', { id: toastId });
    } catch { toast.error('No se pudo comentar. Tu texto sigue aquí.', { id: toastId }); }
    finally { enviandoRef.current = false; setEnviando(false); }
  };

  const borrarComentario = async comentarioId => {
    if (borrandoId) return;
    setBorrandoId(comentarioId);
    try {
      const { error } = await supabase.from('perfil_comentarios').delete().eq('id', comentarioId).eq('perfil_id', perfilId).select('id').single();
      if (error) throw error;
      setComentarios(prev => prev.filter(c => c.id !== comentarioId));
      toast.success('Firma eliminada.');
    } catch { toast.error('No se pudo eliminar la firma.'); }
    finally { setBorrandoId(null); }
  };
  if (cargando) return <div className="animate-pulse h-32 theme-panel mt-10"></div>;
  if (errorCarga) return <div className="theme-panel p-6 mt-10"><p className="text-[#AAA] mb-3">No se pudieron cargar las firmas.</p><button onClick={() => setRecarga(prev => prev + 1)} className="theme-btn-primary px-4 py-2">Reintentar</button></div>;

  

  return (
    <div className="w-full mt-16 pt-12 border-t border-white/5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
        <div className="flex items-center gap-3">
          <MessageSquare className="theme-text" size={24} />
          <h3 className="text-white font-black uppercase tracking-[0.2em] text-xl">Comentarios de la comunidad </h3>
        </div>
        <span className="theme-bg px-4 py-1.5 text-[10px] font-black">{comentarios.length} Registros</span>
      </div>

      {miUsuario ? (
        esMiPerfil ? (
          <div className="theme-panel p-8 flex flex-col items-center justify-center text-center mb-10 border-dashed opacity-80">
            <ShieldAlert size={32} className="text-[#888] mb-3" />
            <p className="text-[#888] font-bold text-xs uppercase tracking-widest">No podes comentar en tu mismo perfil.</p>
          </div>
        ) : limiteAlcanzado ? (
          <div className="theme-panel border-red-500/50 p-8 flex flex-col items-center justify-center text-center mb-10">
            <Ban size={32} className="text-red-500/50 mb-3" />
            <p className="text-red-400/80 font-bold text-xs uppercase tracking-widest">Has alcanzado el límite de 2 comentarios en este perfil.</p>
          </div>
        ) : (
          <form onSubmit={enviarComentario} className="theme-panel p-6 mb-10 relative">
            <textarea 
              rows={3} maxLength={200} value={nuevoComentario} onChange={(e) => setNuevoComentario(e.target.value)}
              placeholder="Deja un mensaje para este jugador..." 
              className="w-full bg-transparent text-white placeholder-[#555] outline-none resize-none text-xs md:text-sm font-bold custom-scrollbar"
            />
            <div className="flex justify-between items-end mt-2 pt-4 border-t border-white/10">
              <span className={`text-[10px] font-mono ${nuevoComentario.length >= 200 ? 'text-red-500' : 'text-[#666]'}`}>
                {nuevoComentario.length} / 200
              </span>
              <button type="submit" disabled={!nuevoComentario.trim() || enviando} className="theme-btn-primary px-6 py-3 font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 disabled:opacity-50 outline-none">
                <Send size={14} className="fill-current" /> {enviando ? 'Sellando...' : 'Firmar'}
              </button>
            </div>
          </form>
        )
      ) : null}

      <div className="space-y-4">
        <AnimatePresence>
          {comentarios.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12 text-[#555] font-bold text-xs uppercase tracking-widest">
              Aún no hay comentarios. Sé el primero.
            </motion.div>
          ) : (
            comentarios.map(c => {
              const rango = obtenerRango(c.autor?.nivel_rol);
              const esMioOLoPuedoBorrar = miUsuario?.id === c.autor_id || esMiPerfil;

              

  return (
                <motion.div key={c.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="theme-panel p-6 flex gap-4 md:gap-6 group">
                  <Link to={`${RUTAS.PERFIL}/${encodeURIComponent(c.autor?.discord_nombre || '')}`} className="shrink-0 w-12 h-12 md:w-14 md:h-14 theme-avatar-container overflow-hidden bg-[#111]" style={{ borderColor: rango.color }}>
                    <img loading="lazy" src={c.autor?.avatar_url || '/imagenes/LogoTHC.png'} alt="avatar" className="w-full h-full object-cover" />
                  </Link>

                  <div className="flex flex-col flex-1 min-w-0 justify-center">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-3">
                        <Link to={`${RUTAS.PERFIL}/${encodeURIComponent(c.autor?.discord_nombre || '')}`} className="font-black text-sm md:text-base uppercase tracking-tight hover:opacity-80 transition-opacity" style={{ color: rango.color }}>
                          {c.autor?.apodo || c.autor?.discord_nombre}
                        </Link>
                        <span className="text-[#555] text-[9px] font-black uppercase flex items-center gap-1 mt-1 md:mt-0">
                          <Clock size={10} /> {new Date(c.creado_en).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      
                      {esMioOLoPuedoBorrar && (
                        <button aria-label="Eliminar firma" disabled={!!borrandoId} onClick={() => borrarComentario(c.id)} className="text-[#555] hover:text-red-500 opacity-70 sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100 disabled:opacity-40 transition-all p-1" title="Eliminar">
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                    
                    <p className="text-[#CCC] text-xs md:text-sm font-bold leading-relaxed break-words">
                      {c.contenido}
                    </p>
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

