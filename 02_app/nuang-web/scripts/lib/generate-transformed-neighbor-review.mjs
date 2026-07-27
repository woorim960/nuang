import fs from "node:fs";
import path from "node:path";
import prettier from "prettier";

export async function generateTransformedNeighborReview(config) {
  const {
    projectRoot,
    code,
    transformations,
    outputFile,
    command,
    checkOnly,
  } = config;
  const generatedDirectory = path.join(
    projectRoot,
    "docs/research/trait-map-data-center-v2/generated",
  );
  const sourcePacket = JSON.parse(
    fs.readFileSync(
      path.join(generatedDirectory, "IRGMC_NEIGHBOR_REVIEW_V2.json"),
      "utf8",
    ),
  );
  const claims = transformations.flatMap((transformation) => {
    const sourceClaims = sourcePacket.claims.filter(
      (claim) =>
        claim.entity.ref === `IRGMC<>${transformation.sourceNeighbor}`,
    );
    return sourceClaims.map((sourceClaim) => {
      const suffix = sourceClaim.claimId.split(".").at(-1);
      return {
        ...sourceClaim,
        claimId: `${code}.neighbor.${transformation.targetNeighbor}.${suffix}`,
        entity: {
          kind: "interaction",
          ref: `${code}<>${transformation.targetNeighbor}`,
        },
        assertion: replaceCodes(
          sourceClaim.assertion,
          transformation.codeMap,
        ),
      };
    });
  });
  const reviewQueue = transformations.map((transformation) => ({
    code: transformation.targetNeighbor,
    changedAxis: transformation.changedAxis,
    changedLetters: transformation.changedLetters,
    claims: claims
      .filter(
        (claim) =>
          claim.entity.ref === `${code}<>${transformation.targetNeighbor}`,
      )
      .map((claim) => claim.claimId),
    requiredReviews: [
      "one_letter_difference",
      "bidirectional_symmetry",
      "value_bias",
      "plain_korean_cognitive_interview",
      "quantitative_neighbor_discrimination",
    ],
    status: "not_started",
  }));
  const packet = {
    contractVersion: "nuang-trait-map-data-center.v2",
    packetId: `${code}-NEIGHBOR-CONTRASTS.0.1`,
    status: "RESEARCH_CANDIDATE_NOT_FOR_PRODUCTION",
    code,
    neighborCodes: transformations.map((item) => item.targetNeighbor),
    claimCount: claims.length,
    claims,
    reviewQueue,
    approvedClaims: 0,
  };
  const output = await prettier.format(JSON.stringify(packet), {
    parser: "json",
  });
  const outputPath = path.join(generatedDirectory, outputFile);
  if (checkOnly) {
    if (
      !fs.existsSync(outputPath) ||
      fs.readFileSync(outputPath, "utf8") !== output
    ) {
      console.error(`${code} neighbor review is stale. Run ${command}.`);
      process.exit(1);
    }
  } else {
    fs.writeFileSync(outputPath, output);
  }
  console.log(
    `${code} neighbor review is current: ${claims.length} claims across ${reviewQueue.length} neighbors.`,
  );
}

function replaceCodes(assertion, codeMap) {
  let result = assertion;
  const placeholders = Object.keys(codeMap).map(
    (source, index) => [`__NUANG_CODE_${index}__`, source],
  );
  for (const [placeholder, source] of placeholders) {
    result = result.replaceAll(source, placeholder);
  }
  for (const [placeholder, source] of placeholders) {
    result = result.replaceAll(placeholder, codeMap[source]);
  }
  return result;
}
