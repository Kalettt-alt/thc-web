import { memo } from 'react';
import { BOUND_LEFT, BOUND_RIGHT, BOUND_TOP, BOUND_BOT } from './ConstantesJuego.js';

function MatchMinimap({ players, ball, camera, viewport }) {
  const width = BOUND_RIGHT - BOUND_LEFT;
  const height = BOUND_BOT - BOUND_TOP;
  const x = value => (value - BOUND_LEFT) / width * 70;
  const y = value => (value - BOUND_TOP) / height * 100;
  return <svg viewBox="-2 -2 74 104" className="df-minimap" aria-label="Mapa del partido">
    <defs><clipPath id="df-minimap-field"><rect width="70" height="100" /></clipPath></defs>
    <rect width="70" height="100" fill="#222222" stroke="#c7773d" strokeWidth=".7" />
    <path d="M0 50H70M23 0V12H47V0M23 100V88H47V100" fill="none" stroke="#787878" strokeWidth=".5" />
    <circle cx="35" cy="50" r="8" fill="none" stroke="#787878" strokeWidth=".5" />
    <g clipPath="url(#df-minimap-field)">
      <rect x={x(camera.x - viewport.width / viewport.zoom / 2)} y={y(camera.y - viewport.height / viewport.zoom / 2)} width={viewport.width / viewport.zoom / width * 70} height={viewport.height / viewport.zoom / height * 100} fill="#f47a2018" stroke="#f47a20" strokeWidth=".8" />
      {players.map(player => <circle key={player.id} cx={x(player.x)} cy={y(player.y)} r="1.65" fill={player.isUser ? '#f47a20' : '#bababa'} />)}
      <circle cx={x(ball.x)} cy={y(ball.y)} r="1.8" fill="#ff9b54" stroke="#111" strokeWidth=".6" />
    </g>
  </svg>;
}

export default memo(MatchMinimap);
