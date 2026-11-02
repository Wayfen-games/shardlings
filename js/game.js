const $ = id => document.getElementById(id);
const W = 560, H = 720, VW = 300;
let VH = 400, topH = 0, botH = 0;
const cv = $('game'), ctx = cv.getContext('2d');
const reduced = matchMedia('(prefers-reduced-motion:reduce)').matches;
const rnd = (a, b) => a + Math.random() * (b - a);
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// ---------- 임시 도트 (전부 코드로 새로 그림). 몸의 빛나는 조각이 샤들링의 표시 ----------
const SLIME = [
  '....kkkkkk....','..kkllbbbbkk..','.kllbbbbbbbbk.','.klbbbbbbbbbk.','kbbbweebweebbk',
  'kbbbeeebeeebbk','kbcbbbbbbbbcbk','kbbbbbbddbbbbk','.kdbbbbbbbbdk.','..kkddddddkk..'];
const CROWN = [
  '......kSk.....','.....ksssk....','....kkkkkkk...','..kkllbbbbkk..','.kllbbbbbbbbk.','.klbbbbbbbbbk.','kbbbweebweebbk',
  'kbbbeeebeeebbk','kbcbbbbbbbbcbk','kbbbbbbddbbbbk','.kdbbbbbbbbdk.','..kkddddddkk..'];
const FIRE = [
  '......kSk.......','....kksskk......','...kllbbbbk.....','..klbbbbbbbk....','.kbbweebweebk...',
  '.kbbeeebeeebk.kk','.kcbbbbbbbbck.kx','.kbbbbddbbbbkkxk','..kbbbbbbbbbbxk.','..kdbbbbbbbddk..','..kkdk...kdkk...'];
const WATER = [
  '..kk..kSk..kk...','.kllk.kssk.kllk.','.kbbkkbbbbkkbbk.','..kkllbbbbbbkk..','..klbbbbbbbbbk..','.kbbweebweebbk..',
  '.kbbeeebeeebbk..','.kcbbbbbbbbbck..','.kbbbbbddbbbbbk.','..kllllllllllk..','...kkddddddkk...'];
const GRASS = [
  '...kk......kk...','..kllk.kSk.kllk.','..kbbk.ksk.kbbk.','..kbbkkkkkkkbbk.','...kllbbbbbbbk..','..klbbbbbbbbbbk.',
  '..kbweebbweebbk.','..kbeeebbeeebbk.','..kcbbbbbbbbbck.','..kbbbbbddbbbbk.','...kdbbbbbbbdk..','...kkdk...kdkk..'];
const HERO = [
  '...kkkkkk...','..khhhhhhk..','.khHHhhhhhk.','.khhhhhhhhk.','.khffffffhk.','.kfeeffeefk.','.kffcffcffk.',
  '..kkffffkk..','..kTtttTk...','.kfktttkfk..','..kttttttk..','...kmkkmk...','...kkk.kkk..'];
const BASE = { k:'#2b2140', w:'#ffffff', e:'#2b2140', c:'#ff8fa3', s:'#7fe9ff', S:'#eaffff', x:'#3b3350' };
const PAL = {
  fire:{ b:'#ff8a5c', l:'#ffc08a', d:'#d95a3c' },
  water:{ b:'#58b6f0', l:'#a6e0fa', d:'#3a86cc' },
  grass:{ b:'#7fd46a', l:'#bdf0a0', d:'#4fa550' },
  light:{ b:'#ffe27a', l:'#fff6c9', d:'#e0b340' },
  dark:{ b:'#9b7fd6', l:'#c9b5f0', d:'#6a4fa8' },
};
const HEROPAL = { h:'#7a4a8f', H:'#a874b8', f:'#ffdcbc', e:'#2b2140', c:'#ff9fa8', t:'#f2f0ff', T:'#ffd45e', m:'#5d4a8a', k:'#2b2140' };
function sprite(rows, pal) {
  const w = Math.max(...rows.map(r => r.length)), h = rows.length;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d');
  rows.forEach((r, j) => [...r].forEach((ch, i) => { const col = pal[ch] || BASE[ch]; if (col && ch !== '.') { x.fillStyle = col; x.fillRect(i, j, 1, 1); } }));
  const f = document.createElement('canvas'); f.width = w; f.height = h;
  const y = f.getContext('2d'); y.drawImage(c, 0, 0); y.globalCompositeOperation = 'source-in'; y.fillStyle = '#fff'; y.fillRect(0, 0, w, h);
  return { n:c, f, w, h };
}
const SP = {
  fire:sprite(FIRE, PAL.fire), water:sprite(WATER, PAL.water), grass:sprite(GRASS, PAL.grass),
  sfire:sprite(SLIME, PAL.fire), swater:sprite(SLIME, PAL.water), sgrass:sprite(SLIME, PAL.grass), slight:sprite(SLIME, PAL.light), sdark:sprite(SLIME, PAL.dark),
  hero:sprite(HERO, HEROPAL),
};
// GPT 그림 3종. 불러오기 전과 실패했을 때는 코드 도트가 대신 나온다
function loadArt(key, src) {
  const im = new Image();
  im.onload = () => {
    const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; c.getContext('2d').drawImage(im, 0, 0);
    const f = document.createElement('canvas'); f.width = im.width; f.height = im.height;
    const y = f.getContext('2d'); y.drawImage(c, 0, 0); y.globalCompositeOperation = 'source-in'; y.fillStyle = '#fff'; y.fillRect(0, 0, im.width, im.height);
    SP[key] = { n:c, f, w:im.width, h:im.height, art:true };
  };
  im.src = src;
}
loadArt('fire', 'art/fire.png'); loadArt('water', 'art/water.png'); loadArt('grass', 'art/grass.png');
const artFace = (sp, f) => sp.art ? -f : f; // 그림은 왼쪽을 보고 있음
const BIG = {};
['fire', 'water', 'grass'].forEach(k => { const im = new Image(); im.onload = () => { BIG[k] = im; }; im.src = `art/big/${k}.png`; });

// 빛·어둠과 합성 결과는 체형 3종에 색만 입힌 임시 그림. 머리의 조각 색은 그대로 둔다
const { ELS, ELN, SHAPE } = SH;
const ELHUE = { fire:25, water:211, grass:90, light:48, dark:270 };
const BASEHUE = { fire:25, water:211, grass:90 };
function recolor(src, from, to) {
  const c = document.createElement('canvas'); c.width = src.width; c.height = src.height;
  const x = c.getContext('2d'); x.drawImage(src, 0, 0);
  try {
    const d = x.getImageData(0, 0, c.width, c.height), p = d.data;
    for (let i = 0; i < p.length; i += 4) {
      if (!p[i + 3]) continue;
      const r = p[i] / 255, g = p[i + 1] / 255, b = p[i + 2] / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, dl = mx - mn;
      if (dl < .08 || l < .07) continue;
      const s = dl / (1 - Math.abs(2 * l - 1));
      let h = mx === r ? 60 * (((g - b) / dl) % 6) : mx === g ? 60 * ((b - r) / dl + 2) : 60 * ((r - g) / dl + 4);
      if (h < 0) h += 360;
      if (s < .22 || (h > 172 && h < 199 && s > .5)) continue; // 크림색 피부와 조각
      const q = l < .5 ? l * (1 + s) : l + s - l * s, m = 2 * l - q, H = (h - from + to + 360) % 360;
      const f = t => { t = (t + 360) % 360; return t < 60 ? m + (q - m) * t / 60 : t < 180 ? q : t < 240 ? m + (q - m) * (240 - t) / 60 : m; };
      p[i] = f(H + 120) * 255; p[i + 1] = f(H) * 255; p[i + 2] = f(H - 120) * 255;
    }
    x.putImageData(d, 0, 0);
  } catch (e) { /* 색을 못 바꾸면 원래 색으로 보여 준다 */ }
  return c;
}
const spCache = {}, bigCache = {};
function getSp(m) {
  const base = SP[m.shape];
  if (m.shape === m.el || !base.art) return base;
  const k = m.shape + ':' + m.el;
  if (!spCache[k]) spCache[k] = { n:recolor(base.n, BASEHUE[m.shape], ELHUE[m.el]), f:base.f, w:base.w, h:base.h, art:true };
  return spCache[k];
}
function getBig(m) {
  const base = BIG[m.shape];
  if (!base) return getSp(m).n;
  const k = m.shape + ':' + m.el;
  if (!bigCache[k]) bigCache[k] = m.shape === m.el ? base : recolor(base, BASEHUE[m.shape], ELHUE[m.el]);
  return bigCache[k];
}
const hsl = (h, s, l) => `hsl(${h} ${s}% ${l}%)`;
const BOSSFR = Array.from({ length:8 }, (_, i) => { const h = i * 45; return sprite(CROWN, { b:hsl(h, 85, 66), l:hsl(h + 40, 90, 84), d:hsl(h - 30, 70, 50) }); });

// ---------- 떠 있는 섬 ----------
const MAPS = [
  { name:'새싹 들판', mobs:['grass', 'water', 'light'], g:['#7ccf6a','#6ec25e','#8edb7a'], earth:['#a26f49','#764c33'], leaf:['#3f9e58','#63c46f'], trunk:'#7a5236', fl:['#ffe27a','#ff9bb5','#ffffff'], sky:['#8fd6f5','#b5e6f8','#d9f2f4','#ffe9d6'] },
  { name:'단풍 고개', mobs:['fire', 'grass', 'dark'], g:['#d9b45e','#cfa44f','#e6c673'], earth:['#8f5f46','#5f3d33'], leaf:['#d9603f','#f2935a'], trunk:'#5e3d30', fl:['#ffe27a','#ff7f5e','#fff0c9'], sky:['#f7b98a','#fbd0a0','#fde2bb','#fff0d6'] },
  { name:'눈꽃 언덕', mobs:['water', 'light', 'dark'], g:['#e4f0fa','#d4e4f4','#f4fafe'], earth:['#7f8fb5','#56618c'], leaf:['#6d9fc7','#a8d3ea'], trunk:'#5e5474', fl:['#bfe9ff','#d6c9ff','#ffffff'], sky:['#6d7fc4','#8d9cd8','#b5bfe8','#d9dcf5'] },
];
const cx = W / 2, cy = H / 2;
let seed = 7;
function isLand(x, y) {
  const dx = (x - cx) / (W * .46), dy = (y - cy) / (H * .46), a = Math.atan2(dy, dx);
  return Math.hypot(dx, dy) < .94 + .07 * Math.sin(3 * a + seed) + .04 * Math.sin(7 * a + seed * 2);
}
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function blob(x, cxx, cyy, r, col) { x.fillStyle = col; for (let j = -r; j <= r; j++) { const hw = Math.round(Math.sqrt(r * r - j * j)); x.fillRect(cxx - hw, cyy + j, hw * 2 + 1, 1); } }
function buildWorld(m) {
  const c = document.createElement('canvas'); c.width = W; c.height = H + 40;
  const x = c.getContext('2d'), r = mulberry(seed * 1000), S = 8;
  for (let j = 0; j < H; j += S) for (let i = 0; i < W; i += S) {
    const here = isLand(i + 4, j + 4);
    if (!here) continue;
    const n = Math.sin(i * .021 + seed) + Math.cos(j * .027 - seed) + Math.sin((i + j) * .013);
    x.fillStyle = n > .7 ? m.g[2] : n > -.5 ? m.g[0] : m.g[1];
    x.fillRect(i, j, S, S);
    if (r() < .3) { x.fillStyle = m.g[n > 0 ? 1 : 2]; x.fillRect(i + (r() * 7 | 0), j + (r() * 7 | 0), 2, 1); }
    if (!isLand(i + 4, j + 12)) { // 절벽: 땅이 쪼개진 단면과 박힌 조각
      const dep = 14 + (r() * 22 | 0);
      x.fillStyle = m.earth[0]; x.fillRect(i, j + S, S, dep);
      x.fillStyle = m.earth[1]; x.fillRect(i, j + S + dep - 6, S, 6);
      if (r() < .16) { x.fillStyle = '#7fe9ff'; x.fillRect(i + 2, j + S + 6, 3, 5); x.fillStyle = '#eaffff'; x.fillRect(i + 3, j + S + 6, 1, 2); }
      x.fillStyle = m.g[1]; x.fillRect(i, j + S - 2, S, 2);
    }
  }
  const items = [];
  for (let n = 0; n < 260; n++) {
    const px = r() * W | 0, py = r() * H | 0;
    if (!isLand(px, py) || !isLand(px, py + 22) || !isLand(px + 12, py) || !isLand(px - 12, py)) continue;
    items.push({ px, py, k:r() });
  }
  items.sort((a, b) => a.py - b.py);
  for (const it of items) {
    const { px, py, k } = it;
    if (k < .58) { x.fillStyle = m.fl[r() * 3 | 0]; x.fillRect(px, py - 1, 1, 3); x.fillRect(px - 1, py, 3, 1); }
    else if (k < .72) { // 땅에 박힌 조각
      x.fillStyle = 'rgba(40,30,60,.25)'; x.fillRect(px - 3, py + 1, 8, 2);
      x.fillStyle = '#2b2140'; x.fillRect(px - 1, py - 8, 5, 10);
      x.fillStyle = '#7fe9ff'; x.fillRect(px, py - 7, 3, 8);
      x.fillStyle = '#eaffff'; x.fillRect(px, py - 7, 1, 4);
    } else if (k < .92) { // 둥근 나무
      x.fillStyle = 'rgba(40,30,60,.25)'; x.fillRect(px - 8, py + 2, 17, 3);
      x.fillStyle = '#2b2140'; x.fillRect(px - 3, py - 9, 7, 12);
      x.fillStyle = m.trunk; x.fillRect(px - 2, py - 9, 5, 11);
      blob(x, px, py - 16, 11, '#2b2140'); blob(x, px, py - 16, 10, m.leaf[0]);
      blob(x, px - 2, py - 19, 6, m.leaf[1]);
    } else { // 돌
      blob(x, px, py, 4, '#2b2140'); blob(x, px, py, 3, '#a8a3b8'); x.fillStyle = '#d3cfdd'; x.fillRect(px - 2, py - 2, 2, 1);
    }
  }
  return c;
}
function randLandNear(p, a, b) {
  for (let i = 0; i < 30; i++) {
    const t = rnd(0, 6.283), d = rnd(a, b), x = p.x + Math.cos(t) * d, y = p.y + Math.sin(t) * d;
    if (isLand(x, y)) return { x, y };
  }
  return { x:cx + rnd(-60, 60), y:cy + rnd(-60, 60) };
}
const cloud = (() => { const c = document.createElement('canvas'); c.width = 44; c.height = 18; const x = c.getContext('2d'); blob(x, 12, 11, 6, '#fff'); blob(x, 22, 8, 7, '#fff'); blob(x, 32, 11, 6, '#fff'); x.fillStyle = '#fff'; x.fillRect(8, 11, 30, 6); return c; })();
const clouds = Array.from({ length:7 }, () => ({ x:rnd(0, 300), y:rnd(0, 500), v:rnd(2, 6) }));

// ---------- 상태 ----------
const WIN = { grass:'water', water:'fire', fire:'grass', light:'dark', dark:'light' };
const COL = { fire:'#ff8a5c', water:'#58b6f0', grass:'#7fd46a', light:'#ffe27a', dark:'#9b7fd6', gold:'#ffd45e', rainbow:'#ffffff' };
const G = {
  t:0, st:null, map:0, world:null, phase:'hunt', phaseT:0, kills:0, need:SH.B.GAUGE_KILLS, ghosts:[], paused:false, party:[], enemies:[], boss:null, hero:null,
  shots:[], parts:[], floats:[], orbs:[], cmd:null, ripple:null, shake:0, slow:1, slowT:0,
  cheer:0, shield:0, cdCheer:0, cdHeal:0, cdShield:0, spawnT:0, stress:0, stressS:[], cam:{ x:0, y:0 }, muted:false, hintT:9,
};
// 저장되는 값은 G.st에 있다
['stage', 'maxStage', 'gold', 'roster', 'partyIds', 'souls', 'dex'].forEach(k => Object.defineProperty(G, k, { get() { return G.st[k]; }, set(v) { G.st[k] = v; } }));
const isCleared = () => !!G.st.cleared[G.stage];
const es = () => Math.pow(SH.B.ISLAND_STAT, G.stage - 1);
const statMult = SH.statMult;
function makeUnit(m) {
  const d = SHAPE[m.shape], hp = d.hp * statMult(m);
  return { mon:m, el:m.el, shape:m.shape, range:d.range, cd:d.cd, atk:d.atk, spd:d.spd, hp, maxHp:hp, x:cx, y:cy, cdT:rnd(0, .5), skT:rnd(3, 7), hop:rnd(0, 6), face:1, flash:0, lunge:0, lx:0, ly:0, down:0, target:null, tt:0, moving:false };
}
function syncParty() {
  const old = G.party;
  G.party = G.partyIds.map(id => old.find(u => u.mon.id === id) || makeUnit(G.roster.find(m => m.id === id)));
}
function mkParty() {
  G.hero = { x:cx, y:cy + 26, face:1, hop:0, cast:0 };
  syncParty();
}
function loadMap() {
  G.map = (G.stage - 1) % MAPS.length; seed = 7 + G.stage * 3;
  G.world = buildWorld(MAPS[G.map]);
  G.enemies = []; G.shots = []; G.orbs = []; G.boss = null; G.kills = 0; G.phase = 'hunt'; G.cmd = null;
  const h = { x:cx, y:cy };
  if (!G.hero) mkParty();
  G.hero.x = h.x; G.hero.y = h.y + 14;
  G.party.forEach((u, i) => { u.x = h.x + (i - 1) * 32; u.y = h.y; u.hp = u.maxHp; u.down = 0; });
  G.cam.x = h.x - VW / 2; G.cam.y = h.y - VH / 2;
  $('stage').textContent = `${G.stage}번 섬 · ${MAPS[G.map].name}`;
  $('gaugeBar').classList.remove('boss');
  for (let i = 0; i < 6; i++) spawn();
}
function spawn() {
  const pos = randLandNear(G.hero, 70, 170), mobs = SH.islandMobs(G.stage), el = mobs[Math.random() * mobs.length | 0], s = es();
  const elite = Math.random() < SH.B.ELITE_CHANCE, em = elite ? SH.B.ELITE_STAT : 1, hp = SH.B.ENEMY_HP * s * em;
  G.enemies.push({ el, x:pos.x, y:pos.y, hp, maxHp:hp, atk:SH.B.ENEMY_ATK * s * em, elite, cdT:rnd(.4, 1), hop:rnd(0, 6), face:1, flash:0, lunge:0, lx:0, ly:0, born:.3, vx:0, vy:0, wt:0, wx:pos.x, wy:pos.y, slow:0 });
}

// ---------- 소리 ----------
let ac = null;
function audio() { if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ac = null; } } if (ac && ac.state === 'suspended') ac.resume(); }
const last = {};
function blip(name, f, d, type = 'square', v = .035, slide = 0) {
  if (G.muted || !ac) return;
  const now = ac.currentTime; if (last[name] && now - last[name] < .05) return; last[name] = now;
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(f, now); if (slide) o.frequency.linearRampToValueAtTime(f + slide, now + d);
  g.gain.setValueAtTime(v, now); g.gain.linearRampToValueAtTime(0, now + d);
  o.connect(g); g.connect(ac.destination); o.start(now); o.stop(now + d);
}
const fan = (notes, gap = .08) => notes.forEach((n, i) => setTimeout(() => blip('f' + i + n, n, .12, 'square', .04), i * gap * 1000));

// ---------- 효과 ----------
function burst(x, y, col, n, sp = 50, life = .45) { if (G.parts.length > 220) return; for (let i = 0; i < n; i++) { const t = rnd(0, 6.283), v = rnd(sp * .3, sp); G.parts.push({ x, y, vx:Math.cos(t) * v, vy:Math.sin(t) * v - 12, t:0, life:rnd(life * .6, life), col, s:Math.random() < .3 ? 2 : 1 }); } }
function float(x, y, val, col, big) { if (G.floats.length > 40) G.floats.shift(); G.floats.push({ x:x + rnd(-3, 3), y, val, col, big, t:0 }); }
function shake(v) { if (!reduced) G.shake = Math.max(G.shake, v); }
let bannerTimer = 0;
function banner(html, ms = 1500) { const b = $('banner'); b.innerHTML = html; b.classList.remove('show'); void b.offsetWidth; b.classList.add('show'); clearTimeout(bannerTimer); bannerTimer = setTimeout(() => { b.innerHTML = ''; }, ms); }

// ---------- 전투 ----------
function hurt(t, amt, el, crit) {
  if (t.isBoss && t.state === 'stun') amt *= 1.5;
  const m = t.isBoss ? 1 : WIN[el] === t.el ? 1.3 : WIN[t.el] === el ? .8 : 1;
  const d = Math.max(1, Math.round(amt * m));
  t.hp -= d; t.flash = .09;
  float(t.x, t.y - (t.isBoss ? 56 : 24), d, crit ? '#ffd45e' : m > 1 ? '#fff6dc' : '#d9d3ee', crit);
  blip('hit', crit ? 620 : 300 + Math.random() * 60, .05, 'square', .025, -120);
  if (crit) shake(2);
  if (t.hp <= 0) { if (t.isBoss) killBoss(t); else kill(t); }
}
function kill(e) {
  G.enemies.splice(G.enemies.indexOf(e), 1);
  G.ghosts.push({ sp:SP['s' + e.el], x:e.x, y:e.y, t:0 });
  burst(e.x, e.y - 5, COL[e.el], 12, 55);
  burst(e.x, e.y - 5, '#ffffff', 4, 30);
  blip('kill', 240, .1, 'triangle', .06, -140);
  const r = SH.grantKill(G.st, G.stage, e.el, e.elite, Math.random);
  r.drops.forEach(d => { dropOrb(e.x, e.y - 6, d.el, d.tier); if (d.tier >= Math.max(3, G.stage)) rareDrop(d); });
  showLevelUps(r.ups);
  if (G.phase === 'hunt' && !G.stress && !isCleared()) { G.kills++; if (G.kills >= G.need) startWarn(); }
}
function rareDrop(d) { banner(`${d.tier}단계 소울!<small>${ELN[d.el]} 속성</small>`, 1300); fan([880, 1175, 1568]); shake(2); }
function dropOrb(x, y, el, tier) { const t = rnd(0, 6.283), v = rnd(20, 50); G.orbs.push({ x, y, vx:Math.cos(t) * v, vy:Math.sin(t) * v - 25, t:0, el, tier }); }
function showLevelUps(ups) {
  ups.forEach(m => {
    const u = G.party.find(p => p.mon === m); if (!u) return;
    const hp = SHAPE[m.shape].hp * statMult(m);
    u.hp = u.down > 0 ? u.hp : Math.min(hp, u.hp + hp * .3); u.maxHp = hp;
    burst(u.x, u.y - 14, '#ffd45e', 10, 40, .7); float(u.x, u.y - 40, m.level, '#ffd45e', true); blip('lv', 784, .12, 'square', .04, 300);
    if (m.tier < SH.B.MAX_TIER && m.level === SH.B.FUSE_LEVEL[m.tier - 1]) { banner(`${m.name} 합성 준비 완료<small>마을에서 합성할 수 있어요</small>`, 1800); fan([523, 659, 784, 1047]); }
  });
}
function startWarn() {
  G.phase = 'warn'; G.phaseT = 2.2;
  banner('보스가 깨어나요<small>빨간 원이 뜨면 보호막을 누르세요</small>', 2200);
  fan([196, 185, 175, 165], .22); shake(3);
  G.enemies.forEach(e => burst(e.x, e.y - 5, COL[e.el], 6, 40)); G.enemies = [];
  $('gaugeBar').classList.add('boss');
}
function spawnBoss() {
  const pos = randLandNear(G.hero, 60, 90), hp = SH.B.BOSS_HP * es();
  G.boss = { isBoss:true, el:'rainbow', x:pos.x, y:pos.y, z:0, hp, maxHp:hp, atk:SH.B.BOSS_ATK * es(), state:'chase', st:2.5, cdT:1, hop:0, face:1, flash:0, tx:0, ty:0, born:.5, r:46, sx:0, sy:0 };
  G.phase = 'boss'; shake(5); burst(pos.x, pos.y - 10, '#ffffff', 40, 90, .8); blip('boss', 90, .5, 'sawtooth', .07, 60);
}
function killBoss(b) {
  G.boss = null; G.phase = 'clear'; G.phaseT = 4; G.slowT = 1.1; G.shots = [];
  for (let i = 0; i < 5; i++) burst(b.x + rnd(-14, 14), b.y - 16 + rnd(-14, 14), `hsl(${i * 72} 90% 70%)`, 22, 110, 1);
  const rb = SH.grantBoss(G.st, G.stage, Math.random);
  rb.drops.slice(0, 40).forEach(d => dropOrb(b.x, b.y - 16, d.el, d.tier));
  showLevelUps(rb.ups);
  shake(7); saveGame();
  banner(`${G.stage}번 섬 정복!<small>마을로 돌아가요</small>`, 3400);
  fan([523, 659, 784, 1047, 1319, 1568], .1);
}
function slam(b) {
  const blocked = G.shield > 0;
  shake(blocked ? 4 : 8); burst(b.x, b.y, '#fff6dc', 30, 110, .6);
  blip('slam', blocked ? 900 : 70, .3, blocked ? 'square' : 'sawtooth', .08, blocked ? 300 : -30);
  G.party.forEach(u => {
    if (u.down > 0) return;
    if (Math.hypot(u.x - b.tx, u.y - b.ty) > b.r) return;
    const d = u.maxHp * (blocked ? .04 : .45);
    u.hp -= d; u.flash = .12; float(u.x, u.y - 16, Math.round(d), blocked ? '#8cf2ff' : '#ff6b6b', !blocked);
    if (u.hp <= 0) knockout(u);
  });
  if (blocked) { b.state = 'stun'; b.st = 2.6; banner('막았다!<small>보스가 휘청거려요. 피해 1.5배</small>', 1100); fan([784, 1047, 1319]); }
  else { b.state = 'chase'; b.st = 4.6; }
}
function knockout(u) {
  u.hp = 0; u.down = 6; burst(u.x, u.y - 6, '#ffffff', 10, 35);
  if (G.party.every(p => p.down > 0)) { if (G.boss) G.boss.hp = Math.min(G.boss.maxHp, G.boss.hp + G.boss.maxHp * .1); banner('모두 쓰러졌어요<small>잠시 뒤 일어나요</small>', 1400); }
}
function useSkill(u, t) {
  u.skT = rnd(6, 8);
  const pow = u.atk * statMult(u.mon) * (G.cheer > 0 ? 1.3 : 1);
  if (u.shape === 'fire') {
    if (dist(u, t) > 90) { u.skT = 1; return; }
    const a = Math.atan2(t.y - u.y, t.x - u.x); u.lunge = .22; u.lx = Math.cos(a) * 16; u.ly = Math.sin(a) * 16;
    burst(t.x, t.y - 8, COL[u.el], 16, 80, .5); shake(2); blip('sk', 200, .18, 'sawtooth', .05, 300);
    hurt(t, pow * 2.6, u.el, true);
  } else if (u.shape === 'water') {
    const low = G.party.filter(p => p.down <= 0).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
    if (!low || low.hp / low.maxHp > .85) { u.skT = 1; return; }
    const heal = low.maxHp * .14; low.hp = Math.min(low.maxHp, low.hp + heal);
    burst(low.x, low.y - 12, '#b7ffb0', 14, 34, .7); float(low.x, low.y - 34, Math.round(heal), '#b7ffb0'); blip('sk', 880, .16, 'triangle', .05, 300);
  } else {
    const near = (G.boss ? [G.boss] : G.enemies).filter(e => dist(e, u) < 56);
    if (!near.length) { u.skT = 1; return; }
    for (let i = 0; i < 18; i++) { const b = i / 18 * 6.283; G.parts.push({ x:u.x + Math.cos(b) * 20, y:u.y - 8 + Math.sin(b) * 14, vx:Math.cos(b) * 70, vy:Math.sin(b) * 50, t:0, life:.34, col:COL[u.el], s:2 }); }
    blip('sk', 420, .14, 'square', .04, -160);
    [...near].forEach(e => { if (e.hp > 0) hurt(e, pow * 1.1, u.el); });
  }
}
function fire(u, t) {
  const crit = Math.random() < .12, m = statMult(u.mon) * (G.cheer > 0 ? 1.3 : 1), amt = u.atk * m * (crit ? 1.8 : 1);
  u.face = t.x >= u.x ? 1 : -1;
  const a = Math.atan2(t.y - u.y, t.x - u.x);
  if (u.shape === 'grass') {
    u.lunge = .14; u.lx = Math.cos(a) * 7; u.ly = Math.sin(a) * 7;
    for (let i = -3; i <= 3; i++) { const b = a + i * .22; G.parts.push({ x:u.x + Math.cos(b) * 24, y:u.y - 12 + Math.sin(b) * 22, vx:Math.cos(b) * 14, vy:Math.sin(b) * 14, t:0, life:.16, col:'#e8ffd6', s:2 }); }
    if (!t.isBoss) { t.x += Math.cos(a) * 3; t.y += Math.sin(a) * 3; }
    hurt(t, amt, u.el, crit);
  } else {
    G.shots.push({ el:u.el, splash:u.shape === 'fire', x:u.x + Math.cos(a) * 14, y:u.y - 16 + Math.sin(a) * 8, t, amt, crit, sp:u.shape === 'fire' ? 105 : 120, life:1.6, r:u.shape === 'fire' ? 6 : 5 });
    burst(u.x + Math.cos(a) * 14, u.y - 16 + Math.sin(a) * 8, COL[u.el], 6, 34, .22);
    u.lunge = .1; u.lx = -Math.cos(a) * 2; u.ly = -Math.sin(a) * 2;
    blip('shot', u.shape === 'fire' ? 180 : 500, .06, 'triangle', .025, u.shape === 'fire' ? 90 : -220);
  }
}
function skill(name) {
  audio();
  if (name === 'cheer' && G.cdCheer <= 0) { G.cheer = 8; G.cdCheer = 14; G.hero.cast = .4; G.party.forEach(u => burst(u.x, u.y - 8, '#ffd45e', 12, 40, .6)); fan([659, 784, 988], .06); }
  if (name === 'heal' && G.cdHeal <= 0) { G.cdHeal = 12; G.hero.cast = .4; G.party.forEach(u => { if (u.down > 0) { u.down = 0; u.hp = u.maxHp * .5; } else u.hp = Math.min(u.maxHp, u.hp + u.maxHp * .35); burst(u.x, u.y - 8, '#b7ffb0', 10, 28, .7); float(u.x, u.y - 18, Math.round(u.maxHp * .35), '#b7ffb0'); }); fan([784, 988, 1175], .06); }
  if (name === 'shield' && G.cdShield <= 0) { G.shield = 2.3; G.cdShield = 5; G.hero.cast = .4; fan([988, 1319], .05); }
}

// ---------- 갱신 ----------
function keepOn(e) { if (!isLand(e.x, e.y)) { e.x += (cx - e.x) * .04; e.y += (cy - e.y) * .04; } }
function stepTo(e, tx, ty, sp, dt) { const d = Math.hypot(tx - e.x, ty - e.y) || 1; e.x += (tx - e.x) / d * sp * dt; e.y += (ty - e.y) / d * sp * dt; if (Math.abs(tx - e.x) > 1) e.face = tx > e.x ? 1 : -1; e.hop += dt * 11; keepOn(e); }
function nearest(p, list) { let b = null, bd = 1e9; for (const e of list) { const d = (e.x - p.x) ** 2 + (e.y - p.y) ** 2; if (d < bd) { bd = d; b = e; } } return b; }
function update(dt) {
  G.t += dt;
  ['cheer', 'shield', 'cdCheer', 'cdHeal', 'cdShield'].forEach(k => { G[k] = Math.max(0, G[k] - dt); });
  if (G.cmd) { G.cmd.t -= dt; if (G.cmd.t <= 0) G.cmd = null; }
  // 스폰
  if (G.phase === 'hunt' || G.stress > 0) {
    G.spawnT -= dt;
    const cap = G.stress > 0 ? 60 : 9;
    if (G.spawnT <= 0 && G.enemies.length < cap) { spawn(); G.spawnT = G.stress > 0 ? .03 : SH.B.SPAWN_EVERY; }
  }
  if (G.stress > 0) { G.stress -= dt; if (G.stress <= 0) endStress(); }
  if (G.phase === 'warn') { G.phaseT -= dt; if (G.phaseT <= 0) spawnBoss(); }
  if (G.phase === 'clear') { G.phaseT -= dt; if (G.phaseT <= 0 && !G.nextPending) nextIsland(); }
  // 샤들링
  const foes = G.boss ? [G.boss] : G.enemies;
  const h = G.hero;
  G.party.forEach((u, i) => {
    u.flash = Math.max(0, u.flash - dt); u.lunge = Math.max(0, u.lunge - dt);
    if (u.down > 0) { u.down -= dt; if (u.down <= 0) { u.hp = u.maxHp * .5; burst(u.x, u.y - 8, '#ffffff', 12, 35); } return; }
    if (!G.boss) u.hp = Math.min(u.maxHp, u.hp + u.maxHp * .025 * dt);
    u.cdT -= dt; u.tt -= dt;
    if (u.tt <= 0 || (u.target && (u.target.hp <= 0))) { u.target = nearest(u, foes); u.tt = .25; }
    const t = u.target && u.target.hp > 0 ? u.target : null;
    u.moving = false;
    if (G.cmd) {
      const a = i / 3 * 6.283, gx = G.cmd.x + Math.cos(a) * 26, gy = G.cmd.y + Math.sin(a) * 18;
      if (Math.hypot(gx - u.x, gy - u.y) > 4) { stepTo(u, gx, gy, u.spd * 1.25, dt); u.moving = true; }
      if (t && dist(u, t) <= u.range + (t.isBoss ? 28 : 0) && u.cdT <= 0) { fire(u, t); u.cdT = u.cd; }
    } else if (t) {
      const reach = u.range + (t.isBoss ? 28 : 0), d = dist(u, t);
      if (d > reach) { stepTo(u, t.x, t.y, u.spd, dt); u.moving = true; }
      else if (u.cdT <= 0) { fire(u, t); u.cdT = u.cd; }
    } else if (dist(u, h) > 44) { stepTo(u, h.x, h.y, u.spd, dt); u.moving = true; }
    u.skT -= dt; if (u.skT <= 0 && t) useSkill(u, t);
    // 서로 겹치지 않게
    for (const o of G.party) if (o !== u && o.down <= 0) { const dx = u.x - o.x, dy = u.y - o.y, d = Math.hypot(dx, dy) || 1; if (d < 30) { u.x += dx / d * 26 * dt; u.y += dy / d * 26 * dt; } }
  });
  // 인간 캐릭터: 파티 뒤를 따라다님
  const alive = G.party.filter(u => u.down <= 0), ax = alive.length ? alive.reduce((s, u) => s + u.x, 0) / alive.length : h.x, ay = alive.length ? alive.reduce((s, u) => s + u.y, 0) / alive.length : h.y;
  h.cast = Math.max(0, h.cast - dt);
  const hd = Math.hypot(ax - h.x, ay + 26 - h.y);
  if (hd > 16) { stepTo(h, ax, ay + 26, Math.min(70, 30 + hd), dt); }
  // 적
  for (const e of [...G.enemies]) {
    e.flash = Math.max(0, e.flash - dt); e.lunge = Math.max(0, e.lunge - dt); e.born = Math.max(0, e.born - dt); e.cdT -= dt;
    const t = nearest(e, alive);
    if (t && dist(e, t) < 75) {
      if (dist(e, t) > 26) stepTo(e, t.x, t.y, 22, dt);
      else if (e.cdT <= 0) {
        e.cdT = 1.3; const a = Math.atan2(t.y - e.y, t.x - e.x); e.lunge = .12; e.lx = Math.cos(a) * 5; e.ly = Math.sin(a) * 5;
        if (G.shield <= 0) { t.hp -= e.atk; t.flash = .08; if (t.hp <= 0) knockout(t); }
      }
    } else { e.wt -= dt; if (e.wt <= 0) { const p = randLandNear(e, 10, 40); e.wx = p.x; e.wy = p.y; e.wt = rnd(1.5, 3.5); } if (Math.hypot(e.wx - e.x, e.wy - e.y) > 3) stepTo(e, e.wx, e.wy, 10, dt); }
  }
  // 보스
  const b = G.boss;
  if (b) {
    b.flash = Math.max(0, b.flash - dt); b.born = Math.max(0, b.born - dt); b.st -= dt; b.cdT -= dt;
    const t = nearest(b, alive);
    if (b.state === 'chase') {
      if (t && dist(b, t) > 40) stepTo(b, t.x, t.y, 17, dt);
      else if (t && b.cdT <= 0) { b.cdT = 1.5; t.hp -= G.shield > 0 ? 1 : b.atk; t.flash = .1; shake(1); if (t.hp <= 0) knockout(t); }
      if (b.st <= 0) { b.state = 'tele'; b.st = 1.7; b.tx = ax; b.ty = ay; blip('warn', 700, .3, 'square', .05, -300); }
    } else if (b.state === 'tele') {
      b.hop = 0;
      if (b.st <= 0) { b.state = 'jump'; b.st = .36; b.sx = b.x; b.sy = b.y; }
    } else if (b.state === 'jump') {
      const k = 1 - b.st / .36; b.x = b.sx + (b.tx - b.sx) * k; b.y = b.sy + (b.ty - b.sy) * k; b.z = Math.sin(k * Math.PI) * 42;
      if (b.st <= 0) { b.z = 0; b.x = b.tx; b.y = b.ty; slam(b); }
    } else if (b.state === 'stun') { if (b.st <= 0) { b.state = 'chase'; b.st = 4.6; } }
  }
  // 투사체
  for (const s of [...G.shots]) {
    s.life -= dt; const t = s.t;
    if (s.life <= 0 || t.hp <= 0) { G.shots.splice(G.shots.indexOf(s), 1); continue; }
    const ty = t.y - (t.isBoss ? 24 : 10), d = Math.hypot(t.x - s.x, ty - s.y);
    if (d < 8 + (t.isBoss ? 16 : 0)) {
      G.shots.splice(G.shots.indexOf(s), 1);
      burst(s.x, s.y, COL[s.el], 16, 85, .42);
      burst(s.x, s.y, '#ffffff', 5, 40, .22);
      for (let i = 0; i < 14; i++) { const b = i / 14 * 6.283; G.parts.push({ x:s.x, y:s.y, vx:Math.cos(b) * 90, vy:Math.sin(b) * 62, t:0, life:.2, col:COL[s.el], s:2 }); }
      hurt(t, s.amt, s.el, s.crit);
      if (s.splash && !t.isBoss) [...G.enemies].filter(e => e !== t && dist(e, t) < 18).forEach(e => hurt(e, s.amt * .5, 'fire'));
      continue;
    }
    s.x += (t.x - s.x) / d * s.sp * dt; s.y += (ty - s.y) / d * s.sp * dt;
    if (G.parts.length < 220) for (let i = 0; i < 2; i++) G.parts.push({ x:s.x + rnd(-3, 3), y:s.y + rnd(-3, 3), vx:rnd(-10, 10), vy:s.el === 'fire' ? rnd(-30, -8) : rnd(-10, 10), t:0, life:rnd(.22, .4), col:s.el === 'fire' && i ? '#ffd45e' : COL[s.el], s:2 });
  }
  // 조각
  for (const o of [...G.orbs]) {
    o.t += dt;
    if (o.t < .4) { o.x += o.vx * dt; o.y += o.vy * dt; o.vy += 120 * dt; o.vx *= .96; }
    else { const v = 80 + (o.t - .4) * 340, d = Math.hypot(h.x - o.x, h.y - 8 - o.y) || 1; o.x += (h.x - o.x) / d * v * dt; o.y += (h.y - 8 - o.y) / d * v * dt;
      if (d < 7) { G.orbs.splice(G.orbs.indexOf(o), 1); blip('orb', o.el === 'gold' ? 1568 : 880 + Math.random() * 300, .05, 'square', .02); pulse(o.el, o.tier); } }
  }
  for (const p of G.parts) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= .93; p.vy *= .93; }
  G.parts = G.parts.filter(p => p.t < p.life);
  for (const f of G.floats) f.t += dt;
  for (const g of G.ghosts) g.t += dt;
  G.ghosts = G.ghosts.filter(g => g.t < .16);
  G.floats = G.floats.filter(f => f.t < .7);
  for (const c of clouds) { c.x += c.v * dt; if (c.x > 320) c.x = -60; }
  if (G.ripple) { G.ripple.t += dt; if (G.ripple.t > .5) G.ripple = null; }
  G.shake = Math.max(0, G.shake - dt * 14);
  G.hintT -= dt;
  // 카메라
  const tx = clamp(h.x - VW / 2, -30, W - VW + 30), viewMid = (topH + (VH - botH)) / 2, ty = clamp(h.y - viewMid - 8, -topH - 30, H + 40 - VH + botH);
  if (!isFinite(G.cam.x + G.cam.y)) { G.cam.x = tx; G.cam.y = ty; }
  G.cam.x += (tx - G.cam.x) * Math.min(1, dt * 3.2); G.cam.y += (ty - G.cam.y) * Math.min(1, dt * 3.2);
}
function nextIsland() {
  G.nextPending = true; $('fade').style.opacity = 1;
  setTimeout(() => { G.nextPending = false; G.stage = G.maxStage; G.needNewMap = true; openTown('fuse'); $('fade').style.opacity = 0; }, 560);
}

// ---------- 그리기 ----------
const DIG = { 0:'111101101101111', 1:'010110010010111', 2:'111001111100111', 3:'111001111001111', 4:'101101111001001', 5:'111100111001111', 6:'111100111101111', 7:'111001010010010', 8:'111101111101111', 9:'111101111001111' };
function digits(val, x, y, col, s = 1) {
  const str = String(val), w = (str.length * 4 - 1) * s;
  let ox = Math.round(x - w / 2); y = Math.round(y);
  for (const pass of [0, 1]) {
    let cxx = ox;
    for (const ch of str) {
      const m = DIG[ch];
      if (m) for (let j = 0; j < 5; j++) for (let i = 0; i < 3; i++) if (m[j * 3 + i] === '1') {
        if (pass === 0) { ctx.fillStyle = '#2b2140'; ctx.fillRect(cxx + i * s - 1, y + j * s - 1, s + 2, s + 2); }
        else { ctx.fillStyle = col; ctx.fillRect(cxx + i * s, y + j * s, s, s); }
      }
      cxx += 4 * s;
    }
  }
}
function drawSp(sp, x, y, face, opts = {}) {
  const sx = opts.sx || 1, sy = opts.sy || 1, sc = opts.scale || 1;
  const w = sp.w * sc * sx, h = sp.h * sc * sy, img = opts.flash ? sp.f : sp.n;
  if (opts.rot) { // 발밑을 축으로 기울인다
    ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.rotate(opts.rot); ctx.scale(face < 0 ? -1 : 1, 1);
    ctx.drawImage(img, Math.round(-w / 2), Math.round(-h), Math.round(w), Math.round(h)); ctx.restore();
  } else if (face < 0) { ctx.save(); ctx.translate(Math.round(x), 0); ctx.scale(-1, 1); ctx.drawImage(img, Math.round(-w / 2), Math.round(y - h), Math.round(w), Math.round(h)); ctx.restore(); }
  else ctx.drawImage(img, Math.round(x - w / 2), Math.round(y - h), Math.round(w), Math.round(h));
}
// 한 장 그림으로 내는 움직임: 뛸 때 늘어나고, 착지할 때 눌리고, 칠 때 튀어 나간다
function motion(u, amp, dust) {
  const mv = u.hop !== u.lh; u.lh = u.hop;
  const s = Math.abs(Math.sin(u.hop));
  let hop = 0, sx, rot = 0;
  if (mv) {
    hop = s * amp; sx = s < .25 ? 1.17 - s * .6 : 1 - .09 * s; rot = Math.sin(u.hop) * .08;
    if (dust && s < .2 && u.ls >= .2 && G.parts.length < 200) for (let i = 0; i < 3; i++) G.parts.push({ x:u.x + rnd(-8, 8), y:u.y, vx:rnd(-14, 14), vy:rnd(-8, 0), t:0, life:.28, col:'#fff6dc', s:1 });
  } else { sx = 1 + Math.sin(G.t * 2.6 + u.x * .1) * .03; }
  u.ls = s;
  const k = u.lunge > 0 ? Math.sin(Math.PI * Math.min(1, u.lunge * 6)) : 0;
  sx += k * .14;
  if (u.flash > 0) sx += .12;
  const shakeX = u.flash > 0 ? rnd(-1.5, 1.5) : 0;
  return { hop, sx, sy:2 - sx, rot, lx:(u.lx || 0) * k * 1.4 + shakeX, ly:(u.ly || 0) * k * 1.4 };
}
function shadow(x, y, w) { ctx.fillStyle = 'rgba(30,20,50,.28)'; ctx.fillRect(Math.round(x - w / 2), Math.round(y - 1), w, 3); ctx.fillRect(Math.round(x - w / 2 + 2), Math.round(y - 2), w - 4, 5); }
function hpBar(x, y, w, r, col) { ctx.fillStyle = '#2b2140'; ctx.fillRect(Math.round(x - w / 2) - 1, y - 1, w + 2, 4); ctx.fillStyle = '#4a3f66'; ctx.fillRect(Math.round(x - w / 2), y, w, 2); ctx.fillStyle = col; ctx.fillRect(Math.round(x - w / 2), y, Math.max(1, Math.round(w * r)), 2); }
function draw() {
  const m = MAPS[G.map], sk = reduced ? 0 : G.shake, ox = Math.round(-G.cam.x + rnd(-sk, sk)), oy = Math.round(-G.cam.y + rnd(-sk, sk));
  const bh = Math.ceil(VH / 4);
  m.sky.forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(0, i * bh, VW, bh + 1); });
  ctx.globalAlpha = .75;
  for (const c of clouds) ctx.drawImage(cloud, Math.round(c.x - 50 - G.cam.x * .15), Math.round((c.y - G.cam.y * .15) % (VH + 30)));
  ctx.globalAlpha = 1;
  ctx.drawImage(G.world, ox, oy);
  ctx.save(); ctx.translate(ox, oy);
  // 강타 예고 원
  const b = G.boss;
  if (b && b.state === 'tele') {
    const k = 1 - b.st / 1.7, r = Math.round(b.r * Math.min(1, k * 1.4));
    ctx.globalAlpha = .28 + .22 * Math.abs(Math.sin(G.t * 10)); blobCtx(b.tx, b.ty, b.r, '#ff6b6b'); ctx.globalAlpha = .55; blobCtx(b.tx, b.ty, r, '#ff3b3b'); ctx.globalAlpha = 1;
  }
  if (G.ripple) { const r = 4 + G.ripple.t * 18 | 0; ctx.globalAlpha = 1 - G.ripple.t * 2; ringCtx(G.ripple.x, G.ripple.y, r, '#fff6dc'); ctx.globalAlpha = 1; }
  // 깊이 순서대로
  const list = [];
  G.party.forEach(u => list.push({ k:'p', y:u.y, u }));
  G.enemies.forEach(u => list.push({ k:'e', y:u.y, u }));
  if (b) list.push({ k:'b', y:b.y, u:b });
  list.push({ k:'h', y:G.hero.y, u:G.hero });
  list.sort((a, c) => a.y - c.y);
  for (const it of list) {
    const u = it.u;
    if (it.k === 'p') {
      const sp = getSp(u.mon), big = 1 + .12 * (u.mon.tier - 1);
      if (u.down > 0) { ctx.globalAlpha = .5; drawSp(sp, u.x, u.y, artFace(sp, u.face), { sy:.55, sx:1.15, flash:true }); ctx.globalAlpha = 1; digits(Math.ceil(u.down), u.x, u.y - 26, '#ffffff'); continue; }
      const mo = motion(u, 7, true);
      shadow(u.x, u.y, 30 - Math.round(mo.hop));
      if (G.shield > 0) { ctx.globalAlpha = .4; blobCtx(u.x, u.y - 14, 26, '#8cf2ff'); ctx.globalAlpha = 1; }
      drawSp(sp, u.x + mo.lx, u.y + mo.ly - mo.hop, artFace(sp, u.face), { scale:big, sx:mo.sx, sy:mo.sy, rot:mo.rot, flash:u.flash > 0 });
      if (G.cheer > 0 && ((G.t * 8 | 0) % 2)) { ctx.fillStyle = '#ffd45e'; ctx.fillRect(Math.round(u.x + rnd(-8, 8)), Math.round(u.y - rnd(4, 30)), 1, 2); }
      hpBar(u.x, Math.round(u.y + 3), 26, clamp(u.hp / u.maxHp, 0, 1), u.hp / u.maxHp < .35 ? '#ff6b6b' : '#7dff8a');
      digits(u.mon.level, u.x - 20, Math.round(u.y + 1), '#fff6dc');
    } else if (it.k === 'e') {
      const sp = SP['s' + u.el], mo = motion(u, 5, false), born = u.born > 0 ? 1 - u.born / .3 : 1;
      shadow(u.x, u.y, 22);
      drawSp(sp, u.x + mo.lx, u.y + mo.ly - mo.hop, u.face, { scale:u.elite ? 2.6 : 2, sx:mo.sx * born, sy:mo.sy * born, flash:u.flash > 0 });
      if (u.hp < u.maxHp) hpBar(u.x, Math.round(u.y + 3), 20, clamp(u.hp / u.maxHp, 0, 1), '#ff6b6b');
    } else if (it.k === 'b') {
      const fr = BOSSFR[(G.t * 5 | 0) % BOSSFR.length];
      const pulseS = u.state === 'tele' ? 1 + Math.sin(G.t * 26) * .06 : u.state === 'stun' ? .92 : 1 + Math.sin(G.t * 3) * .03;
      const born = u.born > 0 ? 1 - u.born / .5 : 1;
      shadow(u.x, u.y, u.state === 'jump' ? 36 : 50);
      drawSp(fr, u.x, u.y - (u.z || 0), u.face, { scale:4 * born, sx:pulseS, sy:2 - pulseS, flash:u.flash > 0 });
      if (u.state === 'stun') digitsStar(u.x, u.y - 56);
      if (u.state === 'tele') { ctx.fillStyle = '#2b2140'; ctx.fillRect(Math.round(u.x) - 2, Math.round(u.y) - 66, 5, 11); ctx.fillStyle = '#ff6b6b'; ctx.fillRect(Math.round(u.x) - 1, Math.round(u.y) - 65, 3, 6); ctx.fillRect(Math.round(u.x) - 1, Math.round(u.y) - 58, 3, 2); }
    } else {
      const mo = motion(u, 4, true);
      shadow(u.x, u.y, 18);
      drawSp(SP.hero, u.x, u.y - mo.hop, u.face, { scale:2, sx:mo.sx, sy:mo.sy, rot:mo.rot });
      // 지팡이 끝 조각. 스킬을 쓰면 위로 들어 올림
      const cast = u.cast > 0, sx = Math.round(u.x + 14 * u.face), sy = Math.round(u.y - (cast ? 34 : 22));
      ctx.fillStyle = '#7a5236'; ctx.fillRect(sx, sy + 2, 2, cast ? 32 : 20);
      ctx.fillStyle = '#2b2140'; ctx.fillRect(sx - 2, sy - 2, 5, 5); ctx.fillStyle = '#7fe9ff'; ctx.fillRect(sx - 1, sy - 1, 3, 3); ctx.fillStyle = '#eaffff'; ctx.fillRect(sx - 1, sy - 1, 1, 1);
      if (cast) { ctx.globalAlpha = u.cast * 2; ringCtx(u.x, u.y - 12, Math.round(36 - u.cast * 50), '#fff6dc'); ctx.globalAlpha = 1; }
    }
  }
  // 쓰러지는 적: 하얗게 부풀며 터진다
  for (const g of G.ghosts) {
    const k = g.t / .16;
    ctx.globalAlpha = Math.max(0, 1 - k); drawSp(g.sp, g.x, g.y, 1, { flash:true, scale:2, sx:1 + k * .7, sy:1 + k * .3 });
  }
  ctx.globalAlpha = 1;
  // 투사체
  for (const s of G.shots) drawShot(s);
  for (const o of G.orbs) { const r = Math.round(o.x), q = Math.round(o.y); ctx.fillStyle = '#2b2140'; ctx.fillRect(r - 2, q - 1, 5, 3); ctx.fillRect(r - 1, q - 2, 3, 5); ctx.fillStyle = COL[o.el]; ctx.fillRect(r - 1, q, 3, 1); ctx.fillRect(r, q - 1, 1, 3); }
  for (const p of G.parts) { ctx.globalAlpha = 1 - p.t / p.life * .6; ctx.fillStyle = p.col; ctx.fillRect(Math.round(p.x), Math.round(p.y), p.s, p.s); }
  ctx.globalAlpha = 1;
  for (const f of G.floats) digits(f.val, f.x, f.y - f.t * 22 - (f.big ? 4 : 0), f.col, f.big ? 2 : 1);
  ctx.restore();
}
function disc(x, y, r, col) { ctx.fillStyle = col; for (let j = -r; j <= r; j++) { const hw = Math.round(Math.sqrt(r * r - j * j)); ctx.fillRect(x - hw, y + j, hw * 2 + 1, 1); } }
// 속성마다 다른 공격: 불덩이, 물방울, 빛 조각, 어둠 구슬, 잎사귀
function drawShot(s) {
  const x = Math.round(s.x), y = Math.round(s.y), r = s.r + (Math.sin(G.t * 28) > 0 ? 1 : 0);
  disc(x, y, r + 1, '#2b2140');
  if (s.el === 'fire') { disc(x, y, r, '#ff5a2e'); disc(x, y, r - 2, '#ffb03b'); disc(x, y, Math.max(1, r - 4), '#fff3b0'); }
  else if (s.el === 'water') { disc(x, y, r, '#2f7fd6'); disc(x, y, r - 1, '#7fd0ff'); ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 2, y - 3, 2, 2); }
  else if (s.el === 'light') { disc(x, y, r, '#ffe27a'); ctx.fillStyle = '#ffffff'; const k = G.t * 12 | 0, L = r + 3; if (k % 2) { ctx.fillRect(x - L, y, L * 2 + 1, 1); ctx.fillRect(x, y - L, 1, L * 2 + 1); } else for (let i = -L + 2; i < L - 1; i++) { ctx.fillRect(x + i, y + i, 1, 1); ctx.fillRect(x + i, y - i, 1, 1); } disc(x, y, 1, '#ffffff'); }
  else if (s.el === 'dark') { disc(x, y, r, '#3b2a66'); disc(x, y, r - 2, '#9b7fd6'); disc(x + 1, y - 1, 1, '#e7dcff'); }
  else { disc(x, y, r, '#3f9e58'); disc(x - 1, y - 1, r - 2, '#9be27a'); ctx.fillStyle = '#2b2140'; ctx.fillRect(x - r + 1, y + 1, r * 2 - 2, 1); }
}
function blobCtx(x, y, r, col) { ctx.fillStyle = col; x = Math.round(x); y = Math.round(y); for (let j = -r; j <= r; j += 2) { const hw = Math.round(Math.sqrt(r * r - j * j)); ctx.fillRect(x - hw, y + Math.round(j * .7), hw * 2, 2); } }
function ringCtx(x, y, r, col) { ctx.fillStyle = col; for (let a = 0; a < 6.283; a += .22) ctx.fillRect(Math.round(x + Math.cos(a) * r), Math.round(y + Math.sin(a) * r * .7), 1, 1); }
function digitsStar(x, y) { for (let i = 0; i < 3; i++) { const a = G.t * 5 + i * 2.1, px = Math.round(x + Math.cos(a) * 12), py = Math.round(y + Math.sin(a) * 4); ctx.fillStyle = '#ffd45e'; ctx.fillRect(px - 1, py, 3, 1); ctx.fillRect(px, py - 1, 1, 3); } }

// ---------- 화면 띠 ----------
const gemEl = { fire:$('gFire'), water:$('gWater'), grass:$('gGrass'), light:$('gLight'), dark:$('gDark') };
function pulse(el) { const n = gemEl[el]; if (!n) return; n.textContent = G.souls[el + G.stage] || 0; n.classList.remove('pop'); void n.offsetWidth; n.classList.add('pop'); }
const cdBox = { skCheer:['cdCheer', 14], skHeal:['cdHeal', 12], skShield:['cdShield', 5] };
let lastHud = 0;
function hud() {
  const b = G.boss;
  if (b) { $('gauge').style.width = clamp(b.hp / b.maxHp, 0, 1) * 100 + '%'; $('gaugeTxt').textContent = `보스 조각왕 ${Math.ceil(b.hp)}`; }
  else if (G.phase === 'warn') { $('gauge').style.width = '100%'; $('gaugeTxt').textContent = '보스 출현'; }
  else if (G.phase === 'clear') { $('gauge').style.width = '0%'; $('gaugeTxt').textContent = '정복 완료'; }
  else if (isCleared()) { $('gauge').style.width = '100%'; $('gaugeTxt').textContent = '정복한 섬'; }
  else { $('gauge').style.width = G.kills / G.need * 100 + '%'; $('gaugeTxt').textContent = `토벌 ${G.kills}/${G.need}`; }
  $('lvl').textContent = G.gold + ' G';
  ELS.forEach(el => { gemEl[el].textContent = G.souls[el + Math.min(SH.B.MAX_TIER, G.stage)] || 0; });
  for (const id in cdBox) { const [k, max] = cdBox[id]; $(id).querySelector('.cd').style.height = G[k] / max * 100 + '%'; }
  $('skShield').classList.toggle('urgent', !!(b && b.state === 'tele' && G.cdShield <= 0));
  $('hint').style.opacity = G.hintT > 0 ? 1 : 0;
}

function endStress() { G.enemies.splice(11); }

// ---------- 입력 ----------
cv.addEventListener('pointerdown', e => {
  audio();
  const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * VW + G.cam.x, y = (e.clientY - r.top) / r.height * VH + G.cam.y;
  if (!isLand(x, y)) return;
  G.cmd = { x, y, t:2.4 }; G.ripple = { x, y, t:0 }; G.hintT = 0; blip('tap', 520, .04, 'square', .02);
});
$('skCheer').onclick = () => skill('cheer');
$('skHeal').onclick = () => skill('heal');
$('skShield').onclick = () => skill('shield');
$('sound').onclick = () => { audio(); G.muted = !G.muted; $('sound').textContent = G.muted ? '소리 꺼짐' : '소리'; };
$('toTown').onclick = () => {
  audio();
  if (G.phase === 'clear') return;
  if (G.phase !== 'hunt') { // 보스를 두고 돌아오면, 다시 나갔을 때 적 하나를 더 잡으면 보스가 처음부터 나온다
    G.boss = null; G.shots = []; G.phase = 'hunt'; G.kills = G.need - 1; G.party.forEach(u => { u.target = null; });
    $('gaugeBar').classList.remove('boss');
  }
  openTown('fuse');
};

function resize() {
  const r = $('app').getBoundingClientRect();
  if (!r.width || !r.height) return; // 숨겨진 채로 열리면 크기가 0이다
  VH = Math.round(r.height / (r.width / VW));
  cv.width = VW; cv.height = VH; ctx.imageSmoothingEnabled = false;
  const k = VW / r.width; topH = $('top').offsetHeight * k; botH = $('bottom').offsetHeight * k;
  $('hint').style.bottom = $('bottom').offsetHeight + 10 + 'px';
}
addEventListener('resize', resize);

// ---------- 고리 ----------
let prev = performance.now(), fAcc = 0, fN = 0;
function frame(now) {
  const raw = Math.min(.05, (now - prev) / 1000), real = (now - prev) / 1000; prev = now;
  if (G.paused) townScene(now / 1000);
  else {
    G.slowT = Math.max(0, G.slowT - raw);
    update(raw * (G.slowT > 0 ? .35 : 1));
    draw();
  }
  if (now - lastHud > 90) { hud(); lastHud = now; }
  fAcc += real; fN++;
  if (fAcc >= .5) { const f = Math.round(fN / fAcc); $('fps').textContent = f + ' fps'; if (G.stress > 0) G.stressS.push(f); fAcc = 0; fN = 0; }
  requestAnimationFrame(frame);
}
