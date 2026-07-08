# 뉴앙(NUANG)

성향 기반 SNS **뉴앙**의 MVP 웹 앱 저장소입니다.

## 앱

- [NUANG Web](./02_app/nuang-web/README.md)

## 저장소 구조

```text
.
├── README.md
└── 02_app/nuang-web/              # Next.js 앱
```

내부 기획 문서, 원본 Stage 패키지, 의사결정 로그는 공개 저장소에 포함하지 않습니다.

## 빠른 시작

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

## 보안 원칙

- `.env`, `.env.local`, Supabase service role key, OAuth secret은 커밋하지 않는다.
- 예시 환경 파일은 `02_app/nuang-web/.env.example`만 추적한다.
- `node_modules`, `.next`, coverage, test output은 Git에 올리지 않는다.
- 내부 기획·전략·원본 패키지는 로컬 또는 비공개 저장소에서만 관리한다.
