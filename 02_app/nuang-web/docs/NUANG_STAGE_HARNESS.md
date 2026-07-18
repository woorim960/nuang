# NUANG Stage Harness

작성일: 2026-07-09 KST

이 문서는 컨텍스트 한계를 전제로 한 개발 운용 절차다. 이후 모든 단계는 작업 시작 전에 기준 문서를 읽고, 작업 결과가 기준과 어긋나지 않는지 자동 점검한다.

## 목표

- 대화 맥락이 압축되어도 제품 방향이 흔들리지 않게 한다.
- 홈, 피드, 검사, 성향지도, 마이의 역할을 매번 같은 기준으로 판정한다.
- MVP 출시와 무관한 기능 확장을 줄인다.
- 사용자 승인이 필요한 결정과 Codex가 진행 가능한 작업을 분리한다.
- `/feed`에서 확정한 인스타그램/스레드형 UX 리듬을 전 화면 개선의 기본 품질 기준으로 유지한다.

## 작업 시작 순서

모든 단계 시작 전 아래 문서를 우선 확인한다.

1. `docs/NUANG_MVP_MEASUREMENT_PRODUCT_REBASELINE.md`
2. `docs/NUANG_PRODUCT_CANON.md`
3. `docs/NUANG_CORE_MEASUREMENT_VALIDATION_PLAN.md`
4. `docs/NUANG_FINAL_CODE_SEMANTIC_AUDIT.md`
5. `docs/NUANG_UX_GUARDRAILS.md`
6. `docs/NUANG_ASSESSMENT_ARCHITECTURE.md`
7. `docs/NUANG_DYNAMIC_TRAIT_EVIDENCE_MODEL.md`
8. `docs/NUANG_FREE_TOPIC_ASSESSMENT_MAPPING_PROPOSAL.md`
9. `docs/NUANG_CODE_INTERPRETATION_DICTIONARY.md` — legacy 구현 감사용
10. `docs/NUANG_FEED_MVP_INTERACTION_DESIGN.md`
11. `docs/PROFILE_VISIBILITY_AND_COMPARISON_POLICY.md`
12. `docs/ACCOUNT_SHARE_API_RUNBOOK.md`
13. 현재 단계와 직접 관련된 테스트 또는 contract 파일

## 단계 기록 형식

각 단계는 아래 형식으로 기록한다.

```text
Stage ID:
Purpose:
Source docs:
Touched routes:
Touched features:
User approval needed:
Product risk:
Privacy risk:
Verification:
Next:
```

## 승인 게이트

운영 원칙:

- 새 기능을 구현하기 전에는 기획 의도, 사용자 경험 흐름, 화면 구조, API/DB 구현 흐름, 삭제하거나 닫을 기존 기능, 개인정보 영향, 테스트 범위를 먼저 정리해 사용자 승인을 받는다.
- 승인 게이트에 걸리는 단계가 오면 다른 단계로 넘기지 않고 사용자에게 먼저 승인 요청을 한다.
- 사용자가 승인하기 전에는 해당 단계의 구현, 노출, 배포, 외부 설정 변경을 진행하지 않는다.
- 승인 없이 진행 가능한 작업만 계속할 수 있으며, 이 경우에도 승인 게이트를 우회한 것으로 보이면 중단하고 확인한다.

사용자 승인이 필요한 경우:

- 결과 공유 링크, 상대 프로필 팝업, 1:1 비교 생성처럼 사용자 흐름을 바꾸는 기능 구현
- 공개 코드 재도입 결정
- 민감/치료성 검사 영역 오픈
- 하단 메뉴 구조 변경
- 전연령/19세 이상 기능 정책의 최종 진입 UX
- 개인정보처리방침, 이용약관, 법률 문구
- 외부 서비스 credential 또는 배포 도메인
- 캐릭터 32종 전체 생성처럼 비용이 커지는 asset 작업

사용자 승인 없이 진행 가능한 경우:

- 문서와 자동 점검 정리
- 명백한 메뉴 역할 위반 수정
- 중복 이동 카드 제거
- 피드 preview와 `/feed` 분리 구현
- 함께 탭 제거와 기존 route redirect
- 결과 리포트/성향지도/검사 홈의 UX 개선
- 닫힌 API contract와 테스트 보강

## 자동 점검

기본 하네스 점검:

```bash
npm run harness:check
```

MVP 후보 점검:

```bash
npm run qa:mvp
```

`harness:check`는 제품 기준 문서와 핵심 route, 필수 문구, package script가 존재하는지 확인한다. 이후 단계에서 UI drift scan과 route별 금지어 scan을 점진적으로 강화한다.

## 현재 고정 결정

- 피드는 하단 메뉴에 넣는다. 홈에는 preview만 둔다.
- 피드 MVP 작성 형식, 리포트 preview, 오늘의 질문, 밸런스 게임, 뉴앙 코드별 통계는 `docs/NUANG_FEED_MVP_INTERACTION_DESIGN.md`를 기준으로 한다.
- 함께 탭은 제거한다. 1:1 비교는 프로필 팝업에서 시작하고, 리포트는 마이에서 다시 본다.
- 결과 공유의 기본 링크 복사 흐름은 리포트 상세의 `공유하기`와 30일 자동 만료 공유 주소를 중심으로 한다.
- 피드에 공유된 리포트 preview와 연결은 작성자가 해당 피드 글을 삭제하기 전까지 유지한다.
- 1:1 비교는 링크 직접 입력이 아니라 상대 프로필 팝업의 `나와 비교하기`에서 시작한다.
- 프로필 팝업에는 프로필 이미지가 보여야 한다. 캐릭터 이미지와 임시 성향 이미지는 프로필 이미지의 한 종류로 취급한다.
- 공개 코드는 사용자 경험에서 전면 폐기한다. 발급/입력 UI와 코드 중심 route를 만들지 않는다.
- 공개 코드 없는 대안은 공유 링크 token과 프로필 클릭 기반 `publicSnapshotId` 내부 연결이다.
- `202607100001_drop_public_profile_code.sql`은 공개 코드 legacy DB cleanup용 SQL이다. Step 179 server readiness에서 원격 DB의 `profile.profile_public_code`와 `target_public_code_id` 부재를 확인했다.
- `202607100002_free_topic_results.sql` 적용 후 원격 DB에서 `assessment.free_topic_result` 접근을 확인했다.
- `202607100003_feed_mvp_interactions.sql` 적용 후 원격 DB에서 `feed.feed_poll`, `feed.feed_poll_option`, `feed.feed_poll_vote` 접근을 확인했다.
- 개발 seed는 밸런스 게임 5표와 피드 공유 리포트 preview를 포함한다.
- 하단 메뉴에는 함께 탭을 넣지 않는다.
- 마이는 뉴앙 코드, 코드 이름, 캐릭터, 내 리포트, 설정만 간결하게 보여준다.
- 사용자 화면에서는 `5축`, `10축`이라는 표현을 쓰지 않고, `뉴앙 코드`, `코드 지도`, `코드 자리`, `세부 신호`를 사용한다.
- 현재 구현된 뉴앙 코드·32개 이름·비교 문장은 legacy v0.1 회귀 표면이다. 고객 공개 MVP의 작업 범례는 `E/I · R/N · G/A · K/M · C/Q`이며 전 5영역 검증·scoring/copy release·versioned migration 뒤에 교체한다.
- OE M04 실행 키트는 전 코어 통합 검토의 기술 템플릿으로 보존하되, 외부 OE 단독 검토를 전체 코드 승인으로 사용하지 않는다.
- 설정성 기능은 `마이 > 설정`으로 모은다.
- 전반 UI/UX는 피드 화면의 단일 스트림, 여백, 타이포, 얇은 경계선, 즉시 반응 가능한 액션 구조를 기준으로 개선한다.
- 정밀 코어는 영구 무료이며 공식 뉴앙 코드, 성향지도, 공개 프로필, 1:1 비교의 기준이다.
- 무료 주제 검사는 뉴앙의 체류 시간을 만드는 핵심 콘텐츠이며 승인된 성향 증거가 충분할 때 현재 대표 성향 코드를 갱신할 수 있다.
- 무료 주제 검사는 사용자가 검사를 더 수행할수록 성향 해상도, 현재 대표 성향, 세부 해석, 추천 품질을 더 구체화한다.
- 결제 여부는 성향 정확도 가중치가 아니며 무료와 유료는 같은 증거 기준을 사용한다.
- 상세검사는 후속 확장 영역이며 결제/상품 정책 승인 전에는 핵심 성향 경험을 막지 않는다.

## 현재 알려진 드리프트

아래 항목은 하네스 이후 우선 수정한다.

- 실제 카카오 연결 세션 기반 browser smoke와 RLS·직접 응답 비노출 증빙은 Step 182에서 통과했다.
- 강제 로그아웃 후 Google/Kakao provider 왕복 재로그인 smoke는 계정 접근과 외부 provider consent가 포함되므로 사용자 확인 후 진행한다.
- Supabase RLS와 직접 응답 비노출은 release candidate 전에 Step 182 기준으로 반복한다.
- release candidate 전 format 처리, Next 내부 PostCSS moderate advisory upstream 패치 여부, 법률/개인정보 최종 승인 상태를 별도 게이트로 닫는다.
- legacy `/together` 계열 route redirect와 기본 Playwright E2E 확장은 Step 180, Step 181에서 자동 검증 기준선으로 고정했다.

## 다음 작업 순서

1. `UIX-00` 최신 문항·코드·상태 계약을 골든 사용자 흐름에 다시 연결
2. S03-R 빠른·정밀 공통 검사 runner v3 brief·상태·정보구조 설계
3. S03-R 360px wireframe부터 사용자 승인 후 high-fidelity·동작 prototype 진행
4. 내부 AI dry-run에서 발견한 RO-EC direction anchor를 v0.2에 보완한 뒤 실제 사람 전문가 M04 blind review 실행
5. M05 모바일 인지 인터뷰와 문항/UI revision
6. 최소 정량 파일럿과 scoring/copy release
7. 새 코드·DB·API versioned migration
8. 온보딩→빠른 검사→간단 리포트→정밀 검사→상세 리포트→홈 골든 패스 완성
9. 지도·공유·피드·비교의 승인 release 재연결
10. 법률·보안·접근성·성능·smoke와 제한 베타 GO/NO-GO
