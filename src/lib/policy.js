// Claim Buddy policy engine: pure functions, no Forge imports, unit-tested.

export const DEFAULT_POLICY = {
  source: 'built-in sample policy',
  currency: 'MYR',
  submissionDeadlineDays: 30,
  receiptRequiredAbove: 0,
  categories: {
    meals: { label: 'Meals', limit: 60, per: 'day', receiptAbove: 20 },
    travel: { label: 'Travel', limit: 500, per: 'trip', receiptAbove: 0 },
    hotel: { label: 'Hotel', limit: 250, per: 'night', receiptAbove: 0 },
    mileage: { label: 'Mileage', limit: 0.6, per: 'km', receiptAbove: Infinity, rate: true },
    parking: { label: 'Parking & toll', limit: 50, per: 'day', receiptAbove: 10 },
    phone: { label: 'Phone & internet', limit: 100, per: 'month', receiptAbove: 0 },
    entertainment: { label: 'Client entertainment', limit: 300, per: 'claim', receiptAbove: 0, needsApproval: true },
    training: { label: 'Training', limit: 1000, per: 'claim', receiptAbove: 0, needsApproval: true },
  },
  notAllowed: ['alcohol', 'fines', 'traffic summons', 'personal'],
};

const ALIASES = {
  meals: ['meal', 'meals', 'food', 'lunch', 'dinner', 'breakfast', 'makan'],
  travel: ['travel', 'flight', 'airfare', 'train', 'bus', 'taxi', 'grab', 'ride', 'transport'],
  hotel: ['hotel', 'accommodation', 'lodging', 'stay'],
  mileage: ['mileage', 'km', 'kilometre', 'kilometer', 'petrol', 'fuel'],
  parking: ['parking', 'toll', 'tol'],
  phone: ['phone', 'mobile', 'internet', 'data'],
  entertainment: ['entertainment', 'client'],
  training: ['training', 'course', 'seminar', 'conference', 'exam'],
};

export function normaliseCategory(raw, policy = DEFAULT_POLICY) {
  if (!raw) return null;
  const s = String(raw).toLowerCase().trim();
  if (policy.categories[s]) return s;
  for (const [key, words] of Object.entries(ALIASES)) {
    if (policy.categories[key] && words.some((w) => s.includes(w))) return key;
  }
  for (const [key, cat] of Object.entries(policy.categories)) {
    if (s.includes(key) || s.includes(String(cat.label).toLowerCase())) return key;
  }
  return null;
}

export function parseAmount(raw) {
  if (raw === undefined || raw === null) return null;
  const m = String(raw).replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
  return m ? parseFloat(m[0]) : null;
}

// ---------- Confluence policy parsing ----------

function stripTags(html) {
  return String(html)
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseStorageTables(storage) {
  const tables = [];
  const tableRe = /<table[\s\S]*?<\/table>/gi;
  for (const t of String(storage || '').match(tableRe) || []) {
    const rows = [];
    for (const r of t.match(/<tr[\s\S]*?<\/tr>/gi) || []) {
      const cells = (r.match(/<t[hd][\s\S]*?<\/t[hd]>/gi) || []).map(stripTags);
      if (cells.length) rows.push(cells);
    }
    if (rows.length) tables.push(rows);
  }
  return tables;
}

// Expected table: Category | Limit | Per | Receipt required above | (Notes)
export function parsePolicyFromStorage(storage, title = 'Claims Policy') {
  const tables = parseStorageTables(storage);
  const policy = {
    source: `Confluence page "${title}"`,
    currency: DEFAULT_POLICY.currency,
    submissionDeadlineDays: DEFAULT_POLICY.submissionDeadlineDays,
    receiptRequiredAbove: 0,
    categories: {},
    notAllowed: [],
  };
  for (const rows of tables) {
    const header = rows[0].map((h) => h.toLowerCase());
    const ci = header.findIndex((h) => h.includes('categor') || h.includes('type'));
    const li = header.findIndex((h) => h.includes('limit') || h.includes('max') || h.includes('rate'));
    if (ci < 0 || li < 0) continue;
    const pi = header.findIndex((h) => h === 'per' || h.includes('per ') || h.includes('period') || h.includes('unit'));
    const ri = header.findIndex((h) => h.includes('receipt'));
    const ni = header.findIndex((h) => h.includes('note') || h.includes('rule'));
    for (const row of rows.slice(1)) {
      const label = row[ci];
      if (!label) continue;
      const key = normaliseCategory(label, DEFAULT_POLICY) || label.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const limitCell = row[li] || '';
      const cur = limitCell.match(/\b(RM|MYR|USD|SGD|EUR|GBP|AUD|\$)/i);
      if (cur) policy.currency = cur[1].toUpperCase() === 'RM' ? 'MYR' : cur[1].toUpperCase();
      const perCell = (pi >= 0 ? row[pi] : '') || (limitCell.match(/per\s+(\w+)/i) || [])[1] || 'claim';
      const receiptCell = ri >= 0 ? row[ri] : '';
      let receiptAbove = 0;
      if (/^\s*(no|never|not required)/i.test(receiptCell)) receiptAbove = Infinity;
      else if (parseAmount(receiptCell) !== null) receiptAbove = parseAmount(receiptCell);
      const notes = ni >= 0 ? row[ni] || '' : '';
      policy.categories[key] = {
        label,
        limit: parseAmount(limitCell) ?? Infinity,
        per: perCell.toLowerCase().replace(/^per\s+/, ''),
        receiptAbove,
        rate: /km|mile/i.test(perCell) || /km|mile/i.test(limitCell),
        needsApproval: /pre-?approv/i.test(notes),
        notes,
      };
    }
  }
  const text = stripTags(storage);
  const dl = text.match(/within\s+(\d+)\s+days/i);
  if (dl) policy.submissionDeadlineDays = parseInt(dl[1], 10);
  const na = text.match(/not (?:claimable|allowed|reimbursable)\s*[:\-]\s*([^.]+)/i);
  if (na) policy.notAllowed = na[1].split(/,|;|\band\b/).map((s) => s.trim().toLowerCase()).filter(Boolean);
  return Object.keys(policy.categories).length ? policy : null;
}

// ---------- Claim parsing ----------

// Converts Atlassian Document Format to plain text.
export function adfToText(node) {
  if (!node) return '';
  if (typeof node === 'string') return node;
  if (node.type === 'text') return node.text || '';
  const inner = (node.content || []).map(adfToText);
  if (node.type === 'tableRow') return inner.join(' | ') + '\n';
  if (['paragraph', 'heading', 'listItem', 'tableCell', 'tableHeader'].includes(node.type)) return inner.join('') + (node.type === 'tableCell' || node.type === 'tableHeader' ? '' : '\n');
  if (node.type === 'hardBreak') return '\n';
  return inner.join('');
}

// Accepts lines like:
//   Meals | 2026-10-28 | RM 85 | receipt: yes | lunch with team
//   - Mileage 2026-10-29 120 km (KL to Seremban)
//   Category: Hotel, Amount: RM 320, Date: 2026-10-30, Receipt: attached
export function parseClaimItems(text, policy = DEFAULT_POLICY) {
  const items = [];
  const lines = String(text || '').split(/\n+/).map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    if (/^(category|item)\s*\|/i.test(line)) continue; // header row
    const category = normaliseCategory(line.split(/[|:,\-]/)[0], policy)
      || normaliseCategory((line.match(/category\s*[:=]\s*([^,|]+)/i) || [])[1], policy)
      || normaliseCategory(line, policy);
    if (!category) continue;
    const date = (line.match(/\b(\d{4}-\d{2}-\d{2})\b/) || line.match(/\b(\d{1,2}\/\d{1,2}\/\d{4})\b/) || [])[1] || null;
    const lineNoDate = line.replace(/\b\d{4}-\d{2}-\d{2}\b/, '').replace(/\b\d{1,2}\/\d{1,2}\/\d{4}\b/, '');
    const km = lineNoDate.match(/(\d+(?:\.\d+)?)\s*km\b/i);
    const money = lineNoDate.match(/(?:RM|MYR|USD|\$|SGD)\s*(\d[\d,]*(?:\.\d+)?)/i)
      || lineNoDate.match(/amount\s*[:=]\s*(?:RM|MYR|\$)?\s*(\d[\d,]*(?:\.\d+)?)/i);
    let amount = money ? parseAmount(money[1]) : null;
    let quantity = null;
    if (policy.categories[category]?.rate && km) {
      quantity = parseFloat(km[1]);
      if (amount === null) amount = +(quantity * policy.categories[category].limit).toFixed(2);
    }
    if (amount === null) {
      const anyNum = lineNoDate.match(/\b(\d[\d,]*(?:\.\d+)?)\b/);
      if (anyNum) amount = parseAmount(anyNum[1]);
    }
    if (amount === null && !date && !km) continue; // prose line (e.g. the summary), not a claim item
    let receipt = null;
    if (/receipt\s*[:=]?\s*(yes|attached|ada|y)\b|\bwith receipt\b|📎/i.test(line)) receipt = true;
    else if (/receipt\s*[:=]?\s*(no|missing|none|tiada|n)\b|\bno receipt\b|without receipt/i.test(line)) receipt = false;
    const nights = (line.match(/(\d+)\s*nights?/i) || [])[1];
    items.push({ raw: line, category, date, amount, quantity, nights: nights ? parseInt(nights, 10) : null, receipt });
  }
  return items;
}

// ---------- Checking ----------

function daysBetween(a, b) {
  return Math.floor((b.getTime() - a.getTime()) / 86400000);
}

function toDate(s) {
  if (!s) return null;
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) {
    const [d, m, y] = s.split('/').map(Number);
    return new Date(Date.UTC(y, m - 1, d));
  }
  const d = new Date(s + 'T00:00:00Z');
  return isNaN(d) ? null : d;
}

const money = (cur, n) => `${cur === 'MYR' ? 'RM' : cur + ' '}${Number(n).toFixed(2)}`;

export function checkClaim({ items, attachmentCount = 0, today = new Date(), policy = DEFAULT_POLICY, text = '' }) {
  const findings = [];
  const cur = policy.currency;
  let total = 0;
  let allowed = 0;
  const perDay = {};

  if (!items.length) {
    findings.push({ severity: 'info', code: 'NO_ITEMS', message: 'No claim line items found. Ask the claimant to list each expense as: Category | Date | Amount | Receipt.' });
  }

  for (const it of items) {
    const rule = policy.categories[it.category];
    const amt = it.amount ?? 0;
    total += amt;
    let ok = amt;
    if (it.amount === null) {
      findings.push({ severity: 'warn', code: 'NO_AMOUNT', item: it.raw, message: `${rule.label}: amount missing.` });
    }
    if (rule.rate && it.quantity !== null) {
      const cap = +(it.quantity * rule.limit).toFixed(2);
      if (amt > cap + 0.005) {
        findings.push({ severity: 'violation', code: 'OVER_RATE', item: it.raw, message: `${rule.label}: ${money(cur, amt)} for ${it.quantity} km is above the ${money(cur, rule.limit)}/km rate (max ${money(cur, cap)}).`, excess: +(amt - cap).toFixed(2) });
        ok = cap;
      }
    } else if (!rule.rate && isFinite(rule.limit)) {
      const units = rule.per === 'night' && it.nights ? it.nights : 1;
      const cap = rule.limit * units;
      if (rule.per === 'day' && it.date) {
        const k = `${it.category}|${it.date}`;
        perDay[k] = (perDay[k] || 0) + amt;
      } else if (amt > cap + 0.005) {
        findings.push({ severity: 'violation', code: 'OVER_LIMIT', item: it.raw, message: `${rule.label}: ${money(cur, amt)} is above the limit of ${money(cur, cap)} per ${rule.per}.`, excess: +(amt - cap).toFixed(2) });
        ok = cap;
      }
    }
    if (it.receipt === false && amt > rule.receiptAbove) {
      findings.push({ severity: 'violation', code: 'MISSING_RECEIPT', item: it.raw, message: `${rule.label}: receipt required for amounts above ${money(cur, rule.receiptAbove)} but marked as missing.` });
    } else if (it.receipt === null && amt > rule.receiptAbove && attachmentCount === 0) {
      findings.push({ severity: 'violation', code: 'MISSING_RECEIPT', item: it.raw, message: `${rule.label}: receipt required above ${money(cur, rule.receiptAbove)} and no attachment found on the request.` });
    }
    if (rule.needsApproval && !/pre-?approv/i.test(it.raw + ' ' + text)) {
      findings.push({ severity: 'warn', code: 'NEEDS_PREAPPROVAL', item: it.raw, message: `${rule.label}: policy needs pre-approval; none mentioned.` });
    }
    const d = toDate(it.date);
    if (d) {
      const age = daysBetween(d, today);
      if (age > policy.submissionDeadlineDays) {
        findings.push({ severity: 'violation', code: 'LATE', item: it.raw, message: `${rule.label}: expense dated ${it.date} is ${age} days old; policy allows ${policy.submissionDeadlineDays} days.` });
        ok = 0;
      } else if (age < 0) {
        findings.push({ severity: 'warn', code: 'FUTURE_DATE', item: it.raw, message: `${rule.label}: expense date ${it.date} is in the future.` });
      }
    } else {
      findings.push({ severity: 'warn', code: 'NO_DATE', item: it.raw, message: `${rule.label}: date missing.` });
    }
    for (const bad of policy.notAllowed || []) {
      if (bad && new RegExp(`\\b${bad.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(it.raw)) {
        findings.push({ severity: 'violation', code: 'NOT_CLAIMABLE', item: it.raw, message: `"${bad}" is not claimable under the policy.` });
        ok = 0;
      }
    }
    it.allowed = ok;
  }

  for (const [k, sum] of Object.entries(perDay)) {
    const [cat, date] = k.split('|');
    const rule = policy.categories[cat];
    if (sum > rule.limit + 0.005) {
      findings.push({ severity: 'violation', code: 'OVER_LIMIT', message: `${rule.label} on ${date}: ${money(cur, sum)} is above the daily limit of ${money(cur, rule.limit)}.`, excess: +(sum - rule.limit).toFixed(2) });
      const excess = sum - rule.limit;
      // reduce allowed of last item that day
      let left = excess;
      for (const it of [...items].reverse()) {
        if (it.category === cat && it.date === date && left > 0) {
          const cut = Math.min(it.allowed, left);
          it.allowed -= cut;
          left -= cut;
        }
      }
    }
  }
  allowed = items.reduce((s, it) => s + (it.allowed || 0), 0);

  const violations = findings.filter((f) => f.severity === 'violation');
  const warnings = findings.filter((f) => f.severity === 'warn');
  let verdict = 'approve';
  if (!items.length) verdict = 'needs-info';
  else if (violations.some((v) => ['NOT_CLAIMABLE', 'LATE'].includes(v.code)) && allowed === 0) verdict = 'reject';
  else if (violations.some((v) => v.code === 'MISSING_RECEIPT')) verdict = 'needs-info';
  else if (violations.length) verdict = allowed > 0 ? 'approve-partial' : 'reject';
  else if (warnings.length) verdict = 'approve-with-notes';

  const reasons = violations.length || warnings.length
    ? [...violations, ...warnings].map((f) => f.message)
    : ['All items are within policy limits, dated within the deadline, with receipts wherever the policy needs one.'];

  return {
    verdict,
    currency: cur,
    total: +total.toFixed(2),
    allowed: +allowed.toFixed(2),
    itemCount: items.length,
    items: items.map(({ raw, category, date, amount, receipt, allowed: a }) => ({ category, date, amount, receipt, receiptNeeded: (amount ?? 0) > policy.categories[category].receiptAbove, allowed: a, raw })),
    findings,
    reasons,
    policySource: policy.source,
  };
}

export const VERDICT_LABEL = {
  approve: 'Approve',
  'approve-with-notes': 'Approve (with notes)',
  'approve-partial': 'Approve partially',
  'needs-info': 'Needs info',
  reject: 'Reject',
};

export function summarise(result) {
  const cur = result.currency;
  const lines = [
    `Claim Buddy: ${VERDICT_LABEL[result.verdict] || result.verdict}`,
    `Claimed ${money(cur, result.total)}, within policy ${money(cur, result.allowed)} (${result.itemCount} item${result.itemCount === 1 ? '' : 's'}).`,
    ...result.reasons.map((r) => `- ${r}`),
    `Policy: ${result.policySource}.`,
  ];
  return lines.join('\n');
}
