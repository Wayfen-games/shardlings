// 시작, 저장, 방치 보상
function saveGame() {
  if (!G.st) return;
  G.st.lastSeen = Date.now();
  try { localStorage.setItem(SH.B.SAVE_KEY, SH.serialize(G.st)); } catch (e) { /* 저장을 못 하는 환경에서도 게임은 돈다 */ }
}
function resetGame() {
  try { localStorage.removeItem(SH.B.SAVE_KEY); } catch (e) { /* 지울 것이 없음 */ }
  location.reload();
}
function loadSave() {
  try { return SH.deserialize(localStorage.getItem(SH.B.SAVE_KEY)); } catch (e) { return null; }
}
function claimAway() {
  const r = SH.claimOffline(G.st, Date.now(), Math.random);
  if (r) { showOffline(r); saveGame(); }
}

resize();
G.st = loadSave() || SH.newState(Date.now());
mkParty();
loadMap();
if (G.st.tut === 0) showIntro(); else claimAway();
if (G.st.cleared[G.st.stage]) G.kills = 0;
setInterval(() => { if (!document.hidden) saveGame(); }, 10000);
document.addEventListener('visibilitychange', () => { if (document.hidden) saveGame(); else claimAway(); });
addEventListener('pagehide', saveGame);
requestAnimationFrame(frame);
window.__sh = { G, SH, update, draw, hud, skill, openTown, renderTown, depart, saveGame };
