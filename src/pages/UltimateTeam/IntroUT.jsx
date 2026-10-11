import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SkipForward } from 'lucide-react';
import videoIntro from './VideoUT.mp4'; 

export default function IntroUT({ onComplete }) {
                                                                   
  const [phase, setPhase] = useState('video'); 
  const [loadTime, setLoadTime] = useState(4000);
  const [loadingText, setLoadingText] = useState('TU CLUB. TU HISTORIA.');
  const videoRef = useRef(null);

  const handleSkip = () => { if (phase === 'video') iniciarCarga(); };
  const handleVideoEnd = () => { if (phase === 'video') iniciarCarga(); };

  const iniciarCarga = () => {
                                                                
    const durations = [1800, 2200, 2600];
    setLoadTime(durations[Math.floor(Math.random() * durations.length)]);
    setPhase('loading');
  };

                                                                        
  useEffect(() => {
    if (phase === 'loading') {
      const texts = [
        'TU CLUB. TU HISTORIA.',
        'EL ONCE QUE TE REPRESENTA.',
        'BIENVENIDO A ULTIMATE TEAM.'
      ];
      let textIdx = 0;
      const stepTime = loadTime / texts.length;

      const textInterval = setInterval(() => {
        textIdx = (textIdx + 1) % texts.length;
        setLoadingText(texts[textIdx]);
      }, stepTime);

                                                                               
      const timer = setTimeout(() => {
        clearInterval(textInterval);
        setPhase('ready');
      }, loadTime);

      return () => { clearTimeout(timer); clearInterval(textInterval); };
    }
  }, [phase, loadTime]);

                                                               
  useEffect(() => {
    if (phase === 'ready') {
                                                                                          
      const finalTimer = setTimeout(() => {
        onComplete();
      }, 700);
      return () => clearTimeout(finalTimer);
    }
  }, [phase, onComplete]);

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.6 }} 
      className="fixed inset-0 z-[999] bg-[#020100] flex items-center justify-center overflow-hidden"
    >
      <AnimatePresence mode="wait">
        
                                                      
                                       
                                                      
        {phase === 'video' && (
          <motion.div key="video-phase" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, filter: 'blur(10px)' }} transition={{ duration: 0.6 }} className="absolute inset-0 w-full h-full bg-black">
            <video ref={videoRef} src={videoIntro} autoPlay playsInline onEnded={handleVideoEnd} onError={handleVideoEnd} className="w-full h-full object-cover" />
            <button onClick={handleSkip} className="absolute bottom-8 right-8 md:bottom-12 md:right-12 flex items-center gap-3 text-white/50 hover:text-white uppercase tracking-[0.3em] font-black text-[10px] md:text-xs transition-colors z-[200] group outline-none bg-black/60 px-6 py-3 rounded border border-white/10 backdrop-blur-md">
              SALTAR INTRO <SkipForward size={14} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.div>
        )}

                                                      
                                                       
                                                      
        {(phase === 'loading' || phase === 'ready') && (
          <motion.div key="loading-phase" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.8 }} className="absolute inset-0 w-full h-full flex flex-col items-center justify-center bg-[#050505]">
            
                                                                                
            <motion.div 
              animate={{ opacity: phase === 'ready' ? 0.4 : 0.1 }}
              transition={{ duration: 0.8, ease: "easeInOut" }}
              className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(249,115,22,0.15)_0%,_transparent_50%)] z-0"
            ></motion.div>

                                        
            <motion.div 
              className="relative z-10 flex items-center justify-center"
              animate={
                phase === 'ready' 
                  ? { scale: [1, 1.3, 1], filter: ['brightness(1)', 'brightness(1.5)', 'brightness(1)'] } 
                  : { scale: [1, 1.05, 1], filter: ['brightness(0.8)', 'brightness(1)', 'brightness(0.8)'] }
              }
              transition={
                phase === 'ready'
                  ? { duration: 1, ease: "backOut" }                        
                  : { duration: 2, repeat: Infinity, ease: "easeInOut" }                                      
              }
            >
                                                                    
              <motion.div 
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: phase === 'ready' ? 0.6 : 0, scale: phase === 'ready' ? 2 : 1 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="absolute inset-0 bg-[#F97316] blur-[60px] rounded-full z-0"
              ></motion.div>

              <img src="/imagenes/LogoTHC.png" alt="THC Logo" className="w-24 h-24 md:w-32 md:h-32 object-contain relative z-20 drop-shadow-[0_0_15px_rgba(249,115,22,0.4)]" />
            </motion.div>

            <p className="relative z-10 mt-6 text-xl md:text-3xl font-black italic tracking-tight text-white">THC: <span className="text-[#F97316]">ULTIMATE TEAM</span></p>

                                                                               
            <AnimatePresence>
              {phase === 'loading' && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10, filter: 'blur(5px)' }}
                  transition={{ duration: 0.5 }}
                  className="absolute bottom-20 w-full flex flex-col items-center z-10"
                >
                  <span className="text-[#F97316] text-xs md:text-sm font-bold uppercase tracking-[0.08em] mb-4 text-center px-5">
                    {loadingText}
                  </span>
                  
                                                                                          
                  <div className="w-[200px] md:w-[300px] h-[2px] bg-white/5 overflow-hidden rounded-full relative">
                    <motion.div
                      initial={{ width: "0%" }}
                      animate={{ width: "100%" }}
                      transition={{ duration: loadTime / 1000, ease: "linear" }} 
                      className="absolute left-0 top-0 h-full bg-[#F97316] shadow-[0_0_15px_#F97316]"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            
          </motion.div>
        )}

      </AnimatePresence>
    </motion.div>
  );
}
