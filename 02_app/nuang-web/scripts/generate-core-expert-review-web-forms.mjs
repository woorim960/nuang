import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";

const args = process.argv.slice(2);
const checkOnly = args.includes("--check");
const requestedStage = readArg("--stage") ?? "stage1";
const outputRoot = resolve(
  readArg("--output-root") ?? join(tmpdir(), "nuang-m04-review-forms"),
);
const generatedRoot = resolve("docs/research/core-m04/generated");

if (requestedStage !== "stage1" && requestedStage !== "stage2") {
  throw new Error("--stage must be stage1 or stage2");
}

const stage1Files = readdirSync(join(generatedRoot, "reviewer"))
  .filter((fileName) => /^R\d{2}_W\d_stage1_blind\.csv$/.test(fileName))
  .sort()
  .map((fileName) => join(generatedRoot, "reviewer", fileName));
const stage2Files = readdirSync(join(generatedRoot, "internal"))
  .filter((fileName) =>
    /^DO_NOT_RELEASE_UNTIL_ALL_STAGE1_LOCKED_R\d{2}_W\d_stage2_target_reveal\.csv$/.test(
      fileName,
    ),
  )
  .sort()
  .map((fileName) => join(generatedRoot, "internal", fileName));

if (stage1Files.length !== 24 || stage2Files.length !== 24) {
  throw new Error(
    `Expected 24 stage1 and 24 stage2 packets, received ${stage1Files.length} and ${stage2Files.length}`,
  );
}

const stage1Packets = stage1Files.map((path) => readPacket(path, "stage1"));
const stage2Packets = stage2Files.map((path) => readPacket(path, "stage2"));
validatePacketParity(stage1Packets, stage2Packets);

if (checkOnly) {
  console.log(
    `M04 reviewer web form check passed: ${stage1Packets.length} stage1 + ${stage2Packets.length} stage2 packets, 50 items each.`,
  );
  process.exit(0);
}

const packets = requestedStage === "stage1" ? stage1Packets : stage2Packets;
const stageOutputRoot = join(outputRoot, requestedStage);
mkdirSync(stageOutputRoot, { recursive: true });
for (const packet of packets) {
  writeFileSync(
    join(
      stageOutputRoot,
      `${packet.reviewerSlot}_${packet.waveId}_${requestedStage}.html`,
    ),
    renderReviewForm(packet),
    "utf8",
  );
}
writeFileSync(
  join(stageOutputRoot, "00_READ_FIRST.html"),
  renderIndex(packets, requestedStage),
  "utf8",
);

console.log(`Generated ${packets.length} ${requestedStage} reviewer forms.`);
console.log(`Output: ${stageOutputRoot}`);
if (requestedStage === "stage1") {
  console.log(
    "Do not generate or release stage2 until the same reviewer's W1, W2, and W3 stage1 responses are validated and locked.",
  );
} else {
  console.log(
    "Stage2 forms contain target information. Release only the matching reviewer files after all three stage1 waves are locked.",
  );
}

function readPacket(path, stage) {
  const rows = parseCsv(readFileSync(path, "utf8"));
  const headers = rows.shift();
  if (!headers || rows.length !== 50) {
    throw new Error(`${path}: expected a header and 50 item rows`);
  }
  const responseFields =
    stage === "stage1"
      ? [
          "first_construct_mapping",
          "second_construct_mapping",
          "direction_guess",
          "clarity_rating_1_4",
          "single_response_rating_1_4",
          "universality_rating_1_4",
          "scale_fit_rating_1_4",
          "desirable_direction_guess",
          "risk_flags",
          "fatal_risk_note",
          "stage1_notes",
        ]
      : [
          "target_relevance_rating_1_4",
          "key_direction_fit_rating_1_4",
          "coverage_contribution_rating",
          "adjacent_separation_rating_1_4",
          "recommendation",
          "final_rationale",
        ];
  for (const field of responseFields) {
    if (!headers.includes(field)) throw new Error(`${path}: missing ${field}`);
  }
  const records = rows.map((row, rowIndex) => {
    if (row.length !== headers.length) {
      throw new Error(
        `${path}: row ${rowIndex + 2} has ${row.length} columns; expected ${headers.length}`,
      );
    }
    return Object.fromEntries(
      headers.map((header, index) => [header, row[index]]),
    );
  });
  const first = records[0];
  if (!first?.reviewer_slot || !first.wave_id || !first.protocol_version) {
    throw new Error(`${path}: missing packet identity`);
  }
  for (const record of records) {
    if (
      record.reviewer_slot !== first.reviewer_slot ||
      record.wave_id !== first.wave_id ||
      record.protocol_version !== first.protocol_version
    ) {
      throw new Error(`${path}: mixed packet identity`);
    }
    for (const field of responseFields) {
      if (record[field] !== "") {
        throw new Error(`${path}: template response ${field} must be empty`);
      }
    }
  }
  return {
    fileName: basename(path),
    headers,
    protocolVersion: first.protocol_version,
    records,
    responseFields,
    reviewerSlot: first.reviewer_slot,
    stage,
    waveId: first.wave_id,
  };
}

function validatePacketParity(stage1Packets, stage2Packets) {
  const stage2ByKey = new Map(
    stage2Packets.map((packet) => [
      `${packet.reviewerSlot}:${packet.waveId}`,
      packet,
    ]),
  );
  for (const stage1 of stage1Packets) {
    const stage2 = stage2ByKey.get(`${stage1.reviewerSlot}:${stage1.waveId}`);
    if (!stage2)
      throw new Error(`Missing matching stage2 packet: ${stage1.fileName}`);
    for (let index = 0; index < stage1.records.length; index += 1) {
      const left = stage1.records[index];
      const right = stage2.records[index];
      for (const field of [
        "opaque_item_id",
        "context_label",
        "prompt_text",
        "sequence_in_wave",
      ]) {
        if (left[field] !== right[field]) {
          throw new Error(
            `${stage1.reviewerSlot} ${stage1.waveId}: ${field} parity failed at row ${index + 1}`,
          );
        }
      }
    }
  }
}

function renderReviewForm(packet) {
  const safePacketJson = JSON.stringify(packet).replaceAll("<", "\\u003c");
  const stageOne = packet.stage === "stage1";
  const title = stageOne
    ? "Stage 1 · 목표를 숨긴 문항 검토"
    : "Stage 2 · 목표 공개 후 문항 검토";
  const boundary = stageOne
    ? "자신의 성향에 답하지 말고, 다양한 사용자가 문항을 같은 종류의 장면과 반응으로 이해할 수 있는지 판단하세요. 목표 성향이나 정답 방향을 추측해 맞추는 과제가 아닙니다."
    : "Stage 1 원본은 수정하지 않습니다. 공개된 목표가 실제 문장과 맞는지 독립적으로 다시 판단하고, 문항 수를 맞추기 위해 억지로 유지하지 마세요.";
  const approvalEffect = stageOne
    ? "파일을 내보내면 운영자가 형식과 해시를 확인해 이 회차를 잠급니다. 같은 검토자의 W1·W2·W3가 모두 잠기기 전에는 Stage 2가 열리지 않으며, 이 제출만으로 문항은 승인되지 않습니다."
    : "파일을 내보내면 이 검토자의 문항별 최종 권고가 제출됩니다. 유효 검토자 6명 이상의 응답, 소수 위험, 인지 인터뷰와 정량 분석을 측정 책임자가 판정하기 전에는 고객용 검사에 반영되지 않습니다.";
  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="robots" content="noindex,nofollow" />
  <title>${escapeHtml(packet.reviewerSlot)} ${escapeHtml(packet.waveId)} ${escapeHtml(title)}</title>
  <style>${reviewFormCss()}</style>
</head>
<body>
  <header class="topbar">
    <div><span>NUANG M04 · ${escapeHtml(packet.protocolVersion)}</span><h1>${escapeHtml(title)}</h1></div>
    <strong>${escapeHtml(packet.reviewerSlot)} · ${escapeHtml(packet.waveId)} · 50문항</strong>
  </header>
  <main>
    <section class="guide">
      <div><b>무엇을 보나요</b><p>각 문항의 상황 라벨과 질문을 함께 읽고, 의도한 하나의 성향 반응을 다른 성향·능력·환경 효과와 구분해 묻는지 확인합니다.</p></div>
      <div><b>어떻게 판단하나요</b><p>${escapeHtml(boundary)}</p></div>
      <div><b>제출하면</b><p>${escapeHtml(approvalEffect)}</p></div>
    </section>
    <section class="scale-guide">
      <strong>공통 평정 기준</strong>
      <span>1 심각한 문제</span><span>2 상당한 수정</span><span>3 대체로 가능</span><span>4 직접적이고 명확</span>
    </section>
    <section class="progress-wrap">
      <div><strong id="progress-label">0 / 50 완료</strong><span>필수 항목을 모두 채운 문항 수</span></div>
      <progress id="progress" max="50" value="0"></progress>
    </section>
    <form id="review-form" novalidate></form>
    <section class="finish">
      <label><input id="attestation" type="checkbox" /> <span>다른 검토자 답을 보지 않았고, 각 판단을 직접 기록했으며, 목표 노출이나 이해상충이 있었다면 운영자에게 알렸습니다.</span></label>
      <button id="export" type="button" disabled>검토 CSV 내보내기</button>
      <p id="finish-help">50문항의 필수 항목과 독립 검토 확인을 모두 완료하면 내보낼 수 있습니다.</p>
    </section>
  </main>
  <script id="packet-data" type="application/json">${safePacketJson}</script>
  <script>${reviewFormRuntime()}</script>
</body>
</html>`;
}

function renderIndex(packets, stage) {
  const isStageOne = stage === "stage1";
  const rows = packets
    .map(
      (packet) =>
        `<li><strong>${escapeHtml(packet.reviewerSlot)} · ${escapeHtml(packet.waveId)}</strong><span>${escapeHtml(packet.reviewerSlot)}_${escapeHtml(packet.waveId)}_${stage}.html</span></li>`,
    )
    .join("");
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>NUANG M04 ${stage} forms</title><style>${reviewFormCss()}</style></head><body><main><section class="guide"><div><b>${isStageOne ? "Stage 1 전달 폴더" : "Stage 2 제한 폴더"}</b><p>${isStageOne ? "각 검토자에게 해당 슬롯·회차 파일 하나만 전달하세요. W1부터 순서대로 진행하고 다른 슬롯 파일은 공유하지 않습니다." : "같은 검토자의 Stage 1 세 회차가 모두 검증·잠금된 뒤에만 해당 슬롯의 Stage 2 파일을 전달하세요. 목표 정보가 포함돼 있습니다."}</p></div></section><ul class="packet-list">${rows}</ul></main></body></html>`;
}

function reviewFormRuntime() {
  return String.raw`
(function () {
  "use strict";
  var packet = JSON.parse(document.getElementById("packet-data").textContent);
  var form = document.getElementById("review-form");
  var progress = document.getElementById("progress");
  var progressLabel = document.getElementById("progress-label");
  var attestation = document.getElementById("attestation");
  var exportButton = document.getElementById("export");
  var storageKey = "nuang:m04:" + packet.protocolVersion + ":" + packet.reviewerSlot + ":" + packet.waveId + ":" + packet.stage;
  var saved = {};
  try { saved = JSON.parse(localStorage.getItem(storageKey) || "{}"); } catch (_) { saved = {}; }

  var constructOptions = [
    ["", "선택하세요"], ["SE_RE", "SE_RE · 함께할 때의 에너지"], ["SE_AI", "SE_AI · 먼저 표현하기"],
    ["OE_AE", "OE_AE · 미적 경험"], ["OE_CI", "OE_CI · 상상 확장"], ["OE_IE", "OE_IE · 지적 탐구"],
    ["RO_EC", "RO_EC · 관계에서 먼저 보이는 것"], ["RO_RN", "RO_RN · 선택과 존중"],
    ["SM_EP", "SM_EP · 실행과 이어가기"], ["SM_OS", "SM_OS · 정리와 계획"], ["SM_RL", "SM_RL · 맡은 일 이행"],
    ["ER_IR", "ER_IR · 감정 동요"], ["ER_WD", "ER_WD · 걱정과 주저"], ["METHOD", "METHOD · 능력·접근·문장 효과"], ["NONE", "NONE · 명확히 맞지 않음"]
  ];
  var risks = ["ABILITY", "ACCESS", "EDUCATION", "OCCUPATION", "RELATIONSHIP_STATUS", "DIGITAL_ACCESS", "CULTURAL_ROLE", "SOCIAL_DESIRABILITY", "RESPONSE_OPTION", "NEGATION", "LIMITER", "MEMORY", "ATTENTION", "ADJACENT_CONSTRUCT", "CLINICAL_CONTAMINATION", "PRIVACY", "OTHER", "NONE"];
  var definitions = packet.stage === "stage1" ? [
    ["first_construct_mapping", "가장 직접적인 구성개념", "select", constructOptions],
    ["second_construct_mapping", "강하게 겹치는 두 번째 구성개념", "select", constructOptions],
    ["direction_guess", "방향 추정", "select", [["", "선택하세요"], ["HIGH", "HIGH"], ["LOW", "LOW"], ["UNCLEAR", "구분 어려움"]]],
    ["clarity_rating_1_4", "한 번 읽고 이해되는 정도", "rating"],
    ["single_response_rating_1_4", "하나의 반응만 묻는 정도", "rating"],
    ["universality_rating_1_4", "다양한 2030 경험에 적용되는 정도", "rating"],
    ["scale_fit_rating_1_4", "최근 6개월 빈도로 답할 수 있는 정도", "rating"],
    ["desirable_direction_guess", "더 좋아 보이는 방향", "select", [["", "선택하세요"], ["HIGH", "HIGH가 더 좋아 보임"], ["LOW", "LOW가 더 좋아 보임"], ["SIMILAR", "비슷함"], ["UNCLEAR", "구분 어려움"]]],
    ["risk_flags", "위험 신호", "risks"],
    ["fatal_risk_note", "치명 위험 근거 · 없으면 NONE", "textarea"],
    ["stage1_notes", "판단 근거 메모 · 없으면 NONE", "textarea"]
  ] : [
    ["target_relevance_rating_1_4", "목표 구성개념 관련성", "rating"],
    ["key_direction_fit_rating_1_4", "정답 방향 적합성", "rating"],
    ["coverage_contribution_rating", "내용 범위 기여", "select", [["", "선택하세요"], ["REDUNDANT", "중복"], ["SOME", "일부 기여"], ["IMPORTANT", "중요 기여"]]],
    ["adjacent_separation_rating_1_4", "인접 성향과 분리되는 정도", "rating"],
    ["recommendation", "최종 권고", "select", [["", "선택하세요"], ["KEEP", "유지"], ["COPY_REVISE", "문구 수정"], ["CONSTRUCT_REWRITE", "구성개념 재작성"], ["HOLD", "보류"], ["EXCLUDE", "제외"]]],
    ["final_rationale", "최종 권고 근거", "textarea"]
  ];

  packet.records.forEach(function (record, index) {
    var card = document.createElement("article");
    card.className = "item-card";
    card.dataset.index = String(index);
    var identity = '<div class="item-copy"><span>' + escapeHtml(record.sequence_in_wave) + ' / 50 · ' + escapeHtml(record.opaque_item_id) + '</span><p>' + escapeHtml(record.context_label) + '</p><h2>' + escapeHtml(record.prompt_text) + '</h2></div>';
    if (packet.stage === "stage2") {
      identity += '<dl class="target"><div><dt>목표</dt><dd>' + escapeHtml(record.target_domain + " · " + record.target_facet) + '</dd></div><div><dt>방향</dt><dd>' + escapeHtml(record.keyed_direction) + '</dd></div><div><dt>역할</dt><dd>' + escapeHtml(record.score_role) + '</dd></div></dl>';
    }
    var fields = document.createElement("div");
    fields.className = "fields";
    definitions.forEach(function (definition) {
      fields.appendChild(createField(index, definition, saved[String(index)] || {}));
    });
    card.innerHTML = identity;
    card.appendChild(fields);
    form.appendChild(card);
  });

  form.addEventListener("input", persistAndUpdate);
  form.addEventListener("change", persistAndUpdate);
  attestation.addEventListener("change", updateProgress);
  exportButton.addEventListener("click", exportCsv);
  updateProgress();

  function createField(index, definition, savedRow) {
    var name = definition[0];
    var label = definition[1];
    var type = definition[2];
    var wrap = document.createElement(type === "risks" ? "fieldset" : "label");
    wrap.className = "field" + (type === "textarea" || type === "risks" ? " field-wide" : "");
    var title = document.createElement(type === "risks" ? "legend" : "span");
    title.textContent = label + " *";
    wrap.appendChild(title);
    if (type === "textarea") {
      var textarea = document.createElement("textarea");
      textarea.name = name;
      textarea.rows = 3;
      textarea.value = savedRow[name] || "";
      wrap.appendChild(textarea);
    } else if (type === "risks") {
      var riskWrap = document.createElement("div");
      riskWrap.className = "risk-options";
      var savedRisks = String(savedRow[name] || "").split(";").filter(Boolean);
      risks.forEach(function (risk) {
        var riskLabel = document.createElement("label");
        var input = document.createElement("input");
        input.type = "checkbox";
        input.name = name;
        input.value = risk;
        input.checked = savedRisks.indexOf(risk) >= 0;
        riskLabel.appendChild(input);
        riskLabel.appendChild(document.createTextNode(risk));
        riskWrap.appendChild(riskLabel);
      });
      wrap.appendChild(riskWrap);
    } else {
      var select = document.createElement("select");
      select.name = name;
      var options = type === "rating" ? [["", "선택하세요"], ["1", "1 · 심각한 문제"], ["2", "2 · 상당한 수정"], ["3", "3 · 대체로 가능"], ["4", "4 · 직접적이고 명확"]] : definition[3];
      options.forEach(function (option) {
        var node = document.createElement("option");
        node.value = option[0];
        node.textContent = option[1];
        select.appendChild(node);
      });
      select.value = savedRow[name] || "";
      wrap.appendChild(select);
    }
    return wrap;
  }

  function persistAndUpdate(event) {
    if (event.target.name === "risk_flags" && event.target.checked) {
      var card = event.target.closest(".item-card");
      var riskInputs = card.querySelectorAll('input[name="risk_flags"]');
      riskInputs.forEach(function (input) {
        if (event.target.value === "NONE" && input !== event.target) input.checked = false;
        if (event.target.value !== "NONE" && input.value === "NONE") input.checked = false;
      });
    }
    var next = {};
    form.querySelectorAll(".item-card").forEach(function (card) {
      next[card.dataset.index] = readCard(card);
    });
    localStorage.setItem(storageKey, JSON.stringify(next));
    updateProgress();
  }

  function readCard(card) {
    var result = {};
    packet.responseFields.forEach(function (name) {
      if (name === "risk_flags") {
        result[name] = Array.from(card.querySelectorAll('input[name="risk_flags"]:checked')).map(function (input) { return input.value; }).join(";");
      } else {
        var control = card.querySelector('[name="' + name + '"]');
        result[name] = control ? control.value.trim() : "";
      }
    });
    return result;
  }

  function completeCount() {
    return Array.from(form.querySelectorAll(".item-card")).filter(function (card) {
      var row = readCard(card);
      return packet.responseFields.every(function (field) { return Boolean(row[field]); });
    }).length;
  }

  function updateProgress() {
    var count = completeCount();
    progress.value = count;
    progressLabel.textContent = count + " / 50 완료";
    exportButton.disabled = count !== 50 || !attestation.checked;
    form.querySelectorAll(".item-card").forEach(function (card) {
      var row = readCard(card);
      card.dataset.complete = packet.responseFields.every(function (field) { return Boolean(row[field]); });
    });
  }

  function exportCsv() {
    if (exportButton.disabled) return;
    var lines = [packet.headers.map(csvCell).join(",")];
    form.querySelectorAll(".item-card").forEach(function (card, index) {
      var responses = readCard(card);
      var source = packet.records[index];
      lines.push(packet.headers.map(function (header) { return csvCell(Object.prototype.hasOwnProperty.call(responses, header) ? responses[header] : source[header]); }).join(","));
    });
    var blob = new Blob(["\ufeff" + lines.join("\r\n") + "\r\n"], { type: "text/csv;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = packet.reviewerSlot + "_" + packet.waveId + "_" + packet.stage + "_response.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function csvCell(value) { var text = String(value == null ? "" : value); return /[",\r\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text; }
  function escapeHtml(value) { return String(value == null ? "" : value).replace(/[&<>"']/g, function (character) { return ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[character]; }); }
})();`;
}

function reviewFormCss() {
  return `
:root{color-scheme:light;font-family:-apple-system,BlinkMacSystemFont,"Pretendard","Noto Sans KR",sans-serif;color:#222;background:#f5f5f7}*{box-sizing:border-box}body{margin:0}.topbar{position:sticky;z-index:10;top:0;display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:1rem max(1rem,calc((100vw - 1040px)/2));border-bottom:1px solid #ddd;background:rgba(255,255,255,.96);backdrop-filter:blur(10px)}.topbar span{color:#6b6b73;font-size:.75rem;font-weight:700}.topbar h1{margin:.2rem 0 0;font-size:1.15rem}.topbar>strong{font-size:.8rem}main{display:grid;max-width:1040px;gap:1rem;margin:0 auto;padding:1rem}.guide{display:grid;overflow:hidden;border:1px solid #ddd;border-radius:10px;background:#fff}.guide>div{padding:1rem}.guide>div+div{border-top:1px solid #e7e7e9}.guide b{font-size:.9rem}.guide p{margin:.35rem 0 0;color:#5f6068;font-size:.84rem;line-height:1.6}.scale-guide{display:flex;flex-wrap:wrap;gap:.55rem;padding:.85rem 1rem;border-left:3px solid #7658be;border-radius:0 8px 8px 0;background:#f1edfa;font-size:.8rem}.scale-guide strong{margin-right:.4rem}.progress-wrap{position:sticky;z-index:9;top:73px;display:grid;grid-template-columns:auto minmax(160px,1fr);align-items:center;gap:1rem;padding:.8rem 1rem;border:1px solid #ddd;border-radius:8px;background:#fff}.progress-wrap div{display:grid}.progress-wrap span{color:#777;font-size:.72rem}.progress-wrap progress{width:100%;accent-color:#7658be}.item-card{display:grid;gap:1rem;padding:1rem;border:1px solid #ddd;border-radius:10px;background:#fff}.item-card[data-complete=true]{border-color:#a8d6b8}.item-copy>span{color:#777;font-size:.72rem;font-weight:700}.item-copy p{margin:.65rem 0 0;color:#7658be;font-size:.82rem;font-weight:700}.item-copy h2{margin:.25rem 0 0;font-size:1.05rem;line-height:1.55}.target{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.5rem;margin:.75rem 0 0}.target div{padding:.55rem;border-radius:6px;background:#f3f3f5}.target dt{color:#777;font-size:.7rem}.target dd{margin:.15rem 0 0;font-size:.8rem;font-weight:700}.fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.7rem}.field{display:grid;gap:.35rem}.field>span,.field legend{font-size:.78rem;font-weight:700}.field select,.field textarea{width:100%;min-height:42px;padding:.65rem;border:1px solid #d5d5d8;border-radius:6px;background:#fff;font:inherit;font-size:.82rem}.field textarea{resize:vertical;line-height:1.5}.field-wide{grid-column:1/-1}.risk-options{display:flex;flex-wrap:wrap;gap:.4rem}.risk-options label{display:flex;align-items:center;gap:.25rem;padding:.35rem .45rem;border:1px solid #ddd;border-radius:5px;font-size:.7rem}.finish{display:grid;gap:.75rem;padding:1rem;border:1px solid #7658be;border-radius:10px;background:#f1edfa}.finish label{display:flex;align-items:flex-start;gap:.5rem;font-size:.82rem;line-height:1.5}.finish button{min-height:46px;border:0;border-radius:7px;color:#fff;background:#5f439f;font:inherit;font-weight:700}.finish button:disabled{opacity:.4}.finish p{margin:0;color:#666;font-size:.75rem}.packet-list{display:grid;gap:.4rem;padding:0;list-style:none}.packet-list li{display:flex;justify-content:space-between;gap:1rem;padding:.8rem;border:1px solid #ddd;border-radius:7px;background:#fff;font-size:.8rem}@media(min-width:800px){.guide{grid-template-columns:repeat(3,minmax(0,1fr))}.guide>div+div{border-top:0;border-left:1px solid #e7e7e9}}@media(max-width:650px){.topbar{align-items:flex-start;flex-direction:column}.progress-wrap{top:100px;grid-template-columns:1fr}.fields,.target{grid-template-columns:1fr}.field-wide{grid-column:auto}}
`;
}

function parseCsv(source) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (
    let index = source.charCodeAt(0) === 0xfeff ? 1 : 0;
    index < source.length;
    index += 1
  ) {
    const character = source[index];
    if (quoted) {
      if (character === '"' && source[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
    } else if (character === '"' && field === "") {
      quoted = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n" || character === "\r") {
      if (character === "\r" && source[index + 1] === "\n") index += 1;
      row.push(field);
      if (row.some((value) => value !== "")) rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  if (quoted) throw new Error("Unclosed CSV quote");
  return rows;
}

function readArg(name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function escapeHtml(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character],
  );
}
