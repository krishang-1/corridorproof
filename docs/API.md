# Local demo API

Origin: `http://127.0.0.1:8787`. JSON only for POST. No cross-origin command access. `X-Demo-Role: SENDER` or `RECEIVER` simulates an organization, with no authentication. Localhost boundary is mandatory.

| Method | Route | Result |
| --- | --- | --- |
| GET | `/api/health` | Actual ledger/payment modes and live-connection disclosure |
| GET | `/api/cases` | Current case snapshots |
| GET | `/api/evidence` | Signed events, public keys, head and cases |
| POST | `/api/cases/{id}/commands` | Atomic policy result and signed evidence |
| POST | `/api/verify` | Check exported bundle against this server's public keys and policy |

Command:

```json
{"requestId":"example-request-001","expectedVersion":0,"action":"OBSERVE_TIMEOUT","payload":{}}
```

Credit payload uses `{"amountMinor":620000}` for INR 6,200.00. The quote principal is SGD 100.00 plus a separately specified SGD 3.00 fee. This is a synthetic quote, not a market FX price.

Actions: `OBSERVE_TIMEOUT`, `OBSERVE_CREDIT`, `OBSERVE_REJECTION`, `OBSERVE_BLOCK`, `APPROVE_CORRECTION`, `APPROVE_REFUND`, `EXECUTE_CORRECTION`, `EXECUTE_REFUND`, `ACK_CLOSE`. Observe/execute commands represent controlled synthetic evidence, not payment execution.

Successful actions return HTTP 200 with `ok:true`, state and event. Policy denial returns HTTP 409 with `ok:false`, code and unchanged state, while persisting denial evidence. Schema/role/key conflicts return HTTP 400. Unknown case returns HTTP 404. Repeating identical content with the same role/request key returns the stored result with `replay:true`; altered content with that key is rejected. A stale version cannot change case state.

The standalone Go contract exposes `CreateCase(id,scenario)`, `ReadCase(id)` and `Command(id,json)`. Caller role derives from MSP, not arguments. Denied business commands return a successful Fabric response containing `ok:false`, so the denial can commit. A gateway caller must inspect that application result before performing any external action. Validation/unauthorized identity failures return a chaincode error.
