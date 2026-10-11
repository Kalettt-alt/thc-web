import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const CONSEJOS = [
  "Consejo: La ropa muy usada sirve para dormir, pero para salir da vergüenza.",
  "Consejo: No te rindas, inalcanzable era la luna y con un poco de plata la terminaron pisando.",
  "Dato: Para qué gastar tiempo moviendo el árbol para que caigan frutas verdes cuando las maduras caen solas.",
  "Consejo: Aprendé matemáticas, para que sumen las ganas, dividan las piernas, eches el resultado afuera y no se multiplique.",
  "Consejo: No te dejes llevar por lo que digan tus amigos, cogiendo feas cualquiera es mujeriego.",
  "Dato: No porque acaricie una perrita callejera significa que ya no ame a la de la casa.",
  "Dato: Solo se baja en partidos oficiales, en amistosos todo arriba.",
  "Dato: Cuando ves una cucaracha, no miras si es linda o fea. Solo la pisas.",
  "Consejo: Cuando clavas bien la estaca, no se va la vaca.",
  "Consejo: Juega siempre de local. Ya conoces bien la cancha, hueles el pasto y sabes exactamente dónde están los huecos.",
  "Dato: Los amistosos sirven para probar posiciones nuevas, pero en la gran final siempre vas a lo seguro para no perder.",
  "Consejo: No le pegues con desesperación; si la tocas suavecito y con paciencia, ella sola se acomoda para el remate.",
  "Consejo: Si vas a entrar por atrás, que sea con mucho tacto. Si vas con todo sin avisar, te van a sacar la roja directa.",
  "Dato: El que no calienta bien antes de entrar a la cancha, a los dos minutos ya no da más, se acalambra y pide su cambio.",
  "Consejo: Por más cerrada que esté la defensa, si la sabes mover con ritmo, siempre vas a terminar encontrando el hueco para meterla.",
  "Dato: El buen arquero sabe que las mejores pelotas no se rechazan a lo loco, se agarran bien firme con las dos manos.",
  "Consejo: No celebres solo por aguantar el primer tiempo; los verdaderos cracks son los que tienen físico para rendir hasta en el alargue.",
  "Dato: Jugar con la cancha mojada es peligroso, pero si tienes buenos toperoles, es cuando más rápido resbala la pelota.",
  "Consejo: A veces no hace falta meter un pelotazo potente; un buen globito sutil te deja solo frente al arco."
];

export default function CargaPartido({ onComplete }) {
  const [idxConsejo, setIdxConsejo] = useState(() => Math.floor(Math.random() * CONSEJOS.length));
  const [progreso, setProgreso] = useState(0);
  const [isFading, setIsFading] = useState(false);
  const completeRef = useRef(onComplete);
  useEffect(() => { completeRef.current = onComplete; }, [onComplete]);

  useEffect(() => {
    const duracionTotal = 10000; 
    const intervaloProgreso = 50; 
    const pasos = duracionTotal / intervaloProgreso;
    let pasoActual = 0;
    let completionTimer;

    const timerProgreso = setInterval(() => {
      pasoActual++;
      setProgreso((pasoActual / pasos) * 100);
      
      if (pasoActual >= pasos) {
        clearInterval(timerProgreso);
        setIsFading(true); 
        completionTimer = setTimeout(() => {
            completeRef.current(); 
        }, 800); 
      }
    }, intervaloProgreso);

    const timerConsejos = setInterval(() => {
      setIdxConsejo(prev => (prev + 1) % CONSEJOS.length);
    }, 3300);

    return () => {
      clearInterval(timerProgreso);
      clearInterval(timerConsejos);
      clearTimeout(completionTimer);
    };
  }, []); 

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed inset-0 z-[9999] bg-[#050505] font-sans text-white overflow-hidden flex flex-col pointer-events-auto"
    >
      <motion.div 
        animate={{ opacity: isFading ? 1 : 0 }} 
        transition={{ duration: 0.5, ease: "easeInOut" }} 
        className="absolute inset-0 bg-[#030303] z-50 pointer-events-none"
      />

      <div className="absolute inset-0 pointer-events-none">
        <img src="/imagenes/FondoInicio.jpg" className="w-full h-full object-cover opacity-20 scale-105 mix-blend-luminosity" alt="Background" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#030406] via-[#030406]/95 to-transparent"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 mix-blend-overlay"></div>
      </div>

      <div className="relative z-10 flex-1 flex flex-col justify-center px-12 md:px-24 w-full md:w-2/3">
        <motion.div initial={{ x: -30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.2, duration: 0.6 }}>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-[#F97316] font-black uppercase tracking-[0.3em] text-[10px]">Preparando Entorno</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter drop-shadow-2xl leading-[0.9]">
            Iniciando<br/>Partido<span className="text-[#F97316] animate-pulse">...</span>
          </h1>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6, duration: 0.8 }} 
          className="mt-10 border-l-[3px] border-[#F97316] pl-5 max-w-xl h-[80px] flex items-center relative"
        >
          <AnimatePresence mode="wait">
            <motion.p 
              key={idxConsejo}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
              className="text-white/80 font-bold text-sm md:text-base leading-relaxed absolute"
            >
              {CONSEJOS[idxConsejo]}
            </motion.p>
          </AnimatePresence>
        </motion.div>
      </div>

      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }} className="absolute bottom-10 left-12 z-20 flex items-center gap-4">
        <div className="bg-[#111] p-2.5 rounded-full border border-white/10 shadow-lg">
          <img src="/imagenes/LogoTHC.png" className="w-8 h-8 object-contain opacity-80" alt="Logo THC" />
        </div>
        <div className="flex flex-col">
          <span className="font-black uppercase tracking-[0.2em] text-white text-[11px] leading-tight">Trueno Haxball</span>
          <span className="font-black uppercase tracking-[0.3em] text-[#F97316] text-[8px] leading-tight">Community</span>
        </div>
      </motion.div>

      <div className="absolute bottom-0 left-0 w-full h-1.5 bg-white/5 z-20">
        <div className="h-full bg-[#F97316] shadow-[0_0_15px_#F97316] transition-all duration-75 ease-linear" style={{ width: `${progreso}%` }}></div>
      </div>
      
    </motion.div>
  );
}