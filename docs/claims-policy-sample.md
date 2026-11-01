# Claims Policy (sample)

Claims must be submitted within 30 days of the expense date. Attach a receipt or photo for every item above the receipt threshold.

| Category | Limit | Per | Receipt required above | Notes |
| --- | --- | --- | --- | --- |
| Meals | RM 60 | day | RM 20 | |
| Travel | RM 500 | trip | RM 0 | Economy class only |
| Hotel | RM 250 | night | RM 0 | |
| Mileage | RM 0.60 | km | No | State start and end points |
| Parking & toll | RM 50 | day | RM 10 | |
| Phone & internet | RM 100 | month | RM 0 | |
| Client entertainment | RM 300 | claim | RM 0 | Needs pre-approval |
| Training | RM 1000 | claim | RM 0 | Needs pre-approval |

Not claimable: alcohol, fines, traffic summons, personal items.

## Sample claims for the demo

CLAIM-1 (clean):
```
Meals | 2026-10-28 | RM 45 | receipt: yes | team lunch
Parking | 2026-10-28 | RM 8 | receipt: no
```

CLAIM-2 (over limit + missing receipt):
```
Meals | 2026-10-28 | RM 85 | receipt: yes | vendor lunch
Hotel | 2026-10-29 | RM 320 | 1 night | receipt: missing
Mileage | 2026-10-29 | 120 km | KL to Seremban
```

CLAIM-3 (reject):
```
Entertainment | 2026-08-02 | RM 400 | receipt: yes | alcohol with client
```
