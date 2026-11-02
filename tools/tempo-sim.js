// 템포 시뮬레이션: 전투 없이 규칙만으로 플레이어 한 명의 며칠을 돌린다.
// 가정: 하루 사냥 한도를 다 쓰고 방치를 12시간씩 두 번 받음(기존 게임 기준), 깰 수 있는 가장 높은 섬에서 사냥.
// 사용: node tools/tempo-sim.js [플레이어 수=30] [최대 일수=60]   덮어쓰기: OVR='{"KILL_SCALE":7}'
const SH = require('./load'), B = SH.B;
if (process.env.OVR) Object.assign(B, JSON.parse(process.env.OVR));
const PLAYERS = +process.argv[2] || 30, MAX_DAYS = +process.argv[3] || 60;
const KILLS_PER_TICK = 200; // 약 10분에 한 번 들여다봄
const DAY_KILLS = B.DAILY_KILLS + 86400 * B.KILLS_PER_SEC * B.OFFLINE_RATE;
const DAY_TICKS = Math.round(DAY_KILLS / KILLS_PER_TICK);
function rngOf(seed) { let a = seed; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function top(st) { return Math.max(...st.roster.map(m => m.tier)); }
function manage(st, rng, log, day) {
  SH.ELS.forEach(el => { for (let t = 1; t <= B.MAX_TIER; t++) while ((st.souls[el + t] || 0) >= B.SOULS_PER_SUMMON && st.roster.filter(m => m.el === el && m.tier === t).length < 3) { const m = SH.summon(st, el, t, rng).mon; if (m.tier && log.first[m.tier] == null) log.first[m.tier] = day; log.summons++; } });
  for (let guard = 0; guard < 30; guard++) {
    let best = null;
    // 위 단계가 3마리 이상이면 그 아래는 합성하지 않는다: 골드를 낮은 합성에 낭비하지 않는 플레이어
    st.roster.filter(a => a.tier < B.MAX_TIER && a.level >= B.FUSE_LEVEL[a.tier - 1] && st.roster.filter(m => m.tier === a.tier + 1).length < 3).forEach(a => st.roster.forEach(b => {
      if (a === b || b.tier !== SH.subTier(a.tier) || !SH.PAIR[a.el].includes(b.el)) return;
      const c = SH.fuseCheck(st, a, b, 1);
      if (c.ok && (!best || a.tier > best.a.tier)) best = { a, b };
    }));
    if (!best) break;
    const r = SH.attemptFuse(st, best.a.id, best.b.id, 1, rng);
    log.tries++;
    if (r.success && log.first[r.mon.tier] == null) log.first[r.mon.tier] = day;
  }
  // 조건 레벨이 가장 높은 쪽을 키운다: 높은 단계부터 3마리, 합성 조건을 못 채운 샤들링 우선
  const need = m => m.tier < B.MAX_TIER && m.level < B.FUSE_LEVEL[m.tier - 1];
  st.partyIds = st.roster.slice().sort((x, y) => need(y) - need(x) || y.tier - x.tier || x.level - y.level).slice(0, 3).map(m => m.id);
  const t = top(st);
  st.stage = Math.min(B.MAX_ISLAND, t);
  // 입장권은 바로 쓰고, 이길 만한 단계(최고 단계 이하)만 도전한다
  const now = day * 864e5;
  const best = Math.min(t, B.MAX_TIER);
  for (let n = best; n >= 1; n--) { while (SH.canDungeon(st, n, now)) { SH.winDungeon(st, n, now, rng); log.dungeons++; } }
  for (let n = best; n >= 1; n--) { while (st.tickets[n] > 0) { SH.winTicketDungeon(st, n, now, rng); log.tickets++; } }
  for (let n = best; n >= 1; n--) { while (SH.canBoss(st, n, now)) { SH.winBoss(st, n, now, rng); log.bosses++; } }
}
function player(seed) {
  const rng = rngOf(seed), st = SH.newState(0), log = { first:{}, tries:0, summons:0, dungeons:0, tickets:0, bosses:0 };
  for (let tick = 0; tick < MAX_DAYS * DAY_TICKS; tick++) {
    const day = tick / DAY_TICKS, mobs = SH.islandMobs(st.stage);
    for (let k = 0; k < KILLS_PER_TICK; k++) SH.grantKill(st, st.stage, mobs[Math.floor(rng() * 3)], rng() < B.ELITE_CHANCE, rng);
    manage(st, rng, log, day);
    if (log.first[B.MAX_TIER] != null) break;
  }
  log.gold = st.gold;
  log.maxLv = Math.max(...st.roster.map(m => m.level));
  return log;
}
const res = []; for (let p = 0; p < PLAYERS; p++) res.push(player(1000 + p * 77));
const med = a => a.slice().sort((x, y) => x - y)[Math.floor(a.length / 2)];
const fmt = d => (d >= 900 ? '없음' : d < 1 ? (d * 24).toFixed(1) + '시간' : d.toFixed(1) + '일');
console.log(`하루 처치 ${Math.round(DAY_KILLS)}, 1단계 소울 처치당 ${(SH.dropChance(1) * 100).toFixed(1)}%`);
for (let t = 2; t <= B.MAX_TIER; t++) { const f = res.map(r => (r.first[t] == null ? 999 : r.first[t])); console.log(` 첫 ${t}단계: ${fmt(med(f))} [${fmt(Math.min(...f))} ~ ${fmt(Math.max(...f))}]`); }
console.log(` 합성 시도 ${Math.round(med(res.map(r => r.tries)))}, 소환 ${Math.round(med(res.map(r => r.summons)))}, 끝 골드 ${med(res.map(r => r.gold))}, 최고 레벨 ${med(res.map(r => r.maxLv))}, 던전 ${med(res.map(r => r.dungeons))}, 입장권 ${med(res.map(r => r.tickets))}, 보스 ${med(res.map(r => r.bosses))}`);
