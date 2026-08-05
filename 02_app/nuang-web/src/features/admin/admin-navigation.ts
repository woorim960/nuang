import {
  BadgeDollarSign,
  BarChart3,
  BookOpenText,
  ClipboardList,
  FileCheck2,
  FlaskConical,
  LayoutDashboard,
  MessageSquareMore,
  MessagesSquare,
  PanelsTopLeft,
  Scale,
  Settings2,
  ShieldCheck,
  Send,
  Users,
  type LucideIcon,
} from "lucide-react";

export type AdminNavigationItem = {
  href: string;
  icon: LucideIcon;
  keywords: readonly string[];
  label: string;
};

export type AdminNavigationGroup = {
  label: string;
  items: readonly AdminNavigationItem[];
};

export const adminNavigation: readonly AdminNavigationGroup[] = [
  {
    label: "서비스 운영",
    items: [
      {
        href: "/admin",
        icon: LayoutDashboard,
        keywords: ["대시보드", "현황", "업무", "지표"],
        label: "운영 개요",
      },
      {
        href: "/admin/analytics",
        icon: BarChart3,
        keywords: ["제품 분석", "활성", "퍼널", "완료", "재방문", "트래픽"],
        label: "제품 분석",
      },
      {
        href: "/admin/members",
        icon: Users,
        keywords: ["계정", "프로필", "정지", "회원 검색"],
        label: "회원 관리",
      },
      {
        href: "/admin/community",
        icon: MessagesSquare,
        keywords: ["신고", "게시물", "외부 링크", "투표", "질문"],
        label: "커뮤니티",
      },
      {
        href: "/admin/feedback",
        icon: MessageSquareMore,
        keywords: ["불편", "오류", "제안", "문항 품질", "결과 문장"],
        label: "고객 의견",
      },
      {
        href: "/admin/events",
        icon: ClipboardList,
        keywords: ["응모", "추첨", "당첨", "리워드"],
        label: "이벤트",
      },
    ],
  },
  {
    label: "비즈니스 운영",
    items: [
      {
        href: "/admin/advertising",
        icon: BadgeDollarSign,
        keywords: [
          "광고",
          "제휴",
          "문의",
          "캠페인",
          "인벤토리",
          "소재",
          "성과",
        ],
        label: "광고·제휴",
      },
      {
        href: "/admin/marketing",
        icon: Send,
        keywords: ["이메일", "마케팅", "캠페인", "수신거부", "발송"],
        label: "이메일 캠페인",
      },
    ],
  },
  {
    label: "품질 관리",
    items: [
      {
        href: "/admin/experiences",
        icon: PanelsTopLeft,
        keywords: ["검사", "문항", "밸런스", "연구소", "팩", "발행"],
        label: "검사 스튜디오",
      },
      {
        href: "/admin/research",
        icon: FlaskConical,
        keywords: ["문항", "연구", "검토", "성향지도 피드백"],
        label: "검사 연구",
      },
      {
        href: "/admin/content",
        icon: BookOpenText,
        keywords: ["데이터센터", "콘텐츠", "릴리스", "운영 가이드"],
        label: "성향 콘텐츠",
      },
    ],
  },
  {
    label: "거버넌스",
    items: [
      {
        href: "/admin/legal",
        icon: Scale,
        keywords: ["법률", "약관", "개인정보 처리방침", "승인", "정책", "자문"],
        label: "법률·정책",
      },
      {
        href: "/admin/consents",
        icon: FileCheck2,
        keywords: ["동의", "이용 데이터", "마케팅", "알림", "개인정보"],
        label: "동의 관리",
      },
      {
        href: "/admin/audit",
        icon: ShieldCheck,
        keywords: ["감사", "로그", "조치", "CSV"],
        label: "운영 기록",
      },
      {
        href: "/admin/system",
        icon: Settings2,
        keywords: ["환경 변수", "데이터베이스", "연결", "상태"],
        label: "시스템 상태",
      },
    ],
  },
] as const;

export const adminNavigationEntries = adminNavigation.flatMap((group) =>
  group.items.map((item) => ({ ...item, groupLabel: group.label })),
);

export function resolveAdminNavigation(pathname: string) {
  const entry = adminNavigationEntries.find((item) =>
    item.href === "/admin"
      ? pathname === item.href
      : pathname.startsWith(item.href),
  );

  return (
    entry ?? {
      groupLabel: "운영센터",
      href: "/admin",
      icon: LayoutDashboard,
      keywords: [],
      label: "운영센터",
    }
  );
}
