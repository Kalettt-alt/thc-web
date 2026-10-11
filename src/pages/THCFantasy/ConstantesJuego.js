export const PITCH_W = 6000;
export const PITCH_H = 9000; 

                                                             
export const BOUND_LEFT = 500;
export const BOUND_RIGHT = 5500;
export const BOUND_TOP = 400; 
export const BOUND_BOT = 8600;

export const GOAL_X_MIN = 2500;
export const GOAL_X_MAX = 3500;
export const GOAL_Y_TOP = 400; 
export const GOAL_Y_BOT = 8600;

export const MS_PER_VIRTUAL_MINUTE = 2000;
export const HALF_DURATION_MS = 90_000;
export const MATCH_DURATION_MS = HALF_DURATION_MS * 2;
export const MAX_MATCH_OPPORTUNITIES = 7;
export const BALL_RADIUS = 35;
export const GOAL_POST_RADIUS = 22;
export const GOAL_HEIGHT = 220;
export const TURN_DURATION_MS = 4500;

                                                                                  
export const FORMACIONES_XY = {
  '4-3-3 OFENSIVO': {
    gk: {x: 50, y: 95}, li: {x: 10, y: 75}, dfc1: {x: 35, y: 80}, dfc2: {x: 65, y: 80}, ld: {x: 90, y: 75},
    mc1: {x: 30, y: 55}, mco: {x: 50, y: 45}, mc2: {x: 70, y: 55},
    ei: {x: 15, y: 25}, dc: {x: 50, y: 20}, ed: {x: 85, y: 25}
  },
  '4-4-2 CLÁSICO': {
    gk: {x: 50, y: 95}, li: {x: 10, y: 75}, dfc1: {x: 35, y: 80}, dfc2: {x: 65, y: 80}, ld: {x: 90, y: 75},
    mi: {x: 15, y: 50}, mc1: {x: 40, y: 50}, mc2: {x: 60, y: 50}, md: {x: 85, y: 50},
    dc1: {x: 40, y: 20}, dc2: {x: 60, y: 20}
  },
  '3-5-2 POSESIÓN': {
    gk: {x: 50, y: 95}, dfc1: {x: 25, y: 80}, dfc2: {x: 50, y: 85}, dfc3: {x: 75, y: 80},
    mcd: {x: 50, y: 65}, mi: {x: 10, y: 50}, mc1: {x: 35, y: 55}, mc2: {x: 65, y: 55}, md: {x: 90, y: 50},
    dc1: {x: 40, y: 35}, dc2: {x: 60, y: 35}
  },
  '3-4-3 TOTAL': {
    gk: {x: 50, y: 95}, dfc1: {x: 25, y: 80}, dfc2: {x: 50, y: 85}, dfc3: {x: 75, y: 80},
    mi: {x: 10, y: 55}, mc1: {x: 35, y: 60}, mc2: {x: 65, y: 60}, md: {x: 90, y: 55},
    ei: {x: 15, y: 35}, dc: {x: 50, y: 30}, ed: {x: 85, y: 35}
  }
};
