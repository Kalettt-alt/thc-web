import test from 'node:test';
import assert from 'node:assert/strict';
import { coachingBasePlayer, coachingPlayerProfile, pendingCoachingChanges, sortCoachingBench } from '../src/pages/UltimateTeam/coachingPresentationUT.js';

test('Coaching compares the canonical GRL in the chosen slot without double penalty', () => {
  const profile = coachingPlayerProfile({ id:'winger', pos:'RW', grl:76, base_grl:78, stamina:64 }, 'RM');
  assert.equal(profile.grl, 76);
  assert.equal(profile.penalty, 2);
  assert.equal(profile.energy, 64);
  assert.equal(coachingBasePlayer({ pos:'ED', grl:78 }).pos, 'RW');
});

test('Coaching bench prefers fitting positions and gives fatigue a modest ranking influence', () => {
  const sorted = sortCoachingBench([
    { id:'keeper', pos:'GK', grl:90, stamina:100 },
    { id:'exhausted', pos:'RW', grl:77, stamina:10 },
    { id:'fresh', pos:'RW', grl:74, stamina:100 },
    { id:'muchBetter', pos:'RW', grl:90, stamina:10 },
  ], 'RM');
  assert.deepEqual(sorted.map(candidate => candidate.player.id), ['muchBetter','fresh','exhausted','keeper']);
  assert.equal(sorted.at(-1).penalty, 40);
  assert.equal(sorted.find(candidate => candidate.player.id === 'fresh').grl, 72);
});

test('Coaching draft counts only replacements; changing positions does not consume substitutions', () => {
  const slots = [['LW'],['ST'],['RW']];
  const swap = pendingCoachingChanges(['a','b','c'], ['b','a','c'], slots);
  assert.equal(swap.substitutions, 0);
  assert.equal(swap.moved, 2);
  const change = pendingCoachingChanges(['a','b','c'], ['b','x','y'], slots);
  assert.equal(change.substitutions, 2);
  assert.deepEqual(change.replacements, [
    { out:'a', in:'x', position:'ST', index:1 },
    { out:'c', in:'y', position:'RW', index:2 },
  ]);
});

test('Coaching draft restoring the removed starter removes the pending replacement', () => {
  const changed = pendingCoachingChanges(['a','b'], ['x','b'], [['ST'],['CM']]);
  assert.equal(changed.substitutions, 1);
  const restored = pendingCoachingChanges(['a','b'], ['a','b'], [['ST'],['CM']]);
  assert.equal(restored.substitutions, 0);
  assert.deepEqual(restored.replacements, []);
});
