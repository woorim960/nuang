import type { FriendTraitMatchChoiceId } from "@/features/assessment/friend-trait-match-invite";

export type FriendTraitMatchContent = {
  title: string;
  description: string;
  contextLabel: string;
  question: string;
  choices: Array<{
    id: FriendTraitMatchChoiceId;
    label: string;
  }>;
  senderHeading: string;
  predictionHeading: string;
  receiverHeading: string;
  invitationTitle: string;
  invitationText: string;
  resultInsight: string;
  resultCopies: {
    bothDifferent: FriendTraitMatchResultCopy;
    bothMatched: FriendTraitMatchResultCopy;
    choiceOnlyMatched: FriendTraitMatchResultCopy;
    predictionOnlyMatched: FriendTraitMatchResultCopy;
  };
  expiredInviteTitle: string;
  expiredInviteDescription: string;
  invalidInviteTitle: string;
  invalidInviteDescription: string;
};

export type FriendTraitMatchResultCopy = {
  description: string;
  title: string;
};

export const defaultFriendTraitMatchContent: FriendTraitMatchContent = {
  title: "친구 성향 맞히기",
  description: "내가 보는 친구의 선택과 친구가 직접 고른 답을 비교해요.",
  contextLabel: "친구와 약속한 날",
  question: "친구가 갑자기 일정을 바꾸자고 해요. 이때 나는?",
  choices: [
    {
      id: "plan",
      label: "바뀐 일정에 맞춰 새 계획부터 정하고 싶어요",
    },
    {
      id: "listen",
      label: "왜 바뀌었는지 친구의 상황부터 충분히 듣고 싶어요",
    },
  ],
  senderHeading: "같은 상황에서 나는 어떻게 반응할까요?",
  predictionHeading: "친구라면 어떤 답을 고를까요?",
  receiverHeading: "나는 실제로 어떤 답을 고를까요?",
  invitationTitle: "뉴앙 친구 성향 맞히기",
  invitationText: "내가 예상한 너의 선택이 맞는지 확인해 줘!",
  resultInsight:
    "이 한 장면의 선택만으로 성향을 정하지는 않아요. 서로 왜 그렇게 골랐는지 이야기하면 차이를 더 재미있게 이해할 수 있어요.",
  resultCopies: {
    bothMatched: {
      description: "친구의 예상도 맞았고, 이번 상황에서 고른 답도 같아요.",
      title: "서로의 선택을 정확히 알았어요",
    },
    predictionOnlyMatched: {
      description: "고른 답은 달랐지만, 친구는 내 선택을 정확히 예상했어요.",
      title: "다른 선택까지 잘 알고 있었어요",
    },
    choiceOnlyMatched: {
      description: "친구의 예상과는 달랐지만, 실제로 고른 답은 서로 같아요.",
      title: "예상 밖의 공통점을 찾았어요",
    },
    bothDifferent: {
      description: "친구의 예상과 내 실제 선택이 달랐고, 서로 고른 답도 달라요.",
      title: "서로 다른 생각을 발견했어요",
    },
  },
  expiredInviteTitle: "초대 링크의 사용 기간이 지났어요",
  expiredInviteDescription:
    "친구에게 새 링크를 보내 달라고 부탁하거나, 내가 새 게임을 시작해 보세요.",
  invalidInviteTitle: "초대 링크를 확인할 수 없어요",
  invalidInviteDescription:
    "링크가 잘못되었거나 필요한 정보가 빠졌어요. 새 게임은 바로 시작할 수 있어요.",
};
