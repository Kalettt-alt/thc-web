import assert from 'node:assert/strict';
import test from 'node:test';
import { EQUIPOS_DATA } from '../src/pages/UltimateTeam/JugadoresUT.js';
import { advanceOfflineMatch, applyOfflineCoaching, createOfflineMatch, matchClockState, matchElapsedSeconds, matchVisibleState, observeMatchClock, practiceTeamSnapshot, simulationPlayerMarkers, teamSimulationMetrics, UT_MATCH_DURATION } from '../src/pages/UltimateTeam/simulationUT.js';
import { effectivePlayerGrl, SQUAD_FORMATIONS, validateStartingSquad } from '../src/pages/UltimateTeam/squadUT.js';

const makeTeam = (grl, stamina = 100) => ({ id: `team-${grl}-${stamina}`, nombre: 'Club de prueba', titulares: ['GK','LB','CB','CB','RB','CM','CAM','CM','LW','ST','RW'].map((pos, index) => ({ id: `card-${index}`, nombre: `Jugador ${index}`, pos, grl, stamina })) });

test('la práctica dura exactamente 120 segundos, usa el once real y no modifica los datos recibidos', () => {
  const home = makeTeam(84);
  const rival = EQUIPOS_DATA.find(team => team.id === 'river');
  const before = JSON.stringify({ home, rival });
  const first = createOfflineMatch(home, rival, { seed: 'fixed', startedAt: 1000 });
  const second = createOfflineMatch(home, rival, { seed: 'fixed', startedAt: 1000 });
  assert.deepEqual(first, second);
  assert.equal(first.duration_seconds, UT_MATCH_DURATION);
  assert.equal(Date.parse(first.ends_at) - Date.parse(first.started_at), 132000);
  assert.equal(first.events[0].type, 'kickoff');
  assert.equal(first.events.length, 1);
  const final = advanceOfflineMatch(first, 120);
  assert.equal(final.events.find(event => event.type === 'halftime').second, 60);
  assert.equal(final.events.at(-1).type, 'fulltime');
  assert.equal(final.events.at(-1).second, 120);
  assert.equal(JSON.stringify({ home, rival }), before);
  for (const event of final.events) {
    const names = [...home.titulares, ...rival.titulares].map(player => player.nombre || player.name);
    if (event.player) assert.ok(names.includes(event.player));
  }
});

test('GRL cercano tiene oportunidades comparables; resultados normales y límite 6 se verifican en 3000 partidos', () => {
  const home = makeTeam(84);
  const away = makeTeam(85);
  let goalsHome = 0, goalsAway = 0, ordinary = 0;
  const types = new Set();
  for (let index = 0; index < 3000; index++) {
    const match = advanceOfflineMatch(createOfflineMatch(home, away, { seed: `near-${index}`, startedAt: 0 }), 120);
    goalsHome += match.home_goals;
    goalsAway += match.away_goals;
    if (match.home_goals <= 4 && match.away_goals <= 4) ordinary++;
    assert.ok(match.home_goals >= 0 && match.home_goals <= 6);
    assert.ok(match.away_goals >= 0 && match.away_goals <= 6);
    const visible = matchVisibleState(match, 120);
    assert.equal(visible.stats.home.goals, match.home_goals);
    assert.equal(visible.stats.away.goals, match.away_goals);
    match.events.forEach(event => types.add(event.type));
  }
  assert.ok(Math.abs(goalsHome - goalsAway) / 3000 < .2);
  assert.ok(ordinary / 3000 > .97);
  for (const type of ['goal', 'save', 'shot', 'post', 'pass', 'kickoff', 'halftime']) assert.ok(types.has(type));
});

test('una diferencia grande ayuda sin goleadas constantes y la stamina disminuye rendimiento', () => {
  let stronger = 0, weaker = 0, rare = 0, fresh = 0, tired = 0;
  for (let index = 0; index < 1500; index++) {
    const gap = advanceOfflineMatch(createOfflineMatch(makeTeam(95), makeTeam(70), { seed: `gap-${index}`, startedAt: 0 }), 120);
    stronger += gap.home_goals;
    weaker += gap.away_goals;
    if (gap.home_goals >= 5) rare++;
    assert.ok(gap.home_goals <= 6 && gap.away_goals <= 6);
    fresh += advanceOfflineMatch(createOfflineMatch(makeTeam(85), makeTeam(85), { seed: `energy-${index}`, startedAt: 0 }), 120).home_goals;
    tired += advanceOfflineMatch(createOfflineMatch(makeTeam(85, 30), makeTeam(85), { seed: `energy-${index}`, startedAt: 0 }), 120).home_goals;
  }
  assert.ok(stronger / 1500 > weaker / 1500 + 1);
  assert.ok(rare / 1500 < .09);
  assert.ok(tired < fresh * .8);
  assert.equal(teamSimulationMetrics(makeTeam(85, 30)).stamina, 30);
});

test('el reloj usa tiempo real, nunca muestra eventos futuros y no se adelanta por ticks demorados', () => {
  const match = createOfflineMatch(makeTeam(84), makeTeam(84), { seed: 'timeline', startedAt: 0 });
  assert.equal(matchElapsedSeconds(match, -1000), 0);
  assert.equal(matchElapsedSeconds(match, 90000), 78);
  assert.equal(matchElapsedSeconds(match, 179000), 120);
  assert.equal(matchElapsedSeconds(match, 200000), 120);
  const atStart = matchVisibleState(match, 0);
  assert.equal(atStart.stats.home.goals, 0);
  assert.equal(atStart.stats.away.goals, 0);
  assert.equal(atStart.events.length, 1);
  assert.ok(matchVisibleState(match, 37).events.every(event => event.second <= 37));
});

test('cada reloj tiene un único interval y se limpia al terminar, cancelar o desmontar', () => {
  const match = createOfflineMatch(makeTeam(84), makeTeam(84), { seed: 'clock', startedAt: 0 });
  let now = 0, nextId = 0, cleared = 0;
  const timers = new Map();
  const ticks = [];
  const scheduler = { now: () => now, interval: callback => { const id = ++nextId; timers.set(id, callback); return id; }, clear: id => { if (timers.delete(id)) cleared++; } };
  const stop = observeMatchClock(match, elapsed => ticks.push(elapsed), scheduler);
  assert.equal(timers.size, 1);
  assert.deepEqual(ticks, [0]);
  now = 65000;
  timers.values().next().value();
  assert.equal(ticks.at(-1), 60);
  now = 132000;
  timers.values().next().value();
  assert.equal(ticks.at(-1), 120);
  assert.equal(timers.size, 0);
  stop(); stop();
  assert.equal(cleared, 1);
  now = 0;
  const first = observeMatchClock(match, () => {}, scheduler);
  const second = observeMatchClock(match, () => {}, scheduler);
  assert.equal(timers.size, 2);
  first(); first(); second();
  assert.equal(timers.size, 0);
  const count = ticks.length;
  now = 200000;
  const alreadyFinished = observeMatchClock(match, elapsed => ticks.push(elapsed), scheduler);
  assert.equal(timers.size, 0);
  assert.equal(ticks.length, count + 1);
  alreadyFinished();
});

test('los marcadores respetan el rol del jugador y el arquero no abandona su arco para seguir la jugada', () => {
  const rival = EQUIPOS_DATA.find(team => team.id === 'river');
  const kickoff = simulationPlayerMarkers(rival, 'away', { type: 'kickoff', second: 0, side: 'away' });
  const inAttack = simulationPlayerMarkers(rival, 'away', { type: 'pass', second: 23, side: 'away' });
  assert.equal(kickoff.length, 11);
  const keeper = inAttack.find(marker => marker.player.pos === 'POR');
  assert.equal(keeper.top, 12);
  assert.equal(keeper.x, 0);
  assert.equal(keeper.y, 0);
  assert.ok(inAttack.filter(marker => marker.player.pos === 'DFC').every(marker => marker.top < 35));
  assert.ok(inAttack.filter(marker => ['EI','ED','DC'].includes(marker.player.pos)).every(marker => marker.top > 70));
  assert.ok(inAttack.every(marker => marker.left >= 8 && marker.left <= 92));
});

test('una carta fuera de puesto puede jugar pero su GRL baja; el snapshot de servidor no vuelve a penalizarla', () => {
  const squad = { formacion: '4-3-3', titulares: SQUAD_FORMATIONS['4-3-3'].map(([pos], index) => ({ id: `card-${index}`, nombre: `Jugador ${index}`, pos, grl: 84, stamina: 100 })) };
  const before = JSON.stringify(squad);
  const natural = practiceTeamSnapshot({ nombre: 'Mi club' }, squad);
  const rearranged = { ...squad, titulares: [...squad.titulares] };
  [rearranged.titulares[0], rearranged.titulares[10]] = [rearranged.titulares[10], rearranged.titulares[0]];
  assert.equal(validateStartingSquad(rearranged).valid, true);
  const authoritative = { titulares: rearranged.titulares.map((player, index) => ({ ...player, grl: index === 0 || index === 10 ? 44 : 84, stamina: 65 })) };
  const swapped = practiceTeamSnapshot({ nombre: 'Mi club' }, rearranged, authoritative);
  assert.equal(swapped.titulares[0].base_grl, 84);
  assert.equal(swapped.titulares[0].grl, effectivePlayerGrl(squad.titulares[10], 'LW'));
  assert.equal(swapped.titulares[0].puesto, 'LW');
  assert.equal(swapped.titulares[0].stamina, 65);
  assert.ok(teamSimulationMetrics(swapped).grl < teamSimulationMetrics(natural).grl);
  const markers = simulationPlayerMarkers(swapped, 'home', { type: 'pass', second: 6, side: 'home' });
  assert.ok(markers.find(marker => marker.player.id === squad.titulares[10].id).top < 30);
  assert.equal(markers.find(marker => marker.player.id === squad.titulares[0].id).top, 88);
  assert.equal(JSON.stringify(squad), before);
});

test('ED como MD pierde mucho menos rendimiento que un arquero como extremo', () => {
  const wide = { id: 'wide', nombre: 'Extremo', pos: 'RW', grl: 84 };
  const keeper = { id: 'keeper', nombre: 'Arquero', pos: 'GK', grl: 84 };
  const adjacent = effectivePlayerGrl(wide, 'RM');
  const far = effectivePlayerGrl(keeper, 'LW');
  assert.ok(adjacent >= 80 && adjacent < 84);
  assert.ok(far <= 50);
  assert.ok(adjacent - far >= 30);
});

test('el descanso congela minuto y fatiga durante12 segundos; dos mitades de60 segundos', () => {
  const match = createOfflineMatch(makeTeam(84), makeTeam(85), { startedAt: 0 });
  assert.deepEqual(matchClockState(match, -1).phase, 'pre');
  assert.equal(matchClockState(match, 59999).phase, 'first');
  assert.deepEqual(matchClockState(match, 60000), { elapsed: 60, wallElapsed: 60, phase: 'halftime', halftimeRemaining: 12 });
  assert.equal(matchClockState(match, 71000).elapsed, 60);
  assert.equal(matchClockState(match, 72000).phase, 'second');
  assert.equal(matchClockState(match, 131000).elapsed, 119);
  assert.equal(matchClockState(match, 132000).phase, 'finished');
  const half = advanceOfflineMatch(match, 60);
  assert.equal(advanceOfflineMatch(half, 60), half);
  const continuous = advanceOfflineMatch(match, 120);
  let chunked = match;
  for (let second = 1; second <= 120; second++) chunked = advanceOfflineMatch(chunked, second);
  assert.deepEqual(chunked, continuous);
});

test('coaching afecta solo el futuro, respeta roster, cinco cambios y penalización sin duplicarla', () => {
  const team = { id: 'own', formacion: '4-3-3', titulares: SQUAD_FORMATIONS['4-3-3'].map(([pos], index) => ({ id: `first-${index}`, nombre: `Primero ${index}`, pos, grl: 84, stamina: 100 })), bench: Array.from({ length: 7 }, (_, index) => ({ id: `bench-${index}`, nombre: `Banca ${index}`, pos: 'CM', grl: 90, stamina: 100 })) };
  const initial = createOfflineMatch(team, team, { seed: 'coaching', startedAt: 0 });
  const at60 = advanceOfflineMatch(initial, 60);
  const ids = at60.home.titulares.map(player => player.id);
  [ids[0], ids[10]] = [ids[10], ids[0]];
  ids[3] = 'bench-0';
  const coached = applyOfflineCoaching(at60, { titulares: ids, formacion: '4-3-3', mentalidad: 'ofensiva', requestId: 'same-op', revision: 0 }, 60);
  assert.equal(coached.home.titulares[0].base_grl, 84);
  assert.equal(coached.home.titulares[0].grl, 44);
  assert.equal(coached.home.substitutions, 1);
  assert.equal(coached.home.revision, 1);
  assert.equal(coached.home.mentalidad, 'ofensiva');
  assert.deepEqual(coached.events.slice(0, -1), at60.events);
  assert.equal(applyOfflineCoaching(coached, { requestId: 'same-op' }, 60), coached);
  assert.throws(() => applyOfflineCoaching(coached, { titulares: ids, formacion: '4-3-3', revision: 0 }, 60), /cambió/);
  const reentry = [...ids]; reentry[3] = 'first-3';
  assert.throws(() => applyOfflineCoaching(coached, { titulares: reentry, formacion: '4-3-3' }, 60), /disponible/);
  const tooMany = ids.map((id, index) => index < 5 ? `bench-${index + 1}` : id);
  assert.throws(() => applyOfflineCoaching(coached, { titulares: tooMany, formacion: '4-3-3' }, 60), /cinco/);
  const final = advanceOfflineMatch(coached, 120);
  assert.deepEqual(final.events.slice(0, at60.events.length), at60.events);
  assert.ok(final.home.roster.find(player => player.id === 'first-3').played_seconds === 60);
  assert.ok(final.home.roster.find(player => player.id === 'bench-0').played_seconds === 60);
  assert.ok(final.home.roster.find(player => player.id === 'bench-1').played_seconds === 0);
  assert.equal(JSON.stringify(team).includes('played_seconds'), false);
});

test('la mentalidad cambia ocasiones futuras con las mismas semillas y no un marcador anterior', () => {
  const team = { ...makeTeam(84), formacion: '4-3-3' };
  let aggressive = 0, defensive = 0;
  for (let index = 0; index < 300; index++) {
    const match = createOfflineMatch(team, makeTeam(84), { seed: `tactic-${index}`, startedAt: 0 });
    const args = { titulares: match.home.titulares.map(player => player.id), formacion: '4-3-3' };
    aggressive += advanceOfflineMatch(applyOfflineCoaching(match, { ...args, mentalidad: 'ofensiva' }, 0), 120).home_goals;
    defensive += advanceOfflineMatch(applyOfflineCoaching(match, { ...args, mentalidad: 'defensiva' }, 0), 120).home_goals;
  }
  assert.ok(aggressive > defensive);
});


test('los partidos antiguos conservan sus relojes y la práctica nueva usa versión3', () => {
  const modern = createOfflineMatch(makeTeam(84), makeTeam(85), {startedAt:0});
  assert.equal(modern.simulation_version, 3);
  const v2 = {...modern, simulation_version:2, duration_seconds:180};
  const v1 = {...modern, simulation_version:1, duration_seconds:180};
  assert.equal(matchClockState(v2,90000).phase,'halftime');
  assert.equal(matchClockState(v2,191000).elapsed,179);
  assert.equal(matchClockState(v2,192000).phase,'finished');
  assert.equal(matchClockState(v1,90000).elapsed,90);
  assert.equal(matchClockState(v1,179000).elapsed,179);
  assert.equal(matchClockState(v1,180000).phase,'finished');
});
