import { useState } from 'react';
import { LayoutGroup, motion, useReducedMotion } from 'framer-motion';
import { ArrowDownUp, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { FORMACIONES, normalizarPos, calcGrlEfectivo } from './formacionesFantasy';
import { careerEnergy } from './careerEnergy';
import { selectCareerLineup, swapCareerPlayers } from './squadSelection';
import './PlantelDF.css';

const lines = [{ id: 'ALL', label: 'Todos' }, { id: 'POR', label: 'POR' }, { id: 'DEF', label: 'DEF' }, { id: 'MED', label: 'MED' }, { id: 'DEL', label: 'DEL' }];
const locationKey = location => `${location.type}:${location.key}`;

export default function PlantelDF({ titularesMap, setTitularesMap, reservas, setReservas, tactica, setTactica, getMediaPlantilla }) {
  const [selected, setSelected] = useState(null);
  const [dragged, setDragged] = useState(null);
  const [filter, setFilter] = useState('ALL');
  const [feedback, setFeedback] = useState('');
  const reduceMotion = useReducedMotion();
  const slots = FORMACIONES[tactica] || FORMACIONES['4-3-3 OFENSIVO'];
  const chosen = selected?.type === 'pitch' ? titularesMap[selected.key] : reservas.find(player => player.id === selected?.key);
  const transition = reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 150, damping: 24, mass: 0.85 };
  const visibleReserves = reservas.filter(player => filter === 'ALL' || normalizarPos(player.pos) === filter);

  const applySquad = result => { setTitularesMap(result.titulares); setReservas(result.reservas); setSelected(null); setDragged(null); };
  const autoAlign = (formation = tactica) => {
    const result = selectCareerLineup(titularesMap, reservas, formation);
    applySquad(result);
    setTactica(formation);
    const text = result.missing.length ? `Falta cubrir ${result.missing.join(', ')}. Elige otro sistema.` : 'Once actualizado con los jugadores más preparados.';
    setFeedback(text);
    if (result.missing.length) toast.error(text, { id: 'fantasy-lineup' });
  };
  const swap = (source, destination) => {
    const result = swapCareerPlayers(titularesMap, reservas, source, destination);
    if (!result) { setDragged(null); return; }
    const sourcePlayer = source.type === 'pitch' ? titularesMap[source.key] : reservas.find(player => player.id === source.key);
    applySquad(result);
    setFeedback(`${sourcePlayer?.name || 'Jugador'}: cambio realizado.`);
  };
  const choose = (location, player) => {
    if (selected && locationKey(selected) === locationKey(location)) { setSelected(null); return; }
    if (selected && chosen) swap(selected, location);
    else if (player) { setSelected(location); setFeedback(''); }
  };
  const startDrag = (event, location, player) => {
    if (!player) { event.preventDefault(); return; }
    setDragged(location);
    setSelected(location);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', locationKey(location));
  };
  const drop = (event, location) => { event.preventDefault(); if (dragged) swap(dragged, location); };
  const card = (player, location, slotPos) => {
    const active = selected && locationKey(selected) === locationKey(location);
    const compatible = chosen && slotPos ? normalizarPos(chosen.pos) === normalizarPos(slotPos) : false;
    const misplaced = player && slotPos && normalizarPos(player.pos) !== normalizarPos(slotPos);
    const energy = careerEnergy(player?.energia);
    return <motion.button
      key={player?.id || locationKey(location)} type="button" layout layoutId={player ? `df-squad-${player.id}` : undefined} transition={transition}
      draggable={!!player} onDragStart={event => startDrag(event, location, player)} onDragEnd={() => setDragged(null)}
      onDragOver={event => { if (dragged) { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; } }} onDrop={event => drop(event, location)}
      onClick={() => choose(location, player)} aria-pressed={!!active}
      aria-label={player ? `${player.name}, ${slotPos || normalizarPos(player.pos)}, GRL ${player.grl}, energía ${Math.round(energy)}%. ${selected && !active ? 'Intercambiar con el seleccionado' : 'Seleccionar jugador'}` : `Puesto ${slotPos} vacío`}
      className={`df-squad-player ${location.type === 'bench' ? 'df-squad-player--bench' : ''} ${active ? 'is-selected' : ''} ${compatible && !active ? 'is-compatible' : ''} ${misplaced ? 'is-misplaced' : ''}`}
    >
      <span className="df-squad-player__rating">{player ? calcGrlEfectivo(player, slotPos || player.pos) : '+'}</span>
      <span className="df-squad-player__identity"><b>{player?.name || 'Vacante'}</b><small>{slotPos || normalizarPos(player?.pos)}{misplaced ? ' · Fuera de posición' : ''}</small></span>
      {player && <span className={`df-squad-energy ${energy < 50 ? 'is-low' : ''}`}><span><i style={{ width: `${energy}%` }} /></span><b>{Math.round(energy)}%</b></span>}
      {active && <Check className="df-squad-player__selected" size={13} />}
    </motion.button>;
  };

  return <LayoutGroup id="career-squad"><section className="df-squad" aria-label="Gestión de alineación" onKeyDown={event => { if (event.key === 'Escape') { setSelected(null); setDragged(null); } }}>
    <header className="df-squad-header"><div><p>Tu equipo</p><h2>Alineación<i>.</i></h2></div><span className="df-squad-overall"><b>{getMediaPlantilla()}</b> GRL</span></header>
    <div className="df-squad-toolbar"><label>Formación<select value={tactica} onChange={event => autoAlign(event.target.value)}>{Object.keys(FORMACIONES).map(formation => <option value={formation} key={formation}>{formation}</option>)}</select></label><button type="button" onClick={() => autoAlign()}><ArrowDownUp size={17} />Autoalinear</button><p>Toca dos jugadores para intercambiarlos. También puedes arrastrarlos.</p></div>
    <div className="df-squad-layout">
      <div className="df-squad-pitch-wrap">
        <div className="df-squad-pitch" aria-label="Once titular">
          <svg viewBox="0 0 600 620" preserveAspectRatio="none" aria-hidden="true"><rect x="20" y="16" width="560" height="588" rx="1" /><path d="M20 310H580M160 16V105H440V16M220 16V56H380V16M160 604V515H440V604M220 604V564H380V604" /><ellipse cx="300" cy="310" rx="62" ry="60" /><circle cx="300" cy="310" r="3" /></svg>
          {slots.map(slot => { const player = titularesMap[slot.id]; return <div className="df-squad-slot" key={slot.id} style={{ top: slot.top, left: slot.left }} data-slot={slot.id}>{card(player, { type: 'pitch', key: slot.id }, slot.pos)}</div>; })}
        </div>
        <div className={`df-squad-selection ${chosen ? 'is-active' : ''}`} aria-live="polite">{chosen ? <><span><b>{chosen.name}</b> · {normalizarPos(chosen.pos)} · {Math.round(careerEnergy(chosen.energia))}% energía</span><button type="button" onClick={() => setSelected(null)} aria-label="Cancelar selección"><X size={17} /></button></> : <span>{feedback || 'Elige un titular o un suplente.'}</span>}</div>
      </div>
      <aside className="df-squad-bench"><header><h3>Banquillo</h3><span>{reservas.length}</span></header><div className="df-squad-filters" aria-label="Filtrar suplentes">{lines.map(line => <button type="button" key={line.id} onClick={() => setFilter(line.id)} aria-pressed={filter === line.id}>{line.label}</button>)}</div><div className="df-squad-bench__players">{visibleReserves.map(player => <div key={player.id}>{card(player, { type: 'bench', key: player.id })}</div>)}{!visibleReserves.length && <p className="df-squad-empty">No hay suplentes en esta línea.</p>}</div><p className="df-squad-rest">Entre jornadas: 3 días de recuperación.</p></aside>
    </div>
  </section></LayoutGroup>;
}
