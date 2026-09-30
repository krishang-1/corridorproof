# Prototype threat model and boundaries

| Risk | Implemented control | Remaining requirement |
| --- | --- | --- |
| Refund on uncertain payout | Unknown/blocked status denies refund approval | Authoritative scheme status and priority-specific reconciliation |
| Single-party financial resolution | Distinct sender/receiver votes before mock execution | Independent institutions, certificates, policy and real maker/checker access |
| Replay or stale decision | Atomic role-scoped idempotency, optimistic case versions | Independent multi-host operation, storage-fault recovery and production concurrency testing |
| Altered event or changed case summary | SHA-256 chain, Ed25519 signature, deterministic state replay | Independent trust anchors and witnessed heads |
| Rewrite entire local journal and keys | Explicitly outside demo trust model | Independent Drunix nodes, protected keys, audit replication and witnessed checkpoints |
| Truncate export and replace head | Supplied-head consistency only | External checkpoint/ledger height to establish completeness |
| Signed but false payout evidence | Origin attribution only | Bank/rail-authenticated evidence, contracts, reconciliation and disputes |
| Local role impersonation | Localhost bind, mode disclosure, cross-origin POST rejection | Real authentication, user roles, approval separation, TLS, CSRF controls before hosting |
| Sensitive financial data on channel | Synthetic recipient and amounts only | Data minimization, private collections, retention/access and jurisdiction-specific review |
| Counterparty refuses approval | Case remains unresolved | SLA, arbitration and participant-exit governance |
| External payment succeeds but acknowledgment is lost | Never infer failure from timeout | Rail idempotency, durable outbox and status inquiry. No rail worker exists in this prototype. |

No production security review or certification has been completed. Dependencies mirror official Drunix/Fabric examples for compatibility; upgrade and vulnerability review are required before a pilot. CI actions and runtime versions are pinned by major/version, not immutable supply-chain digests. No real keys or credentials belong in the repository.

## Status adapter boundary

The synthetic inbox validates identifiers, quote references, currency, amounts and allowed codes before using existing policy. It persists the original request before submission, rejects changed contents for an existing message ID, and guards concurrent requests from replacing that original record. Pending/unposted statuses and contradictory evidence are held without changing financial state. Local inbox metadata can be rewritten by the laptop operator; it is not independently witnessed evidence. Production ingress needs authenticated rail messages, protected durable storage and independent operator authentication. Dossier checksums prove content consistency only; completeness/provenance require current ledger comparison or independent trust anchors.
