// 게임 규칙. 화면 코드 없음: 브라우저와 Node 양쪽에서 돈다
(g => {
  const SH = g.SH, B = SH.B;
  const soulKey = (el, tier) => el + tier;
  SH.soulKey = soulKey;

  SH.statMult = m => Math.pow(B.TIER_STAT, m.tier - 1) * (1 + B.LEVEL_STAT * (m.level - 1));
  SH.expNeed = level => Math.round(B.EXP_A * Math.pow(B.EXP_R, level - 1));
  SH.dropChance = tier => B.DROP_BASE * Math.pow(B.DROP_RATIO, tier - 1) / B.KILL_SCALE;
  SH.expPerKill = stage => B.EXP_WIN * Math.pow(B.EXP_WIN_GROWTH, stage - 1) / B.KILLS_PER_RUN / B.KILL_SCALE;
  SH.goldPerKill = stage => B.GOLD_WIN * Math.pow(B.GOLD_WIN_GROWTH, stage - 1) / B.KILLS_PER_RUN / B.KILL_SCALE;

  function addMon(st, sp, level) {
    const m = { id:st.nextId++, key:sp.key, el:sp.el, shape:sp.shape, name:sp.name, tier:sp.tier, base:sp.base, cap:sp.cap, level:level == null ? sp.base : level, xp:0, stack:0 };
    st.dex[m.key] = true;
    st.roster.push(m);
    return m;
  }
  SH.addMon = addMon;

  SH.newState = now => {
    const st = { v:B.SAVE_VERSION, nextId:1, roster:[], partyIds:[], souls:{}, gold:0, stage:1, maxStage:1, cleared:{}, dex:{}, goldFrac:0, lastSeen:now, tickets:{}, bossTickets:{}, raidTickets:0, dg:null, pickEls:['fire', 'water', 'grass'], tut:0, pool:B.DAILY_KILLS, poolDay:null, seenSoul:{} };
    SH.ELS.slice(0, B.START_ROSTER).forEach(el => addMon(st, SH.summonPool(el, 1)[0]));
    st.partyIds = st.roster.slice(0, 3).map(m => m.id);
    return st;
  };
  // 튜토리얼 [사용자 10-24 7·11번]: 서로 다른 3속성을 고르고, 첫 섬 뒤 4번째를 받아 첫 합성은 확정 성공.
  // tut: 0 고르기, 1 첫 섬, 2 첫 합성, null 끝 (옛 저장은 null 취급)
  SH.tutorialPick = (st, els) => {
    if (!Array.isArray(els) || new Set(els).size !== 3 || !els.every(e => SH.ELS.includes(e))) return false;
    st.roster = []; st.dex = {};
    els.forEach(el => addMon(st, SH.summonPool(el, 1)[0]));
    st.partyIds = st.roster.map(m => m.id);
    st.tut = 1;
    return true;
  };
  SH.tutorialFourth = st => {
    const owned = st.roster.map(m => m.el);
    const main = st.roster.find(m => SH.PAIR[m.el].some(e => owned.includes(e)));
    const el = SH.ELS.find(e => !owned.includes(e)) || main.el;
    addMon(st, SH.summonPool(el, 1)[0]);
    return main;
  };
  SH.tutorialFuseReady = st => {
    SH.tutorialFourth(st);
    st.roster.forEach(m => { if (st.partyIds.includes(m.id)) { m.level = Math.max(m.level, B.FUSE_LEVEL[0]); m.xp = 0; } });
    st.gold = Math.max(st.gold, B.FUSE_GOLD[0]);
    st.tut = 2;
  };
  SH.getMon = (st, id) => st.roster.find(m => m.id === id);
  SH.serialize = st => JSON.stringify(st);
  SH.deserialize = text => {
    try {
      const st = JSON.parse(text);
      if (!st || st.v !== B.SAVE_VERSION || !Array.isArray(st.roster) || !st.roster.length) return null;
      st.tickets = st.tickets || {}; st.bossTickets = st.bossTickets || {}; st.pickEls = st.pickEls || ['fire', 'water', 'grass']; st.raidTickets = st.raidTickets || 0; st.seenSoul = st.seenSoul || {};
      return st;
    } catch (e) { return null; }
  };

  function addSoul(st, el, tier, n) {
    const k = soulKey(el, tier), before = st.souls[k] || 0;
    st.souls[k] = Math.min(B.SOUL_CAP, before + n);
    return st.souls[k] - before;
  }
  SH.addSoul = addSoul;

  function addXp(st, m, n) {
    const ups = [];
    if (m.level >= m.cap) return ups;
    m.xp += n;
    while (m.level < m.cap && m.xp >= SH.expNeed(m.level)) { m.xp -= SH.expNeed(m.level); m.level++; ups.push(m); }
    if (m.level >= m.cap) m.xp = 0;
    return ups;
  }
  SH.addXp = addXp;

  function addGold(st, n) { st.goldFrac += n; const w = Math.floor(st.goldFrac); st.goldFrac -= w; st.gold += w; return w; }

  // 적 1마리 처치. [사용자] 적은 자기 단계 이하 소울을 단계마다 따로 굴린다
  SH.grantKill = (st, stage, el, elite, rng, rate = 1) => {
    const top = Math.min(B.MAX_TIER, stage + (elite ? 1 : 0)), drops = [];
    for (let t = 1; t <= top; t++) if (rng() < SH.dropChance(t) * rate && addSoul(st, el, t, 1)) drops.push({ el, tier:t });
    addGold(st, SH.goldPerKill(stage) * rate);
    const ticket = rng() < B.TICKET_PER_RUN / B.KILLS_PER_RUN / B.KILL_SCALE * rate;
    if (ticket) st.tickets[stage] = (st.tickets[stage] || 0) + 1;
    const ups = [];
    st.partyIds.forEach(id => { const m = SH.getMon(st, id); if (m) ups.push(...addXp(st, m, SH.expPerKill(stage) * rate)); });
    return { drops, ups, ticket };
  };
  // 하루 사냥 보상 한도 [사용자]: 못 쓴 만큼 이월. 한국 자정마다 충전
  SH.poolToday = (st, now) => {
    const day = SH.dayKey(now);
    if (st.pool == null) st.pool = B.DAILY_KILLS;
    if (st.poolDay == null) st.poolDay = day;
    if (st.poolDay !== day) {
      const days = Math.round((Date.parse(day) - Date.parse(st.poolDay)) / 864e5);
      if (days > 0) st.pool = Math.min(B.CARRY_KILLS, st.pool + B.DAILY_KILLS * days);
      st.poolDay = day;
    }
    return st.pool;
  };
  SH.huntKill = (st, stage, el, elite, now, rng) => {
    let rate = B.OVER_LIMIT_RATE;
    if (SH.poolToday(st, now) > 0) { st.pool--; rate = 1; }
    return Object.assign(SH.grantKill(st, stage, el, elite, rng, rate), { over:rate < 1 });
  };

  // 맵 보스 처음 격파: 처치 여러 마리분 보상과 다음 섬
  SH.grantBoss = (st, stage, rng) => {
    const drops = [], ups = [];
    SH.islandMobs(stage).forEach(el => { for (let i = 0; i < B.BOSS_KILL_VALUE / 3; i++) { const r = SH.grantKill(st, stage, el, true, rng); drops.push(...r.drops); ups.push(...r.ups); } });
    const first = !st.cleared[stage];
    st.cleared[stage] = true;
    st.maxStage = Math.min(B.MAX_ISLAND, Math.max(st.maxStage, stage + 1));
    return { first, drops, ups };
  };

  // 합성 [사용자]: n단계 주재료 + (n-1)단계 부재료 = n+1단계 (1단계는 1+1). 언제나 1마리 + 1마리
  SH.subTier = mainTier => Math.max(1, mainTier - 1);
  SH.fuseRate = (tier, stack) => {
    if (stack >= B.STACK_MAX) return 1;
    let r = tier - 1 < B.FUSE_RATE.length ? B.FUSE_RATE[tier - 1] : B.FUSE_RATE_FLOOR;
    for (let i = 0; i < stack; i++) r += B.STACK_FIRST + B.STACK_STEP * i;
    return Math.min(1, r);
  };
  SH.fuseBaseGold = (tier, stack) => B.FUSE_GOLD[tier - 1] * Math.pow(B.FUSE_STACK_GOLD, stack);
  SH.fuseSoulTier = tier => (tier >= 2 ? tier - 1 : 0); // [사용자] 1+1은 골드만
  SH.fuseSoulEl = (st, main, sub) => {
    const t = SH.fuseSoulTier(main.tier);
    return (st.souls[soulKey(sub.el, t)] || 0) > (st.souls[soulKey(main.el, t)] || 0) ? sub.el : main.el;
  };
  SH.fuseCheck = (st, main, sub, souls) => {
    const reasons = [], soulTier = SH.fuseSoulTier(main.tier);
    const n = soulTier ? Math.max(1, Math.min(B.FUSE_SOUL_MAX, souls || 1)) : 0;
    if (main.tier >= B.MAX_TIER) reasons.push('지금은 더 높은 단계가 없어요');
    else if (main.level < B.FUSE_LEVEL[main.tier - 1]) reasons.push(`주재료는 Lv ${B.FUSE_LEVEL[main.tier - 1]} 필요`);
    if (sub) {
      if (sub.id === main.id) reasons.push('같은 샤들링은 쓸 수 없어요');
      if (sub.tier !== SH.subTier(main.tier)) reasons.push(`부재료는 ${SH.subTier(main.tier)}단계`);
      if (!SH.PAIR[main.el].includes(sub.el)) reasons.push('이 속성은 부재료로 쓸 수 없어요');
      if (sub.level < B.SUMMON_LEVEL[sub.tier - 1]) reasons.push(`부재료는 Lv ${B.SUMMON_LEVEL[sub.tier - 1]} 필요`);
    } else reasons.push('부재료를 골라 주세요');
    if (st.roster.length <= 3) reasons.push('샤들링이 3마리뿐이면 합성할 수 없어요');
    const gold = main.tier < B.MAX_TIER ? Math.ceil(SH.fuseBaseGold(main.tier, main.stack) * (1 - B.FUSE_SOUL_DISCOUNT * n)) : 0;
    if (st.gold < gold) reasons.push('골드가 부족해요');
    let soulEl = null;
    if (soulTier && sub) {
      soulEl = SH.fuseSoulEl(st, main, sub);
      if ((st.souls[soulKey(soulEl, soulTier)] || 0) < n) reasons.push(`${soulTier}단계 소울이 부족해요`);
    }
    return { ok:!reasons.length, reasons, gold, souls:n, soulTier, soulEl, rate:SH.fuseRate(main.tier, main.stack), nextRate:SH.fuseRate(main.tier, main.stack + 1) };
  };
  SH.fuseLevelRange = (main, sub) => { const a = Math.ceil((main.level + sub.level) / 2); return [a + 1, a + 3]; };
  SH.attemptFuse = (st, mainId, subId, souls, rng) => {
    const main = SH.getMon(st, mainId), sub = SH.getMon(st, subId);
    if (!main || !sub) return { error:'재료를 찾을 수 없어요' };
    const c = SH.fuseCheck(st, main, sub, souls);
    if (!c.ok) return { error:c.reasons[0], check:c };
    st.gold -= c.gold;
    if (c.soulTier) st.souls[soulKey(c.soulEl, c.soulTier)] -= c.souls;
    if (rng() >= c.rate) { main.stack++; return { success:false, check:c, main }; } // [사용자] 실패해도 재료 유지
    const sp = SH.branch(main.tier + 1, main.el, sub.el), isNew = !st.dex[sp.key];
    const [lo, hi] = SH.fuseLevelRange(main, sub);
    // [사용자 11-02] 결과는 기본 레벨보다 낮아도 된다
    const m = addMon(st, sp, Math.min(sp.cap, lo + Math.floor(rng() * (hi - lo + 1))));
    const i = st.partyIds.indexOf(main.id);
    st.roster = st.roster.filter(x => x !== main && x !== sub);
    st.partyIds = st.partyIds.filter(id => id !== sub.id);
    if (i >= 0) st.partyIds[st.partyIds.indexOf(main.id)] = m.id;
    SH.fillParty(st, m);
    return { success:true, check:c, mon:m, isNew };
  };
  SH.fillParty = (st, prefer) => {
    if (prefer && st.partyIds.length < 3 && !st.partyIds.includes(prefer.id)) st.partyIds.push(prefer.id);
    st.roster.slice().sort((a, b) => b.tier - a.tier || b.level - a.level).forEach(m => { if (st.partyIds.length < 3 && !st.partyIds.includes(m.id)) st.partyIds.push(m.id); });
  };

  // 소환 [사용자 11-02]: 개체만 무작위, 레벨은 언제나 기본 레벨
  SH.summon = (st, el, tier, rng) => {
    const k = soulKey(el, tier);
    if ((st.souls[k] || 0) < B.SOULS_PER_SUMMON) return { error:'소울이 부족해요' };
    st.souls[k] -= B.SOULS_PER_SUMMON;
    const pool = SH.summonPool(el, tier), sp = pool[Math.floor(rng() * pool.length)], isNew = !st.dex[sp.key];
    return { mon:addMon(st, sp), isNew };
  };

  // 방치 [사용자 11-02]: 꺼 둔 동안도 켜 둔 것과 같은 처치 수. 시계를 되돌리면 쌓이지 않는다
  SH.claimOffline = (st, now, rng) => {
    const sec = Math.min(B.OFFLINE_CAP_SEC, Math.max(0, (now - st.lastSeen) / 1000));
    st.lastSeen = now;
    if (sec < B.OFFLINE_MIN_SEC) return null;
    const kills = Math.floor(sec * B.KILLS_PER_SEC * B.OFFLINE_RATE), mobs = SH.islandMobs(st.stage), souls = {}, g0 = st.gold, lv0 = {};
    let tickets = 0;
    st.partyIds.forEach(id => { const m = SH.getMon(st, id); if (m) lv0[id] = m.level; });
    for (let i = 0; i < kills; i++) {
      const r = SH.grantKill(st, st.stage, mobs[Math.floor(rng() * mobs.length)], rng() < B.ELITE_CHANCE, rng);
      r.drops.forEach(d => { const k = soulKey(d.el, d.tier); souls[k] = (souls[k] || 0) + 1; });
      if (r.ticket) tickets++;
    }
    const levels = Object.keys(lv0).map(id => { const m = SH.getMon(st, +id); return { name:m.name, from:lv0[id], to:m.level }; }).filter(x => x.to > x.from);
    return { sec, kills, souls, gold:st.gold - g0, levels, tickets };
  };

  // 기존 1판의 보상을 runs판만큼. 적 구성: 맨 위 단계 1마리 + 아래 단계 2마리 (기존 규칙)
  function grantRuns(st, stage, top, els, runs, rng) {
    const souls = {}, g0 = st.gold, ups = [];
    for (let i = 0; i < runs * B.KILLS_PER_RUN; i++) {
      const el = els[i % els.length], t0 = i % B.KILLS_PER_RUN === 0 ? top : Math.max(1, top - 1);
      for (let t = 1; t <= Math.min(B.MAX_TIER, t0); t++) if (rng() < B.DROP_BASE * Math.pow(B.DROP_RATIO, t - 1) && addSoul(st, el, t, 1)) { const k = soulKey(el, t); souls[k] = (souls[k] || 0) + 1; }
    }
    addGold(st, B.GOLD_WIN * Math.pow(B.GOLD_WIN_GROWTH, stage - 1) * runs);
    // [사용자 10-26] 던전·보스 경험치는 스테이지 1판과 같다 (보상은 리워드 느낌)
    st.partyIds.forEach(id => { const m = SH.getMon(st, id); if (m) ups.push(...addXp(st, m, B.EXP_WIN * Math.pow(B.EXP_WIN_GROWTH, stage - 1))); });
    return { souls, gold:st.gold - g0, ups };
  }

  // 하루 기준은 한국 시간 자정 [사용자]
  const kst = now => new Date(now + 9 * 3600e3);
  SH.dayKey = now => kst(now).toISOString().slice(0, 10);
  SH.dungeonToday = (st, now) => {
    const day = SH.dayKey(now);
    if (!st.dg || st.dg.day !== day) { const c = st.dg ? st.dg.cleared : {}, tc = st.dg ? st.dg.ticketCleared : {}; st.dg = { day, used:0, boss:0, cleared:c, ticketCleared:tc }; }
    return st.dg;
  };
  SH.weekdayEl = now => B.WEEKDAY_EL[kst(now).getUTCDay()];
  SH.validEls = els => Array.isArray(els) && new Set(els).size === B.TICKET_SET_SIZE && els.every(e => SH.ELS.includes(e));
  SH.dungeonEls = (st, now) => { const e = SH.weekdayEl(now); return e ? [e] : st.pickEls; };
  SH.dungeonUnlocked = (st, tier, now) => tier === 1 || !!SH.dungeonToday(st, now).cleared[tier - 1];
  SH.canDungeon = (st, tier, now) => SH.dungeonUnlocked(st, tier, now) && SH.dungeonToday(st, now).used < B.DUNGEON_DAILY && tier <= B.MAX_TIER;
  function finishDungeon(st, tier, els, rng) {
    const r = grantRuns(st, tier, tier, els, B.DUNGEON_RUNS, rng);
    r.bossTicket = rng() < B.BOSS_TICKET_DUNGEON;
    if (r.bossTicket) st.bossTickets[tier] = (st.bossTickets[tier] || 0) + 1;
    return r;
  }
  // 이겼을 때만 차감 [사용자]. 소탕은 한 번 깬 곳에서 싸우지 않고 같은 보상
  SH.winDungeon = (st, tier, now, rng) => {
    if (!SH.canDungeon(st, tier, now)) return { error:'오늘 횟수를 다 썼어요' };
    const d = SH.dungeonToday(st, now); d.used++; d.cleared[tier] = true;
    return finishDungeon(st, tier, SH.dungeonEls(st, now), rng);
  };
  SH.winTicketDungeon = (st, tier, now, rng) => {
    if (!(st.tickets[tier] > 0)) return { error:'입장권이 없어요' };
    if (!SH.validEls(st.pickEls)) return { error:'서로 다른 3속성을 골라 주세요' };
    st.tickets[tier]--; SH.dungeonToday(st, now).ticketCleared[tier] = true;
    return finishDungeon(st, tier, st.pickEls, rng);
  };
  SH.canBoss = (st, tier, now) => st.bossTickets[tier] > 0 && SH.dungeonToday(st, now).boss < B.BOSS_DAILY;
  // 레인보우 샤들링 [사용자]: 입장권 전용, 한 단계 위 스테이지 보상 ×100, 무작위 속성, 이길 때만 차감
  SH.winBoss = (st, tier, now, rng) => {
    if (!SH.canBoss(st, tier, now)) return { error:'입장권이 없거나 오늘 횟수를 다 썼어요' };
    st.bossTickets[tier]--; SH.dungeonToday(st, now).boss++;
    const el = SH.ELS[Math.floor(rng() * SH.ELS.length)], r = grantRuns(st, tier + 1, tier + 1, [el], B.BOSS_RUNS, rng);
    r.raidTicket = rng() < Math.min(B.RAID_TICKET_MAX, tier * B.RAID_TICKET_PER_TIER);
    if (r.raidTicket) st.raidTickets++;
    return r;
  };
  // 레이드 [사용자]: 속성마다 1마리씩 5마리, 깼을 때만 입장권 차감
  SH.raidParty = st => {
    const list = SH.ELS.map(el => st.roster.filter(m => m.el === el).sort((a, b) => b.tier - a.tier || b.level - a.level)[0]);
    return list.every(Boolean) ? list : null;
  };
  SH.canRaid = st => st.raidTickets > 0 && !!SH.raidParty(st);
  SH.winRaid = (st, rng) => {
    if (!SH.canRaid(st)) return { error:'입장권이나 다섯 속성 샤들링이 부족해요' };
    st.raidTickets--;
    return grantRuns(st, B.RAID_TIER, B.RAID_TIER, SH.ELS, B.RAID_RUNS, rng);
  };

  SH.setParty = (st, outId, inId) => {
    const i = st.partyIds.indexOf(outId);
    if (i < 0 || st.partyIds.includes(inId) || !SH.getMon(st, inId)) return false;
    st.partyIds[i] = inId;
    return true;
  };
})(globalThis);
