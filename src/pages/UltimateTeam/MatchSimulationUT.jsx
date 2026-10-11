import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, ArrowRight, RotateCcw } from 'lucide-react';
import ClubIdentityLogoUT from './ClubIdentityLogoUT';
import { matchElapsedSeconds, matchVisibleState, observeMatchClock, simulationPlayerMarkers } from './simulationUT';
import './MatchSimulationUT.css';

const EVENT_LABELS = { goal: 'GOL', save: 'ATAJADA', post: 'AL PALO', shot: 'REMATE', pass: 'EN JUEGO', kickoff: 'SAQUE', halftime: 'ENTRETIEMPO', fulltime: 'FINAL' };
const playerName = player => player.nombre || player.name;
const displayTime = elapsed => `${String(Math.floor(elapsed / 60)).padStart(1, '0')}:${String(Math.floor(elapsed % 60)).padStart(2, '0')}`;

function TeamMark({ team }) {
  return <ClubIdentityLogoUT club={{ ...team, user_id: team.id }} userId={team.id} className="ut-match__logo" />;
}

function eventDescription(event, match) {
  if (!event) return 'La pelota empieza a rodar.';
  if (event.type === 'halftime') return 'Los equipos vuelven al campo en unos segundos.';
  if (event.type === 'fulltime') return 'Terminó el encuentro.';
  const name = (event.side === 'home' ? match.home : match.away)?.nombre || 'El equipo';
  if (event.type === 'goal') return `${event.player || name} define la jugada.`;
  if (event.type === 'save') return `${event.player || 'El arquero'} responde bajo los tres palos.`;
  if (event.type === 'post') return `${event.player || name} hace temblar el arco.`;
  if (event.type === 'shot') return `${event.player || name} prueba al arco.`;
  if (event.type === 'kickoff') return event.pattern || `${name} pone la pelota en juego.`;
  return `${event.player || name}${event.pattern ? ` · ${event.pattern.toLowerCase()}` : ' busca un espacio para el pase.'}`;
}

export default function MatchSimulationUT({ match, online = false, serverOffset = 0, serverStatus = 'playing', viewerId, connectionError = '', onVolver, onReplay }) {
  const reduced = useReducedMotion();
  const [elapsed, setElapsed] = useState(() => matchElapsedSeconds(match, Date.now() + serverOffset));
  useEffect(() => observeMatchClock(match, setElapsed, { now: () => Date.now() + serverOffset }), [match, serverOffset]);
  const view = useMemo(() => matchVisibleState(match, elapsed), [match, elapsed]);
  const finished = online ? serverStatus === 'finished' : elapsed >= 180;
  const confirming = online && elapsed >= 180 && !finished;
  const homeScore = online ? Number(match.home_goals) || 0 : view.stats.home.goals;
  const awayScore = online ? Number(match.away_goals) || 0 : view.stats.away.goals;
  const current = view.latest;
  const markers = useMemo(() => [...simulationPlayerMarkers(match.home, 'home', current).map(marker => ({ ...marker, side: 'home' })), ...simulationPlayerMarkers(match.away, 'away', current).map(marker => ({ ...marker, side: 'away' }))], [match.home, match.away, current]);
  const flash = current && ['goal', 'halftime'].includes(current.type) && elapsed - current.second < 3;
  const scene = current?.side === 'away' ? 'away' : 'home';
  const onGoalLine = ['goal', 'post', 'shot', 'save'].includes(current?.type);
  const ball = current?.type === 'kickoff' || current?.type === 'halftime' ? [50, 50] : [onGoalLine ? 43 + ((current?.second || 0) % 14) : 18 + ((current?.second || 0) * 17 % 65), onGoalLine ? scene === 'home' ? 7 : 93 : scene === 'home' ? 30 : 70];
  const isAway = online && viewerId === match.away.id;
  const ownScore = isAway ? awayScore : homeScore;
  const rivalScore = isAway ? homeScore : awayScore;
  const result = ownScore > rivalScore ? 'VICTORIA.' : ownScore < rivalScore ? 'A SEGUIR.' : 'IGUALES.';
  const goals = view.events.filter(event => event.type === 'goal');
  return <section className="ut-match" role="dialog" aria-modal="true" aria-label={online ? 'Partido online Ultimate Team' : 'Partido de práctica Ultimate Team'} onKeyDown={event => { if (event.key === 'Escape') onVolver(); }}>
    <header className="ut-match__header"><button autoFocus type="button" onClick={onVolver} aria-label="Regresar"><ArrowLeft size={18} /></button><span>{online ? 'ONLINE' : 'PRÁCTICA'} <i /> SIMULACIÓN</span><span>{confirming ? 'Confirmando resultado…' : finished ? 'Final' : displayTime(Math.max(0, 180 - elapsed))}</span></header>
    <div className="ut-match__scoreboard"><div className="ut-match__team"><TeamMark team={match.home} /><div><span>{online ? 'LOCAL' : 'TU CLUB'}</span><strong>{match.home.nombre}</strong><small>GRL {match.home.grl}</small></div></div><div className="ut-match__score"><strong>{homeScore}<span>:</span>{awayScore}</strong><span>{finished ? 'FINAL' : confirming ? '90′' : `${view.minute}′`} {!finished && !confirming && <i />}</span></div><div className="ut-match__team ut-match__team--away"><TeamMark team={match.away} /><div><span>VISITANTE</span><strong>{match.away.nombre}</strong><small>GRL {match.away.grl}</small></div></div></div>
    {connectionError && <p className="ut-match__connection" role="status">Reconectando con el partido. El marcador se actualizará cuando vuelva la conexión.</p>}
    <div className="ut-match__content">
      {!finished && <div className="ut-match__stadium"><div className="ut-match__pitch"><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><rect x="6" y="5" width="88" height="90" /><path d="M6 50h88M29 5v17h42V5M38 5v8h24V5M29 95V78h42v17M38 95v-8h24v8" /><ellipse cx="50" cy="50" rx="13" ry="11" /><circle cx="50" cy="50" r=".7" /><path d="M44 5V2h12v3M44 95v3h12v-3" /></svg><span className="ut-match__pitch-mark" aria-hidden="true">THC</span>{markers.map(marker => <motion.span key={`${marker.side}-${marker.player.id || marker.index}`} title={playerName(marker.player)} className={`ut-match__player ut-match__player--${marker.side}`} initial={false} animate={{ x: marker.x, y: marker.y }} transition={{ duration: reduced ? 0 : 1.4, ease: 'easeInOut' }} style={{ left: `${marker.left}%`, top: `${marker.top}%` }}>{marker.index + 1}</motion.span>)}<motion.span className="ut-match__ball" animate={{ left: `${ball[0]}%`, top: `${ball[1]}%` }} transition={{ duration: reduced ? 0 : current?.type === 'shot' || current?.type === 'goal' ? .4 : 1.6 }} /><AnimatePresence>{flash && <motion.div key={`${current.second}-${current.type}`} className={`ut-match__flash ut-match__flash--${current.type}`} initial={{ opacity: 0, y: reduced ? 0 : 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}><span>{current.type === 'goal' ? (current.side === 'home' ? match.home.nombre : match.away.nombre) : '45′'}</span><strong>{current.type === 'goal' ? 'GOOOL.' : 'EL DESCANSO.'}</strong><span>{current.type === 'goal' ? current.player || '' : `${homeScore} — ${awayScore}`}</span></motion.div>}</AnimatePresence></div><div className="ut-match__progress"><i style={{ width: `${elapsed / 180 * 100}%` }} /></div></div>}
      {finished && <motion.div className="ut-match__result" initial={{ opacity: 0, y: reduced ? 0 : 15 }} animate={{ opacity: 1, y: 0 }}><p>90′ · {online ? 'Resultado confirmado' : 'Práctica completada'}</p><h1>{result}</h1><strong>{homeScore}<span>—</span>{awayScore}</strong><div className="ut-match__result-teams"><span>{match.home.nombre}</span><span>{match.away.nombre}</span></div><div className="ut-match__result-stats"><span><b>{view.stats.home.shots}</b>Remates<b>{view.stats.away.shots}</b></span><span><b>{view.stats.home.saves}</b>Atajadas<b>{view.stats.away.saves}</b></span><span><b>{view.stats.home.posts}</b>Palos<b>{view.stats.away.posts}</b></span></div><div className="ut-match__result-actions">{!online && onReplay && <button type="button" onClick={onReplay}><RotateCcw size={17} /> Otra práctica</button>}<button type="button" onClick={onVolver}>Regresar <ArrowRight size={17} /></button></div></motion.div>}
      <aside className="ut-match__events"><div className="ut-match__event-current" aria-live="polite"><span>{confirming ? 'EN ESPERA' : EVENT_LABELS[current?.type] || 'EN JUEGO'} <b>{`${current?.minute || 0}′`}</b></span><h2>{confirming ? 'Esperando la confirmación del partido.' : eventDescription(current, match)}</h2></div><div className="ut-match__goals"><h3>Goles del encuentro</h3>{goals.length ? goals.map(event => <div key={`${event.second}-${event.side}`}><b>{event.minute}′</b><span>{event.player || (event.side === 'home' ? match.home.nombre : match.away.nombre)}<small>{event.side === 'home' ? match.home.nombre : match.away.nombre}</small></span></div>) : <p>El marcador sigue abierto.</p>}</div><div className="ut-match__energy"><span>Energía inicial</span><span>{match.home.nombre}<b>{Math.round(match.home.stamina ?? 100)}%</b></span><i><span style={{ width: `${match.home.stamina ?? 100}%` }} /></i><span>{match.away.nombre}<b>{Math.round(match.away.stamina ?? 100)}%</b></span><i><span style={{ width: `${match.away.stamina ?? 100}%` }} /></i></div>{!online && <p className="ut-match__practice-note">La práctica no modifica tu club.</p>}</aside>
    </div>
  </section>;
}
