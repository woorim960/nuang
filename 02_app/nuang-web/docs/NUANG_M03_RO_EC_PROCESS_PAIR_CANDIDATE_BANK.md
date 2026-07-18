# NUANG M03-RO-EC 다층 process pair·G/A 주점수 후보 문항 은행

작성일: 2026-07-18 KST  
문서 상태: `OWNER_APPROVED_G_A_CORE_REDUNDANCY_V5`  
측정 상태: `PROVISIONAL_NOT_FOR_SCORING_OR_RELEASE`  
후보 은행 버전: `m03-ro-ec-process-pairs.v0.5`  
대체 대상: `m03-ro-ec-process-pairs.v0.4`, `m03-ro-ec-candidates.v0.1`  
구성개념 기준: `m01-ro-relational-attention.v2.0`  
프로필 모델 기준: `multilayer-trait-response-profile.v0.2`  
응답 형식 기준: `conditional-frequency-ko-v1-provisional`  
이번 단계에서 하지 않는 일: 빠른·정밀 최종 문항 선정, 경계·가중치 확정, G/A 발급, seed·DB·운영 화면 변경

관련 문서:

- [NUANG_MULTILAYER_TRAIT_RESPONSE_PROFILE_MODEL.md](./NUANG_MULTILAYER_TRAIT_RESPONSE_PROFILE_MODEL.md)
- [NUANG_M03_RO_EC_CANDIDATE_ITEM_BANK.md](./NUANG_M03_RO_EC_CANDIDATE_ITEM_BANK.md)
- [NUANG_M01_RO_CONSTRUCT_DEFINITION.md](./NUANG_M01_RO_CONSTRUCT_DEFINITION.md)
- [NUANG_M02_ITEM_AND_RESPONSE_SPEC.md](./NUANG_M02_ITEM_AND_RESPONSE_SPEC.md)
- [NUANG_DETAIL_REACTION_CODE_COMMUNICATION_SPEC.md](./NUANG_DETAIL_REACTION_CODE_COMMUNICATION_SPEC.md)
- [NUANG_M03_RO_TWO_FACET_MULTILAYER_SET_BALANCE_AUDIT.md](./NUANG_M03_RO_TWO_FACET_MULTILAYER_SET_BALANCE_AUDIT.md)
- [NUANG_M03_RO_EC_CORE_REDUNDANCY_REPAIR.md](./NUANG_M03_RO_EC_CORE_REDUNDANCY_REPAIR.md)

> 2026-07-18 사용자 승인 A안에 따라 `REPORTED_FIRST_ORIENTATION` 후보는 대표 G/A의 핵심 증거, `ENACTED_RESPONSE` 후보는 관계 반응 흐름의 보조 층위로 검증한다. RO-RN은 G/A에 합산하지 않는다.

> 같은 날 사용자가 `RBL-01E-R1` 보강 문구 3G·3A를 승인했다. v0.5는 기존 처음 생각 3G·3A에 새 3G·3A를 합쳐 대표 G/A 주점수 후보를 6G·6A로 확장한다. 실제 반응 6개는 그대로 보조층이며 G/A 주점수에 합산하지 않는다.

## 0. v0.1에서 바꾼 핵심

v0.1은 감정·안녕에 가는 주의와 실제로 말을 걸거나 확인하는 행동이 같은 후보 풀에 섞여 있었다. 이 구조에서는 아래 사람을 정확히 설명하기 어렵다.

> 원인과 결과가 먼저 궁금하지만, 해결책부터 말하면 상대가 상할 수 있다고 생각해 마음을 먼저 확인하는 사람

v0.2는 같은 강도의 장면마다 두 층위를 분리한다.

```text
REPORTED_FIRST_ORIENTATION
최근 비슷한 상황에서 무엇이 먼저 눈에 들어오거나 떠오르는가

ENACTED_RESPONSE
최근 비슷한 상황에서 실제로 무엇을 말하거나 하는가
```

행동 이유는 1~5 문항에 넣지 않고, 두 층위 차이가 반복될 때 검사 마지막의 비채점 적응형 probe로 확인한다.

## 1. 후보 구성

| 구분                                        |  수 |
| ------------------------------------------- | --: |
| 처음 드는 생각 `REPORTED_FIRST_ORIENTATION` |  12 |
| 실제 나타나는 반응 `ENACTED_RESPONSE`       |   6 |
| HIGH 방향                                   |   9 |
| LOW 방향                                    |   9 |
| G 주점수 후보                               |   6 |
| A 주점수 후보                               |   6 |
| 주력 후보                                   |  12 |
| 탐색 후보                                   |   6 |
| 주력 process pair 문항                      |   8 |
| 경계 확인용 탐색 문항                       |   4 |

핵심 네 상황은 처음 드는 생각과 실제 나타나는 반응을 하나씩 연결한다. 최소 3개 상황에서 유효한 pair가 확보돼야 정밀 프로필 후보를 만들 수 있다.

R01~R03은 G/A 주점수의 탈락·수정 여유를 확보하기 위한 처음 생각 전용 matched pair다. 같은 상황의 G/A 후보를 비교하되 실제 한 form에는 함께 넣지 않는다. process profile의 입력·행동 pair 수를 늘리는 문항은 아니다.

## 2. 상황·process pair 설계

| pair ID    | 상황                             | 처음 드는 생각에서 볼 것            | 실제 나타나는 반응에서 볼 것           | 주요 오염 위험                 |
| ---------- | -------------------------------- | ----------------------------------- | -------------------------------------- | ------------------------------ |
| `ROEC-P01` | 해결할 문제와 감정이 함께 있음   | 원인·해결이 먼저 보이는가           | 해결을 말하기 전 마음을 확인하는가     | 문제 해결 능력·사회적 바람직성 |
| `ROEC-P02` | 힘들었던 일을 들음               | 상대 마음에 주의가 가는가           | 사건 정보부터 확인하는가               | OE 관점 탐색·경청 기술         |
| `ROEC-P03` | 함께 있던 사람이 지쳐 보임       | 상대 안녕이 신경 쓰이는가           | 상대가 먼저 말할 때까지 기다리는가     | RO-RN 경계·SE-AI·ER 걱정       |
| `ROEC-P04` | 덜 가까운 사람이 어려움을 말함   | 마음보다 사건이 먼저 궁금한가       | 자신의 생각 전 마음을 확인하는가       | 관계 거리·예의 규범            |
| `ROEC-P05` | 해결책을 묻지 않은 속상한 이야기 | 마음과 원인 중 자연스러운 관심 방향 | 해당 없음                              | OE·문제 중심 듣기              |
| `ROEC-P06` | 말이 끝난 뒤 해결 방법이 떠오름  | 해당 없음                           | 더 말할지 확인하거나 해결부터 말하는가 | 대화 기술·SE-AI·RO-RN          |

P01~P04는 주력 process pair다. P05는 처음 드는 생각 문구의 균형, P06은 실제 나타나는 반응 문구의 균형을 확인하는 탐색 쌍이다.

## 3. 후보 문항 전체표

아래 문장은 연구 후보이며 앱에 넣지 않는다. 같은 pair의 두 문항은 실제 검사에서 연속 제시하지 않는다.

| 후보 ID      | pair | 상황 라벨 `contextLabel`                                        | 질문 문장 `promptText`                                       | 층위                         | 방향   | 점수 역할             | 상태                    |
| ------------ | ---- | --------------------------------------------------------------- | ------------------------------------------------------------ | ---------------------------- | ------ | --------------------- | ----------------------- |
| `ROEC-P01-A` | P01  | 누군가 속상한 일과 해결할 문제를 함께 이야기할 때               | 원인과 해결할 부분이 먼저 눈에 들어온다.                     | `REPORTED_FIRST_ORIENTATION` | `LOW`  | `CORE_TRAIT_EVIDENCE` | `PRIMARY_COGNITIVE`     |
| `ROEC-P01-B` | P01  | 누군가 속상한 일과 해결할 문제를 함께 이야기할 때               | 해결 방법을 말하기 전에 상대가 어떤 마음인지 먼저 확인한다.  | `ENACTED_RESPONSE`           | `HIGH` | `PROFILE_MODIFIER`    | `PRIMARY_COGNITIVE`     |
| `ROEC-P02-A` | P02  | 누군가 힘들었던 일을 이야기할 때                                | 그 사람이 어떤 마음이었는지에 주의가 간다.                   | `REPORTED_FIRST_ORIENTATION` | `HIGH` | `CORE_TRAIT_EVIDENCE` | `PRIMARY_COGNITIVE`     |
| `ROEC-P02-B` | P02  | 누군가 힘들었던 일을 이야기할 때                                | 무슨 일이 있었는지부터 확인한다.                             | `ENACTED_RESPONSE`           | `LOW`  | `PROFILE_MODIFIER`    | `PRIMARY_COGNITIVE`     |
| `ROEC-P03-A` | P03  | 함께 있던 사람이 평소보다 지쳐 보일 때                          | 그 사람이 괜찮은지 자연스럽게 신경이 간다.                   | `REPORTED_FIRST_ORIENTATION` | `HIGH` | `CORE_TRAIT_EVIDENCE` | `PRIMARY_COGNITIVE`     |
| `ROEC-P03-B` | P03  | 함께 있던 사람이 평소보다 지쳐 보일 때                          | 상대가 먼저 말을 꺼내면 그때 이야기를 듣는다.                | `ENACTED_RESPONSE`           | `LOW`  | `PROFILE_MODIFIER`    | `PRIMARY_COGNITIVE`     |
| `ROEC-P04-A` | P04  | 가깝지는 않은 사람이 힘든 일을 꺼낼 때                          | 그 사람이 느낀 마음보다 일어난 일이 먼저 궁금해진다.         | `REPORTED_FIRST_ORIENTATION` | `LOW`  | `CORE_TRAIT_EVIDENCE` | `PRIMARY_COGNITIVE`     |
| `ROEC-P04-B` | P04  | 가깝지는 않은 사람이 힘든 일을 꺼낼 때                          | 내 생각을 말하기 전에 그 사람이 어떤 마음인지 먼저 확인한다. | `ENACTED_RESPONSE`           | `HIGH` | `PROFILE_MODIFIER`    | `PRIMARY_COGNITIVE`     |
| `ROEC-P05-A` | P05  | 누군가 해결책을 묻지 않고 속상한 일을 이야기할 때               | 그 사람이 느낀 마음을 더 들어보고 싶어진다.                  | `REPORTED_FIRST_ORIENTATION` | `HIGH` | `CORE_TRAIT_EVIDENCE` | `EXPLORATORY_COGNITIVE` |
| `ROEC-P05-B` | P05  | 누군가 해결책을 묻지 않고 속상한 일을 이야기할 때               | 이야기의 원인과 결과가 먼저 궁금해진다.                      | `REPORTED_FIRST_ORIENTATION` | `LOW`  | `CORE_TRAIT_EVIDENCE` | `EXPLORATORY_COGNITIVE` |
| `ROEC-P06-A` | P06  | 상대의 말이 끝난 뒤 해결 방법이 떠올랐을 때                     | 상대가 더 말하고 싶은지 확인한 뒤 내 생각을 말한다.          | `ENACTED_RESPONSE`           | `HIGH` | `RESEARCH_ONLY`       | `EXPLORATORY_COGNITIVE` |
| `ROEC-P06-B` | P06  | 상대의 말이 끝난 뒤 해결 방법이 떠올랐을 때                     | 떠오른 해결 방법부터 말한다.                                 | `ENACTED_RESPONSE`           | `LOW`  | `RESEARCH_ONLY`       | `EXPLORATORY_COGNITIVE` |
| `ROEC-R01-G` | R01  | 가까운 사람이 계획한 일이 뜻대로 되지 않았다고 메시지를 보낼 때 | 처음에는 어떻게 하면 일이 나아질지가 궁금해진다.             | `REPORTED_FIRST_ORIENTATION` | `LOW`  | `CORE_TRAIT_EVIDENCE` | `PRIMARY_COGNITIVE`     |
| `ROEC-R01-A` | R01  | 가까운 사람이 계획한 일이 뜻대로 되지 않았다고 메시지를 보낼 때 | 처음에는 그 사람이 지금 어떤 마음일지가 궁금해진다.          | `REPORTED_FIRST_ORIENTATION` | `HIGH` | `CORE_TRAIT_EVIDENCE` | `PRIMARY_COGNITIVE`     |
| `ROEC-R02-G` | R02  | 가깝지는 않은 사람이 힘든 일에 대한 내 의견을 물을 때           | 처음에는 그 일이 왜 생겼는지가 궁금해진다.                   | `REPORTED_FIRST_ORIENTATION` | `LOW`  | `CORE_TRAIT_EVIDENCE` | `EXPLORATORY_COGNITIVE` |
| `ROEC-R02-A` | R02  | 가깝지는 않은 사람이 힘든 일에 대한 내 의견을 물을 때           | 처음에는 그 사람이 어떤 마음이었는지가 궁금해진다.           | `REPORTED_FIRST_ORIENTATION` | `HIGH` | `CORE_TRAIT_EVIDENCE` | `EXPLORATORY_COGNITIVE` |
| `ROEC-R03-G` | R03  | 함께 준비한 일이 잘 풀리지 않았을 때                            | 처음에는 일이 어긋난 부분에 주의가 간다.                     | `REPORTED_FIRST_ORIENTATION` | `LOW`  | `CORE_TRAIT_EVIDENCE` | `PRIMARY_COGNITIVE`     |
| `ROEC-R03-A` | R03  | 함께 준비한 일이 잘 풀리지 않았을 때                            | 처음에는 함께한 사람들의 마음에 주의가 간다.                 | `REPORTED_FIRST_ORIENTATION` | `HIGH` | `CORE_TRAIT_EVIDENCE` | `PRIMARY_COGNITIVE`     |

## 4. 질문하신 유형을 어떻게 찾는가

아래 두 응답이 여러 상황에서 반복되는지 본다.

```text
P01-A 높은 동의
원인과 해결할 부분이 먼저 눈에 들어온다.

P01-B 높은 동의
해결 방법을 말하기 전에 상대가 어떤 마음인지 먼저 확인한다.
```

한 pair만으로 유형을 확정하지 않는다. P04와 다른 평행 상황에서도 다음 차이가 반복돼야 한다.

```text
처음 드는 생각: 원인·사건·해결 방향
실제 나타나는 반응: 마음을 먼저 확인하는 방향
```

조건이 충족되면 내부 프로필 후보는 `GOAL_ORIENTATION_ATTENTIVE_RESPONSE`다. 고객에게는 코드명 대신 다음처럼 설명한다.

> 해결할 부분이 먼저 눈에 들어오지만, 실제로는 상대의 마음을 먼저 확인하는 편이에요.

상대가 상할 수 있어서 그렇게 행동했다는 이유는 응답 패턴만으로 추론하지 않는다. 사용자가 별도 probe에서 직접 선택한 경우에만 다음 줄로 표시한다.

> 내가 직접 고른 이유: 내 말이 상대에게 미칠 영향을 고려해서

## 5. 문항별 핵심 감사

| 문항    | 필요한 이유                                       | 가장 큰 위험                             | 인지 인터뷰 확인                            | 현재 판정           |
| ------- | ------------------------------------------------- | ---------------------------------------- | ------------------------------------------- | ------------------- |
| P01-A   | 사용자 예시의 `원인·해결 먼저 보임`을 직접 측정   | 문제 해결 능력이 높다는 자기평가         | 능력이 아니라 관심 순서로 답하는가          | 유지                |
| P01-B   | 관심과 다른 실제 반응 순서를 분리                 | 따뜻한 사람이 정답처럼 보임              | 실제 행동 빈도로 답하는가                   | 유지·바람직성 검토  |
| P02-A   | 감정 상태에 가는 자연스러운 주의를 측정           | 감정 추론 정확도·OE 상상                 | 무엇에 주의했는지로 답하는가                | 유지                |
| P02-B   | 사건 정보부터 묻는 실제 반응을 측정               | 정보 확인과 무관심을 혼동                | 질문 순서만 기준으로 답하는가               | 유지                |
| P03-A   | 명시적 말 전 안녕에 가는 주의를 측정              | ER 걱정·관찰력                           | 짧은 관심과 반복 걱정을 구분하는가          | 유지                |
| P03-B   | 관심이 있어도 행동은 기다리는 패턴을 탐색         | 경계 존중·말 걸기 부담·SE-AI             | 기다린 이유를 점수에 섞지 않는가            | 유지·오염 위험 높음 |
| P04-A   | 친밀 의무가 약한 관계의 첫 생각을 확인            | 문화·관계 거리                           | 관계에 상관없이 반복되는가                  | 유지                |
| P04-B   | 덜 가까운 관계에서도 실제 반응을 확인             | 예의·사회적 기술                         | 실제 먼저 한 말의 순서로 답하는가           | 유지                |
| P05-A/B | 첫 생각 HIGH/LOW 문구를 같은 장면에서 경쟁        | 두 문항이 정답을 노출하고 기억 효과 생성 | form을 분리해 각각 이해 가능한가            | 탐색 유지           |
| P06-A/B | 행동 HIGH/LOW의 순수한 순서 차이를 비교           | 대화 기술·RO-RN·상황 긴급도              | 상대가 요청한 도움 여부가 응답을 지배하는가 | 탐색 유지           |
| R01-G/A | 가까운 사람의 메시지에서 해결·마음 첫 주의를 비교 | 친밀 의무·문자 해석·문제 해결 능력       | 관심 대상만 기준으로 답하는가               | 주력 유지           |
| R02-G/A | 명시적 의견 요청에서 원인·마음 첫 주의를 비교     | 요청이 G를 유도함·예의 규범              | 상황이 응답 방향을 지배하는가               | 탐색 유지           |
| R03-G/A | 공동 차질에서 어긋난 부분·사람 마음을 비교        | SM 실행·공동 책임·좋은 답 효과           | 능력·책임 대신 첫 주의로 답하는가           | 주력 유지           |

## 6. 방향·가치 계약

| 관찰 결과         | 허용되는 의미                            | 금지되는 의미                    |
| ----------------- | ---------------------------------------- | -------------------------------- |
| 원인·해결 첫 생각 | 사건 구조와 해결할 부분에 관심이 먼저 감 | 논리적, 똑똑함, 공감 능력 없음   |
| 마음·안녕 첫 생각 | 상대 감정 상태에 관심이 먼저 감          | 착함, 감정을 정확히 맞힘         |
| 마음 확인 행동    | 자신의 생각보다 상대 상태를 먼저 확인함  | 진심이 더 깊음, 관계 능력이 좋음 |
| 해결 제시 행동    | 상대 상태 확인보다 해결 내용을 먼저 꺼냄 | 냉정함, 실제 해결을 잘함         |

처음 드는 생각과 실제 나타나는 반응이 다르다고 가식·본성·가면으로 설명하지 않는다.

## 7. pair 제시 규칙

- 같은 pair의 A/B 문항은 최소 세 문항 이상 떨어뜨린다.
- 같은 문구 구조의 HIGH/LOW를 연속 제시하지 않는다.
- pair ID와 층위는 고객 화면에 노출하지 않는다.
- 질문 화면은 기존 `상황 라벨 + 단일 반응 + 조건부 빈도` 형식을 유지한다.
- 이유 probe는 문항 직후가 아니라 검사 끝에 최대 한 번 표시한다.
- `답하고 싶지 않아요`를 선택해도 결과를 불이익 처리하지 않는다.

## 8. 이유 probe 후보

trigger 후보:

```text
profile = GOAL_ORIENTATION_ATTENTIVE_RESPONSE
and valid_pair_count >= 3
and repeated_difference_count >= 2
and both_layer_reliability = eligible
```

고객 질문:

```text
해결할 부분이 먼저 보이지만 상대의 마음을 먼저 확인하는 데에는
어떤 이유가 가장 가까운가요?
```

선택지:

- 상대의 마음을 더 이해하고 싶어서
- 내 말이 상대에게 미칠 영향을 고려해서
- 문제를 정확히 이해한 뒤 말하고 싶어서
- 대화가 원활하게 이어지도록 하려고
- 상황과 사람에 따라 이유가 달라서
- 답하고 싶지 않아요

이유 응답은 `NON_SCORING_CONTEXT`이며 G/A, RO-EC, RO-RN 점수에 합산하지 않는다.

## 9. 빠른·정밀 사용 원칙

### 빠른 코어

- 승인된 처음 드는 생각 후보로 G/A 관계 주의 방향의 예비 증거를 수집한다.
- process pair가 3개 미만이면 다층 프로필을 고객에게 보여주지 않는다.
- 빠른 결과에 `생각은 해결로, 행동은 마음부터`를 확정 문구로 사용하지 않는다.

### 정밀 코어

- 최소 3개, 후보 단계에서는 4개 주력 process pair를 비교한다.
- 처음 드는 생각과 실제 나타나는 반응을 별도 잠재 점수 또는 별도 요약 점수로 검증한다.
- 두 층위 차이가 한 문항이 아니라 여러 상황에서 반복되는지 확인한다.
- 실제 나타나는 반응 profile modifier는 대표 G/A 코드를 바꾸는 증거로 자동 합산하지 않는다.
- 결과 리포트의 상세 설명은 두 층위 모두 신뢰도 기준을 통과할 때만 제공한다.

## 10. 판정과 사용자 승인 기록

| 항목                             | 판정                                  |
| -------------------------------- | ------------------------------------- |
| 처음 드는 생각·실제 반응 분리    | `OWNER_APPROVED`                      |
| 사용자가 제시한 패턴 식별 가능성 | `PASS_AS_VALIDATION_HYPOTHESIS`       |
| 행동 이유 직접 추론 차단         | `PASS`                                |
| 전체 9개 HIGH·9개 LOW 균형       | `PASS`                                |
| 대표 G/A 주점수 6G·6A 균형       | `PASS_OWNER_APPROVED_CANDIDATE_POOL`  |
| 관계 규범·도덕성·인접 facet 오염 | `REQUIRES_COGNITIVE_AND_BLIND_REVIEW` |
| 다층 프로필 경계·신뢰도          | `REQUIRES_PILOT`                      |
| 빠른·정밀 최종 문항              | `NOT_READY`                           |
| 운영 점수·DB·UI 사용             | `BLOCKED`                             |

2026-07-18 KST 사용자 승인으로 다음 항목을 확정했다.

1. `처음 드는 생각`과 `실제 나타나는 반응`을 분리하는 구조
2. 네 주력 상황 P01–P04와 두 탐색 쌍 P05–P06
3. 최소 3개 pair·2개 상황 반복 전에는 상세 패턴을 발급하지 않는 원칙
4. 행동 이유를 사용자가 직접 고른 비채점 정보로만 사용하는 원칙
5. 대표 G/A는 RO-EC 처음 드는 생각의 관계 주의 방향으로 검증하고 RO-RN을 합산하지 않는 원칙
6. R01~R03 처음 생각 전용 matched pair 3G·3A를 주점수 후보에 보강하는 문구
7. 보강 뒤 주점수 후보 6G·6A, 주력 8·탐색 4 구조와 같은 pair 비동시 제시 원칙

이 승인으로 운영 점수·DB·검사 화면은 변경하지 않는다. 관계 반응 흐름 `G → A`는 [NUANG_DETAIL_REACTION_CODE_COMMUNICATION_SPEC.md](./NUANG_DETAIL_REACTION_CODE_COMMUNICATION_SPEC.md)의 검증 게이트를 통과한 뒤에만 발급한다.
