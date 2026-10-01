# Overnight reliability campaign

User authorized varied-input simulations, controlled noise, concurrency, recovery, responsiveness checks, fixes and verified GitHub pushes. First scheduled continuation is **1 October 2026 at 01:33 IST**, followed by hourly overnight continuations through 06:33. Respect any later user freeze time or deadline. Scheduling a retry does not prove a usage reset or guarantee that a powered-off application runs.

## Working rules

- Preserve the submission checkpoint `2cc288f` and existing live evidence. Use isolated temporary stores for large/noisy runs, bounded workloads and reproducible seeds.
- Mix successful workflows with faults. Default policy sampling targets normal commands 60% of the time; terminal states also receive denied attempts before a new case. Report realized counts, rather than calling every adversarial sample invalid.
- Check immutable accepted quotes, amounts in integer minor units, no mutation on denial, correct approval/closure counts, no unsafe refund on unknown/blocked credit, deterministic replay and exact recovery.
- Measure localhost response distributions under bounded concurrency. Keep local HTTP, browser rendering and live Drunix measurements separate.
- Treat a failure as a reproduction to investigate, not permission to weaken policy or delete state. Save the seed/request, write a regression, fix the confirmed cause, and run relevant checks before publishing.
- Do not repeatedly run identical passed checks without new changes, a new workload profile or an unresolved question. Stop manufacturing scope when meaningful coverage is complete.

## Commands

`npm test` runs conformance, HTTP, persistence, inbox concurrency and injected gateway recovery checks.

`npm run test:campaign` runs 512 seeded workloads of 80 attempts each, then 480 localhost requests at concurrency eight against 163 synthetic cases. Optional environment variables: `CP_SIM_FIRST_SEED`, `CP_SIM_SEEDS`, `CP_SIM_STEPS`, `CP_SIM_CASES`, `CP_SIM_HTTP_REQUESTS`, `CP_SIM_CONCURRENCY`, and `CP_SIM_OUTPUT`. Inputs are bounded by the script. Set output to a named file under `submission/` only for an inspected, publishable evidence checkpoint.

## Findings and continuation queue

First review reproduced valid message-ID collisions with inherited JavaScript properties, non-object JSON reaching implementation exceptions, and inconsistent negative-version validation in the local adapter. Regression tests cover the fixes. Injected commit-success/lost-acknowledgment recovery already passed 24 timing variants across both adapter restarts without duplicate business events.

Next runs should inspect the current evidence and Git state, then select a useful remaining profile:

1. Additional seed ranges and amount boundaries; report realized success/fault coverage.
2. Concurrent duplicate, stale-preview and out-of-order synthetic reports, including uncertain/invalid commit recovery; corrupted bookkeeping should fail closed rather than invent evidence.
3. Bounded HTTP contention and malformed transport requests, with measured response distributions and state-integrity checks.
4. Browser rendering and usability at narrow/wide viewports with a bounded large case queue; use the computer-use skill and restore temporary viewport overrides.
5. Modest live Drunix adapter smoke scenarios and current authenticated views, keeping synthetic evidence explicit. Never treat isolated load as live-chain throughput.
6. Inspect faults in storage/restarts, add regressions for real gaps, and update the limits register. Transactional cross-process adapter storage and production message authentication remain separate architecture work, not properties supplied by a passing simulation.

Push only verified changes to `https://github.com/krishang-1/corridorproof` with account `krishang-1`; publish no private runtime data or generated keys. Preserve containers and volumes. Do not submit to the portal. A shadow pilot, real funds and regulatory authority remain untested.

## Published first-wave checkpoints

Two seed ranges (1–512 and 10,001–10,512) passed 81,920 total policy attempts. The isolated HTTP profiles completed 1,440 requests, including 288 expected malformed-input rejections, with no timeouts or journal mutations. Four added regression tests bring the suite to 24 tests; one contains 24 injected lost-acknowledgment timing variants. A modest live smoke passed at 135 events after loading the fixes. See VALIDATION.md and the three dated evidence JSON files. Next prioritize a different fault or browser profile, not an identical replay of these passed runs.

## Storage-fault continuation

Confirmed and repaired the retry-after-failed-prepare gap. Existing corrupt adapter files fail closed with preserved contents; legacy version placement remains compatible. Three regressions bring the suite to 27 tests. Copies of live metadata passed compatibility checks. A third profile used seeds 20,001–20,128 with 100 steps and 600 HTTP requests at concurrency ten: all invariants passed. Results and limitations are in VALIDATION.md and `submission/simulation-campaign-20261001-03.json`.

Do not rerun these exact passed profiles merely to increase counts. Next prioritize bounded browser queue rendering or a materially different concurrent/out-of-order sequence. Preserve the older live metadata format; absence of a duplicated top-level version is not evidence of corruption when the original command has its valid version.

## Report-order continuation

All 120 orderings of the five modeled report codes passed serial/burst and full/partial-credit profiles: 480 isolated cases, 6,000 initial/retry report attempts, exact restart replay and separate content/reference/refund probes. Run with `npm run test:report-order`; optional `CP_ORDER_OUTPUT` saves the inspected report. Twelve added lost-ack variants cover case advancement or closure before reconciliation; the suite now has 28 tests. No new application defect was found. See VALIDATION.md and `submission/report-order-campaign-20261001.json`.

Next useful remaining profile is browser rendering/usability with a bounded large queue. Do not repeat seed/order coverage or live writes simply to fill scheduled time. The prior transient live comparison failure remains unexplained; any future live smoke must retain the HTTP status and diagnostic body on failure before attempting follow-up reads.

## Mixed-state refresh continuation

Two browser-control entry calls timed out. Large-queue visual acceptance remains blocked on browser-control availability; do not describe API tests as screenshots or rendering checks. An isolated 120-case mixed-state fixture passed twelve overlapping six-endpoint refreshes and twelve dossier reads without state/head mutation. Run `npm run test:mixed-refresh`; optional `CP_MIXED_OUTPUT` saves the inspected result. See VALIDATION.md and `submission/mixed-refresh-campaign-20261001.json`.

A bounded read-only diagnostic script now retains HTTP status and comparison classifications before evaluating success; no live write or restart is needed. Earlier transient comparison failure remains unconfirmed. The completed policy, order, storage/recovery and API profiles should not be repeated merely to fill scheduled time. Resume visual checks only when browser control is available; real rail, infrastructure independence and transactional multi-worker storage require new architecture/partner work outside this bounded campaign.

## Post-commit storage continuation

Twelve isolated accepted/denied variants passed result-file write interruptions after commit across local inbox, simulated live inbox and simulated live request-record persistence. Original commands recovered after both adapter restart and later case advancement, with unchanged later state and journal head. The full suite now has 29 passing tests. No application defect was found and live runtime state was untouched; see VALIDATION.md and the final test in `test/storage-faults.test.js`.

Available bounded backend campaign coverage is complete. Do not invent further changes or repeat passed profiles. Only resume for a confirmed new defect, user steering, or restored browser-control availability to finish the outstanding visual checks. Keep the earlier unexplained live comparison failure and production limits visible.

## Visual acceptance completed

Browser control recovered on the next check. The 120-case isolated fixture reproduced long-reference wrapping defects and extra mobile queue-card margin. CSS fixes passed actual visual and geometry checks at 320, 390 and 1280 px, with filters, selection, receiver role switching and selection retention on refresh. No journal-head mutation occurred; the export verified. The test tab was closed and viewport overrides reset. See VALIDATION.md, `submission/browser-queue-check-20261001.json`, the two screenshots and `scripts/browser-queue-fixture.js`.

The bounded overnight campaign is complete, including its previously blocked visual fixture. Further scheduled runs should remain quiet when Git/evidence and user instructions are unchanged. Resume only for user steering or a confirmed new defect; do not manufacture scope or repeat passed simulations. The earlier transient live comparison failure remains unexplained, with diagnostic capture now available. Production integration, dispute governance, independent infrastructure and power-loss/multi-worker durability remain explicit limits.
