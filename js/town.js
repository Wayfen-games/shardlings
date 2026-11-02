// 마을: 쌓은 것을 쓰는 느린 구간
let tab = 'fuse', slot = 'main', pick = { main:null, sub:null, souls:1 }, resetArmed = false;
const B_ = SH.B;

function paint(cv, m, opt = {}) {
  const src = opt.big ? getBig(m) : getSp(m).n;
  cv.width = src.width; cv.height = src.height;
  const x = cv.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(src, 0, 0);
  if (opt.sil) { x.globalCompositeOperation = 'source-in'; x.fillStyle = '#120d24'; x.fillRect(0, 0, cv.width, cv.height); x.globalCompositeOperation = 'source-over'; }
}
function openTown(t) { G.paused = true; tab = t || tab; slot = 'main'; pick = { main:null, sub:null, souls:1 }; resetArmed = false; $('town').hidden = false; saveGame(); renderTown(); }
const goldText = n => n.toLocaleString('ko-KR');

function renderTown() {
  document.querySelectorAll('.tabs button').forEach(b => b.setAttribute('aria-selected', b.dataset.tab === tab));
  const body = $('townBody'), paints = [], st = G.st;
  const monCard = (m, act, cls = '', sub = '') => { paints.push([m, {}, m.id]); return `<button class="card ${cls}" type="button" data-act="${act}" data-id="${m.id}"><canvas data-p="${m.id}"></canvas><span>${m.name}</span><small>${sub || `${ELN[m.el]} ${m.tier}단계 · Lv ${m.level}`}</small></button>`; };
  if (tab === 'party') {
    body.innerHTML = `<h3>함께 사냥할 샤들링 3마리</h3><div class="grid3">${G.partyIds.map(id => monCard(SH.getMon(st, id), 'info', 'on')).join('')}</div>
      <h3>대기 중</h3><div class="grid3">${G.roster.filter(m => !G.partyIds.includes(m.id)).sort((a, b) => b.tier - a.tier || b.level - a.level).map(m => monCard(m, 'info')).join('') || '<p>대기 중인 샤들링이 없어요.</p>'}</div>
      <p>누르면 크게 보고 일행을 바꿀 수 있어요. 경험치는 일행만 받아요.</p>`;
  } else if (tab === 'summon') {
    const rows = [];
    for (let t = B_.MAX_TIER; t >= 1; t--) ELS.forEach(el => { const n = G.souls[el + t] || 0; if (n > 0) rows.push(`<div class="soulrow"><span class="gem" style="--c:${COL[el]}">${ELN[el]} ${t}단계</span><span>${n} / ${B_.SOULS_PER_SUMMON}</span><button class="ghost" style="width:auto" type="button" data-act="summon" data-el="${el}" data-t="${t}" ${n < B_.SOULS_PER_SUMMON ? 'disabled' : ''}>${n < B_.SOULS_PER_SUMMON ? '부족' : '소환'}</button></div>`); });
    body.innerHTML = `<h3>소울 ${B_.SOULS_PER_SUMMON}개로 소환</h3><p>그 단계 개체 중 무엇이 나올지 몰라요. 레벨은 개체마다 정해진 기본 레벨로 나와요.</p>${rows.join('') || '<p>아직 소울이 없어요. 사냥하면 쌓여요.</p>'}`;
  } else if (tab === 'fight') {
    const now = Date.now(), d = SH.dungeonToday(st, now), el = SH.weekdayEl(now), B = B_, top = Math.min(B.MAX_TIER, Math.max(...G.roster.map(m => m.tier)) + 1);
    const chips = ELS.map(e => `<button class="chip ${st.pickEls.includes(e) ? 'on' : ''}" type="button" data-act="pickel" data-el="${e}">${ELN[e]}</button>`).join('');
    const row = (label, note, btns) => `<div class="fightrow"><span>${label}<small>${note}</small></span>${btns}</div>`;
    const btn = (act, kind, t, text, on) => `<button class="ghost" type="button" data-act="${act}" data-k="${kind}" data-t="${t}" ${on ? '' : 'disabled'}>${text}</button>`;
    let h = `<h3>요일 던전 ${d.used} / ${B.DUNGEON_DAILY}판</h3><p>오늘은 ${el ? ELN[el] + ' 속성이에요' : '주말이라 아래에서 3속성을 고를 수 있어요'}. 이겼을 때만 횟수가 줄고 보상은 사냥의 ${B.DUNGEON_RUNS}배예요.</p>`;
    for (let t = 1; t <= top; t++) { const open = SH.dungeonUnlocked(st, t, now), can = SH.canDungeon(st, t, now) && (el || SH.validEls(st.pickEls)); h += row(`${t}단계`, open ? (d.cleared[t] ? '깬 적 있음' : '처음 도전') : '전 단계를 먼저', btn('fight', 'daily', t, '도전', can) + btn('sweep', 'daily', t, '소탕', can && d.cleared[t])); }
    h += `<h3>입장권 던전</h3><p>사냥 중 가끔 나오는 입장권으로 들어가요. 서로 다른 3속성을 고르세요.</p><div class="chips">${chips}</div>`;
    let any = false;
    for (let t = 1; t <= B.MAX_TIER; t++) { const n = st.tickets[t] || 0; if (!n) continue; any = true; const can = SH.validEls(st.pickEls); h += row(`${t}단계 입장권 ${n}장`, d.ticketCleared[t] ? '깬 적 있음' : '처음 도전', btn('fight', 'ticket', t, '도전', can) + btn('sweep', 'ticket', t, '소탕', can && d.ticketCleared[t])); }
    if (!any) h += '<p>아직 입장권이 없어요.</p>';
    h += `<h3>레인보우 샤들링 ${d.boss} / ${B.BOSS_DAILY}번</h3><p>던전에서 드물게 나오는 입장권 전용 보스. 이기면 한 단계 위 사냥의 ${B.BOSS_RUNS}배 보상이에요.</p>`;
    any = false;
    for (let t = 1; t <= B.MAX_TIER; t++) { const n = st.bossTickets[t] || 0; if (!n) continue; any = true; h += row(`${t}단계 입장권 ${n}장`, '예고를 보고 보호막', btn('fight', 'boss', t, '도전', SH.canBoss(st, t, now)) + '<span></span>'); }
    if (!any) h += '<p>아직 입장권이 없어요.</p>';
    const rp = SH.raidParty(st);
    h += `<h3>레이드 입장권 ${st.raidTickets}장</h3><p>레인보우 샤들링에게서 드물게 나와요. 속성마다 가장 강한 샤들링 1마리씩, 5마리가 함께 싸워요. ${B.RAID_TIER}단계 기준이라 아주 어려워요.</p>`;
    h += row('레이드', rp ? `${ELS.map(e => ELN[e]).join('·')} 준비됨` : '다섯 속성이 모두 있어야 해요', btn('fight', 'raid', 1, '도전', SH.canRaid(st)) + '<span></span>');
    body.innerHTML = h;
  } else if (tab === 'isle') {
    let h = '<h3>어느 섬으로 갈까요</h3><div class="grid2">';
    for (let s = 1; s <= G.maxStage; s++) h += `<button class="card ${s === G.stage ? 'on' : ''}" type="button" data-act="isle" data-s="${s}"><span>${s}번 섬 · ${MAPS[(s - 1) % MAPS.length].name}</span><small>${SH.islandMobs(s).map(e => ELN[e]).join('·')} ${s}단계 소울${st.cleared[s] ? ' · 정복' : ''}</small></button>`;
    body.innerHTML = `${h}</div><p>사냥 보상은 하루 ${B_.DAILY_KILLS.toLocaleString('ko-KR')}마리이고 못 쓴 만큼 최대 ${B_.CARRY_KILLS.toLocaleString('ko-KR')}마리까지 쌓여요. 다 쓴 뒤와 꺼 둔 동안은 효율 10%예요(방치는 최대 ${B_.OFFLINE_CAP_SEC / 3600}시간).</p>
      <button class="ghost" type="button" data-act="reset">${resetArmed ? '정말 지워요. 한 번 더 누르면 처음부터' : '처음부터 다시 하기'}</button>`;
  } else {
    const main = SH.getMon(st, pick.main), sub = SH.getMon(st, pick.sub);
    const slotCard = (kind, m, label) => { if (m) paints.push([m, {}, 'slot' + kind]); return `<button class="card slot ${slot === kind ? 'on' : ''}" type="button" data-act="slot" data-v="${kind}">${m ? `<canvas data-p="slot${kind}"></canvas><span>${m.name}</span>` : '<div class="empty">+</div>'}<small>${label}</small></button>`; };
    const res = main && sub ? SH.branch(main.tier + 1, main.el, sub.el) : null;
    if (res) paints.push([res, { sil:!G.dex[res.key] }, 'slotres']);
    const coach = st.tut === 2 ? `<div class="coach">${!main ? '첫 합성! 주재료를 골라 보세요.' : !sub ? '부재료를 고르면 결과가 달라져요. 까만 그림자 중 어느 쪽이 궁금한가요?' : '이번 첫 합성은 꼭 성공해요. 눌러 보세요!'}</div>` : '';
    let h = coach + `<div class="slots">${slotCard('main', main, '주재료')}<b>+</b>${slotCard('sub', sub, '부재료')}<b>=</b><div class="card slot static">${res ? `<canvas data-p="slotres"></canvas><span>${G.dex[res.key] ? res.name : '???'}</span>` : '<div class="empty">?</div>'}<small>결과</small></div></div>`;
    if (slot === 'main') {
      const list = G.roster.filter(m => m.tier < B_.MAX_TIER).sort((a, b) => b.tier - a.tier || b.level - a.level);
      h += `<h3>주재료 고르기</h3><div class="grid3">${list.map(m => { const need = B_.FUSE_LEVEL[m.tier - 1], ok = m.level >= need; return monCard(m, ok ? 'main' : 'info', (m.id === pick.main ? 'on ' : '') + (ok ? 'ready' : ''), `${m.tier}단계 · Lv ${m.level}${ok ? ' · 가능' : ` / ${need}`}`); }).join('')}</div>`;
    } else if (!main) {
      h += '<p>주재료를 먼저 골라 주세요.</p>';
    } else {
      const els = SH.PAIR[main.el], t = SH.subTier(main.tier), list = G.roster.filter(m => m.tier === t && els.includes(m.el) && m.id !== main.id).sort((a, b) => a.level - b.level);
      h += `<h3>부재료 고르기</h3><p>${ELN[main.el]} ${main.tier}단계 주재료에는 ${els.map(e => ELN[e]).join('·')} ${t}단계만 쓸 수 있고, 무엇을 넣느냐에 따라 결과가 달라요.</p><div class="grid3">${list.map(m => { const lo = B_.SUMMON_LEVEL[m.tier - 1]; return monCard(m, m.level >= lo ? 'sub' : 'info', m.id === pick.sub ? 'on' : '', `${ELN[m.el]} · Lv ${m.level}${m.level >= lo ? '' : ` / ${lo}`}`); }).join('') || `<p>쓸 수 있는 부재료가 없어요. ${els.map(e => ELN[e]).join('·')} ${t}단계를 소환해 주세요.</p>`}</div><h3>나올 수 있는 샤들링</h3><div class="grid2">`;
      els.forEach(e => { const r = SH.branch(main.tier + 1, main.el, e), seen = G.dex[r.key]; paints.push([r, { big:true, sil:!seen }, 'b' + e]); h += `<div class="card big static ${sub && sub.el === e ? 'on' : ''}"><canvas data-p="b${e}"></canvas><span>${seen ? r.name : '???'}</span><small>${ELN[e]} 부재료</small></div>`; });
      h += '</div>';
    }
    if (main) {
      const c = SH.fuseCheck(st, main, sub, pick.souls), soul = c.soulTier ? (sub ? `소울 ${c.souls}개(${ELN[c.soulEl]} ${c.soulTier}단계, ${G.souls[c.soulEl + c.soulTier] || 0}개 보유), ` : `${c.soulTier}단계 소울, `) : '';
      h += `<p>합성은 언제나 주재료 1마리 + 부재료 1마리예요. 성공률 ${Math.round(c.rate * 100)}%, 실패해도 재료는 그대로이고 다음 성공률은 ${Math.round(c.nextRate * 100)}%. 비용 ${soul}${goldText(c.gold)} G. 가진 골드 ${goldText(G.gold)} G.</p>`;
      if (c.soulTier && sub) h += `<div class="ctlrow"><button class="ghost" type="button" data-act="souls" data-d="-10">소울 -10</button><button class="ghost" type="button" data-act="souls" data-d="10">소울 +10 (골드 -10%)</button></div>`;
      h += `<button class="go" type="button" data-act="fuse" ${c.ok ? '' : 'disabled'}>${c.ok ? `합성하기 ${goldText(c.gold)} G` : c.reasons[0]}</button>`;
    }
    body.innerHTML = h;
  }
  paints.forEach(([m, o, id]) => { const c = body.querySelector(`canvas[data-p="${id}"]`); if (c) paint(c, m, o); });
  $('depart').textContent = `${G.stage}번 섬으로 출발`;
}
function showInfo(id) {
  const m = SH.getMon(G.st, id), d = SHAPE[m.shape], inP = G.partyIds.includes(id);
  paint($('sheetArt'), m, { big:true });
  $('sheetTitle').textContent = m.name;
  $('sheetText').textContent = `${ELN[m.el]} ${m.tier}단계 · Lv ${m.level} (기본 Lv ${m.base}, 만렙 ${m.cap}) · ${d.role}. 기술: ${d.skill}, ${d.skillDesc}.`;
  $('sheetSwap').innerHTML = inP ? '' : G.partyIds.map(pid => `<button class="ghost" type="button" data-swap="${pid}" data-in="${id}">${SH.getMon(G.st, pid).name} 대신 함께 가기</button>`).join('');
  $('sheet').hidden = false;
}
function fuseNow() {
  const main = SH.getMon(G.st, pick.main), sub = SH.getMon(G.st, pick.sub);
  if (!main || !sub) return;
  const preview = SH.branch(main.tier + 1, main.el, sub.el), names = `${main.name} + ${sub.name}`;
  const seen = G.dex[preview.key], tutFuse = G.st.tut === 2, r = SH.attemptFuse(G.st, main.id, sub.id, pick.souls, tutFuse ? () => 0 : Math.random);
  if (r.error) { renderTown(); return; }
  if (tutFuse) G.st.tut = null;
  saveGame();
  const art = $('revealArt');
  paint(art, preview, { big:true, sil:!seen });
  art.className = 'charge'; $('revealOk').hidden = true;
  $('revealTitle').textContent = '조각이 서로 이끌려요'; $('revealText').textContent = names;
  $('reveal').hidden = false; audio(); fan([262, 330, 392, 523, 659], .22);
  setTimeout(() => {
    art.className = '';
    if (r.success) {
      const m = r.mon, d = SHAPE[m.shape];
      paint(art, m, { big:true }); void art.offsetWidth; art.className = 'pop';
      $('revealTitle').textContent = r.isNew ? `새로운 샤들링! ${m.name}` : m.name;
      $('revealText').textContent = `${ELN[m.el]} ${m.tier}단계 · Lv ${m.level} (기본 Lv ${m.base}, 만렙 ${m.cap}) · ${d.role}. 기술: ${d.skill}, ${d.skillDesc}.`;
      fan([523, 659, 784, 1047, 1319, 1568], .08);
      slot = 'main'; pick = { main:null, sub:null, souls:1 };
    } else {
      $('revealTitle').textContent = '합성 실패';
      $('revealText').textContent = `재료는 그대로예요. 다음 성공률은 ${Math.round(SH.fuseRate(main.tier, main.stack) * 100)}%예요.`;
      fan([330, 262, 196], .14);
    }
    $('revealOk').hidden = false;
  }, 1500);
}
function doSummon(el, t) {
  const r = SH.summon(G.st, el, t, Math.random);
  if (r.error) return;
  saveGame();
  const m = r.mon;
  paint($('revealArt'), m, { big:true }); $('revealArt').className = 'pop';
  $('revealTitle').textContent = r.isNew ? `새로운 샤들링! ${m.name}` : m.name;
  $('revealText').textContent = `${ELN[el]} ${t}단계 · 기본 Lv ${m.base} · 만렙 ${m.cap} · ${SHAPE[m.shape].role}`;
  $('revealOk').hidden = false; $('reveal').hidden = false; audio(); fan(r.isNew ? [659, 784, 988, 1319] : [523, 659], .08);
}
function depart() {
  $('town').hidden = true; G.paused = false;
  syncParty();
  if (G.needNewMap) { G.needNewMap = false; loadMap(); banner(`${G.stage}번 섬<small>${MAPS[G.map].name}</small>`, 1500); }
  saveGame();
}
function rewardText(r) {
  const souls = Object.keys(r.souls).sort().map(k => `${ELN[k.slice(0, -1)]} ${k.slice(-1)}단계 ${r.souls[k]}개`).join(', ') || '소울 없음';
  return `${souls}, ${goldText(r.gold)} G.${r.bossTicket ? ' 레인보우 입장권도 나왔어요!' : ''}`;
}
function showReward(title, r) {
  paint($('revealArt'), SH.getMon(G.st, G.partyIds[0]), { big:true }); $('revealArt').className = 'pop';
  $('revealTitle').textContent = title; $('revealText').textContent = '';
  $('revealLoot').innerHTML = lootChips(r);
  $('revealOk').textContent = '받기'; $('revealOk').hidden = false; $('reveal').hidden = false;
  fan(r.bossTicket ? [659, 784, 988, 1319, 1568] : [523, 659, 784, 1047], .08);
}
function showFightLost() {
  paint($('revealArt'), SH.getMon(G.st, G.partyIds[0]), { big:true, sil:true }); $('revealArt').className = '';
  $('revealTitle').textContent = '졌어요'; $('revealText').textContent = '입장권과 횟수는 그대로예요. 더 키우거나 일행을 바꿔 다시 도전해 보세요.';
  $('revealOk').textContent = '돌아가기'; $('revealOk').hidden = false; $('reveal').hidden = false;
}
// 소울은 높은 단계부터, 드문 것은 눈에 띄게
function lootChips(l) {
  const ks = Object.keys(l.souls || {}).sort((a, b) => b.slice(-1) - a.slice(-1) || a.localeCompare(b));
  const chips = ks.map(k => { const el = k.slice(0, -1), t = +k.slice(-1); return `<span class="lootchip ${t >= 3 ? 'rare' : ''}" style="--c:${COL[el]}">${ELN[el]} ${t}단계 ×${l.souls[k]}</span>`; });
  if (l.gold) chips.push(`<span class="lootchip">${goldText(l.gold)} G</span>`);
  if (l.tickets) chips.push(`<span class="lootchip rare">던전 입장권 ×${l.tickets}</span>`);
  if (l.bossTicket) chips.push('<span class="lootchip rare">레인보우 입장권!</span>');
  if (l.raidTicket) chips.push('<span class="lootchip rare">레이드 입장권!!</span>');
  (l.levels || []).forEach(v => chips.push(`<span class="lootchip" style="--c:#7dff8a">${v.name} Lv ${v.from}→${v.to}</span>`));
  return chips.join('');
}
function lootLevels(lv) { return Object.keys(lv).map(id => { const m = SH.getMon(G.st, +id); return m && m.level > lv[id] ? { name:m.name, from:lv[id], to:m.level } : null; }).filter(Boolean); }
function showLoot(title, loot, next) {
  const l = { souls:loot.souls, gold:G.st.gold - loot.gold0, tickets:loot.tickets, levels:lootLevels(loot.lv) };
  paint($('revealArt'), SH.getMon(G.st, G.partyIds[0]), { big:true }); $('revealArt').className = 'pop';
  $('revealTitle').textContent = title;
  $('revealText').textContent = loot.kills ? `${loot.kills}마리 사냥` : '';
  $('revealLoot').innerHTML = lootChips(l) || '<span class="lootchip">이번엔 소울이 없었어요</span>';
  $('revealOk').textContent = '마을로'; $('revealOk').hidden = false;
  $('revealNext').hidden = !next; $('reveal').hidden = false;
  fan([523, 659, 784, 1047], .08);
  resetLoot();
}
function afterClear() {
  const cleared = G.stage, loot = G.loot, hasNext = G.maxStage > cleared;
  G.stage = G.maxStage; G.needNewMap = true;
  if (G.st.tut === 1) SH.tutorialFuseReady(G.st);
  openTown('fuse');
  showLoot(`${cleared}번 섬 정복!`, loot, hasNext && !G.st.tut);
  saveGame();
}
function showIntro() {
  G.paused = true; const picked = [], box = $('introPick');
  ELS.forEach(el => { const m = { el, shape:SH.summonPool(el, 1)[0].shape }, b = document.createElement('button'); b.type = 'button'; b.className = 'card'; b.dataset.el = el; b.innerHTML = `<canvas></canvas><span>${SH.summonPool(el, 1)[0].name}</span><small>${ELN[el]} · ${SHAPE[m.shape].role}</small>`; box.appendChild(b); setTimeout(() => paint(b.querySelector('canvas'), m), 300); });
  const refresh = () => { box.querySelectorAll('.card').forEach(c => c.classList.toggle('on', picked.includes(c.dataset.el))); $('introGo').disabled = picked.length !== 3; $('introGo').textContent = picked.length === 3 ? '떠나기' : `${3 - picked.length}마리 더 골라 주세요`; };
  box.addEventListener('click', e => { audio(); const c = e.target.closest('.card'); if (!c) return; const el = c.dataset.el, i = picked.indexOf(el); if (i >= 0) picked.splice(i, 1); else if (picked.length < 3) picked.push(el); refresh(); });
  const go = () => { $('intro').hidden = true; G.party = []; syncParty(); resetLoot(); G.paused = false; saveGame(); };
  $('introGo').onclick = () => { SH.tutorialPick(G.st, picked); $('hint').textContent = '샤들링이 알아서 싸워요. 그냥 지켜보세요.'; G.hintT = 8; go(); };
  $('introSkip').onclick = () => { G.st.tut = null; go(); };
  $('intro').hidden = false; refresh();
}
const sumOf = o => Object.values(o || {}).reduce((a, b) => a + b, 0);
// 사냥 화면의 목표 한 줄
function goalText() {
  const st = G.st;
  if (G.fight) return '';
  if (st.tut === 1) return `이 섬의 적 ${G.need}마리를 잡고 보스를 쓰러뜨리세요`;
  const ready = st.roster.find(m => m.tier < B_.MAX_TIER && m.level >= B_.FUSE_LEVEL[m.tier - 1] && st.roster.some(n => n !== m && SH.fuseCheck(st, m, n).ok));
  if (ready) return `${ready.name} 합성 가능! 마을로 가세요`;
  const sm = ELS.flatMap(el => [1, 2, 3, 4, 5].map(t => [el, t, st.souls[el + t] || 0])).filter(x => x[2] >= B_.SOULS_PER_SUMMON);
  if (sm.length) return `${ELN[sm[0][0]]} ${sm[0][1]}단계 소환 가능!`;
  const party = st.partyIds.map(id => SH.getMon(st, id)).filter(m => m && m.tier < B_.MAX_TIER && m.level < B_.FUSE_LEVEL[m.tier - 1]).sort((a, b) => b.level / B_.FUSE_LEVEL[b.tier - 1] - a.level / B_.FUSE_LEVEL[a.tier - 1]);
  if (party[0]) return `${party[0].name} 합성까지 Lv ${party[0].level} / ${B_.FUSE_LEVEL[party[0].tier - 1]}`;
  if (!st.cleared[st.stage]) return `이 섬의 보스까지 ${Math.max(0, G.need - G.kills)}마리`;
  return '다음 합성에 쓸 소울을 모아요';
}
function showOffline(r) {
  const hours = r.sec >= 3600 ? `${(r.sec / 3600).toFixed(1)}시간` : `${Math.round(r.sec / 60)}분`;
  const souls = Object.keys(r.souls).map(k => `${ELN[k.slice(0, -1)]} ${k.slice(-1)}단계 ${r.souls[k]}개`).join(', ') || '소울 없음';
  const lv = r.levels.map(l => `${l.name} Lv ${l.from}→${l.to}`).join(', ');
  paint($('revealArt'), SH.getMon(G.st, G.partyIds[0]), { big:true }); $('revealArt').className = '';
  $('revealTitle').textContent = '다녀오셨어요!';
  $('revealText').textContent = `${hours} 동안 ${r.kills}마리 사냥`;
  $('revealLoot').innerHTML = lootChips({ souls:r.souls, gold:r.gold, tickets:r.tickets, levels:r.levels });
  $('revealOk').textContent = '받기'; $('revealOk').hidden = false; $('reveal').hidden = false;
}
$('town').addEventListener('click', e => {
  audio();
  const t = e.target.closest('[data-tab],[data-act]'); if (!t) return;
  if (t.dataset.tab) { tab = t.dataset.tab; resetArmed = false; renderTown(); return; }
  const a = t.dataset.act, id = +t.dataset.id;
  if (a === 'info') showInfo(id);
  if (a === 'slot') { slot = t.dataset.v; renderTown(); }
  if (a === 'main') { pick = { main:id, sub:null, souls:1 }; slot = 'sub'; renderTown(); }
  if (a === 'sub') { pick.sub = id; renderTown(); }
  if (a === 'souls') { pick.souls = Math.max(1, Math.min(B_.FUSE_SOUL_MAX, pick.souls + +t.dataset.d)); renderTown(); }
  if (a === 'fuse') fuseNow();
  if (a === 'fight') startFight(t.dataset.k, +t.dataset.t);
  if (a === 'sweep') {
    const k = t.dataset.k, n = +t.dataset.t, r = k === 'daily' ? SH.winDungeon(G.st, n, Date.now(), Math.random) : SH.winTicketDungeon(G.st, n, Date.now(), Math.random);
    if (!r.error) { saveGame(); showReward('소탕 완료', r); }
    renderTown();
  }
  if (a === 'pickel') { const e = t.dataset.el, p = G.st.pickEls; if (p.includes(e)) p.splice(p.indexOf(e), 1); else if (p.length < B_.TICKET_SET_SIZE) p.push(e); renderTown(); }
  if (a === 'summon') doSummon(t.dataset.el, +t.dataset.t);
  if (a === 'isle') { const s = +t.dataset.s; if (s !== G.stage) { G.stage = s; G.needNewMap = true; } renderTown(); }
  if (a === 'reset') { if (resetArmed) resetGame(); else { resetArmed = true; renderTown(); } }
});
$('depart').onclick = depart;
$('sheetClose').onclick = () => { $('sheet').hidden = true; };
$('sheetSwap').addEventListener('click', e => {
  const b = e.target.closest('[data-swap]'); if (!b) return;
  SH.setParty(G.st, +b.dataset.swap, +b.dataset.in); saveGame();
  $('sheet').hidden = true; renderTown();
});
const closeReveal = () => { $('reveal').hidden = true; $('revealOk').textContent = '좋아요'; $('revealLoot').innerHTML = ''; $('revealNext').hidden = true; };
$('revealOk').onclick = () => { closeReveal(); if (!$('town').hidden) renderTown(); };
$('revealNext').onclick = () => { closeReveal(); depart(); };
function townScene(t) {
  const c = $('townScene'), x = c.getContext('2d'), m = MAPS[0]; x.imageSmoothingEnabled = false;
  m.sky.forEach((col, i) => { x.fillStyle = col; x.fillRect(0, i * 11, 300, 12); });
  x.fillStyle = m.g[0]; x.fillRect(0, 44, 300, 40); x.fillStyle = m.g[2]; x.fillRect(0, 44, 300, 3);
  // 임시 마을 집
  [[26, '#c9694f'], [244, '#5f8fc9']].forEach(([hx, roof]) => {
    x.fillStyle = '#2b2140'; x.fillRect(hx - 1, 25, 34, 25);
    x.fillStyle = '#fff0d6'; x.fillRect(hx, 28, 32, 21);
    x.fillStyle = roof; for (let j = 0; j < 9; j++) x.fillRect(hx - 3 + j * 2, 27 - j * 2, 38 - j * 4, 2);
    x.fillStyle = '#7a5236'; x.fillRect(hx + 12, 37, 8, 12);
  });
  G.partyIds.forEach((id, i) => {
    const mon = SH.getMon(G.st, id); if (!mon) return;
    const sp = getSp(mon), hop = Math.abs(Math.sin(t * 2.2 + i * 1.7)) * 3, px = 92 + i * 52;
    x.fillStyle = 'rgba(30,20,50,.28)'; x.fillRect(px + 4, 76, sp.w - 8, 3);
    x.drawImage(sp.n, px, Math.round(46 - hop));
  });
}
