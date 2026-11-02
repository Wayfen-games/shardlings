// 폰 크기 실제 브라우저(Edge)로 게임을 돌려 보는 점검. 사용: node tools/smoke.js [스크린샷 폴더]
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright-core');
const root = path.join(__dirname, '..'), OUT = process.argv[2] || path.join(root, 'tools', '.shots');
fs.mkdirSync(OUT, { recursive:true });
const TYPES = { '.html':'text/html; charset=utf-8', '.png':'image/png', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8' };
const server = http.createServer((req, res) => {
  const u = req.url.split('?')[0], p = path.join(root, decodeURIComponent(u === '/' ? '/index.html' : u));
  fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type':TYPES[path.extname(p)] || 'application/octet-stream' }); res.end(d); });
});
let fails = 0;
const check = (name, ok, extra = '') => { console.log(`${ok ? 'OK ' : 'NG '} ${name} ${extra}`); if (!ok) fails++; };
(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const url = `http://127.0.0.1:${server.address().port}/`;
  const b = await chromium.launch({ channel:'msedge' });
  const ctx = await b.newContext({ viewport:{ width:390, height:844 }, deviceScaleFactor:2 });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('requestfailed', r => { if (!r.url().includes('fonts.g')) errs.push('요청 실패 ' + r.url()); });
  p.on('response', r => { if (r.status() >= 400) errs.push(r.status() + ' ' + r.url()); });
  await p.goto(url, { waitUntil:'load' }); await p.waitForTimeout(500);
  const shot = n => p.screenshot({ path:path.join(OUT, n + '.png') });
  const step = sec => p.evaluate(s => { const { G, update } = window.__sh; G.paused = true; const n = s * 30; for (let i = 0; i < n; i++) { update(1 / 30); if (G.phase !== 'hunt') break; } return G.t; }, sec);

  const a0 = await p.evaluate(() => { const { G } = window.__sh; return { n:G.roster.length, party:G.partyIds.length, stage:G.stage, art:Object.keys(BIG).length }; });
  check('처음 상태', a0.n === 4 && a0.party === 3, JSON.stringify(a0));

  // 처치 속도: 켜 둔 효율이 방치 효율과 같은지
  const rate = await p.evaluate(() => {
    const { G, update } = window.__sh; G.paused = true; let k = 0;
    const r = G.st.gold; const k0 = G.kills, t0 = G.t;
    for (let i = 0; i < 30 * 120 && G.phase === 'hunt'; i++) update(1 / 30);
    return { kills:G.kills - k0, sec:G.t - t0, lv:G.party.map(u => u.mon.level), down:G.party.filter(u => u.down > 0).length, gold:G.gold, souls:G.st.souls };
  });
  const spawned = rate.kills - 6; // 시작할 때 미리 깔린 6마리는 뺀다
  check('2분 처치 속도', spawned / rate.sec > .25 && spawned / rate.sec <= .35, `${(spawned / rate.sec).toFixed(3)}/초 (방치 ${(1 / 3).toFixed(3)}), ${JSON.stringify(rate)}`);
  await p.evaluate(() => { const { draw, hud } = window.__sh; draw(); hud(); }); await shot('1_hunt');

  // 첫 보스까지
  const boss = await p.evaluate(() => {
    const { G, update, skill } = window.__sh; G.kills = G.need - 1; let g = 0;
    while (!G.boss && g++ < 30 * 60) update(1 / 30);
    const t0 = G.t, lv = G.party.map(u => u.mon.level); g = 0; let blocks = 0, prev = null, wipes = 0;
    while (G.boss && g++ < 30 * 300) { const b = G.boss; if (b.state === 'tele' && b.st < 1 && G.cdShield <= 0) skill('shield'); if (G.cdCheer <= 0) skill('cheer'); if (G.cdHeal <= 0 && G.party.some(u => u.hp < u.maxHp * .5)) skill('heal'); if (b.state === 'stun' && prev !== 'stun') blocks++; prev = b.state; if (G.party.every(u => u.down > 0)) wipes++; update(1 / 30); }
    return { sec:Math.round(G.t - t0), blocks, killed:!G.boss, phase:G.phase, max:G.maxStage, lv };
  });
  check('Lv 낮은 일행의 첫 보스 처치', boss.killed && boss.max === 2, JSON.stringify(boss));

  // 마을로
  await p.evaluate(() => { const { G, update } = window.__sh; G.phaseT = 0; update(1 / 30); }); await p.waitForTimeout(800);
  check('정복 후 마을', await p.isVisible('#town'));
  await p.evaluate(() => { const { G } = window.__sh; G.st.gold = 5000; G.roster.forEach(m => { if (m.tier === 1) m.level = 13; }); window.__sh.renderTown(); });
  await p.click('#townBody .card.ready'); await p.click('[data-act=sub]'); await shot('2_fuse');
  const btn = await p.innerText('[data-act=fuse]'); check('합성 버튼', btn.includes('합성하기'), btn);
  const n1 = await p.evaluate(() => { Math.random = () => 0.01; return window.__sh.G.roster.length; });
  await p.click('[data-act=fuse]'); await p.waitForTimeout(1800); await shot('3_reveal');
  const title = await p.innerText('#revealTitle'); check('합성 공개', title.includes('샤들링') || title.length > 0, title);
  await p.click('#revealOk');
  check('1+1 → 1', await p.evaluate(n => window.__sh.G.roster.length === n - 1, n1));
  // 소환
  await p.evaluate(() => { const { G } = window.__sh; G.souls.dark1 = 30; }); await p.click('[data-tab=summon]'); await p.click('[data-act=summon][data-el=dark]');
  const lv = await p.evaluate(() => { const m = window.__sh.G.roster[window.__sh.G.roster.length - 1]; return [m.level, m.base]; }); check('소환은 기본 레벨', lv[0] === lv[1], lv.join('/'));
  await p.click('#revealOk'); await p.click('[data-tab=isle]'); await shot('4_isle');
  // 2번 섬으로
  await p.evaluate(() => window.__sh.G.stage); await p.click('#depart');
  const s2 = await p.evaluate(() => { const { G, update, draw, hud } = window.__sh; G.paused = true; for (let i = 0; i < 30 * 30; i++) update(1 / 30); draw(); hud(); return { stage:G.stage, party:G.party.map(u => [u.mon.name, u.mon.tier, u.mon.level]), els:[...new Set(G.enemies.map(e => e.el))], cam:isFinite(G.cam.x) }; });
  check('2번 섬 출발', s2.stage === 2 && s2.cam, JSON.stringify(s2)); await shot('5_island2');

  // 던전과 보스: 기준 파티(1단계 3마리 Lv 13)로 승패와 시간을 잰다
  const fightRun = (kind, tier, smart) => p.evaluate(([kind, tier, smart]) => {
    const { G, update, skill, SH } = window.__sh;
    G.roster.slice(0, 3).forEach(m => { m.level = SH.B.FUSE_LEVEL[m.tier - 1]; });
    G.st.bossTickets[tier] = 1; G.st.tickets[tier] = 1;
    startFight(kind, tier); G.paused = true;
    const t0 = G.t; let g = 0;
    while (G.fight && !G.fightEnding && g++ < 30 * 240) { if (smart) { const b = G.boss; if (b && b.state === 'tele' && b.st < 1 && G.cdShield <= 0) skill('shield'); if (G.cdCheer <= 0) skill('cheer'); if (G.cdHeal <= 0 && G.party.some(u => u.hp < u.maxHp * .5)) skill('heal'); } update(1 / 30); }
    const down = G.party.filter(u => u.down > 0).length, win = G.party.some(u => u.down <= 0) && !G.boss && !G.enemies.length;
    return { sec:Math.round(G.t - t0), win, down };
  }, [kind, tier, smart]);
  const settle = async () => { await p.waitForTimeout(1100); await p.evaluate(() => { document.getElementById('reveal').hidden = true; }); };
  const results = {};
  for (const [kind, smart] of [['daily', false], ['daily', true], ['boss', false], ['boss', true]]) {
    const w = []; for (let i = 0; i < 3; i++) { w.push(await fightRun(kind, 1, smart)); await settle(); }
    results[kind + (smart ? '_스킬' : '_방치')] = w.map(x => (x.win ? '승' : '패') + x.sec + '초').join(' ');
  }
  console.log('난이도', JSON.stringify(results));
  await p.evaluate(() => { const { G } = window.__sh; G.st.tickets[1] = 2; G.st.bossTickets[1] = 2; G.paused = true; openTown('fight'); }); await p.waitForTimeout(200); await shot('7_fight');
  const before2 = await p.evaluate(() => { const { G, SH } = window.__sh; const d = SH.dungeonToday(G.st, Date.now()); d.used = 0; d.cleared[1] = true; d.ticketCleared[1] = true; window.__sh.renderTown(); return G.gold; });
  await p.click('[data-act=sweep][data-k=daily][data-t="1"]'); await p.waitForTimeout(200); await shot('8_sweep');
  check('소탕 보상', await p.evaluate(g => window.__sh.G.gold > g, before2));
  await p.click('#revealOk');
  // 싸움 중 마을로 나가도 입장권은 그대로
  const kept = await p.evaluate(() => { const { G } = window.__sh; const n = G.st.bossTickets[1]; startFight('boss', 1); document.getElementById('toTown').click(); return [n, G.st.bossTickets[1], !G.fight]; });
  check('도전 중 나가면 입장권 유지', kept[0] === kept[1] && kept[2], JSON.stringify(kept));
  await p.click('#depart');

  // 저장과 불러오기
  const before = await p.evaluate(() => { const { G, saveGame } = window.__sh; saveGame(); return JSON.stringify(G.st.roster.map(m => m.key + m.level)); });
  await p.reload({ waitUntil:'load' }); await p.waitForTimeout(400);
  const after = await p.evaluate(() => JSON.stringify(window.__sh.G.st.roster.map(m => m.key + m.level)));
  check('새로고침 후 샤들링 유지', before === after);
  // 방치 보상
  await p.evaluate(() => { const { G, SH, saveGame } = window.__sh; const raw = JSON.parse(localStorage.getItem(SH.B.SAVE_KEY)); raw.lastSeen = Date.now() - 3600e3; window.onpagehide = null; localStorage.setItem('_probe', JSON.stringify(raw)); });
  const off = await p.evaluate(() => { const { G, SH } = window.__sh; G.st.lastSeen = Date.now() - 3600e3; const g0 = G.gold; const r = SH.claimOffline(G.st, Date.now(), Math.random); return { kills:r.kills, gold:r.gold, souls:Object.keys(r.souls).length }; });
  check('1시간 방치 = 1200마리', off.kills === 1200, JSON.stringify(off));
  await p.evaluate(() => { showOffline({ sec:3600, kills:1200, souls:{ fire2:3, dark1:7 }, gold:480, levels:[{ name:'라바롱', from:13, to:15 }] }); }); await p.waitForTimeout(200); await shot('6_offline');
  check('가로 스크롤 없음', await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  check('오류 없음', errs.length === 0, JSON.stringify(errs));
  await b.close(); server.close();
  console.log(fails ? `실패 ${fails}` : '전부 통과');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
