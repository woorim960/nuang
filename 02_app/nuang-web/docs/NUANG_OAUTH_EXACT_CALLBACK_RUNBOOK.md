# 뉴앙 OAuth 정확한 복귀 주소 운영 가이드

이 문서는 Google·카카오 로그인 후 `localhost`와 `nuang.app`이 서로 뒤바뀌지 않도록 운영자가 확인할 값만 정리한다.

## 1. Supabase에서 등록할 주소

Supabase Dashboard의 **Authentication → URL Configuration**에서 다음과 같이 설정한다.

- Site URL: `https://nuang.app`
- Redirect URLs:
  - `https://nuang.app/auth/callback`
  - `http://localhost:3000/auth/callback`

계정 로그인 방법 연결을 실제로 사용할 때는 다음도 정확히 추가한다.

- `https://nuang.app/auth/link/callback`
- `http://localhost:3000/auth/link/callback`

주소 뒤에 `?next=...`를 붙이지 않는다. 마지막 `/`도 임의로 추가하지 않는다. `127.0.0.1`, 다른 포트, Vercel Preview 주소와 wildcard는 기본 허용하지 않는다.

## 2. Google·카카오 설정과 혼동하지 말아야 할 값

Google·카카오 개발자 콘솔에는 Supabase Dashboard가 각 provider 설정 화면에서 안내하는 **Supabase provider callback URL**을 등록한다. 뉴앙의 `/auth/callback`은 Supabase Redirect URLs에 등록하는 앱 복귀 주소다. 두 주소의 역할이 다르므로 서로 바꾸지 않는다.

## 3. 배포 전 확인

로컬과 운영에서 Google·카카오를 각각 한 번씩 시작해 총 네 경우를 확인한다.

1. 로그인 버튼을 누른다.
2. 브라우저가 provider 화면으로 이동하는지 확인한다.
3. 인증 후 로그인 시작 주소와 같은 origin으로 돌아오는지 확인한다.
4. 로컬 시작은 `http://localhost:3000/auth/callback`, 운영 시작은 `https://nuang.app/auth/callback`을 거친다.
5. 최종 화면은 로그인 전에 요청한 뉴앙 내부 경로이며 새로고침 후에도 로그인 상태가 유지된다.

코드는 Supabase authorization URL의 origin과 `redirect_to`를 외부 이동 전에 검사한다. 설정이 다르면 현재 화면을 유지하고 `현재 접속한 주소로 돌아오도록 설정을 확인한 뒤 다시 시도해 주세요.`라고 안내한다.

## 4. 세션 정책

- localhost와 nuang.app 로그인은 공유하지 않는다.
- 같은 origin에서는 로그아웃·계정 삭제·보안 폐기 전까지 최대 30일 유지한다.
- refresh token이 유효하면 서버 proxy가 access token을 갱신한다.
- 인증 token, OAuth code, 이메일과 전화번호를 URL이나 운영 로그에 남기지 않는다.

## 5. 장애 확인 순서

1. Supabase Redirect URLs에 쿼리 없는 두 callback이 정확히 등록됐는지 확인한다.
2. 현재 접속 주소가 `localhost:3000` 또는 `https://nuang.app`인지 확인한다.
3. 다른 포트·IP·Preview 주소라면 지원 주소에서 다시 시도한다.
4. 설정 변경 후에는 새 OAuth 흐름으로 다시 시작한다. 만료되거나 이미 사용한 callback URL을 재사용하지 않는다.

Site URL을 localhost로 바꾸거나 운영 callback을 삭제하는 방식으로 임시 해결하지 않는다. Site URL은 운영 기본값이며, 정상 로그인 복귀는 정확히 허용된 Redirect URL이 담당한다.
