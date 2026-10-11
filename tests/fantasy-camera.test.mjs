import test from 'node:test';
import assert from 'node:assert/strict';
import { PITCH_W, PITCH_H, GOAL_Y_TOP, GOAL_Y_BOT } from '../src/pages/THCFantasy/ConstantesJuego.js';
import { getMatchCamera, getMatchViewport, screenToPitch } from '../src/pages/THCFantasy/matchGeometry.js';

test('follow camera shows a playable section and follows both goals across device orientations', () => {
  for (const [width, height] of [[320, 470], [320, 1000], [390, 650], [844, 230], [1280, 600]]) {
    const view = getMatchViewport(width, height);
    assert.ok(height / view.zoom < PITCH_H * 0.9);
    const top = getMatchCamera({ x: 3000, y: GOAL_Y_TOP }, view);
    const bottom = getMatchCamera({ x: 3000, y: GOAL_Y_BOT }, view);
    assert.ok(bottom.y > top.y);
    for (const [camera, goalY] of [[top, GOAL_Y_TOP], [bottom, GOAL_Y_BOT]]) {
      const rect = { left: width / 2 - camera.x * view.zoom, top: height / 2 - camera.y * view.zoom };
      const goalScreen = { x: rect.left + 3000 * view.zoom, y: rect.top + goalY * view.zoom };
      assert.ok(goalScreen.y >= 0 && goalScreen.y <= height);
      const mapped = screenToPitch(goalScreen.x, goalScreen.y, rect, view.zoom);
      assert.ok(Math.hypot(mapped.x - 3000, mapped.y - goalY) < 1e-7);
    }
  }
});

test('stadium view fits the stands and keeps a stable center independently of the ball', () => {
  for (const [width, height] of [[320, 470], [1280, 600]]) {
    const view = getMatchViewport(width, height, 'STADIUM');
    assert.ok((PITCH_W + 2200) * view.zoom <= width + 1e-8);
    assert.ok((PITCH_H + 1700) * view.zoom <= height + 1e-8);
    assert.deepEqual(getMatchCamera({ x: -5000, y: 18000 }, view, 'STADIUM'), { x: PITCH_W / 2, y: PITCH_H / 2 });
  }
});
