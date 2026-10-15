import { useState, useRef } from 'react';
import toast from 'react-hot-toast';
import { buildStarterSquad } from './utValidation';
import { saveUtSquad } from './squadPersistenceUT';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ArrowLeft, ShieldCheck, Zap } from 'lucide-react';
import { supabase } from '../../utils/supabase';

import SobresUT from './SobresUT';
import MenuUT from './MenuUT';
import TeamUT from './TeamUT';

export default function InstruccionUT({ onComplete, clubData = null }) {
  const [dialogoIdx, setDialogoIdx] = useState(0);
  const [showSobres, setShowSobres] = useState(false);
  const [isBuilding, setIsBuilding] = useState(false);
  const [receivedPlayers, setReceivedPlayers] = useState([]);
  const saveLock = useRef(false);
  const [bgMode, setBgMode] = useState('menu'); 
  const [tutorialPlantilla, setTutorialPlantilla] = useState({ titulares: [], suplentes: [], reservas: [], formacion: '4-3-3' });

  const dialogos = [
    { titulo: 'DIRECTIVA THC', texto: '¡Bienvenido a THC: Ultimate Team, Mánager! He sido asignado por la junta directiva para guiarte en tus primeros pasos.', accion: 'siguiente', fondo: 'menu' },
    { titulo: 'ECONOMÍA DEL CLUB', texto: 'Los fondos de tu club se sincronizan con el servidor. Consulta tu saldo en el menú y úsalos más adelante en la Tienda.', accion: 'siguiente', fondo: 'menu' },
    { titulo: 'TU PRIMER SOBRE', texto: 'La liga te ha otorgado un Paquete Inicial. ¡Ábrelo ahora para descubrir a los 23 jugadores que defenderán tu escudo!', accion: 'abrir_sobre', fondo: 'menu' },
    { titulo: 'PLANTILLA RECIBIDA', texto: '¡Excelente! Tienes desde promesas de bronce hasta referentes de oro. Vamos al apartado "Mi Equipo" para organizarlos.', accion: 'ir_equipo', fondo: 'menu' },
    { titulo: 'GESTIÓN DE PLANTILLA', texto: 'Este es tu vestuario. Como ves, las posiciones están vacías. Un auténtico desastre.', accion: 'siguiente', fondo: 'team' },
    { titulo: 'ARMADO AUTOMÁTICO', texto: 'Acomodar a 23 jugadores toma tiempo. Deja que el cuerpo técnico estructure el mejor 11 inicial basado en posiciones y química.', accion: 'armar_equipo', fondo: 'team' },
    { titulo: '¡TODO LISTO!', texto: 'Tu plantilla ha sido estructurada y guardada en la base de datos. ¡Ya estás listo para hacer historia! Usa el botón superior.', accion: 'finalizar', fondo: 'team' }
  ];

  const currentDialogo = dialogos[dialogoIdx];

  const handleNextDialogo = () => {
    if (dialogoIdx < dialogos.length - 1) {
      const nextIdx = dialogoIdx + 1;
      setDialogoIdx(nextIdx);
      if (dialogos[nextIdx].fondo === 'team') setBgMode('team');
    }
  };

  const handlePackOpened = players => {
    setReceivedPlayers(players);
    setShowSobres(false);
    handleNextDialogo(); 
  };

  const armarEquipoAutomatico = async () => {
    if (saveLock.current) return;
    saveLock.current = true;
    setIsBuilding(true);
    const toastId = toast.loading('Guardando tu plantilla...');
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error('Tu sesión expiró. Inicia sesión de nuevo.');

      if (receivedPlayers.length !== 23) throw new Error('Primero confirma la apertura de tu sobre inicial.');
      const { titulares, suplentes, reservas } = buildStarterSquad(receivedPlayers);

      const nuevaPlantilla = { 
        user_id: user.id,
        formacion: '4-3-3', 
        titulares, 
        suplentes, 
        reservas 
      };

                                                                                                 
      const saved = await saveUtSquad(supabase, nuevaPlantilla, user.id);
      setTutorialPlantilla(saved);
      toast.success('Plantilla guardada.', { id: toastId });
      
      handleNextDialogo(); 
    } catch (err) { 
      console.error("Error al guardar plantilla:", err);
      toast.error(err instanceof Error ? err.message : "No se pudo guardar la plantilla. Vuelve a intentarlo.", { id: toastId }); 
    } finally { 
      saveLock.current = false;
      setIsBuilding(false); 
    }
  };

  if (showSobres) {
    return <SobresUT onVolver={() => {}} isTutorial={true} onTutorialComplete={handlePackOpened} />;
  }


  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-hidden bg-black">
      
      <div className="absolute inset-0 z-0 pointer-events-none">
        <AnimatePresence mode="wait">
          {bgMode === 'menu' && (
            <motion.div key="bg-menu" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <MenuUT tutorialData={tutorialPlantilla} initialClubData={clubData} onVolver={() => {}} />
            </motion.div>
          )}
          {bgMode === 'team' && (
            <motion.div key="bg-team" initial={{ opacity: 0, scale: 1.05 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1 }}>
              <TeamUT tutorialData={tutorialPlantilla} clubData={clubData} onVolver={() => {}} />
            </motion.div>
          )}
        </AnimatePresence>
        
        <div className="absolute inset-x-0 bottom-0 h-[45vh] bg-gradient-to-t from-black via-black/90 to-transparent"></div>
      </div>

      <AnimatePresence>
        {currentDialogo.accion === 'finalizar' && (
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="absolute top-6 left-6 md:top-10 md:left-10 z-[9999] pointer-events-auto">
            <button onClick={onComplete} className="flex items-center gap-3 bg-white text-black px-6 py-3 rounded-lg font-black uppercase tracking-widest text-[10px] md:text-xs shadow-[0_10px_30px_rgba(255,255,255,0.4)] hover:bg-[#F97316] transition-colors outline-none group">
              <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> 
              IR AL MENÚ PRINCIPAL
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div 
        key={dialogoIdx} initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }}
        className="relative z-50 w-full max-w-4xl bg-[#0A0A0A]/95 backdrop-blur-xl border-t border-x border-white/10 rounded-t-[2rem] p-8 md:p-12 pb-12 shadow-[0_-20px_60px_rgba(0,0,0,0.9)] pointer-events-auto"
      >
        <span className="text-[#F97316] font-black uppercase tracking-[0.4em] text-[10px] md:text-xs mb-3 block drop-shadow-md">
          {currentDialogo.titulo}
        </span>
        
        <p className="text-white text-lg md:text-2xl font-bold leading-relaxed tracking-wide min-h-[80px]">
          "{currentDialogo.texto}"
        </p>

        <div className="mt-8 flex justify-end">
          {currentDialogo.accion === 'siguiente' && (
            <button onClick={handleNextDialogo} className="flex items-center gap-2 text-white/50 hover:text-white font-black uppercase tracking-[0.2em] text-xs transition-colors group outline-none">
              CONTINUAR <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
          )}

          {currentDialogo.accion === 'abrir_sobre' && (
            <button onClick={() => setShowSobres(true)} className="flex items-center gap-3 bg-[#F97316] text-[#050505] px-8 py-4 rounded font-black uppercase tracking-[0.2em] text-xs shadow-[0_10px_30px_rgba(249,115,22,0.4)] hover:bg-white transition-all outline-none animate-bounce">
              <ShieldCheck size={18} /> ABRIR PAQUETE INICIAL
            </button>
          )}

          {currentDialogo.accion === 'ir_equipo' && (
            <button onClick={handleNextDialogo} className="flex items-center gap-3 bg-white text-[#050505] px-8 py-4 rounded font-black uppercase tracking-[0.2em] text-xs shadow-[0_10px_30px_rgba(255,255,255,0.4)] hover:bg-[#F97316] transition-all outline-none">
              IR A MI EQUIPO <ChevronRight size={18} />
            </button>
          )}

          {currentDialogo.accion === 'armar_equipo' && (
            <button onClick={armarEquipoAutomatico} disabled={isBuilding} className="flex items-center gap-3 bg-white text-[#050505] px-8 py-4 rounded font-black uppercase tracking-[0.2em] text-xs shadow-[0_10px_30px_rgba(255,255,255,0.4)] hover:bg-[#F97316] transition-all outline-none disabled:opacity-50">
              {isBuilding ? 'GUARDANDO PLANTILLA...' : <><Zap size={18} /> ARMAR EQUIPO IDEAL</>}
            </button>
          )}

          {currentDialogo.accion === 'finalizar' && (
            <span className="text-[#F97316] text-[10px] font-black uppercase tracking-widest animate-pulse">
              ESPERANDO ACCIÓN DEL MÁNAGER...
            </span>
          )}
        </div>
      </motion.div>
    </div>
  );
}
