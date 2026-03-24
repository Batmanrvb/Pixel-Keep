// Stars
(function(){
  var c=document.getElementById('stars-canvas');
  c.style.pointerEvents='none';c.style.touchAction='none';
  var ctx=c.getContext('2d'),stars=[];
  for(var i=0;i<90;i++) stars.push({x:Math.random(),y:Math.random(),s:Math.random()<.7?1:2,p:Math.random()*6.28,f:.4+Math.random()*.8});
  function resize(){c.width=window.innerWidth;c.height=window.innerHeight;}
  resize(); window.onresize=resize;
  function draw(){
    ctx.clearRect(0,0,c.width,c.height);
    var t=Date.now()/1000;
    for(var i=0;i<stars.length;i++){var s=stars[i],a=.25+.45*Math.sin(t*s.f+s.p);ctx.fillStyle='rgba(200,220,255,'+a+')';ctx.fillRect(Math.floor(s.x*c.width),Math.floor(s.y*c.height),s.s,s.s);}
    requestAnimationFrame(draw);
  }
  draw();
})();

// Emulator systems
var SYSTEMS={nes:{label:'NES',core:'nes',emoji:'[NES]',exts:['nes']},snes:{label:'SNES',core:'snes',emoji:'[SNES]',exts:['sfc','smc']},gb:{label:'GB',core:'gb',emoji:'[GB]',exts:['gb','gbc']},gba:{label:'GBA',core:'gba',emoji:'[GBA]',exts:['gba']}};
var EXT_MAP={};
for(var k in SYSTEMS){(function(k){SYSTEMS[k].exts.forEach(function(e){EXT_MAP[e]=k;});})(k);}

var library=[];
try{library=JSON.parse(localStorage.getItem('pk_library')||'[]');}catch(e){library=[];}
var activeFilter='all';
var currentGame=null;

// PAGE ROUTING — defined as global function so onclick="" works
function showPage(id){
  var pages=document.querySelectorAll('.page');
  for(var i=0;i<pages.length;i++) pages[i].classList.remove('active');
  var btns=document.querySelectorAll('.nav-btn');
  for(var i=0;i<btns.length;i++){
    if(btns[i].getAttribute('data-page')===id) btns[i].classList.add('active');
    else btns[i].classList.remove('active');
  }
  var pg=document.getElementById('page-'+id);
  if(pg) pg.classList.add('active');
  window.scrollTo(0,0);
  if(id==='emulator') renderLibrary();
}

// FILTER
function setFilter(btn,f){
  var btns=document.querySelectorAll('.filter-btn');
  for(var i=0;i<btns.length;i++) btns[i].classList.remove('active');
  btn.classList.add('active');
  activeFilter=f;
  renderLibrary();
}

// ROM Library
function renderLibrary(){
  var grid=document.getElementById('game-grid');
  var scoreEl=document.getElementById('score-val');
  var pageInfo=document.getElementById('page-info');
  if(!grid) return;
  var filtered=activeFilter==='all'?library:library.filter(function(g){return g.system===activeFilter;});
  if(scoreEl) scoreEl.textContent=('000'+library.length).slice(-3);
  if(pageInfo) pageInfo.textContent=filtered.length+' TITLE'+(filtered.length!==1?'S':'')+' LOADED';
  grid.innerHTML='';
  if(filtered.length===0){
    var es=document.createElement('div');es.className='empty-screen';
    es.innerHTML='<div class="es-border"><div class="es-inner"><div class="es-icon">?</div><p class="es-head">NO ROMS FOUND</p><p class="es-sub">Drop ROM files above to begin</p></div></div>';
    grid.appendChild(es);return;
  }
  for(var i=0;i<filtered.length;i++) grid.appendChild(makeCard(filtered[i]));
}

function makeCard(game){
  var sys=SYSTEMS[game.system]||{label:'?',emoji:'?'};
  var card=document.createElement('div');
  card.className='game-card sys-'+game.system;
  card.innerHTML='<div class="card-screen"><span class="card-sys-tag">'+sys.label+'</span><span class="card-emoji" style="font-size:1rem;font-family:var(--font)">'+sys.label+'</span></div><div class="card-body"><div class="card-name">'+game.name+'</div><div class="card-footer"><button class="card-play-btn">PLAY</button><button class="card-del-btn">X</button></div></div>';
  var id=game.id;
  card.querySelector('.card-play-btn').onclick=function(e){e.stopPropagation();launchGame(id);};
  card.querySelector('.card-del-btn').onclick=function(e){e.stopPropagation();removeGame(id);};
  card.onclick=function(){launchGame(id);};
  return card;
}

// File handling
var romInput=document.getElementById('rom-input');
var dropzone=document.getElementById('dropzone');
romInput.onchange=function(){handleFiles(romInput.files);};
dropzone.ondragover=function(e){e.preventDefault();dropzone.classList.add('dragover');};
dropzone.ondragleave=function(){dropzone.classList.remove('dragover');};
dropzone.ondrop=function(e){e.preventDefault();dropzone.classList.remove('dragover');handleFiles(e.dataTransfer.files);};

function handleFiles(files){
  var arr=Array.from(files),idx=0;
  function next(){if(idx>=arr.length){renderLibrary();return;}processROM(arr[idx++],next);}
  next();
}

function processROM(file,cb){
  var ext=file.name.split('.').pop().toLowerCase();
  if(ext==='zip'){toast('Extract ZIP first, then upload the ROM.','warn');cb();return;}
  var system=EXT_MAP[ext];
  if(!system){toast('Unsupported: .'+ext,'error');cb();return;}
  var reader=new FileReader();
  reader.onload=function(){
    library.push({id:Date.now().toString(36)+Math.random().toString(36).slice(2),name:file.name.replace(/\.[^.]+$/,'').replace(/[_\-]+/g,' ').toUpperCase(),system:system,data:reader.result,added:Date.now()});
    saveLib();toast('LOADED: '+file.name.replace(/\.[^.]+$/,'').slice(0,20).toUpperCase(),'success');
    showPage('emulator');cb();
  };
  reader.onerror=function(){cb();};
  reader.readAsDataURL(file);
}

// Emulator
function launchGame(id){
  var game=null;
  for(var i=0;i<library.length;i++){if(library[i].id===id){game=library[i];break;}}
  if(!game) return;
  var modal=document.getElementById('modal');
  var container=document.getElementById('game-container');
  document.getElementById('modal-title').textContent=game.name;
  modal.style.display='flex';container.innerHTML='';
  var parts=game.data.split(','),mime=parts[0].match(/:(.*?);/)[1],bytes=atob(parts[1]),arr=new Uint8Array(bytes.length);
  for(var i=0;i<bytes.length;i++) arr[i]=bytes.charCodeAt(i);
  var blob=new Blob([arr],{type:mime}),url=URL.createObjectURL(blob);
  window.EJS_player='#game-container';window.EJS_core=SYSTEMS[game.system]?SYSTEMS[game.system].core:'nes';
  window.EJS_gameUrl=url;window.EJS_pathtodata='https://cdn.emulatorjs.org/latest/data/';
  window.EJS_startOnLoaded=true;window.EJS_color='#38c830';window.EJS_backgroundColor='#101010';
  window.EJS_defaultControls=true;window.EJS_volume=0.8;
  var old=document.getElementById('ejs-loader');if(old) old.remove();
  var s=document.createElement('script');s.id='ejs-loader';s.src='https://cdn.emulatorjs.org/latest/data/loader.js';
  document.body.appendChild(s);currentGame={url:url};
}

function closeModal(){
  var modal=document.getElementById('modal');
  if(!modal||modal.style.display==='none') return;
  modal.style.display='none';
  document.getElementById('game-container').innerHTML='';
  if(currentGame&&currentGame.url) URL.revokeObjectURL(currentGame.url);
  currentGame=null;
  var s=document.getElementById('ejs-loader');if(s) s.remove();
  try{delete window.EJS_player;delete window.EJS_core;delete window.EJS_gameUrl;}catch(e){}
}

document.getElementById('modal').onclick=function(e){if(e.target===document.getElementById('modal'))closeModal();};
document.getElementById('fullscreen-btn').onclick=function(){var w=document.querySelector('.emu-screen-border');if(w&&w.requestFullscreen)w.requestFullscreen();};
document.onkeydown=function(e){if(e.key==='Escape')closeModal();};

// Contact form
document.getElementById('form-submit').onclick=function(){
  var n=document.getElementById('f-name').value.trim();
  var e=document.getElementById('f-email').value.trim();
  var s=document.getElementById('f-subject').value;
  var m=document.getElementById('f-message').value.trim();
  var st=document.getElementById('form-status');
  if(!n||!e||!s||!m){st.textContent='ERROR: FILL ALL FIELDS';st.className='form-status err';return;}
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)){st.textContent='ERROR: INVALID EMAIL';st.className='form-status err';return;}
  window.location.href='mai'+'lto:rajvikrant888@gmail.com?subject='+encodeURIComponent('[PIXEL KEEP] '+s)+'&body='+encodeURIComponent('From: '+n+'\nEmail: '+e+'\n\n'+m);
  st.textContent='MESSAGE SENT!';st.className='form-status ok';
  document.getElementById('f-name').value='';document.getElementById('f-email').value='';document.getElementById('f-message').value='';document.getElementById('f-subject').value='';
  setTimeout(function(){st.textContent='';},4000);
};

// Helpers
function removeGame(id){if(!confirm('REMOVE THIS GAME?')) return;library=library.filter(function(g){return g.id!==id;});saveLib();renderLibrary();}
function saveLib(){try{localStorage.setItem('pk_library',JSON.stringify(library));}catch(e){toast('STORAGE FULL!','warn');}}
function toast(msg,type){var a=document.getElementById('toast-area'),t=document.createElement('div');t.className='toast '+(type||'info');t.textContent=msg;a.appendChild(t);setTimeout(function(){if(t.parentNode)t.parentNode.removeChild(t);},3000);}

// Init
renderLibrary();

// ══════════════════════════════════════════════
//  PIXEL KEEP MINI PLATFORMER
//  Mario-style sidescroller with canvas
// ══════════════════════════════════════════════
(function() {
  var canvas = document.getElementById('hero-game');
  if (!canvas) return;

  // ── Canvas sizing ──────────────────────────
  var W = 800, H = 240;
  canvas.width  = W;
  canvas.height = H;

  var ctx = canvas.getContext('2d');

  // ── Palette ────────────────────────────────
  var C = {
    sky:        '#6b88fc',
    skyLight:   '#92a8ff',
    ground:     '#38c830',
    groundDark: '#206820',
    dirt:       '#c8842a',
    brick:      '#c84828',
    brickDark:  '#882010',
    coin:       '#f8d820',
    coinDark:   '#a88010',
    pipe:       '#28c828',
    pipeDark:   '#187818',
    enemy:      '#e83030',
    enemyDark:  '#881010',
    player:     '#e83030',
    playerBody: '#3878f8',
    playerSkin: '#f8c898',
    cloud:      '#ffffff',
    black:      '#101010',
    flagPole:   '#c8c8c8',
    flagColor:  '#38c830',
    star:       '#f8d820',
  };

  // ── State ──────────────────────────────────
  var score = 0, coins = 0, lives = 3;
  var gameState = 'title'; // title | playing | dead | win | gameover
  var deadTimer = 0, winTimer = 0, titleTimer = 0;
  var GRAVITY = 0.45, GROUND_Y = H - 40;

  // ── Input ──────────────────────────────────
  var keys = { left:false, right:false, jump:false };
  var jumpPressed = false;

  // Mobile button state
  window.hgMobile = function(){};  // placeholder, set below

  // ── Player ─────────────────────────────────
  var player = {};
  function resetPlayer() {
    player = {
      x: 60, y: GROUND_Y - 24,
      w: 16, h: 24,
      vx: 0, vy: 0,
      onGround: false,
      facing: 1,
      frame: 0, frameTimer: 0,
      invincible: 0,
      big: false,
    };
  }

  // ── Camera ─────────────────────────────────
  var camX = 0;

  // ── Level ──────────────────────────────────
  var TILE = 16;
  var levelW = 5600;

  // Platforms: {x,y,w,h,type}  types: ground|brick|hard|pipe_body|pipe_top
  var platforms = [];
  // Coins: {x,y,w,h,alive,anim}
  var coinItems = [];
  // Enemies: {x,y,w,h,vx,alive,squished,squishTimer,type}
  var enemies = [];
  // Clouds: {x,y,w}
  var clouds = [];
  // Flag
  var flagX = levelW - 160, flagY = GROUND_Y - 128, flagH = 128;
  var flagProgress = 0, flagTriggered = false;
  // Particles
  var particles = [];

  function buildLevel() {
    platforms = [];
    coinItems  = [];
    enemies    = [];
    clouds     = [];
    flagTriggered = false;
    flagProgress  = 0;

    // Ground tiles the full level
    for (var gx = 0; gx < levelW; gx += TILE) {
      platforms.push({x:gx, y:GROUND_Y,    w:TILE, h:TILE, type:'ground'});
      platforms.push({x:gx, y:GROUND_Y+16, w:TILE, h:TILE, type:'dirt'});
    }

    // Gap 1
    var g1s = 700, g1e = 780;
    platforms = platforms.filter(function(p){
      return !(p.y >= GROUND_Y && p.x >= g1s && p.x < g1e);
    });

    // Gap 2
    var g2s = 1400, g2e = 1500;
    platforms = platforms.filter(function(p){
      return !(p.y >= GROUND_Y && p.x >= g2s && p.x < g2e);
    });

    // Gap 3
    var g3s = 2400, g3e = 2560;
    platforms = platforms.filter(function(p){
      return !(p.y >= GROUND_Y && p.x >= g3s && p.x < g3e);
    });

    // Floating brick platforms
    var bricks = [
      // x, y, count
      [200, GROUND_Y-64,  4],
      [280, GROUND_Y-64,  1],  // mystery
      [400, GROUND_Y-96,  3],
      [560, GROUND_Y-64,  5],
      [620, GROUND_Y-64,  1],  // mystery
      [800, GROUND_Y-80,  3],
      [960, GROUND_Y-64,  4],
      [960, GROUND_Y-96,  4],
      [1100,GROUND_Y-64,  1],  // mystery
      [1200,GROUND_Y-80,  6],
      [1300,GROUND_Y-64,  3],
      [1600,GROUND_Y-64,  5],
      [1650,GROUND_Y-96,  3],
      [1800,GROUND_Y-80,  4],
      [1900,GROUND_Y-64,  1],  // mystery
      [2100,GROUND_Y-64,  6],
      [2200,GROUND_Y-96,  4],
      [2600,GROUND_Y-64,  4],
      [2700,GROUND_Y-80,  5],
      [2900,GROUND_Y-64,  3],
      [3100,GROUND_Y-80,  6],
      [3200,GROUND_Y-64,  4],
      [3400,GROUND_Y-96,  5],
      [3600,GROUND_Y-64,  4],
      [3700,GROUND_Y-80,  3],
      [3900,GROUND_Y-64,  5],
      [4100,GROUND_Y-80,  4],
      [4300,GROUND_Y-64,  6],
      [4500,GROUND_Y-80,  3],
      [4700,GROUND_Y-64,  5],
    ];
    var mysterySet = new Set([1,5,10,14,19]);
    bricks.forEach(function(b, bi) {
      for (var i = 0; i < b[2]; i++) {
        var type = (b[2]===1 || mysterySet.has(bi)) ? 'mystery' : 'brick';
        platforms.push({x: b[0]+i*TILE, y: b[1], w: TILE, h: TILE, type: type, hit: false});
      }
    });

    // Hard blocks (staircase style near end)
    var stairs = [[4900,GROUND_Y-16,1],[4900,GROUND_Y-32,2],[4900,GROUND_Y-48,3],
                  [4916,GROUND_Y-32,1],[4916,GROUND_Y-48,2],[4916,GROUND_Y-64,3],
                  [4932,GROUND_Y-48,1],[4932,GROUND_Y-64,2],[4932,GROUND_Y-80,3]];
    stairs.forEach(function(s){
      for(var i=0;i<s[2];i++) platforms.push({x:s[0],y:s[1]-i*TILE,w:TILE,h:TILE,type:'hard'});
    });

    // Pipes
    [[340,2],[640,3],[850,2],[1050,3],[1530,2],[1750,2],[2050,3],[2650,2],[3050,3],[3550,2],[4050,2],[4550,3]].forEach(function(p){
      var px = p[0], ph = p[1];
      for(var i=0;i<ph;i++) platforms.push({x:px, y:GROUND_Y-(i+1)*TILE, w:TILE*2, h:TILE, type: i===ph-1?'pipe_top':'pipe_body'});
    });

    // Coins – on ground and floating
    var coinPositions = [];
    for (var cx = 100; cx < levelW - 300; cx += 64) {
      if (Math.random() < 0.4) coinPositions.push([cx, GROUND_Y - 32]);
    }
    // Coins above bricks
    [[220,GROUND_Y-80],[300,GROUND_Y-112],[580,GROUND_Y-80],[820,GROUND_Y-96],
     [980,GROUND_Y-80],[1110,GROUND_Y-80],[1220,GROUND_Y-96],[1620,GROUND_Y-80],
     [1920,GROUND_Y-80],[2120,GROUND_Y-80],[2720,GROUND_Y-96],[3120,GROUND_Y-96],
     [3420,GROUND_Y-112],[3620,GROUND_Y-80],[4120,GROUND_Y-96]].forEach(function(c){
      coinPositions.push(c);
    });
    coinPositions.forEach(function(c){
      coinItems.push({x:c[0], y:c[1], w:10, h:12, alive:true, anim:Math.random()*Math.PI*2});
    });

    // Enemies
    var enemyPos = [
      [300,0],[450,0],[600,0],[760,0],[900,0],[1000,0],[1150,0],[1250,0],
      [1350,0],[1600,0],[1700,0],[1850,0],[1950,0],[2200,0],[2300,0],
      [2700,0],[2850,0],[3000,0],[3200,0],[3400,0],[3600,0],[3800,0],
      [4000,0],[4200,0],[4400,0],[4600,0],[4750,0]
    ];
    enemyPos.forEach(function(e, i){
      enemies.push({
        x: e[0], y: GROUND_Y - 16, w:14, h:14,
        vx: (i%2===0) ? -0.6 : -0.8,
        alive: true, squished: false, squishTimer: 0,
        type: i%4===0 ? 'koopa' : 'goomba',
        frame: 0, frameTimer: 0
      });
    });

    // Clouds
    for (var cl = 0; cl < levelW; cl += 220) {
      clouds.push({x: cl + Math.random()*100, y: 20 + Math.random()*40, w: 48 + Math.random()*32});
    }
  }

  // ── Particle system ────────────────────────
  function spawnParticles(x, y, color, n, spread) {
    for (var i = 0; i < (n||6); i++) {
      var a = Math.random() * Math.PI * 2;
      var s = (spread||2) * (0.5 + Math.random());
      particles.push({x:x, y:y, vx:Math.cos(a)*s, vy:Math.sin(a)*s - 1,
                       life:1, color:color||C.coin, size:3+Math.random()*3});
    }
  }

  // ── Collision ──────────────────────────────
  function rectOverlap(a, b) {
    return a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y;
  }

  function resolvePlayerPlatforms() {
    player.onGround = false;
    for (var i = 0; i < platforms.length; i++) {
      var p = platforms[i];
      if (!rectOverlap(player, p)) continue;

      var overlapX = Math.min(player.x+player.w, p.x+p.w) - Math.max(player.x, p.x);
      var overlapY = Math.min(player.y+player.h, p.y+p.h) - Math.max(player.y, p.y);

      if (overlapY < overlapX) {
        // Vertical collision
        if (player.vy > 0 && player.y + player.h - player.vy <= p.y + 2) {
          // Landing on top
          player.y = p.y - player.h;
          player.vy = 0;
          player.onGround = true;
        } else if (player.vy < 0) {
          // Hitting underside
          player.y = p.y + p.h;
          player.vy = 1;
          // Hit brick/mystery from below
          if ((p.type === 'brick' || p.type === 'mystery') && !p.hit) {
            p.hit = true;
            p.bump = 6;
            score += 10;
            spawnParticles(p.x + TILE/2, p.y, p.type==='mystery'?C.coin:C.brick, 5, 3);
            if (p.type === 'mystery') {
              // Spawn coin above
              var fc = {x:p.x+3, y:p.y-20, w:10, h:12, alive:true, anim:0, float:true, floatVy:-3, floatLife:40};
              coinItems.push(fc);
              coins++;
              score += 100;
              updateUI();
            }
          }
        }
      } else {
        // Horizontal collision
        if (player.x < p.x) { player.x = p.x - player.w; player.vx = 0; }
        else                 { player.x = p.x + p.w;      player.vx = 0; }
      }
    }
  }

  // ── Update functions ───────────────────────
  function updatePlayer() {
    // Input
    var speed = 2.4;
    if (keys.left)  { player.vx = -speed; player.facing = -1; }
    else if (keys.right) { player.vx = speed; player.facing = 1; }
    else { player.vx *= 0.75; }

    if ((keys.jump || jumpPressed) && player.onGround) {
      player.vy = -8.2;
      player.onGround = false;
      score += 1;
    }
    jumpPressed = false;

    // Gravity
    player.vy += GRAVITY;
    if (player.vy > 10) player.vy = 10;

    player.x += player.vx;
    player.y += player.vy;

    // Resolve platforms
    resolvePlayerPlatforms();

    // World bounds
    if (player.x < 0) player.x = 0;
    if (player.x > levelW - player.w) player.x = levelW - player.w;

    // Fell into gap
    if (player.y > H + 32) {
      die();
      return;
    }

    // Invincibility frames
    if (player.invincible > 0) player.invincible--;

    // Anim
    player.frameTimer++;
    if (player.frameTimer > 6) { player.frame = (player.frame+1)%4; player.frameTimer = 0; }

    // Camera follow
    var targetCam = player.x - W/3;
    if (targetCam < 0) targetCam = 0;
    if (targetCam > levelW - W) targetCam = levelW - W;
    camX += (targetCam - camX) * 0.15;

    // Flag touch
    if (!flagTriggered && player.x + player.w > flagX && player.x < flagX + 8) {
      flagTriggered = true;
      score += 1000;
      updateUI();
      winTimer = 120;
    }

    // Enemy collision
    if (player.invincible === 0) {
      for (var i = 0; i < enemies.length; i++) {
        var e = enemies[i];
        if (!e.alive || e.squished) continue;
        if (!rectOverlap(player, e)) continue;
        // Stomp from above?
        if (player.vy > 0 && player.y + player.h - player.vy <= e.y + 4) {
          e.squished = true;
          e.squishTimer = 30;
          player.vy = -5;
          score += 100;
          spawnParticles(e.x+7, e.y, C.enemy, 5, 2);
          updateUI();
        } else {
          // Hurt player
          die();
          return;
        }
      }
    }
  }

  function updateEnemies() {
    for (var i = 0; i < enemies.length; i++) {
      var e = enemies[i];
      if (!e.alive) continue;
      if (e.squished) {
        e.squishTimer--;
        if (e.squishTimer <= 0) e.alive = false;
        continue;
      }
      // Only activate when near camera
      if (e.x < camX - 32 || e.x > camX + W + 32) continue;

      e.vy = (e.vy||0) + GRAVITY;
      if (e.vy > 10) e.vy = 10;
      e.x += e.vx;
      e.y += e.vy;

      // Ground collision for enemies
      e.onGround = false;
      for (var j = 0; j < platforms.length; j++) {
        var p = platforms[j];
        if (!rectOverlap(e, p)) continue;
        var oy = Math.min(e.y+e.h, p.y+p.h) - Math.max(e.y, p.y);
        var ox = Math.min(e.x+e.w, p.x+p.w) - Math.max(e.x, p.x);
        if (oy < ox) {
          if (e.vy >= 0 && e.y+e.h - e.vy <= p.y+2) {
            e.y = p.y - e.h; e.vy = 0; e.onGround = true;
          }
        } else {
          e.vx *= -1;
          if (e.x < p.x) e.x = p.x - e.w; else e.x = p.x + p.w;
        }
      }
      if (e.y > H + 32) e.alive = false;

      e.frameTimer = (e.frameTimer||0) + 1;
      if (e.frameTimer > 8) { e.frame = (e.frame+1)%2; e.frameTimer = 0; }
    }
  }

  function updateCoins(dt) {
    for (var i = 0; i < coinItems.length; i++) {
      var c = coinItems[i];
      if (!c.alive) continue;
      c.anim += 0.08;
      if (c.float) {
        c.y += c.floatVy;
        c.floatVy += 0.18;
        c.floatLife--;
        if (c.floatLife <= 0) { c.alive = false; continue; }
      }
      // Collect
      if (rectOverlap(player, c)) {
        c.alive = false;
        if (!c.float) { coins++; score += 200; updateUI(); }
        spawnParticles(c.x+5, c.y+6, C.coin, 4, 2);
      }
    }
  }

  function updateParticles() {
    for (var i = particles.length-1; i >= 0; i--) {
      var p = particles[i];
      p.x += p.vx; p.y += p.vy;
      p.vy += 0.1;
      p.life -= 0.03;
      if (p.life <= 0) particles.splice(i, 1);
    }
  }

  function updateBricks() {
    for (var i = 0; i < platforms.length; i++) {
      var p = platforms[i];
      if (p.bump > 0) p.bump -= 1.5;
    }
  }

  // ── Die / Win ──────────────────────────────
  function die() {
    if (player.invincible > 0) return;
    lives--;
    updateUI();
    spawnParticles(player.x+8, player.y+12, C.player, 8, 3);
    if (lives <= 0) { gameState = 'gameover'; return; }
    gameState = 'dead';
    deadTimer = 90;
    player.vy = -10;
    player.invincible = 90;
  }

  function updateUI() {
    var s = document.getElementById('hg-score');
    var c = document.getElementById('hg-coins');
    var l = document.getElementById('hg-lives');
    if (s) s.textContent = score;
    if (c) c.textContent = coins;
    if (l) l.textContent = lives;
  }

  function restartGame() {
    score = 0; coins = 0; lives = 3;
    updateUI();
    buildLevel();
    resetPlayer();
    camX = 0;
    particles = [];
    gameState = 'playing';
  }

  // ── Drawing ────────────────────────────────
  function drawBG() {
    // Sky gradient
    var grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, C.skyLight);
    grad.addColorStop(1, C.sky);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Clouds
    for (var i = 0; i < clouds.length; i++) {
      var cl = clouds[i];
      var cx2 = cl.x - camX;
      if (cx2 < -cl.w || cx2 > W + 10) continue;
      drawCloud(cx2, cl.y, cl.w);
    }
  }

  function drawCloud(x, y, w) {
    ctx.fillStyle = C.cloud;
    ctx.fillRect(x,     y+8,  w,   12);
    ctx.fillRect(x+4,   y+4,  w-8, 8);
    ctx.fillRect(x+8,   y,    w-16,8);
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    ctx.fillRect(x+2,   y+14, w,   6);
  }

  function drawPlatforms() {
    for (var i = 0; i < platforms.length; i++) {
      var p = platforms[i];
      var px = Math.floor(p.x - camX);
      var py = p.bump ? Math.floor(p.y - p.bump) : p.y;
      if (px + p.w < 0 || px > W) continue;

      if (p.type === 'ground') {
        ctx.fillStyle = C.ground;
        ctx.fillRect(px, py, p.w, p.h);
        ctx.fillStyle = C.groundDark;
        ctx.fillRect(px, py + p.h - 4, p.w, 4);
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.fillRect(px, py, p.w, 2);
      } else if (p.type === 'dirt') {
        ctx.fillStyle = C.dirt;
        ctx.fillRect(px, py, p.w, p.h);
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.fillRect(px+4, py+4, 4, 4);
        ctx.fillRect(px+10, py+10, 3, 3);
      } else if (p.type === 'brick') {
        ctx.fillStyle = p.hit ? '#884422' : C.brick;
        ctx.fillRect(px, py, p.w, p.h);
        if (!p.hit) {
          ctx.fillStyle = C.brickDark;
          ctx.fillRect(px, py, p.w, 1);
          ctx.fillRect(px, py, 1, p.h);
          ctx.fillRect(px + p.w/2, py + p.h/2, 1, p.h/2);
          ctx.fillRect(px, py + p.h/2, p.w/2, 1);
        }
      } else if (p.type === 'mystery') {
        if (p.hit) {
          ctx.fillStyle = '#888';
          ctx.fillRect(px, py, p.w, p.h);
          ctx.fillStyle = '#666';
          ctx.fillRect(px+2, py+2, p.w-4, p.h-4);
        } else {
          // Pulsing yellow
          var pulse = 0.7 + 0.3 * Math.sin(Date.now()/200);
          ctx.fillStyle = C.coin;
          ctx.globalAlpha = pulse;
          ctx.fillRect(px, py, p.w, p.h);
          ctx.globalAlpha = 1;
          ctx.fillStyle = C.black;
          ctx.font = 'bold 10px monospace';
          ctx.fillText('?', px+4, py+11);
        }
      } else if (p.type === 'hard') {
        ctx.fillStyle = '#8888cc';
        ctx.fillRect(px, py, p.w, p.h);
        ctx.fillStyle = '#6666aa';
        ctx.fillRect(px, py, p.w, 2);
        ctx.fillRect(px, py, 2, p.h);
        ctx.fillRect(px+p.w-2, py+2, 2, p.h-2);
        ctx.fillRect(px+2, py+p.h-2, p.w-2, 2);
      } else if (p.type === 'pipe_top') {
        ctx.fillStyle = C.pipe;
        ctx.fillRect(px-2, py, p.w+4, p.h);
        ctx.fillStyle = C.pipeDark;
        ctx.fillRect(px-2, py, p.w+4, 4);
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.fillRect(px, py+4, 6, p.h-4);
      } else if (p.type === 'pipe_body') {
        ctx.fillStyle = C.pipe;
        ctx.fillRect(px, py, p.w, p.h);
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.fillRect(px+2, py, 5, p.h);
        ctx.fillStyle = C.pipeDark;
        ctx.fillRect(px+p.w-3, py, 3, p.h);
      }
    }
  }

  function drawCoins() {
    for (var i = 0; i < coinItems.length; i++) {
      var c = coinItems[i];
      if (!c.alive) continue;
      var cx2 = Math.floor(c.x - camX);
      if (cx2 < -20 || cx2 > W+20) continue;
      var wobble = Math.abs(Math.sin(c.anim)) * c.w;
      ctx.fillStyle = C.coin;
      ctx.fillRect(cx2 + (c.w - wobble)/2, c.y, wobble, c.h);
      ctx.fillStyle = C.coinDark;
      ctx.fillRect(cx2 + (c.w - wobble)/2, c.y + c.h - 3, wobble, 3);
    }
  }

  function drawEnemies() {
    for (var i = 0; i < enemies.length; i++) {
      var e = enemies[i];
      if (!e.alive) continue;
      var ex = Math.floor(e.x - camX);
      if (ex < -20 || ex > W+20) continue;

      if (e.squished) {
        ctx.fillStyle = C.enemy;
        ctx.fillRect(ex, e.y + e.h - 6, e.w, 6);
        return;
      }

      if (e.type === 'goomba') {
        // Body
        ctx.fillStyle = C.enemy;
        ctx.fillRect(ex, e.y, e.w, e.h);
        // Eyes
        ctx.fillStyle = C.black;
        var eyeOff = e.frame === 0 ? 0 : 1;
        ctx.fillRect(ex+2, e.y+3, 3, 3);
        ctx.fillRect(ex+8, e.y+3, 3, 3);
        // Angry brow
        ctx.fillRect(ex+1, e.y+1, 4, 1);
        ctx.fillRect(ex+8, e.y+2, 4, 1);
        // Feet
        ctx.fillStyle = C.enemyDark;
        ctx.fillRect(ex + (e.frame===0?0:3), e.y+e.h-3, 4, 3);
        ctx.fillRect(ex + (e.frame===0?8:5), e.y+e.h-3, 4, 3);
      } else {
        // Koopa - green shell
        ctx.fillStyle = '#28c828';
        ctx.fillRect(ex, e.y+4, e.w, e.h-4);
        // Shell pattern
        ctx.fillStyle = '#187818';
        ctx.fillRect(ex+3, e.y+6, e.w-6, e.h-8);
        // Head
        ctx.fillStyle = '#f8c898';
        ctx.fillRect(ex+2, e.y, e.w-4, 6);
        ctx.fillStyle = C.black;
        ctx.fillRect(ex+5, e.y+2, 2, 2);
      }
    }
  }

  function drawPlayer() {
    if (player.invincible > 0 && Math.floor(player.invincible/4)%2===1) return;
    var px = Math.floor(player.x - camX);
    var py = Math.floor(player.y);
    var f  = player.facing;

    ctx.save();
    if (f === -1) {
      ctx.translate(px + player.w, 0);
      ctx.scale(-1, 1);
      px = 0;
    }

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(px+2, GROUND_Y+2, player.w-2, 4);

    // Boots
    ctx.fillStyle = '#884400';
    ctx.fillRect(px+1, py+player.h-5, 6, 5);
    ctx.fillRect(px+9, py+player.h-5, 6, 5);

    // Body (blue overalls)
    ctx.fillStyle = C.playerBody;
    ctx.fillRect(px+2, py+11, player.w-4, 9);

    // Skin (shirt)
    ctx.fillStyle = C.playerSkin;
    ctx.fillRect(px+3, py+8, player.w-6, 5);

    // Head
    ctx.fillStyle = C.playerSkin;
    ctx.fillRect(px+3, py+2, player.w-6, 8);

    // Hat
    ctx.fillStyle = C.player;
    ctx.fillRect(px+2, py+2, player.w-4, 3);
    ctx.fillRect(px+4, py, player.w-6, 3);

    // Mustache
    ctx.fillStyle = C.brickDark;
    ctx.fillRect(px+4, py+8, 8, 2);

    // Eye
    ctx.fillStyle = C.black;
    ctx.fillRect(px+10, py+5, 2, 2);

    // Buttons
    ctx.fillStyle = C.black;
    ctx.fillRect(px+7, py+12, 2, 2);

    ctx.restore();
  }

  function drawFlag() {
    var fx = Math.floor(flagX - camX);
    if (fx < -20 || fx > W+20) return;

    // Pole
    ctx.fillStyle = C.flagPole;
    ctx.fillRect(fx+2, flagY, 4, flagH);
    ctx.fillStyle = '#888';
    ctx.fillRect(fx+2, GROUND_Y, 4, TILE);

    // Flag
    var fh = flagTriggered ? Math.max(0, flagProgress) : 0;
    if (!flagTriggered) fh = flagH * 0.6;
    ctx.fillStyle = C.flagColor;
    ctx.fillRect(fx+6, flagY + (flagTriggered ? flagH - fh : 0), 20, 14);

    // Ball on top
    ctx.fillStyle = C.star;
    ctx.fillRect(fx, flagY-4, 8, 8);
  }

  function drawParticles() {
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.fillRect(Math.floor(p.x - camX), Math.floor(p.y), p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }

  function drawHUD() {
    // Mini-map indicator
    var prog = player.x / levelW;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(W-82, 6, 76, 8);
    ctx.fillStyle = C.green;
    ctx.fillRect(W-81, 7, Math.floor(74*prog), 6);
    ctx.fillStyle = C.player;
    ctx.fillRect(W-81 + Math.floor(74*prog)-1, 6, 3, 8);
  }

  function drawOverlay(text, sub) {
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = C.yellow;
    ctx.font = 'bold 18px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(text, W/2, H/2 - 10);
    if (sub) {
      ctx.fillStyle = C.cloud;
      ctx.font = '8px "Press Start 2P", monospace';
      ctx.fillText(sub, W/2, H/2 + 14);
    }
    ctx.textAlign = 'left';
  }

  function drawTitle() {
    drawBG();
    // Animated platforms preview
    ctx.fillStyle = C.ground;
    ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);

    drawOverlay('PIXEL KEEP', 'PRESS SPACE OR TAP TO START');

    // Bouncing player preview
    var bx = W/2 + Math.sin(Date.now()/600)*60;
    var by = GROUND_Y - 28 + Math.abs(Math.sin(Date.now()/400))*(-20);
    ctx.fillStyle = C.player;
    ctx.fillRect(bx-8, by, 16, 24);
    ctx.fillStyle = C.playerBody;
    ctx.fillRect(bx-6, by+10, 12, 10);
    ctx.fillStyle = C.playerSkin;
    ctx.fillRect(bx-5, by, 10, 10);
  }

  // ── Game Loop ──────────────────────────────
  var lastTime = 0;

  function loop(ts) {
    requestAnimationFrame(loop);

    ctx.clearRect(0, 0, W, H);

    if (gameState === 'title') {
      drawTitle();
      return;
    }

    if (gameState === 'gameover') {
      drawBG(); drawPlatforms(); drawCoins(); drawFlag(); drawEnemies(); drawPlayer(); drawParticles(); drawHUD();
      drawOverlay('GAME OVER', 'PRESS SPACE TO RETRY');
      return;
    }

    if (gameState === 'win') {
      drawBG(); drawPlatforms(); drawCoins(); drawFlag(); drawEnemies(); drawPlayer(); drawParticles(); drawHUD();
      drawOverlay('YOU WIN!  SCORE: ' + score, 'PRESS SPACE TO PLAY AGAIN');
      return;
    }

    if (gameState === 'dead') {
      deadTimer--;
      player.y += player.vy;
      player.vy += GRAVITY;
      drawBG(); drawPlatforms(); drawCoins(); drawFlag(); drawEnemies(); drawPlayer(); drawParticles(); drawHUD();
      if (deadTimer <= 0) {
        resetPlayer();
        camX = 0;
        particles = [];
        gameState = 'playing';
      }
      return;
    }

    // PLAYING
    updatePlayer();
    updateEnemies();
    updateCoins();
    updateParticles();
    updateBricks();

    if (flagTriggered) {
      flagProgress += 4;
      if (flagProgress >= flagH) {
        winTimer--;
        if (winTimer <= 0) gameState = 'win';
      }
    }

    drawBG();
    drawPlatforms();
    drawCoins();
    drawFlag();
    drawEnemies();
    drawPlayer();
    drawParticles();
    drawHUD();
  }

  // ── Input wiring ───────────────────────────
  document.addEventListener('keydown', function(e) {
    if (['ArrowLeft','KeyA'].includes(e.code))  { keys.left  = true; }
    if (['ArrowRight','KeyD'].includes(e.code)) { keys.right = true; }
    if (['ArrowUp','KeyW','Space'].includes(e.code)) {
      e.preventDefault();
      if (!keys.jump) jumpPressed = true;
      keys.jump = true;
      if (gameState === 'title')    { restartGame(); return; }
      if (gameState === 'gameover') { restartGame(); return; }
      if (gameState === 'win')      { restartGame(); return; }
    }
  });
  document.addEventListener('keyup', function(e) {
    if (['ArrowLeft','KeyA'].includes(e.code))  keys.left  = false;
    if (['ArrowRight','KeyD'].includes(e.code)) keys.right = false;
    if (['ArrowUp','KeyW','Space'].includes(e.code)) keys.jump = false;
  });

  // Mobile buttons
  window.hgMobile = function(btn, down) {
    if (btn === 'left')  { keys.left  = down; }
    if (btn === 'right') { keys.right = down; }
    if (btn === 'jump')  {
      keys.jump = down;
      if (down) {
        jumpPressed = true;
        if (gameState === 'title')    { restartGame(); return; }
        if (gameState === 'gameover') { restartGame(); return; }
        if (gameState === 'win')      { restartGame(); return; }
      }
    }
  };

  // Wire up mobile buttons after DOM ready
  var hgL = document.getElementById('hg-left');
  var hgR = document.getElementById('hg-right');
  var hgJ = document.getElementById('hg-jump');
  function wire(el, btn) {
    if (!el) return;
    el.addEventListener('touchstart', function(e){ e.preventDefault(); hgMobile(btn,true);  }, {passive:false});
    el.addEventListener('touchend',   function(e){ e.preventDefault(); hgMobile(btn,false); }, {passive:false});
    el.addEventListener('mousedown',  function(){ hgMobile(btn,true);  });
    el.addEventListener('mouseup',    function(){ hgMobile(btn,false); });
    el.addEventListener('mouseleave', function(){ hgMobile(btn,false); });
  }
  wire(hgL, 'left'); wire(hgR, 'right'); wire(hgJ, 'jump');

  // Click on canvas to start
  canvas.addEventListener('click', function() {
    if (gameState === 'title')    { restartGame(); return; }
    if (gameState === 'gameover') { restartGame(); return; }
    if (gameState === 'win')      { restartGame(); return; }
    canvas.focus();
  });

  // Init
  buildLevel();
  resetPlayer();
  requestAnimationFrame(loop);

})();
