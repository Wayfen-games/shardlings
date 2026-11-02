// 모든 숫자를 모으는 곳. [사용자]는 사용자가 정한 값, [임시]는 시뮬레이션으로 다시 맞출 값
(g => {
  const SH = g.SH = g.SH || {};
  SH.B = {
    SAVE_KEY: 'shardlings-save-v1',
    SAVE_VERSION: 1,
    MAX_TIER: 5,                                   // [사용자] 친구 테스트는 10단계, 1차는 5단계까지
    MAX_ISLAND: 5,
    SOULS_PER_SUMMON: 30,                          // [사용자 10-26]
    SOUL_CAP: 999,                                 // [사용자 10-26]
    START_ROSTER: 4,                               // 3마리 이하는 합성 불가(피드백 11번)라 1마리 더 줌

    // 레벨 [사용자 10-26, 피드백 117번]: 단계 만렙 = (n+2)단계 소환 레벨
    SUMMON_LEVEL: [1, 13, 25, 36, 48, 59],
    FUSE_LEVEL: [13, 25, 36, 48, 59],
    TIER_CAP: [25, 36, 48, 59, 70],
    VARIANT_BASE_BONUS: 2,                         // [임시] 같은 단계 안의 둘째 개체: 기본 레벨 +2
    VARIANT_CAP_BONUS: 3,                          // [임시] 둘째 개체: 만렙 +3
    EXP_A: 5.5, EXP_R: 1.074,                      // [사용자 10-26] 경험치 통
    LEVEL_STAT: 0.005,                             // [사용자] 레벨당 능력치 +0.5%
    TIER_STAT: 1.5,                                // [사용자] 단계당 ×1.5

    // 합성 [사용자]
    FUSE_RATE: [0.8, 0.6, 0.4, 0.25],              // 20% 아래로 떨어지는 단계부터 20% 고정
    FUSE_RATE_FLOOR: 0.2,
    STACK_FIRST: 0.05, STACK_STEP: 0.02, STACK_MAX: 8, // 첫 +5%p, 이후 상승폭 +2%p, 8스택 100%
    FUSE_GOLD: [100, 8000, 20000, 60000],          // [10-26 시뮬레이션 값] 실시간 수입에 맞춰 재확인 필요
    FUSE_STACK_GOLD: 1.2,                          // [사용자] 스택마다 +20%
    FUSE_SOUL_MAX: 100, FUSE_SOUL_DISCOUNT: 0.01,  // [사용자] 소울 1개당 골드 -1%, 100개면 공짜

    // 사냥 [임시]: 켜 둠과 꺼 둠의 효율이 같다 [사용자 11-02]
    SPAWN_EVERY: 3,                                // 초당 처치 수의 상한을 정한다
    KILLS_PER_SEC: 1 / 3,
    OFFLINE_CAP_SEC: 12 * 3600,                    // [제안] 광고 버프 상한과 같은 12시간
    OFFLINE_MIN_SEC: 60,
    GAUGE_KILLS: 70,
    ELITE_CHANCE: 1 / 3,                           // [사용자] 스테이지 = (n+1)단계 1 + n단계 2의 비율
    DROP_BASE: 0.5, DROP_RATIO: 0.3,               // [사용자] 1단계 0.5, 단계마다 ×0.3
    KILL_SCALE: 7,                                 // [임시] 기존 게임 하루 처치 수 ÷ 실시간 하루 처치 수
    EXP_WIN: 10, EXP_WIN_GROWTH: 1.3,              // [사용자] 기존 1판 경험치, 단계마다 ×1.3
    GOLD_WIN: 25, GOLD_WIN_GROWTH: 1.3,            // [사용자] 기존 1판 골드, 단계마다 ×1.3
    KILLS_PER_RUN: 3,                              // 기존 1판 = 적 3마리
    BOSS_KILL_VALUE: 40,                           // [임시] 맵 보스 보상 = 처치 40마리분

    // 던전·보스 [사용자]
    DUNGEON_DAILY: 2,                              // 요일 던전 하루 2판, 이길 때만 차감
    DUNGEON_RUNS: 30, BOSS_RUNS: 100,              // 보상 = 기존 1판의 ×30, ×100
    BOSS_DAILY: 10,                                // 레인보우 샤들링 하루 10번
    TICKET_PER_RUN: 0.01,                          // 입장권: 기존 1판당 1%
    BOSS_TICKET_DUNGEON: 0.02,                     // 보스 입장권: 던전 승리 때 2%
    TICKET_SET_SIZE: 3,                            // 입장권 던전과 주말은 서로 다른 3속성
    WEEKDAY_EL: [null, 'light', 'fire', 'water', 'grass', 'dark', null], // 일~토 [사용자]
    DUNGEON_HP: 7, DUNGEON_ATK: 2.2,               // [임시] 적 1마리 배율

    // 전투 [임시]
    ENEMY_HP: 62, ENEMY_ATK: 2.6, ISLAND_STAT: 1.5, ELITE_STAT: 1.5,
    BOSS_HP: 1600, BOSS_ATK: 7,
  };
})(globalThis);
