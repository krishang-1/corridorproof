# Three-minute demo script

Start in a fresh data directory. Keep the local mode label visible. Say “synthetic payments and simulated institution roles” before interacting.

**0:00–0:25 — Problem.** “Nexus's documentation describes manual investigations, recalls and disputes in its first release. Our prototype focuses on the evidence and approval work when a payout outcome is uncertain. Existing products such as Swift Case Management already address this category.”

**0:25–1:15 — Missing response.** Select CP-001 and Sender. Click Simulate missing response. “Unknown does not mean failed.” Click Test blocked refund. Point to the denied action and unchanged case. Switch to Receiver, record mock full credit. Both roles acknowledge and close. “Late success did not create a refund.”

**1:15–2:00 — Shortfall.** Select CP-002, Receiver, record mock shortfall. Show the INR 120 gap. Approve as Receiver and show correction execution remains unavailable until Sender approves. Switch roles, approve as Sender. Receiver records mock correction. Both acknowledge closure.

**2:00–2:30 — Evidence.** Click Verify signatures and then Test altered evidence. “This copy was altered, so verification fails. The original journal stays unchanged.” Explain that the verifier also reconstructs case state. Export JSON, point to the independent CLI verifier.

**2:30–3:00 — Governance and next gate.** “A database can implement this workflow. Drunix is useful when independent partners require joint governance instead of one operator's unilateral edit authority. Our separate certificate-bound CLI passed five scenarios with 46 VALID transactions on the local Drunix network. Show submission/drunix-live-evidence.json: transaction IDs, blocks and matching cross-organization reads. This browser demo remains local, and payment execution is synthetic. We next need a corridor partner to compare coordination effort against its existing workflow.”

Backup: CP-003 definitive rejection, dual approval, Sender mock refund, joint closure. Never claim the mock refund moved money.

Judge questions: Why not a database? What proves bank evidence true? How does a missing acknowledgment differ from rejection? What if a participant refuses approval? Why does Swift not solve this already? How do you prevent a financial side effect after an uncommitted decision? Answers are in architecture, threat model and pilot plan. Do not promise a production solution to a gap the prototype leaves open.
