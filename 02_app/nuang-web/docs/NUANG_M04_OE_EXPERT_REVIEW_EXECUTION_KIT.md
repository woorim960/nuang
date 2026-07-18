# NUANG M04 OE 전문가 blind review 실행 키트

작성일: 2026-07-17 KST  
문서 상태: `EXECUTION_KIT_V0_1_OWNER_REVIEW`  
측정 상태: `NOT_AUTHORIZED_FOR_RECRUITMENT_OR_SCORING`  
MVP 정렬 상태: `INTERNAL_TEMPLATE_ONLY_PENDING_FULL_CORE_REVIEW_DESIGN`  
키트 버전: `m04-oe-expert-kit.v0.1`  
대상: OE-AE·OE-CI·OE-IE 후보 36문항  
이번 단계에서 하지 않는 일: 전문가 접촉·모집·보상, 응답 수집, 결과 판정, 사용자 코드 발급, 운영 DB·앱 변경

관련 문서:

- [M04/M05 실행 사양](./NUANG_M04_OE_EXPERT_AND_COGNITIVE_REVIEW_PROTOCOL.md)
- [OE 3-facet 세트 균형 감사](./NUANG_M03_OE_THREE_FACET_SET_BALANCE_AUDIT.md)
- [검토자 안내](./research/oe-m04/reviewer/01_REVIEWER_BRIEF.md)
- [blind 구성개념 코드북](./research/oe-m04/reviewer/02_BLIND_CONSTRUCT_CODEBOOK.md)
- [2단계 응답 가이드](./research/oe-m04/reviewer/03_STAGE1_STAGE2_RESPONSE_GUIDE.md)
- [내부 운영 runbook](./research/oe-m04/internal/01_COORDINATOR_RUNBOOK.md)
- [사전등록 템플릿](./research/oe-m04/internal/02_PREREGISTRATION_TEMPLATE.md)
- [판정 가이드](./research/oe-m04/internal/03_ADJUDICATION_GUIDE.md)
- [자동 검증 결과](./research/oe-m04/generated/internal/validation_report.json)

## 0. 이번 단계의 결론

36개 후보를 전문가가 target을 모르는 상태에서 먼저 분류하고, 그 응답을 잠근 다음에만 target을 공개하는 실행 키트를 만들었다.

```text
운영 승인·사전등록
→ reviewer slot 배정
→ 해당 slot의 Stage 1 blind packet만 전달
→ 제출 완료·hash 확인·수정 잠금
→ 같은 slot의 Stage 2 target reveal 전달
→ Stage 2 제출 잠금
→ 6~8명 완료 후 사전등록 기준대로 집계
→ 독립 adjudication
→ M05 인지 인터뷰 후보 revision 발행
```

이 키트는 연구를 실행할 수 있는 형식만 완성했다. `OWNER_REVIEW`는 문항이 통과했다는 뜻이 아니며, 모집 승인도 아니다.

2026-07-17 MVP 재점검에 따라 이 키트는 전 5영역 통합 M04의 익명화·무작위화·잠금 기술 템플릿으로 보존한다. OE 단독 외부 모집은 전 코어 후보 은행과 통합 seam 감사가 끝날 때까지 시작하지 않으며, OE 결과만으로 전체 뉴앙 코드나 고객 공개 MVP를 승인하지 않는다.

## 1. 파일 구성과 공개 범위

| 위치                                               | 대상                  | 내용                             | 공개 시점                       |
| -------------------------------------------------- | --------------------- | -------------------------------- | ------------------------------- |
| `reviewer/01_REVIEWER_BRIEF.md`                    | reviewer              | 독립성·과제·주의사항             | Stage 1 시작 전                 |
| `reviewer/02_BLIND_CONSTRUCT_CODEBOOK.md`          | reviewer              | target을 특정하지 않는 중립 정의 | Stage 1 시작 전                 |
| `reviewer/03_STAGE1_STAGE2_RESPONSE_GUIDE.md`      | reviewer              | 각 열의 의미·응답 규칙           | Stage 1 시작 전                 |
| `generated/reviewer/Rxx_stage1_blind.csv`          | 해당 reviewer         | 실제 ID·target·key를 가린 36문항 | Stage 1에서 해당 slot만         |
| `generated/internal/DO_NOT_RELEASE...Rxx...csv`    | 해당 reviewer, 운영자 | target·key·의도 공개 평가표      | 해당 reviewer의 Stage 1 잠금 후 |
| `generated/internal/opaque_item_mapping.csv`       | 제한된 운영자         | opaque ID와 실제 후보 ID 대응    | reviewer에게 공개 금지          |
| `generated/internal/reviewer_roster_template.csv`  | 제한된 운영자         | 역할 충족·이해상충·단계 상태     | 내부 전용                       |
| `generated/internal/packet_lock_log.csv`           | 제한된 운영자         | 발송·수신·잠금·hash 기록         | 내부 전용                       |
| `generated/internal/adjudication_decision_log.csv` | 판정 회의             | 문항별 증거와 최종 결정          | 모든 독립 응답 잠금 후          |
| `generated/internal/packet_manifest.json`          | 제한된 운영자         | 생성 파일 hash·버전              | 내부 전용                       |
| `generated/internal/validation_report.json`        | 운영·감사             | 배열 제약 자동 검증 결과         | 내부 전용                       |

`internal` 경로의 파일을 공유 폴더 전체 링크로 전달하지 않는다. Stage 1과 Stage 2는 reviewer별 개별 사본으로 전달하고, 원본 생성 파일은 읽기 전용으로 유지한다.

## 2. 자동 생성된 packet의 보장 범위

키트 생성기는 현재 다음을 확인한다.

- 후보 36개, opaque ID 36개, 중복 없음
- OE-AE·OE-CI·OE-IE 각각 12개
- HIGH 18개·LOW 18개
- reviewer 8명분의 제시 순서가 모두 다름
- 같은 상황의 HIGH/LOW 쌍은 모든 packet에서 18칸 떨어짐
- 같은 facet은 3개 이상 연속하지 않음
- 같은 keyed direction은 4개 이상 연속하지 않음
- 직접 부정문은 서로 붙지 않음
- 첫 6문항에 세 facet과 두 방향이 모두 포함됨
- Stage 1에 실제 candidate ID·target·주력/탐색 상태가 포함되지 않음
- 모든 packet과 manifest가 같은 seed·버전에서 재현됨

자동 검사는 심리측정 타당성을 증명하지 않는다. 제시 순서 오류와 target 누출 같은 실행 오류를 줄이는 장치다.

## 3. 실행 전 하드 게이트

다음 항목이 하나라도 비어 있으면 reviewer에게 연락하지 않는다.

1. 측정 책임자와 독립 심리측정 책임자가 지정됐다.
2. 사전등록 템플릿의 연구 질문·판정 기준·제외 규칙이 잠겼다.
3. 6~8명의 역할 구성과 최소 인원 규칙이 승인됐다.
4. 보상·비밀유지·이해상충·데이터 보관·삭제 방식이 승인됐다.
5. 사용 도구의 접근 권한과 Stage 1 수정 잠금 방식이 실제로 시험됐다.
6. reviewer별 파일을 잘못 전달했을 때의 중단·폐기·재배정 절차가 정해졌다.
7. 외부 연구·발표 가능성이 있으면 연구윤리 검토 필요 여부가 판단됐다.

## 4. 실행 명령과 변경 통제

키트 재생성:

```bash
npm run research:oe:expert-kit
```

생성물 drift·누락 확인:

```bash
npm run research:oe:expert-kit:check
```

후보 문구·구조·seed·생성 로직이 바뀌면 기존 packet을 덮어쓴 채 계속 사용하지 않는다.

1. 새 프로토콜 버전을 발행한다.
2. 변경 이유와 영향받은 후보를 기록한다.
3. 새 packet을 생성하고 validation을 통과시킨다.
4. 이미 전달한 packet은 `RETIRED`로 표시한다.
5. 변경 전·후 응답을 하나의 사전등록 집계에 섞지 않는다.

## 5. reviewer 단위 실행 순서

| 순서 | 운영자 행동                                | 남겨야 할 증거        |
| ---: | ------------------------------------------ | --------------------- |
|    1 | 자격·역할·이해상충 확인 후 slot 배정       | roster 상태·역할 코드 |
|    2 | brief·codebook·guide와 해당 Stage 1만 전달 | 전달 시각·packet hash |
|    3 | 독립 응답임을 재확인하고 누락만 점검       | 질의·답변 로그        |
|    4 | Stage 1 원본을 수신하고 read-only로 잠금   | 수신·잠금 시각·담당자 |
|    5 | manifest hash와 일치 확인                  | lock verified 시각    |
|    6 | 같은 slot의 Stage 2만 전달                 | 공개 시각·packet hash |
|    7 | Stage 2 원본을 수신하고 잠금               | 수신·잠금 시각        |
|    8 | 두 단계 완료 상태만 roster에 기록          | `STAGE2_LOCKED`       |

운영자는 Stage 1 답변이 마음에 들지 않아도 교정하거나 재제출을 요청하지 않는다. 기술적 파일 손상과 명백한 누락만 원응답을 보존한 채 별도 보충 기록으로 처리한다.

## 6. 데이터 집계와 판정 경계

- 첫 facet 일치는 Stage 1의 첫 선택만 사용한다.
- Stage 2 관련성은 target 공개 후 평가이므로 blind mapping과 합산하지 않는다.
- 방향 추정의 `구분 어려움`을 임의로 절반 일치 처리하지 않는다.
- 평정은 평균 하나로 축약하지 않고 중앙값·분포·자유 서술을 함께 본다.
- 같은 비target으로 30% 이상 모이면 seam 위험으로 표시한다.
- 치명적 공정성·접근성 위험은 다수결로 자동 기각하지 않는다.
- 문항 작성자는 독립 reviewer 수에 포함하지 않는다.
- 6명 미만 또는 심리측정·성격심리 역할 공백이면 `PASS_TO_COGNITIVE`를 확정하지 않는다.

## 7. 완료 정의

이 실행 키트의 설계 완료 조건:

- reviewer용 자료와 내부 자료가 물리적으로 분리돼 있다.
- 8개 Stage 1과 대응 Stage 2의 순서·hash가 고정돼 있다.
- 사전등록·roster·lock·판정 기록 양식이 연결돼 있다.
- 자동 생성물을 재현하고 drift를 검출할 수 있다.
- 외부 실행 전 하드 게이트와 중단 조건이 명시돼 있다.

M04 연구 완료 조건은 별개다. 승인된 책임자 아래 실제 6~8명의 독립 응답을 잠그고, 사전등록된 기준으로 판정하고, revision과 소수 의견을 보존해야 한다.

## 8. 방법 근거

- AERA·APA·NCME의 *Standards for Educational and Psychological Testing*은 타당성을 점수 해석과 사용을 뒷받침하는 누적 증거로 다룬다: <https://www.testingstandards.net/open-access-files.html>
- CDC의 cognitive interviewing 안내는 응답자가 문항을 어떻게 이해하고 답을 만드는지 조사하는 목적을 설명한다: <https://www.cdc.gov/nchs/ccqder/question-evaluation/cognitive-interviewing.html>
- CDC/OMB Q-Bank standards는 인지 인터뷰의 연구 목적·표본·절차·분석·보고를 문서화하는 기준을 제시한다: <https://wwwn.cdc.gov/qbank/learn/CI-standards.aspx>

이 근거들은 뉴앙 문항의 타당성을 대신하지 않는다. 독립 blind 검토, 기록 가능한 판정, 후속 인지 인터뷰를 설계한 이유를 제공한다.
