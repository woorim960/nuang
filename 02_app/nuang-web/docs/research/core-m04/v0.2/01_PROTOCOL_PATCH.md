# M04 전 코어 blind review protocol v0.2 보정

작성일: 2026-07-18 KST  
상태: `V0_2_SM_RL_R3_M05_MOBILE_PARTICIPANT_PREVIEW_READY_NOT_RUN`  
protocol: `m04-core-expert-kit.v0.2-draft`  
근거: [내부 AI blind critique v0.1](../../../NUANG_M04_INTERNAL_AI_BLIND_CRITIQUE_REPORT.md)

## 1. 이번 보정 범위

v0.1 원본과 hash는 수정하지 않는다. v0.2는 실제 사람 전문가에게 새 packet을 제공하기 전에 다음 두 계약만 보정한다.

1. Stage 1의 12개 facet에 `HIGH/LOW` 중립 방향 앵커를 제공한다.
2. 우선 차단 5개와 seam 6개의 revision·retire 계보를 고정한다.

운영 앱, 검사 seed, 채점, 코드 발급, 리포트 문구, DB는 변경하지 않는다.

## 2. direction anchor 계약

machine-readable 원본은 [02_DIRECTION_ANCHORS.csv](./02_DIRECTION_ANCHORS.csv)다.

- 공개 코드 글자는 Stage 1에 노출하지 않는다.
- `HIGH/LOW`는 좋고 나쁨, 건강함, 능력의 높고 낮음을 뜻하지 않는다.
- 검토자는 문장이 어느 방향의 반복 반응을 나타내는지만 판단한다.
- `UNCLEAR`를 허용하며 가장 가까운 방향으로 억지 분류하지 않는다.
- 특히 RO-EC는 `HIGH = 상대 마음·안녕 먼저`, `LOW = 원인·사건·해결 먼저`로 고정한다.

## 3. item revision 계약

machine-readable 원본은 [03_ITEM_REVISION_REGISTER.csv](./03_ITEM_REVISION_REGISTER.csv)다.

- `RETIRE`는 기존 ID를 다시 사용하지 않는다.
- `MAJOR_REVISION`은 기존 원문 평정을 승계하지 않고 제한 blind review를 새로 수행한다.
- target이나 keyed direction이 바뀌면 같은 ID를 재사용하지 않고 새 candidate를 발급한다.
- draft 문구는 M05나 운영 앱에 바로 넣지 않는다.
- critical과 seam이 겹치는 항목도 register에는 한 행만 두고 두 flag를 함께 기록한다.

## 4. v0.2 packet 적용 규칙

1. v0.1 `generated` 폴더를 덮어쓰지 않는다.
2. v0.2 전용 output root와 새 manifest hash를 사용한다.
3. reviewer brief에는 direction anchor의 비가치 원칙을 포함한다.
4. Stage 1 세 회차가 모두 잠기기 전 target·key·Stage 2를 공개하지 않는다.
5. `HOLD_FOR_RISK_REVIEW`는 한 명 이상의 구체적인 fatal risk 근거가 있을 때 자동 triage 우선 상태로 둔다.
6. RO-EC direction은 v0.1 값을 재사용하지 않고 v0.2 새 응답으로만 집계한다.

## 5. 완료 조건

- [x] 12개 facet의 HIGH/LOW 앵커가 하나씩 존재한다.
- [x] RO-EC 방향이 중립적인 한국어로 명시됐다.
- [x] 우선 차단 5개가 revision register에 포함됐다.
- [x] seam 6개가 revision register에 포함됐다.
- [x] 중복을 제거한 9개 후보의 계보 결정이 존재한다.
- [x] 관련 계약 검사 통과
- [x] 수정 후보 8개용 v0.2 제한 packet 생성·v0.1과 별도 보관
- [x] 내부 AI 전문 역할 6개의 Stage 1 응답 48행 수집·hash 잠금 (`INTERNAL_CRITIQUE`)
- [x] 내부 AI 전문 역할 6개의 Stage 2 응답 48행 수집·hash 잠금 (`INTERNAL_CRITIQUE`)
- [x] 수정 후보 8개 내부 집계·불일치 판정 (`INTERNAL_CRITIQUE`)
- [x] 판정에 따른 수정 대상 5개 문항 초안·계보·잔여 위험 기록
- [x] `SMRL-C11-r3` 제한 M04 blind 재검토 packet·lock template 생성
- [x] copy revision 4개 M05 자연 응답 form·probe·log·판정 template 생성
- [x] participant-facing target 비노출·문항 계보·SHA-256 manifest 계약 검사
- [x] `SMRL-C11-r3` 내부 AI 전문 역할 6개 Stage 1 독립 응답·hash 잠금
- [x] `SMRL-C11-r3` 역할별 Stage 2 공개·독립 응답 6개·hash 잠금
- [x] `SMRL-C11-r3` 잠금 응답 집계·소수 의견 보존·`PASS_TO_COGNITIVE` 내부 판정
- [x] `SMRL-C11-r3`과 필수 5개 위험 probe를 M05 5문항 자료에 추가
- [x] M05 참가자용 target 비노출·기록 열·판정 열·manifest 계약 검사
- [x] M05 5문항 개발 전용 모바일 참가자 화면·메모리 응답·비채점 완료 화면 연결
- [x] 운영 IndexedDB·채점·코드 발급·결과 경로 격리 검사

## 6. 다음 게이트

관련 계약 검사를 통과한 수정 후보 8개를 [별도 generated 폴더](./generated)에 고정했다. 이 packet은 전체 150문항 M04가 아니라 major revision 7개와 새 후보 1개의 제한 재검토용이다. 제외 1개는 검토자 packet에 넣지 않고 내부 결정 파일에만 보존했다.

내부 AI 전문 역할 6개의 Stage 1·2 각 48행은 검증·hash 잠금을 마쳤다. Stage 2는 Stage 1 전체 잠금과 hash 재검증 뒤에만 역할별로 공개했다. 잠긴 응답을 집계한 내부 판정은 `PASS_TO_COGNITIVE` 3개, `COPY_REVISE` 4개, `CONSTRUCT_REWRITE` 1개다. 판정에 따른 새 초안 5개는 [05_POST_ADJUDICATION_ITEM_DRAFTS.csv](./05_POST_ADJUDICATION_ITEM_DRAFTS.csv)에 기록했다. `SMRL-C11-r3` 제한 M04 packet과 copy revision 4개용 M05 자료는 [post-adjudication](./post-adjudication)에 생성했다. SMRL Stage 1·2 내부 blind 응답 각 6개도 공개 선후관계 검증과 hash 잠금을 마쳤다. 잠긴 SMRL 응답은 target·방향 6/6 일치, fatal risk 0건, KEEP 4·COPY_REVISE 2로 집계되어 `PASS_TO_COGNITIVE`로 내부 판정했다. 이후 SMRL 문항과 필수 5개 위험 probe를 더해 M05를 5문항 자료로 갱신하고, 운영 검사와 격리된 개발 전용 모바일 참가자 화면에 연결했다. 다음 단계는 자연 응답 뒤 진행자가 공통·전용 probe를 기록하는 내부 화면을 연결하는 것이다. 결과는 계속 `INTERNAL_CRITIQUE`로 분리하며 외부 전문가·실제 사용자 근거로 표현하지 않는다. 이 packet 생성과 내부 검토만으로 M04·M05·문항 타당도·운영 release를 승인하지 않는다.

재현 명령:

```bash
node scripts/generate-core-m04-v02-targeted-kit.mjs
node scripts/generate-core-m04-v02-targeted-kit.mjs --check
```
