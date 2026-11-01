import * as forgeApi from '@forge/api';
const { route } = forgeApi;
const api = { asApp: forgeApi.asApp, asUser: forgeApi.asUser };
import { DEFAULT_POLICY, parsePolicyFromStorage, adfToText, parseClaimItems, checkClaim, summarise, VERDICT_LABEL } from './policy';

const POLICY_TITLE = 'Claims Policy';

export async function loadPolicy(pageTitle = POLICY_TITLE) {
  try {
    const res = await api.asApp().requestConfluence(
      route`/wiki/api/v2/pages?title=${pageTitle}&body-format=storage&limit=1`,
      { headers: { Accept: 'application/json' } }
    );
    if (!res.ok) return { ...DEFAULT_POLICY, note: `Confluence not reachable (${res.status}); using the built-in sample policy.` };
    const data = await res.json();
    const page = data.results && data.results[0];
    if (!page) return { ...DEFAULT_POLICY, note: `No Confluence page titled "${pageTitle}" found; using the built-in sample policy.` };
    const parsed = parsePolicyFromStorage(page.body?.storage?.value || '', page.title);
    if (!parsed) return { ...DEFAULT_POLICY, note: `Page "${page.title}" has no policy table (Category | Limit | Per | Receipt required above); using the built-in sample policy.` };
    parsed.pageId = page.id;
    return parsed;
  } catch (e) {
    return { ...DEFAULT_POLICY, note: `Confluence unavailable on this site; using the built-in sample policy.` };
  }
}

export async function loadIssue(issueKey) {
  const res = await api.asUser().requestJira(
    route`/rest/api/3/issue/${issueKey}?fields=summary,description,attachment,reporter,status,created,labels`,
    { headers: { Accept: 'application/json' } }
  );
  if (!res.ok) throw new Error(`Could not read ${issueKey} (HTTP ${res.status}).`);
  return res.json();
}

export async function runCheck(issueKey, policy) {
  const pol = policy || (await loadPolicy());
  const issue = await loadIssue(issueKey);
  const f = issue.fields || {};
  const text = `${f.summary || ''}\n${adfToText(f.description)}`;
  const items = parseClaimItems(text, pol);
  const result = checkClaim({ items, attachmentCount: (f.attachment || []).length, policy: pol, text });
  return {
    issueKey: issue.key,
    summary: f.summary,
    status: f.status?.name,
    reporter: f.reporter?.displayName,
    attachments: (f.attachment || []).map((a) => a.filename),
    policyNote: pol.note,
    ...result,
    verdictLabel: VERDICT_LABEL[result.verdict],
    summaryText: summarise(result),
  };
}

export async function searchPendingClaims(projectKey) {
  const jql = `${projectKey ? `project = "${projectKey.replace(/"/g, '')}" AND ` : ''}resolution = Unresolved AND (summary ~ "claim" OR summary ~ "expense" OR labels = claim) ORDER BY created DESC`;
  const res = await api.asUser().requestJira(route`/rest/api/3/search/jql`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ jql, maxResults: 20, fields: ['summary'] }),
  });
  if (!res.ok) throw new Error(`Search failed (HTTP ${res.status}).`);
  const data = await res.json();
  return (data.issues || []).map((i) => i.key);
}

function adfParagraphs(text) {
  return {
    type: 'doc',
    version: 1,
    content: text.split('\n').map((line) => ({ type: 'paragraph', content: line ? [{ type: 'text', text: line }] : [] })),
  };
}

export async function postVerdict(issueKey, verdict, note, check) {
  const v = String(verdict || '').toLowerCase();
  const label = v.startsWith('reject') ? 'claim-buddy-reject' : v.startsWith('needs') ? 'claim-buddy-needs-info' : 'claim-buddy-approve';
  const body = [
    `Recommendation: ${VERDICT_LABEL[v] || verdict}`,
    note ? `Approver note: ${note}` : null,
    '',
    check.summaryText,
  ].filter((x) => x !== null).join('\n');
  const c = await api.asUser().requestJira(route`/rest/api/3/issue/${issueKey}/comment`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ body: adfParagraphs(body) }),
  });
  if (!c.ok) throw new Error(`Could not comment on ${issueKey} (HTTP ${c.status}).`);
  const l = await api.asUser().requestJira(route`/rest/api/3/issue/${issueKey}`, {
    method: 'PUT',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ update: { labels: [{ remove: 'claim-buddy-approve' }, { remove: 'claim-buddy-reject' }, { remove: 'claim-buddy-needs-info' }, { add: label }] } }),
  });
  return { issueKey, label, commented: true, labelled: l.ok };
}
