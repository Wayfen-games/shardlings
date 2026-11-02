// 규칙 테스트. 사용: node tests/logic.test.js
const assert = require('assert');
const SH = require('../tools/load');
const B = SH.B;
let passed = 0;
const t = (name, fn) => { try { fn(); passed++; } catch (e) { console.error('실패:', name, '\n ', e.message); process.exitCode = 1; } };
const seq = (...v) => { let i = 0; return () => v[i++ % v.length]; };
const NOW = 1e12;
const fresh = () => SH.newState(NOW);
function pair(st, mainEl, subEl, tier = 1) {
  const a = SH.addMon(st, SH.summonPool(mainEl, tier)[0]), b = SH.addMon(st, SH.summonPool(subEl, SH.subTier(tier))[0]);
  a.level = B.FUSE_LEVEL[tier - 1]; st.gold = 1e7;
  return [a, b];
}

t('처음에는 4마리, 일행 3마리', () => { const s = fresh(); assert.equal(s.roster.length, 4); assert.equal(s.partyIds.length, 3); });
t('소환 레벨은 기본 레벨 고정', () => {
  const s = fresh(); SH.addSoul(s, 'fire', 1, 300);
  for (let i = 0; i < 8; i++) { const r = SH.summon(s, 'fire', 1, Math.random); assert.equal(r.mon.level, r.mon.base); }
});
t('소환은 개체가 무작위', () => {
  const s = fresh(); SH.addSoul(s, 'fire', 1, 60);
  const a = SH.summon(s, 'fire', 1, () => 0).mon, b = SH.summon(s, 'fire', 1, () => .99).mon;
  assert.notEqual(a.key, b.key); assert.notEqual(a.base, b.base); assert.notEqual(a.cap, b.cap);
});
t('소환은 소울 30개', () => { const s = fresh(); SH.addSoul(s, 'dark', 1, 29); assert.ok(SH.summon(s, 'dark', 1, Math.random).error); SH.addSoul(s, 'dark', 1, 1); assert.ok(SH.summon(s, 'dark', 1, Math.random).mon); assert.equal(s.souls.dark1, 0); });
t('2~5단계도 소환 가능', () => { const s = fresh(); [2, 3, 4, 5].forEach(n => { SH.addSoul(s, 'water', n, 30); const m = SH.summon(s, 'water', n, Math.random).mon; assert.equal(m.tier, n); assert.equal(m.level, m.base); }); });
t('성공률 80/60/40/25, 8스택 100%', () => {
  assert.equal(SH.fuseRate(1, 0), .8); assert.equal(SH.fuseRate(2, 0), .6); assert.equal(SH.fuseRate(3, 0), .4); assert.equal(SH.fuseRate(4, 0), .25);
  assert.equal(SH.fuseRate(5, 0), .2); assert.equal(SH.fuseRate(4, 8), 1);
  assert.ok(Math.abs(SH.fuseRate(4, 1) - .3) < 1e-9); assert.ok(Math.abs(SH.fuseRate(4, 2) - .37) < 1e-9);
});
t('부재료는 양옆 속성만', () => { const s = fresh(); const [a] = pair(s, 'fire', 'grass'); const w = SH.addMon(s, SH.summonPool('water', 1)[0]); assert.ok(SH.fuseCheck(s, a, w).reasons.some(r => r.includes('속성'))); });
t('주재료는 합성 조건 레벨 필요', () => { const s = fresh(); const [a, b] = pair(s, 'fire', 'grass'); a.level = 12; assert.ok(!SH.fuseCheck(s, a, b).ok); a.level = 13; assert.ok(SH.fuseCheck(s, a, b).ok); });
t('실패해도 재료 유지, 스택 +1, 골드는 소모', () => {
  const s = fresh(); const [a, b] = pair(s, 'fire', 'grass'), n = s.roster.length, g = s.gold;
  const r = SH.attemptFuse(s, a.id, b.id, 0, () => .99);
  assert.equal(r.success, false); assert.equal(s.roster.length, n); assert.equal(a.stack, 1); assert.equal(s.gold, g - 100);
});
t('스택마다 골드 +20%', () => { const s = fresh(); const [a, b] = pair(s, 'fire', 'grass'); a.stack = 1; assert.equal(SH.fuseCheck(s, a, b).gold, 120); });
t('성공하면 1+1이 1마리가 되고 다음 단계', () => {
  const s = fresh(); const [a, b] = pair(s, 'fire', 'grass'), n = s.roster.length;
  const r = SH.attemptFuse(s, a.id, b.id, 0, () => 0);
  assert.equal(r.mon.tier, 2); assert.equal(r.mon.el, 'fire'); assert.equal(s.roster.length, n - 1); assert.ok(r.isNew);
});
t('같은 주재료도 부재료에 따라 다른 개체', () => { assert.notEqual(SH.branch(2, 'fire', 'grass').key, SH.branch(2, 'fire', 'dark').key); assert.notEqual(SH.branch(3, 'fire', 'grass').shape, SH.branch(3, 'fire', 'dark').shape); });
t('합성 결과는 기본 레벨 미만이 될 수 있음', () => {
  const s = fresh(); const [a, b] = pair(s, 'fire', 'grass');
  const m = SH.attemptFuse(s, a.id, b.id, 0, () => 0).mon;
  assert.equal(m.level, Math.ceil((13 + 1) / 2) + 1); assert.ok(m.level < m.base);
});
t('2단계 이상 합성은 소울 필요, 100개면 공짜', () => {
  const s = fresh(); const a = SH.addMon(s, SH.summonPool('fire', 2)[0]), b = SH.addMon(s, SH.summonPool('grass', 1)[0]);
  a.level = 25; s.gold = 1e6;
  assert.ok(SH.fuseCheck(s, a, b, 1).reasons.some(r => r.includes('소울')));
  SH.addSoul(s, 'fire', 1, 100);
  assert.ok(SH.fuseCheck(s, a, b, 1).ok); assert.equal(SH.fuseCheck(s, a, b, 100).gold, 0);
  const g = s.gold; SH.attemptFuse(s, a.id, b.id, 100, () => 0); assert.equal(s.gold, g); assert.equal(s.souls.fire1, 0);
});
t('3마리뿐이면 합성 불가', () => { const s = fresh(); s.roster = s.roster.slice(0, 3); const [m, q] = [s.roster[0], s.roster[2]]; m.level = 13; s.gold = 1e6; assert.ok(SH.fuseCheck(s, m, q).reasons.some(r => r.includes('3마리'))); });
t('5단계 위 합성 없음', () => { const s = fresh(); const a = SH.addMon(s, SH.summonPool('fire', 5)[0]), b = SH.addMon(s, SH.summonPool('grass', 4)[0]); assert.ok(!SH.fuseCheck(s, a, b).ok); });
t('만렙에서 멈춤', () => { const s = fresh(), m = s.roster[0]; SH.addXp(s, m, 1e9); assert.equal(m.level, m.cap); assert.equal(m.xp, 0); });
t('적은 자기 단계 이하만 드랍', () => { const s = fresh(); const r = SH.grantKill(s, 1, 'fire', false, () => 0); assert.deepEqual(r.drops.map(d => d.tier), [1]); const e = SH.grantKill(s, 1, 'fire', true, () => 0); assert.deepEqual(e.drops.map(d => d.tier), [1, 2]); });
t('소울 상한 999', () => { const s = fresh(); SH.addSoul(s, 'fire', 1, 5000); assert.equal(s.souls.fire1, 999); });
t('섬마다 나오는 속성이 다름', () => { assert.notDeepEqual(SH.islandMobs(1), SH.islandMobs(2)); assert.notDeepEqual(SH.islandMobs(2), SH.islandMobs(3)); });
t('방치 12시간 상한', () => { const s = fresh(); const r = SH.claimOffline(s, NOW + 48 * 3600e3, Math.random); assert.equal(r.sec, 12 * 3600); assert.equal(r.kills, Math.floor(12 * 3600 * B.KILLS_PER_SEC)); });
t('방치는 켜 둔 것과 같은 처치 수', () => { const s = fresh(); const r = SH.claimOffline(s, NOW + 3600e3, Math.random); assert.equal(r.kills, 1200); assert.equal(B.KILLS_PER_SEC, 1 / B.SPAWN_EVERY); });
t('시계를 되돌려도 쌓이지 않음', () => { const s = fresh(); assert.equal(SH.claimOffline(s, NOW - 3600e3, Math.random), null); });
t('1분 미만은 보상 없음', () => { const s = fresh(); assert.equal(SH.claimOffline(s, NOW + 30e3, Math.random), null); });
t('저장 후 불러오면 같음', () => { const s = fresh(); s.gold = 777; SH.addSoul(s, 'fire', 2, 3); const c = SH.deserialize(SH.serialize(s)); assert.deepEqual(c, s); });
t('깨진 저장은 무시', () => { assert.equal(SH.deserialize('{깨짐'), null); assert.equal(SH.deserialize('{"v":99,"roster":[1]}'), null); assert.equal(SH.deserialize('null'), null); });
t('첫 보스 격파로 다음 섬', () => { const s = fresh(); const r = SH.grantBoss(s, 1, Math.random); assert.ok(r.first); assert.equal(s.maxStage, 2); assert.ok(s.cleared[1]); });
t('일행 교체', () => { const s = fresh(); const out = s.partyIds[0], inn = s.roster[3].id; assert.ok(SH.setParty(s, out, inn)); assert.ok(s.partyIds.includes(inn)); assert.ok(!SH.setParty(s, inn, s.partyIds[1])); });
t('합성 뒤에도 일행 3마리 유지', () => { const s = fresh(); const a = s.roster[0]; a.level = 13; s.gold = 1000; const sub = s.roster.find(m => m.el === 'grass'); SH.addMon(s, SH.summonPool('dark', 1)[0]); SH.attemptFuse(s, a.id, sub.id, 0, () => 0); assert.equal(s.partyIds.length, 3); assert.equal(new Set(s.partyIds).size, 3); s.partyIds.forEach(id => assert.ok(SH.getMon(s, id))); });
t('모든 갈래와 소환 풀이 유효', () => { SH.ELS.forEach(el => { for (let n = 1; n <= B.MAX_TIER; n++) SH.summonPool(el, n).forEach(sp => { assert.ok(SH.SHAPE[sp.shape]); assert.ok(sp.name); assert.ok(sp.cap > sp.base); }); }); });

const MON = Date.UTC(2026, 10, 2, 3); // 월요일 12시 KST
t('드랍 단계 비율은 사용자 값 0.3', () => assert.equal(B.DROP_RATIO, 0.3));
t('요일 던전 속성: 월 빛, 화 불', () => { assert.equal(SH.weekdayEl(MON), 'light'); assert.equal(SH.weekdayEl(MON + 864e5), 'fire'); });
t('주말은 고른 3속성', () => { const s = fresh(), sat = MON + 5 * 864e5; assert.equal(SH.weekdayEl(sat), null); assert.deepEqual(SH.dungeonEls(s, sat), s.pickEls); });
t('하루 기준은 한국 자정', () => { const before = Date.UTC(2026, 10, 2, 14, 59), after = Date.UTC(2026, 10, 2, 15, 1); assert.notEqual(SH.dayKey(before), SH.dayKey(after)); });
t('요일 던전 하루 2판, 다음 날 회복', () => { const s = fresh(); assert.ok(!SH.winDungeon(s, 1, MON, Math.random).error); assert.ok(!SH.winDungeon(s, 1, MON, Math.random).error); assert.ok(SH.winDungeon(s, 1, MON, Math.random).error); assert.ok(!SH.winDungeon(s, 1, MON + 864e5, Math.random).error); });
t('전 단계 던전을 깨야 다음 단계', () => { const s = fresh(); assert.ok(SH.winDungeon(s, 2, MON, Math.random).error); SH.winDungeon(s, 1, MON, Math.random); assert.ok(!SH.winDungeon(s, 2, MON, Math.random).error); });
t('던전 보상은 그 단계 이하 소울', () => { const s = fresh(); const r = SH.winDungeon(s, 1, MON, () => 0); assert.ok(r.souls.light1 > 0); assert.ok(!r.souls.light2); assert.ok(r.gold > 0); });
t('입장권 던전은 입장권 1장, 3속성 필수', () => { const s = fresh(); assert.ok(SH.winTicketDungeon(s, 1, MON, Math.random).error); s.tickets[1] = 1; s.pickEls = ['fire', 'fire', 'water']; assert.ok(SH.winTicketDungeon(s, 1, MON, Math.random).error); assert.equal(s.tickets[1], 1); s.pickEls = ['fire', 'water', 'grass']; assert.ok(!SH.winTicketDungeon(s, 1, MON, Math.random).error); assert.equal(s.tickets[1], 0); });
t('보스는 입장권 전용, 이기면 차감, 위 단계 소울', () => { const s = fresh(); assert.ok(SH.winBoss(s, 1, MON, Math.random).error); s.bossTickets[1] = 2; const r = SH.winBoss(s, 1, MON, () => 0); assert.equal(s.bossTickets[1], 1); assert.ok(Object.keys(r.souls).some(k => k.endsWith('2'))); });
t('보스 하루 10번', () => { const s = fresh(); s.bossTickets[1] = 20; for (let i = 0; i < 10; i++) assert.ok(!SH.winBoss(s, 1, MON, Math.random).error); assert.ok(SH.winBoss(s, 1, MON, Math.random).error); assert.equal(s.bossTickets[1], 10); });
t('던전·보스 경험치는 1판분', () => { const s = fresh(), m = SH.getMon(s, s.partyIds[0]); SH.winDungeon(s, 1, MON, () => 0); assert.ok(m.level <= 4); });
t('옛 저장도 불러옴', () => { const s = fresh(); delete s.tickets; delete s.bossTickets; delete s.pickEls; const c = SH.deserialize(JSON.stringify(s)); assert.deepEqual(c.tickets, {}); assert.equal(c.pickEls.length, 3); });

t('튜토리얼: 서로 다른 3속성 필수', () => { const s = fresh(); assert.ok(!SH.tutorialPick(s, ['fire', 'fire', 'water'])); assert.ok(SH.tutorialPick(s, ['fire', 'water', 'light'])); assert.equal(s.roster.length, 3); assert.equal(s.partyIds.length, 3); assert.equal(s.tut, 1); });
t('어떤 3속성을 골라도 첫 합성 가능', () => {
  const E = SH.ELS;
  for (let a = 0; a < 5; a++) for (let b = a + 1; b < 5; b++) for (let c = b + 1; c < 5; c++) {
    const s = fresh(); SH.tutorialPick(s, [E[a], E[b], E[c]]); SH.tutorialFuseReady(s);
    const ok = s.roster.some(m => s.roster.some(n => n !== m && m.tier === 1 && SH.fuseCheck(s, m, n).ok));
    assert.ok(ok, [E[a], E[b], E[c]].join()); assert.equal(s.roster.length, 4); assert.equal(s.tut, 2);
  }
});
t('옛 저장은 튜토리얼 없음', () => { const s = fresh(); delete s.tut; assert.ok(!SH.deserialize(JSON.stringify(s)).tut); });
t('첫 섬은 짧고 뒤로 갈수록 길다', () => { assert.ok(B.GAUGE_KILLS[0] <= 12); assert.ok(B.GAUGE_KILLS[4] > B.GAUGE_KILLS[0]); });

console.log(`통과 ${passed}`);
