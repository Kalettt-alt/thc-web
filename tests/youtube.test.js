import assert from 'node:assert/strict';
import test from 'node:test';
import { extractYouTubeId, getYouTubeThumbnail, loadYouTubeAPI } from '../src/utils/youtube.js';

test('acepta enlaces oficiales de vídeos, Shorts, directos y embeds', () => {
  for (const url of [
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=abc',
    'https://youtu.be/dQw4w9WgXcQ?t=30',
    'https://m.youtube.com/shorts/dQw4w9WgXcQ',
    'https://music.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
    'https://youtube.com/live/dQw4w9WgXcQ',
  ]) assert.equal(extractYouTubeId(url), 'dQw4w9WgXcQ');
  assert.equal(extractYouTubeId('dQw4w9WgXcQ'), null);
  assert.equal(extractYouTubeId('dQw4w9WgXcQ', true), 'dQw4w9WgXcQ');
  assert.equal(extractYouTubeId('www.youtube.com/watch?v=dQw4w9WgXcQ', true), 'dQw4w9WgXcQ');
  assert.equal(extractYouTubeId('youtu.be/dQw4w9WgXcQ', true), 'dQw4w9WgXcQ');
  assert.equal(extractYouTubeId('youtube.com.evil.example/watch?v=dQw4w9WgXcQ', true), null);
});

test('rechaza hosts falsos, esquemas activos, credenciales e IDs maliciosos', () => {
  for (const url of [
    'https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ',
    'https://evil.example/youtube.com/watch?v=dQw4w9WgXcQ',
    'javascript:https://youtube.com/watch?v=dQw4w9WgXcQ',
    'https://youtube.com@evil.example/watch?v=dQw4w9WgXcQ',
    'https://user@youtube.com/watch?v=dQw4w9WgXcQ',
    'https://youtube.com:8080/watch?v=dQw4w9WgXcQ',
    'https://youtube.com/watch?v=%3Cscript%3E',
    'https://youtube.com/watch?v=dQw4w9WgXcQextra',
    'https://youtu.be/',
    null,
    {},
  ]) assert.equal(extractYouTubeId(url), null);
  assert.equal(getYouTubeThumbnail('https://evil.example/video'), '/imagenes/LogoTHC.png');
  assert.equal(getYouTubeThumbnail('https://youtu.be/dQw4w9WgXcQ'), 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg');
});

test('el loader comparte una solicitud, permite reintentar y restaura el callback previo', async () => {
  const oldWindow = globalThis.window;
  const oldDocument = globalThis.document;
  let script;
  let insertions = 0;
  let priorCalls = 0;
  const prior = () => { priorCalls += 1; };
  globalThis.window = { setTimeout, onYouTubeIframeAPIReady: prior };
  globalThis.document = {
    getElementById: () => script,
    createElement: () => {
      const listeners = new Map();
      return {
        addEventListener: (name, listener) => listeners.set(name, listener),
        removeEventListener: name => listeners.delete(name),
        fail: () => listeners.get('error')(),
        remove: () => { script = undefined; },
      };
    },
    head: { appendChild: element => { script = element; insertions += 1; } },
  };
  try {
    const failed = loadYouTubeAPI();
    script.fail();
    await assert.rejects(failed, /No se pudo conectar/);
    assert.equal(window.onYouTubeIframeAPIReady, prior);
    const first = loadYouTubeAPI();
    const second = loadYouTubeAPI();
    assert.equal(first, second);
    assert.equal(insertions, 2);
    window.YT = { Player: function Player() {} };
    window.onYouTubeIframeAPIReady();
    assert.equal(await first, window.YT);
    assert.equal(priorCalls, 1);
    assert.equal(window.onYouTubeIframeAPIReady, prior);
    assert.equal(await loadYouTubeAPI(), window.YT);
  } finally {
    globalThis.window = oldWindow;
    globalThis.document = oldDocument;
  }
});