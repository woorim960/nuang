import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { readMarketingEmailConfig } from "@/features/marketing/server-marketing-email-config";

export type AdminSystemCheck = {
  action: string;
  detail: string;
  key: string;
  label: string;
  ok: boolean;
  severity: "blocker" | "warning";
};

export async function readAdminSystem(client: SupabaseClient) {
  const marketingEmail = readMarketingEmailConfig();
  const environment: AdminSystemCheck[] = [
    envCheck("origin", "앱 공개 주소", "NEXT_PUBLIC_APP_ORIGIN"),
    envCheck("supabase-url", "Supabase 주소", "NEXT_PUBLIC_SUPABASE_URL"),
    envCheck(
      "supabase-public",
      "Supabase 공개 키",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    ),
    envCheck(
      "supabase-server",
      "Supabase 서버 키",
      "SUPABASE_SERVICE_ROLE_KEY",
    ),
    envCheck("database-url", "데이터베이스 직접 연결", "DATABASE_URL"),
    envCheck("encryption", "개인정보 암호화", "FIELD_ENCRYPTION_KEY"),
    envCheck("share-security", "보안 토큰 서명", "SHARE_TOKEN_PEPPER"),
    envCheck("admin", "관리자 계정", "ADMIN_BOOTSTRAP_EMAILS"),
    envCheck("email-api", "인증 이메일 발송", "RESEND_API_KEY"),
    runtimeCheck(
      "marketing-email-gate",
      "마케팅 이메일 실제 발송",
      marketingEmail.enabled,
      marketingEmail.enabled ? "허용됨" : "안전 잠금 중",
      "시험 발송과 Webhook 확인을 마친 뒤 MARKETING_EMAIL_SEND_ENABLED=true로 전환하세요.",
      "warning",
    ),
    runtimeCheck(
      "marketing-email-from",
      "마케팅 이메일 발신자",
      marketingEmail.fromReady,
      marketingEmail.fromReady ? "nuang.app 발신 주소 사용" : "nuang.app 발신 주소 필요",
      "MARKETING_EMAIL_FROM을 인증된 뉴앙 발신 도메인 주소로 설정하세요.",
    ),
    runtimeCheck(
      "marketing-email-reply",
      "마케팅 이메일 답장 주소",
      isEmailAddress(marketingEmail.replyTo),
      isEmailAddress(marketingEmail.replyTo) ? "답장 주소 설정됨" : "유효한 답장 주소 필요",
      "MARKETING_EMAIL_REPLY_TO에 운영자가 확인할 이메일을 설정하세요.",
    ),
    runtimeCheck(
      "marketing-email-webhook",
      "Resend 상태 수신 서명",
      marketingEmail.webhookReady,
      marketingEmail.webhookReady ? "설정됨" : "Webhook 서명 키 필요",
      "Resend Webhook의 signing secret을 AD_RESEND_WEBHOOK_SECRET에 등록하세요.",
    ),
    runtimeCheck(
      "marketing-email-cron",
      "이메일 예약 작업 인증",
      marketingEmail.cronReady,
      marketingEmail.cronReady ? "설정됨" : "32자 이상 인증 키 필요",
      "32자 이상의 임의 문자열을 AD_OUTBOX_CRON_SECRET에 등록하세요.",
    ),
    envCheck("email-from", "인증 이메일 발신 주소", "EMAIL_VERIFICATION_FROM"),
    envAnyCheck("admin-notification-recipients", "운영 검토 알림 수신자", [
      "ADMIN_REVIEW_NOTIFICATION_EMAILS",
      "ADMIN_BOOTSTRAP_EMAILS",
    ]),
    envAnyCheck("admin-notification-from", "운영 검토 알림 발신 주소", [
      "ADMIN_NOTIFICATION_FROM",
      "EMAIL_VERIFICATION_FROM",
    ]),
    envCheck("legal-name", "서비스 운영자 이름", "LEGAL_OPERATOR_NAME"),
    envCheck(
      "privacy-contact",
      "개인정보 문의 이메일",
      "PRIVACY_CONTACT_EMAIL",
    ),
    envCheck("data-region", "개인정보 저장 지역", "SUPABASE_DATA_REGION"),
  ];

  const database = await Promise.all([
    dbCheck(
      client,
      "identity",
      "account",
      "회원 계정",
      "회원가입과 로그인이 중단됩니다.",
    ),
    dbCheck(
      client,
      "identity",
      "contact_profile",
      "비공개 연락처",
      "프로필의 이메일과 휴대전화번호를 저장할 수 없습니다.",
    ),
    dbCheck(
      client,
      "profile",
      "community_profile",
      "커뮤니티 프로필",
      "프로필과 팔로우 화면이 동작하지 않습니다.",
    ),
    dbCheck(
      client,
      "identity",
      "operator_account",
      "운영자 계정 표시",
      "앱에서 뉴앙 운영자 배지를 표시할 수 없습니다.",
      "warning",
    ),
    dbCheck(
      client,
      "feed",
      "feed_post",
      "커뮤니티 게시물",
      "게시물 작성과 피드 조회가 중단됩니다.",
    ),
    dbCheck(
      client,
      "feed",
      "content_report",
      "게시물·댓글 신고",
      "위험 콘텐츠 신고를 접수할 수 없습니다.",
    ),
    dbCheck(
      client,
      "feed",
      "feed_external_link",
      "외부 링크 검토",
      "처음 보는 외부 링크의 안전 검토가 동작하지 않습니다.",
    ),
    dbCheck(
      client,
      "feed",
      "community_write_bucket",
      "커뮤니티 도배 방지",
      "반복 작성과 도배 요청을 제한할 수 없습니다.",
    ),
    communityContentDbCheck(client),
    dbCheck(
      client,
      "assessment",
      "assessment_attempt",
      "성향 검사",
      "검사 응답을 저장할 수 없습니다.",
    ),
    dbCheck(
      client,
      "report",
      "result_report",
      "결과 리포트",
      "검사 결과를 조회하거나 보관할 수 없습니다.",
    ),
    privateDbCheck(client, "trait_map.content_release", "성향지도 콘텐츠"),
    dbCheck(
      client,
      "audit",
      "admin_audit_log",
      "운영 기록",
      "관리자 조치 이력을 남길 수 없습니다.",
    ),
    dbCheck(
      client,
      "consent",
      "marketing_campaign",
      "이메일 캠페인",
      "마케팅 이메일 캠페인을 운영할 수 없습니다.",
    ),
    dbCheck(
      client,
      "consent",
      "marketing_campaign_recipient",
      "이메일 발송 대기열",
      "마케팅 이메일 대상과 발송 상태를 관리할 수 없습니다.",
    ),
    dbCheck(
      client,
      "consent",
      "marketing_channel_control",
      "이메일 긴급 제어",
      "운영센터에서 전체 마케팅 이메일을 즉시 중지할 수 없습니다.",
    ),
    dbCheck(
      client,
      "consent",
      "marketing_worker_run",
      "이메일 작업 상태",
      "예약 작업의 성공·실패·지연을 진단할 수 없습니다.",
    ),
    dbCheck(
      client,
      "consent",
      "marketing_test_delivery",
      "캠페인 시험 발송 증빙",
      "실제로 시험한 캠페인 버전만 승인하도록 보장할 수 없습니다.",
    ),
    dbCheck(
      client,
      "consent",
      "marketing_webhook_receipt",
      "이메일 전달 상태 수신",
      "Resend 전달 상태의 중복·미연결 이벤트를 진단할 수 없습니다.",
    ),
    dbCheck(
      client,
      "consent",
      "marketing_campaign_operations_summary",
      "이메일 운영 집계",
      "캠페인의 실제 전체 발송 상태를 정확히 집계할 수 없습니다.",
    ),
    dbCheck(
      client,
      "public",
      "advertising_mail_worker_run",
      "광고 문의 메일 작업 상태",
      "광고 문의 확인 메일의 작업 실패와 지연을 진단할 수 없습니다.",
    ),
    dbCheck(
      client,
      "public",
      "research_gate_c_session",
      "검사 연구 참여",
      "사용자 연구 응답을 저장할 수 없습니다.",
      "warning",
    ),
    dbCheck(
      client,
      "public",
      "research_gate_c_item_decision",
      "검사 문항 운영 결정",
      "문항 유지·개선·제외 결정을 저장할 수 없습니다.",
      "warning",
    ),
    dbCheck(
      client,
      "public",
      "research_trait_map_section_decision",
      "성향지도 문구 운영 결정",
      "성향지도 피드백의 운영 결정을 저장할 수 없습니다.",
      "warning",
    ),
    storageCheck(client),
    rpcCheck(
      client,
      "커뮤니티 작성 보호",
      "check_community_write_guard",
      {
        p_account_id: null,
        p_action: "create_post",
        p_body: null,
      },
      "도배와 중복 게시물 차단이 동작하지 않습니다.",
      "blocker",
      "feed",
    ),
    rpcCheck(
      client,
      "관리자 커뮤니티 조치",
      "admin_apply_community_moderation",
      {
        target_action: "invalid_check",
        target_admin_account_id: null,
        target_id: null,
      },
      "신고·게시물 상태 변경과 운영 기록을 함께 저장할 수 없습니다.",
    ),
    rpcCheck(
      client,
      "관리자 연구 결정",
      "admin_manage_research_decision",
      {
        target_action: "start_review",
        target_admin_account_id: null,
        target_identity: {},
        target_note: null,
        target_scope: "gate_c_item",
      },
      "연구 검토 결정을 저장할 수 없습니다.",
      "warning",
    ),
    rpcCheck(
      client,
      "검사 결과 안전 저장",
      "claim_assessment_result_atomic",
      {
        p_account_id: "00000000-0000-4000-8000-000000000000",
        p_assessment_kind: "readiness_check",
        p_assessment_slug: "readiness-check",
        p_code_scheme_version: "readiness",
        p_completed_at: new Date(0).toISOString(),
        p_item_release_version: "readiness",
        p_local_result_id: "admin_system_noop",
        p_measurement_release_id: "readiness",
        p_profile_code: "ENAKQ",
        p_profile_name: "readiness",
        p_responses: [],
        p_score_payload: {},
        p_scoring_release_id: "readiness",
        p_scoring_version: "readiness",
        p_share_summary: {},
        p_summary: {},
      },
      "검사 응답과 서버 채점 결과를 한 번에 안전하게 저장할 수 없습니다.",
    ),
    rpcCheck(
      client,
      "검사 연구 요청 보호",
      "check_gate_c_request_guard",
      {
        p_action: "start_session",
        p_subject_hash: "invalid-admin-system-check",
      },
      "검사 연구의 반복·자동 요청을 제한할 수 없습니다.",
    ),
    rpcCheck(
      client,
      "회원 탈퇴",
      "delete_own_nuang_account",
      {
        p_account_id: "00000000-0000-4000-8000-000000000000",
        p_supabase_user_id: "00000000-0000-4000-8000-000000000001",
      },
      "사용자 계정과 인증 정보를 안전하게 함께 삭제할 수 없습니다.",
    ),
  ]);

  return {
    database,
    environment,
    generatedAt: new Date().toISOString(),
  };
}

async function communityContentDbCheck(
  client: SupabaseClient,
): Promise<AdminSystemCheck> {
  const rpc = await client.rpc("get_admin_community_content_dashboard");
  return {
    action: "공식 투표와 오늘의 질문 운영 마이그레이션을 적용하세요.",
    detail: rpc.error ? "공식 콘텐츠 RPC 적용 필요" : "정상",
    key: "feed.official_community_content",
    label: "공식 커뮤니티 콘텐츠",
    ok: !rpc.error,
    severity: "blocker",
  };
}

async function privateDbCheck(
  client: SupabaseClient,
  table: "trait_map.content_release",
  label: string,
): Promise<AdminSystemCheck> {
  const rpc = await client.rpc("get_admin_trait_map_content_dashboard");
  if (!rpc.error) {
    return {
      action: "",
      detail: "정상",
      key: table,
      label,
      ok: true,
      severity: "blocker",
    };
  }
  return {
    action: "성향지도 콘텐츠 운영 마이그레이션과 RPC를 적용하세요.",
    detail: "관리자 콘텐츠 RPC 적용 필요",
    key: table,
    label,
    ok: false,
    severity: "blocker",
  };
}

function envCheck(
  key: string,
  label: string,
  variable: string,
): AdminSystemCheck {
  const ok = Boolean(process.env[variable]?.trim());
  return {
    action: ok ? "" : `배포 환경 변수 ${variable}을(를) 등록하세요.`,
    detail: ok ? "설정됨" : `${variable} 필요`,
    key,
    label,
    ok,
    severity: "blocker",
  };
}

function envAnyCheck(
  key: string,
  label: string,
  variables: string[],
): AdminSystemCheck {
  const activeVariable = variables.find((variable) =>
    Boolean(process.env[variable]?.trim()),
  );
  const fallbackLabel = variables.join(" 또는 ");

  return {
    action: activeVariable
      ? ""
      : `배포 환경 변수 ${fallbackLabel} 중 하나를 등록하세요.`,
    detail: activeVariable ? `${activeVariable} 사용` : `${fallbackLabel} 필요`,
    key,
    label,
    ok: Boolean(activeVariable),
    severity: "blocker",
  };
}

function runtimeCheck(
  key: string,
  label: string,
  ok: boolean,
  detail: string,
  action: string,
  severity: AdminSystemCheck["severity"] = "blocker",
): AdminSystemCheck {
  return {
    action: ok ? "" : action,
    detail,
    key,
    label,
    ok,
    severity,
  };
}

function isEmailAddress(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function dbCheck(
  client: SupabaseClient,
  schema: string,
  table: string,
  label: string,
  unavailableImpact: string,
  severity: AdminSystemCheck["severity"] = "blocker",
): Promise<AdminSystemCheck> {
  const response = await client.schema(schema).from(table).select("*").limit(1);
  return {
    action: response.error
      ? `${unavailableImpact} 최신 DB 마이그레이션을 적용하세요.`
      : "",
    detail: response.error
      ? `${response.error.code ?? "DB"} · 연결 확인 필요`
      : "정상",
    key: `${schema}.${table}`,
    label,
    ok: !response.error,
    severity,
  };
}

async function storageCheck(client: SupabaseClient): Promise<AdminSystemCheck> {
  const response = await client.storage.getBucket("profile-avatars");
  return {
    action: response.error
      ? "프로필 이미지 저장소 마이그레이션을 적용하세요."
      : "",
    detail: response.error ? "profile-avatars 저장소 확인 필요" : "정상",
    key: "storage.profile-avatars",
    label: "프로필 이미지 저장소",
    ok: !response.error,
    severity: "warning",
  };
}

async function rpcCheck(
  client: SupabaseClient,
  label: string,
  rpcName: string,
  args: Record<string, unknown>,
  unavailableImpact: string,
  severity: AdminSystemCheck["severity"] = "blocker",
  schema = "public",
): Promise<AdminSystemCheck> {
  const response =
    schema === "public"
      ? await client.rpc(rpcName, args)
      : await client.schema(schema).rpc(rpcName, args);
  const missing = ["42883", "PGRST202"].includes(response.error?.code ?? "");
  return {
    action: missing
      ? `${unavailableImpact} 최신 DB 마이그레이션을 적용하세요.`
      : "",
    detail: missing ? "운영 함수 적용 필요" : "정상",
    key: `rpc.${schema}.${rpcName}`,
    label,
    ok: !missing,
    severity,
  };
}
