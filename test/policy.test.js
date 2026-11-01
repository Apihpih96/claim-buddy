import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_POLICY, parseClaimItems, checkClaim, parsePolicyFromStorage, adfToText, normaliseCategory, summarise } from '../src/lib/policy.js';

const today = new Date('2026-11-01T00:00:00Z');

test('normalises categories and aliases', () => {
  assert.equal(normaliseCategory('Lunch'), 'meals');
  assert.equal(normaliseCategory('Grab ride'), 'travel');
  assert.equal(normaliseCategory('Toll'), 'parking');
  assert.equal(normaliseCategory('random'), null);
});

test('clean claim is approved', () => {
  const items = parseClaimItems('Meals | 2026-10-28 | RM 45 | receipt: yes | team lunch\nParking | 2026-10-28 | RM 8 | receipt: no', DEFAULT_POLICY);
  assert.equal(items.length, 2);
  const r = checkClaim({ items, today });
  assert.equal(r.verdict, 'approve');
  assert.equal(r.total, 53);
  assert.equal(r.allowed, 53);
});

test('over daily meal limit gives partial approval', () => {
  const items = parseClaimItems('Meals | 2026-10-28 | RM 45 | receipt: yes\nMeals | 2026-10-28 | RM 40 | receipt: yes', DEFAULT_POLICY);
  const r = checkClaim({ items, today });
  assert.equal(r.verdict, 'approve-partial');
  assert.equal(r.allowed, 60);
  assert.ok(r.reasons[0].includes('daily limit'));
});

test('missing receipt needs info', () => {
  const items = parseClaimItems('Hotel | 2026-10-30 | RM 220 | receipt: missing', DEFAULT_POLICY);
  const r = checkClaim({ items, today });
  assert.equal(r.verdict, 'needs-info');
  assert.ok(r.findings.some((f) => f.code === 'MISSING_RECEIPT'));
});

test('unmarked receipt is satisfied by an attachment', () => {
  const items = parseClaimItems('Hotel | 2026-10-30 | RM 220', DEFAULT_POLICY);
  assert.equal(checkClaim({ items, today, attachmentCount: 1 }).verdict, 'approve');
  assert.equal(checkClaim({ items: parseClaimItems('Hotel | 2026-10-30 | RM 220'), today, attachmentCount: 0 }).verdict, 'needs-info');
});

test('mileage uses the per-km rate', () => {
  const items = parseClaimItems('Mileage | 2026-10-29 | 120 km | KL to Seremban', DEFAULT_POLICY);
  assert.equal(items[0].amount, 72);
  const over = parseClaimItems('Mileage | 2026-10-29 | 100 km | RM 90', DEFAULT_POLICY);
  const r = checkClaim({ items: over, today });
  assert.ok(r.findings.some((f) => f.code === 'OVER_RATE'));
  assert.equal(r.allowed, 60);
});

test('late claims and not-claimable items are rejected', () => {
  const items = parseClaimItems('Meals | 2026-08-01 | RM 30 | receipt: yes', DEFAULT_POLICY);
  assert.equal(checkClaim({ items, today }).verdict, 'reject');
  const alc = parseClaimItems('Entertainment | 2026-10-30 | RM 120 | receipt: yes | alcohol with client, pre-approved', DEFAULT_POLICY);
  assert.equal(checkClaim({ items: alc, today }).verdict, 'reject');
});

test('pre-approval warning for entertainment', () => {
  const items = parseClaimItems('Entertainment | 2026-10-30 | RM 120 | receipt: yes | client dinner', DEFAULT_POLICY);
  const r = checkClaim({ items, today });
  assert.equal(r.verdict, 'approve-with-notes');
});

test('no items asks for info', () => {
  assert.equal(checkClaim({ items: parseClaimItems('please pay me back'), today }).verdict, 'needs-info');
});

test('parses a Confluence storage-format policy table', () => {
  const storage = `<p>Claims must be submitted within 14 days.</p><p>Not claimable: alcohol, fines and personal items.</p>
  <table><tbody><tr><th>Category</th><th>Limit</th><th>Per</th><th>Receipt required above</th><th>Notes</th></tr>
  <tr><td>Meals</td><td>RM 50</td><td>day</td><td>RM 0</td><td></td></tr>
  <tr><td>Mileage</td><td>RM 0.70</td><td>km</td><td>No</td><td></td></tr>
  <tr><td>Client entertainment</td><td>RM 200</td><td>claim</td><td>RM 0</td><td>Needs pre-approval</td></tr></tbody></table>`;
  const p = parsePolicyFromStorage(storage);
  assert.equal(p.currency, 'MYR');
  assert.equal(p.submissionDeadlineDays, 14);
  assert.equal(p.categories.meals.limit, 50);
  assert.equal(p.categories.mileage.rate, true);
  assert.equal(p.categories.mileage.receiptAbove, Infinity);
  assert.equal(p.categories.entertainment.needsApproval, true);
  assert.ok(p.notAllowed.includes('alcohol'));
  const items = parseClaimItems('Meals | 2026-10-10 | RM 55 | receipt: yes', p);
  const r = checkClaim({ items, today, policy: p });
  assert.ok(r.findings.some((f) => f.code === 'LATE'));
});

test('ADF description to text', () => {
  const adf = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Meals | 2026-10-28 | RM 20 | receipt: yes' }] }] };
  assert.equal(parseClaimItems(adfToText(adf)).length, 1);
});

test('summary text', () => {
  const r = checkClaim({ items: parseClaimItems('Meals | 2026-10-28 | RM 20 | receipt: yes'), today });
  assert.match(summarise(r), /Claim Buddy: Approve/);
});
