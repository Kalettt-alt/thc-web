import test from 'node:test';
import assert from 'node:assert/strict';
import { generateCareerNews } from '../src/pages/THCFantasy/careerNews.js';

const club = { id: 'ours', name: 'Nuestro club', grl: 84 };
const opponent = { id: 'other', name: 'El rival', grl: 85 };
const context = () => ({ club, teams: [club, opponent], round: 1, standings: {
  ours: { ...club, pts: 3, pj: 1, dg: 2, gf: 2 },
  other: { ...opponent, pts: 0, pj: 1, dg: -2, gf: 0 },
}, fixture: [[{ local: 'other', visitante: 'ours', gl: 0, gv: 2, jugado: true }], [{ local: 'ours', visitante: 'other', jugado: false }]], lineup: { dfc: { id: 'p', name: 'Defensa', energia: 35 } }, reserves: [{ id: 'r', name: 'Reserva', energia: 100 }] });

test('news report the user score correctly when the club was away', () => {
  const news = generateCareerNews(context());
  assert.match(news[0].desc, /superó El rival por 2–0/);
  assert.match(news[0].desc, /visitante/);
  assert.match(news[1].desc, /puesto 1 con 3 puntos/);
  assert.match(news.at(-1).desc, /promete equilibrio/);
});
test('reports reflect actual fatigue without modifying energy or inventing penalties', () => {
  const data = context();
  const before = structuredClone(data);
  const news = generateCareerNews(data);
  assert.deepEqual(data, before);
  assert.ok(news.some(item => /35% de energía/.test(item.desc)));
  assert.ok(news.every(item => !item.impactos && !item.impactoGlobal));
  assert.ok(news.length <= 4);
});
test('first match starts with preparation news and never declares a leader with zero games', () => {
  const data = context();
  data.round = 0;
  data.fixture[0][0].jugado = false;
  data.standings.ours.pj = 0;
  data.lineup.dfc.energia = 100;
  const news = generateCareerNews(data);
  assert.match(news[0].titular, /NUEVA ETAPA/);
  assert.ok(!news.some(item => item.sub === 'La competición' || item.sub === 'Estado del plantel'));
  assert.deepEqual(generateCareerNews({}), []);
});
