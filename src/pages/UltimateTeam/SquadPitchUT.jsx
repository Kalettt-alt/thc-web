import { useId } from 'react';

export default function SquadPitchUT({ className = '', warm = false }) {
  const shadeId = useId();
  return <svg className={`ut-pitch-lines ${className}`} viewBox="0 0 1000 640" preserveAspectRatio="none" aria-hidden="true">
    <defs><linearGradient id={shadeId} x1="0" y1="0" x2="0" y2="1"><stop stopColor={warm ? '#35200f' : '#1d222b'}/><stop offset="1" stopColor={warm ? '#17110c' : '#12161d'}/></linearGradient></defs>
    <path d="M270 12H730L950 622H50Z" fill={`url(#${shadeId})`}/>
    <g fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M270 12H730L950 622H50ZM160 317H840M398 12L381 88H619L602 12M455 12L450 43H550L545 12M285 622L332 457H668L715 622M403 622L419 552H581L597 622"/>
      <ellipse cx="500" cy="317" rx="99" ry="52"/><path d="M441 457C441 419 559 419 559 457M457 88C457 119 543 119 543 88"/>
    </g><g fill="currentColor"><circle cx="500" cy="317" r="4"/><circle cx="500" cy="520" r="4"/><circle cx="500" cy="63" r="3"/></g>
    <text x="165" y="595" fill="currentColor" fontSize="24" fontWeight="900" fontStyle="italic">THC: UT</text><text x="730" y="595" fill="currentColor" fontSize="24" fontWeight="900" fontStyle="italic">THC: UT</text>
  </svg>;
}
