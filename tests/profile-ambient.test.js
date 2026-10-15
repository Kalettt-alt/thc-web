import test from 'node:test';
import assert from 'node:assert/strict';
import { ambientLimits, ambientThemeId, createProfileAmbientRuntime, edgePoint, renderAmbientFrame } from '../src/pages/Perfil/profileAmbientEngine.js';

function canvasContext() {
  const commands = [];
  const context = {};
  for (const name of ['save', 'restore', 'clearRect', 'setTransform', 'beginPath', 'closePath', 'moveTo', 'lineTo', 'bezierCurveTo', 'stroke', 'fill', 'fillRect', 'strokeRect', 'translate', 'rotate', 'arc', 'ellipse', 'fillText']) {
    context[name] = (...args) => commands.push([name, ...args]);
  }
  for (const name of ['createRadialGradient', 'createLinearGradient']) {
    context[name] = (...args) => {
      commands.push([name, ...args]);
      return { addColorStop: (...colors) => commands.push(['colorStop', ...colors]) };
    };
  }
  return { context, commands };
}

function scene(themeId, seconds, mode = 'full', pointer = { x: 0, y: 0 }) {
  const { context, commands } = canvasContext();
  renderAmbientFrame(context, { themeId, seconds, mode, pointer, width: 390, height: 780, ...ambientLimits(390), sparks: [] });
  return commands;
}

function target() {
  const listeners = new Map();
  return {
    listeners,
    addEventListener(name, callback) { listeners.set(name, callback); },
    removeEventListener(name, callback) { if (listeners.get(name) === callback) listeners.delete(name); },
    emit(name, event) { listeners.get(name)?.(event); },
  };
}

function environment({ hidden = false, mode = 'full', themeId = 'cromo' } = {}) {
  const { context, commands } = canvasContext();
  const frames = new Map();
  let nextFrame = 0;
  const scope = {
    ...target(), innerWidth: 390, innerHeight: 780, devicePixelRatio: 3,
    requestAnimationFrame(callback) { frames.set(++nextFrame, callback); return nextFrame; },
    cancelAnimationFrame(id) { frames.delete(id); },
  };
  const documentScope = { ...target(), hidden };
  const canvas = { getContext: () => context };
  const runtime = createProfileAmbientRuntime({ canvas, themeId, mode, scope, documentScope });
  return {
    canvas, commands, frames, scope, documentScope, runtime,
    step(timestamp) {
      const callbacks = [...frames.values()]; frames.clear();
      callbacks.forEach(callback => callback(timestamp));
    },
  };
}

test('Casino conserva el ID cromo y estilos sin ambientación no crean decoración', () => {
  assert.equal(ambientThemeId('cromo'), 'casino');
  for (const id of ['default', 'editorial', 'terminal', 'unknown', null, 'url(script)']) assert.equal(ambientThemeId(id), null);
});

test('las bolas de Casino recorren los bordes también en móvil sin cruzar la lectura', () => {
  for (const width of [320, 390, 1440]) {
    for (let i = -20; i < 300; i++) {
      const p = edgePoint(i / 71, width, 780, 12);
      assert.ok(p.x >= 12 && p.x <= width - 12);
      assert.ok(p.y >= 12 && p.y <= 768);
      assert.ok(p.x === 12 || p.x === width - 12 || p.y === 12 || p.y === 768);
    }
  }
  assert.notDeepEqual(edgePoint(0, 390, 780), edgePoint(.015, 390, 780));
});

test('presupuesto acota densidad, resolución y fps en móviles de alto DPR', () => {
  assert.deepEqual(ambientLimits(390, 3), { mobile: true, particles: 12, dpr: 1.25, fps: 24 });
  assert.deepEqual(ambientLimits(1400, 4), { mobile: false, particles: 18, dpr: 1.5, fps: 30 });
  assert.equal(ambientLimits(0, 0).dpr, 1);
});

test('cada ambientación dibuja desde la entrada y cambia en menos de un segundo', () => {
  for (const id of ['aurora', 'vinilo', 'eclipse', 'prisma', 'orbita', 'circuito', 'lienzo', 'cromo']) {
    const initial = scene(id, 0);
    assert.ok(initial.some(command => command[0] === 'fill' || command[0] === 'stroke'), id);
    assert.notDeepEqual(scene(id, .8), initial, id);
  }
});

test('modo suave cambia la luz, mantiene fija toda la geometría; pausado es estático', () => {
  for (const id of ['aurora', 'vinilo', 'eclipse', 'prisma', 'orbita', 'circuito', 'lienzo', 'cromo']) {
    const geometry = commands => commands.filter(command => command[0] !== 'colorStop');
    assert.deepEqual(geometry(scene(id, 0, 'calm')), geometry(scene(id, 8, 'calm')), id);
    assert.deepEqual(scene(id, 0, 'off'), scene(id, 8000, 'off'), id);
  }
});

test('la animación arranca sin depender de pointer y pausa completamente cuando la pestaña se oculta', () => {
  const env = environment();
  assert.equal(env.frames.size, 1);
  assert.ok(env.commands.length > 0);
  env.step(0); env.step(100); env.step(180);
  env.documentScope.hidden = true;
  env.documentScope.emit('visibilitychange');
  assert.equal(env.frames.size, 0);
  const pausedCommands = env.commands.length;
  env.step(50000);
  assert.equal(env.commands.length, pausedCommands);
  env.documentScope.hidden = false;
  env.documentScope.emit('visibilitychange');
  assert.equal(env.frames.size, 1);
  env.step(60000);
  env.runtime.destroy();
  assert.equal(env.frames.size, 0);
  assert.equal(env.scope.listeners.size, 0);
  assert.equal(env.documentScope.listeners.size, 0);
});

test('pausado no agenda frames ni captura puntero, oculto no inicia RAF y resize mantiene DPR acotado', () => {
  const off = environment({ mode: 'off' });
  assert.equal(off.frames.size, 0);
  assert.equal(off.scope.listeners.has('pointermove'), false);
  assert.equal(off.canvas.width, Math.round(390 * 1.25));
  off.scope.innerWidth = 1440;
  off.scope.emit('resize');
  assert.equal(off.canvas.width, 2160);
  off.runtime.destroy();
  const hidden = environment({ hidden: true });
  assert.equal(hidden.frames.size, 0);
  hidden.runtime.destroy();
  assert.equal(hidden.scope.listeners.size, 0);
});

test('reacciones decorativas de puntero no bloquean eventos y se eliminan con el estilo', () => {
  const env = environment({ themeId: 'prisma' });
  env.scope.emit('pointermove', { pointerType: 'mouse', clientX: 360, clientY: 400 });
  env.scope.emit('pointerdown', { clientX: 222, clientY: 333 });
  env.step(0); env.step(80);
  assert.ok(env.commands.some(command => command[0] === 'arc' && command[1] === 222 && command[2] === 333));
  env.runtime.destroy();
  assert.equal(env.scope.listeners.size, 0);
});

test('canvas no disponible o tema inválido termina sin listeners', () => {
  const scope = target(), documentScope = target();
  createProfileAmbientRuntime({ canvas: { getContext: () => null }, themeId: 'cromo', scope, documentScope }).destroy();
  createProfileAmbientRuntime({ canvas: { getContext: () => ({}) }, themeId: 'unknown', scope, documentScope }).destroy();
  assert.equal(scope.listeners.size, 0);
  assert.equal(documentScope.listeners.size, 0);
});
