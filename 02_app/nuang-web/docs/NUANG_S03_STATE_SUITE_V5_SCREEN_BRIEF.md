# NUANG S03-R 상태 suite v5 화면 brief

작성일: 2026-07-18 KST  
상태: `REVISED_STATE_SUITE_V5_OWNER_REVIEW`  
작업 ID: `UIX-01_LOADING_MASCOT_AND_LAST_SIMPLIFICATION_V5_REVIEW`  
선행 문서: [NUANG_S03_STATE_SUITE_V4_SCREEN_BRIEF.md](./NUANG_S03_STATE_SUITE_V4_SCREEN_BRIEF.md)

## 0. 목표

로딩은 앱다운 캐릭터와 의미 있는 지속 동작으로 기다림을 이해시키고, 마지막 문항은 불필요한 장식을 덜어 검사 자체에 집중시킨다.

## 1. 로딩 문구 위계

- 고정 설명은 `답하기 편한 화면을 준비하고 있어요.`로 사용한다.
- 처리 단계는 `질문을 불러오고 있어요` → `화면을 정리하고 있어요` → `곧 첫 질문을 보여드릴게요`로 전환한다.
- `곧 첫 질문을 보여드릴게요`는 처리 단계에서 한 번만 표시한다.
- 실제 앱에서는 시간 기반 전환이 아니라 질문 로드와 runner 준비 lifecycle에 연결한다.

## 2. 마지막 문항 단순화

- 본문의 `마지막 질문` 태그를 제거한다.
- 마지막 여부는 app bar의 `마지막 질문이에요`, `20 / 20`, 100% 연속 progress로 충분히 전달한다.
- 제거한 태그를 다른 장식으로 대체하지 않는다.
- 본문은 `상황`과 질문을 바로 보여주며 일반 문항과 같은 위치·간격을 유지한다.
- 주 행동 `결과 보기`가 마지막 단계의 유일한 강조 요소다.

## 3. 뉴앙 로딩 캐릭터 v2

- 운영 asset: `public/assets/assessment/nuang-loading-mascot-v2.png`
- 투명 master: `public/assets/assessment/nuang-loading-mascot-v2-alpha.png`
- 생성 원본: `public/assets/assessment/nuang-loading-mascot-v2-source.png`
- 기존 사실적인 clay/gel 군집 대신 뉴앙 메인 캐릭터가 빛나는 핵을 두 손으로 모으는 장면을 사용한다.
- 표현 방식은 고급 2D 앱 일러스트, 정돈된 cel shading, 단순한 실루엣으로 고정한다.
- 물리적인 장난감·도자기·플라스틱처럼 보이는 사실적 재질은 사용하지 않는다.
- 이미지 안에는 텍스트, 로고, 운영체제 이모지, UI panel을 넣지 않는다.

## 4. 로딩 전용 motion

- 캐릭터는 2.6초 주기의 미세한 집중 호흡을 계속한다.
- 중앙 핵은 1.6초 주기로 낮은 진폭의 glow pulse를 유지한다.
- 서로 다른 다섯 성향 신호가 바깥에서 핵으로 순차 이동하며 응답을 모으는 의미를 전달한다.
- 신호는 theme-derived series color와 서로 다른 둥근 형태를 함께 사용한다.
- 회전 spinner, 의미 없는 궤도선, 무관한 장식을 사용하지 않는다.
- `prefers-reduced-motion`에서는 캐릭터·핵·신호 이동을 멈추고 처리 문구만 갱신한다.

## 5. 접근성·검증

- 이미지 대체 텍스트는 `성향 신호를 모아 빛나는 핵을 품은 뉴앙 캐릭터`다.
- 로딩 처리 문구는 `aria-live=polite` 영역 안에서 갱신한다.
- 390px light와 320px dark에서 글자·캐릭터·처리선·하단 상태 문구가 겹치지 않는다.
- 320px에서 고정 설명은 한 줄로 유지된다.
- 320px iframe 기준 수평 overflow가 없고 캐릭터와 성향 신호 motion이 시간에 따라 계속 변한다.

## 6. 이번 검토 범위

1. 로딩 중복 문구 제거와 정보 위계
2. `마지막 질문` 본문 태그 제거
3. 앱 전용 2D 뉴앙 캐릭터 적용
4. 캐릭터 호흡·핵 pulse·다섯 성향 신호 수집 motion

승인 뒤 같은 원칙으로 결과 준비 상태의 장기 지연·재시도 화면과 430px·520px 반응형을 확장한다.
