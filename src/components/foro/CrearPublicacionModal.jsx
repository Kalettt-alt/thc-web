import { useState, useRef } from 'react';
import { X, Send, ImagePlus, Hash, Loader2, Zap, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../utils/supabase';
import { ETIQUETAS_FORO, imagenSegura } from '../../utils/foro';
import ForoDialog from './ForoDialog';
import { useHomeMotion } from '../../utils/homeMotion';

export default function CrearPublicacionModal({ isOpen, onClose, perfilActual, onPublicacionCreada }) {
  const { motionEnabled } = useHomeMotion();
  const [titulo, setTitulo] = useState('');
  const [contenido, setContenido] = useState('');
  const [etiqueta, setEtiqueta] = useState('Normal');
  const [imagenUrl, setImagenUrl] = useState('');
  const [imagenes, setImagenes] = useState([]);
  const [publicando, setPublicando] = useState(false);
  const envioRef = useRef(false);

  const agregarImagen = () => {
    const url = imagenSegura(imagenUrl.trim());
    if (!url) return toast.error('Introduce una dirección HTTPS válida para la imagen.');
    if (imagenes.length >= 4) return toast.error('Puedes adjuntar hasta 4 imágenes.');
    setImagenes(prev => [...new Set([...prev, url])]);
    setImagenUrl('');
  };

  const publicar = async (event) => {
    event.preventDefault();
    if (envioRef.current) return;
    if (!perfilActual?.id) return toast.error('No se pudo cargar tu perfil. Vuelve a intentarlo.');
    if (!titulo.trim() || !contenido.trim()) return toast.error('Completa el título y el mensaje.');
    envioRef.current = true;
    setPublicando(true);
    try {
      const { data, error } = await supabase.from('foro_publicaciones').insert({
        autor_id: perfilActual.id, titulo: titulo.trim(), contenido: contenido.trim(), etiqueta, imagenes,
      }).select('*').single();
      if (error) throw error;
      onPublicacionCreada({ ...data, autor: perfilActual, comentarios_count: 0 });
      setTitulo(''); setContenido(''); setImagenes([]); setImagenUrl('');
      toast.success('Tu debate fue publicado.');
      onClose();
    } catch {
      toast.error('No se pudo publicar. Tu borrador sigue aquí; inténtalo de nuevo.');
    } finally {
      envioRef.current = false;
      setPublicando(false);
    }
  };

  return (
    <ForoDialog isOpen={isOpen} onClose={onClose} titleId="crear-hilo-titulo" busy={publicando}>
      <form onSubmit={publicar} className="foro-compose" data-motion={motionEnabled ? 'on' : 'off'}>
        <div className="foro-compose-header">
          <div>
            <p className="foro-eyebrow"><Zap size={15} aria-hidden="true" /> Una idea puede hacer ruido.</p>
            <h2 id="crear-hilo-titulo">Crear <span>debate.</span></h2>
            <p>Abre una conversación con la comunidad THC.</p>
          </div>
          <button type="button" aria-label="Cerrar formulario" disabled={publicando} onClick={onClose} className="foro-compose-close"><X size={21} /></button>
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
            <label htmlFor="foro-imagen"><ImagePlus size={18} aria-hidden="true" />Imágenes <span>Opcional</span></label>
            <div className="foro-compose-image-input">
              <input id="foro-imagen" type="url" disabled={publicando} value={imagenUrl} onChange={e => setImagenUrl(e.target.value)} placeholder="https://..." className="foro-compose-input" />
              <button type="button" onClick={agregarImagen} disabled={publicando || !imagenUrl.trim()}><ImagePlus size={18} /> Añadir</button>
            </div>
            <p className="foro-compose-help"><span>Usa un enlace HTTPS. Hasta cuatro imágenes.</span><span>{imagenes.length} / 4</span></p>
            {imagenes.length > 0 && <div className="foro-compose-images">{imagenes.map(url => <div key={url}><img src={url} alt="Vista previa del adjunto" /><button type="button" aria-label="Quitar imagen" disabled={publicando} onClick={() => setImagenes(prev => prev.filter(img => img !== url))}><X size={17} /></button></div>)}</div>}
          </div>
        </div>
        <div className="foro-compose-footer">
          <button type="button" disabled={publicando} onClick={onClose}>Cancelar</button>
          <button type="submit" disabled={publicando || !titulo.trim() || !contenido.trim()} className="foro-primary">{publicando ? <Loader2 size={18} className="foro-compose-spinner" /> : <Send size={18} />} {publicando ? 'Publicando...' : 'Publicar debate'}</button>
        </div>
      </form>
    </ForoDialog>
  );
}
