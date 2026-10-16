// Broadcast choreography only. Scores and match events always come from the simulation.
import { matchHalfSeconds, UT_MATCH_PLAYS } from './matchPlaysUT.js';
const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));
const aliases = { POR: 'GK', DFC: 'CB', LI: 'LB', LD: 'RB', MC: 'CM', MDC: 'CDM', MCD: 'CDM', MCO: 'CAM', EI: 'LW', ED: 'RW', MI: 'LM', MD: 'RM', DC: 'ST', SP: 'CF', EXT: 'LW' };
const lanes = { GK: [.065,.5], CB: [.24,.5], LB: [.28,.15], RB: [.28,.85], LWB: [.37,.12], RWB: [.37,.88], CDM: [.39,.5], CM: [.5,.5], CAM: [.63,.5], LM: [.54,.15], RM: [.54,.85], LW: [.72,.18], RW: [.72,.82], CF: [.72,.5], ST: [.8,.5] };
const hash = input => [...String(input)].reduce((value, char) => Math.imul(value ^ char.charCodeAt(0), 16777619) >>> 0, 2166136261);
const name = player => player.nombre || player.name || 'Jugador';
const role = player => aliases[player.puesto || player.pos || player.posicion] || player.puesto || player.pos || player.posicion || 'CM';
export function broadcastKitColors(team, away = false) {
  const colors = Array.isArray(team?.colores) ? team.colores : [];
  const valid = color => typeof color === 'string' && /^#[\da-f]{3}(?:[\da-f]{3})?$/i.test(color);
  const primary = [team?.c1, ...colors].find(valid) || (away ? '#eee8dc' : '#ff811f');
  const secondary = [team?.c2, ...colors.slice(1)].find(valid) || (away ? '#2559a8' : '#202322');
  return { primary, secondary };
}

export function broadcastScene(match, elapsed, phase = 'first') {
  const visible = (match.events || []).filter(event => event.second <= elapsed);
  const latest = [...visible].reverse().find(event => ['goal','save','post','shot'].includes(event.type) && elapsed - event.second < 2.6) || visible.at(-1);
  const play = UT_MATCH_PLAYS.find(item=>item.id===latest?.play_id);
  const segmentLength = match.simulation_version >= 3 ? 1.35 : 2.6;
  const segment = Math.floor(elapsed / segmentLength);
  const terminal = ['goal','shot','save','post'].includes(latest?.type);
  const possession = latest?.side ? terminal && elapsed - latest.second >= 2.6 ? latest.side === 'home' ? 'away' : 'home' : latest.side : hash(`${match.id}-${Math.floor(elapsed / 8)}`) % 2 ? 'home' : 'away';
  const secondHalf = elapsed > matchHalfSeconds(match) || phase === 'second' || phase === 'finished';
  const players = ['home','away'].flatMap(side => {
    const roster = (match[side]?.titulares || []).filter(Boolean);
    const roles = roster.map(role);
    const used = new Map();
    const facingRight = (side === 'home') !== secondHalf;
    return roster.map((player, index) => {
      const position = roles[index];
      const occurrence = used.get(position) || 0;
      used.set(position, occurrence + 1);
      const count = roles.filter(other => other === position).length;
      const [depth, lane] = lanes[position] || lanes.CM;
      const spread = count > 1 ? (occurrence - (count - 1) / 2) * .27 : 0;
      const attacking = side === possession;
      const shift = position === 'GK' ? 0 : attacking ? .09 : -.05;
      const running = phase === 'first' || phase === 'second';
      const wave = running ? Math.sin(elapsed * 1.8 + index * 1.6 + (side === 'away' ? 1 : 0)) : 0;
      const depthMove = position === 'GK' ? wave * .008 : wave * .018 + Math.sin(elapsed * .53 + index) * .025;
      let x = clamp(depth + shift + depthMove, .035, .93);
      let y = clamp(lane + spread + wave * .035 + Math.cos(elapsed * .78 + index * 2) * .03, .08, .92);
      if (!facingRight) { x = 1 - x; y = 1 - y; }
      if (phase === 'halftime') y = .7 + index * .012;
      return { id: `${side}-${player.id || index}`, player, name: name(player), role: position, side, number: index + 1, x, y, facingRight };
    });
  });
  const attackers = players.filter(player => player.side === possession && player.role !== 'GK');
  // A build-up progresses through lines. Once in the box, keep the chance alive
  // until the authoritative shot arrives instead of passing back to a defender.
  const lineGroups = [['CB','LB','RB','LWB','RWB'],['CDM','CM'],['CAM','LM','RM'],['LW','RW'],['ST','CF']];
  const buildAge = latest?.type === 'pass' ? Math.max(0, elapsed - latest.second) : elapsed % (segmentLength * 5);
  const line = Math.min(4, Math.floor(buildAge / (latest?.type === 'pass' ? .85 : segmentLength)));
  const chooseLine = index => {
    const candidates = attackers.filter(player => lineGroups[Math.min(index,4)].includes(player.role));
    return candidates[hash(`${match.id}-${possession}-${Math.floor(elapsed / 8)}-${index}`) % (candidates.length || 1)];
  };
  const carrier = chooseLine(line) || [...attackers].sort((left,right) => (left.facingRight ? right.x-left.x : left.x-right.x))[0] || players[0];
  const towardGoal = player => player.facingRight ? player.x : 1-player.x;
  const intended = chooseLine(line + 1);
  const forward = attackers.filter(player => carrier && towardGoal(player) >= towardGoal(carrier) + .025).sort((left,right)=>Math.abs(left.y-carrier.y)-Math.abs(right.y-carrier.y));
  const target = carrier && towardGoal(carrier) > .82 ? carrier : intended && towardGoal(intended) >= towardGoal(carrier) ? intended : forward[0] || carrier;
  const progress = (buildAge % (latest?.type === 'pass' ? .85 : segmentLength)) / (latest?.type === 'pass' ? .85 : segmentLength);
  const pass = clamp((progress - .35) / .4, 0, 1);
  let ball = carrier ? { x: carrier.x + .007, y: carrier.y + .01, height: 0 } : { x: .5, y: .5, height: 0 };
  if (carrier && target) ball = { x: carrier.x + (target.x - carrier.x) * pass, y: carrier.y + (target.y - carrier.y) * pass + Math.sin(pass * Math.PI) * .014, height: segment % 4 === 0 ? Math.sin(pass * Math.PI) * 8 : 0 };
  const recent = latest && elapsed - latest.second;
  const finishing = latest && ['goal','shot','save','post'].includes(latest.type) && recent >= 0 && recent < 2.6;
  let highlight = carrier;
  if (play && latest?.type==='pass') {
    const routeProgress = clamp((elapsed-latest.second)/4,0,1)*(play.route.length-1);
    const segmentIndex = Math.min(play.route.length-2,Math.floor(routeProgress));
    const ratio = routeProgress-segmentIndex;
    const from = play.route[segmentIndex], to = play.route[segmentIndex+1];
    const right = (possession==='home') !== secondHalf;
    const routeX = from[0]+(to[0]-from[0])*ratio, routeY = from[1]+(to[1]-from[1])*ratio;
    ball = {x:right?routeX:1-routeX,y:right?routeY:1-routeY,height:play.id.includes('cross')||play.id.startsWith('corner_')?Math.sin(ratio*Math.PI)*12:Math.sin(ratio*Math.PI)*2};
    highlight = attackers.find(player=>player.role===play.roles[Math.min(segmentIndex,play.roles.length-1)]) || carrier;
    if (highlight) {highlight.x=ball.x+(right?-.012:.012);highlight.y=clamp(ball.y+.018,.08,.92);}
    const defenders = players.filter(player=>player.side!==possession&&player.role!=='GK');
    const pressure = [...defenders].sort((a,b)=>Math.hypot(a.x-ball.x,a.y-ball.y)-Math.hypot(b.x-ball.x,b.y-ball.y)).slice(0,2);
    for (const defender of pressure) {defender.x=clamp(defender.x+(ball.x-defender.x)*.32,.035,.965);defender.y=clamp(defender.y+(ball.y-defender.y)*.5,.08,.92);}
  }
  if (finishing) {
    const shooterName = latest.shooter || latest.attacker || (latest.type !== 'save' ? latest.player : null);
    highlight = attackers.find(player => player.name === shooterName) || attackers.find(player => ['ST','LW','RW','CF'].includes(player.role)) || carrier;
    if (highlight) {
      const right = highlight.facingRight;
      if (play) {const point=play.route.at(-1);highlight.x=right?point[0]:1-point[0];highlight.y=right?point[1]:1-point[1];}
      const ratio = clamp(recent / .65, 0, 1);
      const endpoint = latest.type === 'goal' ? right ? 1.018 : -.018 : latest.type === 'shot' ? right ? .995 : .005 : right ? .94 : .06;
      const endY = latest.type === 'post' ? .407 : latest.type === 'shot' ? .34 : .49 + (hash(`${match.id}-${latest.second}`) % 5 - 2) * .025;
      ball = { x: highlight.x + (endpoint - highlight.x) * ratio, y: highlight.y + (endY - highlight.y) * ratio, height: Math.sin(ratio * Math.PI) * 7 };
      const keeper = players.find(player => player.side !== latest.side && player.role === 'GK');
      if (keeper) {
        const dive = Math.sin(clamp(recent / 1.4, 0, 1) * Math.PI);
        keeper.y = clamp(keeper.y + (endY - keeper.y) * dive, .08, .92);
        keeper.x = clamp(keeper.x + (right ? -.015 : .015) * dive, .035, .965);
      }
      if (latest.type === 'post' && ratio === 1) { ball.x = endpoint + (right ? -.12 : .12) * clamp((recent - .65) / 1.2, 0, 1); ball.y += .15 * clamp((recent - .65) / 1.2, 0, 1); }
    }
  }
  if (['settled','clearance'].includes(latest?.type)) {
    const keeper=players.find(player=>player.side===possession&&player.role==='GK');
    if (latest.resume==='middle') ball={x:.5,y:.5,height:0};
    else if (keeper) {ball={x:keeper.x,y:keeper.y+.012,height:0};highlight=keeper;}
  }
  if (phase === 'pre' || phase === 'halftime' || phase === 'finished' || latest?.type === 'kickoff' && recent < .7) ball = { x: .5, y: .5, height: 0 };
  return { players, ball, highlight: highlight?.id, possession, latest, finishing, playId:play?.id, danger: finishing || !latest?.safe_end && (play ? (possession==='home')!==secondHalf?ball.x>.76:ball.x<.24 : carrier && towardGoal(carrier) > .76), passingForward: carrier && target ? towardGoal(target) >= towardGoal(carrier) : true };
}
