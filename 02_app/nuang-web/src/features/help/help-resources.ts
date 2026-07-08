export type HelpResource = {
  id: string;
  title: string;
  phone?: string;
  href?: string;
  summary: string;
  availability: string;
  fit: string[];
  tone: "danger" | "primary" | "water" | "forest" | "sun" | "neutral";
};

export const urgentSteps = [
  "지금 다치거나 다칠 위험이 있으면 혼자 버티지 말고 119 또는 112에 바로 연락하세요.",
  "전화가 어렵다면 가까운 사람에게 지금 위치와 위험 상태를 짧게 보내세요.",
  "위험한 물건, 약, 높은 곳, 운전 같은 즉시 위험에서 몸을 먼저 떨어뜨려 주세요.",
];

export const urgentCallActions = [
  {
    label: "109",
    href: "tel:109",
    ariaLabel: "자살예방상담전화 109로 전화하기",
    variant: "danger",
  },
  {
    label: "119",
    href: "tel:119",
    ariaLabel: "긴급 구조 119로 전화하기",
    variant: "outlineDanger",
  },
  {
    label: "112",
    href: "tel:112",
    ariaLabel: "경찰 긴급 신고 112로 전화하기",
    variant: "outlineDanger",
  },
] as const;

export const helpResources: HelpResource[] = [
  {
    id: "suicide-109",
    title: "자살예방상담전화",
    phone: "109",
    href: "https://www.129.go.kr/109",
    summary: "삶의 희망이 보이지 않거나 자살·자해 생각이 올라올 때 연결해요.",
    availability: "24시간",
    fit: ["자살 생각", "자해 충동", "극심한 절망감", "주변 사람의 위기"],
    tone: "danger",
  },
  {
    id: "mental-health-1577",
    title: "정신건강 상담전화",
    phone: "1577-0199",
    href: "https://www.129.go.kr/109",
    summary: "불안, 우울, 공황, 트라우마, 정신건강 어려움에 대해 상담을 받을 수 있어요.",
    availability: "24시간",
    fit: ["우울", "불안", "공황", "트라우마", "정신건강 상담"],
    tone: "water",
  },
  {
    id: "youth-1388",
    title: "청소년 상담",
    phone: "1388",
    href: "https://www.cyber1388.kr/",
    summary: "청소년의 위기, 관계, 학교, 가정 문제를 전화·온라인 상담으로 연결해요.",
    availability: "24시간",
    fit: ["청소년 위기", "학교 문제", "가정 갈등", "온라인 상담"],
    tone: "sun",
  },
  {
    id: "violence-1366",
    title: "여성긴급전화",
    phone: "1366",
    href: "https://women1366.kr/",
    summary: "가정폭력, 성폭력, 데이트폭력 등 여성폭력 피해 상담과 보호를 연결해요.",
    availability: "긴급 상담",
    fit: ["가정폭력", "성폭력", "데이트폭력", "긴급 보호"],
    tone: "primary",
  },
  {
    id: "welfare-129",
    title: "보건복지상담센터",
    phone: "129",
    href: "https://www.129.go.kr/",
    summary: "복지, 긴급지원, 학대, 정신건강 상담 등 공공 지원 정보를 안내해요.",
    availability: "긴급지원 상담 24시간",
    fit: ["긴급복지", "복지 사각지대", "학대", "지원기관 찾기"],
    tone: "forest",
  },
];

export const helpBoundaries = [
  "뉴앙은 자살, 자해, 우울, ADHD, 중독, 트라우마, 폭력, 범죄성, 약물 주제를 점수화하지 않아요.",
  "성적 지향은 질병이나 치료 대상이 아니며, 판정·교정·치료 테스트를 만들지 않아요.",
  "이 허브는 진단이나 치료가 아니라, 필요한 도움으로 빨리 연결하기 위한 정보 화면이에요.",
  "이 화면에서 선택한 내용은 계정이나 결과에 저장하지 않아요.",
];

export const helpPrivacyNotice =
  "뉴앙은 이 화면에서 어떤 도움 항목을 봤는지 계정, 결과, 성향지도, 비교 리포트에 저장하지 않아요. 전화나 외부 사이트 이용 기록은 사용 중인 기기와 해당 기관의 정책을 따릅니다.";

export const sourceLinks = [
  {
    label: "보건복지상담센터 109",
    href: "https://www.129.go.kr/109",
  },
  {
    label: "보건복지상담센터 129",
    href: "https://www.129.go.kr/",
  },
  {
    label: "청소년상담 1388",
    href: "https://www.cyber1388.kr/",
  },
  {
    label: "여성긴급전화 1366",
    href: "https://women1366.kr/",
  },
];
