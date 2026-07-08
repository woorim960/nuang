# NUANG Web

뉴앙 웹은 성향 기반 SNS의 MVP 앱이다. 현재는 비회원 로컬 검사, 로컬 결과 리포트, 성향지도, 마이 탭 로컬 관리, 도움 허브, 공유 링크 안전 대기 화면까지 제공한다.

## 처음 확인할 것

```bash
npm install
npm run env:check
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 연다.

`env:check`는 Supabase나 OAuth credential 없이 통과해야 한다. 지금 단계에서 credential을 넣지 않아도 로컬 MVP는 계속 동작해야 한다.

## 현재 열린 기능

- 빠른 코어 검사
- 정밀 코어 검사
- 로컬 결과 리포트
- 로컬 결과 삭제/export
- 최신 정밀 코어 결과 기반 성향지도
- 별난 성향 연구소 검사
- 도움 허브
- 결과 이미지 저장/공유

## 아직 닫힌 기능

credential과 DB 검증 전까지 아래 기능은 의도적으로 닫아둔다.

- 소셜 로그인 세션
- 로컬 결과 계정 저장
- 공유 링크 생성
- 공유 링크 철회
- 공개 공유 token 조회
- 장기 계정 저장

## 검증 명령

일반 변경 후:

```bash
npm run qa:precredential:fast
```

출시 후보나 큰 UI 변경 후:

```bash
npm run qa:precredential
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
```

- `env:check`: 로컬 MVP용. credential 없이 통과해야 한다.
- `env:check:auth`: 소셜 로그인 연결 직전에 사용한다.
- `env:check:server`: 계정 저장·공유 링크 서버 write를 열기 직전에 사용한다.

## 주요 문서

- [credential 최소 준비](./supabase/CREDENTIAL_MINIMAL_SETUP.md)
- [pre-credential QA 체크리스트](./docs/PRE_CREDENTIAL_QA_CHECKLIST.md)
- [계정 저장·공유 API runbook](./docs/ACCOUNT_SHARE_API_RUNBOOK.md)
- [Supabase workspace](./supabase/README.md)

## 개인정보·공유 원칙

- 공개 공유 응답에는 직접 문항 응답을 넣지 않는다.
- 공유 링크는 `summary` 범위만 허용한다.
- raw share token은 저장하지 않고, 서버 write가 열리면 hash만 저장한다.
- service role key는 브라우저 코드에 절대 넣지 않는다.
- Supabase env가 비어 있어도 로컬 MVP는 실행되어야 한다.

## credential을 요청하는 시점

아직 요청하지 않는다:

- 로컬 UX 정리
- 검사/결과 문구 QA
- 닫힌 API schema·테스트 보강
- 운영 문서 정리

요청한다:

- 실제 Google/Kakao 로그인을 열 때
- Naver custom OAuth/OIDC를 구현할 때
- result claim DB write를 열 때
- 공유 링크 생성·철회 DB write를 열 때
- 배포 도메인과 OAuth callback URL을 확정할 때
