package main

import (
	"encoding/json"
	"github.com/hyperledger/fabric-chaincode-go/shimtest"
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
	s := shimtest.NewMockStub("corridorproof", &Contract{})
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
