import { useState, useEffect, useRef } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import * as htmlToImage from 'html-to-image';
import { Link } from 'react-router-dom';
import { RUTAS } from '../../utils/rutas';
import { supabase } from '../../utils/supabase';
import { Plus, Upload, Trash2, RotateCcw, ArrowLeft, Undo2, ArrowUpRight, ImagePlus, Download, MoreHorizontal, Eye, EyeOff, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { validateImageFile } from '../../utils/media';
import { createDebouncedStorageWriter } from '../../utils/debouncedStorage';
import { sendTierListToWebhook, validateDiscordWebhook } from './directDiscordShare';
import './TierList.css';

const imageModules = import.meta.glob('./Imagenes/*.{png,jpg,jpeg,gif,webp}', { eager: true });
const DEFAULT_IMAGES = Object.keys(imageModules).map((path, index) => ({ id: `base-img-${index}`, src: imageModules[path].default || imageModules[path] }));
const INITIAL_TIERS = [
  { id: 'tier-s', label: 'S', color: '#ff7a18', items: [], bgImage: null },
  { id: 'tier-a', label: 'A', color: '#ffb568', items: [], bgImage: null },
  { id: 'tier-b', label: 'B', color: '#efcfa7', items: [], bgImage: null },
  { id: 'tier-c', label: 'C', color: '#b6c5ba', items: [], bgImage: null },
  { id: 'tier-d', label: 'D', color: '#a0b1c3', items: [], bgImage: null },
];
const baseImages = new Map(DEFAULT_IMAGES.map(image => [image.id, image]));
const isImageData = value => /^data:image\/(png|jpeg|gif|webp);base64,[a-z\d+/=]+$/i.test(value || '');
const restoreItem = item => {
  if (!item || typeof item.id !== 'string') return null;
  if (baseImages.has(item.id)) return baseImages.get(item.id);
  return isImageData(item.src) ? { id: item.id, src: item.src } : null;
};
const fileToBase64 = file => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = reject;
  reader.readAsDataURL(file);
});
const labelColor = color => {
  const rgb = color.slice(1).match(/.{2}/g)?.map(value => parseInt(value, 16)) || [255, 255, 255];
  return rgb[0] * 0.299 + rgb[1] * 0.587 + rgb[2] * 0.114 > 140 ? '#16120e' : '#fffaf3';
};
function readSavedBoard(key) {
  const fallback = { title: 'MI TIER LIST', tiers: INITIAL_TIERS, bank: DEFAULT_IMAGES, uploadedCount: 0 };
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const saved = JSON.parse(raw);
    if (!Array.isArray(saved.savedTiers) || !Array.isArray(saved.savedBank)) return fallback;
    const seen = new Set(); const tierIds = new Set();
    const restoreUnique = items => items.map(restoreItem).filter(item => {
      if (!item || seen.has(item.id)) return false;
      seen.add(item.id); return true;
    });
    const tiers = saved.savedTiers.filter(tier => {
      if (!tier || typeof tier.id !== 'string' || tier.id === 'bank' || tierIds.has(tier.id) || !Array.isArray(tier.items)) return false;
      tierIds.add(tier.id); return true;
    }).map(tier => ({ id: tier.id, label: String(tier.label || '').slice(0, 40), color: /^#[\da-f]{6}$/i.test(tier.color) ? tier.color : '#ff7a18', bgImage: isImageData(tier.bgImage) ? tier.bgImage : null, items: restoreUnique(tier.items) }));
    return { title: typeof saved.savedTitle === 'string' ? saved.savedTitle.slice(0, 50) : fallback.title, tiers, bank: restoreUnique(saved.savedBank), uploadedCount: Number.isInteger(saved.savedCount) && saved.savedCount >= 0 ? saved.savedCount : 0 };
  } catch { return fallback; }
}
function TierImage({ item, index, selected, onSelect, disabled }) {
  return <Draggable draggableId={item.id} index={index} isDragDisabled={disabled}>
    {(provided, snapshot) => <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}
      className={`tierstudio-image${snapshot.isDragging ? ' is-dragging' : ''}${selected ? ' is-selected' : ''}`}
      onClick={event => { if (!event.defaultPrevented && !disabled) onSelect(item.id); }}
      aria-label={`Mover imagen ${index + 1}`} aria-pressed={selected}
    ><img src={item.src} alt="" draggable={false} decoding="async" /></div>}
  </Draggable>;
}

export default function TierList({ session }) {
  return <TierListEditor key={session?.user?.id || 'guest'} session={session} />;
}

function TierListEditor({ session }) {
  const userId = session?.user?.id;
  const storageKey = `thc_tierlist_${userId || 'guest'}`;
  const [initial] = useState(() => readSavedBoard(storageKey));
  const [title, setTitle] = useState(initial.title);
  const [tiers, setTiers] = useState(initial.tiers);
  const [bank, setBank] = useState(initial.bank);
  const [history, setHistory] = useState([]);
  const [uploadedCount, setUploadedCount] = useState(initial.uploadedCount);
  const [uploadLimit, setUploadLimit] = useState(3);
  const [isExporting, setIsExporting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [exportKind, setExportKind] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [webhook, setWebhook] = useState('');
  const [showWebhook, setShowWebhook] = useState(false);
  const [storageWriter] = useState(() => createDebouncedStorageWriter({
    write: (key, value) => localStorage.setItem(key, value),
    onError: () => toast.error('El dispositivo no tiene espacio para guardar el tablero. Reduce las imágenes subidas.', { id: 'tierlist-storage' }),
  }));
  const boardRef = useRef(null);
  const webhookRef = useRef(null);
  const exportLock = useRef(false);
  const uploadLock = useRef(false);

  useEffect(() => {
    let active = true;
    if (userId) supabase.from('perfiles').select('nivel_rol').eq('id', userId).single().then(({ data, error }) => {
      if (active && !error && data) setUploadLimit(data.nivel_rol >= 10 ? 5 : 3);
    }).catch(() => {});
    return () => { active = false; };
  }, [userId]);
  useEffect(() => {
    storageWriter.queue(storageKey, { savedTitle: title, savedTiers: tiers, savedBank: bank, savedCount: uploadedCount });
  }, [title, tiers, bank, uploadedCount, storageKey, storageWriter]);
  useEffect(() => () => storageWriter.flush(), [storageKey, storageWriter]);

  const saveHistory = () => setHistory(previous => [...previous.slice(-29), { title, tiers, bank, uploadedCount }]);
  const undo = () => {
    const previous = history.at(-1); if (!previous) return;
    setTitle(previous.title); setTiers(previous.tiers); setBank(previous.bank); setUploadedCount(previous.uploadedCount);
    setHistory(current => current.slice(0, -1)); setSelectedId(null);
  };
  const moveItem = (source, destination) => {
    if (!destination || (source.droppableId === destination.droppableId && source.index === destination.index)) return;
    const getList = id => id === 'bank' ? bank : tiers.find(tier => tier.id === id)?.items;
    if (!getList(source.droppableId)?.[source.index] || !getList(destination.droppableId)) return;
    saveHistory();
    const sourceList = [...getList(source.droppableId)];
    const destinationList = source.droppableId === destination.droppableId ? sourceList : [...getList(destination.droppableId)];
    const [moved] = sourceList.splice(source.index, 1); destinationList.splice(destination.index, 0, moved);
    const changed = { [source.droppableId]: sourceList, [destination.droppableId]: destinationList };
    if (changed.bank) setBank(changed.bank);
    setTiers(previous => previous.map(tier => changed[tier.id] ? { ...tier, items: changed[tier.id] } : tier)); setSelectedId(null);
  };
  const moveSelected = destinationId => {
    if (!selectedId || !destinationId) return;
    const sourceTier = tiers.find(tier => tier.items.some(item => item.id === selectedId));
    const sourceList = sourceTier ? sourceTier.items : bank;
    const destinationList = destinationId === 'bank' ? bank : tiers.find(tier => tier.id === destinationId)?.items;
    if (!destinationList) return;
    moveItem({ droppableId: sourceTier?.id || 'bank', index: sourceList.findIndex(item => item.id === selectedId) }, { droppableId: destinationId, index: destinationList.length });
  };
  const selectImage = id => setSelectedId(previous => previous === id ? null : id);
  const selectedImage = selectedId ? [...bank, ...tiers.flatMap(tier => tier.items)].find(item => item.id === selectedId) : null;
  const addTier = () => { saveHistory(); setTiers(previous => [...previous, { id: `tier-${crypto.randomUUID()}`, label: 'Nueva', color: '#ffb568', items: [], bgImage: null }]); };
  const changeTier = (id, fields) => setTiers(previous => previous.map(tier => tier.id === id ? { ...tier, ...fields } : tier));
  const clearTier = id => {
    const tier = tiers.find(item => item.id === id); if (!tier || (!tier.items.length && !tier.bgImage)) return;
    saveHistory(); setBank(previous => [...previous, ...tier.items]); changeTier(id, { items: [], bgImage: null }); setSelectedId(null);
  };
  const deleteTier = id => {
    const tier = tiers.find(item => item.id === id); if (!tier) return;
    saveHistory(); setBank(previous => [...previous, ...tier.items]); setTiers(previous => previous.filter(item => item.id !== id)); setSelectedId(null);
  };
  const reset = () => {
    saveHistory(); setTitle('MI TIER LIST'); setTiers(INITIAL_TIERS); setBank(DEFAULT_IMAGES); setUploadedCount(0); setSelectedId(null);
    toast.success('Tablero reiniciado. Puedes deshacerlo.');
  };
  const uploadBackground = async (id, event) => {
    const file = event.target.files?.[0]; event.target.value = '';
    if (!file || uploadLock.current) return;
    uploadLock.current = true; setIsUploading(true);
    try {
      await validateImageFile(file, { maxBytes: 1024 * 1024 });
      const data = await fileToBase64(file); saveHistory(); changeTier(id, { bgImage: data });
    } catch (error) { toast.error(error.message || 'No pudimos leer la imagen.'); }
    finally { uploadLock.current = false; setIsUploading(false); }
  };
  const uploadImages = async event => {
    const files = Array.from(event.target.files || []); event.target.value = '';
    if (!files.length || uploadLock.current) return;
    if (uploadedCount + files.length > uploadLimit) { toast.error(`Puedes añadir hasta ${uploadLimit} fotos propias.`); return; }
    uploadLock.current = true; setIsUploading(true);
    try {
      const items = [];
      for (const file of files) { await validateImageFile(file, { maxBytes: 1024 * 1024 }); items.push({ id: `custom-${crypto.randomUUID()}`, src: await fileToBase64(file) }); }
      saveHistory(); setBank(previous => [...previous, ...items]); setUploadedCount(previous => previous + files.length);
      toast.success(files.length === 1 ? 'Imagen añadida.' : `${files.length} imágenes añadidas.`);
    } catch (error) { toast.error(error.message || 'No pudimos leer las imágenes.'); }
    finally { uploadLock.current = false; setIsUploading(false); }
  };
  const exportImage = async kind => {
    if (!boardRef.current || exportLock.current || isUploading) return;
    if (kind === 'discord') try { validateDiscordWebhook(webhook); } catch (error) { toast.error(error.message, { id: 'tierlist-share' }); webhookRef.current?.focus(); return; }
    exportLock.current = true; setIsExporting(true); setExportKind(kind);
    const toastId = toast.loading(kind === 'discord' ? 'Preparando envío…' : 'Preparando imagen…', { id: 'tierlist-share' });
    try {
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const board = boardRef.current;
      const pixelRatio = Math.min(2, Math.sqrt(14000000 / (board.scrollWidth * board.scrollHeight)));
      if (pixelRatio < 0.7) throw new Error('El tablero es demasiado grande para capturarlo. Reduce algunas filas.');
      const blob = await htmlToImage.toBlob(board, { backgroundColor: '#111111', pixelRatio, skipAutoScale: false, filter: node => !node.classList?.contains('tierstudio-export-hidden') });
      if (!blob) throw new Error('No pudimos generar la imagen. Inténtalo de nuevo.');
      if (kind === 'discord') { await sendTierListToWebhook(webhook, blob); toast.success('Tier list enviada a Discord.', { id: toastId }); }
      else {
        const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'THC_TierList.png'; anchor.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000); toast.success('Imagen descargada.', { id: toastId });
      }
    } catch (error) { toast.error(error.message || 'No pudimos completar la captura.', { id: toastId }); }
    finally { exportLock.current = false; setIsExporting(false); setExportKind(null); }
  };
  const busy = isExporting || isUploading;
  const destinationOptions = <><option value="" disabled>Mover a…</option>{tiers.map(tier => <option key={tier.id} value={tier.id}>{tier.label || 'Sin nombre'}</option>)}<option value="bank">Imágenes disponibles</option></>;

  return <main className={`tierstudio${isExporting ? ' is-exporting' : ''}`}><div className="tierstudio-shell">
    <div className="tierstudio-topline"><Link to={RUTAS.INICIO}><ArrowLeft size={17} /> Regresar</Link><span>THC / Comunidad</span></div>
    <header className="tierstudio-heading"><div><h1>Tu tier<span> list.</span></h1><p>Tú pones el orden.</p></div><span className="tierstudio-wordmark" aria-hidden="true">THC</span></header>
    <div className="tierstudio-toolbar"><div><button onClick={undo} disabled={!history.length || busy}><Undo2 size={17} /> Deshacer</button><button onClick={reset} disabled={busy}><RotateCcw size={16} /> Reiniciar</button></div><button className="tierstudio-download" onClick={() => exportImage('download')} disabled={busy}><Download size={17} /> {exportKind === 'download' ? 'Preparando…' : 'Descargar PNG'}</button></div>
    <DragDropContext onDragStart={() => setSelectedId(null)} onDragEnd={({ source, destination }) => moveItem(source, destination)}>
      <div className="tierstudio-workspace">
        <section className="tierstudio-board-area" aria-label="Tu clasificación">
          <div className="tierstudio-board" ref={boardRef} aria-busy={isExporting}>
            <div className="tierstudio-board-title"><span aria-hidden="true">THC.</span>{isExporting ? <h2>{title || 'MI TIER LIST'}</h2> : <input disabled={busy} value={title} maxLength={50} aria-label="Título de la tier list" onFocus={saveHistory} onChange={event => setTitle(event.target.value)} placeholder="Mi tier list" />}<span aria-hidden="true">↗</span></div>
            {tiers.map(tier => <div className="tierstudio-row" key={tier.id}>
              <div className="tierstudio-label" style={{ backgroundColor: tier.color, color: labelColor(tier.color) }}>
                {tier.bgImage && <img className="tierstudio-label-image" src={tier.bgImage} alt="" />}
                {isExporting ? <span>{tier.label}</span> : <textarea disabled={busy} rows={2} maxLength={40} value={tier.label} aria-label={`Nombre de fila ${tier.label}`} onFocus={saveHistory} onChange={event => changeTier(tier.id, { label: event.target.value })} />}
              </div>
              <Droppable droppableId={tier.id} direction="horizontal" isDropDisabled={busy}>{(provided, snapshot) => <div ref={provided.innerRef} {...provided.droppableProps} className={`tierstudio-dropzone${snapshot.isDraggingOver ? ' is-over' : ''}`}>
                {tier.items.map((item, index) => <TierImage key={item.id} item={item} index={index} selected={selectedId === item.id} onSelect={selectImage} disabled={busy} />)}{provided.placeholder}
                {!tier.items.length && !isExporting && <span className="tierstudio-row-placeholder" aria-hidden="true">Arrastra aquí</span>}
              </div>}</Droppable>
              <details className="tierstudio-row-edit tierstudio-export-hidden"><summary aria-label={`Editar fila ${tier.label}`}><MoreHorizontal size={19} /></summary><div className="tierstudio-row-options">
                <label>Color<input type="color" value={tier.color} onFocus={saveHistory} onChange={event => changeTier(tier.id, { color: event.target.value })} disabled={busy} /></label>
                <label className="tierstudio-file-action"><ImagePlus size={16} /> Fondo<input type="file" accept="image/png,image/jpeg,image/gif,image/webp" disabled={busy} onChange={event => uploadBackground(tier.id, event)} /></label>
                <button onClick={() => clearTier(tier.id)} disabled={busy}><RotateCcw size={16} /> Vaciar</button><button className="tierstudio-remove" onClick={() => deleteTier(tier.id)} disabled={busy}><Trash2 size={16} /> Eliminar fila</button>
              </div></details>
            </div>)}
            {!tiers.length && <p className="tierstudio-empty">Añade una fila para empezar.</p>}<div className="tierstudio-capture-footer">TRUENO HAXBALL COMMUNITY</div>
          </div><button className="tierstudio-add-row" onClick={addTier} disabled={busy}><Plus size={18} /> Añadir fila</button>
        </section>
        <aside className="tierstudio-side">
          <section className="tierstudio-bank" aria-label="Imágenes disponibles"><header><h2>Imágenes <span>{bank.length}</span></h2><label className="tierstudio-upload" title={`Subir imágenes (${uploadedCount}/${uploadLimit})`}><Upload size={17} /><span>Subir</span><input type="file" multiple accept="image/png,image/jpeg,image/gif,image/webp" onChange={uploadImages} disabled={busy || uploadedCount >= uploadLimit} /></label></header><p>Arrastra una imagen o selecciónala para moverla.</p>
            {selectedImage && <div className="tierstudio-move" aria-live="polite"><img src={selectedImage.src} alt="Imagen seleccionada" /><select aria-label="Mover imagen a" value="" onChange={event => moveSelected(event.target.value)} disabled={busy}>{destinationOptions}</select><button onClick={() => setSelectedId(null)} aria-label="Cancelar selección"><X size={17} /></button></div>}
            <Droppable droppableId="bank" direction="horizontal" isDropDisabled={busy}>{(provided, snapshot) => <div ref={provided.innerRef} {...provided.droppableProps} className={`tierstudio-bank-images${snapshot.isDraggingOver ? ' is-over' : ''}`}>
              {bank.map((item, index) => <TierImage key={item.id} item={item} index={index} selected={selectedId === item.id} onSelect={selectImage} disabled={busy} />)}{provided.placeholder}{!bank.length && <p className="tierstudio-empty">Todas tus imágenes están en el tablero.</p>}
            </div>}</Droppable><footer>Fotos propias <span>{uploadedCount} / {uploadLimit}</span></footer>
          </section>
          <form className="tierstudio-share" onSubmit={event => { event.preventDefault(); exportImage('discord'); }}><h2>Llévala a Discord<span>.</span></h2><label htmlFor="tierstudio-webhook">Webhook del canal</label>
            <div className="tierstudio-webhook-field"><input ref={webhookRef} id="tierstudio-webhook" type={showWebhook ? 'text' : 'password'} value={webhook} onChange={event => setWebhook(event.target.value)} placeholder="Pega el enlace aquí" autoComplete="off" autoCapitalize="off" spellCheck={false} disabled={isExporting} /><button type="button" aria-label={showWebhook ? 'Ocultar webhook' : 'Mostrar webhook'} onClick={() => setShowWebhook(value => !value)}>{showWebhook ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>
            <p>El enlace se borra al salir de esta pantalla.</p><button className="tierstudio-send" type="submit" disabled={busy}>{exportKind === 'discord' ? 'Enviando…' : 'Enviar imagen'}<ArrowUpRight size={21} /></button>
          </form>
        </aside>
      </div>
      {selectedImage && <div className="tierstudio-mobile-move"><img src={selectedImage.src} alt="" /><select disabled={busy} aria-label="Mover imagen seleccionada" value="" onChange={event => moveSelected(event.target.value)}>{destinationOptions}</select><button onClick={() => setSelectedId(null)} aria-label="Cancelar selección"><X size={20} /></button></div>}
    </DragDropContext>
  </div></main>;
}


