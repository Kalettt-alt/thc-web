import { useState, useRef, memo } from 'react';
import { supabase } from '../../utils/supabase';
import { CornerDownRight, Star, CloudLightning, Edit3, Trash2, Send } from 'lucide-react';
import { motion, useInView } from 'framer-motion';
import toast from 'react-hot-toast';
import { obtenerRango } from '../../utils/roles';
import { enviarNotificacion, procesarMenciones } from '../../utils/foro';
import TextoMenciones from './TextoMenciones';
import ForoDialog from './ForoDialog';
import { useHomeMotion } from '../../utils/homeMotion';

function Comentario({ comentario, autorPostId, perfilActual, setComentarios, publicacionId, respuestasPorPadre, votosComentarios, onVotar, depth = 0 }) {
  const commentRef = useRef(null);
  const visible = useInView(commentRef, { amount: 0.12 });
  const { motionEnabled } = useHomeMotion();
  const [respondiendo, setRespondiendo] = useState(false);
  const [textoRespuesta, setTextoRespuesta] = useState('');
  const [editando, setEditando] = useState(false);
  const [contenidoEditado, setContenidoEditado] = useState(comentario.contenido);
  const [modalBorrar, setModalBorrar] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const pendiente = useRef(false);
  const esMiComentario = perfilActual?.id === comentario.autor_id;
  const rango = obtenerRango(comentario.autor?.nivel_rol);
  const respuestas = respuestasPorPadre.get(comentario.id) || [];
  const miVoto = votosComentarios[comentario.id];

  const ejecutar = async accion => {
    if (pendiente.current) return;
    if (!perfilActual) return toast.error('Espera a que se cargue tu perfil.');
    pendiente.current = true; setOcupado(true);
    try { await accion(); }
    catch { toast.error('No se pudo completar la acción. Inténtalo de nuevo.'); }
    finally { pendiente.current = false; setOcupado(false); }
  };

  const responder = () => ejecutar(async () => {
    if (!textoRespuesta.trim()) return;
    const contenido = textoRespuesta.trim();
    const { data, error } = await supabase.from('foro_comentarios').insert({ publicacion_id: publicacionId, autor_id: perfilActual.id, parent_id: comentario.id, contenido }).select('*').single();
    if (error) throw error;
    setComentarios(prev => [...prev, { ...data, autor: perfilActual }]);
    setTextoRespuesta(''); setRespondiendo(false);
    toast.success('Respuesta publicada.');
    try {
      await enviarNotificacion(comentario.autor_id, perfilActual.id, 'respuesta', publicacionId, data.id);
      await procesarMenciones(contenido, perfilActual.id, publicacionId, data.id, [comentario.autor_id]);
    } catch { toast.error('Respuesta guardada; no se pudieron enviar las notificaciones.'); }
  });

  const guardarEdicion = () => ejecutar(async () => {
    if (!contenidoEditado.trim()) return;
    const { data, error } = await supabase.from('foro_comentarios').update({ contenido: contenidoEditado.trim() }).eq('id', comentario.id).eq('autor_id', perfilActual.id).select('contenido').single();
    if (error) throw error;
    setComentarios(prev => prev.map(c => c.id === comentario.id ? { ...c, contenido: data.contenido } : c));
    setEditando(false); toast.success('Comentario actualizado.');
  });

  const borrar = () => ejecutar(async () => {
    const { error } = await supabase.from('foro_comentarios').update({ estado: 'eliminado' }).eq('id', comentario.id).eq('autor_id', perfilActual.id).select('id').single();
    if (error) throw error;
    setComentarios(prev => prev.filter(c => c.id !== comentario.id));
    setModalBorrar(false); toast.success('Comentario eliminado.');
  });

  return (
    <div ref={commentRef} id={comentario.id} className="foro-comment-wrapper">
      <motion.article className="foro-comment" initial={false} animate={motionEnabled && !visible ? { opacity: 0.65, y: 8 } : { opacity: 1, y: 0 }} transition={{ duration: motionEnabled ? 0.35 : 0 }}>
        <header className="foro-comment-header">
          <img loading="lazy" src={comentario.autor?.avatar_url || '/imagenes/LogoTHC.png'} alt="" />
          <div className="foro-comment-author"><strong>{comentario.autor?.apodo || comentario.autor?.discord_nombre || 'Jugador'}</strong><span className="foro-comment-role" style={{ color: rango.color }}>{rango.nombre}</span></div>
          {comentario.autor_id === autorPostId && <span className="foro-comment-author-badge">Autor</span>}
          <time dateTime={comentario.creado_en}>{new Date(comentario.creado_en).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</time>
        </header>
        {editando ? <div className="foro-comment-editor"><label htmlFor={`editar-${comentario.id}`}>Edita tu comentario</label><textarea id={`editar-${comentario.id}`} disabled={ocupado} maxLength={10000} value={contenidoEditado} onChange={e => setContenidoEditado(e.target.value)} /><div className="foro-comment-form-actions"><button disabled={ocupado} onClick={() => { setEditando(false); setContenidoEditado(comentario.contenido); }} className="foro-comment-secondary">Cancelar</button><button disabled={ocupado || !contenidoEditado.trim()} onClick={guardarEdicion} className="foro-comment-primary">{ocupado ? 'Guardando...' : 'Guardar'}</button></div></div> : <p className="foro-comment-content"><TextoMenciones texto={comentario.contenido} /></p>}
        <div className="foro-comment-actions">
          <div className="foro-comment-votes">
            <button aria-label="Votar comentario a favor" aria-pressed={miVoto === 1} disabled={ocupado} onClick={() => ejecutar(() => onVotar(comentario.id, 1, miVoto))} className={`foro-comment-vote foro-comment-vote--positive ${miVoto === 1 ? 'is-selected' : ''}`}><Star size={17} /></button>
            <strong>{comentario.puntuacion || 0}</strong>
            <button aria-label="Votar comentario en contra" aria-pressed={miVoto === -1} disabled={ocupado} onClick={() => ejecutar(() => onVotar(comentario.id, -1, miVoto))} className={`foro-comment-vote foro-comment-vote--negative ${miVoto === -1 ? 'is-selected' : ''}`}><CloudLightning size={17} /></button>
          </div>
          <button disabled={ocupado} aria-expanded={respondiendo} aria-controls={`respuesta-form-${comentario.id}`} onClick={() => setRespondiendo(!respondiendo)} className="foro-comment-reply"><CornerDownRight size={18} /> Responder</button>
          {esMiComentario && !editando && <div className="foro-comment-tools"><button aria-label="Editar comentario" disabled={ocupado} onClick={() => setEditando(true)}><Edit3 size={17} /></button><button aria-label="Eliminar comentario" disabled={ocupado} onClick={() => setModalBorrar(true)} className="foro-comment-delete"><Trash2 size={17} /></button></div>}
        </div>
        {respondiendo && <motion.div id={`respuesta-form-${comentario.id}`} className="foro-comment-editor foro-comment-response" initial={motionEnabled ? { opacity: 0, y: 10 } : false} animate={{ opacity: 1, y: 0 }} transition={{ duration: motionEnabled ? 0.25 : 0 }}><label htmlFor={`respuesta-${comentario.id}`}>Tu respuesta</label><textarea id={`respuesta-${comentario.id}`} disabled={ocupado} maxLength={10000} rows={3} placeholder="Escribe tu respuesta..." value={textoRespuesta} onChange={e => setTextoRespuesta(e.target.value)} /><div className="foro-comment-form-actions"><button disabled={ocupado} onClick={() => setRespondiendo(false)} className="foro-comment-secondary">Cancelar</button><button onClick={responder} disabled={ocupado || !textoRespuesta.trim()} className="foro-comment-primary"><Send size={16} />{ocupado ? 'Enviando...' : 'Enviar'}</button></div></motion.div>}
      </motion.article>
      {respuestas.length > 0 && <div className={depth < 3 ? 'foro-comment-replies' : 'foro-comment-unindented'}>{respuestas.map(resp => <ComentarioMemo key={resp.id} comentario={resp} autorPostId={autorPostId} perfilActual={perfilActual} setComentarios={setComentarios} publicacionId={publicacionId} respuestasPorPadre={respuestasPorPadre} votosComentarios={votosComentarios} onVotar={onVotar} depth={depth + 1} />)}</div>}
      {modalBorrar && <ForoDialog isOpen={modalBorrar} onClose={() => setModalBorrar(false)} titleId={`borrar-${comentario.id}`} busy={ocupado}><div className="fdetail-delete-dialog"><span className="fdetail-eyebrow">TU COMENTARIO</span><h2 id={`borrar-${comentario.id}`}>¿Eliminar este comentario?</h2><p>Las respuestas de otros usuarios seguirán visibles.</p><div className="fdetail-form-actions"><button disabled={ocupado} onClick={() => setModalBorrar(false)} className="fdetail-button fdetail-button-secondary">Cancelar</button><button disabled={ocupado} onClick={borrar} className="fdetail-button fdetail-button-delete">{ocupado ? 'Eliminando...' : 'Eliminar'}</button></div></div></ForoDialog>}
    </div>
  );
}

const ComentarioMemo = memo(Comentario);
export default ComentarioMemo;
