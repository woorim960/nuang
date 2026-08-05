import {
  getCandidateDirectionCopy,
  getCandidateProfileDefinition,
  type CandidateCodeSymbol,
} from "@/features/nuang-code/candidate-profile-names";
import {
  countTraitMapCustomerGuideCharacters,
  traitMapCustomerGuideChapterSlots,
  traitMapCustomerGuideContractVersion,
  traitMapCustomerGuideSchema,
  type TraitMapCustomerGuide,
  type TraitMapCustomerGuideChapter,
} from "@/features/nuang-code/trait-map-customer-guide-contract";

type Profile = NonNullable<ReturnType<typeof getCandidateProfileDefinition>>;

type GuideContext = {
  code: string;
  emotion: AxisStory;
  energy: AxisStory;
  interest: AxisStory;
  profile: Profile;
  relationship: AxisStory;
  routine: AxisStory;
};

type AxisStory = {
  action: string;
  benefit: string;
  focus: string;
  need: string;
  sequence: string;
  symbol: CandidateCodeSymbol;
  thought: string;
};

type ChapterDraft = {
  checkQuestion: string;
  label: string;
  sections: TraitMapCustomerGuideChapter["sections"];
  summary: string;
  title: string;
};

const evidenceReferences = [
  {
    description:
      "Big Five 다섯 영역과 15개 세부 성향을 체계적으로 측정한 BFI-2 개발 연구",
    href: "https://escholarship.org/uc/item/16x6n05t",
    title: "Soto & John (2017), The Next Big Five Inventory",
  },
  {
    description:
      "넓은 성격 영역 아래에서 서로 관련되지만 구분되는 세부 성향을 설명한 연구",
    href: "https://doi.org/10.1037/0022-3514.93.5.880",
    title: "DeYoung, Quilty & Peterson (2007), BFAS",
  },
  {
    description:
      "한 사람에게서 여러 행동이 나타나도 반복되는 중심 경향을 확인할 수 있음을 보여준 연구",
    href: "https://doi.org/10.1037/0022-3514.80.6.1011",
    title: "Fleeson (2001), Traits as Density Distributions of States",
  },
  {
    description:
      "마음속 감정과 밖으로 드러나는 표현·행동을 나누어 설명한 감정 과정 연구",
    href: "https://pubmed.ncbi.nlm.nih.gov/9457784/",
    title: "Gross (1998), Emotion Regulation Process",
  },
  {
    description:
      "세 나라의 부부 표본에서 본인·상대 성향과 관계 만족의 관련성을 비교하고, 성향만으로 설명되는 범위가 제한적임을 보여준 연구",
    href: "https://pubmed.ncbi.nlm.nih.gov/20718544/",
    title: "Dyrenforth et al. (2010), Personality and Relationships",
  },
  {
    description:
      "심리검사의 점수 해석과 사용 목적을 근거에 맞게 관리하기 위한 국제 전문 표준",
    href: "https://www.aera.net/Publications/Books/Standards-for-Educational-Psychological-Testing-2014-Edition",
    title: "AERA·APA·NCME, Standards for Testing",
  },
] as const;

const axisStories: Readonly<Record<CandidateCodeSymbol, AxisStory>> = {
  E: {
    symbol: "E",
    thought: "사람들과 말을 주고받을 때 생각이 더 빠르게 또렷해져요",
    action:
      "필요한 순간에 먼저 말을 꺼내고, 다른 사람의 반응을 받으며 다음 행동을 정해요",
    benefit:
      "이 방식은 대화를 시작하고 함께 참여할 사람을 찾는 데 도움이 될 수 있어요",
    focus: "사람들과 말을 주고받으며 생각을 또렷하게 만드는 것",
    need: "계속 사람에게 맞추느라 지치지 않도록 혼자 쉬며 생각을 정리하는 시간도 필요해요",
    sequence: "사람들과 이야기하며 생각을 깨운다",
  },
  I: {
    symbol: "I",
    thought: "혼자 생각을 정리할 시간이 있을 때 핵심이 더 분명해져요",
    action: "먼저 분위기와 정보를 살핀 뒤, 꼭 필요한 말과 행동을 골라 보여줘요",
    benefit:
      "이 방식은 복잡한 상황에서 중요한 내용을 차분히 정리하는 데 도움이 될 수 있어요",
    focus: "혼자 생각을 정리하며 핵심을 분명하게 만드는 것",
    need: "준비가 끝날 때까지 기다리기보다 필요한 말은 짧게라도 미리 알려주는 것이 좋아요",
    sequence: "혼자 핵심을 정리한다",
  },
  R: {
    symbol: "R",
    thought: "직접 확인한 사실과 실제 경험부터 살펴봐요",
    action: "지금 바로 쓸 수 있는 방법과 구체적인 다음 행동을 찾아요",
    benefit:
      "이 방식은 막연한 생각을 생활에서 시도할 선택으로 바꾸는 데 도움이 될 수 있어요",
    focus: "직접 확인한 사실과 실제 경험부터 살피는 것",
    need: "익숙한 방법만 고집하지 않도록 아직 시도하지 않은 선택도 한 번 열어두면 좋아요",
    sequence: "확인된 사실부터 살핀다",
  },
  N: {
    symbol: "N",
    thought: "보이는 내용 너머의 의미와 새로운 가능성을 더 찾아봐요",
    action: "서로 다른 생각을 연결하고, 기존과 다른 방법을 제안해요",
    benefit:
      "이 방식은 익숙한 문제에서 다른 관점과 다음 가능성을 찾는 데 도움이 될 수 있어요",
    focus: "보이는 내용 너머의 의미와 새로운 가능성을 찾아보는 것",
    need: "아이디어가 많아질수록 지금 가장 먼저 해볼 한 가지를 정하는 것이 좋아요",
    sequence: "새로운 가능성을 넓힌다",
  },
  G: {
    symbol: "G",
    thought: "무슨 일이 이런 결과를 만들었고 어디를 바꾸면 풀릴지 생각해요",
    action:
      "원인을 확인하는 질문을 하고, 실제로 도움이 될 해결 방법을 제안해요",
    benefit:
      "이 방식은 사람을 탓하기 전에 바꿀 수 있는 부분을 찾는 데 도움이 될 수 있어요",
    focus: "문제를 만든 원인과 바꿀 수 있는 부분을 찾는 것",
    need: "해결책을 말하기 전에 상대가 지금 원하는 것이 위로인지 방법인지 물어보면 좋아요",
    sequence: "원인과 해결할 부분을 찾는다",
  },
  A: {
    symbol: "A",
    thought: "상대가 지금 어떤 마음인지와 관계에 무엇이 필요한지를 살펴봐요",
    action:
      "상대의 경험을 먼저 듣고, 마음이 편안해질 수 있는 말과 행동을 골라요",
    benefit:
      "이 방식은 결과와 함께 상대에게 남을 마음을 살피는 데 도움이 될 수 있어요",
    focus: "상대의 마음과 관계에 필요한 것을 살피는 것",
    need: "상대의 마음을 오래 짐작하기보다 원하는 도움을 직접 물어보는 것이 좋아요",
    sequence: "상대의 마음을 살핀다",
  },
  K: {
    symbol: "K",
    thought: "해야 할 일과 순서, 끝낸 것으로 볼 기준을 먼저 정해요",
    action: "중간에 흐름이 끊겨도 다시 이어가며 약속한 일을 마무리해요",
    benefit:
      "이 방식은 생각과 약속을 정한 시점까지 이어가는 데 도움이 될 수 있어요",
    focus: "할 일과 순서, 마무리할 기준을 분명하게 정하는 것",
    need: "계획이 바뀌었을 때 처음 순서만 지키려 하지 말고 목표에 맞춰 다시 정하면 좋아요",
    sequence: "할 일과 순서를 정해 이어간다",
  },
  M: {
    symbol: "M",
    thought:
      "지금의 에너지와 시간, 주변 상황을 보고 움직이기 쉬운 방법을 골라요",
    action: "예상 밖의 변화가 생기면 한 방법에 묶이지 않고 다른 길로 바꿔요",
    benefit:
      "이 방식은 변화가 생겼을 때 지금 가능한 방법을 다시 찾는 데 도움이 될 수 있어요",
    focus: "지금의 시간과 에너지에 맞는 방법을 고르는 것",
    need: "흥미가 줄어도 꼭 끝내야 하는 일은 아주 작은 마감과 확인 시점을 정하면 좋아요",
    sequence: "지금 움직이기 쉬운 방법으로 바꾼다",
  },
  C: {
    symbol: "C",
    thought:
      "불편한 일이 생겨도 걱정이 크게 올라오기 전에 사실과 선택지를 살펴봐요",
    action: "급한 순간에도 목소리와 행동을 비교적 차분하게 유지하며 대응해요",
    benefit:
      "이 방식은 문제와 감정을 나누어 보고 할 일을 고르는 데 도움이 될 수 있어요",
    focus: "감정이 크게 오르기 전에 사실과 선택지를 살피는 것",
    need: "당장 괜찮아 보여도 일이 끝난 뒤 몸의 긴장과 뒤늦게 올라오는 감정을 확인하면 좋아요",
    sequence: "차분하게 대응한다",
  },
  Q: {
    symbol: "Q",
    thought:
      "불확실한 점과 놓치기 쉬운 위험, 관계의 작은 변화를 빠르게 알아차려요",
    action: "걱정되는 부분을 일찍 확인하고 문제가 커지기 전에 준비하려고 해요",
    benefit:
      "이 방식은 작은 변화를 일찍 확인하고 준비할 부분을 찾는 데 도움이 될 수 있어요",
    focus: "불확실한 점과 작은 변화를 빠르게 알아차리는 것",
    need: "걱정이 커질 때는 확인된 사실과 아직 생각만 한 가능성을 나누어 적으면 좋아요",
    sequence: "걱정되는 신호를 빠르게 확인한다",
  },
};

export function buildTraitMapCustomerGuideV3(
  code: string,
): TraitMapCustomerGuide {
  const normalizedCode = code.trim().toUpperCase();
  const profile = getCandidateProfileDefinition(normalizedCode);

  if (!profile) {
    throw new Error(`Unknown Nuang code: ${normalizedCode}`);
  }

  const [energy, interest, relationship, routine, emotion] =
    normalizedCode.split("") as CandidateCodeSymbol[];
  const context: GuideContext = {
    code: normalizedCode,
    profile,
    energy: axisStories[energy],
    interest: axisStories[interest],
    relationship: axisStories[relationship],
    routine: axisStories[routine],
    emotion: axisStories[emotion],
  };
  const drafts = buildChapterDrafts(context);
  const chapters = drafts.map((draft, index) => {
    const chapter: TraitMapCustomerGuideChapter = {
      ...draft,
      checkQuestion: normalizeParagraph(draft.checkQuestion),
      id: `chapter-${String(index + 1).padStart(2, "0")}`,
      number: index + 1,
      slot: traitMapCustomerGuideChapterSlots[index],
      summary: normalizeParagraph(draft.summary),
    };
    if (chapter.slot === "evidence") {
      chapter.references = [...evidenceReferences];
    }
    return chapter;
  });
  addSceneContextToRepeatedSentences(chapters);
  const totalCharacters = countTraitMapCustomerGuideCharacters(chapters);
  if (totalCharacters < 10_000) {
    throw new Error(
      `${normalizedCode} customer guide has only ${totalCharacters} characters`,
    );
  }

  return traitMapCustomerGuideSchema.parse({
    chapters,
    code: normalizedCode,
    contractVersion: traitMapCustomerGuideContractVersion,
    heroSummary: normalizeParagraph(
      `검사 답변에서는 ${profile.overview.map((item) => item.text).join(" ")} 이 다섯 방향을 함께 살펴 ‘${profile.displayName}’이라는 이름으로 소개해요. 이 설명은 능력이나 관계의 결과가 아니라, 최근 답변에서 자주 나타난 생각과 행동을 이해하기 위한 안내예요.`,
    ),
    profileName: profile.displayName,
    readingMinutes: Math.max(
      10,
      Math.min(60, Math.round(totalCharacters / 650)),
    ),
    totalCharacters,
    version: `${normalizedCode}-CUSTOMER-GUIDE-4.0-BETA-AI`,
  });
}

function buildChapterDrafts(context: GuideContext): ChapterDraft[] {
  return [
    buildCoreChapter(context),
    buildRoleChapter(context),
    buildFiveLettersChapter(context),
    buildCombinedChapter(context),
    buildThoughtAndResponseChapter(context),
    buildDailyChapter(context),
    buildFamilyChapter(context),
    buildFriendChapter(context),
    buildPartnerChapter(context),
    buildPersonOfInterestChapter(context),
    buildWorkChapter(context),
    buildStressChapter(context),
    buildGrowthChapter(context),
    buildConversationChapter(context),
    buildEvidenceChapter(context),
  ];
}

function buildCoreChapter(context: GuideContext): ChapterDraft {
  const { code, emotion, energy, interest, profile, relationship, routine } =
    context;
  return {
    label: "핵심 모습",
    title: `${code}의 생각과 행동을 한눈에 알아봐요`,
    summary: `${code}는 ${energy.thought} ${interest.thought} ${relationship.thought} 이 생각을 ${routine.action} ${emotion.action}`,
    checkQuestion:
      "최근 일상에서 이 설명과 가장 비슷하게 생각하고 행동했던 장면은 무엇인가요?",
    sections: [
      section(
        "가장 중요하게 여기는 것",
        `${code}가 중요하게 여기는 것은 ${energy.focus}과 ${interest.focus}이에요. 생각만 하거나 분위기에 머물기보다 자신에게 자연스러운 방식으로 상황을 이해하고 다음 행동을 찾으려 해요.`,
        `${relationship.thought} 그래서 사람과 문제가 함께 얽힌 장면에서는 무엇을 먼저 다뤄야 편안해지는지 빠르게 살펴봐요. ${routine.thought} 이 기준이 분명할수록 ${profile.shortName}다운 장점이 잘 드러나요. 주변 사람도 그 기준을 알면 ${code}의 말과 행동을 훨씬 쉽게 이해할 수 있어요.`,
      ),
      section(
        "생각이 흘러가는 순서",
        `새로운 일이 생기면 ${code}는 먼저 ‘${energy.focus}’부터 시작해요. 이어서 ‘${interest.focus}’, ‘${relationship.focus}’, ‘${routine.focus}’을 살펴요. 이 순서는 최근 답변에서 비교적 자주 나타난 흐름이에요.`,
        `${emotion.thought} 그래서 같은 문제를 마주해도 걱정과 감정이 올라오는 시점, 확인하고 싶은 정보, 행동을 시작하는 속도에서 ${code}만의 특징이 보여요. 감정의 속도는 나머지 네 글자가 실제 행동으로 이어지는 방식에도 영향을 줘요.`,
      ),
      section(
        "주변에서 자주 보게 되는 행동",
        `${energy.action} 이어서 ${interest.action} 관계 문제가 함께 있으면 ${relationship.action} 주변에서는 ${code}가 무엇을 먼저 보고 어떻게 움직이는지 비교적 분명하게 느낄 수 있어요.`,
        `${routine.action} ${emotion.action} 그래서 일상에서는 대화를 시작하는 모습, 확인하는 질문, 계획을 이어가는 방법, 갑작스러운 문제에 반응하는 태도에서 ${profile.shortName}의 특징이 자주 보여요.`,
      ),
      section(
        "편안할 때 더 잘 드러나는 모습",
        `${code}는 자신의 방식대로 생각할 시간과 필요한 정보가 있고, 서로 기대하는 역할이 분명할 때 가장 편안하게 움직여요. ${energy.benefit} ${interest.benefit}`,
        `${relationship.benefit} ${routine.benefit} 여기에 ${emotion.benefit} 이 강점들이 한 장면에서 잘 이어지면 주변 사람은 ${code}와 함께할 때 무엇을 보고 다음에 어떻게 움직여야 할지 이해하기 쉬워요.`,
      ),
    ],
  };
}

function buildRoleChapter(context: GuideContext): ChapterDraft {
  const { code, profile, energy, interest, relationship, routine } = context;
  return {
    label: "이름 뜻",
    title: `‘${profile.displayName}’에 담긴 뜻을 알아봐요`,
    summary: `‘${profile.displayName}’는 ${code}가 자주 중요하게 여기는 가치와 일상에서 반복해서 맡는 역할을 기억하기 쉽게 담은 이름이에요.`,
    checkQuestion:
      "가까운 사람들이 나에게 자주 기대하거나 부탁하는 역할은 무엇인가요?",
    sections: [
      section(
        `${profile.shortName}라는 이름`,
        `${profile.shortName}는 직업이나 지위를 뜻하는 말이 아니라 ${code}의 반복되는 생각과 행동을 짧게 기억하도록 만든 별칭이에요. ${energy.action} ${interest.action}`,
        `${relationship.action} 그리고 ${routine.action} 이런 흐름 때문에 주변에서는 ${code}가 ${profile.shortName}와 비슷한 역할을 맡는 모습을 자주 보게 돼요.`,
      ),
      section(
        "이 이름에 담긴 가치",
        `${interest.benefit} ${relationship.benefit} ${code}는 새로운 생각을 내는 데서 그치기보다, 중요하게 본 내용을 관계와 생활에서 시도하려는 쪽으로 답했어요.`,
        `${routine.thought} 그래서 선택한 방향을 생활에 맞는 행동으로 옮기는 과정도 중요하게 여겨요. 주변과 함께 움직이는 방식은 달라도, 생각을 실제 경험으로 연결하려는 점이 이 별칭의 중심이에요.`,
      ),
      section(
        "이 이름이 잘 드러나는 순간",
        `무엇부터 해야 할지 모르는 장면에서 ${code}는 먼저 ‘${energy.focus}’에 집중해요. 그다음 ‘${interest.focus}’, ‘${relationship.focus}’을 차례로 살펴요.`,
        `사람들의 생각이 흩어져 있거나 예상 밖의 변화가 생겼을 때도 ${routine.action} 이때 주변에서는 ${code}가 복잡한 장면을 자신만의 기준으로 정리하고 다음 움직임을 만드는 사람처럼 느낄 수 있어요.`,
      ),
      section(
        "별칭을 내 경험과 연결하는 법",
        `최근 잘 풀린 일 하나를 떠올리고 내가 먼저 본 것, 실제로 한 말, 끝까지 이어간 행동을 차례로 적어 보세요. 세 장면에서 비슷한 흐름이 반복됐다면 ‘${profile.displayName}’가 내 생활에서 어떻게 나타나는지 더 구체적으로 이해할 수 있어요.`,
        `가까운 사람에게 “내가 어떤 일을 맡을 때 가장 믿음직해 보여?”라고 물어보는 것도 좋아요. 답을 별칭에 억지로 맞추기보다 실제 행동과 연결해 보면, ${profile.shortName}라는 이름이 뜻하는 장점과 보완할 점을 함께 찾기 쉬워요.`,
      ),
    ],
  };
}

function buildFiveLettersChapter(context: GuideContext): ChapterDraft {
  const { code, profile } = context;
  const sections = code.split("").map((symbol, index) => {
    const story = axisStories[symbol as CandidateCodeSymbol];
    const direction = getCandidateDirectionCopy(index + 1, symbol);
    if (!direction) {
      throw new Error(`${code} is missing public copy for ${symbol}`);
    }
    return section(
      `${symbol} — ${direction.detailTitle}`,
      `${symbol}${topicParticle(symbol)} ${direction.publicTypeName}을 뜻해요. ${direction.description} ${story.thought}`,
      `${code}에서 ${symbol}${topicParticle(symbol)} ${story.action} ${story.benefit} ${story.need}`,
    );
  });
  return {
    label: "뉴앙 코드",
    title: `${code} 뉴앙 코드를 한 글자씩 알아봐요`,
    summary: `${code}는 ${code
      .split("")
      .map((symbol, index) => `${symbol} ${profile.codeTypeNames[index]}`)
      .join(" · ")}의 다섯 방향으로 이루어져요.`,
    checkQuestion:
      "뉴앙 코드 가운데 최근 내 생각과 행동에서 가장 선명하게 드러난 글자는 무엇인가요?",
    sections,
  };
}

function buildCombinedChapter(context: GuideContext): ChapterDraft {
  const { code, emotion, energy, interest, profile, relationship, routine } =
    context;
  return {
    label: "조합의 모습",
    title: `${code}의 다섯 경향이 함께 움직이는 방식을 알아봐요`,
    summary: `${code}에서는 에너지, 관심, 관계, 실행, 감정의 다섯 방향이 차례로 이어지며 ${profile.shortName}다운 전체 흐름을 만들어요.`,
    checkQuestion:
      "최근 예상 밖의 일이 생겼을 때 무엇을 먼저 보고 어떤 순서로 움직였나요?",
    sections: [
      section(
        "에너지와 관심이 만날 때",
        `${energy.thought} 그 상태에서 ${interest.thought} 그래서 ${code}는 생각을 시작하는 장소와 관심을 넓히는 방식이 자연스럽게 이어져요.`,
        `${energy.action} 이어서 ${interest.action} 이 두 경향이 만나면 ${code}는 정보를 받아들이는 데서 멈추지 않고 자신에게 맞는 방식으로 의미를 정리해요.`,
      ),
      section(
        "관계에서 생각이 움직일 때",
        `${relationship.thought} ${energy.symbol === "E" ? "대화 속에서 상대 반응을 바로 확인하며" : "먼저 마음속에서 핵심을 정리한 뒤"} 필요한 말과 행동을 골라요.`,
        `${interest.symbol === "N" ? "여러 가능성을 떠올린 뒤" : "직접 확인한 사실을 모은 뒤"} ${relationship.action} 이 흐름은 사람과 문제를 함께 이해하는 ${code}만의 관계 방식을 만들어요.`,
      ),
      section(
        "실행 방식이 더해질 때",
        `${routine.thought} 그래서 좋은 생각이 생긴 뒤 실제로 시작하는 시점과 이어가는 방법에서 ${routine.symbol}의 특징이 선명하게 보여요.`,
        `${routine.action} ${interest.symbol === "N" ? "넓어진 가능성을 실제 행동으로 좁힐 때" : "확인한 사실을 바로 쓸 수 있는 행동으로 바꿀 때"} ${profile.shortName}의 실행력이 살아나요.`,
      ),
      section(
        "감정의 속도까지 이어질 때",
        `${emotion.thought} 이 속도는 문제가 생겼을 때 바로 확인할 것과 잠시 기다릴 것을 고르는 과정에 영향을 줘요.`,
        `${emotion.action} ${emotion.need} 다섯 경향을 함께 살피면 ${code}가 무엇을 중요하게 보고 왜 그런 순서로 움직이는지 더 쉽게 이해할 수 있어요.`,
      ),
    ],
  };
}

function buildThoughtAndResponseChapter(context: GuideContext): ChapterDraft {
  const { code, emotion, energy, profile, relationship } = context;
  return {
    label: "생각과 반응",
    title: "처음 드는 생각과 실제 나타나는 반응을 나누어 봐요",
    summary: `${code}는 머릿속에 먼저 떠오른 생각과 관계·목표를 고려해 실제로 보여주는 반응이 달라질 때가 있어요.`,
    checkQuestion:
      "최근 머릿속에 먼저 떠오른 말과 실제로 상대에게 건넨 말은 어떻게 달랐나요?",
    sections: [
      section(
        "처음 떠오르는 생각",
        `누군가 고민을 말하거나 문제가 생기면 ${relationship.thought} 이것은 일부러 고른 결론이 아니라 ${code}의 관심이 자연스럽게 먼저 머무는 곳이에요.`,
        `${energy.thought} ${emotion.thought} 그래서 같은 정보를 들어도 머릿속에 떠오르는 질문과 걱정의 속도에서 ${code}의 특징이 나타나요.`,
      ),
      section(
        "실제로 나타나는 반응",
        `실제 반응을 보일 때는 상대와의 관계, 지금의 목표, 맡은 책임을 함께 고려해요. ${relationship.action} 처음 생각과 다른 말을 골랐다면 관계를 지키기 위해 반응을 다듬은 것일 수 있어요.`,
        `${energy.action} ${emotion.action} 밖으로 보이는 행동만 보지 않고 그전에 어떤 생각이 들었는지 함께 물으면 ${code}를 훨씬 정확하게 이해할 수 있어요.`,
      ),
      section(
        "생각과 행동이 다르게 보이는 장면",
        `${relationship.symbol === "G" ? "해결 방법이 먼저 떠올라도 상대가 속상해할 것을 생각해 공감부터 표현할 수 있어요." : "상대의 마음이 먼저 신경 쓰여도 지금 당장 문제를 풀어야 해서 해결 방법부터 말할 수 있어요."} 이 차이는 가식이 아니라 상황에 필요한 행동을 고르는 과정이에요.`,
        `${emotion.symbol === "Q" ? "속으로는 걱정이 빠르게 커져도 상대를 안심시키기 위해 차분하게 말할 수 있어요." : "겉으로 차분해 보여도 중요한 사람의 문제를 가볍게 여기는 것은 아니에요."} 생각과 행동을 나누어 보면 이런 오해를 줄일 수 있어요.`,
      ),
      section(
        "내 반응을 이해하는 방법",
        `최근 장면 하나를 골라 ‘처음 든 생각, 실제로 한 말과 행동, 그렇게 바꾼 이유, 뒤에 남은 마음’을 한 줄씩 적어 보세요. 네 줄을 함께 보면 ${profile.shortName}의 안쪽 생각과 바깥 행동이 어떻게 이어지는지 보여요.`,
        `상대에게도 “그때 처음에는 어떤 생각이 들었어?”라고 물어볼 수 있어요. 행동을 곧바로 성격으로 판단하지 않고 그 앞의 생각을 확인하면 서로 다른 성향도 편안하게 이해하기 쉬워요.`,
      ),
    ],
  };
}

function buildDailyChapter(context: GuideContext): ChapterDraft {
  const { code, emotion, interest, profile, routine } = context;
  return {
    label: "평소 모습",
    title: "선택하고 움직이고 쉬는 평소 모습을 알아봐요",
    summary: `${code}는 선택할 때 보는 정보, 변화를 받아들이는 방식, 일을 이어가는 흐름, 회복하는 방법에서 고유한 생활 리듬을 보여요.`,
    checkQuestion:
      "평소 계획이 바뀌거나 해야 할 일이 늘어났을 때 나는 어떻게 다시 움직이나요?",
    sections: [
      section(
        "선택할 때",
        `${interest.thought} 선택지가 여러 개라면 ${interest.symbol === "R" ? "이미 해본 경험과 실제 조건을 비교해 가장 믿을 만한 것을 골라요." : "각 선택이 앞으로 어떤 가능성으로 이어질지 떠올린 뒤 가장 의미 있는 것을 골라요."}`,
        `${emotion.thought} 중요한 선택에서는 걱정되는 부분을 확인한 뒤, ${routine.symbol === "K" ? "결정을 행동 순서로 옮겨요." : "먼저 해볼 수 있는 작은 행동으로 시험해 봐요."}`,
      ),
      section(
        "계획이 달라졌을 때",
        `${routine.thought} ${routine.symbol === "K" ? "처음 계획과 달라진 이유를 확인하고 목표를 지킬 수 있는 새 순서를 만들어요." : "지금 가능한 시간과 도움을 살펴 가장 움직이기 쉬운 길로 바꿔요."}`,
        `${emotion.action} 변화가 생긴 직후 바로 잘 대응했더라도 ${emotion.need} 계획을 다시 세우는 일과 마음이 편안해지는 일은 따로 챙겨야 해요.`,
      ),
      section(
        "일을 시작하고 이어갈 때",
        `${routine.action} ${interest.symbol === "N" ? "새로운 의미와 흥미가 보이면 시작할 힘이 커지고" : "해야 할 내용과 쓸 수 있는 방법이 구체적이면 시작하기 쉬우며"}, 중간에 막히면 ${interest.action}`,
        `${profile.shortName}의 강점을 오래 쓰려면 큰 목표를 한 번에 붙잡기보다 다음 행동과 확인할 시점을 분명하게 만드는 것이 좋아요. 끝난 일을 눈에 보이게 표시하면 다음 일을 시작할 여유도 생겨요.`,
      ),
      section(
        "하루를 마무리하고 쉴 때",
        `${emotion.symbol === "C" ? "바쁜 동안에는 피로를 크게 느끼지 않다가 일이 끝난 뒤 몸이 무거워질 수 있어요." : "하루 동안 신경 쓴 일이 머릿속에서 반복돼 쉬는 시간에도 생각이 이어질 수 있어요."} 잠들기 전에 몸과 마음의 상태를 짧게 확인하면 좋아요.`,
        `${routine.need} 해야 할 일을 모두 끝내야만 쉬는 것이 아니라, 다시 움직일 힘을 만드는 것도 하루의 중요한 일정이에요.`,
      ),
    ],
  };
}

function buildFamilyChapter(context: GuideContext): ChapterDraft {
  const { code, energy, relationship, routine } = context;
  return {
    label: "가족",
    title: `가족과 함께 있을 때의 ${code}를 알아봐요`,
    summary: `가족 안에서 ${code}는 도움을 주는 방식, 의견이 다를 때의 대화, 반복해서 맡는 역할에서 성향이 드러나요.`,
    checkQuestion:
      "가족이 힘든 일을 말했을 때 나는 무엇을 먼저 살피고 어떤 도움을 주나요?",
    sections: [
      section(
        "가족을 도울 때",
        `${relationship.thought} 그래서 가족이 힘들어하면 ${relationship.action} 가까운 사이라 설명을 줄여도 뜻이 통할 것이라 생각하기 쉽지만, 원하는 도움을 직접 물으면 훨씬 편안해요.`,
        `${routine.action} 한 번 돕기로 한 일은 자신에게 맞는 방식으로 이어가려 해요. 다만 가족의 부탁을 모두 책임지기보다 내가 할 수 있는 범위와 필요한 도움을 함께 정하는 것이 좋아요.`,
      ),
      section(
        "가족과 의견이 다를 때",
        `${energy.symbol === "E" ? "대화를 통해 바로 풀고 싶어 먼저 말을 꺼낼 수 있어요." : "생각을 정리한 뒤 정확하게 말하고 싶어 잠시 조용해질 수 있어요."} 가족은 이 시간을 관심의 크기로 오해하지 않도록 필요한 시간을 알려주면 좋아요.`,
        `${relationship.symbol === "G" ? "누가 맞는지를 따지기보다 문제를 만든 원인과 바꿀 행동을 정하려 해요." : "각자가 왜 그렇게 느꼈는지 듣고 관계가 편안해질 말을 찾으려 해요."} 서로 원하는 대화 방식을 먼저 확인하면 함께 이야기할 지점을 찾는 데 도움이 될 수 있어요.`,
      ),
      section(
        "가족 안에서 자주 맡는 역할",
        `가족과 관련된 답변에서는 다음 두 흐름을 함께 살펴볼 수 있어요. ${relationship.benefit} ${routine.benefit} 실제 역할과 기대는 가족 구성원과 상황에 따라 확인해야 해요.`,
        `오래 맡아 온 역할은 성향과 함께 행동에 영향을 줘요. 늘 잘해왔다는 이유로 같은 사람이 계속 책임지지 않도록 역할과 부담을 말로 나누는 것이 가족 관계를 오래 편안하게 만들어요.`,
      ),
      section(
        "서로 편안해지는 방법",
        `${energy.need} ${relationship.need} 이 두 가지를 가족과 미리 나누면 서로 다르게 이해한 부분을 확인하기 쉬워요.`,
        `“지금은 들어주면 돼, 아니면 같이 방법을 찾을까?”라고 먼저 물어보세요. ${code}의 익숙한 방식을 가족이 실제로 원하는 도움과 맞출 때 바로 써볼 수 있는 질문이에요.`,
      ),
    ],
  };
}

function buildFriendChapter(context: GuideContext): ChapterDraft {
  const { code, energy, emotion, profile, relationship } = context;
  return {
    label: "친구",
    title: `친구 관계에서 나타나는 ${code}를 알아봐요`,
    summary: `${code}는 친구와 가까워지는 속도, 고민을 듣는 방식, 연락과 약속을 이어가는 모습에서 성향이 드러나요.`,
    checkQuestion:
      "친구와 가까워질 때 내가 먼저 하는 행동과 오래 관계를 지키는 방법은 무엇인가요?",
    sections: [
      section(
        "친구와 가까워질 때",
        `${energy.action} ${energy.symbol === "E" ? "함께한 경험과 대화가 쌓일수록 친밀함을 빠르게 느끼기 쉬워요." : "처음에는 천천히 살피지만 믿음이 생기면 깊은 이야기와 꾸준한 관심을 보여줘요."}`,
        `${profile.shortName}는 친구의 말에서 ${relationship.symbol === "G" ? "함께 풀 수 있는 문제와 필요한 행동" : "말하지 못한 마음과 관계에 필요한 배려"}을 살펴요. 이 관심이 친구에게 믿음직한 모습으로 전해질 수 있어요.`,
      ),
      section(
        "친구의 고민을 들을 때",
        `${relationship.thought} 이어서 ${relationship.action} 이 반응은 친구를 돕고 싶은 마음에서 나오지만, 친구가 바라는 도움이 다르면 좋은 의도도 부담스럽게 느껴질 수 있어요.`,
        `${relationship.need} 특히 속상한 이야기를 들은 직후에는 “지금은 들어주는 게 좋아, 같이 방법을 찾는 게 좋아?”라고 물으면 서로 편안해요.`,
      ),
      section(
        "연락과 약속을 이어가는 방식",
        `${energy.symbol === "E" ? "연락을 주고받는 동안 관계가 이어진다고 느껴 먼저 소식을 전하기 쉬워요." : "연락이 뜸해도 마음이 멀어진 것은 아니며, 생각난 내용을 정리해 한 번에 깊게 나누는 편이에요."}`,
        `${emotion.symbol === "Q" ? "답장이 평소보다 늦으면 이유가 궁금하거나 관계 변화를 걱정할 수 있어요." : "답장이 늦어도 다른 일이 있겠다고 생각하며 비교적 차분히 기다리는 편이에요."} 필요한 연락 간격을 서로 알려주면 오해가 줄어요.`,
      ),
      section(
        "오래 편안한 우정을 만드는 방법",
        `${emotion.need} ${energy.need} 친구 관계에서도 나와 상대가 편안하게 느끼는 대화 속도와 만나는 횟수가 다를 수 있어요.`,
        `친구의 행동에 뜻을 붙이기 전에 직접 보고 들은 내용과 내가 짐작한 내용을 나누어 보세요. ${code}의 장점은 상대를 내 방식에 맞추는 데 쓰기보다 서로 잘 통하는 방법을 찾을 때 가장 크게 살아나요.`,
      ),
    ],
  };
}

function buildPartnerChapter(context: GuideContext): ChapterDraft {
  const { code, emotion, energy, profile, relationship } = context;
  return {
    label: "연인",
    title: `연인 관계에서 나타나는 ${code}를 알아봐요`,
    summary: `${code}는 애정을 표현하고 서운함을 다루며 갈등 뒤 다시 가까워지는 과정에서 고유한 관계 흐름을 보여요.`,
    checkQuestion:
      "사랑하는 사람에게 애정을 전하고 서운함을 풀 때 나는 어떤 방식을 자주 사용하나요?",
    sections: [
      section(
        "애정을 표현하는 방식",
        `${energy.symbol === "E" ? "좋아하는 마음을 말과 함께하는 활동으로 자주 표현해요." : "상대가 했던 말을 기억하고 필요한 순간에 조용히 챙기는 행동으로 마음을 보여줘요."} 표현 방식이 상대와 다르면 마음이 적어서가 아니라 서로 익숙한 전달 방식이 다른지 먼저 확인해 봐요.`,
        `${relationship.symbol === "G" ? "상대의 어려움을 실제로 줄여주는 행동과 해결 방법을 찾는 것이 중요한 애정 표현이에요." : "상대가 이해받고 편안하다고 느끼는 말과 시간을 만드는 것이 중요한 애정 표현이에요."} 내가 자주 하는 표현을 상대에게 알려주면 좋아요.`,
      ),
      section(
        "서운함이 생겼을 때",
        `${emotion.thought} ${emotion.symbol === "Q" ? "상대의 말과 표정이 계속 신경 쓰여 뜻을 빨리 확인하고 싶어질 수 있어요." : "먼저 사실과 이유를 생각하며 감정이 정리될 때까지 기다릴 수 있어요."}`,
        `${energy.symbol === "E" ? "대화가 미뤄지면 답답함이 커질 수 있어 언제 다시 이야기할지 정하는 것이 중요해요." : "바로 답을 요구받으면 생각이 막힐 수 있어 정리할 시간을 알리고 다시 대화하는 것이 중요해요."}`,
      ),
      section(
        "갈등을 풀어가는 순서",
        `${relationship.action} ${relationship.symbol === "G" ? "문제의 원인을 정리한 뒤 서로 바꿀 행동을 분명하게 정하면 안심돼요." : "서로 어떤 마음이었는지 충분히 들은 뒤 관계를 편안하게 할 행동을 정하면 안심돼요."}`,
        `갈등 중에는 해결과 공감 가운데 어느 것이 먼저 필요한지 물어보세요. ${code}에게 자연스러운 순서와 상대에게 필요한 순서를 맞추면 같은 갈등이 반복되는 일을 줄일 수 있어요.`,
      ),
      section(
        "신뢰를 오래 이어가는 방법",
        `${profile.shortName}의 강점은 연인을 대신 판단하거나 이끌 때보다 서로의 차이를 말로 확인하고 함께 정한 약속을 지킬 때 잘 살아나요. 작은 약속을 반복해서 지키는 경험이 신뢰를 만들어요.`,
        `${emotion.need} 사랑하는 사람에게 집중한 뒤에는 자신의 마음과 피로도 돌봐야 해요. 두 사람이 각각 편안해지는 방법을 알아두면 관계를 유지하는 일이 한 사람의 책임으로 몰리지 않아요.`,
      ),
    ],
  };
}

function buildPersonOfInterestChapter(context: GuideContext): ChapterDraft {
  const { code, emotion, energy, interest, relationship } = context;
  return {
    label: "마음 가는 사람",
    title: `마음 가는 사람을 알아갈 때의 ${code}를 살펴봐요`,
    summary: `${code}는 호감을 느끼고 상대의 신호를 이해하며 자신의 마음을 표현하는 과정에서 다섯 경향이 함께 나타나요.`,
    checkQuestion:
      "마음에 드는 사람을 알아갈 때 나는 어떤 신호를 먼저 보고 어떻게 마음을 표현하나요?",
    sections: [
      section(
        "호감이 생겼을 때",
        `${energy.symbol === "E" ? "대화를 먼저 열고 함께할 기회를 만들며 상대를 알아가려 해요. 자연스럽게 가까워질 장면을 직접 만들어요." : "상대의 말과 행동을 충분히 살핀 뒤 자연스러운 이유가 생겼을 때 다가가요. 서두르기보다 믿을 만한 신호를 차근차근 확인해요."}`,
        `${interest.symbol === "N" ? "짧은 대화에서도 상대의 생각과 앞으로 함께할 수 있는 가능성을 떠올려요." : "상대가 실제로 보여준 태도와 함께한 경험을 통해 믿을 만한 사람인지 살펴봐요."}`,
      ),
      section(
        "상대의 신호가 애매할 때",
        `${emotion.thought} ${emotion.symbol === "Q" ? "작은 변화에도 여러 의미가 떠올라 상대 마음을 빨리 확인하고 싶어질 수 있어요." : "한 번의 반응보다 반복해서 보인 행동을 보며 조금 더 기다릴 수 있어요."}`,
        `상대가 직접 한 말, 반복해서 보인 행동, 내가 기대하거나 걱정해서 붙인 의미를 나누어 적어 보세요. 사실과 짐작을 구분하면 호감이 커진 순간에도 자신을 지키며 관계를 볼 수 있어요.`,
      ),
      section(
        "마음을 표현하는 방식",
        `${relationship.symbol === "G" ? "상대에게 실제로 도움이 되는 행동과 함께할 계획으로 관심을 보여주기 쉬워요." : "상대의 마음을 기억하고 편안하게 이야기할 시간을 만드는 방식으로 관심을 보여주기 쉬워요."}`,
        `${energy.action} 다만 내게 자연스러운 표현이 상대에게도 편안한지 살펴야 해요. 짧고 분명하게 마음을 전한 뒤 상대가 선택할 시간과 여유를 주는 것이 좋아요.`,
      ),
      section(
        "서두르지 않고 가까워지는 방법",
        `${relationship.need} ${emotion.need} 호감이 있다는 이유로 모든 신호를 좋게 해석하거나 걱정되는 쪽으로만 해석하지 않도록 실제 대화와 반복된 행동을 함께 보세요.`,
        `${code}의 장점을 가장 잘 쓰는 방법은 상대를 분석해 답을 얻는 것이 아니라 서로의 마음과 속도를 직접 확인하는 일이에요. 좋아한다는 마음과 상대의 선택을 함께 존중할 때 관계가 편안하게 시작돼요.`,
      ),
    ],
  };
}

function buildWorkChapter(context: GuideContext): ChapterDraft {
  const { code, emotion, energy, interest, profile, relationship, routine } =
    context;
  return {
    label: "일과 공부",
    title: `일하고 공부할 때의 ${code}를 알아봐요`,
    summary: `${code}는 과제를 바라보는 곳, 의견을 나누는 방식, 시작과 마무리를 이어가는 흐름에서 강점이 나타나요.`,
    checkQuestion:
      "일이나 공부에서 내 집중력이 가장 잘 살아나는 조건과 자주 막히는 지점은 무엇인가요?",
    sections: [
      section(
        "일을 시작할 때",
        `${interest.thought} ${routine.thought} 그래서 ${code}는 해야 할 이유와 첫 행동이 자신의 방식으로 이해될 때 시작하기 쉬워요.`,
        `${interest.action} 이어서 ${routine.action} 큰 과제는 지금 확인할 한 가지와 오늘 끝낼 한 가지로 나누면 ${profile.shortName}의 장점을 실제 결과로 연결하기 좋아요.`,
      ),
      section(
        "함께 의견을 나눌 때",
        `${energy.action} ${relationship.thought} 이 때문에 회의나 공동 과제에서 정보와 사람을 함께 살피며 자신의 기준으로 의견을 정리해요.`,
        `${relationship.action} 의견이 다를 때는 결론만 반박하기보다 서로 무엇을 중요하게 보는지 물어보세요. 그러면 판단의 기준을 확인하는 데 도움이 될 수 있어요.`,
      ),
      section(
        "마감과 변화를 다룰 때",
        `${routine.action} ${routine.symbol === "K" ? "마감과 완료 기준이 분명할수록 해야 할 일에 집중하기 쉬워요." : "중간 결과를 자주 확인하고 방법을 바꿀 여지가 있을 때 해야 할 일에 집중하기 쉬워요."}`,
        `${emotion.action} 급한 일을 처리한 뒤에는 ${emotion.need} 계속 일할 수 있다는 것과 충분히 회복했다는 것은 다른 일이에요.`,
      ),
      section(
        "강점이 잘 살아나는 환경",
        `${energy.symbol === "E" ? "필요할 때 바로 의견을 주고받을 사람이 있고" : "방해받지 않고 생각을 정리할 시간이 있으며"}, ${interest.symbol === "N" ? "새로운 방법을 제안할 여지가 있고" : "목표와 필요한 정보가 구체적이며"}, ${routine.symbol === "K" ? "역할과 마감이 분명한" : "방법을 유연하게 바꿀 수 있는"} 환경에서 강점이 잘 보여요.`,
        `${energy.need} ${routine.need} 자신에게 맞는 환경을 기다리기보다 필요한 조건을 동료와 짧게 공유하면 협업이 더 쉬워져요.`,
      ),
    ],
  };
}

function buildStressChapter(context: GuideContext): ChapterDraft {
  const { code, emotion, energy, profile, relationship, routine } = context;
  return {
    label: "부담과 회복",
    title: `${code}가 부담을 느끼고 회복하는 방식을 알아봐요`,
    summary: `${code}는 부담이 시작되는 신호, 겉으로 보이는 반응, 실제로 도움이 되는 회복 조건을 함께 살펴야 해요.`,
    checkQuestion:
      "부담이 커질 때 내 몸과 생각에 가장 먼저 나타나는 신호와 회복에 도움이 되는 행동은 무엇인가요?",
    sections: [
      section(
        "부담이 커지기 시작할 때",
        `${emotion.thought} 여기에 ${routine.symbol === "K" ? "계획이 계속 어긋나거나 책임이 몰리면 통제하기 어렵다는 부담이 커져요." : "해야 할 일이 쌓이고 어디서 시작할지 정하지 못하면 부담이 커져요."}`,
        `${relationship.symbol === "G" ? "문제가 반복되는데 원인과 해결 방법이 보이지 않을 때 답답함을 느끼기 쉬워요." : "상대의 마음을 알기 어렵거나 관계가 어색한 채로 오래 이어질 때 신경을 많이 써요."} 이런 장면이 겹치면 평소보다 말과 행동이 급해지거나 줄어들 수 있어요.`,
      ),
      section(
        "겉으로 보이는 모습과 속마음",
        `${emotion.action} ${emotion.symbol === "C" ? "겉으로 침착해 보여도 속으로는 해결할 일을 계속 붙잡고 있을 수 있어요." : "감정이 먼저 드러나도 문제를 감당할 힘이 없다는 뜻은 아니며, 중요해서 빠르게 반응하는 것이에요."}`,
        `${energy.symbol === "E" ? "사람에게 말하며 풀려고 할 때 조언보다 먼저 들어주는 반응이 도움이 돼요." : "잠시 말이 줄어들 때 혼자 정리할 시간을 준 뒤 다시 대화할 시점을 정하면 도움이 돼요."}`,
      ),
      section(
        "회복에 실제로 도움이 되는 것",
        `${energy.symbol === "E" ? "믿을 만한 사람과 편안하게 이야기하고 몸을 움직이는 활동" : "혼자 방해받지 않고 생각을 정리하며 자극을 줄이는 시간"}이 회복에 도움이 돼요. ${relationship.symbol === "G" ? "바꿀 수 있는 일 하나를 끝내면 막연한 부담도 줄어요." : "내 마음을 정확히 말하고 이해받는 경험이 부담을 줄여줘요."}`,
        `${routine.symbol === "K" ? "남은 일을 다시 정리하고 쉬는 시간을 일정에 넣어야 마음 놓고 쉴 수 있어요." : "가장 작은 일 하나를 끝낸 뒤 그날의 에너지에 맞는 회복 방법을 고르면 좋아요."} 회복도 자신에게 맞는 순서로 시작해야 이어지기 쉬워요.`,
      ),
      section(
        "다시 편안해지는 순서",
        `먼저 몸의 긴장, 반복되는 생각, 사람을 만날 에너지를 각각 확인하세요. 그다음 지금 해결할 수 있는 일과 나중에 생각할 일을 나누고, 필요한 도움을 한 사람에게 구체적으로 요청하면 좋아요.`,
        `${emotion.need} ${routine.need} ${profile.shortName}의 강점은 무리해서 계속 버티는 데 있지 않고, 회복한 뒤 자신의 방식을 다시 편안하게 쓰는 데 있어요.`,
      ),
    ],
  };
}

function buildGrowthChapter(context: GuideContext): ChapterDraft {
  const { code, emotion, energy, interest, profile, relationship, routine } =
    context;
  return {
    label: "강점과 성장",
    title: `${code}의 익숙한 방식을 편안하게 오래 쓰는 방법을 알아봐요`,
    summary: `${code}의 익숙한 방식은 필요한 장면에서 쓰고, 지나치게 쓰기 시작하는 신호를 알아차릴 때 부담 없이 이어가기 쉬워요.`,
    checkQuestion:
      "내 방식이 특히 잘 통했던 장면과 오히려 지치게 만들었던 장면은 무엇이 달랐나요?",
    sections: [
      section(
        "자연스럽게 쓰는 방식",
        `${energy.benefit} ${interest.benefit} 이 두 흐름이 함께 나타나면 ${code}는 자신에게 익숙한 방식으로 정보를 이해하고 다른 사람과 나누려 해요.`,
        `${relationship.benefit} ${routine.benefit} ${emotion.benefit} 이런 흐름이 함께 나타나는 모습을 ${profile.displayName}이라는 이름으로 소개해요.`,
      ),
      section(
        "강점을 많이 쓰면 생기는 일",
        `${energy.need} ${interest.need} 익숙한 방식도 오래 계속하면 피로가 쌓이거나 다른 선택을 놓칠 수 있어요.`,
        `${relationship.need} ${routine.need} 내 의도가 상대에게 어떻게 전달됐는지 확인하고, 목표보다 부담이 커지는 순간에는 잠시 멈추는 것이 좋아요.`,
      ),
      section(
        "균형을 되찾는 작은 행동",
        `${emotion.need} 하루를 마칠 때 ‘오늘 도움이 된 방식 하나, 오래 써서 지친 방식 하나, 내일 바꿀 행동 하나’를 적으면 스스로를 탓하지 않고 균형을 찾기 쉬워요.`,
        `${energy.symbol === "E" ? "대화하기 전에 혼자 핵심을 한 줄로 정리하고" : "생각이 완벽히 정리되기 전에 핵심을 한 줄로 공유하고"}, ${interest.symbol === "N" ? "여러 가능성 중 하나를 실제로 시험하며" : "익숙한 방법 외의 선택을 하나 더 물어보는"} 행동이 도움이 돼요.`,
      ),
      section(
        "더 편안하게 성장하는 방법",
        `성장은 자신의 성향과 반대로 사는 일이 아니에요. ${code}가 가진 장점은 그대로 두고, 자주 놓치는 정보와 상대 반응을 조금 더 확인하는 행동을 더하는 것이 현실적인 성장 방법이에요.`,
        `잘 풀린 장면에서 사람, 시간, 정보, 도움, 에너지 조건을 적어 보세요. 같은 조건을 다시 만들 수 있으면 ${profile.shortName}의 장점을 운에 맡기지 않고 생활에서 더 자주 사용할 수 있어요.`,
      ),
    ],
  };
}

function buildConversationChapter(context: GuideContext): ChapterDraft {
  const { code, emotion, energy, profile, relationship } = context;
  return {
    label: "오해와 대화",
    title: `${code}가 자주 받는 오해와 잘 통하는 말을 알아봐요`,
    summary: `${code}의 겉으로 보이는 행동과 마음속 의도가 다르게 전달될 때, 실제 의도와 필요한 대화 순서를 알려주면 오해를 줄일 수 있어요.`,
    checkQuestion:
      "주변에서 자주 받는 오해와 실제 내 의도 사이에는 어떤 차이가 있나요?",
    sections: [
      section(
        "주변에서 오해하기 쉬운 모습",
        `${energy.symbol === "E" ? "먼저 말을 많이 꺼내면 혼자 결론을 정한 사람처럼 보일 수 있어요." : "말을 아끼고 먼저 살피면 관심이 없거나 의견이 없는 사람처럼 보일 수 있어요."} 실제로는 ${energy.thought}`,
        `${relationship.symbol === "G" ? "해결 방법을 빠르게 말하면 감정을 중요하게 여기지 않는 사람처럼 보일 수 있어요." : "상대 마음을 오래 살피면 결정을 피하거나 문제를 미루는 사람처럼 보일 수 있어요."} 실제로는 ${relationship.thought}`,
      ),
      section(
        "실제로 마음속에서 일어나는 일",
        `${emotion.thought} ${emotion.symbol === "C" ? "차분한 반응은 중요하지 않아서가 아니라 먼저 무엇을 할지 정리하는 방식이에요." : "빠른 걱정과 감정은 약해서가 아니라 중요한 신호를 놓치지 않으려는 반응이에요."}`,
        `${profile.shortName}의 행동 앞에는 자신이 중요하게 여기는 기준과 상대를 돕고 싶은 이유가 있어요. 결과만 설명하지 말고 무엇을 보고 그런 행동을 골랐는지 알려주면 의도가 더 정확히 전해져요.`,
      ),
      section(
        "의도를 정확히 전하는 말",
        `“내가 먼저 본 것은 이것이었고, 그래서 이런 생각이 들었어. 네가 원하는 것도 듣고 싶어”라고 말해 보세요. 직접 보고 들은 내용, 내 생각, 상대에게 묻고 싶은 것을 나누면 대화가 공격이나 변명처럼 들리는 일을 줄일 수 있어요.`,
        `${energy.symbol === "E" ? "생각이 떠오르는 대로 모두 말하기보다 핵심을 짧게 말하고 상대 차례를 기다리세요." : "침묵만 이어지지 않도록 생각할 시간이 필요하다는 말과 다시 대화할 시점을 알려주세요."}`,
      ),
      section(
        "서로 편안하게 대화하는 순서",
        `먼저 상대가 경험한 일을 듣고, 내가 이해한 내용을 한 문장으로 확인하세요. 그다음 내 생각과 필요한 행동을 말하고, 서로 받아들일 수 있는 다음 한 가지를 정하면 좋아요.`,
        `${relationship.need} ${emotion.need} 잘 통하는 대화는 성향을 맞히는 일이 아니라 서로 필요한 것을 직접 확인하는 일이에요.`,
      ),
    ],
  };
}

function buildEvidenceChapter(context: GuideContext): ChapterDraft {
  const { code, profile } = context;
  return {
    label: "신뢰 근거",
    title: "뉴앙이 성향을 살펴보고 설명하는 기준을 알아봐요",
    summary: `뉴앙은 서로 다른 생활 장면에서 반복되는 응답을 종합하고, 문항과 결과 설명을 같은 기준으로 관리해 ${code}를 안내해요.`,
    checkQuestion:
      "뉴앙의 문항 구성과 성향 설명 근거 가운데 더 자세히 확인하고 싶은 내용은 무엇인가요?",
    sections: [
      section(
        "어떤 성향을 살펴보나요?",
        `뉴앙은 한 가지 질문으로 ${code}를 정하지 않아요. 사람과 함께할 때의 활력, 관심이 머무는 곳, 관계에서 먼저 살피는 것, 일을 이어가는 방식, 걱정과 감정이 커지는 속도를 여러 장면에서 나누어 물어요.`,
        `뉴앙 코드는 능력이나 좋고 나쁨의 점수가 아니에요. 각 방향이 최근 여러 달의 평소 생각과 행동에서 얼마나 반복됐는지를 함께 살펴 현재 더 가까운 쪽을 보여줘요.`,
      ),
      section(
        "반복되는 모습을 확인해요",
        `특별히 잘했거나 힘들었던 한 번의 경험보다 가족, 친구, 일, 혼자 있는 시간에서 반복된 모습을 살펴봐요. 같은 성향이 서로 다른 장면에서도 비슷한 흐름으로 나타나는지 확인해야 결과를 생활과 연결할 수 있어요.`,
        `처음 드는 생각과 실제 나타나는 반응도 나누어 봐요. 마음속에는 해결 방법이 먼저 떠올라도 상대를 생각해 공감부터 표현할 수 있기 때문에, 두 층을 함께 봐야 ${profile.shortName}의 모습을 자세히 이해할 수 있어요.`,
      ),
      section(
        "전문 연구를 생활 언어로 바꿔요",
        `성향의 넓은 구조는 Big Five와 BFI-2 같은 성격 연구를 참고하고, 한 사람의 행동이 여러 장면에서 달라지는 모습은 일상 행동의 분포를 살펴본 연구를 참고해요. 감정 경험과 실제 표현을 구분하는 과정도 전문 연구를 바탕으로 설계해요.`,
        `가족·친구·연인·일에서 나타나는 모습은 관계 만족, 협력, 스트레스와 회복에 관한 연구를 함께 참고해요. 연구 용어를 그대로 옮기지 않고, ${code}의 다섯 성향과 연결되는 일상 장면과 행동으로 설명해요.`,
      ),
      section(
        "어디까지 해석하나요?",
        `관계 연구에서도 성향은 만족도의 일부만 설명했고, 두 사람이 닮은 정도가 설명하는 범위는 매우 작았어요. 그래서 뉴앙 코드는 관계의 미래나 두 사람의 잘 맞는 정도를 예측하는 점수로 사용하지 않아요.`,
        `가족·친구·연인·일 장의 설명은 답변에서 확인한 경향을 돌아볼 질문으로 읽어 주세요. 실제 역할, 상대의 마음, 행동의 이유는 코드로 정하지 않고 당사자의 말과 현재 상황을 직접 확인해야 해요.`,
      ),
      section(
        "문항과 설명을 함께 관리해요",
        `문항, 점수 계산, 코드 이름, 성향 설명은 같은 버전으로 함께 관리해요. 질문이 바뀌면 관련 결과와 문장을 다시 확인하고, 검사에서 살펴본 내용과 결과 화면의 설명이 어긋나지 않도록 점검해요.`,
        `사용자가 남긴 문장 이해도와 실제 경험 피드백은 문항과 설명을 더 분명하게 다듬는 데 반영해요. ${code} 안내도 같은 말이 반복되지 않는지, 누구나 이해하기 쉬운 한국어인지, 실제 생활 장면이 먼저 설명되는지 계속 확인해요.`,
      ),
    ],
  };
}

function section(
  title: string,
  ...paragraphs: [string, string, ...string[]]
): TraitMapCustomerGuideChapter["sections"][number] {
  return {
    title,
    paragraphs: paragraphs.map(normalizeParagraph),
  };
}

function topicParticle(symbol: string) {
  return ["R", "N", "M"].includes(symbol) ? "은" : "는";
}

function normalizeParagraph(paragraph: string) {
  return paragraph
    .replace(/요 (?=[가-힣A-Z‘“])/g, "요. ")
    .replace(/요$/, "요.")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * 같은 축 설명이 여러 생활 장에 그대로 반복되면 기계적으로 읽힐 수 있어요.
 * 첫 설명은 유지하고, 다음 등장부터는 실제 섹션 제목을 짧은 상황 단서로
 * 연결합니다. 과거처럼 장·섹션 이름을 내부 경로 형태로 붙이지 않습니다.
 */
function addSceneContextToRepeatedSentences(
  chapters: TraitMapCustomerGuideChapter[],
) {
  const used = new Set<string>();

  for (const chapter of chapters) {
    for (const section of chapter.sections) {
      section.paragraphs = section.paragraphs.map((paragraph) => {
        const sentences = paragraph
          .match(/[^.!?。！？]+[.!?。！？]?/gu)
          ?.map((item) => item.trim()) ?? [paragraph];
        return sentences
          .map((sentence) => {
            const signature = customerSentenceSignature(sentence);
            if (signature.length < 30 || !used.has(signature)) {
              used.add(signature);
              return sentence;
            }

            const contextualized = `${sceneContextLead(section.title)} ${sentence}`;
            used.add(customerSentenceSignature(contextualized));
            return contextualized;
          })
          .join(" ");
      });
    }
  }
}

function sceneContextLead(sectionTitle: string) {
  if (sectionTitle.includes("—")) {
    return `${sectionTitle.split("—")[0]?.trim() ?? sectionTitle} 성향을 살펴보면,`;
  }
  if (/(?:때|순간|앞에서|안에서|사이에서|중에는)$/u.test(sectionTitle)) {
    return `${sectionTitle},`;
  }
  return `${sectionTitle}${koreanObjectParticle(sectionTitle)} 살펴보면,`;
}

function koreanObjectParticle(value: string) {
  const last = value.trim().codePointAt(value.trim().length - 1);
  if (!last || last < 0xac00 || last > 0xd7a3) return "를";
  return (last - 0xac00) % 28 === 0 ? "를" : "을";
}

function customerSentenceSignature(sentence: string) {
  return sentence.replace(/[A-Z]{5}/gu, "").replace(/[^가-힣a-zA-Z0-9]/gu, "");
}
