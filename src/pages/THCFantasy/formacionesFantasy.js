export const FORMACIONES = {
  '4-3-3 OFENSIVO': [
    { id: 'gk', pos: 'POR', top: '89%', left: '50%' },
    { id: 'li', pos: 'LI', top: '68%', left: '12%' },
    { id: 'dfc1', pos: 'DFC', top: '68%', left: '37%' },
    { id: 'dfc2', pos: 'DFC', top: '68%', left: '63%' },
    { id: 'ld', pos: 'LD', top: '68%', left: '88%' },
    { id: 'mc1', pos: 'MC', top: '44%', left: '25%' },
    { id: 'mco', pos: 'MCO', top: '37%', left: '50%' },
    { id: 'mc2', pos: 'MC', top: '44%', left: '75%' },
    { id: 'ei', pos: 'EI', top: '15%', left: '25%' },
    { id: 'dc', pos: 'DC', top: '13%', left: '50%' },
    { id: 'ed', pos: 'ED', top: '15%', left: '75%' }
  ],
  '4-4-2 CLÁSICO': [
    { id: 'gk', pos: 'POR', top: '89%', left: '50%' },
    { id: 'li', pos: 'LI', top: '68%', left: '12%' },
    { id: 'dfc1', pos: 'DFC', top: '68%', left: '37%' },
    { id: 'dfc2', pos: 'DFC', top: '68%', left: '63%' },
    { id: 'ld', pos: 'LD', top: '68%', left: '88%' },
    { id: 'mi', pos: 'MI', top: '43%', left: '12%' },
    { id: 'mc1', pos: 'MC', top: '43%', left: '37%' },
    { id: 'mc2', pos: 'MC', top: '43%', left: '63%' },
    { id: 'md', pos: 'MD', top: '43%', left: '88%' },
    { id: 'dc1', pos: 'DC', top: '16%', left: '35%' },
    { id: 'dc2', pos: 'DC', top: '16%', left: '65%' }
  ],
  '3-5-2 POSESIÓN': [
    { id: 'gk', pos: 'POR', top: '89%', left: '50%' },
    { id: 'dfc1', pos: 'DFC', top: '71%', left: '22%' },
    { id: 'dfc2', pos: 'DFC', top: '71%', left: '50%' },
    { id: 'dfc3', pos: 'DFC', top: '71%', left: '78%' },
    { id: 'mcd', pos: 'MCD', top: '53%', left: '50%' },
    { id: 'mi', pos: 'MI', top: '33%', left: '12%' },
    { id: 'mc1', pos: 'MC', top: '33%', left: '37%' },
    { id: 'mc2', pos: 'MC', top: '33%', left: '63%' },
    { id: 'md', pos: 'MD', top: '33%', left: '88%' },
    { id: 'dc1', pos: 'DC', top: '13%', left: '35%' },
    { id: 'dc2', pos: 'DC', top: '13%', left: '65%' }
  ],
  '3-4-3 TOTAL': [
    { id: 'gk', pos: 'POR', top: '89%', left: '50%' },
    { id: 'dfc1', pos: 'DFC', top: '70%', left: '22%' },
    { id: 'dfc2', pos: 'DFC', top: '70%', left: '50%' },
    { id: 'dfc3', pos: 'DFC', top: '70%', left: '78%' },
    { id: 'mi', pos: 'MI', top: '44%', left: '12%' },
    { id: 'mc1', pos: 'MC', top: '44%', left: '37%' },
    { id: 'mc2', pos: 'MC', top: '44%', left: '63%' },
    { id: 'md', pos: 'MD', top: '44%', left: '88%' },
    { id: 'ei', pos: 'EI', top: '17%', left: '22%' },
    { id: 'dc', pos: 'DC', top: '15%', left: '50%' },
    { id: 'ed', pos: 'ED', top: '17%', left: '78%' }
  ]
};

export const normalizarPos = (pos) => {
  if (!pos) return 'MED';
  const p = pos.toUpperCase();
  if (['POR', 'GK'].includes(p)) return 'POR';
  if (['DEF', 'DFC', 'LI', 'LD', 'CB', 'LB', 'RB'].includes(p)) return 'DEF';
  if (['MID', 'MC', 'MCD', 'MCO', 'MI', 'MD', 'CM', 'CAM', 'CDM'].includes(p)) return 'MED';
  if (['DEL', 'DC', 'EI', 'ED', 'SA', 'ST', 'LW', 'RW', 'CF'].includes(p)) return 'DEL';
  return 'MED';
};

export const calcGrlEfectivo = (player, slotPos) => {
  if (!player) return 0;
  const pNat = normalizarPos(player.pos);
  const sEsp = normalizarPos(slotPos);

  if (pNat === sEsp) return player.grl;
  if (pNat === 'POR' || sEsp === 'POR') return Math.round(player.grl * 0.1);
  return Math.round(player.grl * 0.85);
};

