# M04 전 코어 문항 판정 가이드

문서 버전: `m04-core-expert-kit.v0.1`  
사용 시점: 모든 유효 Stage 1·2 잠금과 사전등록 집계 뒤

## 1. 판정 순서

1. protocol deviation과 reviewer 포함·제외를 먼저 확정한다.
2. target first mapping과 동일 비target seam을 본다.
3. 방향 혼동과 `UNCLEAR` 근거를 본다.
4. 관련성·명확성·단일 반응성·보편성·척도 적합성 분포를 본다.
5. 능력·접근·교육·직업·관계·문화·임상·사회적 바람직성 위험을 본다.
6. fatal risk와 소수 의견을 다수 의견보다 먼저 논의한다.
7. 공개·조건부·과정·비공개 역할의 적합성을 따로 판정한다.
8. item 결정과 revision 수준을 기록한다.
9. 마지막에만 전체 세트의 영역·facet·상황·방향 균형을 확인한다.

## 2. 최종 상태

| 상태                   | 의미                                     | 다음 행동                       |
| ---------------------- | ---------------------------------------- | ------------------------------- |
| `PASS_TO_COGNITIVE`    | 현재 문구로 실제 사용자 이해 검토 가능   | M05 연구 form                   |
| `COPY_REVISE`          | target 유지, 쉬운 말·범위·부정·척도 수정 | 새 revision 후 M05              |
| `CONSTRUCT_REWRITE`    | 상황·반응이 다른 구성개념을 주로 측정    | major revision, 제한 M04 재검토 |
| `HOLD_FOR_ACCESS`      | 접근·노출·생활조건이 내용 판단을 지배    | 대체 상황 설계 후 재검토        |
| `HOLD_FOR_RISK_REVIEW` | 한 명 이상이 치명 위험 근거를 제시함     | 원문 반론 우선 검토 후 판정     |
| `EXCLUDE_OR_REBUILD`   | 현재 문구로 의도한 해석 지지 어려움      | retire 또는 새 candidate        |

## 3. score role 별 추가 판정

- `CORE_BASELINE`: 대표 코드 근거 후보로 유지 가능한가?
- `CONDITIONAL_MAIN`: SM-RL이 EP·OS와 구분되고 K/M에 추가 설명력을 줄 가능성이 있는가?
- `PROCESS_PROFILE_MODIFIER`: 대표 G/A와 섞지 않고 실제 나타나는 반응 보조층으로 설명 가능한가?
- `PRIVATE_DETAIL_RESEARCH`: RO-RN을 본인 전용 상세로 보여도 낙인·도덕 평가·공개 위험이 없는가?

역할이 맞지 않으면 문항 문구가 명확해도 현재 역할로 통과시키지 않는다.

## 4. revision

| 수준          | 예                       | ID                         | 재검증         |
| ------------- | ------------------------ | -------------------------- | -------------- |
| patch         | 오탈자·띄어쓰기          | revision 증가              | lint·기록      |
| minor         | 쉬운 동사·범위·부정 표현 | 같은 candidate 새 revision | M05 필수       |
| major         | 상황·표적 반응 변경      | 같은 계보 major revision   | 제한 M04 + M05 |
| new candidate | target·방향 변경         | 새 ID                      | M03부터        |
| retire        | 사용 중단                | ID 재사용 금지             | 이유 보존      |

## 5. 금지 shortcut

- Stage 2 관련성이 높다는 이유로 낮은 blind mapping을 무시
- 목표를 몰라서 reviewer가 틀렸다고 해석
- 한 건의 접근성·낙인 위험을 표가 적다고 삭제
- 빠른·정밀 문항 수를 맞추려고 낮은 품질 문항 통과
- E/I·R/N·G/A·K/M·C/Q의 글자 호감도를 문항 타당성으로 오해
- HIGH/LOW 한 방향에만 부정·제한·순서어가 몰린 상태 유지
- major revision에 기존 평정을 재사용
- 내부 AI 합의를 실제 사용자·정량 검증으로 표현

합의되지 않으면 억지로 `PASS`하지 않고 필요한 추가 증거와 반대 의견을 남긴다.
