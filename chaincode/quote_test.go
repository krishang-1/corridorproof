package main

import (
	"encoding/json"
	"fmt"
	"github.com/hyperledger/fabric-chaincode-go/shim"
	"github.com/hyperledger/fabric-chaincode-go/shimtest"
	pb "github.com/hyperledger/fabric-protos-go/peer"
	"os"
	"testing"
)

func TestCustomQuoteConformance(t *testing.T) {
	body, e := os.ReadFile("../test/quote-validation.json")
	if e != nil {
		t.Fatal(e)
	}
	var fixtures []struct {
		Name  string          `json:"name"`
		Valid bool            `json:"valid"`
		Quote json.RawMessage `json:"quote"`
	}
	if e = json.Unmarshal(body, &fixtures); e != nil {
		t.Fatal(e)
	}
	state, _ := newCase("CP-CUSTOM", "shortfall")
	for _, f := range fixtures {
		t.Run(f.Name, func(t *testing.T) {
			_, e := withQuote(state, f.Quote)
			if (e == nil) != f.Valid {
				t.Fatalf("valid=%v error=%v", f.Valid, e)
			}
		})
	}
}
func TestWorkspaceAndCustomCreation(t *testing.T) {
	s := shimtest.NewMockStub("corridorproof", &paginationTestContract{})
	s.Creator = creator(t, "Org1MSP")
	quote := `{"sourceCurrency":"SGD","sourceMinor":25000,"destinationCurrency":"INR","recipientMinor":1550000,"feeMinor":0,"quoteId":"Q-CUSTOM","synthetic":true}`
	invoke(t, s, "create-custom", "CreateCase", "CP-CUSTOM", "shortfall", quote)
	body := invoke(t, s, "query", "ReadWorkspace")
	var workspace struct {
		Cases  []Case           `json:"cases"`
		Events []map[string]any `json:"events"`
	}
	if e := json.Unmarshal(body, &workspace); e != nil {
		t.Fatal(e)
	}
	if len(workspace.Cases) != 1 || workspace.Cases[0].Quote.RecipientMinor != 1550000 || len(workspace.Events) != 1 || workspace.Events[0]["actorId"] == "" {
		t.Fatal(string(body))
	}
	s.Creator = creator(t, "Org2MSP")
	r := s.MockInvoke("receiver-create", [][]byte{[]byte("CreateCase"), []byte("CP-DENIED"), []byte("timeout"), []byte(quote)})
	if r.Status == 200 {
		t.Fatal("Receiver can create sender quote")
	}
}

// MockStub does not implement pagination; adapt its full iterator for this query.
type paginationTestContract struct{ Contract }

func TestWorkspaceExceedsDefaultSQLPage(t *testing.T) {
	s := shimtest.NewMockStub("corridorproof", &paginationTestContract{})
	s.Creator = creator(t, "Org1MSP")
	for i := 0; i < 12; i++ {
		invoke(t, s, fmt.Sprintf("create-%d", i), "CreateCase", fmt.Sprintf("CP-PAGE-%02d", i), "timeout")
	}
	var workspace struct {
		Cases  []Case            `json:"cases"`
		Events []json.RawMessage `json:"events"`
	}
	if err := json.Unmarshal(invoke(t, s, "read-all", "ReadWorkspace"), &workspace); err != nil {
		t.Fatal(err)
	}
	if len(workspace.Cases) != 12 || len(workspace.Events) != 12 {
		t.Fatalf("partial workspace: %d cases, %d events", len(workspace.Cases), len(workspace.Events))
	}
}

func (c *paginationTestContract) Invoke(stub shim.ChaincodeStubInterface) pb.Response {
	return c.Contract.Invoke(paginationTestStub{stub})
}

type paginationTestStub struct{ shim.ChaincodeStubInterface }

func (s paginationTestStub) GetStateByRangeWithPagination(start, end string, size int32, bookmark string) (shim.StateQueryIteratorInterface, *pb.QueryResponseMetadata, error) {
	iterator, err := s.GetStateByRange(start, end)
	return iterator, &pb.QueryResponseMetadata{}, err
}
func (s paginationTestStub) GetStateByPartialCompositeKeyWithPagination(kind string, attributes []string, size int32, bookmark string) (shim.StateQueryIteratorInterface, *pb.QueryResponseMetadata, error) {
	iterator, err := s.GetStateByPartialCompositeKey(kind, attributes)
	return iterator, &pb.QueryResponseMetadata{}, err
}
