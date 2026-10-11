import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, Users, X } from 'lucide-react';
import { supabase } from '../../utils/supabase';
import { EQUIPOS_DATA } from './JugadoresUT';
import { normalizePlayerList } from './utValidation';
import { repairSquad, validateStartingSquad } from './squadUT';
import ClubIdentityLogoUT from './ClubIdentityLogoUT';
import { createOfflineMatch, practiceTeamSnapshot, teamSimulationMetrics } from './simulationUT';
import { cancelOnlineQueue, getOnlineStatus, heartbeatOnlineQueue, joinOnlineQueue, ONLINE_POLL_MS } from './onlineUT';
import MatchSimulationUT from './MatchSimulationUT';
import { dismissOnlineMatch, readDismissedOnlineMatchId } from './onlineResultSeenUT';
import './PlayUT.css';

const normalizeSquad = value => value ? { ...value, titulares: normalizePlayerList(value.titulares, 11), suplentes: normalizePlayerList(value.suplentes, 7), reservas: normalizePlayerList(value.reservas, 100) } : null;
const unavailable = error => ['PGRST202', '42P01', '42883'].includes(error?.code || error?.cause?.code);
const connectionMessage = error => unavailable(error) ? 'Online pendiente de activar.' : error?.message || 'No llegó la confirmación del servidor. Vuelve a intentarlo.';
const resultStorage = () => { try { return window.localStorage; } catch { return null; } };

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
    if (['playing', 'finished'].includes(payload.status) && (!payload.match?.home || !payload.match?.away || !Array.isArray(payload.match.events) || Date.parse(payload.match.ends_at) - Date.parse(payload.match.started_at) !== 180000 || !Number.isInteger(payload.match.home_goals) || !Number.isInteger(payload.match.away_goals) || payload.match.home_goals < 0 || payload.match.home_goals > 6 || payload.match.away_goals < 0 || payload.match.away_goals > 6)) {
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
    const timer = setInterval(() => { void poll(); }, ONLINE_POLL_MS);
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

  if (practice) return <MatchSimulationUT key={practice.id} match={practice} onVolver={() => setPractice(null)} onReplay={beginPractice} />;
  if (online.match && ['playing', 'finished'].includes(online.status)) return <MatchSimulationUT key={online.match.id} match={online.match} online serverOffset={online.serverOffset} serverStatus={online.status} viewerId={userId} connectionError={onlineError} onVolver={() => void leave()} />;

  return <section className="ut-play" role="dialog" aria-modal="true" aria-label="Jugar Ultimate Team" onKeyDown={event => { if (event.key === 'Escape') void leave(); }}>
    <header className="ut-play__header"><button autoFocus type="button" onClick={() => void leave()} disabled={connecting}><ArrowLeft size={18} /> Regresar</button><span>THC ULTIMATE TEAM</span><div><i className={online.online_count === null ? 'is-unknown' : ''} /><strong>{online.online_count === null ? '—' : online.online_count}</strong> Jugadores activos</div></header>
    <div className="ut-play__wrap"><motion.div className="ut-play__title" initial={{ opacity: 0, y: reduced ? 0 : 10 }} animate={{ opacity: 1, y: 0 }}><div><p>Tu club. Tu partido.</p><h1>A LA <span>CANCHA.</span></h1></div><div className="ut-play__club"><ClubIdentityLogoUT club={club} userId={userId} className="ut-play__club-logo" /><div><strong>{club.nombre}</strong><span>{loading ? 'Cargando plantilla…' : `GRL ${ownMetrics.grl} · Energía ${ownMetrics.stamina}%`}</span></div></div></motion.div>
      {(loadError || (!loading && (!validation.valid || legacyLineup))) && <div className="ut-play__lineup-warning" role="alert"><p>{loadError || (legacyLineup ? 'Actualiza y guarda tu alineación en My Team.' : 'Completa tu once y guarda la plantilla en My Team.')}</p>{loadError ? <button type="button" onClick={() => setLoadAttempt(attempt => attempt + 1)}>Reintentar</button> : <button type="button" onClick={onOpenTeam}>My Team <ArrowRight size={15} /></button>}</div>}
      <div className="ut-play__modes">
        <motion.section className="ut-play__mode ut-play__mode--offline" initial={{ opacity: 0, y: reduced ? 0 : 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .06 }}>
          <div className="ut-play__mode-title"><span>01 / PRÁCTICA</span><h2>OFFLINE.</h2><p>Elige tu rival y prueba tu once.</p></div>
          <div className="ut-play__rival">
            <button type="button" onClick={() => setOpponentIndex(index => (index - 1 + EQUIPOS_DATA.length) % EQUIPOS_DATA.length)} aria-label="Rival anterior" disabled={searching}><ChevronLeft size={24} /></button>
            <motion.div key={opponent.id} initial={{ opacity: 0, x: reduced ? 0 : 12 }} animate={{ opacity: 1, x: 0 }}><img src={opponent.img} alt={`Escudo de ${opponent.name}`} /><strong>{opponent.name}</strong><span>GRL {teamSimulationMetrics(opponent).grl}</span></motion.div>
            <button type="button" onClick={() => setOpponentIndex(index => (index + 1) % EQUIPOS_DATA.length)} aria-label="Siguiente rival" disabled={searching}><ChevronRight size={24} /></button>
          </div>
          <div className="ut-play__rival-dots" aria-label="Equipos disponibles">{EQUIPOS_DATA.map((team, index) => <button type="button" key={team.id} aria-label={`Elegir ${team.name}`} aria-pressed={index === opponentIndex} disabled={searching} onClick={() => setOpponentIndex(index)} />)}</div>
          <footer><span>3 minutos · Sin cambios en tu club</span><button type="button" onClick={beginPractice} disabled={!canPlay || searching || connecting}>Jugar <ArrowRight size={18} /></button></footer>
        </motion.section>
        <motion.section className="ut-play__mode ut-play__mode--online" initial={{ opacity: 0, y: reduced ? 0 : 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .12 }}>
          <div className="ut-play__mode-title"><span>02 / FRENTE A FRENTE</span><h2>ONLINE.</h2><p>Un rival real. Un partido simulado.</p></div>
          {searching ? <div className="ut-play__search" role="status"><div className="ut-play__search-rings" aria-hidden="true"><i /><i /><Users size={36} /></div><h3>{online.status === 'waiting' ? 'Buscando rival…' : 'Confirmando búsqueda…'}</h3><p>GRL {Math.max(0, (online.queue_grl ?? ownMetrics.grl) - 3)} — {Math.min(99, (online.queue_grl ?? ownMetrics.grl) + 3)}</p>{online.status === 'waiting' && <span>La búsqueda sigue mientras estás aquí.</span>}</div> : <div className="ut-play__online-art" aria-hidden="true"><span>VS</span><div><b>{ownMetrics.grl}</b><i /><b>?</b></div><span>GRL ±3</span></div>}
          {onlineError && <p className="ut-play__online-error" role="status">{onlineError}</p>}
          <footer><span>{searching ? online.status === 'waiting' ? 'Esperando otro jugador' : 'Esperando confirmación' : '3 minutos · Diferencia máxima de 3 GRL'}</span>
            {searching ? <div className="ut-play__queue-actions">{online.status !== 'waiting' && <button type="button" disabled={connecting} onClick={() => void searchOnline()}>Reintentar</button>}<button type="button" disabled={connecting} className="ut-play__cancel" onClick={() => void cancelSearch()}><X size={16} />Cancelar</button></div> : <button type="button" onClick={() => void searchOnline()} disabled={!canPlay || connecting || onlineError === 'Online pendiente de activar.'}>{connecting ? 'Conectando…' : 'Buscar rival'}<ArrowRight size={18} /></button>}
          </footer>
        </motion.section>
      </div>
    </div>
  </section>;
}
