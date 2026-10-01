# Validation record

Baseline 30 September 2026; overnight campaign added 1 October 2026 IST. All live network observations refer to the local Ubuntu/WSL2 Drunix test network with generated test identities and simulated payment rails.

| Gate | Observed result |
| --- | --- |
| Node policy, journal, HTTP and live adapter | 29 tests passed, covering shared policy conformance, local integrity, role/origin contract, persisted uncertain requests and overnight input/storage/recovery regressions. |
| Go chaincode | Shared scenarios, mock-stub authorization, durable denials, idempotency and bounded pagination tests passed. |
| Gateway | Windows and Linux builds passed; certificate-bound TLS submissions await VALID commit. |
| Original live CLI | Five scenarios, replay and sequential stale-version checks: 46 VALID receipts. Both organizations read matching state. `submission/drunix-live-evidence.json`. |
| Live dashboard API | Five scenarios: 36 VALID commits, matching organization reads, three resolution cases CLOSED, compliance MANUAL_REVIEW, conflicting evidence rejected. Altered and truncated exports rejected. `submission/drunix-dashboard-evidence.json`. |
| Concurrent proposals | Two proposals endorsed against the same version: one VALID, one MVCC_READ_CONFLICT. Final state changed once. `submission/drunix-resilience-evidence.json`. |
| Untrusted MSP | Real generated certificate presented under an unauthorized MSP claim was rejected. |
| Lite-peer restart | Both lite peers restarted. Both organizations returned the same 17 cases and 122 events with unchanged canonical digest at that checkpoint. This is persistence, not a complete disaster-recovery or failover test. |
| Earlier progress | All 84 distinct business-event transaction IDs from preceding recorded runs were present after recovery. No recorded earlier business event was missing. |
| Live browser | Custom SGD125 quote, fee SGD1.50, INR7500 commitment: timeout, denied refund, late full credit, one acknowledgment leaves open, both acknowledgments close. Quote unchanged. 128-record export matched current ledger; altered copy rejected. `submission/drunix-browser-evidence.json`. |
| Layout | Actual live dashboard inspected at 1280×800 and restored default width about 614 pixels; no page horizontal overflow. Narrow layout stacks case queue and detail. |
| Local fallback | Earlier clean clone passed local test/demo/export/server startup. Local mode remains explicit and separate from Drunix. |
| Pitch | Ten-slide expanded PPTX and PDF, all rendered slides inspected. PPTX package, font, geometry and import checks passed. Native PowerPoint/Google Slides execution untested. |

## Infrastructure disclosure

Source pinned to `ddc0eae778158d3f8a96605cfeda383ae5eafcfc`. Explicit workspace pagination revealed two upstream SQL bookmark defects. Public patches guard an empty next-row result and use the encoded namespace key. The patched peer binary is installed in both existing lite containers; its SHA-256 is `92a9f9bbc93ef4b18fa1918741af99f5f5ddea199be669ad3f138799e2932db4`. Recreating from the original container image requires reapplying/rebuilding the repair. This is not a stock-unmodified Drunix claim.

Workspace exports fail at the 1,000-record boundary. The live verifier compares with a current authenticated query; it does not verify offline block signatures, inclusion proofs or independently witnessed completeness. Private runtime keys, generated organizations and request state remain ignored by Git.

No production rail integration, national-scale benchmark, institutional independence, security certification or partner pilot has run. Operational savings and willingness to pay remain unvalidated.

## Operations expansion

The existing financial chaincode is unchanged. Seven added Node checks cover status normalization/reference binding, durable exact replay and content conflicts, held observations without mutation, concurrent message-ID reuse, missing owners/ageing, complete dossier context, organization mismatch and HTTP integration.

`submission/drunix-operations-evidence.json` records the live adapter path: pending held with case version unchanged; partial credit normalized and committed VALID; exact replay without duplicate mutation; altered message-ID contents rejected; contradictory rejection held; INR120 exact shortfall; held-conflict review lane; case dossier retaining report digest and full workspace; matching fresh organization reads. Local inbox dispositions are not Drunix commits.

README diagrams describe existing market context, proposed integration boundaries, illustrative before/after, detailed architecture, status intake and financial lifecycle. External rail connectors remain dashed/planned. Operational savings and independent institution ownership remain untested.

Browser acceptance also retained a pending report with unchanged version, recorded a full-credit report through the adapter with a VALID commit receipt, and compared matching Org1/Org2 snapshots (133 events at that checkpoint). See `submission/drunix-operations-browser-evidence.json`. Case dossier contents passed API checks; browser download-event capture was unavailable, so automated browser download completion is not claimed.

## Overnight campaign: first two profiles, 1 October 2026 IST

The new regression file initially failed three tests, exposing inherited-property message-ID collisions and malformed-root handling; negative-version validation was also aligned between local and live adapters. After fixes, all 24 Node tests passed. The recovery test injected commit success followed by acknowledgment loss in 24 timing variants; restarting both inbox and live adapter recovered the exact command without a duplicate business event.

| Isolated profile | Policy attempts / seeds | Accepted / denied | HTTP cases / requests / concurrency | HTTP p95 / p99 / maximum |
| --- | --- | --- | --- | --- |
| Seeds 1–512 | 40,960 / 512 | 17,617 / 23,343 | 163 / 480 / 8 | 68.31 / 105.31 / 128.38 ms |
| Seeds 10,001–10,512 | 40,960 / 512 | 17,749 / 23,211 | 323 / 960 / 12 | 262.95 / 425.86 / 562.00 ms |

All declared invariants passed, all modeled financial statuses were visited, read/noise HTTP load left the journal unchanged, and its signed integrity check passed. Across the profiles, 288 malformed HTTP requests returned the expected client error; none of the 1,440 requests timed out. The policy sample targets normal choices 60% of the time when available; terminal-state denial checks raise the realized adversarial proportion to about 59%. Some adversarial selections are valid actions. These are synthetic transition attempts, not 81,920 independent end-to-end payments or proof against every possible input.

Timings include client JSON parsing, server work and local contention. Both case count and concurrency changed between profiles, and the second overlapped a live smoke check, so these figures cannot isolate a bottleneck or establish production capacity. The large runs used separate temporary local stores and did not load-test the live chain.

A modest live status-adapter smoke checkpoint passed after the server restart, including pending holds, valid partial credit, exact replay, changed-ID-content rejection, conflicting evidence holds and matching organization views at 135 events. Earlier evidence files were preserved. See `submission/drunix-overnight-smoke-20261001-01.json`, `submission/simulation-campaign-20261001-01.json`, and `submission/simulation-campaign-20261001-02.json`.

The bounded campaign is now included in CI with smaller HTTP fixtures. The continuation queue and controls are in [OVERNIGHT-CAMPAIGN.md](OVERNIGHT-CAMPAIGN.md). Browser rendering under larger queues, cross-process storage races, hardware/storage failure, independent infrastructure and real rail execution remain separate unperformed checks.

## Storage-fault wave, 1 October 2026

An injected failure of the inbox temporary-file write reproduced a real defect: the first call failed safely, but retrying the in-memory PREPARED record skipped the original-command save and could mutate payment state while storage remained unavailable. The fix saves the exact command before every submission/reconciliation attempt. A regression now checks three blocked attempts with no journal mutation, successful recovery once storage returns, and replay after restart.

Existing adapter files now reject malformed roots, malformed records and inconsistent request/report bindings with `ADAPTER_STATE_INVALID`, preserving the original file. Tests cover sixteen malformed-file cases and four changed inbox bindings. A compatibility regression retains earlier inbox files that stored the version only inside the original command. Copies of the existing eleven live inbox records and seventy-seven live request records loaded successfully without touching their source files.

All 27 Node tests passed. A fresh isolated profile (seeds 20,001–20,128, 100 steps each) passed 12,800 attempts: 5,537 accepted and 7,263 denied. Its 243-case HTTP fixture completed 600 requests at concurrency ten, including 120 expected malformed-input rejections, without timeouts or journal mutation. Measured p95 was 244.46 ms, p99 313.82 ms and maximum 381.30 ms. See `submission/simulation-campaign-20261001-03.json`. This adds coverage at a different seed range and sequence length; it is not a live-chain throughput measurement.

File validation detects structural and binding inconsistencies, not an operator rewriting files and recomputing checksums. Missing files still initialize a fresh adapter; therefore backups and controlled storage directories remain essential. Atomic rename is not a claim of fsync-backed power-loss durability, multi-process coordination or production disaster recovery.

Only the Node application was restarted to load these changes; existing live containers and volumes were preserved. The synthetic smoke passed create/partial-credit VALID receipts, pending hold, exact replay, changed-message rejection, conflict hold and dossier assertions. Its final comparison returned no `matched` property and failed the run; the initial response body was not retained, so the cause remains unconfirmed. Two subsequent authenticated comparisons matched at 137 events, and the same case dossier was rechecked without replacement writes. `submission/drunix-storage-wave-smoke-20261001.json` distinguishes that initial failure from the successful follow-up. This is not a clean uninterrupted availability result.

## Report-order and advanced-recovery wave, 1 October 2026

`npm run test:report-order` exhausts all 120 permutations of PDNG, ACWP, ACCC, RJCT and BLCK in four profiles: serial/burst, full/partial credit. The isolated fixture uses 480 cases and varies quoted INR amounts across 2, 620,000 and 1,000,000,000,000 minor units. Burst delivery includes duplicate messages and deterministic 0–3 ms command delays; all previews see version zero. Each profile restarts the inbox and retries every original report.

All 6,000 ordinary report attempts passed the declared checks. Initial results were 480 accepted observations, 1,920 held responses, 720 in-flight duplicate responses and 480 durable stale-version denials. Restart retries included 960 original-result replays, with no additional journal events. Separate probes rejected 480 changed-credit contents and 480 wrong-quote references; 320 attempted refund approvals in credited/blocked cases were denied without changing case version. The final 1,760-event journal verified against fixture keys. Attempt counts exclude the separate probes and are not independent payment counts. See `submission/report-order-campaign-20261001.json`.

The full Node suite passed 28 tests. The added recovery test contains twelve timing variants: an acknowledgment is lost after credit commits, another simulated actor adds one or both closure acknowledgments, then both adapters restart. Reconciliation returns the original version-one result without changing the later case state or adding another event; a subsequent replay needs no gateway call. Returned replay state is the historical command result, so operators must refresh the case for its current state.

No application defect was reproduced in this wave and no financial permissions were changed. Coverage confirms the documented boundary: the first accepted definitive observation wins, later contradictions are held or denied, and local conflict flags do not adjudicate evidence truth or freeze ledger permissions. Real authenticated ingress, governed disputes and multi-process concurrency remain unperformed architecture work. Live containers and runtime records were untouched. The exhaustive order campaign is included in CI.

## Mixed-state refresh wave, 1 October 2026

Browser control timed out on both initial connection and a bounded retry. Consequently this wave does **not** claim large-queue browser rendering, viewport layout, visual inspection or click responsiveness. Earlier small-queue layout checks remain the only recorded visual evidence.

The independent API fixture (`npm run test:mixed-refresh`) contains 120 cases across pending, blocked, shortfall, refund review and two completed workflows: 80 open, 40 closed, 120 held inbox reports and 360 signed journal events. Twelve refreshes run in overlapping sender/receiver pairs, fetching the six dashboard endpoints, followed by twelve selected-case dossier reads. All 84 requests succeeded; each refresh checked the exact snapshot, operations counts, inbox and selected dossier. Case state and journal head remained unchanged, and the export verified.

Across the 72 refresh-endpoint requests at maximum concurrency twelve, p50 was 90.83 ms, p95 445.72 ms and maximum 447.96 ms. Dossier reads are checked separately and excluded from these timing percentiles. The figures include parsing and machine contention; they are not browser rendering latency, production capacity or live Drunix load. See `submission/mixed-refresh-campaign-20261001.json`. This profile is now in CI. No application defect was reproduced; no financial permissions were changed.

`node scripts/live-read-diagnostics.js` samples four sequential read-only organization comparisons and records HTTP status, error classification, counts and digests before judging success. It omits raw gateway diagnostics/private runtime paths. Optional `CP_READ_OUTPUT` saves the inspected result. The existing live smoke also includes these comparison classifications in a failed assertion. These changes improve future failure evidence; they cannot reconstruct the discarded earlier response.

The recorded four comparisons all returned HTTP 200 and matching digests at 137 events, with zero retries and no writes/restarts. Individual elapsed times were 8,861.83, 3,794.75, 1,604.41 and 1,433.05 ms. Four observations are insufficient to estimate a tail SLA or attribute the variability to caching, resource pressure or network behavior. See `submission/live-read-diagnostics-20261001.json`; the earlier transient failure remains unexplained.

## Post-commit result-storage boundary, 1 October 2026

The added storage regression injects a real temporary-file write obstruction **after** the command is recorded, rather than before preparation or by dropping a gateway acknowledgment. Twelve isolated variants cover local inbox, simulated live inbox and simulated live request-record persistence; each profile has accepted and stale-version-denied commands with short timing variation.

Each first call fails while the persisted inbox retains the original version-zero PREPARED command. Another simulated actor advances the ledger case. After removing the obstruction and restarting the relevant adapters, replay retrieves the original accepted/denied result without changing that later case state or signed journal head. Repeating the report remains idempotent. All twelve variants and the full 29-test Node suite passed. The fixture did not restart live Drunix, touch live bookkeeping or introduce financial permission changes; no new defect was reproduced.

This closes the modeled post-commit file-write interruption gap. It does not test an OS/power crash during rename, storage-device durability, missing-file restoration or distributed transactions. Remaining large-queue browser checks are still blocked by browser-control timeouts. Completed profiles should not be repeated merely to inflate campaign counts.
