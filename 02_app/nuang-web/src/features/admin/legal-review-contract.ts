export const legalReleaseKey = "NUANG-MVP-LEGAL-2026-08";

export const legalReviewStatuses = [
  "pending",
  "ready",
  "in_review",
  "changes_requested",
  "approved",
  "not_applicable",
] as const;

export type LegalReviewStatus = (typeof legalReviewStatuses)[number];

export const legalReleaseStatuses = [
  "draft",
  "in_review",
  "changes_requested",
  "approved",
  "superseded",
] as const;

export type LegalReleaseStatus = (typeof legalReleaseStatuses)[number];

export type LegalReviewDefinition = {
  category: "privacy" | "research" | "terms";
  evidenceHint: string;
  itemKey: string;
  ownerRole: string;
  question: string;
  required: boolean;
  title: string;
};

export const legalReviewDefinitions: readonly LegalReviewDefinition[] = [
  {
    category: "terms",
    evidenceHint:
      "딱좋은라이프·박우림·768-75-00424·woorimprog@gmail.com·nuang.app·1~3일 답변 기준, 무료 베타 범위와 주소 공개 의무 검토서, 정책 화면 캡처",
    itemKey: "operator_identity",
    ownerRole: "서비스 책임자",
    question:
      "실제 계약·사업 운영 주체와 약관의 상호·대표자·사업자등록번호·문의처·도메인이 일치하며, 주소 비공개가 현재 무료 베타 범위에서 허용되는지 변호사가 확인했나요?",
    required: true,
    title: "운영 주체와 문의처",
  },
  {
    category: "terms",
    evidenceHint: "MVP 기능 인벤토리, 검사·커뮤니티·공유 화면 목록",
    itemKey: "service_scope",
    ownerRole: "제품 책임자",
    question:
      "검사, 리포트, 성향지도, 커뮤니티, 공유·비교, 연구 기능의 실제 제공 범위가 약관에 빠짐없이 설명되어 있나요?",
    required: true,
    title: "서비스 범위와 검사 해석 경계",
  },
  {
    category: "terms",
    evidenceHint:
      "만 14세 이상 확인 화면과 가입 차단 테스트, 만 14세 미만 미수집 증빙, 향후 법정대리인 명시적 이메일 회신·수동 확인 설계",
    itemKey: "age_and_minors",
    ownerRole: "개인정보 책임자",
    question:
      "베타가 만 14세 미만 가입을 실제로 차단하며, 향후 보호자 이메일 링크 클릭만으로 계정을 열지 않고 시행령상 동의·확인 방법과 연령확인 충분성을 변호사가 승인했나요?",
    required: true,
    title: "연령과 미성년자",
  },
  {
    category: "terms",
    evidenceHint: "신고·차단·이용 제한·재검토 화면과 운영 기준",
    itemKey: "community_restrictions",
    ownerRole: "커뮤니티 운영자",
    question:
      "금지행위, 신고, 게시물 제한, 계정 조치와 이의제기 방법이 실제 운영 절차와 일치하나요?",
    required: true,
    title: "커뮤니티 운영과 이용 제한",
  },
  {
    category: "terms",
    evidenceHint: "게시물 작성·삭제·공개 범위·공유 동작 캡처",
    itemKey: "user_content_rights",
    ownerRole: "제품 책임자",
    question:
      "회원 콘텐츠의 권리, 서비스에 필요한 이용 범위, 삭제 후 처리와 공유 범위가 명확한가요?",
    required: true,
    title: "회원 콘텐츠와 권리",
  },
  {
    category: "terms",
    evidenceHint: "계정 삭제 결과, 외부 링크 안내, 분쟁·문의 절차",
    itemKey: "termination_liability_disputes",
    ownerRole: "서비스 책임자",
    question:
      "탈퇴·서비스 변경·책임 범위·외부 콘텐츠·분쟁 해결 문구가 실제 기능과 불공정 약관 위험을 함께 반영하나요?",
    required: true,
    title: "탈퇴, 책임과 분쟁 해결",
  },
  {
    category: "privacy",
    evidenceHint: "DB·API 데이터 인벤토리, OAuth·검사·피드·분석 필드 목록",
    itemKey: "personal_data_inventory",
    ownerRole: "개인정보 책임자",
    question:
      "로그인, 연락처, 검사, 커뮤니티, 분석, 광고·제휴에서 실제 처리하는 정보가 처리방침과 일치하나요?",
    required: true,
    title: "개인정보 항목과 출처",
  },
  {
    category: "privacy",
    evidenceHint:
      "필수 수집·이용 목적·항목·보유기간·거부권 안내, 선택 동의 화면, 동의 버전, 분석·마케팅 철회 동작",
    itemKey: "purpose_and_consent",
    ownerRole: "개인정보 책임자",
    question:
      "각 처리 목적과 필수·선택 동의가 구분되고, 거부·철회해도 되는 기능 범위가 정확히 안내되나요?",
    required: true,
    title: "처리 목적과 동의",
  },
  {
    category: "privacy",
    evidenceHint: "프로필·공유·비교·피드 공개 범위 테스트 결과",
    itemKey: "public_visibility",
    ownerRole: "보안·개인정보 담당자",
    question:
      "공개되는 프로필·리포트 정보와 비공개 응답·원점수·연락처의 경계가 모든 화면에서 일치하나요?",
    required: true,
    title: "공개 범위와 민감 정보 보호",
  },
  {
    category: "privacy",
    evidenceHint:
      "테이블별 보관기간, 계정·결과 삭제 테스트, 백업·법적 보관 기준",
    itemKey: "retention_and_deletion",
    ownerRole: "데이터 책임자",
    question:
      "정보 종류별 보관기간과 삭제·익명화·법적 보관 예외가 실제 시스템 동작으로 실행 가능한가요?",
    required: true,
    title: "보관기간과 삭제",
  },
  {
    category: "privacy",
    evidenceHint:
      "Supabase·Vercel·Resend·OAuth 계약, 이전 국가·시기·방법·항목·목적·보유기간·연락처·거부 방법, 실제 리전과 하위처리자 자료",
    itemKey: "processors_and_overseas",
    ownerRole: "인프라·개인정보 담당자",
    question:
      "처리위탁, 국외 처리, 저장 지역, 이전되는 항목·목적·기간과 거부 방법이 실제 계약·설정과 일치하나요?",
    required: true,
    title: "처리위탁과 국외 처리",
  },
  {
    category: "privacy",
    evidenceHint:
      "열람·정정·삭제·처리정지 경로, 문의처, 접근통제·암호화·감사 기록",
    itemKey: "rights_contact_security",
    ownerRole: "개인정보 책임자",
    question:
      "정보주체의 권리 행사 방법, 담당자, 안전조치와 침해 대응 안내가 실제 운영 절차와 연결되나요?",
    required: true,
    title: "이용자 권리, 담당자와 안전조치",
  },
  {
    category: "research",
    evidenceHint: "연구 안내문, 동의·철회·보상·가명화·녹음·보관 계획",
    itemKey: "research_participation",
    ownerRole: "UX 리서치 책임자",
    question:
      "전문가 검토와 인지 인터뷰의 모집, 동의, 철회, 보상, 녹음, 가명화, 보관·삭제 기준이 모집 전에 승인됐나요?",
    required: true,
    title: "사용자 연구와 인지 인터뷰",
  },
  {
    category: "research",
    evidenceHint:
      "Google·Kakao 제공 항목, callback, 연결·해제·계정 삭제 테스트",
    itemKey: "oauth_identity",
    ownerRole: "인증 책임자",
    question:
      "OAuth 제공자가 전달하는 정보, 계정 연결·해제·삭제와 실패 처리 방식이 정책 문구와 일치하나요?",
    required: true,
    title: "OAuth 로그인과 계정 연결",
  },
  {
    category: "research",
    evidenceHint:
      "마케팅 선택 동의·수신거부, 광고·제휴 데이터 흐름과 기능 플래그",
    itemKey: "marketing_and_advertising",
    ownerRole: "마케팅·광고 책임자",
    question:
      "광고성 이메일, 광고 공급자, 제휴 링크와 문의 데이터 처리가 실제 출시 범위에 맞게 안내되고 비활성 기능은 구분되나요?",
    required: true,
    title: "마케팅, 광고와 제휴",
  },
] as const;

export const legalOfficialReferences = [
  {
    href: "https://www.pipc.go.kr/np/cop/bbs/selectBoardArticle.do?bbsId=BS217&mCode=D010030000.Updated&nttId=12018",
    label: "개인정보보호위원회 · 2026 개인정보 처리방침 작성지침 안내",
  },
  {
    href: "https://www.law.go.kr/법령/개인정보보호법",
    label: "국가법령정보센터 · 개인정보 보호법",
  },
  {
    href: "https://law.go.kr/lsLinkCommonInfo.do?lspttninfSeq=182193",
    label: "국가법령정보센터 · 개인정보 보호법 시행령 제17조의2",
  },
  {
    href: "https://www.pipc.go.kr/np/cop/bbs/selectBoardArticle.do?bbsId=BS074&mCode=C020010000&nttId=8776",
    label: "개인정보보호위원회 · 법정대리인 동의 의무 위반 제재",
  },
  {
    href: "https://www.law.go.kr/법령/약관의규제에관한법률",
    label: "국가법령정보센터 · 약관의 규제에 관한 법률",
  },
  {
    href: "https://www.law.go.kr/LSW/lsLinkCommonInfo.do?lsJoLnkSeq=1022342373",
    label: "국가법령정보센터 · 전자상거래법 제10조",
  },
] as const;

export function legalReviewStatusLabel(status: LegalReviewStatus) {
  return {
    approved: "변호사 검토 완료",
    changes_requested: "수정 필요",
    in_review: "변호사 검토 중",
    not_applicable: "해당 없음",
    pending: "준비 전",
    ready: "변호사 전달 준비",
  }[status];
}

export function legalReleaseStatusLabel(status: LegalReleaseStatus) {
  return {
    approved: "변호사 승인 기록 완료",
    changes_requested: "수정 반영 중",
    draft: "검토 준비",
    in_review: "변호사 검토 중",
    superseded: "이전 버전",
  }[status];
}
