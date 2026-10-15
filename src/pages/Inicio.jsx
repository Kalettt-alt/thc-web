import { useEffect, useRef, useState } from 'react';
import { motion, MotionConfig, useInView, useScroll, useTransform } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowDown, ArrowRight, ArrowUpRight, BookOpen, ChevronDown, Gamepad2, Heart, Layers3, ListOrdered, MessageSquare, Pause, Play, RefreshCw, ShieldCheck, Sparkles, Trophy, UserRound, Users, Zap } from 'lucide-react';
import { RUTAS } from '../utils/rutas';
import { supabase } from '../utils/supabase';
import { useHomeMotion } from '../utils/homeMotion';
import './Inicio.css';

const LOGO = '/imagenes/LogoTHC.png';
const EASE = [0.22, 1, 0.36, 1];
const COMMUNITY_LINKS = [
  { title: 'Foro', desc: 'Debates, opiniones y conversaciones que siguen después del partido.', href: RUTAS.FORO, icon: MessageSquare, word: 'CONVERSA' },
  { title: 'Muro', desc: 'Los memes, las jugadas y los momentos que se quedan en la comunidad.', href: RUTAS.MURO, icon: Sparkles, word: 'COMPARTE' },
  { title: 'Rankings', desc: 'Goles, asistencias y rendimiento. Mira quién deja su huella en Haxball.', href: RUTAS.RANKINGS, icon: Trophy, word: 'COMPITE' },
  { title: 'Tierlist', desc: 'Arma tu clasificación de jugadores y defiende tu punto de vista.', href: RUTAS.TIER, icon: ListOrdered, word: 'ORDENA' },
  { title: 'Tu perfil', desc: 'Tu apodo, tu estilo y tu historia. Encuentra tu lugar en THC.', href: RUTAS.PERFIL, icon: UserRound, word: 'CONECTA' },
];
const GAMES = [
  { id: 'fantasy', number: '01', label: 'EL PARTIDO LO DECIDES TÚ', title: ['DT', 'FANTASY.'], description: 'Desde el banquillo también se juega. Prepara el once, cambia la táctica y encuentra la jugada que cambia el partido.', details: ['Alineación', 'Decisiones en cancha', 'Gestión del equipo'], route: RUTAS.FANTASY, action: 'Toma el mando', icon: Gamepad2 },
  { id: 'ultimate', number: '02', label: 'UN CLUB CON TU SELLO', title: ['ULTIMATE', 'TEAM.'], description: 'Tu nombre, tus colores y tu plantilla. Construye un club propio y lleva tu juego al entrenamiento.', details: ['Crea tu club', 'Arma tu plantilla', 'Skill Mode'], route: RUTAS.ULTIMATE_TEAM, action: 'Construye tu club', icon: ShieldCheck },
  { id: 'album', number: '03', label: 'LA COMUNIDAD EN TUS MANOS', title: ['ABRE. PEGA.', 'COMPLETA.'], description: 'Cada cromo tiene una historia. Abre tus sobres, pega tus favoritos e intercambia los repetidos para completar el álbum.', details: ['Sobres', 'Colección', 'Intercambios'], route: RUTAS.ALBUM, action: 'Abre el álbum', icon: Layers3 },
];
const QUESTIONS = [
  { question: '¿Cómo empiezo?', answer: <>Al abrir THC, inicia sesión con tu cuenta de Discord. Personaliza <Link to={RUTAS.PERFIL}>tu perfil</Link> y elige el apartado que quieras explorar.</> },
  { question: '¿Fantasy o Ultimate Team?', answer: <>En <Link to={RUTAS.FANTASY}>DT Fantasy</Link> diriges un club y tomas decisiones durante los partidos. En <Link to={RUTAS.ULTIMATE_TEAM}>Ultimate Team</Link> creas tu equipo, organizas la plantilla y puedes entrenar en Skill Mode.</> },
  { question: '¿Qué hago con los cromos repetidos?', answer: <>En el <Link to={RUTAS.ALBUM}>álbum virtual</Link> puedes ofrecer intercambios para conseguir los que te faltan y continuar tu colección.</> },
  { question: '¿Dónde comparto mis cosas?', answer: <>Comparte imágenes en el <Link to={RUTAS.MURO}>muro</Link> o abre una conversación, responde y vota en el <Link to={RUTAS.FORO}>foro</Link>. Antes de publicar, conoce el <Link to={RUTAS.REGLAMENTO}>reglamento</Link>.</> },
];

async function loadVisibleProfiles({ signal }) {
  const { count, error } = await supabase.from('perfiles').select('id', { count: 'exact', head: true }).abortSignal(signal);
  if (error) throw error;
  if (!Number.isSafeInteger(count) || count < 0) throw new Error('No se pudo confirmar el contador.');
  return { members: count };
}

function Reveal({ children, className = '', enabled, delay = 0 }) {
  return <motion.div className={className} initial={enabled ? 'hidden' : false} animate={enabled ? undefined : 'visible'} whileInView={enabled ? 'visible' : undefined} viewport={{ once: false, amount: 0.12 }} variants={{ hidden: { opacity: 0, y: 42, rotate: -1 }, visible: { opacity: 1, y: 0, rotate: 0 } }} transition={{ duration: enabled ? 0.75 : 0, delay: enabled ? delay : 0, ease: EASE }}>{children}</motion.div>;
}

function SectionTitle({ lines, enabled, id, className = '' }) {
  const ref = useRef(null);
  const visible = useInView(ref, { amount: 0.2 });
  return <h2 ref={ref} id={id} className={`home-chapter-title ${className}`}>{lines.map((line, i) => <span className="home-title-mask" key={line}><motion.span initial={enabled ? 'hidden' : false} animate={enabled && !visible ? 'hidden' : 'visible'} variants={{ hidden: { y: '105%', rotate: 5 }, visible: { y: 0, rotate: 0 } }} transition={{ duration: enabled ? 0.85 : 0, delay: enabled ? i * 0.07 : 0, ease: EASE }}>{line}</motion.span></span>)}</h2>;
}

function PitchArtwork({ enabled, visible }) {
  const positions = [[50, 87], [20, 70], [41, 74], [61, 74], [81, 70], [28, 48], [50, 43], [73, 48], [21, 22], [50, 18], [79, 22]];
  return <div className={`home-manager-art ${visible ? 'is-visible' : ''}`} aria-hidden="true">
    <div className="home-manager-header"><span>THC / PIZARRA DEL DT</span><i /></div>
    <div className="home-manager-pitch"><svg viewBox="0 0 350 440" fill="none"><rect x="12" y="12" width="326" height="416" /><path d="M12 220H338M102 12V78H248V12M102 428V362H248V428" /><circle cx="175" cy="220" r="48" /><path className="home-tactical-line" d="M91 289Q51 174 145 110M145 110L122 114M145 110L139 134M241 244Q318 180 274 104M274 104L275 131M274 104L296 120" />{positions.map(([x, y], i) => <motion.g key={i} initial={false} animate={enabled && visible ? { x: [0, i % 2 ? 8 : -7, 0], y: [0, i > 4 ? -10 : 4, 0] } : { x: 0, y: 0 }} transition={{ duration: 4 + i * 0.13, repeat: enabled && visible ? Infinity : 0, delay: i * 0.1 }}><circle cx={x * 3.26 + 12} cy={y * 4.16 + 12} r="13" className="home-pitch-player" /><text x={x * 3.26 + 12} y={y * 4.16 + 16} textAnchor="middle">{i + 1}</text></motion.g>)}</svg></div>
    <span className="home-manager-note">LA PRÓXIMA JUGADA<br /><strong>ES TU DECISIÓN.</strong></span>
    <div className="home-manager-sticker"><ArrowUpRight /><span>TOMA<br />EL MANDO</span></div>
  </div>;
}

function UltimateArtwork() {
  return <div className="home-club-art" aria-hidden="true"><div className="home-club-ring" /><span className="home-club-word">UT</span><div className="home-club-card"><span>THC ULTIMATE TEAM</span><img src="/Spiral/UTSpiral.png" alt="" loading="lazy" width="1200" height="1600" /><strong>TU CLUB.<br />TUS COLORES.</strong><div><ShieldCheck /><span>IDENTIDAD PROPIA</span></div></div><span className="home-club-sticker">HECHO<br />POR TI. <ArrowUpRight /></span></div>;
}

function AlbumArtwork() {
  return <div className="home-collection-art" aria-hidden="true"><div className="home-cromo home-cromo--back"><img src="/Spiral/AlbumSpiral.png" alt="" loading="lazy" width="1200" height="1600" /><span>UNA COMUNIDAD</span></div><div className="home-cromo home-cromo--front"><div><span>ÁLBUM</span><Zap /></div><img src={LOGO} alt="" width="200" height="200" loading="lazy" /><strong>TRUENO<br />HAXBALL</strong><span>EL CROMO ERES TÚ.</span></div><span className="home-collection-sticker">¿CUÁL TE<br />FALTA? <Layers3 /></span></div>;
}

function GameChapter({ game, enabled, loopsPaused }) {
  const ref = useRef(null);
  const visible = useInView(ref, { margin: '20% 0px 20% 0px' });
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const artY = useTransform(scrollYProgress, [0, 0.5, 1], [110, 0, -100]);
  const artRotation = useTransform(scrollYProgress, [0, 0.5, 1], [game.id === 'ultimate' ? 14 : -10, 0, game.id === 'ultimate' ? -9 : 9]);
  const artScale = useTransform(scrollYProgress, [0, 0.5, 1], [0.85, 1, 0.95]);
  const numberY = useTransform(scrollYProgress, [0, 1], [100, -150]);
  const Icon = game.icon;
  return <section ref={ref} className={`home-game-chapter home-game-chapter--${game.id}`} aria-labelledby={`home-${game.id}-title`}>
    <div className="home-game-stage home-shell">
      <motion.span className="home-game-big-number" aria-hidden="true" style={enabled ? { y: numberY } : { y: 0 }}>{game.number}</motion.span>
      <div className="home-game-information"><Reveal enabled={enabled}><p className="home-kicker"><Icon size={18} aria-hidden="true" /> {game.number} / {game.label}</p></Reveal><SectionTitle lines={game.title} enabled={enabled} id={`home-${game.id}-title`} /><Reveal enabled={enabled} delay={0.07}><p className="home-game-description">{game.description}</p><ul className="home-game-features">{game.details.map(detail => <li key={detail}><span />{detail}</li>)}</ul><Link to={game.route} className="home-button home-button--light">{game.action}<ArrowUpRight size={24} aria-hidden="true" /></Link></Reveal></div>
      <motion.div className="home-game-art" style={enabled ? { y: artY, rotate: artRotation, scale: artScale } : { y: 0, rotate: 0, scale: 1 }}>{game.id === 'fantasy' ? <PitchArtwork enabled={enabled && !loopsPaused} visible={visible} /> : game.id === 'ultimate' ? <UltimateArtwork /> : <AlbumArtwork />}</motion.div>
      <span className="home-chapter-bottom" aria-hidden="true">TRUENO HAXBALL COMMUNITY <span>{game.number} / 03</span></span>
    </div>
  </section>;
}

function Hero({ enabled, loopsPaused }) {
  const [flashPaused, setFlashPaused] = useState(() => { try { return localStorage.getItem('thc:home-flash:v1') === 'off'; } catch { return false; } });
  const toggleFlash = () => setFlashPaused(previous => {
    const next = !previous;
    try { localStorage.setItem('thc:home-flash:v1', next ? 'off' : 'on'); } catch { /* La pausa funciona aunque el navegador bloquee el almacenamiento. */ }
    return next;
  });
  const ref = useRef(null);
  const visible = useInView(ref);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const leftY = useTransform(scrollYProgress, [0, 1], [0, 165]);
  const middleY = useTransform(scrollYProgress, [0, 1], [0, -85]);
  const rightY = useTransform(scrollYProgress, [0, 1], [0, 95]);
  const rotation = useTransform(scrollYProgress, [0, 1], [0, 12]);
  const photoY = useTransform(scrollYProgress, [0, 1], [0, -115]);
  return <section ref={ref} className={`home-hero ${visible && !loopsPaused ? 'is-visible' : ''}`} aria-labelledby="home-title">
    <div className="home-shell home-hero-top"><p className="home-kicker"><Zap size={19} aria-hidden="true" /> TRUENO HAXBALL COMMUNITY</p><div className="home-hero-tools"><a href="#universo" className="home-hero-discover">Conoce tu próximo juego <ArrowDown size={20} aria-hidden="true" /></a><button type="button" className="home-flash-control" aria-pressed={flashPaused} onClick={toggleFlash}>{flashPaused ? <Play size={14} aria-hidden="true"/> : <Pause size={14} aria-hidden="true"/>}{flashPaused ? 'Reanudar parpadeo' : 'Pausar parpadeo'}</button></div></div>
    <div className="home-hero-brand"><h1 id="home-title" aria-label="THC. Vivimos el juego." data-motion="on" data-flash={flashPaused ? 'paused' : 'playing'}><motion.span aria-hidden="true" style={enabled ? { y: leftY } : { y: 0 }}>T</motion.span><motion.span className="home-hero-h" aria-hidden="true" style={enabled ? { y: middleY } : { y: 0 }}>H</motion.span><motion.span aria-hidden="true" style={enabled ? { y: rightY, rotate: rotation } : { y: 0, rotate: 0 }}>C</motion.span></h1><svg className="home-hero-star" viewBox="0 0 100 100" aria-hidden="true"><path d="M50 0L59 31L85 15L69 41L100 50L69 59L85 85L59 69L50 100L41 69L15 85L31 59L0 50L31 41L15 15L41 31Z" /></svg></div>
    <div className="home-shell home-hero-bottom"><Reveal enabled={enabled} className="home-hero-statement"><p>VIVIMOS<br /><span>EL JUEGO.</span></p><span>Dentro de la cancha.<br />Y mucho más allá.</span></Reveal><Reveal enabled={enabled} delay={0.1} className="home-hero-copy"><p>Dirige un equipo. Crea tu club. Completa tu colección. Una comunidad, muchas formas de jugar.</p><a href="#universo" className="home-button home-button--orange">Descubre THC <ArrowUpRight size={25} aria-hidden="true" /></a></Reveal><motion.div className="home-hero-photo" style={enabled ? { y: photoY, rotate: 5 } : { y: 0, rotate: 5 }}><img src="/imagenes/FondoInicio.jpg" alt="Una partida de Haxball de la comunidad THC" width="1920" height="1080" fetchPriority="high" /><span>EL JUEGO QUE NOS UNE. <Zap size={18} aria-hidden="true" /></span></motion.div></div>
  </section>;
}

export default function Inicio({ session, statsLoader = loadVisibleProfiles, motionEnabled }) {
  const { motionEnabled: savedMotionEnabled } = useHomeMotion();
  const enabled = typeof motionEnabled === 'boolean' ? motionEnabled : savedMotionEnabled;
  const [loopsPaused, setLoopsPaused] = useState(false);
  const [members, setMembers] = useState({ status: 'loading', count: null });
  const [attempt, setAttempt] = useState(0);
  const userId = session?.user?.id;

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    let finished = false;
    const timeout = window.setTimeout(() => {
      if (active && !finished) { finished = true; setMembers({ status: 'error', count: null }); controller.abort(); }
    }, 12000);
    Promise.resolve().then(() => statsLoader({ signal: controller.signal })).then(result => {
      if (!Number.isSafeInteger(result?.members) || result.members < 0) throw new Error('El contador no está disponible.');
      if (active && !finished) { finished = true; setMembers({ status: 'ready', count: result.members }); }
    }).catch(() => {
      if (active && !finished) { finished = true; setMembers({ status: 'error', count: null }); }
    }).finally(() => window.clearTimeout(timeout));
    return () => { active = false; window.clearTimeout(timeout); controller.abort(); };
  }, [statsLoader, attempt, userId]);

  const retryMembers = () => { setMembers({ status: 'loading', count: null }); setAttempt(value => value + 1); };

  return <MotionConfig reducedMotion={enabled ? 'never' : 'always'}><div className="thc-home" data-motion={enabled ? 'on' : 'off'} data-loops={loopsPaused ? 'paused' : 'playing'}>
    <Hero enabled={enabled} loopsPaused={loopsPaused} />
    <div className="home-moving-band"><div className="home-band-track" aria-hidden="true">{Array.from({ length: 4 }, (_, i) => <span key={i}>UNA MISMA PASIÓN <Zap /> MUCHAS FORMAS DE JUGAR <Zap /></span>)}</div><button type="button" onClick={() => setLoopsPaused(value => !value)} aria-label={loopsPaused ? 'Reanudar animaciones continuas' : 'Pausar animaciones continuas'} aria-pressed={loopsPaused}>{loopsPaused ? <Play size={20} aria-hidden="true" /> : <Pause size={20} aria-hidden="true" />}</button></div>
    <section id="universo" className="home-universe-intro home-shell" aria-labelledby="home-universe-title"><Reveal enabled={enabled}><p className="home-kicker">01 / EL UNIVERSO THC</p></Reveal><SectionTitle lines={['NO SOLO', 'MIRAS. JUEGAS.']} enabled={enabled} id="home-universe-title" /><Reveal enabled={enabled} className="home-universe-aside"><p>Tres formas de llevar tu pasión a otro nivel.<br />El siguiente capítulo lo eliges tú.</p><a href="#fantasy-capitulo" aria-label="Descubrir DT Fantasy"><ArrowDown size={31} aria-hidden="true" /></a></Reveal></section>
    <div id="fantasy-capitulo">{GAMES.map(game => <GameChapter key={game.id} game={game} enabled={enabled} loopsPaused={loopsPaused} />)}</div>
    <section id="comunidad" className="home-community" aria-labelledby="home-community-title"><div className="home-shell"><Reveal enabled={enabled}><p className="home-kicker"><Users size={18} aria-hidden="true" /> 02 / DE LA CANCHA A LA COMUNIDAD</p></Reveal><div className="home-community-heading"><SectionTitle lines={['EL TRUENO', 'NOS UNE.']} enabled={enabled} id="home-community-title" /><Reveal enabled={enabled} className="home-community-summary"><p>Una buena jugada inicia el partido. Una buena comunidad hace que quieras volver.</p><div className="home-members" aria-live="polite" aria-busy={members.status === 'loading'}><strong>{members.status === 'ready' ? new Intl.NumberFormat('es-AR').format(members.count) : '—'}</strong><span>{members.status === 'loading' ? 'Consultando la comunidad…' : 'Perfiles visibles para tu cuenta'}</span>{members.status === 'error' && <p>El contador no está disponible ahora. <button type="button" onClick={retryMembers}><RefreshCw size={16} aria-hidden="true" /> Reintentar</button></p>}</div></Reveal></div>
      <div className="home-community-directory">{COMMUNITY_LINKS.map(({ title, desc, href, icon: Icon, word }, i) => <Reveal enabled={enabled} key={href} delay={i * 0.035}><Link to={href} className="home-community-link"><span className="home-community-number">{String(i + 1).padStart(2, '0')}</span><div className="home-community-link-title"><span>{word}</span><h3>{title}</h3></div><p>{desc}</p><span className="home-community-arrow"><Icon size={24} aria-hidden="true" /><ArrowUpRight size={30} aria-hidden="true" /></span></Link></Reveal>)}</div>
      {RUTAS.TINDER && <Reveal enabled={enabled}><Link to={RUTAS.TINDER} className="home-tinder-teaser"><Heart size={37} aria-hidden="true" /><div><span>UN NUEVO PUNTO DE ENCUENTRO</span><h3>Tinder THC</h3></div><p>Un nuevo espacio de la comunidad.<br />Estamos preparando su primera versión.</p><ArrowUpRight size={34} aria-hidden="true" /></Link></Reveal>}
    </div></section>
    <section id="empezar" className="home-start home-shell" aria-labelledby="home-start-title"><Reveal enabled={enabled}><p className="home-kicker">03 / TU PRIMERA JUGADA</p></Reveal><SectionTitle lines={['AQUÍ TIENES', 'TU LUGAR.']} enabled={enabled} id="home-start-title" /><ol className="home-first-steps">{[{ title: 'ENTRA.', copy: 'Inicia sesión con Discord. Tu cuenta es la puerta de entrada a THC.', icon: MessageSquare }, { title: 'PRESÉNTATE.', copy: 'Elige tu apodo, tu avatar y tu biografía. Haz que tu perfil hable de ti.', icon: UserRound, href: RUTAS.PERFIL }, { title: 'HAZLO TUYO.', copy: 'Juega, colecciona, debate o comparte. Elige por dónde comienza tu historia.', icon: Zap, href: '#universo' }].map(({ title, copy, icon: Icon, href }, i) => <li key={title}><Reveal enabled={enabled} delay={i * 0.07}><span className="home-step-index">0{i + 1}</span><Icon size={31} aria-hidden="true" /><h3>{title}</h3><p>{copy}</p>{href && (href.startsWith('#') ? <a href={href}>Explora THC <ArrowRight size={20} aria-hidden="true" /></a> : <Link to={href}>Personaliza tu perfil <ArrowRight size={20} aria-hidden="true" /></Link>)}</Reveal></li>)}</ol><Reveal enabled={enabled}><Link to={RUTAS.REGLAMENTO} className="home-rule-link"><BookOpen size={24} aria-hidden="true" /><span>El respeto también es parte del juego.<br /><strong>Conoce el reglamento THC.</strong></span><ArrowUpRight size={28} aria-hidden="true" /></Link></Reveal></section>
    <section className="home-faq home-shell" aria-labelledby="home-faq-title"><div><Reveal enabled={enabled}><p className="home-kicker">04 / ANTES DEL PITAZO</p></Reveal><SectionTitle lines={['¿ALGUNA', 'DUDA?']} enabled={enabled} id="home-faq-title" /><Reveal enabled={enabled}><a href="https://discord.gg/g28URX7db8" target="_blank" rel="noopener noreferrer" className="home-inline-link">Hablemos en Discord <ArrowUpRight size={23} aria-hidden="true" /></a></Reveal></div><div className="home-faq-list">{QUESTIONS.map(({ question, answer }, i) => <Reveal enabled={enabled} key={question} delay={i * 0.04}><details><summary><span>0{i + 1}</span><h3>{question}</h3><ChevronDown size={26} aria-hidden="true" /></summary><div className="home-faq-answer">{answer}</div></details></Reveal>)}</div></section>
    <section className="home-finale" aria-labelledby="home-finale-title"><div className="home-shell"><Reveal enabled={enabled}><p className="home-kicker"><Zap size={20} aria-hidden="true" /> UN MISMO JUEGO. UN MISMO TRUENO.</p></Reveal><SectionTitle lines={['NOS VEMOS', 'EN LA CANCHA.']} enabled={enabled} id="home-finale-title" /><Reveal enabled={enabled}><a href="#universo" className="home-button home-button--dark">Elige tu próxima jugada <ArrowUpRight size={26} aria-hidden="true" /></a></Reveal><Zap className="home-finale-bolt" aria-hidden="true" strokeWidth={0.8} /></div></section>
  </div></MotionConfig>;
}
