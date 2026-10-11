import { memo } from 'react';

function JugadorDF({ p, isOwner, phase, size = 112 }) {
  const isTurn = isOwner && phase === 'WAITING_USER_INPUT';
  return (
    <div className={`df-player ${isTurn ? 'df-player--turn' : ''}`} style={{ top: p.y, left: p.x, width: size, height: size, '--player-kit': p.color, '--player-ring': p.isUser ? '#f3e9d6' : '#a2afad', '--player-stroke': `${size * 0.055}px` }}>
      <div className="df-player__disc">
        <span className="df-player__number" style={{ fontSize: size * 0.35 }}>{p.isGK ? '1' : p.number || p.grl}</span>
        <span className="df-player__shine" />
      </div>
      {isOwner && <span className="df-player__name" style={{ fontSize: size * 0.34, padding: `${size * 0.09}px ${size * 0.24}px` }}>{p.name.split(' ').pop()}</span>}
    </div>
  );
}

export default memo(JugadorDF);
