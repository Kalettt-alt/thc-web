import { useEffect, useRef, useState } from 'react';
import { obtenerRango } from '../../utils/roles';
import { MessageSquare, UserPlus, Edit3, Terminal, Gamepad2, ArrowLeft, ArrowUpRight, Activity, Award, Hexagon, Music, Palette, Shield, Sparkles } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { RUTAS } from '../../utils/rutas';
import { supabase } from '../../utils/supabase';
import { motion, MotionConfig, useReducedMotion } from 'framer-motion';
import toast from 'react-hot-toast';
import PerfilComentarios from './PerfilComentarios';
import PerfilThemePicker from './PerfilThemePicker';
import { canPersonalizeProfile, getProfileTheme, getProfileThemeStyle, saveProfileTheme } from '../../utils/profileThemes';
import { safeHexColor, safeProfileTheme } from '../../utils/media';
import { useHomeMotion } from '../../utils/homeMotion';
import { spotifyTrack as getSpotifyTrack, profileImageUrl, profileNumber as bounded } from '../../utils/profileSettings';
import './PerfilThemes.css';

const WIDGETS = {
  'Álbum Virtual': { image: '/AlbumPerfil.jpg', href: RUTAS.ALBUM, caption: 'Mi colección' },
  'Ultimate Team': { image: '/UltimatePerfil.png', href: RUTAS.ULTIMATE_TEAM, caption: 'Mi club' },
  'Tier List Oficial': { image: '/TierListPerfil.png', href: RUTAS.TIER, caption: 'Mi selección' },
  'Foro Comunitario': { image: '/ForoPerfil.png', href: RUTAS.FORO, caption: 'La conversación' },
  'Central de Noticias': { image: '/NoticiasPerfil.png', href: RUTAS.NOTICIAS, caption: 'Lo que pasa' },
  'Estadísticas Globales': { image: '/EstadisticasPerfil.png', href: RUTAS.RANKINGS, caption: 'El juego en números' },
};
const FALLBACK_IMAGE = '/imagenes/LogoTHC.png';
const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.075 } } };
const itemVariants = { hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

function imageFallback(event) {
  const image = event.currentTarget;
  if (image.dataset.fallback) return;
  image.dataset.fallback = 'true';
  image.src = FALLBACK_IMAGE;
}

function ProfileWidget({ title, index }) {
  const widget = WIDGETS[title];
  if (!widget) return null;
  return (
    <motion.div variants={itemVariants} className="profile-widget-wrap">
      <Link to={widget.href} className="theme-panel profile-widget">
        <img src={widget.image} onError={imageFallback} loading="lazy" alt="" className="profile-widget-image" />
        <div className="profile-widget-shade" />
        <div className="profile-widget-copy"><span>{String(index + 1).padStart(2, '0')} <i /> {widget.caption}</span><h3 className="theme-h4">{title}</h3></div>
        <ArrowUpRight size={25} className="profile-widget-arrow" aria-hidden="true" />
      </Link>
    </motion.div>
  );
}

export default function PerfilVista({ perfil, etiquetas = [], isOwnProfile, onEdit, session, onUpdate }) {
  const [preview, setPreview] = useState(null);
  const [selectorAbierto, setSelectorAbierto] = useState(false);
  const [guardandoTema, setGuardandoTema] = useState(false);
  const [enviandoSolicitud, setEnviandoSolicitud] = useState(false);
  const saveLock = useRef(false);
  const requestLock = useRef(false);
  const active = useRef(true);
  const navigate = useNavigate();
  const { motionEnabled } = useHomeMotion();
  const reducedMotion = useReducedMotion();
  const motionActive = motionEnabled && !reducedMotion;
  const actorId = session?.user?.id;
  const ownProfile = Boolean(isOwnProfile && actorId === perfil.id);
  const canCustomize = ownProfile && canPersonalizeProfile({ userId: actorId, profileId: perfil.id, level: perfil.nivel_rol });
  const pickerVisible = selectorAbierto && canCustomize;
  const visiblePreview = pickerVisible ? preview : null;
  const themeId = safeProfileTheme(visiblePreview?.tema_perfil ?? perfil.tema_perfil);
  const colorPixel = safeHexColor(visiblePreview?.color_pixel ?? perfil.color_pixel);
  const theme = getProfileTheme(themeId, colorPixel);
  const identityRef = useRef({ actorId, profileId: perfil.id });
  const rango = obtenerRango(perfil.nivel_rol);
  const nombreMostrar = perfil.apodo || perfil.discord_nombre;
  const avatarMostrar = profileImageUrl(perfil.avatar_url) || FALLBACK_IMAGE;
  const bannerMostrar = profileImageUrl(perfil.banner_url);
  const widgets = [perfil.widget_1, perfil.widget_2].filter(title => WIDGETS[title]);
  const spotifyTrack = getSpotifyTrack(perfil.cancion_url)?.id;

  useEffect(() => {
    active.current = true;
    identityRef.current = { actorId, profileId: perfil.id };
    return () => { active.current = false; };
  }, [actorId, perfil.id]);

  const aplicarTema = async selection => {
    if (!canCustomize || saveLock.current) throw new Error('No puedes cambiar este perfil.');
    saveLock.current = true;
    setGuardandoTema(true);
    const expectedActor = actorId;
    const expectedProfile = perfil.id;
    try {
      const confirmed = await saveProfileTheme({ client: supabase, userId: expectedActor, themeId: selection.tema_perfil, color: selection.color_pixel });
      if (!active.current || identityRef.current.actorId !== expectedActor || identityRef.current.profileId !== expectedProfile) return;
      onUpdate?.({ tema_perfil: confirmed.tema_perfil, color_pixel: confirmed.color_pixel });
      setPreview(null);
      setSelectorAbierto(false);
      toast.success('Estilo guardado. Así se verá tu perfil.', { id: 'profile-style' });
    } finally {
      saveLock.current = false;
      if (active.current && identityRef.current.actorId === expectedActor) setGuardandoTema(false);
    }
  };

  const handleAñadirAmigo = async () => {
    if (!session?.user || requestLock.current || ownProfile) return;
    requestLock.current = true;
    setEnviandoSolicitud(true);
    const toastId = toast.loading('Enviando solicitud...');
    try {
      const { data: solicitud, error } = await supabase.from('amigos').insert({ user_id_1: session.user.id, user_id_2: perfil.id, estado: 'pendiente' }).select('id').single();
      if (error || !solicitud) {
        if (error?.code === '23505') throw new Error('Ya enviaste una solicitud a este usuario.');
        throw new Error('No se pudo enviar la solicitud. Inténtalo de nuevo.');
      }
      const { error: notificacionError } = await supabase.from('notificaciones').insert({ usuario_id: perfil.id, actor_id: session.user.id, tipo: 'solicitud_amistad', enlace_id: solicitud.id, contenido: 'te ha enviado una solicitud de amistad.' });
      if (notificacionError) toast.error('Solicitud creada, pero no se pudo avisar al usuario.', { id: toastId });
      else toast.success('Solicitud de amistad enviada.', { id: toastId });
    } catch (error) { toast.error(error.message, { id: toastId }); }
    finally { requestLock.current = false; if (active.current) setEnviandoSolicitud(false); }
  };

  function closePicker() { if (!saveLock.current) { setPreview(null); setSelectorAbierto(false); } }

  return (
    <MotionConfig reducedMotion={motionActive ? 'user' : 'always'}>
      <div className={`perfil-master-container ${theme.className}`} data-profile-theme={theme.id} data-motion={motionActive ? 'on' : 'off'} style={getProfileThemeStyle(theme.id, colorPixel)}>
        <div className="profile-background" aria-hidden="true">
          {theme.animated && <div className={`profile-motion-art profile-motion-art--${theme.id}`}><i /><i /><i /></div>}
          {bannerMostrar && <img src={bannerMostrar} onError={event => { event.currentTarget.style.display = 'none'; }} className="profile-banner" style={{ objectPosition: `50% ${bounded(perfil.banner_pos_y, 0, 100, 50)}%` }} alt="" />}
          <div className="profile-background-wash" />
        </div>
        <nav className="profile-topbar" aria-label="Perfil" inert={pickerVisible}>
          <Link to={RUTAS.INICIO} className="profile-back"><ArrowLeft size={18} /> Regresar</Link>
          <span className="profile-topbar-mark">THC<span> / PERFIL</span></span>
          {canCustomize && <button type="button" className="profile-style-button" onClick={() => setSelectorAbierto(true)}><Palette size={18} /> <span>Estilo</span></button>}
        </nav>
        <motion.main variants={containerVariants} initial={motionActive ? 'hidden' : false} animate="show" className="profile-content" inert={pickerVisible}>
          <aside className="profile-sidebar">
            <div className="profile-identity">
              <motion.div variants={itemVariants} className="profile-avatar-wrap">
                <div className="theme-avatar-container profile-main-avatar"><img key={avatarMostrar} src={avatarMostrar} onError={imageFallback} className="profile-avatar-image" style={{ objectPosition: `${bounded(perfil.avatar_pos_x, 0, 100, 50)}% ${bounded(perfil.avatar_pos_y, 0, 100, 50)}%`, transform: `scale(${bounded(perfil.avatar_scale, 1, 2.5, 1)})` }} alt={`Avatar de ${nombreMostrar}`} /></div>
                {theme.id === 'club' && <span className="profile-club-shield"><Shield size={22} /> THC</span>}
                {theme.id === 'terminal' && <span className="profile-terminal-code">ID / {perfil.id?.slice(0, 8).toUpperCase()}</span>}
              </motion.div>
              <motion.div variants={itemVariants} className="profile-name-block">
                <span className="profile-kicker">{theme.id === 'editorial' ? 'La comunidad, en primera persona' : theme.id === 'club' ? 'Ficha del jugador' : theme.id === 'terminal' ? '> player.profile' : 'Trueno Haxball Community'}</span>
                <h1 className="theme-h1">{nombreMostrar}</h1>
                <div className="profile-identifiers"><span><Terminal size={13} /> {perfil.discord_nombre}</span><span className="profile-rank" style={{ '--rank-color': rango.color }}>{rango.nombre}</span></div>
              </motion.div>
            </div>
            <motion.div variants={itemVariants} className="profile-actions">
              {ownProfile ? <button type="button" onClick={onEdit} className="theme-btn-primary"><Edit3 size={17} /> Modificar perfil</button> : <><button type="button" onClick={handleAñadirAmigo} disabled={enviandoSolicitud || !session?.user} className="theme-btn-secondary"><UserPlus size={17} /> {enviandoSolicitud ? 'Enviando…' : 'Añadir amigo'}</button><button type="button" disabled={!session?.user} onClick={() => navigate(`/mensajes/${encodeURIComponent(perfil.discord_nombre)}`)} className="theme-btn-primary"><MessageSquare size={17} /> Mensaje</button></>}
            </motion.div>
            <div className="profile-details">
              <motion.section variants={itemVariants} className="theme-panel profile-bio"><h2 className="profile-section-label"><Activity size={15} /> Estado</h2><p>{perfil.bio || 'Sin estado...'}</p></motion.section>
              <motion.section variants={itemVariants} className="theme-panel profile-badges"><h2 className="profile-section-label"><Award size={15} /> En la cancha</h2><div className="profile-tag-list"><span className="profile-position">{perfil.posicion || 'Cualquiera'}</span>{etiquetas.map(tag => <span key={tag.id} className="profile-tag" style={{ '--tag-color': safeHexColor(tag.color, theme.accent) }}>{profileImageUrl(tag.icono_url) ? <img src={profileImageUrl(tag.icono_url)} loading="lazy" onError={event => { event.currentTarget.style.display = 'none'; }} alt="" /> : <Hexagon size={13} />}{tag.etiqueta_id}</span>)}</div></motion.section>
              {spotifyTrack && <motion.section variants={itemVariants} className="theme-panel profile-track"><h2 className="profile-section-label"><Music size={15} /> Mi canción</h2><iframe title={`Canción favorita de ${nombreMostrar}`} src={`https://open.spotify.com/embed/track/${spotifyTrack}?utm_source=generator&theme=0`} width="100%" height="80" allow="encrypted-media" loading="lazy" className="profile-spotify" /></motion.section>}
            </div>
          </aside>
          <section className="profile-board">
            <motion.div variants={itemVariants} className="profile-board-header"><span className="profile-kicker"><Gamepad2 size={17} /> MI ESPACIO</span><h2>{theme.id === 'editorial' ? 'Dentro del juego.' : theme.id === 'terminal' ? '/ destacados' : 'Mi tablero.'}</h2>{theme.id === 'club' && <span className="profile-club-number" aria-hidden="true">THC</span>}{theme.id === 'aurora' && <Sparkles size={34} aria-hidden="true" className="profile-aurora-mark" />}</motion.div>
            <div className="profile-widgets">{widgets.length ? widgets.map((title, index) => <ProfileWidget key={`${index}-${title}`} title={title} index={index} />) : <motion.div variants={itemVariants} className="theme-panel profile-empty"><Gamepad2 size={30} /><p>Aquí van tus favoritos.</p>{ownProfile && <button type="button" className="theme-btn-secondary" onClick={onEdit}>Elegir destacados <ArrowUpRight size={16} /></button>}</motion.div>}</div>
            <motion.div variants={itemVariants} className="theme-panel profile-comments"><PerfilComentarios perfilId={perfil.id} session={session} accent={theme.accent} /></motion.div>
          </section>
        </motion.main>
        {pickerVisible && <PerfilThemePicker themeId={perfil.tema_perfil} color={perfil.color_pixel} onPreview={setPreview} onSave={aplicarTema} onCancel={closePicker} disabled={guardandoTema} />}
      </div>
    </MotionConfig>
  );
}
