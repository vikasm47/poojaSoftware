# Building VIMMS Installer (Windows)

## Prerequisites
- Node.js 22.5+ (uses built-in `node:sqlite` — no C++ build tools needed)
- npm

## One-time setup
```powershell
cd C:\Users\vikas\pooja-shop-manager
npm install
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
node scripts/generate-icon.js
```

## Build installer
```powershell
cd frontend
npm run build
cd ..
$env:CSC_IDENTITY_AUTO_DISCOVERY='false'
npx electron-builder --win nsis
```

## Output
| File | Purpose |
|------|---------|
| `release\VIMMS Setup 1.0.0.exe` | **Installer** — double-click to install |
| `release\win-unpacked\VIMMS.exe` | Portable app (no install) |

## After install
- Start **VIMMS** from Start Menu or desktop shortcut
- Default login PIN: **1234**
- Data stored at: `%APPDATA%\VIMMS\data\vimms.db`

## Troubleshooting
- If `npm` nested scripts fail on Windows, run `npx electron-builder` directly (see above)
- If NSIS icon error: run `node scripts/generate-icon.js` first
- If code-sign symlink error: set `$env:CSC_IDENTITY_AUTO_DISCOVERY='false'`
