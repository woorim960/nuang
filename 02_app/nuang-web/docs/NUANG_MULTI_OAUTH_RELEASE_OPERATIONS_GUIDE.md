# 뉴앙 다중 로그인 운영 적용 가이드

> 대상: 개발 지식이 많지 않은 운영자도 순서대로 실행할 수 있는 출시 체크리스트
> 기준일: 2026-08-02
> 핵심 원칙: DB를 먼저 적용하고 앱을 배포한다. 실제 연결 검증 전에 기능 스위치를 켜지 않는다.

## 1. 이번 배포로 달라지는 것

- Google·카카오 로그인 정보를 한 뉴앙 계정 아래 여러 개 보관할 수 있다.
- 로그인할 때 Supabase가 확인한 전체 로그인 방법을 원자적으로 같은 `identity.account`에 동기화한다.
- `마이 > 설정 > 로그인 및 보안`에서 연결된 로그인 방법과 복구 연락처를 확인한다.
- 프로필 편집에는 공개 프로필만 남고, 복구 이메일·휴대전화와 마케팅 설정은 각각 알맞은 설정 화면으로 분리된다.
- 복구 이메일은 6자리 인증번호를 확인한 뒤에만 인증된 연락처가 된다.
- 휴대전화는 저장만 가능하며, SMS 사업자 도입 전에는 같은 사용자 판단이나 계정 복구에 사용하지 않는다.
- 서로 다른 두 계정에서 같은 인증 이메일을 찾더라도 자동으로 데이터를 합치지 않는다. 양쪽 계정 소유 확인과 무손실 병합 기능이 완성될 때까지 안전한 검토 대상으로만 기록한다.

## 2. 반드시 지킬 적용 순서

### 1단계 — DB migration 실행

Supabase SQL Editor에서 아래 두 파일을 순서대로 실행한다.

1. `supabase/migrations/202608020004_multi_oauth_identity_foundation.sql`
2. `supabase/migrations/202608020005_multi_oauth_link_and_recovery.sql`
3. `supabase/migrations/202608020006_multi_oauth_service_grants_and_audit.sql`

`004`보다 `005`를 먼저 실행하면 안 된다. `006`은 신규 private table의 service-role 최소 권한과 count-only 감사 뷰를 보정한다. 새 앱 코드는 `004`의 `read_auth_user_access_status` 함수를 사용하므로, DB migration보다 앱을 먼저 배포하면 로그인 사용자의 API가 일시적으로 막힐 수 있다.

### 2단계 — DB 무결성 확인

SQL Editor에서 실행한다.

```sql
select check_key, affected_count
from identity.identity_integrity_audit
order by check_key;
```

아래 항목이 하나라도 `0`이 아니면 수동 로그인 연결을 켜지 말고 원인을 먼저 확인한다.

- `supabase_user_multiple_accounts`
- `disabled_or_unknown_provider`
- `identity_required_field_missing`
- `auth_user_orphan`

`orphan_account`가 남아 있다면 과거 중간 실패로 만들어진 계정일 수 있다. 바로 삭제하지 말고, 실제 사용자 데이터가 있는지 확인한 뒤 정리한다.

### 3단계 — 앱 배포

DB 적용과 무결성 확인이 끝난 뒤 현재 앱을 Vercel 운영 환경에 배포한다. 배포 직후에는 로그인·기존 기록 조회·로그아웃만 먼저 확인한다. 수동 로그인 연결 스위치는 아직 꺼 둔다.

### 4단계 — Supabase 수동 연결 설정

Supabase 프로젝트의 Authentication 설정에서 `Enable Manual Linking`을 활성화한다. 이 설정은 기본적으로 꺼져 있을 수 있다. 공식 기준은 [Supabase Auth Identity Linking](https://supabase.com/docs/guides/auth/auth-identity-linking)을 따른다.

### 5단계 — 뉴앙 기능 스위치 활성화

Supabase 설정을 확인한 뒤에만 아래 SQL을 실행한다.

```sql
begin;

update identity.provider_registry
set link_enabled = true,
    updated_at = now()
where provider in ('google', 'kakao')
  and enabled = true
  and sign_in_enabled = true;

update identity.identity_feature_flag
set enabled = true,
    updated_at = now()
where feature_key = 'manual_provider_link';

commit;
```

문제가 생기면 아래 kill switch를 즉시 실행한다. 기존 로그인과 사용자 기록에는 영향을 주지 않고 `새 로그인 방법 연결`만 중단한다.

```sql
begin;

update identity.identity_feature_flag
set enabled = false,
    updated_at = now()
where feature_key = 'manual_provider_link';

update identity.provider_registry
set link_enabled = false,
    updated_at = now()
where provider in ('google', 'kakao');

commit;
```

### 6단계 — 실제 계정 검증

테스트 전용 Google 계정과 카카오 계정을 사용해 아래를 각각 확인한다.

1. Google로 로그인하고 검사 진행 또는 결과를 하나 만든다.
2. `마이 > 설정 > 로그인 및 보안`에서 카카오를 연결한다.
3. 로그아웃한 뒤 카카오로 로그인한다.
4. 같은 프로필·검사 진행·결과·게시물이 보이는지 확인한다.
5. 반대로 카카오에서 시작해 Google을 연결하는 순서도 확인한다.
6. 연결 취소, 만료된 연결, 같은 링크 재사용이 모두 실패하고 기존 기록은 그대로인지 확인한다.
7. 현재 로그인 방법과 마지막 남은 로그인 방법을 해제할 수 없는지 확인한다.

양방향 검증이 끝나기 전에는 Release 2를 운영 완료로 표시하지 않는다.

## 3. 휴대전화 인증을 켜기 전에 필요한 것

현재 휴대전화 UI는 선택 입력과 비공개 저장까지만 제공한다. 다음 항목이 모두 준비되기 전에는 `verified_phone_discovery`를 켜지 않는다.

- Supabase가 지원하는 SMS 사업자 계약과 운영 키
- 한국 번호를 `+8210...`으로 변환하는 E.164 처리
- 6자리 OTP, 5분 만료, 60초 재전송 대기, 최대 5회 실패 잠금
- 계정·번호·IP 단위 요청 제한과 위험 요청 CAPTCHA
- 발송 실패 재시도와 운영 모니터링
- 번호 변경 후 7일 동안 고위험 작업 제한
- 계정 존재 여부를 인증 전에 노출하지 않는 테스트

공식 운영 고려사항은 [Supabase Phone Login](https://supabase.com/docs/guides/auth/phone-login)과 [Auth Rate Limits](https://supabase.com/docs/guides/auth/rate-limits)를 따른다.

## 4. 계정 병합은 아직 켜지 않는 이유

같은 인증 이메일을 찾았다는 사실만으로 두 계정의 데이터를 옮기면 계정 탈취나 기록 손실이 생길 수 있다. 현재는 `account_merge_case`에 `proof_required` 상태로만 기록한다. 아래가 모두 완성되고 실제 데이터로 검증된 뒤에만 `account_merge`를 활성화한다.

- 양쪽 OAuth 계정을 각각 다시 확인하는 화면과 서버 proof
- 모든 `identity.account` 외래키 목록의 이동 규칙
- 암호화 연락처를 새 account ID로 복호화·재암호화
- 중복 게시물·반응·팔로우·함께하기·보상 충돌 규칙
- 병합 전후 행 수와 hash가 같은 zero-loss 검사
- 멱등 재시도, rollback 훈련, 운영센터 2인 승인

따라서 현재 사용자 안내는 `같은 이메일로 사용한 기록을 찾았어요`까지만 제공하며, 두 기록이 자동으로 합쳐졌다고 말하지 않는다.

## 5. 운영 중 매일 확인할 최소 항목

- OAuth 로그인 성공률과 provider별 오류 증가 여부
- `identity.identity_integrity_audit`의 비정상 수치
- `identity.identity_resolution_conflict`의 새 `open` 건수
- `identity.identity_link_intent`의 실패·만료·충돌 증가 여부
- 이메일 인증 발송 실패와 재전송 제한 발생률
- 로그인 방법 연결 후 기존 기록이 보이지 않는 고객 문의

이메일·휴대전화 원문, provider subject, OAuth code/token은 로그나 운영 화면으로 복사하지 않는다.

## 6. 이번 적용에서 사용자가 직접 해야 하는 일

1. `004`, `005`, `006` SQL을 순서대로 실행한다.
2. 무결성 조회 결과를 확인한다.
3. 앱을 운영 배포한다.
4. Supabase의 Manual Linking을 켠다.
5. 뉴앙 기능 스위치 SQL을 실행한다.
6. Google→카카오, 카카오→Google 실제 계정 테스트를 한다.

SMS 사업자 선정과 실제 두 계정 병합 출시는 이번 활성화 범위가 아니다.
