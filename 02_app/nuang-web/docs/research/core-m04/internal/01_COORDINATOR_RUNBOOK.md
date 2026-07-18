# M04 전 코어 전문가 검토 내부 운영 runbook

문서 버전: `m04-core-expert-kit.v0.1`  
공개 범위: 측정 책임자·승인된 운영자  
현재 상태: `NO_SCORING_OR_RELEASE_AUTHORIZED`

## 1. 역할 분리

| 역할           | 가능                             | 금지                        |
| -------------- | -------------------------------- | --------------------------- |
| 측정 책임자    | 프로토콜 승인·판정 주관          | 독립 응답 사후 수정         |
| packet 관리자  | slot·wave 배정, 발송, hash, 잠금 | target 코칭                 |
| mapping 관리자 | opaque key 제한 관리             | Stage 1 대응자에게 key 공개 |
| 분석 담당      | 사전등록 집계                    | 결과 확인 후 기준 변경      |
| 문항 작성자    | 잠금 뒤 의도 설명                | blind 독립 검토자 수에 포함 |

내부 AI 역할 검토를 수행하더라도 `INTERNAL_CRITIQUE`로 표시하며 외부 심리측정·사용자 근거와 합산하지 않는다.

## 2. 시작 전

- [ ] `npm run research:core:expert-kit:check` 통과
- [ ] validation 상태 `PASS`
- [ ] 사전등록·허용 누락·중단 규칙 잠금
- [ ] 역할 최소 조건과 이해상충 확인
- [ ] 응답·연락·보상·삭제 데이터 분리
- [ ] Stage 1/2 권한 분리 시험
- [ ] target 노출 사고 절차 시험

## 3. slot과 wave

- 연구 데이터에는 `R01`~`R08`만 사용한다.
- 각 slot은 W1→W2→W3 순서로 진행하되 휴식 간격을 둔다.
- 한 회차는 50문항이다. 회차 중 target·기존 응답·다른 검토자 결과를 공개하지 않는다.
- 중도 이탈 slot을 다른 사람에게 재사용하지 않는다.
- 한 검토자의 세 Stage 1이 모두 잠기기 전에는 그 검토자의 어떤 Stage 2도 공개하지 않는다.

## 4. Stage 1 발송·잠금

1. reviewer brief, blind codebook, response guide를 제공한다.
2. 해당 slot·wave 파일 하나만 복사해 전달한다.
3. 실제 ID·target·key·내부 역할 누출을 마지막으로 확인한다.
4. manifest의 template hash와 발송 시각을 기록한다.
5. 수신 원본의 slot·wave·행·opaque ID·필수 열을 확인한다.
6. 수신 원본 SHA-256을 `stage1_response_sha256`에 기록한다.
7. 원본 write access를 제거하고 lock 담당자·시각을 기록한다.
8. 세 회차가 모두 잠기면 roster와 lock log의 `all_stage1_waves_locked_at`을 기록한다.

## 5. Stage 2

- `DO_NOT_RELEASE_UNTIL_ALL_STAGE1_LOCKED` 파일 중 같은 slot·wave만 제공한다.
- Stage 1 원본 수정 권한이 제거됐는지 다시 확인한다.
- Stage 2 수신 원본 SHA-256을 `stage2_response_sha256`에 기록한다.
- 세 회차 Stage 2가 모두 잠기기 전 집계·작성 근거를 공개하지 않는다.

## 6. 사고 대응

| 사고                          | 즉시 조치                     | 판단                        |
| ----------------------------- | ----------------------------- | --------------------------- |
| Stage 1 전 target/key 노출    | 해당 slot 중단·추가 공개 차단 | 사전등록 제외 규칙 적용     |
| 다른 검토자 응답 노출         | 관련 slot 중단                | 독립성 훼손 범위 기록       |
| 잘못된 slot/wave 전달         | 회수·폐기 요청                | 열람 여부에 따라 사용 판단  |
| 세 blind 회차 전 Stage 2 공개 | 해당 slot 중단                | blind 결과 제외 검토        |
| 파일 손상·행 누락             | 원본 보존                     | 내용 미노출이면 재전달 가능 |
| 철회·삭제 요청                | 분석 중단                     | 승인된 삭제 절차 실행       |

사고를 새 파일로 조용히 덮지 않고 deviation log에 남긴다.

## 7. 인계

유효 Stage 1·2가 모두 잠긴 뒤 가명 응답, mapping key, preregistration, deviation log만 분석 담당에게 전달한다. 연락처·보상 정보는 전달하지 않는다. 판정 뒤 item revision과 소수 의견을 decision log에 기록한다.
