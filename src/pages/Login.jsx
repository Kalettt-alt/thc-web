import { supabase } from '../utils/supabase';
import { ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { useRef, useState } from 'react';
import toast from 'react-hot-toast';

export default function Login() {
  const [iniciando, setIniciando] = useState(false);
  const pending = useRef(false);
  const iniciarSesionConDiscord = async () => {
    if (pending.current) return;
    pending.current = true;
    setIniciando(true);
    try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: {
        redirectTo: window.location.origin
      }
    });

      if (error) throw error;
    } catch {
      toast.error('No pudimos conectar con Discord. Revisa tu conexión e inténtalo de nuevo.');
    } finally {
      pending.current = false;
      setIniciando(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-[#0A0A0A] overflow-hidden">
      
      <motion.div 
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="w-full lg:w-[38%] xl:w-[32%] flex flex-col justify-between p-8 md:p-12 z-20 relative bg-[#111111] border-r border-[#2C2C2C]"
      >
        
        <div className="flex items-center gap-3">
          <img 
            src="/imagenes/LogoTHC.png" 
            alt="THC Logo" 
            className="w-10 h-10 object-contain"
          />
          <span className="font-black tracking-widest text-[#F2F2F2] text-xl uppercase">THC</span>
        </div>

        <div className="w-full max-w-sm mx-auto mt-12 mb-12">
          <h1 className="text-4xl md:text-5xl font-black text-[#F2F2F2] leading-tight mb-5 uppercase tracking-tight">
            Entra a la <br />
            <span className="text-[#F47A20]">Comunidad</span>
          </h1>
          
          <p className="text-[#9A9A9A] text-sm mb-8 leading-relaxed font-medium">
            La plataforma definitiva para la escena competitiva de Haxball. Únete a nuestros torneos, gestiona tu álbum virtual y sube de rango en nuestra liga oficial.
          </p>

          <button 
            onClick={iniciarSesionConDiscord}
            disabled={iniciando}
            className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold py-4 px-6 rounded-xl transition-colors duration-300 flex items-center justify-center gap-3 cursor-pointer disabled:opacity-60 disabled:cursor-wait"
          >
            <svg width="22" height="22" viewBox="0 0 127.14 96.36" fill="currentColor">
              <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77.67,77.67,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.31,60,73.31,53s5-12.74,11.43-12.74S96.33,46,96.22,53,91.08,65.69,84.69,65.69Z"/>
            </svg>
            {iniciando ? 'Conectando con Discord…' : 'Continuar con Discord'}
          </button>

          <div className="mt-6 bg-[#1A1A1A] border border-[#2C2C2C] rounded-lg p-4 flex gap-3 items-start">
            <ShieldCheck className="text-[#F47A20] shrink-0 mt-0.5" size={20} />
            <p className="text-[#666666] text-xs leading-relaxed">
              Tu correo se utiliza estrictamente por seguridad y recuperación. Trueno Haxball Community <strong>no compartirá</strong> tu información personal.
            </p>
          </div>
        </div>

        <div className="text-xs text-[#444444] max-w-sm mx-auto w-full text-center">
          Al iniciar sesión, aceptas nuestras normativas de competencia.
        </div>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.5 }}
        className="hidden lg:block lg:w-[62%] xl:w-[68%] relative overflow-hidden bg-[#0A0A0A]"
      >
        <div className="absolute inset-0 bg-[url('/imagenes/fondo-login.png')] bg-cover bg-center opacity-80"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-[#111111] via-transparent to-transparent"></div>
      </motion.div>
      
    </div>
  );
}
