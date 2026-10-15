import test from 'node:test';
import assert from 'node:assert/strict';
import { createIntroTimeline, createContractSigning, INTRO_DURATION_MS } from '../src/pages/THCFantasy/introTimelineDF.js';

function clock() {
  let now = 0;
  let id = 0;
  const pending = new Map();
  const timers = {
    setTimeout(callback, delay) { const token = ++id; pending.set(token, { at: now + delay, callback }); return token; },
    clearTimeout(token) { pending.delete(token); }
  };
  return { timers, pending, tick(ms) {
    const until = now + ms;
    while (true) {
      const next = [...pending].filter(([, item]) => item.at <= until).sort((a, b) => a[1].at - b[1].at)[0];
      if (!next) break;
      now = next[1].at;
      pending.delete(next[0]);
      next[1].callback();
    }
    now = until;
  } };
}

test('the narrative intro introduces six career scenes and completes once at 40 seconds', () => {
  const fake = clock();
  const phases = [];
  let completed = 0;
  const sequence = createIntroTimeline({ timers: fake.timers, onPhase: phase => phases.push(phase), onComplete: () => completed++ });
  fake.tick(INTRO_DURATION_MS - 1);
  assert.deepEqual(phases, [1, 2, 3, 4, 5]);
  assert.equal(completed, 0);
  fake.tick(1);
  assert.equal(completed, 1);
  assert.equal(sequence.finish(), false);
  fake.tick(40000);
  assert.equal(completed, 1);
  assert.equal(fake.pending.size, 0);
});

test('skip is immediate, idempotent, and removes every scheduled transition', () => {
  const fake = clock();
  let completed = 0;
  const phases = [];
  const sequence = createIntroTimeline({ timers: fake.timers, onPhase: phase => phases.push(phase), onComplete: () => completed++ });
  assert.equal(sequence.finish(), true);
  assert.equal(sequence.finish(), false);
  fake.tick(50000);
  assert.equal(completed, 1);
  assert.deepEqual(phases, []);
  assert.equal(fake.pending.size, 0);
});

test('unmount cancels intro updates and never invokes the next career screen', () => {
  const fake = clock();
  const phases = [];
  let completed = 0;
  const sequence = createIntroTimeline({ timers: fake.timers, onPhase: phase => phases.push(phase), onComplete: () => completed++ });
  fake.tick(6300);
  sequence.cancel();
  assert.equal(sequence.finish(), false);
  fake.tick(50000);
  assert.deepEqual(phases, [1]);
  assert.equal(completed, 0);
  assert.equal(fake.pending.size, 0);
});

test('the complete narrative duration remains 40 seconds rather than skipping scenes', () => {
  const fake = clock();
  let completed = 0;
  const phases = [];
  createIntroTimeline({ timers: fake.timers, onPhase: phase => phases.push(phase), onComplete: () => completed++ });
  fake.tick(600);
  assert.equal(completed, 0);
  assert.deepEqual(phases, []);
  fake.tick(39400);
  assert.equal(completed, 1);
  assert.deepEqual(phases, [1, 2, 3, 4, 5]);
});

test('deliberate signing draws the signature, stamps, then transitions into the career once', () => {
  const fake = clock();
  const events = [];
  createContractSigning({ timers: fake.timers, onStamp: () => events.push('stamp'), onTransition: () => events.push('transition'), onComplete: () => events.push('complete') });
  fake.tick(1149);
  assert.deepEqual(events, []);
  fake.tick(1);
  assert.deepEqual(events, ['stamp']);
  fake.tick(999);
  assert.deepEqual(events, ['stamp']);
  fake.tick(1);
  assert.deepEqual(events, ['stamp', 'transition']);
  fake.tick(1149);
  assert.deepEqual(events, ['stamp', 'transition']);
  fake.tick(1);
  assert.deepEqual(events, ['stamp', 'transition', 'complete']);
  fake.tick(50000);
  assert.deepEqual(events, ['stamp', 'transition', 'complete']);
});

test('leaving during the signature cancels stamping and career creation', () => {
  const fake = clock();
  const events = [];
  const signing = createContractSigning({ timers: fake.timers, onStamp: () => events.push('stamp'), onComplete: () => events.push('complete') });
  fake.tick(500);
  signing.cancel();
  fake.tick(50000);
  assert.deepEqual(events, []);
  assert.equal(fake.pending.size, 0);
});

test('leaving during the career transition cancels creation without finishing twice', () => {
  const fake = clock();
  const events = [];
  const signing = createContractSigning({ timers: fake.timers, onStamp: () => events.push('stamp'), onTransition: () => events.push('transition'), onComplete: () => events.push('complete') });
  fake.tick(2200);
  assert.deepEqual(events, ['stamp', 'transition']);
  signing.cancel();
  fake.tick(50000);
  assert.deepEqual(events, ['stamp', 'transition']);
  assert.equal(fake.pending.size, 0);
});
