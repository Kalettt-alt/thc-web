import { useEffect, useRef, useState, useMemo } from 'react';
import { readUtConfig } from '../utValidation';
                                                             
import { ArrowLeft, MessageSquare, Minus, Plus, Camera } from 'lucide-react';
import { HAX, Disc, POSTS, simulateTick } from './PhysicsEngine'; 

const parseKit = (kitCode) => {
  if (!kitCode) return { angle: 90, textColor: '#FFF', colors: ['#333', '#111'] };
  const parts = kitCode.trim().replace(/\s+/g, ' ').split(' ');
  const angle = parseInt(parts[2]) || 0;
  const textColor = parts[3] && parts[3] !== 'null' ? `#${parts[3]}` : '#FFFFFF';
  const colors = parts.slice(4).filter(c => c && c !== 'null').map(c => `#${c}`);
  return { angle, textColor, colors: colors.length ? colors : ['#333', '#111'] };
};

export default function CanchaPartido({ teamRed, kitCodeRed, onVolver }) {
  const canvasRef = useRef(null);
  
  const [savedConfig] = useState(readUtConfig);
  const [extrapolation, setExtrapolation] = useState(savedConfig.extrapolation || 0); 
  const customKickKeys = savedConfig.kickKeys;

  const myKit = useMemo(() => ({ ...parseKit(kitCodeRed), avatar: teamRed.star.substring(0, 2).toUpperCase() }), [kitCodeRed, teamRed.star]);
  
  const [isChatMinimized, setIsChatMinimized] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatLog, setChatLog] = useState([
    `[Sistema] Partido Oficial (2 Tiempos de 10 min).`,
    `[Sistema] Extrapolación inicial: ${savedConfig.extrapolation || 0}ms.`,
    `[Sistema] Comando disponible: /extrapolation {0-500}`
  ]);
  const chatInputRef = useRef(null);
  const chatEndRef = useRef(null);

  const [camModeHUD, setCamModeHUD] = useState(4); 
  const cameraMode = useRef(4); 
  const smoothCamera = useRef({ x: 0, y: 0, scale: 0.85 }); 

  const serverState = useRef({
    phase: 'kickoff', 
    half: 1,
    scoreRed: 0, scoreBlue: 0, time: 0, timer: 0,
    player: new Disc(-500, 0, HAX.PLAYER_RAD, 1 / HAX.PLAYER_MASS, HAX.PLAYER_DAMP, 0.5, '#F97316'),
    ball: new Disc(0, 0, HAX.BALL_RAD, 1 / HAX.BALL_MASS, HAX.BALL_DAMP, HAX.BALL_BCOEF, '#FFFFFF'),
    keys: { w: false, a: false, s: false, d: false, kick: false },
    hasKicked: false
  });

  useEffect(() => { chatEndRef.current?.scrollIntoView(); }, [chatLog]);

  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize(); 
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (document.activeElement.tagName === 'INPUT') return;
      if (e.key === 'Enter') { 
        e.preventDefault(); 
        setIsChatMinimized(false); 
        setTimeout(() => chatInputRef.current?.focus(), 100); 
        return; 
      }

      const k = e.key.toLowerCase();
      const kUpper = e.key.toUpperCase();
      const kCode = e.code;
      
      if (['1','2','3','4','5'].includes(k)) {
        const num = parseInt(k);
        cameraMode.current = num;
        setCamModeHUD(num);
      }

      if (k === 'w' || e.code === 'ArrowUp') serverState.current.keys.w = true;
      if (k === 'a' || e.code === 'ArrowLeft') serverState.current.keys.a = true;
      if (k === 's' || e.code === 'ArrowDown') serverState.current.keys.s = true;
      if (k === 'd' || e.code === 'ArrowRight') serverState.current.keys.d = true;
      
      const customKeys = customKickKeys.map(key => key.toUpperCase());
      if (kUpper === 'X' || customKeys.includes(kUpper) || customKeys.includes(kCode.toUpperCase())) {
        if (e.code === 'Space') e.preventDefault(); 
        serverState.current.keys.kick = true;
      }
    };
    
    const handleKeyUp = (e) => {
      if (document.activeElement.tagName === 'INPUT') return;
      const k = e.key.toLowerCase();
      const kUpper = e.key.toUpperCase();
      const kCode = e.code;

      if (k === 'w' || e.code === 'ArrowUp') serverState.current.keys.w = false;
      if (k === 'a' || e.code === 'ArrowLeft') serverState.current.keys.a = false;
      if (k === 's' || e.code === 'ArrowDown') serverState.current.keys.s = false;
      if (k === 'd' || e.code === 'ArrowRight') serverState.current.keys.d = false;
      
      const customKeys = customKickKeys.map(key => key.toUpperCase());
      if (kUpper === 'X' || customKeys.includes(kUpper) || customKeys.includes(kCode.toUpperCase())) {
        serverState.current.keys.kick = false;
        serverState.current.hasKicked = false; 
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    let animationId;
    let lastTime = performance.now();

    const loop = (time) => {
      const deltaTime = time - lastTime;
      
      if (deltaTime >= 1000 / HAX.FPS) {
        simulateTick(serverState.current);
        lastTime = time;
      }

      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;
        const state = serverState.current;

        const renderState = {
          phase: state.phase,
          player: state.player.clone(),
          ball: state.ball.clone(),
          keys: { ...state.keys },
          hasKicked: state.hasKicked
        };

        if (extrapolation > 0 && renderState.phase === 'playing') {
          const ticksToPredict = Math.min(Math.floor(extrapolation / (1000 / HAX.FPS)), 15); 
          for (let i = 0; i < ticksToPredict; i++) simulateTick(renderState);
        }

        let targetScale = 0.85; 
        if (cameraMode.current === 1) targetScale = 0.35; 
        else if (cameraMode.current === 2) targetScale = 0.45; 
        else if (cameraMode.current === 3) targetScale = 0.60;
        else if (cameraMode.current === 4) targetScale = 0.85; 
        else if (cameraMode.current === 5) targetScale = 1.3;  

        let targetX = smoothCamera.current.x;
        let targetY = smoothCamera.current.y;

        if (state.phase === 'goal') {
          targetX = renderState.ball.x; targetY = renderState.ball.y; targetScale = 1.0; 
        } else {
          const dx = renderState.player.x - smoothCamera.current.x;
          const dy = renderState.player.y - smoothCamera.current.y;
          const deadzoneX = 180 / targetScale; 
          const deadzoneY = 100 / targetScale;

          if (dx > deadzoneX) targetX = renderState.player.x - deadzoneX;
          else if (dx < -deadzoneX) targetX = renderState.player.x + deadzoneX;

          if (dy > deadzoneY) targetY = renderState.player.y - deadzoneY;
          else if (dy < -deadzoneY) targetY = renderState.player.y + deadzoneY;
        }

        smoothCamera.current.x += (targetX - smoothCamera.current.x) * 0.08;
        smoothCamera.current.y += (targetY - smoothCamera.current.y) * 0.08;
        smoothCamera.current.scale += (targetScale - smoothCamera.current.scale) * 0.08;

        const sc = smoothCamera.current.scale;
        
        ctx.save();
        ctx.translate(cx - smoothCamera.current.x * sc, cy - smoothCamera.current.y * sc);
        ctx.scale(sc, sc);

        ctx.fillStyle = '#22282d'; 
        ctx.fillRect(-HAX.BOUND_X * 2, -HAX.BOUND_Y * 2, HAX.BOUND_X * 4, HAX.BOUND_Y * 4);

        ctx.fillStyle = '#39464e'; 
        ctx.beginPath();
        ctx.roundRect(-HAX.BOUND_X, -HAX.BOUND_Y, HAX.BOUND_X * 2, HAX.BOUND_Y * 2, 160); 
        ctx.fill();

        ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 10;
        ctx.strokeRect(-HAX.BOUND_X, -HAX.BOUND_Y, HAX.BOUND_X * 2, HAX.BOUND_Y * 2); 
        ctx.beginPath(); ctx.moveTo(0, -HAX.BOUND_Y); ctx.lineTo(0, HAX.BOUND_Y); ctx.stroke(); 
        ctx.beginPath(); ctx.arc(0, 0, 300, 0, Math.PI * 2); ctx.stroke(); 

        const drawPenaltyArea = (xPos, direction) => {
          ctx.beginPath(); ctx.moveTo(xPos, -450); ctx.arcTo(xPos + (direction * 450), -450, xPos + (direction * 450), 0, 450);
          ctx.arcTo(xPos + (direction * 450), 450, xPos, 450, 450); ctx.lineTo(xPos, 450); ctx.stroke();
        };
        drawPenaltyArea(-HAX.BOUND_X, 1);
        drawPenaltyArea(HAX.BOUND_X, -1);

        ctx.fillStyle = 'rgba(239, 68, 68, 0.3)'; ctx.fillRect(-HAX.BOUND_X - 100, -HAX.GOAL_Y, 100, HAX.GOAL_Y * 2);
        ctx.fillStyle = 'rgba(59, 130, 246, 0.3)'; ctx.fillRect(HAX.BOUND_X, -HAX.GOAL_Y, 100, HAX.GOAL_Y * 2);

        const drawAdvancedDisc = (d, isKicking, isPlayer, kit) => {
          ctx.save();
          ctx.translate(d.x, d.y);

          if (isPlayer) {
            ctx.beginPath(); 
            ctx.arc(0, 0, d.rad + HAX.BALL_RAD + 4, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.15)'; 
            ctx.fill();
            ctx.lineWidth = 3; 
            ctx.strokeStyle = isKicking ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.3)'; 
            ctx.stroke();
          }

          ctx.beginPath(); ctx.arc(0, 8, d.rad, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fill();

          ctx.beginPath(); ctx.arc(0, 0, d.rad, 0, Math.PI * 2);

          if (isPlayer && kit && kit.colors) {
            ctx.save();
            ctx.clip(); 
            const angleRad = (kit.angle - 90) * (Math.PI / 180);
            ctx.rotate(angleRad);
            const numColors = kit.colors.length;
            const r = d.rad;
            if (numColors === 1) {
              ctx.fillStyle = kit.colors[0]; ctx.fillRect(-r, -r, r * 2, r * 2);
            } else if (numColors === 2) {
              ctx.fillStyle = kit.colors[0]; ctx.fillRect(-r, -r, r * 2, r); 
              ctx.fillStyle = kit.colors[1]; ctx.fillRect(-r, 0, r * 2, r);  
            } else {
              const third = (r * 2) / 3;
              ctx.fillStyle = kit.colors[0]; ctx.fillRect(-r, -r, r * 2, third);
              ctx.fillStyle = kit.colors[1]; ctx.fillRect(-r, -r + third, r * 2, third);
              ctx.fillStyle = kit.colors[2]; ctx.fillRect(-r, -r + third * 2, r * 2, third);
            }
            ctx.restore();
          } else {
            ctx.fillStyle = d.color;
            ctx.fill();
          }

          ctx.lineWidth = 4; ctx.strokeStyle = isKicking ? '#FFFFFF' : '#000000'; ctx.stroke();
          ctx.beginPath(); ctx.arc(0, 0, d.rad - 3, 0, Math.PI * 2);
          ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.stroke();

          const text = (isPlayer && kit) ? kit.avatar : d.text;
          if (text) {
            ctx.fillStyle = (isPlayer && kit) ? kit.textColor : '#FFFFFF';
            ctx.font = `bold ${d.rad * 0.9}px sans-serif`; 
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(text.substring(0, 2), 0, 1);
          }
          ctx.restore();
        };

        POSTS.forEach(p => drawAdvancedDisc(p, false, false, null));
        drawAdvancedDisc(renderState.player, renderState.keys.kick && !renderState.hasKicked, true, myKit);
        
        ctx.save();
        ctx.translate(renderState.ball.x, renderState.ball.y);
        ctx.beginPath(); ctx.arc(0, 5, renderState.ball.rad, 0, Math.PI * 2); ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fill(); 
        ctx.beginPath(); ctx.arc(0, 0, renderState.ball.rad, 0, Math.PI * 2); ctx.fillStyle = '#FFFFFF'; ctx.fill(); 
        ctx.lineWidth = 3.5; ctx.strokeStyle = '#000000'; ctx.stroke();
        ctx.restore();

        ctx.restore();

                                        
        const ballScreenX = cx + (renderState.ball.x - smoothCamera.current.x) * sc;
        const ballScreenY = cy + (renderState.ball.y - smoothCamera.current.y) * sc;
        
        if (ballScreenX < 0 || ballScreenX > canvas.width || ballScreenY < 0 || ballScreenY > canvas.height) {
          const angle = Math.atan2(ballScreenY - cy, ballScreenX - cx);
          const radarRadius = Math.min(cx, cy) - 40; 
          
          ctx.save();
          ctx.translate(cx + Math.cos(angle) * radarRadius, cy + Math.sin(angle) * radarRadius);
          ctx.rotate(angle);
          
          ctx.beginPath();
          ctx.moveTo(12, 0); ctx.lineTo(-12, -10); ctx.lineTo(-6, 0); ctx.lineTo(-12, 10); ctx.closePath();
          ctx.fillStyle = '#F97316'; ctx.fill();
          ctx.lineWidth = 2; ctx.strokeStyle = '#FFFFFF'; ctx.stroke();
          ctx.restore();
        }

        const formatTime = (s) => `${Math.floor(s/60).toString().padStart(2,'0')}:${Math.floor(s%60).toString().padStart(2,'0')}`;
        const halfText = state.half === 1 ? '1T' : '2T';
        
        const hudY = 35;
        const hudWidth = 260;
        const hudHeight = 40;
        
        ctx.fillStyle = '#111111'; 
        ctx.beginPath(); 
        ctx.roundRect(cx - hudWidth/2, hudY - hudHeight/2, hudWidth, hudHeight, 10); 
        ctx.fill(); 
        ctx.lineWidth = 1; 
        ctx.strokeStyle = 'rgba(255,255,255,0.1)'; 
        ctx.stroke();
        
        ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.roundRect(cx - 110, hudY - 12, 24, 24, 6); ctx.fill(); 
        ctx.fillStyle = '#3b82f6'; ctx.beginPath(); ctx.roundRect(cx - 20, hudY - 12, 24, 24, 6); ctx.fill(); 
        
        ctx.fillStyle = '#FFFFFF'; ctx.font = 'bold 22px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(state.scoreRed, cx - 65, hudY + 1); 
        ctx.fillText('-', cx - 45, hudY + 1); 
        ctx.fillText(state.scoreBlue, cx - 25, hudY + 1);
        
        ctx.fillStyle = '#A0A0A0'; ctx.font = 'bold 16px monospace';
        ctx.fillText(`${halfText} - ${formatTime(state.time)}`, cx + 60, hudY + 1);

        if (state.phase === 'goal' || state.phase === 'halftime' || state.phase === 'end') {
          ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.fillStyle = '#FFFFFF'; ctx.font = 'black italic 100px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.shadowColor = '#000'; ctx.shadowBlur = 20;
          if (state.phase === 'goal') ctx.fillText("¡G O O O O L!", cx, cy);
          if (state.phase === 'halftime') ctx.fillText("MEDIO TIEMPO", cx, cy);
          if (state.phase === 'end') ctx.fillText("FIN DEL PARTIDO", cx, cy);
          ctx.shadowBlur = 0;
        }
      }

      animationId = requestAnimationFrame(loop);
    };

    animationId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [extrapolation, customKickKeys, myKit]);

  const handleChatSubmit = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    
    let newLog = [...chatLog, `Tú: ${chatInput}`];

    if (chatInput.startsWith('/extrapolation ')) {
      const val = parseInt(chatInput.split(' ')[1]);
      if (!isNaN(val) && val >= 0 && val <= 500) {
        setExtrapolation(val);
        newLog.push(`[Sistema] Extrapolación ajustada a ${val}ms.`);
        
        try {
          const currentConf = readUtConfig();
          currentConf.extrapolation = val;
          localStorage.setItem('thc_config', JSON.stringify(currentConf));
        } catch { newLog.push('[Sistema] La preferencia no se pudo guardar en este dispositivo.'); }
      } else {
        newLog.push(`[Sistema] Comando inválido. Uso: /extrapolation 0-500`);
      }
    }

    setChatLog(newLog);
    setChatInput('');
    chatInputRef.current?.blur();
  };

  return (
    <div className="fixed inset-0 w-screen h-screen bg-[#1b2228] overflow-hidden flex flex-col font-sans z-[300]">
      
      <div className="absolute top-6 left-6 z-50 flex gap-4">
        <button onClick={onVolver} className="flex items-center gap-2 text-white/50 hover:text-white bg-[#111] px-5 py-2.5 rounded-full border border-white/5 shadow-md font-black uppercase tracking-widest text-[10px] transition-all outline-none">
          <ArrowLeft size={14} /> Abandonar Sala
        </button>
        <div className="bg-[#111] px-4 py-2.5 rounded-full border border-white/5 shadow-md flex items-center gap-3">
          <Camera size={14} className="text-white/50" />
          <span className="text-[9px] font-black text-white/50 tracking-widest">
            CAM: {[1, 2, 3, 4, 5].map(c => (
              <span key={c} className={`mx-0.5 text-sm ${camModeHUD === c ? 'text-[#F97316]' : 'text-white'}`}>{c}</span>
            ))}
          </span>
        </div>
      </div>

      <div className="absolute inset-0 w-full h-full pointer-events-none">
        <canvas ref={canvasRef} className="w-full h-full block" />
      </div>

      <div className={`absolute bottom-6 left-6 w-[350px] bg-[#0E0E0E]/90 backdrop-blur-xl rounded-xl border border-white/10 flex flex-col shadow-2xl z-50 transition-all duration-300 pointer-events-auto ${isChatMinimized ? 'h-[40px] overflow-hidden' : 'h-auto'}`}>
        <div 
          className="flex items-center justify-between bg-black/60 px-4 py-2.5 border-b border-white/5 cursor-pointer hover:bg-black/80 transition-colors"
          onClick={() => setIsChatMinimized(!isChatMinimized)}
        >
          <div className="flex items-center gap-2">
            <MessageSquare size={12} className="text-[#F97316]" />
            <span className="text-[9px] font-black text-white/50 uppercase tracking-widest">Chat Futsal X11</span>
          </div>
          <button className="text-white/50 hover:text-white outline-none">
            {isChatMinimized ? <Plus size={14} /> : <Minus size={14} />}
          </button>
        </div>
        
        {!isChatMinimized && (
          <>
            <div className="flex-1 p-3 overflow-y-auto flex flex-col gap-1.5 max-h-[150px] custom-scrollbar">
              {chatLog.map((msg, i) => (
                <p key={i} className={`text-[11px] font-mono leading-tight ${msg.includes('[Sistema]') ? 'text-[#F97316] font-bold' : 'text-white/90'}`}>{msg}</p>
              ))}
              <div ref={chatEndRef} />
            </div>
            <form onSubmit={handleChatSubmit} className="p-2 border-t border-white/10 bg-black/40 rounded-b-xl">
              <input 
                ref={chatInputRef} type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} 
                placeholder="ENTER chatear..." 
                className="w-full bg-black/50 text-white px-3 py-2 rounded border border-white/5 outline-none focus:border-[#F97316]/50 text-xs font-mono transition-colors" 
              />
            </form>
          </>
        )}
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.2); border-radius: 10px; }
      `}</style>
    </div>
  );
}