import { useEffect, useMemo, useRef, useCallback } from 'react';
import { useGesture } from '@use-gesture/react';
import ImgMuroPredeterminada from './ImgMuro.jpg';                                      

const DEFAULTS = {
  maxVerticalRotationDeg: 5,
  dragSensitivity: 20,
  enlargeTransitionMs: 300,
  segments: 34
};

const clamp = (v, min, max) => Math.min(Math.max(v, min), max);
const normalizeAngle = d => ((d % 360) + 360) % 360;
const wrapAngleSigned = deg => {
  const a = (((deg + 180) % 360) + 360) % 360;
  return a - 180;
};
const getDataNumber = (el, name, fallback) => {
  const attr = el.dataset[name] ?? el.getAttribute(`data-${name}`);
  const n = attr == null ? NaN : parseFloat(attr);
  return Number.isFinite(n) ? n : fallback;
};

                                                                      
function buildItems(pool, seg) {
  const xCols = Array.from({ length: seg }, (_, i) => -37 + i * 2);
  const evenYs = [-4, -2, 0, 2, 4];
  const oddYs = [-3, -1, 1, 3, 5];

  const coords = xCols.flatMap((x, c) => {
    const ys = c % 2 === 0 ? evenYs : oddYs;
    return ys.map(y => ({ x, y, sizeX: 2, sizeY: 2 }));
  });
  // A partial page must put its real photos in front of the viewer instead of
  // filling the back of the sphere while showing placeholders in the centre.
  coords.sort((a, b) => (Math.abs(a.x + 0.5) + Math.abs(a.y - 0.5) * 0.7)
    - (Math.abs(b.x + 0.5) + Math.abs(b.y - 0.5) * 0.7));

  const totalSlots = coords.length;
  
                                                                    
  const usedImages = [];
  for (let i = 0; i < totalSlots; i++) {
    if (i < pool.length) {
      usedImages.push(pool[i]);
    } else {
      usedImages.push({ src: ImgMuroPredeterminada, titulo: '', descripcion: '', isPlaceholder: true });                                   
    }
  }

  return coords.map((c, i) => ({
    ...c,
    ...usedImages[i]
  }));
}

function computeItemBaseRotation(offsetX, offsetY, sizeX, sizeY, segments) {
  const unit = 360 / segments / 2;
  const rotateY = unit * (offsetX + (sizeX - 1) / 2);
  const rotateX = unit * (offsetY - (sizeY - 1) / 2);
  return { rotateX, rotateY };
}

export default function DomeGallery({
  images = [],
  onItemOpen, 
  onItemClose, 
  fit = 0.5,
  fitBasis = 'auto',
  minRadius = 600,
  maxRadius = Infinity,
  padFactor = 0.25,
  overlayBlurColor = 'rgba(3,3,3,0.9)',
  maxVerticalRotationDeg = DEFAULTS.maxVerticalRotationDeg,
  dragSensitivity = DEFAULTS.dragSensitivity,
  enlargeTransitionMs = DEFAULTS.enlargeTransitionMs,
  segments = DEFAULTS.segments,
  dragDampening = 2,
  openedImageWidth = '400px',
  openedImageHeight = '400px',
  imageBorderRadius = '12px',
  openedImageBorderRadius = '24px',
  grayscale = true
}) {
  const rootRef = useRef(null);
  const mainRef = useRef(null);
  const sphereRef = useRef(null);
  const frameRef = useRef(null);
  const viewerRef = useRef(null);
  const scrimRef = useRef(null);
  const focusedElRef = useRef(null);
  const originalTilePositionRef = useRef(null);

  const rotationRef = useRef({ x: 0, y: 0 });
  const startRotRef = useRef({ x: 0, y: 0 });
  const startPosRef = useRef(null);
  const draggingRef = useRef(false);
  const cancelTapRef = useRef(false);
  const movedRef = useRef(false);
  const inertiaRAF = useRef(null);
  const pointerTypeRef = useRef('mouse');
  const tapTargetRef = useRef(null);
  const openingRef = useRef(false);
  const openStartedAtRef = useRef(0);
  const lastDragEndAt = useRef(0);
  const scrollLockedRef = useRef(false);

  const items = useMemo(() => buildItems(images, segments), [images, segments]);

  const lockScroll = useCallback(() => {
    if (scrollLockedRef.current) return;
    scrollLockedRef.current = true;
    document.body.style.overflow = 'hidden';
  }, []);
  
  const unlockScroll = useCallback(() => {
    if (!scrollLockedRef.current) return;
    if (rootRef.current?.getAttribute('data-enlarging') === 'true') return;
    scrollLockedRef.current = false;
    document.body.style.overflow = '';
  }, []);

  const applyTransform = (xDeg, yDeg) => {
    if (sphereRef.current) sphereRef.current.style.transform = `translateZ(calc(var(--radius) * -1)) rotateX(${xDeg}deg) rotateY(${yDeg}deg)`;
  };

  const lockedRadiusRef = useRef(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const ro = new ResizeObserver(entries => {
      const cr = entries[0].contentRect;
      const w = Math.max(1, cr.width), h = Math.max(1, cr.height);
      const minDim = Math.min(w, h), maxDim = Math.max(w, h), aspect = w / h;
      const basis = fitBasis === 'width' ? w : fitBasis === 'height' ? h : fitBasis === 'max' ? maxDim : fitBasis === 'min' ? minDim : aspect >= 1.3 ? w : minDim;
      
      let radius = clamp(basis * fit, minRadius, maxRadius);
      lockedRadiusRef.current = Math.round(radius);

      root.style.setProperty('--radius', `${lockedRadiusRef.current}px`);
      root.style.setProperty('--viewer-pad', `${Math.max(8, Math.round(minDim * padFactor))}px`);
      root.style.setProperty('--overlay-blur-color', overlayBlurColor);
      root.style.setProperty('--tile-radius', imageBorderRadius);
      root.style.setProperty('--enlarge-radius', openedImageBorderRadius);
      root.style.setProperty('--image-filter', grayscale ? 'grayscale(1)' : 'none');
      
      applyTransform(rotationRef.current.x, rotationRef.current.y);

      const enlargedOverlay = viewerRef.current?.querySelector('.enlarge');
      if (enlargedOverlay && frameRef.current && mainRef.current) {
        const frameR = frameRef.current.getBoundingClientRect();
        const mainR = mainRef.current.getBoundingClientRect();
        enlargedOverlay.style.left = `${frameR.left - mainR.left}px`;
        enlargedOverlay.style.top = `${frameR.top - mainR.top}px`;
        enlargedOverlay.style.width = `${frameR.width}px`;
        enlargedOverlay.style.height = `${frameR.height}px`;
      }
    });
    ro.observe(root);
    return () => ro.disconnect();
  }, [fit, fitBasis, minRadius, maxRadius, padFactor, overlayBlurColor, grayscale, imageBorderRadius, openedImageBorderRadius]);

  useEffect(() => {
    cancelAnimationFrame(inertiaRAF.current);
    rotationRef.current = { x: 0, y: 0 };
    applyTransform(0, 0);
  }, [images]);

  const stopInertia = useCallback(() => {
    if (inertiaRAF.current) { cancelAnimationFrame(inertiaRAF.current); inertiaRAF.current = null; }
  }, []);

  const startInertia = useCallback((vx, vy) => {
    let vX = clamp(vx, -1.4, 1.4) * 80; let vY = clamp(vy, -1.4, 1.4) * 80;
    let frames = 0;
    const frictionMul = 0.94 + 0.055 * clamp(dragDampening ?? 0.6, 0, 1);
    const stopThreshold = 0.015 - 0.01 * clamp(dragDampening ?? 0.6, 0, 1);
    
    const step = () => {
      vX *= frictionMul; vY *= frictionMul;
      if ((Math.abs(vX) < stopThreshold && Math.abs(vY) < stopThreshold) || ++frames > 360) {
        inertiaRAF.current = null; return;
      }
      const nextX = clamp(rotationRef.current.x - vY / 200, -maxVerticalRotationDeg, maxVerticalRotationDeg);
      const nextY = wrapAngleSigned(rotationRef.current.y + vX / 200);
      rotationRef.current = { x: nextX, y: nextY };
      applyTransform(nextX, nextY);
      inertiaRAF.current = requestAnimationFrame(step);
    };
    stopInertia();
    inertiaRAF.current = requestAnimationFrame(step);
  }, [dragDampening, maxVerticalRotationDeg, stopInertia]);

  useGesture({
    onDragStart: ({ event }) => {
      if (focusedElRef.current) return;
      stopInertia();
      pointerTypeRef.current = event.pointerType || 'mouse';
      if (pointerTypeRef.current === 'touch') { event.preventDefault(); lockScroll(); }
      draggingRef.current = true; cancelTapRef.current = false; movedRef.current = false;
      startRotRef.current = { ...rotationRef.current };
      startPosRef.current = { x: event.clientX, y: event.clientY };
      tapTargetRef.current = event.target.closest?.('.item__image') || null;
    },
    onDrag: ({ event, last, velocity: velArr = [0, 0], direction: dirArr = [0, 0], movement }) => {
      if (focusedElRef.current || !draggingRef.current || !startPosRef.current) return;
      if (pointerTypeRef.current === 'touch') event.preventDefault();

      const dxTotal = event.clientX - startPosRef.current.x;
      const dyTotal = event.clientY - startPosRef.current.y;
      if (!movedRef.current && (dxTotal * dxTotal + dyTotal * dyTotal > 16)) movedRef.current = true;

      const nextX = clamp(startRotRef.current.x - dyTotal / dragSensitivity, -maxVerticalRotationDeg, maxVerticalRotationDeg);
      const nextY = startRotRef.current.y + dxTotal / dragSensitivity;

      if (rotationRef.current.x !== nextX || rotationRef.current.y !== nextY) {
        rotationRef.current = { x: nextX, y: nextY };
        applyTransform(nextX, nextY);
      }

      if (last) {
        draggingRef.current = false;
        let isTap = false;
        if (startPosRef.current) {
          const dist2 = Math.pow(event.clientX - startPosRef.current.x, 2) + Math.pow(event.clientY - startPosRef.current.y, 2);
          if (dist2 <= Math.pow(pointerTypeRef.current === 'touch' ? 10 : 6, 2)) isTap = true;
        }

        let [vx, vy] = [velArr[0] * dirArr[0], velArr[1] * dirArr[1]];
        if (!isTap && Math.abs(vx) < 0.001 && Math.abs(vy) < 0.001 && Array.isArray(movement)) {
          vx = (movement[0] / dragSensitivity) * 0.02; vy = (movement[1] / dragSensitivity) * 0.02;
        }

        if (!isTap && (Math.abs(vx) > 0.005 || Math.abs(vy) > 0.005)) startInertia(vx, vy);
        
        startPosRef.current = null;
        cancelTapRef.current = !isTap;

        if (isTap && tapTargetRef.current && !focusedElRef.current) openItemFromElement(tapTargetRef.current);
        tapTargetRef.current = null;
        if (cancelTapRef.current) setTimeout(() => (cancelTapRef.current = false), 120);
        if (movedRef.current) lastDragEndAt.current = event.timeStamp;
        movedRef.current = false;
        if (pointerTypeRef.current === 'touch') unlockScroll();
      }
    }
  }, { target: mainRef, eventOptions: { passive: false } });

  useEffect(() => {
    const scrim = scrimRef.current;
    if (!scrim) return;

    const close = () => {
      if (performance.now() - openStartedAtRef.current < 250) return;
      const el = focusedElRef.current;
      if (!el) return;
      
      const parent = el.parentElement;
      const overlay = viewerRef.current?.querySelector('.enlarge');
      if (!overlay) return;

      const refDiv = parent.querySelector('.item__image--reference');
      const originalPos = originalTilePositionRef.current;
      
      if (!originalPos) {
        overlay.remove();
        if (refDiv) refDiv.remove();
        parent.style.setProperty('--rot-y-delta', `0deg`);
        parent.style.setProperty('--rot-x-delta', `0deg`);
        el.style.visibility = '';
        focusedElRef.current = null;
        openingRef.current = false;
        if (onItemClose) onItemClose();
        return;
      }

      const rootRect = rootRef.current.getBoundingClientRect();
      const currentRect = overlay.getBoundingClientRect();

      const animatingOverlay = document.createElement('div');
      animatingOverlay.style.cssText = `
        position: absolute; left: ${currentRect.left - rootRect.left}px; top: ${currentRect.top - rootRect.top}px;
        width: ${currentRect.width}px; height: ${currentRect.height}px; z-index: 9999;
        border-radius: ${openedImageBorderRadius}; overflow: hidden; transition: all ${enlargeTransitionMs}ms ease-out; pointer-events: none;
      `;
      
      const originalImg = overlay.querySelector('img');
      if (originalImg) {
        const img = originalImg.cloneNode();
        img.style.cssText = `width: 100%; height: 100%; object-fit: cover; filter: ${grayscale ? 'grayscale(1)' : 'none'}; transition: filter 0.3s;`;
        animatingOverlay.appendChild(img);
      }

      overlay.remove();
      rootRef.current.appendChild(animatingOverlay);
      void animatingOverlay.getBoundingClientRect();

      requestAnimationFrame(() => {
        animatingOverlay.style.left = `${originalPos.left - rootRect.left}px`;
        animatingOverlay.style.top = `${originalPos.top - rootRect.top}px`;
        animatingOverlay.style.width = `${originalPos.width}px`;
        animatingOverlay.style.height = `${originalPos.height}px`;
        animatingOverlay.style.opacity = '0';
      });

      animatingOverlay.addEventListener('transitionend', () => {
        animatingOverlay.remove();
        originalTilePositionRef.current = null;
        if (refDiv) refDiv.remove();
        
        parent.style.transition = 'none';
        parent.style.setProperty('--rot-y-delta', `0deg`);
        parent.style.setProperty('--rot-x-delta', `0deg`);

        requestAnimationFrame(() => {
          el.style.visibility = ''; el.style.opacity = '0'; el.style.zIndex = 0;
          focusedElRef.current = null;
          rootRef.current?.removeAttribute('data-enlarging');

          requestAnimationFrame(() => {
            el.style.transition = 'opacity 300ms ease-out';
            requestAnimationFrame(() => {
              el.style.opacity = '1';
              setTimeout(() => {
                el.style.transition = ''; el.style.opacity = ''; openingRef.current = false;
                if (!draggingRef.current) unlockScroll();
              }, 300);
            });
          });
        });
      }, { once: true });

      if (onItemClose) onItemClose();
    };

    scrim.addEventListener('click', close);
    const onKey = e => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);

    return () => { scrim.removeEventListener('click', close); window.removeEventListener('keydown', onKey); };
  }, [enlargeTransitionMs, openedImageBorderRadius, grayscale, onItemClose, unlockScroll]);

  const openItemFromElement = el => {
    if (openingRef.current) return;
    openingRef.current = true;
    openStartedAtRef.current = performance.now();
    lockScroll();
    
    const parent = el.parentElement;
    
    if(parent.dataset.placeholder === 'true') {
      openingRef.current = false;
      unlockScroll();
      return;
    }

    focusedElRef.current = el;

    const parentRot = computeItemBaseRotation(getDataNumber(parent, 'offsetX', 0), getDataNumber(parent, 'offsetY', 0), 2, 2, segments);
    let rotY = -(normalizeAngle(parentRot.rotateY) + normalizeAngle(rotationRef.current.y)) % 360;
    if (rotY < -180) rotY += 360;
    const rotX = -parentRot.rotateX - rotationRef.current.x;

    parent.style.setProperty('--rot-y-delta', `${rotY}deg`);
    parent.style.setProperty('--rot-x-delta', `${rotX}deg`);

    const refDiv = document.createElement('div');
    refDiv.className = 'item__image item__image--reference opacity-0';
    refDiv.style.transform = `rotateX(${-parentRot.rotateX}deg) rotateY(${-parentRot.rotateY}deg)`;
    parent.appendChild(refDiv);
    void refDiv.offsetHeight;

    const tileR = refDiv.getBoundingClientRect();
    const mainR = mainRef.current?.getBoundingClientRect();
    const frameR = frameRef.current?.getBoundingClientRect();

    originalTilePositionRef.current = { left: tileR.left, top: tileR.top, width: tileR.width, height: tileR.height };
    el.style.visibility = 'hidden';

    const overlay = document.createElement('div');
    overlay.className = 'enlarge';
    overlay.style.cssText = `position: absolute; left: ${frameR.left - mainR.left}px; top: ${frameR.top - mainR.top}px; width: ${frameR.width}px; height: ${frameR.height}px; opacity: 0; z-index: 30; transform-origin: top left; transition: transform ${enlargeTransitionMs}ms ease, opacity ${enlargeTransitionMs}ms ease; border-radius: ${openedImageBorderRadius}; overflow: hidden; box-shadow: 0 20px 50px rgba(0,0,0,0.8);`;

    const img = document.createElement('img');
    img.src = parent.dataset.src;
    img.style.cssText = `width: 100%; height: 100%; object-fit: contain; background: #060606; filter: none;`; 
    overlay.appendChild(img);
    viewerRef.current.appendChild(overlay);

    const tx0 = tileR.left - frameR.left;
    const ty0 = tileR.top - frameR.top;
    const sx0 = tileR.width / frameR.width;
    const sy0 = tileR.height / frameR.height;

    overlay.style.transform = `translate(${tx0}px, ${ty0}px) scale(${sx0}, ${sy0})`;

    setTimeout(() => {
      overlay.style.opacity = '1';
      overlay.style.transform = 'translate(0px, 0px) scale(1, 1)';
      rootRef.current?.setAttribute('data-enlarging', 'true');
    }, 16);

    if(onItemOpen) {
      onItemOpen({
        id: parent.dataset.id,
        titulo: parent.dataset.titulo,
        descripcion: parent.dataset.desc,
        autor_nombre: parent.dataset.autorNombre,
        autor_avatar: parent.dataset.autorAvatar,
        autor_id: parent.dataset.autorId,
        creado_en: parent.dataset.fecha
      });
    }
  };

  const cssStyles = `
    .sphere-root {
      --radius: 520px; --viewer-pad: 72px; --circ: calc(var(--radius) * 3.14);
      --rot-y: calc((360deg / var(--segments-x)) / 2); --rot-x: calc((360deg / var(--segments-y)) / 2);
      --item-width: calc(var(--circ) / var(--segments-x)); --item-height: calc(var(--circ) / var(--segments-y));
    }
    .sphere-root * { box-sizing: border-box; }
    .sphere, .sphere-item, .item__image { transform-style: preserve-3d; }
    .stage { width: 100%; height: 100%; display: grid; place-items: center; position: absolute; inset: 0; margin: auto; perspective: calc(var(--radius) * 2); perspective-origin: 50% 50%; }
    .sphere { transform: translateZ(calc(var(--radius) * -1)); will-change: transform; position: absolute; }
    .sphere-item {
      width: calc(var(--item-width) * var(--item-size-x)); height: calc(var(--item-height) * var(--item-size-y));
      position: absolute; top: -999px; bottom: -999px; left: -999px; right: -999px; margin: auto;
      transform-origin: 50% 50%; backface-visibility: hidden; transition: transform 300ms;
      transform: rotateY(calc(var(--rot-y) * (var(--offset-x) + ((var(--item-size-x) - 1) / 2)) + var(--rot-y-delta, 0deg))) rotateX(calc(var(--rot-x) * (var(--offset-y) - ((var(--item-size-y) - 1) / 2)) + var(--rot-x-delta, 0deg))) translateZ(var(--radius));
    }
    .sphere-root[data-enlarging="true"] .scrim { opacity: 1 !important; pointer-events: all !important; }
    .item__image { position: absolute; inset: 10px; border-radius: var(--tile-radius, 12px); overflow: hidden; cursor: pointer; backface-visibility: hidden; transition: transform 300ms; }
    .item__image:hover { transform: scale(1.05); z-index: 10; border: 2px solid #F47A20; }
    .item__image--reference { position: absolute; inset: 10px; pointer-events: none; }
  `;

  return (
    <>
      <style>{cssStyles}</style>
      <div ref={rootRef} className="sphere-root relative w-full h-full" style={{ ['--segments-x']: segments, ['--segments-y']: segments, ['--overlay-blur-color']: overlayBlurColor, ['--tile-radius']: imageBorderRadius, ['--enlarge-radius']: openedImageBorderRadius, ['--image-filter']: grayscale ? 'grayscale(1)' : 'none' }}>
        <main ref={mainRef} className="absolute inset-0 grid place-items-center overflow-hidden select-none" style={{ touchAction: 'none', WebkitUserSelect: 'none', backgroundColor: `var(--overlay-blur-color, ${overlayBlurColor})` }}>
          <div className="stage">
            <div ref={sphereRef} className="sphere">
              {items.map((it, i) => (
                <div key={`${it.x},${it.y},${i}`} className="sphere-item absolute m-auto" 
                     data-id={it.id} data-src={it.src} data-titulo={it.titulo} data-desc={it.descripcion} 
                     data-autor-nombre={it.autor?.discord_nombre} data-autor-avatar={it.autor?.avatar_url} data-autor-id={it.autor_id} 
                     data-fecha={it.creado_en} data-placeholder={it.isPlaceholder}
                     data-offset-x={it.x} data-offset-y={it.y} data-size-x={it.sizeX} data-size-y={it.sizeY}
                     style={{ ['--offset-x']: it.x, ['--offset-y']: it.y, ['--item-size-x']: it.sizeX, ['--item-size-y']: it.sizeY, top: '-999px', bottom: '-999px', left: '-999px', right: '-999px' }}>
                  <div className="item__image absolute block overflow-hidden cursor-pointer" role="button" tabIndex={0}
                       onClick={e => { if(!draggingRef.current && !movedRef.current && !openingRef.current) openItemFromElement(e.currentTarget); }}
                       style={{ inset: '10px', borderRadius: `var(--tile-radius, ${imageBorderRadius})`, backgroundColor: '#111' }}>
                    <img src={it.src} draggable={false} className="w-full h-full object-cover pointer-events-none" style={{ filter: `var(--image-filter, ${grayscale ? 'grayscale(1)' : 'none'})` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="absolute inset-0 m-auto z-[3] pointer-events-none" style={{ backgroundImage: `radial-gradient(rgba(235, 235, 235, 0) 65%, var(--overlay-blur-color, ${overlayBlurColor}) 100%)` }} />
          <div className="absolute inset-0 m-auto z-[3] pointer-events-none" style={{ WebkitMaskImage: `radial-gradient(rgba(235, 235, 235, 0) 70%, var(--overlay-blur-color, ${overlayBlurColor}) 90%)`, maskImage: `radial-gradient(rgba(235, 235, 235, 0) 70%, var(--overlay-blur-color, ${overlayBlurColor}) 90%)`, backdropFilter: 'blur(3px)' }} />
          <div ref={viewerRef} className="absolute inset-0 z-20 pointer-events-none flex items-center justify-center" style={{ padding: 'var(--viewer-pad)' }}>
            <div ref={scrimRef} className="scrim absolute inset-0 z-10 pointer-events-none opacity-0 transition-opacity duration-500" style={{ background: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(10px)' }} />
            <div ref={frameRef} className="viewer-frame flex" style={{ width: `min(${openedImageWidth}, calc(100vw - 32px))`, height: `min(${openedImageHeight}, calc(100dvh - 160px))`, borderRadius: `var(--enlarge-radius, ${openedImageBorderRadius})` }} />
          </div>
        </main>
      </div>
    </>
  );
}
