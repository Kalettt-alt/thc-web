import { JUGADORES_BASE } from './jugadoresBase.js';

export const STARTER_PACK_SIZE = 23;
export const STARTER_POOL_SIZE = 67;
export const STARTER_REQUIRED_POSITIONS = Object.freeze({ GK:2, CB:2, LB:1, RB:1, CM:2, CAM:1, LW:1, RW:1, ST:1 });
export const STARTER_ALLOWED_POSITIONS = Object.freeze(['GK','CB','LB','RB','CDM','CM','CAM','LW','RW','LM','RM','ST']);
export const STARTER_RARITY_COUNTS = Object.freeze({ bronce:37, plata:24, oro:5, plus:1 });
export const STARTER_RARITY_PROBABILITIES = Object.freeze({ bronce:55, plata:34.5, oro:10, plus:.5 });

// Fictional starter players. The original 23 IDs and ratings remain unchanged.
const recruits = [
  ['M. QUISPE','GK',71,'PE'], ['A. FERRERO','GK',68,'AR'], ['I. SUAREZ','GK',73,'UY'], ['D. MONTERO','GK',66,'BO'],
  ['J. ARIAS','CB',70,'CO'], ['R. LIMA','CB',73,'BR'], ['P. SERRANO','CB',67,'ES'], ['T. HALE','CB',65,'EN'], ['E. VILLALBA','CB',72,'EC'], ['C. AQUINO','CB',69,'PY'],
  ['L. PALACIOS','LB',70,'VE'], ['G. RINALDI','LB',74,'IT'], ['A. MOREAU','LB',68,'FR'], ['N. BROOKS','LB',66,'US'],
  ['E. CLARKE','RB',71,'CA'], ['K. ELIASEN','RB',67,'FO'], ['M. ROSSI','RB',65,'VA'], ['A. ORLOV','RB',73,'RU'],
  ['R. SATO','CDM',72,'JP'], ['L. BIANCHI','CDM',66,'SM'], ['D. HUAMAN','CDM',70,'PE'], ['F. OJEDA','CDM',74,'AR'],
  ['M. PEREIRA','CM',75,'UY'], ['S. ROCHA','CM',66,'BO'], ['E. MEJIA','CM',71,'CO'], ['V. ALMEIDA','CM',73,'BR'], ['H. NAVARRO','CM',68,'ES'], ['J. REED','CM',70,'EN'],
  ['A. ZAMBRANO','CAM',74,'EC'], ['S. CABRERA','CAM',69,'PY'], ['R. MENDOZA','CAM',72,'VE'], ['F. CONTI','CAM',67,'IT'],
  ['L. DUVAL','LW',73,'FR'], ['M. CARTER','LW',68,'US'], ['N. WILSON','LW',71,'CA'],
  ['J. HANSEN','RW',70,'FO'], ['A. LEONE','RW',67,'VA'], ['D. VOLKOV','RW',74,'RU'],
  ['K. MORI','LM',69,'JP'], ['P. VALENTI','RM',68,'SM'],
  ['S. TORRES','ST',75,'PE'], ['G. ACOSTA','ST',72,'AR'], ['A. SOSA','ST',69,'UY'], ['J. FLORES','ST',66,'BO'],
];
const weights = {
  CB:[.10,.02,.10,.06,.45,.27], LB:[.22,.03,.17,.13,.30,.15], RB:[.22,.03,.17,.13,.30,.15],
  CDM:[.08,.05,.25,.12,.30,.20], CM:[.10,.13,.30,.23,.14,.10], CAM:[.12,.22,.28,.28,.03,.07],
  LW:[.25,.18,.20,.27,.03,.07], RW:[.25,.18,.20,.27,.03,.07], LM:[.25,.18,.20,.27,.03,.07], RM:[.25,.18,.20,.27,.03,.07],
  ST:[.18,.40,.08,.22,.02,.10], GK:[.22,.22,.10,.24,.06,.16],
};
const archetypes = {
  CB:[-9,-34,-15,-20,5,7], LB:[6,-27,-4,-1,1,-3], RB:[6,-27,-4,-1,1,-3],
  CDM:[-7,-19,4,-3,5,4], CM:[-2,-6,6,4,-12,-7], CAM:[2,3,5,7,-34,-15],
  LW:[10,-3,-5,5,-40,-15], RW:[10,-3,-5,5,-40,-15], LM:[8,-8,1,4,-29,-15], RM:[8,-8,1,4,-29,-15],
  ST:[4,7,-14,2,-38,1], GK:[1,-1,-7,3,-17,0],
};
const bounded = value => Math.max(0,Math.min(99,Math.round(value)));
function recruitCard([nombre,pos,level,country],index) {
  const values=archetypes[pos].map((offset,key)=>bounded(level+offset+((index+key*2)%5)-2));
  const grl=Math.round(values.reduce((sum,value,key)=>sum+value*weights[pos][key],0));
  const keys=pos==='GK'?['gk_div','gk_han','gk_kic','gk_ref','gk_spd','gk_pos']:['pac','sho','pas','dri','def','phy'];
  return Object.freeze({ id:`p${index+24}`,nombre,pos,grl,...Object.fromEntries(keys.map((key,i)=>[key,values[i]])),
    color:grl>=75?'oro':grl>=65?'plata':'bronce',nacionalidad:country,pais_codigo:country,
  });
}
// Frozen source for a receipt issued by the first 67-player migration.
export const LEGACY_STARTER_POOL_UT = Object.freeze([...JUGADORES_BASE,...recruits.map(recruitCard)]);
const goldIds=new Set(['p24','p32','p46','p55','p59']);
const silverIds=new Set(['p1','p12','p25','p2','p13','p29','p5','p21','p35','p4','p14','p38','p6','p19','p45','p7','p15','p49','p8','p52','p10','p9','p16','p18']);
const countries=['PE','AR','UY','BO','CO','BR','ES','PY','EN','EC','VE','IT','FR','US','CA','FO','VA','RU','JP','SM'];
export const STARTER_POOL_UT = Object.freeze(LEGACY_STARTER_POOL_UT.map((player,index)=>{
  const color=player.id==='p67'?'plus':goldIds.has(player.id)?'oro':silverIds.has(player.id)?'plata':'bronce';
  const [minimum,variation,ceiling]={bronce:[54,10,73],plata:[67,8,83],oro:[78,7,92],plus:[89,1,96]}[color];
  const target=minimum+index%variation;
  const offsets=archetypes[player.pos];
  const adjustment=offsets.reduce((sum,value,key)=>sum+value*weights[player.pos][key],0);
  const values=offsets.map((offset,key)=>Math.max(10,Math.min(ceiling,Math.round(target-adjustment+offset+((index+key*2)%3)-1))));
  const keys=player.pos==='GK'?['gk_div','gk_han','gk_kic','gk_ref','gk_spd','gk_pos']:['pac','sho','pas','dri','def','phy'];
  return Object.freeze({id:player.id,nombre:player.nombre,pos:player.pos,
    grl:Math.round(values.reduce((sum,value,key)=>sum+value*weights[player.pos][key],0)),
    ...Object.fromEntries(keys.map((key,keyIndex)=>[key,values[keyIndex]])),color,
    nacionalidad:countries[index%countries.length],pais_codigo:countries[index%countries.length],
  });
}));
