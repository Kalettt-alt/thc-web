import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import './ComingSoon.css';

export default function ComingSoon({ name, to, onBack, overlay = false }) {
  const back = useRef(null);
  useEffect(() => { if (overlay) back.current?.focus(); }, [overlay]);
  const content = <><ArrowLeft size={18}/> Regresar</>;
  return <section className={`thc-coming-soon ${overlay ? 'thc-coming-soon--overlay' : ''}`} role={overlay ? 'dialog' : undefined} aria-modal={overlay ? true : undefined} aria-label={name} onKeyDown={event=>{if(event.key==='Escape'&&onBack)onBack();}}>
    <div className="thc-coming-soon__top">{to ? <Link ref={back} to={to}>{content}</Link> : <button ref={back} type="button" onClick={onBack}>{content}</button>}<span>THC</span></div>
    <div className="thc-coming-soon__content"><span>{name}</span><h1>Pronto<span>...</span></h1><p>En desarrollo.</p></div>
  </section>;
}
