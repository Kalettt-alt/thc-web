import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowUpRight, Headphones } from 'lucide-react';
import { getYouTubeThumbnail } from '../../utils/youtube';
import './MusicControlsUT.css';

export default function WidgetReproductor({ currentSong, isPlaying, onOpen }) {
  const reducedMotion = useReducedMotion();
  return <AnimatePresence>{currentSong && isPlaying && <motion.button
    type="button" key={currentSong.id || currentSong.url} onClick={onOpen}
    aria-label={`Abrir controles de música: ${currentSong.title}`}
    initial={{ opacity: 0, y: reducedMotion ? 0 : 16 }}
    animate={{ opacity: [0, 1, 1, 0], y: 0, visibility: ['visible', 'visible', 'visible', 'hidden'] }}
    exit={{ opacity: 0, transition: { duration: .15 } }}
    transition={{ opacity: { duration: 7, times: [0, .04, .92, 1] }, visibility: { duration: 7, times: [0, .04, .99, 1] }, y: { duration: .25 } }}
    className="ut-music-widget"
  >
    <span className="ut-music-widget__art"><img src={currentSong.thumbnail || getYouTubeThumbnail(currentSong.url)} alt="" /><span aria-hidden="true"><i /><i /><i /></span></span>
    <span className="ut-music-widget__copy"><span><Headphones size={12} aria-hidden="true" /> Ahora suena</span><strong>{currentSong.title}</strong><small>{currentSong.artist}</small></span>
    <ArrowUpRight size={19} aria-hidden="true" />
    <span className="ut-music-widget__life" aria-hidden="true" />
  </motion.button>}</AnimatePresence>;
}
