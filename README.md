# Bromog

A clean, no-nonsense gym tracker for Stephen & Matt. Sideloaded Android app (no Play
Store) + a small Azure backend for backup and an optional AI coach.

- **Fixed program** — 4 workouts (Mon eve, Wed morn, Thu eve, Sat aft), fixed exercises,
  **2 sets per exercise**, weights in **kg**.
- **Seamless logging** — big +/- steppers, auto rest timer with buzz + beep, do exercises
  in any order.
- **Progressive overload** — deterministic double-progression suggestions from each
  person's own history, pre-filled into every set.
- **Local-first** — everything saves on-device instantly and works with zero signal;
  finished sessions sync to Azure as immutable records when online.
- **Stats** — PRs, estimated 1RM, progression graphs, weekly volume (separate tab).
- **Coach** (optional) — tap-to-generate note on your trends, server-side only.

## Architecture

```
web/      React + Vite + TS, bundled into a signed APK via Capacitor (offline UI)
            └─ PUT /api/sessions/{id} · GET /api/sessions · POST /api/coach ─┐
server/   Flask + SQLAlchemy API + LLM coach  ◀── Docker image in ACR ──── Azure Container Apps
infra/    deploy-containerapp.sh   .github/workflows/  backend deploy + APK build  (SQLite, scale-to-zero)
```

- **Phone is the live source of truth** during a workout. The backend is backup/restore
  plus the coach. Sync is append-only and idempotent (keyed by a client UUID), so it's
  robust to flaky gym wifi.
- **Database** = SQLite (`DATABASE_URL`, default on the container's local disk). The backend
  is a best-effort backup for a local-first app; under scale-to-zero its disk is ephemeral
  (see the persistence note in §3). Swap to durable Postgres any time by setting
  `DATABASE_URL` — one env var, no code change.
- **Two users** (`stephen`, `matt`) are hardcoded in
  [web/src/data/program.ts](web/src/data/program.ts) and seeded in
  [server/models.py](server/models.py). Switch at the top of the app.

---

## 1. Run the backend locally

```bash
pip install -r requirements.txt
python app.py                      # serves http://localhost:8000
curl localhost:8000/api/health     # {"status":"ok"}
python -m pytest                   # backend tests
```

Or via Docker (mirrors Azure):

```bash
docker compose up --build
curl localhost:8000/api/health
```

Config (all optional locally — sensible defaults):

| Env var | Default | Purpose |
|---|---|---|
| `DATABASE_URL` | SQLite (`./bromog.db` locally) | SQLAlchemy URL; set to a Postgres URL for durable history |
| `APP_TOKEN` | empty (auth disabled) | Shared bearer token guarding the API |
| `ANTHROPIC_API_KEY` | empty | Enables the coach (Anthropic, preferred) |
| `OPENAI_API_KEY` | empty | Coach fallback if no Anthropic key |

## 2. Run the web app locally

```bash
cd web
npm install
cp .env.example .env          # point VITE_API_BASE_URL at your backend
npm run dev                   # http://localhost:5173
npm test                     # overload, stats, schedule unit tests
```

## 3. Deploy the backend to Azure (ACR → Container Apps)

One command (needs `az login`):

```bash
APP_TOKEN=pick-a-long-secret \
ANTHROPIC_API_KEY=sk-ant-...               # optional, for the coach \
./infra/deploy-containerapp.sh             # args: [resource-group] [location, default eastus]
```

It creates the resource group, ACR (Basic), an Azure Container Apps environment, builds
the image with `az acr build`, deploys a **scale-to-zero** container app, and prints your
API URL plus the exact `VITE_*` values for the APK build. Re-run it any time to ship a new
backend.

> Cost: Container Apps Consumption has a free monthly grant and scales to zero when idle,
> so a 3-person app is ~free; ACR Basic is ~$5/mo. (We use Container Apps instead of a
> Basic App Service plan because fresh subscriptions often have 0 VM quota for that SKU.)
>
> Persistence: the backend stores its SQLite backup on the container's local disk, which
> is ephemeral under scale-to-zero — server history can reset on a cold start, and the
> phones (the source of truth) re-sync on the next finish. SQLite does **not** work on an
> Azure Files mount (`database is locked`); for durable server history set `DATABASE_URL`
> to a managed/free Postgres (e.g. Neon) — one env var, no code change.

**Redeploy the backend (optional):** the [backend workflow](.github/workflows/backend.yml)
rebuilds the image in ACR and rolls the Container App. It's **manual** (Actions →
Run workflow); set the `AZURE_CREDENTIALS` secret (the resource-group / ACR / app names
are baked into the workflow). The initial deploy is `infra/deploy-containerapp.sh`.

## 4. Build the Android APK (sideload, no Play Store)

The web UI is **bundled inside the APK** (Capacitor), so it opens instantly and works
offline; only sync and the coach use the network.

### Easiest: GitHub Actions

1. Add repo secrets `API_BASE_URL` (your Container Apps URL) and `APP_TOKEN` (matching the
   backend). For an updatable, properly-signed build, also add `ANDROID_KEYSTORE_BASE64`,
   `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD` (see
   [android.yml](.github/workflows/android.yml) for the one-line `keytool` command).
2. Run the **Build Android APK** workflow (Actions tab → Run workflow).
3. It publishes `bromog.apk` to the repo's **`latest` Release** (and a `bromog-apk`
   workflow artifact). Grab it from there, or use the permanent link in
   [§5](#5-a-hosted-download-link-thats-never-stale).

Without a keystore secret the workflow still builds a debug-signed APK so you can test
immediately — but use the keystore for the link you actually share (see §5 for why).

### Or build locally

Needs Node, JDK 17+, and the Android SDK.

```bash
cd web
echo "VITE_API_BASE_URL=https://<your-app>.<region>.azurecontainerapps.io" > .env
echo "VITE_APP_TOKEN=<your APP_TOKEN>" >> .env
npm install
npm run build
npx cap add android        # first time only
npx cap sync android
cd android && ./gradlew assembleDebug
# → app/build/outputs/apk/debug/app-debug.apk
```

### Install on the phone

1. Copy `bromog.apk` to the phone (USB, Drive, email — your call).
2. Open it; allow "install from this source" when prompted.
3. Tap install. Done — switch user at the top, pick a workout, start lifting.

(`adb install bromog.apk` also works if the phone is plugged in with USB debugging on.)

## 5. A hosted download link that's never stale

Rather than re-sending a file every update, share **one permanent link** that always
serves the newest build.

The Android workflow publishes `bromog.apk` to a GitHub Release with a moving `latest`
tag, so this permalink never changes but always points at the latest build:

```
https://github.com/<owner>/<repo>/releases/latest/download/bromog.apk
```

Your backend also hosts a friendly install page on your own domain — set the
`APK_DOWNLOAD_URL` app setting to that permalink (the [deploy script](infra/deploy-containerapp.sh)
takes it as an env var, or `az containerapp update --set-env-vars`), then share:

```
https://<your-app>.<region>.azurecontainerapps.io/install
```

That page has a big **Install** button and a **QR code** to scan from a phone, and
`/download` 302-redirects to the latest APK. The redirect target is constant; the asset
behind it is replaced on every build.

**For in-place updates** (no uninstall needed), the APK must be **release-signed with a
stable key** — set the `ANDROID_KEYSTORE_*` secrets (see the top of
[android.yml](.github/workflows/android.yml)). The workflow also bumps `versionCode` each
build so phones recognise it as an update. (Debug-signed APKs use a throwaway key per CI
run, so phones would force an uninstall/reinstall — fine for testing, not for the shared
link.)

> Note: the APK bundles `APP_TOKEN`, so anyone who downloads it can reach your backup API
> (no personal data beyond workout logs). For a 3-person app that's fine; if you'd rather
> not bake the token in, ask and I'll move it to a one-time in-app field instead.

---

## Time-bound sessions & the Skippies Tribunal

Each workout is a **slot** with a hard validity window on its weekday
([program.ts](web/src/data/program.ts)): Mon 17–21, Wed 07–14, Thu 17–21, Sat 11–16 (local
wall-clock). In-window, Home opens the session for frictionless logging. Out of window, a
**lapsed** slot can only be performed by passing the **Skippies Tribunal**
([Tribunal.tsx](web/src/screens/Tribunal.tsx)) — a ≥3-tap mock-court flow that brands the
workout a **Skippies Amendment Session** (`skippies=true`, ✨ in history) with full
progression credit. A clean week out of window is refused. The state machine lives in
[schedule.ts](web/src/data/schedule.ts) (pure + unit-tested), evaluated per current user;
amendments are only available until the end of the ISO week. One local notification fires at
each window-start, and nothing else. Tip: append `?now=2026-06-01T18:30` in `npm run dev` to
freeze the clock and exercise any state.

## How progressive overload works

Per exercise, the app looks at your most recent session for that movement
([web/src/data/overload.ts](web/src/data/overload.ts)):

- **No history** → blank weight, target the bottom of the rep range.
- **Both sets hit the top of the range** → suggest `last weight + increment`, reset reps
  to the bottom of the range.
- **Otherwise** → hold the weight, target one more rep than your weakest set.

Rep ranges, rest times, and weight increments per exercise live in
[web/src/data/program.ts](web/src/data/program.ts) — tweak them there. Suggestions are
pre-filled into each set; accepting is one tap, and you can always override with the
steppers.

## Tests

| What | Command |
|---|---|
| Backend (API, auth, validation, idempotent sync, coach) | `python -m pytest` |
| Web logic (overload, stats/e1RM, schedule/Tribunal) | `cd web && npm test` |
| Backend container health | `docker compose up` → `curl localhost:8000/api/health` |
