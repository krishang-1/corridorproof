package main

import (
	"encoding/json"
	"os"
	"testing"
)

func TestSharedConformance(t *testing.T) {
	data, e := os.ReadFile("../test/conformance.json")
	if e != nil {
		t.Fatal(e)
	}
	var fixtures []struct {
		Name  string `json:"name"`
		Steps []struct {
			Role    string          `json:"role"`
			Action  string          `json:"action"`
			Payload json.RawMessage `json:"payload"`
			Status  string          `json:"status"`
			Error   string          `json:"error"`
		} `json:"steps"`
	}
	if e = json.Unmarshal(data, &fixtures); e != nil {
		t.Fatal(e)
	}
	for _, fixture := range fixtures {
		t.Run(fixture.Name, func(t *testing.T) {
			state, _ := newCase("TEST", "timeout")
			for _, step := range fixture.Steps {
				next, e := transition(state, step.Role, step.Action, step.Payload)
				if step.Error != "" {
					p, ok := e.(*PolicyError)
					if !ok || p.Code != step.Error {
						t.Fatalf("%s: wanted %s, got %v", step.Action, step.Error, e)
					}
				} else {
					if e != nil {
						t.Fatal(e)
					}
					if next.Status != step.Status || next.Version != state.Version+1 {
						t.Fatalf("Unexpected transition %+v", next)
					}
					if next.Quote != state.Quote {
						t.Fatal("Quote changed")
					}
					state = next
				}
			}
		})
	}
}
