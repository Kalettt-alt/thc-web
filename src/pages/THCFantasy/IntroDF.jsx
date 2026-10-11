import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../utils/supabase';
import { ClipboardList } from 'lucide-react';
import { visualVariation } from './visualVariation';

                                                         
const imageModules = import.meta.glob('./Imag/*.png', { eager: true });
const validEscudos = Object.keys(imageModules)
  .filter(path => !path.toLowerCase().includes('logo') && !path.toLowerCase().includes('bandera') && !path.toLowerCase().includes('default'))
  .map(path => imageModules[path].default || imageModules[path]);

export default function IntroDF({ onFinalizar, session }) {
  const [fase, setFase] = useState(0);
  const [apodo, setApodo] = useState('MÁNAGER');

                     
  useEffect(() => {
    const obtenerApodo = async () => {
      if (!session?.user?.id) return;
      try {
        const { data } = await supabase.from('perfiles').select('apodo').eq('id', session.user.id).single();
        if (data && data.apodo) setApodo(data.apodo);
      } catch (error) { console.error('No se pudo cargar el apodo del mánager:', error); }
    };
    obtenerApodo();
  }, [session]);

                                     
  useEffect(() => {
    const cronograma = [
      setTimeout(() => setFase(1), 11000),                               
      setTimeout(() => setFase(2), 19000),                                        
      setTimeout(() => setFase(3), 29000),                                  
      setTimeout(() => setFase(4), 37000),                             
      setTimeout(() => onFinalizar(), 40000)             
    ];
    return () => cronograma.forEach(clearTimeout);
  }, [onFinalizar]);

                                                                                 
                 
                                                                                 

                               
  const stadiumBeams = useMemo(() => {
    return Array.from({ length: 60 }).map((_, i) => {
      const angle = (i * 6) * (Math.PI / 180);
      return {
        x1: 800 + Math.cos(angle) * 480, 
        y1: 500 + Math.sin(angle) * 280,
        x2: 800 + Math.cos(angle) * 1200, 
        y2: 500 + Math.sin(angle) * 800
      };
    });
  }, []);

  const formacionPizarra = [
    { top: '50%', left: '10%' },
    { top: '20%', left: '25%' }, { top: '40%', left: '25%' }, { top: '60%', left: '25%' }, { top: '80%', left: '25%' },
    { top: '30%', left: '50%' }, { top: '50%', left: '50%' }, { top: '70%', left: '50%' },
    { top: '25%', left: '75%' }, { top: '50%', left: '85%' }, { top: '75%', left: '75%' }
  ];

                                                                       
  const clusterNodes = useMemo(() => {
    if (validEscudos.length === 0) return [];
    return Array.from({ length: 100 }).map((_, i) => {
      const img = validEscudos[i % validEscudos.length];
      
                                                                               
      const leftPos = (visualVariation(i, 1) * 120) - 10; 
      const topPos = (visualVariation(i, 2) * 120) - 10;  
      const zDepth = (visualVariation(i, 3) - 0.5) * 2000;                                      
      
      const isFar = zDepth < -300;
      const blur = isFar ? Math.abs(zDepth + 300) / 120 : 0;
      const brightness = isFar ? 0.3 : (zDepth > 400 ? 1.1 : 0.8);

      return {
        id: i, img,
        left: leftPos,
        top: topPos,
        z: zDepth,
        blur, brightness,
        rotation: (visualVariation(i, 4) - 0.5) * 50
      };
    });
  }, []);

  return (
    <div className="fixed inset-0 z-[9999] bg-[#020202] flex items-center justify-center overflow-hidden font-sans text-white">
      
      <button 
        onClick={onFinalizar}
        className="absolute bottom-8 right-8 z-[10000] text-[#555] hover:text-white font-black text-[10px] uppercase tracking-widest bg-transparent hover:bg-white/10 border border-[#222] hover:border-white/30 px-6 py-3 rounded-full transition-all flex items-center gap-2 group"
      >
        <span className="relative z-10">Omitir Secuencia</span>
        <motion.div animate={{ x: [0, 5, 0] }} transition={{ repeat: Infinity, duration: 1 }} className="relative z-10">&gt;&gt;</motion.div>
      </button>

      <AnimatePresence mode="wait">
        
                                                                                     
                                                 
                                                                                         
        {fase === 0 && (
          <motion.div 
            key="mega-estadio"
            initial={{ opacity: 0, scale: 1.2 }} 
            animate={{ opacity: 1, scale: 1, rotateZ: [-2, 0], y: ['3%', '0%'] }} 
            exit={{ opacity: 0, filter: "blur(20px)", scale: 0.9 }}
            transition={{ duration: 11, ease: "easeOut" }}
            className="absolute inset-0 flex items-center justify-center bg-[#020202] z-30 overflow-hidden"
          >
            <div className="absolute inset-0 bg-[#020202]"></div>

            <div className="relative w-[140vw] max-w-[1800px] aspect-[1.5/1] drop-shadow-[0_0_100px_rgba(0,0,0,1)] flex items-center justify-center">
              
              <svg viewBox="0 0 1600 1000" className="w-full h-full absolute inset-0 z-10" preserveAspectRatio="xMidYMid meet">
                <defs>
                  <pattern id="crowd" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
                    <circle cx="3" cy="3" r="1.5" fill="#FFFFFF" opacity="0.9" />
                    <circle cx="15" cy="8" r="2" fill="#F47A20" opacity="0.8" />
                    <circle cx="8" cy="18" r="1" fill="#8B4513" opacity="0.6" />
                    <circle cx="20" cy="20" r="1.5" fill="#444444" opacity="0.9" />
                  </pattern>

                  <filter id="shadow-pitch" x="-10%" y="-10%" width="120%" height="120%">
                    <feDropShadow dx="0" dy="30" stdDeviation="25" floodColor="#000000" floodOpacity="0.95" />
                  </filter>

                  <filter id="neon-orange" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="8" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>

                <rect width="100%" height="100%" fill="#020202" />

                <rect x="50" y="50" width="1500" height="900" rx="450" fill="#080808" stroke="#111" strokeWidth="8" />
                <rect x="150" y="120" width="1300" height="760" rx="350" fill="#0A0A0A" stroke="#151515" strokeWidth="8" />
                <rect x="250" y="190" width="1100" height="620" rx="250" fill="#0D0D0D" stroke="#1A1A1A" strokeWidth="6" />

                <rect x="50" y="50" width="1500" height="900" rx="450" fill="url(#crowd)" style={{ mixBlendMode: 'screen' }} />

                <g stroke="#050505" strokeWidth="8" opacity="0.85">
                  {stadiumBeams.map((beam, i) => (
                    <line key={`beam-${i}`} x1={beam.x1} y1={beam.y1} x2={beam.x2} y2={beam.y2} />
                  ))}
                </g>

                <rect x="350" y="250" width="900" height="500" rx="40" fill="none" stroke="#000" strokeWidth="50" opacity="0.7" filter="url(#shadow-pitch)" />

                <rect x="380" y="270" width="840" height="460" rx="20" fill="#111111" />

                <g stroke="#444" strokeWidth="3" fill="none" opacity="0.6">
                  <line x1="800" y1="270" x2="800" y2="730" />
                  <circle cx="800" cy="500" r="90" />
                  <circle cx="800" cy="500" r="5" fill="#444" />
                  <path d="M 380 350 A 150 150 0 0 1 380 650" />
                  <path d="M 1220 350 A 150 150 0 0 0 1220 650" />
                  <rect x="370" y="420" width="10" height="160" fill="#FFF" stroke="none" />
                  <rect x="1220" y="420" width="10" height="160" fill="#FFF" stroke="none" />
                </g>

                <rect x="380" y="270" width="840" height="460" rx="20" fill="none" stroke="#F47A20" strokeWidth="12" filter="url(#neon-orange)" />
                <rect x="380" y="270" width="840" height="460" rx="20" fill="none" stroke="#8B4513" strokeWidth="6" />
                <rect x="380" y="270" width="840" height="460" rx="20" fill="none" stroke="#1A1A1A" strokeWidth="2" />
              </svg>

              <div className="absolute left-[2%] top-[5%] bottom-[5%] w-[18%] bg-[#FFFFFF] blur-[100px] opacity-70 mix-blend-overlay z-20 pointer-events-none rounded-full"></div>
              <div className="absolute right-[2%] top-[5%] bottom-[5%] w-[18%] bg-[#FFFFFF] blur-[100px] opacity-70 mix-blend-overlay z-20 pointer-events-none rounded-full"></div>

              <motion.div animate={{ opacity: [0.3, 0.7, 0.3], scale: [1, 1.1, 1] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }} className="absolute left-[3%] top-[40%] w-[250px] h-[350px] bg-[#F47A20] blur-[120px] mix-blend-screen pointer-events-none z-30"></motion.div>
              <motion.div animate={{ opacity: [0.6, 0.2, 0.6], scale: [1.1, 1, 1.1] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }} className="absolute right-[3%] top-[40%] w-[250px] h-[350px] bg-[#F47A20] blur-[120px] mix-blend-screen pointer-events-none z-30"></motion.div>
              
              <motion.div 
                animate={{ x: ['-100vw', '120vw'] }}
                transition={{ duration: 11, ease: "linear" }}
                className="absolute top-0 bottom-0 w-[20vw] bg-white/10 blur-[80px] -skew-x-[45deg] z-40 pointer-events-none"
              ></motion.div>
            </div>
          </motion.div>
        )}

                                                                                     
                                                                            
                                                                                         
        {fase === 1 && (
          <motion.div 
            key="pizarra"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 bg-[#050505]"
            style={{ perspective: "1500px", transformStyle: "preserve-3d" }}
          >
            <motion.div 
              initial={{ rotateX: 60, rotateZ: -20, y: 200, scale: 0.8, opacity: 0 }}
              animate={{ rotateX: 45, rotateZ: 0, y: 0, scale: 1, opacity: 1 }}
              transition={{ duration: 3.5, ease: "easeOut" }}
              className="w-[90vw] max-w-[1200px] h-[65vh] border-4 border-[#F47A20] rounded-[2rem] relative shadow-[0_0_100px_rgba(244,122,32,0.2)] bg-[#F47A20]/[0.03] overflow-hidden"
            >
                                                           
              <svg width="100%" height="100%" className="absolute inset-0 overflow-visible z-10">
                <motion.rect x="5%" y="5%" width="90%" height="90%" rx="20" stroke="#F47A20" strokeWidth="3" fill="none" opacity="0.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 2 }} />
                <motion.line x1="50%" y1="5%" x2="50%" y2="95%" stroke="#F47A20" strokeWidth="3" opacity="0.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.5, delay: 0.5 }} />
                <motion.circle cx="50%" cy="50%" r="12%" stroke="#F47A20" strokeWidth="3" fill="none" opacity="0.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.5, delay: 0.8 }} />
                <motion.path d="M 5% 25% L 20% 25% L 20% 75% L 5% 75%" stroke="#F47A20" strokeWidth="3" fill="none" opacity="0.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1, delay: 1 }} />
                <motion.path d="M 95% 25% L 80% 25% L 80% 75% L 95% 75%" stroke="#F47A20" strokeWidth="3" fill="none" opacity="0.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1, delay: 1 }} />
                
                                            
                <motion.path d="M 10% 50% Q 35% 20% 50% 50% T 85% 50%" stroke="#F47A20" strokeWidth="4" strokeDasharray="10 10" fill="none" initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 0.8 }} transition={{ duration: 2, delay: 2 }} />
              </svg>

              {formacionPizarra.map((pos, i) => (
                <motion.div
                  key={i}
                  initial={{ scale: 0, x: '-50%', y: '-50%', opacity: 0 }} 
                  animate={{ scale: 1, x: '-50%', y: '-50%', opacity: 1 }}
                  transition={{ delay: 1 + (i * 0.15), type: "spring", stiffness: 200, damping: 15 }}
                  className="absolute w-8 h-8 bg-[#040404] border-4 border-[#F47A20] rounded-full shadow-[0_0_20px_#F47A20] flex items-center justify-center z-20"
                  style={{ top: pos.y, left: pos.x }}
                >
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </motion.div>
              ))}

                                                    
              <motion.div 
                initial={{ opacity: 0, scale: 0 }}
                animate={{ 
                  opacity: [1, 1, 1, 1, 0], 
                  scale: [1, 1, 1, 1, 200], 
                  left: ['10%', '50%', '85%', '50%'], 
                  top: ['50%', '50%', '50%', '50%'] 
                }}
                transition={{ duration: 4.5, times: [0, 0.5, 0.8, 1], ease: "easeInOut", delay: 2 }}
                className="absolute w-6 h-6 bg-white rounded-full shadow-[0_0_30px_#FFFFFF] -translate-x-1/2 -translate-y-1/2 z-30"
              />
            </motion.div>
          </motion.div>
        )}

                                                                                     
                                                                        
                                                                                         
        {fase === 2 && (
          <motion.div 
            key="cluster"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 1.5, filter: "blur(10px)" }}
            transition={{ duration: 1.5 }}
            className="absolute inset-0 z-20 overflow-hidden bg-[#020202]"
            style={{ perspective: "1000px" }}
          >
            <motion.div 
              initial={{ z: -800 }}
              animate={{ z: 400 }} 
              transition={{ duration: 10, ease: "linear" }}
              className="absolute inset-0 w-full h-full transform-style-3d"
            >
              {clusterNodes.map((node) => (
                <motion.div
                  key={`cluster-${node.id}`}
                  className="absolute w-16 h-16 md:w-24 md:h-24 transform-style-3d"
                  style={{
                    left: `${node.left}%`,
                    top: `${node.top}%`,
                    transform: `translate(-50%, -50%) translateZ(${node.z}px) rotateZ(${node.rotation}deg)`,
                    filter: `blur(${node.blur}px) brightness(${node.brightness})`,
                    zIndex: Math.round(node.z)
                  }}
                  animate={{ 
                    y: ['-5%', '5%', '-5%'],
                    rotateZ: [node.rotation, node.rotation + 15, node.rotation]
                  }}
                  transition={{ duration: 4 + visualVariation(node.id, 5) * 3, repeat: Infinity, ease: "easeInOut" }}
                >
                  <img src={node.img} alt="Club" className="w-full h-full object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)]" />
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        )}

                                                                                     
                                                                
                                                                                         
        {fase === 3 && (
          <motion.div 
            key="tipografia"
            className="absolute inset-0 flex flex-col items-center justify-center bg-[#020202] z-40"
          >
            <div className="flex flex-col items-center justify-center gap-1 md:gap-3 w-full text-center px-4">
              <div className="overflow-hidden">
                <motion.h1 
                  initial={{ y: "110%" }} animate={{ y: "0%" }} exit={{ opacity: 0 }}
                  transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                  className="text-4xl md:text-7xl lg:text-[100px] font-black uppercase tracking-tighter text-white leading-none"
                >
                  BIENVENIDO
                </motion.h1>
              </div>
              <div className="overflow-hidden">
                <motion.h1 
                  initial={{ y: "110%" }} animate={{ y: "0%" }} exit={{ opacity: 0 }}
                  transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
                  className="text-3xl md:text-5xl lg:text-[70px] font-bold uppercase tracking-tight text-[#666] leading-none"
                >
                  AL MANDO
                </motion.h1>
              </div>
              <motion.div 
                initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 1.2, ease: "circOut", delay: 0.5 }}
                className="w-16 md:w-32 h-[4px] bg-[#F47A20] my-8"
              />
              <div className="overflow-hidden pb-4">
                <motion.h2 
                  initial={{ y: "110%" }} animate={{ y: "0%" }} exit={{ opacity: 0 }}
                  transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.7 }}
                  className="text-5xl md:text-[90px] lg:text-[120px] font-black uppercase italic tracking-tighter text-[#F47A20] leading-none"
                >
                  {apodo}
                </motion.h2>
              </div>
            </div>
          </motion.div>
        )}

        {fase === 4 && (
          <motion.div 
            key="transicion-esquina"
            initial={{ top: '50%', left: '50%', x: '-50%', y: '-50%', position: 'absolute', scale: 1 }}
            animate={{ top: '96px', left: '0%', x: '0%', y: '0%', scale: 1, paddingLeft: window.innerWidth >= 768 ? '3rem' : '1.5rem', width: '100%', maxWidth: '1600px', margin: '0 auto' }}
            transition={{ duration: 1.5, ease: [0.7, 0, 0.3, 1] }}
            className="flex flex-col items-start bg-transparent z-50 w-full h-full pointer-events-none"
          >
            <motion.div animate={{ opacity: 1 }} transition={{ duration: 1 }} className="flex flex-col">
              <h2 className="font-black uppercase tracking-[0.4em] flex items-center gap-2 text-[#888] text-[10px] md:text-[12px] mb-2">
                <ClipboardList size={14} className="text-[#F47A20]" /> FIRMAR CONTRATO
              </h2>
              <h1 className="font-black uppercase italic tracking-tighter text-white leading-none whitespace-nowrap text-4xl md:text-[60px]">
                ELIGE TU DESTINO
              </h1>
            </motion.div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}