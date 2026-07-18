# NUANG MVP 측정·제품 재기준화

작성일: 2026-07-17 KST  
상태: `MVP_REBASELINE_V1_APPLIED`  
적용 범위: 고객 공개 MVP, 코어 검사, 뉴앙 코드, 리포트, 코드 지도, 공유·피드·비교  
원칙: 앱 셸의 구현 완료와 고객에게 신뢰할 수 있는 성향 결과를 제공할 준비 완료를 구분한다.

UI 복귀 원본: [NUANG_ITEM_DESIGN_TO_UI_UX_RETURN_PLAN.md](./NUANG_ITEM_DESIGN_TO_UI_UX_RETURN_PLAN.md)

## 0. 점검 결론

현재 앱은 홈·검사·피드·마이·공유·비교 등 MVP 제품 셸이 상당 부분 구현됐다. 그러나 runtime은 기존 코드 체계 `S/T · C/V · F/O · D/A · P/E`와 provisional 문항·50점 분할 채점을 사용하고, 최근 승인한 측정 설계는 `E/I · R/N · G/A · K/M · C/Q`다.

따라서 지금 상태를 고객 공개 release candidate로 취급하면 안 된다.

- 내부 UX 시뮬레이션·자동 테스트: 계속 가능
- 기존 runtime을 사용한 고객 공개 MVP: `NO_GO_LEGACY_MEASUREMENT`
- 신규 기능·홈 장식·피드 확장: 측정 spine보다 우선하지 않음
- 전 코어 M04 키트: 150개 후보를 8개 검토자 슬롯 × 50문항 × 3회로 나눈 blind packet, 응답 hash·잠금 검증, 자동 집계 도구와 [6개 내부 AI 역할 dry-run](./NUANG_M04_INTERNAL_AI_BLIND_CRITIQUE_REPORT.md)까지 완성했으나 실제 사람 전문가의 독립 검토는 아직 시작 전
- 고객 공개 MVP: 전 5영역 최소 검증, 새 코드 release, versioned migration, 핵심 사용자 흐름, 정책·보안 게이트를 통과한 제한 베타로 정의

## 1. MVP와 장기 검증의 경계

### 고객 공개 MVP 전에 필요한 것

1. 다섯 코드 자리와 모든 공개 facet의 정의가 승인돼 있다.
2. 전 영역 후보 문항이 다양한 일상 장면과 HIGH/LOW 방향을 포함한다.
3. 통합 blind 전문가 검토에서 target·방향·인접 성향 오염을 확인한다.
4. 실제 2030 사용자가 상황·질문·응답 척도를 의도대로 이해하는지 반복 검증한다.
5. 사전 설계된 정량 파일럿으로 문항 선택, 구조, 최소 신뢰도, 경계 처리를 결정한다.
6. 빠른 코어는 `예비 결과`, 정밀 코어는 `대표 코드`라는 주장 범위를 데이터로 정한다.
7. 점수→코드→리포트 문구가 하나의 불변 release로 추적된다.
8. 새 코드 체계가 앱·DB·공유·피드·비교에 versioned migration으로 반영된다.
9. 핵심 사용자 여정과 개인정보·법률·RLS·접근성·rollback 게이트를 통과한다.

### 제한 베타 이후 계속할 것

- 더 큰 독립 표본의 확인 분석
- 재검사 안정성과 장기 drift
- 하위집단 측정동일성·DIF의 확대 검증
- 무료 주제 검사의 대표 코드 반영 가중치
- 추천·개인화·코드별 피드 통계의 정교화
- 유료 상세검사, 그룹 검사, 32개 전체 캐릭터 확장

제한 베타는 검증을 생략하는 명칭이 아니다. 최소 검증을 통과한 release를 좁은 대상에게 먼저 공개하고, 불확실성과 자기이해용 비진단 범위를 명확히 알리는 단계다.

## 2. 재정렬한 MVP 실행 순서

| 순서 | Gate        | 작업                         | 완료 조건                                    | 제품 처리                   |
| ---: | ----------- | ---------------------------- | -------------------------------------------- | --------------------------- |
|    0 | `RBL-00`    | 제품·측정 재기준화           | legacy runtime과 고객 release를 구분         | 완료                        |
|    1 | `RBL-01`    | M03 전 코어 후보 은행 완성   | SE·OE·RO·SM·ER 후보·set audit·전체 seam map  | 완료                        |
|   2A | `UIX-00~04` | UI/UX 설계 복귀              | S03부터 골든 여정·전반 화면을 한 개씩 승인   | UIX-01D·02 localhost 검토   |
|   2B | `RBL-02~04` | 전문가 검토·인지 인터뷰      | 통합 blind review와 실제 모바일 runner 검증  | 내부 dry-run 완료·외부 대기 |
|    3 | `RBL-05`    | M06·M07 최소 정량 파일럿     | 문항·구조·신뢰도·교차오염·공정성 기준 통과   | 승인된 prototype 사용       |
|    4 | `RBL-06`    | M08·M09 scoring/copy/name release | 불확실성·경계·quick/full·32코드 이름·문구 추적 승인 | release ID 발행             |
|    5 | `RBL-07`    | 코드·DB versioned migration  | 새 글자·사전·점수·역사 결과 공존 및 rollback | 기존 결과 자동 변환 금지    |
|    6 | `RBL-08~09` | 승인 UI production binding   | 골든 여정과 연결 화면이 승인 release만 사용  | provisional 공개 차단       |
|    7 | `RBL-10`    | 출시 게이트                  | 정책·OAuth·RLS·privacy·a11y·성능·RC smoke    | 제한 베타 GO/NO-GO          |

RBL-01이 끝나면 UI/UX 작업으로 즉시 복귀한다. M04·M05·M06을 모두 마칠 때까지 화면 설계를 멈추지 않는다. 다만 새 코드에 의존하는 결과·지도·공유·비교의 최종 데이터와 production 문구는 `RBL-06` 이후에 잠근다.

신규 32개 코드 이름은 [신규 뉴앙 32코드 이름 설계·검증 계획](./NUANG_NEW_32_PROFILE_NAMING_PLAN.md)을 따른다. 실제 앱 binding 전 legacy 이름 lookup을 먼저 차단하고, 결과 리포트 UI 구현과 함께 후보 이름을 설계한다. 최종 이름 release는 M05 사용자 언어 검토와 M06·M07 구조 검증 뒤 `RBL-06`에서 잠근다.

## 3. 바로 다음 작업

상위 단계 `RBL-01`은 완료됐다. `RBL-01A` SE, `RBL-01B` RO, `RBL-01C` SM, `RBL-01D` ER 후보 감사와 `RBL-01E` 전 5영역 통합 seam 감사를 완료했다. `RBL-01E-R1`에서 사용자 승인 3G·3A를 RO-EC v0.5에 병합했으며, 150개 연구 후보는 HIGH/LOW 75/75, 주력/탐색 100/50, 완전 중복 0개를 통과했다. G/A 처음 생각 주점수 후보는 6G·6A, 주력 8·탐색 4다. M04 전 코어 전문가 검토 키트는 생성·자동 검증을 마쳤고, 응답 원본 hash·Stage 2 공개 순서·허용 값 검증과 자동 집계 도구도 준비됐다. 6개 내부 AI 역할의 Stage 1·2 1,800행 dry-run에서 문항 위험과 RO-EC direction codebook 누락을 발견했으며 이는 외부 타당도 근거에 합산하지 않는다. 실제 사람 전문가의 독립 검토 응답과 판정은 아직 시작 전이다. UIX-01D 검사 runner와 UIX-02 정밀 검사 소개 화면은 localhost 제품 검토 상태다. 정량 검증 전에는 새 G/A·K/M·C/Q와 과정 코드를 고객에게 발급하지 않는다.

2026-07-18 사용자 승인 A안에 따라 G/A는 RO-EC의 `원인·해결이 먼저 보임 ↔ 상대 마음이 먼저 보임` 관계 주의 방향만 뜻한다. RO-RN은 G/A에 합산하지 않는 본인 전용 상세 신호로 `DET-RO-RN` 별도 트랙에 둔다. 공개 K/M은 EP+OS를 의미 기준선으로 유지하며 SM-RL은 독립성·추가 설명력·비낙인성 확인 전에는 합산하지 않는다. ER 공개 코어는 일상적인 감정 동요와 걱정·주저만 다루고 최근 상태를 비채점 문맥으로 분리한다. 우울·위기·자살 위험 선별은 검증된 별도 도구와 대응 경로 전에는 코어에 포함하지 않는다.

1. 완료 — 승인된 SE 두 후보 은행의 set 균형 감사를 수행한다.
2. 완료 — 승인된 [RO 24문항 감사 A안](./NUANG_M03_RO_TWO_FACET_MULTILAYER_SET_BALANCE_AUDIT.md)을 반영하고 RBL-01B 코어 재감사를 통과했다.
3. 완료 — [SM 2/3-facet 36문항 감사](./NUANG_M03_SM_TWO_VS_THREE_FACET_SET_BALANCE_AUDIT.md) 권장안을 승인하고 RBL-01C를 닫았다.
4. 완료 — [ER 24문항 안전·세트 감사](./NUANG_M03_ER_TWO_FACET_SAFETY_AND_SET_BALANCE_AUDIT.md)와 두 후보 은행의 의미·상태·임상 방화벽을 승인했다.
5. 완료 — [전 5영역 통합 seam·상황·문구 효과 감사](./NUANG_M03_ALL_DOMAIN_INTEGRATED_SEAM_AND_METHOD_AUDIT.md)와 RO 주점수 후보 3G·3A 보강 범위를 승인했다.
6. 완료 — [RO-EC G/A 주점수 후보 보강](./NUANG_M03_RO_EC_CORE_REDUNDANCY_REPAIR.md)의 여섯 문구를 승인했다.
7. 완료 — 공식 후보 은행 v0.5 병합과 150개 자동 재감사를 통과했다.
8. 완료 — `UIX-00` 화면 상태 계약과 S03-R 빠른·정밀 공통 검사 runner v3 UI/UX를 구현하고 localhost 검토 단계로 옮겼다.
9. 완료 — [전 코어 M04 blind review 키트](./NUANG_M04_FULL_CORE_EXPERT_REVIEW_EXECUTION_KIT.md)를 생성하고 150개 후보·75개 짝·8개 검토자 슬롯·24개 Stage 1 packet과 [응답 수신·잠금·자동 집계 계약](./NUANG_M04_REVIEW_INTAKE_AND_LOCK_SPEC.md)의 검증을 통과했다.
10. 완료 — [내부 AI blind critique v0.1](./NUANG_M04_INTERNAL_AI_BLIND_CRITIQUE_REPORT.md)의 6개 역할 × 150개 × Stage 1·2를 잠금 실행하고, 우선 차단 5개·seam 6개·RO-EC direction protocol 결함을 확인했다.
11. 다음 — v0.2 direction anchor와 위험 판정 계약을 고정한 뒤 실제 독립 검토자가 Stage 1 세 회차를 모두 완료·잠금하고 Stage 2와 판정을 수행한다. UIX owner 검토는 이 연구선과 병행하되 운영 seed·DB는 변경하지 않는다.

OE M04 packet은 폐기하지 않는다. 재현 가능한 익명화·무작위화·Stage 1 잠금 구조를 전 코어 M04 설계의 기술 템플릿으로 재사용했다. 전 코어 키트 제작 완료는 외부 내용타당도 검증 완료가 아니며, 독립 응답·판정 전에는 전체 뉴앙 코드를 승인하지 않는다.

## 4. MVP 기능 우선순위

### P0 — 고객 가치와 신뢰에 직접 필요

- 첫 방문 온보딩과 검사 진입
- 빠른 코어와 간단 리포트
- 정밀 코어와 상세 리포트
- 진행 저장·이탈 복구·판단 어려움·접근성
- 승인된 뉴앙 코드와 코드 지도
- 홈 복귀와 하나의 다음 행동
- 결과 저장·삭제·공개 범위·summary-only 공유
- 법률·개인정보·RLS·운영 rollback

### P1 — MVP 정체성에 필요하지만 측정 spine 뒤에 잠금

- 피드의 기본 읽기·글·질문·밸런스 게임
- 공개 프로필과 1:1 비교
- 제한된 코드별 익명 통계
- 무료 주제 검사의 독립 결과

### P2 — 제한 베타 이후

- 무료 주제 결과의 대표 코드 자동 갱신
- 고급 추천·랭킹·장기 변화 분석
- 그룹 검사·유료 상세검사
- 32개 전체 캐릭터 제작과 대규모 gamification

이미 구현된 P1 기능은 삭제하지 않고 동결한다. 새 측정 release와 연결될 때까지 fixture 기반 내부 QA 표면으로 취급한다.

## 5. 데이터·코드 마이그레이션 원칙

- 문항, 상황 라벨, 응답 척도, scoring, code dictionary, report copy에 각각 version을 둔다.
- 결과에는 사용한 `measurement_release_id`를 저장한다.
- legacy 결과는 해당 release와 함께 보존하고 새 코드로 자동 재해석하지 않는다.
- 새 결과와 legacy 결과를 피드 통계·비교에서 섞지 않는다.
- 변환이 필요한 경우 사용자 동의와 재검사 필요 여부를 별도 결정한다.
- migration은 dry-run·dual-read 검증·rollback 뒤에 운영 write를 연다.
- DB 필드와 API 계약은 `RBL-06` 승인 전에 미리 설계할 수 있지만 `published` release로 열지 않는다.

## 6. 출시 하드 게이트

다음 중 하나라도 참이면 고객 공개 MVP는 `NO-GO`다.

- runtime이 legacy 코드 사전과 provisional 문항을 공식 결과처럼 사용함
- 측정 release ID 없이 대표 뉴앙 코드를 발급함
- 빠른 결과와 정밀 결과의 권위 차이가 정의되지 않음
- 경계 응답을 근거 없이 한 글자로 확정함
- 무료 주제 검사 하나가 검증 없이 대표 코드를 바꿈
- provisional 결과가 공개 프로필·공유·피드·비교로 전파됨
- 직접 응답·원점수·민감 정보의 공개 차단이 검증되지 않음
- 정책·OAuth·RLS·moderation·rollback 게이트가 열리지 않음

## 7. 작업 선택 규칙

새 작업을 시작할 때 아래 순서로 판단한다.

1. `RBL-01`~`RBL-10` 중 현재 열린 gate를 직접 닫는가?
2. 고객의 첫 검사 완료 또는 결과 신뢰를 높이는가?
3. 다른 화면에 반복 사용되는 기반 계약인가?
4. 지금 하지 않으면 출시를 막는가?

네 질문에 모두 `아니오`인 기능은 MVP 이후 backlog로 보낸다. 현재 gate를 건너뛰어 후속 화면만 완성하지 않는다.
