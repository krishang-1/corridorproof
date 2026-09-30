# Validation record

30 September 2026, local Windows execution. This record distinguishes observed results from prepared/unverified paths.

| Gate | Result |
| --- | --- |
| Node policy, journal and HTTP checks | 9 tests passed. Includes five shared conformance sequences, replay/key conflict/stale version, restart/tampering/state replay, mode/role/origin/host contract and exact mock correction/refund amounts. |
| Go deterministic policy | Five shared scenario sequences passed. |
| Go shim contract | Mock-stub authorization, durable business denial and request replay passed. |
| Go Gateway CLI | Compiled successfully using Go 1.27.1. No live connection tested. |
| Browser timeout/late-credit | Timeout, denied refund, receiver credit and two acknowledgments visibly reached CLOSED. |
| Browser shortfall | Both approvals, receiver correction and two acknowledgments visibly reached CLOSED. |
| Browser rejection/refund | Final build: receiver definitive rejection, two approvals, sender mock refund and both closure acknowledgments reached CLOSED. Eleven-event journal verification passed. Screenshot in docs/screenshots/refund-verified.jpg. |
| Browser integrity | Original export verified. Altered quote content failed verification without modifying stored journal. |
| Automated three-case demo | 20 synthetic events, all three cases CLOSED, unsafe refund denied, export verifier passed. Sample in submission/demo-evidence.json. |
| Desktop layout | Inspected at 1440×960 and 1280×720. Local mode, roles, case state and evidence visible. No horizontal overflow observed. |
| Mobile layout | CSS has responsive rules, but browser viewport control did not apply requested mobile dimensions. Mobile rendering remains unverified. |
| Drunix Linux runtime | Docker Desktop startup repaired without reset. Ubuntu WSL2 Docker `hello-world` passed with engine 28.4.0. Linux prerequisites installed; pinned Drunix source compilation and image downloads underway. Channel and chaincode deployment remain unverified. |
| GitHub publishing | Public repository published at https://github.com/krishang-1/corridorproof. Initial CI run underway. |
| Clean clone / release archive | Fresh local clone passed all nine Node tests, three-case demo check, sample export verification and server entrypoint/health/dashboard startup without packages or credentials. Source ZIP contains tracked files only. Generated keys and `.data/` are absent from tracked files. |
| Pitch deck | Eight slides exported to PPTX, package/layout/font/import checks passed. Each rendered slide inspected. Final-slide contrast corrected. Native PowerPoint/Google Slides execution untested. |

No production rail integration, endorsement benchmark, fault-tolerance exercise, vulnerability certification or partner pilot has run. The project cannot claim measured operational savings.
