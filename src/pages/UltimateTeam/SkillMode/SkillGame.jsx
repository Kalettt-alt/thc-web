import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Users, Eye, BrainCircuit, Copy, CheckCircle2 } from 'lucide-react';
import { HaxBot } from './BotAI';
import { readUtConfig } from '../utValidation'; 
import { SKILL_PHYSICS as HAX, clampPracticeCamera, getPracticeViewport } from './skillGeometry';

                                             
                                   
                                             

class Disc {
  constructor(x, y, rad, invMass, damp, bCoef, color) {
    this.x = x; this.y = y; this.vx = 0; this.vy = 0;
    this.rad = rad; this.invMass = invMass; this.damp = damp; this.bCoef = bCoef; this.color = color;
  }
  update() { this.x += this.vx; this.y += this.vy; this.vx *= this.damp; this.vy *= this.damp; }
  clone() {
    const c = new Disc(this.x, this.y, this.rad, this.invMass, this.damp, this.bCoef, this.color);
    c.vx = this.vx; c.vy = this.vy; return c;
  }
}

const POSTS = [
  new Disc(-HAX.BOUND_X, HAX.GOAL_Y, 6, 0, 1, 0.5, '#FFFFFF'), new Disc(-HAX.BOUND_X, -HAX.GOAL_Y, 6, 0, 1, 0.5, '#FFFFFF'),
  new Disc(HAX.BOUND_X, HAX.GOAL_Y, 6, 0, 1, 0.5, '#FFFFFF'), new Disc(HAX.BOUND_X, -HAX.GOAL_Y, 6, 0, 1, 0.5, '#FFFFFF')
];

function resolveCollision(d1, d2) {
  let dx = d2.x - d1.x; let dy = d2.y - d1.y; let dist = Math.sqrt(dx * dx + dy * dy);
  if (dist === 0) { dx = 0.01; dy = 0.01; dist = 0.014; }
  const minDist = d1.rad + d2.rad;
  if (dist < minDist) {
    const pen = minDist - dist; const nx = dx / dist, ny = dy / dist;
    const sumMass = d1.invMass + d2.invMass; if (sumMass === 0) return;
    d1.x -= nx * (pen * (d1.invMass / sumMass)); d2.x += nx * (pen * (d2.invMass / sumMass));
    const velAlongNormal = (d2.vx - d1.vx) * nx + (d2.vy - d1.vy) * ny;
    if (velAlongNormal > 0) return;
    const combinedBCoef = (d1.bCoef + d2.bCoef) / 2; 
    const j = -(1 + combinedBCoef) * velAlongNormal / sumMass;
    d1.vx -= nx * j * d1.invMass; d1.vy -= ny * j * d1.invMass;
    d2.vx += nx * j * d2.invMass; d2.vy += ny * j * d2.invMass;
  }
}

function applyPlayerPhysics(pDisc, pKeys) {
  const currentAccel = HAX.ACCEL; let dx = 0; let dy = 0;
  if (pKeys.w) dy -= 1; if (pKeys.s) dy += 1; if (pKeys.a) dx -= 1; if (pKeys.d) dx += 1;
  if (dx !== 0 || dy !== 0) { const len = Math.hypot(dx, dy); dx /= len; dy /= len; }
  pDisc.vx += dx * currentAccel; pDisc.vy += dy * currentAccel;
  const speed = Math.sqrt(pDisc.vx * pDisc.vx + pDisc.vy * pDisc.vy);
  if (speed > HAX.MAX_SPEED) { pDisc.vx = (pDisc.vx / speed) * HAX.MAX_SPEED; pDisc.vy = (pDisc.vy / speed) * HAX.MAX_SPEED; }
}

function checkKick(pDisc, ball, pKeys, hasKickedObj, team, trackRef, tick) {
  const KICK_RADIUS = pDisc.rad + ball.rad + 4; 
  if (pKeys.kick && !hasKickedObj.kicked) {
    let dx = ball.x - pDisc.x, dy = ball.y - pDisc.y; let dist = Math.sqrt(dx * dx + dy * dy);
    if (dist === 0) { dx = 1; dy = 0; dist = 1; }
    if (dist < KICK_RADIUS) {
      ball.vx += (dx / dist) * HAX.KICK_FORCE; ball.vy += (dy / dist) * HAX.KICK_FORCE;
      hasKickedObj.kicked = true; 
      if (trackRef.status === 'recording' && trackRef.data.kicks.length < 150) {
        trackRef.data.kicks.push({ team, t: tick, px: Math.round(pDisc.x), py: Math.round(pDisc.y), bx: Math.round(ball.x), by: Math.round(ball.y) });
      }
    }
  }
}

function enforceBoundaries(pDisc) {
  const extX = HAX.BOUND_X + 250; const extY = HAX.BOUND_Y + 250;
  if (pDisc.x - pDisc.rad < -extX) { pDisc.x = -extX + pDisc.rad; pDisc.vx *= -0.1; }
  if (pDisc.x + pDisc.rad > extX) { pDisc.x = extX - pDisc.rad; pDisc.vx *= -0.1; }
  if (pDisc.y - pDisc.rad < -extY) { pDisc.y = -extY + pDisc.rad; pDisc.vy *= -0.1; }
  if (pDisc.y + pDisc.rad > extY) { pDisc.y = extY - pDisc.rad; pDisc.vy *= -0.1; }
}

function enforceKickoffBarrier(pDisc, team, kickoffTeam) {
  if (team !== kickoffTeam) {
    if (team === 'blue' && pDisc.x - pDisc.rad < 0) { pDisc.x = pDisc.rad; pDisc.vx *= -0.1; }
    if (team === 'red' && pDisc.x + pDisc.rad > 0) { pDisc.x = -pDisc.rad; pDisc.vx *= -0.1; }
    const distCentro = Math.sqrt(pDisc.x * pDisc.x + pDisc.y * pDisc.y);
    if (distCentro < 150 + pDisc.rad) {
      const nx = pDisc.x / distCentro, ny = pDisc.y / distCentro;
      pDisc.x = nx * (150 + pDisc.rad); pDisc.y = ny * (150 + pDisc.rad);
      pDisc.vx *= 0.5; pDisc.vy *= 0.5;
    }
  }
}

function simulateTick(state, trackRef, tick, isExtrapolating = false) {
  const { player, bot, ball, keys, botKeys, match } = state;

  if (!isExtrapolating) {
    if (match.state === 'kickoff' && (ball.x !== 0 || ball.y !== 0)) match.state = 'playing';
    if (match.state === 'playing') match.time += 1 / HAX.FPS;
    if (match.state === 'goal_scored') {
      match.goalTimer--;
      if (match.goalTimer <= 0) {
        ball.x = 0; ball.y = 0; ball.vx = 0; ball.vy = 0;
        player.vx = 0; player.vy = 0; bot.vx = 0; bot.vy = 0;
        if (state.myTeam === 'red') { player.x = -200; player.y = 0; bot.x = 200; bot.y = 0; }
        else if (state.myTeam === 'blue') { player.x = 200; player.y = 0; bot.x = -200; bot.y = 0; }
        match.state = 'kickoff';
      }
    }
  }

  if (match.state !== 'goal_scored') {
    if (state.myTeam !== 'spect') {
      applyPlayerPhysics(player, keys);
      if (match.state === 'kickoff') enforceKickoffBarrier(player, state.myTeam, match.kickoffTeam);
      const pKickObj = { kicked: state.hasKicked };
      checkKick(player, ball, keys, pKickObj, 'user', trackRef, tick);
      state.hasKicked = pKickObj.kicked;
    }
    applyPlayerPhysics(bot, botKeys);
    if (match.state === 'kickoff') enforceKickoffBarrier(bot, state.botTeam, match.kickoffTeam);
    const bKickObj = { kicked: state.botHasKicked };
    checkKick(bot, ball, botKeys, bKickObj, 'bot', trackRef, tick);
    state.botHasKicked = bKickObj.kicked;
  }

  enforceBoundaries(player); enforceBoundaries(bot);

  let bounced = false;
  if (ball.y - ball.rad < -HAX.BOUND_Y) { ball.y = -HAX.BOUND_Y + ball.rad; ball.vy *= -HAX.BALL_BCOEF; bounced = true; }
  if (ball.y + ball.rad > HAX.BOUND_Y) { ball.y = HAX.BOUND_Y - ball.rad; ball.vy *= -HAX.BALL_BCOEF; bounced = true; }
  if (ball.x - ball.rad < -HAX.BOUND_X && Math.abs(ball.y) > HAX.GOAL_Y) { ball.x = -HAX.BOUND_X + ball.rad; ball.vx *= -HAX.BALL_BCOEF; bounced = true; }
  if (ball.x + ball.rad > HAX.BOUND_X && Math.abs(ball.y) > HAX.GOAL_Y) { ball.x = HAX.BOUND_X - ball.rad; ball.vx *= -HAX.BALL_BCOEF; bounced = true; }

  if (bounced && !isExtrapolating && trackRef.status === 'recording' && tick - trackRef.lastBounce > 15) {
    if (trackRef.data.bounces.length < 100) {
      trackRef.data.bounces.push({ t: tick, bx: Math.round(ball.x), by: Math.round(ball.y), px: Math.round(player.x), py: Math.round(player.y), botx: Math.round(bot.x), boty: Math.round(bot.y) });
    }
    trackRef.lastBounce = tick;
  }

  POSTS.forEach(post => { resolveCollision(ball, post); resolveCollision(bot, post); if (state.myTeam !== 'spect') resolveCollision(player, post); });
  if (state.myTeam !== 'spect') { resolveCollision(player, bot); resolveCollision(player, ball); }
  resolveCollision(bot, ball);
  
  player.update(); bot.update(); ball.update();

  if (!isExtrapolating && match.state !== 'goal_scored') {
    if (ball.x < -HAX.BOUND_X - 10 && Math.abs(ball.y) < HAX.GOAL_Y) { match.scoreBlue++; match.state = 'goal_scored'; match.kickoffTeam = 'red'; match.goalTimer = 180; } 
    else if (ball.x > HAX.BOUND_X + 10 && Math.abs(ball.y) < HAX.GOAL_Y) { match.scoreRed++; match.state = 'goal_scored'; match.kickoffTeam = 'blue'; match.goalTimer = 180; }
  }
}

const formatTime = (seconds) => {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

export default function SkillGame({ onVolver }) {
  const canvasRef = useRef(null);
  const canvasContainerRef = useRef(null);
  const viewportRef = useRef({ width: 1400, height: 700, pixelRatio: 1 });
  const chatInputRef = useRef(null);
  const botBrain = useRef(new HaxBot('blue'));
  
                                                
  const [savedConfig] = useState(readUtConfig);
  const initialExtra = savedConfig.extrapolation;
  const userConf = savedConfig;

  const trackRef = useRef({ status: 'idle', currentTick: 0, lastBounce: 0, data: { snapshots: [], kicks: [], bounces: [] } });
  const [recState, setRecState] = useState('idle');
  const [recTime, setRecTime] = useState(0);
  const [copied, setCopied] = useState(false);

  const extrapolationRef = useRef(initialExtra); 
  const [uiExtrapolation, setUiExtrapolation] = useState(initialExtra); 
  const [showTabMenu, setShowTabMenu] = useState(false);
  
  const [chatInput, setChatInput] = useState('');
  const [chatLog, setChatLog] = useState([
    `[Sistema] Ping Base compensado a ${initialExtra}ms.`,
    'TWC Training Map. Neural Tracking Listo 🧠',
  ]);
  const chatEndRef = useRef(null);
  
  const cameraMode = useRef(2); 
  const [uiCamera, setUiCamera] = useState(2);
  const [showChat, setShowChat] = useState(false);
  const smoothCamera = useRef({ x: 0, y: 0 });

  const serverState = useRef({
    myTeam: 'red', botTeam: 'blue',
    player: new Disc(-200, 0, HAX.PLAYER_RAD, 1 / HAX.PLAYER_MASS, HAX.PLAYER_DAMP, 0, '#E56E56'),
    bot: new Disc(200, 0, HAX.PLAYER_RAD, 1 / HAX.PLAYER_MASS, HAX.PLAYER_DAMP, 0, '#5689E5'),
    ball: new Disc(0, 0, HAX.BALL_RAD, 1 / HAX.BALL_MASS, HAX.BALL_DAMP, HAX.BALL_BCOEF, '#FFFFFF'),
    keys: { w: false, a: false, s: false, d: false, kick: false },
    botKeys: { w: false, a: false, s: false, d: false, kick: false },
    hasKicked: false, botHasKicked: false,
    match: { scoreRed: 0, scoreBlue: 0, time: 0, state: 'kickoff', kickoffTeam: 'red', goalTimer: 0 }
  });

  useEffect(() => { chatEndRef.current?.scrollIntoView(); }, [chatLog]);

  useEffect(() => {
    const container = canvasContainerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;
    const resizeCanvas = () => {
      const rect = container.getBoundingClientRect();
      const width = Math.max(1, rect.width), height = Math.max(1, rect.height);
      const pixelRatio = Math.min(2, window.devicePixelRatio || 1);
      viewportRef.current = { width, height, pixelRatio };
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
    };
    resizeCanvas();
    const observer = new ResizeObserver(resizeCanvas);
    observer.observe(container);
    window.addEventListener('resize', resizeCanvas);
    return () => { observer.disconnect(); window.removeEventListener('resize', resizeCanvas); };
  }, []);

  useEffect(() => {
    const releaseKeys = () => {
      serverState.current.keys = { w: false, a: false, s: false, d: false, kick: false };
      serverState.current.hasKicked = false;
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Tab') { e.preventDefault(); releaseKeys(); setShowTabMenu(prev => !prev); return; }
      if (e.key === 'Escape') setShowTabMenu(false);
      if (e.key === 'Enter' && document.activeElement !== chatInputRef.current) { e.preventDefault(); releaseKeys(); chatInputRef.current?.focus(); return; }
      if (document.activeElement.tagName === 'INPUT' || showTabMenu) return;
      
      const kUpper = e.key.toUpperCase();
      const kCode = e.code;
      const kLower = e.key.toLowerCase();

      if (['1', '2', '3'].includes(kLower)) { cameraMode.current = Number(kLower); setUiCamera(Number(kLower)); }
      if (kUpper.startsWith('ARROW')) e.preventDefault();

                                        
      if (kLower === 'w' || kUpper === 'ARROWUP') serverState.current.keys.w = true;
      if (kLower === 'a' || kUpper === 'ARROWLEFT') serverState.current.keys.a = true;
      if (kLower === 's' || kUpper === 'ARROWDOWN') serverState.current.keys.s = true;
      if (kLower === 'd' || kUpper === 'ARROWRIGHT') serverState.current.keys.d = true;
      
                                                       
      const customKeys = userConf.kickKeys.map(k => k.toUpperCase());
      if (kUpper === 'X' || customKeys.includes(kUpper) || customKeys.includes(kCode.toUpperCase())) {
        if (kCode === 'Space') e.preventDefault(); 
        serverState.current.keys.kick = true;
      }
    };
    
    const handleKeyUp = (e) => {
      const kUpper = e.key.toUpperCase();
      const kCode = e.code;
      const kLower = e.key.toLowerCase();

      if (kLower === 'w' || kUpper === 'ARROWUP') serverState.current.keys.w = false;
      if (kLower === 'a' || kUpper === 'ARROWLEFT') serverState.current.keys.a = false;
      if (kLower === 's' || kUpper === 'ARROWDOWN') serverState.current.keys.s = false;
      if (kLower === 'd' || kUpper === 'ARROWRIGHT') serverState.current.keys.d = false;
      
      const customKeys = userConf.kickKeys.map(k => k.toUpperCase());
      if (kUpper === 'X' || customKeys.includes(kUpper) || customKeys.includes(kCode.toUpperCase())) {
        serverState.current.keys.kick = false; 
        serverState.current.hasKicked = false; 
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', releaseKeys);

    const physicsInterval = setInterval(() => {
      const st = serverState.current;
      st.botKeys = botBrain.current.think(st.bot, st.ball, st.myTeam === 'spect' ? null : st.player, st.match);
      if (!st.botKeys.kick) st.botHasKicked = false;
      
      const tk = trackRef.current;
      simulateTick(st, tk, tk.currentTick, false); 

      if (tk.status === 'recording') {
        tk.currentTick++;
        if (tk.currentTick % 15 === 0 && tk.data.snapshots.length < 500) {
          tk.data.snapshots.push({ t: tk.currentTick, px: Math.round(st.player.x), py: Math.round(st.player.y), bx: Math.round(st.bot.x), by: Math.round(st.bot.y), ballx: Math.round(st.ball.x), bally: Math.round(st.ball.y) });
        }
        if (tk.currentTick >= 7200) { tk.status = 'finished'; setRecState('finished'); } 
        else if (tk.currentTick % 60 === 0) { setRecTime(Math.floor(tk.currentTick / 60)); }
      }
    }, 1000 / HAX.FPS);

    let animationId;
    const draw = () => {
      const canvas = canvasRef.current;
      if (!canvas) { animationId = requestAnimationFrame(draw); return; }
      
      const ctx = canvas.getContext('2d');
      if (!ctx) { animationId = requestAnimationFrame(draw); return; }
      const { width, height, pixelRatio } = viewportRef.current;
      const cx = width / 2;
      const cy = height / 2;
      ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      ctx.clearRect(0, 0, width, height);

      const renderState = {
        myTeam: serverState.current.myTeam, botTeam: serverState.current.botTeam,
        player: serverState.current.player.clone(), bot: serverState.current.bot.clone(), ball: serverState.current.ball.clone(),
        keys: { ...serverState.current.keys }, botKeys: { ...serverState.current.botKeys },
        hasKicked: serverState.current.hasKicked, botHasKicked: serverState.current.botHasKicked,
        match: { ...serverState.current.match }
      };

      if (extrapolationRef.current > 0 && renderState.match.state !== 'goal_scored') {
        const ticksLimites = Math.min(Math.floor(extrapolationRef.current / (1000 / HAX.FPS)), 30); 
        for (let i = 0; i < ticksLimites; i++) simulateTick(renderState, trackRef.current, 0, true); 
      }

      ctx.save();
      const viewport = getPracticeViewport(width, height, cameraMode.current);
      const scale = viewport.scale;
      const targetEntity = renderState.myTeam === 'spect' ? renderState.ball : renderState.player;
      const targetVx = renderState.myTeam === 'spect' ? renderState.ball.vx : renderState.player.vx;
      const targetVy = renderState.myTeam === 'spect' ? renderState.ball.vy : renderState.player.vy;

      const focus = cameraMode.current === 1 ? { x: 0, y: 0 } : cameraMode.current === 3 ? { x: targetEntity.x + targetVx * 20, y: targetEntity.y + targetVy * 20 } : { x: targetEntity.x * 0.7 + renderState.ball.x * 0.3, y: targetEntity.y * 0.7 + renderState.ball.y * 0.3 };
      const cameraTarget = clampPracticeCamera(focus, viewport);
      smoothCamera.current.x += (cameraTarget.x - smoothCamera.current.x) * (cameraMode.current === 3 ? 0.08 : 0.1);
      smoothCamera.current.y += (cameraTarget.y - smoothCamera.current.y) * (cameraMode.current === 3 ? 0.08 : 0.1);
      Object.assign(smoothCamera.current, clampPracticeCamera(smoothCamera.current, viewport));

      const tx = cx - smoothCamera.current.x * scale; const ty = cy - smoothCamera.current.y * scale;
      ctx.translate(tx, ty); ctx.scale(scale, scale);

      ctx.fillStyle = '#182B3A'; ctx.fillRect(-cx / scale * 5, -cy / scale * 5, width / scale * 10, height / scale * 10); 
      ctx.fillStyle = '#1D3544'; ctx.fillRect(-HAX.BOUND_X, -HAX.BOUND_Y, HAX.BOUND_X * 2, HAX.BOUND_Y * 2);
      ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 4;
      ctx.strokeRect(-HAX.BOUND_X, -HAX.BOUND_Y, HAX.BOUND_X * 2, HAX.BOUND_Y * 2); 
      ctx.beginPath(); ctx.moveTo(0, -HAX.BOUND_Y); ctx.lineTo(0, HAX.BOUND_Y); ctx.stroke(); 
      ctx.beginPath(); ctx.arc(0, 0, 150, 0, Math.PI * 2); ctx.stroke(); 
      ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fillStyle = '#FFFFFF'; ctx.fill();

      ctx.fillStyle = 'rgba(255, 183, 3, 0.15)'; ctx.fillRect(-HAX.BOUND_X - 50, -HAX.GOAL_Y, 50, HAX.GOAL_Y * 2); ctx.strokeRect(-HAX.BOUND_X - 50, -HAX.GOAL_Y, 50, HAX.GOAL_Y * 2);
      ctx.fillStyle = 'rgba(255, 211, 92, 0.15)'; ctx.fillRect(HAX.BOUND_X, -HAX.GOAL_Y, 50, HAX.GOAL_Y * 2); ctx.strokeRect(HAX.BOUND_X, -HAX.GOAL_Y, 50, HAX.GOAL_Y * 2);

      if (renderState.match.state === 'kickoff') { ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'; ctx.beginPath(); ctx.arc(0, 0, 150, 0, Math.PI * 2); ctx.stroke(); }

      const drawAdvancedDisc = (ctx, d, isKickingVisual, customConf) => {
        ctx.save();
        ctx.translate(d.x, d.y);

        if (isKickingVisual) {
          ctx.beginPath(); ctx.arc(0, 0, d.rad + HAX.BALL_RAD + 4, 0, Math.PI * 2);
          ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)'; ctx.stroke();
        }

        ctx.beginPath(); ctx.arc(0, 0, d.rad, 0, Math.PI * 2);
        
        if (customConf && customConf.colors) {
          ctx.save();
          ctx.clip(); 
          
          const angleRad = (customConf.angle - 90) * (Math.PI / 180);
          ctx.rotate(angleRad);
          
          const numColors = customConf.colorCount || customConf.colors.length;
          const r = d.rad;
          
          if (numColors === 1) {
            ctx.fillStyle = customConf.colors[0];
            ctx.fillRect(-r, -r, r * 2, r * 2);
          } else if (numColors === 2) {
            ctx.fillStyle = customConf.colors[0];
            ctx.fillRect(-r, -r, r * 2, r); 
            ctx.fillStyle = customConf.colors[1];
            ctx.fillRect(-r, 0, r * 2, r);  
          } else {
            const third = (r * 2) / 3;
            ctx.fillStyle = customConf.colors[0];
            ctx.fillRect(-r, -r, r * 2, third);
            ctx.fillStyle = customConf.colors[1];
            ctx.fillRect(-r, -r + third, r * 2, third);
            ctx.fillStyle = customConf.colors[2];
            ctx.fillRect(-r, -r + third * 2, r * 2, third);
          }
          ctx.restore();
        } else {
          ctx.fillStyle = d.color;
          ctx.fill();
        }

        ctx.lineWidth = 2.5; ctx.strokeStyle = isKickingVisual ? '#FFFFFF' : '#000000'; ctx.stroke();
        ctx.beginPath(); ctx.arc(0, 0, d.rad - 1.5, 0, Math.PI * 2);
        ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.stroke();

        const text = customConf ? customConf.avatar : (d.text || null);
        if (text) {
          ctx.fillStyle = customConf ? customConf.textColor : '#FFFFFF';
          ctx.font = 'bold 16px sans-serif'; 
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          
          ctx.shadowColor = 'black';
          ctx.shadowBlur = 0;
          ctx.shadowOffsetX = 1.5;
          ctx.shadowOffsetY = 1.5;
          ctx.fillText(text.substring(0, 2), 0, 1.5);
          
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 0;
        }

        ctx.restore();
      };

      POSTS.forEach(p => drawAdvancedDisc(ctx, p, false, null));
      drawAdvancedDisc(ctx, renderState.ball, false, null);
      
      if (renderState.myTeam !== 'spect') {
        drawAdvancedDisc(ctx, renderState.player, renderState.keys.kick && !renderState.hasKicked, userConf);
      }
      
      drawAdvancedDisc(ctx, renderState.bot, renderState.botKeys.kick && !renderState.botHasKicked, { avatar: 'AI', colors: [renderState.bot.color], angle: 0, textColor: '#FFF', colorCount: 1 });

      ctx.restore(); 

      ctx.save();
      const hudY = 40;
      ctx.fillStyle = 'rgba(10, 10, 10, 0.85)'; ctx.beginPath(); ctx.roundRect(cx - 120, hudY - 20, 240, 40, 10); ctx.fill();
      ctx.fillStyle = '#E56E56'; ctx.fillRect(cx - 90, hudY - 10, 20, 20);
      ctx.fillStyle = '#5689E5'; ctx.fillRect(cx - 10, hudY - 10, 20, 20);
      ctx.fillStyle = '#FFFFFF'; ctx.font = 'bold 20px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(`${renderState.match.scoreRed}`, cx - 50, hudY + 2);
      ctx.fillText(`-`, cx - 35, hudY + 2);
      ctx.fillText(`${renderState.match.scoreBlue}`, cx - 20, hudY + 2);
      ctx.fillStyle = '#A0A0A0'; ctx.font = 'bold 18px monospace';
      ctx.fillText(formatTime(renderState.match.time), cx + 60, hudY + 2);

      if (renderState.match.state === 'goal_scored') {
        ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0,0,width,height);
        ctx.fillStyle = '#FFFFFF'; ctx.font = `900 ${Math.min(60, width / 8)}px sans-serif`; ctx.fillText("¡G O O O L!", cx, cy);
      }
      ctx.restore();

      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => { releaseKeys(); clearInterval(physicsInterval); if (animationId) cancelAnimationFrame(animationId); window.removeEventListener('keydown', handleKeyDown); window.removeEventListener('keyup', handleKeyUp); window.removeEventListener('blur', releaseKeys); };
  }, [showTabMenu, userConf]); 

  const startRecording = () => {
    trackRef.current = { status: 'recording', currentTick: 0, lastBounce: 0, data: { snapshots: [], kicks: [], bounces: [] } };
    setRecState('recording');
    setRecTime(0);
    setCopied(false);
    setChatLog(prev => [...prev, `[Neural] Grabación iniciada. Hazle Oles y paredes al bot por 2 mins.`]);
  };

  const copyData = () => {
    const finalData = JSON.stringify(trackRef.current.data);
    navigator.clipboard.writeText(finalData);
    setCopied(true);
    setChatLog(prev => [...prev, `[Neural] Datos masivos copiados. Pégalos a la IA para clonar tu cerebro.`]);
  };

  const handleChatSubmit = (e) => {
    e.preventDefault(); if (chatInputRef.current) chatInputRef.current.blur(); if (!chatInput.trim()) return;
    const newLog = [...chatLog, `Tú: ${chatInput}`];
    if (chatInput.startsWith('/extrapolation ')) {
      const val = parseInt(chatInput.split(' ')[1]);
      if (!isNaN(val) && val >= 0 && val <= 500) { extrapolationRef.current = val; setUiExtrapolation(val); newLog.push(`[Sistema] Predicción ajustada a ${val}ms.`); }
    }
    setChatLog(newLog); setChatInput('');
  };

  const changeTeam = (team) => {
    const s = serverState.current; s.myTeam = team;
    if (team === 'red') {
      s.botTeam = 'blue'; botBrain.current.team = 'blue';
      s.player.color = '#E56E56'; s.player.x = -200; s.player.y = 0; s.player.vx = 0; s.player.vy = 0;
      s.bot.color = '#5689E5'; s.bot.x = 200; s.bot.y = 0; s.bot.vx = 0; s.bot.vy = 0;
    } else if (team === 'blue') {
      s.botTeam = 'red'; botBrain.current.team = 'red';
      s.player.color = '#5689E5'; s.player.x = 200; s.player.y = 0; s.player.vx = 0; s.player.vy = 0;
      s.bot.color = '#E56E56'; s.bot.x = -200; s.bot.y = 0; s.bot.vx = 0; s.bot.vy = 0;
    }
    botBrain.current = new HaxBot(s.botTeam);
    s.keys = { w: false, a: false, s: false, d: false, kick: false };
    s.hasKicked = false;
    setShowTabMenu(false); setChatLog(prev => [...prev, `[Sistema] Te has unido a: ${team.toUpperCase()}`]);
  };

  const touchKey = (event, key, pressed) => {
    event.preventDefault();
    if (pressed) event.currentTarget.setPointerCapture(event.pointerId);
    serverState.current.keys[key] = pressed;
    if (key === 'kick' && !pressed) serverState.current.hasKicked = false;
  };

  return (
    <div className="fixed inset-0 z-[300] bg-[#030303] flex flex-col font-sans overflow-hidden" style={{ height: '100dvh' }}>
      <header className="relative shrink-0 w-full px-3 py-3 sm:px-6 flex justify-between items-start gap-2 z-40 border-b border-white/10" style={{ paddingTop: 'max(12px, env(safe-area-inset-top))' }}>
        <button type="button" onClick={onVolver} aria-label="Abandonar entrenamiento" className="flex items-center gap-2 text-white hover:text-[#F47A20] transition-colors font-black uppercase tracking-widest text-[10px] bg-black/60 px-3 sm:px-6 py-3 rounded border border-white/10 backdrop-blur-md">
          <ArrowLeft size={14} /> <span className="hidden sm:inline">Abandonar</span>
        </button>
        
        <div className="flex gap-2 flex-wrap justify-end items-center">
          <button type="button" onClick={() => setShowTabMenu(true)} className="flex items-center gap-2 rounded border border-white/10 bg-white/5 px-3 py-2 text-[10px] font-bold text-white"><Users size={14} /> Equipos</button>
          <div className={`px-4 py-2 rounded border font-black tracking-widest text-[10px] backdrop-blur-md ${uiExtrapolation > 0 ? 'bg-red-500/20 text-red-500 border-red-500/30' : 'bg-green-500/20 text-green-500 border-green-500/30'}`}>
            EXT: {uiExtrapolation}ms
          </div>

          {recState === 'idle' && (
            <button type="button" onClick={startRecording} className="flex items-center gap-2 text-black bg-[#9b51e0] hover:bg-[#7b3eb8] transition-colors font-black uppercase tracking-widest text-[10px] px-3 sm:px-6 py-3 rounded shadow-[0_0_15px_rgba(155,81,224,0.4)]">
              <BrainCircuit size={14} /> Grabar jugadas (2m)
            </button>
          )}
          {recState === 'recording' && (
            <div className="flex items-center gap-2 text-white bg-red-600/80 font-black uppercase tracking-widest text-[10px] px-3 sm:px-6 py-3 rounded border border-red-500 animate-pulse">
              <div className="w-2 h-2 rounded-full bg-white animate-ping"></div> Grabando... {120 - recTime}s
            </div>
          )}
          {recState === 'finished' && (
            <button type="button" onClick={copyData} className={`flex items-center gap-2 font-black uppercase tracking-widest text-[10px] px-3 sm:px-6 py-3 rounded transition-all ${copied ? 'bg-green-500 text-white' : 'bg-white text-black hover:bg-gray-200'}`}>
              {copied ? <CheckCircle2 size={14} /> : <Copy size={14} />} {copied ? 'Copiado!' : 'Copiar jugadas'}
            </button>
          )}
        </div>
      </header>

      <main ref={canvasContainerRef} className="relative flex-1 min-h-0 overflow-hidden">
        <canvas ref={canvasRef} width={1400} height={700} aria-label="Cancha de entrenamiento Haxball" className="absolute inset-0 block w-full h-full bg-[#030303]" />

      <div className="absolute bottom-3 left-3 w-[calc(100%-160px)] max-w-[350px] pointer-fine:w-[calc(100%-1.5rem)] sm:w-[350px] bg-[#0E0E0E]/60 backdrop-blur-md rounded-xl border border-white/10 flex flex-col shadow-2xl z-40">
        <button type="button" onClick={() => setShowChat(value => !value)} className="sm:hidden text-left p-2 text-[10px] text-white/70">{showChat ? 'Cerrar chat' : 'Abrir chat'}</button>
        <div className={`flex-1 p-3 overflow-y-auto flex-col gap-2 max-h-[100px] sm:max-h-[160px] custom-scrollbar ${showChat ? 'flex' : 'hidden sm:flex'}`}>
          {chatLog.map((msg, i) => (
            <p key={i} className={`text-[11px] font-mono leading-tight ${msg.includes('[Sistema]') || msg.includes('[Neural]') ? 'text-[#9b51e0]' : 'text-white/90'}`}>{msg}</p>
          ))}
          <div ref={chatEndRef} />
        </div>
        <form onSubmit={handleChatSubmit} className="p-2 border-t border-white/10 bg-black/40 rounded-b-xl pointer-events-auto">
          <input ref={chatInputRef} type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="ENTER chatear..." className="w-full bg-black/50 text-white px-3 py-2 rounded border border-white/5 outline-none focus:border-[#9b51e0]/50 text-xs font-mono" />
        </form>
      </div>
      <div className="hidden pointer-coarse:grid absolute right-3 bottom-3 z-40 grid-cols-3 grid-rows-3 gap-1 touch-none">
        {[
          { key: 'w', label: '↑', name: 'Mover arriba', col: 2, row: 1 },
          { key: 'a', label: '←', name: 'Mover izquierda', col: 1, row: 2 },
          { key: 'kick', label: 'X', name: 'Golpear balón', col: 2, row: 2 },
          { key: 'd', label: '→', name: 'Mover derecha', col: 3, row: 2 },
          { key: 's', label: '↓', name: 'Mover abajo', col: 2, row: 3 },
        ].map(control => <button type="button" key={control.key} aria-label={control.name} onPointerDown={event => touchKey(event, control.key, true)} onPointerUp={event => touchKey(event, control.key, false)} onPointerCancel={event => touchKey(event, control.key, false)} onLostPointerCapture={event => touchKey(event, control.key, false)} className={`w-9 h-9 rounded-lg border font-bold touch-none select-none ${control.key === 'kick' ? 'bg-orange-400 text-black border-orange-300' : 'bg-black/65 text-white border-white/30'}`} style={{ gridColumn: control.col, gridRow: control.row }}>{control.label}</button>)}
      </div>
      </main>
      <footer className="shrink-0 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 bg-[#080808] px-3 py-2 text-[10px] text-white/60" style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}>
        <span>WASD / flechas · X para golpear · ENTER chat</span>
        <div className="flex gap-1" aria-label="Cámara de entrenamiento">{['General', 'Jugador', 'Cerca'].map((label, index) => <button type="button" key={label} onClick={() => { cameraMode.current = index + 1; setUiCamera(index + 1); }} aria-pressed={uiCamera === index + 1} className={`rounded px-2 py-1 ${uiCamera === index + 1 ? 'bg-orange-400 text-black font-bold' : 'bg-white/10 text-white/70'}`}>{index + 1}. {label}</button>)}</div>
      </footer>

      {showTabMenu && (
        <div role="dialog" aria-modal="true" aria-label="Seleccionar equipo de entrenamiento" className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-auto p-3">
          <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-4 sm:p-8 flex flex-col gap-4 sm:gap-6 w-full max-w-md max-h-full overflow-y-auto shadow-2xl">
            <div className="text-center">
              <h2 className="text-white font-black text-xl tracking-widest uppercase">Seleccionar Equipo</h2>
              <p className="text-[#666] text-xs uppercase tracking-widest mt-1">Presiona ESC para cerrar</p>
              <button type="button" onClick={() => setShowTabMenu(false)} className="mt-3 rounded-lg px-3 py-2 bg-white/10 text-xs text-white">Volver a la cancha</button>
            </div>
            
            <div className="flex flex-col gap-3">
              <button onClick={() => changeTeam('red')} className="group flex items-center justify-between bg-black border border-white/10 hover:border-[#E56E56] p-4 rounded-xl transition-all hover:shadow-[0_0_20px_rgba(229,110,86,0.3)]">
                <div className="flex items-center gap-3"><div className="w-4 h-4 rounded-full bg-[#E56E56]"></div><span className="text-white font-black uppercase tracking-widest text-sm">Equipo Rojo</span></div>
                <Users size={16} className="text-[#666] group-hover:text-[#E56E56]" />
              </button>
              
              <button onClick={() => changeTeam('spect')} className="group flex items-center justify-between bg-black border border-white/10 hover:border-white/50 p-4 rounded-xl transition-all">
                <div className="flex items-center gap-3"><Eye size={16} className="text-[#888]" /><span className="text-white font-black uppercase tracking-widest text-sm">Espectador</span></div>
              </button>

              <button onClick={() => changeTeam('blue')} className="group flex items-center justify-between bg-black border border-white/10 hover:border-[#5689E5] p-4 rounded-xl transition-all hover:shadow-[0_0_20px_rgba(86,137,229,0.3)]">
                <div className="flex items-center gap-3"><div className="w-4 h-4 rounded-full bg-[#5689E5]"></div><span className="text-white font-black uppercase tracking-widest text-sm">Equipo Azul</span></div>
                <Users size={16} className="text-[#666] group-hover:text-[#5689E5]" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
