# NUANG S03 Context Label DB Migration Plan

작성일: 2026-07-17 KST  
상태: M02 확장 필드 계약 반영 대기 · 구현 보류 · 원격 DB 미적용  
관련 문서: `NUANG_S03_CORE_ASSESSMENT_RUNNER_DESIGN_SPEC.md`

측정·문항 검증 선행 계획: `NUANG_CORE_MEASUREMENT_VALIDATION_PLAN.md`

최신 문항·응답·필드 계약: [NUANG_M02_ITEM_AND_RESPONSE_SPEC.md](./NUANG_M02_ITEM_AND_RESPONSE_SPEC.md)

> 이 문서의 `content_release + content_item` 분리와 무중단 migration 원칙은 유지한다. M02에서 추가한 revision, keyed direction, response format, 검증·권리·오염 위험, 판단 어려움 이유 필드는 M02 승인 뒤 이 migration 계획에 통합한다. 아래 SQL은 실행용 최종안이 아니다.

## 0. 결론

`contextLabel`은 사용자의 응답 데이터가 아니라 버전이 고정된 검사 문항 콘텐츠다. 따라서 `assessment.assessment_response`나 `assessment.assessment_attempt`에 복제하지 않고, 새 문항 콘텐츠 테이블의 `context_label` 컬럼으로 관리한다.

구현 시에는 프론트 타입만 변경하지 않는다. 아래 다섯 계층을 한 배포 단위로 맞춘다.

1. Supabase migration과 seed
2. DB read contract와 API DTO
3. 프론트 `AssessmentItem.contextLabel`
4. IndexedDB release cache
5. `AssessmentRunner` 상황 라벨 렌더링

## 1. 현재 저장 구조

현재 저장소 기준:

- 코어 문항 콘텐츠: `src/features/assessment/quick-core-seed.ts`의 코드 seed
- 프론트 타입: `AssessmentItem`에 `text`만 있고 `contextLabel`은 없음
- DB의 `assessment.assessment_attempt`: 검사 종류와 `item_release_version` 보관
- DB의 `assessment.assessment_response`: `item_id`, 1~5 값, skipped 여부 보관
- DB에는 버전별 코어 문항 원문을 보관하는 canonical table이 없음

따라서 기존 응답 테이블에 `context_label`을 추가하는 방식은 사용하지 않는다. 그렇게 하면 같은 라벨이 응답 수만큼 중복되고, 라벨 변경 이력과 release 재현성이 깨진다.

## 2. 목표 DB 모델

### 2.1 `assessment.content_release`

검사 문항 묶음의 불변 버전을 관리한다.

| 컬럼 | 타입 | 규칙 |
|---|---|---|
| `release_id` | `text` | PK, 프론트 `releaseId` 및 attempt의 `item_release_version`과 동일 |
| `assessment_slug` | `text` | 예: `nu-core-quick` |
| `assessment_kind` | `text` | `quick` 또는 `full` |
| `status` | `text` | `draft`, `published`, `retired` |
| `content_hash` | `text` | draft에서는 null 가능, publish 시 순서·라벨·질문·채점 메타데이터를 포함한 hash 필수 |
| `published_at` | `timestamptz` | draft에서는 null 가능 |
| `created_at` | `timestamptz` | 기본 `now()` |

### 2.2 `assessment.content_item`

release별 문항 콘텐츠를 관리한다.

| 컬럼 | 타입 | 규칙 |
|---|---|---|
| `release_id` | `text` | `content_release.release_id` FK |
| `item_id` | `text` | release 안의 문항 식별자 |
| `position` | `smallint` | 1부터 시작, release 안에서 unique |
| `domain_id` | `text` | 내부 채점 도메인 |
| `facet_id` | `text` | 내부 채점 facet |
| `context_label` | `text` | 고객에게 보이는 상황 라벨 |
| `prompt_text` | `text` | 고객에게 보이는 질문 문장, 프론트 `text`로 매핑 |
| `is_reverse` | `boolean` | 역채점 여부 |
| `created_at` | `timestamptz` | 기본 `now()` |

기본 제약:

- PK: `(release_id, item_id)`
- unique: `(release_id, position)`
- `position > 0`
- `context_label = trim(context_label)`
- `char_length(context_label)`은 2~40자
- `prompt_text = trim(prompt_text)`이며 빈 문자열 금지
- 새로 publish하는 코어 release에서는 `context_label not null`
- published release의 item은 수정·삭제하지 않고 새 `release_id`를 만든다.

## 3. SQL 마이그레이션 형태

실제 파일명은 구현 시점의 최신 migration timestamp로 만든다. 아래는 계약을 설명하기 위한 초안이며 아직 실행하지 않는다.

```sql
create table assessment.content_release (
  release_id text primary key,
  assessment_slug text not null,
  assessment_kind text not null
    check (assessment_kind in ('quick', 'full')),
  status text not null default 'draft'
    check (status in ('draft', 'published', 'retired')),
  content_hash text,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  check (
    status <> 'published'
    or (published_at is not null and content_hash is not null)
  )
);

create table assessment.content_item (
  release_id text not null
    references assessment.content_release(release_id) on delete restrict,
  item_id text not null,
  position smallint not null check (position > 0),
  domain_id text not null,
  facet_id text not null,
  context_label text not null,
  prompt_text text not null,
  is_reverse boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (release_id, item_id),
  unique (release_id, position),
  check (context_label = trim(context_label)),
  check (char_length(context_label) between 2 and 40),
  check (prompt_text = trim(prompt_text)),
  check (char_length(prompt_text) > 0)
);
```

최종 migration에는 다음도 포함한다.

- 두 테이블 RLS 활성화
- anon/authenticated의 직접 insert·update·delete 차단
- 운영 seed와 발행 작업은 service role 또는 승인된 admin 경로에서만 실행
- 고객 앱은 승인된 published release만 서버 read contract를 통해 읽음
- 필요한 인덱스: `(assessment_slug, assessment_kind, status)`, `(release_id, position)`

## 4. 필드 매핑

| DB | API DTO | 프론트 도메인 |
|---|---|---|
| `release_id` | `releaseId` | `AssessmentDefinition.releaseId` |
| `item_id` | `itemId` | `AssessmentItem.itemId` |
| `position` | `position` | 배열 순서 검증에 사용 |
| `context_label` | `contextLabel` | `AssessmentItem.contextLabel` |
| `prompt_text` | `text` | `AssessmentItem.text` |
| `domain_id` | `domainId` | `AssessmentItem.domainId` |
| `facet_id` | `facetId` | `AssessmentItem.facetId` |
| `is_reverse` | `isReverse` | `AssessmentItem.isReverse` |

API 경계에서 snake_case를 camelCase로 한 번만 변환한다. UI 컴포넌트가 DB 컬럼명을 직접 알게 하지 않는다.

## 5. 응답·로컬 저장과의 관계

- `assessment.assessment_response`에는 계속 `item_id`, 값, 판단하기 어려움 여부만 저장한다.
- 상황 라벨과 질문 원문을 응답 row에 복제하지 않는다.
- attempt의 `item_release_version`으로 완료 당시 콘텐츠 release를 재현한다.
- 기존 attempt가 참조하는 모든 구 release를 DB에 등록하기 전에는 `item_release_version`에 FK를 강제로 추가하지 않는다. 이력이 정리된 뒤 `not valid` FK를 추가하고 검증하는 contract 단계로 분리한다.
- IndexedDB attempt에는 현재처럼 `releaseId`와 `itemIds`를 저장한다.
- 오프라인 release cache에는 `contextLabel`과 `text`를 함께 저장한다.
- 구 앱이나 구 캐시가 `contextLabel`을 보내지 않으면 UI는 빈 라벨 영역 없이 질문만 표시한다.
- 로그인 후 결과 claim에도 문항 라벨 원문을 payload로 전송하지 않는다.

## 6. 무중단 적용 순서

1. 원격 DB를 read-only로 점검해 저장소 migration과 실제 schema가 일치하는지 확인한다.
2. 새 content table, 제약, RLS, grant를 추가하는 expand migration을 적용한다.
3. 승인된 빠른 코어 문항을 새 release로 seed한다. 문항 수는 M02·M03·검증 결과로 확정하며 `context_label`과 `prompt_text`는 콘텐츠 매트릭스와 정확히 일치해야 한다.
4. DB read 결과와 기존 코드 seed의 itemId·순서·채점 메타데이터를 비교하는 검증 스크립트를 실행한다.
5. 서버 read contract에 DB 우선·코드 seed fallback을 추가한다.
6. 프론트 타입, offline cache, runner를 `contextLabel` 대응으로 배포한다.
7. 새 attempt부터 새 `release_id`를 사용하고, 기존 진행 중 attempt는 기존 코드 seed로 끝낼 수 있게 유지한다.
8. 관찰 기간 동안 오류율, release 불일치, null 라벨을 확인한다.
9. 모든 과거 `item_release_version`이 `content_release`에서 조회되는지 확인한 뒤에만 attempt FK 추가 여부를 검토한다.
10. 안정화 후 코드 seed fallback 제거 여부를 별도로 승인받는다.

정밀 코어는 빠른 코어 경로가 안정화된 뒤 별도 release와 동일한 검수 절차로 적용한다. 60문항은 과거 구현 수치이며 새 세부 신호 커버리지와 검증 결과에 따라 갱신한다.

## 7. 롤백

- 화면·API 문제 발생 시 feature flag 또는 read adapter를 코드 seed fallback으로 되돌린다.
- 새 테이블과 seed row는 즉시 drop하지 않는다. 기존 attempt가 해당 `release_id`를 참조할 수 있기 때문이다.
- published release는 수정하지 않고 `retired`로 전환한다.
- 잘못된 문구는 동일 release에서 update하지 않고 교정된 새 release를 발행한다.
- rollback 중에도 `assessment_response` 구조는 바뀌지 않으므로 사용자 응답 데이터는 유지된다.

## 8. 구현 검증 기준

- 빠른·정밀 release는 각각 승인 metadata의 `item_count`와 정확히 같은 수의 item을 가진다.
- position이 1부터 연속되고 중복되지 않는다.
- published 코어 item의 `context_label`은 null·공백이 없다.
- `content_hash`는 `context_label` 변경 시 반드시 달라진다.
- API DTO에서 `context_label → contextLabel` 매핑 테스트가 통과한다.
- 구 release의 null fallback과 새 release의 필수 라벨 경로를 모두 테스트한다.
- anon/authenticated 사용자는 content table을 직접 수정할 수 없다.
- 서버 read는 published release만 반환한다.
- `assessment_response`, 분석 이벤트, 공개 결과에 상황 라벨과 질문 원문이 복제되지 않는다.
- DB migration lint, 타입 검사, component test, IndexedDB 이어하기, 브라우저 smoke가 통과한다.

## 9. 실제 구현 시 변경 대상

- `supabase/migrations/<timestamp>_assessment_content_release.sql`
- 빠른/정밀 코어 release seed 또는 승인된 admin import 스크립트
- `src/features/assessment/types.ts`
- `src/features/assessment/quick-core-seed.ts`와 정밀 코어 정의
- DB read adapter/API DTO와 contract test
- IndexedDB release cache
- `src/features/assessment/AssessmentRunner.tsx`
- migration/readiness smoke와 RLS 검증

원격 DB 적용과 seed 발행은 되돌리기 어려운 외부 상태 변경이므로, 구현 단계에서 migration SQL과 대상 release 내용을 다시 보여주고 사용자 승인을 받은 뒤 실행한다.
