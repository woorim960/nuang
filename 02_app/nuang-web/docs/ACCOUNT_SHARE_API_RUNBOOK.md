# NUANG 계정 저장·공유 API Runbook

이 문서는 계정 저장·공유·공개 공유 조회 동작을 한 곳에서 확인하기 위한 운영 문서다. API와 DB에서는 share link/token이라는 내부 용어를 쓰지만, 사용자 화면에서는 `공유 주소`라고 표시한다.

## 현재 상태

열린 기능:

- 빠른 코어/정밀 코어 검사
- 결과 리포트
- 내 결과 삭제/export
- 32개 뉴앙 코드 기반 성향지도
- 결과 이미지 저장/공유
- 소셜 로그인 세션
- 결과 계정 저장
- 공유 주소 생성
- 공유 주소 철회
- 공개 공유 token 조회

남은 게이트:

- Google/Kakao provider dashboard redirect 확인
- 실제 로그인 세션으로 결과 저장, 공유 주소 생성/조회/철회 smoke test
- Supabase RLS와 직접 응답·원점수·민감 항목 비노출 쿼리 검증
- 최종 약관·개인정보처리방침 승인

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

현재 단계에서는 local/auth/server env check를 모두 확인한 뒤 실제 브라우저 세션 smoke와 RLS 검증을 진행한다. 공개 출시는 법률·개인정보 최종 승인 전까지 `NO-GO`다.

서버 readiness smoke:

```bash
npm run smoke:server:readiness
```

Step 179 기준 이 명령은 원격 Supabase 접근, service/anon 권한 표면, legacy `profile.profile_public_code` 부재를 확인하며 전체 통과했다.

## GET /api/claim-result

목적:

- 로컬 결과를 다시 열었을 때 로그인 계정에 이미 저장된 결과인지 확인한다.
- 활성 공유 링크의 개수와 가장 늦은 만료일만 복원한다.

요청:

```text
GET /api/claim-result?localResultId=local_test_123
```

저장된 결과 응답:

```json
{
  "ok": true,
  "result": {
    "activeShareLinkCount": 1,
    "activeShareLinks": [
      {
        "expiresAt": "2026-08-03T00:00:00.000Z",
        "id": "..."
      }
    ],
    "assessmentAttemptId": "...",
    "claimedAt": "2026-07-04T00:00:00.000Z",
    "latestShareExpiresAt": "2026-08-03T00:00:00.000Z",
    "profileCode": "TVOAE",
    "profileName": "불꽃의 온기 탐험가",
    "resultReportId": "..."
  }
}
```

로컬 전용 결과 응답:

```json
{
  "ok": true,
  "result": null
}
```

보안 원칙:

- 직접 문항 응답, 전체 점수 벡터, 이메일, OAuth 원본 응답은 반환하지 않는다.
- 공유 링크 원본 token은 서버에 hash만 저장하므로 다시 반환하지 않는다.
- 기존 공유 링크는 계정 소유 link ID와 만료일만 보여주며 URL이 필요하면 새 링크를 만든다.
- link ID는 철회 요청에만 사용하고 공개 URL이나 token으로 취급하지 않는다.

## POST /api/claim-result

목적:

- 이 기기에 저장된 완료 결과를 로그인 계정으로 옮긴다.

로그인 전 동작:

- valid request: `401 unauthenticated`
- invalid request: `422 validation_error`

서버 환경값이 없을 때:

- valid request: `503 feature_closed / supabase_env_missing`

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
    "profileName": "불꽃의 온기 탐험가"
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
    "profileName": "불꽃의 온기 탐험가",
    "restored": false,
    "resultReportId": "..."
  },
  "next": {
    "canCreateShareLink": true,
    "canOpenMap": true
  }
}
```

같은 `localResultId`가 이미 계정에 저장되어 있으면 `409` 오류를 내지 않고 기존
`assessmentAttemptId`와 `resultReportId`를 복원해 `restored: true` 성공 응답을
반환한다.

실패 코드:

```text
account_link_missing
age_or_required_consent_missing
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

## GET /api/account-results

목적:

- 마이 탭에서 로컬 결과와 계정 저장 결과를 중복 없이 합친다.
- 원래 기기의 로컬 사본이 없어도 계정 전용 요약 리포트를 다시 연다.

목록 요청:

```text
GET /api/account-results
```

단일 결과 요청:

```text
GET /api/account-results?resultReportId=45b930d1-527b-40a2-a220-9f513625f6e8
```

응답 projection:

```json
{
  "ok": true,
  "results": [
    {
      "assessmentAttemptId": "...",
      "completedAt": "2026-07-04T00:00:00.000Z",
      "createdAt": "2026-07-04T00:00:00.000Z",
      "domains": [],
      "kind": "full",
      "localResultId": "local_test_123",
      "profileCode": "TVOAE",
      "profileName": "불꽃의 온기 탐험가",
      "resultLabel": "현재 대표 성향",
      "resultReportId": "..."
    }
  ]
}
```

보안 원칙:

- 인증 계정이 소유한 `result_report`만 조회한다.
- 직접 응답, raw score payload, 연락처, OAuth 원본 응답은 반환하지 않는다.
- `localResultId`가 같은 로컬·계정 결과는 마이에서 한 행으로 합친다.
- 계정 전용 리포트는 noindex이며 5영역 계정 요약만 보여준다.

사용자-facing 원칙:

- 내부 route와 API는 로컬/계정 식별자를 사용할 수 있지만 화면에는 저장 위치를 표시하지 않는다.
- `/results/local/[localResultId]`와 `/results/account/[resultReportId]`는 모두 `결과 리포트`로 표시한다.
- 명시적인 `계정에 저장` CTA는 사용하지 않는다. 로그인과 필수 동의가 완료되면 결과 연결을 백그라운드에서 처리한다.

## DELETE /api/account-results

목적:

- 사용자가 선택한 하나의 `삭제`로 결과와 연관 공개 데이터를 함께 정리한다.
- 같은 동작에서 공유 링크, 공개 프로필 스냅샷과 코드, 비교 기록을 고아 데이터 없이 제거한다.

요청:

```json
{
  "localResultId": "local_test_123",
  "resultReportId": "45b930d1-527b-40a2-a220-9f513625f6e8"
}
```

- 둘 중 하나 이상의 식별자가 필요하다.
- 인증되지 않은 사용자의 기기 내 결과 삭제는 클라이언트에서 계속 처리한다.
- 인증 계정에 연결된 결과는 `report.delete_result_for_account` 트랜잭션으로 삭제한다.

트랜잭션 순서:

1. 인증 계정이 소유한 결과와 검사 시도를 찾는다.
2. 공개 스냅샷을 대상으로 사용된 비교 기록을 먼저 삭제한다.
3. 검사 시도를 삭제한다.
4. FK cascade로 점수, 결과 리포트, 공유 링크, 공개 스냅샷·코드, 관찰자 비교 기록을 정리한다.

보안 원칙:

- 함수 실행 권한은 `service_role`에만 부여한다.
- 다른 계정 결과 식별자를 보내도 삭제하지 않는다.
- 이미 없어진 결과는 성공 응답의 `deleted: false`로 멱등 처리한다.
- 클라이언트에는 저장 위치나 내부 cascade 세부를 노출하지 않는다.

## POST /api/share-links

목적:

- 계정에 저장된 결과 리포트로 summary-only 공개 공유 링크를 만든다.
- 사용자 화면의 CTA는 `공유 주소 복사`이며, 복사 권한이 막힌 브라우저에서는 생성된 주소를 화면에 보여주고 수동 복사를 안내한다.

로그인 전 동작:

- valid request: `401 unauthenticated`
- invalid request: `422 validation_error`

서버 환경값이 없을 때:

- valid request: `503 feature_closed / supabase_env_missing`

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
- 공개 화면의 코드 이름은 저장된 `share_summary.profileName`보다 현재 뉴앙 코드 사전의 이름을 우선한다.

## POST /api/revoke-share

목적:

- 로그인 계정 소유의 공유 링크를 철회한다.

로그인 전 동작:

- valid request: `401 unauthenticated`
- invalid request: `422 validation_error`

서버 환경값이 없을 때:

- valid request: `503 feature_closed / supabase_env_missing`

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

- 서버 환경값이 없으면 안전한 준비 중 UI
- active token이면 summary-only 결과 UI
- expired/not_found/revoked token이면 unavailable UI
- `noindex`
- fake result 표시 금지

열렸을 때 active share가 포함할 수 있는 것:

- representative profile type code
- profile name, normalized through the current Nuang code dictionary when possible
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

- 상대 프로필 팝업에서 사용자가 `나와 비교하기`를 누른 경우에만 내 정밀 코어 결과와 상대 공개 프로필 범위를 사용해 1:1 비교 리포트를 만든다.
- 결과 공유 링크나 공개 코드를 직접 입력해 비교를 시작하는 사용자 흐름은 MVP에서 열지 않는다.

현재 credential-free 동작:

- valid request: `503 feature_closed / supabase_env_missing`
- invalid request: `422 validation_error`

필수 요청:

```json
{
  "viewerResultReportId": "11111111-1111-4111-8111-111111111111",
  "policyVersion": "profile-visibility.v0.1",
  "target": {
    "publicSnapshotId": "22222222-2222-4222-8222-222222222222"
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
- API는 상대 프로필 팝업의 명시적 action 뒤에서만 호출한다.

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

## Legacy Public Code APIs

제거된 사용자-facing API:

- `POST /api/public-profile-code`
- `POST /api/public-profile-resolver`
- `/p/[code]`

제거 이유:

- 사용자가 공개 코드를 입력하거나 발급받는 흐름은 번거롭다.
- 공개 코드와 성향 코드, 공유 링크가 혼동된다.
- 결과 공유 링크와 프로필 클릭 기반 팝업만으로 같은 목적을 더 자연스럽게 달성할 수 있다.

대체 구조:

- 결과 공유: `sharing.share_link` token으로 공유용 결과 리포트를 연다.
- 프로필 확인: 피드, 공유 리포트, 프로필 화면에 이미 렌더링된 프로필을 클릭해 팝업을 연다.
- 1:1 비교: 팝업의 `나와 비교하기`가 서버에 `publicSnapshotId`를 보낸다.
- 사용자는 어떤 코드도 입력하지 않고, 내부 ID는 화면에 표시하지 않는다.

DB 정리:

- 기존 개발 DB에 적용될 수 있던 `profile.profile_public_code` 또는 `target_public_code_id`는 Step 179 server readiness에서 부재 확인됐다.
- 정리 SQL은 `supabase/migrations/202607100001_drop_public_profile_code.sql`로 보존하되, 현재 제품/DB 기준은 공개 코드 없는 구조다.

## Legacy `/api/community-safety-actions`

상태:

- 제거됨. MVP 피드 API는 `/api/feed`로 고정했고, 공개 프로필/공개 비교의 신고·숨김·차단 저장 route는 별도 moderation endpoint로 다시 설계한다.

제거 이유:

- 피드와 커뮤니티를 별도 사용자-facing 개념으로 나누지 않는다.
- 실제 화면에서 이 route를 호출하지 않는다.
- 닫힌 route가 남아 있으면 build route surface와 제품 명세가 어긋난다.

향후 moderation endpoint 예시:

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
- moderation safety action schema

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
