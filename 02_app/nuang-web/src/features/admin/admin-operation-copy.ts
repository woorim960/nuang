const actionLabels: Record<string, string> = {
  account_reactivated: "회원 이용 상태 복구",
  account_suspended: "회원 이용 정지",
  approve_domain: "외부 링크 도메인 허용",
  approve_link: "외부 링크 허용",
  block_domain: "외부 링크 도메인 차단",
  block_link: "외부 링크 차단",
  community_content_archive: "공식 콘텐츠 삭제",
  community_content_auto_closed: "공식 콘텐츠 자동 응답 마감",
  community_content_auto_published: "공식 콘텐츠 자동 게시",
  community_content_close: "공식 콘텐츠 응답 마감",
  community_content_create: "공식 콘텐츠 작성",
  community_content_delete_draft: "공식 콘텐츠 임시저장 삭제",
  community_content_duplicate: "공식 콘텐츠 복제",
  community_content_feature: "공식 콘텐츠 대표 노출 변경",
  community_content_publish: "공식 콘텐츠 게시",
  community_content_schedule: "공식 콘텐츠 예약",
  community_content_update: "공식 콘텐츠 수정",
  content_approve_atom: "성향지도 문구 승인",
  content_approve_release: "성향지도 게시 준비 완료",
  content_pass_review: "성향지도 문구 검토 통과",
  content_publish_release: "성향지도 콘텐츠 게시",
  content_request_changes: "성향지도 문구 수정 요청",
  content_start_release_review: "성향지도 게시 버전 검토 시작",
  dismiss_content_report: "콘텐츠 신고 조치 없음",
  dismiss_report: "프로필 신고 조치 없음",
  hide_profile: "회원 프로필 숨김",
  hide_reported_content: "신고 콘텐츠 숨김",
  hide_reported_profile: "신고 프로필 숨김",
  limit_post: "게시물 노출 제한",
  profile_hidden: "회원 프로필 숨김",
  profile_report_dismissed: "프로필 신고 조치 없음",
  profile_report_resolved: "프로필 신고 조치 완료",
  profile_report_review_started: "프로필 신고 검토 시작",
  profile_restored: "회원 프로필 복구",
  product_feedback_closed: "고객 의견 검토 종료",
  product_feedback_planned: "고객 의견 반영 예정",
  product_feedback_resolved: "고객 의견 처리 완료",
  product_feedback_reviewing: "고객 의견 확인 시작",
  publish_post: "게시물 게시 허용",
  reactivate_account: "회원 이용 상태 복구",
  remove_post: "게시물 삭제 처리",
  research_gate_c_item_exclude: "검사 문항 제외 후보 결정",
  research_gate_c_item_keep: "검사 문항 유지 결정",
  research_gate_c_item_revise: "검사 문항 개선 결정",
  research_gate_c_item_start_review: "검사 문항 검토 시작",
  research_trait_map_section_keep: "성향지도 문구 유지 결정",
  research_trait_map_section_revise: "성향지도 문구 개선 결정",
  research_trait_map_section_start_review: "성향지도 문구 검토 시작",
  restore_profile: "회원 프로필 복구",
  reward_winner_contact_revealed: "당첨자 연락처 확인",
  reward_winner_contacted: "당첨자 안내 완료",
  start_content_report_review: "콘텐츠 신고 검토 시작",
  start_report_review: "프로필 신고 검토 시작",
  suspend_account: "회원 이용 정지",
};

const tableLabels: Record<string, string> = {
  "audit.admin_audit_log": "운영 기록",
  "feed.content_report": "콘텐츠 신고",
  "feed.feed_external_link": "외부 링크",
  "feed.feed_post": "커뮤니티 게시물",
  "feed.official_community_content": "공식 커뮤니티 콘텐츠",
  "feed.profile_report": "프로필 신고",
  "identity.account": "회원 계정",
  "profile.community_profile": "회원 프로필",
  "public.product_feedback": "고객 의견",
  "public.research_gate_c_item_decision": "검사 문항 운영 결정",
  "public.research_gate_c_reward_entry": "연구 이벤트 응모",
  "public.research_trait_map_section_decision": "성향지도 문구 운영 결정",
  "trait_map.content_release": "성향지도 콘텐츠",
};

export function adminActionLabel(action: string) {
  return actionLabels[action] ?? humanizeOperationCode(action);
}

export function adminTargetLabel(table: string) {
  return tableLabels[table] ?? table;
}

function humanizeOperationCode(value: string) {
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
