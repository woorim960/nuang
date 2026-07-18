# M04 v0.2 수정 후보 내부 집계·판정

상태: `INTERNAL_ADJUDICATION_COMPLETE_NOT_EXTERNAL_VALIDATION`  
protocol: `m04-core-expert-kit.v0.2-targeted`

## 증거 경계

이 결과는 6개 AI 전문 역할의 내부 blind critique를 집계한 것이다. 외부 심리측정 전문가 검토, 실제 사용자 인지 인터뷰, 정량 파일럿 또는 운영 문항 승인으로 표현하지 않는다. 앱·DB·검사 seed·채점·코드 발급은 변경하지 않았다.

## 판정 원칙

1. Stage 1·2 해시와 잠금 상태가 유효한 6명·96행만 포함했다.
2. fatal risk와 비target mapping을 평균 점수보다 먼저 검토했다.
3. 자동 triage가 통과여도 Stage 2 수정 권고가 우세하면 그대로 통과시키지 않았다.
4. 반대 의견은 삭제하지 않고 M05 인지 인터뷰의 필수 확인 질문으로 전환했다.
5. 이번 `PASS_TO_COGNITIVE`는 현재 문구가 실제 사용자 이해 검토로 이동할 수 있다는 뜻일 뿐, 문항 타당도나 운영 사용 승인이 아니다.

## 판정 결과

| 문항                    | 내부 판정           | 핵심 이유                                         | 다음 행동                          |
| ----------------------- | ------------------- | ------------------------------------------------- | ---------------------------------- |
| NV2-001 · SMRL-C11-r2   | `CONSTRUCT_REWRITE` | 역할 이행보다 비보조 기억·알림 사용이 응답을 지배 | major revision 후 제한 M04 재검토  |
| NV2-002 · SMOS-C10-r2   | `PASS_TO_COGNITIVE` | 6/6 target·방향 일치, KEEP 5/6                    | 보관 환경 차이를 M05에서 확인      |
| NV2-003 · ERWD-C06-r2   | `COPY_REVISE`       | 6/6 수정 권고, 부정형과 행동 지연 경계 문제       | 짧은 행동 표현으로 수정            |
| NV2-004 · OEIE-C10-r2   | `PASS_TO_COGNITIVE` | target·방향·KEEP 6/6                              | 현재 문구로 M05 이동               |
| NV2-005 · RORN-P05-B-r2 | `COPY_REVISE`       | 사회적 바람직성·관계 권력 혼입                    | 낙인 없는 선택 여지 문구로 수정    |
| NV2-006 · SMOS-C08-r2   | `COPY_REVISE`       | 시점 계획·실제 시작·일정 자율성이 혼합            | 계획 시점 반응만 남기도록 수정     |
| NV2-007 · SMOS-C13      | `PASS_TO_COGNITIVE` | 6/6 target·방향 일치, KEEP 4/6                    | 절차 노출 차이를 M05에서 확인      |
| NV2-008 · OEIE-C09-r2   | `COPY_REVISE`       | 필요한 이해와 추가 탐구가 분리되지 않음           | 이해 완료 뒤 추가 탐구로 문맥 수정 |

결과는 `PASS_TO_COGNITIVE` 3개, `COPY_REVISE` 4개, `CONSTRUCT_REWRITE` 1개다. 세부 수치와 모든 반대 의견은 각각 `item_metrics.csv`, `qualitative_evidence.csv`, `adjudication_decisions.csv`에 보존했다.

## 다음 게이트

다음 단계에서는 수정 대상 5개의 문구만 설계한다. `NV2-001`은 major revision으로 제한 M04를 다시 거치며, 나머지 4개는 target·방향을 유지하는 copy revision 후보로 작성한다. 통과 3개는 문구를 바꾸지 않고 M05 인지 인터뷰 준비 목록으로 이동한다.
