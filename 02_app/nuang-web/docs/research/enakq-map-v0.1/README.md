# ENAKQ 성향지도 외부 전문가 검토 운영 폴더

- 프로토콜: `enakq-trait-map-expert-review.v0.1`
- 패킷: `ENAKQ-EXPERT-PACKET.v0.1`
- 외부 검토 상태: `PACKET_READY_REVIEW_NOT_STARTED`
- 내부 비판 검토 상태: `INTERNAL_AGENT_CRITIQUE_COMPLETE_NOT_EXTERNAL_REVIEW`

## 현재 완료된 것

- ENAKQ 연구 초안의 158개 claim을 검토 단위로 고정했다.
- 각 claim에 canonical 원문 발췌, 근거 상태, 필수 데이터, 개인정보 범위를 연결했다.
- 성격심리·심리측정·관계/임상 안전 역할을 분리했다.
- claim당 최대 3개 역할을 배정하고 한 역할의 wave를 40개 이하로 나눴다.
- 위험도가 `critical`인 claim은 두 전문 분야 이상이 반드시 검토하도록 생성 규칙을 고정했다.
- 판정·평정·위험 플래그·수정 요구·근거를 수집할 공통 응답 계약을 만들었다.
- 역할별 독립 검토자 2명씩 총 6명의 roster 자리를 만들었다.
- 패킷 파일별 SHA-256을 manifest에 기록했다.
- 외부 검토 전에 성격심리·심리측정·관계/임상 안전 관점의 내부 전문
  에이전트가 claim을 독립적으로 비판 검토했다.
- 내부 검토 303건을 158개 claim에 다시 연결하고, 보류·수정·내부 수용으로
  보수적으로 조정했다.

패킷이 생성됐다는 사실은 외부 검토가 완료됐다는 뜻이 아니다. 현재 roster의 상태는 모두 `not_recruited`다. 실제 자격·신원·독립성을 확인한 사람의 응답만 외부 전문가 근거로 인정한다.

내부 전문 에이전트 검토 역시 외부 전문가 검토가 아니다. 내부 판정의
`accept`는 운영 승인으로 승격하지 않으며 원본 claim registry를 자동으로
변경하지 않는다.

## 내부 비판 검토 결과

| 구분                     | 개수 |
| ------------------------ | ---: |
| 고유 claim               |  158 |
| 역할별 내부 검토 응답    |  303 |
| 추가 근거가 필요해 보류  |   58 |
| 다음 연구 gate 전에 수정 |   50 |
| 내부 수용·운영 미승인    |   50 |
| 재작성 또는 제외 판정    |    0 |

가장 큰 반복 위험은 `evidence_mismatch` 77건과
`unmeasured_inference` 62건이었다. 대표 코드에서 실제 연락·갈등·돌봄·업무
행동이나 상대 마음을 바로 추론하지 않고, 5축과 세부 성향의 측정모형부터
확정하는 것이 다음 우선순위다.

- 역할별 원응답과 요약: `internal-critique/v0.1/`
- claim별 보수적 조정: `internal-critique/v0.1/analysis/INTERNAL_AGENT_ADJUDICATION.md`
- 수정 순서와 다음 연구 관문: `internal-critique/v0.1/analysis/REVISION_GATE_PLAN.md`

## 역할별 검토량

| 역할           | 고유 claim | wave |
| -------------- | ---------: | ---: |
| 성격심리       |         86 |    3 |
| 심리측정       |        119 |    3 |
| 관계/임상 안전 |         98 |    3 |

같은 claim이 여러 역할에 포함될 수 있으므로 세 수의 합은 158보다 크다. 한 역할 안에서는 claim이 중복되지 않는다.

## 폴더 구조

```text
generated/
├── reviewer/
│   ├── 00_REVIEWER_GUIDE.md
│   ├── personality_psychology_W1~W3.csv
│   ├── psychometrics_W1~W3.csv
│   └── relationship_safety_W1~W3.csv
└── internal/
    ├── claim_review_assignment.csv
    ├── reviewer_roster_template.csv
    ├── adjudication_template.csv
    └── packet_manifest.json
```

`reviewer` 폴더는 검토자에게 제공할 자료다. `internal` 폴더에는 역할 배정, 자격 확인, 불일치 조정, 파일 무결성 정보가 들어 있으므로 운영 담당자가 관리한다.

## 판정 처리 원칙

1. 각 역할의 두 검토자는 서로의 답을 보지 않고 먼저 독립적으로 응답한다.
2. `accept`, `revise`, `reject`, `insufficient_evidence`를 사용한다.
3. `revise`에는 구체적인 수정 요구가 반드시 있어야 한다.
4. 위험 플래그가 있으면 그대로 `accept`할 수 없다.
5. 한 claim의 역할별 판단이 다르면 원 응답을 보존하고 adjudication에 차이를 기록한다.
6. 다수결만으로 정하지 않고 구성개념·근거·측정·안전 이유를 함께 검토한다.
7. 전문가가 `accept`해도 인지 인터뷰와 정량 파일럿 전에는 `APPROVED`로 올리지 않는다.

## 생성과 확인

```bash
npm run research:enakq:expert-packet
npm run research:enakq:expert-packet:check
npm run research:enakq:internal-critique:check
npm run research:enakq:internal-critique:analyze
npm run research:enakq:internal-critique:analysis:check
```

원문·근거 원장·claim registry·배정 규칙이 바뀌면 패킷을 다시 생성한다. `--check`는 생성 파일과 manifest의 현재 버전이 일치하는지 확인한다.

## 다음 운영 단계

1. 내부 검토의 P0 안전·개인정보 claim을 별도 변경안으로 작성한다.
2. 다섯 축과 facet의 포함·제외 정의, 양극성, 판정 보류 규칙을 확정한다.
3. 수정된 축·문항을 2030 한국어 사용자 인지 인터뷰로 보낸다.
4. 역할별 자격 요건에 맞는 실제 검토자를 모집한다.
5. 신원·학위/면허 또는 연구 실적·이해관계·독립성을 확인한다.
6. 각 검토자에게 roster ID를 배정하고 동일한 역할 패킷의 복사본을 제공한다.
7. wave별 응답 파일을 잠그고 SHA-256과 수령 시각을 기록한다.
8. 응답 계약 검증과 정성 분석을 거쳐 claim별 결정을 조정한다.
9. 측정모형·과정 코드·관계 장면을 단계별 정량 파일럿으로 검증한다.

실제 사람을 모집·연락하거나 외부 검토를 완료했다고 기록하는 작업은 별도의 사용자 승인과 외부 협력이 필요하다.
