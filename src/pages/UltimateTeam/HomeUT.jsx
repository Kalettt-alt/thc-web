import { motion, useReducedMotion } from 'framer-motion';
import { ArrowUpRight, ArrowRight } from 'lucide-react';
import PlayerCardUT from './PlayerCardUT';
import ClubIdentityLogoUT from './ClubIdentityLogoUT';
import SquadPitchUT from './SquadPitchUT';
import { effectiveSquadOverall } from './squadUT';
import './HomeUT.css';

export default function HomeUT({ onSelect, club, squad }) {
  const reduced = useReducedMotion();
  const stars = [...(squad?.titulares || [])].filter(Boolean).sort((a,b) => b.grl - a.grl).slice(0,3);
  const rating = squad?.titulares?.length ? effectiveSquadOverall(squad) : null;
  const enter = index => reduced ? {} : { initial:{opacity:0,y:20}, animate:{opacity:1,y:0}, transition:{delay:index*.07,duration:.45} };
  return <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="ut-home">
    <header className="ut-home__club-header">
      <div className="ut-home__club">{club && <ClubIdentityLogoUT club={club}/>}<div><span>THC ULTIMATE TEAM</span><h2>{club?.nombre || 'Mi club'}</h2></div></div>
      <span className="ut-home__overall"><b>{rating ?? '—'}</b> GRL</span>
    </header>
    <section className="ut-home__primary" aria-label="Tu Ultimate Team">
      <motion.button {...enter(0)} className="ut-home__tile ut-home__tile--team" onClick={()=>onSelect('equipo')}>
        <span className="ut-home__tile-head"><span>01 / PLANTILLA</span><ArrowUpRight size={24}/></span>
        <span className="ut-home__card-stack" aria-hidden="true">{[0,1,2].map(index=><span className={`ut-home__hero-card ut-home__hero-card--${index}`} key={stars[index]?.id || index}><PlayerCardUT player={stars[index]} emptyPosition={['LW','ST','RW'][index]}/></span>)}</span>
        <span className="ut-home__tile-bottom"><strong>My Team<span>.</span></strong><span>Tu once, a tu manera.</span></span>
      </motion.button>
      <motion.button {...enter(1)} className="ut-home__tile ut-home__tile--play" onClick={()=>onSelect('jugar')}>
        <span className="ut-home__tile-head"><span>02 / PARTIDO</span><ArrowUpRight size={24}/></span>
        <span className="ut-home__play-art" aria-hidden="true"><SquadPitchUT/><span className="ut-home__match-clock">03:00</span><span className="ut-home__play-ball"/><span className="ut-home__play-mark">VS</span></span>
        <span className="ut-home__tile-bottom"><strong>Jugar<span>.</span></strong><span>Online / Offline</span></span>
      </motion.button>
      <motion.button {...enter(2)} className="ut-home__tile ut-home__tile--journey" onClick={()=>onSelect('camino')}>
        <span className="ut-home__tile-head"><span>03 / CAMINO THC</span><ArrowUpRight size={24}/></span>
        <span className="ut-home__journey-art" aria-hidden="true"><svg viewBox="0 0 260 230" fill="none"><path d="M15 185H76C106 185 114 157 89 138L73 127C48 108 61 82 91 82H162C191 82 201 58 185 38"/><circle cx="15" cy="185" r="6"/><path d="m169 40 18-10 11 18"/></svg><b>THC</b></span>
        <span className="ut-home__tile-bottom"><strong>Camino<br/>THC<span>.</span></strong><span>Próximamente</span></span>
      </motion.button>
    </section>
    <section className="ut-home__secondary" aria-label="Club">
      <motion.button {...enter(3)} className="ut-home__small-tile ut-home__small-tile--packs" onClick={()=>onSelect('sobres')}><span className="ut-home__mini-pack" aria-hidden="true"><b>UT</b></span><span><strong>Sobres</strong><span>La próxima incorporación.</span></span><ArrowUpRight size={24}/></motion.button>
      <motion.button {...enter(4)} className="ut-home__small-tile" onClick={()=>onSelect('mercado')}><span><strong>Mercado</strong><span>Próximamente</span></span><ArrowUpRight size={24}/></motion.button>
    </section>
    <footer className="ut-home__bottom"><button onClick={()=>onSelect('entrenamiento')}>Entrenamiento <ArrowRight size={17}/></button><button onClick={()=>onSelect('tienda')}>Ver cartas <ArrowRight size={17}/></button></footer>
  </motion.div>;
}
