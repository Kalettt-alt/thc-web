import { useRef, useState, useEffect } from 'react';
import { ArrowRight, Crosshair, Flag, Maximize2, Pause, Play, Settings2, Shield, Target, Users, Zap } from 'lucide-react';
import { useMatchEngine } from './MotorLogica.js';
import { PITCH_W, PITCH_H, TURN_DURATION_MS } from './ConstantesJuego.js';
import { getMatchCamera, getMatchViewport, screenToPitch } from './matchGeometry.js';
import { buttonShotTarget } from './matchDecisions.js';
import CanchaDF from './CanchaDF.jsx';
import JugadorDF from './JugadorDF.jsx';
import MatchCoachPanel from './MatchCoachPanel.jsx';
import MatchMinimap from './MatchMinimap.jsx';
import MatchResultCard from './MatchResultCard.jsx';
import { readMatchDisplay, saveMatchDisplay } from './matchPreferences.js';
import './PartidoDF.css';

function ClubBadge({ club, getImg, className = '' }) {
  const [failed, setFailed] = useState(false);
  const source = club.img || `/Imag/${club.name}.png`;
  return <span className={`df-club-badge ${className}`}>{failed ? <b aria-hidden="true">{club.name.slice(0, 1)}</b> : <img src={getImg ? getImg(source) : source} alt="" onError={() => setFailed(true)} />}</span>;
}

export function GoalCelebration({ event, score, clock, miClub, rival, getImg }) {
  const goalUser = event?.scoringTeam === 'USER';
  const scoringClub = goalUser ? miClub : rival;
  return <div className={`df-goal ${goalUser ? '' : 'df-goal--rival'}`} aria-live="polite"><div className="df-goal__slash" /><div className="df-goal__content"><span className="df-eyebrow">{clock}′ · {goalUser ? 'LA TRIBUNA EXPLOTA' : 'RESPONDE EN LA CANCHA'}</span><h2>{goalUser ? '¡GOOOL!' : 'GOL RIVAL'}</h2><div className="df-goal__scorer"><ClubBadge club={scoringClub} getImg={getImg} /><span><b>{event?.playerName || scoringClub.name}</b><small>{event?.ownGoal ? 'En propia puerta' : scoringClub.name}</small></span><strong>{score[0]}<i>:</i>{score[1]}</strong></div></div></div>;
}

function EventIcon({ phase, event }) {
  if (phase === 'GOAL') return <Flag size={21} />;
  if (event?.type === 'SAVE' || event?.type === 'RECOVERY' || event?.type === 'BLOCK') return <Shield size={21} />;
  if (phase === 'WAITING_USER_INPUT') return <Target size={21} />;
  if (phase === 'USER_DRIVING') return <Zap size={21} />;
  return <ArrowRight size={21} />;
}

export default function JugarDF({ miClub, rival, esLocal, titularesMap, reservas = [], tactica, apodo, getImg, onTerminar, displayPreferences, onDisplayChange, bebidaCount = 0, bebidaBusy = false, bebidaPending = false, bebidaError = '', onUseBebida }) {
  const pitch = useRef(null);
  const field = useRef(null);
  const pointer = useRef(null);
  const startButton = useRef(null);
  const [screen, setScreen] = useState({ width: 360, height: 500 });
  const [showPanel, setShowPanel] = useState(false);
  const [coachTab, setCoachTab] = useState('ALINEACION');
  const [localDisplay, setLocalDisplay] = useState(readMatchDisplay);
  const display = displayPreferences || localDisplay;
  const [dragLine, setDragLine] = useState(null);
  const [localTactica, setLocalTactica] = useState(tactica);
  const [cameraMode, setCameraMode] = useState('FOLLOW');
  const [keyboardTarget, setKeyboardTarget] = useState(null);
  const [keyboardFocus, setKeyboardFocus] = useState(false);
  const drinkRequest = useRef(false);
  const [localDrinkBusy, setLocalDrinkBusy] = useState(false);
  const [localDrinkError, setLocalDrinkError] = useState('');
  const { gameState, handleInput, setPaused, setAiming, beginMatch, resumeMatch, stopDriving, setMentality, substitutePlayer, swapPositions, applyTeamTalk, captureMatchSummary, syncMatchEnergy } = useMatchEngine(titularesMap, rival, esLocal, miClub, localTactica, onTerminar, reservas);
  const viewport = getMatchViewport(screen.width, screen.height, cameraMode);
  const camera = getMatchCamera(gameState.camera, viewport, cameraMode);
  const isThinking = gameState.phase === 'WAITING_USER_INPUT' && !gameState.isPaused;
  const owner = gameState.players.find(player => player.id === gameState.ball.owner);
  const support = isThinking ? gameState.players.filter(player => player.isUser && player.id !== owner?.id && !player.isGK && Math.hypot(player.x - gameState.ball.x, player.y - gameState.ball.y) < 2700).sort((a, b) => a.x - b.x) : [];
  const halftime = gameState.phase === 'HALFTIME';
  const ready = gameState.phase === 'READY';
  const recoveryBlocked = bebidaBusy || bebidaPending || localDrinkBusy;
  const ended = gameState.phase === 'FINISHED';
  const airHeight = Math.max(0, Number(gameState.ball.height) || 0);
  const shots = Object.values(gameState.playerStats || {}).filter(player => player.isUser).reduce((sum, player) => sum + player.shots, 0);
  const goalEvent = gameState.goalEvent || gameState.lastEvent;
  const phaseLabel = ready ? 'Todo listo para el saque inicial' : gameState.phase === 'KICKOFF_SETUP' ? 'Los equipos vuelven a sus posiciones' : gameState.phase === 'GOAL_KICK' ? 'El arquero prepara el saque de meta' : gameState.phase === 'OUT' ? gameState.lastEvent?.type === 'CORNER' ? 'Se acomodan para la esquina' : 'El equipo prepara la salida desde la banda' : gameState.phase === 'TURNOVER_PRESS' ? 'Llegó la presión: perdiste el tiempo para decidir' : gameState.phase === 'USER_DRIVING' ? 'Tú marcas el camino' : gameState.phase === 'BALL_FLIGHT' ? gameState.ball.airborne ? 'Balón largo por el aire' : 'Balón en movimiento' : halftime ? 'Tiempo de vestuario' : ended ? 'Pitazo final' : isThinking ? 'La decisión es tuya' : owner?.isUser ? 'Construyendo el ataque' : 'El rival tiene el balón';

  useEffect(() => { if (ready && !showPanel && gameState.players.length) startButton.current?.focus(); }, [ready, showPanel, gameState.players.length]);

  useEffect(() => {
    const surface = field.current;
    if (!surface) return;
    const update = () => {
      const rect = surface.getBoundingClientRect();
      pointer.current = null;
      setDragLine(null);
      setAiming(false);
      setScreen({ width: rect.width, height: rect.height });
    };
    const resize = new ResizeObserver(update);
    resize.observe(surface);
    window.addEventListener('resize', update);
    return () => { resize.disconnect(); window.removeEventListener('resize', update); };
  }, [setAiming]);

  const cancelPointer = event => {
    if (!pointer.current || (event && event.pointerId !== pointer.current.id)) return;
    pointer.current = null;
    setDragLine(null);
    setAiming(false);
  };
  const startPointer = event => {
    if (!isThinking || !owner || pointer.current || (event.pointerType === 'mouse' && event.button !== 0)) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    pointer.current = { id: event.pointerId, x: event.clientX, y: event.clientY, zoom: viewport.zoom, ownerId: owner.id, turnId: gameState.turnId };
    setAiming(true);
  };
  const movePointer = event => {
    const gesture = pointer.current;
    if (!gesture || gesture.id !== event.pointerId || !isThinking || !owner) return;
    const dx = (event.clientX - gesture.x) / gesture.zoom;
    const dy = (event.clientY - gesture.y) / gesture.zoom;
    if (Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) < 14) { setDragLine(null); return; }
    const length = Math.hypot(dx, dy);
    const reach = Math.min(2400, 700 + length * 1.5);
    setDragLine({ x1: owner.x, y1: owner.y, x2: owner.x + dx / length * reach, y2: owner.y + dy / length * reach });
  };
  const endPointer = event => {
    const gesture = pointer.current;
    if (!gesture || gesture.id !== event.pointerId || !pitch.current) return;
    const point = screenToPitch(event.clientX, event.clientY, pitch.current.getBoundingClientRect(), viewport.zoom);
    const dx = (event.clientX - gesture.x) / gesture.zoom;
    const dy = (event.clientY - gesture.y) / gesture.zoom;
    const isDrag = Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) >= 14;
    cancelPointer(event);
    handleInput(point.x, point.y, dx, dy, { isDrag, pickRadius: 23 / viewport.zoom, expectedTurnId: gesture.turnId, expectedOwnerId: gesture.ownerId });
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const openCoach = (tab = 'ALINEACION') => { if (ended) return; cancelPointer(); setCoachTab(tab); setPaused(true); setShowPanel(true); };
  const changeDisplay = value => {
    if (onDisplayChange) return onDisplayChange(value);
    setLocalDisplay(value);
    return { ok: true, persisted: saveMatchDisplay(value) };
  };
  const closeCoach = () => { if (recoveryBlocked || drinkRequest.current) return; setShowPanel(false); setPaused(false); if (halftime) resumeMatch(); };
  const useBebida = async () => {
    if (drinkRequest.current || bebidaBusy || (!bebidaPending && (bebidaCount === null || bebidaCount < 1)) || !onUseBebida || (!ready && !halftime)) return { ok: false, error: 'No se puede usar la bebida en este momento.' };
    drinkRequest.current = true;
    setLocalDrinkBusy(true);
    setLocalDrinkError('');
    try {
      const receipt = await onUseBebida(captureMatchSummary());
      if (!receipt?.ok) return receipt || { ok: false, error: 'No se pudo confirmar el uso de la bebida.' };
      const applied = syncMatchEnergy(receipt);
      if (!applied?.ok) { setLocalDrinkError(applied?.error || 'La energía aún no pudo sincronizarse.'); return applied; }
      return receipt;
    } catch {
      const error = 'No se pudo confirmar la bebida. Reintenta el uso antes de continuar.';
      setLocalDrinkError(error);
      return { ok: false, error };
    } finally { drinkRequest.current = false; setLocalDrinkBusy(false); }
  };
  const switchCamera = () => { cancelPointer(); setCameraMode(value => value === 'FOLLOW' ? 'STADIUM' : 'FOLLOW'); };
  const shoot = () => {
    if (!isThinking || !owner) return;
    cancelPointer();
    const target = buttonShotTarget(gameState.players, owner);
    handleInput(target.x, target.y, target.x - owner.x, target.y - owner.y, { shot: true, isDrag: true, expectedTurnId: gameState.turnId, expectedOwnerId: owner.id });
  };
  const handleKey = event => {
    if (event.key.toLowerCase() === 'p') { event.preventDefault(); openCoach(); return; }
    if (event.key === ' ' && gameState.phase === 'USER_DRIVING') { event.preventDefault(); stopDriving(); return; }
    if (!isThinking || !owner) return;
    if (['ArrowLeft', 'ArrowRight'].includes(event.key)) {
      event.preventDefault();
      if (!support.length) return;
      const index = support.findIndex(player => player.id === keyboardTarget);
      const next = index < 0 ? event.key === 'ArrowRight' ? 0 : support.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + support.length) % support.length;
      setKeyboardTarget(support[next].id);
      return;
    }
    const options = { expectedTurnId: gameState.turnId, expectedOwnerId: owner.id, pickRadius: 23 / viewport.zoom };
    if (event.key === 'Enter' || event.key === ' ') {
      const recipient = support.find(player => player.id === keyboardTarget) || support[0];
      if (recipient) { event.preventDefault(); cancelPointer(); handleInput(recipient.x, recipient.y, 0, 0, options); setKeyboardTarget(null); }
    } else if (event.key === 'ArrowUp') {
      event.preventDefault(); shoot();
    } else if (event.key === 'ArrowDown') {
      event.preventDefault(); cancelPointer();
      handleInput(owner.x, owner.y - 650, 0, 0, { ...options, pickRadius: 0 });
    }
  };

  return <div className={`df-match ${display.detailedPitch ? '' : 'df-match--basic'}`}>
    <header className="df-scoreboard df-scoreboard--compact">
      <div className="df-scoreboard__teams">
        <div className="df-scoreboard__club"><ClubBadge club={miClub} getImg={getImg} /><div><b>{miClub.name}</b></div></div>
        <div className="df-scoreboard__center"><div className="df-scoreboard__numbers" aria-label={`${miClub.name} ${gameState.score[0]}, ${rival.name} ${gameState.score[1]}`}><b>{gameState.score[0]}</b><span>–</span><b>{gameState.score[1]}</b><em><small>{ready ? 'PREVIA' : halftime ? 'DESC.' : ended ? 'FINAL' : gameState.clock < 45 ? '1T' : '2T'}</small>{gameState.clock}′</em></div></div>
        <div className="df-scoreboard__club df-scoreboard__club--rival"><div><b>{rival.name}</b></div><ClubBadge club={rival} getImg={getImg} /></div>
      </div>
      <div className="df-match-controls"><span className="df-scoreboard__system" title={`${localTactica} · ${gameState.mentality.toLowerCase()}`}><b>{localTactica.split(' ')[0]}</b><span>{gameState.mentality === 'OFENSIVA' ? 'Ofensiva' : gameState.mentality === 'DEFENSIVA' ? 'Defensiva' : 'Equilibrada'}</span></span><div><button type="button" className="df-toolbar-button" onClick={() => openCoach('CANCHA')} disabled={ended} aria-label="Configurar cancha" title="Configurar cancha"><Settings2 size={16} /></button><button type="button" className="df-toolbar-button" onClick={switchCamera} aria-label={cameraMode === 'FOLLOW' ? 'Ver estadio completo' : 'Seguir el balón'} title={cameraMode === 'FOLLOW' ? 'Ver estadio completo' : 'Seguir el balón'} aria-pressed={cameraMode === 'STADIUM'}>{cameraMode === 'FOLLOW' ? <Maximize2 size={16} /> : <Crosshair size={16} />}</button><button type="button" onClick={() => openCoach()} disabled={ended} className="df-toolbar-button df-toolbar-button--orange" aria-label="Pausar y abrir alineación"><Users size={16} /><span>Alineación</span><Pause size={12} /></button></div></div>
    </header>
    <div ref={field} className="df-match-field" style={{ touchAction: ready ? 'pan-y' : 'none' }} tabIndex={0} role="application" aria-label="Cancha DT Fantasy. Flechas izquierda y derecha eligen compañero, Enter pasa, arriba dispara, abajo conduce y P abre la alineación." onFocus={() => setKeyboardFocus(true)} onBlur={() => setKeyboardFocus(false)} onKeyDown={handleKey} onPointerDown={startPointer} onPointerMove={movePointer} onPointerUp={endPointer} onPointerCancel={cancelPointer} onLostPointerCapture={cancelPointer}>
      <div ref={pitch} className="df-match-pitch" style={{ width: PITCH_W, height: PITCH_H, transform: `translate(${-camera.x * viewport.zoom}px, ${-camera.y * viewport.zoom}px) scale(${viewport.zoom})` }}>
        <CanchaDF detailed={display.detailedPitch} />
        {gameState.players.map(player => <JugadorDF key={player.id} p={player} isOwner={gameState.ball.owner === player.id} phase={gameState.phase} size={viewport.playerSize} />)}
        {support.map(player => <div key={`support_${player.id}`} className={`df-pass-target ${player.id === keyboardTarget ? 'df-pass-target--selected' : ''}`} style={{ left: player.x, top: player.y, width: viewport.playerSize * 1.7, height: viewport.playerSize * 1.7, borderWidth: 1.3 / viewport.zoom }} />)}
        {dragLine && isThinking && <svg className="df-aim-line"><line {...dragLine} stroke="#ffad64" strokeWidth={2.5 / viewport.zoom} strokeDasharray={`${10 / viewport.zoom},${6 / viewport.zoom}`} /><circle cx={dragLine.x2} cy={dragLine.y2} r={6 / viewport.zoom} fill="#f47a20" stroke="#fff" strokeWidth={1.5 / viewport.zoom} /></svg>}
        {gameState.ball.airborne && <div className="df-ball-shadow" style={{ top: gameState.ball.y, left: gameState.ball.x, width: viewport.ballSize, height: viewport.ballSize, opacity: Math.max(.2, .6 - airHeight / 1200), transform: `translate(-50%,-50%) scale(${1 + airHeight / 700})` }} />}
        <div className={`df-ball ${gameState.ball.airborne ? 'df-ball--airborne' : ''}`} style={{ top: gameState.ball.y - airHeight * .45, left: gameState.ball.x, width: viewport.ballSize, height: viewport.ballSize, '--ball-lift-scale': 1 + Math.min(.28, airHeight / 1500) }} />
      </div>
      <div className="df-field-direction"><ArrowRight size={11} />ATACAS HACIA ARRIBA</div>
      {cameraMode === 'FOLLOW' && display.showRadar && <div className="df-minimap-wrap"><span>RADAR</span><MatchMinimap players={gameState.players} ball={gameState.ball} camera={camera} viewport={viewport} /></div>}
      {isThinking && <div className="df-turn-label"><span className="df-live-dot" />{gameState.setPiece?.kind === 'CORNER' ? 'ESQUINA · TU DECISIÓN' : 'TU TURNO'}</div>}
      {keyboardFocus && isThinking && <span className="sr-only" role="status">{support.find(player => player.id === keyboardTarget)?.name ? `Pase seleccionado a ${support.find(player => player.id === keyboardTarget).name}. Pulsa Enter.` : 'Elige compañero con las flechas izquierda y derecha.'}</span>}
      {gameState.phase === 'GOAL' && <GoalCelebration key={goalEvent?.id || 'goal'} event={goalEvent} score={gameState.score} clock={gameState.clock} miClub={miClub} rival={rival} getImg={getImg} />}
      {ready && <div className="df-prematch"><section className="df-prematch__card" aria-labelledby="df-prematch-title"><span className="df-eyebrow">EL PARTIDO ESTÁ POR EMPEZAR</span><h2 id="df-prematch-title">TU EQUIPO.<br />TU DECISIÓN<span>.</span></h2><div className="df-prematch__clubs"><ClubBadge club={miClub} getImg={getImg} /><b>VS</b><ClubBadge club={rival} getImg={getImg} /></div><p>Dos tiempos de 1:30. Revisa tu once y juega cuando estés listo.</p><button type="button" className="df-button df-button--orange" ref={startButton} onClick={() => { if (!drinkRequest.current && !recoveryBlocked) beginMatch(); }} disabled={!gameState.players.length || recoveryBlocked}><Play size={18} />Comenzar partido<ArrowRight size={18} /></button><button type="button" className="df-button df-button--quiet" onClick={() => openCoach()}><Users size={16} />Revisar alineación{onUseBebida && bebidaCount !== null && <span className="df-prematch__drink"><Zap size={12} />{bebidaCount}</span>}</button>{bebidaPending && <p className="df-prematch__pending" role="status">Hay una bebida pendiente. Abre la alineación para confirmar el uso.</p>}</section></div>}
      {gameState.phase === 'KICKOFF_SETUP' && <div className="df-kickoff-label" role="status">SAQUE DE MEDIO · {goalEvent?.scoringTeam === 'USER' ? rival.name : miClub.name}</div>}
      {ended && <div className="df-fulltime df-fulltime--result"><MatchResultCard miClub={miClub} rival={rival} score={gameState.score} players={gameState.players} summary={{ opportunities: gameState.opportunities, playerStats: gameState.playerStats }} getImg={getImg} /></div>}
    </div>
    <footer className="df-match-footer"><div className="df-event-icon"><EventIcon phase={gameState.phase} event={gameState.lastEvent} /></div><div className="df-match-event"><small>{isThinking ? 'DECIDE LA JUGADA' : 'DESDE LA CANCHA'}</small><p role="status">{gameState.msg || phaseLabel}</p><span>{keyboardFocus ? '←/→ compañero · Enter pase · ↑ tiro · ↓ conducción · P alineación' : isThinking ? owner?.isGK ? 'Toca un compañero para sacar corto · desliza para lanzar largo.' : 'Toca para pasar o conducir · dispara cuando quieras. Si esperas, el rival te roba.' : phaseLabel}</span></div>{!ready && !ended && <div className="df-match-opportunities" title="Remates de tu equipo"><Target size={14} /><b>{shots}</b><small>Remates</small></div>}{isThinking && <button type="button" className="df-button df-button--orange df-drive-button df-shoot-button" onClick={shoot} aria-label="Disparar" title="Disparar desde esta posición. Tú decides el riesgo."><Crosshair size={16} /><span>Disparar</span></button>}{isThinking && <div className="df-turn-clock"><b>{Math.max(0, gameState.turnTimer / 1000).toFixed(1)}<small>s</small></b><span><i style={{ width: `${Math.max(0, 100 * gameState.turnTimer / TURN_DURATION_MS)}%` }} /></span></div>}{gameState.phase === 'USER_DRIVING' && <button type="button" className="df-button df-button--orange df-drive-button" onClick={stopDriving}>Decidir<Target size={16} /></button>}</footer>
    {(showPanel || halftime) && <MatchCoachPanel key={halftime ? 'halftime' : 'coach'} initialTab={coachTab} gameState={gameState} miClub={miClub} apodo={apodo} formation={localTactica} onFormation={setLocalTactica} onMentality={setMentality} onSubstitute={substitutePlayer} onSwap={swapPositions} onTalk={applyTeamTalk} onClose={closeCoach} display={display} onDisplay={changeDisplay} bebidaCount={bebidaCount} bebidaBusy={bebidaBusy || localDrinkBusy} bebidaPending={bebidaPending} bebidaError={bebidaError || localDrinkError} onUseBebida={onUseBebida ? useBebida : undefined} />}
  </div>;
}
