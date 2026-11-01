// Rovo action handlers for the Claim Buddy agent.
import { loadPolicy, runCheck, searchPendingClaims, postVerdict } from './lib/atlassian';

const keyOf = (payload) => String(payload?.issueKey || payload?.context?.jira?.issueKey || '').trim().toUpperCase();

export async function getClaimsPolicy(payload) {
  const policy = await loadPolicy(payload?.pageTitle || undefined);
  return {
    source: policy.source,
    note: policy.note,
    currency: policy.currency,
    submissionDeadlineDays: policy.submissionDeadlineDays,
    notClaimable: policy.notAllowed,
    categories: Object.values(policy.categories).map((c) => ({
      category: c.label,
      limit: isFinite(c.limit) ? c.limit : 'no limit',
      per: c.per,
      receiptRequiredAbove: isFinite(c.receiptAbove) ? c.receiptAbove : 'not required',
      needsPreApproval: !!c.needsApproval,
    })),
  };
}

export async function checkClaim(payload) {
  const issueKey = keyOf(payload);
  if (!issueKey) return { error: 'Tell me which claim to check, for example CLAIM-1.' };
  try {
    return await runCheck(issueKey);
  } catch (e) {
    return { error: e.message };
  }
}

export async function listPendingClaims(payload) {
  try {
    const keys = await searchPendingClaims(payload?.projectKey);
    const policy = await loadPolicy();
    const out = [];
    for (const k of keys.slice(0, 10)) {
      try {
        const r = await runCheck(k, policy);
        out.push({ issueKey: k, summary: r.summary, verdict: r.verdictLabel, total: r.total, allowed: r.allowed, topReason: r.reasons[0] });
      } catch (e) {
        out.push({ issueKey: k, error: e.message });
      }
    }
    return { count: out.length, claims: out, policySource: policy.source };
  } catch (e) {
    return { error: e.message };
  }
}

export async function postClaimVerdict(payload) {
  const issueKey = keyOf(payload);
  if (!issueKey) return { error: 'Which claim should I update?' };
  try {
    const check = await runCheck(issueKey);
    return await postVerdict(issueKey, payload?.verdict || check.verdict, payload?.note, check);
  } catch (e) {
    return { error: e.message };
  }
}
