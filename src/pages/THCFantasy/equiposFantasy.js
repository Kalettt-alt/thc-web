import { EQUIPOS_ARG } from './JugadoresARG.js';
import { EQUIPOS_PER } from './JugadoresPER.js';
import { EQUIPOS_URU } from './JugadoresURU.js';
import { EQUIPOS_CHL } from './JugadoresCHL.js';
import { EQUIPOS_BRS } from './JugadoresBRS.js';
import { EQUIPOS_COL } from './JugadoresCOL.js';
import { EQUIPOS_BOL } from './JugadoresBOL.js';
import { EQUIPOS_ECU } from './JugadoresECU.js';
import { EQUIPOS_ESP } from './JugadoresESP.js';
import { completeFantasyClub } from './rosterCoverage.js';

export const TODOS_LOS_EQUIPOS = [
  ...EQUIPOS_ARG.map(e => ({ ...e, liga: 'ARG' })),
  ...EQUIPOS_PER.map(e => ({ ...e, liga: 'PER' })),
  ...EQUIPOS_URU.map(e => ({ ...e, liga: 'URU' })),
  ...EQUIPOS_CHL.map(e => ({ ...e, liga: 'CHL' })),
  ...EQUIPOS_BRS.map(e => ({ ...e, liga: 'BRS' })),
  ...EQUIPOS_COL.map(e => ({ ...e, liga: 'COL' })),
  ...EQUIPOS_BOL.map(e => ({ ...e, liga: 'BOL' })),
  ...EQUIPOS_ECU.map(e => ({ ...e, liga: 'ECU' })),
  ...EQUIPOS_ESP.map(e => ({ ...e, liga: 'ESP' }))
].map(completeFantasyClub);


export function resolveFantasyClub(club) {
  return TODOS_LOS_EQUIPOS.find(team => team.id === club?.id && (!club.liga || team.liga === club.liga)) || club;
}
