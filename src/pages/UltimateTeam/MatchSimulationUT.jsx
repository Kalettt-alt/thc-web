import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, ArrowRight, RotateCcw, SlidersHorizontal } from 'lucide-react';
import ClubIdentityLogoUT from './ClubIdentityLogoUT';
import MatchPitchUT from './MatchPitchUT';
import MatchCoachUT from './MatchCoachUT';
import MatchCheerUT from './MatchCheerUT';
import { advanceOfflineMatch, applyOfflineCoaching, matchActiveDurationSeconds, matchClockState, matchVisibleState } from './simulationUT';
import './MatchSimulationUT.css';

const EVENT_LABELS = { goal: 'GOL', save: 'ATAJADA', post: 'AL PALO', shot: 'REMATE', pass: 'EN JUEGO', kickoff: 'SAQUE', halftime: 'DESCANSO', fulltime: 'FINAL', tactics:'AJUSTE DEL DT',settled:'BALÓN CONTROLADO',clearance:'DESPEJE' };
const displayTime = elapsed => `${Math.floor(elapsed / 60)}:${String(Math.floor(elapsed % 60)).padStart(2, '0')}`;
const clockAt = (match, offset) => ({ ...matchClockState(match, Date.now() + offset), observedAt: Date.now() });
function TeamMark({ team }) { return <ClubIdentityLogoUT club={{ ...team, user_id: team.id }} userId={team.id} className="ut-match__logo" />; }
function eventDescription(event, match) {
  if (!event) return 'Los equipos están listos.';
  if (event.type === 'halftime') return 'Una pausa para pensar la siguiente jugada.';
  if (event.type === 'fulltime') return 'Terminó el encuentro.';
  if (event.type === 'tactics') return `${event.pattern || 'Cambios confirmados'}.`;
  const team = (event.side === 'home' ? match.home : match.away)?.nombre || 'El equipo';
  if (event.type === 'goal') return `${event.player || team} marca para ${team}.`;
  if (event.type === 'save') return `${event.player || 'El arquero'} se queda con el remate.`;
  if (event.type === 'post') return `${event.player || team} estrella la pelota en el palo.`;
  if (event.type === 'shot') return `${event.player || team} prueba al arco.`;
  return event.pattern || `${team} busca un espacio.`;
}

export default function MatchSimulationUT({ match, online = false, serverOffset = 0, serverStatus = 'playing', viewerId, connectionError = '', onVolver, onReplay, onCoachOnline }) {
  const reduced = useReducedMotion();
  const [localMatch, setLocalMatch] = useState(match);
  const [clock, setClock] = useState(() => clockAt(match, serverOffset));
  const [showCoach, setShowCoach] = useState(false);
  const [leavePrompt, setLeavePrompt] = useState(false);
  const localRef = useRef(match);
  const sourceRef = useRef(match);
  const focusBack = useRef(null);
  const source = online ? match : localMatch;
  const duration = matchActiveDurationSeconds(source);
  useEffect(() => { sourceRef.current = match; }, [match]);
  useEffect(() => {
    let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      const current = online ? sourceRef.current : localRef.current;
      const nextClock = clockAt(current, serverOffset);
      if (!online) {
        const next = advanceOfflineMatch(current, nextClock.elapsed);
        if (next !== current) { localRef.current = next; setLocalMatch(next); }
      }
      setClock(nextClock);
    };
    const resync = () => { if (!document.hidden) tick(); };
    tick(); const timer = setInterval(tick, 200);
    document.addEventListener('visibilitychange', resync);
    return () => { cancelled = true; clearInterval(timer); document.removeEventListener('visibilitychange', resync); };
  }, [online, serverOffset]);
  const view = useMemo(() => matchVisibleState(source, clock.elapsed), [source, clock.elapsed]);
  const finished = online ? serverStatus === 'finished' : clock.phase === 'finished';
  const confirming = online && clock.phase === 'finished' && !finished;
  const coachVisible = showCoach && !finished && (!online || source.simulation_version >= 2);
  const homeScore = online ? Number(source.home_goals) || 0 : view.stats.home.goals;
  const awayScore = online ? Number(source.away_goals) || 0 : view.stats.away.goals;
  const current = [...view.events].reverse().find(event => ['goal','save','post','shot'].includes(event.type) && clock.elapsed - event.second < 2.6) || view.latest;
  const flash = current?.type === 'goal' && clock.elapsed - current.second < 2.6;
  const isAway = online && viewerId === source.away.id;
  const ownTeam = isAway ? source.away : source.home;
  const ownScore = isAway ? awayScore : homeScore;
  const rivalScore = isAway ? homeScore : awayScore;
  const result = ownScore > rivalScore ? 'VICTORIA.' : ownScore < rivalScore ? 'A SEGUIR.' : 'IGUALES.';
  const goals = view.events.filter(event => event.type === 'goal');
  const closeCoach = useCallback(() => { setShowCoach(false); focusBack.current?.focus(); }, []);
  const applyCoaching = async command => {
    if (online) { if (!onCoachOnline) throw new Error('No se pudo conectar con la dirección del equipo.'); await onCoachOnline(command); }
    else { const next = applyOfflineCoaching(localRef.current, command, clock.elapsed); localRef.current = next; setLocalMatch(next); }
  };
  const leave = () => { if (online && !finished) setLeavePrompt(true); else onVolver(); };
  const phaseLabel = finished ? 'FINAL' : confirming ? 'CONFIRMANDO' : clock.phase === 'pre' ? 'POR COMENZAR' : clock.phase === 'halftime' ? 'DESCANSO' : view.addedTime ? 'TIEMPO AÑADIDO' : clock.phase === 'second' ? '2.º TIEMPO' : '1.er TIEMPO';
  return <section className={`ut-match ${view.addedTime && !finished ? 'ut-match--added' : ''}`} role="dialog" aria-modal="true" aria-label={online ? 'Partido online Ultimate Team' : 'Partido de práctica Ultimate Team'} onKeyDown={event => { if (event.key === 'Escape' && !coachVisible) leave(); }}>
    <header className="ut-match__header" inert={coachVisible || leavePrompt}><button autoFocus type="button" onClick={leave} aria-label="Regresar"><ArrowLeft size={18} /><span>Regresar</span></button><span><i /> {online ? 'ONLINE' : 'PRÁCTICA'}<em>THC ULTIMATE TEAM</em></span><button ref={focusBack} type="button" className="ut-match__coach-button" disabled={finished || confirming || clock.phase === 'pre' || (online && !(source.simulation_version >= 2))} onClick={() => setShowCoach(true)}><SlidersHorizontal size={17} />Dirigir equipo</button></header>
    <main className="ut-match__broadcast" inert={coachVisible || leavePrompt}>
      <div className="ut-match__scoreboard"><div className="ut-match__team"><TeamMark team={source.home} /><div><strong>{source.home.nombre}</strong><small>{source.home.formacion || '4-3-3'} · GRL {source.home.grl}</small></div></div><div className="ut-match__score"><strong>{homeScore}<span>—</span>{awayScore}</strong><span>{phaseLabel}<b>{view.minuteLabel}′</b></span></div><div className="ut-match__team ut-match__team--away"><TeamMark team={source.away} /><div><strong>{source.away.nombre}</strong><small>GRL {source.away.grl} · {source.away.formacion || '4-3-3'}</small></div></div></div>
      {connectionError && <p className="ut-match__connection" role="status">Reconectando. El partido continúa y recuperará el marcador del servidor.</p>}
      {!finished ? <div className="ut-match__stadium"><MatchPitchUT match={source} now={clock} reduced={reduced} /><div className="ut-match__pitch-edge"><span>VISTA TÁCTICA · CÁMARA RÁPIDA</span><span>{clock.phase === 'halftime' ? `${Math.ceil(clock.halftimeRemaining)} s para volver` : view.addedTime ? 'Continúa la jugada' : `${displayTime(Math.max(0, duration - clock.elapsed))} de juego`}</span></div><AnimatePresence>{flash && <motion.div key={`${current.second}-${current.side}`} className="ut-match__goal-banner" initial={{ opacity: 0, x: reduced ? 0 : -50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: reduced ? 0 : 40 }}><b>GOL.</b><span>{current.player}<small>{current.side === 'home' ? source.home.nombre : source.away.nombre}</small></span><strong>{current.minuteLabel ?? current.minute}′</strong></motion.div>}{clock.phase === 'halftime' && <motion.div className="ut-match__halftime" initial={{ opacity: 0, scale: reduced ? 1 : .94 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}><span>45′ · ENTRETIEMPO</span><h2>El próximo <em>movimiento.</em></h2><p>{homeScore} — {awayScore}</p><button type="button" onClick={() => setShowCoach(true)}>Dirigir equipo <ArrowRight size={17} /></button><small>Segundo tiempo en {Math.ceil(clock.halftimeRemaining)} s</small></motion.div>}{clock.phase === 'pre' && <motion.div className="ut-match__halftime" initial={{ opacity: 0 }} animate={{ opacity: 1 }}><span>THC ULTIMATE TEAM</span><h2>Todo <em>listo.</em></h2><p>{source.home.abreviatura || 'LOCAL'} <b>VS</b> {source.away.abreviatura || 'VISITA'}</p></motion.div>}</AnimatePresence><div className="ut-match__progress"><i style={{ width: `${clock.elapsed / duration * 100}%` }} /></div></div> : <motion.section className="ut-match__result" initial={{ opacity: 0, y: reduced ? 0 : 15 }} animate={{ opacity: 1, y: 0 }}><p>{view.minuteLabel}′ · {online ? 'Resultado confirmado' : 'Práctica completada'}</p><h1>{result}</h1><div className="ut-match__result-score"><TeamMark team={source.home}/><strong>{homeScore}<span>—</span>{awayScore}</strong><TeamMark team={source.away}/></div><div className="ut-match__result-teams"><span>{source.home.nombre}</span><span>{source.away.nombre}</span></div><div className="ut-match__result-stats"><span><b>{view.stats.home.shots}</b>Remates<b>{view.stats.away.shots}</b></span><span><b>{view.stats.home.saves}</b>Atajadas<b>{view.stats.away.saves}</b></span><span><b>{view.stats.home.posts}</b>Palos<b>{view.stats.away.posts}</b></span></div><div className="ut-match__result-actions">{!online && onReplay && <button type="button" onClick={onReplay}><RotateCcw size={17} /> Otra práctica</button>}<button type="button" onClick={onVolver}>Regresar <ArrowRight size={17} /></button></div></motion.section>}
      <div className="ut-match__matchline"><div className="ut-match__event-current" aria-live="polite"><span>{confirming ? 'EN ESPERA' : EVENT_LABELS[current?.type] || 'EN JUEGO'}<b>{current?.minuteLabel ?? current?.minute ?? 0}′</b></span><p>{confirming ? 'Esperando la confirmación del resultado.' : eventDescription(current, source)}</p></div><div className="ut-match__team-status"><span>{ownTeam.formacion || '4-3-3'}<b>{ownTeam.mentalidad || 'neutral'}</b></span><span>{Math.round(ownTeam.stamina ?? 100)}%<b>Energía</b></span><span>{ownTeam.substitutions || 0}/5<b>Cambios</b></span></div></div>
      <MatchCheerUT team={ownTeam} disabled={finished || confirming || clock.phase==='pre'} reduced={reduced}/>
      {goals.length > 0 && <div className="ut-match__goals" aria-label="Goles del partido">{goals.map(event => <span key={`${event.second}-${event.side}`}><b>{event.minuteLabel ?? event.minute}′</b>{event.player || (event.side === 'home' ? source.home.nombre : source.away.nombre)}<small>{event.side === 'home' ? source.home.abreviatura || 'LOCAL' : source.away.abreviatura || 'VISITA'}</small></span>)}</div>}
    </main>
    <AnimatePresence>{coachVisible && <MatchCoachUT key={ownTeam.revision || 0} team={ownTeam} minute={view.minute} halftimeRemaining={clock.halftimeRemaining || 0} onApply={applyCoaching} onClose={closeCoach} reduced={reduced} />}{leavePrompt && <div className="ut-coach-backdrop"><section className="ut-match__leave" role="dialog" aria-modal="true" aria-label="Salir del partido" onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); setLeavePrompt(false); } }}><span>PARTIDO ONLINE</span><h2>¿Volver al menú?</h2><p>El partido seguirá hasta el final. Puedes regresar para ver el resultado.</p><div><button autoFocus type="button" onClick={() => setLeavePrompt(false)}>Seguir viendo</button><button type="button" onClick={onVolver}>Regresar <ArrowRight size={16}/></button></div></section></div>}</AnimatePresence>
  </section>;
}
