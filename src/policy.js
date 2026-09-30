export const ROLES = ['SENDER', 'RECEIVER'];
export class PolicyError extends Error { constructor(code, message) { super(message); this.code = code; } }
const requireRule = (ok, code, message) => { if (!ok) throw new PolicyError(code, message); };
const clone = value => structuredClone(value);
export function createCase(id, scenario = 'timeout', quoteInput) {
  requireRule(typeof id === 'string' && /^[A-Za-z0-9_-]{1,100}$/.test(id), 'INVALID_CASE_ID', 'Use a case ID with letters, numbers, dash or underscore');
  requireRule(['timeout','shortfall','rejection'].includes(scenario), 'INVALID_SCENARIO', 'Unknown scenario');
  const quote = quoteInput === undefined ? { sourceCurrency: 'SGD', sourceMinor: 10000, destinationCurrency: 'INR', recipientMinor: 620000, feeMinor: 300, quoteId: `Q-${id}`, synthetic: true } : clone(quoteInput);
  requireRule(quote && quote.sourceCurrency === 'SGD' && quote.destinationCurrency === 'INR' && quote.synthetic === true,
    'INVALID_QUOTE', 'This prototype accepts synthetic SGD to INR quotes only');
  requireRule(['sourceMinor','recipientMinor','feeMinor'].every(k => Number.isSafeInteger(quote[k]) && quote[k] >= 0 && quote[k] <= 1000000000000)
    && quote.sourceMinor > 0 && quote.recipientMinor > 0 && typeof quote.quoteId === 'string' && /^[A-Za-z0-9_-]{1,102}$/.test(quote.quoteId),
    'INVALID_QUOTE', 'Supply positive principal and recipient amounts, a non-negative fee, and a valid quote reference');
  return { id, scenario, version: 0, status: 'PAYOUT_PENDING', payout: 'UNKNOWN', observedMinor: 0,
    quote: { sourceCurrency:quote.sourceCurrency, sourceMinor:quote.sourceMinor, destinationCurrency:quote.destinationCurrency, recipientMinor:quote.recipientMinor, feeMinor:quote.feeMinor, quoteId:quote.quoteId, synthetic:true },
    beneficiary: 'Demo recipient •••• 2048', votes: [], closure: [], resolution: null, history: [] };
}
export function transition(current, role, action, payload = {}) {
  requireRule(ROLES.includes(role), 'INVALID_ROLE', 'Sender or receiver role required');
  const s = clone(current);
  const receiver = () => requireRule(role === 'RECEIVER', 'ROLE_DENIED', 'Only receiver operations can submit payout evidence');
  const active = () => requireRule(s.status !== 'CLOSED', 'CASE_CLOSED', 'Closed case is immutable');
  active();
  switch (action) {
    case 'OBSERVE_TIMEOUT':
      requireRule(s.status === 'PAYOUT_PENDING' && s.payout === 'UNKNOWN', 'INVALID_STATE', 'Only an unknown pending payout can time out');
      s.status = 'RECONCILING'; break;
    case 'OBSERVE_CREDIT': {
      receiver();
      requireRule(['PAYOUT_PENDING','RECONCILING'].includes(s.status) && s.payout === 'UNKNOWN', 'CONFLICTING_EVIDENCE', 'Conflicting or final payout evidence requires manual escalation');
      const amount = payload.amountMinor;
      requireRule(Number.isSafeInteger(amount) && amount > 0 && amount <= s.quote.recipientMinor, 'INVALID_AMOUNT', 'Amount must be positive integer INR minor units, at most the quoted amount');
      s.observedMinor = amount; s.payout = 'CREDITED';
      s.status = amount === s.quote.recipientMinor ? 'CREDITED' : 'SHORTFALL'; break;
    }
    case 'OBSERVE_REJECTION':
      receiver(); requireRule(['PAYOUT_PENDING','RECONCILING'].includes(s.status) && s.payout === 'UNKNOWN', 'CONFLICTING_EVIDENCE', 'Only definitive rejection of an unknown payout allows refund review');
      s.payout = 'REJECTED'; s.status = 'REFUND_REVIEW'; break;
    case 'OBSERVE_BLOCK':
      receiver(); requireRule(['PAYOUT_PENDING','RECONCILING'].includes(s.status), 'INVALID_STATE', 'Only an unresolved payout may be blocked');
      s.payout = 'BLOCKED'; s.status = 'MANUAL_REVIEW'; break;
    case 'APPROVE_REFUND':
      requireRule(s.payout === 'REJECTED' && ['REFUND_REVIEW','REFUND_APPROVED'].includes(s.status), 'UNKNOWN_OR_UNSAFE', 'Refund requires definitive rejection; timeout or compliance block is insufficient');
      requireRule(!s.votes.includes(role), 'DUPLICATE_VOTE', 'This organization already approved');
      s.votes.push(role); s.resolution = 'REFUND'; if (s.votes.length === 2) s.status = 'REFUND_APPROVED'; break;
    case 'APPROVE_CORRECTION':
      requireRule(['SHORTFALL','CORRECTION_APPROVED'].includes(s.status) && s.payout === 'CREDITED', 'INVALID_STATE', 'Correction requires evidenced recipient shortfall');
      requireRule(!s.votes.includes(role), 'DUPLICATE_VOTE', 'This organization already approved');
      s.votes.push(role); s.resolution = 'CORRECTION'; if (s.votes.length === 2) s.status = 'CORRECTION_APPROVED'; break;
    case 'EXECUTE_REFUND':
      requireRule(role === 'SENDER', 'ROLE_DENIED', 'Sender records the mock refund');
      requireRule(s.status === 'REFUND_APPROVED' && s.votes.length === 2 && s.payout === 'REJECTED', 'NOT_APPROVED', 'Refund needs both approvals and definitive rejection');
      s.status = 'REFUNDED'; break;
    case 'EXECUTE_CORRECTION':
      receiver(); requireRule(s.status === 'CORRECTION_APPROVED' && s.votes.length === 2, 'NOT_APPROVED', 'Correction needs both approvals');
      s.observedMinor = s.quote.recipientMinor; s.status = 'CREDITED'; break;
    case 'ACK_CLOSE':
      requireRule(['CREDITED','REFUNDED'].includes(s.status), 'UNRESOLVED', 'Evidence of full credit or completed refund is required');
      requireRule(!s.closure.includes(role), 'DUPLICATE_VOTE', 'This organization already acknowledged');
      s.closure.push(role); if (s.closure.length === 2) s.status = 'CLOSED'; break;
    default: throw new PolicyError('INVALID_ACTION', 'Unsupported action');
  }
  s.version++;
  return s;
}
export const ACTIONS = ['OBSERVE_TIMEOUT','OBSERVE_CREDIT','OBSERVE_REJECTION','OBSERVE_BLOCK','APPROVE_REFUND','APPROVE_CORRECTION','EXECUTE_REFUND','EXECUTE_CORRECTION','ACK_CLOSE'];
