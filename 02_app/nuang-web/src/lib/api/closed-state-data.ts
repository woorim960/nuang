export type ApiClosedStateId =
  | "feed_write_db_pending"
  | "profile_visibility_db_write_pending"
  | "public_comparison_lookup_pending"
  | "public_comparison_db_write_pending"
  | "result_claim_db_write_pending"
  | "share_link_create_db_write_pending"
  | "share_link_revoke_db_write_pending"
  | "supabase_env_missing";

type ApiClosedState = {
  blockedBy: string[];
  code: string;
  display: {
    blockedBy: string[];
    message: string;
    nextStep: string;
  };
  featureId: string;
  featureLabel: string;
  httpStatus: 501 | 503;
  message: string;
  nextStep: string;
  safeFallback: string;
  stage: "credential_required" | "server_implementation_pending";
};

export const apiClosedStates: Record<ApiClosedStateId, ApiClosedState> = {
  feed_write_db_pending: {
    blockedBy: [
      "Supabase URL/key",
      "feed post/comment/reaction tables",
      "moderation queue publish workflow",
      "feed write RLS verification",
    ],
    code: "feed_write_db_pending",
    display: {
      blockedBy: ["게시글 저장소", "댓글·반응 저장", "게시 전 확인"],
      message: "피드 글쓰기와 댓글은 아직 열기 전이에요.",
      nextStep:
        "게시글 저장과 게시 전 확인 흐름이 안정적으로 검증되면 순차적으로 열겠습니다.",
    },
    featureId: "feed-write",
    featureLabel: "피드 글쓰기",
    httpStatus: 501,
    message: "피드 게시글·댓글·반응 서버 쓰기 기능은 아직 열려 있지 않아요.",
    nextStep:
      "Supabase credential 연결 후 feed write tables, moderation publish workflow, RLS를 검증합니다.",
    safeFallback:
      "현재 피드는 공식 카드 읽기와 저장 전 확인 흐름을 먼저 볼 수 있어요.",
    stage: "server_implementation_pending",
  },
  profile_visibility_db_write_pending: {
    blockedBy: [
      "Supabase URL/key",
      "profile visibility settings table",
      "public profile snapshot builder",
      "visibility audit policy verification",
    ],
    code: "profile_visibility_db_write_pending",
    display: {
      blockedBy: ["공개 범위 저장소", "공개 프로필 생성", "변경 기록 확인"],
      message: "공개 범위 저장은 아직 열기 전이에요.",
      nextStep:
        "공개 범위 저장과 공개 프로필 생성이 안전하게 검증되면 설정을 열겠습니다.",
    },
    featureId: "profile-visibility",
    featureLabel: "공개 범위 저장",
    httpStatus: 501,
    message: "공개 범위 저장 서버 쓰기 기능은 아직 열려 있지 않아요.",
    nextStep:
      "Supabase credential 연결 후 공개 범위 설정, 공개 스냅샷 생성, 변경 감사 로그를 검증합니다.",
    safeFallback:
      "현재 기본 공개/비공개 기준은 마이 탭에서 미리 볼 수 있고, 민감 항목은 계속 비공개로 다룹니다.",
    stage: "server_implementation_pending",
  },
  public_comparison_db_write_pending: {
    blockedBy: [
      "Supabase URL/key",
      "target public profile snapshot lookup",
      "comparison report table",
      "comparison audit policy verification",
    ],
    code: "public_comparison_db_write_pending",
    display: {
      blockedBy: ["상대 공개 프로필 조회", "비교 리포트 생성", "접근 기록 확인"],
      message: "공개 프로필 비교는 아직 열기 전이에요.",
      nextStep:
        "상대 공개 프로필 조회와 비교 리포트 생성이 안전하게 검증되면 열겠습니다.",
    },
    featureId: "public-comparison",
    featureLabel: "공개 프로필 1:1 비교",
    httpStatus: 501,
    message: "공개 프로필 기반 1:1 비교 서버 쓰기 기능은 아직 열려 있지 않아요.",
    nextStep:
      "Supabase credential 연결 후 공개 스냅샷 조회, 비교 리포트 생성, 접근 감사 로그를 검증합니다.",
    safeFallback:
      "내 리포트와 설정에서 비교 조건과 공개 범위 원칙을 먼저 확인할 수 있어요.",
    stage: "server_implementation_pending",
  },
  public_comparison_lookup_pending: {
    blockedBy: [
      "Supabase URL/key",
      "comparison report table",
      "access status revalidation",
      "viewer-owned read policy verification",
    ],
    code: "public_comparison_lookup_pending",
    display: {
      blockedBy: ["비교 리포트 조회", "접근 상태 확인", "공개 범위 재평가"],
      message: "비교 리포트 조회는 아직 열기 전이에요.",
      nextStep:
        "비교 리포트 조회와 공개 범위 재평가가 안전하게 검증되면 열겠습니다.",
    },
    featureId: "public-comparison-lookup",
    featureLabel: "공개 비교 리포트 조회",
    httpStatus: 501,
    message: "공개 비교 리포트 조회 기능은 아직 열려 있지 않아요.",
    nextStep:
      "Supabase credential 연결 후 comparison report read, access status revalidation, viewer-owned RLS를 검증합니다.",
    safeFallback:
      "내 리포트와 설정에서 비교 리포트 구성과 공개 범위 원칙을 먼저 확인할 수 있어요.",
    stage: "server_implementation_pending",
  },
  result_claim_db_write_pending: {
    blockedBy: [
      "Supabase URL/key",
      "result claim DB write path",
      "RLS write policy verification",
    ],
    code: "result_claim_db_write_pending",
    display: {
      blockedBy: ["계정 저장 환경", "권한 확인", "안전한 저장 검증"],
      message: "계정 저장은 아직 열기 전이에요.",
      nextStep:
        "계정 저장 환경이 준비되면 이 기기의 결과를 계정에 옮기는 기능을 연결합니다.",
    },
    featureId: "result-claim",
    featureLabel: "결과 계정 저장",
    httpStatus: 501,
    message:
      "결과를 계정에 저장하는 서버 쓰기 기능은 아직 열려 있지 않아요.",
    nextStep:
      "Supabase credential 연결 후 result claim DB write와 RLS 검증을 완료합니다.",
    safeFallback: "로컬 결과 열람, 로컬 삭제, 로컬 데이터 내보내기는 사용할 수 있어요.",
    stage: "server_implementation_pending",
  },
  share_link_create_db_write_pending: {
    blockedBy: [
      "Supabase URL/key",
      "share link token table",
      "noindex/expiry DB verification",
    ],
    code: "share_link_create_db_write_pending",
    display: {
      blockedBy: ["공유 링크 저장소", "만료 확인", "검색 차단 확인"],
      message: "공유 링크는 아직 열기 전이에요.",
      nextStep:
        "결과 요약만 담기는 공유 링크, 만료 흐름을 확인한 뒤 열겠습니다.",
    },
    featureId: "share-link-create",
    featureLabel: "공유 링크 생성",
    httpStatus: 501,
    message: "공유 링크 생성 서버 쓰기 기능은 아직 열려 있지 않아요.",
    nextStep:
      "Supabase credential 연결 후 최소 요약 토큰, 만료, noindex 검증을 완료합니다.",
    safeFallback: "결과 이미지 생성과 로컬 결과 열람은 사용할 수 있어요.",
    stage: "server_implementation_pending",
  },
  share_link_revoke_db_write_pending: {
    blockedBy: [
      "Supabase URL/key",
      "share link revoke mutation",
      "owner permission verification",
    ],
    code: "share_link_revoke_db_write_pending",
    display: {
      blockedBy: ["링크 주인 확인", "철회 처리", "권한 검증"],
      message: "공유 링크 철회는 아직 열기 전이에요.",
      nextStep:
        "생성된 링크의 주인 확인과 철회 처리가 안전하게 검증되면 열겠습니다.",
    },
    featureId: "share-link-revoke",
    featureLabel: "공유 링크 철회",
    httpStatus: 501,
    message: "공유 링크 철회 서버 쓰기 기능은 아직 열려 있지 않아요.",
    nextStep:
      "Supabase credential 연결 후 링크 소유자 확인과 철회 mutation을 완료합니다.",
    safeFallback: "아직 실제 공유 링크를 생성하지 않기 때문에 철회할 공개 링크도 없어요.",
    stage: "server_implementation_pending",
  },
  supabase_env_missing: {
    blockedBy: [
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      "OAuth provider dashboard credentials",
      "final terms/privacy approval",
    ],
    code: "supabase_env_missing",
    display: {
      blockedBy: [
        "계정 서버 연결",
        "소셜 로그인 등록",
        "약관·개인정보 승인",
        "로그인 연결 확인",
      ],
      message: "아직 계정 연결을 열기 전이에요.",
      nextStep:
        "계정 서버, 소셜 로그인, 약관·개인정보 최종 문서를 확인한 뒤 소셜 로그인을 열겠습니다.",
    },
    featureId: "supabase-auth",
    featureLabel: "계정 서버 기능",
    httpStatus: 503,
    message: "Supabase 환경 변수가 없어 계정 서버 기능을 열 수 없어요.",
    nextStep:
      "Supabase project URL/key와 Google·Kakao·Naver provider credential을 연결합니다.",
    safeFallback:
      "로그인 없는 검사, 로컬 결과, 로컬 내보내기는 계속 사용할 수 있고 정책 준비 문서를 먼저 확인할 수 있어요.",
    stage: "credential_required",
  },
};

export function createApiClosedPayload(stateId: ApiClosedStateId) {
  const state = apiClosedStates[stateId];

  return {
    ok: false,
    error: "feature_closed",
    code: state.code,
    feature: {
      id: state.featureId,
      label: state.featureLabel,
      status: "closed",
      stage: state.stage,
    },
    message: state.message,
    blockedBy: state.blockedBy,
    display: state.display,
    nextStep: state.nextStep,
    safeFallback: state.safeFallback,
  };
}

export type ApiClosedPayload = ReturnType<typeof createApiClosedPayload>;
