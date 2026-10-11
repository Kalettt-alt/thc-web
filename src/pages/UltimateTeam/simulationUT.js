import { effectivePlayerGrl, SQUAD_FORMATIONS } from './squadUT.js';

export const UT_MATCH_DURATION = 180;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const value = (number, fallback) => Number.isFinite(Number(number)) ? Number(number) : fallback;
const playerPosition = player => player.puesto || player.pos || player.posicion || '';
const playerName = player => player.nombre || player.name || 'Jugador';
const keepers = new Set(['GK', 'POR']);
const forwards = new Set(['ST', 'CF', 'LW', 'RW', 'DC', 'SP', 'EI', 'ED', 'EXT']);
const midfield = new Set(['CM', 'CAM', 'CDM', 'LM', 'RM', 'MC', 'MCO', 'MDC', 'MI', 'MD']);

export function practiceTeamSnapshot(club, squad, serverTeam = null, userId = null) {
  const energy = new Map((serverTeam?.titulares || []).map(player => [player.id, player.stamina]));
  const slots = SQUAD_FORMATIONS[squad?.formacion] || SQUAD_FORMATIONS['4-3-3'];
  const titulares = (squad?.titulares || []).map((player, index) => {
    if (!player) return null;
    const puesto = slots[index]?.[0] || player.pos;
    return { ...player, base_grl: player.grl, grl: effectivePlayerGrl(player, puesto), puesto, ...(Number.isFinite(energy.get(player.id)) ? { stamina: energy.get(player.id) } : {}) };
  });
  return { ...club, id: userId || 'practice-own', formacion: squad?.formacion, titulares };
}

export function seededMatchRandom(seed) {
  let state = 2166136261;
  for (const char of String(seed)) { state ^= char.charCodeAt(0); state = Math.imul(state, 16777619); }
  return () => {
    state += 0x6D2B79F5;
    let result = Math.imul(state ^ state >>> 15, 1 | state);
    result ^= result + Math.imul(result ^ result >>> 7, 61 | result);
    return ((result ^ result >>> 14) >>> 0) / 4294967296;
  };
}

export function teamSimulationMetrics(team) {
  const players = (team?.titulares || []).filter(Boolean);
  const grl = players.length
    ? players.reduce((sum, player) => sum + clamp(value(player.grl, 50), 0, 99), 0) / players.length
    : clamp(value(team?.grl, 50), 0, 99);
  const stamina = players.length
    ? players.reduce((sum, player) => sum + clamp(value(player.stamina ?? player.energia ?? player.energy, 100), 0, 100), 0) / players.length
    : clamp(value(team?.stamina, 100), 0, 100);
  return { grl: Math.round(grl), stamina: Math.round(stamina), strength: grl * (.72 + .28 * stamina / 100) };
}

function pickPlayer(team, random, type) {
  const players = (team.titulares || []).filter(Boolean);
  if (!players.length) return '';
  if (type === 'save') return playerName(players.find(player => keepers.has(playerPosition(player))) || players[0]);
  const weighted = players.map(player => {
    const roleWeight = keepers.has(playerPosition(player)) ? .03 : forwards.has(playerPosition(player)) ? 4 : midfield.has(playerPosition(player)) ? 2 : 1;
    return { player, weight: roleWeight * (.15 + clamp(value(player.grl, 50), 0, 99) / 99 * .85) };
  });
  const total = weighted.reduce((sum, entry) => sum + entry.weight, 0);
  let choice = random() * total;
  for (const entry of weighted) { choice -= entry.weight; if (choice <= 0) return playerName(entry.player); }
  return playerName(weighted.at(-1).player);
}

function sampleGoals(lambda, random) {
  const weights = [Math.exp(-lambda)];
  for (let count = 1; count <= 6; count++) weights[count] = weights[count - 1] * lambda / count;
  weights[5] *= .18;
  weights[6] *= .045;
  let target = random() * weights.reduce((sum, weight) => sum + weight, 0);
  for (let count = 0; count <= 6; count++) { target -= weights[count]; if (target <= 0) return count; }
  return 6;
}

function shuffled(items, random) {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    [next[index], next[other]] = [next[other], next[index]];
  }
  return next;
}

export function createOfflineMatch(home, away, { seed = 'practice', startedAt = Date.now() } = {}) {
  const random = seededMatchRandom(seed);
  const homeMetrics = teamSimulationMetrics(home);
  const awayMetrics = teamSimulationMetrics(away);
  const difference = homeMetrics.strength - awayMetrics.strength;
  const homeGoals = sampleGoals(clamp(1.45 * Math.exp(difference / 28), .28, 4), random);
  const awayGoals = sampleGoals(clamp(1.45 * Math.exp(-difference / 28), .28, 4), random);
  const opportunities = Array.from({ length: 28 }, (_, index) => 5 + index * 6).filter(second => second < 88 || second > 94);
  const goalSlots = shuffled(opportunities, random).slice(0, homeGoals + awayGoals);
  const goalSides = shuffled([...Array(homeGoals).fill('home'), ...Array(awayGoals).fill('away')], random);
  const goals = new Map(goalSlots.map((second, index) => [second, goalSides[index]]));
  const events = [{ second: 0, minute: 0, side: 'home', type: 'kickoff', pattern: 'Saque inicial' }];
  const patterns = ['Pared por dentro', 'Cambio de frente', 'Salida por la banda', 'Pase entre líneas', 'Centro al área', 'Contraataque', 'Llegada desde atrás', 'Pelota detenida'];
  const pressure = clamp(.5 + difference / 120, .27, .73);
  for (const base of opportunities) {
    const second = base + Math.floor(random() * 3);
    const minute = Math.floor(second / 2);
    const side = goals.get(base) || (random() < pressure ? 'home' : 'away');
    const attacking = side === 'home' ? home : away;
    const defending = side === 'home' ? away : home;
    const roll = random();
    const type = goals.has(base) ? 'goal' : roll < .35 ? 'pass' : roll < .65 ? 'save' : roll < .85 ? 'shot' : 'post';
    events.push({ second, minute, side, type, player: pickPlayer(type === 'save' ? defending : attacking, random, type), attacker: type === 'save' ? pickPlayer(attacking, random, 'shot') : undefined, pattern: patterns[Math.floor(random() * patterns.length)] });
    if (type === 'goal') events.push({ second: second + 2, minute: Math.floor((second + 2) / 2), side: side === 'home' ? 'away' : 'home', type: 'kickoff', pattern: 'Saque desde el medio' });
  }
  events.push({ second: 90, minute: 45, side: 'home', type: 'halftime', pattern: 'Entretiempo' });
  events.push({ second: 93, minute: 46, side: 'away', type: 'kickoff', pattern: 'Comienza el segundo tiempo' });
  events.push({ second: 180, minute: 90, side: 'home', type: 'fulltime', pattern: 'Final del partido' });
  events.sort((a, b) => a.second - b.second);
  return { id: `practice-${seed}`, home: { ...home, ...homeMetrics }, away: { ...away, ...awayMetrics }, duration_seconds: UT_MATCH_DURATION, started_at: new Date(startedAt).toISOString(), ends_at: new Date(startedAt + UT_MATCH_DURATION * 1000).toISOString(), events, home_goals: homeGoals, away_goals: awayGoals };
}

export function matchElapsedSeconds(match, now = Date.now()) {
  const start = Date.parse(match?.started_at);
  const end = Date.parse(match?.ends_at);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;
  return clamp((now - start) / 1000, 0, Math.min(UT_MATCH_DURATION, (end - start) / 1000));
}

export function matchVisibleState(match, elapsed) {
  const seconds = clamp(value(elapsed, 0), 0, UT_MATCH_DURATION);
  const events = (match?.events || []).filter(event => value(event.second, 181) <= seconds);
  const stats = { home: { goals: 0, shots: 0, saves: 0, posts: 0 }, away: { goals: 0, shots: 0, saves: 0, posts: 0 } };
  for (const event of events) {
    if (!stats[event.side]) continue;
    if (event.type === 'goal') { stats[event.side].goals++; stats[event.side].shots++; }
    if (['shot', 'post', 'save'].includes(event.type)) stats[event.side].shots++;
    if (event.type === 'post') stats[event.side].posts++;
    if (event.type === 'save') stats[event.side === 'home' ? 'away' : 'home'].saves++;
  }
  return { seconds, minute: Math.min(90, Math.floor(seconds / 2)), events, latest: events.at(-1), stats };
}

export function simulationPlayerMarkers(team, side, event) {
  const aliases = { POR:'GK', LD:'RB', DFC:'CB', LI:'LB', MC:'CM', MCO:'CAM', MDC:'CDM', MCD:'CDM', EI:'LW', ED:'RW', MI:'LM', MD:'RM', DC:'ST', SP:'CF' };
  const lanes = { GK:[50,88], LB:[14,71], RB:[86,71], LWB:[13,59], RWB:[87,59], CB:[50,74], CDM:[50,58], CM:[50,45], CAM:[50,33], LM:[17,39], RM:[83,39], LW:[22,19], RW:[78,19], ST:[50,15], CF:[50,25] };
  const players = (team?.titulares || []).filter(Boolean);
  const roles = players.map(player => aliases[playerPosition(player)] || playerPosition(player));
  const totals = new Map(roles.map(role => [role, roles.filter(other => other === role).length]));
  const used = new Map();
  const livePlay = event && ['pass','goal','save','shot','post'].includes(event.type);
  return players.map((player, index) => {
    const role = roles[index];
    const occurrence = used.get(role) || 0;
    used.set(role, occurrence + 1);
    const [lane, depth] = lanes[role] || [50,50];
    const spread = totals.get(role) > 1 ? (occurrence - (totals.get(role) - 1) / 2) * 24 : 0;
    const left = clamp(lane + spread, 8, 92);
    const top = depth;
    const shift = !livePlay || role === 'GK' ? 0 : event.side === side ? forwards.has(playerPosition(player)) ? -12 : -6 : 5;
    return { player, index, left: side === 'away' ? 100 - left : left, top: side === 'away' ? 100 - top : top, x: livePlay && role !== 'GK' ? ((index * 7 + event.second) % 9) - 4 : 0, y: shift ? side === 'away' ? -shift : shift : 0 };
  });
}

export function observeMatchClock(match, onTick, { now = Date.now, interval = setInterval, clear = clearInterval, delay = 250 } = {}) {
  let stopped = false;
  let timer;
  const stop = () => { stopped = true; if (timer !== undefined) { clear(timer); timer = undefined; } };
  const tick = () => {
    if (stopped) return;
    const elapsed = matchElapsedSeconds(match, now());
    onTick(elapsed);
    if (elapsed >= UT_MATCH_DURATION) stop();
  };
  if (!Number.isFinite(Date.parse(match?.started_at)) || !Number.isFinite(Date.parse(match?.ends_at))) {
    onTick(0);
    return stop;
  }
  tick();
  if (!stopped) timer = interval(tick, delay);
  return stop;
}
