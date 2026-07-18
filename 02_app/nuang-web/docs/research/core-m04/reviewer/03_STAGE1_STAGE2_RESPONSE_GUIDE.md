# M04 전 코어 Stage 1·2 응답 가이드

문서 버전: `m04-core-expert-kit.v0.1`  
입력: UTF-8 CSV  
공통: 열 이름·행 순서·slot·wave·`opaque_item_id`를 바꾸지 않는다.

## 1. Stage 1

| 열                           | 허용 값                             |
| ---------------------------- | ----------------------------------- |
| `first_construct_mapping`    | 코드북 12개 코드, `METHOD`, `NONE`  |
| `second_construct_mapping`   | 같은 코드 또는 `NONE`               |
| `direction_guess`            | `HIGH`, `LOW`, `UNCLEAR`            |
| `clarity_rating_1_4`         | `1`~`4`                             |
| `single_response_rating_1_4` | `1`~`4`                             |
| `universality_rating_1_4`    | `1`~`4`                             |
| `scale_fit_rating_1_4`       | `1`~`4`                             |
| `desirable_direction_guess`  | `HIGH`, `LOW`, `SIMILAR`, `UNCLEAR` |
| `risk_flags`                 | 아래 코드를 `;`로 연결 또는 `NONE`  |
| `fatal_risk_note`            | `NONE` 또는 구체적 근거             |
| `stage1_notes`               | 자유 서술                           |

평정: `1 심각한 문제`, `2 상당한 수정`, `3 대체로 가능`, `4 직접적이고 명확`.

위험 코드:

`ABILITY; ACCESS; EDUCATION; OCCUPATION; RELATIONSHIP_STATUS; DIGITAL_ACCESS; CULTURAL_ROLE; SOCIAL_DESIRABILITY; RESPONSE_OPTION; NEGATION; LIMITER; MEMORY; ATTENTION; ADJACENT_CONSTRUCT; CLINICAL_CONTAMINATION; PRIVACY; OTHER; NONE`

## 2. 세 회차 잠금

1. W1, W2, W3 각각 50행의 필수 입력을 확인한다.
2. 제출 원본을 회차별 read-only로 잠근다.
3. 기술적 correction은 원본을 고치지 않고 별도 기록한다.
4. 세 회차 잠금 확인 전 Stage 2를 열지 않는다.

## 3. Stage 2

| 열                               | 허용 값                                                       |
| -------------------------------- | ------------------------------------------------------------- |
| `target_relevance_rating_1_4`    | `1`~`4`                                                       |
| `key_direction_fit_rating_1_4`   | `1`~`4`                                                       |
| `coverage_contribution_rating`   | `REDUNDANT`, `SOME`, `IMPORTANT`                              |
| `adjacent_separation_rating_1_4` | `1`~`4`                                                       |
| `recommendation`                 | `KEEP`, `COPY_REVISE`, `CONSTRUCT_REWRITE`, `HOLD`, `EXCLUDE` |
| `final_rationale`                | 자유 서술, 필수                                               |

`evidence_role`, `response_layer`, `score_role`은 현재 연구 가설이다. 공개됐다는 이유로 적합하다고 가정하지 말고, 대표 코드·과정 보조·본인 전용 상세 중 해당 역할이 타당한지도 근거에 포함한다.

## 4. 금지

- target 공개 뒤 Stage 1 수정
- 코드 글자의 호감도만으로 문항 판정
- 평균 점수만 남기고 자유 서술·소수 위험 삭제
- 문항 수를 맞추기 위한 억지 `KEEP`
