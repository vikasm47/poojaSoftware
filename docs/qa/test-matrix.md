# QA Test Matrix

Full checklist for the **QA Agent**. Default login PIN: `1234`.

## Environment

| Check | Expected |
|-------|----------|
| `GET /api/health` | `{ status: "ok" }` |
| Frontend loads | Login page at `http://localhost:5173` |
| Invalid PIN | Error message shown |
| Valid PIN | Redirect to Dashboard |

---

## 1. Dashboard (`/`)

| # | Test | Expected | Status |
|---|------|----------|--------|
| D1 | Page loads | Stats cards visible | |
| D2 | Today's sales | Shows ₹ amount (0 if no sales) | |
| D3 | Stock alerts | Lists low/out-of-stock items | |
| D4 | Recent sales | Table or empty state | |
| D5 | Quick actions | "Record Sale" / "Record Purchase" navigate correctly | |

---

## 2. Inventory (`/inventory`)

| # | Test | Expected | Status |
|---|------|----------|--------|
| I1 | Item list loads | Seed items visible | |
| I2 | Search by name | Filters list | |
| I3 | Filter by category | Shows matching items | |
| I4 | Filter by stock status | low/out/in stock filter works | |
| I5 | Add item | Modal saves, list refreshes | |
| I6 | Edit item | Changes persist after save | |
| I7 | Delete item | Removed from list | |
| I8 | Stock status badge | Correct for qty vs reorder threshold | |
| I9 | CSV import | Valid CSV imports; bad rows show errors | |
| I10 | Duplicate SKU | Error on conflict | |

---

## 3. Sales (`/sales`)

| # | Test | Expected | Status |
|---|------|----------|--------|
| S1 | Sales history loads | Table or empty state | |
| S2 | Open Record Sale modal | Item dropdown populated | |
| S3 | Add multiple items | Cart shows lines + subtotal | |
| S4 | Apply discount | Total = subtotal − discount | |
| S5 | Payment mode | cash / upi / card saved | |
| S6 | Complete sale | Success message, history updates | |
| S7 | Stock deduction | Item stock decreases by qty sold | |
| S8 | Insufficient stock | Error, sale blocked | |
| S9 | Out-of-stock items | Not in dropdown (or disabled) | |

---

## 4. Purchases (`/purchases`)

| # | Test | Expected | Status |
|---|------|----------|--------|
| P1 | Purchase history loads | Table or empty state | |
| P2 | Record purchase | Stock increases | |
| P3 | Cost price update | Item cost_price updates | |
| P4 | Supplier field | Saved on purchase record | |

---

## 5. Reports (`/reports`)

| # | Test | Expected | Status |
|---|------|----------|--------|
| R1 | Sales tab — Today/Week/Month | Stats change per period | |
| R2 | Bar chart | Renders when data exists | |
| R3 | Pie chart (categories) | Renders when data exists | |
| R4 | Top items table | Sorted by revenue | |
| R5 | Download Excel (sales) | File downloads | |
| R6 | Download PDF (sales) | File downloads | |
| R7 | Inventory tab | Stock snapshot + status counts | |
| R8 | P&L tab | Revenue, cost, profit, margin % | |

---

## 6. AI Advisor (`/advisor`)

| # | Test | Expected | Status |
|---|------|----------|--------|
| A1 | Marketing tab loads | Insights text (offline or AI) | |
| A2 | Inventory tab loads | Suggestions text | |
| A3 | Ask a question | Answer appears | |
| A4 | Refresh insights | Re-fetches without crash | |

---

## 7. Settings (`/settings`)

| # | Test | Expected | Status |
|---|------|----------|--------|
| T1 | Shop name save | Persists, sidebar updates | |
| T2 | Change PIN | Success with valid current PIN | |
| T3 | Backup download | `.db` file downloads | |

---

## 8. Responsive / UX

| # | Test | Expected | Status |
|---|------|----------|--------|
| U1 | Narrow viewport (~375px) | Usable layout, no horizontal scroll on tables | |
| U2 | Modal on mobile | Scrollable, buttons reachable | |
| U3 | Currency format | ₹ with Indian grouping | |
| U4 | Logout | Returns to login, token cleared | |

---

## Report template

Save results to `docs/qa/YYYY-MM-DD-report.md`:

```markdown
# QA Report — YYYY-MM-DD
Branch/PR: ...
Tester: QA Agent

| Status | ID | Issue | Steps | Severity |
|--------|-----|-------|-------|----------|
| FAIL | S7 | Stock not deducted | ... | blocker |

## Summary
- Passed: X / Y
- Blockers: N
```
