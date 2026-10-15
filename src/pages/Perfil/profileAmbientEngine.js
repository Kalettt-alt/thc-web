const TAU = Math.PI * 2;
const ANIMATED_IDS = new Set(['aurora', 'vinilo', 'eclipse', 'prisma', 'orbita', 'circuito', 'lienzo', 'cromo', 'casino']);
const PALETTES = {
  aurora: ['#62F2C0', '#BE86FF', '#ECAEFF'],
  vinilo: ['#FF9B62', '#FF6496', '#FFD1A8'],
  eclipse: ['#FFD584', '#FFF2D0', '#DF8748'],
  prisma: ['#75F4DC', '#8FB0FF', '#EF91F3'],
  orbita: ['#FFAE73', '#97B9FF', '#D3BAFF'],
  circuito: ['#C8FF68', '#90A7FF', '#D6FFE1'],
  lienzo: ['#EC8D45', '#AA549D', '#568986'],
  casino: ['#E34835', '#E6B936', '#3869DA'],
};

export function ambientThemeId(themeId) {
  if (!ANIMATED_IDS.has(themeId)) return null;
  return themeId === 'cromo' ? 'casino' : themeId;
}

export function ambientLimits(width, devicePixelRatio = 1) {
  const mobile = width < 700;
  return { mobile, particles: mobile ? 12 : 18, dpr: Math.max(1, Math.min(devicePixelRatio || 1, mobile ? 1.25 : 1.5)), fps: mobile ? 24 : 30 };
}

// A single path around the viewport keeps Casino's rolling lights out of the reading area.
export function edgePoint(progress, width, height, inset = 24) {
  const w = Math.max(1, width - inset * 2);
  const h = Math.max(1, height - inset * 2);
  const perimeter = (w + h) * 2;
  const distance = ((progress % 1) + 1) % 1 * perimeter;
  if (distance < w) return { x: inset + distance, y: inset, angle: 0 };
  if (distance < w + h) return { x: width - inset, y: inset + distance - w, angle: Math.PI / 2 };
  if (distance < w * 2 + h) return { x: width - inset - (distance - w - h), y: height - inset, angle: Math.PI };
  return { x: inset, y: height - inset - (distance - w * 2 - h), angle: Math.PI * 1.5 };
}

function alpha(context, amount, draw) {
  context.save();
  context.globalAlpha = amount;
  draw();
  context.restore();
}

function line(context, points, color, width = 1) {
  context.beginPath();
  points.forEach(([x, y], i) => i ? context.lineTo(x, y) : context.moveTo(x, y));
  context.strokeStyle = color;
  context.lineWidth = width;
  context.stroke();
}

function glow(context, x, y, radius, color, opacity = 1) {
  alpha(context, opacity, () => {
    const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, color);
    gradient.addColorStop(.2, `${color}AA`);
    gradient.addColorStop(1, `${color}00`);
    context.fillStyle = gradient;
    context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  });
}

function dot(context, x, y, radius, color) {
  context.beginPath();
  context.arc(x, y, radius, 0, TAU);
  context.fillStyle = color;
  context.fill();
}

function aurora(context, frame) {
  const { width: w, height: h, motion: t, colorTime, palette, pointer } = frame;
  for (let i = 0; i < 5; i++) {
    const offset = Math.sin(t * .8 + i * 1.1) * 90;
    const y = 10 + i * 24 + offset + pointer.y * 12;
    const gradient = context.createLinearGradient(0, y, w, 230);
    gradient.addColorStop(0, `${palette[i % 3]}00`);
    gradient.addColorStop(.18, `${palette[i % 3]}89`);
    gradient.addColorStop(.6, `${palette[(i + 1) % 3]}43`);
    gradient.addColorStop(1, `${palette[i % 3]}00`);
    alpha(context, .45 + Math.sin(colorTime + i) * .12, () => {
      context.fillStyle = gradient;
      context.beginPath();
      context.moveTo(-50, y);
      context.bezierCurveTo(w * .18, y + 210, w * .43, y - 150, w + 50, y + 210);
      context.bezierCurveTo(w * .5, y - 34, w * .23, y + 250, -50, y + 55);
      context.closePath();
      context.fill();
    });
  }
  for (let i = 0; i < 8; i++) {
    const x = i % 2 ? w - 26 - Math.sin(t + i) * 14 : 24 + Math.sin(t + i) * 12;
    const y = (i / 8 * h + t * 24) % h;
    glow(context, x, y, 12, palette[i % 3], .45);
  }
}

function vinylRecord(context, x, y, radius, rotation, palette, opacity) {
  alpha(context, opacity, () => {
    context.translate(x, y);
    context.rotate(rotation);
    const gradient = context.createRadialGradient(0, 0, radius * .1, 0, 0, radius);
    gradient.addColorStop(0, '#51283B');
    gradient.addColorStop(.3, '#151016');
    gradient.addColorStop(1, '#08070CBF');
    context.fillStyle = gradient;
    context.beginPath(); context.arc(0, 0, radius, 0, TAU); context.fill();
    context.strokeStyle = '#FFD0AD37'; context.lineWidth = 1;
    for (let r = radius * .35; r < radius; r += Math.max(5, radius / 12)) {
      context.beginPath(); context.arc(0, 0, r, 0, TAU); context.stroke();
    }
    context.beginPath(); context.arc(0, 0, radius * .8, -.7, -.05);
    context.strokeStyle = `${palette[0]}9C`; context.lineWidth = radius * .19; context.stroke();
    dot(context, 0, 0, radius * .28, palette[1]);
    context.fillStyle = '#1B1022'; context.textAlign = 'center'; context.textBaseline = 'middle';
    context.font = `700 ${radius * .15}px Arial`; context.fillText('THC', 0, 0);
    dot(context, 0, 0, radius * .028, '#FDEDDD');
  });
}

function vinilo(context, frame) {
  const { width: w, height: h, motion: t, palette, colorTime, mobile } = frame;
  const radius = mobile ? 95 : 170;
  vinylRecord(context, w + radius * .12, h * .27, radius, t * .68, palette, .85);
  vinylRecord(context, -radius * .3, h * .87, radius * .78, -t * .52, palette, .7);
  for (let side = 0; side < 2; side++) {
    for (let i = 0; i < 4; i++) {
      const phase = (t * .45 + i / 4) % 1;
      alpha(context, (1 - phase) * (.22 + Math.sin(colorTime) * .04), () => {
        context.strokeStyle = palette[side]; context.lineWidth = 1.5;
        context.beginPath(); context.ellipse(side ? -20 : w + 20, h * (side ? .87 : .27), radius + phase * 100, radius + phase * 100, 0, 0, TAU); context.stroke();
      });
    }
  }
  const bars = mobile ? 10 : 18;
  for (let i = 0; i < bars; i++) {
    const barHeight = 4 + Math.pow(Math.sin(t * 4 + i * .9), 2) * 24;
    context.fillStyle = `${palette[i % 3]}7D`;
    context.fillRect(w * .5 - bars * 5 + i * 10, h - barHeight - 5, 3, barHeight);
  }
}

function eclipse(context, frame) {
  const { width: w, height: h, motion: t, palette, colorTime, mobile } = frame;
  const radius = mobile ? 86 : 145;
  const x = w * .86, y = h * .16;
  glow(context, x, y, radius * 1.7, palette[0], .32 + Math.sin(colorTime * 1.4) * .09);
  context.save(); context.translate(x, y);
  context.beginPath(); context.arc(0, 0, radius, 0, TAU);
  context.strokeStyle = '#FFF2C594'; context.lineWidth = 3; context.stroke();
  for (let i = 0; i < 16; i++) {
    const angle = i * TAU / 16 + t * .32;
    const r = radius + 6 + Math.sin(t * 2 + i) * 6;
    const end = r + 8 + (i % 3) * 8;
    line(context, [[Math.cos(angle) * r, Math.sin(angle) * r], [Math.cos(angle + .03) * end, Math.sin(angle + .03) * end]], `${palette[i % 3]}78`, 1.6);
  }
  const moonOffset = Math.sin(t * .5) * radius * .12;
  dot(context, moonOffset, 0, radius * .96, '#080809');
  context.restore();
  for (let i = 0; i < 5; i++) {
    const angle = t * .6 + i * 1.3;
    const sx = x + Math.cos(angle) * radius * 1.37;
    const sy = y + Math.sin(angle) * radius * 1.37;
    glow(context, sx, sy, 9, palette[1], .5);
  }
}

function prisma(context, frame) {
  const { width: w, height: h, motion: t, palette, pointer, colorTime, mobile } = frame;
  const scale = mobile ? .75 : 1;
  const shapes = [[w - 38, h * .2, 135], [-30, h * .58, 160], [w - 10, h * .9, 100]];
  shapes.forEach(([x, y, radius], index) => {
    alpha(context, .55 + Math.sin(colorTime * .7 + index) * .15, () => {
      context.translate(x + pointer.x * 18, y + pointer.y * 14); context.rotate(t * .14 * (index % 2 ? -1 : 1));
      const r = radius * scale;
      const points = [[-r * .3, -r], [r * .85, -r * .18], [r * .48, r * .78], [-r * .68, r * .45]];
      for (let j = 0; j < points.length; j++) {
        const a = points[j], b = points[(j + 1) % points.length];
        const gradient = context.createLinearGradient(0, 0, b[0], b[1]);
        gradient.addColorStop(0, `${palette[j % 3]}75`); gradient.addColorStop(1, `${palette[(j + 1) % 3]}04`);
        context.beginPath(); context.moveTo(0, 0); context.lineTo(...a); context.lineTo(...b); context.closePath(); context.fillStyle = gradient; context.fill();
        context.strokeStyle = `${palette[j % 3]}72`; context.lineWidth = 1; context.stroke();
      }
      const beamY = Math.sin(t * 1.5 + index) * r;
      line(context, [[-r, beamY], [r, beamY - r * .4]], `${palette[index]}BF`, 2);
    });
  });
}

function orbita(context, frame) {
  const { width: w, height: h, motion: t, palette, pointer, mobile } = frame;
  const orbits = [[w + 20, h * .29, mobile ? 112 : 184, 110], [-24, h * .78, mobile ? 100 : 165, 90], [w * .64, -20, mobile ? 90 : 140, 54]];
  orbits.forEach(([cx, cy, rx, ry], i) => {
    const x = cx + pointer.x * 10, y = cy + pointer.y * 7;
    alpha(context, .28, () => {
      context.beginPath(); context.ellipse(x, y, rx, ry, -.25, 0, TAU); context.strokeStyle = palette[i]; context.lineWidth = 1; context.stroke();
    });
    for (let j = 0; j < 2; j++) {
      const angle = t * (.55 + i * .12) + i * 1.7 + j * Math.PI;
      const px = x + Math.cos(angle) * rx, py = y + Math.sin(angle) * ry;
      for (let k = 8; k > 0; k--) {
        const trail = angle - k * .04;
        alpha(context, (1 - k / 9) * .45, () => dot(context, x + Math.cos(trail) * rx, y + Math.sin(trail) * ry, 2.5, palette[i]));
      }
      glow(context, px, py, 21, palette[i], .48);
      dot(context, px, py, j ? 3 : 7, palette[i]);
      if (!j) { context.beginPath(); context.ellipse(px, py, 12, 3, -.4, 0, TAU); context.strokeStyle = `${palette[i]}B9`; context.stroke(); }
    }
  });
}

function pathPoint(points, progress) {
  const spans = points.slice(1).map((point, i) => Math.hypot(point[0] - points[i][0], point[1] - points[i][1]));
  const total = spans.reduce((sum, distance) => sum + distance, 0);
  let distance = ((progress % 1) + 1) % 1 * total;
  for (let i = 0; i < spans.length; i++) {
    if (distance <= spans[i]) {
      const mix = distance / Math.max(1, spans[i]);
      return [points[i][0] + (points[i + 1][0] - points[i][0]) * mix, points[i][1] + (points[i + 1][1] - points[i][1]) * mix];
    }
    distance -= spans[i];
  }
  return points[points.length - 1];
}

function circuito(context, frame) {
  const { width: w, height: h, motion: t, palette, colorTime, mobile } = frame;
  const width = mobile ? 60 : 125;
  for (let side = 0; side < 2; side++) {
    for (let i = 0; i < 4; i++) {
      const left = 8 + i * 12;
      const points = [[left, -10], [left, h * .2 + i * 22], [width - i * 8, h * .29 + i * 22], [width - i * 8, h * .55 - i * 8], [left + 2, h * .67 - i * 14], [left + 2, h + 20]];
      const transformed = side ? points.map(([x, y]) => [w - x, h - y]) : points;
      line(context, transformed, `${palette[0]}37`, 1.5);
      const progress = t * .28 + i * .24;
      const head = pathPoint(transformed, progress);
      for (let trail = 6; trail >= 0; trail--) {
        const [x, y] = pathPoint(transformed, progress - trail * .008);
        alpha(context, (1 - trail / 7) * .6, () => dot(context, x, y, 2.2, palette[i % 3]));
      }
      glow(context, head[0], head[1], 14, palette[i % 3], .8);
      transformed.slice(1, -1).forEach(([x, y], j) => alpha(context, .2 + Math.pow(Math.sin(colorTime * .8 + j + i), 2) * .5, () => {
        context.strokeStyle = palette[1]; context.lineWidth = 1; context.strokeRect(x - 3, y - 3, 6, 6);
      }));
    }
  }
}

function lienzo(context, frame) {
  const { width: w, height: h, motion: t, palette, pointer, mobile, colorTime } = frame;
  const blobs = [[-40, h * .2, mobile ? 105 : 210], [w + 35, h * .57, mobile ? 125 : 210], [w * .6, h + 35, mobile ? 85 : 125]];
  blobs.forEach(([x, y, radius], i) => {
    alpha(context, .29 + Math.sin(colorTime + i) * .06, () => {
      context.fillStyle = palette[i]; context.beginPath();
      for (let p = 0; p <= 40; p++) {
        const angle = p / 40 * TAU;
        const r = radius * (1 + Math.sin(angle * 3 + t * 1.7 + i) * .13 + Math.cos(angle * 5 - t * 1.2) * .1);
        const px = x + pointer.x * 10 + Math.cos(angle) * r;
        const py = y + pointer.y * 8 + Math.sin(angle) * r;
        p ? context.lineTo(px, py) : context.moveTo(px, py);
      }
      context.closePath(); context.fill();
    });
    for (let p = 0; p < 5; p++) {
      const angle = p * 1.4 + t * .2;
      const distance = radius + 10 + p * 5;
      alpha(context, .25, () => dot(context, x + Math.cos(angle) * distance, y + Math.sin(angle) * distance, 2 + p % 3, palette[i]));
    }
  });
  alpha(context, .36, () => {
    context.strokeStyle = palette[0]; context.lineWidth = 2.5;
    context.beginPath(); context.moveTo(-15, h * .8);
    context.bezierCurveTo(30, h * .73 + Math.sin(t) * 28, 50, h * .9, 120, h + 10); context.stroke();
  });
}

function casino(context, frame) {
  const { width: w, height: h, motion: t, colorTime, mobile, particles } = frame;
  const inset = mobile ? 12 : 22;
  const hue = (colorTime * 45) % 360;
  // Neon rails, independent light bulbs and rolling chips: clearly a lounge, not a metal reskin.
  alpha(context, .55, () => {
    const rail = context.createLinearGradient(0, 0, w, h);
    rail.addColorStop(0, `hsl(${hue},95%,65%)`);
    rail.addColorStop(.5, `hsl(${(hue + 110) % 360},95%,62%)`);
    rail.addColorStop(1, `hsl(${(hue + 240) % 360},95%,65%)`);
    context.strokeStyle = rail; context.lineWidth = 1.5;
    context.strokeRect(inset, inset, w - inset * 2, h - inset * 2);
  });
  const perimeter = (w + h) * 2;
  const bulbs = Math.min(mobile ? 36 : 64, Math.floor(perimeter / 38));
  for (let i = 0; i < bulbs; i++) {
    const point = edgePoint(i / bulbs, w, h, inset);
    const bulbHue = (hue + i * 16) % 360;
    alpha(context, .25 + Math.pow(Math.sin(colorTime * .85 - i * .5), 2) * .65, () => dot(context, point.x, point.y, 2.3, `hsl(${bulbHue},100%,73%)`));
  }
  const chipCount = mobile ? 6 : 8;
  for (let i = 0; i < chipCount; i++) {
    const progress = t * .055 * (i % 2 ? -1 : 1) + i / chipCount;
    const point = edgePoint(progress, w, h, inset);
    const radius = mobile ? 7 + i % 2 * 2 : 9 + i % 3 * 2;
    const color = `hsl(${(hue + i * 53) % 360},85%,62%)`;
    alpha(context, .9, () => {
      context.translate(point.x, point.y); context.rotate(t * (i % 2 ? -2.5 : 2.5) + i);
      const ball = context.createRadialGradient(-radius * .35, -radius * .4, 0, 0, 0, radius);
      ball.addColorStop(0, '#FFF6E9'); ball.addColorStop(.24, color); ball.addColorStop(1, '#1B0C3E');
      context.fillStyle = ball; context.beginPath(); context.arc(0, 0, radius, 0, TAU); context.fill();
      context.strokeStyle = '#FFF3CAAD'; context.lineWidth = 1;
      context.beginPath(); context.arc(0, 0, radius * .63, 0, TAU); context.stroke();
      for (let segment = 0; segment < 6; segment++) {
        const angle = segment * TAU / 6;
        line(context, [[Math.cos(angle) * radius * .75, Math.sin(angle) * radius * .75], [Math.cos(angle) * radius * .95, Math.sin(angle) * radius * .95]], '#FFF8EA', 2);
      }
    });
  }
  // Small spotlights move along the edges rather than obscuring the profile.
  for (let i = 0; i < Math.min(4, particles); i++) {
    const p = edgePoint(t * .022 + i / 4, w, h, inset);
    const colors = ['#FF637D', '#AE85FF', '#60EEC4', '#FFB765'];
    glow(context, p.x, p.y, mobile ? 38 : 65, colors[i], .24 + Math.sin(colorTime + i) * .07);
  }
}

const DRAW_THEME = { aurora, vinilo, eclipse, prisma, orbita, circuito, lienzo, casino };

export function renderAmbientFrame(context, frame) {
  const id = ambientThemeId(frame.themeId);
  if (!id) return;
  context.clearRect(0, 0, frame.width, frame.height);
  const palette = PALETTES[id];
  const motion = frame.mode === 'full' ? frame.seconds : 0;
  const colorTime = frame.mode === 'off' ? 0 : frame.seconds;
  context.save();
  if (frame.mode === 'calm') context.globalAlpha = .88 + Math.sin(colorTime * .55) * .1;
  DRAW_THEME[id](context, { ...frame, palette, motion, colorTime });
  if (frame.mode === 'full') {
    (frame.sparks || []).forEach(spark => {
      const age = frame.seconds - spark.started;
      if (age < 0 || age > .8) return;
      alpha(context, (1 - age / .8) * .6, () => {
        context.strokeStyle = palette[1]; context.lineWidth = 1.5;
        context.beginPath(); context.arc(spark.x, spark.y, 8 + age * 65, 0, TAU); context.stroke();
        for (let i = 0; i < 7; i++) {
          const angle = i / 7 * TAU;
          dot(context, spark.x + Math.cos(angle) * age * 90, spark.y + Math.sin(angle) * age * 90, 1.5, palette[i % 3]);
        }
      });
    });
  }
  context.restore();
}

/** Bounded 2D animation; stops RAF when hidden, removes every listener on unmount. */
export function createProfileAmbientRuntime({ canvas, themeId, mode = 'full', scope = window, documentScope = document }) {
  const context = canvas.getContext('2d', { alpha: true });
  if (!context || !ambientThemeId(themeId)) return { destroy() {} };
  const effectMode = ['full', 'calm', 'off'].includes(mode) ? mode : 'full';
  let width = 0, height = 0, limits, raf = null, destroyed = false;
  let seconds = 0, lastTimestamp = null, lastDraw = -Infinity;
  let pointer = { x: 0, y: 0 }, targetPointer = { x: 0, y: 0 };
  let sparks = [];
  const draw = () => renderAmbientFrame(context, { themeId, width, height, ...limits, seconds, mode: effectMode, pointer, sparks });
  const resize = () => {
    width = Math.max(1, scope.innerWidth || 1);
    height = Math.max(1, scope.innerHeight || 1);
    limits = ambientLimits(width, scope.devicePixelRatio);
    canvas.width = Math.round(width * limits.dpr);
    canvas.height = Math.round(height * limits.dpr);
    context.setTransform(limits.dpr, 0, 0, limits.dpr, 0, 0);
    draw();
  };
  const tick = timestamp => {
    raf = null;
    if (destroyed || documentScope.hidden) return;
    if (lastTimestamp !== null) seconds += Math.min(.08, Math.max(0, (timestamp - lastTimestamp) / 1000));
    lastTimestamp = timestamp;
    if (timestamp - lastDraw >= 1000 / limits.fps) {
      lastDraw = timestamp;
      pointer = { x: pointer.x + (targetPointer.x - pointer.x) * .08, y: pointer.y + (targetPointer.y - pointer.y) * .08 };
      sparks = sparks.filter(spark => seconds - spark.started <= .8);
      draw();
    }
    raf = scope.requestAnimationFrame(tick);
  };
  const start = () => {
    if (!destroyed && !documentScope.hidden && effectMode !== 'off' && raf === null) {
      lastTimestamp = null;
      raf = scope.requestAnimationFrame(tick);
    }
  };
  const visibility = () => {
    if (documentScope.hidden) {
      if (raf !== null) scope.cancelAnimationFrame(raf);
      raf = null; lastTimestamp = null;
    } else { draw(); start(); }
  };
  const pointerMove = event => {
    if (event.pointerType === 'touch') return;
    targetPointer = { x: Math.max(-1, Math.min(1, event.clientX / width * 2 - 1)), y: Math.max(-1, Math.min(1, event.clientY / height * 2 - 1)) };
  };
  const pointerDown = event => {
    if (documentScope.hidden) return;
    sparks = [...sparks.slice(-3), { x: event.clientX, y: event.clientY, started: seconds }];
  };
  resize();
  scope.addEventListener('resize', resize, { passive: true });
  documentScope.addEventListener('visibilitychange', visibility);
  if (effectMode === 'full') {
    scope.addEventListener('pointermove', pointerMove, { passive: true });
    scope.addEventListener('pointerdown', pointerDown, { passive: true });
  }
  start();
  return {
    destroy() {
      destroyed = true;
      if (raf !== null) scope.cancelAnimationFrame(raf);
      raf = null;
      scope.removeEventListener('resize', resize);
      documentScope.removeEventListener('visibilitychange', visibility);
      scope.removeEventListener('pointermove', pointerMove);
      scope.removeEventListener('pointerdown', pointerDown);
      sparks = [];
      context.clearRect(0, 0, width, height);
    },
  };
}
