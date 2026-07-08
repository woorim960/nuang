# NUANG 계정 저장·공유 API Runbook

이 문서는 서버 credential이 연결되기 전후의 계정 저장·공유 링크 동작을 한 곳에서 확인하기 위한 운영 문서다.

## 현재 상태

열린 로컬 기능:

- 빠른 코어/정밀 코어 검사
- 로컬 결과 리포트
- 로컬 결과 삭제/export
- 최신 정밀 코어 결과 기반 성향지도
- 결과 이미지 저장/공유

credential과 DB 검증 전까지 닫힌 서버 기능:

- 소셜 로그인 세션
- 로컬 결과 계정 저장
- 공유 링크 생성
- 공유 링크 철회
- 공개 공유 token 조회

## Credential Gate

로컬 MVP 확인:

```bash
npm run env:check
```

소셜 로그인 연결 전:

```bash
npm run env:check:auth
```

계정 저장·공유 서버 write 오픈 전:

```bash
npm run env:check:server
```

credential은 auth 또는 server-write 단계를 실제로 열 때만 요청한다.

## POST /api/claim-result

목적:

- 이 기기에 저장된 완료 결과를 로그인 계정으로 옮긴다.

현재 credential-free 동작:

- valid request: `503 feature_closed / supabase_env_missing`
- invalid request: `422 validation_error`

필수 요청:

```json
{
  "assessmentKind": "full",
  "consentDraft": {
    "is14OrOlder": true,
    "terms": true,
    "privacy": true,
    "analytics": false,
    "marketing": false,
    "ageBand": "19-24"
  },
  "localResultId": "local_test_123",
  "resultSummary": {
    "completedAt": "2026-07-04T00:00:00.000Z",
    "profileCode": "TVOAE",
    "profileName": "불꽃 온기 탐험가"
  }
}
```

서버 write 순서:

```text
1. ensure_account
2. upsert_age_consent
3. record_required_consents
4. create_assessment_attempt
5. insert_assessment_responses
6. create_score_snapshot
7. create_result_report
```

성공 응답:

```json
{
  "ok": true,
  "result": {
    "assessmentAttemptId": "...",
    "claimedAt": "2026-07-04T00:00:00.000Z",
    "profileCode": "TVOAE",
    "profileName": "불꽃 온기 탐험가",
    "resultReportId": "..."
  },
  "next": {
    "canCreateShareLink": true,
    "canOpenMap": true
  }
}
```

실패 코드:

```text
account_link_missing
age_or_required_consent_missing
local_result_already_claimed
assessment_attempt_write_failed
assessment_response_write_failed
score_snapshot_write_failed
result_report_write_failed
```

실패 응답:

```json
{
  "ok": false,
  "error": "claim_result_write_failed",
  "code": "assessment_response_write_failed",
  "message": "응답 기록을 저장하지 못했어요. 잠시 뒤 다시 시도해 주세요.",
  "retryable": true,
  "step": "insert_assessment_responses"
}
```

개인정보 원칙:

- 공개 route 응답에는 직접 문항 응답, 응답 배열, raw score payload, email field를 넣지 않는다.

## POST /api/share-links

목적:

- 계정에 저장된 결과 리포트로 summary-only 공개 공유 링크를 만든다.

현재 credential-free 동작:

- valid request: `503 feature_closed / supabase_env_missing`
- invalid request: `422 validation_error`

필수 요청:

```json
{
  "resultReportId": "11111111-1111-4111-8111-111111111111",
  "ttlDays": 30,
  "visibility": "summary",
  "consentDraft": {
    "is14OrOlder": true,
    "terms": true,
    "privacy": true,
    "analytics": false,
    "marketing": false,
    "ageBand": "19-24"
  }
}
```

서버 write 순서:

```text
1. verify_result_report_owner
2. build_share_summary
3. generate_share_token
4. hash_share_token
5. insert_share_link
6. return_share_url
```

성공 응답:

```json
{
  "ok": true,
  "shareLink": {
    "expiresAt": "2026-08-03T00:00:00.000Z",
    "id": "...",
    "url": "https://nuang.example/share/public-token",
    "visibility": "summary"
  }
}
```

실패 코드:

```text
result_report_not_found
share_scope_not_allowed
share_summary_build_failed
share_token_hash_failed
share_link_insert_failed
```

개인정보 원칙:

- DB에는 raw token이 아니라 `token_hash`만 저장한다.
- 생성 성공 응답에서는 raw-token URL을 한 번 반환할 수 있다.
- 공개 응답에는 `token_hash`, 직접 응답, facet 배열, raw score payload, email을 넣지 않는다.

## POST /api/revoke-share

목적:

- 로그인 계정 소유의 공유 링크를 철회한다.

현재 credential-free 동작:

- valid request: `503 feature_closed / supabase_env_missing`
- invalid request: `422 validation_error`

필수 요청:

```json
{
  "shareLinkId": "11111111-1111-4111-8111-111111111111"
}
```

서버 write 순서:

```text
1. verify_share_link_owner
2. mark_share_link_revoked
3. return_revoked_status
```

성공 응답:

```json
{
  "ok": true,
  "shareLink": {
    "id": "...",
    "revokedAt": "2026-07-04T00:00:00.000Z",
    "status": "revoked"
  }
}
```

실패 코드:

```text
share_link_not_found
share_link_already_revoked
share_link_revoke_failed
```

## GET /share/[token]

목적:

- 공개 공유 token을 summary-only 결과로 조회한다.

현재 동작:

- 안전한 unavailable UI
- `noindex`
- fake result 표시 금지

열렸을 때 active share가 포함할 수 있는 것:

- profile code
- profile name
- result label
- completed date
- 최대 5개 domain summary

unavailable 상태:

```text
expired   -> 410
not_found -> 404
revoked   -> 410
```

unavailable 응답:

```json
{
  "ok": false,
  "error": "share_unavailable",
  "message": "철회된 공유 링크예요.",
  "status": "revoked"
}
```

## POST /api/profile-visibility

목적:

- 계정별 공개 범위 설정을 저장하고 공개 프로필 스냅샷을 다시 만든다.

현재 credential-free 동작:

- valid request: `503 feature_closed / supabase_env_missing`
- invalid request: `422 validation_error`

필수 요청:

```json
{
  "policyVersion": "profile-visibility.v0.1",
  "settings": [
    { "fieldId": "display_profile", "visibility": "public" },
    { "fieldId": "representative_profile", "visibility": "public" },
    { "fieldId": "core_domain_map", "visibility": "public" },
    { "fieldId": "core_facet_summary", "visibility": "public" }
  ],
  "consentDraft": {
    "is14OrOlder": true,
    "terms": true,
    "privacy": true,
    "analytics": false,
    "marketing": false
  }
}
```

서버 write 순서:

```text
1. ensure_account
2. verify_age_and_required_consent
3. validate_visibility_policy_version
4. upsert_profile_visibility_settings
5. build_public_profile_snapshot
6. invalidate_out_of_scope_comparisons
7. record_visibility_audit_event
```

공개 스냅샷 builder 하위 순서:

```text
1. ensure_account_result_report
2. read_profile_visibility_settings
3. project_public_snapshot_payload
4. upsert_profile_public_snapshot
5. mark_previous_public_snapshots_stale
6. record_visibility_audit_event
```

개인정보 원칙:

- 직접 응답, 원점수 payload, 계정 식별 정보, 도움 연결 기록은 공개 스냅샷에 넣지 않는다.
- blocked field는 public으로 저장하지 않는다.

## POST /api/public-comparisons

목적:

- 내 정밀 코어 결과와 상대 공개 프로필 스냅샷을 사용해 1:1 비교 리포트를 만든다.

현재 credential-free 동작:

- valid request: `503 feature_closed / supabase_env_missing`
- invalid request: `422 validation_error`

필수 요청:

```json
{
  "viewerResultReportId": "11111111-1111-4111-8111-111111111111",
  "policyVersion": "profile-visibility.v0.1",
  "target": {
    "publicProfileCode": "NUANG-A7K2M9"
  },
  "consentDraft": {
    "is14OrOlder": true,
    "terms": true,
    "privacy": true,
    "analytics": false,
    "marketing": false
  }
}
```

서버 write 순서:

```text
1. ensure_viewer_full_core
2. read_target_public_snapshot
3. validate_snapshot_policy_version
4. revalidate_target_public_scope
5. project_allowed_fields
6. build_comparison_report
7. record_comparison_audit_event
```

개인정보 원칙:

- 상대 추가 승인 요청을 만들지 않는다.
- 상대가 공개하지 않은 항목은 추정하지 않는다.
- 상대 공개 범위가 비공개, stale, deleted로 바뀌면 새 비교 생성과 열람을 재평가한다.
- 궁합 점수, 관계 성공 예측, 순위는 만들지 않는다.

## POST /api/public-comparison-report

목적:

- 생성된 공개 비교 리포트를 viewer 소유 권한과 access 상태에 따라 조회한다.

현재 credential-free 동작:

- valid request: `503 feature_closed / supabase_env_missing`
- invalid request: `422 validation_error`

필수 요청:

```json
{
  "comparisonReportId": "33333333-3333-4333-8333-333333333333"
}
```

조회 순서:

```text
1. validate_comparison_report_reference
2. ensure_viewer_owns_comparison_report
3. read_comparison_report
4. revalidate_comparison_access_status
5. project_public_comparison_report
```

차단 상태:

- `stale`: 공개 범위 변경으로 재확인 필요
- `disabled`: 현재 열 수 없는 리포트
- `deleted`: 삭제된 리포트

개인정보 원칙:

- viewer own report만 조회한다.
- 상대의 직접 응답, 원점수, 민감 항목, 비공개 추정은 반환하지 않는다.
- access 상태가 active가 아니면 report payload를 반환하지 않는다.

## POST /api/public-profile-code

목적:

- 계정의 공개 프로필 스냅샷에 연결할 사용자별 공개 프로필 코드를 발급한다.

현재 credential-free 동작:

- valid request: `503 feature_closed / supabase_env_missing`
- invalid request: `422 validation_error`

필수 요청:

```json
{
  "codePolicyVersion": "public-profile-code.v0.1",
  "profileVisibilityPolicyVersion": "profile-visibility.v0.1",
  "resultReportId": "11111111-1111-4111-8111-111111111111",
  "requestedCode": "NUANG-A7K2M9",
  "consentDraft": {
    "is14OrOlder": true,
    "terms": true,
    "privacy": true,
    "analytics": false,
    "marketing": false
  }
}
```

서버 write 순서:

```text
1. normalize_requested_or_generated_code
2. reject_reserved_or_profile_type_code
3. claim_unique_public_profile_code
4. attach_code_to_public_snapshot
5. record_public_profile_code_audit_event
```

정책 원칙:

- 공개 프로필 코드는 사용자별 unique 값이며 대표 성향 코드와 별도이다.
- `NUANG-FOAMT`처럼 성향 타입 코드로 오해될 수 있는 값은 거절한다.
- 중복 claim과 audit write가 검증되기 전에는 실제 발급처럼 표시하지 않는다.

## POST /api/public-profile-resolver

목적:

- 공개 프로필 코드나 `/p/[code]` 링크를 공개 프로필 스냅샷 조회 기준으로 정규화한다.

현재 credential-free 동작:

- valid request: `501 feature_closed / public_profile_resolver_lookup_pending`
- invalid request: `422 validation_error`

필수 요청:

```json
{
  "reference": "https://nuang.example/p/NUANG-A7K2M9"
}
```

공개 코드 정책:

- 정책 버전: `public-profile-code.v0.1`
- 형식: `NUANG-` + 5~8자
- 허용 문자: 읽기 혼동이 큰 `0`, `1`, `I`, `O` 제외
- 성향 타입 코드처럼 보이는 5글자 영문 코드(`NUANG-FOAMT` 등)는 공개 프로필 코드로 쓰지 않는다.
- 공개 프로필 코드는 사용자별 unique 값이며, 대표 성향 코드와 별도이다.

resolver 순서:

```text
1. normalize_public_profile_reference
2. lookup_public_profile_code
3. read_public_profile_snapshot
4. project_public_profile_card
5. return_noindex_public_profile
```

개인정보 원칙:

- `/p/[code]`는 `noindex`를 유지한다.
- 서버 조회 전 임의 공개 프로필을 표시하지 않는다.
- 공개 응답에는 직접 응답, 원점수, 민감 항목, 계정 식별 정보, token hash를 넣지 않는다.

## POST /api/community-safety-actions

목적:

- 커뮤니티, 공개 프로필 카드, 공개 비교 리포트에 대한 신고·숨김·차단 액션을 저장한다.

현재 credential-free 동작:

- valid request: `503 feature_closed / supabase_env_missing`
- invalid request: `422 validation_error`

필수 요청 예시:

```json
{
  "action": "report",
  "reason": "privacy",
  "target": {
    "id": "card_local_preview",
    "type": "public_profile_card"
  }
}
```

정책:

- `report`는 `reason`이 필요하다.
- `hide`는 viewer private action으로 처리한다.
- `block`은 계정 기반 action으로 처리한다.
- moderation queue와 hide/block RLS가 검증되기 전에는 실제 접수처럼 보이게 하지 않는다.

## 검증 명령

route 또는 계약 변경 후:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

현재 기대 테스트 범위:

- 계정 API schema와 closed-route contract
- claim write 순서와 실패 payload
- share create/revoke 순서와 실패 payload
- public share summary와 unavailable payload
- closed API state payload
- profile visibility/public comparison schema와 closed-route contract
- public profile resolver schema와 closed-route contract
- community safety action schema와 closed-route contract

## 서버 write 오픈 전 체크

Auth:

- `npm run env:check:auth` 통과
- Google/Kakao provider dashboard 설정
- Naver는 disabled 유지 또는 custom OAuth/OIDC 검증 완료
- `/auth/callback?next=/my` 동작 확인

Server:

- `npm run env:check:server` 통과
- migration 적용
- 모든 사용자 데이터 테이블 RLS enabled
- `assessment.assessment_response`에 client select policy 없음
- 공유 링크는 token hash만 저장
- 로그에 item response, email 원문, raw token, score payload 없음

운영 no-go:

- `/share/[token]`에 fake public result 표시
- 공개 응답에 직접 응답 포함
- 공개 응답에 전체 facet score 기본 포함
- 공개 응답에 token hash 포함
- 브라우저 코드에 service role key 포함
