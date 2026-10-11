import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../utils/supabase';
import { RUTAS } from '../utils/rutas';
import { Link } from 'react-router-dom';
import { Flame, Clock, PenTool, Users, ArrowLeft, MessageSquare, ChevronLeft, ChevronRight, ArrowUpRight, Zap, BookOpen, Radio } from 'lucide-react';
import { MotionConfig, motion, useInView } from 'framer-motion';
import toast from 'react-hot-toast';
import TarjetaPublicacion from '../components/foro/TarjetaPublicacion';
import CrearPublicacionModal from '../components/foro/CrearPublicacionModal';
import { guardarVoto } from '../utils/foro';
import { useHomeMotion } from '../utils/homeMotion';
import '../components/foro/Foro.css';

const PAGE_SIZE = 20;

export default function Foro({ session }) {
  const [posts, setPosts] = useState([]);
  const [misVotos, setMisVotos] = useState({});
  const [filtro, setFiltro] = useState('recientes');
  const [pagina, setPagina] = useState(0);
  const [total, setTotal] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState(false);
  const [recarga, setRecarga] = useState(0);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [perfilActual, setPerfilActual] = useState(null);
  const [votandoId, setVotandoId] = useState(null);
  const votoPendiente = useRef(false);
  const userId = session?.user?.id;
  const { motionEnabled } = useHomeMotion();
  const heroRef = useRef(null);
  const guideRef = useRef(null);
  const heroVisible = useInView(heroRef, { amount: 0.15 });
  const guideVisible = useInView(guideRef, { amount: 0.15 });

  useEffect(() => {
    if (!userId) return;
    let activo = true;
    const cargarPerfil = async () => {
      try {
        const [perfil, votos] = await Promise.all([
          supabase.from('perfiles').select('id, apodo, discord_nombre, avatar_url, nivel_rol').eq('id', userId).single(),
          supabase.from('votos_publicaciones').select('publicacion_id, valor').eq('usuario_id', userId),
        ]);
        if (perfil.error || votos.error) throw perfil.error || votos.error;
        if (!activo) return;
        setPerfilActual(perfil.data);
        setMisVotos(Object.fromEntries((votos.data || []).map(voto => [voto.publicacion_id, voto.valor])));
      } catch {
        if (activo) toast.error('No se pudo cargar tu perfil o tus votos.');
      }
    };
    cargarPerfil();
    return () => { activo = false; };
  }, [userId]);

  useEffect(() => {
    let activo = true;
    const cargarPosts = async () => {
      setCargando(true);
      setErrorCarga(false);
      try {
        let query = supabase.from('foro_publicaciones').select(`
          id, autor_id, titulo, contenido, imagenes, puntuacion, etiqueta, creado_en,
          autor:perfiles!foro_publicaciones_autor_id_fkey(discord_nombre, apodo, avatar_url, nivel_rol),
          foro_comentarios(count)
        `, { count: 'exact' }).eq('estado', 'activo').eq('foro_comentarios.estado', 'activo');
        if (filtro === 'destacados') query = query.order('puntuacion', { ascending: false });
        query = query.order('creado_en', { ascending: false }).order('id', { ascending: false });
        const { data, error, count } = await query.range(pagina * PAGE_SIZE, (pagina + 1) * PAGE_SIZE - 1);
        if (error) throw error;
        if (!activo) return;
        setPosts((data || []).map(post => ({ ...post, comentarios_count: post.foro_comentarios?.[0]?.count || 0 })));
        setTotal(count || 0);
      } catch {
        if (activo) { setErrorCarga(true); toast.error('No se pudieron cargar los debates.'); }
      } finally {
        if (activo) setCargando(false);
      }
    };
    cargarPosts();
    return () => { activo = false; };
  }, [filtro, pagina, recarga]);

  const manejarVoto = useCallback(async (postId, valor, votoAnterior) => {
    if (votoPendiente.current) return;
    if (!userId) return toast.error('Inicia sesión para votar.');
    votoPendiente.current = true;
    setVotandoId(postId);
    try {
      const nuevoVoto = await guardarVoto({ tabla: 'votos_publicaciones', columna: 'publicacion_id', id: postId, usuarioId: userId, valor, votoAnterior });
      setMisVotos(prev => ({ ...prev, [postId]: nuevoVoto }));
      const { data, error } = await supabase.from('foro_publicaciones').select('puntuacion').eq('id', postId).single();
      if (error) toast.error('Voto guardado. Recarga para actualizar la puntuación.');
      else setPosts(prev => prev.map(post => post.id === postId ? { ...post, puntuacion: data.puntuacion } : post));
    } catch {
      toast.error('No se pudo guardar tu voto. Inténtalo de nuevo.');
    } finally {
      votoPendiente.current = false;
      setVotandoId(null);
    }
  }, [userId]);

  const cambiarFiltro = valor => { setFiltro(valor); setPagina(0); };
  const cambiarPagina = valor => { setPagina(valor); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  return (
    <MotionConfig reducedMotion={motionEnabled ? 'never' : 'always'} transition={motionEnabled ? undefined : { duration: 0 }}>
      <div className="foro-page foro-editorial" data-motion={motionEnabled ? 'on' : 'off'}>
        <div className="foro-shell">
          <div className="foro-topline">
            <Link to={RUTAS.INICIO} className="foro-back"><ArrowLeft size={18} /> Regresar</Link>
            <span className="foro-section-label"><Radio size={17} /> La voz de la comunidad</span>
          </div>
          <header ref={heroRef} className="foro-hero">
            <div className="foro-hero-heading">
              <p className="foro-eyebrow"><Zap size={18} /> Fuera de la cancha, seguimos jugando.</p>
              <motion.h1 initial={false} animate={motionEnabled && !heroVisible ? { opacity: 0, y: 24 } : { opacity: 1, y: 0 }} transition={{ duration: motionEnabled ? 0.6 : 0, ease: [0.16, 1, 0.3, 1] }} className="foro-hero-title">FORO<span>THC<span className="foro-title-dot">.</span></span></motion.h1>
              <span className="foro-hero-stamp" aria-hidden="true">Tu voz<br />hace ruido.</span>
            </div>
            <div className="foro-hero-bottom">
              <p>La jugada sigue acá.<br /><span>Discusiones, tácticas y reportes oficiales. Abre un tema y hazte escuchar.</span></p>
              <button onClick={() => setModalAbierto(true)} className="foro-primary"><PenTool size={21} /><span>Crear debate</span><ArrowUpRight size={23} /></button>
            </div>
            <div className="foro-hero-ribbon" aria-hidden="true"><span>IDEAS</span><Zap size={20} /><span>DEBATES</span><Zap size={20} /><span>COMUNIDAD</span><Zap size={20} /><span>THC</span></div>
          </header>
          <div className="foro-editorial-layout">
            <main className="foro-feed">
              <div className="foro-feed-heading">
                <div><p className="foro-eyebrow">Aquí se habla de todo.</p><h2>En conversación<span>.</span></h2></div>
                <span className="foro-total"><strong>{total}</strong> debates</span>
              </div>
              <div className="foro-filter-bar" aria-label="Orden de los debates">
                {[['recientes', Clock, 'Lo último'], ['destacados', Flame, 'Populares']].map(([valor, Icono, nombre]) => (
                  <button key={valor} aria-pressed={filtro === valor} onClick={() => cambiarFiltro(valor)} className={`foro-filter ${filtro === valor ? 'is-active' : ''}`}>
                    <Icono size={20} /><span>{nombre}</span>
                    {filtro === valor && <motion.span className="foro-filter-line" layoutId="foro-active-filter" transition={{ duration: motionEnabled ? 0.3 : 0, ease: 'easeOut' }} />}
                  </button>
                ))}
                <span className="foro-filter-note">{filtro === 'recientes' ? 'Recién llegados al foro' : 'Los que mueven a la comunidad'}</span>
              </div>
              <div className="foro-post-list" aria-busy={cargando}>
                {cargando ? (
                  <div role="status" className="foro-feed-state">
                    <span className="foro-loading-symbol" aria-hidden="true"><Zap size={32} /></span><h3>Se viene la conversación.</h3><p>Cargando debates...</p>
                    <div className="foro-loading-lines" aria-hidden="true"><i /><i /><i /></div>
                  </div>
                ) : errorCarga ? (
                  <div className="foro-feed-state foro-feed-state--error"><MessageSquare size={38} /><h3>Nos quedamos sin señal.</h3><p>No se pudo conectar con el foro.</p><button onClick={() => setRecarga(prev => prev + 1)} className="foro-primary">Reintentar <ArrowUpRight size={20} /></button></div>
                ) : posts.length === 0 ? (
                  <div className="foro-feed-state"><MessageSquare size={42} /><h3>El primer tema puede ser tuyo.</h3><p>Aún no hay discusiones. Comparte una idea y abre la conversación.</p><button onClick={() => setModalAbierto(true)} className="foro-primary">Crear debate <PenTool size={20} /></button></div>
                ) : posts.map(post => <TarjetaPublicacion key={post.id} post={post} onVotar={manejarVoto} miVoto={misVotos[post.id]} votando={votandoId !== null} />)}
              </div>
              {!errorCarga && total > PAGE_SIZE && <nav aria-label="Páginas del foro" className="foro-pagination"><button onClick={() => cambiarPagina(pagina - 1)} disabled={cargando || pagina === 0}><ChevronLeft size={19} /> Anterior</button><span><strong>{pagina + 1}</strong> / {Math.ceil(total / PAGE_SIZE)}</span><button onClick={() => cambiarPagina(pagina + 1)} disabled={cargando || (pagina + 1) * PAGE_SIZE >= total}>Siguiente <ChevronRight size={19} /></button></nav>}
            </main>
            <aside ref={guideRef} className="foro-sidebar">
              <motion.div initial={false} animate={motionEnabled && !guideVisible ? { opacity: 0, y: 24 } : { opacity: 1, y: 0 }} transition={{ duration: motionEnabled ? 0.6 : 0, ease: [0.16, 1, 0.3, 1] }} className="foro-sidebar-inner">
                <div className="foro-community-guide">
                  <span className="foro-guide-icon"><Users size={29} /></span><p className="foro-eyebrow">La comunidad la hacemos todos.</p><h2>Buen juego.<br />Buen debate.</h2>
                  <p>Comparte tus ideas, respeta a los demás y mantén cada debate en su tema.</p>
                  <ol><li><span>01</span> Abre una conversación.</li><li><span>02</span> Vota lo que te representa.</li><li><span>03</span> Responde y suma tu voz.</li></ol>
                  <Link to={RUTAS.REGLAMENTO} className="foro-guide-link"><BookOpen size={19} /> Nuestro reglamento <ArrowUpRight size={19} /></Link>
                </div>
                <Link to={RUTAS.MURO} className="foro-muro-link"><span><span className="foro-eyebrow">¿Una imagen dice más?</span><strong>Al Muro THC.</strong><span>Comparte ese momento.</span></span><ArrowUpRight size={30} /></Link>
                <p className="foro-sidebar-caption"><Zap size={16} /> El trueno también se escucha acá.</p>
              </motion.div>
            </aside>
          </div>
        </div>
        <CrearPublicacionModal isOpen={modalAbierto} onClose={() => setModalAbierto(false)} perfilActual={perfilActual} onPublicacionCreada={nuevoPost => { setFiltro('recientes'); setPagina(0); setTotal(prev => prev + 1); setPosts(prev => [nuevoPost, ...prev].slice(0, PAGE_SIZE)); }} />
      </div>
    </MotionConfig>
  );
}
