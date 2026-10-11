import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, MoveUpRight, RotateCcw, Zap } from 'lucide-react';
import { motion, MotionConfig } from 'framer-motion';
import { RUTAS } from '../../utils/rutas';
import { useHomeMotion } from '../../utils/homeMotion';
import FooterLetters from './FooterLetters';
import './Footer.css';

const LINKS = [
  { title: 'A LA CANCHA', links: [['DT Fantasy', RUTAS.FANTASY], ['Ultimate Team', RUTAS.ULTIMATE_TEAM], ['Álbum virtual', RUTAS.ALBUM]] },
  { title: 'LA COMUNIDAD', links: [['Foro oficial', RUTAS.FORO], ['Muro THC', RUTAS.MURO], ['Tu perfil', RUTAS.PERFIL], ['Tinder THC', RUTAS.TINDER]] },
  { title: 'EXPLORA THC', links: [['Rankings', RUTAS.RANKINGS], ['Tierlist', RUTAS.TIER], ['Reglamento', RUTAS.REGLAMENTO]] },
];

export default function Footer() {
  const { motionEnabled } = useHomeMotion();
  const [resetSignal, setResetSignal] = useState(0);

  return <MotionConfig reducedMotion={motionEnabled ? 'never' : 'always'}>
    <footer className="thc-footer" data-motion={motionEnabled ? 'on' : 'off'}>
      <div className="thc-footer-playground-heading">
        <p><Zap size={18} aria-hidden="true" /> EL TRUENO NO TERMINA AQUÍ.</p>
        <button type="button" onClick={() => setResetSignal(value => value + 1)} disabled={!motionEnabled}><RotateCcw size={17} aria-hidden="true" /> Rearmar letras</button>
      </div>
      <FooterLetters enabled={motionEnabled} resetSignal={resetSignal} />
      <div className="thc-footer-playground-caption">
        <span>{motionEnabled ? 'Arrastra las letras. Deja tu huella.' : 'Tu comunidad. Tu cancha. Tu THC.'}</span>
        <p>{motionEnabled ? 'También puedes moverlas con las flechas y soltarlas con Enter.' : 'Activa las animaciones en el menú para jugar con las letras.'}</p>
      </div>
      <div className="thc-footer-main">
        <motion.div className="thc-footer-brand" initial={motionEnabled ? { opacity: .4, y: 24 } : false} whileInView={{ opacity: 1, y: 0 }} viewport={{ amount: .15, once: false }} transition={{ duration: motionEnabled ? .45 : 0 }}>
          <Link to={RUTAS.INICIO} aria-label="THC, ir al inicio"><img src="/imagenes/LogoTHC.png" alt="" width="72" height="72" loading="lazy" /><span>THC<small>TRUENO HAXBALL COMMUNITY</small></span></Link>
          <p>Del primer partido al último mensaje. Este lugar también es tuyo.</p>
          <div className="thc-footer-socials"><a href="https://discord.gg/g28URX7db8" target="_blank" rel="noopener noreferrer">Discord <ArrowUpRight size={17} aria-hidden="true" /></a><a href="https://www.tiktok.com/@truenohaxballcomm" target="_blank" rel="noopener noreferrer">TikTok <ArrowUpRight size={17} aria-hidden="true" /></a></div>
        </motion.div>
        <nav className="thc-footer-nav" aria-label="Enlaces del pie de página">{LINKS.map(({ title, links }, index) => <motion.div key={title} initial={motionEnabled ? { opacity: .4, y: 24 } : false} whileInView={{ opacity: 1, y: 0 }} viewport={{ amount: .15, once: false }} transition={{ duration: motionEnabled ? .4 : 0, delay: motionEnabled ? index * .08 : 0 }}><h2>{title}</h2>{links.map(([label, href]) => <Link key={label} to={href}>{label}<MoveUpRight size={15} aria-hidden="true" /></Link>)}</motion.div>)}</nav>
      </div>
      <div className="thc-footer-bottom"><span>© {new Date().getFullYear()} Trueno Haxball Community.</span><span>HECHO POR Y PARA LA COMUNIDAD. <Zap size={14} aria-hidden="true" /></span><a href="#home-title">Volver arriba <ArrowUpRight size={17} aria-hidden="true" /></a></div>
    </footer>
  </MotionConfig>;
}
