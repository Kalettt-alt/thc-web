import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeftRight, BatteryMedium, Check, RotateCcw, Sparkles, X } from 'lucide-react';
import { arrangeSquad, effectivePlayerGrl, SQUAD_FORMATIONS } from './squadUT';
import { displayCardPosition } from './utCards';
import { coachingBasePlayer, coachingPlayerProfile, pendingCoachingChanges, sortCoachingBench } from './coachingPresentationUT';

const playerName = player => player?.nombre || player?.name || 'Jugador';

export default function MatchCoachUT({ team, minute, halftimeRemaining, onApply, onClose, reduced }) {
  const root = useRef(null);
  const submitLock = useRef(false);
  const attempt = useRef(null);
  const pool = useMemo(() => {
    const players = [...(team.roster || []), ...(team.titulares || []), ...(team.bench || []), ...(team.suplentes || [])].filter(Boolean);
    return new Map(players.map(player => [String(player.id), coachingBasePlayer(player)]));
  }, [team]);
  const [lineup, setLineup] = useState(() => (team.titulares || []).map(player => String(player.id)));
  const [formation, setFormation] = useState(team.formacion || '4-3-3');
  const [mentality, setMentality] = useState(team.mentalidad || 'neutral');
  const [selected, setSelected] = useState(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const slots = SQUAD_FORMATIONS[formation] || SQUAD_FORMATIONS['4-3-3'];
  const original = (team.titulares || []).map(player => String(player.id));
  const alreadyOff = new Set((team.subbed_off || []).map(String));
  const changes = pendingCoachingChanges(original, lineup, slots);
  const substitutions = changes.substitutions;
  const remaining = Math.max(0, 5 - (team.substitutions || 0));
  const grl = Math.round(lineup.reduce((sum, id, index) => sum + effectivePlayerGrl(pool.get(id), slots[index]?.[0]), 0) / 11);
  const selectedPlayer = selected === null ? null : pool.get(lineup[selected]);
  const selectedPosition = selected === null ? null : slots[selected]?.[0];
  const selectedProfile = selectedPlayer ? coachingPlayerProfile(selectedPlayer, selectedPosition) : null;
  const bench = sortCoachingBench([...pool.values()].filter(player => !lineup.includes(String(player.id)) && !alreadyOff.has(String(player.id))), selectedPosition);
  const dirty = formation !== (team.formacion || '4-3-3') || mentality !== (team.mentalidad || 'neutral') || lineup.some((id, index) => id !== original[index]);
  const validLineup = lineup.length === 11 && new Set(lineup).size === 11 && lineup.every(id => pool.has(id) && !alreadyOff.has(id));
  useEffect(() => {
    const previousFocus = document.activeElement;
    root.current?.querySelector('button')?.focus();
    const capture = event => {
      if (event.key !== 'Tab') return;
      const targets = [...(root.current?.querySelectorAll('button:not(:disabled),select:not(:disabled),[tabindex="0"]') || [])];
      if (!targets.length) return;
      if (event.shiftKey && document.activeElement === targets[0]) { event.preventDefault(); targets.at(-1).focus(); }
      if (!event.shiftKey && document.activeElement === targets.at(-1)) { event.preventDefault(); targets[0].focus(); }
    };
    root.current?.addEventListener('keydown', capture);
    const node = root.current;
    return () => { node?.removeEventListener('keydown', capture); previousFocus?.focus?.(); };
  }, []);
  const edit = action => { if (submitLock.current) return; attempt.current = null; setError(''); action(); };
  const selectSlot = index => edit(() => {
    if (selected === null) { setSelected(index); return; }
    if (selected !== index) setLineup(previous => { const next = [...previous]; [next[selected], next[index]] = [next[index], next[selected]]; return next; });
    setSelected(null);
  });
  const chooseBench = id => edit(() => {
    if (selected === null || !pool.has(String(id)) || lineup.includes(String(id)) || alreadyOff.has(String(id))) return;
    const next = [...lineup]; next[selected] = String(id);
    if (original.filter(playerId => !next.includes(playerId)).length > remaining) { setError('Ya usaste los cambios disponibles.'); return; }
    setLineup(next); setSelected(null);
  });
  const undo = () => edit(() => {
    setLineup(original); setFormation(team.formacion || '4-3-3'); setMentality(team.mentalidad || 'neutral'); setSelected(null);
  });
  const changeFormation = value => edit(() => {
    const arranged = arrangeSquad({ titulares: lineup.map(id => pool.get(id)), suplentes: [], reservas: [], formacion: formation }, value);
    setFormation(value); if (arranged.titulares.every(Boolean)) setLineup(arranged.titulares.map(player => String(player.id))); setSelected(null);
  });
  const apply = async () => {
    if (submitLock.current || !dirty || !validLineup || substitutions > remaining) return;
    submitLock.current = true; setPending(true); setError('');
    attempt.current ||= { titulares: [...lineup], formacion: formation, mentalidad: mentality, requestId: crypto.randomUUID(), revision: team.revision || 0 };
    try { await onApply(attempt.current); onClose(); }
    catch (cause) { setError(cause.message || 'No se pudo confirmar el cambio. Reintenta.'); }
    finally { submitLock.current = false; setPending(false); }
  };
  return <div className="ut-coach-backdrop"><motion.section ref={root} className="ut-coach" role="dialog" aria-modal="true" aria-label="Dirigir mi equipo" initial={{ opacity: 0, y: reduced ? 0 : 20 }} animate={{ opacity: 1, y: 0 }} onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); if (!pending) onClose(); } }}>
    <header><div><span>{halftimeRemaining > 0 ? `Descanso · ${Math.ceil(halftimeRemaining)} s` : `En juego · ${minute}′`}</span><h2>Tu siguiente <em>jugada.</em></h2></div><button type="button" disabled={pending} onClick={onClose} aria-label="Cerrar dirección del equipo"><X size={22} /></button></header>
    <div className="ut-coach__controls"><label>Formación<select value={formation} disabled={pending} onChange={event => changeFormation(event.target.value)}>{Object.keys(SQUAD_FORMATIONS).map(value => <option key={value}>{value}</option>)}</select></label><fieldset disabled={pending}><legend>Mentalidad</legend>{[['defensiva','Defensiva'],['neutral','Neutral'],['ofensiva','Ofensiva']].map(([id, label]) => <button type="button" key={id} aria-pressed={mentality === id} onClick={() => edit(() => setMentality(id))}>{label}</button>)}</fieldset><div className="ut-coach__rating"><strong>{grl}</strong><span>GRL</span></div></div>
    <div className="ut-coach__layout"><div className="ut-coach__field"><svg viewBox="0 0 100 120" aria-hidden="true"><rect x="5" y="5" width="90" height="110" /><path d="M5 60h90M27 5v18h46V5M27 115V97h46v18"/><circle cx="50" cy="60" r="14" /></svg>{slots.map(([position, left, top], index) => {
      const player = pool.get(lineup[index]);
      const profile = coachingPlayerProfile(player, position);
      return <motion.button type="button" key={lineup[index]} disabled={pending} className={`${selected === index ? 'is-selected' : ''}${!original.includes(lineup[index]) ? ' is-incoming' : ''}`} animate={{ left: `${left}%`, top: `${top}%` }} transition={{ duration: reduced ? 0 : .35 }} onClick={() => selectSlot(index)} aria-label={`${displayCardPosition(position)}, ${playerName(player)}, ${profile.grl} GRL, ${profile.energy}% energía${profile.penalty ? `, pierde ${profile.penalty} GRL por posición` : ''}. Seleccionar para cambiar.`} aria-pressed={selected === index}><span>{displayCardPosition(position)}</span><b>{profile.grl}</b><strong>{playerName(player)}</strong><i data-low={profile.energy < 40 || undefined}><span style={{ width: `${profile.energy}%` }} /></i>{profile.penalty > 0 && <small className="ut-coach__slot-penalty">−{profile.penalty}</small>}</motion.button>;
    })}</div><aside className="ut-coach__bench"><div><h3>Suplentes</h3><span>{Math.max(0, remaining - substitutions)} / 5 cambios</span></div>
      {selectedProfile ? <section className="ut-coach__comparison" aria-label="Jugador a reemplazar"><div><span>Sale · {displayCardPosition(selectedPosition)}</span><button type="button" disabled={pending} onClick={() => edit(() => setSelected(null))} aria-label="Quitar selección"><X size={14} /></button></div><strong>{playerName(selectedPlayer)}</strong><div><b>{selectedProfile.grl}<small>GRL</small></b><span><BatteryMedium size={14} />{selectedProfile.energy}%</span>{selectedProfile.penalty > 0 && <em>−{selectedProfile.penalty} por puesto</em>}</div></section> : <p>Elige un jugador en cancha.</p>}
      <div className="ut-coach__players">{bench.map(({ player, grl: candidateGrl, energy, penalty }, index) => {
        const next = [...lineup]; if (selected !== null) next[selected] = String(player.id);
        const canChoose = selected !== null && original.filter(id => !next.includes(id)).length <= remaining;
        const ratingDiff = selectedProfile ? candidateGrl - selectedProfile.grl : 0;
        const energyDiff = selectedProfile ? energy - selectedProfile.energy : 0;
        return <button type="button" key={player.id} disabled={!canChoose || pending} onClick={() => chooseBench(player.id)} aria-label={`${playerName(player)}, ${candidateGrl} GRL${selectedPosition ? ` en ${displayCardPosition(selectedPosition)}` : ''}, ${energy}% energía${penalty ? `, pierde ${penalty} GRL por posición` : ''}`}>
          <span>{displayCardPosition(player.pos || player.posicion)}</span><div><strong>{playerName(player)}{selectedPosition && index === 0 && <Sparkles size={12} aria-label="Recomendado" />}</strong><small><BatteryMedium size={12} />{energy}%{selectedProfile && energyDiff !== 0 && <em className={energyDiff > 0 ? 'is-positive' : 'is-negative'}>{energyDiff > 0 ? '+' : ''}{energyDiff}</em>}{penalty > 0 && <span className="ut-coach__penalty">−{penalty} por puesto</span>}</small></div><div className="ut-coach__candidate-rating"><b>{candidateGrl}</b>{selectedProfile && <small className={ratingDiff > 0 ? 'is-positive' : ratingDiff < 0 ? 'is-negative' : ''}>{ratingDiff > 0 ? '+' : ''}{ratingDiff} GRL</small>}</div><ArrowLeftRight size={15} />
        </button>;
      })}{!bench.length && <p>No quedan suplentes disponibles.</p>}</div></aside></div>
    {dirty && <section className="ut-coach__pending" aria-label="Cambios pendientes"><div><strong>{substitutions ? `${substitutions} ${substitutions === 1 ? 'cambio pendiente' : 'cambios pendientes'}` : 'Ajuste táctico'}</strong><button type="button" disabled={pending} onClick={undo}><RotateCcw size={13} />Deshacer</button></div><div className="ut-coach__pending-list">{changes.replacements.map(change => <span key={change.in}><strong>{playerName(pool.get(change.out))}</strong><ArrowLeftRight size={12} /><b>{playerName(pool.get(change.in))}</b><small>{displayCardPosition(change.position)}</small></span>)}{formation !== (team.formacion || '4-3-3') && <span className="ut-coach__tactic-change">{team.formacion || '4-3-3'} → {formation}</span>}{mentality !== (team.mentalidad || 'neutral') && <span className="ut-coach__tactic-change">{mentality === 'defensiva' ? 'Defensiva' : mentality === 'ofensiva' ? 'Ofensiva' : 'Neutral'}</span>}{changes.moved > 0 && <span className="ut-coach__tactic-change">{changes.moved} puestos ajustados</span>}</div></section>}
    <footer><div>{error ? <p role="alert">{error}</p> : <span>{halftimeRemaining > 0 ? 'El segundo tiempo empieza automáticamente.' : 'El partido continúa mientras eliges.'}</span>}</div><button type="button" onClick={() => void apply()} disabled={pending || !dirty || !validLineup || substitutions > remaining}><Check size={17} />{pending ? 'Confirmando…' : error ? 'Reintentar' : substitutions ? `Confirmar ${substitutions} ${substitutions === 1 ? 'cambio' : 'cambios'}` : 'Aplicar táctica'}</button></footer>
  </motion.section></div>;
}
