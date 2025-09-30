const CANVAS_W = 960;
const CANVAS_H = 360;
const GROUND_Y = 300;
const GRAVITY = 1800;
const JUMP_VY = -650;
const SPEED = 360;
const SPAWN_EVERY = 1.1;

const SPIKE_RELATIVE_FACTOR = 1.0;

const IMG = {
  bg: "img/green hill.jpeg",
  ground: "img/Ground-removebg-preview.png",
  sheet: "img/Custom _ Edited - Sonic the Hedgehog Customs - Sonic the Hedgehog - Sonic.png"
};

const CELL = 32;
const SCALE = 2.5;

const SPRITES = {
  running: {
    fw: CELL, fh: CELL, frames: 4, // CORRIGIDO: Para bater com os 4 frames reais da imagem
    fps: 16, scale: SCALE,
    seq: [
      { sx:  0, sy: 0, w: CELL, h: CELL },
      { sx:  32, sy: 0, w: CELL, h: CELL },
      { sx:  64, sy: 0, w: CELL, h: CELL },
      { sx: 92, sy: 0, w: CELL, h: CELL }
    ]
  },
  rolling: {
    fw: CELL, fh: CELL, frames: 8, // CORRIGIDO: Para bater com os 8 frames reais da imagem
    fps: 14, scale: SCALE,
    seq: [
      { sx:  32, sy: 34, w: CELL, h: CELL },
      { sx:  64, sy: 34, w: CELL, h: CELL },
      { sx:  96, sy: 34, w: CELL, h: CELL },
      { sx: 128, sy: 34, w: CELL, h: CELL },
      { sx: 160, sy: 34, w: CELL, h: CELL },
      { sx: 192, sy: 34, w: CELL, h: CELL },
      { sx: 224, sy: 34, w: CELL, h: CELL },
      { sx: 256, sy: 34, w: CELL, h: CELL },
    ]
  },
  // Lembre-se: se o espinho não aparecer, ajuste sx e sy para as coordenadas exatas da sua imagem
  spike: { sx: 0, sy: 64, w: 32, h: 32 }
};

function loadImage(src){ return new Promise(ok=>{ const i=new Image(); i.src=src; i.onload=()=>ok(i); }); }
const assets = {};
let ctx, canvas, last;
let running = false;
let over = false;
let score = 0;

const State = { START:"start", PLAY:"play", OVER:"over" };
let gameState = State.START;
let overTimer = 0;
const SHOW_GAMEOVER_AT = 2;
const SHOW_RETRY_AT = 4;

const player = {
  x: 140, y: GROUND_Y - CELL*SCALE, w: CELL*SCALE, h: CELL*SCALE,
  vy: 0, onGround: true, animTime: 0, state: "run"
};

const spikes = [];
let spawnTimer = 0;

const parallax = { bgX:0, groundX:0, bgSpeedFactor:0.3 };

function onPress(){
  if (gameState === State.START) startGame();
  else if (gameState === State.PLAY) jump();
  else if (gameState === State.OVER && overTimer >= SHOW_RETRY_AT) resetToStart();
}
window.addEventListener("keydown",(e)=>{
  if (e.code==="Space"||e.code==="ArrowUp"){ e.preventDefault(); onPress(); }
});
window.addEventListener("pointerdown", onPress);

(async function init(){
  canvas = document.getElementById("game");
  ctx = canvas.getContext("2d");
  canvas.width = CANVAS_W; canvas.height = CANVAS_H;

  const [bg, ground, sheet] = await Promise.all([
    loadImage(IMG.bg), loadImage(IMG.ground), loadImage(IMG.sheet)
  ]);
  assets.bg = bg; assets.ground = ground; assets.sheet = sheet;

  last = performance.now();
  requestAnimationFrame(loop)
})();

function loop(now){
  const dt = Math.min(1/30, (now - last) / 1000);
  last = now;
  update(dt);
  render();
  requestAnimationFrame(loop);
}

function startGame(){
  gameState = State.PLAY;
  running = true; over = false; score = 0; overTimer = 0;
  spikes.length = 0; spawnTimer = 0;

  player.w = SPRITES.running.fw * (SPRITES.running.scale||1);
  player.h = SPRITES.running.fh * (SPRITES.running.scale||1);
  player.x = 140;
  player.y = GROUND_Y - player.h;
  player.vy=0; player.onGround=true; player.state="run"; player.animTime=0;

  setHUDScore(0);
}
function gameOver(){
  if (gameState !== State.PLAY) return;
  running = false; over = true; gameState = State.OVER; overTimer = 0;
}
function resetToStart(){
  gameState = State.START; running=false; over=false; overTimer=0;
  spikes.length=0; setHUDScore(0);
}

function update(dt){
  setHUDScore(Math.floor(score));

  if (gameState === State.START) return;

  if (gameState === State.OVER){
    overTimer += dt;
    return;
  }

  if(running){
    const worldSpeed = SPEED + Math.min(240, score*0.4);

    parallax.bgX = (parallax.bgX - worldSpeed*parallax.bgSpeedFactor*dt) % assets.bg.width;
    parallax.groundX = (parallax.groundX - worldSpeed*dt) % assets.ground.width;

    player.animTime += dt;
    player.vy += GRAVITY * dt;
    player.y += player.vy * dt;
    const foot = player.y + player.h;
    if (foot >= GROUND_Y){
      player.y = GROUND_Y - player.h;
      player.vy = 0;
      if (!player.onGround){
        player.onGround = true;
        player.state = "run";
        player.animTime = 0;
      }
    }

    spawnTimer += dt;
    if (spawnTimer >= SPAWN_EVERY) {
      spawnTimer = 0;
      const spikeHeightOnScreen = CELL * SCALE * 0.8;
      const s = SPRITES.spike;
      const spikeWidthOnScreen = s.w * (spikeHeightOnScreen / s.h);

      spikes.push({
        x: CANVAS_W + 24,
        y: GROUND_Y - spikeHeightOnScreen + 4,
        w: spikeWidthOnScreen,
        h: spikeHeightOnScreen
      });
    }

    for(let i=spikes.length-1;i>=0;i--){
      const ob = spikes[i];
      ob.x -= worldSpeed * dt;
      if (ob.x + ob.w < -50) spikes.splice(i,1);
      else if (hit(player, ob)) gameOver();
    }

    score += worldSpeed * dt * 0.05;
  }
}

function jump(){
  if (!running || over) return;
  if (player.onGround){
    player.vy = JUMP_VY
    player.onGround = false ;
    player.state = "roll";
    player.animTime = 0;
  }
}

function render(){
  const { bg, ground, sheet } = assets;
  ctx.clearRect(0,0,canvas.width,canvas.height);

  if (gameState === State.START){
    ctx.fillStyle = "#000"; ctx.fillRect(0,0,canvas.width,canvas.height);
    drawImpactCentered("START", CANVAS_W/2, CANVAS_H/2, 72);
    drawHint("Pressione Espaço ou Toque", CANVAS_H*0.7);
    return;
  }

  tileImageXScaled(bg, parallax.bgX);
  tileImageX(ground, parallax.groundX, 0, GROUND_Y - ground.height + 2);

  if (player.state === "run"){
    drawAnimSeq(sheet, SPRITES.running, player.x, player.y, player.w, player.h, player.animTime);
  } else {
    drawAnimSeq(sheet, SPRITES.rolling, player.x, player.y, player.w, player.h, player.animTime);
  }

  for (const ob of spikes){
    drawSprite(sheet, SPRITES.spike, ob.x, ob.y, ob.w, ob.h);
  }

  if (gameState === State.OVER){
    ctx.fillStyle = "#000"; ctx.globalAlpha = 0.5;
    ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.globalAlpha = 1;
    if (overTimer >= SHOW_GAMEOVER_AT){
      drawImpactCentered("GAME OVER", CANVAS_W/2, CANVAS_H/2 - 40, 64);
    }
    if (overTimer >= SHOW_RETRY_AT){
      drawImpactCentered("WANT TO TRY AGAIN", CANVAS_W/2, CANVAS_H/2 + 60, 40);
      drawHint("(Pressione Espaço ou Toque)", CANVAS_H * 0.85);
    }
  }
}

function tileImageXScaled(img, offsetX){
  const drawH = CANVAS_H;
  const drawW = img.width * (drawH / img.height);
  let x = (offsetX % drawW);
  if (x > 0) x -= drawW;
  for (; x < CANVAS_W; x += drawW){
    ctx.drawImage(
      img, 0, 0, img.width, img.height,
      Math.round(x), 0, Math.round(drawW), drawH
    );
  }
}

function setHUDScore(v){
  const el = document.getElementById("score");
  if (el) el.textContent = String(v).padStart(5, "0");
}

function tileImageX(img, offsetX, x0, y){
  let x = (offsetX % img.width);
  if (x > 0) x -= img.width;
  for (; x < CANVAS_W; x += img.width){
    ctx.drawImage(img, x0 + x, y);
  }
}
function drawSprite(img, s, dx, dy, dw, dh){
  const w = dw ?? s.w, h = dh ?? s.h;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, s.sx, s.sy, s.w, s.h, Math.round(dx), Math.round(dy), Math.round(w), Math.round(h))
}
function drawAnimSeq(img, seqObj, dx, dy, dw, dh, t){
  const { seq, fps, fw, fh, scale=1 } = seqObj;
  const idx = Math.floor((t * fps)) % seq.length;
  const f = seq[idx];
  const w = dw ?? fw*scale, h = dh ?? fh*scale;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, f.sx, f.sy, f.w, f.h, Math.round(dx), Math.round(dy), Math.round(w), Math.round(h));
}
function hit(a,b){
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function drawImpactCentered(text, cx, cy, fontSizePx=64){
  ctx.save();
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `bold ${fontSizePx}px Impact, Haettenschweiler, 'Arial Black', sans-serif`;
  ctx.lineWidth = Math.ceil(fontSizePx/16);
  ctx.strokeStyle = "#000";
  ctx.strokeText(text, cx, cy);
  ctx.fillText(text, cx, cy);
  ctx.restore();
}
function drawHint(msg, y){
  ctx.fillStyle="#9ca3af";
  ctx.font="14px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.textAlign = "center"; ctx.textBaseline="middle";
  ctx.fillText(msg, CANVAS_W/2, y);
}