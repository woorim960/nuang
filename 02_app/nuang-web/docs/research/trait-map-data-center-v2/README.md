# 뉴앙 성향지도 데이터센터 v2

- 계약: `nuang-trait-map-data-center.v2`
- 상태: `RESEARCH_MASTER_V2_3_COMPLETE`
- 대상: `E/I · R/N · G/A · K/M · C/Q` 32개 역할형 성향
- 장문 기준: 역할형 1개당 공백 제외 `50,000자 이상`
- 현재 장문: 32개 전부 기준 통과, 공백 제외 총 `2,352,502자`
- 표준 문장: `605개`, 32개 성향 연결 `9,216개`
- 자동 내용 감사: `32/32`, 한 글자 이웃 비교 `80/80`
- 연구 원장 완료 기준: `10/10`, 차단 항목 `0개`
- 고객 발행: 실제 참여자·독립 검토 전까지 allowlist `0개`
- 기준 상황: 역할형 1개당 최소 `72개`
- 인접 비교: 역할형 1개당 글자 하나가 다른 `5개 성향`

## 목적

이 데이터센터는 성향지도 화면에 긴 글을 올려두는 문서 보관소가 아니다.
논문과 공식 검사 지침에서 확인한 결과가 뉴앙의 어떤 축·세부 성향·상황
주장을 지지하는지 추적하고, 검증된 문장만 성향지도·개인 리포트·비교
리포트·공개 프로필에서 재사용하는 지식 시스템이다.

```text
근거 자료
  → 자료에서 확인한 결과
  → 뉴앙 구성개념 매핑
  → canonical claim
  → 5W1H 상황
  → 짧은·표준·장문 콘텐츠
  → 성향지도·결과·비교·프로필
```

## 이번 v2에서 잠근 것

1. 32개 역할형 성향과 중복 없는 짧은 별칭·긴 별칭
2. 5축·10개 세부 성향을 공통 지식층으로 재사용하는 구조
3. 일반·가족·친구·연인·마음 가는 사람·업무의 6개 핵심 맥락
4. 맥락마다 12개 대표 순간을 둔 72개 canonical 상황
5. 누구와·언제·어디서·무엇을·어떻게·왜를 분리한 상황 계약
6. 논문 한 편이 아니라 논문 안의 결과 단위로 저장하는 근거 계약
7. 고위험 관계·능력·임상 해석에 독립 근거 2개 이상을 요구하는 규칙
8. 공백 제외 50,000자 이상, 16개 장, 100개 이상 claim,
   30개 이상 근거 자료, 72개 상황, 5개 인접 비교를 모두 통과해야 하는
   역할형 승인 규칙
9. 성격심리·심리측정·관계심리·임상안전·쉬운 한국어·제품·디자인 검토
10. 연구 상태와 고객 발행 상태를 분리하는 규칙

## 문서

- [`01_RESEARCH_CHARTER_V2.md`](./01_RESEARCH_CHARTER_V2.md):
  연구 목적, 사용 범위, 금지 추론, 단계와 완료 기준
- [`02_5W1H_SCENARIO_ONTOLOGY_V2.md`](./02_5W1H_SCENARIO_ONTOLOGY_V2.md):
  72개 기준 상황과 5W1H 데이터 구조
- [`03_EVIDENCE_CLAIM_APPROVAL_STANDARD_V2.md`](./03_EVIDENCE_CLAIM_APPROVAL_STANDARD_V2.md):
  근거 수집, 등급, claim 승인, 전문 검토와 정량 검증 기준
- [`04_PROFILE_NAMING_SYSTEM_V2.md`](./04_PROFILE_NAMING_SYSTEM_V2.md):
  다섯 글자의 쉬운 뜻, 네 가지 성향군, 32개 고유 짧은 별칭·긴 별칭과
  이름 이해도 검증 기준
- [`05_32_PROFILE_CONTENT_QUALITY_AUDIT_V2.md`](./05_32_PROFILE_CONTENT_QUALITY_AUDIT_V2.md):
  5만 자 충족 여부와 별개로 근거 장을 제외한 실제 본문, 핵심 해설 장,
  반복 문장, 근거 추적, 한 글자 이웃 80쌍의 생성 계보를 다시 검사한
  내용 품질 감사와 코드별 보강 우선순위
- [`06_288_SLOT_AXIS_CLASSIFICATION_AUDIT_V2.md`](./06_288_SLOT_AXIS_CLASSIFICATION_AUDIT_V2.md):
  288개 상황·관찰 슬롯의 원문 계보·기존 축 유지·새 의미 축·복합축·
  고위험 검토 상태를 감사하고 네 개의 순차 전문 검토 작업군으로 나눈 보고서
- [`07_CANONICAL_SCENARIO_COMPOSITION_STANDARD_V2.md`](./07_CANONICAL_SCENARIO_COMPOSITION_STANDARD_V2.md):
  부모 원장 경로와 무관하게 승인된 축 조합만으로 같은 문장을 선택하고,
  원문 의미의 유지·수정·중복 제외·근거 부족 제외를 모두 추적하는 합성 기준
- [`08_FINAL_AXIS_DECISION_MANIFEST_V2.md`](./08_FINAL_AXIS_DECISION_MANIFEST_V2.md):
  두 차례 의미 검토를 합쳐 288개 슬롯의 최소 식별 가능 축과 canonical
  연구 문장 작성 규모를 확정한 최종 축 결정 요약
- [`09_CANONICAL_DRAFTING_DRY_RUN_AUDIT_V2.md`](./09_CANONICAL_DRAFTING_DRY_RUN_AUDIT_V2.md):
  713개 축 조합별 기존 원문 후보를 모으고 32×288 canonical 참조를
  건식 생성해 80개 한 글자 이웃의 계보 병합·같은 문장 충돌을 찾은 보고서
- `generated/ENAKQ_BASELINE_MANIFEST.json`:
  기존 ENAKQ가 v2 기준에서 충족한 항목과 남은 항목
- `generated/ENAKQ_SCENARIO_COVERAGE.json`:
  72개 상황 중 기존 claim 연결과 빈 상황 감사
- `generated/ENAKQ_GAP_AUTHORING_PLAN.json`:
  빈 상황을 근거부터 보강하기 위한 순서와 필수 검토 원장
- `generated/EVIDENCE_INVENTORY_V2.json`:
  정규화 완료·철회 제외·중복 별칭·미검토 자료 재고
- `generated/ENAKQ_SCENARIO_RESEARCH_COVERAGE_V2.json`:
  기존 30개와 새 검토 후보 42개를 합친 연구 단계 72개 상황 커버리지
- `generated/ENAKQ_SCENARIO_REVIEW_V2.json`:
  72개 상황 전체의 주의·처음 생각·실제 반응·말하기 후보 288개와 검토 질문
- `generated/ENAKQ_SCENARIO_COPY_AUDIT_V2.json`:
  회피 문구·중복·길이·생각/행동 구분 자동 감사 결과
- `generated/ENAKQ_LONGFORM_RESEARCH_MANIFEST_V2.json`:
  ENAKQ의 16개 장·72개 상황·314개 claim·30개 근거를 연결한 v2 연구 원문 명세
- `docs/trait-maps/ENAKQ/ENAKQ_DATA_CENTER_V2_RESEARCH_DRAFT.md`:
  기존 원문을 대체할 ENAKQ 공백 제외 50,000자 이상 v2 연구 원문
- `generated/IRGMC_RESEARCH_BASELINE_V2.json`:
  정반대 기준점 IRGMC의 5개 방향 정의, 16개 장 질문, 72개 상황 작업 목록
- `generated/IRGMC_P0_SCENARIO_REVIEW.json`:
  IRGMC의 일상·연인·관심 상대 우선 상황 18개에 대한 주의·처음 생각·실제 반응·말하기 후보 72개
- `generated/IRGMC_SCENARIO_REVIEW_V2.json`:
  IRGMC의 72개 공통 상황 전체에 대한 연구 후보 288개와 검토 질문
- `generated/IRGMC_SCENARIO_RESEARCH_COVERAGE_V2.json`:
  관계 맥락·상황별 IRGMC 연구 후보 커버리지와 미승인 상태
- `generated/IRGMC_SCENARIO_COPY_AUDIT_V2.json`:
  회피 문구·낙인성 축약·중복·생각/행동 구분 자동 감사 결과
- `generated/IRGMC_LONGFORM_RESEARCH_MANIFEST_V2.json`:
  16개 장·72개 상황·314개 claim·32개 근거를 연결한 5만 자 연구 원문 명세
- `docs/trait-maps/IRGMC/IRGMC_DATA_CENTER_V2_RESEARCH_DRAFT.md`:
  IRGMC 공백 제외 50,000자 이상 성향지도 데이터센터 연구 원문
- `generated/ANCHOR_PROFILE_PARITY_AUDIT_V2.json`:
  ENAKQ·IRGMC 두 기준 성향의 장·상황·claim·이웃 비교 구조 대칭 감사
- `generated/IRGMC_NEIGHBOR_REVIEW_V2.json`:
  IRGMC와 한 글자만 다른 5개 성향의 독립 비교 claim 20개
- `generated/BRIDGE_PROFILE_PRODUCTION_PLAN_V2.json`:
  두 기준 성향에서 한 글자만 다른 10개 성향의 제작 순서, 상속 규칙,
  축별 판별 상황과 첫 교차 보정 묶음
- `generated/INAKQ_SCENARIO_REVIEW_V2.json`:
  ENAKQ에서 근거를 상속하고 E→I 판별 장면 10개·40개 채널을 다시 쓴
  INAKQ 72개 상황·288개 claim 및 claim별 계보
- `generated/INAKQ_SCENARIO_COPY_AUDIT_V2.json`:
  INAKQ 전체 상황 문장의 회피 표현·중복·길이·생각/행동 구분 자동 감사
- `generated/INAKQ_NEIGHBOR_REVIEW_V2.json`:
  INAKQ와 한 글자만 다른 5개 성향의 정의·주의·실제 반응·판별 가이드
  연구 claim 20개
- `generated/INAKQ_LONGFORM_RESEARCH_MANIFEST_V2.json`:
  INAKQ의 16개 장·72개 상황·314개 claim·31개 근거를 연결한 장문 연구 원문 명세
- `docs/trait-maps/INAKQ/INAKQ_DATA_CENTER_V2_RESEARCH_DRAFT.md`:
  INAKQ 공백 제외 50,000자 이상 성향지도 데이터센터 연구 원문
- `generated/ERGMC_SCENARIO_REVIEW_V2.json`:
  IRGMC에서 근거를 상속하고 I→E 판별 장면 10개·40개 채널을 다시 쓴
  ERGMC 72개 상황·288개 claim 및 claim별 계보
- `generated/ERGMC_SCENARIO_COPY_AUDIT_V2.json`:
  ERGMC 전체 상황 문장의 회피 표현·중복·길이·생각/행동 구분 자동 감사
- `generated/ERGMC_NEIGHBOR_REVIEW_V2.json`:
  ERGMC와 한 글자만 다른 5개 성향의 연구 비교 claim 20개
- `generated/ERGMC_LONGFORM_RESEARCH_MANIFEST_V2.json`:
  ERGMC의 16개 장·72개 상황·314개 claim·33개 근거를 연결한 장문 연구 원문 명세
- `docs/trait-maps/ERGMC/ERGMC_DATA_CENTER_V2_RESEARCH_DRAFT.md`:
  ERGMC 공백 제외 50,000자 이상 성향지도 데이터센터 연구 원문
- `generated/EI_BRIDGE_CALIBRATION_AUDIT_V2.json`:
  ENAKQ→INAKQ와 IRGMC→ERGMC 두 배경에서 동일한 E/I 판별 장면,
  상속·교체 균형, 장문·이웃 비교 완성도를 교차 감사한 보고서
- `generated/ERAKQ_SCENARIO_REVIEW_V2.json`,
  `generated/INGMC_SCENARIO_REVIEW_V2.json`:
  두 기준 성향에서 R/N 판별 장면 10개·40개 채널만 다시 쓴
  각 72개 상황·288개 claim 및 claim별 계보
- `generated/ERAKQ_LONGFORM_RESEARCH_MANIFEST_V2.json`,
  `generated/INGMC_LONGFORM_RESEARCH_MANIFEST_V2.json`:
  각 16개 장·72개 상황·314개 claim을 연결한 5만 자 이상 연구 원문 명세
- `docs/trait-maps/ERAKQ/ERAKQ_DATA_CENTER_V2_RESEARCH_DRAFT.md`,
  `docs/trait-maps/INGMC/INGMC_DATA_CENTER_V2_RESEARCH_DRAFT.md`:
  ERAKQ 72,492자와 INGMC 72,089자의 성향지도 데이터센터 연구 원문
- `generated/NR_BRIDGE_CALIBRATION_AUDIT_V2.json`:
  ENAKQ→ERAKQ와 IRGMC→INGMC 두 배경에서 같은 R/N 판별 장면,
  상속·교체 균형, 장문·이웃 비교와 방향 문구를 교차 감사한 보고서
- `generated/ENGKQ_SCENARIO_REVIEW_V2.json`,
  `generated/IRAMC_SCENARIO_REVIEW_V2.json`:
  갈등·지원 요청 10개 장면에서 처음 드는 생각과 실제 나타나는 반응을
  분리해 다시 쓴 A/G 연구 패킷. 각 72개 상황·288개 claim이며,
  공통 248개 문장을 상속하고 A/G 판별 문장 40개를 다시 썼다.
- `generated/ENGKQ_NEIGHBOR_REVIEW_V2.json`,
  `generated/IRAMC_NEIGHBOR_REVIEW_V2.json`:
  ENGKQ·IRAMC와 한 글자만 다른 각 5개 성향의 연구 비교 claim 20개
- `generated/ENGKQ_LONGFORM_RESEARCH_MANIFEST_V2.json`,
  `generated/IRAMC_LONGFORM_RESEARCH_MANIFEST_V2.json`:
  ENGKQ 72,413자와 IRAMC 72,732자의 16개 장·72개 상황·314개 claim
  장문 연구 원문 명세
- `generated/AG_BRIDGE_CALIBRATION_AUDIT_V2.json`:
  ENAKQ→ENGKQ와 IRGMC→IRAMC 두 배경에서 A/G 판별 장면·상속 균형·
  처음 생각과 실제 반응의 분리를 교차 감사한 보고서
- `generated/ENAMQ_SCENARIO_REVIEW_V2.json`,
  `generated/IRGKC_SCENARIO_REVIEW_V2.json`:
  평소 선택과 계획 변경 10개 장면에서 실행을 시작하고 이어가는 조건을
  K/M 방향에 맞춰 다시 쓴 각 72개 상황·288개 claim 연구 패킷
- `generated/ENAMQ_LONGFORM_RESEARCH_MANIFEST_V2.json`,
  `generated/IRGKC_LONGFORM_RESEARCH_MANIFEST_V2.json`:
  ENAMQ 71,740자와 IRGKC 71,380자의 16개 장·72개 상황·314개 claim
  장문 연구 원문 명세
- `generated/KM_BRIDGE_CALIBRATION_AUDIT_V2.json`:
  ENAKQ→ENAMQ와 IRGMC→IRGKC 두 배경에서 K/M 실행 조건의 방향 문구와
  상속·교체 대칭을 교차 감사한 보고서
- `generated/ENAKC_SCENARIO_REVIEW_V2.json`,
  `generated/IRGMQ_SCENARIO_REVIEW_V2.json`:
  불확실성·좌절·일이 끝난 뒤의 감정과 회복 10개 장면에서 Q/C 방향에
  맞춰 다시 쓴 각 72개 상황·288개 claim 연구 패킷
- `generated/ENAKC_LONGFORM_RESEARCH_MANIFEST_V2.json`,
  `generated/IRGMQ_LONGFORM_RESEARCH_MANIFEST_V2.json`:
  ENAKC 77,502자와 IRGMQ 77,172자의 16개 장·72개 상황·314개 claim
  장문 연구 원문 명세. 핵심·가족·친구·연인·마음에 드는 사람·업무·
  갈등 장에는 언제·누구와·어디서·무엇을·왜·어떻게를 별도로 기록했다.
- `generated/QC_BRIDGE_CALIBRATION_AUDIT_V2.json`:
  ENAKQ→ENAKC와 IRGMC→IRGMQ 두 배경에서 초기 감정 활성화·실제 행동·
  시간이 지난 뒤의 회복을 분리하고 Q/C 방향 문구를 교차 감사한 보고서
- `generated/DIRECT_DERIVED_PROFILE_COMPLETENESS_AUDIT_V2.json`:
  두 기준 성향에서 한 글자만 다른 10개 성향 전체의 720개 상황,
  2,880개 상황 claim, 3,140개 구조화 claim, 200개 이웃 비교,
  장문 735,517자를 한 번에 대조한 종합 감사 보고서. 자동 구조 감사는
  통과했지만 고객 승인 claim은 0개이며 사람 검증은 다음 게이트로 남아 있다.
- `generated/REMAINING_PROFILE_PRODUCTION_PLAN_V2.json`:
  남은 20개 성향을 두 개의 완성된 부모 경로로 교차 제작하는 네 묶음 계획.
  한 축에만 민감한 문장은 해당 부모에서 상속하고, 두 축 판별 장면이 겹칠
  때만 주의·처음 생각·실제 반응·말하기를 함께 다시 쓰도록 잠갔다.
- `generated/IRAKQ_SCENARIO_REVIEW_V2.json`,
  `generated/ERGKQ_SCENARIO_REVIEW_V2.json`,
  `generated/ENGMQ_SCENARIO_REVIEW_V2.json`,
  `generated/ENAMC_SCENARIO_REVIEW_V2.json`,
  `generated/INAKC_SCENARIO_REVIEW_V2.json`:
  첫 번째 다축 묶음의 각 72개 상황·288개 claim과 두 부모 경로 계보.
  두 축이 겹치는 4개 장면에서만 16개 상호작용 claim을 별도로 작성했다.
- `docs/trait-maps/IRAKQ/IRAKQ_DATA_CENTER_V2_RESEARCH_DRAFT.md`,
  `docs/trait-maps/ERGKQ/ERGKQ_DATA_CENTER_V2_RESEARCH_DRAFT.md`,
  `docs/trait-maps/ENGMQ/ENGMQ_DATA_CENTER_V2_RESEARCH_DRAFT.md`,
  `docs/trait-maps/ENAMC/ENAMC_DATA_CENTER_V2_RESEARCH_DRAFT.md`,
  `docs/trait-maps/INAKC/INAKC_DATA_CENTER_V2_RESEARCH_DRAFT.md`:
  첫 번째 묶음 5개 성향의 16개 장·공백 제외 5만 자 이상 장문 연구 원문.
- `generated/REMAINING_BATCH1_CALIBRATION_AUDIT_V2.json`:
  첫 번째 묶음의 360개 상황, 1,440개 상황 claim, 1,570개 구조화 claim,
  100개 이웃 비교와 두 부모 경로 수렴을 한 번에 대조한 종합 감사 보고서.
  자동 구조 감사는 통과했지만 고객 승인 claim은 0개이며 사람 검증은
  다음 게이트로 남아 있다.
- `generated/REMAINING_BATCH2_CALIBRATION_AUDIT_V2.json`,
  `generated/REMAINING_BATCH3_CALIBRATION_AUDIT_V2.json`,
  `generated/REMAINING_BATCH4_CALIBRATION_AUDIT_V2.json`:
  나머지 세 묶음 15개 성향의 두 부모 경로 수렴, 축 상호작용 문장,
  72개 상황·16개 장·이웃 5개 비교·장문 길이를 묶음별로 대조한 감사 보고서.
- `docs/trait-maps/{CODE}/{CODE}_DATA_CENTER_V2_RESEARCH_DRAFT.md`:
  32개 역할형 성향 각각의 공백 제외 50,000자 이상 연구 원문.
  일상·가족·친구·연인·마음에 드는 사람·업무·갈등을 포함한 16개 장과
  72개 canonical 상황을 공통 계약으로 사용한다.
- `generated/TRAIT_MAP_32_PROFILE_COMPLETENESS_AUDIT_V2.json`:
  32개 코드 조합 전체의 누락·중복, 2,304개 상황, 9,216개 상황 claim,
  10,048개 구조화 claim, 640개 이웃 비교, 80개 양방향 이웃 관계,
  장문 2,352,502자, 32개 고유 짧은 별칭·긴 별칭의 원장 일치 여부를
  다시 계산한 최종 구조 감사 보고서. 자동 구조 감사는 통과했지만 고객
  승인 claim은 0개이며 사람 검증 전에는 발행하지 않는다.
- `generated/TRAIT_MAP_32_CONTENT_QUALITY_AUDIT_V2.json`:
  장별 실제 정보량, 근거 장 제외 본문, 반복·임시 문구, 근거 추적,
  한 글자 이웃 80쌍을 코드별로 다시 검사한 기계 판독용 내용 감사
- `generated/TRAIT_MAP_LATTICE_RECONCILIATION_QUEUE_V2.json`:
  288개 공통 상황·관찰 슬롯에서 ENAKQ 계보와 IRGMC 계보가 만든
  1,032개 문장 변형을 축 기여와 코드 조합별로 묶은 재조정 검토 큐
- `generated/TRAIT_MAP_AXIS_CONTRIBUTION_CANDIDATES_V2.json`:
  기존 직접 축 비교와 문장 속 행동 단서를 분리해 기록하고, 새 의미 축과
  복합축 가능성을 신뢰도·근거·원문 계보와 함께 제안한 288개 연구용 후보
- `generated/TRAIT_MAP_AXIS_CLASSIFICATION_AUDIT_V2.json`:
  후보 명세의 288개 완전성, 원문·근거 계보 일치, 기존 축 유실, 과도한
  다축 후보와 미분류 슬롯을 기계 판독용으로 기록한 자동 감사
- `generated/TRAIT_MAP_FINAL_AXIS_DECISIONS_V2.json`:
  기존 직접 축, 미분류 103개 판독, 새 후보 63개 오탐 검토를 합쳐
  288개 슬롯의 연구용 최종 축·합성 모드·필수 전문 검토를 기록한 manifest
- `generated/TRAIT_MAP_CANONICAL_DRAFTING_QUEUE_V2.json`:
  713개 축 조합마다 실제 사용된 원문 후보, 코드 커버리지, 대표 연구 초안,
  계보 병합 필요 여부를 기록한 문장 작성 큐
- `generated/TRAIT_MAP_RECOMPOSITION_DRY_RUN_AUDIT_V2.json`:
  32개 코드의 9,216개 canonical 참조와 80개 한 글자 이웃을 건식 생성해
  예상하지 않은 변화와 축 양쪽 동일 문장 충돌을 기록한 감사
- `generated/TRAIT_MAP_LINEAGE_MERGE_SEMANTIC_AUDIT_V2.json`:
  같은 축 서명에 두 계보 문장이 모인 695개 조합을 모두 비교해 방향별
  재작성·정보 보존 합성·유사 표현 확인으로 분류하고 원문·근거·위험 영역을
  보존한 전문가 검토 패킷
- `generated/TRAIT_MAP_CANONICAL_AUTHORING_WORKFLOW_V2.json`:
  72개 상황의 네 채널과 모든 축 서명을 함께 작성하도록 12개 묶음으로 나누고,
  713개 표준 문장의 의미 분해·7개 전문 검토·32개 재조합·발행 게이트를 잠근
  연구용 작성 작업 흐름
- `generated/TRAIT_MAP_32_MASTER_COMPLETENESS_REAUDIT_V2.json`:
  32개 원장의 파일·구조·실제 설명량·편집 핵심·장별 깊이·반복·이웃 구조와
  새 canonical 의존성을 한 번에 다시 검사하고 코드별 정확한 보강 항목을
  기록한 최신 완전성 재감사
- `generated/TRAIT_MAP_32_PROFILE_NAME_FINAL_AUDIT_V2_1.json`:
  32개 짧은·긴 별칭의 고유성, 길이, 성향군, 원장 일치, 능력·예측 오해를
  전수 검사하고 4개 긴 별칭과 INGKQ 짧은 별칭을 보완한 이름 감사
- `generated/TRAIT_MAP_CUSTOMER_PUBLICATION_READINESS_V2.json`:
  결과 요약·성향지도 상세·비교·프로필·공유 카드별 허용 정보와 금지 정보를
  분리하고 canonical·원장·별칭·재조합·문장 승인 게이트의 현재 준비도를
  계산한 고객 발행 차단 보고서
- `generated/TRAIT_MAP_CANONICAL_RESEARCH_DRAFT_CAB_01_V2.json`:
  첫 6개 상황의 축 방향별 원문을 손실 없이 원자 문장 블록으로 조립하고,
  방향상 제외한 계보 원문과 이유까지 보존한 첫 canonical 연구 초안 묶음
- `generated/TRAIT_MAP_CANONICAL_PREFLIGHT_CAB_01_V2.json`:
  첫 묶음 101개 조합의 출처 추적·원문 계산·선택 방향·비공개 범위·
  과장·진단·회피 표현을 자동 검사하고, 정보 보존 합성 및 한 글자 이웃
  동일 출력의 전문 교정 큐를 기록한 사전검수
- `generated/TRAIT_MAP_CANONICAL_SEMANTIC_RESOLUTION_CAB_01_V2.json`:
  서로 다른 두 원문을 억지로 합치지 않고 결과 요약용 core와 성향지도
  상세용 nuance로 구조화하며, 한 글자 이웃이 같은 문장 블록을 공유하는
  24개 변형만 표적 축 교정 큐로 격리한 의미 보존 원장
- `review/TRAIT_MAP_TARGETED_AXIS_REWRITE_CAB_01_V2.json`:
  한쪽 방향에만 고유 문단이 있는 12개 이웃 쌍을 E/I·R/N·G/A·K/M·C/Q
  기준으로 진단하고, 같은 claim·같은 축 방향의 추적 가능한 기존 문장만
  보강 후보로 제공하는 표적 교정 패킷
- `review/TRAIT_MAP_TARGETED_AXIS_REWRITE_DECISIONS_CAB_01_V2.json`:
  12개 이웃 쌍의 공유 문장을 어느 방향에 남길지, 어떤 문단을 계보로
  보존할지, G·I·C·Q 네 문단을 어떤 기존 근거 후보에서 다시 쓸지 기록한
  내부 편집 결정 원장
- `generated/TRAIT_MAP_CANONICAL_CORRECTED_DRAFT_CAB_01_V2.json`:
  12개 이웃 쌍 양쪽에 고유 문단을 갖추고 잘못 연결된 원문은 이유와 함께
  계보로 보존하며 네 개의 근거 제한 방향 문단을 적용한 첫 교정 초안
- `generated/TRAIT_MAP_CANONICAL_RECOMPOSITION_AUDIT_CAB_01_V2.json`:
  교정한 첫 묶음을 32개 코드의 768개 claim 참조로 다시 조합하고 80개
  한 글자 이웃에서 해당 축 claim만 바뀌며 양쪽 고유 문단이 유지되는지
  확인한 재조합 안전성 감사
- `generated/TRAIT_MAP_CANONICAL_RECOMPOSITION_AUDIT_CAB_01_V2_1.json`:
  최종 축 결정 v2.1로 줄어든 93개 canonical 변형을 32개 코드의 768개
  claim 참조로 다시 조합하고, 수정된 G/A·C/Q 범위가 이웃 코드에
  의도한 항목만 바꾸는지 확인한 재조합 안전성 감사
- `generated/TRAIT_MAP_CANONICAL_ALL_BATCH_AUDIT_V2.json`:
  12개 묶음의 72개 상황·288개 슬롯·713개 canonical 변형과 32개 코드
  9,216개 참조를 통합하고, 960개 묶음별 이웃 검사를 모두 통과했는지
  확인한 전체 구조 감사
- `generated/TRAIT_MAP_CANONICAL_ALL_BATCH_AUDIT_V2_1.json`:
  최종 축 결정과 CAB-01 P0 교정을 반영한 705개 canonical 변형을 12개
  묶음과 32개 코드의 9,216개 참조로 통합하고, 960개 묶음별 이웃 검사를
  다시 통과했는지 확인한 v2.1 전체 구조 감사
- `generated/TRAIT_MAP_32_PROFILE_CANONICAL_REBASE_V2.json`:
  32개 성향 원장에 문장을 복사하지 않고 713개 canonical 콘텐츠 ID를
  9,216번 참조하도록 전환하며, 역할형 이름과 공식 10글자 언어 release를
  함께 잠근 정식 기준선 manifest
- `generated/TRAIT_MAP_32_PROFILE_CANONICAL_REBASE_V2_1.json`:
  최종 축 결정과 CAB-01 P0 교정을 반영한 705개 canonical 콘텐츠를 32개
  성향 원장이 9,216번 참조하도록 전환하고, 역할형 이름과 공식 10글자
  언어 release를 함께 잠근 v2.1 기준선 manifest
- `generated/TRAIT_MAP_CANONICAL_CONTENT_LEDGER_V2.json`:
  713개 canonical 콘텐츠마다 version·출처·교정 계보·7개 역할 검토·
  실증 검증·허용 화면·금지 화면·승인·철회·롤백 상태를 분리해 관리하는
  정식 콘텐츠 원장
- `generated/TRAIT_MAP_CANONICAL_CONTENT_LEDGER_V2_1.json`:
  705개 canonical 콘텐츠마다 version·출처·교정 전후·7개 역할 검토·
  실증 검증·허용 화면·철회·롤백 상태를 저장하고, CAB-01의 21개 내부
  교정 문장은 version 2로 분리한 v2.1 정식 콘텐츠 원장
- `25_SEVEN_ROLE_CONTENT_REVIEW_CONTRACT_V2.md`:
  성격심리·심리측정·연구방법·쉬운 한국어·안전·제품·데이터 품질의
  독립 판정 기준과 승인·수정·보류·반려 및 issue code를 잠근 검토 계약
- `generated/TRAIT_MAP_SEVEN_ROLE_REVIEW_QUEUE_V2.json`:
  713개 canonical 콘텐츠를 수정 위험과 계보 복잡도에 따라 정렬하고
  자동 검사와 전문 검토를 분리한 전체 검토 큐
- `review/TRAIT_MAP_SEVEN_ROLE_REVIEW_CAB_01_V2.json`:
  첫 101개 콘텐츠의 원문·교정·축 차이·자동 검사 자료를 미리 채우고,
  7개 역할의 독립 판정을 기록할 수 있게 만든 첫 검토 작업장
- `review/TRAIT_MAP_SEVEN_ROLE_REVIEW_CAB_01_V2_1.json`:
  최종 축 결정에 맞춘 93개 콘텐츠를 다시 큐에 올리고, 표적 교정 16개와
  축 수정으로 새로 합쳐진 8개를 P0로 분리해 이전 축 의미의 잔존 여부부터
  확인하도록 만든 v2.1 검토 작업장
- `generated/TRAIT_MAP_SEVEN_ROLE_REVIEW_QUEUE_V2_1.json`:
  정식 v2.1 원장의 705개 콘텐츠를 새 문단·표적 축 교정·축 수정 합성,
  다중 원문, 단일 원문 순으로 정렬하고 7개 역할 판정과 실증 검증을
  분리한 전체 검토 큐
- `generated/TRAIT_MAP_INFERRED_AXIS_SCOPE_AUDIT_V2_1.json`:
  원래 통제되지 않았지만 문장 비교로 추가된 133개 축을 공식 축 범위,
  양방향 출력, source purity, 상황 적합성으로 전수 검사하고 최종 의미
  기준선을 잠그기 전에 별도 검토하도록 만든 감사
- `review/TRAIT_MAP_INFERRED_AXIS_SCOPE_REVIEW_QUEUE_V2_1.json`:
  133개 추론 축을 유지·제거·근거 보류로 판정하면서 양방향·반대 근거·
  검토자 계보를 기록하는 연구용 검토 작업장
- `review/TRAIT_MAP_INFERRED_AXIS_SCOPE_INTERNAL_SCREEN_P0_V2_1.json`:
  공식 범위 위험이 큰 추론 축 48개의 양방향 문장을 직접 대조해 유지 후보
  19개·제거 제안 25개·상황 정의 보류 4개로 나눈 내부 구성개념 사전검토
- `review/TRAIT_MAP_INFERRED_AXIS_SCOPE_INTERNAL_SCREEN_P1_P2_V2_1.json`:
  나머지 추론 축 85개의 양방향 문장을 축 계약과 함께 읽어 유지 후보
  57개·제거 제안 28개로 나누고 축별 오분류 이유를 기록한 내부 사전검토
- `review/TRAIT_MAP_SEVEN_ROLE_INTERNAL_SCREEN_CAB_01_P0_V2.json`:
  CAB-01 최우선 24개를 문장 의미까지 다시 읽어 4개 검토 이동·16개 수정·
  4개 구성개념 보류로 나눈 내부 다학제 사전검토 원장
- `review/TRAIT_MAP_SEVEN_ROLE_INTERNAL_SCREEN_CAB_01_P0_V2_1.json`:
  최종 축 결정 후 P0 24개를 다시 읽어 제거한 축 의미의 잔존, 축 오염,
  중복·모호한 한국어를 찾고 교정 21개와 역할 검토 준비 3개를 분리한
  내부 사전검토 원장
- `generated/TRAIT_MAP_CANONICAL_P0_REVISED_DRAFT_CAB_01_V2_1.json`:
  P0 사전검토에서 수정이 필요했던 21개 문장을 공식 축 범위와 쉬운
  한국어에 맞게 다시 쓰고, 이전 문장·근거·수정 이유를 되돌릴 수 있게
  보존한 연구용 교정 초안
- `generated/TRAIT_MAP_CANONICAL_RECOMPOSITION_AUDIT_CAB_01_P0_REVISED_V2_1.json`:
  P0 21개 문장 교정 뒤에도 32개 코드의 768개 참조와 80개 한 글자 이웃
  구분이 정확히 유지되는지 다시 확인한 교정 후 재조합 감사
- `review/TRAIT_MAP_AXIS_DECISION_AMENDMENT_CAB_01_V2.json`:
  일반 선택 attention의 G/A와 새 만남 response의 C/Q가 통제 비교가 아닌
  단어 단서로 추가된 문제를 기록하고 두 축 제거를 제안한 연구용 수정안
- `generated/TRAIT_MAP_AXIS_AMENDMENT_IMPACT_CAB_01_V2.json`:
  두 축 수정 시 canonical 713개가 705개로 정리되면서도 32개 프로필의
  9,216개 설명 슬롯이 유지되는지 검증한 미적용 영향 감사
- `generated/TRAIT_MAP_FINAL_AXIS_DECISIONS_V2_1.json`:
  기존 v2 판단 계보를 보존하면서 두 오분류 축을 제거하고 288개 claim과
  705개 canonical 변형을 다음 연구 초안의 새 기준선으로 잠근 manifest
- `generated/TRAIT_MAP_CANONICAL_DRAFTING_QUEUE_V2_1.json`:
  v2.1 축 판정으로 705개 정규 문장 후보와 출처 계보를 다시 묶은 작성 큐
- `generated/TRAIT_MAP_RECOMPOSITION_DRY_RUN_AUDIT_V2_1.json`:
  705개 후보를 32개 코드의 9,216개 claim 참조로 건식 재조합하고
  한 글자 이웃 80쌍의 예상 변화만 유지되는지 확인한 감사
- `generated/TRAIT_MAP_LINEAGE_MERGE_SEMANTIC_AUDIT_V2_1.json`:
  v2.1의 다중 원문 691개 조합을 의미 보존 합성·방향 교정·유사 표현으로
  다시 분류하고 잘못 제거한 G/A·C/Q 서명이 남지 않았는지 확인한 패킷
- `generated/TRAIT_MAP_CANONICAL_AUTHORING_WORKFLOW_V2_1.json`:
  705개 정규 변형을 72개 상황·288개 claim·12개 작성 묶음으로 다시
  편성하고 CAB-01을 93개 변형으로 교정한 작성·검토 workflow
- `generated/TRAIT_MAP_CANONICAL_RESEARCH_DRAFT_CAB_01_V2_1.json`:
  CAB-01의 93개 변형을 v2.1 축 판정에 맞춰 원문 단위로 다시 조립하고
  제거한 분기 원문도 근거 계보에서 잃지 않도록 보존한 연구 초안
- `generated/TRAIT_MAP_CANONICAL_PREFLIGHT_CAB_01_V2_1.json`:
  CAB-01 v2.1 93개 변형의 출처·원문 계산·개인정보·과장·진단·모호한
  표현을 다시 검사하고 남은 의미 교정 대상을 산출한 자동 사전검수
- `generated/TRAIT_MAP_CANONICAL_SEMANTIC_RESOLUTION_CAB_01_V2_1.json`:
  51개 다중 원문을 결과 요약 core와 성향지도 nuance로 보존하고 남은
  8개 이웃 쌍·16개 변형만 표적 축 교정으로 격리한 의미 구조
- `review/TRAIT_MAP_TARGETED_AXIS_REWRITE_CAB_01_V2_1.json`:
  남은 8개 이웃 쌍을 공식 10글자 뜻으로 다시 구성하고 C/Q를 말하기·행동
  속도로 오해하지 못하도록 금지 해석까지 포함한 표적 교정 패킷
- `review/TRAIT_MAP_TARGETED_AXIS_REWRITE_DECISIONS_CAB_01_V2_1.json`:
  canonical ID와 축이 정확히 같은 기존 결정 8개만 계승하고 제거한 RO·ER
  결정 4개와 잘못 쓴 C/Q 문단을 감사 계보로 퇴역시킨 결정 원장
- `generated/TRAIT_MAP_CANONICAL_CORRECTED_DRAFT_CAB_01_V2_1.json`:
  CAB-01 93개 변형에 유효한 8개 축 교정만 적용하고 I 방향 새 문단 1개와
  모든 제외 계보를 보존한 v2.1 표적 교정 초안
- `16_NUANG_10_SYMBOL_PUBLIC_LANGUAGE_V1.md`:
  E·I·R·N·G·A·K·M·C·Q를 한 글자만 들어도 기억하고 말할 수 있도록
  공식 기억 이름·정확한 뜻·앱 표기·금지 해석을 확정한 공용 언어 계약
- `review/TRAIT_MAP_AXIS_SEMANTIC_REVIEW_A_V2.json`:
  자동으로 축을 정하지 못한 103개 슬롯의 원문을 직접 대조해 최소 의미 축
  또는 축 없음·공통 문장 병합으로 판독한 연구용 내부 검토 원장
- `review/TRAIT_MAP_AXIS_SEMANTIC_REVIEW_B_V2.json`:
  자동으로 새 축을 제안한 63개 슬롯을 다시 읽어 제안 채택·오탐 제거·
  더 직접적인 대체 축을 기록하고 원문 변형 수의 식별 한계를 적용한 검토 원장

## v2.2 재구축 기준선

v2.2는 v2.1에서 문장 비교만으로 더해졌던 133개 추론 축을 다시 판독해,
공식 축 뜻을 직접 설명하지 못한 53개와 구성개념 보류 4개를 개인화
콘텐츠에서 제외한 기준선이다.

- 최종 축 결정: 288개 claim 슬롯, 추론 축 76개 유지·53개 제거·4개 보류
- canonical 콘텐츠: 705개에서 611개로 정리
- 32개 성향 참조: 9,216개 유지
- 한 글자 이웃 검사: 12개 CAB에서 960/960 통과
- `COMMON`: 55개를 연구 계보로만 보존하고 개인 결과·비교·프로필·공유에서 차단
- P0: 실노출 후보 110개 중 COMMON 30개 차단, 개인화 80개 내부 판독 완료
- P1: 483개 중 개인화 458개 사전검수, 추론 축 156개를 17개 묶음으로
  전수 판독 완료(유지 70·교정 74·축 범위 제거 12)
- 현재 승인 상태: 내부 `research_only`; 독립 역할 승인 0, 사용자 승인 0

핵심 문서:

- [`50_FINAL_AXIS_DECISIONS_V2_2.md`](./50_FINAL_AXIS_DECISIONS_V2_2.md):
  추론 축 최종 유지·제거·보류 판정
- [`51_CANONICAL_DRAFTING_DRY_RUN_AUDIT_V2_2.md`](./51_CANONICAL_DRAFTING_DRY_RUN_AUDIT_V2_2.md) ~
  [`59_CANONICAL_RECOMPOSITION_AUDIT_CAB_12_V2_2.md`](./59_CANONICAL_RECOMPOSITION_AUDIT_CAB_12_V2_2.md):
  611개 canonical 작성·계보·표적 교정·12개 묶음 재조합 감사
- [`60_CANONICAL_ALL_BATCH_AUDIT_V2_2.md`](./60_CANONICAL_ALL_BATCH_AUDIT_V2_2.md) ~
  [`63_SEVEN_ROLE_REVIEW_QUEUE_V2_2.md`](./63_SEVEN_ROLE_REVIEW_QUEUE_V2_2.md):
  전체 구조·32개 성향 참조·콘텐츠 원장·7개 역할 검토 큐
- [`64_P0_SENTENCE_PREFLIGHT_V2_2.md`](./64_P0_SENTENCE_PREFLIGHT_V2_2.md) ~
  [`71_P0_INDEPENDENT_REVIEW_EVIDENCE_PACKET_V2_2.md`](./71_P0_INDEPENDENT_REVIEW_EVIDENCE_PACKET_V2_2.md):
  P0 사전검수·내부 교정·COMMON 노출 계약·재조합·독립 검토 증거 패킷
- [`72_P1_SENTENCE_PREFLIGHT_V2_2.md`](./72_P1_SENTENCE_PREFLIGHT_V2_2.md) ~
  [`76_P1_INFERRED_AXIS_INTERNAL_SCREEN_BATCH_02_V2_2.md`](./76_P1_INFERRED_AXIS_INTERNAL_SCREEN_BATCH_02_V2_2.md):
  P1 사전검수·17개 판독 묶음·현재 누적 교정과 재조합 감사

현재 기준선 전체를 다시 검사하려면 아래 한 명령을 사용한다.

```bash
npm run research:trait-map:v2:v2-2-current:check
```

## v2.3 현재 연구 기준선

v2.3은 v2.2 P1 전수 판독에서 발견한 업무 맥락의 일반 작업
지원·자원 요청 6개에 G/A를 적용하지 않도록 범위를 바로잡고, 그 결과를
32개 성향 전체에 다시 조합한 기준선이다.

- 최종 축 결정: P1 범위 수정 6개, canonical 611개에서 605개로 정리
- 32개 성향 참조: 9,216개 유지
- 묶음별 한 글자 이웃 검사: 12개 CAB에서 960/960 통과
- 전체 성향 한 글자 이웃 검사: 80/80 통과
- `COMMON`: 61개를 연구 계보로 보존하고 모든 개인화 화면에서 차단
- v2.2 내부 교정 안전 이관: P0 73개 + P1 74개 = 147개
- P2 자동 표시 43개 수동 판독: 어휘 사전 오탐 유지 29개·축 선명도
  교정 14개
- 교정 후 원장: 605개, 동일 출력 0, 위험 표현 0, COMMON 노출 위반 0
- 최종 독립 검토 큐: P0 162·P1 298·P2 84·COMMON 61
- P0: 11개 검토 묶음, P1: 원문 596개를 131개 claim 그룹·14개 묶음,
  P2: 84개 중 54개 위험 기반 층화 표본과 57/57 필수 층 커버리지
- 구조적 근거 추적: 605/605 통과, 고위험 관계·업무 문장 460/460에
  등록 근거 2개 이상 연결(실제 연구 독립성과 의미 범위 승인은 별도)
- 인지 면담: 347개 단위·952회 노출·103개 세션 슬롯을 계획했으나
  배정·완료 참여자는 0명
- 정량 검증: 60문항·10세부 성향 분석 계약, Monte Carlo 공학 하네스,
  순서형 CFA runner와 합성 fixture를 준비했으나 실제 분석은 0건
- 근거 독립성 감사: 고위험 460개 중 독립 출처 확인 0개, 전체 605개
  canonical의 2,939개 finding 연결을 맥락 수준에서 재감사
- 맥락 감사: 동일 맥락 1,618개, 미확립 맥락 전이 1,321개,
  동일 맥락 finding이 없는 문장 101개를 16개 상황군으로 분리
- P0 직접 검증 준비: 우선 6개 모듈·24개 핵심 응답 단위·영향 문장
  60개를 잠그고, 개인정보 최소 10개 테이블 계약과 합성 fixture 검증
- 합성 안전 경로: 불일치 96개는 분석 입력 0개로 차단, 합성 합의 뒤
  96개 입력만 개방, null 80개는 모두 무신호, 강한 양성처럼 만든
  40개 조합도 문장 지지·수정·발행 0에서 차단
- 32개 장문 원고: 모두 5만 자 이상, 총 2,352,502자, 현재 내용 gate 32/32
- 최종 완료 감사: 연구 원장 요구사항 10/10 통과, 차단 0
- 재현 manifest: 312개 산출물 해시, 전체 157개 생성·검사 명령
- 현재 승인 상태: 연구 원장 `RESEARCH_MASTER_V2_3_COMPLETE`;
  고객 발행은 별도 검증 전까지 allowlist 0

핵심 문서:

- [`93_FINAL_AXIS_DECISIONS_V2_3.md`](./93_FINAL_AXIS_DECISIONS_V2_3.md):
  업무 일반 지원 6개의 G/A 범위 수정과 605개 canonical 확정
- [`94_CANONICAL_DRAFTING_DRY_RUN_AUDIT_V2_3.md`](./94_CANONICAL_DRAFTING_DRY_RUN_AUDIT_V2_3.md) ~
  [`105_CANONICAL_CONTENT_LEDGER_V2_3.md`](./105_CANONICAL_CONTENT_LEDGER_V2_3.md):
  v2.3 canonical 작성·12개 묶음·32개 성향 재조합·기본 원장
- [`106_REVIEWED_LEDGER_SAFE_MIGRATION_RECOMPOSITION_AUDIT_V2_3.md`](./106_REVIEWED_LEDGER_SAFE_MIGRATION_RECOMPOSITION_AUDIT_V2_3.md) ~
  [`110_P2_AUTOMATED_PREFLIGHT_V2_3.md`](./110_P2_AUTOMATED_PREFLIGHT_V2_3.md):
  기존 교정 안전 이관·COMMON 차단·독립 검토 큐·P0 패킷·P2 자동 사전검수
- [`111_P2_FLAGGED_INTERNAL_SCREEN_V2_3.md`](./111_P2_FLAGGED_INTERNAL_SCREEN_V2_3.md):
  P2 자동 표시 43개의 의미 판독과 14개 교정 결정
- [`112_P2_SCREENED_LEDGER_RECOMPOSITION_AUDIT_V2_3.md`](./112_P2_SCREENED_LEDGER_RECOMPOSITION_AUDIT_V2_3.md):
  14개 교정 적용 뒤 32개 성향·80개 이웃·중복·안전·COMMON 재감사
- [`113_INDEPENDENT_REVIEW_QUEUE_POST_P2_V2_3.md`](./113_INDEPENDENT_REVIEW_QUEUE_POST_P2_V2_3.md) ~
  [`116_P1_INDEPENDENT_REVIEW_PACKET_V2_3.md`](./116_P1_INDEPENDENT_REVIEW_PACKET_V2_3.md):
  최종 검토 우선순위, P0 외부 패킷, P2 층화 표본, P1 원문 보존 패킷
- [`117_EVIDENCE_TRACE_AUDIT_V2_3.md`](./117_EVIDENCE_TRACE_AUDIT_V2_3.md) ~
  [`123_VALIDITY_ARGUMENT_V2_3.md`](./123_VALIDITY_ARGUMENT_V2_3.md):
  근거 ID 추적, 운영 발행 차단, 인지 면담·독립 검토 계약, 제품 주장별
  타당도 논증
- [`124_QUANTITATIVE_VALIDATION_PLAN_V2_3.md`](./124_QUANTITATIVE_VALIDATION_PLAN_V2_3.md) ~
  [`128_SYNTHETIC_ORDINAL_FIXTURE_V2_3.md`](./128_SYNTHETIC_ORDINAL_FIXTURE_V2_3.md):
  60문항 정량 계획, 개인정보 최소 분석 입력, 공학적 Monte Carlo,
  순서형 통계 엔진·식별 감사와 합성 입력 fixture
- [`129_CURRENT_BASELINE_MANIFEST_V2_3.md`](./129_CURRENT_BASELINE_MANIFEST_V2_3.md):
  현재 수치·승인·차단 게이트와 312개 산출물 SHA-256 manifest
- [`130_REVIEW_AND_COGNITIVE_IMPORT_CONTRACT_V2_3.md`](./130_REVIEW_AND_COGNITIVE_IMPORT_CONTRACT_V2_3.md) ~
  [`132_REVIEW_IMPORT_VALIDATOR_V2_3.md`](./132_REVIEW_IMPORT_VALIDATOR_V2_3.md):
  검토·인지 면담 판정 import, revision 영향 재조합, fail-closed 검증
- [`133_EVIDENCE_DEPENDENCE_AUDIT_V2_3.md`](./133_EVIDENCE_DEPENDENCE_AUDIT_V2_3.md) ~
  [`140_P0_BACKGROUND_SOURCE_EXTRACTION_V2_3.md`](./140_P0_BACKGROUND_SOURCE_EXTRACTION_V2_3.md):
  출처·저자·표본 중복과 finding 범위·맥락 전이 감사, P0 배경 근거 추출
- [`141_P0_OPPOSITE_DIRECTION_DISCRIMINATION_AUDIT_V2_3.md`](./141_P0_OPPOSITE_DIRECTION_DISCRIMINATION_AUDIT_V2_3.md) ~
  [`145_P0_DIRECT_VALIDATION_MODULE_SPEC_V2_3.md`](./145_P0_DIRECT_VALIDATION_MODULE_SPEC_V2_3.md):
  반대 방향 문장 구별 감사, 605개 전체 맥락 감사, 16개 gap 우선순위와
  6개 직접 검증 모듈
- [`146_P0_DIRECT_VALIDATION_DATA_CONTRACT_V2_3.md`](./146_P0_DIRECT_VALIDATION_DATA_CONTRACT_V2_3.md) ~
  [`151_P0_POSITIVE_SYNTHETIC_BOUNDARY_RUN_V2_3.md`](./151_P0_POSITIVE_SYNTHETIC_BOUNDARY_RUN_V2_3.md):
  개인정보 최소 데이터 계약, 합성 fixture·실패 차단·준비 경로·null·
  양성 경계 시험
- [`160_DATA_CENTER_DEFINITION_OF_DONE_V2_3.md`](./160_DATA_CENTER_DEFINITION_OF_DONE_V2_3.md):
  사용자 참여 검증 전 연구 원장이 끝나는 정확한 조건과 고객 발행 검증의 경계
- [`161_DATA_CENTER_FINAL_COMPLETION_AUDIT_V2_3.md`](./161_DATA_CENTER_FINAL_COMPLETION_AUDIT_V2_3.md):
  연구 원장 요구사항 10개, 전체 재현성, 19개 핵심 증거 해시를 고정한 최종 감사

현재 기준선 전체 157개 재현 검사를 다시 실행하려면 아래 한 명령을
사용한다.

```bash
npm run research:trait-map:v2:v2-3-current:check
```

## 코드 계약

- `src/features/nuang-code/trait-map-data-center-v2.ts`
- `src/features/nuang-code/trait-map-data-center-v2.test.ts`
- `src/features/nuang-code/trait-map-scenario-validation-v2.ts`
- `src/features/nuang-code/trait-map-scenario-axis-contribution-v2.ts`
- `src/features/nuang-code/trait-map-scenario-axis-contribution-v2.test.ts`
- `src/features/nuang-code/trait-map-scenario-canonical-composition-v2.ts`
- `src/features/nuang-code/trait-map-scenario-canonical-composition-v2.test.ts`
- `src/features/nuang-code/trait-map-content-publication-contract-v2.ts`
- `src/features/nuang-code/trait-map-content-publication-contract-v2.test.ts`

검증:

```bash
npm run research:trait-map:v2:check
npm run research:trait-map:v2:direct-derived:check
npm run research:trait-map:v2:remaining-batch1:check
npm run research:trait-map:v2:remaining-batch2:check
npm run research:trait-map:v2:remaining-batch3:check
npm run research:trait-map:v2:remaining-batch4:check
npm run research:trait-map:v2:all-32-audit:check
npm run research:trait-map:v2:content-quality-audit:check
npm run research:trait-map:v2:lattice-reconciliation:check
npm run research:trait-map:v2:axis-contribution-candidates:check
npm run research:trait-map:v2:axis-classification-audit:check
npm run research:trait-map:v2:final-axis-decisions:check
npm run research:trait-map:v2:canonical-drafting-queue:check
npm run research:trait-map:v2:lineage-merge-audit:check
npm run research:trait-map:v2:canonical-authoring-workflow:check
npm run research:trait-map:v2:master-reaudit:check
npm run research:trait-map:v2:name-final-audit:check
npm run research:trait-map:v2:publication-readiness:check
npm run research:trait-map:v2:canonical-draft-batch1:check
npm run research:trait-map:v2:canonical-preflight-batch1:check
npm run research:trait-map:v2:canonical-semantic-resolution-batch1:check
npm run research:trait-map:v2:targeted-axis-rewrite-batch1:check
npm run research:trait-map:v2:canonical-corrected-draft-batch1:check
npm run research:trait-map:v2:canonical-recomposition-batch1:check
npm run research:trait-map:v2:canonical-all-batch-audit:check
npm run research:trait-map:v2:canonical-profile-rebase:check
npm run research:trait-map:v2:canonical-content-ledger:check
npm run research:trait-map:v2:seven-role-review-queue:check
npm run research:trait-map:v2:seven-role-internal-screen-cab1:check
npm run research:trait-map:v2:axis-amendment-impact-cab1:check
npm run research:trait-map:v2:final-axis-decisions-v2-1:check
npm run research:trait-map:v2:canonical-drafting-queue-v2-1:check
npm run research:trait-map:v2:lineage-merge-audit-v2-1:check
npm run research:trait-map:v2:canonical-authoring-workflow-v2-1:check
npm run research:trait-map:v2:canonical-draft-batch1-v2-1:check
npm run research:trait-map:v2:canonical-preflight-batch1-v2-1:check
npm run research:trait-map:v2:canonical-semantic-resolution-batch1-v2-1:check
npm run research:trait-map:v2:targeted-axis-rewrite-batch1-v2-1:check
npm run research:trait-map:v2:targeted-axis-decisions-v2-1:check
npm run research:trait-map:v2:canonical-corrected-draft-batch1-v2-1:check
```

## 제작 순서

1. 데이터 계약과 연구 기준 잠금
2. 기존 ENAKQ를 v2 기준으로 이관
3. ENAKQ와 반대 기준점인 IRGMC 제작
4. 두 기준점에서 한 글자만 다른 10개 제작
5. 나머지 20개를 5개씩 네 묶음으로 제작
6. 묶음마다 중복·모순·근거·인지·정량 게이트 실행
7. 승인된 콘텐츠 조각만 제품 DB와 화면에 발행

## 현재 운영 원칙

- 길이가 5만 자를 넘었다는 이유만으로 승인하지 않는다.
- 역할형 이름을 채점 근거나 능력의 증거로 사용하지 않는다.
- 대표 코드만으로 처음 드는 생각이나 실제 반응을 추정하지 않는다.
- 관계 문구는 관계 맥락 신호 없이는 개인화하지 않는다.
- 고객 문구는 경향을 분명하게 설명하되, 근거의 불확실성은 내부 상태와
  근거 화면에서 관리한다.
- 같은 의미는 하나의 `contentKey`로 관리하고 한 화면에 반복하지 않는다.
