import { useState, useRef, useMemo } from 'react';
import useCareerPersistence from './useCareerPersistence';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, CloudLightning, FlaskConical, Settings2, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import confetti from 'canvas-confetti';
import { supabase } from '../../utils/supabase';
import { RUTAS } from '../../utils/rutas';
import { TODOS_LOS_EQUIPOS, resolveFantasyClub } from './equiposFantasy';
import { careerEnergy, hasTiredCareerPlayers, prepareCareerFitness, recoverBetweenFixtures, restoreCareerSquad } from './careerEnergy';
import useFantasyDrinks from './useFantasyDrinks';
import { generateCareerNews } from './careerNews';
import MatchResultCard from './MatchResultCard';
import './CareerRecovery.css';
import { selectCareerLineup } from './squadSelection';
import { completeSavedRoster } from './rosterCoverage';
import './CareerLayout.css';

import PlantelDF from './PlantelDF';
import { FORMACIONES, calcGrlEfectivo } from './formacionesFantasy';
import NoticiasDF from './NoticiasDF';
import FixtureDF from './FixtureDF';
import TablaDF from './TablaDF';
import JugarDF from './JugarDF';
import MatchDisplayOptions from './MatchDisplayOptions.jsx';
import { readMatchDisplay, saveMatchDisplay } from './matchPreferences.js';

                       
const imageModules = import.meta.glob('./Imag/*.{png,jpg,jpeg,webp}', { eager: true });
const getImg = (imgPath) => {
  if (!imgPath) return '';
  const fileName = imgPath.split('/').pop();
  const matchKey = Object.keys(imageModules).find(key => key.includes(fileName));
  return matchKey ? (imageModules[matchKey].default || imageModules[matchKey]) : imgPath;
};

const getNombresLigas = (sigla) => {
  const map = { 'ESP': 'LALIGA', 'ARG': 'LIGA PROFESIONAL', 'BRS': 'BRASILEIRÃO', 'PER': 'LIGA 1', 'COL': 'LIGA BETPLAY', 'URU': 'CAMPEONATO URUGUAYO', 'CHL': 'CAMPEONATO ITAÚ', 'ECU': 'LIGAPRO', 'BOL': 'DIVISIÓN PROFESIONAL' };
  return map[sigla] || 'LIGA GLOBAL';
};

const generarFixtureRoundRobin = (equipos) => {
  let roundRobin = [...equipos];
  if (roundRobin.length % 2 !== 0) roundRobin.push(null);
  const fixture = [];
  for (let r = 0; r < roundRobin.length - 1; r++) {
    const ronda = [];
    for (let i = 0; i < roundRobin.length / 2; i++) {
      const local = roundRobin[i];
      const visitante = roundRobin[roundRobin.length - 1 - i];
      if (local && visitante) ronda.push({ local: local.id, visitante: visitante.id, gl: null, gv: null, jugado: false });
    }
    fixture.push(ronda);
    roundRobin.splice(1, 0, roundRobin.pop());
  }
  return fixture;
};

const createCareer = (club, loaded) => {
  const ligaEquipos = TODOS_LOS_EQUIPOS.filter(team => team.liga === club?.liga);
  if (loaded) {
    const restored = prepareCareerFitness(loaded);
    return {
      ligaEquipos, standings: restored.standings, fixture: restored.fixture, jornada: restored.jornada_actual,
      tactica: FORMACIONES[restored.tactica] ? restored.tactica : '4-3-3 OFENSIVO', titulares: restored.titulares, reservas: completeSavedRoster(club, restored.titulares, restored.reservas),
      energiaRevision: restored.energia_revision || 0
    };
  }
  const standings = Object.fromEntries(ligaEquipos.map(team => [team.id, { id: team.id, name: team.name, img: team.img, pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, pts: 0, dg: 0 }]));
  const squad = selectCareerLineup({}, [...(club?.titulares || []), ...(club?.suplentes || [])]);
  return { ligaEquipos, standings, fixture: generarFixtureRoundRobin(ligaEquipos), jornada: 0, tactica: '4-3-3 OFENSIVO', ...restoreCareerSquad(squad.titulares, squad.reservas), energiaRevision: 0 };
};

export default function MenuDF({ club, apodo, partidaCargada, userId }) {
  const clubFull = useMemo(() => resolveFantasyClub(club), [club]);
  const initial = useMemo(() => createCareer(clubFull, partidaCargada), [clubFull, partidaCargada]);
  const [subTab, setSubTab] = useState('central');
  const [displayPreferences, setDisplayPreferences] = useState(readMatchDisplay);
  const ligaEquipos = initial.ligaEquipos;
  const [standings, setStandings] = useState(initial.standings);
  const [fixture, setFixture] = useState(initial.fixture);
  const [jornada, setJornada] = useState(initial.jornada);
  const [tactica, setTactica] = useState(initial.tactica);
  const [titularesMap, setTitularesMap] = useState(initial.titulares);
  const [reservas, setReservas] = useState(initial.reservas);
  const [energiaRevision, setEnergiaRevision] = useState(initial.energiaRevision);
  const [partidoEstado, setPartidoEstado] = useState(() => initial.fixture[initial.jornada]?.some(match => match.jugado && (match.local === clubFull.id || match.visitante === clubFull.id)) ? 'post' : 'idle');
  const [estadisticasPartido, setEstadisticasPartido] = useState(null);
  const [noticiasActuales, setNoticiasActuales] = useState(() => generateCareerNews({ club: clubFull, apodo, round: initial.jornada, standings: initial.standings, fixture: initial.fixture, lineup: initial.titulares, reserves: initial.reservas, teams: initial.ligaEquipos }));
  const [noticiasSinLeer, setNoticiasSinLeer] = useState(true);
  const [showConfirmDimitir, setShowConfirmDimitir] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const deleting = useRef(false);
  const snapshot = useMemo(() => clubFull && ligaEquipos.length ? {
    club_id: clubFull.id, club_nombre: clubFull.name, liga: clubFull.liga,
    jornada_actual: jornada, tactica, titulares: titularesMap, reservas, fixture, standings, energia_revision: energiaRevision
  } : null, [clubFull, ligaEquipos.length, jornada, tactica, titularesMap, reservas, fixture, standings, energiaRevision]);
  const persistence = useCareerPersistence(snapshot, userId);
  const { isSaving, saveError, retry, pauseForDelete, resume } = persistence;
  const bebidas = useFantasyDrinks({ userId, snapshot, persistence, onRecovered: result => {
    setTitularesMap(result.titulares);
    setReservas(result.reservas);
    setEnergiaRevision(result.energia_revision);
    if (FORMACIONES[result.formation]) setTactica(result.formation);
    toast.success('Plantilla recuperada.', { id: 'fantasy-drink' });
  } });
  const recoveryBlocked = bebidas.busy || bebidas.pending;
  const changeDisplayPreferences = value => {
    setDisplayPreferences(value);
    const persisted = saveMatchDisplay(value);
    if (!persisted) toast.error('La preferencia se aplicó, pero este navegador no permite guardarla.');
    return { ok: true, persisted };
  };

  const renunciarCargo = async () => {
    if (deleting.current || recoveryBlocked) return;
    deleting.current = true;
    setIsDeleting(true);
    const toastId = toast.loading('Rescindiendo contrato...');
    try {
      await pauseForDelete();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user || user.id !== userId) throw new Error('Tu sesión expiró. Inicia sesión de nuevo.');
      const { data, error } = await supabase.from('fantasy_partidas').delete().eq('user_id', user.id).select('id').single();
      if (error) throw error;
      if (!data) throw new Error('El servidor no confirmó el borrado.');
      toast.success('Contrato finalizado.', { id: toastId });
      window.location.reload();
    } catch (error) {
      console.error('Error rescindiendo contrato:', error);
      toast.error(error instanceof Error ? error.message : 'No se pudo finalizar el contrato. Vuelve a intentarlo.', { id: toastId });
      deleting.current = false;
      setIsDeleting(false);
      resume();
    }
  };

  const getMediaPlantilla = () => {
    const slots = FORMACIONES[tactica];
    if (!slots) return 0;
    let sum = 0;
    slots.forEach(s => { sum += calcGrlEfectivo(titularesMap[s.id], s.pos); });
    return Math.round(sum / 11) || 0;
  };

  const generarDiario = (tituMap = titularesMap, resMap = reservas, numJornada = jornada) => {
    setNoticiasActuales(generateCareerNews({ club: clubFull, apodo, round: numJornada, standings, fixture, lineup: tituMap, reserves: resMap, teams: ligaEquipos, lastMatch: estadisticasPartido }));
    setNoticiasSinLeer(true);
  };
  const procesarFinJornada = (misG, rivG, tracker, soyLocal, matchSummary) => {
    if (fixture[jornada]?.some(match => match.jugado && (match.local === clubFull.id || match.visitante === clubFull.id))) return;
    const gl = soyLocal ? misG : rivG; const gv = soyLocal ? rivG : misG;
    const win = misG > rivG;
    if (win) confetti({ particleCount: 200, spread: 100, origin: { y: 0.6 }, colors: ['#F47A20', '#111'] });

    const nuevosTitu = Object.fromEntries(Object.entries(matchSummary?.lineup || titularesMap).map(([slot, player]) => [slot, player ? { ...player } : null]));
    if (!matchSummary) Object.keys(nuevosTitu).forEach(k => { if (nuevosTitu[k]) nuevosTitu[k].energia = Math.max(0, careerEnergy(nuevosTitu[k].energia) - 10); });
    setTitularesMap(nuevosTitu);
    setReservas((matchSummary?.reservas || reservas).map(p => ({ ...p, energia: careerEnergy(p.energia) })));
    if (matchSummary?.formation && FORMACIONES[matchSummary.formation]) setTactica(matchSummary.formation);
    setEstadisticasPartido({ resultadoVisual: `${gl} - ${gv}`, win, misGoles: misG, rivGoles: rivG, score: [misG, rivG], summary: matchSummary, tracker });

    const copy = Object.fromEntries(Object.entries(standings).map(([id, team]) => [id, { ...team }]));
    const newFixture = fixture.map(round => round.map(match => ({ ...match })));
      newFixture[jornada].forEach(p => {
        let gL, gV;
        if (p.local === clubFull.id || p.visitante === clubFull.id) { gL = gl; gV = gv; } 
        else {
          const lObj = ligaEquipos.find(e=>e.id===p.local); const vObj = ligaEquipos.find(e=>e.id===p.visitante);
          const prob = 0.5 + ((lObj.grl - vObj.grl)*0.03);
          if(Math.random() < prob - 0.1) { gL = Math.floor(Math.random()*3)+1; gV = Math.floor(Math.random()*gL); }
          else if(Math.random() < prob + 0.15) { gL = gV = Math.floor(Math.random()*2)+1; }
          else { gV = Math.floor(Math.random()*3)+1; gL = Math.floor(Math.random()*gV); }
        }
        p.gl = gL; p.gv = gV; p.jugado = true;
        copy[p.local].pj++; copy[p.local].gf += gL; copy[p.local].gc += gV; copy[p.local].dg += (gL - gV);
        copy[p.visitante].pj++; copy[p.visitante].gf += gV; copy[p.visitante].gc += gL; copy[p.visitante].dg += (gV - gL);
        if (gL > gV) { copy[p.local].pts += 3; copy[p.local].pg++; copy[p.visitante].pp++; }
        else if (gL === gV) { copy[p.local].pts++; copy[p.visitante].pts++; copy[p.local].pe++; copy[p.visitante].pe++; }
        else { copy[p.visitante].pts += 3; copy[p.visitante].pg++; copy[p.local].pp++; }
      });
    setFixture(newFixture);
    setStandings(copy);
    setPartidoEstado('post');
  };

  const avanzarSiguienteFecha = () => {
    if (recoveryBlocked || isSaving || saveError) return;
    if (jornada < fixture.length - 1) {
      const recovered = recoverBetweenFixtures(titularesMap, reservas, 3);
      setTitularesMap(recovered.titulares);
      setReservas(recovered.reservas);
      setJornada(jornada + 1);
      setPartidoEstado('idle');
      generarDiario(recovered.titulares, recovered.reservas, jornada + 1);
    } else {
      setPartidoEstado('idle');
      setSubTab('liga');
      toast.success('TEMPORADA FINALIZADA');
    }
  };

  if (!clubFull || ligaEquipos.length === 0) return null;

  const pMatch = fixture[jornada]?.find(p => p.local === clubFull.id || p.visitante === clubFull.id);
  const isMatchEnded = !pMatch || pMatch.jugado;
  const esLocal = pMatch?.local === clubFull.id;
  const rivObj = !pMatch ? null : ligaEquipos.find(e => e.id === (esLocal ? pMatch.visitante : pMatch.local));
  const tablaOrdenada = Object.values(standings).sort((a,b) => b.pts - a.pts || b.dg - a.dg);
  const miPosicion = tablaOrdenada.findIndex(e => e.id === clubFull.id) + 1;
  const miGrl = getMediaPlantilla();

  const TABS = [
    { id: 'central', label: 'CENTRAL' },
    { id: 'plantel', label: 'PLANTILLA' },
    { id: 'calendario', label: 'CALENDARIO' },
    { id: 'liga', label: 'COMPETICIÓN' },
    { id: 'configuracion', label: 'CONFIGURACIÓN' }
  ];

  return (
    <div className="df-career flex flex-col h-screen bg-[#020202] text-white font-sans overflow-hidden relative selection:bg-[#F47A20] selection:text-black">
      
                                  
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-[50vw] h-[100vh] bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03] mix-blend-overlay [mask-image:linear-gradient(to_left,black,transparent)]"></div>
      </div>

                                              
      <header className="df-career-header w-full relative z-40 shrink-0 border-b border-[#1A1A1A] bg-[#050505] shadow-2xl">
        <div className="df-career-header__inner max-w-[1600px] mx-auto px-6 md:px-12 flex flex-col lg:flex-row lg:items-end justify-between gap-6 pt-6 pb-0">
          
          <div className="df-career-header__identity flex items-center gap-6 pb-4">
            <div className="w-16 h-16 bg-[#020202] border border-[#222] flex items-center justify-center p-2 shadow-2xl relative overflow-hidden group">
              {clubFull.img ? <img src={getImg(clubFull.img)} className="w-full h-full object-contain" alt="" /> : <div className="text-white font-black italic">FC</div>}
            </div>
            <div className="flex flex-col">
              <h1 className="text-3xl md:text-5xl font-black uppercase italic tracking-tighter text-white leading-none">{clubFull.name}</h1>
              <span className="text-[#888] font-black text-sm uppercase tracking-widest mt-1">MÁNAGER: {apodo}</span>
            </div>
          </div>

          <nav className="df-career-header__nav flex items-center gap-6 md:gap-12 overflow-x-auto [&::-webkit-scrollbar]:hidden w-full lg:w-auto">
            {TABS.map(tab => {
              const activo = subTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => { if(partidoEstado !== 'simulando') setSubTab(tab.id); }}
                  className={`relative pb-4 font-black uppercase tracking-[0.2em] text-sm md:text-base whitespace-nowrap transition-colors ${activo ? 'text-white' : 'text-[#555] hover:text-white'}`}
                >
                  {tab.label}
                  {activo && (
                    <motion.div layoutId="nav-line" className="absolute bottom-0 left-0 w-full h-[4px] bg-[#F47A20]" />
                  )}
                  {tab.id === 'central' && noticiasSinLeer && !activo && (
                    <span className="absolute top-0 -right-3 w-2 h-2 bg-[#F47A20] rounded-none animate-pulse"></span>
                  )}
                </button>
              );
            })}
          </nav>

          <div className="df-career-header__actions flex flex-wrap items-center gap-4 pb-4">
            <Link to={RUTAS.INICIO} className="df-career-home" aria-label="Regresar al inicio" aria-disabled={recoveryBlocked} onClick={event => { if (recoveryBlocked) event.preventDefault(); }}><ArrowLeft size={16} />Regresar al inicio</Link>
            <button onClick={retry} disabled={isSaving || isDeleting} aria-live="polite" aria-label={isSaving ? 'Guardando carrera' : saveError ? 'Reintentar guardado' : 'Carrera guardada'} title={isSaving ? 'Guardando carrera' : saveError ? 'Reintentar guardado' : 'Carrera guardada'} className={`df-career-save flex items-center gap-2 px-3 py-2 text-[10px] font-black uppercase tracking-widest border transition-colors ${saveError ? "border-red-500/50 text-red-400" : isSaving ? "bg-[#111] border-[#F47A20]/30 text-[#F47A20]" : "bg-transparent border-[#1A1A1A] text-[#888]"}`}>
              <CloudLightning size={14} className={isSaving ? "animate-pulse" : ""} />
              <span>{isSaving ? 'GUARDANDO' : saveError ? 'REINTENTAR GUARDADO' : 'GUARDADO'}</span>
            </button>
                                                                    
            <button disabled={recoveryBlocked} onClick={() => setShowConfirmDimitir(true)} aria-label="Rescindir contrato" title="Rescindir contrato" className="df-career-reset border border-red-900/50 text-red-500 hover:bg-red-600 hover:text-white px-5 py-2 font-black text-[10px] uppercase tracking-widest transition-colors">
              <Trash2 size={15} /><span>RESCINDIR CONTRATO</span>
            </button>
          </div>
        </div>
      </header>

                               
      <main className="df-career-main flex-1 w-full overflow-y-auto custom-scrollbar relative z-10">
        <div className="df-career-content max-w-[1600px] mx-auto w-full p-4 md:p-8 lg:p-12 relative z-20">
          {partidoEstado !== 'jugando' && (subTab === 'central' || subTab === 'plantel' || bebidas.pending) && (
            <section className="df-career-recovery" aria-label="Recuperación de la plantilla">
              <div className="df-career-recovery__identity"><span className="df-career-recovery__icon"><FlaskConical size={24} /></span><div><strong>Bebida THC</strong><p>Recupera al 100% a todo tu plantel.</p>{bebidas.error && <p className="df-career-recovery__error" role="status">{bebidas.error}</p>}</div></div>
              <div className="df-career-recovery__action"><span className="df-career-recovery__count" aria-label={`${bebidas.count ?? 'Consultando'} bebidas disponibles`}>{bebidas.count ?? '—'}</span><button type="button" disabled={bebidas.busy || (!bebidas.pending && bebidas.count !== null && (bebidas.count === 0 || !hasTiredCareerPlayers(titularesMap, reservas)))} onClick={() => { if (bebidas.count === null && !bebidas.pending) void bebidas.refresh(); else void bebidas.consume(); }}>{bebidas.busy ? 'Recuperando…' : bebidas.pending ? 'Confirmar uso' : bebidas.count === null ? 'Consultar' : !hasTiredCareerPlayers(titularesMap, reservas) ? 'Plantel al 100%' : 'Usar bebida'}</button></div>
            </section>
          )}
          <AnimatePresence mode="wait">

            {subTab === 'configuracion' && partidoEstado !== 'jugando' && (
              <motion.section key="configuracion" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="df-menu-settings">
                <p className="df-eyebrow"><Settings2 size={16} />A TU RITMO, EN TU DISPOSITIVO</p>
                <h2>TU CANCHA<span>.</span></h2>
                <p className="df-menu-settings__intro">Conserva el estadio THC o juega con una vista básica para equipos con menos recursos. La simulación y tus decisiones funcionan igual.</p>
                <MatchDisplayOptions display={displayPreferences} onChange={changeDisplayPreferences} />
              </motion.section>
            )}

                                                           
            {subTab === 'central' && partidoEstado === 'idle' && (
              <motion.div key="central" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="df-career-central">
                <section className="df-fixture-card">
                  <header><span>{getNombresLigas(clubFull.liga)}</span><h2>Jornada {jornada + 1}<i>.</i></h2></header>
                  {isMatchEnded ? <p className="df-fixture-finished">Temporada finalizada</p> : <div className="df-fixture-teams">
                    <div>{clubFull.img && <img src={getImg(clubFull.img)} alt="" />}<h3>{clubFull.name}</h3><span>GRL {miGrl}</span></div>
                    <span className="df-fixture-versus">VS</span>
                    <div>{rivObj?.img && <img src={getImg(rivObj.img)} alt="" />}<h3>{rivObj?.name}</h3><span>GRL {rivObj?.grl || '—'}</span></div>
                  </div>}
                  {!isMatchEnded && <button type="button" onClick={() => setSubTab('partido')}>Iniciar encuentro <span aria-hidden="true">-</span></button>}
                </section>
                <div className="df-career-aside">
                  <button type="button" className="df-standing-card" onClick={() => setSubTab('liga')}><span>Tu liga</span><b>#{miPosicion}</b><strong>{standings[clubFull.id]?.pts || 0} puntos</strong><small>Ver clasificación ↗</small></button>
                  <button type="button" className="df-news-card" onClick={() => setSubTab('noticias')}><span>Diario T.H.C.</span><h3>{noticiasActuales[0]?.titular || 'Una nueva jornada por delante'}</h3><small>Leer noticias ↗</small></button>
                </div>
              </motion.div>
            )}

            {subTab === 'partido' && partidoEstado === 'idle' && (
              <motion.section key="partido" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="df-match-ticket" aria-labelledby="df-ticket-title">
                <header><button type="button" onClick={() => setSubTab('central')}><ArrowLeft size={16} />Regresar</button><span>Jornada {jornada + 1}</span></header>
                <div className="df-match-ticket__heading"><p>{getNombresLigas(clubFull.liga)}</p><h2 id="df-ticket-title">Todo listo<i>.</i></h2></div>
                {isMatchEnded ? <p>Temporada finalizada</p> : <>
                  <div className="df-match-ticket__teams">
                    <div>{clubFull.img && <img src={getImg(clubFull.img)} alt="" />}<h3>{clubFull.name}</h3><span>{esLocal ? 'Local' : 'Visitante'} · GRL {miGrl}</span></div>
                    <strong>VS</strong>
                    <div>{rivObj?.img && <img src={getImg(rivObj.img)} alt="" />}<h3>{rivObj?.name}</h3><span>{esLocal ? 'Visitante' : 'Local'} · GRL {rivObj?.grl || '—'}</span></div>
                  </div>
                  <div className="df-match-ticket__details"><span>{tactica.split(' ')[0]}<small>Tu formación</small></span><span>{Math.round(Object.values(titularesMap).filter(Boolean).reduce((sum, player) => sum + careerEnergy(player.energia), 0) / 11)}%<small>Energía del once</small></span><span>2 × 90 s<small>Juego activo</small></span></div>
                  <footer><button type="button" className="df-ticket-adjust" onClick={() => setSubTab('plantel')}>Ajustar alineación</button><button type="button" disabled={recoveryBlocked || Object.values(titularesMap).filter(Boolean).length !== 11} onClick={() => setPartidoEstado('jugando')}>Confirmar encuentro <span aria-hidden="true">→</span></button></footer>
                </>}
              </motion.section>
            )}

            {(subTab === 'central' || subTab === 'partido') && partidoEstado === 'post' && (
              <motion.div key="post" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="df-career-post h-full flex items-start justify-center absolute inset-0 z-50 bg-[#080808]/95 p-4 md:p-8 overflow-y-auto">
                <MatchResultCard miClub={clubFull} rival={rivObj} score={estadisticasPartido?.score || (esLocal ? [pMatch?.gl || 0, pMatch?.gv || 0] : [pMatch?.gv || 0, pMatch?.gl || 0])} summary={estadisticasPartido?.summary} getImg={getImg} onContinue={avanzarSiguienteFecha} busy={isSaving || recoveryBlocked} error={saveError ? 'El resultado aún no se guardó. Pulsa Reintentar guardado antes de avanzar.' : ''} />
              </motion.div>
            )}

                                               
            {subTab === 'plantel' && partidoEstado !== 'jugando' && (
              <motion.div inert={recoveryBlocked} key="plantel" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <PlantelDF titularesMap={titularesMap} setTitularesMap={setTitularesMap} reservas={reservas} setReservas={setReservas} tactica={tactica} setTactica={setTactica} getMediaPlantilla={getMediaPlantilla} />
              </motion.div>
            )}

            {subTab === 'calendario' && partidoEstado !== 'jugando' && (
              <motion.div key="calendario" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                 <FixtureDF fixture={fixture} jornadaActual={jornada} ligaEquipos={ligaEquipos} club={clubFull} nombreLiga={getNombresLigas(clubFull.liga)} getImg={getImg} />
              </motion.div>
            )}

            {subTab === 'liga' && partidoEstado !== 'jugando' && (
              <motion.div key="liga" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <TablaDF standings={standings} club={clubFull} jornada={jornada} totalJornadas={fixture.length} nombreLiga={getNombresLigas(clubFull.liga)} getImg={getImg} />
              </motion.div>
            )}
            
            {subTab === 'noticias' && partidoEstado !== 'jugando' && (
              <motion.div key="noticias" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <NoticiasDF noticias={noticiasActuales} getImg={getImg} />
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </main>

                                   
      <AnimatePresence>
        {partidoEstado === 'jugando' && (
          <JugarDF 
            miClub={clubFull} 
            rival={jornada === 0 ? { ...rivObj, titulares: rivObj.titulares.map(player => ({ ...player, energia: 100 })), suplentes: (rivObj.suplentes || []).map(player => ({ ...player, energia: 100 })) } : rivObj}
            esLocal={esLocal}
            titularesMap={titularesMap}
            reservas={reservas}
            displayPreferences={displayPreferences}
            onDisplayChange={changeDisplayPreferences}
            bebidaCount={bebidas.count}
            bebidaBusy={bebidas.busy}
            bebidaPending={bebidas.pending}
            bebidaError={bebidas.error}
            onUseBebida={bebidas.consume}
            tactica={tactica}
            apodo={apodo}
            getImg={getImg}
            onTerminar={(misG, rivG, tracker, matchSummary) => procesarFinJornada(misG, rivG, tracker, esLocal, matchSummary)}
          />
        )}
      </AnimatePresence>

                                                                  
      <AnimatePresence>
        {showConfirmDimitir && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[9999999] bg-[#020202]/95 backdrop-blur-md flex flex-col items-center justify-center p-6">
             <div className="bg-[#050505] border-[3px] border-[#1A1A1A] p-10 md:p-16 flex flex-col items-center shadow-2xl relative overflow-hidden max-w-2xl w-full text-center">
                <div className="w-20 h-20 bg-red-950/30 border border-red-900 flex items-center justify-center rounded-full mb-8">
                  <Trash2 size={32} className="text-red-500" />
                </div>
                <h2 className="font-black text-4xl md:text-5xl uppercase tracking-tighter text-white italic mb-4">¿DIMITIR DE TU CARGO?</h2>
                <p className="text-[#888] font-bold text-sm md:text-base uppercase tracking-widest mb-10">Si abandonas la institución, perderás absolutamente todo tu progreso en la temporada actual. Esta acción no se puede deshacer.</p>
                
                <div className="flex flex-col md:flex-row w-full gap-4">
                   <button onClick={() => setShowConfirmDimitir(false)} disabled={isDeleting} className="flex-1 bg-[#111] hover:bg-[#222] text-[#888] hover:text-white border border-[#333] py-5 font-black uppercase text-sm tracking-widest transition-colors">
                     CANCELAR
                   </button>
                   <button onClick={renunciarCargo} disabled={isDeleting} className="flex-1 bg-red-600 hover:bg-white hover:text-red-600 text-white py-5 font-black uppercase text-sm tracking-widest transition-colors">
                     {isDeleting ? 'FINALIZANDO...' : 'CONFIRMAR Y SALIR'}
                   </button>
                </div>
             </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
