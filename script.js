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
    sheet: "img/Custom _ Edited - Sonic the Hedgehog Customs - Sonic the hedgehog - Sonic.png"
};

const CELL = 32;
const SCALE = 2.5;

const GRID = {
    RUN_ROW: 0,
    RUN_COL_START: 0,
    RUN_FRAMES: 3,

    ROLL_ROW: 1,
    ROLL_COL_START: 0,
    ROLL_FRAMES: 8,

    SPIKE_ROW: 0,
    SPIKE_COL: 3,
};

const tile = (col, row, size = CELL) => ({ sx: col*size, sy: row*size, w: size, h: size });

const SPRITES = {
    running: {
        fw: CELL, fh: CELL, frames: GRID.RUN_FRAMES, fps: 14, scale: SCALE,
        seq: Array.from({length: GRID.RUN_FRAMES}, (_,i) =>
            tile(GRID.RUN_COL_START + i, GRID.RUN_ROW, CELL)
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
    x: 140, y: GROUND_Y - CELL*SCALE, W: CELL*SCALE, h: CELL*SCALE,
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

    player.W = SPRITES.running.fw * (SPRITES.running.scale||1);
    player.h = SPRITES.running.fh * (SPRITES.running.scale||1);
    player.x = 140;
    player.y = GROUND_Y - player.h;
    player.vy=0; player.onGround=true; player.state="run"; player.animTime=0;

    setHUScore(0);
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
        }
    }

    spawnTimer += dt;
    if (spawnTimer >= SPAWN_EVERY){
        spawnTimer = 0;
        const s= SPRITES.spike;
        const ratio = (player.h / s.h) * SPIKE_RELATIVE_FACTOR;
        const w = s.w * ratio, h = s.h *ratio;
        spikes.push({ X: CANVAS_W + 24, y: GROUND_Y - h + 4, w, h});
    }

    for(let i=spikes.length-1;i>=0;i--){
        const ob = spikes[i];
        ob.x -= worldSpeed * dt;
        if (ob.x + ob.w < -50) spikes.splice(i,1);
        else if (hit(player, ob)) gamerOver();
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

    if (gameState === State.START){}