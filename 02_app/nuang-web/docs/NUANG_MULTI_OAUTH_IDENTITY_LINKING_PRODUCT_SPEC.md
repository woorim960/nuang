# 뉴앙 다중 OAuth 동일 사용자 인식·계정 연결 기획서

> 문서 상태: 기획 승인 · Release 0~3 안전 기반 구현 완료 · 운영 전환 대기
> 작성일: 2026-08-02
> 최근 구현 점검: 2026-08-02
> 적용 범위: Google·카카오 및 향후 추가될 모든 OAuth 로그인, 이메일·휴대전화 기반 기존 계정 찾기, 중복 계정 통합, 계정 복구, 로그인·보안 UI
> 구현 원칙: 별도의 뉴앙 아이디·비밀번호를 만들게 하지 않으며, 휴대전화 등록을 가입 필수로 만들지 않는다.

### 현재 구현 상태

| 단계 | 현재 상태 | 출시 전 남은 조건 |
|---|---|---|
| Release 0 | DB 감사 뷰·provider/기능 kill switch·충돌 격리 구현 | 운영 DB에서 `004~006` 적용 후 감사 결과 확인 |
| Release 1 | 전체 OAuth identity 동기화·원자 account resolver·모호성 차단·다중 identity 탈퇴 구현 | `004` migration 적용 후 무결성 수치 확인 |
| Release 2 | 로그인 방법 조회·연결 의도·별도 callback·연결 해제·설정 UI 구현 | Supabase Manual Linking 활성화 후 Google↔카카오 양방향 실계정 E2E |
| Release 3 | 복구 이메일 OTP·인증 식별자·계정 열거 방지·연락처 UI 분리 구현 | `005` migration 적용. SMS 사업자·CAPTCHA·제한 정책 도입 전 전화 인증은 비활성 |
| Release 4 | 병합 case·alias·위험 차단용 DB 기반 구현 | 양쪽 OAuth proof, 전체 FK 이동·재암호화, zero-loss/rollback 실증 후에만 활성 |
| Release 5 | provider registry와 복구 확장 기반 구현 | 실제 복구·보안 알림·추가 provider adapter는 후속 출시 |

운영 적용과 활성화 절차는 `docs/NUANG_MULTI_OAUTH_RELEASE_OPERATIONS_GUIDE.md`를 따른다. 외부 설정이나 데이터 무손실 검증이 끝나지 않은 기능은 UI와 서버에서 계속 비활성 상태로 유지한다.

---

## 1. 최종 제품 결정

뉴앙의 영구 사용자 단위는 OAuth 제공자가 아니라 `identity.account`다. 한 사람은 Google, 카카오, 향후 네이버·Apple 등 여러 로그인 방법을 하나의 `identity.account`에 연결할 수 있으며, 어느 방법으로 로그인해도 같은 검사 진행 상태, 결과 리포트, 성향지도, 게시물, 관계, 함께하기 기록과 설정을 보게 한다.

사용자가 요청한 “이메일이나 휴대전화번호 둘 중 하나만 같아도 같은 계정으로 인식”은 다음과 같이 제품 규칙으로 확정한다.

> 같은 **인증 이메일 또는 인증 휴대전화**를 발견하면 기존 뉴앙 계정 후보를 자동으로 찾는다. 신뢰할 수 있는 이메일은 대부분 추가 입력 없이 연결하고, 휴대전화는 번호 재사용·명의 변경 위험을 막기 위해 현재 번호로 SMS 인증을 한 번만 받은 뒤 연결한다.

핵심은 `같은 계정으로 찾는 것`과 `아무 확인 없이 데이터를 합치는 것`을 구분하는 것이다.

- 같은 제공자의 변하지 않는 사용자 식별자 또는 같은 Supabase 사용자라면 즉시 같은 계정으로 처리한다.
- 서로 다른 OAuth가 Supabase의 검증 이메일 자동 연결로 같은 사용자가 된 경우 즉시 같은 뉴앙 계정으로 처리한다.
- 인증 이메일이 유일하게 일치하고 아직 별도 기록 계정이 생기지 않았다면 기존 계정으로 자동 연결한다.
- 인증 휴대전화가 일치하면 기존 계정을 즉시 찾고, SMS 인증번호 확인 한 번 후 연결한다.
- 이미 양쪽 계정에 기록이 있다면 같은 사용자 후보로 자동 인식하되 `두 기록 합치기` 확인을 받은 뒤 원자적으로 통합한다.
- 미인증 이메일·휴대전화, 이름, 사진, 같은 기기, IP, 로컬스토리지는 계정 연결 근거로 사용하지 않는다.
- 이메일과 휴대전화가 서로 다른 두 계정을 가리키거나 둘 이상의 후보가 나오면 자동 선택하지 않고 기존 OAuth 재인증 또는 운영 검토로 보낸다.

이 구조는 평상시에는 OAuth 한 번으로 끝나고, 연락처 확인은 자동 판단이 불가능한 예외 사용자에게만 발생한다.

---

## 2. 왜 휴대전화번호를 필수로 받지 않는가

휴대전화번호를 가입 필수로 만들면 같은 계정 문제를 단순하게 보이게 할 수 있지만 실제로는 다음 비용이 생긴다.

- OAuth로 바로 시작할 수 있는 장점을 없애고 첫 로그인 이탈을 늘린다.
- SMS 발송 비용, 발송 실패, 해외 번호, 재전송 제한, 스팸 방지, 고객지원 업무가 생긴다.
- 전화번호는 해지 후 다른 사람에게 재할당될 수 있으며 SIM 교체·명의 변경 위험이 있다.
- 번호가 없는 아동·청소년, 해외 사용자, 데이터 전용 사용자를 배제한다.
- 현재 뉴앙의 휴대전화 데이터는 저장만 하는 `unverified` 상태이므로 소유권 증명으로 사용할 수 없다.

따라서 기본 순서는 다음과 같다.

1. 사용자는 원하는 OAuth 하나로 즉시 시작한다.
2. 같은 인증 이메일이면 백그라운드에서 기존 기록을 이어준다.
3. 이메일이 다르거나 제공되지 않으면 로그인된 상태에서 다른 OAuth를 한 번 인증해 연결한다.
4. 이전 계정을 찾는 데 휴대전화가 필요한 사용자만 SMS 인증을 선택한다.
5. 모든 OAuth를 잃은 경우 인증 이메일 또는 선택 등록한 인증 휴대전화를 복구 수단으로 쓴다.

즉 휴대전화는 `필수 계정 키`가 아니라 `선택형 발견·복구 수단`이다.

---

## 3. 현재 구현 감사

### 3.1 이미 갖춘 좋은 기반

- `identity.account`가 제품 데이터의 중심 계정으로 존재한다.
- `identity.auth_identity`는 여러 인증 identity가 같은 `account_id`를 가리킬 수 있는 형태다.
- `(provider, provider_subject)` 고유 제약은 하나의 OAuth 사용자가 두 뉴앙 계정에 붙는 것을 막는 기반이다.
- 비공개 이메일은 OTP 인증 흐름이 이미 존재하며 선택형 계정 복구 수단으로 확장할 수 있다.
- 검사·결과·진행 상태가 `identity.account`에 귀속되므로 인증 수단과 제품 데이터를 분리하는 방향은 맞다.

### 3.2 출시 전에 반드시 해결할 문제

| 우선순위 | 현재 상태 | 위험 및 필요한 개선 |
|---|---|---|
| P0 | `ensureAccountForUser()`가 계정 INSERT 후 identity INSERT를 별도 실행 | 동시 콜백이나 고유키 충돌 시 주인 없는 계정이 생길 수 있다. 단일 DB 트랜잭션 RPC로 바꾼다. |
| P0 | `supabase_user_id`의 첫 행만 조회 | 하나의 Supabase 사용자가 서로 다른 뉴앙 계정으로 잘못 매핑되어도 숨긴다. 한 사용자의 모든 활성 identity는 반드시 한 account만 가리키게 한다. |
| P0 | `user.identities` 전체가 아니라 대표 provider 하나만 저장 | Supabase가 Google·카카오를 이미 자동 연결해도 뉴앙 DB에는 두 번째 로그인 방법이 남지 않는다. 콜백마다 전체 identity를 동기화한다. |
| P0 | 일반 로그인과 계정 연결 콜백 구분 없음 | 연결 시 새 계정을 만들거나 세션·동의 흐름을 덮을 수 있다. `sign_in`, `link`, `merge`, `recovery` intent를 분리한다. |
| P0 | 계정 삭제가 현재 Supabase 사용자 한 명만 삭제 | 여러 auth user가 하나의 뉴앙 account에 합쳐진 뒤 다른 로그인으로 빈 계정이 재생성될 수 있다. 연결된 모든 auth user·identity·세션을 함께 처리한다. |
| P1 | provider DB CHECK가 Google·카카오·네이버·이메일로 고정 | 향후 Apple 등 추가 때마다 핵심 스키마를 깨야 한다. provider registry와 앱 allowlist로 전환한다. |
| P1 | 알 수 없는 provider를 `email`, subject 누락을 `user.id`로 대체 | 잘못된 identity가 조용히 생성될 수 있다. 모르는 값은 계정을 만들지 않는 fail-closed 처리로 바꾼다. |
| P1 | 마이 설정은 대표 provider 한 개와 로그아웃만 표시 | 연결된 전체 로그인 방법, 연결·해제·재확인 상태를 보여주는 서버 기준 화면이 필요하다. |
| P1 | 휴대전화는 `unverified`로 저장 | SMS 인증 구현 전에는 동일 사용자 발견, 연결, 복구 근거로 절대 사용할 수 없다. |
| P1 | 프로필 편집에 비공개 연락처와 마케팅 설정이 섞임 | 프로필 편집은 공개 프로필만, 연락처는 `로그인 및 보안 > 복구 연락처`, 마케팅은 별도 설정으로 분리한다. |

근거가 되는 현재 파일:

- `src/features/account/server-writes.ts`
- `src/app/auth/callback/route.ts`
- `src/features/auth/start-social-sign-in.ts`
- `src/features/consent/AccountConnectPanel.tsx`
- `src/app/my/settings/account/page.tsx`
- `src/features/account/PrivateContactEditor.tsx`
- `supabase/migrations/202607030044_identity_consent_auth_foundation.sql`
- `supabase/migrations/202607270001_account_contact_reward_entry.sql`
- `supabase/migrations/202607270004_private_email_verification.sql`
- `supabase/migrations/202607280010_self_account_deletion.sql`

---

## 4. 동일 사용자 판단 정책

### 4.1 판단 우선순위

서버는 로그인에 성공한 뒤 아래 순서대로 같은 사용자를 판정한다.

1. `provider + issuer + provider_subject`가 기존 활성 identity와 정확히 일치하는가?
2. 현재 `supabase_user_id`에 연결된 뉴앙 account가 있는가?
3. 현재 Supabase user 안의 모든 identity가 하나의 뉴앙 account를 가리키는가?
4. 신뢰할 수 있는 제공자가 전달한 인증 이메일이 기존 인증 이메일과 유일하게 일치하는가?
5. 인증 휴대전화가 기존 인증 휴대전화와 유일하게 일치하는가?
6. 일치 계정이 없으면 새 account를 만든다.
7. 둘 이상의 account가 나오면 자동 선택하지 않고 충돌 해결 흐름으로 보낸다.

1~3은 불변 OAuth 식별자 기반, 4~5는 사용자가 요청한 이메일 또는 전화번호 기반 발견 규칙이다.

### 4.2 결정표

| 입력 상황 | 동일 사용자 인식 | 사용자 경험 | 데이터 처리 |
|---|---|---|---|
| 동일 provider의 동일 issuer·subject | 확정 | 화면 없이 로그인 | 기존 account 사용 |
| Supabase가 두 provider를 동일 auth user로 자동 연결 | 확정 | 화면 없이 로그인 | 전체 identities를 같은 account에 동기화 |
| 로그인된 상태에서 다른 OAuth 연결 | 확정 | 새 provider OAuth 한 번 | 이메일·전화가 달라도 현재 account에 연결 |
| 서로 다른 provider의 인증 이메일이 정확히 일치, 기존 별도 데이터 계정 없음 | 유일 후보를 확정 | 화면 없이 기존 기록 진입, 한 번만 작은 안내 | 기존 account에 identity 연결 |
| 새 OAuth의 인증 이메일과 뉴앙 OTP 인증 이메일 일치 | 강한 후보 | 보통 자동 연결, 위험 신호가 있으면 이메일 OTP 한 번 | 인증 후 기존 account 연결 |
| 두 기존 account가 같은 인증 이메일을 가짐 | 같은 사용자 후보 | 양쪽 OAuth 확인 후 `두 기록 합치기` | 사용자 확인 후 원자 병합 |
| 뉴앙 SMS 인증 전화와 현재 전화가 일치 | 같은 사용자 후보 | SMS 인증번호 한 번 | 인증 후 연결 또는 병합 |
| provider가 전화 문자열만 제공하고 검증 여부가 없음 | 미확정 | 필요한 경우 SMS 인증 제안 | 인증 전 연결 금지 |
| 저장만 된 `unverified` 이메일·전화가 일치 | 미확정 | 일치 사실을 외부에 노출하지 않고 OTP 요구 | 인증 전 연결 금지 |
| 이메일은 A, 전화는 B 계정과 일치 | 충돌 | 일반화된 보안 안내, 기존 OAuth 재인증 | 자동 연결·병합 금지 |
| 같은 값이 둘 이상의 계정과 일치 | 충돌 | 운영 지원 또는 양쪽 재인증 | 자동 처리 금지 |
| 운영자·정지·삭제 중·보상 심사 계정이 포함 | 고위험 | 운영 검토 안내 | 자동 병합 금지 |
| 이메일·전화 모두 다름 | 별도 계정 | 새로 시작 또는 설정에서 기존 OAuth 연결 | 자동 병합 없음 |

### 4.3 `OR` 일치 규칙의 정확한 의미

이메일과 휴대전화가 모두 같을 필요는 없다. 둘 중 하나의 **인증된 값**이 유일하게 같으면 기존 계정을 찾는다.

```text
same_user_candidate =
  exact_active_oauth_identity
  OR same_supabase_user
  OR unique_verified_email_match
  OR unique_verified_phone_match
```

단 `candidate`가 곧 무조건적인 데이터 병합을 뜻하지 않는다. 신규·빈 계정은 인증 강도에 따라 바로 연결할 수 있지만, 양쪽에 데이터가 있거나 위험 신호가 있으면 사용자가 기록을 합치는 데 동의해야 한다.

### 4.4 정규화 규칙

이메일:

- 앞뒤 공백 제거, 도메인 IDNA 정규화, 대소문자를 무시한 비교를 사용한다.
- Gmail의 점 제거, `+tag` 제거 같은 제공자별 별칭 추정은 하지 않는다.
- 제공자의 allowlist issuer와 공식 `email_verified` 상태 또는 뉴앙 OTP 완료가 있어야 `verified`로 인정한다.
- 클라이언트가 보낸 `user_metadata` 문자열만으로 인증 상태를 만들지 않는다.

휴대전화:

- 인증할 때 국가코드가 포함된 E.164 형식으로 변환한다. 한국 번호는 `+8210...` 형태로 저장·비교한다.
- 화면에는 국내 사용자가 이해하기 쉬운 `010-****-1234` 형식으로 마스킹한다.
- 단순히 `010` 문자열을 비교하거나 하이픈 유무만 제거한 값을 영구 키로 쓰지 않는다.
- 번호가 바뀌면 이전 인증을 폐기하고, 변경 후 7일 동안 계정 병합·마지막 로그인 해제 같은 고위험 작업의 단독 근거로 사용하지 않는다.

조회 인덱스는 원문이나 단순 SHA가 아니라 서버 비밀 pepper를 사용한 HMAC으로 만든다. 원문 연락처는 기존 암호화 정책대로 별도 보관하고 브라우저·로그·감사 이벤트에 노출하지 않는다.

---

## 5. 목표 계정·데이터 모델

### 5.1 불변 규칙

1. 한 OAuth identity는 동시에 하나의 활성 뉴앙 account에만 연결된다.
2. 한 Supabase user의 모든 활성 identity는 반드시 같은 뉴앙 account를 가리킨다.
3. 하나의 뉴앙 account에는 여러 provider와 필요 시 여러 Supabase user가 연결될 수 있다.
4. 로그인 방법을 해제해도 검사·게시물 등 뉴앙 데이터는 삭제되지 않는다.
5. 마지막으로 사용할 수 있는 로그인 방법은 해제할 수 없다.
6. 계정 연결·병합은 모두 멱등적이며 재시도해도 중복 데이터나 새 계정을 만들지 않는다.
7. 사용자 OAuth access token·refresh token과 provider 원본 응답은 뉴앙 DB와 로그에 저장하지 않는다.
8. 이메일·전화 일치 여부는 로그인 전 외부에 노출하지 않는다.

### 5.2 권장 테이블

#### `identity.provider_registry`

- provider key, issuer, 활성 여부, 표시명
- 이메일·전화 verification claim 지원 여부
- 자동 연결 허용 수준
- feature flag와 장애 시 kill switch

고정 SQL CHECK 대신 registry와 서버 allowlist를 함께 사용한다.

#### `identity.auth_identity` 확장

- `account_id`
- `supabase_user_id`
- `supabase_identity_id`
- `provider`
- `issuer`
- `provider_subject`
- `status`: `active`, `revoked`, `quarantined`
- `linked_via`: `same_auth_user`, `verified_email`, `verified_phone`, `manual_oauth`, `account_merge`, `recovery`
- `linked_at`, `last_authenticated_at`, `revoked_at`

활성 행 기준 `(provider, issuer, provider_subject)` 고유 제약과 Supabase user-account 일관성 constraint trigger를 둔다.

#### `identity.account_identifier`

이메일·휴대전화의 인증 상태와 계정 발견용 인덱스를 연락처 표시 데이터와 분리한다.

- `account_id`
- `kind`: `email`, `phone`
- `lookup_hmac`
- `status`: `verified`, `challenged`, `revoked`
- `verification_method`: `provider_claim`, `email_otp`, `sms_otp`, `recovery_review`
- `verified_at`, `last_confirmed_at`, `changed_at`
- `source_provider`, `issuer`

활성 인증 식별자는 종류와 HMAC 조합으로 유일해야 한다. 충돌 migration은 자동으로 어느 계정을 선택하지 않고 격리 큐를 만든다.

#### `identity.identity_link_intent`

- 현재 account·auth user
- 요청 provider
- action: `link`, `merge`, `recovery`
- nonce hash, PKCE/state binding, return path
- 생성·만료·소비 시각, 상태
- 요청 origin과 최소화한 위험 신호 hash

TTL 10분, 1회 사용, 정확한 provider·account·origin에 결합한다. OAuth code·token 원문은 저장하지 않는다.

#### `identity.account_merge_case`

- canonical/source account
- 병합 전 데이터 inventory 요약
- 충돌 목록과 프로필 선택
- 위험 신호, 상태, idempotency key
- 요청·완료·취소·rollback 시각

#### `identity.account_alias`

병합된 source account를 canonical account로 안전하게 해석하기 위한 tombstone/redirect다. source account를 즉시 hard delete하지 않는다.

#### `audit.account_identity_event`

- link/merge/recovery/unlink의 start, success, fail, cancel, rollback
- actor account/auth user, provider, reason code, correlation ID
- 원문 없는 inventory count와 salted IP/UA hash

브라우저·anon·authenticated의 직접 접근을 모두 막고 service role과 제한된 운영 도구만 사용한다.

### 5.3 원자적 계정 resolver

현재 여러 쿼리로 나뉜 `ensureAccountForUser()`를 service-role 전용 SECURITY DEFINER RPC로 대체한다.

```text
입력: Supabase user ID + 서버가 검증한 전체 provider identities + verified identifiers

1. 각 provider identity의 기존 canonical account 조회
2. 현재 Supabase user mapping 조회
3. verified email/phone 후보 조회
4. 발견된 account가 0개면 account + identities를 한 transaction으로 생성
5. 1개면 모든 identities를 해당 account에 idempotent upsert
6. 2개 이상이면 아무 account도 임의 선택하지 않고 conflict case 생성
7. last login과 보안 이벤트 기록
8. canonical account ID 반환
```

RPC는 ambiguity를 `order by ... limit 1`로 숨기지 않고 fail-closed 해야 한다.

---

## 6. 핵심 사용자 흐름

### A. 신규 사용자: 가장 짧은 기본 흐름

```text
Google 또는 카카오 선택
→ 제공자 OAuth 인증
→ 동일 identity·Supabase user·인증 이메일 조회
→ 기존 계정이 있으면 기록 복원 / 없으면 뉴앙 account 자동 생성
→ 이 기기의 로컬 검사 기록 동기화
→ 원래 화면 복귀
```

추가 입력과 휴대전화번호를 요구하지 않는다.

성공 안내:

- 기존 기록이 있으면: `기존 뉴앙 기록을 이어왔어요.`
- 로컬 기록도 옮겼으면: `이 기기의 검사 기록도 안전하게 연결했어요.`
- 신규면 별도 성공 화면 없이 바로 진입한다.

### B. 로그인된 사용자가 다른 OAuth 연결

```text
설정 > 로그인 및 보안 > 로그인 방법
→ `Google 연결` 또는 `카카오 연결`
→ 해당 OAuth 한 번 인증
→ Supabase linkIdentity + 뉴앙 전체 identity 동기화
→ 설정 화면 복귀
```

이 흐름에서는 이메일·휴대전화가 달라도 현재 세션과 두 번째 OAuth 성공이 양쪽 계정 소유 증명이다. 휴대전화나 뉴앙 비밀번호를 요구하지 않는다.

성공 문구:

> Google 로그인이 연결됐어요. 이제 Google과 카카오 중 편한 방법으로 로그인해도 같은 기록이 열려요.

### C. 인증 이메일이 같은 로그인

1. Supabase가 검증 이메일 기준으로 같은 auth user에 자동 연결했다면 뉴앙은 전체 identities를 같은 account에 즉시 동기화한다.
2. 뉴앙의 기존 OTP 인증 이메일과 새 OAuth의 인증 이메일이 유일하게 같고 빈 신규 계정이라면 기존 account로 연결한다.
3. 이미 양쪽에 데이터가 있으면 `같은 이메일로 사용한 기록을 찾았어요`라고 안내하고 양쪽 OAuth 확인 후 통합한다.

계정 존재 여부를 인증 전에 보여주지 않는다. 전체 이메일·닉네임·뉴앙 코드·검사 내용도 본인 확인 전에는 노출하지 않는다.

### D. 인증 휴대전화가 같은 로그인

일반 OAuth에서 기존 계정을 찾지 못했을 때만 선택지로 제공한다.

```text
`이전 기록 찾기`
→ 휴대전화번호 입력 또는 provider phone 후보 사용
→ SMS 인증번호 발송
→ 6자리 인증번호 확인
→ 유일한 기존 account 발견
→ 빈 계정이면 즉시 연결 / 양쪽 데이터가 있으면 합치기 확인
```

번호 일치 사실은 SMS 인증 전에 노출하지 않는다. `등록된 번호가 없습니다`처럼 계정 열거가 가능한 문구 대신 항상 같은 응답을 사용한다.

### E. 이미 두 계정에 기록이 있는 경우

인증이 끝난 뒤에만 다음 정보를 보여준다.

- 가입 시기: `2026년 7월부터`
- `검사 리포트 3개 · 게시물 2개`
- 현재 로그인 계정 표시
- 공개 프로필 아바타·닉네임·핸들 선택

화면 문구:

- 제목: `두 로그인에 뉴앙 기록이 있어요`
- 설명: `검사와 활동 기록은 빠짐없이 모으고, 앞으로 사용할 프로필만 하나 골라요.`
- CTA: `두 기록 합치기`
- 보조: `지금은 따로 사용`

기술 용어인 `identity`, `충돌`, `canonical`, `merge`를 사용자 문구에 쓰지 않는다.

### F. 로그인 방법 해제

- 연결된 방법이 2개 이상일 때만 해제할 수 있다.
- 현재 사용한 provider를 해제할 때는 남길 provider를 최근 재인증한다.
- 마지막 방법 해제 시도에는 `다른 로그인 방법을 먼저 연결해 주세요`를 안내한다.
- 해제 후 모든 세션을 재평가하고 보안 알림·감사 이벤트를 남긴다.
- 연결 해제는 뉴앙 데이터 삭제가 아니다.

### G. 모든 OAuth 접근을 잃은 경우

1. 인증 복구 이메일 OTP
2. 선택 등록한 인증 휴대전화 SMS OTP
3. 최근 기기·활동 위험 검사와 새 OAuth 연결
4. 고위험·다중 후보·정지 계정은 운영 지원

휴대전화 하나만으로 오래된 데이터 계정을 즉시 넘기지 않는다. 번호 변경 후 7일, 장기 휴면, 국가·기기 급변, 고가 보상·운영자 계정은 기존 OAuth 또는 운영 확인을 추가한다.

---

## 7. 휴대전화 등록·인증 재설계

### 7.1 정보 구조

`프로필 편집`에는 공개 프로필만 둔다.

- 프로필 사진
- 이름
- 아이디
- 소개

이메일·휴대전화는 다음 위치로 이동한다.

```text
마이 > 설정 > 로그인 및 보안 > 복구 연락처
```

마케팅 수신은 `알림 및 마케팅`으로 분리한다.

### 7.2 번호 등록 화면

- 제목: `복구용 휴대전화`
- 설명: `이전 기록을 찾거나 로그인 방법을 모두 사용할 수 없을 때만 사용해요. 프로필에는 공개되지 않아요.`
- 상태: `선택`
- 하나의 `type="tel"`, `autocomplete="tel-national"` 입력
- 국내 번호 자동 하이픈과 국가코드 선택
- CTA: `인증번호 받기`

### 7.3 SMS 인증 화면

- 제목: `인증번호를 입력해 주세요`
- 설명: `010-****-1234로 보낸 6자리 번호예요.`
- 여섯 칸이 아니라 붙여넣기·자동완성이 가능한 하나의 입력창
- `inputmode="numeric"`, `autocomplete="one-time-code"`
- 유효시간 5분
- 재전송 대기 60초
- 최대 입력 실패 5회 후 challenge 폐기
- 계정·번호·IP·기기 단위 rate limit과 위험 시 CAPTCHA
- 재전송 가능 시점만 스크린리더에 한 번 알림

### 7.4 오류 문구

- `휴대전화번호를 다시 확인해 주세요.`
- `인증번호가 맞지 않아요. 다시 확인해 주세요.`
- `인증번호가 만료됐어요. 새 번호를 받아 주세요.`
- `요청이 많아요. 잠시 후 다시 시도해 주세요.`
- `확인을 마치지 못했어요. 기존 기록은 그대로예요.`

번호가 다른 계정에 있다는 사실은 인증 전에는 말하지 않는다. 인증 후에는 `이 번호로 사용한 뉴앙 기록을 찾았어요`라고 안내한다.

### 7.5 SMS를 도입하지 않은 상태의 정책

현재 `mobile_phone_status=unverified`인 모든 번호는 동일 사용자 인식에 사용하지 않는다. SMS challenge·verify API, rate limit, 감사 로그, E.164 정규화, verified 상태 migration, 운영 지원 흐름이 함께 출시된 이후부터만 전화번호 일치 정책을 활성화한다.

---

## 8. 계정 통합 데이터 보존 규칙

병합은 단순히 `account_id`를 바꾸는 작업이 아니다. 모든 account FK를 inventory하고 단일 트랜잭션에서 충돌 규칙을 적용해야 한다.

| 데이터 영역 | 통합 규칙 |
|---|---|
| 코어·정밀 검사 시도, 응답, 점수, 리포트 | 모두 보존. 같은 client/local ID와 동일 hash는 중복 제거, 내용이 다르면 둘 다 보존 |
| 진행 중 검사 | 같은 검사라면 더 많이 답한 진행을 기본으로 하고, 최근 수정 시각·revision을 함께 판단 |
| 주제검사·랩·성향지도 | 모두 보존, 공개 범위는 더 제한적인 값을 기본으로 적용 |
| 공개 프로필 | 사용자가 한 프로필을 선택. source handle은 alias/redirect 또는 안전하게 retire |
| 게시물·댓글·미디어 | 모두 canonical account로 귀속 |
| 좋아요·북마크·팔로우 | 집합 합치기 후 중복 제거, self-follow 제거 |
| 차단 | 합집합. 차단이 팔로우보다 우선하며 self-block 제거 |
| 신고·제재·moderation | 이력 보존. 더 엄격한 상태 우선, 제재 우회 금지 |
| 투표·설문 | unique 충돌은 제품별 latest/명시 규칙으로 결정하고 audit |
| 함께하기 방·참가·답변 | 동일 방 중복 참가를 `completed > joined > reserved` 우선순위로 정리하고 답변 손실 금지 |
| 이벤트·리워드 | 캠페인당 중복 지급 방지, 운영 검토가 필요한 상태는 자동 병합 중단 |
| 동의 | 필수 약관 이력 보존, 마케팅은 하나라도 미동의면 미동의 |
| 인증 연락처 | verified 우선. 서로 다른 verified 값이면 사용자 선택·격리. 자동 덮어쓰기 금지 |
| 암호화 연락처 | 암호문 AAD가 account ID에 결합되어 있으므로 단순 FK 변경 금지. 복호화 후 canonical account ID로 재암호화 |
| 공유 링크 | canonical로 이동하되 완료 화면에서 전체 해제 선택 제공 |
| 운영자 권한 | 자동 이관 금지. 2인 승인 운영 검토 |

병합 절차:

1. 두 account UUID 순서로 advisory lock
2. dry-run inventory와 충돌 목록 생성
3. 사용자의 OAuth/OTP proof와 최종 동의 확인
4. idempotency key 확인
5. 단일 transaction으로 이동·중복 제거·재암호화
6. 행 수와 hash manifest를 병합 전후 비교
7. source account를 `merged` tombstone으로 남기고 alias 생성
8. 감사 이벤트와 보안 알림
9. 문제가 있으면 복구 창에서 rollback/support

정지·삭제 중·운영자·미정산 보상·법적 보존 대상 계정은 자동 병합하지 않는다.

---

## 9. 화면 구조와 고급 UI/UX 명세

### 9.1 설정 정보 구조

```text
로그인 및 보안
├─ 로그인 방법
│  ├─ Google · 연결됨 / 현재 로그인
│  ├─ 카카오 · 연결됨
│  └─ 향후 provider · 연결하기
├─ 복구 연락처 (선택)
│  ├─ 인증 이메일
│  └─ 인증 휴대전화
├─ 최근 보안 활동
├─ 로그아웃
└─ 계정 삭제
```

### 9.2 상단 요약

- 제목: `로그인 방법`
- 설명: `어느 방법으로 로그인해도 같은 검사와 기록을 이어볼 수 있어요.`
- 보조 정보: `연결된 로그인 2개`
- 장식 캐릭터나 큰 그라데이션 없이 흰색·뉴앙 라일락 표면, 얇은 경계, 정돈된 간격 사용

### 9.3 provider 행

- 최소 높이 68px, 전체 핵심 터치 영역 44px 이상
- 32px 공식 provider 로고
- provider명, 연결 상태, 마스킹 이메일 또는 `이메일 제공 안 됨`
- `연결됨`, `현재 로그인`, `다시 확인 필요`를 색뿐 아니라 텍스트로 표시
- 미연결 provider는 전체 폭 52px 버튼: `Google 연결`, `카카오 연결`
- 안내: `새 뉴앙 계정이 만들어지지 않고 지금 기록에 연결돼요.`

### 9.4 연결·병합 화면

- 연결 시작은 불필요한 확인 단계를 만들지 않고 provider OAuth로 바로 이동한다.
- 기존 데이터가 발견된 경우에만 모바일 전체 화면 또는 바텀시트를 사용한다.
- 병합 상세는 민감한 내용 대신 검사·활동 건수와 가입 시기만 보여준다.
- 프로필 선택은 실제 아바타·닉네임·핸들 카드 두 개를 보여주고 `검사와 활동 기록은 선택과 관계없이 모두 보존돼요`를 고정 안내한다.
- 성공 애니메이션은 200ms 이하이며 `prefers-reduced-motion`에서는 제거한다.

### 9.5 접근성

- 바텀시트 `role="dialog"`, `aria-modal="true"`, 제목 연결, 포커스 트랩·복원
- 성공은 `role="status"`, 오류는 `role="alert"`
- OTP는 하나의 입력창으로 자동완성·붙여넣기 지원
- 텍스트 200% 확대에서도 잘리지 않도록 고정 높이 대신 `min-height`
- 로딩 중 중복 제출 방지와 명확한 버튼 상태 문구
- OAuth 취소·브라우저 뒤로가기 후 입력과 원래 복귀 경로 보존
- 320px·390px 모바일, safe area, 키보드 노출 상태를 출시 게이트에 포함

---

## 10. 보안·개인정보 위협 모델

### 반드시 방어할 시나리오

- 공격자가 피해자의 이메일 문자열만 넣어 계정을 가져가는 경우
- 재사용된 휴대전화번호의 새 소유자가 오래된 뉴앙 계정을 가져가는 경우
- 서로 다른 두 callback이 동시에 새 account를 만드는 경우
- link intent를 재사용하거나 다른 provider·account에 바꾸는 경우
- 마지막 로그인 방법을 해제해 계정이 잠기는 경우
- 정지 계정을 정상 계정에 합쳐 제재를 우회하는 경우
- 운영자·보상 권한이 일반 계정 병합으로 옮겨가는 경우
- 암호화 연락처를 FK만 이동해 복호화 불능이 되는 경우
- 클라이언트가 account ID, verified flag, provider metadata를 위조하는 경우
- 로그인 전 이메일·전화 존재 여부를 알아내는 계정 열거 공격

### 필수 통제

- 서버 `getUser()`와 allowlist issuer의 검증된 claim만 신뢰
- provider subject를 영구 식별자로 저장하고 이메일·전화는 발견·복구 보조키로 사용
- PKCE, state, 10분 TTL, one-time nonce, exact origin/provider/account binding
- 연결·해제·병합·연락처 변경·계정 삭제에 최근 OAuth 인증 요구
- 새 provider 연결 후 24시간, 연락처 변경 후 7일 동안 고위험 작업 제한
- 마지막 로그인 방법 해제 금지
- 링크·병합·복구 table/RPC는 public·anon·authenticated 직접 권한 revoke
- 클라이언트가 보낸 account ID 무시, 서버의 현재 auth user에서 account 해석
- 원문 token·OAuth code·email·phone을 로그에 남기지 않음
- 연결·해제·병합 완료 시 기존 인증 연락처에 보안 알림
- provider별 link와 merge 실행을 별도 feature flag/kill switch로 제어

---

## 11. 운영센터 기능

운영센터는 개인정보 원문을 보지 않고 다음을 관리한다.

- account ID와 provider 연결 상태
- link/merge/recovery 상태와 reason code
- 시작·완료·실패·취소 시각
- 병합 전후 데이터 영역별 행 수
- 위험 신호와 자동 처리 중단 사유
- 실패 재시도, rollback 또는 고객지원 case 연결
- provider별 기능 flag와 장애 kill switch

수동 병합은 양쪽 OAuth proof가 끝난 경우에만 가능하다. 운영자·정지·보상 충돌 계정은 두 명의 관리자 승인을 요구한다. 이메일·전화·provider subject·token 원문은 운영 목록과 CSV에 노출하지 않는다.

---

## 12. 분석 이벤트와 성공 지표

개인정보 없이 다음을 측정한다.

- provider별 OAuth 로그인 성공률
- 동일 Supabase user 자동 연결률
- 인증 이메일 자동 발견·연결률
- 휴대전화 OTP 시작·완료율
- 수동 OAuth 연결 시작·완료율
- 신규 중복 계정 생성률
- 데이터 있는 계정 병합 시작·완료·실패·재시도율
- 병합 전후 `zero_loss_check`
- 로그인 방법 해제 실패율
- 계정 복구 완료율과 고객센터 유입률
- 동일 계정으로 Google·카카오 재로그인 성공률

이벤트에는 raw subject, 이메일, 전화번호, OAuth token을 넣지 않는다.

---

## 13. 단계별 구현 계획

### Release 0 — 현황 감사와 안전장치

- Supabase 자동 identity linking과 manual linking 설정 확인
- auth.users/identities와 `identity.auth_identity` orphan·중복·불일치 감사 쿼리
- 현재 verified/unverified 이메일·휴대전화 분포 확인
- provider·link·merge·recovery feature flag 생성
- 병합 대상 전체 FK catalog와 데이터 inventory 확정

완료 기준: 운영 데이터 변경 없이 불일치 건수와 migration 처리 정책이 문서화된다.

### Release 1 — 다중 OAuth 동일 계정 기반

- 원자적 account resolver RPC
- callback에서 모든 `user.identities` shadow sync 후 정식 전환
- Supabase user-account 일관성 constraint
- provider registry와 strict subject normalizer
- `current_account_id()` ambiguity fail-closed 및 canonical 해석
- 다중 identity를 고려한 계정 삭제 개편
- 감사 이벤트와 provider kill switch

완료 기준: 같은 auth user의 Google·카카오 로그인은 항상 동일 account ID를 반환하고 orphan account가 0건이다.

### Release 2 — 로그인 방법 연결 UI

- `/my/settings/account`를 `로그인 및 보안`으로 개편
- 연결된 전체 provider 서버 DTO
- `linkIdentity()`와 별도 `/auth/link/callback`
- link intent, recent reauth, 취소·실패 복귀
- 마지막 로그인 방법 해제 방지와 provider 재연결
- Google→카카오, 카카오→Google 실제 계정 E2E

완료 기준: 이메일이 달라도 로그인 상태에서 OAuth 한 번으로 연결되고 어느 기기·provider에서든 같은 기록을 본다.

### Release 3 — 이메일 또는 휴대전화로 기존 기록 찾기

- `identity.account_identifier`와 HMAC 인덱스
- provider verified email allowlist와 자동 후보 resolver
- 기존 비공개 이메일 OTP를 복구·연결 목적에 맞게 확장
- 프로필 편집에서 복구 연락처 분리
- SMS vendor, OTP request/verify, E.164, rate limit, CAPTCHA, 감사·알림
- 인증 휴대전화 일치 시 한 번의 OTP로 연결
- 일치 여부 계정 열거 방지 테스트

완료 기준: 인증 이메일 또는 인증 휴대전화 중 하나가 유일하게 같으면 기존 기록을 찾고, 필요한 최소 확인 후 같은 account로 연결한다.

### Release 4 — 데이터가 있는 중복 계정 통합

- merge intent와 양쪽 OAuth 소유권 증명
- dry-run inventory와 conflict preview
- 데이터 영역별 이동·중복 제거·연락처 재암호화
- 프로필 선택 UX
- advisory lock, idempotency, audit, alias/tombstone, rollback drill
- 운영센터 검토·재시도 화면

완료 기준: 양쪽 기록 0건 손실, unique 충돌 0건, 양쪽 provider로 동일 canonical account 접근, rollback 훈련 통과.

### Release 5 — 복구 고도화와 provider 확장

- 최근 보안 활동과 사용자 알림
- 전화번호 재사용·SIM 교체 위험 모델 보정
- 지원 case와 self-service recovery 확장
- 네이버·Apple 등 provider adapter 추가
- provider 추가가 핵심 스키마 변경 없이 가능함을 검증

---

## 14. 테스트·출시 수용 기준

### 기능

- [ ] Google→카카오와 카카오→Google 순서 모두 동일 account ID를 반환한다.
- [ ] 같은 인증 이메일은 평상시 질문 없이 기존 기록을 연다.
- [ ] 다른 이메일 또는 이메일 미제공은 설정에서 OAuth 한 번 연결 후 같은 계정이 된다.
- [ ] 같은 인증 휴대전화는 SMS OTP 한 번 후 기존 기록을 연다.
- [ ] 이메일 또는 휴대전화 중 하나만 같아도 유일 후보를 찾는다.
- [ ] 이메일과 전화가 다른 계정을 가리키면 자동 처리하지 않는다.
- [ ] 양쪽 데이터 계정은 검사·진행·리포트·게시물·관계·함께하기 기록을 모두 보존한다.
- [ ] 병합 시 공개 프로필만 사용자가 선택한다.
- [ ] 마지막 로그인 방법은 해제할 수 없다.
- [ ] 탈퇴 후 연결했던 어느 provider로 재로그인해도 빈 계정이 재생성되지 않는다.

### 보안·데이터

- [ ] 미인증 이메일·전화·이름·사진·기기 정보만으로 연결되지 않는다.
- [ ] 같은 provider subject가 두 account에 붙을 수 없다.
- [ ] 같은 Supabase user의 활성 identity가 서로 다른 account를 가리킬 수 없다.
- [ ] 동시 callback에서도 account 1개, orphan 0개다.
- [ ] 위조·만료·재사용·provider mismatch intent가 거절된다.
- [ ] 두 기존 account 병합은 양쪽 소유권 확인 없이 실행되지 않는다.
- [ ] 전화 변경 후 7일·고위험 계정·정지 계정의 자동 병합이 차단된다.
- [ ] 병합 전후 FK inventory 행 수·hash 검증과 rollback drill을 통과한다.
- [ ] 각 provider 세션에서 RLS가 같은 canonical 데이터만 허용한다.
- [ ] anon·제3계정·정지계정 우회가 불가능하다.
- [ ] 브라우저 payload·analytics·로그·운영센터에 raw token·subject·연락처가 없다.

### UX·접근성

- [ ] 신규 사용자는 연락처 입력 없이 OAuth 한 번으로 시작한다.
- [ ] 기술 용어 없이 연결·기록 통합 의미를 이해할 수 있다.
- [ ] 320px·390px 모바일과 safe area에서 잘리지 않는다.
- [ ] 키보드·스크린리더·200% 확대·reduced motion을 지원한다.
- [ ] OAuth 취소·뒤로가기·세션 만료 후 원래 흐름으로 안전하게 복귀한다.
- [ ] 연결 실패 시 기존 기록이 변하지 않았음을 명확히 안내한다.

---

## 15. 구현 중 기획 대조 체크포인트

각 Release를 시작하기 전과 PR 완료 전에 다음을 반복 확인한다.

1. 사용자가 별도 뉴앙 계정이나 비밀번호를 만들게 하지 않았는가?
2. 휴대전화 입력을 일반 가입·로그인의 필수 단계로 만들지 않았는가?
3. 인증 이메일 또는 인증 휴대전화 중 하나가 같은 경우를 놓치지 않는가?
4. 미인증 문자열을 같은 사람의 증거로 오인하지 않는가?
5. 가장 흔한 흐름은 OAuth 한 번 또는 화면 없는 자동 연결인가?
6. 양쪽에 기록이 있을 때 사용자의 확인과 데이터 보존 규칙이 작동하는가?
7. 전체 `user.identities`와 모든 account FK를 빠뜨리지 않았는가?
8. 모바일 UI가 뉴앙 설정·마이의 디자인 토큰과 자연스럽게 이어지는가?
9. 보안 정보가 아니라 사용자가 이해할 결과 중심 문구인가?
10. 운영·롤백·감사·탈퇴까지 출시 범위에 포함됐는가?

하나라도 충족하지 못하면 해당 Release는 완료로 표시하지 않는다.

---

## 16. 구현 전 필요한 사용자 결정

기본 권고안은 다음으로 고정한다. 별도 변경 요청이 없으면 구현 시 이 값을 사용한다.

- 휴대전화: 선택형, 일반 가입·로그인에는 미노출
- 인증 이메일 유일 일치: 자동 연결
- 인증 휴대전화 유일 일치: SMS OTP 한 번 후 연결
- 두 계정 모두 데이터 보유: 양쪽 OAuth 확인 + `두 기록 합치기` 확인
- 전화번호 변경 고위험 유예: 7일
- link/merge intent TTL: 10분
- SMS OTP: 6자리, 5분 유효, 60초 후 재전송, 5회 실패 시 폐기
- 계정 병합 복구·운영 관찰 창: 최소 7일
- 운영자·정지·보상 충돌 계정: 자동 병합 금지

---

## 17. 공식 기술 근거

- [Supabase Auth Identity Linking](https://supabase.com/docs/guides/auth/auth-identity-linking): 동일 검증 이메일의 자동 연결, 로그인 상태의 수동 `linkIdentity`, identity 조회·해제 기준
- [Supabase User Identities](https://supabase.com/docs/guides/auth/identities): 한 사용자에 여러 identity가 존재하는 구조
- [Supabase Auth 일반 설정](https://supabase.com/docs/guides/auth/general-configuration): manual linking 설정
- [Supabase Phone Login](https://supabase.com/docs/guides/auth/phone-login): SMS OTP 제공자, rate limit, CAPTCHA와 운영 고려사항
- [Google OpenID Connect](https://developers.google.com/identity/openid-connect/reference): `sub`를 영구 식별자로 사용하고 이메일을 기본 키로 사용하지 않는 원칙
- [Kakao Login REST API](https://developers.kakao.com/docs/en/kakaologin/rest-api): service user ID, 이메일 제공·유효·인증 상태
- [Kakao Login 활용 가이드](https://developers.kakao.com/docs/en/kakaologin/utilize): 기존 회원 계정과 연결할 때의 사용자 확인 및 매핑 고려사항

---

## 18. 최종 승인안 요약

뉴앙은 휴대전화 필수 가입 없이 OAuth만으로 바로 시작한다. Google·카카오·향후 로그인들은 하나의 `identity.account` 아래 연결한다. 동일한 인증 이메일 또는 인증 휴대전화 중 하나가 같으면 기존 뉴앙 계정을 자동으로 찾는다. 이메일은 보통 화면 없이 연결하고, 휴대전화는 SMS 인증 한 번만 거친다. 이미 양쪽에 기록이 있으면 양쪽 로그인 소유권을 확인하고 기록은 모두 보존하며 공개 프로필만 선택하게 한다.

이 방식이 사용자가 원하는 자동 동기화에 가장 가깝고, 별도 뉴앙 계정 생성이나 모든 사용자 대상 휴대전화 입력 없이도 계정 탈취와 기록 손실을 막을 수 있는 구현 기준이다.
