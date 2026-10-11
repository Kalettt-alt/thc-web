import { MS_PER_VIRTUAL_MINUTE } from './ConstantesJuego.js';
import { clamp } from './matchGeometry.js';
import { createMatchPlayers } from './matchTactics.js';
import { calcGrlEfectivo } from './formacionesFantasy.js';
import { playerEffortFactor, playerMatchSpeed } from './matchAttributes.js';

export const MENTALITIES = ['OFENSIVA', 'NORMAL', 'DEFENSIVA'];
export const MAX_SUBSTITUTIONS = 5;
export const statKey = player => `${player.isUser ? 'user' : 'rival'}:${player.sourceId || player.id}`;

export function getPlayerStats(state, player) {
  const key = statKey(player);
  state.playerStats ||= Object.create(null);
  state.playerStats[key] ||= { id: player.sourceId || player.id, name: player.name, isUser: player.isUser, passesAttempted: 0, passesCompleted: 0, shots: 0, goals: 0, recoveries: 0, saves: 0, minutes: 0 };
  const stats = state.playerStats[key];
  return { ...stats, rating: clamp(6 + stats.goals * 0.85 + stats.recoveries * 0.08 + stats.saves * 0.12 + stats.passesCompleted * 0.025 - (stats.passesAttempted - stats.passesCompleted) * 0.025, 3, 10) };
}

export function recordStat(state, player, field, amount = 1) {
  getPlayerStats(state, player);
  state.playerStats[statKey(player)][field] += amount;
}

export function recordMatchEvent(state, type, player, extra = {}) {
  state.eventId = (state.eventId || 0) + 1;
  state.lastEvent = { id: state.eventId, type, team: player?.isUser ? 'USER' : 'RIVAL', playerName: player?.name || '', clock: Math.floor(state.clockMs / MS_PER_VIRTUAL_MINUTE), ...extra };
}

export function refreshPlayerSpeed(player) {
  player.speed = playerMatchSpeed(player);
}

export function updateMatchFitness(state, delta) {
  const minutes = delta / MS_PER_VIRTUAL_MINUTE;
  for (const player of state.players) {
    if (!Number.isFinite(player.rawStamina)) player.rawStamina = 100;
    const effort = player.isGK ? 0.1 : player.behavior === 'PRESS' || player.behavior === 'OWNER' ? 0.3 : 0.22;
    const mentalityFactor = player.isUser && state.mentality === 'OFENSIVA' ? 1.1 : player.isUser && state.mentality === 'DEFENSIVA' ? 0.94 : 1;
    player.rawStamina = Math.max(0, player.rawStamina - minutes * effort * mentalityFactor * playerEffortFactor(player));
    recordStat(state, player, 'minutes', minutes);
    refreshPlayerSpeed(player);
  }
}

const canManage = state => !state.finished && (state.isPaused || state.phase === 'HALFTIME');

export function syncMatchEnergy(state, { titulares, lineup, reservas = [] } = {}) {
  if (state.finished || !(state.phase === 'READY' || canManage(state))) return { ok: false, error: 'Pausa el partido para recuperar al equipo.' };
  const lineupRows = Object.values(titulares || lineup || {});
  const rows = [...lineupRows, ...reservas];
  const energies = new Map();
  for (const player of rows) {
    const energy = Number(player?.energia);
    if (!player?.id || !Number.isFinite(energy) || energy < 0 || energy > 100) return { ok: false, error: 'No se pudo comprobar la energía guardada.' };
    energies.set(player.id, energy);
  }
  const local = state.players.filter(player => player.isUser);
  if (local.some(player => !energies.has(player.sourceId || player.id)) || state.reserves.some(player => !energies.has(player.id))) return { ok: false, error: 'El equipo guardado cambió. Actualiza la partida.' };
  for (const player of local) {
    const energy = energies.get(player.sourceId || player.id);
    player.rawStamina = energy;
    player.initialStamina = energy;
    player.careerData = { ...player.careerData, energia: energy };
    refreshPlayerSpeed(player);
  }
  state.reserves = state.reserves.map(player => ({ ...player, energia: energies.get(player.id) }));
  return { ok: true };
}

export function restoreMatchEnergy(state) {
  return syncMatchEnergy(state, {
    titulares: Object.fromEntries(state.players.filter(player => player.isUser).map(player => [player.slot, { id: player.sourceId || player.id, energia: 100 }])),
    reservas: state.reserves.map(player => ({ id: player.id, energia: 100 }))
  });
}

export function setMatchMentality(state, mentality) {
  if (!canManage(state)) return { ok: false, error: 'Pausa el partido para cambiar la mentalidad.' };
  if (!MENTALITIES.includes(mentality)) return { ok: false, error: 'Mentalidad inválida.' };
  state.mentality = mentality;
  return { ok: true };
}

export function substituteMatchPlayer(state, slotId, reserveId) {
  if (!canManage(state)) return { ok: false, error: 'Pausa el partido para realizar un cambio.' };
  if (state.substitutionsUsed >= MAX_SUBSTITUTIONS) return { ok: false, error: 'Ya realizaste los cinco cambios.' };
  const outgoing = state.players.find(player => player.isUser && player.slot === slotId);
  const reserveIndex = state.reserves.findIndex(player => player.id === reserveId && !player.substitutedOut);
  if (!outgoing || reserveIndex < 0) return { ok: false, error: 'Selecciona un titular y una reserva disponible.' };
  const incoming = state.reserves[reserveIndex];
  if (state.players.some(player => player.isUser && player.sourceId === incoming.id)) return { ok: false, error: 'Este jugador ya está en cancha.' };
  const grl = calcGrlEfectivo(incoming, { GK: 'GK', DEF: 'DEF', MID: 'MID', ATT: 'DEL' }[outgoing.role]);
  const replacement = { ...outgoing, careerData: { ...incoming }, sourceId: incoming.id, name: incoming.name, grl, rawStamina: clamp(Number(incoming.energia), 0, 100), initialStamina: clamp(Number(incoming.energia), 0, 100), moraleBonus: 0, target: null };
  refreshPlayerSpeed(replacement);
  state.players = state.players.map(player => player.id === outgoing.id ? replacement : player);
  state.reserves.splice(reserveIndex, 1);
  state.reserves.push({ ...outgoing.careerData, id: outgoing.sourceId, name: outgoing.name, energia: outgoing.rawStamina, substitutedOut: true });
  state.substitutionsUsed += 1;
  state.turnId += 1;
  state.isAiming = false;
  recordMatchEvent(state, 'SUBSTITUTION', replacement, { outgoingName: outgoing.name });
  return { ok: true, remaining: MAX_SUBSTITUTIONS - state.substitutionsUsed };
}

export function swapMatchPositions(state, slotA, slotB) {
  if (!canManage(state)) return { ok: false, error: 'Pausa el partido para cambiar posiciones.' };
  const a = state.players.find(player => player.isUser && player.slot === slotA);
  const b = state.players.find(player => player.isUser && player.slot === slotB);
  if (!a || !b || a.id === b.id) return { ok: false, error: 'Selecciona dos posiciones distintas.' };
  for (const key of ['slot', 'role', 'isGK', 'baseX', 'baseY']) { const old = a[key]; a[key] = b[key]; b[key] = old; }
  for (const player of [a, b]) {
    player.grl = calcGrlEfectivo(player.careerData || { pos: player.role, grl: player.grl }, { GK: 'GK', DEF: 'DEF', MID: 'MID', ATT: 'DEL' }[player.role]);
    refreshPlayerSpeed(player);
  }
  state.turnId += 1;
  state.isAiming = false;
  return { ok: true };
}

export function applyMatchFormation(state, formation) {
  const roster = Object.fromEntries(state.players.filter(player => player.isUser).map(player => [player.slot, { ...player.careerData, id: player.sourceId, name: player.name, energia: player.rawStamina }]));
  const updated = createMatchPlayers(roster, { titulares: [] }, formation, { color: state.players.find(player => player.isUser)?.color });
  const existing = new Map(state.players.filter(player => player.isUser).map(player => [player.sourceId, player]));
  const local = updated.map(player => {
    const old = existing.get(player.sourceId);
    const result = { ...old, ...player, id: old?.id || player.id, x: old?.x ?? player.x, y: old?.y ?? player.y, target: old?.target || null, initialStamina: old?.initialStamina ?? player.rawStamina, moraleBonus: old?.moraleBonus || 0 };
    refreshPlayerSpeed(result);
    return result;
  });
  state.players = [...local, ...state.players.filter(player => !player.isUser)];
  state.formation = formation;
}

export function getMatchSummary(state) {
  const lineup = Object.fromEntries(state.players.filter(player => player.isUser).map(player => [player.slot, { ...player.careerData, id: player.sourceId, name: player.name, energia: Math.round(player.rawStamina * 10) / 10 }]));
  const reserves = state.reserves.map(player => { const copy = { ...player }; delete copy.substitutedOut; return copy; });
  return { lineup, reservas: reserves, formation: state.formation, mentality: state.mentality, substitutionsUsed: state.substitutionsUsed, teamTalkCount: state.teamTalkCount, opportunities: state.opportunities ? { user: { ...state.opportunities.user }, rival: { ...state.opportunities.rival } } : undefined, playerStats: Object.fromEntries(Object.entries(state.playerStats).map(([id, stats]) => [id, { ...stats }])) };
}
