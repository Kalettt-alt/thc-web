import { memo, useId } from 'react';
import logoTHC from '../Reglamento/LogoTHC.png';
import { PITCH_W, PITCH_H, BOUND_LEFT, BOUND_RIGHT, BOUND_TOP, BOUND_BOT, GOAL_X_MIN, GOAL_X_MAX, GOAL_Y_TOP, GOAL_Y_BOT } from './ConstantesJuego.js';

function CanchaDF({ detailed = true }) {
  const uid = useId().replaceAll(':', '');
  const width = BOUND_RIGHT - BOUND_LEFT;
  const goalWidth = GOAL_X_MAX - GOAL_X_MIN;
  const ref = name => `url(#${uid}-${name})`;
  if (!detailed) return <svg aria-hidden="true" viewBox="-1400 -1000 8800 11000" className="df-stadium df-stadium--basic" fill="none">
    <rect x="-1400" y="-1000" width="8800" height="11000" fill="#0b0b0b" />
    <rect width={PITCH_W} height={PITCH_H} fill="#222222" />
    <g stroke="#ce773e" strokeWidth="16">
      <rect x={BOUND_LEFT} y={BOUND_TOP} width={width} height={BOUND_BOT - BOUND_TOP} />
      <line x1={BOUND_LEFT} y1={PITCH_H / 2} x2={BOUND_RIGHT} y2={PITCH_H / 2} />
      <circle cx={PITCH_W / 2} cy={PITCH_H / 2} r="650" />
      <circle cx={PITCH_W / 2} cy={PITCH_H / 2} r="22" fill="#ce773e" />
      {[GOAL_Y_TOP, GOAL_Y_BOT].map((goalY, index) => <g key={goalY}>
        <rect x="1550" y={index === 0 ? goalY : goalY - 1250} width="2900" height="1250" />
        <rect x="2050" y={index === 0 ? goalY : goalY - 450} width="1900" height="450" />
        <rect x={GOAL_X_MIN} y={index === 0 ? goalY - 230 : goalY} width={goalWidth} height="230" />
        <circle cx={GOAL_X_MIN} cy={goalY} r="24" fill="#ff9b54" stroke="#686868" strokeWidth="8" />
        <circle cx={GOAL_X_MAX} cy={goalY} r="24" fill="#ff9b54" stroke="#686868" strokeWidth="8" />
      </g>)}
    </g>
  </svg>;
  return (
    <svg aria-hidden="true" viewBox="-1400 -1000 8800 11000" className="df-stadium" fill="none">
      <defs>
        <pattern id={`${uid}-seats`} width="98" height="98" patternUnits="userSpaceOnUse">
          <rect width="98" height="98" fill="#121315" />
          <rect x="15" y="18" width="22" height="30" rx="5" fill="#ab571f" />
          <rect x="61" y="18" width="22" height="30" rx="5" fill="#4b4239" />
          <rect x="15" y="67" width="22" height="20" rx="5" fill="#766553" />
          <rect x="61" y="67" width="22" height="20" rx="5" fill="#d59861" />
        </pattern>
        <pattern id={`${uid}-grass`} width="100" height="100" patternUnits="userSpaceOnUse">
          <path d="M12 18l4-6m39 30l3-8m25 52l4-8M20 78l3-9" stroke="#aaaaaa" opacity=".026" strokeWidth="4" />
        </pattern>
        <pattern id={`${uid}-net`} width="70" height="70" patternUnits="userSpaceOnUse">
          <path d="M0 0H70V70" stroke="#969696" opacity=".42" strokeWidth="7" />
        </pattern>
        <linearGradient id={`${uid}-turf`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#2b2b2b" /><stop offset=".5" stopColor="#222222" /><stop offset="1" stopColor="#181818" />
        </linearGradient>
        <radialGradient id={`${uid}-light`}><stop stopColor="#f47a20" stopOpacity=".6" /><stop offset="1" stopColor="#f47a20" stopOpacity="0" /></radialGradient>
        <radialGradient id={`${uid}-shadow`}><stop offset=".48" stopColor="#050505" stopOpacity="0" /><stop offset="1" stopColor="#050505" stopOpacity=".45" /></radialGradient>
      </defs>
      <path d="M-700-960H6700L7350-290V9290L6700 9960H-700L-1350 9290V-290Z" fill="#060707" stroke="#33302d" strokeWidth="65" />
      <path d="M-550-810H6550L7160-190V9190L6550 9810H-550L-1160 9190V-190Z" fill={ref('seats')} stroke="#27221d" strokeWidth="34" />
      <g stroke="#0a0a0a" strokeWidth="58">
        {[800, 1850, 3000, 4150, 5200].map(x => <path key={x} d={`M${x} -820V60M${x} 8940V9820`} />)}
        {[1200, 2550, 3900, 5250, 6600, 7950].map(y => <path key={y} d={`M-1170 ${y}H50M5950 ${y}H7170`} />)}
        <path d="M-1120-120L40 420M7120-120L5960 420M-1120 9120L40 8580M7120 9120L5960 8580" />
      </g>
      <rect x="-40" y="20" width="6080" height="8960" rx="180" fill="#131313" stroke="#3d3d3d" strokeWidth="65" />
      <rect x="95" y="145" width="5810" height="8710" rx="100" fill={ref('turf')} stroke="#f47a20" strokeOpacity=".65" strokeWidth="26" />
      <rect x={BOUND_LEFT} y={BOUND_TOP} width={width} height={BOUND_BOT - BOUND_TOP} fill={ref('turf')} />
      {Array.from({ length: 12 }, (_, i) => <rect key={i} x={BOUND_LEFT} y={BOUND_TOP + i * (BOUND_BOT - BOUND_TOP) / 12} width={width} height={(BOUND_BOT - BOUND_TOP) / 12} fill={i % 2 ? '#0a0a0a' : '#f47a20'} opacity={i % 2 ? '.09' : '.022'} />)}
      <rect x={BOUND_LEFT} y={BOUND_TOP} width={width} height={BOUND_BOT - BOUND_TOP} fill={ref('grass')} />
      <image href={logoTHC} x="2520" y="4020" width="960" height="960" opacity=".055" />
      <g stroke="#ce773e" strokeOpacity=".86" strokeWidth="16">
        <rect x={BOUND_LEFT} y={BOUND_TOP} width={width} height={BOUND_BOT - BOUND_TOP} />
        <line x1={BOUND_LEFT} y1={PITCH_H / 2} x2={BOUND_RIGHT} y2={PITCH_H / 2} />
        <circle cx={PITCH_W / 2} cy={PITCH_H / 2} r="650" />
        <circle cx={PITCH_W / 2} cy={PITCH_H / 2} r="22" fill="#ce773e" />
        {[GOAL_Y_TOP, GOAL_Y_BOT].map((goalY, index) => {
          const direction = index === 0 ? 1 : -1;
          return <g key={goalY}>
            <rect x="1550" y={index === 0 ? goalY : goalY - 1250} width="2900" height="1250" />
            <rect x="2050" y={index === 0 ? goalY : goalY - 450} width="1900" height="450" />
            <circle cx="3000" cy={goalY + direction * 900} r="20" fill="#ce773e" />
            <path d={`M 2410 ${goalY + direction * 1250} Q 3000 ${goalY + direction * 1710} 3590 ${goalY + direction * 1250}`} />
            <rect x={GOAL_X_MIN - 20} y={index === 0 ? goalY - 230 : goalY} width={goalWidth + 40} height="230" fill="#090909aa" stroke="#808080" strokeWidth="28" />
            <rect x={GOAL_X_MIN} y={index === 0 ? goalY - 230 : goalY} width={goalWidth} height="230" fill={ref('net')} stroke="none" />
            <line x1={GOAL_X_MIN} y1={goalY} x2={GOAL_X_MAX} y2={goalY} stroke="#ce773e" strokeWidth="30" />
            <circle cx={GOAL_X_MIN} cy={goalY} r="24" fill="#ff9b54" stroke="#686868" strokeWidth="8" />
            <circle cx={GOAL_X_MAX} cy={goalY} r="24" fill="#ff9b54" stroke="#686868" strokeWidth="8" />
          </g>;
        })}
        {[BOUND_LEFT, BOUND_RIGHT].flatMap((x, xi) => [BOUND_TOP, BOUND_BOT].map((y, yi) => <path key={`${x}-${y}`} d={`M${x + (xi ? -110 : 110)} ${y}A110 110 0 0 ${xi === yi ? 1 : 0} ${x} ${y + (yi ? -110 : 110)}`} />))}
      </g>
      <g fontFamily="Arial, sans-serif" fontSize="100" fontWeight="900" letterSpacing="12" textAnchor="middle">
        <rect x="1100" y="195" width="1450" height="130" fill="#080808" /><text x="1825" y="292" fill="#f47a20">THC FANTASY</text>
        <rect x="3460" y="195" width="1450" height="130" fill="#f47a20" /><text x="4185" y="292" fill="#111">MATCHDAY</text>
        <rect x="1700" y="8680" width="2600" height="140" fill="#090909" /><text x="3000" y="8785" fill="#f47a20">TRIBU HAXBALL COMMUNITY</text>
        <g transform="translate(275 4500) rotate(-90)"><rect x="-1350" y="-80" width="2700" height="145" fill="#0a0a0a" /><text y="28" fill="#b6b6b6">TU CLUB. TU IDENTIDAD.</text></g>
        <g transform="translate(5730 4500) rotate(90)"><rect x="-1300" y="-80" width="2600" height="145" fill="#f47a20" /><text y="28" fill="#111">EL PARTIDO ES TUYO</text></g>
      </g>
      <rect x="100" y="150" width="5800" height="8700" fill={ref('shadow')} />
      {[[-780, -420], [6780, -420], [-780, 9420], [6780, 9420]].map(([x, y]) => <g key={`${x}-${y}`}>
        <circle cx={x} cy={y} r="1300" fill={ref('light')} opacity=".32" />
        <rect x={x - 175} y={y - 35} width="350" height="70" rx="18" fill="#f47a20" />
        <rect x={x - 145} y={y - 18} width="290" height="36" fill="#ff9b54" />
      </g>)}
    </svg>
  );
}

export default memo(CanchaDF);
