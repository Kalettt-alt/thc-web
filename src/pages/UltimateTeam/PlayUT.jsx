import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, ArrowRight, ArrowUpRight, Check, ChevronLeft, ChevronRight, Gamepad2, Radio, ScanLine, Shield, Timer, Wifi, X } from 'lucide-react';
import { supabase } from '../../utils/supabase';
import { EQUIPOS_DATA } from './JugadoresUT';
import { normalizePlayerList } from './utValidation';
import { repairSquad, validateStartingSquad } from './squadUT';
import ClubIdentityLogoUT from './ClubIdentityLogoUT';
import { createOfflineMatch, practiceTeamSnapshot, teamSimulationMetrics } from './simulationUT';
import { cancelOnlineQueue, getOnlineStatus, heartbeatOnlineQueue, joinOnlineQueue, updateOnlineTactics, ONLINE_GRL_RANGE, ONLINE_POLL_MS } from './onlineUT';
import MatchSimulationUT from './MatchSimulationUT';
import { dismissOnlineMatch, readDismissedOnlineMatchId } from './onlineResultSeenUT';
import { validOnlineMatchUT } from './onlineMatchValidationUT';
import './PlayUT.css';

const normalizeSquad = value => value ? { ...value, titulares: normalizePlayerList(value.titulares, 11), suplentes: normalizePlayerList(value.suplentes, 7), reservas: normalizePlayerList(value.reservas, 100) } : null;
const unavailable = error => ['PGRST202', '42P01', '42883'].includes(error?.code || error?.cause?.code);
const connectionMessage = error => unavailable(error) ? 'Online pendiente de activar.' : error?.message || 'No llegó la confirmación del servidor. Vuelve a intentarlo.';
const resultStorage = () => { try { return window.localStorage; } catch { return null; } };

function OnlineArenaUT({ club, userId, grl, loading, searching, connecting, confirmed, connected, error, queueGrl }) {
  const rating = queueGrl ?? grl;
  return <div className={`ut-play__arena${searching ? ' is-searching' : ''}${error ? ' has-error' : ''}`}>
    <div className="ut-play__arena-grid" aria-hidden="true"><i /><i /><i /></div>
    <div className="ut-play__versus">
      <div className="ut-play__contender ut-play__contender--own">
        <div className="ut-play__crest-frame"><ClubIdentityLogoUT club={club} userId={userId} className="ut-play__arena-logo" /></div>
        <span>TU CLUB</span><strong>{club.nombre}</strong><small>{loading ? 'Cargando once…' : `${grl} GRL`}</small>
      </div>
      <div className="ut-play__versus-mark" aria-hidden="true"><i /><b>VS</b><i /></div>
      <div className="ut-play__contender ut-play__contender--rival">
        <div className="ut-play__radar" aria-hidden="true"><i /><i /><span /><Shield size={39} strokeWidth={1.1} /><b>?</b></div>
        <span>RIVAL REAL</span><strong>{searching ? 'Buscando club' : '¿Quién sigue?'}</strong><small>{searching ? 'Sin ampliar el rango' : 'Un nuevo desafío'}</small>
      </div>
    </div>
    <div className="ut-play__search-state" role="status" aria-live="polite">
      <span className={`ut-play__signal${searching ? ' is-active' : ''}`} aria-hidden="true"><i /><i /><i /></span>
      <div><strong>{error ? 'Esperando reconexión' : connecting ? 'Conectando con la cancha…' : confirmed ? 'Tu próximo rival está por llegar' : searching ? 'Confirmando tu búsqueda…' : 'El siguiente partido empieza aquí'}</strong>
        <span>{searching ? `Rivales de ${Math.max(0, rating - ONLINE_GRL_RANGE)} a ${Math.min(99, rating + ONLINE_GRL_RANGE)} GRL` : 'Mismo margen. La misma oportunidad.'}</span></div>
      <span className="ut-play__range">±{ONLINE_GRL_RANGE}<small>GRL</small></span>
    </div>
    <ol className="ut-play__connection-steps" aria-label="Estado del emparejamiento">
      <li className={connected && !error ? 'is-done' : connecting || error ? 'is-current' : ''}><span>{connected && !error ? <Check size={12} /> : '1'}</span>Conexión</li>
      <li className={confirmed ? 'is-current' : searching && !connecting && !error ? 'is-current' : ''}><span>{confirmed ? <ScanLine size={12} /> : '2'}</span>Buscar rival</li>
      <li><span>3</span>A la cancha</li>
    </ol>
  </div>;
}

export default function PlayUT({ onVolver, clubData, squadData, onOpenTeam }) {
  const reduced = useReducedMotion();
  const [club, setClub] = useState(clubData || { nombre: 'Mi club' });
  const [squad, setSquad] = useState(() => normalizeSquad(squadData));
  const [userId, setUserId] = useState(clubData?.user_id || null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [opponentIndex, setOpponentIndex] = useState(1);
  const [practice, setPractice] = useState(null);
  const [online, setOnline] = useState({ status: 'idle', match: null, online_count: null, serverOffset: 0 });
  const [onlineError, setOnlineError] = useState('');
  const [serverTeam, setServerTeam] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [pendingSearch, setPendingSearch] = useState(false);
  const onlinePane = useRef(null);
  const practicePane = useRef(null);
  const queueId = useRef(null);
  const identityRef = useRef(clubData?.user_id || null);
  const operationLock = useRef(false);
  const pollLock = useRef(false);
  const operationVersion = useRef(0);
  const liveState = useRef(online);
  const active = useRef(true);
  const opponent = EQUIPOS_DATA[opponentIndex];
  const home = useMemo(() => practiceTeamSnapshot(club, squad, serverTeam, userId), [club, squad, userId, serverTeam]);
  const ownMetrics = useMemo(() => teamSimulationMetrics(home), [home]);
  const validation = useMemo(() => squad ? validateStartingSquad(squad) : { valid: false, issues: [] }, [squad]);
  const legacyLineup = useMemo(() => Boolean(squad && repairSquad(squad).changed), [squad]);
  const canPlay = !loading && !loadError && validation.valid && !legacyLineup;
  const searching = online.status === 'waiting' || pendingSearch;
  useEffect(() => { liveState.current = online; }, [online]);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const load = async () => {
      setLoading(true);
      setLoadError('');
      try {
        const { data: auth, error: authError } = await supabase.auth.getUser();
        if (authError || !auth?.user) throw new Error('Inicia sesión para cargar tu club.');
        if (cancelled) return;
        identityRef.current = auth.user.id;
        setUserId(auth.user.id);
        const [team, saved] = await Promise.all([
          supabase.from('equipos_ut').select('user_id,nombre,abreviatura,logo_url,liga,colores').eq('user_id', auth.user.id).maybeSingle().abortSignal(controller.signal),
          supabase.from('plantillas_ut').select('*').eq('user_id', auth.user.id).maybeSingle().abortSignal(controller.signal),
        ]);
        if (team.error || saved.error) throw new Error('No se pudo cargar tu club. Reintenta para jugar con tu plantilla guardada.');
        if (cancelled) return;
        setUserId(auth.user.id);
        if (team.data) setClub(team.data);
        setSquad(normalizeSquad(saved.data));
      } catch (error) {
        if (!cancelled) setLoadError(error.message || 'No se pudo cargar tu plantilla.');
      } finally {
        clearTimeout(timeout);
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; controller.abort(); clearTimeout(timeout); };
  }, [loadAttempt]);

  const acceptOnline = useCallback(payload => {
    if (!active.current) return;
    if (['playing', 'finished'].includes(payload.status) && !validOnlineMatchUT(payload.match)) {
      throw new Error('El servidor no pudo confirmar los datos del encuentro.');
    }
    const serverTime = Date.parse(payload.server_now);
    const dismissed = readDismissedOnlineMatchId(resultStorage(), identityRef.current);
    const next = payload.status === 'finished' && payload.match.id === dismissed ? { ...payload, status: 'idle', match: null } : payload;
    if (payload.status === 'idle') queueId.current = null;
    setPendingSearch(payload.status === 'waiting');
    const snapshot = { ...next, serverOffset: Number.isFinite(serverTime) ? serverTime - Date.now() : 0 };
    liveState.current = snapshot;
    setOnline(snapshot);
    setServerTeam(payload.team || null);
    setOnlineError('');
  }, []);

  const poll = useCallback(async () => {
    if (pollLock.current || operationLock.current || !active.current) return;
    pollLock.current = true;
    const version = operationVersion.current;
    try {
      const payload = liveState.current.status === 'waiting' ? await heartbeatOnlineQueue(supabase) : await getOnlineStatus(supabase);
      if (version === operationVersion.current && !operationLock.current) acceptOnline(payload);
    } catch (error) {
      if (active.current && version === operationVersion.current && !operationLock.current) {
        setOnlineError(connectionMessage(error));
        setOnline(previous => ({ ...previous, online_count: null }));
      }
    } finally { pollLock.current = false; }
  }, [acceptOnline]);

  useEffect(() => {
    active.current = true;
    void poll();
    // Active fixtures refresh promptly; the waiting queue keeps its lower-frequency heartbeat.
    let nextPoll = 0;
    const timer = setInterval(() => { if (Date.now() >= nextPoll) { nextPoll = Date.now() + (liveState.current.status === 'playing' ? ONLINE_POLL_MS : 5000); void poll(); } }, 500);
    return () => {
      active.current = false;
      clearInterval(timer);
      if (liveState.current.status === 'waiting' || (queueId.current && !['playing', 'finished'].includes(liveState.current.status))) {
        void cancelOnlineQueue(supabase, queueId.current).catch(() => {});
      }
    };
  }, [poll]);

  const searchOnline = async () => {
    if (!canPlay || operationLock.current) return;
    operationLock.current = true;
    operationVersion.current++;
    setConnecting(true);
    setPendingSearch(true);
    setOnlineError('');
    queueId.current ||= crypto.randomUUID();
    try {
      acceptOnline(await joinOnlineQueue(supabase, queueId.current));
    }
    catch (error) { if (active.current) setOnlineError(connectionMessage(error)); }
    finally { operationLock.current = false; if (active.current) setConnecting(false); }
  };

  const cancelSearch = async () => {
    if (operationLock.current) return false;
    operationLock.current = true;
    operationVersion.current++;
    setConnecting(true);
    try {
      const payload = await cancelOnlineQueue(supabase, queueId.current);
      acceptOnline(payload);
      queueId.current = null;
      return !['waiting', 'playing'].includes(payload.status);
    } catch (error) {
      if (active.current) setOnlineError(connectionMessage(error));
      return false;
    } finally { operationLock.current = false; if (active.current) setConnecting(false); }
  };

  const leave = async () => {
    if (operationLock.current) return;
    const uncertainSearch = !['playing', 'finished'].includes(liveState.current.status) && (pendingSearch || queueId.current);
    if ((liveState.current.status === 'waiting' || uncertainSearch) && !(await cancelSearch())) return;
    if (liveState.current.status === 'finished') dismissOnlineMatch(resultStorage(), identityRef.current, liveState.current.match?.id);
    onVolver();
  };
  const beginPractice = () => {
    if (!canPlay || searching || connecting) return;
    const away = { ...opponent, nombre: opponent.name, abreviatura: opponent.name.slice(0, 3).toUpperCase(), logo_url: opponent.img };
    setPractice(createOfflineMatch(home, away, { seed: crypto.randomUUID(), startedAt: Date.now() }));
  };
  const coachOnline = async command => {
    if (operationLock.current || !liveState.current.match) throw new Error('Espera la confirmación del partido.');
    operationLock.current = true;
    operationVersion.current++;
    try { acceptOnline(await updateOnlineTactics(supabase, { ...command, matchId: liveState.current.match.id })); }
    finally { operationLock.current = false; }
  };

  if (practice) return <MatchSimulationUT key={practice.id} match={practice} onVolver={() => setPractice(null)} onReplay={beginPractice} />;
  if (online.match && ['playing', 'finished'].includes(online.status)) return <MatchSimulationUT key={online.match.id} match={online.match} online serverOffset={online.serverOffset} serverStatus={online.status} viewerId={userId} connectionError={onlineError} onCoachOnline={coachOnline} onVolver={() => void leave()} />;

  return <section className="ut-play" data-motion="on" role="dialog" aria-modal="true" aria-label="Jugar Ultimate Team" onKeyDown={event => { if (event.key === 'Escape') void leave(); }}>
    <header className="ut-play__header">
      <button autoFocus type="button" onClick={() => void leave()} disabled={connecting} aria-label="Regresar al menú de Ultimate Team"><ArrowLeft size={17} /><span>Regresar</span></button>
      <div className="ut-play__brand"><b>UT</b><span>ULTIMATE TEAM<small>JUGAR</small></span></div>
      <div className="ut-play__population" title="Jugadores en búsqueda o en partido, confirmados por el servidor"><i className={online.online_count === null ? 'is-unknown' : ''} /><strong>{online.online_count === null ? '—' : online.online_count}</strong><span>jugadores<br />en línea</span></div>
    </header>
    <div className="ut-play__wrap">
      <motion.div className="ut-play__title" initial={{ opacity: 0, y: reduced ? 0 : 10 }} animate={{ opacity: 1, y: 0 }}>
        <div><p>ELIGE TU PRÓXIMO DESAFÍO</p><h1>ESTO ES <span>FÚTBOL.</span></h1></div>
        <div className="ut-play__club"><ClubIdentityLogoUT club={club} userId={userId} className="ut-play__club-logo" /><div><strong>{club.nombre}</strong><span>{loading ? 'Cargando plantilla…' : `${ownMetrics.grl} GRL`}<i />{loading ? 'Un momento' : `${ownMetrics.stamina}% de energía`}</span></div><button type="button" onClick={onOpenTeam} aria-label="Abrir My Team" disabled={searching || connecting}><ArrowUpRight size={18} /></button></div>
      </motion.div>
      <nav className="ut-play__mode-nav" aria-label="Modos de juego"><button type="button" onClick={() => onlinePane.current?.scrollIntoView({ behavior: reduced ? 'instant' : 'smooth', block: 'start' })}><Radio size={14} />Online<ArrowRight size={14} /></button><button type="button" onClick={() => practicePane.current?.scrollIntoView({ behavior: reduced ? 'instant' : 'smooth', block: 'start' })}><Gamepad2 size={15} />Offline<ArrowRight size={14} /></button></nav>
      {(loadError || (!loading && (!validation.valid || legacyLineup))) && <div className="ut-play__lineup-warning" role="alert"><Shield size={18} /><p>{loadError || (legacyLineup ? 'Actualiza y guarda tu alineación en My Team.' : 'Completa tu once y guarda la plantilla en My Team.')}</p>{loadError ? <button type="button" onClick={() => setLoadAttempt(attempt => attempt + 1)}>Reintentar</button> : <button type="button" onClick={onOpenTeam} disabled={searching || connecting}>My Team <ArrowRight size={15} /></button>}</div>}
      <div className="ut-play__modes">
        <motion.section ref={onlinePane} className="ut-play__mode ut-play__mode--online" aria-labelledby="ut-online-title" initial={{ opacity: 0, y: reduced ? 0 : 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .45, delay: .05 }}>
          <div className="ut-play__online-beam" aria-hidden="true" />
          <div className="ut-play__mode-heading"><span><Radio size={13} /> FRENTE A FRENTE</span><span className="ut-play__tag">GRL ±{ONLINE_GRL_RANGE}</span></div>
          <div className="ut-play__mode-title"><h2 id="ut-online-title">ONLINE<span>.</span></h2><p>Tu once contra otro jugador.</p></div>
          <OnlineArenaUT club={club} userId={userId} grl={ownMetrics.grl} loading={loading} searching={searching} connecting={connecting} confirmed={online.status === 'waiting'} connected={online.online_count !== null} error={onlineError} queueGrl={online.queue_grl} />
          {onlineError && <div className="ut-play__online-error" role="alert"><Wifi size={17} /><p>{onlineError}</p>{online.status === 'waiting' && <button type="button" onClick={() => void poll()} disabled={connecting}>Reconectar</button>}</div>}
          <footer className="ut-play__online-footer">
            <div><Shield size={18} /><p><strong>{searching ? 'No hay rivales forzados' : 'Un emparejamiento justo'}<span>{searching ? 'El rival y el partido los confirma el servidor.' : 'Máximo 3 GRL de diferencia. Siempre.'}</span></strong></p></div>
            {searching ? <div className="ut-play__queue-actions">{online.status !== 'waiting' && <button type="button" disabled={connecting} onClick={() => void searchOnline()}>Reintentar búsqueda <ArrowRight size={16} /></button>}<button type="button" disabled={connecting} className="ut-play__cancel" onClick={() => void cancelSearch()}><X size={15} />{connecting ? 'Confirmando…' : 'Cancelar'}</button></div> : <button type="button" className="ut-play__primary" onClick={() => void searchOnline()} disabled={!canPlay || connecting || onlineError === 'Online pendiente de activar.'}><span>{loading ? 'Cargando once…' : 'Buscar rival'}</span><ArrowRight size={20} /></button>}
          </footer>
        </motion.section>
        <motion.section ref={practicePane} className="ut-play__mode ut-play__mode--offline" aria-labelledby="ut-offline-title" initial={{ opacity: 0, y: reduced ? 0 : 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .45, delay: .13 }}>
          <div className="ut-play__mode-heading"><span><Gamepad2 size={15} /> CAMPO DE PRUEBAS</span><span className="ut-play__tag">IA</span></div>
          <div className="ut-play__mode-title"><h2 id="ut-offline-title">OFFLINE<span>.</span></h2><p>Prepara al equipo. El rival lo eliges tú.</p></div>
          <div className="ut-play__practice-field" aria-hidden="true"><div /><i /><span /><b /></div>
          <div className="ut-play__rival">
            <button type="button" onClick={() => setOpponentIndex(index => (index - 1 + EQUIPOS_DATA.length) % EQUIPOS_DATA.length)} aria-label="Rival anterior" disabled={searching || connecting}><ChevronLeft size={21} /></button>
            <motion.div key={opponent.id} initial={{ opacity: 0, x: reduced ? 0 : 12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: .23 }}><img src={opponent.img} alt={`Escudo de ${opponent.name}`} /><span className="ut-play__rival-rating"><b>{teamSimulationMetrics(opponent).grl}</b> GRL</span></motion.div>
            <button type="button" onClick={() => setOpponentIndex(index => (index + 1) % EQUIPOS_DATA.length)} aria-label="Siguiente rival" disabled={searching || connecting}><ChevronRight size={21} /></button>
          </div>
          <div className="ut-play__rival-select"><label htmlFor="ut-practice-rival">TU RIVAL</label><select id="ut-practice-rival" value={opponentIndex} onChange={event => setOpponentIndex(Number(event.target.value))} disabled={searching || connecting}>{EQUIPOS_DATA.map((team, index) => <option key={team.id} value={index}>{team.name}</option>)}</select></div>
          <div className="ut-play__practice-details"><span><Timer size={14} />60 s por mitad + añadido</span><span>Sin afectar estadísticas</span></div>
          <footer><button type="button" className="ut-play__practice-button" onClick={beginPractice} disabled={!canPlay || searching || connecting}><span>Jugar práctica</span><ArrowUpRight size={19} /></button></footer>
        </motion.section>
      </div>
      <p className="ut-play__bottom-note"><span>THC / MATCHDAY</span>Tu formación, tus cambios, tu partido.</p>
    </div>
  </section>;
}
