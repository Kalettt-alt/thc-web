import { useState, useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../../utils/supabase';
import { ArrowLeft, Package, Sparkles, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence, MotionConfig, useReducedMotion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { CROMOS_DATA } from '../../utils/UsuariosTHC';
import { useHomeMotion } from '../../utils/homeMotion';
import { beginPackRequest, readPendingPack, finishPackRequest, validatePackResult, packErrorMessage } from '../../utils/albumPack';
import { withAlbumTimeout } from '../../utils/albumAsync';
import PackArtwork from './PackArtwork';
import './Sobres.css';

function pendingRequest(userId) {
  try { return readPendingPack(window.localStorage, userId); } catch { return null; }
}
function cardFallback(event) {
  if (!event.currentTarget.dataset.fallback) {
    event.currentTarget.dataset.fallback = 'true';
    event.currentTarget.src = '/Album/Cromos/Cromo.jpg';
  }
}

export default function Sobres({ onBack, userId }) {
  const { motionEnabled } = useHomeMotion();
  const reducedMotion = useReducedMotion();
  const animatePacks = motionEnabled && !reducedMotion;
  const [sobresDisponibles, setSobresDisponibles] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState(false);
  const [fase, setFase] = useState('idle');
  const [openingStage, setOpeningStage] = useState('idle');
  const [cartas, setCartas] = useState([]);
  const [pendiente, setPendiente] = useState(() => Boolean(pendingRequest(userId)));
  const [errorApertura, setErrorApertura] = useState('');
  const timers = useRef(new Set());
  const scope = useRef(0);
  const loading = useRef(0);
  const opening = useRef(false);
  const confirmedOpening = useRef(null);
  const animateOpening = useRef(animatePacks);

  useEffect(() => {
    animateOpening.current = animatePacks;
    if (!animatePacks) confirmedOpening.current?.();
  }, [animatePacks]);

  const cargarSobres = useCallback(async () => {
    const currentScope = scope.current;
    const number = ++loading.current;
    try {
      const { data: auth, error: authError } = await withAlbumTimeout(supabase.auth.getSession());
      if (authError) throw authError;
      if (!userId || auth?.session?.user?.id !== userId) throw new Error('ALBUM_AUTH_REQUIRED');
      const { data, error } = await withAlbumTimeout(supabase.from('perfiles').select('sobres_disponibles').eq('id', userId).single());
      if (error) throw error;
      if (!Number.isSafeInteger(data?.sobres_disponibles) || data.sobres_disponibles < 0) throw new Error('Invalid balance');
      if (scope.current !== currentScope || loading.current !== number) return;
      setSobresDisponibles(data.sobres_disponibles);
      setErrorCarga(false);
    } catch {
      if (scope.current === currentScope && loading.current === number) setErrorCarga(true);
    } finally {
      if (scope.current === currentScope && loading.current === number) setCargando(false);
    }
  }, [userId]);

  useEffect(() => {
    scope.current += 1;
    const currentScope = scope.current;
    const scheduled = timers.current;
    Promise.resolve().then(() => {
      if (scope.current !== currentScope) return;
      opening.current = false;
      confirmedOpening.current = null;
      setFase('idle');
      setOpeningStage('idle');
      setCartas([]);
      setErrorApertura('');
      setPendiente(Boolean(pendingRequest(userId)));
      setCargando(true);
      setSobresDisponibles(0);
      cargarSobres();
    });
    return () => {
      scope.current += 1;
      loading.current += 1;
      for (const timer of scheduled) clearTimeout(timer);
      scheduled.clear();
      confirmedOpening.current = null;
    };
  }, [cargarSobres, userId]);

  const celebrate = count => {
    if (animateOpening.current) confetti({ particleCount: count, spread: 65, origin: { y: .7 }, disableForReducedMotion: true, colors: ['#ff7f11', '#f2ecdf'] });
  };
  const abrirSobre = async () => {
    if (opening.current || fase === 'opening' || (!pendiente && (sobresDisponibles <= 0 || cargando || errorCarga))) return;
    const currentScope = scope.current;
    opening.current = true;
    setFase('opening');
    setOpeningStage('charging');
    setErrorApertura('');
    let id;
    try {
      const { data: auth, error: authError } = await withAlbumTimeout(supabase.auth.getSession());
      if (authError) throw authError;
      if (scope.current !== currentScope) return;
      if (auth?.session?.user?.id !== userId) throw new Error('ALBUM_AUTH_REQUIRED');
      id = beginPackRequest(window.localStorage, userId, () => crypto.randomUUID());
      setPendiente(true);
      const { data, error } = await withAlbumTimeout(supabase.rpc('abrir_sobre_album_v2', { p_solicitud_id: id }));
      if (error) throw error;
      const receipt = validatePackResult(data);
      if (scope.current !== currentScope) return;
      finishPackRequest(window.localStorage, userId, id);
      loading.current += 1;
      setPendiente(false);
      setSobresDisponibles(receipt.remaining);
      setErrorCarga(false);
      setCargando(true);
      void cargarSobres();
      const reveal = () => {
        if (scope.current !== currentScope || !opening.current) return;
        for (const timer of timers.current) clearTimeout(timer);
        timers.current.clear();
        confirmedOpening.current = null;
        setCartas(receipt.cards);
        setFase('dealt');
        setOpeningStage('idle');
        opening.current = false;
        celebrate(45);
      };
      confirmedOpening.current = reveal;
      if (animateOpening.current) {
        const schedule = (delay, action) => {
          const timer = setTimeout(() => {
            timers.current.delete(timer);
            if (scope.current === currentScope && opening.current) action();
          }, delay);
          timers.current.add(timer);
        };
        schedule(180, () => setOpeningStage('tearing'));
        schedule(1080, () => setOpeningStage('emerging'));
        schedule(2280, () => setOpeningStage('ready'));
        schedule(2850, reveal);
      } else reveal();
    } catch (error) {
      if (scope.current !== currentScope) return;
      const message = packErrorMessage(error);
      setErrorApertura(message);
      setPendiente(Boolean(id || pendingRequest(userId)));
      setFase(cartas.length ? 'dealt' : 'idle');
      setOpeningStage('idle');
      opening.current = false;
      toast.error(message, { id: 'album-pack-open' });
    }
  };

  useEffect(() => {
    const refresh = () => { if (!opening.current && document.visibilityState === 'visible') cargarSobres(); };
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, [cargarSobres]);

  const flipCard = index => {
    if (!cartas[index] || cartas[index].isFlipped) return;
    setCartas(prev => prev.map((card, i) => i === index ? { ...card, isFlipped: true } : card));
    if (cartas[index].isNew) celebrate(18);
  };
  const allFlipped = cartas.length > 0 && cartas.every(card => card.isFlipped);
  const busy = fase === 'opening';
  const disabled = busy || (!pendiente && (cargando || errorCarga || sobresDisponibles <= 0));

  return (
    <MotionConfig reducedMotion={animatePacks ? 'never' : 'always'}>
      <main className="packs-page" data-motion={animatePacks ? 'on' : 'off'} aria-busy={busy}>
        <div className="packs-backdrop" aria-hidden="true"><img src="/imagenes/LogoTHC.png" alt="" /></div>
        <button type="button" className="packs-back" onClick={onBack} disabled={busy} aria-label="Volver al álbum"><ArrowLeft size={21} /></button>
        <div className="packs-shell">
          <div className="packs-balance" aria-live="polite"><Package size={21} /><strong>{cargando ? '…' : errorCarga ? '—' : sobresDisponibles}</strong><span>{sobresDisponibles === 1 && !cargando && !errorCarga ? 'sobre disponible' : 'sobres disponibles'}</span></div>
          {errorCarga && <div className="packs-notice" role="alert"><span>{userId ? 'No pudimos cargar tus sobres. Tu saldo se conserva.' : 'Inicia sesión para abrir tus sobres.'}</span>{userId && <button type="button" onClick={() => { setCargando(true); cargarSobres(); }} disabled={busy || cargando}><RotateCcw size={16} /> Actualizar saldo</button>}</div>}
          {(pendiente || errorApertura) && !busy && <div className="packs-notice" role="status"><span>{errorApertura || 'Hay una apertura pendiente de confirmar. Recupérala antes de abrir otro sobre.'}</span><button type="button" onClick={abrirSobre} disabled={!userId}><RotateCcw size={16} /> Recuperar apertura</button></div>}
          <AnimatePresence mode="wait">
            {fase !== 'dealt' ? (
              <motion.section key="pack" className={'packs-stage' + (busy ? ' is-opening' : '')} initial={animatePacks ? { opacity: 0, y: 15 } : false} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: animatePacks ? .25 : 0 }}>
                <PackArtwork stage={openingStage} disabled={disabled} onOpen={abrirSobre} pending={pendiente} />
              </motion.section>
            ) : (
              <motion.section key="cards" className="packs-result" initial={animatePacks ? { opacity: 0, y: 12 } : false} animate={{ opacity: 1, y: 0 }} transition={{ duration: animatePacks ? .3 : 0 }} aria-labelledby="pack-result-title">
                <h2 id="pack-result-title" className="packs-sr-only">Cromos de tu sobre</h2>
                <div className="packs-cards">
                  {cartas.map((carta, index) => (
                    <motion.button type="button" key={carta.id + '-' + index} className="packs-card" onClick={() => flipCard(index)} aria-label={carta.isFlipped ? CROMOS_DATA[carta.id].name + ', ' + carta.id + ', ' + (carta.isNew ? 'nuevo' : 'repetido') : 'Revelar cromo ' + (index + 1)} aria-pressed={carta.isFlipped} initial={animatePacks ? { opacity: 0, y: 20 } : false} animate={{ opacity: 1, y: 0 }} transition={{ delay: animatePacks ? index * .06 : 0, duration: animatePacks ? .3 : 0 }}>
                      <motion.span className="packs-card-flip" animate={{ rotateY: carta.isFlipped ? 180 : 0 }} transition={{ duration: animatePacks ? .5 : 0 }}>
                        <span className="packs-card-back" aria-hidden="true"><img src="/Album/Cromos/CromoAtras.jpg" alt="" onError={cardFallback} /><span>TOCA PARA REVELAR <Sparkles size={14} /></span></span>
                        <span className="packs-card-front" aria-hidden="true"><img src={'/Album/Cromos/' + carta.id + '.jpg'} alt="" onError={cardFallback} /><span className={'packs-card-status ' + (carta.isNew ? 'is-new' : '')}>{carta.isNew ? 'Nuevo' : 'Repetido'}</span><span className="packs-card-caption"><small>{carta.id} · {CROMOS_DATA[carta.id].categoria}</small><strong>{CROMOS_DATA[carta.id].name}</strong></span></span>
                      </motion.span>
                    </motion.button>
                  ))}
                </div>
                <div className="packs-result-actions">
                  {!allFlipped && <button type="button" className="packs-primary" onClick={() => { setCartas(prev => prev.map(card => ({ ...card, isFlipped: true }))); celebrate(45); }}><Sparkles size={18} /> Revelar todos</button>}
                  {allFlipped && <button type="button" className="packs-primary" onClick={abrirSobre} disabled={disabled}><Package size={18} /> {pendiente ? 'Recuperar apertura' : 'Abrir otro sobre'}</button>}
                </div>
              </motion.section>
            )}
          </AnimatePresence>
        </div>
      </main>
    </MotionConfig>
  );
}

