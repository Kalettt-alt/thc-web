import { useEffect, useRef, useState } from 'react';
import { Activity, ArrowDownUp, ArrowRight, BatteryMedium, Check, ChevronRight, Flame, LayoutGrid, MessageSquare, Settings2, Shield, Sparkles, Target, Users, X, Zap } from 'lucide-react';
import { FORMACIONES_XY } from './ConstantesJuego.js';
import { getTeamTalkOptions, MAX_TEAM_TALKS } from './teamTalks.js';
import MatchDisplayOptions from './MatchDisplayOptions.jsx';
import './MatchCoachPanel.css';

const positions = [{ id: 'GK', label: 'Porteros' }, { id: 'DEF', label: 'Defensas' }, { id: 'MID', label: 'Mediocampistas' }, { id: 'ATT', label: 'Delanteros' }];
const tones = { CONFIDENCE: 'Confianza', CALM: 'Calma', FOCUS: 'Concentración', INTENSITY: 'Intensidad' };
const mentalityOptions = [
  { id: 'DEFENSIVA', label: 'Defensiva', icon: Shield, desc: 'Protege los espacios y juega con una línea más retrasada.' },
  { id: 'NORMAL', label: 'Equilibrada', icon: LayoutGrid, desc: 'Mantén la estructura, con apoyos para atacar y defender.' },
  { id: 'OFENSIVA', label: 'Ofensiva', icon: Flame, desc: 'Adelanta las líneas y suma apoyos cerca del área rival.' }
];

function Energy({ value }) {
  const energy = Math.max(0, Math.min(100, Number(value) || 0));
  return <span className={`df-energy ${energy < 30 ? 'df-energy--low' : energy < 60 ? 'df-energy--medium' : ''}`}>
    <span className="df-energy__track"><span style={{ width: `${energy}%` }} /></span><b>{Math.round(energy)}%</b>
  </span>;
}

export default function MatchCoachPanel({ gameState, miClub, apodo, formation, onFormation, onMentality, onSubstitute, onSwap, onTalk, onClose, initialTab = 'ALINEACION', display, onDisplay, bebidaCount = 0, bebidaBusy = false, bebidaPending = false, bebidaError = '', onUseBebida }) {
  const halftime = gameState.phase === 'HALFTIME';
  const players = gameState.players.filter(player => player.isUser);
  const [tab, setTab] = useState(halftime ? 'CHARLA' : initialTab);
  const [selectedId, setSelectedId] = useState(() => players.find(player => !player.isGK)?.id);
  const [benchId, setBenchId] = useState('');
  const [swapping, setSwapping] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [targetType, setTargetType] = useState('TEAM');
  const [targetId, setTargetId] = useState('DEF');
  const [phrases, setPhrases] = useState(() => getTeamTalkOptions());
  const dialog = useRef(null);
  const benchRef = useRef(null);
  const draggedPlayer = useRef(null);
  const pitchButtons = useRef(new Map());
  const closeRef = useRef(onClose);
  const selected = players.find(player => player.id === selectedId) || players.find(player => !player.isGK) || players[0];
  const stats = selected?.stats || {};
  const bench = gameState.reservas || [];
  const fullyRecovered = players.length > 0 && players.every(player => Number(player.rawStamina) >= 99.5) && bench.every(player => Number(player.energia) >= 99.5);
  const talks = gameState.teamTalkCount || 0;
  const formationPositions = FORMACIONES_XY[formation] || FORMACIONES_XY['4-3-3 OFENSIVO'];
  const averageEnergy = players.length ? Math.round(players.reduce((sum, player) => sum + Math.max(0, Math.min(100, Number(player.rawStamina) || 0)), 0) / players.length) : 100;
  const opportunities = gameState.opportunities?.user;
  const recoveryBlocked = bebidaBusy || bebidaPending;

  useEffect(() => { closeRef.current = onClose; }, [onClose]);
  useEffect(() => {
    const previous = document.activeElement;
    const panel = dialog.current;
    panel?.focus();
    const handleKey = event => {
      if (event.key === 'Escape' && !halftime && !recoveryBlocked) { event.preventDefault(); closeRef.current(); }
      if (event.key !== 'Tab') return;
      const focusable = [...panel.querySelectorAll('button:not(:disabled),select:not(:disabled),[tabindex="0"]')].filter(node => node.getClientRects().length);
      if (!focusable.length) { event.preventDefault(); return; }
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && (document.activeElement === first || document.activeElement === panel)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === panel)) { event.preventDefault(); first.focus(); }
    };
    panel?.addEventListener('keydown', handleKey);
    return () => { panel?.removeEventListener('keydown', handleKey); if (previous?.isConnected) previous.focus(); };
  }, [halftime, recoveryBlocked]);

  const report = (result, success) => {
    setFeedback({ ok: !!result?.ok, text: result?.ok ? success : result?.error || 'No se pudo aplicar el cambio.' });
    return !!result?.ok;
  };
  const movePlayer = (sourceId, destination) => {
    if (recoveryBlocked) return;
    const source = players.find(player => player.id === sourceId);
    if (!source || source.id === destination.id) return;
    if (report(onSwap(source.slot, destination.slot), `${source.name} pasó a ${destination.slot.toUpperCase()} y ${destination.name} a ${source.slot.toUpperCase()}.`)) setSelectedId(source.id);
    setSwapping(false);
  };
  const pickPlayer = player => {
    if (recoveryBlocked) return;
    if (swapping && selected && player.slot !== selected.slot) movePlayer(selected.id, player);
    else { setSelectedId(player.id); setFeedback(null); }
  };
  const startDrag = (event, player) => {
    if (recoveryBlocked) { event.preventDefault(); return; }
    draggedPlayer.current = player.id;
    setSelectedId(player.id);
    setSwapping(true);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', player.slot);
  };
  const dropPlayer = (event, destination) => {
    if (!draggedPlayer.current) return;
    event.preventDefault();
    movePlayer(draggedPlayer.current, destination);
    draggedPlayer.current = null;
    setSwapping(false);
  };
  const positionKey = (event, player) => {
    if (event.key.toLowerCase() === 'm') {
      event.preventDefault();
      setSelectedId(player.id);
      setSwapping(value => !value);
      return;
    }
    const directions = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    const direction = directions[event.key];
    if (!direction) return;
    event.preventDefault();
    const current = formationPositions[player.slot] || { x: 50, y: 50 };
    const next = players.filter(candidate => candidate.id !== player.id).map(candidate => {
      const point = formationPositions[candidate.slot] || { x: 50, y: 50 };
      const dx = point.x - current.x;
      const dy = point.y - current.y;
      return { candidate, forward: dx * direction[0] + dy * direction[1], distance: Math.hypot(dx, dy), sideways: Math.abs(dx * direction[1] - dy * direction[0]) };
    }).filter(candidate => candidate.forward > 0).sort((a, b) => a.sideways * 1.5 + a.distance - (b.sideways * 1.5 + b.distance))[0];
    if (next) pitchButtons.current.get(next.candidate.id)?.focus();
  };
  const updateDisplay = value => {
    const result = onDisplay(value);
    report(result, result.persisted ? 'Preferencia guardada en este dispositivo.' : 'Configuración aplicada. Este navegador no permite guardar la preferencia.');
  };
  const substitute = () => {
    if (recoveryBlocked || !selected || !benchId) return;
    if (report(onSubstitute(selected.slot, benchId), 'Cambio realizado. El suplente ya está en la cancha.')) setBenchId('');
  };
  const sendTalk = phrase => {
    if (recoveryBlocked) return;
    if (report(onTalk({ phraseId: phrase.id, targetType, targetId: targetType === 'TEAM' ? undefined : targetId }), 'Mensaje enviado. La respuesta del jugador depende de su energía.')) setPhrases(getTeamTalkOptions());
  };
  const setScope = value => {
    setTargetType(value);
    setTargetId(value === 'PLAYER' ? String(players[0]?.sourceId || players[0]?.id || '') : 'DEF');
  };
  const useDrink = async () => {
    if (bebidaBusy || (!bebidaPending && (bebidaCount < 1 || fullyRecovered || !players.length)) || !onUseBebida) return;
    try { report(await onUseBebida(), 'Todo el plantel recuperó el 100% de energía.'); }
    catch { report({ ok: false, error: 'No se pudo usar la bebida. Inténtalo de nuevo.' }); }
  };

  return <div className="df-coach-backdrop df-coach-backdrop--thc">
    <section ref={dialog} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="df-coach-title" className="df-coach df-coach--thc">
      <header className="df-coach__header">
        <div><p className="df-eyebrow">{halftime ? '45′ · ENTRETIEMPO' : gameState.phase === 'READY' ? 'ANTES DEL SAQUE INICIAL' : `${gameState.clock}′ · PARTIDO EN PAUSA`}</p><h2 id="df-coach-title">{halftime ? 'EL DESCANSO' : 'TU PIZARRA'}<span>.</span></h2><p className="df-coach__subtitle">{miClub.name} <span>/</span> DT {apodo || 'THC'}</p></div>
        <div className="df-coach__header-right"><div className="df-coach__score"><small>MARCADOR</small>{gameState.score[0]} <span>–</span> {gameState.score[1]}</div>{!halftime && <button className="df-icon-button" type="button" onClick={onClose} disabled={recoveryBlocked} aria-label="Cerrar panel y continuar partido"><X size={20} /></button>}</div>
      </header>
      <nav className="df-coach__tabs" aria-label="Secciones del panel DT">
        {[{ id: 'ALINEACION', label: 'Alineación', icon: Users }, { id: 'TACTICA', label: 'Táctica', icon: LayoutGrid }, ...(halftime ? [{ id: 'CHARLA', label: 'Charla', icon: MessageSquare }] : []), { id: 'CANCHA', label: 'Cancha', icon: Settings2 }].map(({ id, label, icon: Icon }) => <button type="button" key={id} className={tab === id ? 'is-active' : ''} onClick={() => { setTab(id); setFeedback(null); setSwapping(false); }} aria-current={tab === id ? 'page' : undefined}><Icon size={15} />{label}{id === 'CHARLA' && <span>{MAX_TEAM_TALKS - talks}</span>}</button>)}
      </nav>
      <div className="df-coach__body">
        {feedback && <p className={`df-coach__feedback ${feedback.ok ? '' : 'is-error'}`} role="status">{feedback.ok ? <Check size={16} /> : <X size={16} />}{feedback.text}</p>}
        {halftime && <div className="df-coach-pulse"><span><BatteryMedium size={18} /><b>{averageEnergy}%</b> energía media</span><span><ArrowDownUp size={18} /><b>{gameState.substitutionsUsed || 0}/5</b> cambios</span>{opportunities && <span><Target size={18} /><b>{opportunities.used}/{opportunities.limit}</b> ocasiones</span>}</div>}
        {onUseBebida && (halftime || gameState.phase === 'READY') && <aside className="df-coach-recovery"><span className="df-coach-recovery__icon"><Zap size={23} /></span><div><b>Bebida THC <span>×{bebidaCount ?? '—'}</span></b><p>{bebidaPending ? 'Confirma el uso pendiente para continuar.' : 'Todo el plantel al 100% de energía.'}</p></div><button type="button" disabled={bebidaBusy || (!bebidaPending && (bebidaCount === null || bebidaCount < 1 || fullyRecovered || !players.length))} onClick={useDrink}>{bebidaBusy ? 'Recuperando…' : bebidaPending ? 'Reintentar uso' : fullyRecovered ? 'Al 100%' : 'Usar bebida'}{fullyRecovered && !bebidaPending ? <Check size={16} /> : <Sparkles size={16} />}</button></aside>}
        {bebidaError && <p className="df-coach__feedback is-error" role="status"><X size={16} />{bebidaError}</p>}
        <fieldset className="df-coach__content" key={tab} disabled={recoveryBlocked}>
        {tab === 'ALINEACION' && <div className="df-lineup-layout">
          <div className="df-lineup-map-panel"><div className="df-section-heading"><span>ONCE EN CANCHA</span><b>{formation.split(' ')[0]}</b></div>
            <div className={`df-position-tools ${swapping ? 'is-moving' : ''}`}><button type="button" className="df-button df-button--quiet" aria-pressed={swapping} disabled={!selected} onClick={() => setSwapping(value => !value)}><ArrowDownUp size={15} />{swapping ? 'Cancelar movimiento' : 'Mover de puesto'}</button><p id="df-position-help">{swapping ? `${selected?.name}: elige la burbuja del puesto de destino.` : 'Elige un jugador y pulsa Mover de puesto, o arrástralo. Teclado: M, flechas y Enter.'}</p></div>
            <div className="df-tactical-pitch"><div className="df-tactical-pitch__center" /><div className="df-tactical-pitch__box df-tactical-pitch__box--top" /><div className="df-tactical-pitch__box df-tactical-pitch__box--bottom" />
              {players.map(player => { const point = formationPositions[player.slot] || { x: 50, y: 50 }; return <button type="button" key={player.id} ref={node => { if (node) pitchButtons.current.set(player.id, node); else pitchButtons.current.delete(player.id); }} onKeyDown={event => positionKey(event, player)} onClick={() => pickPlayer(player)} draggable onDragStart={event => startDrag(event, player)} onDragEnd={() => { draggedPlayer.current = null; setSwapping(false); }} onDragOver={event => { if (draggedPlayer.current && draggedPlayer.current !== player.id) { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; } }} onDrop={event => dropPlayer(event, player)} style={{ left: `${point.x}%`, top: `${point.y}%` }} className={`df-tactical-player ${selected?.slot === player.slot ? 'is-selected' : swapping ? 'is-destination' : ''}`} aria-pressed={selected?.slot === player.slot} aria-describedby="df-position-help" aria-label={swapping && selected?.id !== player.id ? `Mover ${selected?.name} a ${player.slot.toUpperCase()}, puesto de ${player.name}` : `Seleccionar ${player.name}, puesto ${player.slot.toUpperCase()}, GRL ${player.grl}`}><span>{player.role === 'GK' ? '1' : player.slot.toUpperCase().replace(/\d/g, '')}</span><small>{player.name.split(' ').pop()}</small></button>; })}
            </div>
            {selected && <div className="df-lineup-summary"><span className="df-eyebrow">{selected.slot.toUpperCase()} · GRL {selected.grl}</span><b>{selected.name}</b><span className="df-lineup-summary__rating">{Number(stats.rating || 6).toFixed(1)} <small>NOTA</small></span><Energy value={selected.rawStamina} /><p>Ánimo +{((selected.moraleBonus || 0) * 100).toFixed(1)}%</p><button type="button" className="df-button df-button--quiet" onClick={() => benchRef.current?.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })}>Ver banquillo<ChevronRight size={12} /></button></div>}
            <p className="df-muted">El GRL influye en velocidad, pases y desgaste. Jugar fuera del puesto natural reduce su eficacia.</p>
          </div>
          <div className="df-lineup-data"><div className="df-roster-heading"><span>JUGADOR</span><span>ENERGÍA</span><span>NOTA</span></div>
            <div className="df-roster">{players.map(player => <button key={player.id} type="button" className={`df-roster__row ${selected?.slot === player.slot ? 'is-selected' : ''}`} onClick={() => pickPlayer(player)}><span className="df-roster__name"><i>{player.slot.toUpperCase().replace(/\d/g, '')}</i><span>{player.name}</span></span><Energy value={player.rawStamina} /><b className="df-rating">{Number(player.stats?.rating || 6).toFixed(1)}</b></button>)}</div>
            {selected && <div className="df-player-report"><div className="df-section-heading"><span>{selected.name}</span><b>GRL {selected.grl}</b></div><div className="df-player-report__stats"><span><b>{stats.passesCompleted || 0}<small>/{stats.passesAttempted || 0}</small></b>Pases</span><span><b>{stats.shots || 0}</b>Tiros</span><span><b>{stats.goals || 0}</b>Goles</span><span><b>{stats.recoveries || 0}</b>Robos</span></div><button type="button" className={`df-button df-button--quiet ${swapping ? 'is-active' : ''}`} onClick={() => setSwapping(value => !value)}><ArrowDownUp size={15} />{swapping ? 'Selecciona el otro jugador' : 'Intercambiar puestos'}</button>{swapping && <p className="df-muted">Toca otro titular. Jugar fuera de su posición puede reducir su GRL.</p>}</div>}
          </div>
          <div ref={benchRef} className="df-bench"><div className="df-section-heading"><span>BANQUILLO</span><b>{gameState.substitutionsUsed || 0}/5 CAMBIOS</b></div>
            {bench.length ? <div className="df-bench__list">{bench.map(player => <button key={player.id} type="button" disabled={player.substitutedOut} className={`df-bench__player ${benchId === String(player.id) ? 'is-selected' : ''}`} onClick={() => setBenchId(String(player.id))}><span className="df-roster__name"><i>{player.pos}</i><span>{player.name}<small>{player.substitutedOut ? 'Ya salió del partido' : `GRL ${player.grl}`}</small></span></span><Energy value={player.energia} /></button>)}</div> : <p className="df-muted">No hay jugadores disponibles en el banquillo.</p>}
            <button type="button" className="df-button df-button--orange" disabled={!selected || !benchId || gameState.substitutionsUsed >= 5} onClick={substitute}><ArrowDownUp size={17} />Realizar cambio<ChevronRight size={17} /></button>
          </div>
        </div>}
        {tab === 'CANCHA' && display && <MatchDisplayOptions display={display} onChange={updateDisplay} />}
        {tab === 'TACTICA' && <div className="df-tactics-layout"><div><div className="df-section-heading"><span>MENTALIDAD</span><Activity size={16} /></div><div className="df-mentalities">{mentalityOptions.map(({ id, label, icon: Icon, desc }) => <button key={id} type="button" className={`df-mentality ${gameState.mentality === id ? 'is-selected' : ''}`} onClick={() => report(onMentality(id), `Mentalidad ${label.toLowerCase()} aplicada.`)}><Icon size={25} /><span><b>{label}</b><small>{desc}</small></span>{gameState.mentality === id && <Check size={18} />}</button>)}</div><p className="df-muted">La energía limita el ritmo: una charla no convierte a un jugador agotado en uno fresco.</p></div>
          <div><div className="df-section-heading"><span>SISTEMA DE JUEGO</span><Target size={16} /></div><div className="df-formations">{Object.keys(FORMACIONES_XY).map(name => <button key={name} type="button" onClick={() => { onFormation(name); setFeedback({ ok: true, text: `Sistema ${name.toLowerCase()} aplicado.` }); }} className={`df-formation ${formation === name ? 'is-selected' : ''}`}><span className="df-formation__dots">{Object.values(FORMACIONES_XY[name]).map((point, i) => <i key={i} style={{ left: `${point.x}%`, top: `${point.y}%` }} />)}</span><span><b>{name.split(' ')[0]}</b><small>{name.split(' ').slice(1).join(' ')}</small></span>{formation === name && <Check size={18} />}</button>)}</div></div>
        </div>}
        {tab === 'CHARLA' && <div className="df-talk-layout"><aside className="df-talk-brief"><span className="df-talk-brief__icon"><MessageSquare size={34} /></span><p className="df-eyebrow">CHARLA DE VESTUARIO</p><h3>TODAVÍA <br />QUEDA <em>PARTIDO.</em></h3><p>Elige a quién hablar y qué necesita escuchar.</p><div className="df-talk-counter" aria-label={`${MAX_TEAM_TALKS - talks} charlas disponibles`}>{Array.from({ length: MAX_TEAM_TALKS }, (_, i) => <span key={i} className={i < talks ? 'is-used' : ''}>{i < talks ? <Check size={15} /> : i + 1}</span>)}</div><b className="df-talk-remaining">{Math.max(0, MAX_TEAM_TALKS - talks)} intervenciones disponibles</b><p className="df-muted"><BatteryMedium size={16} />El ánimo suma. La energía marca cuánto pueden dar.</p></aside>
          <div className="df-talk-choices"><div className="df-talk-target"><label>Hablar con<select value={targetType} onChange={event => setScope(event.target.value)}><option value="TEAM">Todo el equipo</option><option value="POSITION">Una posición</option><option value="PLAYER">Un jugador</option></select></label>{targetType !== 'TEAM' && <label>{targetType === 'PLAYER' ? 'Jugador' : 'Línea'}<select value={targetId} onChange={event => setTargetId(event.target.value)}>{targetType === 'PLAYER' ? players.map(player => <option key={player.id} value={String(player.sourceId || player.id)}>{player.name}</option>) : positions.map(position => <option key={position.id} value={position.id}>{position.label}</option>)}</select></label>}</div>
            <div className="df-talk-options">{phrases.map((phrase, i) => <button type="button" key={phrase.id} onClick={() => sendTalk(phrase)} disabled={talks >= MAX_TEAM_TALKS} className="df-talk-card" data-tone={phrase.tone} style={{ '--talk-delay': `${i * 35}ms` }}><span className="df-talk-card__top"><span>{tones[phrase.tone] || 'Motivación'}</span><MessageSquare size={17} /></span><span className="df-talk-card__text">“{phrase.text}”</span><span className="df-talk-card__bottom">Enviar mensaje<ArrowRight size={18} /></span></button>)}</div>
            {talks >= MAX_TEAM_TALKS && <p role="status" className="df-coach__feedback"><Check size={16} />Charla completada. Tu equipo está listo para volver a la cancha.</p>}
          </div>
        </div>}
        </fieldset>
      </div>
      <footer className="df-coach__footer"><p><span className="df-live-dot" />{halftime ? 'El reloj se detiene en el descanso' : gameState.phase === 'READY' ? 'El partido aún no ha comenzado' : 'El partido está pausado'}</p><button type="button" className="df-button df-button--orange" onClick={onClose} disabled={recoveryBlocked}>{halftime ? 'Jugar segundo tiempo' : gameState.phase === 'READY' ? 'Volver a la previa' : 'Volver al partido'}<ArrowRight size={19} /></button></footer>
    </section>
  </div>;
}
