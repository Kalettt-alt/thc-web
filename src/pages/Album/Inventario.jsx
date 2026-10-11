import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { ArrowLeft, Check, RefreshCw, Search, SlidersHorizontal, X } from 'lucide-react';
import { MotionConfig, motion } from 'framer-motion';
import { supabase } from '../../utils/supabase';
import { CROMOS_DATA } from '../../utils/UsuariosTHC';
import { useHomeMotion } from '../../utils/homeMotion';
import { ALBUM_CATEGORIES, groupAlbumInventory, summarizeAlbumInventory, filterAlbumInventory, albumErrorMessage } from '../../utils/albumCollection';
import { withAlbumTimeout } from '../../utils/albumAsync';
import './AlbumCollection.css';
import './Inventario.css';

const PAGE_SIZE = 24;
const emptySnapshot = { userId: null, rows: [], offers: [], loading: true, error: '' };

export default function Inventario({ onBack, userId }) {
  const { motionEnabled } = useHomeMotion();
  const [snapshot, setSnapshot] = useState(emptySnapshot);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('TODOS');
  const [status, setStatus] = useState('todos');
  const [sort, setSort] = useState('id');
  const [page, setPage] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const lifecycle = useRef({ mounted: false, sequence: 0, controller: null });
  const currentAccount = useRef(userId);
  const resultRef = useRef(null);
  currentAccount.current = userId;

  const loadInventory = useCallback(async () => {
    if (!userId) return;
    const request = lifecycle.current;
    const sequence = ++request.sequence;
    request.controller?.abort();
    const controller = new AbortController();
    request.controller = controller;
    setSnapshot(previous => previous.userId === userId ? { ...previous, loading: true, error: '' } : { ...emptySnapshot, userId });
    try {
      const [inventory, offers] = await withAlbumTimeout(Promise.all([
        supabase.from('inventario_cromos').select('cromo_id, cantidad, pegada').eq('user_id', userId).abortSignal(controller.signal),
        supabase.from('intercambios_album').select('*').eq('user_id_ofrece', userId).eq('estado', 'activo').abortSignal(controller.signal),
      ]));
      if (inventory.error) throw inventory.error;
      if (offers.error) throw offers.error;
      if (!request.mounted || sequence !== request.sequence || currentAccount.current !== userId) return;
      setSnapshot({ userId, rows: inventory.data || [], offers: offers.data || [], loading: false, error: '' });
    } catch (error) {
      if (controller.signal.aborted || !request.mounted || sequence !== request.sequence || currentAccount.current !== userId) return;
      if (error.code === 'NETWORK_TIMEOUT') controller.abort();
      setSnapshot(previous => ({ ...previous, userId, loading: false, error: albumErrorMessage(error, 'No pudimos cargar tu inventario. Revisa tu conexión y vuelve a intentarlo.') }));
    }
  }, [userId]);

  useEffect(() => {
    const request = lifecycle.current;
    request.mounted = true;
    void loadInventory();
    return () => { request.mounted = false; request.sequence += 1; request.controller?.abort(); };
  }, [loadInventory]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  const accountMatches = snapshot.userId === userId;
  const loading = Boolean(userId) && (!accountMatches || snapshot.loading);
  const inventory = useMemo(() => accountMatches ? groupAlbumInventory(snapshot.rows, snapshot.offers, now) : [], [accountMatches, snapshot.rows, snapshot.offers, now]);
  const totals = useMemo(() => summarizeAlbumInventory(inventory), [inventory]);
  const filtered = useMemo(() => filterAlbumInventory(inventory, CROMOS_DATA, { search, category, status, sort }), [inventory, search, category, status, sort]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const activePage = Math.min(page, pageCount - 1);
  const visible = filtered.slice(activePage * PAGE_SIZE, (activePage + 1) * PAGE_SIZE);
  const hasFilters = search || category !== 'TODOS' || status !== 'todos';
  const resetFilters = () => { setSearch(''); setCategory('TODOS'); setStatus('todos'); setSort('id'); setPage(0); };
  const showPage = value => { setPage(value); resultRef.current?.scrollIntoView({ behavior: motionEnabled ? 'smooth' : 'auto', block: 'start' }); };
  const filters = [
    { id: 'todos', label: 'Todos', count: totals.tipos },
    { id: 'para_pegar', label: 'Para pegar', count: totals.paraPegar },
    { id: 'repetidas', label: 'Repetidas', count: inventory.filter(item => item.repetidas > 0).length },
    { id: 'pegadas', label: 'Pegadas', count: totals.pegadas },
    { id: 'disponibles', label: 'Para intercambiar', count: inventory.filter(item => item.disponiblesMercado > 0).length },
  ];

  return (
    <MotionConfig reducedMotion={motionEnabled ? 'never' : 'always'}>
      <section className="album-collection album-inventory-visual" data-motion={motionEnabled ? 'on' : 'off'} aria-label="Inventario del álbum">
        <div className="album-collection-scroll">
          <div className="album-collection-shell">
            <div className="inventory-back-row">
              <button type="button" className="album-collection-back" onClick={onBack}><ArrowLeft size={18} /> Volver</button>
              <button type="button" className="inventory-refresh" onClick={loadInventory} disabled={loading || !userId} aria-label="Actualizar inventario" title="Actualizar inventario"><RefreshCw size={19} className={loading ? 'is-spinning' : ''} /><span>Actualizar</span></button>
            </div>
            <motion.header className="inventory-heading" initial={motionEnabled ? { opacity: 0, y: 8 } : false} animate={{ opacity: 1, y: 0 }} transition={{ duration: .25 }}>
              <h1>Inventario<span>.</span></h1>
              <p aria-label={`${totals.tipos} de 190 cromos distintos`}><strong>{totals.tipos}<span> / 190</span></strong><span>Cromos</span></p>
            </motion.header>
            <div className="album-collection-filters">
              <label className="album-collection-search"><Search size={19} /><span className="album-sr-only">Buscar cromos por nombre, ID o categoría</span><input type="search" value={search} onChange={event => { setSearch(event.target.value); setPage(0); }} placeholder="Buscar cromo…" />{search && <button type="button" aria-label="Limpiar búsqueda" onClick={() => { setSearch(''); setPage(0); }}><X size={18} /></button>}</label>
              <label className="album-collection-select"><span className="album-sr-only">Categoría</span><select value={category} onChange={event => { setCategory(event.target.value); setPage(0); }}>{ALBUM_CATEGORIES.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
              <label className="album-collection-select"><span className="album-sr-only">Ordenar por</span><select value={sort} onChange={event => { setSort(event.target.value); setPage(0); }}><option value="id">Categoría e ID</option><option value="nombre">Nombre</option><option value="cantidad">Más copias</option><option value="disponibles">Más disponibles</option></select></label>
            </div>
            <div className="inventory-status-tabs" aria-label="Estado de los cromos">{filters.map(filter => <button key={filter.id} type="button" aria-pressed={status === filter.id} onClick={() => { setStatus(filter.id); setPage(0); }}>{filter.label}<span>{filter.count}</span></button>)}</div>
            {!userId ? <div className="album-collection-empty"><h2>Inicia sesión para ver tus cromos.</h2></div> : snapshot.error && accountMatches ? <div className="album-collection-empty" role="alert"><h2>No pudimos sincronizar.</h2><p>{snapshot.error}</p><button type="button" className="album-collection-primary" onClick={loadInventory} disabled={loading}>Reintentar</button></div> : loading ? <div className="album-collection-empty" role="status"><RefreshCw size={30} className="is-spinning" /><h2>Cargando inventario…</h2></div> : filtered.length === 0 ? <div className="album-collection-empty"><SlidersHorizontal size={30} /><h2>{hasFilters ? 'Sin coincidencias.' : 'Todavía no tienes cromos.'}</h2>{hasFilters ? <button type="button" className="album-collection-secondary" onClick={resetFilters}>Limpiar filtros</button> : <button type="button" className="album-collection-secondary" onClick={onBack}>Volver al menú</button>}</div> : <>
              <div ref={resultRef} className="album-collection-result-line" aria-live="polite"><p>{filtered.length} {filtered.length === 1 ? 'cromo' : 'cromos'}</p>{hasFilters && <button type="button" onClick={resetFilters}>Limpiar filtros <X size={16} /></button>}</div>
              <div className="album-cromo-grid">{visible.map((item, index) => {
                const info = CROMOS_DATA[item.id] || {};
                const hasName = info.name && info.name !== 'Desconocido';
                return <motion.article key={item.id} className="album-cromo" initial={motionEnabled ? { opacity: 0, y: 8 } : false} animate={{ opacity: 1, y: 0 }} transition={{ duration: .2, delay: Math.min(index, 5) * .025 }}>
                  <div className="album-cromo-image"><img loading="lazy" decoding="async" src={`/Album/Cromos/${item.id}.jpg`} onError={event => { if (!event.currentTarget.src.endsWith('/Cromo.jpg')) event.currentTarget.src = '/Album/Cromos/Cromo.jpg'; }} alt={`${item.id}, ${hasName ? info.name : 'cromo THC'}`} /><span className="album-cromo-quantity" aria-label={`${item.cantidad} ${item.cantidad === 1 ? 'copia' : 'copias'}`}>×{item.cantidad}</span><span className={`inventory-card-state ${item.pegada ? 'is-pasted' : ''}`}>{item.pegada ? <><Check size={15} /> Pegada</> : 'Sin pegar'}</span></div>
                  <div className="inventory-card-copy"><div><h2>{hasName ? info.name : item.id}</h2>{hasName && <span>{item.id}</span>}</div>{item.disponiblesMercado > 0 && <p>{item.disponiblesMercado} para cambiar</p>}{item.reservadas > 0 && <p className="inventory-reserved">{item.reservadas} en oferta</p>}</div>
                </motion.article>;
              })}</div>
              {pageCount > 1 && <nav className="album-collection-pagination" aria-label="Páginas del inventario"><button type="button" disabled={activePage === 0} onClick={() => showPage(activePage - 1)}>Anterior</button><span aria-live="polite"><strong>{activePage + 1}</strong> / {pageCount}</span><button type="button" disabled={activePage >= pageCount - 1} onClick={() => showPage(activePage + 1)}>Siguiente</button></nav>}
            </>}
          </div>
        </div>
      </section>
    </MotionConfig>
  );
}
