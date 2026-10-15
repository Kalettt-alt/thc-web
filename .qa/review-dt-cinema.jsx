import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import InicioDF from '../src/pages/THCFantasy/InicioDF.jsx';
import IntroDF from '../src/pages/THCFantasy/IntroDF.jsx';
import FirmaContratoDF from '../src/pages/THCFantasy/FirmaContratoDF.jsx';
import SeleccionClubDF from '../src/pages/THCFantasy/SeleccionClubDF.jsx';
import MenuDF from '../src/pages/THCFantasy/MenuDF.jsx';
import { TODOS_LOS_EQUIPOS } from '../src/pages/THCFantasy/equiposFantasy.js';
import '../src/index.css';

const demoClub = TODOS_LOS_EQUIPOS.find(club => club.id === 'river');
function Preview() {
  const [view, setView] = useState('inicio');
  const [club, setClub] = useState(demoClub);
  return <BrowserRouter>
    <nav aria-label="Revisión local DT" style={{ position: 'fixed', top: 7, right: 7, zIndex: 20000, display: 'flex', gap: 5, background: '#161616', padding: 5, fontSize: 11 }}>
      {['inicio', 'intro', 'clubes', 'contrato', 'carrera'].map(value => <button key={value} onClick={() => setView(value)}>{value}</button>)}
    </nav>
    {view === 'inicio' && <InicioDF onComenzar={() => setView('intro')} />}
    {view === 'intro' && <IntroDF onFinalizar={() => setView('clubes')} />}
    {view === 'clubes' && <SeleccionClubDF apodo="THC Demo" onSelectClub={value => { setClub(value); setView('contrato'); }} />}
    {view === 'contrato' && <FirmaContratoDF club={club} apodo="THC Demo" onFirmado={() => setView('carrera')} />}
    {view === 'carrera' && <div className="df-career-reveal"><MenuDF club={club} apodo="THC Demo" userId={undefined} /></div>}
  </BrowserRouter>;
}
createRoot(document.getElementById('root')).render(<Preview />);
