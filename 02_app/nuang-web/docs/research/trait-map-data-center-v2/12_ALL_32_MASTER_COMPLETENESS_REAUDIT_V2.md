# 32개 연구원장 완전성 재감사 v2.3

- 상태: `RESEARCH_MASTER_CONTENT_COMPLETE_EXTERNAL_VALIDATION_PENDING`
- 연구 원장 내용 기준: 32/32
- v2.3 canonical 재연결: 32/32
- 고객 발행 가능 원장: 0/32

## 핵심 판정

- 파일·코드 구조·72개 상황·288개 claim·5개 이웃: 32/32 통과
- 공백 제외 5만 자 이상: 32/32
- 내용 4만 자·핵심 편집문 5천 자·장별 깊이·반복·근거 기준: 32/32
- v2.3 canonical: 605개
- 32개 원장 canonical 참조: 9,216개
- 한 글자 이웃 검사: 80/80
- customer_approved claim: 0

현재 연구 원장은 구조와 실질 내용 기준을 통과했다. 이 결과는 실제 참여자 타당화나 고객 발행 승인을 대신하지 않는다. 독립 검토·인지 면담·정량 검증·화면별 승인 전까지 연구 전용 상태를 유지한다.

## 결함 수

| 결함                           | 해당 원장 |
| ------------------------------ | --------: |
| missingManuscript              |         0 |
| structuralContractFailure      |         0 |
| contentBelowFortyThousand      |         0 |
| editorialCoreBelowFiveThousand |         0 |
| profilesWithThinChapters       |         0 |
| repeatedLongLineRatioExceeded  |         0 |
| neighborInconsistency          |         0 |
| canonicalRebasePending         |         0 |
| externalHumanValidationPending |        32 |

## 코드별 현황

| 코드  | 내용 게이트 | canonical v2.3 | 실제 설명 글자 | 편집 핵심 글자 | 얇은 장 | 반복 비율 |
| ----- | ----------- | -------------- | -------------: | -------------: | ------: | --------: |
| ENAKC | PASS        | PASS           |         63,369 |          9,287 |       0 |    0.0109 |
| ENAKQ | PASS        | PASS           |         64,024 |          8,013 |       0 |         0 |
| ENAMC | PASS        | PASS           |         59,263 |          9,781 |       0 |    0.0211 |
| ENAMQ | PASS        | PASS           |         57,634 |          7,497 |       0 |         0 |
| ENGKC | PASS        | PASS           |         59,222 |          9,862 |       0 |    0.0216 |
| ENGKQ | PASS        | PASS           |         58,232 |          7,917 |       0 |         0 |
| ENGMC | PASS        | PASS           |         58,946 |          9,704 |       0 |    0.0203 |
| ENGMQ | PASS        | PASS           |         58,746 |          9,652 |       0 |    0.0154 |
| ERAKC | PASS        | PASS           |         59,505 |          9,836 |       0 |    0.0215 |
| ERAKQ | PASS        | PASS           |         58,268 |          7,857 |       0 |         0 |
| ERAMC | PASS        | PASS           |         59,519 |          9,852 |       0 |     0.021 |
| ERAMQ | PASS        | PASS           |         59,490 |          9,996 |       0 |    0.0225 |
| ERGKC | PASS        | PASS           |         58,974 |          9,623 |       0 |    0.0149 |
| ERGKQ | PASS        | PASS           |         58,628 |          9,577 |       0 |    0.0093 |
| ERGMC | PASS        | PASS           |         58,822 |          8,158 |       0 |         0 |
| ERGMQ | PASS        | PASS           |         58,866 |          9,716 |       0 |    0.0212 |
| INAKC | PASS        | PASS           |         59,347 |          9,724 |       0 |    0.0214 |
| INAKQ | PASS        | PASS           |         60,368 |          8,945 |       0 |         0 |
| INAMC | PASS        | PASS           |         59,419 |          9,765 |       0 |    0.0221 |
| INAMQ | PASS        | PASS           |         59,402 |          9,845 |       0 |    0.0223 |
| INGKC | PASS        | PASS           |         58,928 |          9,663 |       0 |    0.0213 |
| INGKQ | PASS        | PASS           |         59,099 |          9,823 |       0 |    0.0226 |
| INGMC | PASS        | PASS           |         57,893 |          7,669 |       0 |         0 |
| INGMQ | PASS        | PASS           |         58,657 |          9,589 |       0 |     0.021 |
| IRAKC | PASS        | PASS           |         59,491 |          9,721 |       0 |    0.0209 |
| IRAKQ | PASS        | PASS           |         59,183 |          9,724 |       0 |    0.0206 |
| IRAMC | PASS        | PASS           |         58,543 |          7,802 |       0 |         0 |
| IRAMQ | PASS        | PASS           |         59,135 |          9,691 |       0 |    0.0217 |
| IRGKC | PASS        | PASS           |         57,272 |          7,304 |       0 |         0 |
| IRGKQ | PASS        | PASS           |         58,609 |          9,585 |       0 |    0.0144 |
| IRGMC | PASS        | PASS           |         63,597 |          8,595 |       0 |         0 |
| IRGMQ | PASS        | PASS           |         63,038 |          9,116 |       0 |    0.0109 |

## 별도 고객 발행 단계

1. 독립 7역할 검토
2. 인지 면담과 쉬운 한국어 이해도 검증
3. 실제 참여자 정량·상황 직접 검증
4. 32개 별칭 사용자 검증
5. 고객 화면별 명시적 발행 승인과 allowlist 연결
