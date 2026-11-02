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
    const st = { v:B.SAVE_VERSION, nextId:1, roster:[], partyIds:[], souls:{}, gold:0, stage:1, maxStage:1, cleared:{}, dex:{}, goldFrac:0, lastSeen:now };
    SH.ELS.slice(0, B.START_ROSTER).forEach(el => addMon(st, SH.summonPool(el, 1)[0]));
    st.partyIds = st.roster.slice(0, 3).map(m => m.id);
    return st;
  };
  SH.getMon = (st, id) => st.roster.find(m => m.id === id);
  SH.serialize = st => JSON.stringify(st);
  SH.deserialize = text => {
    try {
      const st = JSON.parse(text);
      if (!st || st.v !== B.SAVE_VERSION || !Array.isArray(st.roster) || !st.roster.length) return null;
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
  SH.grantKill = (st, stage, el, elite, rng) => {
    const top = Math.min(B.MAX_TIER, stage + (elite ? 1 : 0)), drops = [];
    for (let t = 1; t <= top; t++) if (rng() < SH.dropChance(t) && addSoul(st, el, t, 1)) drops.push({ el, tier:t });
    addGold(st, SH.goldPerKill(stage));
    const ups = [];
    st.partyIds.forEach(id => { const m = SH.getMon(st, id); if (m) ups.push(...addXp(st, m, SH.expPerKill(stage))); });
    return { drops, ups };
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
    const kills = Math.floor(sec * B.KILLS_PER_SEC), mobs = SH.islandMobs(st.stage), souls = {}, g0 = st.gold, lv0 = {};
    st.partyIds.forEach(id => { const m = SH.getMon(st, id); if (m) lv0[id] = m.level; });
    for (let i = 0; i < kills; i++) {
      const r = SH.grantKill(st, st.stage, mobs[Math.floor(rng() * mobs.length)], rng() < B.ELITE_CHANCE, rng);
      r.drops.forEach(d => { const k = soulKey(d.el, d.tier); souls[k] = (souls[k] || 0) + 1; });
    }
    const levels = Object.keys(lv0).map(id => { const m = SH.getMon(st, +id); return { name:m.name, from:lv0[id], to:m.level }; }).filter(x => x.to > x.from);
    return { sec, kills, souls, gold:st.gold - g0, levels };
  };

  SH.setParty = (st, outId, inId) => {
    const i = st.partyIds.indexOf(outId);
    if (i < 0 || st.partyIds.includes(inId) || !SH.getMon(st, inId)) return false;
    st.partyIds[i] = inId;
    return true;
  };
})(globalThis);
