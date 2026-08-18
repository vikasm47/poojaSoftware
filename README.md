# Pooja Shop Manager

Desktop inventory and business management software for pooja/religious accessories shops in India.

## Architecture

**API-first, desktop-wrapped** — built for future mobile app and website phases:

```
┌─────────────────────────────────────┐
│  Electron Desktop Shell (.exe/.dmg) │
├─────────────────────────────────────┤
│  React Frontend (HTTP only)         │
├─────────────────────────────────────┤
│  Express REST API (business logic)  │
├─────────────────────────────────────┤
│  SQLite Database (local file)       │
└─────────────────────────────────────┘
```

The same backend API can later serve a mobile app (Phase 2) or cloud website (Phase 3).

## Features

- **Inventory Management** — CRUD, stock status, search/filter, CSV bulk import
- **Sales Recording** — multi-item sales, discounts, cash/UPI/card payment modes
- **Purchase Recording** — restocking with auto stock updates
- **Dashboard** — today's sales/profit, alerts, quick actions
- **Reports** — daily/weekly/monthly analytics with Excel & PDF export
- **AI Business Advisor** — marketing & inventory insights via Claude API
- **Backup** — download database backup file

## Quick Start (Development)

### Prerequisites
- Node.js 18+
- npm

### Setup

```bash
cd pooja-shop-manager
npm install
cp backend/.env.example backend/.env
# Edit backend/.env — add ANTHROPIC_API_KEY for AI features (optional)
```

### Run in development

Terminal 1 — Backend API:
```bash
npm run dev:backend
```

Terminal 2 — Frontend:
```bash
npm run dev:frontend
```

Open http://localhost:5173 — **Default PIN: 1234**

### Run as Electron desktop app (dev)

```bash
npm run dev:backend
npm run dev:frontend
npm run electron:dev
```

## Build Installers

```bash
npm run build:frontend
npm run electron:build
```

Installers are generated in `release/`:
- Windows → `.exe` (NSIS)
- Mac → `.dmg`
- Linux → `.AppImage`

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login with PIN |
| GET | `/api/items` | List items (with filters) |
| POST | `/api/items` | Create item |
| POST | `/api/sales` | Record sale |
| POST | `/api/purchases` | Record purchase |
| GET | `/api/reports/dashboard` | Dashboard stats |
| GET | `/api/reports/sales/:period` | Sales report |
| GET | `/api/advisor/marketing` | AI marketing insights |
| GET | `/api/backup/export` | Download DB backup |

All endpoints except `/api/auth/login` and `/api/health` require `Authorization: Bearer <token>`.

## Configuration

Edit `backend/.env`:

```
PORT=3847
JWT_SECRET=your-secret
ANTHROPIC_API_KEY=sk-ant-...   # Optional — enables full AI advisor
SHOP_NAME=My Pooja Shop
DEFAULT_PIN=1234
```

## Data Location

- **Development:** `data/pooja_shop.db`
- **Electron (installed):** `%APPDATA%/Pooja Shop Manager/data/` (Windows)

## License

Private — for shop owner use.
