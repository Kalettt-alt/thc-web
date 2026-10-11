import { useState, useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { RUTAS } from '../../utils/rutas';
import { supabase } from '../../utils/supabase'; 
import { Check, ArrowLeft } from 'lucide-react'; 
import InstruccionUT from './InstruccionUT';
import IntroUT from './IntroUT';
import MenuUT from './MenuUT';
import SkillGame from './SkillMode/SkillGame'; 
import CrearEquipoUT from './CrearEquipoUT'; 
import Aurora from '../../components/Aurora'; 
import { CLUB_IDENTITY_COLUMNS } from './clubIdentityUT';

                                             
                              
                                             
const LandingUT = ({ onJugar, onVolver }) => {
  const [phase, setPhase] = useState('idle');
  const entryLock = useRef(false);
  const timers = useRef([]); 

  const handleEnter = useCallback(() => {
    if (phase !== 'idle' || entryLock.current) return;
    entryLock.current = true;
    setPhase('loading');
    timers.current.push(setTimeout(() => {
      setPhase('centering');
      timers.current.push(setTimeout(async () => {
        if (await onJugar() === false) { entryLock.current = false; setPhase('idle'); }
      }, 2000));
    }, 2000));
  }, [phase, onJugar]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  useEffect(() => {
    const handleKeyDown = () => handleEnter();
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleEnter]);

  return (
    <motion.div 
      onClick={handleEnter}
      animate={{ backgroundColor: phase === 'centering' ? '#000000' : '#050200' }}
      exit={{ opacity: 0, transition: { duration: 0.5 } }}
      transition={{ duration: 0.8, ease: "easeInOut" }}
      className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden cursor-pointer"
    >
      <motion.div animate={{ opacity: phase === 'centering' ? 0 : 1 }} transition={{ duration: 0.5 }} className="absolute inset-0 z-0 pointer-events-none">
        <Aurora colorStops={["#4a1500", "#ea580c", "#f97316"]} amplitude={1.8} blend={1.2} />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_10%,_#050200_100%)] opacity-60"></div>
      </motion.div>

      <motion.div 
        animate={{ opacity: phase === 'centering' ? 0 : 1 }} 
        transition={{ duration: 0.3 }}
        className="absolute top-8 left-8 md:top-12 md:left-12 z-50"
      >
        <button 
          onClick={(e) => { e.stopPropagation(); onVolver(); }} 
          className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/30 hover:text-white transition-colors outline-none"
        >
          <ArrowLeft size={14} /> VOLVER AL INICIO
        </button>
      </motion.div>

      <div className="z-10 flex items-center justify-center w-full pointer-events-none">
        <motion.div layout className="flex items-center justify-center gap-6 md:gap-10">
          <motion.div layout className="relative flex items-center justify-center">
            <motion.div animate={{ opacity: phase === 'centering' ? 0 : 0.6 }} transition={{ duration: 0.5 }} className="absolute inset-0 bg-[#F97316] blur-[80px] rounded-full animate-pulse scale-150"></motion.div>
            <motion.img layout animate={{ scale: phase === 'centering' ? 1.4 : 1 }} transition={{ duration: 1, ease: "easeInOut" }} src="/imagenes/LogoTHC.png" alt="Logo THC" className="w-28 h-28 md:w-40 md:h-40 object-contain relative z-10" />
          </motion.div>
          <AnimatePresence>
            {phase !== 'centering' && (
              <motion.div layout initial={{ opacity: 1, width: 'auto', filter: 'blur(0px)' }} exit={{ opacity: 0, width: 0, filter: 'blur(10px)' }} transition={{ duration: 0.8, ease: "easeInOut" }} className="flex flex-col items-start justify-center mt-2 overflow-hidden whitespace-nowrap">
                <h1 className="text-7xl md:text-[9rem] font-black uppercase italic tracking-tighter text-white leading-none drop-shadow-2xl">
                  THC: <span className="text-[#F97316]">UT</span>
                </h1>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      <motion.div animate={{ opacity: phase === 'centering' ? 0 : 1 }} transition={{ duration: 0.4 }} className="absolute bottom-16 z-20 pointer-events-none w-full flex justify-center">
        <AnimatePresence mode="wait">
          {phase === 'idle' && (
            <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <span className="text-white/50 text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em] animate-pulse drop-shadow-md">Presiona cualquier tecla</span>
            </motion.div>
          )}
          {phase === 'loading' && (
            <motion.div key="loading" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <div className="w-6 h-6 border-[3px] border-white/10 border-t-[#F97316] rounded-full animate-spin shadow-[0_0_15px_rgba(249,115,22,0.5)]"></div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
};


                                             
                                   
                                             
const RegistroUT = ({ onConfirm, onVolver }) => {
  const [accepted, setAccepted] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const registerLock = useRef(false);

  const handleFundarClub = async () => {
    if (!accepted || registerLock.current) return;
    registerLock.current = true;
    setIsRegistering(true);
    const toastId = toast.loading('Registrando tu club...');
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error('Inicia sesión para registrar tu club.');
      const initialized = await supabase.rpc('thc_ut_initialize');
      if (initialized.error?.code === 'PGRST202') {
        const { data, error } = await supabase.from('perfiles_ut').insert([{ user_id: user.id }]).select('user_id').single();
        if (error) {
          if (error.code !== '23505') throw error;
          const existing = await supabase.from('perfiles_ut').select('user_id').eq('user_id', user.id).single();
          if (existing.error || !existing.data) throw error;
        } else if (!data) throw new Error('No se pudo confirmar el registro.');
      } else {
        if (initialized.error) throw initialized.error;
        if (initialized.data !== user.id) throw new Error('No se pudo confirmar el registro.');
      }
      toast.success('Club registrado.', { id: toastId });
      onConfirm();
    } catch (error) {
      console.error('Error registrando club:', error);
      toast.error(error instanceof Error ? error.message : 'No se pudo registrar el club. Vuelve a intentarlo.', { id: toastId });
    } finally {
      registerLock.current = false;
      setIsRegistering(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-[#050505] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(249,115,22,0.05)_0%,_#050505_100%)] pointer-events-none"></div>

      <div className="absolute top-8 left-8 md:top-12 md:left-12 z-50">
        <button 
          onClick={onVolver} 
          className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/30 hover:text-white transition-colors outline-none"
        >
          <ArrowLeft size={14} /> CANCELAR REGISTRO
        </button>
      </div>

      <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-[#0A0A0A] border border-white/5 p-8 md:p-12 rounded-2xl max-w-4xl w-full shadow-[0_30px_80px_rgba(0,0,0,0.9)] relative z-10 flex flex-col max-h-[90vh] mt-10">
        
        <div className="flex items-center gap-4 mb-8 border-b border-white/5 pb-6 shrink-0">
          <img src="/imagenes/LogoTHC.png" className="w-12 h-12 md:w-16 md:h-16 drop-shadow-[0_0_15px_rgba(249,115,22,0.5)]" alt="Logo" />
          <div>
            <h2 className="text-3xl md:text-4xl font-black italic uppercase tracking-tighter text-white leading-none">Acuerdo de Usuario</h2>
            <span className="text-[#F97316] text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em]">Términos y Condiciones del Servicio Limitado</span>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-4 space-y-6 text-white/60 text-xs md:text-[13px] font-medium leading-relaxed">
          <p>Bienvenido a <strong>THC: Ultimate Team</strong>. El acceso y uso de este entorno competitivo está sujeto a la aceptación incondicional de los siguientes lineamientos operativos y legales:</p>
          
          <div className="bg-[#111] p-6 rounded-xl border border-white/5 space-y-5">
            <div>
              <h4 className="text-white font-black uppercase tracking-widest text-[11px] mb-1">1. Almacenamiento de Datos y Progreso</h4>
              <p className="text-[11px]">Al proceder, autorizas la creación de tu club en nuestros servidores seguros. Tu información de progreso, configuraciones, alineaciones y activos virtuales serán sincronizados de forma continua. La plataforma se reserva el derecho de restablecer, revertir o modificar los datos en caso de mantenimiento, fallos críticos o compromisos de seguridad.</p>
            </div>
            <div>
              <h4 className="text-white font-black uppercase tracking-widest text-[11px] mb-1">2. Bienes Virtuales y Economía</h4>
              <p className="text-[11px]">Las monedas virtuales (UT Coins), sobres, cartas de jugadores y cualquier otro artículo digital obtenido dentro de la plataforma <strong>carecen de valor monetario real</strong>. Estos activos no pueden ser canjeados, vendidos ni transferidos fuera del ecosistema del juego bajo ninguna circunstancia. La administración no se hace responsable por pérdidas de bienes virtuales ocasionadas por el usuario.</p>
            </div>
            <div>
              <h4 className="text-white font-black uppercase tracking-widest text-[11px] mb-1">3. Reglamento de Competencia (Fair Play)</h4>
              <p className="text-[11px]">Se exige un comportamiento ético. Queda terminantemente prohibido el uso de software de terceros, la inyección de código, la explotación maliciosa de errores (bugs), la manipulación del mercado o la creación de múltiples cuentas para beneficio ilícito. Cualquier infracción comprobada resultará en la suspensión permanente e inapelable de la comunidad.</p>
            </div>
            <div>
              <h4 className="text-[#F97316] font-black uppercase tracking-widest text-[11px] mb-1">4. Aviso Legal sobre Contenido Multimedia</h4>
              <p className="text-[11px]">El módulo de "Música" integrado opera estrictamente a través de la API oficial (Iframes) de proveedores externos (ej. YouTube). THC no aloja, descarga, distribuye ni monetiza material protegido por derechos de autor. Todo el contenido auditivo o audiovisual reproducido es responsabilidad exclusiva de sus respectivos emisores en la plataforma de origen.</p>
            </div>
          </div>
        </div>

        <div 
          onClick={() => setAccepted(!accepted)}
          className="mt-8 pt-6 border-t border-white/5 shrink-0 flex items-start gap-4 cursor-pointer group select-none"
        >
          <div className={`w-6 h-6 rounded flex items-center justify-center shrink-0 border transition-colors mt-0.5 ${accepted ? 'bg-[#F97316] border-[#F97316]' : 'bg-[#111] border-white/20 group-hover:border-white/40'}`}>
            {accepted && <Check size={14} className="text-black" />}
          </div>
          <span className="text-white/70 text-[10px] md:text-[11px] font-bold uppercase tracking-widest leading-relaxed">
            He leído y comprendido íntegramente los Acuerdos de Usuario. Acepto someterme a las reglas de Fair Play, el manejo de bienes virtuales y las políticas de contenido multimedia.
          </span>
        </div>

        <button 
          onClick={handleFundarClub}
          disabled={!accepted || isRegistering}
          className="w-full mt-6 bg-white text-[#050505] py-4 rounded font-black uppercase tracking-[0.2em] text-xs transition-all disabled:opacity-30 disabled:hover:bg-white hover:bg-[#F97316] hover:shadow-[0_0_20px_rgba(249,115,22,0.4)]"
        >
          {isRegistering ? 'CREANDO REGISTRO...' : 'ACEPTAR Y CONTINUAR'}
        </button>

      </motion.div>
    </motion.div>
  );
};

export default function UltimateTeam() {
  const [fase, setFase] = useState('landing');
  const [nextAfterIntro, setNextAfterIntro] = useState('menu');
  const [clubData, setClubData] = useState(null);
  const statusLock = useRef(false);
  const navigate = useNavigate();

  const handleSalir = () => navigate(RUTAS.INICIO);

  const checkUserStatus = async () => {
    if (statusLock.current) return false;
    statusLock.current = true;
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error('Inicia sesión con Discord para entrar a Ultimate Team.');
      const [profile, team, squad] = await Promise.all([
        supabase.from('perfiles_ut').select('user_id').eq('user_id', user.id).maybeSingle(),
        supabase.from('equipos_ut').select(CLUB_IDENTITY_COLUMNS).eq('user_id', user.id).maybeSingle(),
        supabase.from('plantillas_ut').select('user_id').eq('user_id', user.id).maybeSingle()
      ]);
      for (const result of [profile, team, squad]) if (result.error) throw result.error;
      setClubData(team.data || null);
      setNextAfterIntro(!team.data ? 'crear_equipo' : !squad.data ? 'instruccion' : 'menu');
      setFase(profile.data ? 'animacion' : 'registro');
      return true;
    } catch (error) {
      console.error('Error cargando Ultimate Team:', error);
      toast.error(error instanceof Error ? error.message : 'No se pudo cargar tu club. Comprueba tu conexión y vuelve a intentarlo.');
      return false;
    } finally {
      statusLock.current = false;
    }
  };

  const handleIntroComplete = () => setFase(nextAfterIntro);

  return (
    <AnimatePresence mode="wait">
      {fase === 'landing' && <LandingUT key="landing" onJugar={checkUserStatus} onVolver={handleSalir} />}
      {fase === 'registro' && <RegistroUT key="registro" onConfirm={() => setFase('animacion')} onVolver={handleSalir} />}
      {fase === 'animacion' && <IntroUT key="animacion" onComplete={handleIntroComplete} />}
      {fase === 'crear_equipo' && <CrearEquipoUT key="crear_equipo" onComplete={club => { setClubData(club); setFase('instruccion'); }} />}
      {fase === 'instruccion' && <InstruccionUT key="instruccion" clubData={clubData} onComplete={() => setFase('menu')} />}
      {fase === 'menu' && <MenuUT key="menu" initialClubData={clubData} onVolver={handleSalir} onPlaySkill={() => setFase('skill')} />}
      {fase === 'skill' && <SkillGame key="skill" onVolver={() => setFase('menu')} />}
    </AnimatePresence>
  );
}
