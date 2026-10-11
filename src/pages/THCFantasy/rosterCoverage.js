const additions = {
  'ARG:racing': [{ id: 'racing-cover-solari', name: 'S. Solari', pos: 'DEL', grl: 80 }],
  'ARG:belgrano': [{ id: 'belgrano-cover-jara', name: 'F. Jara', pos: 'DEL', grl: 77 }],
  'ESP:sevilla': [{ id: 'sevilla-cover-bueno', name: 'Manu Bueno', pos: 'MID', grl: 73 }],
  'ESP:rayo': [{ id: 'rayo-cover-trejo', name: 'Óscar Trejo', pos: 'MID', grl: 76 }],
  'ESP:getafe': [{ id: 'getafe-cover-alena', name: 'Carles Aleñá', pos: 'MID', grl: 75 }],
  'ESP:espanyol': [{ id: 'espanyol-cover-kral', name: 'Alex Král', pos: 'MID', grl: 76 }, { id: 'espanyol-cover-urko', name: 'Urko González', pos: 'MID', grl: 74 }],
  'ESP:deportivo': [{ id: 'deportivo-cover-jurado', name: 'José Ángel Jurado', pos: 'MID', grl: 73 }],
  'ESP:racing': [{ id: 'racing-cover-inigo', name: 'Íñigo Sainz-Maza', pos: 'MID', grl: 74 }],
  'ESP:malaga': [{ id: 'malaga-cover-ramon', name: 'Ramón Enríquez', pos: 'MID', grl: 73 }, { id: 'malaga-cover-sangalli', name: 'Luca Sangalli', pos: 'MID', grl: 72 }]
};

export function completeFantasyClub(club) {
  const known = new Set([...club.titulares, ...club.suplentes].map(player => player.id));
  return { ...club, suplentes: [...club.suplentes, ...(additions[`${club.liga}:${club.id}`] || []).filter(player => !known.has(player.id)).map(player => ({ ...player, energia: 100 }))] };
}

export function completeSavedRoster(club, titulares, reservas) {
  const known = new Set([...Object.values(titulares).filter(Boolean), ...reservas].map(player => player.id));
  const missing = (additions[`${club.liga}:${club.id}`] || []).filter(player => !known.has(player.id));
  return [...reservas, ...missing.map(player => ({ ...player, energia: 100 }))];
}
