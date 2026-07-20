import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const sourceFiles = [1, 2, 3, 4, 5].map((part) =>
  path.join(
    root,
    "docs",
    "trait-maps",
    "ENAKQ",
    `ENAKQ_MAP_DRAFT_PART${part}_V0_1.md`,
  ),
);
const outputFile = path.join(
  root,
  "src",
  "features",
  "nuang-code",
  "fixtures",
  "enakq-longform-guide.generated.json",
);
const checkOnly = process.argv.includes("--check");

const chapterMeta = {
  1: {
    label: "처음 보기",
    title: "ENAKQ를 처음부터 천천히 알아봐요",
    summary:
      "다섯 글자가 알려주는 모습과 알려주지 않는 것을 먼저 구분해요. 같은 ENAKQ라도 사람과 상황에 따라 모습이 달라질 수 있어요.",
    checkQuestion:
      "설명 가운데 한두 번이 아니라 여러 상황에서 되풀이된 모습은 무엇인가요?",
  },
  2: {
    label: "이름 뜻",
    title: "‘관계를 여는 지휘자’는 이런 뜻이에요",
    summary:
      "사람을 지시하는 직책이 아니라, 대화를 열고 여러 생각을 다음 행동으로 이어가는 모습을 기억하기 쉽게 붙인 이름이에요.",
    checkQuestion:
      "‘관계를 여는’ 모습과 ‘다음 행동을 이어가는’ 모습 중 나에게 더 익숙한 것은 무엇인가요?",
  },
  3: {
    label: "다섯 글자",
    title: "E·N·A·K·Q를 한 글자씩 자세히 봐요",
    summary:
      "각 글자는 서로 다른 질문에 답해요. 에너지, 관심, 관계에서 먼저 보는 것, 일상을 이어가는 방식, 걱정과 감정이 커지는 속도를 나누어 살펴봐요.",
    checkQuestion:
      "다섯 글자 중 가장 또렷하게 맞는 글자와 상황에 따라 달라지는 글자는 무엇인가요?",
  },
  4: {
    label: "함께 볼 때",
    title: "다섯 모습이 한 장면에서 만날 때",
    summary:
      "한 글자씩 볼 때와 여러 글자가 함께 나타날 때는 느낌이 달라질 수 있어요. 아직 확인이 더 필요한 해석은 가능성으로만 읽어요.",
    checkQuestion:
      "여러 가능성을 떠올린 뒤 실제 다음 행동까지 이어졌던 최근 장면이 있나요?",
  },
  5: {
    label: "생각과 반응",
    title: "처음 드는 생각과 실제 나타나는 반응",
    summary:
      "처음 눈에 들어온 것과 실제로 말하거나 행동한 것은 다를 수 있어요. 둘 중 하나만 진짜 모습인 것은 아니에요.",
    checkQuestion:
      "가까운 사람이 고민을 말했을 때 처음 궁금했던 것과 실제로 먼저 한 말은 무엇이었나요?",
  },
  6: {
    label: "평소 생활",
    title: "대화하고, 고르고, 쉬는 평소 모습",
    summary:
      "대화, 결정, 일정 변화, 휴식처럼 자주 마주치는 생활 장면에서 ENAKQ가 어떻게 보일 수 있는지 살펴봐요.",
    checkQuestion:
      "요즘 일상에서 편하게 이어지는 일과 유난히 힘이 많이 드는 일은 무엇인가요?",
  },
  7: {
    label: "가족",
    title: "가족과 함께 있을 때",
    summary:
      "가족 안의 오래된 역할과 책임은 평소 성향보다 더 크게 행동을 바꿀 수 있어요. 관심, 연락, 역할, 갈등을 나누어 봐요.",
    checkQuestion:
      "가족 안에서 내가 자연스럽게 맡아 온 역할은 무엇이고, 지금도 그 역할이 편한가요?",
  },
  8: {
    label: "친구",
    title: "친구와 가까워지고 관계를 이어갈 때",
    summary:
      "먼저 연락하는 일, 새로운 약속을 제안하는 일, 고민을 들어주는 일, 서운함을 푸는 일을 구체적인 장면으로 살펴봐요.",
    checkQuestion:
      "친구 관계에서 내가 자주 시작하는 일과 친구에게 먼저 해주길 바라는 일은 무엇인가요?",
  },
  9: {
    label: "연인",
    title: "연인과 마음을 나눌 때",
    summary:
      "연락과 표현, 함께 세우는 계획, 불확실한 순간, 다툰 뒤의 대화를 살펴봐요. 코드만으로 사랑의 크기나 관계의 미래를 정하지 않아요.",
    checkQuestion:
      "연인에게 마음을 나눌 때 들어주기, 확인하기, 함께 해결하기 중 무엇을 먼저 바라는 편인가요?",
  },
  10: {
    label: "마음 가는 사람",
    title: "마음 가는 사람을 알아갈 때",
    summary:
      "호감이 생기면 작은 행동에도 여러 뜻이 떠오를 수 있어요. 직접 본 사실과 내가 떠올린 설명, 아직 묻지 않은 것을 나누어 봐요.",
    checkQuestion:
      "그 사람에게서 직접 확인한 사실과 아직 내가 짐작하고 있는 부분은 각각 무엇인가요?",
  },
  11: {
    label: "일·공부",
    title: "일하고 공부할 때",
    summary:
      "말을 꺼내고, 새 방법을 찾고, 함께 일하고, 끝까지 이어가는 모습을 살펴봐요. 성향 글자가 능력이나 성과를 보장하지는 않아요.",
    checkQuestion:
      "일이나 공부에서 새 생각을 넓힐 때와 하나를 정해 끝낼 때 중 어느 순간이 더 편한가요?",
  },
  12: {
    label: "부담과 회복",
    title: "부담이 커질 때와 다시 편안해질 때",
    summary:
      "무엇이 걱정을 키웠는지, 실제로 어떤 반응이 나왔는지, 어떤 도움이 편했는지를 따로 살펴봐요.",
    checkQuestion:
      "최근 부담이 컸던 순간에 실제로 도움이 된 것은 정보, 대화, 행동, 혼자 있는 시간 중 무엇이었나요?",
  },
  13: {
    label: "좋은 쓰임",
    title: "잘 드러날 수 있는 점과 지나칠 때",
    summary:
      "성향은 무조건 좋은 능력도, 고쳐야 할 단점도 아니에요. 상황에 맞게 쓰일 때의 도움과 지나쳤을 때의 부담을 함께 봐요.",
    checkQuestion:
      "나에게 도움이 되던 방식이 오히려 힘이 많이 드는 방식으로 바뀌는 순간은 언제인가요?",
  },
  14: {
    label: "오해와 대화",
    title: "자주 받는 오해와 편하게 말하는 법",
    summary:
      "E·N·A·K·Q가 흔히 어떤 말로 잘못 이해되는지 알아보고, 평가 대신 구체적으로 묻고 말하는 방법을 살펴봐요.",
    checkQuestion:
      "내가 자주 듣지만 실제 나와는 다르다고 느꼈던 성격 평가는 무엇인가요?",
  },
  15: {
    label: "근거와 한계",
    title: "무엇을 믿어도 되고, 아직 무엇을 모를까요?",
    summary:
      "뉴앙이 참고한 연구와 뉴앙이 직접 확인해야 하는 부분을 나누어 설명해요. 자세한 설명만큼 말할 수 없는 범위를 밝히는 일도 중요해요.",
    checkQuestion:
      "이 설명을 나를 가두는 답이 아니라 실제 경험을 살펴보는 질문으로 사용하고 있나요?",
  },
};

const chapters = [];

for (const sourceFile of sourceFiles) {
  const markdown = await readFile(sourceFile, "utf8");
  chapters.push(...parseMarkdown(markdown));
}

const guide = {
  code: "ENAKQ",
  generatedFrom: sourceFiles.map((file) => path.relative(root, file)),
  readingMinutes: 28,
  totalCharacters: chapters.reduce(
    (total, chapter) =>
      total +
      chapter.sections.reduce(
        (sectionTotal, section) =>
          sectionTotal + section.paragraphs.join("").replace(/\s/g, "").length,
        0,
      ),
    0,
  ),
  version: "ENAKQ-LONGFORM-GUIDE-1.0",
  chapters,
};

const serializedGuide = `${JSON.stringify(guide, null, 2)}\n`;

if (checkOnly) {
  const currentGuide = await readFile(outputFile, "utf8");
  if (currentGuide !== serializedGuide) {
    throw new Error(
      `${path.relative(root, outputFile)} is stale. Run npm run research:enakq:longform-guide.`,
    );
  }
  console.log(
    `Verified ${path.relative(root, outputFile)} (${guide.chapters.length} chapters, ${guide.totalCharacters} characters)`,
  );
} else {
  await writeFile(outputFile, serializedGuide);
  console.log(
    `Generated ${path.relative(root, outputFile)} (${guide.chapters.length} chapters, ${guide.totalCharacters} characters)`,
  );
}

function parseMarkdown(markdown) {
  const parsed = [];
  let chapter = null;
  let section = null;
  let paragraphLines = [];

  const flushParagraph = () => {
    if (!chapter || paragraphLines.length === 0) return;
    ensureSection();
    const paragraph = simplifyCopy(paragraphLines.join(" "));
    if (paragraph) section.paragraphs.push(paragraph);
    paragraphLines = [];
  };

  const flushSection = () => {
    flushParagraph();
    if (chapter && section && section.paragraphs.length > 0) {
      chapter.sections.push(section);
    }
    section = null;
  };

  const flushChapter = () => {
    flushSection();
    if (chapter) parsed.push(chapter);
    chapter = null;
  };

  const ensureSection = () => {
    if (!section) section = { title: null, paragraphs: [] };
  };

  for (const rawLine of markdown.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (line.startsWith("<!--")) {
      flushParagraph();
      continue;
    }

    const chapterMatch = line.match(/^##\s+(\d+)\.\s+(.+)$/);
    if (chapterMatch) {
      flushChapter();
      const number = Number(chapterMatch[1]);
      const meta = chapterMeta[number];
      if (!meta) throw new Error(`Missing chapter metadata for ${number}`);
      chapter = {
        id: `chapter-${String(number).padStart(2, "0")}`,
        number,
        label: meta.label,
        checkQuestion: meta.checkQuestion,
        title: meta.title,
        sourceTitle: simplifyCopy(chapterMatch[2]),
        summary: meta.summary,
        sections: [],
      };
      continue;
    }

    const sectionMatch = line.match(/^###\s+\d+\.\d+\s+(.+)$/);
    if (sectionMatch && chapter) {
      flushSection();
      section = {
        title: simplifyCopy(sectionMatch[1]),
        paragraphs: [],
      };
      continue;
    }

    if (!chapter) continue;
    if (!line) {
      flushParagraph();
      continue;
    }
    if (line.startsWith(">")) continue;
    paragraphLines.push(line);
  }

  flushChapter();
  return parsed;
}

function simplifyCopy(copy) {
  return copy
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\s{2,}/g, " ")
    .replaceAll(
      "개인 과정 자료",
      "같은 상황에서 생각과 행동을 따로 확인한 결과",
    )
    .replaceAll("과정 자료", "생각과 행동을 따로 확인한 결과")
    .replaceAll("개인 리포트", "내 상세 결과")
    .replaceAll("비교 리포트", "나와 비교하기")
    .replaceAll("가족 리포트", "가족 관계 안내")
    .replaceAll("대표 코드", "다섯 글자 코드")
    .replaceAll("대표 ENAKQ", "ENAKQ 다섯 글자")
    .replaceAll("공개 비교", "상대에게 공개되는 비교 화면")
    .replaceAll(
      "이 장에서 말하는 조합은 세 단계로 나눠 읽어요. 첫째, 각 글자가 따로 뜻하는 범위는 현재 뉴앙의 자리 정의예요. 둘째, 두세 글자가 같은 장면에서 함께 보일 수 있다는 설명은 조합 가설이에요. 셋째, 특정 사용자의 세부 점수와 반복 응답에서 그 조합이 확인되면 개인화 설명 후보가 돼요. 조합 가설만으로 모든 ENAKQ에게 같은 행동을 붙이지 않아요.",
      "여러 글자를 함께 볼 때에는 세 가지를 구분해요. 먼저 각 글자가 뜻하는 모습을 따로 확인해요. 그다음 두세 글자가 같은 상황에서 함께 보일 가능성을 살펴봐요. 마지막으로 내 세부 점수와 여러 답변에서도 같은 모습이 되풀이됐는지 확인해요. 글자만 이어 붙여 모든 ENAKQ가 똑같이 행동한다고 말하지 않아요.",
    )
    .replaceAll(
      "이는 아직 검증이 필요한 조합 가설이고 모든 ENAKQ에게 공통되지 않아요.",
      "여러 글자를 함께 봤을 때 떠올릴 수 있는 설명이지만, 아직 더 확인해야 하며 모든 ENAKQ에게 공통되지는 않아요.",
    )
    .replaceAll(
      "외부 연구가 넓은 구성개념과 경계를 지지하는지",
      "다른 연구에서 비슷한 성향과 해석 범위를 뒷받침하는지",
    )
    .replaceAll(
      "그다음에는 다섯 영역과 세부 성향의 구조, 반복 측정의 안정성, 관련된 구성개념과의 수렴, 다른 능력·상태와의 구분을 확인해야 해요.",
      "그다음에는 같은 사람이 다시 검사해도 비슷한 결과가 나오는지, 비슷한 성향을 살펴보는 다른 검사와 알맞게 이어지는지, 능력이나 그날의 기분과는 구분되는지 확인해야 해요.",
    )
    .replaceAll(
      "관계·업무·지원 문장은 별도의 준거가 필요해요.",
      "관계·일·도움에 관한 설명은 실제 행동과 경험 자료로 따로 확인해야 해요.",
    )
    .replaceAll(
      "인지 인터뷰",
      "사용자가 문장을 어떻게 이해하는지 확인하는 인터뷰",
    )
    .replaceAll("blind 비교", "코드 이름을 가리고 진행하는 비교")
    .replaceAll("claim별", "설명 문장별")
    .replaceAll("claim", "설명 문장")
    .replaceAll("리포트", "결과 안내")
    .replaceAll("필드", "정보 항목")
    .replaceAll("Agreeableness 전체", "빅파이브의 우호성 전체")
    .replaceAll("규준", "비교 기준")
    .replaceAll(
      "현재 검증되지 않은 가설이므로",
      "아직 확인이 끝난 설명이 아니므로",
    )
    .replaceAll("가설을 세울 수 있어요", "가능성을 생각해 볼 수 있어요")
    .replaceAll(
      "다섯 글자만으로 확정할 수 없는 결합 가설이에요",
      "다섯 글자만으로 확정할 수 없는 설명이에요",
    )
    .replaceAll("아직 통합 가설이에요", "아직 더 확인해야 하는 설명이에요")
    .replaceAll("핵심 가설이에요", "핵심 아이디어예요")
    .replaceAll("검증 전 가설이며", "아직 확인이 더 필요한 설명이며")
    .replaceAll(
      "N·A·Q 조합의 증분 효과는 아직 뉴앙 자료로 검증되지 않았어요",
      "N·A·Q 세 글자를 함께 봤을 때 새로운 설명이 더해지는지는 아직 실제 검사 자료로 충분히 확인되지 않았어요",
    )
    .replaceAll(
      "가설을 세울 수 있지만 아직 조합 효과가 검증되지 않았어요",
      "가능성을 생각해 볼 수 있지만 여러 글자를 함께 본 설명은 아직 충분히 확인되지 않았어요",
    )
    .replaceAll(
      "제품 가설이에요",
      "뉴앙이 다섯 글자를 기억하기 쉽게 만든 설명이에요",
    )
    .replaceAll(
      "마음속 활성화와 실제 나타나는 반응",
      "마음속에서 걱정과 감정이 커지는 것과 실제 나타나는 반응",
    )
    .replaceAll("걱정과 감정이 활성화되는 정도", "걱정과 감정이 커지는 정도")
    .replaceAll("감정이 활성화되는 정도", "감정이 커지는 정도")
    .replaceAll(
      "불편할 때의 활성화예요",
      "불편할 때 걱정과 감정이 커지는 정도예요",
    )
    .replaceAll("빠르게 활성화되어도", "빠르게 커져도")
    .replaceAll("활성화와 표현", "걱정과 감정이 커지는 것과 표현")
    .replaceAll(
      "반응이 활성화되는 상대적 경향",
      "걱정과 감정이 커지는 상대적인 경향",
    )
    .replaceAll("부담이 활성화되는지", "부담이 커지는지")
    .replaceAll(
      "빠른 활성화와 실제 표현",
      "걱정과 감정이 빠르게 커지는 것과 실제 표현",
    )
    .replaceAll(
      "걱정·주저가 활성화되는 상대적 경향",
      "걱정과 주저가 커지는 상대적인 경향",
    )
    .trim();
}
