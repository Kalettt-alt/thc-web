import { useState } from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter} from 'react-router-dom';
import Inicio from '../src/pages/Inicio.jsx';
import MatchSimulationUT from '../src/pages/UltimateTeam/MatchSimulationUT.jsx';
import {EQUIPOS_DATA} from '../src/pages/UltimateTeam/JugadoresUT.js';
import {arrangeSquad} from '../src/pages/UltimateTeam/squadUT.js';
import {JUGADORES_BASE} from '../src/pages/UltimateTeam/data/jugadoresBase.js';
import {createOfflineMatch,practiceTeamSnapshot} from '../src/pages/UltimateTeam/simulationUT.js';
import '../src/index.css';
const statsLoader=async()=>({members:17});
const rawClub=EQUIPOS_DATA.find(t=>t.id==='river'); const club={...rawClub,suplentes:[],reservas:[],nombre:rawClub.name,logo_url:rawClub.img,abreviatura:'RIV'};
const rawRival=EQUIPOS_DATA.find(t=>t.id==='boca'); const rival={...rawRival,nombre:rawRival.name,logo_url:rawRival.img,abreviatura:'BOC'};
function Preview(){const[view,setView]=useState('inicio');const[match,setMatch]=useState(null);const play=(offset=0)=>{setMatch(createOfflineMatch(practiceTeamSnapshot(club,arrangeSquad({titulares:JUGADORES_BASE.slice(0,11),suplentes:JUGADORES_BASE.slice(11,18),reservas:JUGADORES_BASE.slice(18),formacion:'4-3-3'})),rival,{seed:'visual132',startedAt:Date.now()-offset}));setView('ut');};return <BrowserRouter><nav aria-label="Revisión local" style={{position:'fixed',zIndex:20000,top:0,right:0,background:'#111',padding:5,fontSize:11}}><button onClick={()=>setView('inicio')}>Inicio</button><button onClick={()=>play()}>Práctica completa</button><button onClick={()=>play(58000)}>Descanso UT</button></nav>{view==='inicio'?<Inicio statsLoader={statsLoader} motionEnabled={false}/>:<MatchSimulationUT key={match.id+match.started_at} match={match} onVolver={()=>setView('inicio')} onReplay={()=>play()}/>}</BrowserRouter>}
createRoot(document.getElementById('root')).render(<Preview/>);
