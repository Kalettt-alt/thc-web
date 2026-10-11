import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { supabase } from '../../utils/supabase';
import { Send, Image as ImageIcon, AlertTriangle, Clock, Shield, ArrowLeft, Search, CheckCheck, Trash2, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { safeHexColor, safeProfileTheme, validateImageFile } from '../../utils/media';
import { imagenSegura } from '../../utils/foro';

async function obtenerChats(userId) {
  if (!userId) return [];
  const { data, error } = await supabase.from('mensajes').select('emisor_id, receptor_id, leido, creado_en')
    .or(`emisor_id.eq.${userId},receptor_id.eq.${userId}`).order('creado_en', { ascending: false });
  if (error) throw error;
  const mensajes = data || [];
  if (!mensajes.length) return [];
  const ids = [...new Set(mensajes.map(msg => msg.emisor_id === userId ? msg.receptor_id : msg.emisor_id))];
  const resultado = await supabase.from('perfiles').select('id, discord_nombre, apodo, avatar_url').in('id', ids);
  if (resultado.error) throw resultado.error;
  const pendientes = new Map();
  mensajes.forEach(msg => {
    if (msg.receptor_id === userId && !msg.leido) pendientes.set(msg.emisor_id, (pendientes.get(msg.emisor_id) || 0) + 1);
  });
  return (resultado.data || []).map(perfil => ({ ...perfil, noLeidos: pendientes.get(perfil.id) || 0 })).sort((a, b) => b.noLeidos - a.noLeidos);
}
export default function Mensajes({ session }) {
  const { username } = useParams();
  const navigate = useNavigate();
  
  const [miPerfil, setMiPerfil] = useState(null);
  const [chats, setChats] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [chatSeleccionado, setChatActivo] = useState(null);
  const [mensajes, setMensajes] = useState([]);
  const [nuevoMensaje, setNuevoMensaje] = useState('');
  const [subiendoImg, setSubiendoImg] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const enviandoRef = useRef(false);
  const [otraPersonaEscribiendo, setOtraPersonaEscribiendo] = useState(null);
  
  const mensajesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const typingChannelRef = useRef(null);
  const chatActivoRef = useRef(null);
  
  const chatsFiltrados = useMemo(() => chats.filter(chat => `${chat.apodo || ''} ${chat.discord_nombre || ''}`.toLocaleLowerCase().includes(busqueda.trim().toLocaleLowerCase())), [chats, busqueda]);
  const miId = session?.user?.id;
  const chatActivo = chatSeleccionado?.discord_nombre === username ? chatSeleccionado : null;
  const chatId = chatActivo?.id;
  const mensajesVisibles = mensajes.filter(msg => (msg.emisor_id === miId && msg.receptor_id === chatId) || (msg.emisor_id === chatId && msg.receptor_id === miId));

  useEffect(() => {
    if (!miId) return;
    let activo = true;
    const cargarMiPerfil = async () => {
      try {
        const { data, error } = await supabase.from('perfiles').select('tema_perfil, color_pixel').eq('id', miId).single();
        if (error) throw error;
        if (activo) setMiPerfil(data);
      } catch { if (activo) toast.error('No se pudo cargar el tema del chat.'); }
    };
    cargarMiPerfil();
    return () => { activo = false; };
  }, [miId]);
  useEffect(() => { chatActivoRef.current = chatActivo; }, [chatActivo]);

  useEffect(() => {
    if (!username || !miId) return;
    let activo = true;
    const buscarUsuario = async () => {
      try {
        const { data, error } = await supabase.from('perfiles').select('id, discord_nombre, apodo, avatar_url').eq('discord_nombre', username).single();
        if (error) throw error;
        if (activo && data.id !== miId) setChatActivo(data);
      } catch { if (activo) toast.error('No se pudo abrir la conversación con ese jugador.'); }
    };
    buscarUsuario();
    return () => { activo = false; };
  }, [username, miId]);

  const cargarListaChats = useCallback(async () => {
    try { setChats(await obtenerChats(miId)); }
    catch { toast.error('No se pudieron actualizar tus conversaciones.'); }
  }, [miId]);

  useEffect(() => {
    if (!miId) return;
    let activo = true;
    obtenerChats(miId).then(data => { if (activo) setChats(data); })
      .catch(() => { if (activo) toast.error('No se pudieron cargar tus conversaciones.'); });
    return () => { activo = false; };
  }, [miId]);

  useEffect(() => {
    if (!chatId || !miId) return;
    let activo = true;
    const inicioCarga = new Date().toISOString();
    const cargarHistorial = async () => {
      try {
        const { data, error } = await supabase.from('mensajes').select('*')
          .or(`and(emisor_id.eq.${miId},receptor_id.eq.${chatId}),and(emisor_id.eq.${chatId},receptor_id.eq.${miId})`)
          .order('creado_en', { ascending: true });
        if (error) throw error;
        if (!activo) return;
        setMensajes(prev => {
          const nuevos = prev.filter(msg => msg.creado_en >= inicioCarga && ((msg.emisor_id === miId && msg.receptor_id === chatId) || (msg.emisor_id === chatId && msg.receptor_id === miId)));
          return [...new Map([...(data || []), ...nuevos].map(msg => [msg.id, msg])).values()].sort((a, b) => a.creado_en.localeCompare(b.creado_en));
        });
        const lectura = await supabase.from('mensajes').update({ leido: true }).eq('emisor_id', chatId).eq('receptor_id', miId).eq('leido', false);
        if (lectura.error) toast.error('No se pudieron marcar los mensajes como leídos.');
        if (activo) await cargarListaChats();
      } catch { if (activo) toast.error('No se pudo cargar el historial de mensajes.'); }
    };
    cargarHistorial();
    return () => { activo = false; };
  }, [chatId, miId, cargarListaChats]);
              
  useEffect(() => {
    mensajesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensajes, otraPersonaEscribiendo]);

                            
  useEffect(() => {
    if (!miId) return;

    const canalDB = supabase.channel('chat_db_events')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensajes', filter: `receptor_id=eq.${miId}` }, payload => {
        const msg = payload.new;
        const chatActual = chatActivoRef.current;
        
        if (chatActual && chatActual.id === msg.emisor_id) {
          setMensajes(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
          supabase.from('mensajes').update({ leido: true }).eq('id', msg.id).eq('receptor_id', miId).then(({ error }) => { if (error) toast.error('No se pudo marcar el mensaje como leído.'); });
        } else {
          toast.success('¡Nuevo mensaje recibido!', { icon: '💬', style: { background: '#111', color: '#fff' }});
        }
        cargarListaChats();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'mensajes', filter: `emisor_id=eq.${miId}` }, payload => {
        setMensajes(prev => prev.map(msg => msg.id === payload.new.id ? payload.new : msg));
      })      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'mensajes' }, payload => {
        setMensajes(prev => prev.filter(m => m.id !== payload.old.id));
        cargarListaChats();
      })
      .subscribe();

    typingChannelRef.current = supabase.channel('chat_typing', { config: { broadcast: { self: false } } });
    typingChannelRef.current.on('broadcast', { event: 'typing' }, ({ payload }) => {
        const chatActual = chatActivoRef.current;
        if (chatActual && payload.emisor === chatActual.id && payload.receptor === miId) {
          setOtraPersonaEscribiendo(payload.emisor);
          clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => setOtraPersonaEscribiendo(null), 2000);
        }
      }).subscribe();

    return () => {
      clearTimeout(typingTimeoutRef.current);
      supabase.removeChannel(canalDB);
      if (typingChannelRef.current) supabase.removeChannel(typingChannelRef.current);
    };
  }, [miId, cargarListaChats]);

                     
  const handleInputEscribiendo = (e) => {
    setNuevoMensaje(e.target.value);
    if (chatActivo && typingChannelRef.current) {
      typingChannelRef.current.send({ type: 'broadcast', event: 'typing', payload: { emisor: miId, receptor: chatActivo.id } });
    }
  };

  const enviarMensaje = async (event, imgUrl = null, receptorId = chatId) => {
    event?.preventDefault();
    if (enviandoRef.current || (!nuevoMensaje.trim() && !imgUrl) || !receptorId || !miId) return false;
    const contenido = nuevoMensaje.trim();
    if (contenido.length > 10000) { toast.error('El mensaje es demasiado largo.'); return false; }
    enviandoRef.current = true; setEnviando(true);
    try {
      const { data, error } = await supabase.from('mensajes').insert({ emisor_id: miId, receptor_id: receptorId, contenido, imagen_url: imgUrl }).select('*').single();
      if (error) throw error;
      setMensajes(prev => prev.some(msg => msg.id === data.id) ? prev : [...prev, data]);
      setNuevoMensaje('');
      await cargarListaChats();
      return true;
    } catch (error) {
      if (imgUrl) throw error;
      toast.error('No se pudo enviar. Tu mensaje sigue en el campo de texto.');
      return false;
    } finally { enviandoRef.current = false; setEnviando(false); }
  };

  const borrarMensaje = async msgId => {
    try {
      const { error } = await supabase.from('mensajes').delete().eq('id', msgId).eq('emisor_id', miId).select('id').single();
      if (error) throw error;
      setMensajes(prev => prev.filter(msg => msg.id !== msgId));
      toast.success('Mensaje eliminado.');
      await cargarListaChats();
    } catch { toast.error('No se pudo eliminar el mensaje.'); }
  };

  const handleSubirImagen = async event => {
    const file = event.target.files[0];
    event.target.value = '';
    if (!file || !chatId || subiendoImg || enviandoRef.current) return;
    const receptorId = chatId;
    setSubiendoImg(true);
    const toastId = toast.loading('Cargando imagen...');
    let fileName;
    let enviada = false;
    try {
      const extension = await validateImageFile(file);
      fileName = `${miId}/${crypto.randomUUID()}.${extension}`;
      const { error } = await supabase.storage.from('chat_media').upload(fileName, file);
      if (error) throw error;
      const { data } = supabase.storage.from('chat_media').getPublicUrl(fileName);
      enviada = await enviarMensaje(null, data.publicUrl, receptorId);
      if (!enviada) throw new Error('No se pudo enviar la imagen.');
      toast.success('Imagen enviada.', { id: toastId });
    } catch {
      toast.error('No se pudo enviar la imagen. Usa PNG, JPG, WebP o GIF de hasta 5 MB.', { id: toastId });
      if (fileName && !enviada) await supabase.storage.from('chat_media').remove([fileName]).catch(() => {});
    } finally { setSubiendoImg(false); }
  };
  const parsearTexto = (texto) => {
    if (!texto) return null;
    const partes = texto.split(/(\*\*.*?\*\*)/g);
    return partes.map((parte, i) => {
      if (parte.startsWith('**') && parte.endsWith('**')) return <strong key={i} className="font-black text-theme">{parte.slice(2, -2)}</strong>;
      return <span key={i}>{parte}</span>;
    });
  };

                                                      
  const tema = safeProfileTheme(miPerfil?.tema_perfil);
  let ACCENT_COLOR = '#F47A20'; 
  if (tema === 'twc') ACCENT_COLOR = '#00B4FF';
  if (tema === 'pixel') ACCENT_COLOR = safeHexColor(miPerfil?.color_pixel);
  
  const isTWC = tema === 'twc';
  const isPixel = tema === 'pixel';
                                                                         
  const activeClass = isTWC ? 'twc-active' : isPixel ? 'pixel-active' : 'default-active';

  return (
    <div className={`chat-master-container w-full max-w-[1500px] mx-auto px-4 md:px-8 pt-6 pb-6 h-dvh min-h-0 flex flex-col font-sans ${activeClass}`}>
      
                                                                    
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
        
        .chat-master-container { --accent: ${ACCENT_COLOR}; padding-top: var(--navbar-offset, 8rem); box-sizing: border-box; }
        .text-theme { color: var(--accent) !important; }
        .bg-theme { background-color: var(--accent) !important; color: ${isPixel || isTWC ? '#061024' : '#060606'} !important; }
        .border-theme { border-color: var(--accent) !important; }
        .hover-text-theme:hover { color: var(--accent) !important; }
        
                                                            
        .default-active .chat-wrapper { border-radius: 2rem; }
        .default-active .chat-bubble-me { border-radius: 1rem 1rem 0 1rem; }
        .default-active .chat-bubble-other { border-radius: 1rem 1rem 1rem 0; }
        .default-active .chat-avatar { border-radius: 9999px; }
        .default-active .chat-btn { border-radius: 0.75rem; }

                                                                  
        .chat-master-container.twc-active * { border-radius: 0 !important; }
        .twc-active .chat-wrapper { 
            background: #061024 !important; 
            border: 6px solid var(--accent) !important; 
            box-shadow: 12px 12px 0px #061024 !important; 
        }
        .twc-active .chat-sidebar { background: #0A1A3A !important; border-right: 4px solid var(--accent) !important; }
        .twc-active .chat-header { background: #0A1A3A !important; border-bottom: 4px solid var(--accent) !important; }
        .twc-active .chat-input-area { background: #0A1A3A !important; border-top: 4px solid var(--accent) !important; }
        
        .twc-active .chat-bubble-me { 
            border: 4px solid #061024 !important; 
            box-shadow: 4px 4px 0px #061024 !important; 
            background-color: var(--accent) !important;
            color: #061024 !important;
        }
        .twc-active .chat-bubble-other { 
            border: 4px solid var(--accent) !important; 
            box-shadow: 4px 4px 0px var(--accent) !important; 
            background-color: #061024 !important;
        }
        .twc-active input, .twc-active textarea { 
            background-color: #061024 !important; 
            border: 4px solid var(--accent) !important; 
        }
        .twc-active .chat-btn {
            border: 4px solid #061024 !important;
            box-shadow: 4px 4px 0px #061024 !important;
        }
        .twc-active .chat-avatar { border: 3px solid var(--accent) !important; }

                                                         
        .chat-master-container.pixel-active * { font-family: 'Press Start 2P', cursive !important; border-radius: 0 !important; }
        .pixel-active p { line-height: 1.6; }
        .pixel-active .chat-wrapper { border: 4px solid var(--accent) !important; background: #000 !important; }
        .pixel-active .chat-bubble-me { border: 4px solid #000 !important; }
        .pixel-active .chat-bubble-other { border: 4px solid var(--accent) !important; background: #111 !important; }
      `}</style>

                                         
      <div className="flex items-center justify-between mb-4 mt-2">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-[#888] hover-text-theme font-black uppercase tracking-widest text-[10px] transition-colors bg-[#0A0A0A] border border-white/5 px-4 py-2 rounded-xl backdrop-blur-md shadow-lg">
          <ArrowLeft size={14} /> Regresar
        </button>
        <span className="text-white/30 text-[9px] font-black uppercase tracking-widest hidden md:block">Red Local THC</span>
      </div>

      <div className="chat-wrapper w-full flex-1 bg-[#0A0A0A]/80 backdrop-blur-3xl border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.8)] flex overflow-hidden">
        
                                                                                     
        <div className={`chat-sidebar w-full md:w-[320px] lg:w-[380px] bg-[#060606]/50 border-r border-white/5 flex flex-col shrink-0 transition-transform ${chatActivo ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-6 border-b border-white/5 flex flex-col gap-2 chat-header">
            <h2 className="font-black text-white text-xl uppercase tracking-widest flex items-center gap-2">
              <Shield size={20} className="text-theme" /> Comunicaciones
            </h2>
            <div className="relative mt-4">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555]" />
              <input type="search" aria-label="Buscar contacto" value={busqueda} onChange={event => setBusqueda(event.target.value)} placeholder="Buscar contacto..." className="w-full bg-[#111] border border-white/5 text-white text-[10px] uppercase font-bold tracking-widest rounded-xl py-3 pl-9 pr-4 outline-none focus:border-theme transition-colors chat-btn" />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
            {chatsFiltrados.length === 0 && <p className="text-white/30 text-center text-[10px] font-black uppercase mt-10 tracking-widest">Bandeja Vacía</p>}
            {chatsFiltrados.map(usuario => (
              <button 
                key={usuario.id} 
                onClick={() => navigate(`/mensajes/${encodeURIComponent(usuario.discord_nombre)}`)} 
                className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all text-left group border ${chatActivo?.id === usuario.id ? 'bg-[#111] border-theme shadow-[0_0_15px_rgba(var(--accent),0.1)]' : 'bg-transparent border-transparent hover:bg-white/5'}`}
              >
                <div className="relative">
                  <img src={usuario.avatar_url || '/imagenes/LogoTHC.png'} className="chat-avatar w-12 h-12 object-cover border-2 border-[#1A1A1A] group-hover:border-theme transition-colors" alt="avatar"/>
                  {usuario.noLeidos > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[9px] font-black text-white border-2 border-[#060606]">{usuario.noLeidos}</span>}
                </div>
                <div className="flex flex-col overflow-hidden flex-1">
                  <span className="font-black text-white text-xs uppercase truncate tracking-wide">{usuario.apodo || usuario.discord_nombre}</span>
                  <span className="text-[9px] font-mono text-[#666] tracking-widest truncate">{usuario.discord_nombre}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

                                                                                
        <div className={`flex-1 min-w-0 min-h-0 flex flex-col relative ${!chatActivo ? 'hidden md:flex items-center justify-center bg-[#060606]/30' : 'flex bg-transparent'}`}>
          
          {!chatActivo ? (
            <div className="text-center opacity-40 flex flex-col items-center">
              <MessageSquare size={60} className="text-theme mb-6 opacity-50"/>
              <h3 className="text-2xl font-black uppercase tracking-widest text-white">Terminal Segura</h3>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#AAA] mt-2">Selecciona un chat en el panel lateral</p>
            </div>
          ) : (
            <>
                                   
              <div className="chat-header h-[76px] bg-[#0A0A0A]/90 backdrop-blur-md border-b border-white/5 px-6 flex items-center justify-between shrink-0 z-10">
                <div className="flex items-center gap-4">
                  <button onClick={() => navigate('/mensajes')} className="md:hidden text-[#888] hover-text-theme bg-[#111] p-2 rounded-lg transition-colors"><ArrowLeft size={16}/></button>
                  <img src={chatActivo.avatar_url || '/imagenes/LogoTHC.png'} className="chat-avatar w-10 h-10 border-2 border-theme object-cover shadow-[0_0_15px_rgba(var(--accent),0.3)]"/>
                  <div className="flex flex-col">
                    <span className="text-lg font-black text-white uppercase tracking-tighter">{chatActivo.apodo || chatActivo.discord_nombre}</span>
                    <span className="text-[9px] text-[#666] uppercase tracking-widest font-mono">ID: {chatActivo.discord_nombre}</span>
                  </div>
                </div>
              </div>

                                            
              <div className="bg-red-500/10 border-b border-red-500/20 py-2.5 px-4 flex items-center justify-center gap-3 shrink-0 backdrop-blur-sm">
                <AlertTriangle size={14} className="text-red-500 animate-pulse" />
                <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-red-500/90 text-center">
                  Puedes eliminar tus mensajes desde esta conversación.
                </span>
              </div>

                                      
              <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-4 custom-scrollbar relative flex flex-col">
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.02]">
                  <img src="/imagenes/LogoTHC.png" className="w-[400px] grayscale" alt="watermark"/>
                </div>
                
                {mensajesVisibles.length === 0 && <div className="w-full text-center text-[#555] text-[10px] font-black uppercase tracking-widest my-auto pb-20">Este es el comienzo de la conversación. Di hola.</div>}

                {mensajesVisibles.map(msg => {
                  const soyYo = msg.emisor_id === miId;
                  return (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} key={msg.id} className={`flex w-full relative z-10 group ${soyYo ? 'justify-end' : 'justify-start'}`}>
                      
                                            
                      {soyYo && (
                        <button onClick={() => borrarMensaje(msg.id)} className="mr-3 text-[#555] hover:text-red-500 opacity-70 sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100 transition-all self-center" title="Eliminar mensaje">
                          <Trash2 size={16} />
                        </button>
                      )}

                      <div className={`max-w-[85%] md:max-w-[65%] p-4 flex flex-col gap-2 shadow-xl backdrop-blur-md border ${soyYo ? 'bg-theme border-theme text-black chat-bubble-me' : 'bg-[#111] border-white/5 text-[#EEE] chat-bubble-other'}`}>
                        {imagenSegura(msg.imagen_url) && <a href={imagenSegura(msg.imagen_url)} target="_blank" rel="noreferrer" className="block w-full"><img loading="lazy" src={imagenSegura(msg.imagen_url)} className="w-full max-w-[300px] rounded-lg border border-black/20 mb-2 hover:opacity-80 transition-opacity" alt="Media"/></a>}
                        
                        {msg.contenido && <p className="font-bold text-xs md:text-sm leading-relaxed whitespace-pre-wrap">{parsearTexto(msg.contenido)}</p>}
                        
                        <div className={`text-[8px] font-black uppercase tracking-widest flex items-center gap-1 opacity-60 justify-end mt-1 ${soyYo ? 'text-black' : 'text-[#888]'}`}>
                          <Clock size={10}/> {new Date(msg.creado_en).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {soyYo && <CheckCheck size={12} className={msg.leido ? 'text-green-900 drop-shadow-md' : 'text-black/50'}/>}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}

                                                     
                <AnimatePresence>
                  {otraPersonaEscribiendo === chatId && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }} className="flex gap-2 items-center text-[#888] text-[10px] uppercase font-black tracking-widest px-4 py-2 z-10 w-max bg-[#111] rounded-full border border-white/5 shadow-md">
                      <span>{chatActivo.apodo || chatActivo.discord_nombre} escribiendo</span>
                      <span className="flex gap-1">
                        <span className="w-1.5 h-1.5 bg-theme rounded-full animate-bounce"></span>
                        <span className="w-1.5 h-1.5 bg-theme rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></span>
                        <span className="w-1.5 h-1.5 bg-theme rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div ref={mensajesEndRef} />
              </div>

                                    
              <div className="chat-input-area p-4 md:p-6 bg-[#060606]/80 backdrop-blur-2xl border-t border-white/5 shrink-0 flex items-end gap-3 z-10">
                <div className="relative">
                  <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={handleSubirImagen} className="absolute inset-0 opacity-0 cursor-pointer" disabled={subiendoImg || enviando} />
                  <button type="button" disabled={subiendoImg || enviando} className="chat-btn h-[52px] w-[52px] bg-[#111] border border-white/10 text-white/50 flex items-center justify-center hover-text-theme border-theme transition-colors outline-none disabled:opacity-50">
                    <ImageIcon size={20} />
                  </button>
                </div>

                <form onSubmit={enviarMensaje} className="flex-1 min-w-0 flex gap-2 relative">
                  <textarea 
                    rows={1} maxLength={10000} disabled={enviando || subiendoImg}
                    value={nuevoMensaje}
                    onChange={handleInputEscribiendo}
                    onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviarMensaje(); }}}
                    placeholder="Transmite un mensaje... (Usa **negrita**)"
                    className="chat-btn flex-1 min-w-0 bg-[#111] border border-white/10 px-5 py-4 text-white font-bold text-xs resize-none custom-scrollbar outline-none focus:border-theme transition-colors shadow-inner"
                  />
                  
                  <button type="submit" disabled={!nuevoMensaje.trim() || subiendoImg || enviando} className="btn-send chat-btn h-[52px] px-4 sm:px-6 bg-theme text-black font-black flex items-center justify-center hover:scale-105 transition-transform shadow-[0_0_20px_rgba(var(--accent),0.3)] disabled:opacity-50 disabled:hover:scale-100 outline-none">
                    <Send size={18} className="fill-current" />
                  </button>
                </form>
              </div>

            </>
          )}
        </div>

      </div>
    </div>
  );
}



