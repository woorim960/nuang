# NUANG M02 공통 문항·응답 UX·데이터 사양

작성일: 2026-07-17 KST  
문서 상태: `M02_OWNER_APPROVED_BASELINE_RO_ALIGNED_V2`  
측정 상태: `PROVISIONAL_NOT_FOR_ITEM_RELEASE`  
적용 대상: 빠른 코어·정밀 코어·적응형 추가 문항  
선행 승인: `E/I · R/N · G/A · K/M · C/Q` 의미 계약과 `m01-ro-relational-attention.v2.0` 포함 M01 구성개념 명세  
이번 단계에서 하지 않는 일: 운영 문항 작성·승인, 점수 경계 확정, TypeScript seed 수정, DB migration 실행, 원격 DB 변경

관련 문서:

- [NUANG_FINAL_CODE_SEMANTIC_AUDIT.md](./NUANG_FINAL_CODE_SEMANTIC_AUDIT.md)
- [NUANG_CORE_MEASUREMENT_VALIDATION_PLAN.md](./NUANG_CORE_MEASUREMENT_VALIDATION_PLAN.md)
- [NUANG_S03_CORE_ASSESSMENT_RUNNER_DESIGN_SPEC.md](./NUANG_S03_CORE_ASSESSMENT_RUNNER_DESIGN_SPEC.md)
- [NUANG_S03_CONTEXT_LABEL_DB_MIGRATION_PLAN.md](./NUANG_S03_CONTEXT_LABEL_DB_MIGRATION_PLAN.md)

## 0. 이번 단계의 결론

모든 새 코어 문항은 아래의 한 가지 문법을 사용한다.

```text
상황 라벨: 여럿이 결정을 미루고 있을 때
질문 문장: 내가 먼저 선택지를 꺼낸다.

응답 기준: 이럴 때 내 모습은?
1 거의 그렇지 않아요
2 드문 편이에요
3 반반이에요
4 자주 그래요
5 거의 항상 그래요
```

핵심 결정:

- `contextLabel`에는 응답이 성립하는 중립적인 조건만 쓴다.
- `promptText`에는 그 상황에서 나타나는 한 가지 행동·생각·주의·감정 반응만 쓴다.
- 질문에서 상황을 반복하거나 `~하는 편이다`, `항상`, `자주` 같은 빈도 표현을 넣지 않는다.
- 응답은 추상적인 `나와 비슷함`보다 `비슷한 상황에서 얼마나 반복되는가`를 묻는 조건부 빈도를 우선한다.
- 3번 `반반이에요`는 유효한 중앙 응답이다. `잘 모르겠음`이나 결측으로 취급하지 않는다.
- `이 상황은 답하기 어려워요`는 1~5와 다른 정식 응답 상태이며 점수에 3점으로 넣지 않는다.
- 자연스럽게 먼저 가는 관심과 실제로 선택한 행동이 다를 수 있으므로 `responseLayer`와 점수 역할을 분리한다.
- 행동 이유는 일반 문항에 섞지 않고, 반복된 층위 차이가 있을 때 별도 비채점 적응형 probe로만 확인한다.
- 기존 20·60문항은 새 문법에 자동 승계하지 않고 M03 후보 은행에서 다시 심사한다.
- 문항 수보다 승인된 모든 세부 신호의 최소 증거량을 우선한다.

이 결정은 M03 후보 문항을 만들기 위한 사양이다. 이 문서의 예시는 문법을 설명하기 위한 것으로 운영·파일럿 문항이 아니다.

## 1. 왜 기존 문법을 바꾸는가

현재 문항은 아래와 같이 상황과 반응을 한 문장에 함께 넣는다.

```text
여러 사람이 결정을 못 내릴 때 선택지를 먼저 제안하는 편이다.
```

여기에 상황 라벨을 추가하면 같은 전제가 두 번 나타난다.

```text
여럿이 함께 결정할 때
여러 사람이 결정을 못 내릴 때 선택지를 먼저 제안하는 편이다.
```

문제:

- 사용자가 어디까지가 상황이고 어디부터가 평가 대상인지 다시 해석해야 한다.
- 라벨과 질문에 있는 조건이 미묘하게 다르면 서로 다른 장면을 떠올린다.
- `~하는 편이다`와 `내 모습이다` 응답이 의미상 반복된다.
- 정체성에 동의하는지와 실제 반복 반응이 얼마나 자주 나타나는지가 섞인다.
- 한 문장 안에 상황·행동·비교·빈도가 함께 들어가면 무엇에 답했는지 알기 어렵다.

새 문법은 아래처럼 역할을 분리한다.

```text
상황은 언제인가?     → contextLabel
그때 무엇을 관찰하는가? → promptText
얼마나 반복되는가?    → response format
```

## 2. 공통 응답 프레임

### 2.1 회상 기간

검사 시작 안내에서 한 번만 보여준다.

```text
최근 6개월 동안 비슷한 상황이 생겼을 때의 평소 모습을 떠올려 주세요.
특별히 잘됐거나 힘들었던 한 번보다, 반복해서 나타난 모습을 기준으로 답해 주세요.
```

규칙:

- 매 문항에서 `최근 6개월`을 반복하지 않는다.
- 최근 6개월 동안 상황을 경험하지 못했다면 억지로 추측하지 않고 `이 상황은 답하기 어려워요`를 선택한다.
- ER처럼 최근 상태 영향을 크게 받는 영역은 결과 단계에서 최근 2주 상태를 별도 질문으로 확인할 수 있다. 코어 문항에 임상 상태 질문을 섞지 않는다.
- 6개월 회상 기간 자체는 인지 인터뷰에서 3개월·6개월 표현을 비교한다. 변경 시 response format version을 새로 발행한다.

### 2.2 문항 화면의 짧은 기준

상황 라벨과 질문 아래, 응답 그룹 앞에 한 번 표시한다.

```text
이럴 때 내 모습은?
```

화면 읽기 도구는 아래를 하나의 질문으로 전달한다.

```text
여럿이 결정을 미루고 있을 때, 내가 먼저 선택지를 꺼낸다. 이럴 때 내 모습은?
```

### 2.3 5단계 응답

|  값 | 고객 문구          | 측정 의미                                        |
| --: | ------------------ | ------------------------------------------------ |
|   1 | 거의 그렇지 않아요 | 비슷한 상황에서 표적 반응이 거의 나타나지 않음   |
|   2 | 드문 편이에요      | 표적 반응이 드물게 나타남                        |
|   3 | 반반이에요         | 나타나는 경우와 그렇지 않은 경우가 비슷함        |
|   4 | 자주 그래요        | 표적 반응이 자주 나타남                          |
|   5 | 거의 항상 그래요   | 비슷한 상황에서 표적 반응이 거의 일관되게 나타남 |

주의:

- 1과 5를 `전혀/완전히`로 표현하지 않는다. 현실의 상황 차이를 허용한다.
- 3을 `보통이에요`로만 쓰지 않는다. 보통이 빈도·강도·사회 규범 중 무엇인지 모호하기 때문이다.
- 응답 순서는 모든 문항에서 1→5로 유지한다.
- 높은 코드 방향이 항상 5가 되지 않는다. `keyedDirection`에 따라 채점한다.
- 숫자는 화면에서 보조적으로만 사용할 수 있고, 고객은 문구를 보고 선택해야 한다.

### 2.4 왜 `내 모습과 비슷함`보다 조건부 빈도를 우선하는가

`매우 내 모습이다`는 짧고 익숙하지만 아래가 섞일 수 있다.

- 실제 반복 행동
- 되고 싶은 모습
- 자신에 대한 고정된 이미지
- 질문이 좋은 사람처럼 들리는 정도

조건부 빈도는 `같은 상황에서 반응이 얼마나 반복됐는가`에 초점을 맞춘다. 행동뿐 아니라 관심·생각·감정도 `관심이 간다`, `머릿속에 떠오른다`, `걱정이 반복된다`처럼 관찰 가능한 반응으로 작성한다.

다만 이 선택도 한국어 사용자에게 자동으로 최적이라는 뜻은 아니다. 인지 인터뷰에서 다음 두 형식을 무작위 또는 counterbalanced 방식으로 비교한다.

- A안: 조건부 빈도 — `거의 그렇지 않아요` ↔ `거의 항상 그래요`
- B안: 자기 유사성 — `전혀 내 모습 같지 않아요` ↔ `매우 내 모습 같아요`

채택 기준:

- 같은 문항을 비슷한 의미로 이해하는 비율
- 응답 이유를 실제 경험으로 설명하는 비율
- 중앙 응답과 판단 어려움의 구분
- 사회적으로 바람직한 자기소개로 답하는 정도
- 문항당 응답 시간과 주관적 부담

M02의 제품 권장안은 A안이다. 인지 인터뷰에서 명확히 불리하면 문구를 수정하되, 하나의 release 안에서 형식을 섞지 않는다.

## 3. `contextLabel` 작성 계약

### 3.1 역할

`contextLabel`은 모든 사람이 같은 종류의 장면을 떠올리도록 범위를 좁히는 조건이다. 성향의 방향이나 바람직한 반응을 알려주는 제목이 아니다.

좋은 구조:

```text
[일상적인 사건 또는 조건] + [~할 때 / ~한 뒤 / ~하는 자리에서]
```

예:

- `사람들과 함께 시간을 보낸 뒤`
- `익숙하지 않은 원리를 접했을 때`
- `계획이 예상과 다르게 흘러갈 때`
- `반복해서 쓰는 물건이나 자료를 둘 때`

### 3.2 길이와 형식

- 권장 8~24자, 최대 40자
- 한 줄 우선, 320px에서 최대 두 줄
- 질문형·마침표·느낌표를 사용하지 않음
- 고객 코드 글자·내부 영역·세부 신호 이름을 넣지 않음
- 시간·장소·관계 역할은 측정에 필요한 경우만 넣음
- `내가`, `나는`은 반응 문장에 두고 라벨에서 반복하지 않음

### 3.3 반드시 중립이어야 한다

사용하지 않는다:

- `배려가 필요한 상황에서`
- `침착해야 하는 순간에`
- `책임을 다해야 할 때`
- `창의적인 생각이 필요할 때`
- `용기를 내야 할 때`

이 표현들은 좋은 답의 방향을 미리 알려준다.

### 3.4 답변에 필요한 장면만 포함한다

좋지 않은 예:

```text
여러 사람이 결정을 못 내리고 모두가 답답해할 때
```

문제:

- `못 내리고`, `답답해할 때`가 상황 강도와 감정까지 추가한다.
- 사용자는 선택지 제안보다 문제 해결 필요성에 반응할 수 있다.

수정:

```text
여럿이 결정을 미루고 있을 때
```

### 3.5 공통 제외 상황

- 폭력·자해·범죄·중대한 안전 위험
- 해고·중병·재난처럼 극단적으로 드문 사건
- 상사·교사·부모 등 권력 차이가 반응을 거의 결정하는 장면
- 연애·결혼·직장·대학 경험이 있어야 답할 수 있는 장면만 사용
- 돈·시간·건강·돌봄 의무가 표적 반응보다 더 큰 영향을 주는 장면
- 특정 앱·플랫폼·유행어·브랜드에 의존하는 장면
- 예술·전문지식·고가 경험에 노출돼야 답할 수 있는 장면

필요한 영역에서는 이런 맥락을 별도 상세검사로 다룰 수 있지만 공통 코어에는 넣지 않는다.

## 4. `promptText` 작성 계약

### 4.1 역할

`promptText`는 상황에서 나타날 수 있는 `하나의 관찰 가능한 반응`이다.

반응 종류:

- 행동: 먼저 말을 꺼낸다, 다시 돌아와 이어간다
- 주의: 분위기의 차이에 관심이 간다
- 생각: 가능한 장면을 머릿속에 그려본다
- 감정 활성화: 불편한 감정이 빠르게 커진다
- 반복 인지: 잘못될 가능성이 계속 떠오른다
- 선택 조율: 상대가 원하는 범위를 먼저 확인한다

### 4.2 문장 형식

- 현재형 평서문
- 권장 12~34자, 최대 70자
- 가능한 경우 `내가/나는 + 단일 반응` 또는 자연스러운 무주어 문장
- 마침표 사용
- `~하는 편이다`, `자주`, `대체로`, `항상`, `가끔` 사용 금지
- 이유·의도·결과를 한 문장에 함께 넣지 않음
- `A보다 B`, `A하지 않고 B` 같은 비교 문법을 기본적으로 피함

### 4.3 한 문항에는 하나만 묻는다

좋지 않은 예:

```text
내 의견을 먼저 말하고 다른 사람을 설득한다.
```

이 문장은 `먼저 표현`과 `설득·압박`을 함께 묻는다.

수정:

```text
내 의견을 먼저 말한다.
```

### 4.4 능력과 성과를 묻지 않는다

사용하지 않는다:

- `핵심을 빠르게 파악한다`
- `창의적인 해결책을 잘 찾는다`
- `사람의 마음을 정확히 읽는다`
- `계획을 세우면 반드시 성공한다`
- `위험 신호를 누구보다 빨리 알아챈다`

뉴앙 코어는 관심·반응·반복 경향을 측정한다. 실제 정확도·능력·성과를 측정하지 않는다.

### 4.5 도덕성과 자기칭찬을 피한다

사용하지 않는다:

- `책임감 있게 내 몫을 다한다`
- `상대를 배려한다`
- `무례하게 밀어붙이지 않는다`
- `게으르게 미루지 않는다`
- `감정적으로 행동하지 않는다`

관찰 가능한 중립 행동으로 바꾼다.

```text
필요한 시점 전에 내가 맡은 부분을 확인한다.
결론을 정하기 전에 상대가 원하는 범위를 묻는다.
중단한 뒤에도 다시 돌아와 이어간다.
불편한 감정이 빠르게 커진다.
```

### 4.6 문법적 역문항을 최소화한다

`~하지 않는다`, `~않는 편이다` 같은 부정문은 읽기 오류와 방법 요인을 만들 수 있다. 반대 방향 문항이 필요하면 부정을 붙이기보다 반대 방향에서 실제로 나타날 수 있는 단일 반응을 작성한다.

예:

```text
나쁜 역문항: 내 의견을 먼저 말하지 않는다.
후보 문법: 다른 사람의 반응을 본 뒤 내 의견을 꺼낸다.
```

단, 두 문장이 완전히 같은 연속선의 반대인지 구성개념 정의로 확인해야 한다. `낮은 K = 유연함`, `낮은 A = 논리적임`처럼 측정하지 않은 긍정 특성을 만들어서는 안 된다.

### 4.7 처음 드는 생각·실제 나타나는 반응·이유를 분리한다

같은 상황에서도 처음 눈에 들어오거나 떠오르는 것과 최근 비슷한 상황에서 실제로 말하거나 한 것이 다를 수 있다.

```text
처음 드는 생각: 원인과 해결할 부분이 먼저 눈에 들어온다.
실제 나타나는 반응: 해결 방법을 말하기 전에 상대의 마음을 먼저 확인한다.
```

이 두 반응을 모순으로 처리하거나 한 문항에 함께 넣지 않는다.

- `REPORTED_FIRST_ORIENTATION`: 최근 비슷한 상황에서 먼저 들었다고 보고한 관심·생각·감정
- `ENACTED_RESPONSE`: 최근 비슷한 상황에서 실제 나타났다고 보고한 말·행동
- `SELF_REPORTED_RATIONALE`: 사용자가 별도 probe에서 직접 고른 비채점 이유

각 1~5 문항은 앞의 두 층위 중 하나만 측정한다. 이유는 `~해서`, `~하려고`를 붙여 prompt에 넣지 않는다.

같은 장면의 두 층위를 연결할 필요가 있으면 `process_pair_group_id`를 사용한다. pair 문항은 같은 화면이나 연속 순서에 놓지 않고 최소 세 문항 이상을 사이에 두는 안부터 검증한다.

다층 프로필 공통 계약은 [NUANG_MULTILAYER_TRAIT_RESPONSE_PROFILE_MODEL.md](./NUANG_MULTILAYER_TRAIT_RESPONSE_PROFILE_MODEL.md)를 따른다.

## 5. 상황 라벨과 질문의 결합 검사

두 필드는 각각이 아니라 한 쌍으로 승인한다.

### 5.1 세 가지 읽기 검사

1. 라벨만 읽었을 때 답의 방향이 보이지 않는가?
2. 질문만 읽었을 때 상황이 중복돼 있지 않은가?
3. 둘을 이어 읽었을 때 하나의 자연스러운 질문이 되는가?

### 5.2 중복 기준

금지 예:

```text
상황: 중요한 일을 앞두고
질문: 중요한 일을 앞두면 잘못될 가능성을 여러 번 생각한다.
```

수정:

```text
상황: 중요한 결과를 기다릴 때
질문: 잘못될 가능성이 계속 머릿속을 맴돈다.
```

자동 lint는 형태소 기준 중복 후보를 표시하되, 의미 중복의 최종 판단은 사람이 한다.

### 5.3 상황과 반응의 독립성

상황 강도를 바꾸면 거의 모두가 같은 답을 하게 되는 문항은 제외한다.

```text
극심한 위험을 바로 앞에 두고 → 걱정이 커진다
```

이는 성향보다 정상적인 상황 반응을 측정할 가능성이 크다. 코어는 사람마다 반응 강도가 실제로 갈릴 수 있는 `중간 강도의 일상 장면`을 우선한다.

## 6. 세부 신호별 문항 문법 예시

아래는 M03 작성자가 목표를 이해하기 위한 `FORM_EXAMPLE_NOT_FOR_SCORING`이다. 운영 문항으로 승인하지 않는다.

| 세부 신호               | 상황 라벨 예시                         | 질문 문장 예시                         | 반드시 분리할 오염                          |
| ----------------------- | -------------------------------------- | -------------------------------------- | ------------------------------------------- |
| SE-RE 교류 활력         | 사람들과 함께 시간을 보낸 뒤           | 기운이 더 살아난다.                    | 인기·친구 수·사회불안·전반적 긍정 기분      |
| SE-AI 주도적 표현       | 여럿이 결정을 미루고 있을 때           | 내가 먼저 선택지를 꺼낸다.             | 리더십 능력·정답 제시·압박·RO-RN            |
| OE-AE 미적 경험         | 음악이나 영상의 분위기가 달라질 때     | 그 차이에 관심이 간다.                 | 예술 지식·감각 정확도·ER 감정 동요          |
| OE-CI 상상 확장         | 이야기의 다음 내용을 알기 전           | 가능한 장면을 머릿속에 그려본다.       | 창작 능력·현실 판단·공상으로 인한 기능 저하 |
| OE-IE 지적 탐구         | 익숙하지 않은 원리를 접했을 때         | 왜 그런지 더 찾아본다.                 | 지능·정답률·교육 수준·SM 지속 실행          |
| RO-EC 관계 주의 방향    | 가까운 사람이 힘든 일을 말할 때        | 그 사람이 어떤 마음인지 먼저 살핀다.   | 공감 정확도·상담 능력·도움 성과·자기희생    |
| RO-RN 선택·존엄 존중    | 함께 정할 일에 의견이 갈릴 때          | 결론 전에 상대가 원하는 범위를 묻는다. | 갈등 회피·무조건 동의·법적·안전 개입        |
| SM-EP 실행·지속         | 해야 할 일이 기대만큼 재미있지 않을 때 | 중단한 뒤에도 다시 돌아와 이어간다.    | 우울·ADHD 진단·성과·장시간 집중 능력        |
| SM-OS 질서·구조         | 반복해서 쓰는 물건이나 자료를 둘 때    | 다시 찾을 자리를 정해둔다.             | 주거 환경·강제 규칙·정리 기술·청결 가치     |
| SM-RL 맡은 일 이행 후보 | 다른 사람과 일을 나눠 맡았을 때        | 필요한 시점 전에 내 부분을 확인한다.   | 도덕성·타인의 신뢰 평가·완벽주의            |
| ER-IR 감정 동요         | 계획이 예상과 다르게 흘러갈 때         | 불편한 감정이 빠르게 커진다.           | 감정 표현·공격 행동·감수성·임상 진단        |
| ER-WD 걱정·주저         | 중요한 답을 기다릴 때                  | 잘못될 가능성이 계속 머릿속을 맴돈다.  | 합리적 위험 검토·준비 행동·임상 불안        |

SM-RL은 아직 후보이므로 M03에 탐색 문항을 만들되, 빠른·정밀 코드 점수에 넣을지는 파일럿 구조 비교 뒤 결정한다.

## 7. 문항 세트 전체의 균형

좋은 단일 문항도 비슷한 문항만 모이면 나쁜 검사가 될 수 있다.

### 7.1 상황 커버리지

M03 후보 은행은 각 세부 신호를 최소 네 종류의 일상 장면에서 다룬다.

- 한 상황 버킷이 후보의 40%를 넘지 않도록 권장
- 가족·친구·연인·직장 중 하나의 관계에만 의존하지 않음
- 대인 장면이 필수인 SE·RO도 가까운 사람·낯선 사람·집단 역할을 기계적으로 같은 비율로 맞추지 않고 구성개념에 맞게 분산
- OE는 예술·교육 접근성, SM은 직업·주거, ER은 최근 스트레스의 영향을 별도 위험으로 기록

### 7.2 채점 방향

- 모든 문항이 사회적으로 좋아 보이는 한 방향이 되지 않도록 한다.
- 높은 방향·낮은 방향 문항 수를 정확히 절반으로 맞추기보다 문장의 자연스러움과 구성개념 적합성을 우선한다.
- 단순 부정문·거울 문장을 같은 세트에 함께 넣어 신뢰도가 인위적으로 높아 보이게 하지 않는다.
- `keyedDirection=HIGH|LOW`를 명시하고 `isReverse`는 기존 채점 호환을 위한 파생값으로만 둔다.

### 7.3 문항 수

현재 승인된 공개 구조는 SM-RL 후보를 제외해도 11개 세부 신호다.

- 빠른 코어: 세부 신호당 최소 2개를 지키면 기본 22문항 후보
- SM-RL까지 채택하면 최소 24문항 후보
- 정밀 코어: 세부 신호당 약 6개를 목표로 하면 66문항 후보
- SM-RL까지 채택하면 약 72문항 후보

이는 운영 문항 수 확정이 아니다. M03에서 세부 신호당 8~12개 후보를 만들고, 내용 검토·인지 인터뷰·파일럿 정보량을 거쳐 최종 수를 정한다.

정확성을 위해 기존 `빠른 20문항·정밀 60문항` 숫자를 고정하지 않는다. 빠른 검사가 길어지면 다음 순서로 해결한다.

1. 문항 품질과 세부 신호 커버리지는 유지
2. 빠른 결과의 설명 해상도를 낮춤
3. 적응형 추가 문항을 경계·응답 부족 상태에만 사용
4. 예상 시간을 솔직하게 갱신

한 세부 신호를 1문항으로 확정하거나 승인된 OE 세부 신호를 생략하지 않는다.

## 8. `이 상황은 답하기 어려워요` 계약

### 8.1 고객 UX

1~5 아래에 낮은 시각 위계로 표시하지만 같은 응답 그룹에 포함한다.

```text
이 상황은 답하기 어려워요
```

선택하면 작은 bottom sheet 또는 inline panel에서 이유를 한 번 더 고른다.

```text
어떤 점이 어려웠나요?

비슷한 경험이 거의 없어요
상황에 따라 답이 많이 달라요
문장을 이해하기 어려워요
답하고 싶지 않아요
```

이유 선택 즉시 정식 응답으로 저장하고 `다음`을 활성화한다. 사용자를 탓하거나 품질 경고를 띄우지 않는다.

### 8.2 데이터 의미

| 내부 상태              | 고객 이유                    | 채점 | 사용 목적                            |
| ---------------------- | ---------------------------- | ---- | ------------------------------------ |
| `NO_EXPERIENCE`        | 비슷한 경험이 거의 없어요    | 결측 | 상황 접근성·대체 문항 판단           |
| `CONTEXT_VARIES`       | 상황에 따라 답이 많이 달라요 | 결측 | 상황 조건 과다·분리 프로필 후보 점검 |
| `WORDING_UNCLEAR`      | 문장을 이해하기 어려워요     | 결측 | 즉시 콘텐츠 QA·인지 인터뷰 우선순위  |
| `PREFER_NOT_TO_ANSWER` | 답하고 싶지 않아요           | 결측 | 선택권 보장·민감도 점검              |

규칙:

- 네 상태를 3점으로 대체하지 않는다.
- `CONTEXT_VARIES`를 자동으로 `NEAR_BOUNDARY`나 혼합형으로 판정하지 않는다.
- 응답 완료율에는 포함할 수 있지만 유효 점수 문항 수에는 포함하지 않는다.
- 동일 세부 신호의 유효 응답이 부족하면 결과 전 검증된 대체 문항을 제공한다.
- 검사 중에는 판단 어려움 누적 횟수를 보여주지 않는다.
- `WORDING_UNCLEAR`가 일정 비율을 넘는 문항은 점수 성능과 무관하게 발행 중단 후보로 둔다.

### 8.3 중앙 응답과의 차이

```text
3 반반이에요
= 비슷한 상황을 경험했고, 그 반응이 나타난 경우와 아닌 경우가 비슷함

이 상황은 답하기 어려워요
= 경험·상황 범위·문장 이해·응답 의사 때문에 1~5를 고를 근거가 부족함
```

검사 시작 도움말과 판단 어려움 패널에서 이 차이를 짧게 설명한다.

## 9. 검사 화면 UX

### 9.1 화면 계층

```text
닫기        빠른 코어        3 / 22
━━━━━━━━━━━━━━━ 연속 진행선

여럿이 결정을 미루고 있을 때   ← 작은 보라색 상황 라벨
내가 먼저 선택지를 꺼낸다.     ← 큰 질문 문장

이럴 때 내 모습은?
[ 거의 그렇지 않아요 ]
[ 드문 편이에요       ]
[ 반반이에요          ]
[ 자주 그래요         ]
[ 거의 항상 그래요    ]

  이 상황은 답하기 어려워요

[이전]                 [다음]
```

### 9.2 엄지 도달 원칙

- 응답 선택지는 화면 하단 절반에 우선 배치한다.
- 각 선택 행 전체가 최소 52px 터치 영역이다.
- `이전`은 48~52px 아이콘 버튼, `다음`은 남은 너비의 주 행동이다.
- 이동 dock은 safe area를 포함해 하단에 고정한다.
- 응답 목록이 길어 스크롤되면 마지막 응답이 dock 뒤에 가리지 않도록 padding을 둔다.
- 선택 즉시 자동으로 다음 문항으로 넘기지 않는다. 잘못 누른 응답을 확인·수정한 뒤 `다음`을 누른다.
- 정상 저장 문구를 표시하지 않는다. 저장 실패·복구가 필요할 때만 안내한다.

### 9.3 시각 위계

- 상황 라벨: 13~14px, medium, 뉴앙 퍼플, 최대 두 줄
- 질문 문장: 24~~28px, bold, deep ink, 2~~4줄 허용
- `이럴 때 내 모습은?`: 13~14px, muted ink
- 응답: 15~16px, 텍스트와 radio/check를 함께 표시
- 선택 상태: 보라색 경계·연한 tint·check를 함께 사용
- 특정 응답을 크기·색·위치로 미리 강조하지 않음
- 종이 설문처럼 선만 나열하지 않고 카드/pressed state와 짧은 전환을 사용하되 게임 정답처럼 보이지 않게 함

### 9.4 동작

- 선택 반응 160~200ms
- 진행선 200~240ms
- 다음/이전 문항은 방향을 알 수 있는 8~12px 이내 이동
- reduced-motion에서는 위치 이동 제거
- 점수·코드·캐릭터 반응·칭찬·정답 효과를 검사 중 노출하지 않음

### 9.5 접근성

- `contextLabel + promptText + 응답 기준`을 하나의 질문 이름으로 연결
- 응답은 native radio 기반 radiogroup
- 판단 어려움 이유는 dialog 또는 접근 가능한 inline region
- 진행률은 현재/전체 숫자와 같은 값을 사용
- 색만으로 선택·완료·disabled를 구분하지 않음
- 200% 확대·320px 폭에서도 질문과 dock이 겹치지 않음
- 문항 전환 후 질문 제목에 focus를 강제로 빼앗기보다 live region으로 새 질문을 알리고 키보드 흐름을 보존

## 10. 문항 데이터 계약

### 10.1 런타임 프론트 모델

```ts
type CoreItem = {
  itemId: string;
  revisionId: string;
  domainId: "SE" | "OE" | "RO" | "SM" | "ER";
  facetId: string;
  contextLabel: string;
  promptText: string;
  keyedDirection: "HIGH" | "LOW";
  responseFormatId: string;
  responseLayer?: "REPORTED_FIRST_ORIENTATION" | "ENACTED_RESPONSE";
  scoringRole?: "CORE_TRAIT_EVIDENCE" | "PROFILE_MODIFIER" | "RESEARCH_ONLY";
  processPairGroupId?: string | null;
  processProfileModelVersion?: string | null;
};
```

UI가 알 필요 없는 연구·검증 메타데이터는 런타임 DTO에서 제외한다.

### 10.2 콘텐츠 원장 필드

| 필드                                   | 목적                                                        |
| -------------------------------------- | ----------------------------------------------------------- |
| `item_id`                              | 문항 계보를 잇는 안정 식별자                                |
| `revision_id`                          | 문구·상황·채점 변경 단위                                    |
| `release_id`                           | 특정 검사에 발행된 불변 문항 묶음                           |
| `construct_definition_version`         | 어떤 M01 의미 계약에 근거했는지                             |
| `domain_id` / `facet_id`               | 목표 상위 영역·세부 신호                                    |
| `target_response_process`              | 행동·주의·생각·감정 활성화 등 한 가지 표적                  |
| `response_layer`                       | 처음 드는 생각과 실제 나타나는 반응 중 어느 층위를 묻는지   |
| `scoring_role`                         | facet 핵심 증거·profile modifier·연구 전용 구분             |
| `process_pair_group_id`                | 같은 강도 상황의 층위 문항 연결; 없으면 null                |
| `profile_direction`                    | 다층 프로필 비교용 HIGH/LOW 정규화 방향                     |
| `probe_trigger_rule_id`                | 반복된 층위 차이에 사용할 비채점 probe 규칙                 |
| `process_profile_model_version`        | 어떤 다층 해석 계약을 사용했는지                            |
| `keyed_direction`                      | 높은/낮은 방향 채점                                         |
| `context_bucket_id`                    | 상황 커버리지 추적                                          |
| `context_label`                        | 고객에게 보이는 상황 조건                                   |
| `prompt_text`                          | 고객에게 보이는 단일 반응                                   |
| `response_format_id`                   | 회상 기간·척도 문구 버전                                    |
| `situation_intensity`                  | 낮음·중간·높음; 코어는 중간 우선                            |
| `prerequisite_flags`                   | 직업·연애·경제·문화 노출 등 응답 전제                       |
| `adjacent_construct_risks`             | 인접 세부 신호·상태 오염 위험                               |
| `desirability_risk`                    | 좋은 사람처럼 보이는 응답 위험                              |
| `wording_risk_flags`                   | 부정문·이중질문·비교·빈도 중복 등                           |
| `source_type` / `source_reference_ids` | 독자 작성·adapted·참고 근거 추적                            |
| `rights_status`                        | 저작권·상업 이용 검토 상태                                  |
| `content_status`                       | draft·expert_review·cognitive_review·pilot·approved·retired |
| `validation_status`                    | 내용·인지·정량 검증 상태                                    |
| `content_hash`                         | 라벨·질문·채점·응답 형식 변조 확인                          |

`is_reverse`만 저장해 의미를 숨기지 않는다. 기존 코드에 필요하면 `keyed_direction=LOW`에서 파생한다.

### 10.3 응답 데이터

```ts
type CoreAnswer =
  | {
      responseStatus: "VALID";
      responseValue: 1 | 2 | 3 | 4 | 5;
      unsureReason: null;
    }
  | {
      responseStatus: "UNSURE";
      responseValue: null;
      unsureReason:
        | "NO_EXPERIENCE"
        | "CONTEXT_VARIES"
        | "WORDING_UNCLEAR"
        | "PREFER_NOT_TO_ANSWER";
    };
```

DB 제약:

- `VALID`이면 1~5 값 필수, unsure reason은 null
- `UNSURE`이면 값은 null, reason 필수
- 응답 row에는 상황 라벨과 질문 원문을 복제하지 않음
- `release_id + item_id + revision_id`로 당시 콘텐츠를 재현
- 응답 변경 시 현재 값뿐 아니라 연구 목적의 변경 이력을 저장할지는 별도 개인정보·보관 검토 후 결정

### 10.4 응답 시간

비정상적으로 빠른 응답과 문장 이해 문제를 연구하려면 문항별 응답 시간이 유용할 수 있다. 그러나 행동 로그이므로 최소화한다.

- 운영 기본값은 `response_latency_bucket` 또는 상한을 둔 millisecond 값
- 공개 프로필·결과·일반 분석 이벤트로 보내지 않음
- 측정 품질 연구 목적·보관 기간·접근 권한을 개인정보 안내에 명시
- 사용자 결과를 단순히 느리거나 빠르다는 이유로 무효화하지 않음
- 품질 판정 규칙은 파일럿 분포 뒤 확정

## 11. DB 구조 변경안

기존 `assessment.content_release`와 `assessment.content_item` 계획을 아래처럼 확장한다. 실제 migration은 M02·M03·전문가 검토 뒤 작성한다.

### 11.1 `assessment.content_release`

추가 후보:

- `construct_definition_version text not null`
- `code_scheme_version text not null`
- `response_format_id text not null`
- `target_population text not null`
- `recall_period_days smallint not null`
- `evidence_status text not null`
- `approved_by_role text`
- `approved_at timestamptz`

### 11.2 `assessment.content_item`

기존 필드명 `text`는 API 호환용 alias로만 사용하고 canonical DB는 `prompt_text`로 유지한다.

추가 후보:

- `revision_id text not null`
- `construct_definition_version text not null`
- `target_response_process text not null`
- `response_layer text null check (...)`
- `scoring_role text not null check (...)`
- `process_pair_group_id text null`
- `profile_direction text null check (...)`
- `probe_trigger_rule_id text null`
- `process_profile_model_version text null`
- `keyed_direction text not null check (...)`
- `response_format_id text not null`
- `context_bucket_id text not null`
- `situation_intensity text not null`
- `prerequisite_flags jsonb not null default '[]'`
- `adjacent_construct_risks jsonb not null default '[]'`
- `desirability_risk text not null`
- `wording_risk_flags jsonb not null default '[]'`
- `source_type text not null`
- `source_reference_ids jsonb not null default '[]'`
- `rights_status text not null`
- `content_status text not null`
- `validation_status text not null`

연구용 자유 서술과 전문가 개인정보를 고객 런타임 DB row에 과도하게 넣지 않는다. 상세 reviewer 판단과 통계 결과는 접근이 분리된 validation registry에 둔다.

### 11.3 `assessment.response_format`

응답 문구도 문항과 같은 버전 콘텐츠다.

- `response_format_id`
- `response_kind`
- `recall_instruction`
- `question_lead`
- 1~5 값과 고객 라벨
- 판단 어려움 라벨·이유 목록
- locale
- status·content_hash·published_at

같은 문항이라도 응답 척도가 바뀌면 동일 점수 release로 취급하지 않는다.

### 11.4 `assessment.assessment_response`

기존 `skipped` boolean만으로는 결측 이유를 구분할 수 없다.

추가·교체 후보:

- `response_status text not null`
- `response_value smallint null`
- `unsure_reason text null`
- `item_revision_id text not null`
- `response_latency_ms integer null` 또는 bucket

기존 row 마이그레이션에서는 `value 있음 → VALID`, `skipped=true → UNSURE + LEGACY_UNSPECIFIED`로 보존한다. 과거 결측 이유를 추정하지 않는다.

### 11.5 다층 이유 probe

이유 문항은 일반 1~5 문항과 다른 versioned 콘텐츠다. migration 후보는 다음 두 구조로 분리한다.

`assessment.content_process_probe`:

- `probe_id` / `probe_version`
- `trigger_rule_id`
- `prompt_text`
- `option_set_id`
- `allow_multiple` / `allow_skip`
- `content_status` / `validation_status`

`assessment.assessment_probe_response`:

- `attempt_id`
- `probe_id` / `probe_version`
- `trigger_model_version`
- `selected_option_ids`
- `response_status: VALID | SKIPPED`
- `created_at`

이유 응답은 facet·코드 점수에 합산하지 않고 공개 프로필·피드·1:1 비교에서 기본 비공개로 둔다. 실제 migration은 scoring release 승인 뒤 RBL-07에서 수행한다.

## 12. 작성·검토 상태 기계

```text
DRAFT
→ INTERNAL_LINTED
→ EXPERT_BLIND_MAPPING
→ COGNITIVE_INTERVIEW
→ PILOT_CANDIDATE
→ PILOT_ANALYZED
→ APPROVED_FOR_RELEASE
→ PUBLISHED
→ RETIRED
```

- `INTERNAL_LINTED`는 문법 검사 통과일 뿐 타당성 승인이 아니다.
- 전문가에게 목표 facet을 가린 상태로 문항 매핑을 요청한다.
- 인지 인터뷰에서 크게 수정된 문항은 이전 단계로 돌아간다.
- 파일럿 통계가 좋아도 문장이 낙인·권력·문화 편향 위험을 가지면 승인하지 않는다.
- published 문항의 라벨·질문·방향·응답 형식은 수정하지 않고 새 revision·release를 만든다.

## 13. 자동 lint 규칙

### 하드 차단 후보

- 빈 context 또는 prompt
- context 40자 초과, prompt 70자 초과
- prompt에 두 개 이상의 독립 반응
- prompt에 `항상`, `자주`, `대체로`, `~하는 편` 등 척도 중복 빈도
- context와 prompt의 핵심 형태소 과도한 중복
- domain·facet·코드 글자 노출
- 능력·도덕·진단 금지어
- 문항과 채점 방향 불일치
- rights status 미확인
- construct definition version 누락

### 사람 검토가 필요한 경고

- `그리고`, `~고`, `또는`, `보다`, `대신` 등 이중 반응 가능성
- 부정문·이중부정
- 권력 역할·특정 관계·직업·경제·문화 전제
- 사회적으로 바람직한 답이 명백함
- 상황이 너무 약하거나 극단적임
- 인접 세부 신호로도 자연스럽게 매핑 가능함
- 낮은 방향에 측정하지 않은 장점을 부여함

자동 lint 점수로 문항을 승인하거나 심리측정 품질 순위를 만들지 않는다.

## 14. M03로 넘길 작성 템플릿

```yaml
item_id: null
revision_id: null
construct_definition_version: null
domain_id: null
facet_id: null
target_response_process: null
response_layer: null
scoring_role: null
process_pair_group_id: null
profile_direction: null
probe_trigger_rule_id: null
process_profile_model_version: null
keyed_direction: null

context_bucket_id: null
context_label: null
prompt_text: null
response_format_id: conditional-frequency-ko-v1

situation_intensity: medium
prerequisite_flags: []
adjacent_construct_risks: []
desirability_risk: null
wording_risk_flags: []

low_response_interpretation: null
mid_response_interpretation: null
high_response_interpretation: null
unsure_response_hypotheses: []

source_type: original
source_reference_ids: []
rights_status: internal-original-review-required
content_status: draft
validation_status: not_reviewed
author_rationale: null
```

작성자는 문구보다 먼저 아래를 채운다.

1. 무엇을 측정하는가?
2. 무엇과 혼동될 수 있는가?
3. 1·3·5 응답자는 어떤 실제 경험을 떠올릴 수 있는가?
4. 판단하기 어려운 사람은 왜 어려울 수 있는가?
5. 이 문항이 특정 집단에만 쉬운가?

## 15. M02 통과 기준

- [ ] 상황·질문·응답의 역할이 중복되지 않는다.
- [ ] 한 문항은 하나의 승인된 세부 신호와 한 가지 반응만 측정한다.
- [ ] 처음 드는 생각과 실제 나타나는 반응을 다른 `response_layer`로 기록하고 한 문항에 섞지 않는다.
- [ ] process pair는 연속 제시하지 않으며 층위별 점수를 무조건 합산하지 않는다.
- [ ] 고객 화면에서는 `선택하는 반응`이 아니라 `실제 나타나는 반응`을 사용한다.
- [ ] 사용자가 직접 고른 이유만 비채점 맥락으로 보존하고 동기를 자동 추론하지 않는다.
- [ ] 조건부 빈도 1~5와 판단 어려움의 데이터 의미가 분리된다.
- [ ] 낮은 코드 방향에 측정하지 않은 능력·장점을 만들지 않는다.
- [ ] 기존 20·60문항 숫자를 정확성보다 우선하지 않는다.
- [ ] OE의 세 세부 신호를 빠른 검사에서도 생략하지 않는다.
- [ ] 상황 커버리지·인접 성향·사회적 바람직성·문화 전제 필드가 있다.
- [ ] 문항·응답 형식·구성개념·코드 scheme의 버전을 모두 추적한다.
- [ ] published release를 불변으로 재현할 수 있다.
- [ ] 응답 값과 판단 어려움 이유가 DB 제약으로 모순되지 않는다.
- [ ] 응답 선택과 다음 행동이 하단 엄지 영역에서 조작 가능하다.
- [ ] 정상 상태의 자동 저장 문구와 내부 화면 ID가 노출되지 않는다.
- [ ] 자동 lint와 실제 타당성 검증을 구분한다.
- [ ] 운영 코드·DB를 아직 변경하지 않는다.

## 16. 사용자 승인 기록

2026-07-17~18 사용자 승인으로 다음 아홉 항목을 M03 작성 기준선으로 확정했다.

1. `상황 라벨 + 단일 반응 질문 + 조건부 빈도 응답` 문법을 사용한다.
2. 1~5는 `거의 그렇지 않아요 → 거의 항상 그래요`로 표시하고 3은 유효한 중앙 응답으로 둔다.
3. `이 상황은 답하기 어려워요`를 네 가지 이유로 구분해 결측으로 저장한다.
4. 기존 빠른 20·정밀 60문항 수를 고정하지 않고, 현재 구조에서는 빠른 22문항 이상을 기본 후보로 검토한다.
5. 기존 문항을 자동 승계하지 않고 M03에서 세부 신호 하나씩 후보를 새로 작성한다.
6. 실제 코드·DB migration은 후보 문항·전문가 검토·인지 인터뷰 준비가 끝난 뒤 별도 구현 단계에서 적용한다.
7. 같은 상황의 `처음 드는 생각`과 `실제 나타나는 반응`을 분리해 측정한다.
8. 층위 차이는 정밀검사에서 여러 상황에 반복될 때만 상세 프로필 후보로 해석한다.
9. 행동 이유는 사용자가 별도 probe에서 직접 선택한 경우에만 비채점 맥락으로 사용한다.

M03은 한 번에 모든 문항을 만들지 않는다. `SE-RE 교류 활력`부터 상황 버킷·후보 문항·오염 감사를 한 세부 신호씩 사용자와 검토한다.

## 17. 근거 자료

- [AERA·APA·NCME, Standards for Educational and Psychological Testing](https://www.aera.net/Publications/Books/Standards-for----Educational-Psychological-Testing-2014-Edition) — 점수의 의도된 해석·사용을 뒷받침하는 근거와 공정성 검토의 공동 기준
- [Clark & Watson (2019), Constructing Validity](https://pmc.ncbi.nlm.nih.gov/articles/PMC6754793/) — 구성개념 경계, 넓은 후보 문항 풀, 인접 개념과 수렴·변별 근거를 함께 설계하는 원칙
- [Boateng et al. (2018), Best Practices for Developing and Validating Scales](https://www.frontiersin.org/journals/public-health/articles/10.3389/fpubh.2018.00149/full) — 문항 생성·내용타당도·사전검사·문항 축소·요인·신뢰도·타당도 검증 단계
- [Drennan et al. (2022), Effective Questionnaire Design Using Cognitive Interviews](https://pmc.ncbi.nlm.nih.gov/articles/PMC9524256/) — 사용자의 문항 이해·회상·판단·응답 선택 과정을 확인하는 인지 인터뷰 방법
- [Soto & John (2017), BFI-2 Short and Extra-Short Forms](https://www.colby.edu/wp-content/uploads/2013/08/Soto_John_2017b.pdf) — 짧은 척도의 정보 손실과 세부 특성 해석 범위를 결정할 때 참고한 근거
- [Berkeley Personality Lab — BFI-2](https://www.ocf.berkeley.edu/~johnlab/bfi.html) — 직역보다 전체 의미 보존과 역번역이 중요하다는 공식 연구자 안내
- [COSMIN 공식 사이트](https://www.cosmin.nl/) — 내용타당도·신뢰도·측정오차·구조타당도 평가 방법론

전체 참고 체계와 뉴앙 반영·제외 판단은 [NUANG_RESEARCH_REFERENCE_AND_ADAPTATION_LEDGER.md](./NUANG_RESEARCH_REFERENCE_AND_ADAPTATION_LEDGER.md)를 단일 원장으로 사용한다.
