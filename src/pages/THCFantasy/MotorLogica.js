import { useRef, useState, useEffect, useCallback } from 'react';
import { MS_PER_VIRTUAL_MINUTE } from './ConstantesJuego.js';
import { createMatchPlayers } from './matchTactics.js';
import { applyMatchInput, createMatchState, resumeSecondHalf, setMatchAiming, startMatch, stepMatch } from './matchSimulation.js';
import { applyMatchFormation, getMatchSummary, getPlayerStats, restoreMatchEnergy as restoreEnergy, setMatchMentality, statKey, substituteMatchPlayer, swapMatchPositions, syncMatchEnergy as syncEnergy } from './matchManagement.js';
import { applyMatchTeamTalk } from './teamTalks.js';
import { matchPublicationKey, shouldPublishMatchState } from './matchPublication.js';

const EMPTY_RESERVES = [];

const snapshot = state => ({
  players: state.players.map(player => ({ ...player, stats: getPlayerStats(state, player) })), ball: { ...state.ball }, camera: { ...state.camera },
  clock: Math.floor(state.clockMs / MS_PER_VIRTUAL_MINUTE), score: [...state.score], phase: state.phase,
  msg: state.msg, turnTimer: state.turnTimer, isPaused: state.isPaused, turnId: state.turnId,
  reservas: state.reserves.map(player => ({ ...player })), mentality: state.mentality, formation: state.formation,
  substitutionsUsed: state.substitutionsUsed, teamTalkCount: state.teamTalkCount, teamTalkHistory: state.teamTalkHistory.map(talk => ({ ...talk })), lastEvent: state.lastEvent ? { ...state.lastEvent, score: state.lastEvent.score ? [...state.lastEvent.score] : undefined } : null,
  goalEvent: state.goalEvent ? { ...state.goalEvent, score: [...state.goalEvent.score] } : null,
  opportunities: { user: { ...state.opportunities.user }, rival: { ...state.opportunities.rival } },
  activeSeconds: Math.floor(state.clockMs / 1000), half: state.half,
  playerStats: Object.fromEntries(state.players.map(player => [statKey(player), getPlayerStats(state, player)]))
});

export function useMatchEngine(titularesMap, rival, esLocal, miClub, tactica, onTerminar, reservas = EMPTY_RESERVES) {
  const engine = useRef(createMatchState([], [], tactica, { autoStart: false }));
  const onEnd = useRef(onTerminar);
  const lastPublishedKey = useRef(null);
  const lastPublishedTime = useRef(0);
  const frameTime = useRef(0);
  const [gameState, setGameState] = useState(() => snapshot(createMatchState([], [], tactica, { autoStart: false })));

  const publishState = useCallback(state => {
    lastPublishedKey.current = matchPublicationKey(state);
    lastPublishedTime.current = frameTime.current;
    setGameState(snapshot(state));
  }, []);

  useEffect(() => { onEnd.current = onTerminar; }, [onTerminar]);

  useEffect(() => {
    const state = engine.current;
    if (!state.players.length) Object.assign(state, createMatchState(createMatchPlayers(titularesMap, rival, tactica, miClub), reservas, tactica, { autoStart: false }));
    else if (state.formation !== tactica) applyMatchFormation(state, tactica);
  }, [titularesMap, rival, miClub, tactica, reservas]);

  useEffect(() => {
    let requestId;
    let previousTime = null;
    let accumulator = 0;
    let finishedDelay = 1400;
    let delivered = false;
    let hidden = document.hidden;
    const step = 1000 / 60;
    const onVisibility = () => { hidden = document.hidden; previousTime = null; accumulator = 0; };
    document.addEventListener('visibilitychange', onVisibility);
    const frame = time => {
      frameTime.current = time;
      const state = engine.current;
      const elapsed = previousTime === null ? 0 : Math.min(100, Math.max(0, time - previousTime));
      previousTime = time;
      if (!hidden) {
        if (state.finished) {
          finishedDelay -= elapsed;
          if (finishedDelay <= 0 && !delivered) {
            delivered = true;
            onEnd.current(state.score[0], state.score[1], Object.fromEntries(Object.entries(state.tracker).map(([id, stats]) => [id, { ...stats }])), getMatchSummary(state));
            return;
          }
        } else {
          accumulator += elapsed;
          while (accumulator >= step) { stepMatch(state, step); accumulator -= step; }
        }
        if (shouldPublishMatchState(state, lastPublishedKey.current, lastPublishedTime.current, time)) publishState(state);
      }
      requestId = requestAnimationFrame(frame);
    };
    requestId = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(requestId); document.removeEventListener('visibilitychange', onVisibility); };
  }, [publishState]);

  const handleInput = useCallback((clickX, clickY, dragDx, dragDy, options) => applyMatchInput(engine.current, { x: clickX, y: clickY }, { x: dragDx, y: dragDy }, options), []);
  const setPaused = useCallback(value => {
    const state = engine.current;
    state.isPaused = value;
    state.isAiming = false;
    publishState(state);
  }, [publishState]);
  const togglePause = useCallback(() => setPaused(!engine.current.isPaused), [setPaused]);
  const setAiming = useCallback(value => {
    setMatchAiming(engine.current, value);
  }, []);
  const resumeMatch = useCallback(() => {
    const resumed = resumeSecondHalf(engine.current);
    if (resumed) publishState(engine.current);
    return resumed;
  }, [publishState]);
  const beginMatch = useCallback(() => {
    const started = startMatch(engine.current);
    if (started) publishState(engine.current);
    return started;
  }, [publishState]);
  const stopDriving = useCallback(() => {
    const state = engine.current;
    if (state.phase !== 'USER_DRIVING') return;
    const owner = state.players.find(player => player.id === state.ball.owner);
    if (owner) owner.target = { x: owner.x, y: owner.y };
  }, []);
  const publishCommand = useCallback(command => {
    const result = command(engine.current);
    if (result.ok) publishState(engine.current);
    return result;
  }, [publishState]);
  const setMentality = useCallback(value => publishCommand(state => setMatchMentality(state, value)), [publishCommand]);
  const substitutePlayer = useCallback((slotId, reserveId) => publishCommand(state => substituteMatchPlayer(state, slotId, reserveId)), [publishCommand]);
  const swapPositions = useCallback((slotA, slotB) => publishCommand(state => swapMatchPositions(state, slotA, slotB)), [publishCommand]);
  const applyTeamTalk = useCallback(talk => publishCommand(state => applyMatchTeamTalk(state, talk)), [publishCommand]);
  const restoreMatchEnergy = useCallback(() => publishCommand(restoreEnergy), [publishCommand]);
  const syncMatchEnergy = useCallback(value => publishCommand(state => syncEnergy(state, value)), [publishCommand]);
  const captureMatchSummary = useCallback(() => getMatchSummary(engine.current), []);
  return { gameState, handleInput, togglePause, setPaused, setAiming, beginMatch, resumeMatch, stopDriving, setMentality, substitutePlayer, swapPositions, applyTeamTalk, restoreMatchEnergy, syncMatchEnergy, captureMatchSummary };
}
