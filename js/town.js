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
  } else if (tab === 'isle') {
    let h = '<h3>어느 섬으로 갈까요</h3><div class="grid2">';
    for (let s = 1; s <= G.maxStage; s++) h += `<button class="card ${s === G.stage ? 'on' : ''}" type="button" data-act="isle" data-s="${s}"><span>${s}번 섬 · ${MAPS[(s - 1) % MAPS.length].name}</span><small>${SH.islandMobs(s).map(e => ELN[e]).join('·')} ${s}단계 소울${st.cleared[s] ? ' · 정복' : ''}</small></button>`;
    body.innerHTML = `${h}</div><p>꺼 둔 동안도 고른 섬에서 켜 둔 것과 똑같이 사냥해요. 최대 ${B_.OFFLINE_CAP_SEC / 3600}시간까지 쌓여요.</p>
      <button class="ghost" type="button" data-act="reset">${resetArmed ? '정말 지워요. 한 번 더 누르면 처음부터' : '처음부터 다시 하기'}</button>`;
  } else {
    const main = SH.getMon(st, pick.main), sub = SH.getMon(st, pick.sub);
    const slotCard = (kind, m, label) => { if (m) paints.push([m, {}, 'slot' + kind]); return `<button class="card slot ${slot === kind ? 'on' : ''}" type="button" data-act="slot" data-v="${kind}">${m ? `<canvas data-p="slot${kind}"></canvas><span>${m.name}</span>` : '<div class="empty">+</div>'}<small>${label}</small></button>`; };
    const res = main && sub ? SH.branch(main.tier + 1, main.el, sub.el) : null;
    if (res) paints.push([res, { sil:!G.dex[res.key] }, 'slotres']);
    let h = `<div class="slots">${slotCard('main', main, '주재료')}<b>+</b>${slotCard('sub', sub, '부재료')}<b>=</b><div class="card slot static">${res ? `<canvas data-p="slotres"></canvas><span>${G.dex[res.key] ? res.name : '???'}</span>` : '<div class="empty">?</div>'}<small>결과</small></div></div>`;
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
  const seen = G.dex[preview.key], r = SH.attemptFuse(G.st, main.id, sub.id, pick.souls, Math.random);
  if (r.error) { renderTown(); return; }
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
function showOffline(r) {
  const hours = r.sec >= 3600 ? `${(r.sec / 3600).toFixed(1)}시간` : `${Math.round(r.sec / 60)}분`;
  const souls = Object.keys(r.souls).map(k => `${ELN[k.slice(0, -1)]} ${k.slice(-1)}단계 ${r.souls[k]}개`).join(', ') || '소울 없음';
  const lv = r.levels.map(l => `${l.name} Lv ${l.from}→${l.to}`).join(', ');
  paint($('revealArt'), SH.getMon(G.st, G.partyIds[0]), { big:true }); $('revealArt').className = '';
  $('revealTitle').textContent = '다녀오셨어요!';
  $('revealText').textContent = `${hours} 동안 ${r.kills}마리 사냥. ${souls}, ${goldText(r.gold)} G.${lv ? ' ' + lv + '.' : ''}`;
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
$('revealOk').onclick = () => { $('reveal').hidden = true; $('revealOk').textContent = '좋아요'; if (!$('town').hidden) renderTown(); };
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
