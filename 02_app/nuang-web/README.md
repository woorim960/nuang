# NUANG Web

뉴앙 웹은 성향 기반 SNS의 MVP 앱이다. 현재는 로그인 없이 시작하는 코어 검사, 결과 리포트, 무료 주제 검사, 피드, 마이 리포트, 공개 공유 리포트, 프로필 팝업 기반 1:1 비교의 MVP 경로를 구현하고 있다.

## 처음 확인할 것

```bash
npm install
npm run env:check
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 연다.

`env:check`는 Supabase나 OAuth credential 없이도 통과해야 한다. 서버 기능을 검증할 때는 `.env.local`을 직접 준비한 뒤 `env:check:auth`와 `env:check:server`를 함께 확인한다.

## 현재 열린 기능

- 빠른 코어 검사
- 정밀 코어 검사
- 결과 리포트
- 내 결과 삭제/export
- 32개 뉴앙 코드 기반 성향지도
- 무료 주제 검사 10개
- 피드 read/write, 반응, 댓글, 저장, 관심 없음
- 밸런스 게임과 뉴앙 코드별 통계
- 결과 공유 주소 생성과 공개 공유 리포트
- 공개 프로필 팝업 기반 1:1 비교 리포트
- 별난 성향 연구소 검사
- 도움 허브
- 결과 이미지 저장/공유

## 출시 전 확인할 기능

서버 env가 준비되어도 아래는 공개 출시 전 실제 계정 세션과 RLS로 다시 증빙한다.

- Google/Kakao OAuth 브라우저 smoke
- 결과 계정 저장과 중복 claim 복원
- 공유 주소 생성, 조회, 만료, 철회
- 피드 작성, 반응, 댓글, 저장, 관심 없음
- 프로필 팝업 기반 1:1 비교 생성, 조회, 삭제
- 직접 응답, 원점수, 민감 항목 비노출
- 약관·개인정보 최종 승인

## 검증 명령

일반 변경 후:

```bash
npm run qa:precredential:fast
```

출시 후보나 큰 UI 변경 후:

```bash
npm run qa:mvp
```

개별로 확인할 때:

```bash
npm run typecheck
npm run lint
npm run test
npm run qa:precredential:build
```

credential 상태 확인:

```bash
npm run env:check
npm run env:check:auth
npm run env:check:server
npm run smoke:server:readiness
```

- `env:check`: 로컬 MVP용. credential 없이 통과해야 한다.
- `env:check:auth`: 소셜 로그인 연결 직전에 사용한다.
- `env:check:server`: 계정 저장·공유 링크 서버 write를 열기 직전에 사용한다.
- `smoke:server:readiness`: 실제 Supabase service/anon 권한 표면과 legacy 공개 코드 table 부재를 확인한다.

주의:

- Codex 샌드박스 내부에서 Turbopack build가 포트 바인딩 제한으로 실패하면 같은 명령을 샌드박스 밖에서 재실행해 확인한다.
- `npm run e2e`는 Playwright 브라우저가 설치되어 있어야 한다.

## 주요 문서

- [credential 최소 준비](./supabase/CREDENTIAL_MINIMAL_SETUP.md)
- [MVP smoke 체크리스트](./docs/NUANG_MVP_SMOKE_CHECKLIST.md)
- [pre-credential QA 체크리스트](./docs/PRE_CREDENTIAL_QA_CHECKLIST.md)
- [계정 저장·공유 API runbook](./docs/ACCOUNT_SHARE_API_RUNBOOK.md)
- [Supabase workspace](./supabase/README.md)

## 개인정보·공유 원칙

- 공개 공유 응답에는 직접 문항 응답을 넣지 않는다.
- 공유 주소는 `summary` 범위만 허용한다.
- raw share token은 저장하지 않고, 서버 write가 열리면 hash만 저장한다.
- service role key는 브라우저 코드에 절대 넣지 않는다.
- Supabase env가 비어 있어도 로컬 MVP는 실행되어야 한다.

## 현재 다음 단계

- 현재 큰 변경 묶음을 MVP 기준선으로 정리한다.
- Step 182 기준 카카오 연결 세션 smoke와 RLS·직접 응답 비노출 증빙은 통과했다.
- 강제 로그아웃 후 Google/Kakao provider 왕복 재로그인 smoke는 계정 접근 확인 후 진행한다.
- Supabase RLS와 직접 응답 비노출은 release candidate 전 Step 182 기준으로 반복한다.
- 계정 seed가 안정되면 Playwright E2E를 결과 저장, 공유 주소, 피드, 마이 리포트 흐름까지 넓힌다.
- Next 내부 PostCSS moderate advisory는 upstream 패치가 나오면 재확인한다.
- 법률/개인정보 최종 승인 전 공개 출시는 진행하지 않는다.
