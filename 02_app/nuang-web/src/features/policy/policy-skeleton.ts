export type PolicySkeleton = {
  id: "privacy" | "terms";
  title: string;
  summary: string;
  reviewStatus: string;
  sections: Array<{
    title: string;
    items: string[];
  }>;
};

export const policySkeletonVersion = "policy-skeleton.v0.1";
export const policySkeletonDisplayVersion = "준비 문서 v0.1";

export const policySkeletons = {
  terms: {
    id: "terms",
    reviewStatus: "법률 검토 전 내부 준비 문서",
    summary:
      "계정 저장, 공유 링크, 공개 비교, 커뮤니티 글쓰기를 열기 전 최종 이용약관 검토가 필요합니다. 현재 화면은 공개 약관이 아니라 준비 상태 안내입니다.",
    title: "이용약관 준비 중",
    sections: [
      {
        items: [
          "비회원 로컬 검사와 로컬 결과 열람",
          "성향지도와 결과 이미지 생성",
          "도움 허브와 읽기 전용 커뮤니티 미리보기",
        ],
        title: "현재 열린 범위",
      },
      {
        items: [
          "계정 저장과 공유 링크 조건",
          "공개 프로필과 1:1 비교 사용 조건",
          "커뮤니티 글쓰기, 신고, 차단, 운영 기준",
          "유료 기능을 열 경우 결제·환불·철회 기준",
        ],
        title: "서버 기능 전 필요한 항목",
      },
      {
        items: [
          "최종 이용약관 승인",
          "동의 문구 버전 기록",
          "만 14세 미만 서버 기능 대응",
          "공개 출시 전 NO-GO 해제",
        ],
        title: "출시 차단 조건",
      },
    ],
  },
  privacy: {
    id: "privacy",
    reviewStatus: "개인정보 문구 검토 전 내부 준비 문서",
    summary:
      "직접 응답, 원점수, 민감 주제, 도움 허브 이용 맥락은 공개·공유·비교 데이터에 넣지 않는 원칙을 기준으로 준비합니다. 최종 처리방침은 별도 검토가 필요합니다.",
    title: "개인정보 처리방침 준비 중",
    sections: [
      {
        items: [
          "현재 검사의 직접 응답은 이 기기 로컬 저장을 기본으로 함",
          "도움 허브에서 본 항목은 계정, 결과, 성향지도, 비교 리포트에 저장하지 않음",
          "공유 화면은 대표 성향과 제한된 요약만 준비",
        ],
        title: "현재 개인정보 원칙",
      },
      {
        items: [
          "계정 식별 정보와 동의 버전",
          "결과 claim 요약과 공개 범위 설정",
          "공유 링크 만료·철회 상태",
          "공개 프로필 코드와 접근 감사 로그",
        ],
        title: "서버 오픈 전 정의할 항목",
      },
      {
        items: [
          "최종 개인정보 처리방침 승인",
          "보존·삭제·내보내기 절차",
          "위탁·국외 이전 여부 검토",
          "권한 정책과 직접 응답 조회 차단 검증",
        ],
        title: "출시 차단 조건",
      },
    ],
  },
} satisfies Record<PolicySkeleton["id"], PolicySkeleton>;
