# KisanQ — SIH 2026 prototype

Farmer procurement queue: register/login, all-India PIN search, unique tokens, crowd forecast, govt ID upload, admin accept/reject, Razorpay demo pay.

This build is a **static site** so you can host it on **GitHub Pages** without a server.

## Demo credentials

- Farmer OTP: `123456`
- Admin: `admin` / `admin123`

## Run locally

```bash
npx --yes serve docs -p 5500
```

Open http://localhost:5500

Do not open `index.html` as a file if you want maps + phone notifications — use the command above (https/http is required).

## Host on GitHub Pages

1. Create a GitHub repo and push this folder.
2. Repo **Settings → Pages**.
3. Source: **Deploy from a branch**.
4. Branch: `main`, folder: **/docs**.
5. Save. Your site URL will look like `https://USERNAME.github.io/REPO/`.

## Judge flow (2 minutes)

1. Site opens on **home** (Farmer Register / Farmer Login / Admin).
2. Register a farmer → OTP `123456`.
3. Enter any Indian PIN (try `110001`, `560001`, `700001`) → map + nearby centres.
4. Choose a centre → upload govt ID → book. Token looks like `KQ-7F2A9C`, not 1, 2, 3.
5. Status page shows crowd + quieter slot. Tap **Enable phone notifications**.
6. Logout. Admin login → welcome name, all collections, PIN filter.
7. **All bookings**: Call farmer / Accept / Reject. Accept → **Pay via Razorpay** (demo checkout if no live key).

## Optional live keys

Edit `docs/js/config.js`:

- `API_BASE` — your Node backend URL
- `RAZORPAY_KEY` — Razorpay test key id (`rzp_test_...`)

The old `backend/` folder is kept if you later connect Twilio/MySQL. The GitHub Pages demo does not need it.
