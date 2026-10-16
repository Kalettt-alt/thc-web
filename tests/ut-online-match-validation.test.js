import test from 'node:test';
import assert from 'node:assert/strict';
import { validOnlineMatchUT } from '../src/pages/UltimateTeam/onlineMatchValidationUT.js';

const game = (version, active, patch = {}) => ({
  simulation_version: version, home: { id: 'own' }, away: { id: 'rival' }, events: [], home_goals: 0, away_goals: 0,
  started_at: '2026-10-15T20:00:00.000Z', ends_at: new Date(Date.parse('2026-10-15T20:00:00.000Z') + (active + (version >= 2 ? 12 : 0)) * 1000).toISOString(),
  ...(version >= 2 ? { halftime_seconds: 12 } : {}),
  ...(version >= 4 ? { active_duration_seconds: active, first_half_seconds: active / 2, duration_seconds: 120 } : {}),
  ...patch,
});

test('v4 acepta solo dos mitades pares de 64–68 s y descanso de 12 s', () => {
  for (const active of [128, 130, 132, 134, 136]) assert.equal(validOnlineMatchUT(game(4, active)), true);
  for (const active of [120, 126, 127, 129, 131, 133, 135, 137, 138, 180]) assert.equal(validOnlineMatchUT(game(4, active)), false);
});

test('v4 rechaza discrepancias de reloj, añadido, descanso y duración nominal', () => {
  const valid = game(4, 132);
  for (const patch of [
    { active_duration_seconds: '132' }, { active_duration_seconds: undefined }, { first_half_seconds: 65 },
    { first_half_seconds: '66' }, { duration_seconds: 132 }, { halftime_seconds: 11 }, { halftime_seconds: 13 },
    { ends_at: '2026-10-15T20:02:24.001Z' }, { started_at: 'fecha corrupta' },
  ]) assert.equal(validOnlineMatchUT({ ...valid, ...patch }), false);
  assert.equal(validOnlineMatchUT({ ...valid, first_half_seconds: undefined }), true);
});

test('los encuentros v1/v2/v3 conservan sus relojes históricos', () => {
  assert.equal(validOnlineMatchUT(game(undefined, 180)), true);
  assert.equal(validOnlineMatchUT(game(1, 180)), true);
  assert.equal(validOnlineMatchUT(game(2, 180)), true);
  assert.equal(validOnlineMatchUT(game(3, 120)), true);
  assert.equal(validOnlineMatchUT(game(3, 132)), false);
  assert.equal(validOnlineMatchUT(game(2, 120)), false);
});

test('un payload sin equipos, eventos o marcador válido no inicia el encuentro', () => {
  const valid = game(4, 132);
  for (const patch of [{ home: null }, { away: null }, { events: null }, { home_goals: -1 }, { home_goals: 7 }, { away_goals: 1.5 }, { away_goals: '0' }]) {
    assert.equal(validOnlineMatchUT({ ...valid, ...patch }), false);
  }
  assert.equal(validOnlineMatchUT(null), false);
});
