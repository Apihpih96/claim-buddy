# Claim Buddy

A Forge app for Jira and Jira Service Management with a **Rovo agent** that checks staff expense claims against your company's **claims policy in Confluence**. It flags over-limit items, missing receipts, late submissions and non-claimable items, then recommends **approve, approve partially, needs info or reject**, with reasons an approver can paste straight back to the claimant.

Built for **Atlassian Codegeist 2026**: category *Apps for Business Teams*, bonus *Best Agents (Rovo)*.

## Why

Finance and HR teams in small companies approve claims by eye: open the request, open the policy, compare every line. It's slow, inconsistent and the claimant waits days only to be told a receipt is missing. Claim Buddy puts the policy next to the claim and does the comparison in seconds.

## What's in the app

| Forge module | What it does |
| --- | --- |
| `rovo:agent` **Claim Buddy** | Chat agent: "Check claim CLAIM-1", "Which open claims are missing receipts?", "Summarise our claims policy". |
| `action` **get-claims-policy** | Reads the Confluence page titled *Claims Policy* (any table with Category / Limit / Per / Receipt required above columns). Falls back to a built-in sample policy. |
| `action` **check-claim** | Parses the claim's line items from the issue description, checks each one, returns violations and a verdict. |
| `action` **list-pending-claims** | Reviews the open claim queue in one go. |
| `action` **post-claim-verdict** | After the approver confirms: comments the recommendation on the issue and labels it `claim-buddy-approve` / `-reject` / `-needs-info`. |
| `jira:issuePanel` **Claim Buddy** | A panel on every issue showing the verdict, a line-item table and one-tap *Post recommendation*. |

Checks performed: per-claim / per-day / per-night limits, per-km mileage rate, daily totals across several lines, receipt required above a threshold (attachments count as receipts), submission deadline (e.g. within 30 days), future dates, pre-approval needed, and not-claimable words (alcohol, fines…).

## Writing a claim

Put one expense per line in the issue description:

```
Meals | 2026-10-28 | RM 85 | receipt: yes | lunch with vendor
Mileage | 2026-10-29 | 120 km | KL to Seremban
Hotel | 2026-10-30 | RM 320 | 1 night | receipt: missing
```

## Writing the policy (Confluence)

Create a page titled **Claims Policy** with a table:

| Category | Limit | Per | Receipt required above | Notes |
| --- | --- | --- | --- | --- |
| Meals | RM 60 | day | RM 20 | |
| Travel | RM 500 | trip | RM 0 | |
| Hotel | RM 250 | night | RM 0 | |
| Mileage | RM 0.60 | km | No | |
| Parking & toll | RM 50 | day | RM 10 | |
| Client entertainment | RM 300 | claim | RM 0 | Needs pre-approval |

Add sentences such as "Claims must be submitted within 30 days." and "Not claimable: alcohol, fines, personal items." and Claim Buddy picks them up. A ready-made copy is in [`docs/claims-policy-sample.md`](docs/claims-policy-sample.md).

## Install & run (developers)

```
npm install
forge register        # first time only
forge deploy
forge install --site <your-site>.atlassian.net --product jira
forge install --site <your-site>.atlassian.net --product confluence   # optional, for the policy page
npm test              # unit tests for the policy engine
```

Then open Rovo chat in Jira, pick **Claim Buddy**, and ask it to check a claim.

## License

MIT
