                                             
                                                       
                                             
export const HAX = {
  PLAYER_RAD: 15,     
  PLAYER_MASS: 2.0,   
  PLAYER_DAMP: 0.96,  
  ACCEL: 0.15,                                                      
  KICK_ACCEL: 0.13,                                             
  KICK_FORCE: 7.5,                        
  MAX_SPEED: 5.2,       
  
  BALL_RAD: 6.25,     
  BALL_MASS: 0.9,                                                       
  BALL_DAMP: 0.99,    
  BALL_BCOEF: 0.40,                                                        

  FPS: 60,
  BOUND_X: 2000,      
  BOUND_Y: 1145,      
  GOAL_Y: 160         
};

export class Disc {
  constructor(x, y, rad, invMass, damp, bCoef, color) {
    this.x = x; this.y = y; this.vx = 0; this.vy = 0;
    this.rad = rad; this.invMass = invMass; this.damp = damp; this.bCoef = bCoef; this.color = color;
  }
  update() {
    this.x += this.vx; this.y += this.vy;
    this.vx *= this.damp; this.vy *= this.damp;
  }
  clone() {
    const c = new Disc(this.x, this.y, this.rad, this.invMass, this.damp, this.bCoef, this.color);
    c.vx = this.vx; c.vy = this.vy;
    return c;
  }
}

export const POSTS = [
  new Disc(-HAX.BOUND_X, HAX.GOAL_Y, 8.5, 0, 1, 0.5, '#FFFFFF'),
  new Disc(-HAX.BOUND_X, -HAX.GOAL_Y, 8.5, 0, 1, 0.5, '#FFFFFF'),
  new Disc(HAX.BOUND_X, HAX.GOAL_Y, 8.5, 0, 1, 0.5, '#FFFFFF'),
  new Disc(HAX.BOUND_X, -HAX.GOAL_Y, 8.5, 0, 1, 0.5, '#FFFFFF')
];

export function resolveCollision(d1, d2) {
  let dx = d2.x - d1.x; let dy = d2.y - d1.y;
  let dist = Math.sqrt(dx * dx + dy * dy);
  if (dist === 0) { dx = 0.01; dy = 0.01; dist = 0.014; }

  const minDist = d1.rad + d2.rad;
  if (dist < minDist) {
    const pen = minDist - dist;
    const nx = dx / dist, ny = dy / dist;
    const sumMass = d1.invMass + d2.invMass;
    if (sumMass === 0) return;

    d1.x -= nx * (pen * (d1.invMass / sumMass));
    d2.x += nx * (pen * (d2.invMass / sumMass));

    const velAlongNormal = (d2.vx - d1.vx) * nx + (d2.vy - d1.vy) * ny;
    if (velAlongNormal > 0) return;

    const combinedBCoef = (d1.bCoef + d2.bCoef) / 2; 
    const j = -(1 + combinedBCoef) * velAlongNormal / sumMass;
    
    d1.vx -= nx * j * d1.invMass; d1.vy -= ny * j * d1.invMass;
    d2.vx += nx * j * d2.invMass; d2.vy += ny * j * d2.invMass;
  }
}

export function simulateTick(state) {
                                      
  if (state.phase === 'halftime' || state.phase === 'goal' || state.phase === 'end') {
    state.timer--;
    if (state.timer <= 0) {
      if (state.phase === 'goal') {
        state.ball.x = 0; state.ball.y = 0; state.ball.vx = 0; state.ball.vy = 0;
        state.player.x = -500; state.player.y = 0; state.player.vx = 0; state.player.vy = 0;
        state.phase = 'kickoff';
      } else if (state.phase === 'halftime') {
        state.half = 2;                          
        state.time = 0;
        state.ball.x = 0; state.ball.y = 0; state.ball.vx = 0; state.ball.vy = 0;
        state.player.x = -500; state.player.y = 0; state.player.vx = 0; state.player.vy = 0;
        state.phase = 'kickoff';
      }
    }
    return;                                            
  }

                                                                  
  if (state.phase === 'kickoff') {
    if (Math.abs(state.ball.x) > 1 || Math.abs(state.ball.y) > 1 || state.ball.vx !== 0 || state.ball.vy !== 0) {
      state.phase = 'playing';
    }
  }

                                                  
  if (state.phase === 'playing') {
    state.time += 1 / HAX.FPS;
    if (state.time >= 600) { 
      if (state.half === 1) {
        state.phase = 'halftime';
        state.timer = 180;                                         
      } else {
        state.phase = 'end';
        state.timer = 999999;
      }
    }
  }

  const { player, ball, keys } = state;

                              
  const currentAccel = keys.kick ? HAX.KICK_ACCEL : HAX.ACCEL;
  let dx = 0, dy = 0;
  if (keys.w) dy -= 1; if (keys.s) dy += 1;
  if (keys.a) dx -= 1; if (keys.d) dx += 1;
  
  if (dx !== 0 || dy !== 0) {
    const len = Math.hypot(dx, dy);
    dx /= len; dy /= len;
  }
  player.vx += dx * currentAccel;
  player.vy += dy * currentAccel;

  const speed = Math.hypot(player.vx, player.vy);
  if (speed > HAX.MAX_SPEED) {
    player.vx = (player.vx / speed) * HAX.MAX_SPEED;
    player.vy = (player.vy / speed) * HAX.MAX_SPEED;
  }

               
  const KICK_RADIUS = player.rad + ball.rad + 4; 
  if (keys.kick && !state.hasKicked) {
    let bdx = ball.x - player.x, bdy = ball.y - player.y;
    let dist = Math.hypot(bdx, bdy);
    if (dist === 0) { bdx = 1; bdy = 0; dist = 1; }
    
    if (dist < KICK_RADIUS) {
      ball.vx += (bdx / dist) * HAX.KICK_FORCE;
      ball.vy += (bdy / dist) * HAX.KICK_FORCE;
      state.hasKicked = true; 
    }
  }

                                      
  const extX = HAX.BOUND_X + 250;
  const extY = HAX.BOUND_Y + 250;
  if (player.x - player.rad < -extX) { player.x = -extX + player.rad; player.vx *= -0.1; }
  if (player.x + player.rad > extX) { player.x = extX - player.rad; player.vx *= -0.1; }
  if (player.y - player.rad < -extY) { player.y = -extY + player.rad; player.vy *= -0.1; }
  if (player.y + player.rad > extY) { player.y = extY - player.rad; player.vy *= -0.1; }

                                    
  if (ball.y - ball.rad < -HAX.BOUND_Y) { ball.y = -HAX.BOUND_Y + ball.rad; ball.vy *= -HAX.BALL_BCOEF; }
  if (ball.y + ball.rad > HAX.BOUND_Y) { ball.y = HAX.BOUND_Y - ball.rad; ball.vy *= -HAX.BALL_BCOEF; }
  
  if (ball.x - ball.rad < -HAX.BOUND_X) {
    if (Math.abs(ball.y) > HAX.GOAL_Y) { ball.x = -HAX.BOUND_X + ball.rad; ball.vx *= -HAX.BALL_BCOEF; }
  }
  if (ball.x + ball.rad > HAX.BOUND_X) {
    if (Math.abs(ball.y) > HAX.GOAL_Y) { ball.x = HAX.BOUND_X - ball.rad; ball.vx *= -HAX.BALL_BCOEF; }
  }

                  
  POSTS.forEach(post => { resolveCollision(ball, post); resolveCollision(player, post); });
  resolveCollision(player, ball);

  player.update(); 
  ball.update();

                          
  if (ball.x < -HAX.BOUND_X - 10 && Math.abs(ball.y) < HAX.GOAL_Y) {
    state.scoreBlue++; state.phase = 'goal'; state.timer = 150;
  } else if (ball.x > HAX.BOUND_X + 10 && Math.abs(ball.y) < HAX.GOAL_Y) {
    state.scoreRed++; state.phase = 'goal'; state.timer = 150;
  }
}