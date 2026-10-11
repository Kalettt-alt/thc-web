import { motion, MotionConfig, useReducedMotion } from 'framer-motion';
import { Newspaper, Zap } from 'lucide-react';
import { useHomeMotion } from '../../utils/homeMotion';
import './NoticiasDF.css';

export default function NoticiasDF({ noticias = [], getImg }) {
  const { motionEnabled } = useHomeMotion();
  const reducedMotion = useReducedMotion();
  const animate = motionEnabled && !reducedMotion;
  const today = new Intl.DateTimeFormat('es-CO', { timeZone: 'America/Bogota', day: 'numeric', month: 'long' }).format(new Date());
  return <MotionConfig reducedMotion={animate ? 'never' : 'always'}>
    <motion.section className="df-news" data-motion={animate ? 'on' : 'off'} initial={animate ? { opacity: 0, y: 14 } : false} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} aria-labelledby="df-news-title">
      <header className="df-news-header">
        <div className="df-news-edition"><span><Newspaper size={17} /> La actualidad de tu carrera</span><time>{today}</time></div>
        <h1 id="df-news-title">EL DIARIO <span>THC.</span></h1>
      </header>
      <div className="df-news-stories">
        {noticias.map((story, index) => <motion.article key={story.id || story.titular + index} className={'df-news-story' + (index === 0 ? ' df-news-story--lead' : '')}
          initial={animate ? { opacity: 0, y: 16 } : false} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: false, amount: .12 }} transition={{ duration: .35, delay: animate ? Math.min(index * .05, .15) : 0 }}>
          <div className="df-news-story-copy">
            <span className="df-news-section">{story.sub || 'Desde el club'}</span>
            <h2>{story.titular}</h2>
            <p>{story.desc}</p>
            {story.impactosTag?.length > 0 && <div className="df-news-facts">{story.impactosTag.map((tag, i) => <span key={tag.label + i}>{tag.label}</span>)}</div>}
          </div>
          {index === 0 && <div className="df-news-club" aria-hidden="true">{story.img ? <img src={getImg(story.img)} alt="" /> : <Zap size={92} strokeWidth={1.3} />}</div>}
        </motion.article>)}
        {!noticias.length && <div className="df-news-empty"><Newspaper size={38} /><h2>La próxima historia se juega.</h2><p>Los resultados, la tabla y tu plantel aparecerán aquí después de cada jornada.</p></div>}
      </div>
      <footer className="df-news-footer"><Zap size={15} /> DT Fantasy · Tu equipo escribe la historia.</footer>
    </motion.section>
  </MotionConfig>;
}