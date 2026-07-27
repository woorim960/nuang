import { getCandidateProfileDefinition } from "@/features/nuang-code/candidate-profile-names";
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

const sectionTitleCandidates = [
  "먼저 나타나는 모습",
  "생각이 이어지는 방식",
  "실제로 보이는 행동",
  "관계에서 드러나는 모습",
  "편안할 때의 강점",
  "부담이 커질 때",
  "더 잘 활용하는 방법",
  "함께 기억하면 좋은 점",
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

  const chapters: TraitMapCustomerGuideChapter[] = selectedSourceChapters.map(
    (source, index) => {
      const paragraphs = normalizeParagraphs(
        [
          ...source.body,
          buildPracticalReadingParagraph(index, profile),
          buildEverydayExampleParagraph(index, profile),
        ].map(toCustomerCopy),
      );
      const chapter: TraitMapCustomerGuideChapter = {
        checkQuestion: chapterQuestions[index],
        id: `chapter-${String(index + 1).padStart(2, "0")}`,
        label: chapterLabels[index],
        number: index + 1,
        sections: buildSections(
          paragraphs,
          `${normalizedCode}:${source.chapterId}`,
        ),
        slot: traitMapCustomerGuideChapterSlots[index],
        summary: summarize(paragraphs[0] ?? source.title),
        title: toCustomerTitle(source.title, normalizedCode),
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
      chapters[0].sections.flatMap((section) => section.paragraphs).join(" "),
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

function buildEverydayExampleParagraph(
  index: number,
  profile: NonNullable<ReturnType<typeof getCandidateProfileDefinition>>,
) {
  const paragraphs = [
    `예를 들어 갑자기 새로운 모임이나 공동 과제가 생긴 장면을 떠올려 보세요. ${profile.code}는 ${profile.summary} 이때 가장 먼저 눈에 들어온 것과 실제로 꺼낸 첫 행동을 나란히 보면 ‘${profile.shortName}’의 핵심 흐름을 생활 속 경험과 연결할 수 있어요.`,
    `역할 이름이 잘 맞는지는 멋있게 들리는지보다 실제로 반복됐는지로 확인해요. 가까운 사람에게 내가 자주 맡는 역할을 물어보고, 그 답이 ${profile.shortName}의 설명과 어느 장면에서 이어지는지 이야기하면 혼자 읽을 때 놓친 모습도 발견할 수 있어요.`,
    `코드를 외울 때는 ${profile.code.split("").map((symbol, position) => `${symbol}는 ${profile.codeTypeNames[position]}`).join(", ")}이라고 읽어 보세요. 글자와 쉬운 이름을 함께 기억한 뒤 최근 경험을 하나 붙이면, 다른 사람에게도 내 성향을 짧고 정확하게 설명하기 좋아요.`,
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
  profile: NonNullable<ReturnType<typeof getCandidateProfileDefinition>>,
) {
  const [energy, relationship, emotion] = profile.overview.map(
    (item) => item.text,
  );
  const paragraphs = [
    `${profile.code}의 핵심 모습을 확인하려면 최근 6개월 동안 반복된 장면을 떠올려 보세요. ${energy} ${relationship} 한 번의 인상보다 여러 사람과 여러 장소에서 되풀이된 생각과 행동을 함께 보면 이 성향의 중심이 더 선명해져요.`,
    `‘${profile.displayName}’이라는 이름은 ${profile.code}의 반복되는 역할을 쉽게 기억하도록 만든 표현이에요. 잘했던 순간뿐 아니라 힘들었던 순간에도 어떤 가치를 먼저 지켰는지 살펴보면, 이름이 단순한 별명이 아니라 실제 생활 방식과 어떻게 이어지는지 이해하기 쉬워요.`,
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

function buildSections(paragraphs: string[], sourceLabel: string) {
  if (paragraphs.length < 4) {
    throw new Error(
      `${sourceLabel} needs at least 4 customer-facing paragraphs (received ${paragraphs.length})`,
    );
  }

  const sectionCount = Math.min(8, Math.max(2, Math.ceil(paragraphs.length / 5)));
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
      title: sectionTitleCandidates[sectionIndex],
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
    const paragraph = sourceParagraph.replace(/\s+/g, " ").trim();
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

function toCustomerTitle(title: string, code: string) {
  const cleaned = toCustomerCopy(title)
    .replace(/^한눈에 보는\s+/, "")
    .replace(/^어떻게 만들고 확인하는가$/, "뉴앙이 성향을 해석하는 근거");
  const withCode = cleaned.includes(code) ? cleaned : `${code}의 ${cleaned}`;
  return withCode.length <= 100 ? withCode : withCode.slice(0, 100);
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
  return copy
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
    .replaceAll("상황에 따라", "주어진 조건에 맞춰")
    .replaceAll("단정할 수", "하나로 정할 수")
    .replaceAll("알 수 없", "직접 확인해야 하")
    .replaceAll("보장하지", "그대로 뜻하지")
    .replaceAll("달라질 수", "달라지기도 하")
    .replaceAll("다를 수", "달라지기도 하")
    .replaceAll("아닐 수도", "다르게 나타나기도")
    .replaceAll("무조건 그런", "항상 같은")
    .replaceAll("확정할 수", "하나로 결론내릴 수");
}
