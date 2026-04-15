# Save Point 1 — 기본 기능 완료

## 완료된 작업
- Vite + React + Tailwind v4 프로젝트 초기 설정
- 텍스트 입력 → 단어 추출 → 빈도수 분석 (불용어 제거, 대소문자 무시)
- 사전 API 연동 (Free Dictionary API) — 발음기호 + 영어 뜻 자동 조회
- TTS 단어 듣기 (Web Speech API)
- 파일(.txt) 드래그앤드롭 입력
- URL 입력 (Vite proxy로 CORS 우회, HTML 메인 콘텐츠 추출)
- JSON 저장/불러오기
- 빈도수 기준 내림차순 정렬, 상위 30개 표시

## 생성/수정 파일
- `src/App.jsx` — 메인 컴포넌트 (전체 기능 연동)
- `src/utils/stopwords.js` — 영어 불용어 리스트
- `src/utils/analyzer.js` — 단어 추출, 빈도수 계산, 사전 API 연동
- `src/utils/reader.js` — 파일 읽기, URL 크롤링, HTML 텍스트 추출
- `vite.config.js` — CORS proxy 설정
- `index.html` — lang="ko", title="Word Catcher"
- `ReadMe.md` — 기획서

## 기술 스택
- React 19, Vite 8, Tailwind CSS v4
- Free Dictionary API (https://api.dictionaryapi.dev/api/v2/entries/en/{word})
- Web Speech API (TTS)
- Vite server proxy (URL 크롤링 CORS 대응)

## 알려진 버그
- `vite.config.js` 프록시 설정 버그: `target: ''` (빈 값) → `getaddrinfo ENOTFOUND base.invalid` 에러 발생
  - router로 동적 라우팅 중이나 target이 빈 값이라 DNS 실패
  - 수정 방안: target을 임시값(예: `https://example.com`)으로 설정하거나, `http-proxy` 미들웨어로 직접 구현

## 복구 방법
1. `docs/INDEX.md` 읽고 작업 매핑 확인
2. `docs/savepoint/savepoint-1.md` (이 파일) 읽고 현재 상태 파악
3. `npm install && npm run dev`로 서버 시작

## 다음 단계
- **[버그수정]** vite.config.js URL 프록시 target 수정
- 기획서 추가 기능 논의 (마스터가 생각날 때마다)
- UI/UX 개선 (반응형, 애니메이션 등)
- 한국어 뜻 번역 (현재 영어 뜻만 표시)
