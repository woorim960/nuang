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
- `202607100003_feed_mvp_interactions.sql`: 커뮤니티 투표와 피드 MVP 상호작용 테이블을 추가한다.
- `202607180001_measurement_release_catalog.sql`: 신규 5축 코드·문항 revision·문항 bank release를 분리하고, 인지·정량·신뢰도 게이트 전 활성화를 차단한다.
- `202607180002_core_candidate_bank_seed.sql`: 150개 후보 은행과 60개 연구 베타 세트를 비활성 상태로 저장한다.
- `202607180003_assessment_release_traceability.sql`: 검사 attempt·점수 snapshot·결과 report에 문항·코드·채점 release 추적 필드를 고정한다.
- `202608140005_feed_post_topics_media.sql`: 커뮤니티 게시물 주제와 최대 19장의 비공개 사진 저장·조회 구조를 추가한다.
- `202607200003_gate_c_public_research.sql`: 이름·연락처 없이 공개 Gate C 자가 참여 세션을 저장하고, 문항별 자동 검수 대기열과 삭제 코드를 추가한다.
- `202607200004_gate_c_research_retention.sql`: 익명 Gate C 기록의 1년 보관 기한을 매일 점검해 만료 자료와 파생 집계를 자동 삭제한다.
- `202607210001_trait_map_content_catalog.sql`: 성향지도의 5축·10개 세부 특성·32개 역할형과 문구·근거·4분야 검토를 버전 관리하고, 승인 전 고객 공개를 DB에서 차단한다.
- `202607310001_together_balance_game_foundation.sql`: 함께하기 밸런스 게임의 버전 고정 콘텐츠·2~8명 방·8문항 라운드·비공개 응답·결과 스냅샷·피드 모집 연결을 별도 `together_balance` 도메인에 추가한다. 원문 방/참여자 토큰은 저장하지 않고 SHA-256 해시만 받으며, 좌석 확보·응답 저장·라운드 완료·방 마감은 service-role 전용 원자 RPC를 사용한다.
- `202608010001_core_result_report_feedback.sql`: 코어·정밀 결과 리포트의 완료 시점 문장 ID·버전별 적합도 피드백, 운영 집계 view, 감사 로그가 남는 검토 상태 변경 RPC를 추가한다. 브라우저에는 원본 테이블을 열지 않고 서버가 결과 소유권과 저장된 콘텐츠 스냅샷을 다시 확인한다.
- `202608060001_trait_map_sentence_review_operations.sql`: 성향지도 문장별 7개 역할 검토, 프로필 승인, 베타·MVP 배포 기록을 원자적으로 관리한다.
- `202608060002_trait_map_inline_content_editing.sql`: 운영센터 미리보기에서 승인된 문장을 직접 수정하고, AI 안전 검수·개정 이력·사람 재검토 무효화를 한 트랜잭션으로 처리한다.

Data API 설정:

- Supabase Dashboard의 API settings에서 `Exposed schemas`에 아래 schema를 추가한다.
- `identity`, `consent`, `content`, `assessment`, `scoring`, `report`, `sharing`, `profile`, `comparison`, `feed`, `audit`, `together_balance`
- `PGRST106 Invalid schema: feed`가 나오면 SQL은 실행됐지만 `feed` schema가 Data API에 노출되지 않은 상태다. `feed`를 추가한 뒤 API 설정을 저장하고 PostgREST schema cache가 갱신될 때까지 잠시 기다린다.
- `42501 permission denied for schema feed`가 나오면 `202607090105_feed_api_grants.sql`을 실행해 Data API role grant를 적용한다.

공개 프로필 주의:

- 공개 테이블에는 RLS를 켜지만 anon 직접 select policy는 두지 않는다.
- 공개 프로필은 사용자가 코드를 입력하지 않고, 피드/공유 리포트/프로필 화면의 프로필 클릭으로만 열린다.
- 1:1 비교 생성은 `publicSnapshotId` 같은 내부 ID를 서버에 전달하되 화면에는 표시하지 않는다.
- 공개 코드 발급, 입력, `/p/[code]` 중심 UX는 폐기했다.
- `npm run smoke:server:readiness`로 legacy 공개 코드 table 부재와 service/anon 권한 표면을 반복 확인한다.
- 공개 비교 리포트는 viewer 소유 read만 허용하고, 상대 공개 범위 변경 시 access를 재평가한다.

함께하기 밸런스 게임 보안 계약:

- 앱 콘텐츠의 문자열 문항 ID는 `together_balance.item.item_key`에 저장하고, 관계형 참조에는 DB `item.id` UUID를 사용한다. 이 foundation 마이그레이션은 기획 콘텐츠를 복제해 seed하지 않는다. 출시 콘텐츠의 단일 원본과 검수 상태가 확정되면 별도 동기화 마이그레이션에서 `template.slug`와 `(template_version_id, item_key)`를 기준으로 upsert한다.
- 브라우저 역할(`anon`, `authenticated`)은 `together_balance` 원본 테이블과 RPC에 직접 접근하지 않는다. 서버 API가 `service_role`로 호출하면서 방 코드와 참여자 토큰의 SHA-256 해시를 전달한다.
- 방 생성은 `together_balance.create_room`, 입장 좌석 확보는 `together_balance.reserve_seat`, 15분 안의 입장 확정은 `together_balance.confirm_seat`를 사용한다. `reserve_seat`는 방 행을 잠그고 만료 좌석을 정리한 뒤 2~8명 고정 정원을 원자적으로 확인한다.
- 익명 `create`·`preview`·`join`은 `together_balance.consume_request_budget`의 단기·일일 제한을 먼저 통과해야 한다. 운영 프록시가 보증하는 IP 헤더만 요청 범위 키로 사용한다.
- 방은 모든 라운드와 문항이 저장되고 검증된 뒤에만 `initialization_status=ready`가 된다. 같은 생성 요청의 재시도는 `pending` 방의 문항을 멱등 복구하고, `ready`가 아닌 방은 조회·참여시키지 않는다.
- 피드 모집방 입장 시 현재 참여자 중 어느 한 명과라도 상호 차단 관계면 거절한다. 방에서 제거한 계정·참여 토큰은 `together_balance.room_ban`에 보존해 새 토큰을 이용한 계정 재입장도 차단한다.
- 방 생성·참여 CTA는 결과 공개 동의 버전을 명시적으로 전송한다. 참여자 양쪽의 `pair_visibility_consent`가 확인된 1:1 결과만 닉네임과 문항별 선택을 반환한다.
- 응답은 `together_balance.save_response`로만 저장한다. 멱등 키와 증가하는 client sequence를 확인하고, 개인이 라운드를 완료한 뒤에는 해당 라운드의 응답을 잠근다.
- 라운드 완료는 `together_balance.complete_round`, 12·16·20·24문항 전체 게임 완주는 `together_balance.complete_game`, 방장의 조기 마감은 `together_balance.finalize_room`을 사용한다. 참여자용 상태 조회는 `together_balance.get_room_state`가 자신의 응답만 반환하고, 입장 전 요약은 해시를 받는 `together_balance.get_room_join_preview`를 사용한다. 결과 조회는 `together_balance.get_result_state`를 사용해 그룹 요약과 요청 참여자가 포함된 1:1 결과만 반환한다.
- 결과가 열린 뒤 점수 원본은 불변 콘텐츠 버전에 연결된 `result_snapshot`이다. 스냅샷 저장과 이미 공유된 피드 결과 카드 갱신은 같은 DB 트랜잭션에서 처리해 과거 결과와 피드 카드가 새 코드나 일시 오류로 달라지지 않게 한다.
- 피드 모집과 결과 공유는 각각 `together_balance_room_share`, `together_balance_result_share` source를 사용한다. 기존 커뮤니티 `balance_game` 투표와 연결하지 않는다. 피드 공개 payload는 허용된 무기명 요약 키만 저장하고, 참여자별 답과 1:1 결과는 넣지 않는다.
