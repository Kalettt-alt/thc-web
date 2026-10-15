import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import InicioDF from '../src/pages/THCFantasy/InicioDF.jsx';
import IntroDF from '../src/pages/THCFantasy/IntroDF.jsx';
import FirmaContratoDF from '../src/pages/THCFantasy/FirmaContratoDF.jsx';
import SeleccionClubDF from '../src/pages/THCFantasy/SeleccionClubDF.jsx';
import JugarDF from '../src/pages/THCFantasy/JugarDF.jsx';
import MatchCoachPanel from '../src/pages/THCFantasy/MatchCoachPanel.jsx';
import MatchResultCard from '../src/pages/THCFantasy/MatchResultCard.jsx';
import { createMatchPlayers } from '../src/pages/THCFantasy/matchTactics.js';
import { createMatchState } from '../src/pages/THCFantasy/matchSimulation.js';
import { FORMACIONES_XY } from '../src/pages/THCFantasy/ConstantesJuego.js';
import { TODOS_LOS_EQUIPOS } from '../src/pages/THCFantasy/equiposFantasy.js';
import { clubCrestDF } from '../src/pages/THCFantasy/clubCrestDF.js';
import '../src/index.css';

const formation = '4-3-3 OFENSIVO';
const home = TODOS_LOS_EQUIPOS.find(club=>club.id==='river');
const away = TODOS_LOS_EQUIPOS.find(club=>club.id==='boca');
const lineup = Object.fromEntries(Object.keys(FORMACIONES_XY[formation]).map((slot,index)=>[slot,home.titulares[index]]));
const halfState = {...createMatchState(createMatchPlayers(lineup,away,formation,home),home.reservas,formation), phase:'HALFTIME',clock:45,score:[1,0],reservas:home.reservas,players:createMatchPlayers(lineup,away,formation,home)};
const crest = source=>clubCrestDF(source.includes('River')?home:away);
const noop = ()=>{};
function Preview(){
 const [view,setView]=useState('inicio');
 return <BrowserRouter><nav aria-label="Revisión local" style={{position:'fixed',top:5,right:5,zIndex:20000,display:'flex',gap:4,background:'#222',padding:5,fontSize:11}}>{['inicio','intro','clubes','contrato','partido','entretiempo','resultado'].map(value=><button key={value} onClick={()=>setView(value)}>{value}</button>)}</nav>
 {view==='inicio'&&<InicioDF onComenzar={()=>setView('intro')}/>}
 {view==='intro'&&<IntroDF onFinalizar={()=>setView('clubes')}/>}
 {view==='clubes'&&<SeleccionClubDF apodo="THC Demo" onSelectClub={()=>setView('contrato')}/>}
 {view==='contrato'&&<FirmaContratoDF club={home} apodo="THC Demo" onFirmado={()=>setView('partido')}/>}
 {view==='partido'&&<JugarDF miClub={home} rival={away} esLocal titularesMap={lineup} reservas={home.reservas} tactica={formation} apodo="THC Demo" getImg={crest} onTerminar={noop}/>}
 {view==='entretiempo'&&<MatchCoachPanel gameState={halfState} miClub={home} apodo="THC Demo" formation={formation} onFormation={noop} onMentality={noop} onSubstitute={noop} onSwap={noop} onTalk={()=>({ok:true})} onClose={()=>setView('partido')} display={{detailedPitch:true,showRadar:true}} onDisplay={noop}/>}
 {view==='resultado'&&<div style={{minHeight:'100vh',display:'grid',placeItems:'center',padding:24,background:'#090909'}}><MatchResultCard miClub={home} rival={away} score={[1,0]} getImg={crest} onContinue={()=>setView('inicio')}/></div>}
 </BrowserRouter>;
}
createRoot(document.getElementById('root')).render(<Preview/>);
