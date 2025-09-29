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

let CELL = 32;
let SHEET_OX = 224;
let SHEET_OY = 32;
const SCALE = 2.5;

const GRID = {
    RUN_ROW: 0,
    RUN_COL_START: 0,
    RUN_FRAMES: 3,

    ROLL_ROW: 1,
    ROLL_COL_START: 0,
    ROLL_FRAMES: 8,

    SPIKE_ROW: 0,
    SPIKE_COL: 7,
};

const tile = (col, row, size = CELL) => ({ 
   sx: SHEET_OX + col*size,
   sy: SHEET_OY + row*size,
   w: size,
   h: size
});

const SPRITES = {
    running: {
        fw: CELL, fh: CELL, frames: GRID.RUN_FRAMES, fps: 14, scale: SCALE,
        seq: Array.from({length: GRID.RUN_FRAMES}, (_,i) =>
            tile(GRID.RUN_COL_START + i, GRID.RUN_ROW, CELL)
        )
    },
    rolling: {
    fw: CELL, fh: CELL, frames: GRID.ROLL_FRAMES, fps: 16, scale: SCALE,
    seq: Array.from({length: GRID.ROLL_FRAMES}, (_,i) =>
      tile(GRID.ROLL_COL_START + i, GRID.ROLL_ROW, CELL)
    )
  },
    spike: tile(GRID.SPIKE_COL, GRID.SPIKE_ROW, CELL),
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
    if (spawnTimer >= SPAWN_EVERY){
        spawnTimer = 0;
        const s= SPRITES.spike;
        const ratio = (player.h / s.h) * SPIKE_RELATIVE_FACTOR;
        const w = s.w * ratio, h = s.h *ratio;
        spikes.push({ x: CANVAS_W + 24, y: GROUND_Y - h + 4, w, h});
    }

    for(let i=spikes.length-1;i>=0;i--){
        const ob = spikes[i];
        ob.x -= worldSpeed * dt;
        if (ob.x + ob.w < -50) spikes.splice(i,1);
        else if (hit(player, ob)) gameOver();
    }

    score += worldSpeed * dt *0.05;
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

  const t00 = tile(0, 0, CELL);
drawSprite(assets.sheet, t00, 60, 60, CELL*3, CELL*3);

ctx.strokeStyle = "red";
ctx.lineWidth = 2;
ctx.strokeRect(Math.round(player.x), Math.round(player.y), Math.round(player.w), Math.round(player.h));

ctx.strokeStyle = "lime";
for (const ob of spikes){
  ctx.strokeRect(Math.round(ob.x), Math.round(ob.y), Math.round(ob.w), Math.round(ob.h));
}
  
  if (player.state === "run"){
    drawAnimSeq(sheet, SPRITES.running, player.x, player.y, player.w, player.h, player.animTime);
  } else {
    drawAnimSeq(sheet, SPRITES.rolling, player.x, player.y, player.w, player.h, player.animTime);
  }

  for (const ob of spikes){
    drawSprite(sheet, SPRITES.spike, ob.x, ob.y, ob.w, ob.h);
  }

  if (gameState === State.OVER){
    ctx.fillStyle = "#000"; ctx.fillRect(0,0,canvas.width,canvas.height);

    if (overTimer >= SHOW_GAMEOVER_AT){
      drawImpactCentered("GAME OVER", CANVAS_W/2, CANVAS_H/2 - 40, 64);
    }
    if (overTimer >= SHOW_RETRY_AT){
      drawImpactCentered("WANT TO TRY AGAIN", CANVAS_W/2, CANVAS_H/2 + 60, 40);
      drawHint("(Pressione Espaço ou Toque)", CANVAS_H * 0.85);
    }
  }

ctx.save();
ctx.fillStyle = "rgba(0,0,0,0.6)";
ctx.fillRect(CANVAS_W-240, 8, 232, 44);
ctx.fillStyle = "#fff";
ctx.font = "12px monospace";
ctx.textAlign = "left";
ctx.textBaseline = "top";
ctx.fillText(`SHEET_OX: ${SHEET_OX}   SHEET_OY: ${SHEET_OY}   CELL: ${CELL}`, CANVAS_W-232, 16);
ctx.fillText("A/D, W/S, ←/→, ↑/↓, -/=", CANVAS_W-232, 30);
ctx.restore();
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


let DEBUG_PAUSED = false; 

let DEBUG_SHOW_GRID = true;
window.addEventListener("keydown", (e) => {
  const k = e.key;
  let changed = false;

  // evita scroll/zoom quando usamos setas e +/- 
  if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","-","=","+"].includes(k)) {
    e.preventDefault();
  }

  // Offsets X
  if (k === "a" || k === "A" || k === "ArrowLeft")  { SHEET_OX -= 32; changed = true; }
  if (k === "d" || k === "D" || k === "ArrowRight") { SHEET_OX += 32; changed = true; }

  // Offsets Y
  if (k === "w" || k === "W" || k === "ArrowUp")    { SHEET_OY -= 32; changed = true; }
  if (k === "s" || k === "S" || k === "ArrowDown")  { SHEET_OY += 32; changed = true; }

  // Tamanho do tile
  if (k === "-" || k === "Subtract")                { CELL = Math.max(8, CELL - 1); changed = true; }
  if (k === "=" || k === "Add" || k === "+")        { CELL = Math.min(128, CELL + 1); changed = true; }

  // Pausa (aproveita o mesmo listener)
  if (k.toLowerCase() === "p" && gameState === State.PLAY) {
    running = !running;
    DEBUG_PAUSED = !running;
  }

  if (changed) {
    console.log(`SHEET_OX=${SHEET_OX}, SHEET_OY=${SHEET_OY}, CELL=${CELL}`);
  }
});

window.addEventListener("keydown", (e) => {
  if (e.key.toLowerCase() === "p") {
    if (gameState === State.PLAY) {
      running = !running;
      DEBUG_PAUSED = !running;
    }
  }
});
