import { clampCardRating, displayCardPosition } from './utCards.js';

export const SQUAD_FORMATIONS = {
  '4-3-3': [['LW',24,21],['ST',50,17],['RW',76,21],['CM',28,43],['CAM',50,46],['CM',72,43],['LB',13,68],['CB',37,72],['CB',63,72],['RB',87,68],['GK',50,89]],
  '4-4-2': [['ST',37,18],['ST',63,18],['LM',16,43],['CM',39,46],['CM',61,46],['RM',84,43],['LB',13,69],['CB',37,73],['CB',63,73],['RB',87,69],['GK',50,89]],
  '4-2-3-1': [['ST',50,15],['LM',23,34],['CAM',50,36],['RM',77,34],['CDM',35,54],['CDM',65,54],['LB',13,72],['CB',37,75],['CB',63,75],['RB',87,72],['GK',50,90]],
};
export function positionFit(player, target) {
  if (!player || typeof target !== 'string' || !target) return 0;
  if (player.pos === target) return 3;
  return Array.isArray(player.posiciones_secundarias) && player.posiciones_secundarias.includes(target) ? 2 : 0;
}

const roleFamilies = { DEF:['CB','LB','RB','LWB','RWB'], MID:['CM','CDM','CAM'], WIDE:['LW','RW','LM','RM'], ATT:['ST','CF'] };
const familyByPosition = new Map(Object.entries(roleFamilies).flatMap(([family,positions])=>positions.map(position=>[position,family])));
const roleFamily = position => familyByPosition.get(position);
const leftPositions = new Set(['LB','LWB','LW','LM']), rightPositions = new Set(['RB','RWB','RW','RM']);
const roleSide = position => leftPositions.has(position) ? 'left' : rightPositions.has(position) ? 'right' : null;

export function playerPositionPenalty(player, target) {
  if (!player || typeof target !== 'string' || !target) return 0;
  if (positionFit(player,target)) return 0;
  const source=player.pos;
  if (source === 'GK' || target === 'GK') return 40;
  if ((['LW','LM'].includes(source) && ['LW','LM'].includes(target)) || (['RW','RM'].includes(source) && ['RW','RM'].includes(target))) return 2;
  if ((['LM','RM'].includes(source) && target === 'CM') || (source === 'CM' && ['LM','RM'].includes(target))) return 3;
  const from=roleFamily(source), to=roleFamily(target);
  if (!from || !to) return 18;
  if (from === to) {
    if ((from === 'DEF' || from === 'WIDE') && roleSide(source) && roleSide(target) && roleSide(source) !== roleSide(target)) return 6;
    return 3;
  }
  if ((from === 'DEF' && ['ATT','WIDE'].includes(to)) || (to === 'DEF' && ['ATT','WIDE'].includes(from))) return 18;
  if ([from,to].includes('DEF') && [from,to].includes('MID')) return 10;
  if ([from,to].includes('MID') && [from,to].includes('ATT')) return 9;
  if ([from,to].includes('MID') && [from,to].includes('WIDE')) return 6;
  if ([from,to].includes('WIDE') && [from,to].includes('ATT')) return 5;
  return 18;
}

export function effectivePlayerGrl(player, target) {
  return player ? Math.max(0,clampCardRating(player.grl)-playerPositionPenalty(player,target)) : 0;
}

export function effectiveSquadOverall(squad) {
  const slots=SQUAD_FORMATIONS[Object.hasOwn(SQUAD_FORMATIONS,squad?.formacion) ? squad.formacion : '4-3-3'];
  return Math.round(slots.reduce((sum,[position],index)=>sum+effectivePlayerGrl(squad?.titulares?.[index],position),0)/11);
}

const isFormation = value => Object.hasOwn(SQUAD_FORMATIONS, value);
const sections = ['titulares', 'suplentes', 'reservas'];
const sectionLimits = { titulares:11, suplentes:7, reservas:100 };
const validSlot = slot => slot && Object.hasOwn(sectionLimits, slot.section) && Number.isInteger(slot.index) && slot.index >= 0 && slot.index < sectionLimits[slot.section];
const squadPool = squad => {
  const byId = new Map();
  for (const section of sections) {
    for (const player of Array.isArray(squad[section]) ? squad[section] : []) {
      if (player && typeof player.id === 'string' && !byId.has(player.id)) byId.set(player.id, player);
    }
  }
  return [...byId.values()];
};

export function validateStartingSquad(squad) {
  if (!squad || !isFormation(squad.formacion)) return { valid:false, issues:['Selecciona una formación válida.'], missingPositions:[] };
  const issues = [], missingPositions = [], seen = new Set();
  const players = Array.isArray(squad.titulares) ? squad.titulares : [];
  if (players.length > 11) issues.push('El once solo puede tener 11 jugadores.');
  for (const [index, [position]] of SQUAD_FORMATIONS[squad.formacion].entries()) {
    const player = players[index];
    if (!player) {
      missingPositions.push(position);
      issues.push(`Falta un ${displayCardPosition(position)}.`);
    } else if (typeof player.id !== 'string' || !player.id || seen.has(player.id)) {
      issues.push('Cada puesto necesita una carta distinta.');
    }
    if (player?.id) seen.add(player.id);
  }
  return { valid:issues.length === 0, issues, missingPositions };
}

export function arrangeSquad(squad, formation = squad.formacion, { preserveSlots = false, naturalOnly = false } = {}) {
  const nextFormation = isFormation(formation) ? formation : '4-3-3';
  const slots = SQUAD_FORMATIONS[nextFormation];
  const pool = squadPool(squad);
  const possibilities = Array(1 << slots.length).fill(null);
  possibilities[0] = {score:0, players:Array(slots.length).fill(null)};
  for (const player of pool) {
    for (let mask = possibilities.length - 1; mask >= 0; mask--) {
      const current = possibilities[mask];
      if (!current) continue;
      for (let index = 0; index < slots.length; index++) {
        if (mask & (1 << index)) continue;
        const fit = positionFit(player, slots[index][0]);
        if (naturalOnly && !fit) continue;
        if (!fit && (player.pos === 'GK' || slots[index][0] === 'GK')) continue;
        const nextMask = mask | (1 << index);
        const kept = preserveSlots && squad.titulares?.[index]?.id === player.id ? 10000 : 0;
        const score = current.score + 1000000 + kept + effectivePlayerGrl(player,slots[index][0]) * 10 + fit;
        if (!possibilities[nextMask] || score > possibilities[nextMask].score) {
          const players = [...current.players];
          players[index] = player;
          possibilities[nextMask] = {score, players};
        }
      }
    }
  }
  const best = possibilities.reduce((chosen,value) => value && value.score > chosen.score ? value : chosen, possibilities[0]);
  const titulares = best.players;
  const used = new Set(titulares.filter(Boolean).map(player=>player.id));
  const remaining = pool.filter(player=>!used.has(player.id)).sort((a,b)=>clampCardRating(b.grl)-clampCardRating(a.grl));
  return {...squad, formacion:nextFormation, titulares, suplentes:remaining.slice(0,7), reservas:remaining.slice(7)};
}

export function repairSquad(squad) {
  if (Number.isFinite(squad.version_posiciones) && squad.version_posiciones >= 1) return { squad, changed:false };
  const legacyOrder=Array.isArray(squad.titulares) && squad.titulares.length === 11 && squad.titulares.every((player,index)=>player?.id===`p${index+1}`);
  if (!legacyOrder) return { squad, changed:false };
  const next = arrangeSquad(squad, squad.formacion, { naturalOnly:true });
  const changed = next.formacion !== squad.formacion || sections.some(section => {
    const previous = Array.isArray(squad[section]) ? squad[section] : [];
    return previous.length !== next[section].length || next[section].some((player,index) => (player?.id || null) !== (previous[index]?.id || null));
  });
  return { squad:next, changed };
}

export function canSwapSquadCards(squad, from, to) {
  if (!validSlot(from) || !validSlot(to) || (from.section === to.section && from.index === to.index)) return false;
  const fromPlayer = squad[from.section]?.[from.index] || null;
  const toPlayer = squad[to.section]?.[to.index] || null;
  if (!fromPlayer && !toPlayer) return false;
  return true;
}

export function swapSquadCards(squad, from, to) {
  if (!canSwapSquadCards(squad, from, to)) return squad;
  const next = {...squad, titulares:Array.from({length:11},(_,i)=>squad.titulares?.[i]||null), suplentes:Array.from({length:7},(_,i)=>squad.suplentes?.[i]||null), reservas:[...(squad.reservas||[])]};
  [next[from.section][from.index],next[to.section][to.index]] = [next[to.section][to.index]||null,next[from.section][from.index]||null];
  return next;
}

export function addSquadCard(squad, player, target = null) {
  if (!player || typeof player.id !== 'string' || squadPool(squad).some(card => card.id === player.id)) return squad;
  if (target && !validSlot(target)) return squad;
  const next = { ...squad, titulares:[...(squad.titulares || [])], suplentes:[...(squad.suplentes || [])], reservas:[...(squad.reservas || [])] };
  let reserveIndex = next.reservas.findIndex(card => !card);
  if (reserveIndex < 0) reserveIndex = next.reservas.length;
  const replaced = target ? next[target.section][target.index] || null : null;
  if ((!target || replaced) && reserveIndex >= sectionLimits.reservas) return squad;
  if (target) {
    if (replaced) next.reservas[reserveIndex] = replaced;
    next[target.section][target.index] = player;
  } else next.reservas[reserveIndex] = player;
  return next;
}
