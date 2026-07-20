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
- `202607040091_public_profile_code_snapshot.sql`: 공개 범위 설정, 공개 프로필 스냅샷, visibility audit 초안.
- `202607040095_public_comparison_report.sql`: 공개 프로필 기반 1:1 비교 리포트와 access 재평가 상태 초안.
- `202607090101_claim_result_idempotency.sql`: 같은 로컬 결과를 한 계정에 중복 claim하지 못하게 막는 unique index.
- `202607090102_api_schema_grants.sql`: Supabase Data API에서 custom schema를 사용할 수 있도록 role grant를 부여.
- `202607090103_feed_foundation.sql`: 피드 게시글, 댓글, 반응, 저장 기본 테이블 초안.
- `202607090104_feed_seed_targets.sql`: 공식 seed 카드에 대한 댓글, 반응, 저장 target을 지원.
- `202607090105_feed_api_grants.sql`: Data API 역할이 feed schema와 table을 사용할 수 있도록 grant를 부여하고 schema cache를 갱신.
- `202607090106_feed_preference_not_interested.sql`: 관심 없음 개인화 신호를 저장하고 피드 read model에서 제외한다.
- `202607090107_unified_result_delete.sql`: 결과 삭제 시 공유·공개·비교 참조를 함께 정리하는 RPC를 추가한다.
- `202607100001_drop_public_profile_code.sql`: 기존 개발 DB에 적용된 공개 코드 테이블과 비교 코드 컬럼을 제거하는 정리 SQL. Step 179 기준 원격 DB에서 `profile.profile_public_code`와 `target_public_code_id` 부재를 확인했다.
- `202607100002_free_topic_results.sql`: 무료 주제 검사 결과의 서버 summary/evidence-only 저장소를 추가한다.
- `202607100003_feed_mvp_interactions.sql`: 밸런스 게임 투표와 피드 MVP 상호작용 테이블을 추가한다.
- `202607180001_measurement_release_catalog.sql`: 신규 5축 코드·문항 revision·문항 bank release를 분리하고, 인지·정량·신뢰도 게이트 전 활성화를 차단한다.
- `202607180002_core_candidate_bank_seed.sql`: 150개 후보 은행과 60개 연구 베타 세트를 비활성 상태로 저장한다.
- `202607180003_assessment_release_traceability.sql`: 검사 attempt·점수 snapshot·결과 report에 문항·코드·채점 release 추적 필드를 고정한다.
- `202607200001_feed_post_topics_media.sql`: 커뮤니티 게시물 주제와 최대 19장의 비공개 사진 저장·조회 구조를 추가한다.

Data API 설정:

- Supabase Dashboard의 API settings에서 `Exposed schemas`에 아래 schema를 추가한다.
- `identity`, `consent`, `content`, `assessment`, `scoring`, `report`, `sharing`, `profile`, `comparison`, `feed`, `audit`
- `PGRST106 Invalid schema: feed`가 나오면 SQL은 실행됐지만 `feed` schema가 Data API에 노출되지 않은 상태다. `feed`를 추가한 뒤 API 설정을 저장하고 PostgREST schema cache가 갱신될 때까지 잠시 기다린다.
- `42501 permission denied for schema feed`가 나오면 `202607090105_feed_api_grants.sql`을 실행해 Data API role grant를 적용한다.

공개 프로필 주의:

- 공개 테이블에는 RLS를 켜지만 anon 직접 select policy는 두지 않는다.
- 공개 프로필은 사용자가 코드를 입력하지 않고, 피드/공유 리포트/프로필 화면의 프로필 클릭으로만 열린다.
- 1:1 비교 생성은 `publicSnapshotId` 같은 내부 ID를 서버에 전달하되 화면에는 표시하지 않는다.
- 공개 코드 발급, 입력, `/p/[code]` 중심 UX는 폐기했다.
- `npm run smoke:server:readiness`로 legacy 공개 코드 table 부재와 service/anon 권한 표면을 반복 확인한다.
- 공개 비교 리포트는 viewer 소유 read만 허용하고, 상대 공개 범위 변경 시 access를 재평가한다.
