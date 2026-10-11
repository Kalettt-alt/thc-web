import { lazy, Suspense, useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { RUTAS } from "./utils/rutas";
import { supabase } from "./utils/supabase";
import toast from 'react-hot-toast';
import { MotionConfig } from 'framer-motion';
import AppToaster from './components/ui/AppToaster';
import RouteErrorBoundary from './components/ui/RouteErrorBoundary';
import Navbar from "./components/layout/Navbar";
import Footer from "./components/layout/Footer";
import PageTransition from "./components/ui/PageTransition";
import Login from "./pages/Login";
const Inicio = lazy(() => import('./pages/Inicio'));
const Foro = lazy(() => import('./pages/Foro'));
const ForoPublicacion = lazy(() => import('./pages/ForoPublicacion'));
const Muro = lazy(() => import('./pages/Muro/Muro'));
const TierList = lazy(() => import('./pages/TierList/TierList'));
const Album = lazy(() => import('./pages/Album/Album'));
const UltimateTeam = lazy(() => import('./pages/UltimateTeam/UltimateTeam'));
const Perfil = lazy(() => import('./pages/Perfil/Perfil'));
const Mensajes = lazy(() => import('./pages/Perfil/Mensajes'));
const Reglamento = lazy(() => import('./pages/Reglamento/Reglamento'));
const Rankings = lazy(() => import('./pages/Rankings/Rankings'));
const Fantasy = lazy(() => import('./pages/THCFantasy/Fantasy'));
const TinderTHC = lazy(() => import('./pages/TinderTHC/TinderTHC'));

const Proximamente = ({ titulo }) => (
  <div className="min-h-screen bg-[#030303] flex flex-col items-center justify-center text-white pt-20">
    <div className="w-16 h-16 border-4 border-white/10 border-t-[#F47A20] rounded-full animate-spin mb-8"></div>
    <h1 className="text-4xl font-black uppercase tracking-widest text-center">{titulo}</h1>
    <p className="text-[#888888] font-bold uppercase tracking-widest mt-2">Módulo en construcción...</p>
  </div>
);

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const location = useLocation();

  useEffect(() => {
    let active = true;
    let authChanged = false;
    supabase.auth.getSession().then(({ data, error }) => {
      if (!active || authChanged) return;
      if (error) throw error;
      setSession(data.session);
    }).catch(() => {
      if (active && !authChanged) toast.error('No pudimos recuperar tu sesión. Vuelve a iniciar sesión.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      authChanged = true;
      setSession(session);
      setLoading(false);
    });
    
    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#030303] flex items-center justify-center text-[#F47A20] font-black tracking-widest uppercase">
        <AppToaster />
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-white/10 border-t-[#F47A20] rounded-full animate-spin"></div>
          Cargando THC...
        </div>
      </div>
    );
  }

  if (!session) return <MotionConfig reducedMotion="user"><AppToaster /><Login /></MotionConfig>;

  const mostrarFooter = location.pathname === RUTAS.INICIO || location.pathname === '/';
  const isUltimateTeam = location.pathname.startsWith(RUTAS.ULTIMATE_TEAM);
  const isAlbum = location.pathname.startsWith(RUTAS.ALBUM);
  const isPerfil = location.pathname.startsWith(RUTAS.PERFIL);
  const isFantasy = location.pathname.startsWith(RUTAS.FANTASY);
  const isMuro = location.pathname.startsWith(RUTAS.MURO);
  const isTier = location.pathname.startsWith(RUTAS.TIER);
  
  const ocultarNavbar = isUltimateTeam || isAlbum || isMuro || isTier || isPerfil || isFantasy;  

  return (
    <MotionConfig reducedMotion="user">
    <div className="flex flex-col min-h-screen bg-[#030303]">
      <AppToaster />

      {!ocultarNavbar && <Navbar session={session} />}
      
      <PageTransition />
      
      <main className="flex-grow min-w-0">
        <RouteErrorBoundary key={location.pathname}>
        <Suspense fallback={<div role="status" className="min-h-[70dvh] flex items-center justify-center pt-32 text-[#F47A20] font-bold">Cargando apartado…</div>}>
        <Routes>
          <Route path={RUTAS.INICIO} element={<Inicio session={session} />} />
          <Route path={RUTAS.FORO} element={<Foro session={session} />} />
          <Route path={`${RUTAS.FORO}/:id`} element={<ForoPublicacion session={session} />} />
          <Route path={RUTAS.ALBUM} element={<Album session={session} />} />
          <Route path={RUTAS.ULTIMATE_TEAM} element={<MotionConfig reducedMotion="never"><UltimateTeam session={session} /></MotionConfig>} />
          <Route path={RUTAS.PERFIL} element={<Perfil session={session} />} />
          <Route path={`${RUTAS.PERFIL}/:username`} element={<Perfil session={session} />} />
          <Route path={RUTAS.RANKINGS} element={<Rankings session={session} />} />
          <Route path={RUTAS.FANTASY} element={<Fantasy session={session} />} />
          <Route path={RUTAS.TINDER} element={<TinderTHC />} />
          <Route path="/mensajes" element={<Mensajes session={session} />} />
          <Route path="/mensajes/:username" element={<Mensajes session={session} />} />
          <Route path={RUTAS.MURO} element={<Muro session={session} />} />
          <Route path={RUTAS.TIER} element={<TierList session={session} />} />
          <Route path={RUTAS.REGLAMENTO} element={<Reglamento />} />
          <Route path={RUTAS.NOTICIAS} element={<Proximamente titulo="Central de Noticias" />} />
          <Route path={RUTAS.ADMIN} element={<Proximamente titulo="Portal Administrativo" />} />
          <Route path="*" element={<Navigate to={RUTAS.INICIO} />} />
        </Routes>
        </Suspense>
        </RouteErrorBoundary>
      </main>
      
      {mostrarFooter && <Footer />}
    </div>
    </MotionConfig>
  );
}
