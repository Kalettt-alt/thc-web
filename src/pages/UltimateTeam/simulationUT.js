import { effectivePlayerGrl, playerPositionPenalty, SQUAD_FORMATIONS } from './squadUT.js';
import { matchActiveDurationSeconds, matchHalfSeconds, matchMinuteState, matchOpportunitySchedule, UT_MATCH_PLAYS } from './matchPlaysUT.js';
export { matchActiveDurationSeconds, matchHalfSeconds, matchMinuteState } from './matchPlaysUT.js';

export const UT_MATCH_DURATION = 120;
export const UT_HALFTIME_DURATION = 12;
export const UT_MATCH_WALL_DURATION = UT_MATCH_DURATION + UT_HALFTIME_DURATION;
export const UT_MAX_SUBSTITUTIONS = 5;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const value = (number, fallback) => Number.isFinite(Number(number)) ? Number(number) : fallback;
const playerPosition = player => player.puesto || player.pos || player.posicion || '';
const playerName = player => player.nombre || player.name || 'Jugador';
export function matchDurationSeconds(match) {
  const duration = Number(match?.duration_seconds);
  return [120, 180].includes(duration) ? duration : match?.simulation_version >= 3 ? 120 : 180;
}
const keepers = new Set(['GK', 'POR']);
const forwards = new Set(['ST', 'CF', 'LW', 'RW', 'DC', 'SP', 'EI', 'ED', 'EXT']);
const midfield = new Set(['CM', 'CAM', 'CDM', 'LM', 'RM', 'MC', 'MCO', 'MDC', 'MI', 'MD']);

export function practiceTeamSnapshot(club, squad, serverTeam = null, userId = null) {
  const energy = new Map((serverTeam?.roster || serverTeam?.titulares || []).map(player => [player.id, player.stamina]));
  const slots = SQUAD_FORMATIONS[squad?.formacion] || SQUAD_FORMATIONS['4-3-3'];
  const titulares = (squad?.titulares || []).map((player, index) => {
    if (!player) return null;
    const puesto = slots[index]?.[0] || player.pos;
    return { ...player, base_grl: player.grl, grl: effectivePlayerGrl(player, puesto), puesto, ...(Number.isFinite(energy.get(player.id)) ? { stamina: energy.get(player.id) } : {}) };
  });
  const bench = (squad?.suplentes || []).filter(Boolean).slice(0, 7).map(player => ({ ...player, base_grl: player.grl, ...(Number.isFinite(energy.get(player.id)) ? { stamina: energy.get(player.id) } : {}) }));
  return { ...club, id: userId || 'practice-own', formacion: squad?.formacion, titulares, bench };
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

export function createOfflineMatch(home, away, { seed = 'practice', startedAt = Date.now() } = {}) {
  const halfSeconds = 64 + Math.floor(seededMatchRandom(`${seed}:added-time`)() * 5);
  return {
    id: `practice-${seed}`, seed: String(seed), simulation_version: 4,
    home: prepareSimulationTeam(home), away: prepareSimulationTeam(away),
    duration_seconds: UT_MATCH_DURATION, halftime_seconds: UT_HALFTIME_DURATION,
    active_duration_seconds: halfSeconds * 2, first_half_seconds: halfSeconds,
    started_at: new Date(startedAt).toISOString(), ends_at: new Date(startedAt + (halfSeconds * 2 + UT_HALFTIME_DURATION) * 1000).toISOString(),
    events: [{ second: 0, minute: 0, side: 'home', type: 'kickoff', pattern: 'Saque inicial' }],
    home_goals: 0, away_goals: 0, active_seconds: 0, coaching_requests: [],
  };
}

const roleAliases = { POR:'GK', LD:'RB', DFC:'CB', LI:'LB', MC:'CM', MCO:'CAM', MDC:'CDM', MCD:'CDM', EI:'LW', ED:'RW', MI:'LM', MD:'RM', DC:'ST', SP:'CF' };
const basePlayer = player => ({ ...player, pos: roleAliases[player.pos || player.posicion] || player.pos || player.posicion, grl: clamp(value(player.base_grl ?? player.grl, 50), 0, 99) });
function prepareSimulationTeam(team) {
  const startersRaw = (team?.titulares || []).filter(Boolean).map((player, index) => ({ ...player, id: player.id || `${team.id}:starter-${index}` }));
  const raw = [...startersRaw, ...[...(team?.bench || []), ...(team?.suplentes || []), ...(team?.reservas || [])].filter(Boolean).map((player, index) => ({ ...player, id: player.id || `${team.id}:bench-${index}` }))];
  const byId = new Map(raw.map(player => [player.id, { ...basePlayer(player), stamina: clamp(value(player.stamina ?? player.energia, 100), 0, 100), initial_stamina: clamp(value(player.stamina ?? player.energia, 100), 0, 100), base_grl: basePlayer(player).grl, played_seconds: 0 }]));
  const roster = [...byId.values()];
  const starters = startersRaw.map((player, index) => {
    const base = byId.get(player.id);
    const puesto = roleAliases[player.puesto || player.pos || player.posicion] || player.puesto || player.pos || player.posicion || SQUAD_FORMATIONS[team?.formacion]?.[index]?.[0];
    return { ...base, puesto, grl: effectivePlayerGrl(base, puesto), penalizacion_grl: playerPositionPenalty(base, puesto) };
  });
  const used = new Set(starters.map(player => player.id));
  return { ...team, roster, titulares: starters, bench: roster.filter(player => !used.has(player.id)), ...teamSimulationMetrics({ titulares: starters }), mentalidad: 'neutral', revision: 0, substitutions: 0, subbed_off: [] };
}

const patterns = ['Pared por dentro', 'Cambio de frente', 'Salida por la banda', 'Pase entre líneas', 'Centro al área', 'Contraataque', 'Llegada desde atrás', 'Pelota detenida'];
const attackingBonus = { defensiva: -.045, neutral: 0, ofensiva: .045 };
const defensiveExposure = { defensiva: -.035, neutral: 0, ofensiva: .035 };

function fatigueTeam(team, seconds, duration) {
  if (!seconds) return team;
  const active = new Set(team.titulares.map(player => player.id));
  const roster = team.roster.map(player => active.has(player.id) ? {
    ...player, stamina: Math.max(Math.min(player.initial_stamina, 40), player.initial_stamina - (player.played_seconds + seconds) / duration * (18 + (100 - player.base_grl) * .08)), played_seconds: player.played_seconds + seconds,
  } : player);
  const pool = new Map(roster.map(player => [player.id, player]));
  const titulares = team.titulares.map(player => ({ ...player, stamina: pool.get(player.id).stamina, played_seconds: pool.get(player.id).played_seconds }));
  return { ...team, roster, titulares, bench: roster.filter(player => !active.has(player.id) && !team.subbed_off.includes(player.id)), ...teamSimulationMetrics({ titulares }) };
}

/** Generates only elapsed play. No result is decided at kickoff or rewritten after coaching. */
export function advanceOfflineMatch(match, elapsed) {
  if (!match || !(match.simulation_version >= 2)) return match;
  const duration = matchDurationSeconds(match), half = matchHalfSeconds(match), activeDuration = matchActiveDurationSeconds(match);
  const live = match.simulation_version >= 4;
  const schedule = matchOpportunitySchedule(match);
  const deckOffset = Math.floor(seededMatchRandom(`${match.seed}:play-deck`)() * UT_MATCH_PLAYS.length);
  const playFor = event => UT_MATCH_PLAYS[(deckOffset + (event.index * 2 + (event.side === 'away' ? 1 : 0)) * 7) % UT_MATCH_PLAYS.length];
  const target = Math.floor(clamp(value(elapsed, 0), match.active_seconds || 0, activeDuration));
  if (target === match.active_seconds) return match;
  let next = { ...match, events: [...match.events] };
  const eventTicks = new Set([half, half + 1, activeDuration, target]);
  for (const event of schedule) { eventTicks.add(event.second); eventTicks.add(event.second - 4); if (live) eventTicks.add(event.second + 3); }
  let cursor = match.active_seconds;
  for (const second of [...eventTicks].filter(second => second > cursor && second <= target).sort((a, b) => a - b)) {
    next.home = fatigueTeam(next.home, second - cursor, duration); next.away = fatigueTeam(next.away, second - cursor, duration); cursor = second;
    if (second === half) next.events.push({ second, minute: 45, side: 'home', type: 'halftime', pattern: 'Entretiempo' });
    if (second === half + 1) next.events.push({ second, minute: 45, side: 'away', type: 'kickoff', pattern: 'Comienza el segundo tiempo' });
    for (const side of ['home', 'away']) {
      const build = schedule.find(event => event.side === side && event.second - 4 === second);
      if (build) {
        const random = seededMatchRandom(`${next.seed}:${second}:${side}:pass`);
        const play = playFor(build);
        next.events.push({ second, ...matchMinuteState(match,second), side, type: 'pass', player: pickPlayer(next[side], random, 'pass'), pattern: live ? play.label : patterns[Math.floor(random() * patterns.length)], ...(live ? {play_id:play.id} : {}) });
      }
      const opportunity = schedule.find(event => event.side === side && event.second === second);
      if (!opportunity) continue;
      const other = side === 'home' ? 'away' : 'home';
      const team = next[side], rival = next[other];
      const metrics = teamSimulationMetrics(team), rivalMetrics = teamSimulationMetrics(rival);
      const random = seededMatchRandom(`${next.seed}:${second}:${side}:chance`);
      const play = playFor(opportunity);
      const attribute = team.titulares.reduce((sum,player)=>sum+value(player[play.attribute],player.base_grl ?? player.grl),0)/Math.max(1,team.titulares.length);
      const playBonus = live ? play.bonus + clamp((attribute-metrics.grl)*.001,-.025,.025) : 0;
      let chance = clamp(.19 + (metrics.strength - rivalMetrics.strength) * .009 + attackingBonus[team.mentalidad] + defensiveExposure[rival.mentalidad] + playBonus, .05, .43);
      const goals = next[`${side}_goals`];
      if (goals >= 4) chance *= .2;
      const roll = random();
      const type = roll < chance && goals < 6 ? 'goal' : roll < chance + .34 ? 'save' : roll < chance + .43 ? 'post' : 'shot';
      const shooter = pickPlayer(team, random, 'shot');
      next.events.push({ second, ...matchMinuteState(match,second), side, type, player: type === 'save' ? pickPlayer(rival, random, 'save') : shooter, shooter, pattern: live ? play.label : patterns[Math.floor(random() * patterns.length)], ...(live ? {play_id:play.id} : {}) });
      if (type === 'goal') {
        next[`${side}_goals`]++;
        next.events.push({ second, ...matchMinuteState(match,second), side: other, type: 'kickoff', pattern: 'Saque desde el medio' });
      }
    }
    if (live) for (const ended of schedule.filter(event => event.second + 3 === second && [half-4,activeDuration-4].includes(event.second))) {
      const shot = next.events.find(event=>event.second===ended.second && event.side===ended.side && ['goal','shot','save','post'].includes(event.type));
      const other = ended.side==='home'?'away':'home';
      next.events.push({second,...matchMinuteState(match,second),side:other,type:shot?.type==='post'?'clearance':'settled',pattern:shot?.type==='post'?'Despeje fuera del área':shot?.type==='save'?'El arquero controla la pelota':shot?.type==='goal'?'Balón en el centro':'Balón fuera. Saque de meta',safe_end:true,resume:shot?.type==='goal'?'middle':'keeper'});
    }
    if (second === activeDuration) next.events.push({ second, minute: 90, minuteLabel:matchMinuteState(match,second).minuteLabel, side: 'home', type: 'fulltime', pattern: 'Final del partido' });
  }
  next.active_seconds = target;
  return next;
}

/** Practice coaching only changes this local match; no club or database writes. */
export function applyOfflineCoaching(match, { titulares, formacion, mentalidad = 'neutral', requestId, side = 'home', revision } = {}, elapsed = match.active_seconds) {
  const next = advanceOfflineMatch(match, elapsed);
  if (requestId && next.coaching_requests.includes(requestId)) return next;
  if (!['home', 'away'].includes(side) || next.active_seconds >= matchActiveDurationSeconds(next)) throw new Error('El partido ya terminó.');
  const team = next[side], positions = SQUAD_FORMATIONS[formacion];
  if (revision !== undefined && revision !== team.revision) throw new Error('La alineación cambió. Revisa el once y vuelve a aplicar.');
  if (!positions || !Object.hasOwn(attackingBonus, mentalidad) || !Array.isArray(titulares) || titulares.length !== 11 || new Set(titulares).size !== 11) throw new Error('La alineación no es válida.');
  const pool = new Map(team.roster.map(player => [player.id, player]));
  if (titulares.some(id => !pool.has(id) || team.subbed_off.includes(id))) throw new Error('Una carta no está disponible para este partido.');
  const previous = new Set(team.titulares.map(player => player.id));
  const incoming = titulares.filter(id => !previous.has(id));
  if (team.substitutions + incoming.length > UT_MAX_SUBSTITUTIONS) throw new Error('Solo se permiten cinco cambios por partido.');
  const outgoing = team.titulares.filter(player => !titulares.includes(player.id)).map(player => player.id);
  const players = titulares.map((id, index) => {
    const base = basePlayer(pool.get(id));
    return { ...base, puesto: positions[index][0], base_grl: base.grl, grl: effectivePlayerGrl(base, positions[index][0]), penalizacion_grl: playerPositionPenalty(base, positions[index][0]) };
  });
  const subbedOff = [...team.subbed_off, ...outgoing];
  return { ...next, coaching_requests: requestId ? [...next.coaching_requests, requestId] : next.coaching_requests, [side]: {
    ...team, titulares: players, bench: team.roster.filter(player => !titulares.includes(player.id) && !subbedOff.includes(player.id)),
    formacion, mentalidad, revision: team.revision + 1, substitutions: team.substitutions + incoming.length, subbed_off: subbedOff,
    ...teamSimulationMetrics({ titulares: players }),
  }, events: [...next.events, { second: next.active_seconds, ...matchMinuteState(next,next.active_seconds), side, type: 'tactics', pattern: incoming.length ? `${incoming.length} cambio${incoming.length === 1 ? '' : 's'}` : 'Ajuste táctico' }] };
}

export function matchClockState(match, now = Date.now()) {
  const start = Date.parse(match?.started_at), end = Date.parse(match?.ends_at);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return { elapsed: 0, wallElapsed: 0, phase: 'pre', halftimeRemaining: 0 };
  const halftime = match.simulation_version >= 2 ? value(match.halftime_seconds, UT_HALFTIME_DURATION) : 0;
  const duration = matchActiveDurationSeconds(match), half = duration / 2;
  const raw = (now - start) / 1000;
  const wallElapsed = clamp(raw, 0, duration + halftime);
  const elapsed = raw < half ? wallElapsed : raw < half + halftime ? half : clamp(raw - halftime, half, duration);
  const phase = raw < 0 ? 'pre' : elapsed >= duration ? 'finished' : raw < half ? 'first' : raw < half + halftime ? 'halftime' : 'second';
  return { elapsed, wallElapsed, phase, halftimeRemaining: phase === 'halftime' ? Math.ceil(half + halftime - raw) : 0 };
}

export function matchElapsedSeconds(match, now = Date.now()) {
  return matchClockState(match, now).elapsed;
}

export function matchVisibleState(match, elapsed) {
  const duration = matchActiveDurationSeconds(match);
  const seconds = clamp(value(elapsed, 0), 0, duration);
  const events = (match?.events || []).filter(event => value(event.second, duration + 1) <= seconds);
  const stats = { home: { goals: 0, shots: 0, saves: 0, posts: 0 }, away: { goals: 0, shots: 0, saves: 0, posts: 0 } };
  for (const event of events) {
    if (!stats[event.side]) continue;
    if (event.type === 'goal') { stats[event.side].goals++; stats[event.side].shots++; }
    if (['shot', 'post', 'save'].includes(event.type)) stats[event.side].shots++;
    if (event.type === 'post') stats[event.side].posts++;
    if (event.type === 'save') stats[event.side === 'home' ? 'away' : 'home'].saves++;
  }
  return { seconds, ...matchMinuteState(match,seconds), events, latest: events.at(-1), stats };
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
    if (elapsed >= matchActiveDurationSeconds(match)) stop();
  };
  if (!Number.isFinite(Date.parse(match?.started_at)) || !Number.isFinite(Date.parse(match?.ends_at))) {
    onTick(0);
    return stop;
  }
  tick();
  if (!stopped) timer = interval(tick, delay);
  return stop;
}
