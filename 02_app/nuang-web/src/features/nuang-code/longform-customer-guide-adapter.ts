import {
  getCandidateDirectionCopy,
  getCandidateProfileDefinition,
} from "@/features/nuang-code/candidate-profile-names";
import {
  countTraitMapCustomerGuideCharacters,
  traitMapCustomerGuideChapterSlots,
  traitMapCustomerGuideContractVersion,
  traitMapCustomerGuideSchema,
  type TraitMapCustomerGuide,
  type TraitMapCustomerGuideChapter,
} from "@/features/nuang-code/trait-map-customer-guide-contract";

type LongformEditorialChapter = {
  body: readonly string[];
  chapterId: string;
  title: string;
};

type CandidateProfile = NonNullable<
  ReturnType<typeof getCandidateProfileDefinition>
>;

const sourceChapterIds = [
  "overview",
  "role_name_and_values",
  "five_code_positions",
  "code_interactions",
  "first_thought_and_actual_response",
  "daily_choice_and_change",
  "family",
  "friend",
  "partner",
  "person_of_interest",
  "work_and_study",
  "conflict_stress_and_recovery",
  "strength_overuse_and_growth",
  "misunderstanding_and_communication",
  "evidence_and_method",
] as const;

const chapterLabels = [
  "핵심 모습",
  "이름 뜻",
  "다섯 글자",
  "조합의 모습",
  "생각과 반응",
  "평소 모습",
  "가족",
  "친구",
  "연인",
  "마음 가는 사람",
  "일과 공부",
  "부담과 회복",
  "강점과 성장",
  "오해와 대화",
  "신뢰 근거",
] as const;

const chapterQuestions = [
  "이 성향의 핵심 모습 중 내 일상에서 가장 자주 나타나는 것은 무엇인가요?",
  "이 역할 이름이 나와 잘 맞는다고 느꼈던 최근 장면은 무엇인가요?",
  "다섯 글자 중 내 생각과 행동에서 가장 선명하게 보이는 글자는 무엇인가요?",
  "다섯 방향이 함께 움직였던 최근 경험을 하나 떠올려 볼까요?",
  "최근 상황에서 처음 든 생각과 실제로 보인 반응은 어떻게 달랐나요?",
  "평소 선택하거나 계획을 바꿀 때 반복되는 내 방식은 무엇인가요?",
  "가족과 함께 있을 때 가장 자주 맡게 되는 역할은 무엇인가요?",
  "친구와 가까워지고 관계를 이어갈 때 내가 자주 하는 행동은 무엇인가요?",
  "연인과 마음을 나누거나 갈등을 풀 때 내게 가장 필요한 것은 무엇인가요?",
  "마음에 드는 사람을 알아갈 때 내가 가장 먼저 살피는 신호는 무엇인가요?",
  "일하거나 공부할 때 내 강점이 가장 잘 살아나는 조건은 무엇인가요?",
  "부담이 커질 때 나타나는 신호와 회복에 도움이 되는 방법은 무엇인가요?",
  "내 강점을 편안하게 오래 쓰기 위해 더해 보면 좋은 행동은 무엇인가요?",
  "주변에서 자주 받는 오해와 실제 내 의도 사이에는 어떤 차이가 있나요?",
  "뉴앙의 문항 구성과 성향 해석 근거 중 더 자세히 알고 싶은 것은 무엇인가요?",
] as const;

const chapterSectionTitles = [
  [
    "가장 중요하게 여기는 것",
    "생각이 흘러가는 순서",
    "주변에서 자주 보게 되는 행동",
    "편안할 때 더 잘 드러나는 모습",
  ],
  [
    "이름에 담긴 뜻",
    "중요하게 여기는 가치",
    "이 이름이 잘 드러나는 순간",
    "강점이 오래 이어지려면",
  ],
  [],
  [
    "에너지와 관심이 만날 때",
    "관계에서 생각이 움직일 때",
    "실행 방식이 더해질 때",
    "감정의 속도까지 이어질 때",
    "이 성향의 대표 흐름",
  ],
  [
    "처음 떠오르는 생각",
    "실제로 나타나는 반응",
    "생각과 행동을 함께 보는 방법",
    "마음속 흐름을 이해하는 핵심",
  ],
  [
    "선택할 때",
    "계획이 달라졌을 때",
    "일을 시작하고 이어갈 때",
    "하루를 마무리하고 쉴 때",
  ],
  [
    "가족을 도울 때",
    "가족과 의견이 다를 때",
    "가족 안에서 자주 맡는 역할",
    "서로 편안해지는 방법",
  ],
  [
    "친구와 가까워질 때",
    "친구의 고민을 들을 때",
    "연락과 약속을 이어가는 방식",
    "오래 편안한 우정을 만드는 방법",
  ],
  [
    "애정을 표현하는 방식",
    "서운함이 생겼을 때",
    "갈등을 풀어가는 순서",
    "신뢰를 오래 이어가는 방법",
  ],
  [
    "호감이 생겼을 때",
    "상대의 신호가 애매할 때",
    "마음을 표현하는 방식",
    "서두르지 않고 가까워지는 방법",
  ],
  [
    "일을 시작할 때",
    "함께 의견을 나눌 때",
    "마감과 변화를 다룰 때",
    "강점이 잘 살아나는 환경",
  ],
  [
    "부담이 커지기 시작할 때",
    "겉으로 보이는 모습과 속마음",
    "회복에 실제로 도움이 되는 것",
    "다시 편안해지는 순서",
  ],
  [
    "자연스럽게 잘하는 것",
    "강점을 많이 쓰면 생기는 일",
    "균형을 되찾는 작은 행동",
    "더 편안하게 성장하는 방법",
  ],
  [
    "주변에서 오해하기 쉬운 모습",
    "실제로 마음속에서 일어나는 일",
    "의도를 정확히 전하는 말",
    "서로 편안하게 대화하는 순서",
  ],
  [
    "어떤 성향을 살펴보는 검사인가요?",
    "한 번의 답보다 반복되는 모습을 봐요",
    "결과와 설명을 함께 관리해요",
    "뉴앙이 계속 확인하는 기준",
  ],
] as const;

const chapterTitleBuilders = [
  (code: string) => `${code}의 생각과 행동을 한눈에 알아봐요`,
  (_code: string, displayName: string) =>
    `‘${displayName}’에 담긴 뜻을 알아봐요`,
  (code: string) => `${code} 다섯 글자를 한 글자씩 알아봐요`,
  (code: string) => `${code}의 다섯 경향이 함께 움직이는 방식을 알아봐요`,
  (_code: string) => "처음 드는 생각과 실제 나타나는 반응을 나누어 봐요",
  (_code: string) => "선택하고 움직이고 쉬는 평소 모습을 알아봐요",
  (code: string) => `가족과 함께 있을 때의 ${code}를 알아봐요`,
  (code: string) => `친구 관계에서 나타나는 ${code}를 알아봐요`,
  (code: string) => `연인 관계에서 나타나는 ${code}를 알아봐요`,
  (code: string) => `마음 가는 사람을 알아갈 때의 ${code}를 살펴봐요`,
  (code: string) => `일하고 공부할 때의 ${code}를 알아봐요`,
  (code: string) => `${code}가 부담을 느끼고 회복하는 방식을 알아봐요`,
  (code: string) => `${code}의 강점을 편안하게 오래 쓰는 방법을 알아봐요`,
  (code: string) => `${code}가 자주 받는 오해와 잘 통하는 말을 알아봐요`,
  (_code: string) => "뉴앙이 성향을 살펴보고 설명하는 기준을 알아봐요",
] as const;

const evidenceReferences = [
  {
    description:
      "Big Five의 5개 영역과 15개 세부 성향을 체계적으로 측정한 BFI-2 개발 연구",
    href: "https://escholarship.org/uc/item/16x6n05t",
    title: "Soto & John (2017), The Next Big Five Inventory",
  },
  {
    description:
      "넓은 성격 영역 아래에서 서로 관련되지만 구분되는 두 세부 측면을 설명한 연구",
    href: "https://doi.org/10.1037/0022-3514.93.5.880",
    title: "DeYoung, Quilty & Peterson (2007), BFAS",
  },
  {
    description:
      "성향의 중심 경향과 일상에서 나타나는 행동의 분포를 함께 이해하게 해주는 연구",
    href: "https://doi.org/10.1037/0022-3514.80.6.1011",
    title: "Fleeson (2001), Traits as Density Distributions of States",
  },
  {
    description:
      "감정 경험과 실제 표현·행동을 구분해서 살펴보는 감정 과정 연구",
    href: "https://pubmed.ncbi.nlm.nih.gov/9457784/",
    title: "Gross (1998), Emotion Regulation Process",
  },
  {
    description:
      "관계 만족에서 본인·상대·유사성 효과를 나누어 살펴본 세 나라 부부 표본 연구",
    href: "https://pubmed.ncbi.nlm.nih.gov/20718544/",
    title: "Dyrenforth et al. (2010), Personality and Relationships",
  },
  {
    description:
      "심리검사의 점수 해석과 사용 목적을 근거로 관리하기 위한 국제 전문 표준",
    href: "https://www.aera.net/Publications/Books/Standards-for-Educational-Psychological-Testing-2014-Edition",
    title: "AERA·APA·NCME, Standards for Testing",
  },
  {
    description:
      "검사를 다른 언어와 문화에 맞게 번역·적응·검증하기 위한 국제 지침",
    href: "https://www.intestcom.org/page/14",
    title: "International Test Commission, Test Adaptation Guidelines",
  },
] as const;

export function buildCustomerGuideFromLongform({
  chapters: sourceChapters,
  code,
}: {
  chapters: readonly LongformEditorialChapter[];
  code: string;
}): TraitMapCustomerGuide {
  const normalizedCode = code.trim().toUpperCase();
  const profile = getCandidateProfileDefinition(normalizedCode);

  if (!profile) {
    throw new Error(`Unknown Nuang code: ${normalizedCode}`);
  }
  const sourceById = new Map(
    sourceChapters.map((chapter) => [chapter.chapterId, chapter]),
  );
  const selectedSourceChapters = sourceChapterIds.map((chapterId) => {
    const chapter = sourceById.get(chapterId);
    if (!chapter) {
      throw new Error(`${normalizedCode} longform is missing ${chapterId}`);
    }
    return chapter;
  });
  const usedParagraphs: string[] = [];

  const chapters: TraitMapCustomerGuideChapter[] = selectedSourceChapters.map(
    (source, index) => {
      const sourceParagraphs =
        index === 2
          ? buildFiveLetterParagraphs(profile)
          : index === 14
            ? buildEvidenceParagraphs(profile)
          : source.body
              .map((paragraph) => prepareSourceParagraph(paragraph, index))
              .filter((paragraph): paragraph is string => Boolean(paragraph));
      const supportingParagraphs =
        index === 2
          ? []
          : [
              ...(index === 0 ? [buildCorePatternParagraph(profile)] : []),
              ...(index === 14
                ? [
                    buildEvidenceReadingParagraph(profile),
                    buildRelationshipReadingParagraph(profile),
                  ]
                : []),
              buildEverydayExampleParagraph(index, profile),
              ...([0, 1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14].includes(
                index,
              )
                ? [buildPracticalReadingParagraph(index, profile)]
                : []),
            ];
      const paragraphs = deduplicateParagraphs(
        normalizeParagraphs([...sourceParagraphs, ...supportingParagraphs]),
        usedParagraphs,
      );
      const minimumParagraphs = index === 2 ? 10 : 6;
      if (paragraphs.length < minimumParagraphs) {
        for (const fallback of buildChapterFallbackParagraphs(index, profile)) {
          const normalizedFallback = toCustomerCopy(fallback);
          const deduplicatedFallback = deduplicateParagraphs(
            [normalizedFallback],
            usedParagraphs,
          )[0];
          if (deduplicatedFallback) paragraphs.push(deduplicatedFallback);
          if (paragraphs.length >= minimumParagraphs) break;
        }
      }
      expandParagraphsToMinimum(paragraphs, minimumParagraphs);
      const chapter: TraitMapCustomerGuideChapter = {
        checkQuestion: chapterQuestions[index],
        id: `chapter-${String(index + 1).padStart(2, "0")}`,
        label: chapterLabels[index],
        number: index + 1,
        sections: buildSections(
          paragraphs,
          `${normalizedCode}:${source.chapterId}`,
          getSectionTitles(index, profile),
        ),
        slot: traitMapCustomerGuideChapterSlots[index],
        summary: buildChapterSummary(index, profile, paragraphs),
        title: chapterTitleBuilders[index](
          normalizedCode,
          profile.displayName,
        ),
      };

      if (chapter.slot === "evidence") {
        chapter.references = [...evidenceReferences];
      }
      return chapter;
    },
  );
  const totalCharacters = countTraitMapCustomerGuideCharacters(chapters);
  if (totalCharacters < 10_000) {
    throw new Error(
      `${normalizedCode} customer guide has only ${totalCharacters} characters`,
    );
  }
  const customerCopy = JSON.stringify(chapters);
  const remainingEvasivePhrases = [
    "단정할 수",
    "알 수 없",
    "보장하지",
    "다를 수",
    "상황에 따라",
    "아닐 수도",
    "무조건 그런",
    "확정할 수",
  ].flatMap((phrase) => {
    const count = customerCopy.split(phrase).length - 1;
    return count > 0 ? [`${phrase}:${count}`] : [];
  });
  if (remainingEvasivePhrases.length > 0) {
    throw new Error(
      `${normalizedCode} has evasive phrases: ${remainingEvasivePhrases.join(", ")}`,
    );
  }

  return traitMapCustomerGuideSchema.parse({
    chapters,
    code: normalizedCode,
    contractVersion: traitMapCustomerGuideContractVersion,
    heroSummary: summarize(
      `${normalizedCode}는 ${profile.familyName}의 특징 위에 ${profile.codeTypeNames.join("·")} 다섯 방향이 함께 나타나는 성향이에요. ${profile.overview[0].text} ${profile.overview[1].text}`,
      300,
    ),
    profileName: profile.displayName,
    readingMinutes: Math.max(
      10,
      Math.min(60, Math.round(totalCharacters / 650)),
    ),
    totalCharacters,
    version: `${normalizedCode}-CUSTOMER-GUIDE-2.0`,
  });
}

function buildCorePatternParagraph(profile: CandidateProfile) {
  const [energy, interest, relationship, routine, emotion] =
    profile.code.split("");
  const flow = [
    energy === "E"
      ? "사람들과 이야기를 나누며 생각을 깨우고"
      : "혼자 핵심을 정리한 뒤 필요한 말과 행동을 고르고",
    interest === "R"
      ? "이미 확인된 사실과 실제 경험부터 살핀 다음"
      : "보이는 내용 너머의 의미와 새로운 가능성을 넓혀 본 다음",
    relationship === "G"
      ? "문제를 만든 원인과 해결할 부분을 찾고"
      : "상대의 마음과 관계에 남을 영향을 살피고",
    routine === "K"
      ? "다음 순서를 정해 꾸준히 이어가며"
      : "그날의 상황에 맞는 방법으로 유연하게 바꾸며",
    emotion === "C"
      ? "불편한 순간에도 걱정과 감정이 천천히 커지는 편이에요."
      : "불편한 순간에는 걱정과 감정이 빠르게 올라와 필요한 것을 일찍 확인하는 편이에요.",
  ];

  return `${profile.code}는 새로운 일이 생기면 ${flow.join(" ")} 이 순서가 반복되면서 ‘${profile.shortName}’다운 생각과 행동이 만들어져요.`;
}

function buildEvidenceReadingParagraph(profile: CandidateProfile) {
  return `${profile.code} 안내를 읽을 때는 먼저 다섯 글자의 뜻을 확인하고, 가족·친구·연인·일처럼 서로 다른 장면에서 같은 흐름이 반복되는지 살펴보세요. 한 번의 특별한 경험보다 최근 여러 달 동안 되풀이된 생각과 행동을 함께 볼 때 ‘${profile.displayName}’의 설명을 내 생활과 더 정확하게 연결할 수 있어요.`;
}

function buildRelationshipReadingParagraph(profile: CandidateProfile) {
  return `가까운 사람의 ${profile.code}를 이해하려면 이 안내에서 익숙한 장면을 하나 고른 뒤, 그 사람이 실제로 했던 말과 반복해서 보여준 행동을 함께 떠올려 보세요. ‘왜 저렇게 했을까’를 혼자 해석하는 데서 멈추지 않고 서로 필요한 것과 잘 통하는 말을 나누면, 성향 정보가 관계를 더 편안하게 이해하는 대화로 이어져요.`;
}

function buildEvidenceParagraphs(profile: CandidateProfile) {
  return [
    `뉴앙은 한 가지 질문이나 한 번의 인상으로 ${profile.code}를 정하지 않아요. 같은 성향을 일상, 관계, 선택, 변화, 부담처럼 서로 다른 장면에서 여러 번 물어보고 반복해서 나타나는 흐름을 함께 살펴봐요.`,
    `다섯 글자는 사람의 능력이나 좋고 나쁨을 매기는 점수가 아니에요. 에너지가 돌아오는 곳, 관심이 먼저 머무는 곳, 관계에서 먼저 살피는 것, 일을 이어가는 방식, 걱정과 감정이 커지는 속도를 각각 나누어 확인해요.`,
    `질문을 만들 때는 어느 한쪽 답이 더 좋아 보이지 않는지, 같은 뜻이 겹쳐 묻히지 않는지, 어린 사람과 나이 든 사람 모두 같은 장면을 떠올릴 수 있는지 살펴봐요. 답하기 어려운 문장은 사용자 의견을 모아 다시 다듬어요.`,
    `처음 드는 생각과 실제 나타나는 반응도 따로 살펴봐요. 머릿속에는 해결 방법이 먼저 떠올라도 상대의 마음을 고려해 공감부터 표현할 수 있기 때문에, 생각과 행동을 나누어 봐야 한 사람의 모습을 더 자세히 이해할 수 있어요.`,
    `성향의 넓은 구조는 Big Five와 BFI-2 같은 성격 연구를 참고하고, 일상에서 행동이 달라지는 모습은 여러 상황에서 반복되는 행동을 살펴본 연구를 참고해요. 감정 경험과 실제 표현을 구분하는 과정도 전문 연구를 바탕으로 설계해요.`,
    `가족·친구·연인·일에서 나타나는 모습은 관계 만족, 상대를 돕는 방식, 협력, 스트레스와 회복에 관한 연구를 함께 참고해요. 연구 결과를 코드에 그대로 붙이지 않고, 뉴앙이 실제로 묻는 다섯 성향과 연결되는 내용만 설명에 사용해요.`,
    `문항, 점수 계산, 코드 이름, 성향 설명은 같은 버전으로 함께 관리해요. 질문이 바뀌면 어떤 결과와 문장을 다시 확인해야 하는지 기록하고, 검사에서 살펴본 내용과 결과 화면의 설명이 서로 어긋나지 않도록 점검해요.`,
    `${profile.code} 안내는 이해하기 쉬운 한국어인지, 같은 말이 반복되지 않는지, 성향을 부정적으로 낙인찍는 표현이 없는지 함께 확인해요. 사용자가 남긴 문장 이해도와 실제 경험 피드백은 다음 문항과 설명을 더 정확하게 다듬는 데 반영해요.`,
  ];
}

const axisEverydayCopy: Record<
  string,
  { example: string; strength: string }
> = {
  E: {
    example:
      "새로운 모임에서는 먼저 인사를 건네거나 대화를 열고, 함께 이야기하는 동안 생각이 더 또렷해지는 모습으로 나타나요.",
    strength:
      "사람들의 반응을 바로 주고받을 수 있을 때 분위기를 움직이고 필요한 행동을 빠르게 시작하는 힘이 살아나요.",
  },
  I: {
    example:
      "새로운 모임에서는 먼저 분위기와 사람을 살피고, 생각이 정리되면 필요한 질문이나 깊이 있는 의견을 꺼내는 모습으로 나타나요.",
    strength:
      "혼자 집중할 시간이 있을 때 복잡한 생각을 차분히 정리하고 꼭 필요한 말과 행동을 고르는 힘이 살아나요.",
  },
  R: {
    example:
      "대화나 일을 시작할 때 이미 확인된 사실, 실제 경험, 지금 바로 쓸 수 있는 방법부터 살펴보는 모습으로 나타나요.",
    strength:
      "구체적인 정보와 현실 조건을 놓치지 않아 막연한 생각을 생활에서 쓸 수 있는 선택으로 바꾸는 힘이 살아나요.",
  },
  N: {
    example:
      "짧은 장면에서도 앞뒤 이야기를 떠올리고, 익숙한 방법 밖에 다른 가능성이 있는지 더 살펴보는 모습으로 나타나요.",
    strength:
      "서로 멀어 보이는 생각을 연결해 새로운 관점과 다음 선택지를 발견하는 힘이 살아나요.",
  },
  G: {
    example:
      "누군가 고민을 말하면 무슨 일이 있었는지, 어떤 원인이 결과를 만들었는지, 무엇을 바꾸면 풀릴지부터 생각하는 모습으로 나타나요.",
    strength:
      "문제를 사람에 대한 평가로 돌리기보다 바꿀 수 있는 원인과 구체적인 해결 방법을 찾는 힘이 살아나요.",
  },
  A: {
    example:
      "누군가 고민을 말하면 그 사람이 지금 어떤 마음인지, 어떤 말이 위로가 될지, 관계에 무엇이 필요한지부터 살피는 모습으로 나타나요.",
    strength:
      "결과만 보지 않고 사람에게 남을 마음까지 생각해 서로 편안하게 움직일 방법을 찾는 힘이 살아나요.",
  },
  K: {
    example:
      "해야 할 일의 순서를 정하고, 중간에 흐름이 끊겨도 다시 이어가며, 약속한 일을 마무리하는 모습으로 나타나요.",
    strength:
      "다음 행동과 확인할 시점을 분명히 정하면 좋은 생각과 약속을 실제 결과까지 꾸준히 이어가는 힘이 살아나요.",
  },
  M: {
    example:
      "그날의 에너지, 흥미, 마감, 주변 도움을 살펴 지금 가장 움직이기 쉬운 방법으로 바꾸는 모습으로 나타나요.",
    strength:
      "예상과 다른 일이 생겨도 한 방법에 묶이지 않고 지금 상황에 맞는 길을 빠르게 다시 찾는 힘이 살아나요.",
  },
  C: {
    example:
      "불편한 일이 생겼을 때 감정이 크게 올라오기 전에 사실과 선택지를 살피고 차분하게 대응하는 모습으로 나타나요.",
    strength:
      "급한 순간에도 문제와 감정을 나누어 보고 지금 할 수 있는 일을 고르는 힘이 살아나요.",
  },
  Q: {
    example:
      "답이 분명하지 않거나 중요한 관계가 흔들릴 때 걱정과 감정이 빠르게 올라와 여러 가능성을 확인하는 모습으로 나타나요.",
    strength:
      "작은 위험 신호와 관계의 변화를 일찍 알아차려 문제가 커지기 전에 확인하고 준비하는 힘이 살아나요.",
  },
};

function buildFiveLetterParagraphs(profile: CandidateProfile) {
  return profile.code.split("").flatMap((symbol, index) => {
    const direction = getCandidateDirectionCopy(index + 1, symbol);
    const everyday = axisEverydayCopy[symbol];
    if (!direction || !everyday) {
      throw new Error(`${profile.code} is missing public copy for ${symbol}`);
    }

    return [
      `${symbol}${getTopicParticle(symbol)} ${direction.publicTypeName}을 뜻해요. ${direction.description}`,
      `${profile.code}의 ${symbol}${getTopicParticle(symbol)} ${everyday.example}`,
      `${everyday.strength} ${profile.code}에서는 이 힘이 다른 네 글자와 함께 움직여 이 성향만의 생활 방식으로 이어져요.`,
    ];
  });
}

function getTopicParticle(symbol: string) {
  return ["R", "N", "M"].includes(symbol) ? "은" : "는";
}

function getSectionTitles(index: number, profile: CandidateProfile) {
  if (index === 2) {
    return profile.code.split("").map((symbol, position) => {
      const direction = getCandidateDirectionCopy(position + 1, symbol);
      return `${symbol} — ${direction?.detailTitle ?? direction?.publicTypeName ?? "성향"}`;
    });
  }
  return [...chapterSectionTitles[index]];
}

function buildChapterSummary(
  index: number,
  profile: CandidateProfile,
  paragraphs: string[],
) {
  const [energy, relationship, emotion] = profile.overview.map(
    (item) => item.text,
  );
  const summaries = [
    `${profile.code}는 ${energy} ${relationship} ${emotion}`,
    `역할 이름 ‘${profile.displayName}’에는 ${profile.code}가 자주 중요하게 여기는 가치와 반복해서 맡는 역할이 담겨 있어요.`,
    `${profile.code}는 ${profile.code
      .split("")
      .map(
        (symbol, position) =>
          `${symbol} ${profile.codeTypeNames[position]}`,
      )
      .join(" · ")}의 다섯 방향으로 이루어져요.`,
    `${profile.code}의 다섯 방향은 따로 움직이지 않고, 주의를 기울이는 곳부터 실제 행동과 감정의 속도까지 하나의 흐름을 만들어요.`,
    `${profile.code}는 머릿속에 처음 떠오른 생각과 관계와 상황을 살핀 뒤 실제로 보여주는 반응이 서로 다르게 나타날 때가 있어요.`,
    `${profile.code}가 선택하고 계획을 바꾸고 일을 이어가며 쉬는 방식에는 다섯 글자의 특징이 함께 나타나요.`,
    `가족 안에서 ${profile.code}는 자신의 에너지, 관계를 살피는 방식, 일을 이어가는 흐름을 바탕으로 반복해서 맡는 역할이 있어요.`,
    `친구 관계에서 ${profile.code}는 가까워지는 속도, 고민을 듣는 방식, 연락과 약속을 이어가는 모습으로 성향이 드러나요.`,
    `연인 관계에서 ${profile.code}는 애정을 표현하고 서운함을 다루며 갈등 뒤 다시 가까워지는 과정에서 고유한 흐름을 보여요.`,
    `마음 가는 사람을 알아갈 때 ${profile.code}는 호감을 느끼고 신호를 해석하며 마음을 표현하는 방식에서 다섯 경향이 함께 나타나요.`,
    `일과 공부에서 ${profile.code}는 문제를 바라보는 곳, 의견을 나누는 방식, 시작과 마무리를 이어가는 흐름에서 강점이 나타나요.`,
    `${profile.code}는 부담이 시작되는 순간과 감정이 커지는 속도, 실제로 회복에 도움이 되는 조건을 함께 살펴야 정확히 이해할 수 있어요.`,
    `${profile.code}의 강점은 알맞은 순간에 알맞은 크기로 쓸 때 가장 편안하게 이어져요.`,
    `${profile.code}의 겉으로 보이는 행동과 마음속 의도가 다르게 전달될 수 있어, 잘 통하는 설명과 대화 순서를 함께 알아두면 좋아요.`,
    `뉴앙은 여러 생활 장면에서 반복되는 응답을 종합하고, 문항과 결과 설명을 같은 기준으로 관리해 ${profile.code}를 안내해요.`,
  ] as const;

  return summarize(summaries[index] ?? paragraphs[0]);
}

function prepareSourceParagraph(paragraph: string, chapterIndex: number) {
  if (
    [
      "데이터센터",
      "내부 원장",
      "내부 기준 문서",
      "인지 인터뷰",
      "publicationState",
      "research_only",
      "직업 적합성",
    ].some((phrase) => paragraph.includes(phrase))
  ) {
    return null;
  }
  const sentences =
    paragraph.match(/[^.!?]+[.!?]?/g)?.map((sentence) => sentence.trim()) ?? [];
  const sentenceSignatures = new Set<string>();
  const visibleSentences = sentences.filter((sentence) => {
    if (shouldHideSourceSentence(sentence, chapterIndex)) return false;
    const signature = normalizeCustomerCopy(sentence);
    if (sentenceSignatures.has(signature)) return false;
    sentenceSignatures.add(signature);
    return true;
  });
  const copy = toCustomerCopy(visibleSentences.join(" "));
  return copy.length >= 40 ? copy : null;
}

function shouldHideSourceSentence(sentence: string, chapterIndex: number) {
  const alwaysHidden = [
    "데이터센터",
    "원장",
    "내부 기준",
    "연구 단계",
    "인지 인터뷰",
    "publicationState",
    "research_only",
    "비중첩",
    "근거를 상속",
    "문장을 새로 쓴",
    "검토 문장",
  ];
  if (alwaysHidden.some((phrase) => sentence.includes(phrase))) return true;
  if (
    sentence.includes("핵심은") &&
    (sentence.includes("아니다") || sentence.includes("있지 않다"))
  ) {
    return true;
  }
  if (chapterIndex === 14) return false;

  return [
    "코드만으로",
    "뜻이 아니다",
    "의미하지 않는다",
    "보장하지",
    "단정할 수",
    "검증",
    "문헌",
    "표본",
    "근거를",
    "가설",
    "능력의 등급",
    "직업을 정하는 말",
    "반대 코드처럼",
  ].some((phrase) => sentence.includes(phrase));
}

function deduplicateParagraphs(
  paragraphs: string[],
  usedParagraphs: string[],
) {
  const unique: string[] = [];
  const usedSentenceSignatures = new Set(
    usedParagraphs.flatMap(
      (paragraph) =>
        paragraph
          .match(/[^.!?]+[.!?]?/g)
          ?.map((sentence) => normalizeCustomerCopy(sentence)) ?? [],
    ),
  );
  for (const paragraph of paragraphs) {
    const uniqueSentences =
      paragraph
        .match(/[^.!?]+[.!?]?/g)
        ?.map((sentence) => sentence.trim())
        .filter((sentence) => {
          const signature = normalizeCustomerCopy(sentence);
          if (!signature || usedSentenceSignatures.has(signature)) return false;
          usedSentenceSignatures.add(signature);
          return true;
        }) ?? [];
    const sentenceDeduplicated = uniqueSentences.join(" ").trim();
    if (sentenceDeduplicated.length < 40) continue;
    if (
      [...usedParagraphs, ...unique].some((existing) =>
        areParagraphsTooSimilar(existing, sentenceDeduplicated),
      )
    ) {
      continue;
    }
    unique.push(sentenceDeduplicated);
  }
  usedParagraphs.push(...unique);
  return unique;
}

function expandParagraphsToMinimum(paragraphs: string[], minimum: number) {
  while (paragraphs.length < minimum) {
    const candidates = paragraphs
      .map((paragraph, index) => ({ index, paragraph }))
      .sort((left, right) => right.paragraph.length - left.paragraph.length);
    const candidate = candidates.find(({ paragraph }) =>
      Boolean(splitParagraph(paragraph)),
    );
    if (!candidate) break;
    const split = splitParagraph(candidate.paragraph);
    if (!split) break;
    paragraphs.splice(candidate.index, 1, ...split);
  }
}

function areParagraphsTooSimilar(left: string, right: string) {
  const normalizedLeft = normalizeCustomerCopy(left);
  const normalizedRight = normalizeCustomerCopy(right);
  if (normalizedLeft === normalizedRight) return true;
  if (
    normalizedLeft.length < 70 ||
    normalizedRight.length < 70 ||
    Math.abs(normalizedLeft.length - normalizedRight.length) >
      Math.max(normalizedLeft.length, normalizedRight.length) * 0.3
  ) {
    return false;
  }

  const chunks = (copy: string) => {
    const result = new Set<string>();
    for (let index = 0; index <= copy.length - 5; index += 3) {
      result.add(copy.slice(index, index + 5));
    }
    return result;
  };
  const leftChunks = chunks(normalizedLeft);
  const rightChunks = chunks(normalizedRight);
  let intersection = 0;
  for (const chunk of leftChunks) {
    if (rightChunks.has(chunk)) intersection += 1;
  }
  const union = leftChunks.size + rightChunks.size - intersection;
  return union > 0 && intersection / union >= 0.82;
}

function normalizeCustomerCopy(copy: string) {
  return copy
    .replace(/[A-Z]{5}/g, "")
    .replace(/[^가-힣a-zA-Z0-9]/g, "")
    .toLowerCase();
}

function buildChapterFallbackParagraphs(
  index: number,
  profile: CandidateProfile,
) {
  const [energy, relationship, emotion] = profile.overview.map(
    (item) => item.text,
  );
  const focus = [
    "중요한 일이 생겼을 때 가장 먼저 눈에 들어오는 것과 다음 행동",
    "이 역할 이름에 담긴 가치와 주변에서 반복해서 맡는 역할",
    "각 글자가 생활 속 생각과 행동으로 나타나는 방식",
    "다섯 방향이 한 장면에서 차례로 이어지는 순서",
    "처음 떠오른 생각을 실제 말과 행동으로 다듬는 과정",
    "평소 선택하고 계획을 바꾸며 하루를 이어가는 방식",
    "가족의 마음과 생활 문제를 함께 다루는 방식",
    "친구와 가까워지고 연락과 약속을 이어가는 방식",
    "연인에게 애정을 표현하고 서운함을 푸는 방식",
    "호감을 느끼고 상대의 뜻을 확인하며 가까워지는 방식",
    "일과 공부를 시작하고 협력하며 마무리하는 방식",
    "부담이 시작되고 감정이 커진 뒤 다시 회복하는 순서",
    "자연스러운 강점을 지치지 않고 오래 사용하는 방법",
    "겉으로 보이는 행동과 실제 의도를 정확히 전하는 방법",
    "여러 문항과 생활 장면을 종합해 성향을 설명하는 기준",
  ][index];
  return [
    `${chapterLabels[index]}에서는 ‘${focus}’에 초점을 맞춰 ${profile.code}를 살펴봐요. ${energy}`,
    `${profile.displayName}의 ${chapterLabels[index]} 특징은 평범한 관계와 선택에서 반복돼요. ${relationship} 그래서 무엇을 먼저 보고 어떤 행동으로 이어가는지가 비교적 선명하게 드러나요.`,
    `${chapterLabels[index]} 장면에서도 감정이 커지는 속도는 중요한 차이를 만들어요. ${emotion} 이 속도는 ${profile.code}가 정보를 확인하고 사람에게 반응하는 순서에도 영향을 줘요.`,
    `이 흐름을 이해하려면 최근의 평범한 하루를 떠올려 보면 좋아요. 그때 처음 본 것, 실제로 한 말과 행동, 그렇게 움직인 이유를 차례로 보면 ${profile.code}의 ${chapterLabels[index]} 설명이 경험과 연결돼요.`,
    `${chapterLabels[index]}에서는 멋있게 보인 한 번의 행동보다 여러 장면에서 되풀이된 모습을 살펴봐요. 반복되는 생각과 행동을 함께 보면 ${profile.code}의 특징이 더 분명해져요.`,
  ];
}

function buildEverydayExampleParagraph(
  index: number,
  profile: CandidateProfile,
) {
  const paragraphs = [
    `예를 들어 갑자기 새로운 모임이나 공동 과제가 생긴 장면을 떠올려 보세요. ${profile.code}는 ${profile.summary} 이때 가장 먼저 눈에 들어온 것과 실제로 꺼낸 첫 행동을 나란히 보면 ‘${profile.shortName}’의 핵심 흐름을 생활 속 경험과 연결할 수 있어요.`,
    `역할 이름이 잘 맞는지는 멋있게 들리는지보다 실제로 반복됐는지로 확인해요. 가까운 사람에게 내가 자주 맡는 역할을 물어보고, 그 답이 ${profile.shortName}의 설명과 어느 장면에서 이어지는지 이야기하면 혼자 읽을 때 놓친 모습도 발견할 수 있어요.`,
    `코드를 외울 때는 ${profile.code.split("").map((symbol, position) => `${symbol}${getTopicParticle(symbol)} ${profile.codeTypeNames[position]}`).join(", ")}이라고 읽어 보세요. 글자와 쉬운 이름을 함께 기억한 뒤 최근 경험을 하나 붙이면, 다른 사람에게도 내 성향을 짧고 정확하게 설명하기 좋아요.`,
    `예상과 다른 일이 생긴 장면에서는 다섯 글자의 순서가 더 잘 보여요. 누가 함께 있었는지, 무엇을 먼저 알아차렸는지, 관계에서 무엇이 신경 쓰였는지, 어떤 방식으로 일을 이어갔는지, 걱정과 감정은 언제 커졌는지를 차례로 되짚어 보세요.`,
    `누군가 고민을 말했을 때 머릿속에 먼저 떠오른 말과 입 밖으로 실제 건넨 말을 적어 보세요. 둘 사이가 달랐다면 상대의 마음, 관계, 책임, 시간 가운데 무엇을 고려해 반응을 바꾸었는지도 함께 살펴보세요. 그 차이가 ${profile.code}의 조절 방식을 보여줘요.`,
    `주말 계획이 갑자기 바뀌었거나 해야 할 일이 예상보다 늘어난 하루를 떠올려 보세요. 계획을 그대로 이어갔는지, 다른 방법으로 바꿨는지보다 왜 그렇게 움직였고 무엇이 다시 시작하게 했는지를 살피는 것이 평소 성향을 이해하는 데 더 도움이 돼요.`,
    `가족이 힘든 일을 말한 장면에서는 곧바로 도왔는지보다 먼저 무엇이 떠올랐는지를 보세요. 그 뒤 실제로는 들어주기, 질문하기, 해결 방법 찾기, 역할 나누기 중 무엇을 했는지 확인하면 가족 안에서 ${profile.code}가 쓰이는 순서를 구체적으로 알 수 있어요.`,
    `친구의 답장이 평소보다 늦거나 약속이 바뀐 장면을 떠올려 보세요. 혼자 어떤 뜻을 붙였는지, 친구에게 무엇을 확인했는지, 관계를 이어가기 위해 어떤 행동을 했는지를 나누어 보면 친밀함과 불확실성이 ${profile.code}에 미치는 영향이 보여요.`,
    `연인과 의견이 달랐던 장면에서는 누가 먼저 대화를 열었는지, 서로의 마음과 문제 해결 중 무엇을 먼저 다뤘는지, 대화를 멈췄다면 언제 다시 시작했는지를 살펴보세요. 이 흐름은 둘이 더 편안하게 갈등을 푸는 방법을 찾는 데 도움이 돼요.`,
    `호감 상대의 짧은 말이나 행동 하나만으로 관계를 정하기보다, 직접 들은 뜻과 반복해서 보인 행동을 함께 보세요. ${profile.code}가 잘 쓰일 때는 자신의 호기심과 마음을 표현하면서도 상대의 속도와 선택을 존중하는 행동으로 이어져요.`,
    `회의나 공동 과제에서 의견이 엇갈렸던 장면을 골라 보세요. 어떤 정보와 사람에게 먼저 주의를 기울였는지, 결정을 내릴 때 사용한 기준은 무엇인지, 결정 뒤 어떻게 마무리했는지를 확인하면 ${profile.code}의 협업 강점과 보완할 지점이 보여요.`,
    `부담스러운 일이 끝난 직후 괜찮다고 느꼈더라도 그날 밤과 다음 날의 몸과 마음을 다시 살펴보세요. 생각이 반복되는지, 어깨와 턱에 힘이 남았는지, 사람을 만날 에너지가 있는지 확인하면 문제 대응과 실제 회복을 구분할 수 있어요.`,
    `내 방식이 특히 잘 통했던 장면에서 상대·시간·정보·도움·에너지 조건을 적어 보세요. 반대로 힘들었던 장면에서도 같은 항목을 적으면, 성향 자체를 고치려 하기보다 ${profile.code}의 강점이 편안하게 쓰이는 조건을 다시 만들 수 있어요.`,
    `상대가 내 행동을 다르게 받아들였던 장면에서는 변명보다 빠진 정보를 찾아보세요. 내가 중요하게 본 것, 상대가 실제로 본 행동, 서로 다르게 이해한 말, 다음에 바꿀 표현을 한 줄씩 적으면 오해를 반복하지 않는 구체적인 대화 방법이 생겨요.`,
    `신뢰할 만한 결과는 문항 수만 많다고 생기지 않아요. 같은 경향을 서로 다른 장면에서 반복해 묻고, 한쪽 답을 유도하는 표현과 모호한 문장을 점검하며, 결과 설명이 실제로 측정한 내용과 연결되는지를 계속 확인해야 해요. 뉴앙은 이 과정을 문항과 콘텐츠 버전에 함께 기록해요.`,
  ] as const;

  return paragraphs[index];
}

function buildPracticalReadingParagraph(
  index: number,
  profile: CandidateProfile,
) {
  const [energy, relationship, emotion] = profile.overview.map(
    (item) => item.text,
  );
  const paragraphs = [
    `${profile.code}의 핵심 모습을 확인하려면 최근 6개월 동안 반복된 장면을 떠올려 보세요. ${energy} ${relationship} 한 번의 인상보다 여러 사람과 여러 장소에서 되풀이된 생각과 행동을 함께 보면 이 성향의 중심이 더 선명해져요.`,
    `역할 이름 ‘${profile.displayName}’에는 ${profile.code}의 반복되는 모습이 담겨 있어요. 잘했던 순간뿐 아니라 힘들었던 순간에도 어떤 가치를 먼저 지켰는지 살펴보면, 이 이름이 실제 생활 방식과 어떻게 이어지는지 이해하기 쉬워요.`,
    `${profile.code}의 다섯 글자는 ${profile.codeTypeNames.join("·")}을 뜻해요. 각 글자는 능력이나 사람의 좋고 나쁨을 평가하지 않아요. 같은 장면에서 무엇이 먼저 눈에 들어왔고 어떤 생각과 행동이 반복됐는지를 비교해 현재 더 가까운 방향을 보여줘요.`,
    `다섯 방향은 따로 움직이지 않아요. ${energy} 이어서 ${relationship} ${emotion} 이런 순서가 대화와 선택에서 어떻게 이어지는지 살피면, 한 글자 설명만 읽을 때보다 ${profile.code}의 실제 모습을 더 구체적으로 이해할 수 있어요.`,
    `처음 드는 생각은 자동으로 떠오른 관심과 해석이고, 실제 나타나는 반응은 관계·목표·규칙·현재 상태를 고려한 행동이에요. 최근 장면에서 ‘먼저 떠오른 생각, 실제로 한 말과 행동, 그렇게 조절한 이유, 뒤에 남은 감정’을 나누어 적으면 두 층을 쉽게 구분할 수 있어요.`,
    `평소 모습을 확인할 때는 혼자 선택한 일과 다른 사람과 약속한 일을 하나씩 비교해 보세요. 시작한 계기, 방법을 바꾼 이유, 끝까지 이어간 조건, 일이 끝난 뒤의 기분을 살피면 ${profile.code}가 일상의 흐름을 만드는 방식이 구체적으로 보여요.`,
    `가족 관계에서는 성향뿐 아니라 오래 맡아 온 역할과 가족의 기대도 행동에 영향을 줘요. 최근 가족과 있었던 평범한 일과 갈등 장면을 하나씩 떠올리고, 먼저 살핀 것·실제로 한 행동·가족이 받아들인 뜻을 비교하면 ${profile.code}의 가족 모습을 더 정확히 이해할 수 있어요.`,
    `친구 관계에서는 처음 친해질 때와 가까워진 뒤의 모습을 나누어 보세요. 대화를 시작하는 방식, 고민을 들었을 때의 첫 반응, 연락 간격, 약속을 이어가는 방법을 살피면 ${profile.code}가 우정을 만들고 지키는 데 쓰는 강점이 잘 보여요.`,
    `연인 관계에서는 애정 표현과 갈등 해결을 따로 살펴보는 것이 좋아요. 편안할 때 마음을 전하는 방식, 서운할 때 필요한 시간과 설명, 다시 가까워지기 위해 하는 행동을 비교하면 ${profile.code}가 사랑과 신뢰를 쌓는 흐름을 이해하기 쉬워요.`,
    `마음에 드는 사람을 알아갈 때는 관찰한 사실과 혼자 붙인 의미를 나누어 보세요. 상대가 직접 한 말, 반복해서 보인 행동, 내가 기대하거나 걱정한 해석, 그 뒤에 선택한 행동을 구분하면 호감이 커진 순간에도 ${profile.code}의 장점을 편안하게 활용할 수 있어요.`,
    `일과 공부에서는 과제의 종류와 함께 일하는 사람에 따라 강점의 쓰임이 달라져요. 새 일을 시작할 때, 의견을 나눌 때, 마감이 다가올 때, 피드백을 받은 뒤에 각각 무엇을 먼저 보고 어떻게 움직였는지 비교하면 나에게 잘 맞는 환경과 도움이 필요한 지점을 찾기 쉬워요.`,
    `부담이 커질 때는 문제를 해결한 시점과 마음과 몸이 회복된 시점이 같지 않을 수 있어요. ${emotion} 사건 직후·몇 시간 뒤·다음 날의 걱정, 몸의 긴장, 사람을 만날 에너지를 차례로 확인하면 나에게 실제로 도움이 되는 회복 방법을 찾을 수 있어요.`,
    `강점은 크다고 언제나 좋은 결과를 만드는 것이 아니라 알맞은 순간에 알맞은 크기로 쓸 때 가장 편안해요. ${profile.code}의 방식이 잘 통했던 장면과 지쳤던 장면을 하나씩 비교하고, 멈출 신호·도움을 요청할 때·상대에게 확인할 말을 정하면 원래의 장점을 오래 유지할 수 있어요.`,
    `오해를 줄이려면 코드 이름으로 자신을 설명하기보다 실제 장면을 짧게 말해 보세요. ‘내가 먼저 본 것은 이것이었고, 이런 마음이 들어서 이렇게 행동했어. 다음에는 이렇게 해보고 싶어’처럼 관찰·마음·행동·바람을 나누면 ${profile.code}의 의도가 더 정확하게 전달돼요.`,
    `뉴앙은 한두 문장으로 사람을 정하지 않고 여러 생활 장면에서 반복된 응답을 종합해요. 문항, 채점 기준, 코드 이름, 성향 안내를 같은 버전으로 관리하고, 넓은 성향과 세부 모습, 처음 든 생각과 실제 행동을 나누어 해석해 결과가 무엇을 뜻하는지 추적할 수 있게 만들어요.`,
  ] as const;

  return paragraphs[index];
}

function buildSections(
  paragraphs: string[],
  sourceLabel: string,
  sectionTitles: string[],
) {
  if (paragraphs.length < 4) {
    throw new Error(
      `${sourceLabel} needs at least 4 customer-facing paragraphs (received ${paragraphs.length})`,
    );
  }

  const sectionCount = Math.min(
    8,
    sectionTitles.length,
    Math.floor(paragraphs.length / 2),
    Math.max(2, Math.ceil(paragraphs.length / 2)),
  );
  const sections: Array<{ paragraphs: string[]; title: string }> = [];
  let cursor = 0;

  for (let sectionIndex = 0; sectionIndex < sectionCount; sectionIndex += 1) {
    const remainingParagraphs = paragraphs.length - cursor;
    const remainingSections = sectionCount - sectionIndex;
    const take = Math.min(
      5,
      Math.max(2, Math.ceil(remainingParagraphs / remainingSections)),
    );
    sections.push({
      paragraphs: paragraphs.slice(cursor, cursor + take),
      title: sectionTitles[sectionIndex],
    });
    cursor += take;
  }

  if (cursor < paragraphs.length) {
    for (const paragraph of paragraphs.slice(cursor)) {
      const last = sections.at(-1);
      if (!last) break;
      const lastIndex = last.paragraphs.length - 1;
      const merged = `${last.paragraphs[lastIndex]} ${paragraph}`;
      if (merged.length > 900) {
        throw new Error("Customer guide chapter contains too much copy");
      }
      last.paragraphs[lastIndex] = merged;
    }
  }

  return sections;
}

function normalizeParagraphs(sourceParagraphs: string[]) {
  const paragraphs: string[] = [];

  for (const sourceParagraph of sourceParagraphs) {
    const paragraph = toCustomerCopy(sourceParagraph)
      .replace(/\s+/g, " ")
      .trim();
    if (!paragraph) continue;
    if (paragraph.length >= 40) {
      paragraphs.push(paragraph);
      continue;
    }

    const previousIndex = paragraphs.length - 1;
    if (
      previousIndex >= 0 &&
      `${paragraphs[previousIndex]} ${paragraph}`.length <= 900
    ) {
      paragraphs[previousIndex] = `${paragraphs[previousIndex]} ${paragraph}`;
    }
  }

  while (paragraphs.length < 4) {
    const longestIndex = paragraphs.reduce(
      (selected, paragraph, index, all) =>
        paragraph.length > all[selected].length ? index : selected,
      0,
    );
    const split = splitParagraph(paragraphs[longestIndex]);
    if (!split) break;
    paragraphs.splice(longestIndex, 1, ...split);
  }

  return paragraphs;
}

function splitParagraph(paragraph: string): [string, string] | null {
  const sentences = paragraph.match(/[^.!?]+[.!?]?/g)?.map((item) => item.trim());
  if (!sentences || sentences.length < 2) return null;

  const midpoint = paragraph.length / 2;
  let first = "";
  let splitIndex = 0;
  for (let index = 0; index < sentences.length - 1; index += 1) {
    const candidate = `${first} ${sentences[index]}`.trim();
    first = candidate;
    splitIndex = index + 1;
    if (candidate.length >= midpoint) break;
  }
  const second = sentences.slice(splitIndex).join(" ").trim();

  return first.length >= 40 && second.length >= 40 ? [first, second] : null;
}

function summarize(copy: string, maximum = 230) {
  const normalized = toCustomerCopy(copy).replace(/\s+/g, " ").trim();
  if (normalized.length <= maximum) return normalized;

  const sentences = normalized.match(/[^.!?]+[.!?]?/g) ?? [normalized];
  let summary = "";
  for (const sentence of sentences) {
    if (`${summary} ${sentence}`.trim().length > maximum - 1) break;
    summary = `${summary} ${sentence}`.trim();
  }

  if (summary.length >= 30) return summary;
  return `${normalized.slice(0, maximum - 1).trim()}…`;
}

function toCustomerCopy(copy: string) {
  const plainCopy = copy
    .trim()
    .replaceAll("이 데이터센터", "이 성향지도")
    .replaceAll("데이터센터", "성향 안내")
    .replaceAll("연구 단계의 내부 원장", "뉴앙의 성향 안내")
    .replaceAll("연구 단계의 내부 기준 문서", "뉴앙의 성향 안내")
    .replaceAll("내부 기준 문서", "성향 안내 기준")
    .replaceAll("내부 연구", "성향 연구")
    .replaceAll("내부 검토", "전문 검토")
    .replaceAll("인지 인터뷰", "사용자 이해도 확인")
    .replaceAll("publicationState", "공개 상태")
    .replaceAll("research_only", "연구 자료")
    .replaceAll("검증되지", "확인이 더 필요한")
    .replaceAll("그날의 상황에 따라", "그날의 상황에 맞춰")
    .replaceAll("상황에 따라 다르", "같은 장면에서도 다르게 나타나")
    .replaceAll("상황에 따라", "지금 상황을 살펴")
    .replaceAll("단정할 수", "하나로 정할 수")
    .replaceAll("알 수 없", "직접 확인해야 하")
    .replaceAll("보장하지", "그대로 뜻하지")
    .replaceAll("달라질 수", "달라지기도 하")
    .replaceAll("다를 수", "달라지기도 하")
    .replaceAll("아닐 수도", "다르게 나타나기도")
    .replaceAll("무조건 그런", "항상 같은")
    .replaceAll("확정할 수", "하나로 결론내릴 수")
    .replaceAll("현재 조건", "지금 상황")
    .replaceAll("주어진 조건", "지금 놓인 상황")
    .replaceAll("후속 대화", "그다음 대화")
    .replaceAll("후속 연락", "그다음 연락")
    .replaceAll("초기 반응", "처음 느끼는 반응")
    .replaceAll("행동 채널", "실제 행동")
    .replaceAll("관찰한 사실", "직접 보고 들은 내용")
    .replaceAll("맥락", "상황")
    .replaceAll("가설", "가능한 설명")
    .replaceAll("이 자원을", "이 여유를")
    .replaceAll("자원을", "시간과 도움을")
    .replaceAll("자원이", "시간과 도움이")
    .replaceAll("자원으로", "시간과 도움으로")
    .replaceAll("자원에", "시간과 도움에")
    .replaceAll("자원", "쓸 수 있는 시간과 도움")
    .replaceAll("조절 과정", "생각을 행동으로 다듬는 과정")
    .replaceAll("변인", "영향을 주는 조건")
    .replaceAll("재현성", "비슷한 결과가 다시 나오는지")
    .replaceAll("구분력", "성향 차이를 잘 가려내는지")
    .replaceAll("이들이", "이 성향이")
    .replaceAll("해결 주의", "해결에 먼저 관심을 두는 모습")
    .replaceAll("주의가", "관심이")
    .replaceAll("주의를", "관심을")
    .replaceAll("주의와", "관심과")
    .replaceAll("달라지기도 하 있다", "달라지기도 해요")
    .replaceAll("직접 확인해야 하 있다", "직접 확인해야 해요")
    .replaceAll("누구와 있을 때 달라지는가:", "이 모습은")
    .replaceAll("왜 이런 흐름이 생기는가:", "이런 흐름은")
    .replaceAll("언제 선명해지는가:", "이 모습은")
    .replaceAll("어디에서 잘 드러나는가:", "이 모습은")
    .replace(/\b([RNM])가(?=\s|[,.)])/g, "$1이")
    .replace(/\b([RNM])는(?=\s|[,.)])/g, "$1은")
    .replace(/\b([RNM])와(?=\s|[,.)])/g, "$1과")
    .replace(/\b([EIAGKCQ])이(?=\s|[,.)])/g, "$1가")
    .replace(/\b([EIAGKCQ])은(?=\s|[,.)])/g, "$1는")
    .replace(/\b([EIAGKCQ])과(?=\s|[,.)])/g, "$1와");

  const endingReplacements = [
    ["하는 것이다.", "하는 거예요."],
    ["할 수 있다.", "할 수 있어요."],
    ["수 있다.", "수 있어요."],
    ["해야 한다.", "해야 해요."],
    ["것이다.", "것이에요."],
    ["때문이다.", "때문이에요."],
    ["아니다.", "아니에요."],
    ["방향이다.", "방향이에요."],
    ["편이다.", "편이에요."],
    ["방식이다.", "방식이에요."],
    ["출발점이다.", "출발점이에요."],
    ["조건이다.", "조건이에요."],
    ["이름이다.", "이름이에요."],
    ["말이다.", "말이에요."],
    ["관계다.", "관계예요."],
    ["위해서다.", "위해서예요."],
    ["태도다.", "태도예요."],
    ["표지다.", "표지예요."],
    ["여지다.", "여지예요."],
    ["대비다.", "대비예요."],
    ["변화다.", "변화예요."],
    ["문제다.", "문제예요."],
    ["단계다.", "단계예요."],
    ["속도다.", "속도예요."],
    ["곳이다.", "곳이에요."],
    ["힘이다.", "힘이에요."],
    ["데이터다.", "자료예요."],
    ["정보다.", "정보예요."],
    ["안전이다.", "안전이에요."],
    ["자원이다.", "쓸 수 있는 시간과 도움이에요."],
    ["이다.", "이에요."],
    ["있다.", "있어요."],
    ["없다.", "없어요."],
    ["있지 않다.", "있지 않아요."],
    ["않는다.", "않아요."],
    ["확인한다.", "확인해요."],
    ["살핀다.", "살펴봐요."],
    ["정한다.", "정해요."],
    ["말한다.", "말해요."],
    ["찾는다.", "찾아요."],
    ["만든다.", "만들어요."],
    ["기록한다.", "기록해요."],
    ["바꾼다.", "바꿔요."],
    ["나눈다.", "나눠요."],
    ["이어간다.", "이어가요."],
    ["묻는다.", "물어요."],
    ["사용한다.", "사용해요."],
    ["비교한다.", "비교해요."],
    ["남긴다.", "남겨요."],
    ["고른다.", "골라요."],
    ["제안한다.", "제안해요."],
    ["정리한다.", "정리해요."],
    ["알려준다.", "알려줘요."],
    ["떠올린다.", "떠올려요."],
    ["공유한다.", "공유해요."],
    ["연결한다.", "연결해요."],
    ["시작한다.", "시작해요."],
    ["생각한다.", "생각해요."],
    ["움직인다.", "움직여요."],
    ["보여준다.", "보여줘요."],
    ["듣는다.", "들어요."],
    ["조정한다.", "조정해요."],
    ["구분한다.", "구분해요."],
    ["표현한다.", "표현해요."],
    ["시험한다.", "시험해요."],
    ["포함한다.", "포함해요."],
    ["넓힌다.", "넓혀요."],
    ["분리한다.", "나누어 봐요."],
    ["설명한다.", "설명해요."],
    ["유지한다.", "이어가요."],
    ["알아차린다.", "알아차려요."],
    ["지킨다.", "지켜요."],
    ["약속한다.", "약속해요."],
    ["참여한다.", "참여해요."],
    ["돕는다.", "도와요."],
    ["모은다.", "모아요."],
    ["줄인다.", "줄여요."],
    ["펼친다.", "펼쳐요."],
    ["질문한다.", "질문해요."],
    ["제공한다.", "제공해요."],
    ["살린다.", "살려요."],
    ["옮긴다.", "옮겨요."],
    ["적는다.", "적어요."],
    ["뜻한다.", "뜻해요."],
    ["이해한다.", "이해해요."],
    ["반응한다.", "반응해요."],
    ["맞춘다.", "맞춰요."],
    ["묶는다.", "묶어요."],
    ["쌓는다.", "쌓아요."],
    ["알린다.", "알려요."],
    ["삼는다.", "삼아요."],
    ["잇는다.", "이어요."],
    ["맡는다.", "맡아요."],
    ["든다.", "들어요."],
    ["거친다.", "거쳐요."],
    ["익힌다.", "익혀요."],
    ["높인다.", "높여요."],
    ["꺼낸다.", "꺼내요."],
    ["드러낸다.", "드러내요."],
    ["세운다.", "세워요."],
    ["내려놓는다.", "내려놓아요."],
    ["자란다.", "자라요."],
    ["고친다.", "고쳐요."],
    ["건넨다.", "건네요."],
    ["막는다.", "막아요."],
    ["짠다.", "짜요."],
    ["다룬다.", "다뤄요."],
    ["붙는다.", "붙어요."],
    ["굳힌다.", "굳혀요."],
    ["여긴다.", "여겨요."],
    ["힘들었겠다.", "힘들었겠어요."],
    ["나온다.", "나와요."],
    ["연다.", "열어요."],
    ["미룬다.", "미뤄요."],
    ["남는다.", "남아요."],
    ["받는다.", "받아요."],
    ["들어온다.", "들어와요."],
    ["잡는다.", "잡아요."],
    ["덧붙인다.", "덧붙여요."],
    ["쓴다.", "써요."],
    ["올라온다.", "올라와요."],
    ["돌아온다.", "돌아와요."],
    ["선명해진다.", "선명해져요."],
    ["편안해진다.", "편안해져요."],
    ["정해진다.", "정해져요."],
    ["낮아진다.", "낮아져요."],
    ["깊어진다.", "깊어져요."],
    ["발전시킨다.", "발전시켜요."],
    ["키운다.", "키워요."],
    ["좁힌다.", "좁혀요."],
    ["높아진다.", "높아져요."],
    ["궁금해진다.", "궁금해져요."],
    ["빨라진다.", "빨라져요."],
    ["늦어진다.", "늦어져요."],
    ["안전해진다.", "안전해져요."],
    ["느껴진다.", "느껴져요."],
    ["수월해진다.", "수월해져요."],
    ["가까워진다.", "가까워져요."],
    ["완전해진다.", "온전히 이어져요."],
    ["강해진다.", "강해져요."],
    ["늘어난다.", "늘어나요."],
    ["유용해진다.", "유용해져요."],
    ["가능해진다.", "가능해져요."],
    ["판단한다.", "판단해요."],
    ["선택한다.", "선택해요."],
    ["대응한다.", "대응해요."],
    ["반복한다.", "반복해요."],
    ["받아들인다.", "받아들여요."],
    ["본다.", "봐요."],
    ["준다.", "줘요."],
    ["둔다.", "둬요."],
    ["간다.", "가요."],
    ["느낀다.", "느껴요."],
    ["된다.", "돼요."],
    ["보인다.", "보여요."],
    ["드러난다.", "드러나요."],
    ["이어진다.", "이어져요."],
    ["나타난다.", "나타나요."],
    ["떠오른다.", "떠올라요."],
    ["바뀐다.", "바뀌어요."],
    ["생긴다.", "생겨요."],
    ["커진다.", "커져요."],
    ["쌓인다.", "쌓여요."],
    ["쓰인다.", "쓰여요."],
    ["쉬워진다.", "쉬워져요."],
    ["줄어든다.", "줄어들어요."],
    ["유지된다.", "이어져요."],
    ["분명해진다.", "분명해져요."],
    ["만들어진다.", "만들어져요."],
    ["전달된다.", "전달돼요."],
    ["살아난다.", "살아나요."],
    ["안정된다.", "안정돼요."],
    ["좋다.", "좋아요."],
    ["쉽다.", "쉬워요."],
    ["어렵다.", "어려워요."],
    ["많다.", "많아요."],
    ["가깝다.", "가까워요."],
    ["중요하다.", "중요해요."],
    ["필요하다.", "필요해요."],
    ["안전하다.", "안전해요."],
    ["유리하다.", "유리해요."],
    ["여유다.", "여유예요."],
    ["편하다.", "편해요."],
    ["정확하다.", "정확해요."],
    ["맞는다.", "잘 맞아요."],
    ["준비다.", "준비예요."],
    ["자연스럽다.", "자연스러워요."],
    ["다르다.", "달라요."],
    ["같지 않다.", "같지 않아요."],
    ["같다.", "같아요."],
    ["한다.", "해요."],
  ] as const;

  return endingReplacements.reduce(
    (result, [source, replacement]) =>
      result.replaceAll(source, replacement),
    plainCopy,
  );
}
