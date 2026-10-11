import { clampCardRating } from './utCards.js';

export function squadOverall(players = []) {
  return Math.round(players.slice(0,11).reduce((sum,player)=>sum + (player ? clampCardRating(player.grl) : 0),0) / 11);
}

export function squadRatingTier(rating) {
  const value = clampCardRating(rating);
  const tiers = [
    {id:'bronce',name:'Bronce',start:0,next:65},
    {id:'plata',name:'Plata',start:65,next:75},
    {id:'oro',name:'Oro',start:75,next:85},
    {id:'plus',name:'Plus',start:85,next:95},
    {id:'ultimate',name:'Ultimate',start:95,next:99},
  ];
  const tier = tiers.find(item => value < item.next) || tiers.at(-1);
  return {...tier,progress:Math.min(100,Math.max(0,(value-tier.start)/(tier.next-tier.start)*100)),remaining:Math.max(0,tier.next-value)};
}
