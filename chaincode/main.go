package main

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"github.com/hyperledger/fabric-chaincode-go/pkg/cid"
	"github.com/hyperledger/fabric-chaincode-go/shim"
	pb "github.com/hyperledger/fabric-protos-go/peer"
	"regexp"
)

type Contract struct{}
type Command struct {
	RequestID       string          `json:"requestId"`
	ExpectedVersion int64           `json:"expectedVersion"`
	Action          string          `json:"action"`
	Payload         json.RawMessage `json:"payload"`
}
type Result struct {
	OK            bool   `json:"ok"`
	Code          string `json:"code,omitempty"`
	Message       string `json:"message,omitempty"`
	State         Case   `json:"state"`
	TransactionID string `json:"transactionId"`
}
type Replay struct {
	Fingerprint string          `json:"fingerprint"`
	Result      json.RawMessage `json:"result"`
}

var identifier = regexp.MustCompile(`^[A-Za-z0-9_-]{1,100}$`)
var requestKey = regexp.MustCompile(`^[A-Za-z0-9_-]{8,100}$`)

func roleOf(stub shim.ChaincodeStubInterface) (string, error) {
	msp, e := cid.GetMSPID(stub)
	if e != nil {
		return "", e
	}
	switch msp {
	case "Org1MSP":
		return "SENDER", nil
	case "Org2MSP":
		return "RECEIVER", nil
	}
	return "", fmt.Errorf("MSP not authorized")
}
func (c *Contract) Init(stub shim.ChaincodeStubInterface) pb.Response { return shim.Success(nil) }
func (c *Contract) Invoke(stub shim.ChaincodeStubInterface) pb.Response {
	role, e := roleOf(stub)
	if e != nil {
		return shim.Error(e.Error())
	}
	fn, args := stub.GetFunctionAndParameters()
	switch fn {
	case "CreateCase":
		if role != "SENDER" || (len(args) != 2 && len(args) != 3) || !identifier.MatchString(args[0]) {
			return shim.Error("Sender, case ID and scenario required")
		}
		key := "case:" + args[0]
		existing, e := stub.GetState(key)
		if e != nil {
			return shim.Error(e.Error())
		}
		if existing != nil {
			return shim.Error("Case already exists")
		}
		state, e := newCase(args[0], args[1])
		if e != nil {
			return shim.Error(e.Error())
		}
		if len(args) == 3 {
			state, e = withQuote(state, []byte(args[2]))
			if e != nil {
				return shim.Error(e.Error())
			}
		}
		body, _ := json.Marshal(state)
		if e = stub.PutState(key, body); e != nil {
			return shim.Error(e.Error())
		}
		if e = record(stub, args[0], role, "QUOTE_ACCEPTED", json.RawMessage(body)); e != nil {
			return shim.Error(e.Error())
		}
		return shim.Success(body)
	case "ReadCase":
		if len(args) != 1 {
			return shim.Error("Case ID required")
		}
		body, e := stub.GetState("case:" + args[0])
		if e != nil {
			return shim.Error(e.Error())
		}
		if body == nil {
			return shim.Error("Case not found")
		}
		return shim.Success(body)
	case "ReadWorkspace":
		if len(args) != 0 {
			return shim.Error("No arguments expected")
		}
		cases := []Case{}
		// Drunix SQL defaults unpaginated scans to ten rows. Use an explicit
		// bounded page and fail rather than silently presenting a partial export.
		const workspaceLimit int32 = 1000
		iter, _, e := stub.GetStateByRangeWithPagination("case:", "case;", workspaceLimit, "")
		if e != nil {
			return shim.Error(e.Error())
		}
		defer iter.Close()
		for iter.HasNext() {
			row, e := iter.Next()
			if e != nil {
				return shim.Error(e.Error())
			}
			var state Case
			if e = json.Unmarshal(row.Value, &state); e != nil {
				return shim.Error(e.Error())
			}
			cases = append(cases, state)
		}
		events := []json.RawMessage{}
		ei, _, e := stub.GetStateByPartialCompositeKeyWithPagination("evidence", []string{}, workspaceLimit, "")
		if e != nil {
			return shim.Error(e.Error())
		}
		defer ei.Close()
		for ei.HasNext() {
			row, e := ei.Next()
			if e != nil {
				return shim.Error(e.Error())
			}
			events = append(events, json.RawMessage(row.Value))
		}
		if len(cases) >= int(workspaceLimit) || len(events) >= int(workspaceLimit) {
			return shim.Error("WORKSPACE_LIMIT: narrow the workspace before exporting; a complete export is not available")
		}
		body, e := json.Marshal(struct {
			Cases  []Case            `json:"cases"`
			Events []json.RawMessage `json:"events"`
		}{cases, events})
		if e != nil {
			return shim.Error(e.Error())
		}
		return shim.Success(body)
	case "Command":
		if len(args) != 2 || !identifier.MatchString(args[0]) {
			return shim.Error("Case ID and JSON command required")
		}
		var input Command
		if e = json.Unmarshal([]byte(args[1]), &input); e != nil || !requestKey.MatchString(input.RequestID) {
			return shim.Error("Valid JSON and requestId required")
		}
		var fields map[string]json.RawMessage
		if e = json.Unmarshal([]byte(args[1]), &fields); e != nil || fields["expectedVersion"] == nil || string(fields["expectedVersion"]) == "null" || input.ExpectedVersion < 0 || input.Action == "" {
			return shim.Error("Explicit non-negative expectedVersion and action required")
		}
		// Hash original command bytes; retry the exact serialized command on uncertain transport outcomes.
		sum := sha256.Sum256([]byte(args[0] + "\x00" + role + "\x00" + args[1]))
		fingerprint := hex.EncodeToString(sum[:])
		replayKey := "request:" + role + ":" + input.RequestID
		prior, e := stub.GetState(replayKey)
		if e != nil {
			return shim.Error(e.Error())
		}
		if prior != nil {
			var r Replay
			if e = json.Unmarshal(prior, &r); e != nil {
				return shim.Error(e.Error())
			}
			if r.Fingerprint != fingerprint {
				return shim.Error("IDEMPOTENCY_CONFLICT")
			}
			return shim.Success(r.Result)
		}
		body, e := stub.GetState("case:" + args[0])
		if e != nil || body == nil {
			return shim.Error("Case not found")
		}
		var state Case
		if e = json.Unmarshal(body, &state); e != nil {
			return shim.Error(e.Error())
		}
		var next Case
		var policyErr error
		if input.ExpectedVersion != state.Version {
			policyErr = fail("STALE_VERSION", "Refresh case before acting")
		} else {
			next, policyErr = transition(state, role, input.Action, input.Payload)
		}
		result := Result{OK: policyErr == nil, State: state, TransactionID: stub.GetTxID()}
		eventType := input.Action
		if policyErr != nil {
			p, ok := policyErr.(*PolicyError)
			if !ok {
				return shim.Error(policyErr.Error())
			}
			result.Code = p.Code
			result.Message = p.Message
			eventType = "COMMAND_REJECTED"
		} else {
			result.State = next
			body, _ = json.Marshal(next)
			if e = stub.PutState("case:"+args[0], body); e != nil {
				return shim.Error(e.Error())
			}
		}
		// Denied business actions return a successful transaction envelope, so their denial evidence can commit.
		resultBytes, _ := json.Marshal(result)
		eventPayload, _ := json.Marshal(struct {
			Command Command `json:"command"`
			Result  Result  `json:"result"`
		}{input, result})
		if e = record(stub, args[0], role, eventType, eventPayload); e != nil {
			return shim.Error(e.Error())
		}
		replayBytes, _ := json.Marshal(Replay{fingerprint, resultBytes})
		if e = stub.PutState(replayKey, replayBytes); e != nil {
			return shim.Error(e.Error())
		}
		return shim.Success(resultBytes)
	default:
		return shim.Error("Unknown function")
	}
}
func record(stub shim.ChaincodeStubInterface, id, role, kind string, payload json.RawMessage) error {
	timestamp, e := stub.GetTxTimestamp()
	if e != nil {
		return e
	}
	actor, e := cid.GetID(stub)
	if e != nil {
		return e
	}
	actorHash := sha256.Sum256([]byte(actor))
	key, e := stub.CreateCompositeKey("evidence", []string{id, stub.GetTxID()})
	if e != nil {
		return e
	}
	body, e := json.Marshal(struct {
		CaseID        string          `json:"caseId"`
		Role          string          `json:"role"`
		Type          string          `json:"type"`
		TransactionID string          `json:"transactionId"`
		Seconds       int64           `json:"seconds"`
		Nanos         int32           `json:"nanos"`
		ActorID       string          `json:"actorId"`
		Payload       json.RawMessage `json:"payload"`
	}{id, role, kind, stub.GetTxID(), timestamp.Seconds, timestamp.Nanos, hex.EncodeToString(actorHash[:]), payload})
	if e != nil {
		return e
	}
	if e = stub.PutState(key, body); e != nil {
		return e
	}
	return stub.SetEvent("CaseEvidence", body)
}
func main() {
	if e := shim.Start(&Contract{}); e != nil {
		fmt.Printf("Chaincode start failed: %s\n", e)
	}
}
