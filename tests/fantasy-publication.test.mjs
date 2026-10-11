import test from 'node:test';
import assert from 'node:assert/strict';
import { matchPublicationKey, shouldPublishMatchState } from '../src/pages/THCFantasy/matchPublication.js';
import { createMatchState, resumeSecondHalf, stepMatch } from '../src/pages/THCFantasy/matchSimulation.js';

test('static phases and paused coach panels do not publish each animation frame', () => {
  for (const phase of ['READY', 'HALFTIME', 'GOAL', 'OUT', 'FINISHED', 'SIMULATING']) {
    const state = createMatchState([]);
    state.phase = phase;
    state.isPaused = phase === 'SIMULATING';
    state.finished = phase === 'FINISHED';
    const key = matchPublicationKey(state);
    for (let frame = 1; frame < 100; frame++) assert.equal(shouldPublishMatchState(state, key, 0, frame * 17), false);
  }
});

test('active play and the turn countdown keep thirty-per-second publication', () => {
  for (const phase of ['SIMULATING', 'KICKOFF_SETUP', 'WAITING_USER_INPUT', 'USER_DRIVING', 'BALL_FLIGHT']) {
    const state = createMatchState([]);
    state.phase = phase;
    const key = matchPublicationKey(state);
    assert.equal(shouldPublishMatchState(state, key, 1000, 1016), false);
    assert.equal(shouldPublishMatchState(state, key, 1000, 1034), true);
  }
});

test('phase, pause, messages and coaching commands publish immediately', () => {
  const state = createMatchState([]);
  state.isPaused = true;
  for (const change of [() => { state.isPaused = false; }, () => { state.phase = 'HALFTIME'; }, () => { state.msg = ''; }, () => { state.teamTalkCount++; }, () => { state.substitutionsUsed++; }]) {
    const key = matchPublicationKey(state);
    change();
    assert.equal(shouldPublishMatchState(state, key, 1000, 1001), true);
  }
});

test('goal and out timers advance without repeated snapshots and publish resumed play', () => {
  for (const phase of ['GOAL', 'OUT']) {
    const state = createMatchState([]);
    state.phase = phase;
    state.msg = '';
    state.transitionTimer = 1000;
    const key = matchPublicationKey(state);
    stepMatch(state, 500, () => 0.5);
    assert.equal(state.transitionTimer, 500);
    assert.equal(shouldPublishMatchState(state, key, 0, 500), false);
    stepMatch(state, 500, () => 0.5);
    assert.equal(state.phase, phase === 'GOAL' ? 'KICKOFF_SETUP' : 'SIMULATING');
    assert.equal(shouldPublishMatchState(state, key, 0, 1000), true);
    if (phase === 'GOAL') {
      const repositionKey = matchPublicationKey(state);
      stepMatch(state, 500, () => 0.5);
      assert.equal(shouldPublishMatchState(state, repositionKey, 1000, 1500), true);
      stepMatch(state, 500, () => 0.5);
      assert.equal(state.phase, 'SIMULATING');
    }
  }
  const state = createMatchState([]);
  state.phase = 'HALFTIME';
  const key = matchPublicationKey(state);
  assert.equal(resumeSecondHalf(state), true);
  assert.equal(shouldPublishMatchState(state, key, 0, 1), true);
});
