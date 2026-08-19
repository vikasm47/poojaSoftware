# VIMMS Licensing

VIMMS uses **RSA-signed, machine-bound** license keys. Keys are verified with a public key embedded in the app; only you can generate keys with the private key kept on this computer.

## What stays out of git

| Path | Purpose |
|------|---------|
| `scripts/.license-keys/` | Private RSA key + generated `.key` files |
| `data/license.dat` | Encrypted license on this machine (dev) |
| `%APPDATA%\vimms\data\license.dat` | Encrypted license (installed app) |

The **public key** at `backend/src/keys/license-public.pem` is safe to commit.

## One-time setup (this machine only)

```powershell
npm run license:setup
```

## Generate a license for a computer

```powershell
# This PC (uses current Machine ID)
npm run license:generate -- --holder "Shop Name"

# Another PC (customer sends you their Machine ID from the activation screen)
npm run license:generate -- --machine-id ABC123 --holder "Customer Shop"
```

Output is saved under `scripts/.license-keys/generated/` — **never commit that folder**.

## Install license locally (optional CLI)

```powershell
npm run license:install -- --file scripts/.license-keys/generated/license-....key
```

Customers can also paste the key in the app at **Activate License** (`/activate`).

## Security notes

- License is **bound to Machine ID** (hostname + OS + user).
- Stored encrypted with a key derived from the machine fingerprint.
- API routes are blocked until a valid license is activated.
- Desktop apps can always be reverse-engineered; this stops casual copying, not determined attackers.

## Customer flow

1. Install VIMMS → activation screen shows **Machine ID**
2. Customer sends Machine ID to you
3. You run `license:generate` with that Machine ID
4. Customer pastes the key → app unlocks → login with PIN
