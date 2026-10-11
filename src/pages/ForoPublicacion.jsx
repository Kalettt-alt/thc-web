import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import { RUTAS } from '../utils/rutas';
import { ArrowLeft, Trash2, Edit3, Star, CloudLightning, MessageSquare, ArrowUpRight, Send, Hash } from 'lucide-react';
import { motion, MotionConfig } from 'framer-motion';
import toast from 'react-hot-toast';
import { obtenerRango } from '../utils/roles';
import { guardarVoto, enviarNotificacion, procesarMenciones, imagenSegura } from '../utils/foro';
import Comentario from '../components/foro/Comentario';
import TextoMenciones from '../components/foro/TextoMenciones';
import ForoDialog from '../components/foro/ForoDialog';
import { useHomeMotion } from '../utils/homeMotion';
import '../components/foro/Foro.css';
import '../components/foro/ForoDetalle.css';

export default function ForoPublicacion({ session }) {
  const { motionEnabled } = useHomeMotion();
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const userId = session?.user?.id;
  const [post, setPost] = useState(null);
  const [comentarios, setComentarios] = useState([]);
  const [perfilActual, setPerfilActual] = useState(null);
  const [miVotoPost, setMiVotoPost] = useState(null);
  const [votosComentarios, setVotosComentarios] = useState({});
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState(false);
  const [recarga, setRecarga] = useState(0);
  const [editandoPost, setEditandoPost] = useState(false);
  const [contenidoEditado, setContenidoEditado] = useState('');
  const [modalBorrar, setModalBorrar] = useState(false);
  const [nuevoComentario, setNuevoComentario] = useState('');
  const [operacion, setOperacion] = useState(null);
  const pendiente = useRef(false);
  const votoComentarioPendiente = useRef(new Set());
  const textAreaRef = useRef(null);

  useEffect(() => {
    let activo = true;
    const cargarTodo = async () => {
      setCargando(true);
      setErrorCarga(false);
      try {
        const [publicacion, listaComentarios, perfil, voto, votos] = await Promise.all([
          supabase.from('foro_publicaciones').select('*, autor:perfiles!foro_publicaciones_autor_id_fkey(id, discord_nombre, apodo, avatar_url, nivel_rol)').eq('id', id).eq('estado', 'activo').maybeSingle(),
          supabase.from('foro_comentarios').select('*, autor:perfiles!foro_comentarios_autor_id_fkey(id, discord_nombre, apodo, avatar_url, nivel_rol)').eq('publicacion_id', id).eq('estado', 'activo').order('creado_en', { ascending: true }),
          userId ? supabase.from('perfiles').select('id, discord_nombre, apodo, avatar_url, nivel_rol').eq('id', userId).single() : Promise.resolve({ data: null }),
          userId ? supabase.from('votos_publicaciones').select('valor').eq('publicacion_id', id).eq('usuario_id', userId).maybeSingle() : Promise.resolve({ data: null }),
          userId ? supabase.from('votos_comentarios').select('comentario_id, valor, foro_comentarios!inner(publicacion_id)').eq('usuario_id', userId).eq('foro_comentarios.publicacion_id', id) : Promise.resolve({ data: [] }),
        ]);
        const fallo = [publicacion, listaComentarios, perfil, voto, votos].find(resultado => resultado.error);
        if (fallo) throw fallo.error;
        if (!activo) return;
        setPost(publicacion.data);
        setComentarios(listaComentarios.data || []);
        setPerfilActual(perfil.data);
        setMiVotoPost(voto.data?.valor || null);
        setVotosComentarios(Object.fromEntries((votos.data || []).map(v => [v.comentario_id, v.valor])));
        setContenidoEditado(publicacion.data?.contenido || '');
        setEditandoPost(false);
        setModalBorrar(false);
      } catch {
        if (activo) { setErrorCarga(true); toast.error('No se pudo cargar la publicación.'); }
      } finally {
        if (activo) setCargando(false);
      }
    };
    cargarTodo();
    return () => { activo = false; };
  }, [id, userId, recarga]);

  useEffect(() => {
    if (cargando || !location.hash) return;
    const frame = requestAnimationFrame(() => document.getElementById(location.hash.slice(1))?.scrollIntoView({ block: 'center', behavior: 'smooth' }));
    return () => cancelAnimationFrame(frame);
  }, [cargando, location.hash]);

  const respuestasPorPadre = useMemo(() => {
    const mapa = new Map();
    const ids = new Set(comentarios.map(comentario => comentario.id));
    comentarios.forEach(comentario => {
      const parent = ids.has(comentario.parent_id) ? comentario.parent_id : null;
      if (!mapa.has(parent)) mapa.set(parent, []);
      mapa.get(parent).push(comentario);
    });
    return mapa;
  }, [comentarios]);

  const manejarVotoPost = async valor => {
    if (!perfilActual || pendiente.current) return;
    pendiente.current = true; setOperacion('voto');
    try {
      const nuevoVoto = await guardarVoto({ tabla: 'votos_publicaciones', columna: 'publicacion_id', id, usuarioId: userId, valor, votoAnterior: miVotoPost });
      setMiVotoPost(nuevoVoto);
      const { data, error } = await supabase.from('foro_publicaciones').select('puntuacion').eq('id', id).single();
      if (error) toast.error('Voto guardado. Recarga para actualizar la puntuación.');
      else setPost(prev => ({ ...prev, puntuacion: data.puntuacion }));
    } catch { toast.error('No se pudo guardar tu voto.'); }
    finally { pendiente.current = false; setOperacion(null); }
  };

  const manejarVotoComentario = useCallback(async (comentarioId, valor, votoAnterior) => {
    if (!userId || votoComentarioPendiente.current.has(comentarioId)) return;
    votoComentarioPendiente.current.add(comentarioId);
    try {
      const nuevoVoto = await guardarVoto({ tabla: 'votos_comentarios', columna: 'comentario_id', id: comentarioId, usuarioId: userId, valor, votoAnterior });
      setVotosComentarios(prev => ({ ...prev, [comentarioId]: nuevoVoto }));
      const { data, error } = await supabase.from('foro_comentarios').select('puntuacion').eq('id', comentarioId).single();
      if (error) toast.error('Voto guardado. Recarga para actualizar la puntuación.');
      else setComentarios(prev => prev.map(c => c.id === comentarioId ? { ...c, puntuacion: data.puntuacion } : c));
    } catch { toast.error('No se pudo guardar tu voto.'); }
    finally { votoComentarioPendiente.current.delete(comentarioId); }
  }, [userId]);

  const publicarComentario = async () => {
    if (!perfilActual || !nuevoComentario.trim() || pendiente.current) return;
    pendiente.current = true; setOperacion('comentario');
    try {
      const texto = nuevoComentario.trim();
      const { data, error } = await supabase.from('foro_comentarios').insert({ publicacion_id: id, autor_id: userId, contenido: texto }).select('*').single();
      if (error) throw error;
      setComentarios(prev => [...prev, { ...data, autor: perfilActual }]);
      setNuevoComentario('');
      toast.success('Comentario publicado.');
      try {
        await enviarNotificacion(post.autor_id, userId, 'comentario', id, data.id);
        await procesarMenciones(texto, userId, id, data.id, [post.autor_id]);
      } catch { toast.error('Comentario guardado; no se pudieron enviar las notificaciones.'); }
    } catch { toast.error('No se pudo comentar. Tu texto sigue aquí.'); }
    finally { pendiente.current = false; setOperacion(null); }
  };

  const guardarEdicionPost = async () => {
    if (!contenidoEditado.trim() || pendiente.current) return;
    pendiente.current = true; setOperacion('edicion');
    try {
      const { data, error } = await supabase.from('foro_publicaciones').update({ contenido: contenidoEditado.trim(), actualizado_en: new Date().toISOString() }).eq('id', id).eq('autor_id', userId).select('contenido, actualizado_en').single();
      if (error) throw error;
      setPost(prev => ({ ...prev, ...data })); setEditandoPost(false);
      toast.success('Cambios guardados.');
    } catch { toast.error('No se pudieron guardar los cambios.'); }
    finally { pendiente.current = false; setOperacion(null); }
  };

  const confirmarBorradoPost = async () => {
    if (pendiente.current) return;
    pendiente.current = true; setOperacion('borrado');
    try {
      const { error } = await supabase.from('foro_publicaciones').update({ estado: 'eliminado' }).eq('id', id).eq('autor_id', userId).select('id').single();
      if (error) throw error;
      toast.success('Publicación eliminada.'); navigate(RUTAS.FORO);
    } catch { toast.error('No se pudo eliminar la publicación.'); }
    finally { pendiente.current = false; setOperacion(null); }
  };

  if (cargando) return <div role="status" className="foro-page fdetail-page fdetail-state"><div className="fdetail-spinner" /><span>Cargando publicación...</span></div>;
  if (errorCarga || !post) return <div className="foro-page fdetail-page fdetail-state"><MessageSquare size={42} aria-hidden="true" /><h1>{errorCarga ? 'El debate está fuera de señal.' : 'Este debate ya no está disponible.'}</h1><p>{errorCarga ? 'No se pudo conectar con la publicación.' : 'Puedes encontrar más conversaciones en el foro.'}</p><div className="fdetail-state-actions">{errorCarga && <button onClick={() => setRecarga(prev => prev + 1)} className="fdetail-button fdetail-button-primary">Reintentar</button>}<Link to={RUTAS.FORO} className="fdetail-button fdetail-button-secondary"><ArrowLeft size={18} /> Volver al foro</Link></div></div>;

  const esAutorDelPost = perfilActual?.id === post.autor_id;
  const rangoAutor = obtenerRango(post.autor?.nivel_rol);
  const nombreAutor = post.autor?.apodo || post.autor?.discord_nombre || 'Jugador';

  return (
    <MotionConfig reducedMotion={motionEnabled ? 'never' : 'always'} transition={{ duration: motionEnabled ? .35 : 0 }}>
      <div className="foro-page fdetail-page" data-motion={motionEnabled ? 'on' : 'off'}>
        <div className="fdetail-container">
          <div className="fdetail-topline"><Link to={RUTAS.FORO} className="fdetail-back"><ArrowLeft size={18} /> Volver al foro</Link><span>FORO <b>THC</b><ArrowUpRight size={18} aria-hidden="true" /></span></div>
          <motion.article className="fdetail-article" initial={motionEnabled ? { opacity: 0, y: 24 } : false} animate={{ opacity: 1, y: 0 }}>
            <div className="fdetail-vote-rail">
              <span className="fdetail-vote-label">La tribuna vota</span>
              <div className="fdetail-post-votes">
                <button aria-label="Votar a favor" aria-pressed={miVotoPost === 1} disabled={!!operacion} onClick={() => manejarVotoPost(1)} className={`fdetail-vote-button fdetail-vote-positive ${miVotoPost === 1 ? 'is-selected' : ''}`}><Star size={23} /><span>A favor</span></button>
                <div className="fdetail-score"><strong>{post.puntuacion || 0}</strong><span>puntos</span></div>
                <button aria-label="Votar en contra" aria-pressed={miVotoPost === -1} disabled={!!operacion} onClick={() => manejarVotoPost(-1)} className={`fdetail-vote-button fdetail-vote-negative ${miVotoPost === -1 ? 'is-selected' : ''}`}><CloudLightning size={23} /><span>En contra</span></button>
              </div>
            </div>
            <div className="fdetail-post-main">
              <header className="fdetail-post-header">
                <Link to={`${RUTAS.PERFIL}/${encodeURIComponent(post.autor?.discord_nombre || '')}`} className="fdetail-author"><img src={post.autor?.avatar_url || '/imagenes/LogoTHC.png'} alt="" /><span>{nombreAutor}</span></Link>
                <span className="fdetail-role" style={{ color: rangoAutor.color }}>{rangoAutor.nombre}</span>
                <time dateTime={post.creado_en}>{new Date(post.creado_en).toLocaleString('es-ES', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</time>
                {esAutorDelPost && !editandoPost && <div className="fdetail-author-tools"><button aria-label="Editar publicación" disabled={!!operacion} onClick={() => setEditandoPost(true)} className="fdetail-icon-button"><Edit3 size={18} /></button><button aria-label="Eliminar publicación" disabled={!!operacion} onClick={() => setModalBorrar(true)} className="fdetail-icon-button fdetail-danger"><Trash2 size={18} /></button></div>}
              </header>
              <span className="fdetail-category"><Hash size={15} aria-hidden="true" />{post.etiqueta || 'Debate'}</span>
              <h1 className="fdetail-title">{post.titulo}</h1>
              {editandoPost ? <div className="fdetail-edit"><label htmlFor="editar-post">Editar tu mensaje</label><textarea id="editar-post" rows={6} maxLength={10000} disabled={!!operacion} value={contenidoEditado} onChange={event => setContenidoEditado(event.target.value)} className="fdetail-textarea" /><div className="fdetail-form-actions"><button disabled={!!operacion} onClick={() => { setEditandoPost(false); setContenidoEditado(post.contenido); }} className="fdetail-button fdetail-button-secondary">Cancelar</button><button disabled={!!operacion || !contenidoEditado.trim()} onClick={guardarEdicionPost} className="fdetail-button fdetail-button-primary">{operacion === 'edicion' ? 'Guardando...' : 'Guardar'}</button></div></div> : <p className="fdetail-content"><TextoMenciones texto={post.contenido} /></p>}
              {post.imagenes?.length > 0 && <div className="fdetail-attachments">{post.imagenes.map(imagenSegura).filter(Boolean).map((img, idx) => <a key={idx} href={img} target="_blank" rel="noopener noreferrer"><img loading="lazy" decoding="async" src={img} alt="Imagen adjunta" /><span>Ver imagen<ArrowUpRight size={17} /></span></a>)}</div>}
            </div>
          </motion.article>
          <section className="fdetail-discussion">
            <div className="fdetail-discussion-heading"><div><span className="fdetail-eyebrow">TU VOZ TAMBIÉN JUEGA</span><h2><MessageSquare size={29} aria-hidden="true" />Discusión <span>{comentarios.length}</span></h2></div><p>El debate lo hacemos entre todos.</p></div>
            <div className="fdetail-comment-compose">
              <img src={perfilActual?.avatar_url || '/imagenes/LogoTHC.png'} alt="" />
              <div className="fdetail-comment-compose-main"><label htmlFor="nuevo-comentario">Suma tu voz</label><textarea id="nuevo-comentario" ref={textAreaRef} rows={3} maxLength={10000} disabled={!!operacion} placeholder="Suma tu voz a la discusión..." value={nuevoComentario} onChange={e => setNuevoComentario(e.target.value)} /><div className="fdetail-comment-compose-footer"><span>Una opinión. Otra jugada.</span><button onClick={publicarComentario} disabled={!!operacion || !nuevoComentario.trim() || !perfilActual} className="fdetail-button fdetail-button-primary"><Send size={17} />{operacion === 'comentario' ? 'Enviando...' : 'Comentar'}</button></div></div>
            </div>
            <div className="fdetail-comments">{(respuestasPorPadre.get(null) || []).map(comentario => <Comentario key={comentario.id} comentario={comentario} autorPostId={post.autor_id} perfilActual={perfilActual} setComentarios={setComentarios} publicacionId={id} respuestasPorPadre={respuestasPorPadre} votosComentarios={votosComentarios} onVotar={manejarVotoComentario} />)}</div>
          </section>
        </div>
        <ForoDialog isOpen={modalBorrar} onClose={() => setModalBorrar(false)} titleId="eliminar-publicacion-titulo" busy={operacion === 'borrado'}><div className="fdetail-delete-dialog"><span className="fdetail-eyebrow">TU PUBLICACIÓN</span><h2 id="eliminar-publicacion-titulo">¿Eliminar este debate?</h2><p>La publicación dejará de aparecer en el foro.</p><div className="fdetail-form-actions"><button disabled={!!operacion} onClick={() => setModalBorrar(false)} className="fdetail-button fdetail-button-secondary">Cancelar</button><button disabled={!!operacion} onClick={confirmarBorradoPost} className="fdetail-button fdetail-button-delete">{operacion === 'borrado' ? 'Eliminando...' : 'Eliminar'}</button></div></div></ForoDialog>
      </div>
    </MotionConfig>
  );
}

