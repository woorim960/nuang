# 뉴앙(NUANG) 서비스 개발

성향 기반 SNS **뉴앙**의 기획·결정·앱 코드를 한 저장소에서 관리합니다.

## 처음 읽을 문서

| 순서 | 문서 | 용도 |
|---:|---|---|
| 1 | [STEP_PROGRESS.md](./01_project_control/STEP_PROGRESS.md) | 현재 진행 단계 |
| 2 | [STEP_02_DECISION_REGISTER.md](./01_project_control/STEP_02_DECISION_REGISTER.md) | 활성 결정 정본 |
| 3 | [COLLABORATION.md](./COLLABORATION.md) | 협업·핸드오프 규칙 |
| 4 | [02_app/nuang-web/README.md](./02_app/nuang-web/README.md) | 앱 실행·검증 |

## 저장소 구조

```text
뉴앙 서비스 개발/
├── NUANG_PROJECT_MASTER_PLAN.md   # 100단계 마스터 플랜
├── README.md                      # 이 파일
├── COLLABORATION.md               # 협업 가이드
├── AGENTS.md                      # AI 에이전트 온보딩
├── CURSOR_MASTER_BOOTSTRAP_PROMPT.md
├── 00_source_packages/            # 원본 Stage 패키지 (수정 금지)
├── 01_project_control/            # STEP 문서·결정·게이트
└── 02_app/nuang-web/              # Next.js 앱
```

## 빠른 시작 (앱)

```bash
cd 02_app/nuang-web
npm install
npm run env:check
npm run dev
```

검증:

```bash
npm run qa:precredential
```

## 현재 상태 (2026-07-04)

- **완료:** Step 1 ~ 114
- **다음 후보:** Step 115 (커뮤니티 피드 정렬·필터 preview 등)
- **출시:** `NO-GO` — credential·법률·문항 승인 전
- **Blocker:** Supabase/OAuth credential (Step 46)

## 핵심 원칙

1. `00_source_packages`는 읽기 전용
2. 작업 산출물은 `01_project_control`에 먼저 기록
3. 구현은 `STEP_02`의 `ACTIVE` 결정만 따름
4. credential 전 서버 write·OAuth는 `feature_closed`로 닫음
5. 비회원 직접 응답은 서버에 저장하지 않음

## 문의·핸드오프

새 개발자·AI는 [CURSOR_MASTER_BOOTSTRAP_PROMPT.md](./CURSOR_MASTER_BOOTSTRAP_PROMPT.md)와 [COLLABORATION.md](./COLLABORATION.md)를 먼저 읽으세요.
# nuang
