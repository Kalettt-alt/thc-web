export const FORMATIONS = {
  '4-3-3': [ { pos: 'POR', y: 90, x: 50 }, { pos: 'LD', y: 72, x: 85 }, { pos: 'DFC', y: 78, x: 65 }, { pos: 'DFC', y: 78, x: 35 }, { pos: 'LI', y: 72, x: 15 }, { pos: 'MC', y: 48, x: 80 }, { pos: 'MC', y: 55, x: 50 }, { pos: 'MC', y: 48, x: 20 }, { pos: 'ED', y: 22, x: 80 }, { pos: 'DC', y: 15, x: 50 }, { pos: 'EI', y: 22, x: 20 } ],
  '4-4-2': [ { pos: 'POR', y: 90, x: 50 }, { pos: 'LD', y: 72, x: 85 }, { pos: 'DFC', y: 78, x: 65 }, { pos: 'DFC', y: 78, x: 35 }, { pos: 'LI', y: 72, x: 15 }, { pos: 'MD', y: 45, x: 85 }, { pos: 'MC', y: 45, x: 65 }, { pos: 'MC', y: 45, x: 35 }, { pos: 'MI', y: 45, x: 15 }, { pos: 'DC', y: 20, x: 65 }, { pos: 'DC', y: 20, x: 35 } ],
  '4-2-3-1': [ { pos: 'POR', y: 90, x: 50 }, { pos: 'LD', y: 75, x: 85 }, { pos: 'DFC', y: 80, x: 65 }, { pos: 'DFC', y: 80, x: 35 }, { pos: 'LI', y: 75, x: 15 }, { pos: 'MCD', y: 60, x: 65 }, { pos: 'MCD', y: 60, x: 35 }, { pos: 'MD', y: 38, x: 85 }, { pos: 'MCO', y: 35, x: 50 }, { pos: 'MI', y: 38, x: 15 }, { pos: 'DC', y: 15, x: 50 } ],
  '3-4-3': [ { pos: 'POR', y: 90, x: 50 }, { pos: 'DFC', y: 78, x: 80 }, { pos: 'DFC', y: 80, x: 50 }, { pos: 'DFC', y: 78, x: 20 }, { pos: 'MD', y: 48, x: 85 }, { pos: 'MC', y: 52, x: 65 }, { pos: 'MC', y: 52, x: 35 }, { pos: 'MI', y: 48, x: 15 }, { pos: 'ED', y: 22, x: 80 }, { pos: 'DC', y: 15, x: 50 }, { pos: 'EI', y: 22, x: 20 } ],
  '5-3-2': [ { pos: 'POR', y: 90, x: 50 }, { pos: 'CAD', y: 65, x: 90 }, { pos: 'DFC', y: 78, x: 70 }, { pos: 'DFC', y: 80, x: 50 }, { pos: 'DFC', y: 78, x: 30 }, { pos: 'CAI', y: 65, x: 10 }, { pos: 'MC', y: 45, x: 75 }, { pos: 'MC', y: 45, x: 50 }, { pos: 'MC', y: 45, x: 25 }, { pos: 'DC', y: 20, x: 65 }, { pos: 'DC', y: 20, x: 35 } ],
  '3-4-2-1': [ { pos: 'POR', y: 90, x: 50 }, { pos: 'DFC', y: 78, x: 80 }, { pos: 'DFC', y: 80, x: 50 }, { pos: 'DFC', y: 78, x: 20 }, { pos: 'MD', y: 52, x: 85 }, { pos: 'MC', y: 58, x: 65 }, { pos: 'MC', y: 58, x: 35 }, { pos: 'MI', y: 52, x: 15 }, { pos: 'MCO', y: 35, x: 70 }, { pos: 'MCO', y: 35, x: 30 }, { pos: 'DC', y: 15, x: 50 } ],
  '4-1-4-1': [ { pos: 'POR', y: 90, x: 50 }, { pos: 'LD', y: 72, x: 85 }, { pos: 'DFC', y: 78, x: 65 }, { pos: 'DFC', y: 78, x: 35 }, { pos: 'LI', y: 72, x: 15 }, { pos: 'MCD', y: 60, x: 50 }, { pos: 'MD', y: 40, x: 85 }, { pos: 'MC', y: 42, x: 65 }, { pos: 'MC', y: 42, x: 35 }, { pos: 'MI', y: 40, x: 15 }, { pos: 'DC', y: 18, x: 50 } ]
};

export const getEffectiveGrl = (playerPos, targetPos, baseGrl) => {
  if (!playerPos || !targetPos) return baseGrl;
  if (playerPos === targetPos) return baseGrl;
  
  if (targetPos === 'POR' || playerPos === 'POR') return Math.max(40, baseGrl - 30);

  const isCenterMid = ['MCD', 'MC', 'MCO'].includes(playerPos) && ['MCD', 'MC', 'MCO'].includes(targetPos);
  if (isCenterMid) return baseGrl;

  const isWide = ['MI', 'MD', 'ED', 'EI', 'EXT'].includes(playerPos) && ['MI', 'MD', 'ED', 'EI', 'EXT'].includes(targetPos);
  if (isWide) return baseGrl - 1;

  const isFullBack = ['LI', 'LD', 'CAI', 'CAD'].includes(playerPos) && ['LI', 'LD', 'CAI', 'CAD'].includes(targetPos);
  if (isFullBack) return baseGrl - 1;

  const isCenterBack = ['DFC', 'LIB'].includes(playerPos) && ['DFC'].includes(targetPos);
  if (isCenterBack) return baseGrl;

  const isStriker = ['DC', 'SP', 'EXT'].includes(playerPos) && ['DC', 'SP', 'EXT'].includes(targetPos);
  if (isStriker) return baseGrl - 1;

  const groups = { DEF: ['DFC', 'LD', 'LI', 'CAD', 'CAI'], MED: ['MCD', 'MC', 'MCO', 'MD', 'MI'], ATA: ['DC', 'ED', 'EI', 'SP', 'EXT'] };
  let pG = Object.keys(groups).find(k => groups[k].includes(playerPos)) || 'MED';
  let tG = Object.keys(groups).find(k => groups[k].includes(targetPos)) || 'MED';
  
  if (pG === tG) return baseGrl - 3; 
  if ((pG === 'DEF' && tG === 'MED') || (pG === 'MED' && tG === 'DEF')) return baseGrl - 6;
  if ((pG === 'MED' && tG === 'ATA') || (pG === 'ATA' && tG === 'MED')) return baseGrl - 6;
  
  return baseGrl - 12;
};

