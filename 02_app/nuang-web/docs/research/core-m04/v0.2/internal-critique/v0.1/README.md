# M04 v0.2 targeted internal AI critique

상태: `INTERNAL_AGGREGATION_AND_ADJUDICATION_COMPLETE_NOT_EXTERNAL_VALIDATION`  
protocol: `m04-core-expert-kit.v0.2-targeted`

- 6개 AI 전문 역할의 내부 blind critique다.
- 외부 전문가·실제 사용자·정량 근거로 표현하지 않는다.
- 각 역할은 자신의 Stage 1 packet과 공통 codebook·guide만 본다.
- 여섯 응답이 모두 검증·잠금되기 전 Stage 2를 공개하지 않는다.
- 이번 단계에서는 결과 분석·판정·앱·DB 변경을 하지 않는다.

## Stage 1 잠금

- 역할: R01~R06
- 응답: 6 files · 48 rows
- 허용값·metadata·행 순서: `PASS`
- 응답 SHA-256·잠금 시각: `packet_lock_log.csv` 기록
- Stage 2 공개: Stage 1 전체 잠금 이후에만 수행

## Stage 2 공개

- Stage 1 6개 hash 재검증 뒤 2026-07-18T21:09:08+0900 공개
- 각 역할은 자신의 target reveal과 자신의 Stage 1 응답만 열람
- 다른 역할 응답·분석 결과는 계속 비공개
- 응답: 6 files · 48 rows
- 허용값·metadata·행 순서·공개 선후관계: `PASS`
- 응답 SHA-256·잠금 시각: `packet_lock_log.csv` 기록
- Stage 2 잠금: 2026-07-18T21:14:19+0900

## 다음 게이트

잠긴 Stage 1·2 응답 96행을 집계하고 8개 수정 후보를 내부 판정했다.

- `PASS_TO_COGNITIVE`: 3개
- `COPY_REVISE`: 4개
- `CONSTRUCT_REWRITE`: 1개
- 결과: [analysis/INTERNAL_ADJUDICATION.md](./analysis/INTERNAL_ADJUDICATION.md)
- 결과 hash·잠금: [analysis/analysis_lock.json](./analysis/analysis_lock.json)

판정에 따른 수정 대상 5개의 문구·계보·잔여 위험을 설계했다. 초안은 [05_POST_ADJUDICATION_ITEM_DRAFTS.csv](../../05_POST_ADJUDICATION_ITEM_DRAFTS.csv), 설계 근거는 [06_POST_ADJUDICATION_DRAFT_RATIONALE.md](../../06_POST_ADJUDICATION_DRAFT_RATIONALE.md)에 기록했다. major revision 1개의 제한 M04 재검토 packet과 copy revision 4개의 M05 인지 인터뷰 자료도 [post-adjudication](../../post-adjudication)에 생성했다. 다음 단계는 SMRL Stage 1 독립 검토 실행이다. 이 결과도 외부 전문가 검증이나 실제 사용자 타당도 근거가 아니다.
