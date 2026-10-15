// Fondo vectorial local: no necesita cargar vídeos ni texturas para arrancar.
export function FantasyStadium({ id, className = '' }) {
  return <div className={`df-stadium-art ${className}`} aria-hidden="true">
    <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id={`${id}-sky`} x2="0" y2="1"><stop stopColor="#06080b" /><stop offset="1" stopColor="#28201c" /></linearGradient>
        <linearGradient id={`${id}-field`} x2="0" y2="1"><stop stopColor="#17191b" /><stop offset="1" stopColor="#292320" /></linearGradient>
        <radialGradient id={`${id}-glow`}><stop stopColor="#ff9a48" stopOpacity=".56" /><stop offset="1" stopColor="#ff8017" stopOpacity="0" /></radialGradient>
        <pattern id={`${id}-seats`} width="30" height="22" patternUnits="userSpaceOnUse"><rect x="2" y="3" width="20" height="7" rx="2" fill="#4c3a2b" /><rect x="7" y="15" width="20" height="3" fill="#9e5d30" opacity=".5" /></pattern>
      </defs>
      <rect width="1600" height="900" fill={`url(#${id}-sky)`} />
      <ellipse cx="810" cy="438" rx="1010" ry="276" fill="#101214" stroke="#363230" strokeWidth="11" />
      <ellipse cx="810" cy="420" rx="988" ry="238" fill={`url(#${id}-seats)`} />
      <ellipse cx="810" cy="470" rx="1000" ry="116" fill="#0d0e10" />
      {[0, 1, 2].map(index => <path key={index} d={`M-50 ${344 + index * 52}Q800 ${130 + index * 85} 1650 ${344 + index * 52}`} fill="none" stroke={index === 1 ? '#dd731e' : '#55504a'} strokeWidth={index === 1 ? 4 : 7} opacity={index === 1 ? .65 : .3} />)}
      <path d="M-20 468Q800 351 1620 468" stroke="#ff8017" strokeWidth="13" fill="none" opacity=".8" />
      <path d="M265 465L1335 465L1870 970L-280 970Z" fill={`url(#${id}-field)`} />
      {Array.from({ length: 9 }, (_, index) => <path key={index} d={`M${290 + index * 119} 465L${-190 + index * 238} 950`} stroke="#65605b" strokeWidth="100" opacity={index % 2 ? .03 : .11} />)}
      <g stroke="#cc8b5f" fill="none" strokeWidth="3" opacity=".45">
        <path d="M301 489L1299 489L1630 856L-30 856ZM180 624H1420M800 489V856" /><ellipse cx="800" cy="638" rx="133" ry="46" /><path d="M569 489L552 558H1048L1031 489M417 856L478 737H1122L1183 856M665 489L656 513H944L935 489M628 856L647 805H953L972 856" />
      </g>
      <path d="M667 485V440H933V485" stroke="#bfb7ae" strokeWidth="4" fill="none" opacity=".65" />
      <path d="M0 191L188 108L178 344M1600 191L1412 108L1422 344" stroke="#44403c" strokeWidth="12" fill="none" />
      <g fill="#f9aa6b">{Array.from({ length: 11 }, (_, i) => <g key={i}><rect x={32 + i * 14} y={139 - i * 5} width="10" height="8" /><rect x={1558 - i * 14} y={139 - i * 5} width="10" height="8" /></g>)}</g>
      <ellipse className="df-stadium-light df-stadium-light-left" cx="90" cy="135" rx="720" ry="580" fill={`url(#${id}-glow)`} />
      <ellipse className="df-stadium-light df-stadium-light-right" cx="1510" cy="135" rx="720" ry="580" fill={`url(#${id}-glow)`} />
      <path d="M51 125L620 900H950L132 119ZM1468 119L650 900H980L1549 125Z" fill="#ff9b48" opacity=".045" />
    </svg>
    <div className="df-stadium-haze" />
    <div className="df-stadium-sparks">{Array.from({ length: 12 }, (_, index) => <i key={index} style={{ '--i': index }} />)}</div>
  </div>;
}

export function FantasyCoach({ className = '' }) {
  return <div className={`df-cinema-coach ${className}`} aria-hidden="true">
    <i className="df-cinema-coach-head" /><i className="df-cinema-coach-neck" />
    <span className="df-cinema-coach-body"><i /><b /></span>
    <span className="df-cinema-coach-arm"><i /></span>
    <span className="df-cinema-coach-arm df-cinema-coach-arm-back"><i /></span>
  </div>;
}
