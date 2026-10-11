import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../utils/supabase';
import { RUTAS } from '../../utils/rutas';
import { LogOut, User, ArrowUpRight, Menu, X, Pause, Play } from 'lucide-react';
import { motion, AnimatePresence, MotionConfig } from 'framer-motion';
import { useHomeMotion } from '../../utils/homeMotion';
import { obtenerRango } from '../../utils/roles';
import MensajesMenu from './MensajesMenu';
import NotificacionesMenu from './NotificacionesMenu';
import toast from 'react-hot-toast';
import './Navbar.css';

const NAV_CARDS = [
  { 
    label: "Diversión", 
    links: [ 
      { label: "THC: Ultimate Team", href: RUTAS.ULTIMATE_TEAM }, 
      { label: "Álbum Virtual", href: RUTAS.ALBUM },
      { label: "DT Fantasy", href: RUTAS.FANTASY },
    ] 
  },
  { 
    label: "Comunidad", 
    links: [ 
      { label: "Foro Oficial", href: RUTAS.FORO }, 
      { label: "Muro THC", href: RUTAS.MURO },
      { label: "Tinder THC", href: RUTAS.TINDER }
    ] 
  },
  { 
    label: "Información", 
    links: [ 
      { label: "Top & Rank", href: RUTAS.RANKINGS }, 
      { label: "Tierlist", href: RUTAS.TIER },
      { label: "Reglamentos", href: RUTAS.REGLAMENTO }
    ] 
  }
];

export default function Navbar({ session }) {
  const [activeMenu, setActiveMenu] = useState('none'); 
  const [perfil, setPerfil] = useState(null);
  const navigate = useNavigate();
  const navbarRef = useRef(null);
  const { motionEnabled, toggleMotion } = useHomeMotion();

  const user = session?.user?.user_metadata;
  const discordNombreRaw = user?.preferred_username || user?.user_name || "Jugador";
  const discordAvatarRaw = user?.avatar_url || "/imagenes/LogoTHC.png";

  const userId = session?.user?.id;
  useEffect(() => {
    if (!userId) return;
    let activo = true;
    const cargarPerfil = async () => {
      try {
        const campos = 'id, discord_nombre, apodo, avatar_url, nivel_rol';
        const resultado = await supabase.from('perfiles').select(campos).eq('id', userId).maybeSingle();
        if (resultado.error) throw resultado.error;
        let perfilData = resultado.data;
        if (!perfilData) {
          const nuevoPerfil = { id: userId, discord_nombre: discordNombreRaw, avatar_url: discordAvatarRaw };
          const creado = await supabase.from('perfiles').insert(nuevoPerfil).select(campos).single();
          if (creado.error?.code === '23505') {
            const existente = await supabase.from('perfiles').select(campos).eq('id', userId).single();
            if (existente.error) throw existente.error;
            perfilData = existente.data;
          } else {
            if (creado.error) throw creado.error;
            perfilData = creado.data;
          }
        }
        if (perfilData.discord_nombre !== discordNombreRaw) {
          const actualizado = await supabase.from('perfiles').update({ discord_nombre: discordNombreRaw }).eq('id', userId).select(campos).single();
          if (actualizado.error) throw actualizado.error;
          perfilData = actualizado.data;
        }
        if (activo) setPerfil(perfilData);
      } catch {
        if (activo) toast.error('No se pudo actualizar tu perfil de Discord.');
      }
    };
    cargarPerfil();
    return () => { activo = false; };
  }, [userId, discordNombreRaw, discordAvatarRaw]);
  const toggleMenu = (menuName) => {
    setActiveMenu(prev => prev === menuName ? 'none' : menuName);
  };

  useEffect(() => {
    const cerrarFuera = event => {
      if (!navbarRef.current?.contains(event.target)) setActiveMenu('none');
    };
    const cerrarConEscape = event => {
      if (event.key !== 'Escape') return;
      [...(navbarRef.current?.querySelectorAll('button[aria-expanded="true"]') || [])].find(button => button.getClientRects().length)?.focus();
      setActiveMenu('none');
    };
    document.addEventListener('pointerdown', cerrarFuera);
    document.addEventListener('keydown', cerrarConEscape);
    return () => {
      document.removeEventListener('pointerdown', cerrarFuera);
      document.removeEventListener('keydown', cerrarConEscape);
    };
  }, []);

  const cerrarSesion = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch {
      toast.error('No se pudo cerrar la sesión. Inténtalo de nuevo.');
    }
  };
  
  const nombreMostrar = perfil?.apodo || perfil?.discord_nombre || discordNombreRaw;
  const avatarMostrar = perfil?.avatar_url || discordAvatarRaw;
  const rangoActual = obtenerRango(perfil?.nivel_rol);

  const closeMenu = () => setActiveMenu('none');

  return <MotionConfig reducedMotion={motionEnabled ? 'never' : 'always'} transition={motionEnabled ? undefined : { duration: 0 }}><header ref={navbarRef} className="thc-navbar" data-motion={motionEnabled ? 'on' : 'off'}>
    <div className="thc-navbar-bar">
      <Link to={RUTAS.INICIO} onClick={closeMenu} className="thc-navbar-logo" aria-label="THC · Ir al Inicio">
        <img src="/imagenes/LogoTHC.png" alt="" width="46" height="46" />
        <span>THC<span className="thc-navbar-logo-dot">.</span></span>
      </Link>
      <div className="thc-navbar-actions">
        <MensajesMenu session={session} isOpen={activeMenu === 'chats'} onToggle={() => toggleMenu('chats')} />
        <NotificacionesMenu session={session} isOpen={activeMenu === 'notifs'} onToggle={() => toggleMenu('notifs')} />
        <div className="thc-navbar-action">
          <button type="button" className="thc-navbar-profile-button" aria-label="Abrir menú de perfil" aria-expanded={activeMenu === 'profile'} onClick={() => toggleMenu('profile')}>
            <span className="thc-navbar-profile-name"><b>{nombreMostrar}</b></span>
            <img src={avatarMostrar} alt="" style={{ borderColor: rangoActual.color }} />
          </button>
          <AnimatePresence>
            {activeMenu === 'profile' && <motion.div initial={{ opacity: 0, y: -10, scale: .95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: .95 }} className="thc-navbar-popup thc-navbar-popup-profile">
              <span className="thc-navbar-profile-heading">{nombreMostrar}<small style={{ color: rangoActual.color }}>{rangoActual.nombre}</small></span>
              <button type="button" onClick={() => { closeMenu(); navigate(RUTAS.PERFIL + '/' + encodeURIComponent(perfil?.discord_nombre || discordNombreRaw)); }}><User size={16} />Ver perfil<ArrowUpRight size={14} /></button>
              <button type="button" onClick={cerrarSesion} className="thc-navbar-logout"><LogOut size={16} />Cerrar sesión</button>
            </motion.div>}
          </AnimatePresence>
        </div>
        <button type="button" className="thc-navbar-menu-button" aria-label="Abrir navegación" aria-expanded={activeMenu === 'mobile'} aria-controls="thc-navigation-panel" onClick={() => toggleMenu('mobile')}>
          <span>{activeMenu === 'mobile' ? 'Cerrar' : 'Menú'}</span>{activeMenu === 'mobile' ? <X size={21} /> : <Menu size={21} />}
        </button>
      </div>
    </div>
    <AnimatePresence>
      {activeMenu === 'mobile' && <motion.nav id="thc-navigation-panel" aria-label="Todos los apartados" initial={{ opacity: 0, y: -20, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }} exit={{ opacity: 0, y: -20, height: 0 }} transition={{ duration: motionEnabled ? .3 : 0, ease: 'easeOut' }} className="thc-navbar-nav">
        <div className="thc-navbar-nav-scroll">
          <div className="thc-navbar-nav-heading"><span>Encuentra tu lugar<span>.</span></span><button type="button" onClick={toggleMotion} aria-label={motionEnabled ? 'Pausar animaciones' : 'Activar animaciones'} aria-pressed={!motionEnabled}>{motionEnabled ? <Pause size={17} /> : <Play size={17} />}<span>{motionEnabled ? 'Pausar animaciones' : 'Activar animaciones'}</span></button></div>
          <div className="thc-navbar-nav-groups">{NAV_CARDS.map((group, index) => <motion.section key={group.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: motionEnabled ? index * .1 : 0, duration: motionEnabled ? .3 : 0 }}>
            <div className="thc-navbar-group-heading"><span>0{index + 1}</span><h2>{group.label}</h2></div>
            <div>{group.links.map(link => <Link key={link.href} to={link.href} onClick={closeMenu}>{link.label}<ArrowUpRight size={17} /></Link>)}</div>
          </motion.section>)}</div>
          <div className="thc-navbar-nav-note"><Link to={RUTAS.INICIO} onClick={closeMenu}>Volver al Inicio<ArrowUpRight size={19} /></Link><span>El mismo juego. Tu propia forma de vivirlo.</span></div>
        </div>
      </motion.nav>}
    </AnimatePresence>
  </header></MotionConfig>;
}
