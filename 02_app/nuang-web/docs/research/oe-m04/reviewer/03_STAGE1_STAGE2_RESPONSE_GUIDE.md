# M04 Stage 1·2 응답 가이드

문서 버전: `m04-oe-expert-kit.v0.1`  
입력 형식: UTF-8 CSV  
공통 규칙: 열 이름·행 순서·`opaque_item_id`를 변경하지 않는다. 응답 안의 쉼표는 CSV 편집기가 자동 처리하도록 한다.

## 1. Stage 1 입력 규칙

| 열                           | 허용 값                                                                   | 판단 질문                                      |
| ---------------------------- | ------------------------------------------------------------------------- | ---------------------------------------------- |
| `first_construct_mapping`    | `OE_AE`, `OE_CI`, `OE_IE`, `ER_IR`, `ER_WD`, `SM`, `RO`, `METHOD`, `NONE` | 이 문항이 가장 직접적으로 묻는 것은 무엇인가?  |
| `second_construct_mapping`   | 위 코드 또는 `NONE`                                                       | 두 번째로 강하게 묻는 것이 있는가?             |
| `direction_guess`            | `HIGH`, `LOW`, `UNCLEAR`                                                  | 첫 선택 구성개념의 높은/낮은 방향 중 무엇인가? |
| `clarity_rating_1_4`         | `1`~`4`                                                                   | 한 번 읽고 뜻이 분명한가?                      |
| `single_response_rating_1_4` | `1`~`4`                                                                   | 하나의 반응만 묻는가?                          |
| `universality_rating_1_4`    | `1`~`4`                                                                   | 다양한 2030 사용자가 답할 장면인가?            |
| `scale_fit_rating_1_4`       | `1`~`4`                                                                   | 지난 6개월의 반복 빈도로 답하기 자연스러운가?  |
| `desirable_direction_guess`  | `HIGH`, `LOW`, `SIMILAR`, `UNCLEAR`                                       | 어느 답이 더 좋아 보이도록 쓰였는가?           |
| `risk_flags`                 | 아래 코드를 `;`로 연결 또는 `NONE`                                        | 주된 오염·공정성 위험은 무엇인가?              |
| `fatal_risk_note`            | `NONE` 또는 구체적 근거                                                   | 문구 수정만으로 해결하기 어려운 위험이 있는가? |
| `stage1_notes`               | 자유 서술                                                                 | 판단 근거·오해 가능성·수정 제안                |

`risk_flags` 허용 코드:

`ABILITY; ACCESS; EDUCATION; MEDIA_EXPOSURE; DIGITAL_ACCESS; SOCIAL_DESIRABILITY; RESPONSE_OPTION; NEGATION; MEMORY; ATTENTION; ER_CONTAMINATION; SM_CONTAMINATION; RO_CONTAMINATION; OTHER; NONE`

평정 공통 기준:

- `1`: 심각한 문제로 현재 형태 사용 어려움
- `2`: 반복될 가능성이 큰 문제, 상당한 수정 필요
- `3`: 대체로 가능, 작은 오해·보완 여지
- `4`: 직접적이고 명확하며 현재 목적에 잘 맞음

`fatal_risk_note`는 단지 마음에 들지 않는 문장을 표시하는 칸이 아니다. 감각·장애·문화·학력 배제, 낙인, 명백한 이중 질문처럼 결과 해석을 심각하게 왜곡할 근거가 있을 때 사용한다.

## 2. Stage 1 완료·잠금

1. 36행이 모두 같은 reviewer slot인지 확인한다.
2. 필수 열의 누락을 확인하되 운영자에게 정답 확인을 요청하지 않는다.
3. 파일명을 임의로 바꾸지 않고 제출한다.
4. 운영자가 수신·hash·read-only 잠금을 확인할 때까지 Stage 2를 열지 않는다.
5. 잠금 뒤 잘못 입력한 내용을 발견하면 원본은 수정하지 않고 별도 correction note를 제출한다.

## 3. Stage 2 입력 규칙

| 열                               | 허용 값                                                       | 판단 질문                                     |
| -------------------------------- | ------------------------------------------------------------- | --------------------------------------------- |
| `target_relevance_rating_1_4`    | `1`~`4`                                                       | 공개된 target을 직접 측정하는가?              |
| `key_direction_fit_rating_1_4`   | `1`~`4`                                                       | 공개된 HIGH/LOW key가 문장과 맞는가?          |
| `coverage_contribution_rating`   | `REDUNDANT`, `SOME`, `IMPORTANT`                              | facet 내용 범위에 무엇을 더하는가?            |
| `adjacent_separation_rating_1_4` | `1`~`4`                                                       | 가장 가까운 인접 개념과 구분되는가?           |
| `recommendation`                 | `KEEP`, `COPY_REVISE`, `CONSTRUCT_REWRITE`, `HOLD`, `EXCLUDE` | 다음 단계 권고는 무엇인가?                    |
| `final_rationale`                | 자유 서술, 필수                                               | Stage 1 판단과 같거나 달라진 이유는 무엇인가? |

Stage 2의 target 공개는 정답을 맞혔는지 채점하기 위한 피드백이 아니다. 작성 의도와 실제 문장 사이의 거리를 다시 평가하기 위한 정보다.

## 4. 응답 예시

문항 원문과 무관한 형식 예시:

```text
first_construct_mapping: OE_CI
second_construct_mapping: METHOD
direction_guess: HIGH
clarity_rating_1_4: 3
risk_flags: ABILITY;MEMORY
stage1_notes: 상상을 떠올리는 경향보다 심상 능력을 묻는 것으로 읽힐 수 있음
```

예시는 내용상 기대 답을 뜻하지 않는다.
