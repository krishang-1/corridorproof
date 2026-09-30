# Expansion and issue audit — 30 September 2026

Finish-and-upload target: **23:00 IST**, updated by the team after the approval-review usage limit. The previous 20:00 IST target is superseded. Official portal deadline and upload requirements still need confirmation. Recovery checkpoint: `checkpoint-before-expansion-20260930`, commit `fa52973`. Full Git bundle, source archive and local demo data are saved privately under the task's work/recovery directory. Generated network certificates/channel artifacts are separately backed up inside Ubuntu. Running database volumes are preserved in place; this is not a full disaster-recovery backup of YugabyteDB.

## Product and scope

CorridorProof is a shared exception desk for a synthetic Singapore-to-India payment corridor. It records an agreed commitment, receiver status evidence, permitted resolutions, both organizations' approvals and closure. Its bounded safeguard is that unknown outcomes and compliance blocks cannot authorize automatic refunds. Money movement and external status truth remain outside the ledger.

The source-backed problem is manual exception coordination in Nexus's documented first-release model. Swift and Nexus already have investigation tools. Our commercial hypothesis is that particular independent operators need shared governance and integration that their current workflows do not provide. No public research establishes demand for this exact product, operational savings or willingness to pay.

## Issues and decisions

| Priority | Issue | Planned intervention | Acceptance |
| --- | --- | --- | --- |
| P0 | Dashboard and live ledger are disconnected | Explicit live backend using certificate-bound Gateway; retain separately labelled local fallback | Browser command returns a VALID transaction receipt; both orgs read the resulting state |
| P0 | Browser cannot browse ledger evidence | Authorized workspace query; live evidence view/export and comparison with current ledger | Altered export fails comparison; original compares correctly; no claim of standalone block-signature proof |
| P0 | Transport failure can leave outcome uncertain | Save command/request identity before submission; retain pending outcome and allow exact replay/reconciliation | No inferred rejection or second financial execution after uncertainty |
| P0 | Demo only has fixed seeded cases | Create fresh cases with validated synthetic quotes; keep accepted terms immutable | Amount validation matches Node/Go; fresh browser flow closes under policy |
| P1 | No simultaneous conflict or restart proof | Live MVCC conflict and bounded service restart exercises | Conflicting updates do not both commit; prior case/evidence survives restart |
| P1 | Role selector may imply production authentication | Disclose local selection of generated test-network identities; derive live roles from MSP certificates | Invalid roles fail; browser header cannot become an arbitrary MSP identity |
| P1 | Queue does not support investigation work well | Status/scenario filtering, manual-review visibility, receipt inspection and explicit next-action guidance | Unknown and blocked cases remain visibly unresolved |
| P1 | Chaincode evidence lacks precise ordering/actor detail | Record transaction nanoseconds and hashed certificate identity | Evidence distinguishes institution/actor and sorts reproducibly without claiming wall-clock consensus |
| P1 | Acceptance/pitch can drift after expansion | Update mode claims, source-backed pitch, demo and reproducible validation | README/UI/deck agree on actual capabilities |
| P2 | Portal/field/deck requirements unknown | Inspect portal when URL is provided; prepare concrete upload package | Required fields/files validated and actual submission receipt obtained |

## Deliberate boundaries

This build will not invent a real NPCI/UPI endpoint, treat synthetic bank evidence as authoritative, claim atomic cross-rail settlement, make compliance-release decisions, implement production KYC, or promise independent institutional operation on one laptop. Conflict arbitration and real rail adapters require partner policies. A neutral shared database remains a valid alternative when partners accept central governance.

## Work sequence

1. Preserve checkpoint and recovery material.
2. Add live workspace queries and configurable synthetic case creation; test authorization and immutable terms.
3. Connect the backend and browser, expose commit receipts and uncertain outcomes; preserve the local fallback.
4. Run full browser scenarios, live conflict/restart checks, evidence alteration checks and fresh-clone verification.
5. Freeze the implemented scope, publish verified source and update the pitch/demo.
6. Confirm portal requirements, rehearse and finish upload before 23:00 IST.
