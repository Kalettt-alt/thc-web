export function careerEnergy(value) {
  return Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 100;
}

export function restoreCareerSquad(titulares = {}, reservas = []) {
  return {
    titulares: Object.fromEntries(Object.entries(titulares).map(([slot, player]) => [slot, player ? { ...player, energia: 100 } : null])),
    reservas: reservas.map(player => ({ ...player, energia: 100 }))
  };
}

export function prepareCareerFitness(save) {
  const openingFixture = save.fixture?.[0]?.find(match => match.local === save.club_id || match.visitante === save.club_id);
  if (save.jornada_actual === 0 && openingFixture && !openingFixture.jugado) return { ...save, ...restoreCareerSquad(save.titulares, save.reservas) };
  return {
    ...save,
    titulares: Object.fromEntries(Object.entries(save.titulares).map(([slot, player]) => [slot, player ? { ...player, energia: careerEnergy(player.energia) } : null])),
    reservas: save.reservas.map(player => ({ ...player, energia: careerEnergy(player.energia) }))
  };
}

export function fitnessAdjustedRating(player, positionRating = player?.grl || 0) {
  return positionRating * (0.72 + 0.28 * careerEnergy(player?.energia) / 100);
}

export function hasTiredCareerPlayers(titulares, reservas) {
  return [...Object.values(titulares).filter(Boolean), ...reservas].some(player => careerEnergy(player.energia) < 99.5);
}

export function recoverBetweenFixtures(titulares = {}, reservas = [], days = 3) {
  const restDays = Math.max(0, Math.min(7, Number(days) || 0));
  const recover = (player, resting) => {
    if (!player) return null;
    const current = careerEnergy(player.energia);
    const recovery = 1 - Math.pow(resting ? 0.56 : 0.67, restDays);
    const next = current + (100 - current) * recovery;
    return { ...player, energia: Math.max(current, Math.min(resting ? 100 : 98, Math.round(next))) };
  };
  return {
    titulares: Object.fromEntries(Object.entries(titulares).map(([slot, player]) => [slot, recover(player, false)])),
    reservas: reservas.map(player => recover(player, true))
  };
}
