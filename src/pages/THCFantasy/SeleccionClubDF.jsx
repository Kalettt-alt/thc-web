import { useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Search } from 'lucide-react';
import { TODOS_LOS_EQUIPOS } from './equiposFantasy';
import { clubCrestDF } from './clubCrestDF';
import './FantasyEntry.css';

const LEAGUES = [['ALL', 'Todas'], ['ARG', 'Argentina'], ['ESP', 'España'], ['BRS', 'Brasil'], ['PER', 'Perú'], ['COL', 'Colombia'], ['URU', 'Uruguay'], ['CHL', 'Chile'], ['ECU', 'Ecuador'], ['BOL', 'Bolivia']];
const normalize = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const clubKey = club => `${club.liga}:${club.id}`;

export default function SeleccionClubDF({ onSelectClub, apodo }) {
  const [league, setLeague] = useState('ALL');
  const [search, setSearch] = useState('');
  const [selectedKey, setSelectedKey] = useState('');
  const reducedMotion = useReducedMotion();
  const clubs = useMemo(() => TODOS_LOS_EQUIPOS.filter(club => (league === 'ALL' || club.liga === league) && normalize(club.name).includes(normalize(search))), [league, search]);
  const selected = clubs.find(club => clubKey(club) === selectedKey) || clubs[0];

  return <main className={`df-clubs ${reducedMotion ? 'df-reduced' : ''}`} data-motion={reducedMotion ? 'off' : 'on'}>
    <header className="df-clubs-header"><Link to="/" className="df-back"><ArrowLeft size={17} /> Regresar</Link><span>THC / DT FANTASY</span><span>{apodo}</span></header>
    <section className="df-clubs-heading"><div><span className="df-eyebrow">Una decisión. Toda una temporada.</span><h1>ELIGE TU <em>CLUB.</em></h1></div><label className="df-clubs-search"><Search size={18} /><input aria-label="Buscar club" value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar club" /><span>{clubs.length}</span></label></section>
    <div className="df-clubs-body">
      <section className="df-clubs-catalog" aria-label="Clubes disponibles">
        <div className="df-clubs-leagues" aria-label="Filtrar por país">{LEAGUES.map(([id, name]) => <button type="button" key={id} onClick={() => setLeague(id)} aria-pressed={league === id} className={league === id ? 'active' : ''}>{name}</button>)}</div>
        <div className="df-clubs-grid">{clubs.map(club => <motion.button type="button" key={clubKey(club)} initial={{ opacity: 0, y: reducedMotion ? 0 : 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .3 }} onClick={() => setSelectedKey(clubKey(club))} className={`df-club-card ${clubKey(selected) === clubKey(club) ? 'selected' : ''}`} aria-pressed={clubKey(selected) === clubKey(club)}>
          <span className="df-club-card-rating">{club.grl}<small>GRL</small></span><img src={clubCrestDF(club)} alt="" /><strong>{club.name}</strong><span className="df-club-card-country">{LEAGUES.find(([id]) => id === club.liga)?.[1]}</span>
        </motion.button>)}</div>
        {!clubs.length && <div className="df-clubs-empty"><p>No encontramos ese club.</p><button type="button" onClick={() => { setSearch(''); setLeague('ALL'); }}>Ver todos</button></div>}
      </section>
      <aside className="df-club-detail" aria-label="Club seleccionado">
        <AnimatePresence mode="wait">{selected ? <motion.div key={clubKey(selected)} initial={{ opacity: 0, x: reducedMotion ? 0 : 14 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: reducedMotion ? 0 : -14 }} transition={{ duration: .22 }} className="df-club-detail-inner">
          <div className="df-club-detail-crest"><span>EL NUEVO CAPÍTULO</span><img src={clubCrestDF(selected)} alt={`Escudo de ${selected.name}`} /><i>{selected.liga}</i></div>
          <h2>{selected.name}</h2><p>{selected.estilo || 'Tu estilo de juego'}</p>
          <dl><div><dt>GRL del club</dt><dd>{selected.grl}</dd></div><div><dt>Presupuesto</dt><dd>${(selected.presupuesto / 1000000).toFixed(0)}<small>M</small></dd></div></dl>
          <button type="button" className="df-start" onClick={() => onSelectClub(selected)}><span>Dirigir este club</span><ArrowRight size={23} /></button>
        </motion.div> : <p className="df-club-no-selection">Elige otro país o cambia tu búsqueda.</p>}</AnimatePresence>
      </aside>
    </div>
  </main>;
}
