import { useId } from 'react';
import { ImagePlus, Loader2, X } from 'lucide-react';
import { FORUM_IMAGE_ACCEPT, FORUM_IMAGE_LIMIT } from '../../utils/forumMedia.js';

export default function ForoImagePicker({ attachments, onAddFiles, onRemove, disabled = false, selecting = false, compact = false }) {
  const id = useId();
  const blocked = disabled || selecting;
  return (
    <div className={`foro-file-picker ${compact ? 'foro-file-picker--compact' : ''}`}>
      <div className="foro-file-picker-toolbar">
        <label htmlFor={id} className="foro-file-picker-button" data-disabled={blocked || attachments.length >= FORUM_IMAGE_LIMIT}>
          {selecting ? <Loader2 size={18} className="foro-compose-spinner" aria-hidden="true" /> : <ImagePlus size={18} aria-hidden="true" />}
          {selecting ? 'Preparando...' : 'Adjuntar imágenes'}
          <input id={id} className="foro-file-picker-input" type="file" multiple accept={FORUM_IMAGE_ACCEPT} aria-label="Adjuntar imágenes desde tu dispositivo" disabled={blocked || attachments.length >= FORUM_IMAGE_LIMIT} onChange={event => { const files = Array.from(event.target.files || []); event.target.value = ''; if (files.length) onAddFiles(files); }} />
        </label>
        <span className="foro-file-picker-limit">{attachments.length} / {FORUM_IMAGE_LIMIT} · 5 MB por imagen</span>
      </div>
      {attachments.length > 0 && <div className="foro-file-picker-previews">{attachments.map(item => (
        <figure key={item.id}>
          <img src={item.preview} alt={`Vista previa de ${item.file.name}`} />
          <button type="button" aria-label={`Quitar ${item.file.name}`} disabled={blocked} onClick={() => onRemove(item.id)}><X size={17} aria-hidden="true" /></button>
          <figcaption title={item.file.name}>{item.file.name}</figcaption>
        </figure>
      ))}</div>}
    </div>
  );
}
