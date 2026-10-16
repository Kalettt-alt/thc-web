// Routes are expressed from the attacking team's own goal toward the rival goal.
// The simulation chooses the play; the broadcast draws that same route for both viewers.
export const UT_MATCH_PLAYS = Object.freeze([
  {id:'one_two',label:'Pared por dentro',attribute:'pas',bonus:.008,roles:['CM','CAM','ST'],route:[[.43,.5],[.62,.43],[.73,.55],[.86,.48]]},
  {id:'through_ball',label:'Pase entre centrales',attribute:'pas',bonus:.01,roles:['CM','CAM','ST'],route:[[.4,.57],[.61,.5],[.82,.43],[.89,.47]]},
  {id:'right_cross',label:'Centro desde la derecha',attribute:'pas',bonus:0,roles:['RB','RW','ST'],route:[[.35,.81],[.65,.86],[.87,.83],[.86,.48]]},
  {id:'left_cross',label:'Centro desde la izquierda',attribute:'pas',bonus:0,roles:['LB','LW','ST'],route:[[.35,.19],[.65,.14],[.87,.17],[.86,.52]]},
  {id:'right_cutback',label:'Desborde y pase atrás al punto penal',attribute:'dri',bonus:.012,roles:['RM','RW','CAM'],route:[[.48,.78],[.76,.87],[.93,.8],[.85,.53]]},
  {id:'left_cutback',label:'Línea de fondo por la izquierda',attribute:'dri',bonus:.012,roles:['LM','LW','CAM'],route:[[.48,.22],[.76,.13],[.93,.2],[.85,.47]]},
  {id:'switch',label:'Cambio de orientación',attribute:'pas',bonus:-.004,roles:['LB','CM','RW','ST'],route:[[.36,.17],[.53,.33],[.69,.82],[.88,.56]]},
  {id:'counter_centre',label:'Contraataque por el centro',attribute:'pac',bonus:.014,roles:['CDM','CAM','ST'],route:[[.3,.48],[.55,.5],[.76,.44],[.9,.49]]},
  {id:'counter_left',label:'Contraataque por la izquierda',attribute:'pac',bonus:.008,roles:['LB','LW','ST'],route:[[.26,.25],[.52,.16],[.78,.24],[.89,.44]]},
  {id:'counter_right',label:'Contraataque por la derecha',attribute:'pac',bonus:.008,roles:['RB','RW','ST'],route:[[.26,.75],[.52,.84],[.78,.76],[.89,.56]]},
  {id:'overlap_left',label:'Lateral doblando por fuera',attribute:'pac',bonus:-.003,roles:['CM','LW','LB','ST'],route:[[.47,.46],[.62,.2],[.84,.12],[.88,.5]]},
  {id:'overlap_right',label:'Superioridad por la banda derecha',attribute:'pac',bonus:-.003,roles:['CM','RW','RB','ST'],route:[[.47,.54],[.62,.8],[.84,.88],[.88,.5]]},
  {id:'corner_near',label:'Córner al primer palo',attribute:'phy',bonus:-.008,roles:['LW','CB','ST'],route:[[.98,.05],[.95,.21],[.9,.4],[.94,.45]]},
  {id:'corner_far',label:'Córner al segundo palo',attribute:'phy',bonus:-.008,roles:['RW','CB','ST'],route:[[.98,.95],[.95,.78],[.88,.42],[.93,.49]]},
  {id:'corner_short',label:'Córner corto y pared',attribute:'pas',bonus:-.01,roles:['LW','CAM','ST'],route:[[.98,.05],[.86,.17],[.82,.27],[.9,.48]]},
  {id:'free_kick',label:'Tiro libre ensayado',attribute:'sho',bonus:-.016,roles:['CAM','ST'],route:[[.72,.35],[.76,.39],[.83,.45],[.88,.49]]},
  {id:'high_press',label:'Robo con presión alta',attribute:'def',bonus:.009,roles:['CM','CAM','ST'],route:[[.63,.56],[.69,.53],[.8,.46],[.89,.5]]},
  {id:'escape_press',label:'Salida de la presión por fuera',attribute:'pas',bonus:-.006,roles:['CB','LB','CM','LW'],route:[[.23,.5],[.34,.17],[.57,.26],[.84,.28]]},
  {id:'solo_run',label:'Conducción rompiendo líneas',attribute:'dri',bonus:.002,roles:['CM','CAM','ST'],route:[[.45,.47],[.59,.58],[.73,.4],[.89,.51]]},
  {id:'second_ball',label:'Rebote y segunda jugada',attribute:'phy',bonus:.003,roles:['ST','CM','CAM'],route:[[.78,.46],[.74,.58],[.83,.61],[.89,.54]]},
]);

export function matchActiveDurationSeconds(match) {
  if (match?.simulation_version >= 4) {
    const explicit = Number(match.active_duration_seconds);
    if (Number.isInteger(explicit) && explicit >= 128 && explicit <= 136 && explicit % 2 === 0) return explicit;
    const wall = (Date.parse(match.ends_at) - Date.parse(match.started_at)) / 1000;
    if (Number.isFinite(wall) && wall >= 140 && wall <= 148 && wall % 2 === 0) return wall - 12;
  }
  return Number(match?.duration_seconds) === 180 || !(match?.simulation_version >= 3) ? 180 : 120;
}
export const matchHalfSeconds = match => matchActiveDurationSeconds(match) / 2;

export function matchOpportunitySchedule(match) {
  const half = matchHalfSeconds(match);
  if (!(match.simulation_version >= 4)) {
    const step = match.simulation_version >= 3 ? 16 : 23;
    return ['home','away'].flatMap(side=>Array.from({length:7},(_,index)=>({side,index,second:(side==='home'?8:14)+step*index})));
  }
  return ['home','away'].flatMap(side => {
    const first = side==='home' ? [8,24,40,half-10] : [14,30,46,half-4];
    const second = side==='home' ? [8,30,half-4] : [14,36,half-10];
    return [...first,...second.map(t=>t+half)].map((second,index)=>({side,index,second}));
  });
}

export function matchMinuteState(match, elapsed) {
  const half = matchHalfSeconds(match);
  if (!(match?.simulation_version >= 4)) {
    const minute = Math.min(90,Math.floor(elapsed*90/(half*2)));
    return {minute,minuteLabel:String(minute),addedTime:false};
  }
  if (elapsed===half) return {minute:45,minuteLabel:'45',addedTime:false};
  const secondHalf = elapsed>half;
  const inHalf = secondHalf ? elapsed-half : elapsed;
  const minute = (secondHalf?45:0)+Math.min(45,Math.floor(inHalf*.75));
  const addedTime = inHalf>60;
  return {minute,minuteLabel:addedTime?`${secondHalf?90:45}+${Math.ceil((inHalf-60)*.75)}`:String(minute),addedTime};
}
