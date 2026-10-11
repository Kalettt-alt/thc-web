import { ArrowLeft } from 'lucide-react';
import './HomeUT.css';

export default function EmptySectionUT({ section, onVolver }) {
  const name = section === 'camino' ? 'Camino THC' : 'Mercado';
  return <section className="ut-empty-section" role="dialog" aria-modal="true" aria-labelledby="ut-empty-title" onKeyDown={event=>{if(event.key==='Escape')onVolver();}}>
    <button autoFocus className="ut-empty-section__back" onClick={onVolver}><ArrowLeft size={18}/> Regresar</button>
    <main><span>THC ULTIMATE TEAM</span><h1 id="ut-empty-title">{name}<span>.</span></h1><p>Próximamente</p></main>
  </section>;
}
