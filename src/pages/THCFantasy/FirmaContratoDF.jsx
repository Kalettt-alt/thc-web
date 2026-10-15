import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, PenLine } from 'lucide-react';
import { clubCrestDF } from './clubCrestDF';
import { createContractSigning } from './introTimelineDF';
import './FantasyEntry.css';

export default function FirmaContratoDF({ club, apodo, onFirmado }) {
  const [phase, setPhase] = useState('offered');
  const signing = useRef(null);
  const callback = useRef(onFirmado);
  useEffect(() => { callback.current = onFirmado; }, [onFirmado]);
  useEffect(() => {
    const timer = setTimeout(() => setPhase('ready'), 1650);
    return () => { clearTimeout(timer); signing.current?.cancel(); };
  }, []);

  const sign = () => {
    if (phase !== 'ready' || signing.current) return;
    setPhase('signing');
    signing.current = createContractSigning({ onStamp: () => setPhase('signed'), onTransition: () => setPhase('entering'), onComplete: () => callback.current() });
  };

  return <main className={`df-contract df-contract-${phase}`} data-motion="on">
    <header className="df-contract-header"><span>THC / DIRECCIÓN DEPORTIVA</span><span>{club.name}</span></header>
    <section className="df-contract-scene">
      <div className="df-office-window" aria-hidden="true"><span /><i /><i /></div>
      <div className="df-boss" aria-hidden="true"><div className="df-boss-chair" /><div className="df-boss-head" /><div className="df-boss-neck" /><div className="df-boss-body"><i className="df-boss-shirt" /><i className="df-boss-tie" /></div><div className="df-boss-arm df-boss-arm-left"><i /></div><div className="df-boss-arm df-boss-arm-right"><i /></div></div>
      <div className="df-boss-dialogue"><span>LA DIRECTIVA</span><p>{phase === 'offered' ? `Toma asiento, ${apodo}.` : ['signed', 'entering'].includes(phase) ? 'Bienvenido al club, míster.' : 'El equipo necesita un nuevo rumbo. Confiamos en ti.'}</p></div>
      <div className="df-office-desk" aria-hidden="true"><i className="df-desk-folder" /><i className="df-desk-cup" /></div>
      <article className="df-contract-paper" aria-labelledby="df-contract-title">
        <header><img src={clubCrestDF(club)} alt="" /><div><span>{club.name}</span><strong>Dirección deportiva</strong></div><span className="df-paper-number">01</span></header>
        <span className="df-paper-label">TEMPORADA THC / NOMBRAMIENTO</span><h1 id="df-contract-title">Un club.<br />Un nuevo comienzo.</h1>
        <p>La directiva de <strong>{club.name}</strong> te ofrece el puesto de director técnico del primer equipo.</p>
        <div className="df-contract-manager"><span>NUEVO DIRECTOR TÉCNICO</span><strong>{apodo}</strong></div>
        <dl><div><dt>Plantilla</dt><dd>{club.grl}<small> GRL</small></dd></div><div><dt>Presupuesto inicial</dt><dd>${(club.presupuesto / 1000000).toFixed(0)}<small> M</small></dd></div></dl>
        <div className="df-contract-signatures"><div><svg viewBox="0 0 120 42" aria-hidden="true"><path d="M8 29Q18 3 30 24T52 18T79 24L111 12M17 36L99 29" /></svg><span>La directiva</span></div><div className="df-manager-signature">
          {['signing', 'signed', 'entering'].includes(phase) && <svg viewBox="0 0 200 75" aria-label="Firma del mánager"><motion.path d="M14 53Q31 2 46 35T71 29Q81 10 82 48Q96 6 109 35T139 31L177 23M25 63L173 52" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.05, ease: 'easeInOut' }} /></svg>}
          {phase === 'ready' && <span className="df-sign-hint">Tu firma va aquí</span>}<span>El director técnico</span>
        </div></div>
        <button type="button" className="df-sign-button" onClick={sign} disabled={phase !== 'ready'}>{phase === 'offered' ? 'Recibiendo contrato…' : phase === 'signing' ? 'Firmando…' : ['signed', 'entering'].includes(phase) ? 'Contrato firmado' : <><PenLine size={17} /><span>Firmar contrato</span><ArrowRight size={21} /></>}</button>
        {['signed', 'entering'].includes(phase) && <div className="df-contract-stamp" aria-hidden="true"><span>OFICIAL</span><small>THC FANTASY</small></div>}
      </article>
      <div className="df-contract-pen" aria-hidden="true"><i /></div>
    </section>
    {phase === 'entering' && <div className="df-contract-career-bridge" role="status" aria-label="Entrando a tu carrera"><i /><div><img src={clubCrestDF(club)} alt="" /><strong>{club.name}</strong></div></div>}
  </main>;
}
