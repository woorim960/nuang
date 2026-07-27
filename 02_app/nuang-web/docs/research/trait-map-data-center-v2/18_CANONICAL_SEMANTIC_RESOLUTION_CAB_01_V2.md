# CAB-01 canonical 의미 보존 구조화 v2

- 상태: `SOURCE_MEANING_STRUCTURED_TARGETED_AXIS_REWRITE_AND_SEVEN_ROLE_REVIEW_REQUIRED`
- 고객 승인: 0개

## 결정

서로 다른 두 원문 47쌍은 억지로 한 문장으로 합치지 않는다. 문장 유사도
최댓값이 0.361에 그쳐
각 원문이 담은 정보가 실제로 달랐다. 선택 방향의 첫 문단은 결과 요약용
core로, 둘째 문단은 성향지도 상세용 nuance로 보존한다.

이 구조로 77개 변형은 7개
역할 검토에 바로 들어갈 수 있다. 한 글자 이웃과 같은 문장 블록을 공유한
24개 변형은 반대
방향의 고유 설명이 양쪽에 모두 있는지 먼저 보강한다.

## 화면 사용

- 검사 결과 요약: core 한 문단
- 성향지도 상세: core와 nuance 전체
- 비교 리포트: 두 사용자가 공개한 비교 정보에만 제한
- 공개 프로필·공유 카드: 현재 묶음은 `self_only`이므로 사용하지 않음

## 표적 축 교정 큐

| canonical 변형                                           | 축 서명 | 검토 축 |
| -------------------------------------------------------- | ------- | ------- |
| CAN-SCN-GENERAL-ORDINARY-CHOICE-ATTENTION-OE-R-RO-G-SM-M | OE=R    | RO=G    | SM=M | RO  |
| CAN-SCN-GENERAL-ORDINARY-CHOICE-ATTENTION-OE-R-RO-A-SM-M | OE=R    | RO=A    | SM=M | RO  |
| CAN-SCN-GENERAL-ORDINARY-CHOICE-ATTENTION-OE-N-RO-G-SM-K | OE=N    | RO=G    | SM=K | RO  |
| CAN-SCN-GENERAL-ORDINARY-CHOICE-ATTENTION-OE-N-RO-A-SM-K | OE=N    | RO=A    | SM=K | RO  |
| CAN-SCN-GENERAL-ORDINARY-CHOICE-RESPONSE-SE-E-OE-R-SM-M  | SE=E    | OE=R    | SM=M | SE  |
| CAN-SCN-GENERAL-ORDINARY-CHOICE-RESPONSE-SE-E-OE-N-SM-K  | SE=E    | OE=N    | SM=K | SE  |
| CAN-SCN-GENERAL-ORDINARY-CHOICE-RESPONSE-SE-I-OE-R-SM-M  | SE=I    | OE=R    | SM=M | SE  |
| CAN-SCN-GENERAL-ORDINARY-CHOICE-RESPONSE-SE-I-OE-N-SM-K  | SE=I    | OE=N    | SM=K | SE  |
| CAN-SCN-GENERAL-AFTERMATH-ATTENTION-SE-E-RO-G-ER-Q       | SE=E    | RO=G    | ER=Q | RO  |
| CAN-SCN-GENERAL-AFTERMATH-ATTENTION-SE-E-RO-A-ER-Q       | SE=E    | RO=A    | ER=Q | RO  |
| CAN-SCN-GENERAL-AFTERMATH-ATTENTION-SE-I-RO-G-ER-C       | SE=I    | RO=G    | ER=C | RO  |
| CAN-SCN-GENERAL-AFTERMATH-ATTENTION-SE-I-RO-A-ER-C       | SE=I    | RO=A    | ER=C | RO  |
| CAN-SCN-GENERAL-AFTERMATH-PROCESS-SE-E-RO-G-ER-Q         | SE=E    | RO=G    | ER=Q | RO  |
| CAN-SCN-GENERAL-AFTERMATH-PROCESS-SE-E-RO-A-ER-Q         | SE=E    | RO=A    | ER=Q | RO  |
| CAN-SCN-GENERAL-AFTERMATH-PROCESS-SE-I-RO-G-ER-C         | SE=I    | RO=G    | ER=C | RO  |
| CAN-SCN-GENERAL-AFTERMATH-PROCESS-SE-I-RO-A-ER-C         | SE=I    | RO=A    | ER=C | RO  |
| CAN-SCN-GENERAL-AFTERMATH-RESPONSE-SE-E-SM-K-ER-Q        | SE=E    | SM=K    | ER=Q | SM  |
| CAN-SCN-GENERAL-AFTERMATH-RESPONSE-SE-E-SM-M-ER-Q        | SE=E    | SM=M    | ER=Q | SM  |
| CAN-SCN-GENERAL-AFTERMATH-RESPONSE-SE-I-SM-K-ER-C        | SE=I    | SM=K    | ER=C | SM  |
| CAN-SCN-GENERAL-AFTERMATH-RESPONSE-SE-I-SM-M-ER-C        | SE=I    | SM=M    | ER=C | SM  |
| CAN-SCN-GENERAL-NEW-ENCOUNTER-RESPONSE-SE-E-OE-N-ER-C    | SE=E    | OE=N    | ER=C | ER  |
| CAN-SCN-GENERAL-NEW-ENCOUNTER-RESPONSE-SE-E-OE-N-ER-Q    | SE=E    | OE=N    | ER=Q | ER  |
| CAN-SCN-GENERAL-NEW-ENCOUNTER-RESPONSE-SE-I-OE-R-ER-C    | SE=I    | OE=R    | ER=C | ER  |
| CAN-SCN-GENERAL-NEW-ENCOUNTER-RESPONSE-SE-I-OE-R-ER-Q    | SE=I    | OE=R    | ER=Q | ER  |

## 다음 단계

1. 24개 표적 변형에서 반대 방향의 고유 설명을 근거 계보로 보강한다.
2. 12개 이웃 쌍을 나란히 읽어 한 글자 차이를 말로 설명할 수 있는지 확인한다.
3. 101개 전체에 7개 역할 검토를 기록한다.
4. 승인된 CAB-01만 32개 코드에 재조합한다.
