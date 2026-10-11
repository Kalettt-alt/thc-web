import { motion, useReducedMotion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { RUTAS } from '../../utils/rutas';
import { ArrowLeft } from 'lucide-react';
import { useHomeMotion } from '../../utils/homeMotion';
import kaletProfile from './kaletProfile.jpg';
import logoTHC from './LogoTHC.png';
import './Reglamento.css';

const MENSAJE_CREADOR =
  "Toda la arquitectura, diseño de interfaces, conexión de bases de datos y la lógica de esta plataforma fue pensada, diseñada y programada desde cero. Mi objetivo fue crear una página divertida y fácil para nuestra comunidad, sin depender del discord o solamente entrar al host.";

const MENSAJE_COMUNIDAD =
  "Esta comunidad no sería nada sin ustedes, los eventos creados, la unión de jugadores y como forman parte del día al día de esta maravillosa comunidad. Todo el esfuerzo y las madrugadas de programación son para ustedes, para demostrar que somos la comunidad más unida de todo Haxball. Disfruten la página tal como yo me divertí creándola <3.";

const MENSAJE_FINAL =
  "TODOS LOS DERECHOS RESERVADOS A SPAWN Y AL AMOR QUE LE TENGO A SAI Y PESUTI";

const REGLAS = [
  {
    id: "01",
    titulo: "Respeto Absoluto",
    desc: "No se tolerará el acoso, la discriminación, ni los insultos graves hacia otros miembros de la comunidad en ninguna sección de la plataforma. El bardo es válido si es parte del juego, pero no cruces la línea.",
  },
  {
    id: "02",
    titulo: "Cero Contenido Explícito",
    desc: "Está estrictamente prohibido subir imágenes explícitas, Gore, NSFW o material ilegal al Muro, a las Tier Lists o en las fotos de perfil. Mantén el contenido apto para la comunidad.",
  },
  {
    id: "03",
    titulo: "Uso del Foro y Muro",
    desc: "Las herramientas están diseñadas para el bardo sano, debatir y el entretenimiento. El contenido subido es responsabilidad directa de quien lo publica. Si subes algo que rompe el servidor, asume las consecuencias.",
  },
  {
    id: "04",
    titulo: "Prohibido los Exploits",
    desc: "Intentar romper la página, abusar de bugs, inyectar código, hacer spam masivo o saturar la base de datos resultará en baneo permanente de IP de todas las plataformas de THC.",
  }
];

export default function Reglamento() {
  const reducedMotion = useReducedMotion();
  const { motionEnabled } = useHomeMotion();
  const animated = motionEnabled && !reducedMotion;
  const enter = animated ? { opacity: 0, y: 20 } : false;

  return (
    <main className="reglamento-page" data-motion={animated ? 'on' : 'off'}>
      <div className="reglamento-shell">
        <Link to={RUTAS.INICIO} className="reglamento-back"><ArrowLeft size={18} aria-hidden="true" /> Regresar</Link>
        <motion.header className="reglamento-hero" initial={enter} animate={{ opacity: 1, y: 0 }} transition={{ duration: animated ? .5 : 0 }}>
          <p className="reglamento-eyebrow">Nuestra forma de jugar juntos.</p>
          <h1>REGLAS <span>THC.</span></h1>
          <div className="reglamento-intro"><p>Dentro y fuera de la cancha, el respeto va primero.</p><img src={logoTHC} alt="Trueno Haxball Community" width="96" height="96" /></div>
        </motion.header>

        <div className="reglamento-reading">
          <nav aria-label="Secciones del reglamento" className="reglamento-index">
            <span>El reglamento</span>
            {REGLAS.map(rule => <a key={rule.id} href={`#regla-${rule.id}`}><span>{rule.id}</span>{rule.titulo}</a>)}
            <a href="#comunidad">La comunidad</a>
          </nav>
          <section className="reglamento-rules" aria-label="Reglas de la comunidad">
            {REGLAS.map(rule => (
              <motion.article key={rule.id} id={`regla-${rule.id}`} className="reglamento-rule" tabIndex={-1} aria-labelledby={`titulo-${rule.id}`} initial={enter} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: false, amount: .18 }} transition={{ duration: animated ? .45 : 0 }}>
                <span className="reglamento-rule-number" aria-hidden="true">{rule.id}</span>
                <div><h2 id={`titulo-${rule.id}`}>{rule.titulo}</h2><p>{rule.desc}</p></div>
              </motion.article>
            ))}
          </section>
        </div>

        <section id="comunidad" className="reglamento-community" aria-labelledby="reglamento-community-title" tabIndex={-1}>
          <motion.div initial={enter} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: false, amount: .12 }} transition={{ duration: animated ? .5 : 0 }}>
            <p className="reglamento-eyebrow">Hecho por y para la comunidad.</p>
            <h2 id="reglamento-community-title">EL TRUENO<br /><span>LO HACEMOS TODOS.</span></h2>
          </motion.div>
          <div className="reglamento-people">
            <article className="reglamento-person"><header><img src={kaletProfile} alt="Kalet" width="64" height="64" loading="lazy" /><div><h3>! Kalet</h3><span>Fundador y desarrollador</span></div></header><p>{MENSAJE_CREADOR}</p></article>
            <article className="reglamento-person"><header><img src={logoTHC} alt="" width="64" height="64" loading="lazy" /><div><h3>La comunidad</h3><span>El motor de THC</span></div></header><p>{MENSAJE_COMUNIDAD}</p></article>
          </div>
        </section>
        <footer className="reglamento-footer"><strong>THC<span>.</span></strong><p>{MENSAJE_FINAL}</p><a href="#regla-01">Volver a las reglas ↑</a></footer>
      </div>
    </main>
  );
}