# NUANG Supabase Workspace

Supabase SQL migration, seed, RLS policy를 보관할 영역이다.

credential 준비는 `CREDENTIAL_MINIMAL_SETUP.md`를 먼저 따른다.
계정 저장과 공유 링크 운영 계약은 `../docs/ACCOUNT_SHARE_API_RUNBOOK.md`를 따른다.

초기 규칙:

- 모든 사용자 데이터 테이블은 RLS를 켠다.
- 직접 응답 테이블은 client select를 허용하지 않는다.
- service role key는 브라우저에 노출하지 않는다.

마이그레이션:

- `202607030044_identity_consent_auth_foundation.sql`: 계정, 동의, 검사, 결과, 공유 링크 foundation.
- `202607040091_public_profile_code_snapshot.sql`: 공개 범위 설정, 공개 프로필 스냅샷, 사용자별 공개 코드, visibility audit 초안.
- `202607040095_public_comparison_report.sql`: 공개 프로필 기반 1:1 비교 리포트와 access 재평가 상태 초안.

공개 프로필 주의:

- `profile.profile_public_code`는 사용자별 unique code이며 대표 성향 코드와 별도이다.
- 공개 테이블에는 RLS를 켜지만 anon 직접 select policy는 두지 않는다.
- `/p/[code]` 응답은 서버 route에서 공개 스냅샷을 요약 투영한 뒤 반환한다.
- 공개 비교 리포트는 viewer 소유 read만 허용하고, 상대 공개 범위 변경 시 access를 재평가한다.
