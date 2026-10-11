import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { ArrowLeft, ArrowRight, ArrowRightLeft, ArrowUpRight, Check, Clock, Plus, RefreshCw, Search, ShieldCheck, Trash2, X } from 'lucide-react';
import { MotionConfig, motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { supabase } from '../../utils/supabase';
import { TODOS_LOS_CROMOS, CROMOS_DATA } from '../../utils/UsuariosTHC';
import { useHomeMotion } from '../../utils/homeMotion';
import { imagenSegura } from '../../utils/foro';
import { ALBUM_CATEGORIES, groupAlbumInventory, summarizeAlbumInventory, matchesAlbumCromo, isLiveAlbumOffer, albumOfferAvailability, filterAlbumOffers, albumTimeRemaining, albumErrorMessage, isAmbiguousAlbumError, albumOperationParams, isValidAlbumMarketReceipt } from '../../utils/albumCollection';
import { withAlbumTimeout } from '../../utils/albumAsync';
import './AlbumCollection.css';

const PAGE_SIZE = 12;
const PICKER_SIZE = 24;
const MARKET_LIMIT = 200;
const emptySnapshot = { userId: null, rows: [], offers: [], market: [], loading: true, error: '', setupError: '', capped: false };
const RPC_NAMES = { create: 'crear_oferta_album_v2', accept: 'aceptar_oferta_album_v2', cancel: 'cancelar_oferta_album_v2' };
const pendingKey = userId => `thc:album-market:v2:${userId}`;

function savePending(operation) {
  try {
    const stored = JSON.stringify(operation);
    window.sessionStorage.setItem(pendingKey(operation.userId), stored);
    return window.sessionStorage.getItem(pendingKey(operation.userId)) === stored;
  } catch { return false; }
}

function clearPending(userId) {
  try { window.sessionStorage.removeItem(pendingKey(userId)); } catch { return; }
}

function readPending(userId) {
  try {
    const operation = JSON.parse(window.sessionStorage.getItem(pendingKey(userId)) || 'null');
    return operation?.userId === userId && albumOperationParams(operation) ? operation : null;
  } catch { return null; }
}

function CromoImage({ id, selected = false }) {
  return <div className={`album-trade-cromo ${selected ? 'is-selected' : ''}`}><img loading="lazy" decoding="async" src={CROMOS_DATA[id] ? `/Album/Cromos/${id}.jpg` : '/Album/Cromos/Cromo.jpg'} alt={`${id}, ${CROMOS_DATA[id]?.name || 'cromo THC'}`} onError={event => { if (!event.currentTarget.src.endsWith('/Cromo.jpg')) event.currentTarget.src = '/Album/Cromos/Cromo.jpg'; }} /><span>{id}</span></div>;
}

function ExchangePair({ give, receive }) {
  return <div className="album-offer-exchange"><div className="album-offer-side"><span>Tú entregas</span><CromoImage id={give} /><strong>{CROMOS_DATA[give]?.name || 'Cromo THC'}</strong><small>{give}</small></div><ArrowRight size={22} /><div className="album-offer-side"><span>Tú recibes</span><CromoImage id={receive} /><strong>{CROMOS_DATA[receive]?.name || 'Cromo THC'}</strong><small>{receive}</small></div></div>;
}

export default function Intercambio({ onBack, onNavigate, userId }) {
  const { motionEnabled } = useHomeMotion();
  const [snapshot, setSnapshot] = useState(emptySnapshot);
  const [tab, setTab] = useState('mercado');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('TODOS');
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [onlyMissing, setOnlyMissing] = useState(false);
  const [page, setPage] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [dialog, setDialog] = useState(null);
  const [dialogError, setDialogError] = useState('');
  const [step, setStep] = useState('overview');
  const [give, setGive] = useState(null);
  const [receive, setReceive] = useState(null);
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerCategory, setPickerCategory] = useState('TODOS');
  const [wantedMode, setWantedMode] = useState('faltantes');
  const [pickerLimit, setPickerLimit] = useState(PICKER_SIZE);
  const [processing, setProcessing] = useState(false);
  const [pending, setPending] = useState(null);
  const lifecycle = useRef({ mounted: false, sequence: 0, controller: null });
  const currentAccount = useRef(userId);
  const processingRef = useRef(false);
  const dialogRef = useRef(null);
  const triggerRef = useRef(null);
  const resultRef = useRef(null);
  const dialogBodyRef = useRef(null);
  currentAccount.current = userId;

  const loadMarket = useCallback(async () => {
    if (!userId) return;
    const request = lifecycle.current;
    const sequence = ++request.sequence;
    request.controller?.abort();
    const controller = new AbortController();
    request.controller = controller;
    setSnapshot(previous => previous.userId === userId ? { ...previous, loading: true, error: '' } : { ...emptySnapshot, userId });
    try {
      const [market, offers, inventory] = await withAlbumTimeout(Promise.all([
        supabase.from('intercambios_album').select('*, perfiles!user_id_ofrece(discord_nombre, avatar_url)').eq('version_mercado', 2).eq('estado', 'activo').neq('user_id_ofrece', userId).gt('fecha_expiracion', new Date().toISOString()).order('fecha_creacion', { ascending: false }).order('id', { ascending: false }).limit(MARKET_LIMIT + 1).abortSignal(controller.signal),
        supabase.from('intercambios_album').select('*').eq('user_id_ofrece', userId).eq('estado', 'activo').order('fecha_creacion', { ascending: false }).abortSignal(controller.signal),
        supabase.from('inventario_cromos').select('cromo_id, cantidad, pegada').eq('user_id', userId).abortSignal(controller.signal),
      ]));
      if (offers.error) throw offers.error;
      if (inventory.error) throw inventory.error;
      if (!request.mounted || sequence !== request.sequence || currentAccount.current !== userId) return;
      setSnapshot({ userId, rows: inventory.data || [], offers: offers.data || [], market: (market.data || []).slice(0, MARKET_LIMIT), loading: false, error: '', setupError: market.error ? albumErrorMessage(market.error, 'No pudimos consultar las ofertas. Actualiza para reintentar.') : '', capped: (market.data || []).length > MARKET_LIMIT });
      setNow(Date.now());
    } catch (error) {
      if (controller.signal.aborted || !request.mounted || sequence !== request.sequence || currentAccount.current !== userId) return;
      if (error.code === 'NETWORK_TIMEOUT') controller.abort();
      setSnapshot(previous => ({ ...previous, userId, loading: false, error: albumErrorMessage(error, 'No pudimos sincronizar el mercado. Revisa tu conexión y vuelve a intentarlo.') }));
    }
  }, [userId]);

  useEffect(() => {
    const request = lifecycle.current;
    request.mounted = true;
    void loadMarket();
    void Promise.resolve().then(() => {
      if (request.mounted && currentAccount.current === userId) setPending(userId ? readPending(userId) : null);
    });
    return () => { request.mounted = false; request.sequence += 1; request.controller?.abort(); toast.dismiss(`album-market:${userId}`); };
  }, [loadMarket, userId]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    const refresh = () => { setNow(Date.now()); if (!processingRef.current && document.visibilityState === 'visible') void loadMarket(); };
    window.addEventListener('focus', refresh);
    return () => { clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, [loadMarket]);

  const accountMatches = snapshot.userId === userId;
  const loading = Boolean(userId) && (!accountMatches || snapshot.loading);
  const inventory = useMemo(() => accountMatches ? groupAlbumInventory(snapshot.rows, snapshot.offers, now) : [], [accountMatches, snapshot.rows, snapshot.offers, now]);
  const totals = useMemo(() => summarizeAlbumInventory(inventory), [inventory]);
  const myOffers = useMemo(() => accountMatches ? snapshot.offers.filter(offer => Number(offer.version_mercado) === 2 && isLiveAlbumOffer(offer, now)) : [], [accountMatches, snapshot.offers, now]);
  const legacyOffers = accountMatches ? snapshot.offers.filter(offer => Number(offer.version_mercado || 1) !== 2) : [];
  const filteredMarket = useMemo(() => accountMatches ? filterAlbumOffers(snapshot.market, CROMOS_DATA, inventory, { search, category, onlyAvailable, onlyMissing, now }) : [], [accountMatches, snapshot.market, inventory, search, category, onlyAvailable, onlyMissing, now]);
  const pageCount = Math.max(1, Math.ceil(filteredMarket.length / PAGE_SIZE));
  const activePage = Math.min(page, pageCount - 1);
  const visibleMarket = filteredMarket.slice(activePage * PAGE_SIZE, (activePage + 1) * PAGE_SIZE);
  const activeDialog = dialog?.userId === userId ? dialog : null;
  const activePending = pending?.userId === userId ? pending : null;
  const loadError = accountMatches ? snapshot.error || snapshot.setupError : '';
  const mutationsBlocked = processing || Boolean(activePending) || loading || Boolean(loadError) || !userId;
  const heldIds = useMemo(() => new Set(inventory.map(item => item.id)), [inventory]);
  const availableItems = useMemo(() => inventory.filter(item => item.disponiblesMercado > 0), [inventory]);
  const pickerCandidates = step === 'give' ? availableItems.map(item => item.id) : TODOS_LOS_CROMOS.filter(id => id !== give && (wantedMode === 'todos' || !heldIds.has(id)));
  const pickerMatches = pickerCandidates.filter(id => matchesAlbumCromo(id, CROMOS_DATA, pickerSearch, pickerCategory));
  const selectedGive = inventory.find(item => item.id === give);
  const draftValid = give && receive && give !== receive && selectedGive?.disponiblesMercado > 0 && myOffers.length < 2 && legacyOffers.length === 0;

  const closeDialog = () => { if (!processingRef.current) setDialog(null); };
  useEffect(() => {
    if (!activeDialog) return;
    const trigger = triggerRef.current;
    dialogRef.current?.focus();
    return () => { if (trigger?.isConnected) trigger.focus(); };
  }, [activeDialog]);

  const dialogKeyDown = event => {
    if (event.key === 'Escape') { event.preventDefault(); closeDialog(); return; }
    if (event.key !== 'Tab') return;
    const focusable = [...(dialogRef.current?.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex="0"]') || [])].filter(element => element.offsetParent !== null);
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!first) { event.preventDefault(); return; }
    if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  };

  const openCreator = event => {
    if (mutationsBlocked || myOffers.length >= 2 || legacyOffers.length > 0) return;
    triggerRef.current = event.currentTarget;
    setGive(null); setReceive(null); setStep('overview'); setWantedMode('faltantes'); setDialogError('');
    setDialog({ kind: 'create', userId });
  };

  const openConfirmation = (kind, offer, event) => {
    if (mutationsBlocked || !isLiveAlbumOffer(offer, Date.now()) || (kind === 'accept' && !albumOfferAvailability(offer, inventory, Date.now()).canAccept)) return;
    triggerRef.current = event.currentTarget;
    setDialogError(''); setStep('overview'); setDialog({ kind, offer, userId });
  };

  const openPicker = value => {
    if (processing || activePending) return;
    setStep(value); setPickerSearch(''); setPickerCategory('TODOS'); setPickerLimit(PICKER_SIZE); setDialogError('');
    dialogBodyRef.current?.scrollTo({ top: 0 });
    dialogRef.current?.focus();
  };

  const chooseCromo = id => {
    if (processing || activePending) return;
    if (step === 'give') { setGive(id); if (receive === id) setReceive(null); }
    else setReceive(id);
    setStep('overview'); setDialogError('');
    dialogBodyRef.current?.scrollTo({ top: 0 });
    dialogRef.current?.focus();
  };

  const runOperation = async operation => {
    if (!operation || operation.userId !== userId || processingRef.current) return;
    const params = albumOperationParams(operation);
    if (!params) { toast.error('La solicitud no es válida. Actualiza la página.'); return; }
    if (!savePending(operation)) {
      const message = 'El navegador no permite guardar esta solicitud. Habilita el almacenamiento de esta pestaña antes de intercambiar; no se inició ninguna operación.';
      setDialogError(message); toast.error(message);
      return;
    }
    processingRef.current = true;
    setProcessing(true); setPending(operation); setDialogError('');
    const toastId = `album-market:${userId}`;
    toast.loading(activePending ? 'Comprobando el resultado…' : 'Confirmando intercambio…', { id: toastId });
    try {
      const session = await withAlbumTimeout(supabase.auth.getSession());
      if (session.error) throw session.error;
      if (session.data.session?.user?.id !== operation.userId || currentAccount.current !== operation.userId) throw { code: 'P0001', details: 'ALBUM_AUTH_REQUIRED' };
      const { data, error } = await withAlbumTimeout(supabase.rpc(RPC_NAMES[operation.kind], params));
      if (error) throw error;
      if (!isValidAlbumMarketReceipt(data, operation)) throw new Error('No se pudo confirmar la respuesta.');
      if (!lifecycle.current.mounted || currentAccount.current !== operation.userId) return;
      clearPending(operation.userId); setPending(null); setDialog(null);
      const message = { create: 'Oferta publicada. Tu copia queda reservada.', accept: '¡Intercambio completado! Tu nuevo cromo ya está en el inventario.', cancel: 'Oferta cancelada. La reserva quedó liberada.' }[operation.kind];
      toast.success(message, { id: toastId });
      await loadMarket();
    } catch (error) {
      if (!lifecycle.current.mounted || currentAccount.current !== operation.userId) return;
      if (isAmbiguousAlbumError(error)) {
        const message = 'La conexión se cortó antes de confirmar el resultado. Comprueba esta misma solicitud para evitar repetir el intercambio.';
        setDialogError(message); toast.error(message, { id: toastId });
      } else {
        clearPending(operation.userId); setPending(null);
        const message = albumErrorMessage(error);
        setDialogError(message); toast.error(message, { id: toastId });
        if (error.details?.startsWith('ALBUM_') && !['ALBUM_AUTH_REQUIRED', 'ALBUM_REQUEST_REQUIRED'].includes(error.details)) await loadMarket();
      }
    } finally {
      processingRef.current = false;
      if (lifecycle.current.mounted && currentAccount.current === operation.userId) setProcessing(false);
    }
  };

  const confirmDialog = () => {
    if (activePending) { void runOperation(activePending); return; }
    if (!activeDialog || mutationsBlocked) return;
    if (activeDialog.kind === 'create' && !draftValid) return;
    if (activeDialog.kind === 'accept' && !albumOfferAvailability(activeDialog.offer, inventory, Date.now()).canAccept) { setDialogError('La oferta o tus copias ya no están disponibles. Actualiza el mercado.'); return; }
    const operation = { kind: activeDialog.kind, userId, requestId: crypto.randomUUID(), ...(activeDialog.kind === 'create' ? { ofrece: give, pide: receive } : { offerId: activeDialog.offer.id }) };
    void runOperation(operation);
  };

  const hasFilters = search || category !== 'TODOS' || onlyAvailable || onlyMissing;
  const resetFilters = () => { setSearch(''); setCategory('TODOS'); setOnlyAvailable(false); setOnlyMissing(false); setPage(0); };
  const showPage = value => { setPage(value); resultRef.current?.scrollIntoView({ behavior: motionEnabled ? 'smooth' : 'auto', block: 'start' }); };
  const confirmDisabled = processing || (!activePending && (mutationsBlocked || (activeDialog?.kind === 'create' && !draftValid)));

  return (
    <MotionConfig reducedMotion={motionEnabled ? 'never' : 'always'}>
      <section className="album-collection" data-motion={motionEnabled ? 'on' : 'off'} aria-label="Mercado del álbum">
        <div className="album-collection-main" inert={Boolean(activeDialog)} aria-hidden={activeDialog ? true : undefined}>
          <header className="album-collection-nav">
            <button type="button" className="album-collection-back" onClick={onBack}><ArrowLeft size={18} /> Volver</button>
            <span className="album-collection-brand">ÁLBUM <b>THC.</b></span>
            {onNavigate && <nav className="album-collection-links" aria-label="Secciones del álbum"><button type="button" onClick={() => onNavigate('album')}>Mi álbum</button><button type="button" onClick={() => onNavigate('inventario')}>Inventario</button><button type="button" aria-current="page">Mercado</button></nav>}
          </header>
          <div className="album-collection-scroll">
            <div className="album-collection-shell">
              <motion.div className="album-collection-heading" initial={motionEnabled ? { opacity: 0, y: 12 } : false} animate={{ opacity: 1, y: 0 }} transition={{ duration: .32 }}><div><p className="album-collection-kicker"><ArrowRightLeft size={17} /> CAMBIA REPETIDAS. COMPLETA TU ÁLBUM.</p><h1>MERCADO<span>.</span></h1><p>Una copia por otra. Mira qué entregas y qué recibes antes de confirmar.</p></div><button type="button" className="album-collection-secondary" onClick={loadMarket} disabled={loading || processing || !userId}><RefreshCw size={17} className={loading ? 'is-spinning' : ''} /> Actualizar</button></motion.div>

              {activePending && <div className="album-market-pending" role="status"><div><strong>Hay una operación por comprobar.</strong><p>Puede haberse completado. Volvemos a consultar la misma solicitud sin crear otra ni descontar dos veces.</p></div><button type="button" className="album-collection-primary" disabled={processing} onClick={() => void runOperation(activePending)}><RefreshCw size={16} /> {processing ? 'Comprobando…' : 'Comprobar resultado'}</button></div>}

              <div className="album-market-tips"><div><strong>Conservas tu primera copia.</strong><p>Solo intercambias repetidas. Al publicar, una copia queda reservada durante 3 días. Puedes cancelar la oferta para liberarla.</p></div><div className="album-market-limit"><strong>{myOffers.length} / 2</strong><span>Ofertas activas</span></div></div>
              <div className="album-market-top"><div className="album-market-tabs" aria-label="Vista del mercado"><button type="button" aria-pressed={tab === 'mercado'} onClick={() => { setTab('mercado'); setPage(0); }}>Ver intercambios</button><button type="button" aria-pressed={tab === 'mis_ofertas'} onClick={() => setTab('mis_ofertas')}>Mis ofertas <span>({myOffers.length})</span></button></div><button type="button" className="album-collection-primary" disabled={mutationsBlocked || myOffers.length >= 2 || totals.disponiblesMercado === 0 || legacyOffers.length > 0} onClick={openCreator}><Plus size={18} /> Crear oferta</button></div>
              {!loading && !snapshot.error && !snapshot.setupError && totals.disponiblesMercado === 0 && <p className="album-market-note">Todavía no tienes una repetida libre para ofrecer. Abre sobres o revisa las reservas en «Mis ofertas».</p>}
              {myOffers.length >= 2 && <p className="album-market-note">Tienes tus 2 ofertas activas. Puedes cancelar una para publicar otra.</p>}

              {legacyOffers.length > 0 && <div className="album-market-legacy" role="status"><h2>Ofertas del mercado anterior</h2><p>Estas ofertas necesitan revisión antes de activar el nuevo mercado. No contamos sus reservas ni devoluciones porque la versión anterior podía descontar cromos al publicarlas. El administrador tiene las comprobaciones en ComandosSQL.txt.</p><ul>{legacyOffers.map(offer => <li key={offer.id}>{offer.cromo_ofrece} por {offer.cromo_pide} · {albumTimeRemaining(offer.fecha_expiracion, now)}</li>)}</ul></div>}

              {!userId ? <div className="album-collection-empty"><h2>Inicia sesión para intercambiar.</h2><p>Tus ofertas y tus cromos pertenecen a tu cuenta.</p></div> : loadError ? <div className="album-collection-empty" role="alert"><h2>El mercado necesita una actualización.</h2><p>{loadError}</p><button type="button" className="album-collection-secondary" onClick={loadMarket} disabled={loading}>Reintentar</button></div> : loading ? <div className="album-collection-empty" role="status"><RefreshCw size={32} className="is-spinning" /><h2>Consultando el mercado…</h2><p>Estamos comprobando ofertas y copias disponibles.</p></div> : tab === 'mercado' ? <>
                <div className="album-collection-filters"><label className="album-collection-search"><Search size={19} /><span className="album-sr-only">Buscar ofertas por cromo, nombre o usuario</span><input type="search" value={search} onChange={event => { setSearch(event.target.value); setPage(0); }} placeholder="Cromo, nombre o usuario…" />{search && <button type="button" aria-label="Limpiar búsqueda de ofertas" onClick={() => { setSearch(''); setPage(0); }}><X size={17} /></button>}</label><label className="album-collection-select"><span>Categoría</span><select value={category} onChange={event => { setCategory(event.target.value); setPage(0); }}>{ALBUM_CATEGORIES.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label></div>
                <div className="album-collection-chips" aria-label="Filtros de intercambios"><button type="button" aria-pressed={onlyAvailable} onClick={() => { setOnlyAvailable(value => !value); setPage(0); }}><ShieldCheck size={15} /> Puedo aceptar</button><button type="button" aria-pressed={onlyMissing} onClick={() => { setOnlyMissing(value => !value); setPage(0); }}>Me faltan</button></div>
                <div ref={resultRef} className="album-collection-result-line" aria-live="polite"><p><strong>{filteredMarket.length}</strong> {filteredMarket.length === 1 ? 'oferta disponible' : 'ofertas disponibles'}</p>{hasFilters && <button type="button" onClick={resetFilters}>Limpiar filtros <X size={15} /></button>}</div>
                {visibleMarket.length === 0 ? <div className="album-collection-empty"><ArrowRightLeft size={35} /><h2>{hasFilters ? 'No hay ofertas con estos filtros.' : 'El próximo intercambio puede ser el tuyo.'}</h2><p>{hasFilters ? 'Prueba otra búsqueda o revisa las ofertas que todavía no puedes aceptar.' : 'Publica una repetida y elige el cromo que te gustaría recibir.'}</p>{hasFilters && <button type="button" className="album-collection-secondary" onClick={resetFilters}>Limpiar filtros</button>}</div> : <div className="album-market-grid">{visibleMarket.map((offer, index) => {
                  const available = albumOfferAvailability(offer, inventory, now);
                  const newCromo = !heldIds.has(offer.cromo_ofrece);
                  return <motion.article key={offer.id} className="album-offer" initial={motionEnabled ? { opacity: 0, y: 10 } : false} animate={{ opacity: 1, y: 0 }} transition={{ duration: .25, delay: Math.min(index, 4) * .035 }}><div className="album-offer-owner"><img loading="lazy" src={imagenSegura(offer.perfiles?.avatar_url) || '/imagenes/LogoTHC.png'} alt="" onError={event => { if (!event.currentTarget.src.endsWith('/LogoTHC.png')) event.currentTarget.src = '/imagenes/LogoTHC.png'; }} /><div><strong>{offer.perfiles?.discord_nombre || 'Coleccionista THC'}</strong><small><Clock size={12} /> Vence en {albumTimeRemaining(offer.fecha_expiracion, now)}</small></div>{newCromo && <span>Te falta</span>}</div><ExchangePair give={offer.cromo_pide} receive={offer.cromo_ofrece} /><div className="album-offer-action"><p className={available.canAccept ? 'is-ready' : ''}>{available.reason}</p><button type="button" className={available.canAccept ? 'album-collection-primary' : 'album-collection-secondary'} disabled={mutationsBlocked || !available.canAccept} onClick={event => openConfirmation('accept', offer, event)}><ArrowRightLeft size={16} /> {available.canAccept ? 'Revisar intercambio' : 'No tengo una repetida libre'}</button></div></motion.article>;
                })}</div>}
                {filteredMarket.length > PAGE_SIZE && <nav className="album-collection-pagination" aria-label="Páginas del mercado"><button type="button" disabled={activePage === 0} onClick={() => showPage(activePage - 1)}>Anterior</button><span aria-live="polite">Página <strong>{activePage + 1}</strong> de {pageCount}</span><button type="button" disabled={activePage >= pageCount - 1} onClick={() => showPage(activePage + 1)}>Siguiente</button></nav>}
                {snapshot.capped && <p className="album-market-note">Mostramos las {MARKET_LIMIT} ofertas más recientes. Tus filtros se aplican a estas ofertas. Actualiza para ver los nuevos intercambios.</p>}
              </> : myOffers.length === 0 ? <div className="album-collection-empty"><ArrowRightLeft size={35} /><h2>No tienes ofertas activas.</h2><p>Elige una repetida, pide el cromo que te falta y deja que la comunidad te encuentre.</p></div> : <div className="album-market-grid">{myOffers.map((offer, index) => <motion.article key={offer.id} className="album-offer" initial={motionEnabled ? { opacity: 0, y: 10 } : false} animate={{ opacity: 1, y: 0 }} transition={{ duration: .25, delay: index * .04 }}><div className="album-offer-owner"><div><strong>Tu oferta</strong><small><Clock size={12} /> Vence en {albumTimeRemaining(offer.fecha_expiracion, now)}</small></div><span>Reservada</span></div><ExchangePair give={offer.cromo_ofrece} receive={offer.cromo_pide} /><div className="album-offer-action"><p>Una copia está reservada. Todavía permanece en tu inventario; se entregará cuando acepten la oferta.</p><button type="button" className="album-collection-secondary" disabled={mutationsBlocked} onClick={event => openConfirmation('cancel', offer, event)}><Trash2 size={16} /> Cancelar oferta</button></div></motion.article>)}</div>}

              {onNavigate && <div className="album-collection-next"><div><strong>Todo en su lugar.</strong><p>Los cromos recibidos aparecen en tu inventario. Pégalos para completar la colección.</p></div><button type="button" onClick={() => onNavigate('inventario')}>Ver mi inventario <ArrowUpRight size={17} /></button><button type="button" onClick={() => onNavigate('album')}>Volver a mi álbum <ArrowUpRight size={17} /></button></div>}
            </div>
          </div>
        </div>

        <AnimatePresence>
          {activeDialog && <div className="album-market-dialog-layer">
            <motion.div className="album-market-dialog-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeDialog} />
            <motion.div ref={dialogRef} className="album-market-dialog" role="dialog" aria-modal="true" aria-labelledby="album-market-dialog-title" tabIndex={-1} onKeyDown={dialogKeyDown} initial={motionEnabled ? { opacity: 0, y: 18, scale: .985 } : false} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12 }} transition={{ duration: .22 }}>
              <header><div><p>{activeDialog.kind === 'create' ? 'TÚ ELIGES. LA COMUNIDAD INTERCAMBIA.' : 'REVISA ANTES DE CONFIRMAR.'}</p><h2 id="album-market-dialog-title">{activeDialog.kind === 'create' ? 'Crea tu oferta' : activeDialog.kind === 'accept' ? 'Un cromo por otro' : '¿Cancelar esta oferta?'}</h2></div><button type="button" className="album-market-dialog-close" aria-label="Cerrar intercambio" disabled={processing} onClick={closeDialog}><X size={21} /></button></header>
              <div ref={dialogBodyRef} className="album-market-dialog-body">
                {dialogError && <div className="album-market-dialog-footnote" role="alert">{dialogError}</div>}
                {activeDialog.kind === 'create' ? step === 'overview' ? <>
                  <p>Elige una repetida que entregas y el cromo que deseas recibir. Puedes cambiar ambas selecciones antes de publicar.</p>
                  <div className="album-market-dialog-steps"><button type="button" className={`album-market-choose ${give ? 'is-selected' : ''}`} disabled={processing || Boolean(activePending)} onClick={() => openPicker('give')}><span>01 · TÚ ENTREGAS</span>{give && <img src={`/Album/Cromos/${give}.jpg`} alt="" onError={event => { if (!event.currentTarget.src.endsWith('/Cromo.jpg')) event.currentTarget.src = '/Album/Cromos/Cromo.jpg'; }} />}<strong>{give ? CROMOS_DATA[give]?.name || give : 'Elige una repetida'}</strong><small>{give ? `${give} · ${selectedGive?.disponiblesMercado || 0} ${selectedGive?.disponiblesMercado === 1 ? 'disponible' : 'disponibles'}` : 'Solo verás copias que puedes ofrecer.'}</small><Plus size={21} /></button><ArrowRight size={23} /><button type="button" className={`album-market-choose ${receive ? 'is-selected' : ''}`} disabled={processing || Boolean(activePending)} onClick={() => openPicker('receive')}><span>02 · TÚ RECIBES</span>{receive && <img src={`/Album/Cromos/${receive}.jpg`} alt="" onError={event => { if (!event.currentTarget.src.endsWith('/Cromo.jpg')) event.currentTarget.src = '/Album/Cromos/Cromo.jpg'; }} />}<strong>{receive ? CROMOS_DATA[receive]?.name || receive : 'Elige el que te falta'}</strong><small>{receive ? receive : 'Busca por nombre, ID o categoría.'}</small><Search size={21} /></button></div>
                  <div className="album-market-dialog-footnote"><ShieldCheck size={16} /> Conservas tu primera copia. Al publicar, <strong>una repetida queda reservada hasta 3 días</strong>. Cancelar o dejar que venza libera la reserva. El intercambio se completa de una vez cuando alguien acepta.</div>
                </> : <>
                  <div className="album-market-picker-top"><button type="button" onClick={() => setStep('overview')}><ArrowLeft size={16} /> Volver al resumen</button><p>{step === 'give' ? 'Estas son tus repetidas libres. Las reservadas en otras ofertas no aparecen.' : 'Primero te mostramos los cromos que todavía no tienes.'}</p><div className="album-collection-filters"><label className="album-collection-search"><Search size={17} /><span className="album-sr-only">Buscar cromos para la oferta</span><input type="search" value={pickerSearch} onChange={event => { setPickerSearch(event.target.value); setPickerLimit(PICKER_SIZE); }} placeholder="Nombre, ID o categoría…" /></label><label className="album-collection-select"><span>Categoría</span><select value={pickerCategory} onChange={event => { setPickerCategory(event.target.value); setPickerLimit(PICKER_SIZE); }}>{ALBUM_CATEGORIES.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label></div>{step === 'receive' && <div className="album-collection-chips"><button type="button" aria-pressed={wantedMode === 'faltantes'} onClick={() => { setWantedMode('faltantes'); setPickerLimit(PICKER_SIZE); }}>Me faltan</button><button type="button" aria-pressed={wantedMode === 'todos'} onClick={() => { setWantedMode('todos'); setPickerLimit(PICKER_SIZE); }}>Toda la colección</button></div>}</div>
                  <div className="album-collection-result-line" aria-live="polite"><p><strong>{pickerMatches.length}</strong> {pickerMatches.length === 1 ? 'cromo para elegir' : 'cromos para elegir'}</p></div>
                  {pickerMatches.length === 0 ? <div className="album-collection-empty"><h2>No hay cromos con estos filtros.</h2><p>{step === 'give' ? 'Necesitas una repetida que no esté reservada.' : 'Prueba otra búsqueda o muestra toda la colección.'}</p></div> : <div className="album-market-picker-grid">{pickerMatches.slice(0, pickerLimit).map(id => <button key={id} type="button" className="album-market-picker-item" onClick={() => chooseCromo(id)} aria-label={`Elegir ${id}, ${CROMOS_DATA[id]?.name || 'cromo THC'}`}><CromoImage id={id} selected={step === 'give' ? give === id : receive === id} /><strong>{CROMOS_DATA[id]?.name || 'Cromo THC'}</strong><span>{step === 'give' ? `${inventory.find(item => item.id === id)?.disponiblesMercado || 0} ${inventory.find(item => item.id === id)?.disponiblesMercado === 1 ? 'disponible' : 'disponibles'}` : CROMOS_DATA[id]?.categoria}</span></button>)}</div>}
                  {pickerLimit < pickerMatches.length && <div className="album-market-picker-more"><button type="button" className="album-collection-secondary" onClick={() => setPickerLimit(value => value + PICKER_SIZE)}>Ver {Math.min(PICKER_SIZE, pickerMatches.length - pickerLimit)} más</button></div>}
                </> : <>
                  <p>{activeDialog.kind === 'accept' ? 'El intercambio entrega y recibe ambos cromos de una sola vez. Tu primera copia queda protegida.' : 'El cromo no se ha entregado. Al cancelar se libera la reserva y puedes ofrecer esa copia de nuevo.'}</p>
                  <ExchangePair give={activeDialog.kind === 'accept' ? activeDialog.offer.cromo_pide : activeDialog.offer.cromo_ofrece} receive={activeDialog.kind === 'accept' ? activeDialog.offer.cromo_ofrece : activeDialog.offer.cromo_pide} />
                  <div className="album-market-dialog-footnote">{activeDialog.kind === 'accept' ? 'Recibirás 1 copia y entregarás 1 copia. Una vez completado, el intercambio queda cerrado.' : 'Esta oferta dejará de aparecer en el mercado. Puedes crear otra cuando quieras.'}</div>
                </>}
              </div>
              <footer><span>{activeDialog.kind === 'create' ? 'Máximo 2 ofertas · 1 copia por oferta · 3 días' : 'Tus cromos se actualizan al confirmar.'}</span>{activeDialog.kind === 'create' && step !== 'overview' ? <button type="button" className="album-collection-secondary" onClick={() => setStep('overview')}>Volver al resumen <ArrowRight size={16} /></button> : <button type="button" className="album-collection-primary" disabled={confirmDisabled} onClick={confirmDialog}>{processing ? <RefreshCw size={17} className="is-spinning" /> : <Check size={17} />}{processing ? 'Confirmando…' : activePending ? 'Comprobar resultado' : activeDialog.kind === 'create' ? 'Publicar oferta' : activeDialog.kind === 'accept' ? 'Confirmar intercambio' : 'Confirmar cancelación'}</button>}</footer>
            </motion.div>
          </div>}
        </AnimatePresence>
      </section>
    </MotionConfig>
  );
}
