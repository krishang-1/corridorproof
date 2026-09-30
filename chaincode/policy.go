package main

import (
	"encoding/json"
	"fmt"
)

type Quote struct {
	SourceCurrency      string `json:"sourceCurrency"`
	SourceMinor         int64  `json:"sourceMinor"`
	DestinationCurrency string `json:"destinationCurrency"`
	RecipientMinor      int64  `json:"recipientMinor"`
	FeeMinor            int64  `json:"feeMinor"`
	QuoteID             string `json:"quoteId"`
	Synthetic           bool   `json:"synthetic"`
}
type Case struct {
	ID            string   `json:"id"`
	Scenario      string   `json:"scenario"`
	Version       int64    `json:"version"`
	Status        string   `json:"status"`
	Payout        string   `json:"payout"`
	ObservedMinor int64    `json:"observedMinor"`
	Quote         Quote    `json:"quote"`
	Beneficiary   string   `json:"beneficiary"`
	Votes         []string `json:"votes"`
	Closure       []string `json:"closure"`
	Resolution    *string  `json:"resolution"`
	History       []string `json:"history"`
}
type PolicyError struct {
	Code    string
	Message string
}

func (e *PolicyError) Error() string  { return e.Code + ": " + e.Message }
func fail(code, message string) error { return &PolicyError{code, message} }
func contains(xs []string, x string) bool {
	for _, v := range xs {
		if v == x {
			return true
		}
	}
	return false
}
func newCase(id, scenario string) (Case, error) {
	if !contains([]string{"timeout", "shortfall", "rejection"}, scenario) {
		return Case{}, fail("INVALID_SCENARIO", "Unknown scenario")
	}
	return Case{ID: id, Scenario: scenario, Status: "PAYOUT_PENDING", Payout: "UNKNOWN", Quote: Quote{"SGD", 10000, "INR", 620000, 300, "Q-" + id, true}, Beneficiary: "Demo recipient •••• 2048", Votes: []string{}, Closure: []string{}, History: []string{}}, nil
}
func transition(state Case, role, action string, payload json.RawMessage) (Case, error) {
	if !contains([]string{"SENDER", "RECEIVER"}, role) {
		return state, fail("INVALID_ROLE", "Unknown organization")
	}
	if state.Status == "CLOSED" {
		return state, fail("CASE_CLOSED", "Closed case is immutable")
	}
	s := state
	s.Votes = append([]string{}, state.Votes...)
	s.Closure = append([]string{}, state.Closure...)
	receiver := func() error {
		if role != "RECEIVER" {
			return fail("ROLE_DENIED", "Receiver evidence required")
		}
		return nil
	}
	switch action {
	case "OBSERVE_TIMEOUT":
		if s.Status != "PAYOUT_PENDING" || s.Payout != "UNKNOWN" {
			return state, fail("INVALID_STATE", "Only unknown pending payout may time out")
		}
		s.Status = "RECONCILING"
	case "OBSERVE_CREDIT":
		if e := receiver(); e != nil {
			return state, e
		}
		if !contains([]string{"PAYOUT_PENDING", "RECONCILING"}, s.Status) || s.Payout != "UNKNOWN" {
			return state, fail("CONFLICTING_EVIDENCE", "Manual escalation required")
		}
		var p struct {
			Amount json.Number `json:"amountMinor"`
		}
		if e := json.Unmarshal(payload, &p); e != nil {
			return state, fail("INVALID_AMOUNT", "Integer minor units required")
		}
		amount, e := p.Amount.Int64()
		if e != nil || amount <= 0 || amount > s.Quote.RecipientMinor {
			return state, fail("INVALID_AMOUNT", "Amount outside allowed integer range")
		}
		s.ObservedMinor = amount
		s.Payout = "CREDITED"
		s.Status = "SHORTFALL"
		if amount == s.Quote.RecipientMinor {
			s.Status = "CREDITED"
		}
	case "OBSERVE_REJECTION":
		if e := receiver(); e != nil {
			return state, e
		}
		if !contains([]string{"PAYOUT_PENDING", "RECONCILING"}, s.Status) || s.Payout != "UNKNOWN" {
			return state, fail("CONFLICTING_EVIDENCE", "Definitive rejection required")
		}
		s.Payout = "REJECTED"
		s.Status = "REFUND_REVIEW"
	case "OBSERVE_BLOCK":
		if e := receiver(); e != nil {
			return state, e
		}
		if !contains([]string{"PAYOUT_PENDING", "RECONCILING"}, s.Status) {
			return state, fail("INVALID_STATE", "Only unresolved payout may be blocked")
		}
		s.Payout = "BLOCKED"
		s.Status = "MANUAL_REVIEW"
	case "APPROVE_REFUND":
		if s.Payout != "REJECTED" || !contains([]string{"REFUND_REVIEW", "REFUND_APPROVED"}, s.Status) {
			return state, fail("UNKNOWN_OR_UNSAFE", "Timeout is insufficient for refund")
		}
		if contains(s.Votes, role) {
			return state, fail("DUPLICATE_VOTE", "Already approved")
		}
		s.Votes = append(s.Votes, role)
		v := "REFUND"
		s.Resolution = &v
		if len(s.Votes) == 2 {
			s.Status = "REFUND_APPROVED"
		}
	case "APPROVE_CORRECTION":
		if s.Payout != "CREDITED" || !contains([]string{"SHORTFALL", "CORRECTION_APPROVED"}, s.Status) {
			return state, fail("INVALID_STATE", "Evidenced shortfall required")
		}
		if contains(s.Votes, role) {
			return state, fail("DUPLICATE_VOTE", "Already approved")
		}
		s.Votes = append(s.Votes, role)
		v := "CORRECTION"
		s.Resolution = &v
		if len(s.Votes) == 2 {
			s.Status = "CORRECTION_APPROVED"
		}
	case "EXECUTE_REFUND":
		if role != "SENDER" {
			return state, fail("ROLE_DENIED", "Sender records refund")
		}
		if s.Status != "REFUND_APPROVED" || len(s.Votes) != 2 || s.Payout != "REJECTED" {
			return state, fail("NOT_APPROVED", "Both approvals required")
		}
		s.Status = "REFUNDED"
	case "EXECUTE_CORRECTION":
		if e := receiver(); e != nil {
			return state, e
		}
		if s.Status != "CORRECTION_APPROVED" || len(s.Votes) != 2 {
			return state, fail("NOT_APPROVED", "Both approvals required")
		}
		s.ObservedMinor = s.Quote.RecipientMinor
		s.Status = "CREDITED"
	case "ACK_CLOSE":
		if !contains([]string{"CREDITED", "REFUNDED"}, s.Status) {
			return state, fail("UNRESOLVED", "Completed outcome evidence required")
		}
		if contains(s.Closure, role) {
			return state, fail("DUPLICATE_VOTE", "Already acknowledged")
		}
		s.Closure = append(s.Closure, role)
		if len(s.Closure) == 2 {
			s.Status = "CLOSED"
		}
	default:
		return state, fail("INVALID_ACTION", fmt.Sprintf("Unsupported action %s", action))
	}
	s.Version++
	return s, nil
}
