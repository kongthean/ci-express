# CI Express – setup guide

Website layout:

| Address | Who uses it |
|---|---|
| `cambodiainsight.com/` | Headquarters (admin) |
| `cambodiainsight.com/agent/` | Branch agents in Phnom Penh and the provinces |
| `cambodiainsight.com/customer/` | Customers: track, branch map, prices, account |

Each one can be installed on an iPhone or Android phone like an app (Safari → Share → **Add to Home Screen**).

---

## Part 1 – Firebase (database + logins) – free

1. Go to <https://console.firebase.google.com> → **Add project** → name it e.g. `ci-express` → create.
2. **Build → Authentication → Get started → Email/Password → Enable → Save.**
3. **Build → Realtime Database → Create database** → location **Singapore (asia-southeast1)** → start in **locked mode**.
4. **Realtime Database → Rules** → delete everything, paste the whole content of `database.rules.json` → **Publish**.
5. **Project settings (gear) → General → Your apps → Web (`</>`)** → register app → copy the `firebaseConfig` values.
6. Open `assets/config.js` and paste those values into `firebase: { ... }`.
7. **Authentication → Settings → Authorized domains → Add domain** → add `cambodiainsight.com`.

### Create the first Headquarters login (only once)

1. **Authentication → Users → Add user**
   - Email: `admin@staff.cambodiainsight.com` (the part before @ is the username: `admin`)
   - Password: at least 6 characters
2. Copy the **User UID** of that new user.
3. **Realtime Database → Data** → hover the root → **+** → add:
   ```
   staff
     └─ <paste the UID>
          ├─ name:     "Your name"
          ├─ username: "admin"
          ├─ role:     "admin"
          ├─ branch:   "PP"
          └─ active:   true      (choose type boolean)
   ```
4. Open `cambodiainsight.com`, log in with username `admin`, then:
   **Branches → Add branch** (first add `PP` for Phnom Penh, then all others) → **Prices** → **Staff → Add staff** for each agent.

> `loginDomain` in `config.js` and the domain inside `database.rules.json` (rule for `customers`) must be the same. Never change it later, or all logins stop working.

---

## Part 2 – GitHub Pages (website hosting) – free

1. Create a GitHub repository, e.g. `ci-express` (Public, or Private with GitHub Pro).
2. Upload **all files in this folder** (keep the folders `assets`, `agent`, `customer`, `icons`). You do not need to upload `functions/` to the website, but it is fine to keep it in the repo.
3. Repo → **Settings → Pages** → Source: **Deploy from a branch** → branch `main`, folder `/ (root)` → Save.
4. Same page → **Custom domain** → `cambodiainsight.com` → Save → when it is ready, tick **Enforce HTTPS**.
5. At your domain company (DNS), add:
   - 4 × `A` records for `@`: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - `CNAME` record `www` → `<your-github-username>.github.io`

The file `CNAME` in this folder already contains `cambodiainsight.com`.

**After every update**, change `?v=1` to `?v=2` (etc.) in the 3 `index.html` files and `CACHE = 'ci-v1'` in `sw.js`, so phones load the new version.

---

## Part 3 – AI auto call (optional, costs money per call)

What it does: when an agent scans a parcel as **Arrive**, the system calls the receiver and plays:
*"Hello, this is CI Express. Your parcel from Phnom Penh has arrived at Siem Reap. Please come to pick it up."*
The call hangs up by itself. If nobody answers, it tries again later (you choose how many times). The result shows in the staff app, the customer tracking page and **AI calls** in Headquarters.

### You need
- **Firebase Blaze plan** (pay-as-you-go; it needs a card). Cloud Functions have a free monthly allowance, so a small company usually pays $0 for the functions themselves.
- **Twilio account** (<https://twilio.com>) – buy a phone number that can make international calls, and allow calls to Cambodia in *Voice → Settings → Geo permissions*. Calls to Cambodian mobiles cost about $0.10–0.20 per minute.
- **Azure Speech** (for the Khmer voice) – <https://portal.azure.com> → create **Speech service** (Free F0 tier is enough) in region **Southeast Asia** → copy **Key 1**. Without Azure the call speaks English only.

### Install (on a computer, one time)
```bash
npm install -g firebase-tools
firebase login
cd <this folder>
firebase use --add            # choose your project
cd functions && npm install && cd ..
firebase functions:secrets:set TWILIO_SID      # Account SID from Twilio
firebase functions:secrets:set TWILIO_TOKEN    # Auth Token from Twilio
firebase functions:secrets:set TWILIO_FROM     # your Twilio number, e.g. +12025550123
firebase functions:secrets:set AZURE_TTS_KEY   # Azure Speech key (type none if you do not use Azure)
firebase deploy --only functions,database
```
Also turn on **Build → Storage → Get started** (the Khmer audio files are saved there).

Then in Headquarters → **AI calls**: tick *Call the receiver automatically*, choose the voice language, check the message, **Save**, and press **Test call** with your own phone number.

This also enables **Staff → Set new password** for Headquarters.

---

## Data overview (for developers)

| Path | What |
|---|---|
| `staff/<uid>` | name, username, role (`admin`/`agent`), branch, active |
| `branches/<CODE>` | name, prefix, province, address, phones, hours, lat, lng, active (public) |
| `prices/<id>` | name, unit, price, cur (public) |
| `shipments/<NO>` | full parcel record + `hist` + `call` |
| `track/<NO>` | public copy for the tracking page (no phone numbers) |
| `custIdx/<phone>`, `custNote/<phone>` | customer "My parcels" and news |
| `settings/aiCall` | AI call settings |
| `callReq`, `callQueue`, `callLog` | AI call requests, retries, history |

Tracking number format: `PREFIX-YYMMDD-0001` (e.g. `PP-261108-0042`), counted per branch per day.
