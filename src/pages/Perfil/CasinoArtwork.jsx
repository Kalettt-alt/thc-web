const COLORS = ['#C64233', '#2348A5', '#DCAE37', '#56816B', '#AFB5A0', '#B06D3E'];

function Mosaic() {
  const tiles = [];
  for (let row = 0; row < 8; row++) {
    for (let column = 0; column < 20; column++) {
      if (row > 2 && row < 5 && column > 2 && column < 17) continue;
      const color = COLORS[(row * 7 + column * 3 + (column % 4)) % COLORS.length];
      tiles.push(<rect key={`${row}-${column}`} x={column * 17} y={row * 14} width="15" height="12" fill={color} stroke="#10231C" strokeWidth=".7" />);
    }
  }
  return <g transform="translate(313 18)">{tiles}<rect x="52" y="42" width="234" height="28" fill="#244638" /><path d="M2 2H337V109H2Z" fill="none" stroke="#EEDCAF" strokeOpacity=".35" /></g>;
}

function PlayingCards() {
  return <g transform="translate(765 17)"><rect width="160" height="113" fill="#C64233" /><rect width="80" height="113" fill="#DCAE37" /><circle cx="126" cy="26" r="15" fill="#12251E" stroke="#F3E6C6" strokeWidth="5" /><g transform="translate(31 56) rotate(-18)"><rect width="48" height="66" fill="#21483B" stroke="#F3E6C6" strokeWidth="3" /><path d="M16 17L23 8L31 17L23 27Z" fill="#C64233" /><path d="M9 46H36M9 52H36" stroke="#DCAE37" strokeWidth="5" /></g><g transform="translate(75 42) rotate(15)"><rect width="48" height="66" fill="#F3E6C6" stroke="#12251E" strokeWidth="3" /><path d="M16 28C0 17 16 6 24 17C32 6 48 17 24 37Z" transform="translate(-3 -2) scale(.82)" fill="#C64233" /><path d="M9 46H36M9 52H36" stroke="#2348A5" strokeWidth="5" /></g><path d="M3 113L26 84L51 84L71 113M90 113L116 86L139 86L157 113" fill="#385D47" stroke="#10231C" strokeWidth="2" /></g>;
}

function Roulette() {
  const sectors = Array.from({ length: 13 }, (_, index) => {
    const angle = Math.PI + index * Math.PI / 13;
    const next = angle + Math.PI / 13 - .017;
    const point = (radius, at) => `${160 + Math.cos(at) * radius},${164 + Math.sin(at) * radius}`;
    return <path key={index} d={`M${point(148, angle)} A148 148 0 0 1 ${point(148, next)} L${point(103, next)} A103 103 0 0 0 ${point(103, angle)} Z`} fill={index % 2 ? '#2348A5' : '#C64233'} stroke="#F3E6C6" strokeWidth="2" />;
  });
  return <svg viewBox="0 0 320 180" className="casino-roulette-illustration" aria-hidden="true"><path d="M4 169A156 156 0 0 1 316 169" fill="#142A20" stroke="#DCAE37" strokeWidth="4" />{sectors}<path d="M69 167A91 91 0 0 1 251 167" fill="#0F211A" stroke="#69846D" strokeWidth="14" /><circle cx="159" cy="117" r="8" fill="#F3E6C6" /><path d="M155 49H165V105H155Z" fill="#DCAE37" /><circle cx="160" cy="42" r="12" fill="#C64233" stroke="#F3E6C6" strokeWidth="3" /><path d="M39 173H281" stroke="#F3E6C6" strokeWidth="3" /></svg>;
}

export default function CasinoArtwork({ variant = 'mosaic' }) {
  if (variant === 'roulette') return <div className="casino-roulette-art" aria-hidden="true"><Roulette /></div>;
  return <div className="casino-poster-art" aria-hidden="true"><svg viewBox="0 0 960 150" preserveAspectRatio="xMidYMid meet"><rect x="2" y="2" width="956" height="146" fill="#0C1C16" stroke="#F3E6C6" strokeWidth="3" /><path d="M3 138H309V3H3Z" fill="#1B3427" /><path d="M3 4H309L3 138Z" fill="#DCAE37" fillOpacity=".1" /><g transform="translate(67 47)"><rect x="1" y="1" width="33" height="54" fill="#2348A5" stroke="#F3E6C6" strokeWidth="2" /><rect x="36" y="1" width="33" height="54" fill="#C64233" stroke="#F3E6C6" strokeWidth="2" /><rect x="71" y="1" width="33" height="54" fill="#F3E6C6" /><path d="M87 13L98 27L87 42L76 27Z" fill="#C64233" /><path d="M14 18C4 11 9 3 17 9C25 3 31 11 17 22Z" transform="translate(0 8)" fill="#10231C" /><path d="M47 29C42 22 44 16 51 20C54 12 64 21 57 27C64 30 57 37 53 31L55 40H47L49 31Z" fill="#10231C" /></g><Mosaic /><PlayingCards /><path d="M2 145H958" stroke="#DCAE37" strokeWidth="4" /></svg></div>;
}
