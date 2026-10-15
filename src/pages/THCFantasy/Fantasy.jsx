import { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabase';
import { validateFantasySave } from './fantasyValidation';

import InicioDF from './InicioDF';
import IntroDF from './IntroDF';
import SeleccionClubDF from './SeleccionClubDF';
import FirmaContratoDF from './FirmaContratoDF';
import MenuDF from './MenuDF';

export default function Fantasy({ session }) {
  return <FantasyCareer key={session?.user?.id || 'guest'} session={session} />;
}

function FantasyCareer({ session }) {
  const userId = session?.user?.id;
  const [fase, setFase] = useState('inicio'); 
  const [apodo, setApodo] = useState('MÁNAGER');
  const [miClub, setMiClub] = useState(null);
  const [partidaGuardada, setPartidaGuardada] = useState(null);
  const [cargando, setCargando] = useState(Boolean(userId));
  const [errorCarga, setErrorCarga] = useState(null);
  const [intentoCarga, setIntentoCarga] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const inicializarSistema = async () => {
      if (!userId) return;

      try {
        const { data: perfil, error: profileError } = await supabase
          .from('perfiles')
          .select('apodo')
          .eq('id', userId)
          .maybeSingle();
        if (profileError) throw profileError;
        if (cancelled) return;
        if (perfil?.apodo) setApodo(perfil.apodo);

        const { data: partida, error } = await supabase
          .from('fantasy_partidas')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();
        
        if (error) throw error;
        if (cancelled) return;
        if (partida) {
          if (!validateFantasySave(partida)) throw new Error('La partida contiene datos incompatibles. No se sobrescribirá tu progreso.');
          setPartidaGuardada(partida);
          setMiClub({ id: partida.club_id, name: partida.club_nombre, liga: partida.liga });
          setFase('menu');
        } else {
          setFase('inicio');
        }
      } catch (err) {
        console.error("Error cargando partida:", err);
        if (!cancelled) setErrorCarga(err instanceof Error ? err.message : "No se pudo cargar tu partida. Comprueba tu conexión.");
      } finally {
        if (!cancelled) setCargando(false);
      }
    };

    inicializarSistema();
    return () => { cancelled = true; };
  }, [userId, intentoCarga]);

  const handleSeleccionarClub = (club) => {
    setMiClub(club);
    setFase('contrato'); 
  };

  const handleContratoFirmado = () => {
    setFase('menu'); 
  };

  if (errorCarga) {
    return <div className="min-h-screen bg-[#020202] text-white flex items-center justify-center p-6">
      <div role="alert" className="max-w-md rounded-2xl border border-red-500/30 bg-[#111] p-8 text-center">
        <h2 className="text-xl font-bold mb-3">No se pudo abrir tu carrera</h2>
        <p className="text-white/70 mb-6">{errorCarga}</p>
        <button onClick={() => { setCargando(true); setErrorCarga(null); setIntentoCarga(value => value + 1); }} className="rounded-lg bg-[#F47A20] px-6 py-3 font-bold text-black">Reintentar</button>
      </div>
    </div>;
  }

  if (cargando) {
    return (
      <div className="min-h-screen bg-[#020202] flex flex-col items-center justify-center font-sans">
        <div className="w-16 h-16 border-4 border-white/10 border-t-[#F47A20] rounded-full animate-spin mb-6"></div>
        <span className="text-[#F47A20] font-black uppercase tracking-[0.3em] text-xs">
          Sincronizando con el servidor...
        </span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020202] text-white font-sans selection:bg-[#F47A20] selection:text-black">
      
      {fase === 'inicio' && <InicioDF onComenzar={() => setFase('intro')} />}
      
      {fase === 'intro' && <IntroDF session={session} onFinalizar={() => setFase('seleccion')} />}
      
      {fase === 'seleccion' && <SeleccionClubDF session={session} apodo={apodo} onSelectClub={handleSeleccionarClub} />}
      
      {fase === 'contrato' && miClub && (
        <FirmaContratoDF club={miClub} apodo={apodo} onFirmado={handleContratoFirmado} />
      )}

      {fase === 'menu' && miClub && (
        <div className="df-career-reveal" data-motion="on"><MenuDF key={miClub.liga + ":" + miClub.id} club={miClub} apodo={apodo} partidaCargada={partidaGuardada} userId={userId} /></div>
      )}
      
    </div>
  );
}
