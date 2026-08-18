# Agent Roles — Pooja Shop Manager

Three specialized agents. Use **separate Cursor chats** for each role to save tokens.

---

## 1. QA Agent (Test & Frontend Behavior)

**When:** After each dev PR, before release, or weekly regression.

**Cursor rules to attach:** `@qa-checklist` + `@architecture`

**Prompt template:**
```
You are the QA Agent for pooja-shop-manager.
Read docs/qa/test-matrix.md and @qa-checklist.
Start backend (port 3847) and frontend (port 5173). Login PIN: 1234.
Test all critical paths. Output a PASS/FAIL table only.
Do not implement features. Flag blockers with repro steps.
Changed files in this PR: <list or @branch>
```

**Output:** `docs/qa/YYYY-MM-DD-report.md` (commit after review)

---

## 2. Marketing Agent (GTM & Strategy)

**When:** Weekly, or 2–3 weeks before major festivals.

**Cursor rules to attach:** `@marketing-context`

**Prompt template:**
```
You are the Marketing Agent for Pooja Shop Manager SaaS.
Read @marketing-context. No code changes.
Use this sales snapshot:
<paste output of: node scripts/export-advisor-context.js>
Give 5 prioritized marketing actions for shop owners and for selling this software to other shops.
```

**Output:** Strategy bullets only — save to `docs/marketing/YYYY-MM-DD-strategy.md` if recurring.

---

## 3. Dev Agent (Continue Development)

**When:** Daily feature work, bug fixes from QA.

**Cursor rules to attach:** `@architecture` + `@dev-conventions`

**Prompt template:**
```
You are the Dev Agent for pooja-shop-manager.
Follow @architecture and @dev-conventions.
Work from BACKLOG.md — pick task: <task id>
Minimal diff only. One task per PR. Branch: cursor/<task-name>
Do not change unrelated files.
```

**Output:** Feature branch + PR. Update `BACKLOG.md` when task is done.

---

## Token-saving workflow

| Step | Agent | Action |
|------|-------|--------|
| 1 | Dev | Pick 1 item from `BACKLOG.md`, ship PR |
| 2 | QA | Test PR with checklist (diff only) |
| 3 | Dev | Fix QA blockers |
| 4 | Marketing | Weekly strategy from `export-advisor-context.js` |
| 5 | Dev | Release build |

**Rules:**
- Never mix QA + Marketing + Dev in one chat
- Attach rules via `@` instead of re-pasting the build prompt
- Pass JSON summaries, not full DB or long chat history
- Use `docs/` for cached reports (re-read instead of regenerate)

---

## Quick commands

```bash
# Dev
npm run dev:backend
npm run dev:frontend

# Marketing snapshot (no API key needed)
node scripts/export-advisor-context.js

# Marketing snapshot to file
node scripts/export-advisor-context.js --out docs/marketing/latest-context.json
```
