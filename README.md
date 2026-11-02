# Claim Buddy

A Forge app for Jira and Jira Service Management with a **Rovo agent** that checks staff expense claims against your company's **claims policy in Confluence**. It flags over-limit items, missing receipts, late submissions and non-claimable items, then recommends **approve, approve partially, needs info or reject**, with reasons an approver can paste straight back to the claimant.

Built for **Atlassian Codegeist 2026**: category *Apps for Business Teams*, bonus *Best Agents (Rovo)*.

## Install for judges

**[Install Claim Buddy on your Atlassian site (Jira + Confluence)](https://developer.atlassian.com/console/install/8b60210a-e41d-452f-95ec-813a339b245f?signature=AYABeHE20Y1Ye34w9IijQz2H1hAAAAADAAdhd3Mta21zAEthcm46YXdzOmttczp1cy13ZXN0LTI6NzA5NTg3ODM1MjQzOmtleS83MDVlZDY3MC1mNTdjLTQxYjUtOWY5Yi1lM2YyZGNjMTQ2ZTcAuAECAQB4CxqLTo9l4lqXuFjNim1xJM%2Bp%2F3TVP9xHS2BrU5DRRucB06C1ne3tKe88RBHRhEOp%2BgAAAH4wfAYJKoZIhvcNAQcGoG8wbQIBADBoBgkqhkiG9w0BBwEwHgYJYIZIAWUDBAEuMBEEDDcoueCCCb3Uu%2FPGDwIBEIA72%2FRSm9A1d%2FAHbjWX%2BBwmxuGL4SFOOKRsZIddQ4TtF8OknYpkJikulclWAwb6MI%2F9PcJ0PQIy0g5gZmYAB2F3cy1rbXMAS2Fybjphd3M6a21zOmV1LXdlc3QtMTo3MDk1ODc4MzUyNDM6a2V5LzQ2MzBjZTZiLTAwYzMtNGRlMi04NzdiLTYyN2UyMDYwZTVjYwC4AQICAHi9bVMAkme4qVQX1fQHo6ePw3H40A7cGfz7yrmSfBWMXgE8mWPINjbNR98Ly0egdbG8AAAAfjB8BgkqhkiG9w0BBwagbzBtAgEAMGgGCSqGSIb3DQEHATAeBglghkgBZQMEAS4wEQQMFtdSW0eVekwIrbhmAgEQgDswizM1%2FNffw3431jxpKBkL6Zv6JKxZTExqt5GL1eXzYfg7TFqYXzvwVbxwx7TrrmAb%2FuzEBgQp5UCHygAHYXdzLWttcwBLYXJuOmF3czprbXM6dXMtZWFzdC0xOjcwOTU4NzgzNTI0MzprZXkvNmMxMjBiYTAtNGNkNS00OTg1LWI4MmUtNDBhMDQ5NTJjYzU3ALgBAgIAeDYASx0XCjkny4iLV6vz%2BKtEGSGT6kdt0QRpkn6D%2FlVEAcULVeekqWaDWp3LciUUzvsAAAB%2BMHwGCSqGSIb3DQEHBqBvMG0CAQAwaAYJKoZIhvcNAQcBMB4GCWCGSAFlAwQBLjARBAw5Tuk3HZdFuY1dV8QCARCAO6D4NpazCoQBv6v3P9uWVakb3BmRvc%2Bcfrq1ZRI5l0xK6%2BRPpp5CgA47G3%2Bf7xk3jhBmOCU77ry8s0C0AgAAAAAMAAAQAAAAAAAAAAAAAAAAAHuFz%2Fo1tCU60sLKzBNOkm%2F%2F%2F%2F%2F%2FAAAAAQAAAAAAAAAAAAAAAQAAADL433brxAMlhkzHYkRTIuIUOXZCqbj41HuY5ELuS0oi0l%2FWQ0GDrzDAAzwd0wyk%2FwFUYqatt5vppfPxQUdmsJMxKV4%3D&product=jira&product=confluence)**

1. Open the link above and pick your Jira Cloud site (add Confluence too for the live policy page).
2. Optional: create a Confluence page titled **Claims Policy** with a table (Category | Limit | Per | Receipt required above | Notes). Without it, a built-in sample policy is used.
3. Open any Jira issue that lists claim items, one per line (e.g. `Meals RM45 2026-10-30`), to see the Claim Buddy panel, or chat with the **Claim Buddy** agent in Rovo.

Demo video: https://youtu.be/xPPtG6cqCHc

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
