# NUANG Credential Minimal Setup

이 문서는 실제 키를 받기 전 시행착오를 줄이기 위한 체크리스트다. 비밀키는 채팅에 공유하지 말고 로컬 `.env.local`이나 배포 환경 변수에만 넣는다.

## 1. 지금 당장 필요하지 않은 것

로컬 MVP 검사, 결과, 성향지도, 마이 탭 로컬 관리는 credential 없이 동작한다.

```bash
npm run env:check
```

이 명령은 Supabase/OAuth 값이 없어도 통과해야 한다.

## 2. 소셜 로그인만 열 때 필요한 값

`.env.local`에 아래 값을 넣는다.

```bash
NEXT_PUBLIC_APP_ORIGIN=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

확인 명령:

```bash
npm run env:check:auth
```

필요한 외부 준비:

- Supabase 프로젝트 생성
- Supabase Auth Site URL: `NEXT_PUBLIC_APP_ORIGIN`과 동일하게 설정
- Supabase Auth redirect allowlist에 `/auth/callback` 경로가 포함된 앱 URL 등록
- Google provider app 등록
- Kakao provider app 등록
- Naver는 기본 provider가 아니므로 custom OAuth/OIDC 또는 별도 callback 구현 전까지 실제 redirect 차단 유지

## 3. 계정 저장·공유 서버 기능까지 열 때 필요한 값

`.env.local` 또는 배포 환경에 아래 server-only 값을 추가한다.

```bash
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=
SHARE_TOKEN_PEPPER=
FIELD_ENCRYPTION_KEY=
ADMIN_BOOTSTRAP_EMAILS=
```

확인 명령:

```bash
npm run env:check:server
```

주의:

- `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `SHARE_TOKEN_PEPPER`, `FIELD_ENCRYPTION_KEY`는 브라우저에 노출하면 안 된다.
- `NEXT_PUBLIC_` prefix가 붙은 값만 브라우저 노출을 허용한다.
- service role key는 서버 route, migration, admin job에서만 사용한다.

## 4. OAuth provider별 최소 결정

Google:

- Supabase native provider로 연결
- email/profile은 선택적 사용
- 생년월일은 기본 기대값으로 두지 않는다

Kakao:

- Supabase native provider로 연결
- email/profile은 선택적 사용
- 연령대가 provider에서 오더라도 자기선언 age gate를 대체하지 않는다

Naver:

- MVP 버튼은 유지
- 실제 redirect는 custom OAuth/OIDC 검증 전까지 닫힘 상태 유지
- client id/secret은 서버 전용으로만 보관

## 5. 사용자에게 요청할 타이밍

아직 요청하지 않는다:

- 로컬 UX 정리
- 검사·결과 문구 QA
- 닫힘 상태 schema와 테스트 보강

요청한다:

- 실제 소셜 로그인을 열 때
- result claim DB write를 구현할 때
- 공유 링크 생성·철회 DB write를 구현할 때
- 배포 도메인을 확정할 때

## 6. 연결 전 게이트

소셜 로그인 오픈 전:

- `npm run env:check:auth` 통과
- Google/Kakao provider dashboard 등록 완료
- `/auth/callback?next=/my` redirect 확인
- Naver 버튼은 unavailable 상태 유지 또는 custom OAuth 검증 완료

계정 저장·공유 오픈 전:

- `npm run env:check:server` 통과
- migration 적용
- RLS enabled 확인
- 직접 응답 client select 금지 확인
- 공유 링크 token 원문 저장 금지 확인
- noindex, expiry, revoke 확인
