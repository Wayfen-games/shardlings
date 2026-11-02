# 샤들링 (Shardlings)

샤들링을 모으고 합성하는 실시간 자동 사냥 RPG. 안드로이드 출시를 목표로 만드는 중입니다.

현재 상태: 1차 개발. 1~5단계, 저장, 방치 보상까지. 그림 일부와 숫자는 임시입니다.

## 실행

빌드 없이 돌아갑니다. 이 폴더에서 정적 서버를 띄운 뒤 브라우저로 여세요.

```bash
npx serve .
```

## 점검

```bash
npm install
npm test
npm run smoke
npm run tempo
```

`smoke`는 설치된 Microsoft Edge로 폰 크기 화면을 돌립니다.

## 파일

| 경로 | 내용 |
|---|---|
| `js/balance.js` | 모든 숫자 |
| `js/data.js` | 속성, 개체, 섬 |
| `js/logic.js` | 규칙과 저장 형식 (화면 코드 없음) |
| `js/game.js` | 실시간 전투와 그리기 |
| `js/town.js` | 마을 화면 |
| `js/main.js` | 시작, 저장, 방치 보상 |
| `tests/` | 규칙 테스트 |
| `tools/` | 템포 시뮬레이션, 브라우저 점검 |
| `art/` | 필드용 그림 (세로 32칸), `art/big/`은 정보 화면용 |
