# Development Backlog — Phase 1

Prioritized tasks for the **Dev Agent**. One task per PR.

## P0 — Must fix before first shop install

- [ ] **P0-1** Fix Windows `npm install` / postinstall scripts (backend + frontend deps)
- [ ] **P0-2** Verify `npm run dev:backend` + `npm run dev:frontend` end-to-end on Windows
- [ ] **P0-3** Electron production build — test `.exe` installer on Windows
- [ ] **P0-4** Add API smoke tests (login, items CRUD, sale stock deduction)

## P1 — Core polish

- [ ] **P1-1** Photo upload UI in Inventory (backend route exists, frontend missing)
- [ ] **P1-2** Responsive sidebar on mobile-width screens
- [ ] **P1-3** Sale receipt view / print-friendly summary after completing sale
- [ ] **P1-4** Date range picker on Reports (custom from/to)
- [ ] **P1-5** CSV import validation with clearer error messages per row

## P2 — Quality & distribution

- [ ] **P2-1** Playwright smoke tests (login → record sale → verify stock)
- [ ] **P2-2** GitHub Actions CI: lint + API tests on PR
- [ ] **P2-3** Auto-backup reminder in Settings (weekly nudge)
- [ ] **P2-4** Hindi UI labels (optional toggle in Settings)
- [ ] **P2-5** App icon + branding for Electron installer

## P3 — Phase 2 prep (API reuse)

- [ ] **P3-1** Document all API endpoints in `docs/api.md` (OpenAPI-style)
- [ ] **P3-2** Abstract DB layer for future PostgreSQL swap
- [ ] **P3-3** Multi-user login (owner + staff roles)
- [ ] **P3-4** Multi-branch `shop_id` scoping audit

---

## Done

- [x] API-first scaffold (Express + SQLite + React + Electron shell)
- [x] Inventory, Sales, Purchases, Dashboard, Reports, AI Advisor
- [x] Excel/PDF export, CSV import, backup download
- [x] Agent workflow docs (AGENTS.md, rules, QA matrix)
