import { useEffect, useRef, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import logoTHC from './LogoTHC.png';
import { TODOS_LOS_EQUIPOS } from './equiposFantasy';
import { clubCrestDF } from './clubCrestDF';
import { FantasyCoach, FantasyStadium } from './FantasyStadium';
import { createIntroTimeline, INTRO_DURATION_MS, INTRO_SCENE_TIMES_MS } from './introTimelineDF.js';
import './FantasyEntry.css';

const NODES = [[12, 50], [31, 18], [29, 39], [29, 61], [31, 82], [49, 29], [47, 50], [49, 71], [70, 23], [78, 50], [70, 77]];
const INTRO_CLUBS = ['river', 'boca', 'barcelona', 'realmadrid', 'alianza', 'flamengo'].map(id => TODOS_LOS_EQUIPOS.find(club => club.id === id)).filter(Boolean);

function CinematicPitch() {
  return <div className="df-cinema-pitch" aria-hidden="true">
    <svg viewBox="0 0 1200 680"><rect x="35" y="35" width="1130" height="610" /><path d="M600 35V645M35 185H214V495H35M1165 185H986V495H1165M35 266H107V414H35M1165 266H1093V414H1165" /><circle cx="600" cy="340" r="94" /><circle cx="600" cy="340" r="3" /><path d="M214 270Q300 340 214 410M986 270Q900 340 986 410" /></svg>
    {[0, 1].flatMap(team => NODES.map(([x, y], i) => <i key={`${team}-${i}`} className={team ? 'df-cinema-away' : 'df-cinema-home'} style={{ '--i': i, left: `${team ? 100 - x : x}%`, top: `${y}%` }}><span>{i + 1}</span></i>))}
    <b className="df-cinema-ball" /><div className="df-cinema-goal-net" />
  </div>;
}

export default function IntroDF({ onFinalizar }) {
  const [phase, setPhase] = useState(0);
  const controller = useRef(null);
  const callback = useRef(onFinalizar);
  useEffect(() => { callback.current = onFinalizar; }, [onFinalizar]);
  useEffect(() => {
    const timeline = createIntroTimeline({ onPhase: setPhase, onComplete: () => callback.current() });
    controller.current = timeline;
    return timeline.cancel;
  }, []);
  const shotDuration = (INTRO_SCENE_TIMES_MS[phase + 1] || INTRO_DURATION_MS) - INTRO_SCENE_TIMES_MS[phase];

  return <div className={`df-film df-cinema df-cinema-phase-${phase}`} data-motion="on" role="region" aria-label="Introducción cinematográfica de DT Fantasy">
    <div className="df-film-grain" aria-hidden="true" />
    <div key={phase} className="df-cinema-shot" style={{ '--shot-duration': `${shotDuration}ms` }}>
      {phase === 0 && <section className="df-cinema-tunnel-scene" aria-label="El director técnico sale del túnel hacia el estadio">
        <FantasyStadium id="df-intro-tunnel" />
        <div className="df-cinema-tunnel" aria-hidden="true">{Array.from({ length: 7 }, (_, i) => <i key={i} style={{ '--i': i }} />)}<span /></div>
        <FantasyCoach className="df-cinema-coach-walking" />
        <div className="df-cinema-caption"><span>THC PRESENTA</span><strong>DESDE EL BANCO.</strong></div>
      </section>}
      {phase === 1 && <section className="df-cinema-colours-scene" aria-label="Los colores y escudos de los clubes en el estadio">
        <FantasyStadium id="df-intro-colours" />
        <div className="df-cinema-flags" aria-hidden="true">{INTRO_CLUBS.map((club, i) => <div key={club.id} style={{ '--i': i }}><img src={clubCrestDF(club)} alt="" /></div>)}</div>
        <div className="df-cinema-crest-close" aria-hidden="true"><img src={logoTHC} alt="" /></div>
        <div className="df-cinema-caption"><strong>UN ESCUDO.</strong></div>
      </section>}
      {phase === 2 && <section className="df-cinema-plan-scene" aria-label="El director técnico dibuja una jugada en su pizarra">
        <div className="df-cinema-desk" aria-hidden="true"><i className="df-cinema-notebook" /><i className="df-cinema-whistle" /><div className="df-cinema-board">
          <svg viewBox="0 0 1000 620"><rect x="35" y="35" width="930" height="550" /><path d="M500 35V585M35 165H188V455H35M965 165H812V455H965" /><circle cx="500" cy="310" r="93" /><path className="df-cinema-drawn-route" d="M290 378L490 440L700 477Q730 360 780 310L930 310M904 285L930 310L904 335" /></svg>
          {NODES.map(([x, y], i) => <i key={i} style={{ left: `${x}%`, top: `${y}%`, '--i': i }}>{i + 1}</i>)}
          <span>4—3—3</span></div><div className="df-cinema-drawing-hand"><i /></div></div>
        <div className="df-cinema-caption"><strong>UNA IDEA.</strong></div>
      </section>}
      {phase === 3 && <section className="df-cinema-action-scene" aria-label="Una jugada a cámara rápida termina en un disparo a portería">
        <div className="df-cinema-broadcast" aria-label="Partido de demostración THC"><img src={logoTHC} alt="THC" /><span>0 — 0</span><img src={logoTHC} alt="THC" /><i>78:42</i></div>
        <CinematicPitch />
        <div className="df-cinema-touchline" aria-hidden="true"><FantasyCoach className="df-cinema-coach-directing" /><i /><i /><i /></div>
        <div className="df-cinema-caption"><strong>EL MOMENTO.</strong></div>
      </section>}
      {phase === 4 && <section className="df-cinema-celebration-scene" aria-label="El director técnico celebra el gol con su equipo">
        <FantasyStadium id="df-intro-celebration" />
        <FantasyCoach className="df-cinema-coach-celebrating" />
        <div className="df-cinema-celebration-score" aria-hidden="true"><img src={logoTHC} alt="" /><strong>2 — 1</strong><img src={logoTHC} alt="" /></div>
        <div className="df-cinema-confetti" aria-hidden="true">{Array.from({ length: 24 }, (_, i) => <i key={i} style={{ '--i': i }} />)}</div>
        <div className="df-cinema-caption"><strong>ES TU HISTORIA.</strong></div>
      </section>}
      {phase === 5 && <section className="df-cinema-finale-scene" aria-label="THC DT Fantasy">
        <FantasyStadium id="df-intro-finale" />
        <div className="df-cinema-final-title"><img src={logoTHC} alt="" /><h1><span>THC:</span><strong>DT FANTASY</strong></h1></div>
        <span className="df-cinema-final-line" aria-hidden="true" />
      </section>}
    </div>
    <div key={`cut-${phase}`} className={`df-cinema-cut ${phase % 2 ? 'df-cinema-cut-reverse' : ''}`} aria-hidden="true"><i /></div>
    <footer className="df-film-footer"><span>THC / DT FANTASY</span><button type="button" onClick={() => controller.current?.finish()}>Saltar intro <ArrowRight size={18} /></button></footer>
    <div className="df-film-progress" style={{ '--duration': `${INTRO_DURATION_MS}ms` }} aria-hidden="true" />
  </div>;
}
