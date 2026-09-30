# Validation record

30 September 2026. All live network observations refer to the local Ubuntu/WSL2 Drunix test network with generated test identities and simulated payment rails.

| Gate | Observed result |
| --- | --- |
| Node policy, journal, HTTP and live adapter | 20 tests passed, covering shared policy conformance, local integrity, role/origin contract and persisted uncertain request handling. |
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
