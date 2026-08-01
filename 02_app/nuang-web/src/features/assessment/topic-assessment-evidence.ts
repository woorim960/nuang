export type TopicAssessmentResearchSource = {
  authors: string;
  focus: string;
  href: string;
  title: string;
  venue: string;
  year: number;
};

export type TopicAssessmentEvidence = {
  assessmentSlug:
    | "apology-style"
    | "comfort-style"
    | "focus-switch"
    | "hurt-expression"
    | "organizing-style"
    | "recharge-routine";
  designSummary: string;
  principles: string[];
  sources: TopicAssessmentResearchSource[];
};

const topicAssessmentEvidence: Record<
  TopicAssessmentEvidence["assessmentSlug"],
  TopicAssessmentEvidence
> = {
  "comfort-style": {
    assessmentSlug: "comfort-style",
    designSummary:
      "사회적 지지의 종류, 상대가 나를 이해하고 존중한다고 느끼는 관계 반응성, 도움의 시점과 범위를 스스로 고르는 자율성 지지 연구를 함께 반영했어요. 그래서 세 도움을 서로 반대되는 유형이 아니라 동시에 필요할 수 있는 독립된 축으로 살펴봅니다.",
    principles: [
      "힘든 순간에 필요한 도움은 상황과 당사자의 필요가 맞을 때 더 유용할 수 있어요.",
      "마음을 알아주는 도움과 정보·실질 도움은 서로 다른 기능을 할 수 있어요.",
      "좋은 의도의 도움도 시점·종류·범위를 당사자가 고를 수 있을 때 더 편안할 수 있어요.",
    ],
    sources: [
      source(
        "Crasta, Rogge, Maniaci, & Reis",
        2021,
        "Toward an optimized measure of perceived partner responsiveness",
        "Psychological Assessment",
        "https://doi.org/10.1037/pas0000986",
        "이해·인정·돌봄으로 이루어진 관계 반응성의 구성개념과 측정 설계",
      ),
      source(
        "Maisel, Gable, & Strachman",
        2008,
        "Responsive behaviors in good times and in bad",
        "Personal Relationships",
        "https://doi.org/10.1111/j.1475-6811.2008.00201.x",
        "실제 대화에서 나타나는 반응 행동과 상대가 느낀 반응성",
      ),
      source(
        "Cutrona & Suhr",
        1992,
        "Controllability of stressful events and satisfaction with spouse support behaviors",
        "Communication Research",
        "https://doi.org/10.1177/009365092019002002",
        "정서·정보·실질 지원의 구분과 스트레스 상황에 따른 지원 선호",
      ),
      source(
        "Cutrona, Cohen, & Igram",
        1990,
        "Contextual determinants of the perceived supportiveness of helping behaviors",
        "Journal of Social and Personal Relationships",
        "https://doi.org/10.1177/0265407590074011",
        "원하는 도움과 받은 도움의 일치, 관계와 상황 맥락의 영향",
      ),
      source(
        "Rini, Dunkel Schetter, Hobel, Glynn, & Sandman",
        2006,
        "Effective social support: Antecedents and consequences of partner support during pregnancy",
        "Personal Relationships",
        "https://doi.org/10.1111/j.1475-6811.2006.00114.x",
        "지원의 양보다 필요 충족과 품질을 함께 보는 사회적 지지 효과성",
      ),
      source(
        "Maisel & Gable",
        2009,
        "The paradox of received social support: The importance of responsiveness",
        "Psychological Science",
        "https://doi.org/10.1111/j.1467-9280.2009.02388.x",
        "받은 지원이 당사자의 필요에 반응적일 때의 차이",
      ),
      source(
        "Bolger, Zuckerman, & Kessler",
        2000,
        "Invisible support and adjustment to stress",
        "Journal of Personality and Social Psychology",
        "https://doi.org/10.1037/0022-3514.79.6.953",
        "지원의 제공량과 체감되는 유용성이 단순히 같지 않다는 일기 연구",
      ),
      source(
        "Deci, La Guardia, Moller, Scheiner, & Ryan",
        2006,
        "On the benefits of giving as well as receiving autonomy support",
        "Personality and Social Psychology Bulletin",
        "https://doi.org/10.1177/0146167205282148",
        "가까운 관계에서 주고받는 자율성 지지와 관계 경험",
      ),
      source(
        "Feeney & Thrush",
        2010,
        "Relationship influences on exploration in adulthood",
        "Journal of Personality and Social Psychology",
        "https://doi.org/10.1037/a0016961",
        "필요할 때 곁에 있음, 비간섭, 격려로 구성된 안전기지 지원",
      ),
      source(
        "Feeney",
        2004,
        "A secure base: Responsive support of goal strivings and exploration in adult intimate relationships",
        "Journal of Personality and Social Psychology",
        "https://doi.org/10.1037/0022-3514.87.5.631",
        "반응적 지원과 대신 결정하거나 간섭하는 지원의 구분",
      ),
    ],
  },
  "apology-style": {
    assessmentSlug: "apology-style",
    designSummary:
      "책임 인정, 상대가 받은 영향의 이해, 구체적인 회복 행동이 사과와 신뢰 회복에서 서로 다른 역할을 한다는 연구를 반영했어요. 뉴앙은 사과를 한 점수로 줄이지 않고 세 행동을 따로 살펴봅니다.",
    principles: [
      "책임을 분명히 인정하는 표현은 사과의 핵심 요소로 반복해서 연구되어 왔어요.",
      "사과의 효과는 잘못의 종류와 상대가 중요하게 여기는 가치에 따라 달라질 수 있어요.",
      "말로 끝내지 않고 바로잡을 행동을 제안하는 과정은 별도의 중요한 요소예요.",
    ],
    sources: [
      source(
        "Lewicki, Polin, & Lount",
        2016,
        "An exploration of the structure of effective apologies",
        "Negotiation and Conflict Management Research",
        "https://doi.org/10.1111/ncmr.12073",
        "사과를 이루는 여섯 요소와 책임 인정·회복 제안의 상대적 중요성",
      ),
      source(
        "Fehr & Gelfand",
        2010,
        "When apologies work: How matching apology components to victims’ self-construals facilitates forgiveness",
        "Organizational Behavior and Human Decision Processes",
        "https://doi.org/10.1016/j.obhdp.2010.04.002",
        "사과 요소와 상대의 가치·자기해석 방식이 맞을 때의 차이",
      ),
      source(
        "Schumann & Dweck",
        2014,
        "Who accepts responsibility for their transgressions?",
        "Personality and Social Psychology Bulletin",
        "https://doi.org/10.1177/0146167214552789",
        "잘못을 성장과 변화의 기회로 보는 관점과 책임 인정",
      ),
      source(
        "Schumann",
        2014,
        "An affirmed self and a better apology",
        "Journal of Experimental Social Psychology",
        "https://doi.org/10.1016/j.jesp.2014.04.013",
        "방어성을 낮추는 조건과 상대 중심적인 사과 반응",
      ),
      source(
        "Kim, Ferrin, Cooper, & Dirks",
        2004,
        "Removing the shadow of suspicion",
        "Journal of Applied Psychology",
        "https://doi.org/10.1037/0021-9010.89.1.104",
        "신뢰 위반의 종류와 사과·부인의 서로 다른 신뢰 회복 효과",
      ),
      source(
        "Fehr, Gelfand, & Nag",
        2010,
        "The road to forgiveness: A meta-analytic synthesis of its situational and dispositional correlates",
        "Psychological Bulletin",
        "https://doi.org/10.1037/a0019993",
        "용서와 관련된 상황·개인 요인을 종합한 메타분석",
      ),
    ],
  },
  "hurt-expression": {
    assessmentSlug: "hurt-expression",
    designSummary:
      "갈등에서 구체적인 사건, 내 감정, 바라는 변화를 나누어 말하는 구조를 바탕으로 했어요. 동시에 감정 표현은 관계·권력·안전·문화 맥락에 따라 다르게 작동할 수 있다는 연구도 리포트 해석에 반영합니다.",
    principles: [
      "감정은 사건마다 달라지는 신호와 관계 전반의 분위기를 함께 담을 수 있어요.",
      "내 관점만 말하기보다 상대의 관점도 인정하는 표현이 방어적 반응을 줄이는 데 도움이 될 수 있어요.",
      "직접 말하기가 늘 최선인 것은 아니며, 대화의 맥락과 안전을 함께 보아야 해요.",
    ],
    sources: [
      source(
        "Sanford",
        2012,
        "The communication of emotion during conflict in married couples",
        "Journal of Family Psychology",
        "https://doi.org/10.1037/a0028139",
        "갈등 대화에서 감정의 표현·인식과 사건별 감정의 구분",
      ),
      source(
        "Rogers, Howieson, & Neame",
        2018,
        "I understand you feel that way, but I feel this way",
        "PeerJ",
        "https://doi.org/10.7717/peerj.4831",
        "나 전달 표현과 상대 관점을 함께 말할 때 느껴지는 방어성의 차이",
      ),
      source(
        "Korobov",
        2020,
        "Failure of I-statements for mitigating interpersonal conflict in arguments between young adult couples",
        "Studies in Media and Communication",
        "https://doi.org/10.11114/smc.v8i2.4982",
        "실제 갈등에서 감정 표현만으로는 충분하지 않고 상호 맥락 이해가 중요하다는 분석",
      ),
      source(
        "Canary, Cupach, & Serpe",
        2001,
        "A competence-based approach to examining interpersonal conflict",
        "Communication Research",
        "https://doi.org/10.1177/009365001028001003",
        "갈등 행동·대화 만족·관계 경험을 연결한 종단 모형",
      ),
      source(
        "Schrodt, Witt, & Shimkowski",
        2014,
        "A meta-analytical review of the demand/withdraw pattern of interaction",
        "Communication Monographs",
        "https://doi.org/10.1080/03637751.2013.813632",
        "요구–철회 대화 패턴과 관계·의사소통 결과를 종합한 메타분석",
      ),
      source(
        "Kashdan, Volkmann, Breen, & Han",
        2007,
        "Social anxiety and romantic relationships",
        "Journal of Anxiety Disorders",
        "https://doi.org/10.1016/j.janxdis.2006.08.007",
        "부정적 감정 표현의 이점과 비용이 관계 맥락에 따라 달라질 수 있다는 종단 연구",
      ),
    ],
  },
  "focus-switch": {
    assessmentSlug: "focus-switch",
    designSummary:
      "하던 일을 바꾸거나 멈추는 상황에 관한 연구에서 다루는 다시 시작할 단서, 현재 할 일 확인, 구체적인 시작 계획을 일상 행동으로 재구성했어요. 세 가지 방법은 고정된 집중 능력이나 생산성 등급이 아니라, 집중이 끊긴 장면에서 함께 사용하거나 필요한 순간에 골라 쓸 수 있는 방법으로 살펴봅니다.",
    principles: [
      "끝내지 못한 일을 떠나면 이전 과제의 생각이 남을 수 있어, 다시 시작할 지점과 다음 행동을 짧게 남기는 것이 나중에 다시 집중하는 데 도움이 될 수 있어요.",
      "중단했던 일을 다시 시작할 때는 지금 다룰 목표와 범위를 선명하게 만드는 과정이 필요할 수 있어요.",
      "다시 시작할 때의 어려움은 고정된 능력보다 방해의 길이·복잡성·미리 알 수 있었는지와 사용할 수 있는 단서에 따라 달라질 수 있어요.",
    ],
    sources: [
      source(
        "Leroy",
        2009,
        "Why is it so hard to do my work? The challenge of attention residue when switching between work tasks",
        "Organizational Behavior and Human Decision Processes",
        "https://doi.org/10.1016/j.obhdp.2009.04.002",
        "끝내지 못한 과제에서 새 과제로 전환할 때 남는 주의 잔여와 수행의 관계",
      ),
      source(
        "Leroy & Glomb",
        2018,
        "Tasks interrupted: How anticipating time pressure on resumption of an interrupted task causes attention residue and low performance on interrupting tasks and how a ready-to-resume plan mitigates the effects",
        "Organization Science",
        "https://doi.org/10.1287/orsc.2017.1184",
        "중단 전에 다시 시작할 지점과 계획을 남기는 ready-to-resume 절차의 전환 효과",
      ),
      source(
        "Altmann & Trafton",
        2002,
        "Memory for goals: An activation-based model",
        "Cognitive Science",
        "https://doi.org/10.1207/s15516709cog2601_2",
        "중단 뒤 목표 재활성화와 환경 단서를 설명하는 기억-목표 모형",
      ),
      source(
        "Trafton, Altmann, Brock, & Mintz",
        2003,
        "Preparing to resume an interrupted task: Effects of prospective goal encoding and retrospective rehearsal",
        "International Journal of Human-Computer Studies",
        "https://doi.org/10.1016/S1071-5819(03)00023-5",
        "중단 직전의 준비와 목표 부호화가 과제 복귀 시간에 연결되는 실험 연구",
      ),
      source(
        "Monk, Trafton, & Boehm-Davis",
        2008,
        "The effect of interruption duration and demand on resuming suspended goals",
        "Journal of Experimental Psychology: Applied",
        "https://doi.org/10.1037/a0014402",
        "방해의 길이와 인지 요구가 중단된 목표를 다시 시작하는 시간에 미치는 영향",
      ),
      source(
        "Dodhia & Dismukes",
        2009,
        "Interruptions create prospective memory tasks",
        "Applied Cognitive Psychology",
        "https://doi.org/10.1002/acp.1441",
        "중단된 과제를 다시 수행하려는 의도와 구체적 재개 단서의 역할",
      ),
      source(
        "Masicampo & Baumeister",
        2011,
        "Consider it done! Plan making can eliminate the cognitive effects of unfulfilled goals",
        "Journal of Personality and Social Psychology",
        "https://doi.org/10.1037/a0024192",
        "끝내지 못한 목표의 인지적 간섭과 구체적인 계획을 세우는 행동의 관계",
      ),
      source(
        "Monsell",
        2003,
        "Task switching",
        "Trends in Cognitive Sciences",
        "https://doi.org/10.1016/S1364-6613(03)00028-7",
        "과제 전환 비용, 준비 기회, 과제 집합 재구성 연구를 종합한 고전적 리뷰",
      ),
      source(
        "Egner & Siqi-Liu",
        2024,
        "Insights into control over cognitive flexibility from studies of task-switching",
        "Current Opinion in Behavioral Sciences",
        "https://doi.org/10.1016/j.cobeha.2023.101342",
        "인지 유연성을 고정 능력보다 맥락에 맞게 조절되는 전환 준비로 보는 최신 리뷰",
      ),
    ],
  },
  "organizing-style": {
    assessmentSlug: "organizing-style",
    designSummary:
      "인지적 오프로딩과 개인 정보 관리 연구에서 다루는 안정된 위치·분류, 외부 기록과 알림, 사용 환경에 맞춘 구조 조정, 쌓인 대상을 별도 시간에 처리하는 행동을 일상 문장으로 재구성했어요. 네 행동은 깔끔함이나 성실성의 등급이 아니라 물건·일정·정보를 다시 찾고 쓰는 실제 방식으로 따로 살펴봅니다.",
    principles: [
      "기억할 내용을 이름·목록·알림처럼 바깥에 남기면 머릿속에 계속 유지해야 하는 부담을 바꿀 수 있어요.",
      "위치와 분류는 다시 찾는 단서가 될 수 있지만, 너무 복잡한 분류는 넣고 찾는 부담을 늘릴 수 있어요.",
      "정리 방식은 한 번 정하면 끝나는 성격이 아니라 사용하는 도구·역할·생활 조건에 맞춰 유지하고 조정하는 행동일 수 있어요.",
      "한곳에 모아두었다가 한꺼번에 정리하는 방식은 큰 범위를 빠르게 되돌릴 수 있지만, 정리 사이에 분실·누락이 생기는지는 별도로 확인해야 해요.",
    ],
    sources: [
      source(
        "Risko & Gilbert",
        2016,
        "Cognitive offloading",
        "Trends in Cognitive Sciences",
        "https://doi.org/10.1016/j.tics.2016.07.002",
        "외부 행동과 도구를 사용해 과제의 인지 요구를 바꾸는 인지적 오프로딩 연구의 종합",
      ),
      source(
        "Gilbert",
        2015,
        "Strategic offloading of delayed intentions into the external environment",
        "Quarterly Journal of Experimental Psychology",
        "https://doi.org/10.1080/17470218.2014.972963",
        "할 일을 외부 알림으로 남기는 선택과 기억 부담·방해·일상 의도 수행의 관계",
      ),
      source(
        "Boardman & Sasse",
        2004,
        "Stuff goes into the computer and doesn't come out: A cross-tool study of personal information management",
        "Proceedings of CHI 2004",
        "https://doi.org/10.1145/985692.985766",
        "파일·이메일·북마크를 넘나드는 개인 정보 관리 전략과 시간이 흐르며 구조를 조정하는 행동",
      ),
      source(
        "Barreau & Nardi",
        1995,
        "Finding and reminding: File organization from the desktop",
        "ACM SIGCHI Bulletin",
        "https://doi.org/10.1145/221296.221307",
        "개인이 파일을 찾고 기억할 때 위치 기반 단서를 사용하고 복잡한 분류를 피하는 현장 연구",
      ),
      source(
        "Malone",
        1983,
        "How do people organize their desks? Implications for the design of office information systems",
        "ACM Transactions on Office Information Systems",
        "https://doi.org/10.1145/357423.357430",
        "실제 책상에서 파일·더미·보이는 위치가 분류와 할 일 상기의 기능을 나누는 방식",
      ),
      source(
        "Lansdale",
        1988,
        "The psychology of personal information management",
        "Applied Ergonomics",
        "https://doi.org/10.1016/0003-6870(88)90199-8",
        "개인 정보를 저장하고 다시 찾을 때 회상·재인·범주 구조가 만드는 이점과 비용",
      ),
      source(
        "Whittaker & Sidner",
        1996,
        "Email overload: Exploring personal information management of email",
        "Proceedings of CHI 1996",
        "https://doi.org/10.1145/238386.238530",
        "한 도구에 할 일·대화·자료가 함께 쌓일 때 생기는 과부하와 정리 전략의 한계",
      ),
      source(
        "Storm & Stone",
        2015,
        "Saving-enhanced memory: The benefits of saving on the learning and remembering of new information",
        "Psychological Science",
        "https://doi.org/10.1177/0956797614559285",
        "정보를 신뢰할 수 있게 외부에 저장하는 행동이 이후 학습과 기억에 미칠 수 있는 영향",
      ),
    ],
  },
  "recharge-routine": {
    assessmentSlug: "recharge-routine",
    designSummary:
      "회복 경험 연구에서 구분하는 심리적 분리·이완, 관계적 연결, 숙련감과 선택 가능한 활동을 일상 언어로 재구성했어요. 세 경로는 서로 반대되는 유형이 아니라 한 사람이 상황에 따라 함께 사용할 수 있는 독립된 회복 행동으로 살펴봅니다.",
    principles: [
      "지친 뒤의 회복은 한 가지 활동보다 자극에서 떨어지기, 이완, 선택감, 작은 숙련감처럼 서로 다른 경험으로 이루어질 수 있어요.",
      "짧은 휴식도 내가 선호하는 방식과 당시의 부담에 맞을 때 회복 자원과 기분에 다르게 연결될 수 있어요.",
      "편한 사람과의 연결은 회복의 한 경로가 될 수 있지만, 같은 활동도 상황과 당사자의 필요에 따라 효과가 달라질 수 있어요.",
    ],
    sources: [
      source(
        "Sonnentag & Fritz",
        2007,
        "The Recovery Experience Questionnaire: Development and validation of a measure for assessing recuperation and unwinding from work",
        "Journal of Occupational Health Psychology",
        "https://doi.org/10.1037/1076-8998.12.3.204",
        "심리적 분리·이완·숙련·통제를 서로 구분되는 회복 경험으로 측정한 원척도 연구",
      ),
      source(
        "Bennett, Bakker, & Field",
        2018,
        "Recovery from work-related effort: A meta-analysis",
        "Journal of Organizational Behavior",
        "https://doi.org/10.1002/job.2217",
        "회복 경험과 피로·활력의 관계 및 경로별 차이를 종합한 메타분석",
      ),
      source(
        "Sonnentag & Bayer",
        2005,
        "Switching off mentally: Predictors and consequences of psychological detachment from work during off-job time",
        "Journal of Occupational Health Psychology",
        "https://doi.org/10.1037/1076-8998.10.4.393",
        "요구에서 심리적으로 떨어지는 경험과 피로·기분의 일상 수준 관계",
      ),
      source(
        "Kim, Park, & Niu",
        2017,
        "Micro-break activities at work to recover from daily work demands",
        "Journal of Organizational Behavior",
        "https://doi.org/10.1002/job.2109",
        "이완·사회적 활동 등 짧은 휴식 활동과 일상 요구 이후 정서의 차이",
      ),
      source(
        "Hunter & Wu",
        2016,
        "Give me a better break: Choosing workday break activities to maximize resource recovery",
        "Journal of Applied Psychology",
        "https://doi.org/10.1037/apl0000045",
        "선호하는 휴식 활동과 휴식 시점·길이가 회복 자원에 연결되는 방식",
      ),
      source(
        "Trougakos, Beal, Green, & Weiss",
        2008,
        "Making the break count: An episodic examination of recovery activities, emotional experiences, and positive affective displays",
        "Academy of Management Journal",
        "https://doi.org/10.5465/amj.2008.30764063",
        "휴식 중 활동의 종류와 이후 정서·행동을 에피소드 수준에서 살펴본 연구",
      ),
      source(
        "Newman, Tay, & Diener",
        2014,
        "Leisure and subjective well-being: A model of psychological mechanisms as mediating factors",
        "Journal of Happiness Studies",
        "https://doi.org/10.1007/s10902-013-9435-x",
        "여가의 회복·자율성·숙련·의미·관계 연결 경로를 통합한 문헌 기반 모형",
      ),
      source(
        "Park, Park, Kim, & Hur",
        2011,
        "A validation study of a Korean version of the Recovery Experience Questionnaire",
        "Korean Journal of Industrial and Organizational Psychology",
        "https://doi.org/10.24230/kjiop.v24i3.523-552",
        "한국어 맥락에서 회복 경험의 네 요인 구조와 문항 이해 가능성을 검토한 타당화 연구",
      ),
    ],
  },
};

export function getTopicAssessmentEvidence(slug: string) {
  return (
    topicAssessmentEvidence[
      slug as TopicAssessmentEvidence["assessmentSlug"]
    ] ?? null
  );
}

function source(
  authors: string,
  year: number,
  title: string,
  venue: string,
  href: string,
  focus: string,
): TopicAssessmentResearchSource {
  return { authors, focus, href, title, venue, year };
}
