import assert from 'node:assert/strict';
import test from 'node:test';
import { createYouTubePlaybackController } from '../src/utils/youtubePlayback.js';

function setup() {
  const calls = [];
  const notifications = [];
  const callbacks = {
    onStateChange: state => notifications.push(['state', state]),
    onPlaybackChange: playing => notifications.push(['playback', playing]),
    onEnded: () => notifications.push(['ended']),
    onError: message => notifications.push(['error', message]),
  };
  let state = -1;
  let id = 'dQw4w9WgXcQ';
  const player = {
    setVolume: value => calls.push(['volume', value]),
    getPlayerState: () => state,
    playVideo: () => calls.push(['play']),
    pauseVideo: () => calls.push(['pause']),
    cueVideoById: value => { id = value; calls.push(['cue', value]); },
    loadVideoById: value => { id = value; calls.push(['load', value]); },
    getVideoData: () => ({ video_id: id }),
    seekTo: value => calls.push(['seek', value]),
  };
  const controller = createYouTubePlaybackController(() => callbacks);
  controller.update({ videoId: id, volume: 50, playRequested: false });
  return { controller, player, calls, notifications, emit(nextState) { state = nextState; controller.stateChanged({ data: state, target: player }); } };
}

test('la primera canción guardada reproduce sin añadir otra canción', () => {
  const context = setup();
  context.controller.attach(context.player, 'dQw4w9WgXcQ');
  context.calls.length = 0;
  context.controller.setPlayback(true);
  assert.ok(context.calls.some(([command]) => command === 'play'));
  assert.equal(context.calls.some(([command]) => command === 'cue'), false);
  context.emit(1);
  assert.ok(context.notifications.some(([type, value]) => type === 'state' && value === 'playing'));
});

test('la petición de play anterior a onReady no se pierde', () => {
  const context = setup();
  context.controller.setPlayback(true);
  assert.equal(context.calls.length, 0);
  context.controller.attach(context.player, 'dQw4w9WgXcQ');
  assert.ok(context.calls.some(([command]) => command === 'play'));
});

test('PAUSED y CUED iniciales no cancelan una petición de play', () => {
  const context = setup();
  context.controller.attach(context.player, 'dQw4w9WgXcQ');
  context.controller.setPlayback(true);
  context.notifications.length = 0;
  context.emit(2);
  assert.equal(context.notifications.some(([type, value]) => type === 'playback' && value === false), false);
  const previousPlays = context.calls.filter(([command]) => command === 'play').length;
  context.emit(5);
  assert.equal(context.calls.filter(([command]) => command === 'play').length, previousPlays + 1);
  context.emit(1);
  context.emit(2);
  assert.ok(context.notifications.some(([type, value]) => type === 'playback' && value === false));
});

test('cambiar de canción antes de onReady carga la selección más reciente', () => {
  const context = setup();
  context.controller.select('M7lc1UVf-VE');
  context.controller.attach(context.player, 'dQw4w9WgXcQ');
  assert.ok(context.calls.some(([command, value]) => command === 'load' && value === 'M7lc1UVf-VE'));
});

test('el bloqueo permite reintentar y finalizar solo avanza una vez', () => {
  const context = setup();
  context.controller.attach(context.player, 'dQw4w9WgXcQ');
  context.controller.setPlayback(true);
  context.controller.blocked();
  assert.ok(context.notifications.some(([type, value]) => type === 'state' && value === 'blocked'));
  context.controller.setPlayback(true);
  context.emit(1);
  context.emit(0);
  context.emit(0);
  assert.equal(context.notifications.filter(([type]) => type === 'ended').length, 1);
  context.controller.detach();
  context.calls.length = 0;
  context.controller.setPlayback(true);
  assert.equal(context.calls.length, 0);
});

test('pausar mientras arranca no acepta un PLAYING tardío', () => {
  const context = setup();
  context.controller.attach(context.player, 'dQw4w9WgXcQ');
  context.controller.setPlayback(true);
  context.controller.setPlayback(false);
  context.notifications.length = 0;
  context.emit(1);
  assert.ok(context.calls.some(([command]) => command === 'pause'));
  assert.equal(context.notifications.some(([type, value]) => type === 'state' && value === 'playing'), false);
});