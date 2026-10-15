import { useEffect, useRef } from 'react';
import { broadcastKitColors, broadcastScene } from './matchPresentationUT';

function drawPitch(context, width, height) {
  const x = width * .057, y = height * .088, w = width * .886, h = height * .824;
  context.fillStyle = '#122019'; context.fillRect(0, 0, width, height);
  for (let stripe = 0; stripe < 12; stripe++) {
    context.fillStyle = stripe % 2 ? '#29523a' : '#2d593f';
    context.fillRect(x + stripe * w / 12, y, w / 12 + 1, h);
  }
  const light = context.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, width * .65);
  light.addColorStop(0, '#a0d09612'); light.addColorStop(1, '#05150d66');
  context.fillStyle = light; context.fillRect(x, y, w, h);
  context.strokeStyle = '#e7efe0b3'; context.lineWidth = Math.max(1, width / 700);
  context.strokeRect(x, y, w, h);
  context.beginPath(); context.moveTo(width / 2, y); context.lineTo(width / 2, y + h); context.stroke();
  context.beginPath(); context.arc(width / 2, height / 2, h * .135, 0, Math.PI * 2); context.stroke();
  context.fillStyle = '#e7efe0c9'; context.beginPath(); context.arc(width / 2, height / 2, 2, 0, Math.PI * 2); context.fill();
  for (const right of [false, true]) {
    const goalX = right ? x + w : x;
    context.strokeRect(right ? goalX - w * .155 : goalX, y + h * .22, w * .155, h * .56);
    context.strokeRect(right ? goalX - w * .055 : goalX, y + h * .36, w * .055, h * .28);
    const spotX = right ? goalX - w * .115 : goalX + w * .115;
    context.beginPath(); context.arc(spotX, height / 2, 1.7, 0, Math.PI * 2); context.fill();
    context.beginPath(); context.arc(spotX, height / 2, h * .12, right ? Math.PI * .7 : Math.PI * -.3, right ? Math.PI * 1.3 : Math.PI * .3); context.stroke();
    const netX = right ? goalX : goalX - w * .025;
    context.fillStyle = '#dbe5d61b'; context.fillRect(netX, y + h * .408, w * .025, h * .184);
    context.strokeStyle = '#e7efe05a'; context.strokeRect(netX, y + h * .408, w * .025, h * .184);
    for (let step = 1; step < 6; step++) { context.beginPath(); context.moveTo(netX, y + h * (.408 + step * .184 / 6)); context.lineTo(netX + w * .025, y + h * (.408 + step * .184 / 6)); context.stroke(); }
    context.strokeStyle = '#e7efe0b3';
  }
  context.font = `italic 900 ${Math.round(height * .023)}px Arial`; context.textAlign = 'center';
  context.fillStyle = '#e9e0cb85'; context.fillText('THC  ·  ULTIMATE TEAM', width / 2, height * .052);
  context.fillStyle = '#d9803877'; context.fillText('TRUENO HAXBALL COMMUNITY', width / 2, height * .966);
  return { x, y, width: w, height: h };
}

export default function MatchPitchUT({ match, now, reduced = false }) {
  const canvas = useRef(null);
  const live = useRef({ match, now, reduced });
  useEffect(() => { live.current = { match, now, reduced }; }, [match, now, reduced]);
  useEffect(() => {
    const surface = canvas.current;
    const context = surface?.getContext('2d');
    if (!context) return undefined;
    let frame = 0, lastFrame = 0, dimensions = { width: 960, height: 540 }, previousBall = null;
    const positionCache = new Map();
    const resize = () => {
      const bounds = surface.getBoundingClientRect();
      dimensions = { width: bounds.width || 960, height: bounds.height || 540 };
      const scale = Math.min(window.devicePixelRatio || 1, 2);
      surface.width = Math.round(dimensions.width * scale); surface.height = Math.round(dimensions.height * scale);
      context.setTransform(scale, 0, 0, scale, 0, 0);
    };
    const observer = new ResizeObserver(resize); observer.observe(surface); resize();
    const draw = timestamp => {
      if (document.hidden) { frame = 0; return; }
      frame = requestAnimationFrame(draw);
      if (timestamp - lastFrame < 1000 / (live.current.reduced ? 8 : 40)) return;
      const step = Math.min((timestamp - lastFrame) / 1000 || .025, .15); lastFrame = timestamp;
      const state = live.current;
      const seconds = state.now.elapsed + (['first', 'second'].includes(state.now.phase) ? Math.min((Date.now() - state.now.observedAt) / 1000, .6) : 0);
      const scene = broadcastScene(state.match, seconds, state.now.phase);
      const { width, height } = dimensions;
      context.save();
      // Small broadcast drift keeps the full pitch readable while following play.
      if (!state.reduced && ['first', 'second'].includes(state.now.phase)) {
        const zoom = scene.finishing ? 1.028 : 1.012;
        context.translate(width / 2 + (.5 - scene.ball.x) * width * .012, height / 2);
        context.scale(zoom, zoom);
        context.translate(-width / 2, -height / 2);
      }
      const field = drawPitch(context, width, height);
      const scale = Math.max(3.5, Math.min(8, width / 105));
      const kits = { home: broadcastKitColors(state.match.home), away: broadcastKitColors(state.match.away, true) };
      // Avoid identical shirts while retaining each club's second colour.
      if (kits.home.primary.toLowerCase() === kits.away.primary.toLowerCase()) kits.away.primary = kits.away.secondary === kits.home.primary ? '#357add' : kits.away.secondary;
      if (scene.danger && ['first', 'second'].includes(state.now.phase)) {
        const attacker = scene.players.find(player => player.id === scene.highlight);
        const goalX = attacker?.facingRight ? field.x + field.width : field.x;
        const glow = context.createRadialGradient(goalX, height / 2, 0, goalX, height / 2, field.width * .2);
        glow.addColorStop(0, '#ff9b332b'); glow.addColorStop(1, '#ff9b3300');
        context.fillStyle = glow; context.fillRect(field.x, field.y, field.width, field.height);
      }
      for (const player of scene.players) {
        const target = { x: field.x + player.x * field.width, y: field.y + player.y * field.height };
        const previous = positionCache.get(player.id) || target;
        const ease = state.reduced ? 1 : 1 - Math.exp(-step * 8);
        const center = { x: previous.x + (target.x - previous.x) * ease, y: previous.y + (target.y - previous.y) * ease };
        positionCache.set(player.id, center);
        context.fillStyle = '#0005'; context.beginPath(); context.ellipse(center.x + 2, center.y + scale * .9, scale * 1.05, scale * .45, 0, 0, Math.PI * 2); context.fill();
        if (player.id === scene.highlight) { context.strokeStyle = scene.danger ? '#ffa64b' : '#f4e6af8a'; context.lineWidth = scene.danger ? 2 : 1; context.beginPath(); context.arc(center.x, center.y, scale + 3 + (scene.danger && !state.reduced ? Math.sin(seconds * 8) + 1 : 0), 0, Math.PI * 2); context.stroke(); }
        context.fillStyle = player.role === 'GK' ? player.side === 'home' ? '#b0d674' : '#d08ccc' : kits[player.side].primary;
        context.beginPath(); context.arc(center.x, center.y, scale, 0, Math.PI * 2); context.fill();
        context.strokeStyle = '#111b'; context.lineWidth = Math.max(1, scale * .2); context.stroke();
        context.fillStyle = player.role === 'GK' ? '#263626' : kits[player.side].secondary;
        context.fillRect(center.x - scale * .3, center.y - scale * .85, scale * .6, scale * 1.7);
        context.font = `bold ${Math.max(6, scale * 1.1)}px Arial`; context.textAlign = 'center'; context.textBaseline = 'middle';
        context.lineWidth = 2; context.strokeStyle = '#111b'; context.strokeText(String(player.number), center.x, center.y + .2); context.fillStyle = '#fff'; context.fillText(String(player.number), center.x, center.y + .2);
        if (player.id === scene.highlight && width > 540) {
          const label = player.name.length > 20 ? `${player.name.slice(0,19)}…` : player.name;
          context.font = `600 ${Math.round(scale * 1.35)}px Arial`; const labelWidth = context.measureText(label).width;
          context.fillStyle = '#101712de'; context.fillRect(center.x - labelWidth / 2 - 5, center.y + scale + 6, labelWidth + 10, scale * 2.4);
          context.fillStyle = '#f4efdf'; context.fillText(label, center.x, center.y + scale * 2.8);
        }
      }
      const ballTarget = { x: field.x + scene.ball.x * field.width, y: field.y + scene.ball.y * field.height };
      const ballEase = 1 - Math.exp(-step * (scene.finishing ? 24 : 16));
      previousBall ||= ballTarget;
      const ball = { x: previousBall.x + (ballTarget.x - previousBall.x) * ballEase, y: previousBall.y + (ballTarget.y - previousBall.y) * ballEase };
      context.strokeStyle = '#fff8'; context.lineWidth = scale * .35; context.beginPath(); context.moveTo(previousBall.x, previousBall.y); context.lineTo(ball.x, ball.y); context.stroke();
      previousBall = ball;
      context.fillStyle = '#0005'; context.beginPath(); context.ellipse(ball.x, ball.y + scale * .8, scale * .58, scale * .23, 0, 0, Math.PI * 2); context.fill();
      context.fillStyle = '#fffdf2'; context.strokeStyle = '#111'; context.lineWidth = 1; context.beginPath(); context.arc(ball.x, ball.y - scene.ball.height, scale * .5, 0, Math.PI * 2); context.fill(); context.stroke();
      context.fillStyle = '#34372e'; context.beginPath(); context.arc(ball.x + .4, ball.y - scene.ball.height, scale * .17, 0, Math.PI * 2); context.fill();
      context.restore();
    };
    const visibilityChanged = () => {
      if (document.hidden) { cancelAnimationFrame(frame); frame = 0; }
      else if (!frame) {
        // Resume at the current authoritative clock, without interpolating frames missed off screen.
        lastFrame = 0; previousBall = null; positionCache.clear();
        frame = requestAnimationFrame(draw);
      }
    };
    document.addEventListener('visibilitychange', visibilityChanged);
    if (!document.hidden) frame = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); document.removeEventListener('visibilitychange', visibilityChanged); positionCache.clear(); };
  }, []);
  return <canvas ref={canvas} className="ut-match__canvas" aria-label={`Vista horizontal del partido entre ${match.home.nombre} y ${match.away.nombre}. El marcador y las jugadas están disponibles debajo.`} />;
}
