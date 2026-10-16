import test from 'node:test';
import assert from 'node:assert/strict';
import {UT_MATCH_PLAYS,matchOpportunitySchedule,matchActiveDurationSeconds,matchHalfSeconds} from '../src/pages/UltimateTeam/matchPlaysUT.js';
import {createOfflineMatch,advanceOfflineMatch,applyOfflineCoaching,matchVisibleState} from '../src/pages/UltimateTeam/simulationUT.js';
import {broadcastScene} from '../src/pages/UltimateTeam/matchPresentationUT.js';
import {SQUAD_FORMATIONS} from '../src/pages/UltimateTeam/squadUT.js';

const team=()=>({id:'fixture',nombre:'THC',formacion:'4-3-3',titulares:SQUAD_FORMATIONS['4-3-3'].map(([pos],i)=>({id:`p${i}`,nombre:`THC ${i}`,pos,grl:80,pac:80,pas:80,sho:80,dri:80,phy:80,def:80}))});
test('20 rutas distintas y jugadas del partido elegidas sin repeticiones en el mazo',()=>{
  assert.equal(UT_MATCH_PLAYS.length,20);
  assert.equal(new Set(UT_MATCH_PLAYS.map(p=>p.id)).size,20);
  assert.equal(new Set(UT_MATCH_PLAYS.map(p=>JSON.stringify(p.route))).size,20);
  const seen=new Set();
  for(let seed=0;seed<30;seed++){
    const match=createOfflineMatch(team(),team(),{seed:String(seed),startedAt:0});
    const end=advanceOfflineMatch(match,200);
    const builds=end.events.filter(e=>e.type==='pass');
    assert.equal(builds.length,14);
    assert.equal(new Set(builds.map(e=>e.play_id)).size,14);
    builds.forEach(e=>seen.add(e.play_id));
    assert.equal(matchOpportunitySchedule(match).filter(e=>e.side==='home').length,7);
    assert.equal(end.active_seconds,matchActiveDurationSeconds(match));
  }
  assert.equal(seen.size,20);
});

test('el árbitro deja terminar las dos ocasiones y espera un balón seguro antes del silbato',()=>{
  for(let seed=0;seed<50;seed++){
    const match=createOfflineMatch(team(),team(),{seed:`stop-${seed}`,startedAt:0});
    const half=matchHalfSeconds(match),end=half*2;
    const full=advanceOfflineMatch(match,end);
    for(const boundary of [half,end]){
      const shot=full.events.find(e=>e.second===boundary-4&&['goal','post','shot','save'].includes(e.type));
      assert.ok(shot);
      assert.equal(full.events.find(e=>e.second===boundary-1).safe_end,true);
      assert.equal(broadcastScene(full,boundary-1,'first').danger,false);
      assert.ok(matchVisibleState(full,boundary-2).events.every(e=>e.second<=boundary-2));
    }
    assert.equal(advanceOfflineMatch(full,end),full);
    assert.equal(full.events.filter(e=>e.type==='fulltime').length,1);
    const added=applyOfflineCoaching(advanceOfflineMatch(match,end-2),{titulares:match.home.titulares.map(p=>p.id),formacion:'4-3-3',mentalidad:'ofensiva',revision:0},end-2);
    assert.equal(added.home.revision,1);
    assert.throws(()=>applyOfflineCoaching(full,{titulares:[],formacion:'4-3-3'},end),/terminó/);
  }
});

test('centros, córners, presión y contras cambian el recorrido sin inventar marcadores',()=>{
  const match=createOfflineMatch(team(),team(),{seed:'draw',startedAt:0});
  const frames=UT_MATCH_PLAYS.map(play=>broadcastScene({...match,events:[{type:'pass',second:10,side:'home',play_id:play.id}]},11.25));
  assert.equal(new Set(frames.map(f=>`${f.ball.x.toFixed(3)}:${f.ball.y.toFixed(3)}`)).size,20);
  assert.ok(frames.every(f=>f.ball.x>=0&&f.ball.x<=1&&f.ball.y>=0&&f.ball.y<=1&&f.home_goals===undefined));
  assert.ok(frames.every(f=>f.players.find(p=>p.side==='home'&&p.role==='GK').x<.15));
  assert.notDeepEqual(frames[7].ball,frames[12].ball);
});
