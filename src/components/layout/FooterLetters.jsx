import { useEffect, useRef } from 'react';
import { animate, motion, useMotionValue, useScroll, useSpring, useTransform } from 'framer-motion';

const LETTERS = Array.from('TRUENO');
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function FooterLetter({ letter, index, progress, enabled, stageRef, resetSignal }) {
  const buttonRef = useRef(null);
  const dragX = useMotionValue(0);
  const dragY = useMotionValue(0);
  const interacted = useMotionValue(0);
  const entrance = useTransform(progress, [0, .42 + index * .025, .86, 1], [-230 - index * 16, 0, 0, 85 + index * 8]);
  const tilt = useTransform(progress, [0, .48 + index * .02, .86, 1], [index % 2 ? 19 : -19, 0, 0, index % 2 ? -7 : 7]);
  const entranceTarget = useTransform([entrance, interacted], ([value, touched]) => enabled && !touched ? value : 0);
  const tiltTarget = useTransform([tilt, interacted], ([value, touched]) => enabled && !touched ? value : 0);
  const rise = useSpring(entranceTarget, { stiffness: 130, damping: 17, mass: .45 });
  const rotate = useSpring(tiltTarget, { stiffness: 120, damping: 18 });

  useEffect(() => {
    interacted.set(0);
    const transition = enabled ? { type: 'spring', stiffness: 270, damping: 16 } : { duration: 0 };
    const animationX = animate(dragX, 0, transition);
    const animationY = animate(dragY, 0, transition);
    return () => { animationX.stop(); animationY.stop(); };
  }, [resetSignal, enabled, dragX, dragY, interacted]);

  const stabilizeGlyph = () => {
    interacted.set(1);
    rise.jump(0);
    rotate.jump(0);
  };

  const keyboardMove = event => {
    if (!enabled) return;
    if (event.key === 'Enter' || event.key === ' ' || event.key === 'Escape') {
      event.preventDefault();
      stabilizeGlyph();
      animate(dragX, 0, { type: 'spring', stiffness: 260, damping: 13 });
      animate(dragY, 0, { type: 'spring', stiffness: 260, damping: 13 });
      return;
    }
    const movement = { ArrowLeft: [-24, 0], ArrowRight: [24, 0], ArrowUp: [0, -24], ArrowDown: [0, 24] }[event.key];
    if (!movement) return;
    event.preventDefault();
    stabilizeGlyph();
    const stage = stageRef.current?.getBoundingClientRect();
    const button = buttonRef.current?.getBoundingClientRect();
    if (!stage || !button) return;
    const targetX = dragX.get() + movement[0];
    const targetY = dragY.get() + movement[1];
    animate(dragX, clamp(targetX, dragX.get() + stage.left - button.left, dragX.get() + stage.right - button.right), { type: 'spring', stiffness: 320, damping: 25 });
    animate(dragY, clamp(targetY, dragY.get() + stage.top - button.top, dragY.get() + stage.bottom - button.bottom), { type: 'spring', stiffness: 320, damping: 25 });
  };

  return <div className="thc-footer-letter-slot">
    <motion.button ref={buttonRef} type="button" className={`thc-footer-letter thc-footer-letter--${index}`} drag={enabled} dragConstraints={stageRef} dragElastic={.1} dragTransition={{ bounceStiffness: 480, bounceDamping: 19 }} style={{ x: dragX, y: dragY }} onPointerDown={enabled ? stabilizeGlyph : undefined} onKeyDown={keyboardMove} aria-label={`Mover letra ${letter}`} aria-describedby="footer-letter-help" disabled={!enabled}><motion.span style={{ y: enabled ? rise : 0, rotate: enabled ? rotate : 0 }} whileHover={enabled ? { scale: 1.045 } : undefined} whileTap={enabled ? { scale: .96 } : undefined}>{letter}</motion.span></motion.button>
  </div>;
}

export default function FooterLetters({ enabled, resetSignal }) {
  const stageRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: stageRef, offset: ['start end', 'end start'] });

  return <div className="thc-footer-letter-stage" ref={stageRef}>
    <div className="thc-footer-letter-field" aria-hidden="true"><i /><i /><i /></div>
    <div className="thc-footer-letter-row" role="group" aria-label="TRUENO, letras interactivas">{LETTERS.map((letter, index) => <FooterLetter key={`${letter}-${index}`} letter={letter} index={index} progress={scrollYProgress} enabled={enabled} stageRef={stageRef} resetSignal={resetSignal} />)}</div>
    <span className="thc-footer-word-caption" aria-hidden="true">NOS UNE.</span>
    <span className="thc-footer-screen-reader" id="footer-letter-help">Arrastra para mover la letra dentro del escenario. Con el teclado, usa las flechas para moverla y Enter, Espacio o Escape para devolverla a su sitio. Rearmar letras devuelve todas a su sitio.</span>
  </div>;
}
