# M04 OE 전문가 검토 내부 운영 runbook

문서 버전: `m04-oe-expert-kit.v0.1`  
공개 범위: 측정 책임자·승인된 연구 운영자 전용  
현재 상태: `NO_RECRUITMENT_AUTHORIZED`

## 1. 역할 분리

| 역할          | 할 수 있는 일                 | 할 수 없는 일            |
| ------------- | ----------------------------- | ------------------------ |
| 측정 책임자   | 프로토콜 승인·판정 회의 주관  | 독립 응답을 사후 수정    |
| packet 관리자 | slot 배정·파일 발송·hash·잠금 | reviewer 판단 코칭       |
| 데이터 관리자 | 접근 권한·보관·삭제·감사 기록 | 실제 ID key를 넓게 공유  |
| 분석 담당자   | 사전등록된 집계·표 작성       | 결과 확인 후 기준 변경   |
| 문항 작성자   | adjudication에서 의도 설명    | blind reviewer 수에 포함 |

최소한 packet 관리자와 reviewer는 분리한다. 가능하면 실제 ID mapping 접근자와 Stage 1 질의 대응자도 분리한다.

## 2. 시작 전 체크리스트

- [ ] 키트 버전과 protocol 버전 일치
- [ ] `npm run research:oe:expert-kit:check` 통과
- [ ] `validation_report.json` 상태 `PASS`
- [ ] 사전등록 템플릿 서명·시간 고정
- [ ] reviewer 6~8명과 역할 최소 조건 승인
- [ ] 이해상충·비밀유지·보상·철회 절차 승인
- [ ] 연락처와 연구 응답 데이터의 저장 위치 분리
- [ ] 원본 read-only·수정본·correction note 처리 시험
- [ ] Stage 1과 Stage 2의 권한 분리 시험
- [ ] 잘못된 파일 공개 시 사고 대응 담당자 확정

## 3. slot 배정

1. 실제 이름은 연락처 관리 시스템에만 둔다.
2. 연구 데이터에는 `R01`~`R08`만 사용한다.
3. `reviewer_roster_template.csv`에 역할 코드·이해상충 상태를 기록한다.
4. 중도 이탈 slot을 다른 사람에게 재사용하지 않는다. replacement에는 새 버전의 추가 slot을 발행한다.
5. 8명보다 적게 끝나도 최소 6명과 역할 조건을 충족해야 판정할 수 있다.

권장 역할 코드: `PSYCHOMETRIC`, `PERSONALITY`, `KOREAN_ITEM`, `UX_2030`, `ACCESS_BIAS`.

## 4. reviewer별 발송 절차

### Stage 1

- brief·codebook·response guide를 제공한다.
- `generated/reviewer/Rxx_stage1_blind.csv` 중 해당 slot 하나만 복사해 제공한다.
- 내부 폴더나 repository 링크를 공유하지 않는다.
- 발송 전 실제 ID·target·key·다른 응답이 없는지 마지막으로 확인한다.
- 발송 시각과 manifest의 Stage 1 SHA-256을 lock log에 기록한다.

### Stage 1 수신·잠금

- 원본 수신 시각을 기록하고 write access를 제거한다.
- 열·행·opaque ID·slot·누락 여부를 확인한다.
- 원본 hash를 별도 계산해 보존한다. 입력된 파일은 빈 템플릿 hash와 달라지는 것이 정상이다.
- 기술적 누락은 원본을 보존한 채 correction note로만 보완한다.
- lock 담당자와 확인 시각을 기록한 다음에만 Stage 2를 공개한다.

### Stage 2

- `DO_NOT_RELEASE_BEFORE_STAGE1_LOCK_Rxx...csv`에서 같은 slot 하나만 복사한다.
- target 공개 전에 Stage 1 수정 권한이 실제로 제거됐는지 다시 확인한다.
- 수신·잠금 뒤에는 작성 근거·예상 위험·집계 결과를 바로 공유하지 않는다.

## 5. 허용되는 질의 대응

답할 수 있음:

- 파일 여는 방법, CSV 입력 형식, 평정 숫자의 공통 의미
- 코드북 정의의 문구를 그대로 다시 설명
- 철회·중단·접근성 조정 절차

답할 수 없음:

- “이 문항은 사실 상상 확장인가요?” 같은 target 확인
- HIGH/LOW 정답, 기존 척도 출처, 다른 reviewer의 선택
- 특정 점수를 선택하도록 유도하는 사례 해설

모든 내용 질의와 답변은 slot·시각·응답자를 기록한다. 여러 reviewer에게 영향을 줄 공통 설명이 필요하면 연구를 잠시 멈추고 protocol deviation 여부를 판단한다.

## 6. 사고·중단 규칙

| 사고                         | 즉시 조치                      | 데이터 처리 판단                           |
| ---------------------------- | ------------------------------ | ------------------------------------------ |
| Stage 1 전 target/key 노출   | 해당 slot 중단, 추가 공개 차단 | 사전등록 제외 규칙 적용, 새 slot 여부 승인 |
| 다른 reviewer 응답 노출      | 관련 slot 중단·접근 회수       | 독립성 훼손 범위 기록                      |
| 잘못된 packet 전달           | 두 파일 회수·폐기 요청         | 열람 여부 확인 후 사용 가능성 판정         |
| Stage 1 잠금 전 Stage 2 공개 | 해당 slot 중단                 | blind 결과 원칙상 제외 검토                |
| 파일 손상·행 누락            | 원본 보존                      | 내용 미노출이면 동일 packet 재전달 가능    |
| 철회·삭제 요청               | 분석 중단·담당자 이관          | 승인된 보관·삭제 정책 실행                 |

사고를 숨기거나 새 packet으로 조용히 교체하지 않는다. deviation log와 최종 보고서에 남긴다.

## 7. 완료 후 인계

모든 유효 Stage 1·2가 잠긴 뒤에만 분석 담당자에게 가명 응답 사본, mapping key, preregistration, deviation log를 전달한다. 연락처·보상 정보는 전달하지 않는다.

판정 회의가 끝나면 각 후보의 revision ID·결정·근거·소수 의견을 decision log에 보존하고, M05 후보 packet은 새 버전으로 다시 생성한다.
