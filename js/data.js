// 속성, 체형, 개체. 이름과 체형 배정은 그림이 나올 때까지 임시
(g => {
  const SH = g.SH = g.SH || {};
  const B = SH.B;
  const ELS = SH.ELS = ['fire', 'water', 'grass', 'light', 'dark'];
  SH.ELN = { fire:'불', water:'물', grass:'풀', light:'빛', dark:'어둠' };
  // [사용자] 부재료는 원형 불-풀-물-빛-어둠의 양옆
  const PAIR = SH.PAIR = { fire:['grass', 'dark'], grass:['fire', 'water'], water:['grass', 'light'], light:['water', 'dark'], dark:['light', 'fire'] };
  const SHAPES = ['fire', 'water', 'grass'];
  SH.SHAPE = {
    fire:{ range:62, cd:.95, atk:9, hp:100, spd:44, skill:'불꽃 돌진', skillDesc:'가끔 적 하나에게 큰 피해', role:'공격형' },
    water:{ range:70, cd:1.1, atk:8, hp:105, spd:42, skill:'치유 물결', skillDesc:'가끔 다친 동료를 회복', role:'회복형' },
    grass:{ range:28, cd:.7, atk:8, hp:140, spd:52, skill:'잎 폭풍', skillDesc:'가끔 주변 적 모두에게 피해', role:'근접 광역형' },
  };
  // [사용자] 섬마다 나오는 샤들링이 다름
  const ISLAND_MOBS = [['grass', 'water', 'light'], ['fire', 'grass', 'dark'], ['water', 'light', 'dark']];
  SH.islandMobs = stage => ISLAND_MOBS[(stage - 1) % ISLAND_MOBS.length];

  const T1 = {
    fire:[['fire', '라바롱'], ['grass', '불씨토']],
    water:[['water', '아쿠씰'], ['fire', '물방뉴트']],
    grass:[['grass', '리프바니'], ['water', '이끼씰']],
    light:[['water', '루미윙'], ['grass', '별빛토']],
    dark:[['grass', '녹스캣'], ['fire', '밤뉴트']],
  };
  const T2 = {
    fire:{ grass:['grass', '잿잎토'], dark:['water', '흑불씰'] },
    water:{ grass:['fire', '이끼뉴트'], light:['grass', '물빛토'] },
    grass:{ fire:['water', '꽃불씰'], water:['fire', '이슬뉴트'] },
    light:{ water:['fire', '햇살뉴트'], dark:['grass', '새벽토'] },
    dark:{ light:['fire', '그믐뉴트'], fire:['water', '밤불씰'] },
  };
  function make(el, tier, variant, shape, name, via) {
    const base = B.SUMMON_LEVEL[tier - 1] + (variant ? B.VARIANT_BASE_BONUS : 0);
    const cap = B.TIER_CAP[tier - 1] + (variant ? B.VARIANT_CAP_BONUS : 0);
    return { key:`${tier}:${el}:${via || variant}`, el, tier, shape, name, base, cap, via:via || null };
  }
  // [사용자] 주재료가 같아도 부재료에 따라 다른 개체가 나온다
  SH.branch = (tier, el, subEl) => {
    const i = PAIR[el].indexOf(subEl);
    if (i < 0) return null;
    if (tier === 2) { const [shape, name] = T2[el][subEl]; return make(el, 2, i, shape, name, subEl); }
    const shape = SHAPES[(ELS.indexOf(el) + tier + i * 2) % 3];
    return make(el, tier, i, shape, `${SH.ELN[el]}${tier}단계 ${'가나'[i]}형`, subEl);
  };
  // [사용자] 소환은 그 단계의 개체 중 무작위, 레벨은 개체의 기본 레벨
  SH.summonPool = (el, tier) => tier === 1
    ? T1[el].map(([shape, name], i) => make(el, 1, i, shape, name))
    : PAIR[el].map(s => SH.branch(tier, el, s));
})(globalThis);
