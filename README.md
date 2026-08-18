# VIMMS

**Vidhi Inventory and Marketing Management Software**

Desktop software for inventory, sales, purchases, reports, and AI-powered marketing insights — built for pooja and religious accessories shops in India.

---

## Install on Your Computer (Windows)

### What you need
- Windows 10 or 11 (64-bit)
- About 200 MB free disk space
- No internet required after installation (works offline)

### Step 1 — Get the installer

**Option A — Already built on this PC**

If you have the project folder, the installer is here:

```
release\VIMMS Setup 1.0.0.exe
```

**Option B — Build the installer yourself**

See [Build the installer](#build-the-installer-from-source) below, or the detailed guide in [`docs/BUILD.md`](docs/BUILD.md).

**Option C — Download from GitHub**

1. Open the project repository on GitHub
2. Download or build the latest `VIMMS Setup 1.0.0.exe` from releases (if published)

### Step 2 — Run the installer

1. Double-click **`VIMMS Setup 1.0.0.exe`**
2. If Windows SmartScreen appears, click **More info** → **Run anyway** (the app is not code-signed yet)
3. Choose an installation folder (default is fine)
4. Click **Install**
5. When finished, leave **Launch VIMMS** checked and click **Finish**

### Step 3 — First login

1. Open **VIMMS** from the Start Menu or desktop shortcut
2. Enter the default PIN: **`1234`**
3. Go to **Settings** and change your PIN immediately

### Step 4 — Set up your shop

1. Open **Settings**
2. Enter your **shop name**, address, and phone
3. Click **Save Details**
4. Go to **Inventory** to add or edit your products (sample items are pre-loaded)

You are ready to use VIMMS.

---

## Portable mode (no install)

If you prefer not to run the installer, use the portable executable:

```
release\win-unpacked\VIMMS.exe
```

Copy the entire `win-unpacked` folder to any location (e.g. USB drive) and run `VIMMS.exe` directly.

---

## Where your data is stored

| Mode | Database location |
|------|-------------------|
| Installed app | `C:\Users\<YourName>\AppData\Roaming\VIMMS\data\vimms.db` |
| Development | `<project folder>\data\vimms.db` |

### Backup your data

1. Open VIMMS → **Settings**
2. Click **Download Backup (.db)**
3. Save the file to USB, Google Drive, or another safe location

Restore: replace `vimms.db` in the data folder above and restart the app.

---

## Daily usage

| Task | Where to go |
|------|-------------|
| See today's sales | **Dashboard** |
| Add / edit products | **Inventory** |
| Record a customer sale | **Sales** → Record Sale |
| Restock items | **Purchases** → Record Purchase |
| View reports & download Excel/PDF | **Reports** |
| Get marketing ideas | **AI Advisor** |
| Change PIN or shop details | **Settings** |

**Payment modes supported:** Cash, UPI, Card  
**Currency:** ₹ (INR)

---

## AI Advisor (optional)

For full AI marketing and inventory suggestions using **Google Gemini**:

1. Get a free API key at [Google AI Studio](https://aistudio.google.com/apikey)
2. In VIMMS go to **Admin → AI Settings** and paste your key, OR add to `.env`:
   ```
   GOOGLE_API_KEY=AIza-your-key-here
   GOOGLE_AI_MODEL=gemini-2.0-flash
   ```
3. Choose from available models: Gemini 2.0 Flash, 1.5 Flash, 1.5 Pro, etc.

Without an API key, the advisor still works in offline mode with basic suggestions.

## Admin Panel

Go to **Admin** in the sidebar to:
- Add, edit, or delete **product categories**
- Configure **Google API key** and **AI model**

---

## Build the installer from source

For developers who want to build the `.exe` on their own machine.

### Prerequisites
- Node.js 18+ (development); packaged app includes its own runtime
- npm (included with Node.js)
- Git (optional, for cloning the repo)

### Clone and install dependencies

```powershell
git clone https://github.com/vikasm47/poojaSoftware.git
cd poojaSoftware
npm install
cd backend
npm install
cd ..\frontend
npm install
cd ..
```

### Generate the app icon

```powershell
node scripts/generate-icon.js
```

### Build the Windows installer

```powershell
cd frontend
npm run build
cd ..
$env:CSC_IDENTITY_AUTO_DISCOVERY = "false"
npx electron-builder --win nsis
```

### Output

| File | Description |
|------|-------------|
| `release\VIMMS Setup 1.0.0.exe` | Installer — give this to shop owners |
| `release\win-unpacked\VIMMS.exe` | Portable version |

More build troubleshooting: [`docs/BUILD.md`](docs/BUILD.md)

---

## Run in development mode (for coding)

Use this when making changes to the source code.

**Terminal 1 — Backend API:**
```powershell
npm run dev:backend
```

**Terminal 2 — Frontend UI:**
```powershell
npm run dev:frontend
```

Open **http://localhost:5173** in your browser. Login PIN: `1234`

**Optional — Electron desktop window (dev):**
```powershell
npm run electron:dev
```
(Requires both backend and frontend running.)

---

## Features

- Inventory management with low-stock alerts
- Sales and purchase recording with automatic stock updates
- Dashboard with today's revenue and profit
- Daily / weekly / monthly reports with Excel & PDF export
- AI business advisor for marketing and stocking ideas
- CSV bulk import for inventory
- Local database backup

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Windows blocks the installer | Click **More info** → **Run anyway** |
| App won't launch / closes immediately | Reinstall using the latest `VIMMS Setup 1.0.0.exe` from `release\` folder. Check log at `%APPDATA%\VIMMS\vimms-startup.log` |
| Forgot PIN | Delete `vimms.db` in the data folder (this resets all data) or restore from backup |
| Blank screen on launch | Wait 10–15 seconds for the backend to start; then restart the app |
| Build fails on `npm install` | Use Node.js 22.5+; run `npm install` separately in `backend` and `frontend` folders |

---

## Project structure

```
vimms/
├── backend/          REST API + database logic
├── frontend/         React user interface
├── electron/         Desktop app shell + icon
├── release/          Built installer (after build)
├── docs/             Build guides and QA docs
└── scripts/          Utility scripts
```

---

## License

Private — for shop owner use.
