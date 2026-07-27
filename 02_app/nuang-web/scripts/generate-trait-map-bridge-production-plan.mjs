import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import prettier from "prettier";
import ts from "typescript";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const sourcePath = path.join(
  projectRoot,
  "src/features/nuang-code/trait-map-bridge-pairs-v2.ts",
);
const outputPath = path.join(
  projectRoot,
  "docs/research/trait-map-data-center-v2/generated/BRIDGE_PROFILE_PRODUCTION_PLAN_V2.json",
);
const checkOnly = process.argv.includes("--check");
const sourceModule = loadData(sourcePath);
const packet = {
  contractVersion: "nuang-trait-map-data-center.v2",
  planId: "BRIDGE-PROFILE-PRODUCTION.0.1",
  status: "RESEARCH_PRODUCTION_PLAN",
  anchors: ["ENAKQ", "IRGMC"],
  pairCount: sourceModule.traitMapBridgePairsV2.length,
  derivedProfileCount:
    sourceModule.traitMapBridgeProductionOrderV2.length,
  productionOrder: sourceModule.traitMapBridgeProductionOrderV2,
  pairs: sourceModule.traitMapBridgePairsV2,
  inheritancePolicy: {
    sharedClaim:
      "바뀌지 않은 네 축과 무관한 문장은 anchor claim을 그대로 상속하고 출처를 기록한다.",
    overrideClaim:
      "바뀐 축이 주의·생각·반응·말하기에 영향을 주는 문장은 새 claim ID로 교체한다.",
    interactionReview:
      "바뀐 축이 다른 네 축과 만드는 상호작용은 단순 단어 치환 없이 별도 검토한다.",
    longform:
      "최종 산출물은 상속과 교체 claim을 합쳐 16개 장·72개 상황·50,000~60,000자로 생성한다.",
  },
  firstBatch: {
    axis: "SE_energy_and_expression",
    codes: ["INAKQ", "ERGMC"],
    reason:
      "관계 중심 ENAKQ와 해결 중심 IRGMC 양쪽 배경에서 E/I 차이를 동시에 확인해 축 고유 효과와 조합 효과를 구분한다.",
  },
  publicationRule:
    "파생 구조가 완성되어도 인지 인터뷰, blind 비교, 정량 검증과 전문 검토 전에는 고객에게 공개하지 않는다.",
};

const output = await prettier.format(JSON.stringify(packet), {
  parser: "json",
});
if (checkOnly) {
  if (
    !fs.existsSync(outputPath) ||
    fs.readFileSync(outputPath, "utf8") !== output
  ) {
    console.error(
      "Bridge production plan is stale. Run npm run research:trait-map:v2:bridge-plan.",
    );
    process.exit(1);
  }
} else {
  fs.writeFileSync(outputPath, output);
}
console.log(
  `Bridge production plan is current: ${packet.pairCount} pairs and ${packet.derivedProfileCount} profiles.`,
);

function loadData(filePath) {
  const source = fs.readFileSync(filePath, "utf8");
  const compiled = ts.transpileModule(source, {
    fileName: filePath,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(compiled, {
    module,
    exports: module.exports,
    require(specifier) {
      throw new Error(
        `Bridge plan module must stay runtime dependency-free; found ${specifier}.`,
      );
    },
  });
  return module.exports;
}
