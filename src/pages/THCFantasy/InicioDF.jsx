import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, X } from 'lucide-react';
import logoTHC from './LogoTHC.png';
import { FantasyStadium } from './FantasyStadium';
import './FantasyEntry.css';

export default function InicioDF({ onComenzar }) {
  const [mostrarTC, setMostrarTC] = useState(false);
  const [noMostrarMas, setNoMostrarMas] = useState(false);
  const agreement = useRef(null);
  const starting = useRef(false);
  const enter = useCallback(() => {
    if (starting.current) return;
    starting.current = true;
    onComenzar();
  }, [onComenzar]);
  const comenzar = useCallback(() => {
    let accepted = false;
    try { accepted = localStorage.getItem('thcFantasyTCAccepted') === 'true'; } catch { /* El aviso funciona sin almacenamiento local. */ }
    if (accepted) enter();
    else setMostrarTC(true);
  }, [enter]);
  useEffect(() => {
    if (mostrarTC) return;
    const startFromKeyboard = event => {
      if (event.repeat || event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || ['Tab', 'Escape', 'Shift', 'Control', 'Alt', 'Meta'].includes(event.key)) return;
      if (event.target instanceof Element && event.target.closest('a, button, input, textarea, select')) return;
      event.preventDefault();
      comenzar();
    };
    window.addEventListener('keydown', startFromKeyboard);
    return () => window.removeEventListener('keydown', startFromKeyboard);
  }, [comenzar, mostrarTC]);
  useEffect(() => {
    if (!mostrarTC) return;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKey = event => {
      if (event.key === 'Escape') setMostrarTC(false);
      if (event.key !== 'Tab') return;
      const controls = agreement.current?.querySelectorAll('button, input');
      if (!controls?.length) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('keydown', handleKey);
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [mostrarTC]);
  const aceptar = () => {
    if (noMostrarMas) {
      try { localStorage.setItem('thcFantasyTCAccepted', 'true'); } catch { /* El aviso volverá a mostrarse. */ }
    }
    setMostrarTC(false);
    enter();
  };
  return <div className="df-entry df-title-screen" data-motion="on">
    <FantasyStadium id="df-title-stadium" />
    <div className="df-title-vignette" aria-hidden="true" />
    <header className="df-title-header" inert={mostrarTC ? true : undefined}>
      <Link to="/" className="df-back"><ArrowLeft size={16} /> Regresar</Link>
      <img src={logoTHC} alt="THC" />
    </header>
    <main className="df-title-main" inert={mostrarTC ? true : undefined}>
      <h1><span>THC:</span><strong>DT FANTASY</strong></h1>
      <button type="button" className="df-title-start" onClick={comenzar}>Presiona cualquier tecla para iniciar</button>
    </main>
    <AnimatePresence>{mostrarTC && <motion.div className="df-agreement-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.section ref={agreement} role="dialog" aria-modal="true" aria-labelledby="df-agreement-title" className="df-agreement" initial={{ y: 25 }} animate={{ y: 0 }}>
        <button type="button" className="df-agreement-close" onClick={() => setMostrarTC(false)} aria-label="Cerrar aviso"><X size={20} /></button>
        <span className="df-eyebrow">Antes de empezar</span>
        <h2 id="df-agreement-title">Tu carrera en THC.</h2>
        <p>DT Fantasy es una simulación para la comunidad. Los resultados y el rendimiento se calculan dentro del juego y pueden diferir de los partidos reales.</p>
        <p>Los nombres y escudos identifican a los clubes representados. Tu progreso se guarda en THC; manipular los datos para obtener ventajas puede ocasionar la eliminación de la partida.</p>
        <label><input type="checkbox" checked={noMostrarMas} onChange={event => setNoMostrarMas(event.target.checked)} /> No mostrar este aviso de nuevo</label>
        <button type="button" className="df-start" onClick={aceptar} autoFocus><span>Aceptar y entrar</span><ArrowRight size={23} /></button>
      </motion.section>
    </motion.div>}</AnimatePresence>
  </div>;
}
