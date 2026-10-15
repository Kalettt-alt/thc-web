import { useState, useRef, useEffect } from 'react';
import { X, Send, Hash, Loader2, Zap, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../utils/supabase';
import { ETIQUETAS_FORO } from '../../utils/foro';
import { createForumDraft, disposeForumDraft, saveForumDraft } from '../../utils/forumMedia';
import ForoDialog from './ForoDialog';
import ForoImagePicker from './ForoImagePicker';
import useForumAttachments from './useForumAttachments';
import { useHomeMotion } from '../../utils/homeMotion';

export default function CrearPublicacionModal({ isOpen, onClose, perfilActual, onPublicacionCreada }) {
  const { motionEnabled } = useHomeMotion();
  const [titulo, setTitulo] = useState('');
  const [contenido, setContenido] = useState('');
  const [etiqueta, setEtiqueta] = useState('Normal');
  const [publicando, setPublicando] = useState(false);
  const envioRef = useRef(false);
  const draftRef = useRef(null);
  const mountedRef = useRef(true);
  const { attachments, selecting, addFiles, remove, reset } = useForumAttachments();
  const authorId = perfilActual?.id;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (!envioRef.current) void disposeForumDraft(supabase, { draft: draftRef.current, table: 'foro_publicaciones', authorId });
    };
  }, [authorId]);

  const cerrar = () => {
    if (envioRef.current || selecting) return;
    void disposeForumDraft(supabase, { draft: draftRef.current, table: 'foro_publicaciones', authorId });
    draftRef.current = null;
    reset();
    onClose();
  };

  const publicar = async (event) => {
    event.preventDefault();
    if (envioRef.current || selecting) return;
    if (!perfilActual?.id) return toast.error('No se pudo cargar tu perfil. Vuelve a intentarlo.');
    if (!titulo.trim() || !contenido.trim()) return toast.error('Completa el título y el mensaje.');
    envioRef.current = true;
    setPublicando(true);
    try {
      if (!draftRef.current) draftRef.current = createForumDraft();
      const data = await saveForumDraft(supabase, { draft: draftRef.current, table: 'foro_publicaciones', authorId,
        values: { titulo: titulo.trim(), contenido: contenido.trim(), etiqueta }, attachments });
      if (!mountedRef.current) return;
      onPublicacionCreada({ ...data, autor: perfilActual, comentarios_count: 0 });
      setTitulo(''); setContenido(''); reset(); draftRef.current = null;
      toast.success('Tu debate fue publicado.');
      onClose();
    } catch (error) {
      if (mountedRef.current) toast.error(error.message || 'No se pudo publicar. Tu borrador sigue aquí; inténtalo de nuevo.');
    } finally {
      envioRef.current = false;
      if (mountedRef.current) setPublicando(false);
      else void disposeForumDraft(supabase, { draft: draftRef.current, table: 'foro_publicaciones', authorId });
    }
  };

  return (
    <ForoDialog isOpen={isOpen} onClose={cerrar} titleId="crear-hilo-titulo" busy={publicando || selecting}>
      <form onSubmit={publicar} className="foro-compose" data-motion={motionEnabled ? 'on' : 'off'}>
        <div className="foro-compose-header">
          <div>
            <p className="foro-eyebrow"><Zap size={15} aria-hidden="true" /> Una idea puede hacer ruido.</p>
            <h2 id="crear-hilo-titulo">Crear <span>debate.</span></h2>
            <p>Abre una conversación con la comunidad THC.</p>
          </div>
          <button type="button" aria-label="Cerrar formulario" disabled={publicando || selecting} onClick={cerrar} className="foro-compose-close"><X size={21} /></button>
        </div>
        <div className="foro-dialog-content foro-compose-body">
          <fieldset disabled={publicando}>
            <legend><Hash size={18} aria-hidden="true" />Elige el tema</legend>
            <div className="foro-compose-categories">
              {Object.entries(ETIQUETAS_FORO).map(([key, config]) => (
                <button type="button" key={key} aria-pressed={etiqueta === key} onClick={() => setEtiqueta(key)} className={`foro-compose-tag ${etiqueta === key ? 'is-selected' : ''}`}>{etiqueta === key && <Check size={15} aria-hidden="true" />}{config.nombre}</button>
              ))}
            </div>
          </fieldset>
          <div className="foro-compose-field">
            <label htmlFor="foro-titulo">Ponle un título</label>
            <input id="foro-titulo" required maxLength={160} disabled={publicando} placeholder="¿De qué quieres hablar?" value={titulo} onChange={e => setTitulo(e.target.value)} className="foro-compose-input" />
          </div>
          <div className="foro-compose-field">
            <label htmlFor="foro-contenido">Tu mensaje</label>
            <textarea id="foro-contenido" required maxLength={10000} disabled={publicando} rows={6} placeholder="Comparte una idea, una jugada o algo que quieras debatir..." value={contenido} onChange={e => setContenido(e.target.value)} className="foro-compose-textarea" />
            <p className="foro-compose-help"><span>Respeta a la comunidad y mantén el debate en su tema.</span></p>
          </div>
          <div className="foro-compose-field">
            <ForoImagePicker attachments={attachments} onAddFiles={addFiles} onRemove={remove} disabled={publicando} selecting={selecting} />
          </div>
        </div>
        <div className="foro-compose-footer">
          <button type="button" disabled={publicando || selecting} onClick={cerrar}>Cancelar</button>
          <button type="submit" disabled={publicando || selecting || !titulo.trim() || !contenido.trim()} className="foro-primary">{publicando ? <Loader2 size={18} className="foro-compose-spinner" /> : <Send size={18} />} {publicando ? 'Publicando...' : 'Publicar debate'}</button>
        </div>
      </form>
    </ForoDialog>
  );
}
