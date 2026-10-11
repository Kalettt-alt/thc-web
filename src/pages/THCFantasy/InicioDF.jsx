import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ShieldAlert, Check, X, FileText, Activity, Terminal, Fingerprint } from 'lucide-react';
import logoTHC from './LogoTHC.png';
import { visualVariation } from './visualVariation';

export default function InicioDF({ onComenzar }) {
  const [mostrarTC, setMostrarTC] = useState(false);
  const [noMostrarMas, setNoMostrarMas] = useState(false);
  const [serverTime, setServerTime] = useState('00:00:00:00');

                                                                 
  useEffect(() => {
    const interval = setInterval(() => {
      const d = new Date();
      setServerTime(`${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}:${Math.floor(d.getMilliseconds() / 10).toString().padStart(2, '0')}`);
    }, 47);
    return () => clearInterval(interval);
  }, []);

  const handleIntentarComenzar = () => {
    const yaAcepto = localStorage.getItem('thcFantasyTCAccepted');
    if (yaAcepto === 'true') {
      onComenzar();
    } else {
      setMostrarTC(true);
    }
  };

  const handleAceptarTC = () => {
    if (noMostrarMas) {
      localStorage.setItem('thcFantasyTCAccepted', 'true');
    }
    setMostrarTC(false);
    onComenzar();
  };

  return (
    <div className="min-h-screen bg-[#020202] text-white flex flex-col items-center justify-center relative overflow-hidden font-sans selection:bg-[#F47A20] selection:text-black">

      <div className="absolute inset-0 z-0 flex pointer-events-none opacity-40 mix-blend-screen">
        {Array.from({ length: 30 }).map((_, i) => {
          const curve = Math.sin((i / 29) * Math.PI);
          const baseOpacity = 0.05 + (curve * 0.5);
          return (
            <motion.div key={i} className="flex-1 border-r border-[#F47A20]/5 relative overflow-hidden">
              <motion.div 
                animate={{ y: ['-100%', '200%'] }}
                transition={{ duration: 4 + (visualVariation(i, 1) * 3), repeat: Infinity, ease: "linear", delay: i * 0.1 }}
                className="absolute w-full h-[150%] bg-gradient-to-b from-transparent via-[#F47A20] to-transparent"
                style={{ opacity: baseOpacity, filter: 'blur(15px)' }}
              />
            </motion.div>
          );
        })}
      </div>

                                        
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_50%,transparent_0%,#020202_80%)] z-0 pointer-events-none"></div>
      <motion.div 
        animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.1, 1] }} 
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-[#F47A20] blur-[150px] opacity-20 pointer-events-none z-0 rounded-full mix-blend-screen"
      ></motion.div>

                                              
      <div className="absolute inset-0 z-0 pointer-events-none">
        {Array.from({ length: 20 }).map((_, i) => (
          <motion.div
            key={`part-${i}`}
            animate={{ y: [visualVariation(i, 2) * 1000, -100], opacity: [0, 1, 0] }}
            transition={{ duration: 5 + visualVariation(i, 3) * 10, repeat: Infinity, ease: "linear", delay: visualVariation(i, 4) * 5 }}
            className="absolute w-1 h-1 bg-[#F47A20] rounded-full blur-[1px]"
            style={{ left: `${visualVariation(i, 5) * 100}%` }}
          />
        ))}
      </div>

      <div className="absolute top-6 left-6 w-24 h-24 border-t-2 border-l-2 border-[#F47A20]/30 pointer-events-none z-10"></div>
      <div className="absolute top-6 right-6 w-24 h-24 border-t-2 border-r-2 border-[#F47A20]/30 pointer-events-none z-10"></div>
      <div className="absolute bottom-6 left-6 w-24 h-24 border-b-2 border-l-2 border-[#F47A20]/30 pointer-events-none z-10"></div>
      <div className="absolute bottom-6 right-6 w-24 h-24 border-b-2 border-r-2 border-[#F47A20]/30 pointer-events-none z-10"></div>

      <div className="absolute left-8 top-1/2 -translate-y-1/2 -rotate-90 transform origin-left flex items-center gap-4 text-[#555] font-mono text-[9px] uppercase tracking-[0.4em] pointer-events-none z-10">
        <Activity size={12} className="text-[#F47A20] animate-pulse" />
        <span>CREADOR POR:</span>
        <span className="text-[#333]">|</span>
        <span>! kalet</span>
      </div>
      
      <div className="absolute right-[-140px] top-1/2 -translate-y-1/2 rotate-90 transform origin-left flex items-center gap-4 text-[#555] font-mono text-[9px] uppercase tracking-[0.4em] pointer-events-none z-10">
        <span>HORA THC:</span>
        <span className="text-[#F47A20]">{serverTime}</span>
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }} 
        animate={{ opacity: 1, scale: 1, y: 0 }} 
        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        className="z-20 flex flex-col items-center w-full max-w-5xl px-6 relative"
      >
        <div className="text-center mb-16 flex flex-col items-center relative">
          
          <div className="relative mb-8 group flex items-center justify-center">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 10, repeat: Infinity, ease: "linear" }} className="absolute w-28 h-28 border border-dashed border-[#F47A20]/40 rounded-full"></motion.div>
            <motion.div animate={{ rotate: -360 }} transition={{ duration: 15, repeat: Infinity, ease: "linear" }} className="absolute w-32 h-32 border border-[#F47A20]/20 rounded-full opacity-50"></motion.div>
            <div className="bg-[#0A0A0A] border border-white/10 rounded-full p-4 shadow-[0_0_30px_rgba(244,122,32,0.2)]">
              <img src={logoTHC} alt="THC Logo" className="w-16 h-16 object-contain drop-shadow-[0_0_10px_rgba(244,122,32,0.8)]" />
            </div>
          </div>
          
          <h1 className="text-7xl md:text-[120px] font-black uppercase italic tracking-tighter leading-[0.85] text-white drop-shadow-[0_0_50px_rgba(244,122,32,0.2)] mb-6 flex flex-col">
            <span className="text-[#FFF] relative">
              THC:
              <span className="absolute top-full left-0 w-full opacity-10 blur-[2px] -scale-y-100 bg-gradient-to-t from-white to-transparent bg-clip-text text-transparent pointer-events-none select-none">THC:</span>
            </span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F47A20] via-[#F97316] to-[#EAB308] mt-2 relative">
              DT FANTASY
              <span className="absolute top-full left-0 w-full opacity-10 blur-[2px] -scale-y-100 bg-gradient-to-t from-[#F47A20] to-transparent bg-clip-text text-transparent pointer-events-none select-none">DT FANTASY</span>
            </span>
          </h1>
        </div>

        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleIntentarComenzar}
          className="relative overflow-hidden bg-[#F47A20] text-[#060606] px-16 py-6 rounded-2xl font-black text-2xl md:text-3xl uppercase tracking-widest flex items-center justify-center gap-4 transition-all shadow-[0_0_40px_rgba(244,122,32,0.5)] group"
        >
          <div className="absolute top-0 -left-[100%] w-1/2 h-full bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-[30deg] group-hover:animate-[sweep_1s_ease-in-out_infinite]"></div>
          
          <span className="relative z-10">COMENZAR</span> 
          <ChevronRight size={32} className="relative z-10 group-hover:translate-x-2 transition-transform" />
        </motion.button>
      </motion.div>


      <AnimatePresence>
        {mostrarTC && (
          <motion.div 
            initial={{ opacity: 0, backdropFilter: "blur(0px)" }} 
            animate={{ opacity: 1, backdropFilter: "blur(20px)" }} 
            exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
            className="fixed inset-0 z-[999] bg-[#020202]/80 flex items-center justify-center p-4 md:p-10"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 30, opacity: 0 }} 
              animate={{ scale: 1, y: 0, opacity: 1 }} 
              exit={{ scale: 0.95, y: 30, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-[#0A0A0A] border border-[#F47A20]/30 w-full max-w-4xl rounded-2xl shadow-[0_0_100px_rgba(244,122,32,0.15)] flex flex-col max-h-[90vh] overflow-hidden relative"
            >
                                          
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#F47A20] to-transparent"></div>
              <div className="absolute bottom-0 right-0 w-32 h-32 bg-[#F47A20]/5 blur-3xl rounded-full pointer-events-none"></div>

                                  
              <div className="bg-[#111] px-8 py-6 border-b border-white/5 flex justify-between items-center shrink-0 relative z-10">
                <div className="flex items-center gap-4">
                  <div className="bg-[#F47A20]/10 p-3 rounded-xl border border-[#F47A20]/20 text-[#F47A20]">
                    <ShieldAlert size={28} />
                  </div>
                  <div>
                    <h2 className="text-xl md:text-2xl font-black uppercase tracking-tighter italic text-white leading-none">Acuerdo de Licencia</h2>
                    <span className="text-[#F47A20] font-mono text-[9px] uppercase tracking-widest mt-1 block">Requiere Autorización del Usuario</span>
                  </div>
                </div>
                <button onClick={() => setMostrarTC(false)} className="text-[#555] hover:text-[#F47A20] transition-colors bg-white/5 hover:bg-[#F47A20]/10 p-3 rounded-xl">
                  <X size={20} />
                </button>
              </div>

                                          
              <div className="p-8 md:p-12 overflow-y-auto custom-scrollbar flex-1 space-y-10 relative z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#111] via-[#0A0A0A] to-[#0A0A0A]">
                
                <div>
                  <h3 className="flex items-center gap-3 text-[#F47A20] font-black text-sm md:text-base uppercase tracking-widest mb-4">
                    <Terminal size={18} /> 1. Naturaleza del Entorno
                  </h3>
                  <div className="bg-[#111] border-l-2 border-[#F47A20]/50 p-5 rounded-r-xl">
                    <p className="text-[#999] font-bold text-xs md:text-sm leading-relaxed text-justify">
                      "THC: DT Fantasy" es un entorno cerrado de simulación deportiva y gestión desarrollado exclusivamente para el entretenimiento de la comunidad de Trueno Haxball Community. Los cálculos, el desarrollo de las temporadas, el rendimiento de los jugadores y las tablas de posiciones son procesos puramente estadísticos y matemáticos generados por el algoritmo del sistema. No se garantiza representación fidedigna de la realidad.
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="flex items-center gap-3 text-[#F47A20] font-black text-sm md:text-base uppercase tracking-widest mb-4">
                    <FileText size={18} /> 2. Uso Justo y Parodia
                  </h3>
                  <div className="bg-[#111] border-l-2 border-[#F47A20]/50 p-5 rounded-r-xl">
                    <p className="text-[#999] font-bold text-xs md:text-sm leading-relaxed text-justify">
                      El uso de nombres de clubes, escudos, identidades de Directores Técnicos o nombres de jugadores reales y/o de la comunidad se realiza bajo el marco del "Uso Justo" (Fair Use), con estrictos fines de parodia, homenaje y entretenimiento. THC no posee derechos sobre marcas de terceros ni obtiene lucro comercial de las mismas. Cualquier parecido con situaciones reales en la gestión es pura coincidencia estadística.
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="flex items-center gap-3 text-[#F47A20] font-black text-sm md:text-base uppercase tracking-widest mb-4">
                    <Activity size={18} /> 3. Progreso, Almacenamiento y Sanciones
                  </h3>
                  <div className="bg-[#111] border-l-2 border-[#F47A20]/50 p-5 rounded-r-xl">
                    <p className="text-[#999] font-bold text-xs md:text-sm leading-relaxed text-justify">
                      Tu progreso en el Modo Carrera se sincroniza con la base de datos central de THC. Está terminantemente prohibido alterar parámetros del navegador, inyectar scripts externos, utilizar herramientas de terceros o manipular las transferencias de datos para obtener ventajas tácticas o de puntuación. La detección de cualquier anomalía resultará en la eliminación permanente de tu partida, revocación de títulos obtenidos y la inhabilitación de tu cuenta en el módulo.
                    </p>
                  </div>
                </div>

              </div>

                                          
              <div className="bg-[#050505] border-t border-white/5 p-6 md:p-8 shrink-0 flex flex-col md:flex-row justify-between items-center gap-6 relative z-10">
                
                                           
                <div 
                  onClick={() => setNoMostrarMas(!noMostrarMas)}
                  className="flex items-center gap-4 cursor-pointer group"
                >
                  <div className={`w-6 h-6 rounded-md flex items-center justify-center border transition-all ${noMostrarMas ? 'bg-[#F47A20] border-[#F47A20] text-[#060606]' : 'bg-[#111] border-white/20 text-transparent group-hover:border-[#F47A20]/50'}`}>
                    <Check size={16} strokeWidth={4} />
                  </div>
                  <span className={`font-black text-[10px] md:text-xs uppercase tracking-widest select-none transition-colors ${noMostrarMas ? 'text-white' : 'text-[#666] group-hover:text-white'}`}>
                    No mostrar este aviso de nuevo.<br/><span className="text-[#444] text-[9px]">Al darle click y iniciar, ya no se mostrará estos TyC.</span>
                  </span>
                </div>

                                     
                <button 
                  onClick={handleAceptarTC}
                  className="w-full md:w-auto bg-[#F47A20] text-[#060606] px-10 py-5 rounded-xl font-black text-sm md:text-base uppercase tracking-widest hover:bg-white transition-all shadow-[0_0_20px_rgba(244,122,32,0.3)] hover:shadow-[0_0_30px_rgba(255,255,255,0.4)] flex items-center justify-center gap-3"
                >
                  <Fingerprint size={20} /> Aceptar y Entrar
                </button>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes sweep {
          0% { left: -100%; }
          50% { left: 200%; }
          100% { left: 200%; }
        }
      `}</style>
    </div>
  );
}
