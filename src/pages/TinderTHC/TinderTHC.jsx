import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, ArrowUpRight, Heart, Zap } from 'lucide-react';
import { RUTAS } from '../../utils/rutas';
import './TinderTHC.css';

function ProfileSilhouette() {
  return (
    <svg viewBox="0 0 220 240" fill="none" aria-hidden="true">
      <circle cx="110" cy="85" r="44" fill="currentColor" />
      <path d="M26 222c0-54 34-82 84-82s84 28 84 82H26Z" fill="currentColor" />
    </svg>
  );
}

export default function TinderTHC() {
  const reducedMotion = useReducedMotion();

  return (
    <div className="tinder-thc-page">
      <Link className="tinder-thc-back" to={RUTAS.INICIO}>
        <ArrowLeft size={19} aria-hidden="true" /> Volver al inicio
      </Link>

      <section className="tinder-thc-stage" aria-labelledby="tinder-thc-title">
        <motion.div
          className="tinder-thc-copy"
          initial={reducedMotion ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <span className="tinder-thc-status"><Zap size={17} aria-hidden="true" /> Próximamente</span>
          <h1 id="tinder-thc-title">TINDER <span>THC.</span></h1>
          <h2>Otra forma de conectar.</h2>
          <p>La comunidad también se juega fuera de la cancha. Estamos preparando un nuevo espacio para conocer a quienes comparten tu pasión.</p>
          <Link className="tinder-thc-return" to={RUTAS.INICIO}>
            Mientras tanto, explora THC <ArrowUpRight size={22} aria-hidden="true" />
          </Link>
        </motion.div>

        <div className="tinder-thc-art" aria-hidden="true">
          <div className="tinder-thc-orbit" />
          <div className="tinder-thc-profile tinder-thc-profile-back">
            <span>POR DESCUBRIR</span>
            <ProfileSilhouette />
            <div className="tinder-thc-profile-line" />
            <div className="tinder-thc-profile-line tinder-thc-profile-line-short" />
          </div>
          <div className="tinder-thc-profile tinder-thc-profile-front">
            <span>TU PERFIL</span>
            <ProfileSilhouette />
            <div className="tinder-thc-profile-line" />
            <div className="tinder-thc-profile-line tinder-thc-profile-line-short" />
          </div>
          <div className="tinder-thc-heart"><Heart size={35} fill="currentColor" strokeWidth={1.7} /></div>
          <span className="tinder-thc-art-caption">EL TRUENO NOS CONECTA.</span>
        </div>
      </section>
    </div>
  );
}
