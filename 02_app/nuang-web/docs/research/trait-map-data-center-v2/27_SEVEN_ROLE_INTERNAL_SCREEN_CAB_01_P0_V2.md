# CAB-01 P0 내부 다학제 사전검토 v2

- 상태: `P0_INTERNAL_SCREEN_COMPLETE_REVISIONS_AND_CONSTRUCT_HOLDS_REQUIRED`
- 범위: CAB-01 P0 24개
- 전문가 승인: 0개
- 고객 승인: 0개

## 판정

| 사전 판정              | 개수 |
| ---------------------- | ---: |
| 독립 역할 검토로 이동  |    4 |
| 역할 검토 전 문장 수정 |   16 |
| 구성개념 연결 재검토   |    4 |

이 판정은 독립 전문가 승인이 아니다. 자동 검사에서 찾지 못하는 의미 문제를
7개 역할 검토 전에 먼저 찾은 내부 사전검토이며, 모든 entry는 계속
`research_only`다.

## 발견된 문제

| issue code                       | 항목 수 |
| -------------------------------- | ------: |
| `KOR_ABSTRACT_OR_AMBIGUOUS`      |       1 |
| `KOR_MULTIPLE_IDEAS`             |       5 |
| `MET_AXIS_CONTAMINATION`         |       7 |
| `MET_ITEM_CLAIM_MISMATCH`        |       4 |
| `PROD_DUPLICATE_VALUE`           |       2 |
| `PROD_SUMMARY_DETAIL_MISMATCH`   |       2 |
| `PSY_AXIS_DIRECTION_AMBIGUOUS`   |       7 |
| `PSY_CONTEXT_OVERGENERALIZATION` |       4 |

가장 중요한 보류는 새 만남 C/Q 4개다. 현재 문장은 걱정·감정이 커지는 속도가
아니라 말을 시작하거나 참여하는 속도를 설명하고 있어, 문장을 다듬기 전에
해당 시나리오가 C/Q를 실제로 관찰하는지부터 다시 판정해야 한다.

## 다음 작업

1. 16개 revise 항목의 version 2 문장 후보를 작성한다.
2. 새 만남 C/Q 4개는 ER 축 기여를 다시 판정한다.
3. 4개 ready 항목부터 7개 역할 독립 검토를 시작한다.
4. 수정 후 32개 코드와 한 글자 이웃 재조합 감사를 다시 실행한다.
