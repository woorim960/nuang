# 뉴앙 성향지도 콘텐츠 데이터 계약 v1

- 계약: `nuang-trait-map-content.v1`
- 상태: `DESIGN_CONTRACT_NOT_CUSTOMER_CONTENT`
- 목적: 5축·10개 세부 성향·32개 역할형·관계별 설명을 중복 없이 저장하고, 측정 근거와 승인 상태에 맞는 화면에만 노출한다.

## 이 계약이 먼저 필요한 이유

성향별 장문을 먼저 작성하면 같은 설명이 성향지도, 개인 리포트, 비교 리포트,
프로필에 복사된다. 이후 문항이나 근거가 바뀔 때 어느 문장을 고쳐야 하는지
추적하기 어렵다. v1은 문장을 작은 `content atom`으로 나누고 한 문장의 근거,
필요한 입력, 개인정보 범위, 노출 화면과 검토 상태를 함께 저장한다.

역할형 이름은 기억과 공유를 돕는 표현이다. 이름 자체를 채점 근거나 관계 능력,
성숙도, 우열의 증거로 사용하지 않는다.

## 고정된 콘텐츠 계층

```text
성향지도 릴리스
├── 대표 축 5개
│   └── 세부 성향 10개
├── 역할형 성향 32개
└── 콘텐츠 조각
    ├── 일반 설명
    ├── 가족·친구·연인·관심 있는 사람·업무 맥락
    ├── 처음 드는 생각·실제 나타나는 반응
    ├── 강점·마찰·오해·대화 질문
    └── 한계와 근거
```

### 대표 축

| 순서 | 축  | 고객 표기 | 채점상 높은 방향 | 세부 성향           |
| ---: | --- | --------- | ---------------- | ------------------- |
|    1 | SE  | E/I       | E                | SE-RE, SE-AI        |
|    2 | OE  | R/N       | N                | OE-AE, OE-CI, OE-IE |
|    3 | RO  | G/A       | A                | RO-EC               |
|    4 | SM  | K/M       | K                | SM-EP, SM-OS        |
|    5 | ER  | C/Q       | Q                | ER-IR, ER-WD        |

고객 표기 순서와 채점상 높은 방향을 별도 필드로 둔다. R/N, G/A, C/Q처럼
화면의 왼쪽 글자가 채점의 높은 방향이 아닌 축도 있으므로 배열 순서로 점수
방향을 추론해서는 안 된다.

## 콘텐츠 조각 계약

각 문구는 다음 정보를 가진다.

- `atomId`: 변경되어도 의미를 추적할 수 있는 안정적인 ID
- `entity`: 축, 세부 성향, 역할형 성향 중 설명 대상
- `slot`: 요약, 측정 범위, 가족, 친구, 업무, 오해, 대화 질문 등의 용도
- `context`: 일반·가족·친구·연인·관심 있는 사람·업무
- `copy`: 짧은 문구와 필요 시 표준·장문 문구
- `claimRefs`, `evidenceRefs`: 주장과 근거 연결
- `requiredSignals`: 해당 문구를 보여주기 위해 실제로 필요한 검사·맥락 데이터
- `privacyScope`: 본인 전용, 비교 가능, 공개 가능
- `surfaces`: 성향지도, 개인 리포트, 비교 리포트, 공개 프로필, 근거 페이지
- `publicationState`: 연구용, 검토 후보, 승인, 게시, 폐기
- `reviews`: 심리·측정·안전·쉬운 문장 검토 상태
- `version`: 같은 의미 문구의 수정 버전

## 노출 안전 규칙

1. 고객에게 승인·게시되는 문구는 claim과 근거를 모두 가져야 한다.
2. 게시 문구는 심리, 측정, 제품 안전, 쉬운 문장 검토를 모두 통과해야 한다.
3. `처음 드는 생각`과 `실제 나타나는 반응`은 본인 전용으로 시작한다.
4. 본인 전용 문구는 비교 리포트와 공개 프로필에 들어갈 수 없다.
5. 관계별 문구는 대표 코드만으로 만들지 않고 `relationship_context` 입력을 요구한다.
6. 역할형 이름은 `memory_aid_not_scoring_evidence`로 고정한다.
7. 아직 검증되지 않은 콘텐츠는 내부에 보관하되 고객 화면 구성 쿼리에서 제외한다.

## 권장 DB 분리

실제 DB로 옮길 때에는 한 거대 JSON 대신 다음 단위로 나눈다.

- `trait_map_release`: 계약·검사·채점·문구 버전 묶음
- `trait_map_axis`, `trait_map_facet`, `trait_map_role_profile`: 탐색용 기준 정보
- `trait_map_content_atom`: 실제 화면 문구와 상태
- `trait_map_content_claim_link`: 문구와 claim의 다대다 연결
- `trait_map_content_evidence_link`: 문구와 근거의 다대다 연결
- `trait_map_content_review`: 역할별 검토 원응답과 승인 이력

고객 API는 `published` 상태이면서 요청 화면과 개인정보 범위가 일치하는 문구만
반환한다. 운영자가 상태를 바꾸더라도 과거 리포트는 저장된 릴리스 ID로 같은
설명을 다시 읽을 수 있어야 한다.

## 화면 구현 순서

1. 성향지도 홈은 5축과 32개 역할형 탐색 구조만 사용한다.
2. 한 역할형 상세 화면으로 필요한 `slot`과 문장 길이를 검증한다.
3. 승인된 공통 축·세부 성향 문구를 먼저 재사용한다.
4. 역할형 고유 상호작용 문구는 단일 축 설명과 분리해 저장한다.
5. 관계별 설명과 나와 비교하기는 필요한 관계 데이터와 근거가 준비된 뒤 연결한다.
6. 한 역할형 템플릿 승인 후 나머지 31개에 확장한다.

## 구현 파일

- 코드 계약: `src/features/nuang-code/trait-map-content-contract-v1.ts`
- 자동 검증: `src/features/nuang-code/trait-map-content-contract-v1.test.ts`
- ENAKQ 대표 템플릿 데이터: `src/features/nuang-code/enakq-trait-map-template-v1.ts`
- ENAKQ 대표 템플릿 화면: `src/features/map/EnakqTraitMapTemplate.tsx`
- 내부 검토 주소: `/map/ENAKQ`
- 기존 claim 원장: `src/features/nuang-code/trait-map-knowledge-contract.ts`

v1은 기존 claim 원장을 대체하지 않는다. claim 원장은 무엇을 말할 수 있는지를
관리하고, 콘텐츠 계약은 그 주장을 어느 문구와 화면에서 어떻게 사용할지를
관리한다.

ENAKQ 템플릿은 화면의 정보량·탐색 순서·상황 전환을 확인하기 위한 첫 구현이다.
현재 콘텐츠 조각은 모두 `research_only`이며 `/map`의 32개 목록에서 자동으로
노출하지 않는다. Gate C와 후속 검토를 거쳐 claim과 문구가 승인되기 전에는
나머지 31개 성향으로 복제하거나 `published`로 승격하지 않는다.
