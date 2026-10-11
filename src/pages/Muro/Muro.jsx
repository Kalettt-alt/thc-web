import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, MotionConfig } from 'framer-motion';
import { Link } from 'react-router-dom';
import { RUTAS } from '../../utils/rutas';
import { supabase } from '../../utils/supabase';
import { ArrowLeft, Flame, Plus, X, UploadCloud, Trash2, Clock, Type, AlignLeft, ArrowBigUp, ArrowBigDown, ArrowUpRight, MoveHorizontal, MousePointer2, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import DomeGallery from './DomeGallery';
import { validateImageFile } from '../../utils/media';
import { useHomeMotion } from '../../utils/homeMotion';
import './Muro.css';

function ImagePreview({ file }) {
  const imageRef = useRef(null);
  useEffect(() => {
    const url = URL.createObjectURL(file);
    const image = imageRef.current;
    if (image) image.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);
  return <img ref={imageRef} alt={`Vista previa de ${file.name}`} />;
}

export default function Muro({ session }) {
  const { motionEnabled } = useHomeMotion();
  const galleryRef = useRef(null);
  const modalRef = useRef(null);
  const detailCloseRef = useRef(null);
  const publishRef = useRef(null);
  const backRef = useRef(null);
  const invokerRef = useRef(null);
  const restoreFocusTimer = useRef(null);
  const pageMounted = useRef(false);
  const [publicaciones, setPublicaciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [modalSubir, setModalSubir] = useState(false); 
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [archivo, setArchivo] = useState(null);
  const [subiendo, setSubiendo] = useState(false);
  const [itemSeleccionado, setItemSeleccionado] = useState(null);
  
                                     
  const [totalVotos, setTotalVotos] = useState({});
  const [misVotos, setMisVotos] = useState({});
  const votosPendientes = useRef(new Set());
  const loadVersion = useRef({ value: 0 });
  const userId = session?.user?.id;

  const cargarPublicaciones = useCallback(async () => {
    const version = ++loadVersion.current.value;
    try {
                              
    const { data: muroData, error } = await supabase
      .from('muro_publicaciones')
      .select('*, autor:perfiles!muro_publicaciones_autor_id_fkey(discord_nombre, avatar_url)')
      .order('creado_en', { ascending: false });

    if (error) throw error;
    if (version !== loadVersion.current.value) return;
    if (muroData) {
      const mapeadas = muroData.map(pub => ({
        ...pub,
        src: pub.imagen_url,                             
        autor_nombre: pub.autor?.discord_nombre,
        autor_avatar: pub.autor?.avatar_url
      }));
      setPublicaciones(mapeadas);
    }

                      
    const { data: votosData, error: votosError } = await supabase.from('muro_votos').select('publicacion_id, usuario_id, tipo');
    if (votosError) throw votosError;
    if (version !== loadVersion.current.value) return;
    if (votosData) {
      const conteo = {};
      const personales = {};

      votosData.forEach(v => {
        if (!conteo[v.publicacion_id]) conteo[v.publicacion_id] = { up: 0, down: 0 };
        if (v.tipo === 1) conteo[v.publicacion_id].up += 1;
        if (v.tipo === -1) conteo[v.publicacion_id].down += 1;
        
        if (v.usuario_id === userId) {
          personales[v.publicacion_id] = v.tipo;
        }
      });

      setTotalVotos(conteo);
      setMisVotos(personales);
    }
    } catch {
      toast.error('No pudimos cargar el muro. Revisa tu conexión y vuelve a entrar.');
    } finally { if (version === loadVersion.current.value) setCargando(false); }
  }, [userId]);

  useEffect(() => {
    const tracker = loadVersion.current;
    void Promise.resolve().then(cargarPublicaciones);
    return () => { tracker.value++; };
  }, [cargarPublicaciones]);

                       
  const handleVoto = async (postId, tipo) => {
    if (!session?.user) {
      toast.error('Debes iniciar sesión para votar', { style: { background: '#111', color: '#fff' }});
      return;
    }
    
    const votoActual = misVotos[postId];
    if (votosPendientes.current.has(postId)) return;
    votosPendientes.current.add(postId);
    try {
    
    if (votoActual === tipo) {
      const { data, error } = await supabase.from('muro_votos')
        .delete()
        .match({ publicacion_id: postId, usuario_id: session.user.id }).select('id');
      if (error || !data?.length) throw error || new Error('No se eliminó el voto.');
      
      setMisVotos(prev => { const n = { ...prev }; delete n[postId]; return n; });
      setTotalVotos(prev => ({
        ...prev,
        [postId]: {
          ...prev[postId],
          [tipo === 1 ? 'up' : 'down']: Math.max(0, (prev[postId]?.[tipo === 1 ? 'up' : 'down'] || 1) - 1)
        }
      }));
    } else {
      const existente = await supabase.from('muro_votos').select('id').match({ publicacion_id: postId, usuario_id: session.user.id }).maybeSingle();
      if (existente.error) throw existente.error;
      const payload = {
        publicacion_id: postId,
        usuario_id: session.user.id,
        tipo
      };
      const result = existente.data
        ? await supabase.from('muro_votos').update({ tipo }).eq('id', existente.data.id).eq('usuario_id', session.user.id).select('id').single()
        : await supabase.from('muro_votos').insert(payload).select('id').single();
      if (result.error || !result.data) throw result.error || new Error('No se guardó el voto.');
      
      setMisVotos(prev => ({ ...prev, [postId]: tipo }));
      setTotalVotos(prev => {
        const actual = prev[postId] || { up: 0, down: 0 };
        const n = { up: actual.up, down: actual.down };
        
        if (votoActual === 1) n.up = Math.max(0, n.up - 1);
        if (votoActual === -1) n.down = Math.max(0, n.down - 1);
        if (tipo === 1) n.up += 1;
        if (tipo === -1) n.down += 1;
        
        return { ...prev, [postId]: n };
      });
    }
    } catch {
      toast.error('No se pudo guardar tu voto. Inténtalo de nuevo.');
    } finally {
      votosPendientes.current.delete(postId);
    }
  };

  const getVotosPost = (id) => totalVotos[id] || { up: 0, down: 0 };

  const handleArchivo = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try { await validateImageFile(file); setArchivo(file); }
    catch (error) { toast.error(error.message); e.target.value = ''; }
  };

  const handleSubirMomento = async (e) => {
    e.preventDefault();
    if (subiendo) return;
    if (!archivo || !titulo.trim() || !descripcion.trim()) {
      toast.error('Todos los campos son obligatorios.'); return;
    }

    setSubiendo(true);
    const toastId = toast.loading('Subiendo evidencia...', { style: { background: '#111', color: '#fff' }});

    let uploadedFile;
    let inserted = false;
    try {
      const fileExt = await validateImageFile(archivo);
      const fileName = `${session.user.id}_${crypto.randomUUID()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage.from('muro_media').upload(fileName, archivo, { contentType: archivo.type, upsert: false });
      if (uploadError) throw uploadError;
      uploadedFile = fileName;

      const { data: urlData } = supabase.storage.from('muro_media').getPublicUrl(fileName);

      const { data: insertData, error: insertError } = await supabase.from('muro_publicaciones').insert([{
        autor_id: session.user.id,
        titulo: titulo.trim(),
        descripcion: descripcion.trim(),
        imagen_url: urlData.publicUrl
      }]).select('id').single();

      if (insertError || !insertData) throw insertError || new Error('No se guardó la publicación.');
      inserted = true;

      toast.success('Momento Subido.', { id: toastId });
      setModalSubir(false);
      setTitulo(''); setDescripcion(''); setArchivo(null);
      cargarPublicaciones();
    } catch {
      if (uploadedFile && !inserted) {
        try { await supabase.storage.from('muro_media').remove([uploadedFile]); } catch { toast.error('No se pudo limpiar la imagen pendiente.', { id: 'muro-cleanup' }); }
      }
      toast.error('No se pudo publicar la imagen. Tu formulario sigue disponible.', { id: toastId });
    } finally {
      setSubiendo(false);
    }
  };

  const borrarPublicacion = async (id) => {
    const toastId = toast.loading('Borrando...', { style: { background: '#111', color: '#fff' }});
    try {
    const { data, error } = await supabase.from('muro_publicaciones').delete().eq('id', id).eq('autor_id', session.user.id).select('id');
    if (error || !data?.length) throw error || new Error('No se eliminó la publicación.');
      toast.success('Evidencia eliminada.', { id: toastId });
      
                                                    
      document.querySelector('.scrim')?.click();
      setItemSeleccionado(null);
      cargarPublicaciones();
    } catch {
      toast.error('Error al eliminar.', { id: toastId });
    }
  };

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    pageMounted.current = true;
    return () => {
      pageMounted.current = false;
      clearTimeout(restoreFocusTimer.current);
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    if (cargando) return;
    galleryRef.current?.querySelectorAll('.sphere-item').forEach(tile => {
      const button = tile.querySelector('.item__image');
      const image = button?.querySelector('img');
      const placeholder = tile.dataset.placeholder === 'true';
      if (placeholder) tile.setAttribute('aria-hidden', 'true');
      else tile.removeAttribute('aria-hidden');
      if (button) {
        button.tabIndex = placeholder ? -1 : 0;
        button.setAttribute('aria-label', placeholder ? 'Espacio disponible en el muro' : `Abrir momento: ${tile.dataset.titulo || 'Momento THC'}`);
      }
      if (image) image.alt = placeholder ? '' : tile.dataset.titulo || 'Momento de la comunidad THC';
    });
  }, [cargando, publicaciones]);

  useEffect(() => {
    if (!itemSeleccionado) return;
    clearTimeout(restoreFocusTimer.current);
    const backButton = backRef.current;
    const sphere = galleryRef.current?.querySelector('.sphere');
    const previousInert = sphere?.inert;
    if (sphere) sphere.inert = true;
    const frame = requestAnimationFrame(() => detailCloseRef.current?.focus({ preventScroll: true }));
    const handleTab = event => {
      if (event.key !== 'Tab') return;
      const panel = detailCloseRef.current?.closest('.muro-detail');
      const controls = Array.from(panel?.querySelectorAll('button:not(:disabled),a[href]') || []);
      const first = controls[0];
      const last = controls.at(-1);
      if (!first) return;
      if (!panel.contains(document.activeElement)) { event.preventDefault(); first.focus(); }
      else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', handleTab, true);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('keydown', handleTab, true);
      if (sphere) sphere.inert = previousInert;
      if (!pageMounted.current) return;
      restoreFocusTimer.current = setTimeout(() => {
        if (!pageMounted.current) return;
        const invoker = invokerRef.current;
        const bounds = invoker?.getBoundingClientRect();
        const visible = invoker?.isConnected && getComputedStyle(invoker).visibility !== 'hidden' && bounds.width > 0 && bounds.height > 0 && bounds.right > 0 && bounds.left < window.innerWidth && bounds.bottom > 0 && bounds.top < window.innerHeight;
        const visibleLeft = visible ? Math.max(0, bounds.left) : 0;
        const visibleRight = visible ? Math.min(window.innerWidth, bounds.right) : 0;
        const visibleTop = visible ? Math.max(0, bounds.top) : 0;
        const visibleBottom = visible ? Math.min(window.innerHeight, bounds.bottom) : 0;
        const paintedElement = visible ? document.elementFromPoint((visibleLeft + visibleRight) / 2, (visibleTop + visibleBottom) / 2) : null;
        if (paintedElement && invoker.contains(paintedElement)) invoker.focus({ preventScroll: true });
        else backButton?.focus({ preventScroll: true });
      }, 700);
    };
  }, [itemSeleccionado]);

  useEffect(() => {
    if (!modalSubir) return;
    const previousFocus = document.activeElement;
    const publishButton = publishRef.current;
    const frame = requestAnimationFrame(() => (modalRef.current?.querySelector('input:not(:disabled)') || modalRef.current)?.focus());
    const handleKey = event => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        if (!subiendo) setModalSubir(false);
      }
      if (event.key !== 'Tab') return;
      const controls = Array.from(modalRef.current?.querySelectorAll('button:not(:disabled),input:not(:disabled),textarea:not(:disabled),a[href]') || []);
      const first = controls[0];
      const last = controls.at(-1);
      if (!first) { event.preventDefault(); modalRef.current?.focus(); return; }
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', handleKey, true);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('keydown', handleKey, true);
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
      else publishButton?.focus();
    };
  }, [modalSubir, subiendo]);

  const closeDetail = () => galleryRef.current?.querySelector('.scrim')?.click();
  const rememberInvoker = event => {
    const tile = event.target.closest?.('.item__image');
    if (tile && tile.parentElement?.dataset.placeholder !== 'true') invokerRef.current = tile;
  };
  const keyToOpen = event => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const tile = event.target.closest?.('.item__image');
    if (!tile || tile.parentElement?.dataset.placeholder === 'true') return;
    event.preventDefault();
    tile.click();
  };

  if (cargando) return (
    <div className="muro-loading" data-motion={motionEnabled ? 'on' : 'off'} role="status" aria-live="polite">
      <span className="muro-loading-icon"><Zap size={30} /></span>
      <span>Abriendo el muro.</span>
      <p>Los momentos de la comunidad están por entrar a escena.</p>
    </div>
  );

  return (
    <MotionConfig reducedMotion={motionEnabled ? 'never' : 'always'} transition={motionEnabled ? undefined : { duration: 0 }}>
      <div className={`muro-page${itemSeleccionado ? ' muro-page--viewing' : ''}`} data-motion={motionEnabled ? 'on' : 'off'}>
        <div ref={galleryRef} className={`muro-gallery${itemSeleccionado ? ' muro-gallery--open' : ''}`} onKeyDownCapture={keyToOpen} onPointerDownCapture={rememberInvoker} onClickCapture={rememberInvoker}>
          <DomeGallery
            images={publicaciones}
            segments={34}
            onItemOpen={(item) => setItemSeleccionado(item)}
            onItemClose={() => setItemSeleccionado(null)}
          />
        </div>

        <header className="muro-header" aria-hidden={itemSeleccionado ? true : undefined}>
          <motion.div initial={motionEnabled ? { opacity: 0, x: -20 } : false} animate={{ opacity: 1, x: 0 }} className="muro-back-wrap">
            <Link ref={backRef} to={RUTAS.INICIO} className="muro-back" tabIndex={itemSeleccionado ? -1 : undefined}><ArrowLeft size={18} /> Volver al Inicio</Link>
          </motion.div>
          <motion.div initial={motionEnabled ? { opacity: 0, y: -20 } : false} animate={{ opacity: 1, y: 0 }} transition={{ delay: motionEnabled ? 0.08 : 0 }} className="muro-heading">
            <p className="muro-eyebrow"><Zap size={15} /> La comunidad deja huella</p>
            <h1>Muro <span>THC</span><span className="muro-title-dot">.</span></h1>
            <p className="muro-intro">Grandes jugadas. Cero contexto. Todo para recordar.</p>
          </motion.div>
          <motion.div initial={motionEnabled ? { opacity: 0, rotate: 6 } : false} animate={{ opacity: 1, rotate: -4 }} transition={{ delay: motionEnabled ? 0.18 : 0 }} className="muro-stamp">
            <Flame size={29} /><span>El salón<br />de la infamia</span>
          </motion.div>
        </header>

        <AnimatePresence>
          {!itemSeleccionado && !modalSubir && (
            <motion.div className="muro-toolbar" initial={motionEnabled ? { opacity: 0, y: 20 } : false} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}>
              <div className="muro-guide">
                <p>{publicaciones.length ? `${publicaciones.length} ${publicaciones.length === 1 ? 'momento' : 'momentos'}. Una sola comunidad.` : 'El siguiente momento puede ser tuyo.'}</p>
                <div><span><MoveHorizontal size={18} /> Arrastra</span><span><MousePointer2 size={18} /> Abre un momento</span><span><ArrowBigUp size={18} /> Deja tu voto</span></div>
              </div>
              <button ref={publishRef} type="button" className="muro-publish" onClick={() => session?.user ? setModalSubir(true) : toast.error('Inicia sesión para subir un momento.')}>
                <span className="muro-publish-icon"><Plus size={20} /></span><span className="muro-publish-label">Subir un momento</span><ArrowUpRight size={22} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {itemSeleccionado && (
            <motion.aside
              initial={motionEnabled ? { opacity: 0, x: 70 } : false}
              animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 70 }}
              transition={motionEnabled ? { type: 'spring', damping: 28, stiffness: 250 } : { duration: 0 }}
              className="muro-detail" role="dialog" aria-labelledby="muro-detail-title"
            >
              <div className="muro-detail-top">
                <span className="muro-eyebrow"><Flame size={15} /> Momento THC</span>
                <button ref={detailCloseRef} type="button" onClick={closeDetail} className="muro-close" aria-label="Cerrar momento"><X size={21} /></button>
              </div>
              <div className="muro-detail-scroll">
                <div className="muro-author">
                  <img src={itemSeleccionado.autor_avatar || '/imagenes/LogoTHC.png'} alt="" />
                  <div><h3>{itemSeleccionado.autor_nombre || 'Miembro de THC'}</h3><p><Clock size={14} /><time dateTime={itemSeleccionado.creado_en}>{new Date(itemSeleccionado.creado_en).toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' })}</time></p></div>
                </div>
                <h2 id="muro-detail-title" className="muro-detail-title">{itemSeleccionado.titulo}</h2>
                <p className="muro-description">{itemSeleccionado.descripcion}</p>
                <section className="muro-verdict" aria-labelledby="muro-verdict-title">
                  <p className="muro-eyebrow">El veredicto es tuyo</p>
                  <h3 id="muro-verdict-title">¿Qué dice la tribuna?</h3>
                  <div className="muro-votes">
                    <button type="button" onClick={() => handleVoto(itemSeleccionado.id, 1)} className={`muro-vote muro-vote--up${misVotos[itemSeleccionado.id] === 1 ? ' is-selected' : ''}`} aria-pressed={misVotos[itemSeleccionado.id] === 1} aria-label={`Votar a favor: ${getVotosPost(itemSeleccionado.id).up} votos`}>
                      <ArrowBigUp size={29} fill={misVotos[itemSeleccionado.id] === 1 ? 'currentColor' : 'none'} />
                      <motion.strong key={getVotosPost(itemSeleccionado.id).up} initial={motionEnabled ? { scale: 0.82 } : false} animate={{ scale: 1 }}>{getVotosPost(itemSeleccionado.id).up}</motion.strong><span>Banco esto</span>
                    </button>
                    <button type="button" onClick={() => handleVoto(itemSeleccionado.id, -1)} className={`muro-vote muro-vote--down${misVotos[itemSeleccionado.id] === -1 ? ' is-selected' : ''}`} aria-pressed={misVotos[itemSeleccionado.id] === -1} aria-label={`Votar en contra: ${getVotosPost(itemSeleccionado.id).down} votos`}>
                      <ArrowBigDown size={29} fill={misVotos[itemSeleccionado.id] === -1 ? 'currentColor' : 'none'} />
                      <motion.strong key={getVotosPost(itemSeleccionado.id).down} initial={motionEnabled ? { scale: 0.82 } : false} animate={{ scale: 1 }}>{getVotosPost(itemSeleccionado.id).down}</motion.strong><span>No lo banco</span>
                    </button>
                  </div>
                  <p className="muro-vote-help">Puedes cambiar tu voto. Toca de nuevo tu opción para retirarlo.</p>
                </section>
                {session?.user?.id === itemSeleccionado.autor_id && (
                  <button type="button" onClick={() => borrarPublicacion(itemSeleccionado.id)} className="muro-delete"><Trash2 size={17} /> Eliminar mi publicación</button>
                )}
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {modalSubir && (
            <motion.div className="muro-modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={event => { if (event.target === event.currentTarget && !subiendo) setModalSubir(false); }}>
              <motion.section ref={modalRef} initial={motionEnabled ? { opacity: 0, scale: 0.96, y: 25 } : false} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 25 }} className="muro-modal" role="dialog" aria-modal="true" aria-labelledby="muro-upload-title" tabIndex={-1}>
                <div className="muro-modal-heading">
                  <div><p className="muro-eyebrow"><Flame size={16} /> Un lugar en el muro</p><h2 id="muro-upload-title">Tu momento.<br /><span>Para la historia.</span></h2></div>
                  <button type="button" onClick={() => setModalSubir(false)} disabled={subiendo} className="muro-close" aria-label="Cerrar formulario"><X size={21} /></button>
                </div>
                <form onSubmit={handleSubirMomento} className="muro-form" aria-busy={subiendo}>
                  <p className="muro-form-intro">La jugada, el blooper o esa captura que merece quedarse. Dale contexto y compártela.</p>
                  <div className="muro-field">
                    <div className="muro-label-row"><label htmlFor="muro-image"><UploadCloud size={17} /> Tu imagen</label><span>Obligatoria</span></div>
                    <div className={`muro-file${archivo ? ' is-ready' : ''}`}>
                      <input id="muro-image" type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={handleArchivo} required={!archivo} disabled={subiendo} aria-describedby={archivo ? undefined : 'muro-image-help'} />
                      {archivo ? <><ImagePreview file={archivo} /><span className="muro-file-ready">{archivo.name} · Toca para cambiar</span></> : <div className="muro-file-prompt"><span><UploadCloud size={25} /></span><strong>Elige el momento</strong><p id="muro-image-help">PNG, JPG, WebP o GIF. Hasta 5 MB.</p></div>}
                    </div>
                  </div>
                  <div className="muro-field">
                    <div className="muro-label-row"><label htmlFor="muro-title"><Type size={17} /> Ponle un título</label><span>{titulo.length}/30</span></div>
                    <input id="muro-title" type="text" maxLength={30} value={titulo} onChange={e => setTitulo(e.target.value)} required disabled={subiendo} placeholder="La pecheada histórica" />
                  </div>
                  <div className="muro-field">
                    <div className="muro-label-row"><label htmlFor="muro-description"><AlignLeft size={17} /> ¿Qué pasó?</label><span>{descripcion.length}/100</span></div>
                    <textarea id="muro-description" rows={3} maxLength={100} value={descripcion} onChange={e => setDescripcion(e.target.value)} required disabled={subiendo} placeholder="Cuenta lo que no se ve en la imagen…" />
                  </div>
                  <button type="submit" disabled={subiendo || !archivo || !titulo.trim() || !descripcion.trim()} className="muro-submit">
                    <span>{subiendo ? 'Subiendo tu momento…' : 'Publicar en el muro'}</span>{subiendo ? <span className="muro-button-spinner" aria-hidden="true" /> : <ArrowUpRight size={23} />}
                  </button>
                </form>
              </motion.section>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}
