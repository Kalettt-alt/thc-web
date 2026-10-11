import { memo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { RUTAS } from '../../utils/rutas';
import { Star, CloudLightning, MessageSquare, ArrowUpRight, Hash } from 'lucide-react';
import { motion, useInView } from 'framer-motion';
import { obtenerRango } from '../../utils/roles';
import { ETIQUETAS_FORO, imagenSegura } from '../../utils/foro';
import { useHomeMotion } from '../../utils/homeMotion';

function TarjetaPublicacion({ post, onVotar, miVoto, votando }) {
  const autor = post.autor;
  const rango = obtenerRango(autor?.nivel_rol);
  const nombreMostrar = autor?.apodo || autor?.discord_nombre || 'Desconocido';
  const fecha = new Date(post.creado_en).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const etiquetaConfig = ETIQUETAS_FORO[post.etiqueta] || ETIQUETAS_FORO['Normal'];
  const cardRef = useRef(null);
  const visible = useInView(cardRef, { amount: 0.12 });
  const { motionEnabled } = useHomeMotion();

  return (
    <div ref={cardRef} className="foro-card-wrapper">
      <motion.article className="foro-card" initial={false} animate={motionEnabled && !visible ? { opacity: 0.65, y: 12 } : { opacity: 1, y: 0 }} transition={{ duration: motionEnabled ? 0.4 : 0, ease: [0.16, 1, 0.3, 1] }}>
        <div className="foro-card-votes" aria-label={`Votación de ${post.titulo}`}>
          <button aria-label="Votar a favor" aria-pressed={miVoto === 1} disabled={votando} onClick={() => onVotar(post.id, 1, miVoto)} className={`foro-card-vote foro-card-vote--positive ${miVoto === 1 ? 'is-selected' : ''}`}><Star size={21} className={miVoto === 1 ? 'fill-current' : ''} /></button>
          <span className={`foro-card-score ${post.puntuacion > 0 ? 'is-positive' : post.puntuacion < 0 ? 'is-negative' : ''}`}>{post.puntuacion}</span>
          <button aria-label="Votar en contra" aria-pressed={miVoto === -1} disabled={votando} onClick={() => onVotar(post.id, -1, miVoto)} className={`foro-card-vote foro-card-vote--negative ${miVoto === -1 ? 'is-selected' : ''}`}><CloudLightning size={21} className={miVoto === -1 ? 'fill-current' : ''} /></button>
          <span className="foro-card-vote-caption">Tu voto</span>
        </div>
        <div className="foro-card-main">
          <header className="foro-card-meta">
            <Link to={`${RUTAS.PERFIL}/${encodeURIComponent(autor?.discord_nombre || '')}`} className="foro-card-author"><img loading="lazy" src={autor?.avatar_url || '/imagenes/LogoTHC.png'} alt="" /><span>{nombreMostrar}</span></Link>
            <span className="foro-card-role" style={{ color: rango.color }}>{rango.nombre}</span>
            <time dateTime={post.creado_en}>{fecha}</time>
          </header>
          <span className={`foro-card-category ${etiquetaConfig.color}`}><Hash size={15} aria-hidden="true" />{etiquetaConfig.nombre}</span>
          <Link to={`/foro/${post.id}`} className="foro-card-story"><h3>{post.titulo}</h3><p>{post.contenido}</p></Link>
          {post.imagenes && post.imagenes.length > 0 && <div className="foro-card-images">{post.imagenes.map(imagenSegura).filter(Boolean).map((img, idx) => <img key={idx} loading="lazy" decoding="async" src={img} alt="Adjunto" />)}</div>}
          <Link to={`/foro/${post.id}`} className="foro-card-conversation"><span><MessageSquare size={18} /><strong>{post.comentarios_count}</strong> respuestas</span><span>Entrar al debate <ArrowUpRight size={20} /></span></Link>
        </div>
      </motion.article>
    </div>
  );
}
export default memo(TarjetaPublicacion);
