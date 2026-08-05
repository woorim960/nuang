# Four-track execution report

## Outcome

All four AI prereview tracks were executed against the locked repository
fallback. Overall state is `completed_with_blockers`; human gate effect remains
`none`. The review found three blocker-level hypotheses and multiple major
hypotheses. One blocker (candidate public propagation) and one major issue
(score-to-copy overreach) have safe code fixes.
No item key, keyed direction, scoring threshold, release status, or validation
gate was changed.

## Track A — cognitive and content

Checklist executed: single observable response, six-month frequency fit,
double-barrelled wording, context availability, target seam, direction,
social desirability, clinical/ability inference, and result-copy breadth.

- Full has 60 items, exactly six per facet and three direct/three reverse per
  facet. This is balanced by construction, not evidence of content validity.
- The locked bank itself marks 49 `PASS_TO_COGNITIVE`, seven `COPY_REVISE`, two
  `HOLD_FOR_ACCESS`, one `HOLD_FOR_RISK_REVIEW`, and one
  `CONSTRUCT_REWRITE`.
- Quick selects seven of the eleven non-pass items: `NU-B1-003`, `023`, `033`,
  `050`, `053`, `056`, and `058`. Four are RO-EC, making the short form
  especially sensitive to social-desirability and attention-order wording.
- Counterargument: these labels are internal AI triage, not human exclusion
  decisions, and a beta may intentionally collect evidence on risky items.
  Therefore this run does not rewrite or remove them; it requires explicit
  private-beta status and human M04/M05 adjudication.
- Facet result copy was compared to the actual item behaviors. Statements that
  inferred visible emotion, proven method effectiveness, flexible skill, or
  broader ability were narrowed in `precision-report-insights.ts`.
- Adaptive tie questions remove both neutral and unsure/experience-not-available
  responses while retaining frequency-style labels. This can force an
  exposure-dependent answer exactly where the code is unstable. It remains a
  human cognitive/accessibility blocker; this run did not rekey it.

## Track B — fairness and invariance risk

Checklist executed across age, gender, work/student status, relationship
status, culture, disability, neurodiversity, literacy/Korean proficiency,
device/digital exposure, and resource availability.

- OE-IE items involving videos, new concepts, and unfamiliar product features
  may vary with education, language proficiency, digital access, or occupation.
- SE-AI can reflect hierarchy, safety, communication accessibility, or cultural
  deference rather than preferred initiation.
- SM-OS/SM-EP can reflect executive-function disability, care load, unstable
  schedules, fatigue, or resource constraints.
- ER items can be affected by current stress and symptom burden; no clinical
  inference is permitted.
- RO-EC has a high social-desirability contrast (feelings versus problem
  solving) and only one public facet defines the entire G/A axis.
- Counterargument: context labels are intentionally ordinary and an unsure
  response is available. Those mitigations reduce forced answers but cannot
  establish DIF or invariance.

No fairness or invariance conclusion was produced. Required tests are ordinal
DIF and configural/threshold/metric comparisons using preregistered groups and
adequate cells, followed by interviews where differences appear.

## Track C — quantitative pilot readiness

Checklist executed: population, sampling frame, development/confirmation
split, retest, exclusions, missing/unsure, speed/straightline rules, duplicate
handling, privacy, and analysis freeze.

- There is no locked participant sample, observed response distribution,
  attrition estimate, target loading, DIF effect threshold, or retest sample.
  Sample size is therefore intentionally not fabricated.
- Quick minimum evidence is one valid response per facet except RO-EC (two).
  A facet and ultimately a code direction can therefore depend on one item;
  this is a P1 stability hypothesis requiring simulation and pilot evidence.
- Full minimum evidence is four of six responses per facet. Unsure answers are
  excluded, and a domain is valid only when all its public facets are valid.
- Deterministic safety tests cover empty/unsure input, balanced 60-item
  construction, quick coverage, keyed direction monotonicity, and boundary
  handling. These are software checks, not estimated psychometric properties.

## Track D — reliability, structure, and claim traceability

Checklist executed: distributions, corrected item-total correlation, EFA/CFA
separation, competing 5-axis/10-facet structures, ordinal estimation, omega,
retest, convergence/discrimination, boundary stability, quick/full agreement,
and score-to-copy references.

- No omega, retest coefficient, EFA/CFA fit, cross-loading, or independent
  replication exists in this run.
- The scorer maps 1–5 to 0/25/50/75/100, reverses keyed items, averages items
  within facets and facets within domains, assigns the high symbol at 50, and
  marks 45–55 as boundary. The product requests adaptive follow-up for ties;
  boundary and code stability still require observed/simulated sensitivity.
- Quick and full share a code scheme but have materially different evidence
  density. Their agreement and authority difference have not been quantified.
- Result claims must remain descriptions of the behaviors represented by the
  included items. Occupation-like role names and broad five-letter narratives
  remain P1 human editorial review items.

## Safe changes made

1. Candidate public propagation remains blocked server-side unless both item
   and code releases are `validated` or `active`.
2. Precision facet copy was narrowed to remove unsupported claims about visible
   expression, proven effectiveness, flexible skill, and broader ability.
3. No candidate measurement artifact was promoted, rekeyed, or silently
   replaced.
