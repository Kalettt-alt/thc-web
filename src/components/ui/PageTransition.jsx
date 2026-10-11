import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, MotionConfig, useAnimationControls } from 'framer-motion';

export default function PageTransition() {
  const { pathname, hash } = useLocation();
  const module = pathname.split('/')[1] || 'inicio';
  const previousModule = useRef(module);
  const controls = useAnimationControls();

  useEffect(() => {
    if (!hash) window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname, hash]);

  useEffect(() => {
    if (module === previousModule.current) return;
    previousModule.current = module;
    controls.set('hidden');
    void controls.start('cover');
    const timer = setTimeout(() => { void controls.start('reveal'); }, 1200);
    return () => { clearTimeout(timer); controls.stop(); };
  }, [module, controls]);

  return (
    <MotionConfig reducedMotion="never">
    <div aria-hidden="true" className="fixed inset-0 pointer-events-none flex flex-col" style={{ zIndex: 'var(--z-transition, 10000)' }}>
      <motion.div
        className="absolute inset-0 bg-[#F47A20] origin-bottom pointer-events-none"
        initial="hidden" animate={controls}
        variants={{ hidden: { scaleY: 0 }, cover: { scaleY: 1 }, reveal: { scaleY: 0 } }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      />
      <motion.div
        className="absolute inset-0 bg-[#050505] origin-bottom flex items-center justify-center pointer-events-none"
        initial="hidden" animate={controls}
        variants={{ hidden: { scaleY: 0 }, cover: { scaleY: 1 }, reveal: { scaleY: 0 } }}
        transition={{ duration: 0.5, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
      >
        <img src="/imagenes/LogoTHC.png" alt="" className="w-20 h-20 object-contain" />
      </motion.div>
    </div>
    </MotionConfig>
  );
}
