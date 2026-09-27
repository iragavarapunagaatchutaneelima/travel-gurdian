# Environment Variables

**One file holds every setting:** `/.env.local` at the repository root. It is
gitignored and is read by both the Next.js frontend and the FastAPI backend.

```bash
cp .env.example .env.local     # at the repo root, then fill in values
node scripts/check-env.mjs     # shows what's set and where; never prints values
```

- How the two apps load it, and the precedence rules: [config/environment.md](config/environment.md)
- How to obtain each key: [docs/API_CONFIGURATION.md](docs/API_CONFIGURATION.md)

## Scopes

| Scope | Who can read it | Rule |
|---|---|---|
| **browser** | Every visitor (compiled into client JS) | Only `NEXT_PUBLIC_*`. Never a secret. |
| **next-server** | Next.js route handlers (`app/api/*`) via `frontend/src/config/serverEnv.ts` | Secrets OK; never import from client code |
| **backend** | FastAPI via `backend/app/core/config.py` (`settings`) | Secrets OK; the browser never talks to the backend directly |

## Variable map

| Variable | Scope | Required | Default | Purpose |
|---|---|---|---|---|
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | browser | **yes** | — | Maps JS, Places autocomplete, Geocoding, Directions. Restrict by HTTP referrer. |
| `GOOGLE_ROUTES_API_KEY` | next-server | no | falls back to the Maps key | Routes API (two-wheeler routing) and server-side Places lookups. IP-restricted. |
| `GEMINI_API_KEY` | next-server | no | — | AI Guardian conversational layer. Without it, answers come from the deterministic grounded tools, and the UI says so. |
| `GEMINI_MODEL` | next-server | no | `gemini-2.5-flash` | Model id; the UI shows the actual configured model. |
| `BACKEND_API_URL` | next-server | no | `http://127.0.0.1:8000/api` locally; auto-resolved on Vercel | **Local dev only** by default: the FastAPI origin behind the `/backend-api/*` rewrite when running `next dev` against `uvicorn app.main:app`. **On Vercel, not needed at all**: the backend is deployed as a Python Function in the *same* Vercel project (`/vercel.json`, `backend/index.py`), and Vercel's own routing serves `/backend-api/*` directly from it; server-to-server calls (AI Guardian, Nugen) auto-resolve to that same deployment via Vercel's own `VERCEL_URL`. Set this only to point at a genuinely separate backend host. See `frontend/src/config/backendApiUrl.ts` and `vercel.json`. |
| `NUGEN_API_KEY` | backend | for Task 2 | — | Nugen alignment, deployment, inference. |
| `NUGEN_API_URL` | backend | no | `https://api.nugen.in/api/v3` | Nugen API base. |
| `NUGEN_BASE_MODEL_ID` | backend | no | — | Alignment-ready base model picked from `GET /models/base`. Recorded from real output only. |
| `NUGEN_ALIGNED_MODEL_ID` | backend | no | — | The deployed aligned model used for inference. Recorded from real output only. |
| `TWILIO_ACCOUNT_SID` | backend | only if dry run off | — | Twilio emergency SMS/voice. |
| `TWILIO_AUTH_TOKEN` | backend | only if dry run off | — | Twilio auth. |
| `TWILIO_PHONE_NUMBER` | backend | only if dry run off | — | Twilio sender / caller ID. |
| `TWILIO_DRY_RUN` | backend | no | `true` | `true` builds and validates messages but never sends them. |
| `DATABASE_URL` | backend | **recommended on Vercel** | `sqlite:///./travel_guardian.db` locally; `sqlite:////tmp/travel_guardian.db` on Vercel if unset | Database. On Vercel's read-only filesystem, an unset value falls back to `/tmp` so the app boots, but that storage is **ephemeral** (not shared or persistent across invocations) -- contacts/check-ins/logs will not reliably survive a cold start. Set to a real hosted Postgres for actual persistence. |
| `CRON_SECRET` | backend | no | — | If set, required as `Authorization: Bearer <value>` on the `GET /assist/checkin/check-overdue` cron endpoint (Vercel sends this automatically when the var is set on the project). Optional hardening; the endpoint is idempotent either way. |
| `CORS_ORIGINS` | backend | no | localhost:3000/3001 | JSON array of allowed origins. |
| `SEED_RESET` | backend | no | `false` | `true` lets `seed.py` wipe demo reference tables (never contacts or check-ins). |
| `DISABLE_API_DOCS` | backend | no | `false` | `true` in production hides `/docs`, `/redoc`, `/openapi.json`. |

**Keyless live data, no variables needed:** Open-Meteo weather/forecast,
Open-Meteo Flood (GloFAS river discharge), and GDACS public disaster alerts.
See [docs/API_CONFIGURATION.md](docs/API_CONFIGURATION.md).

## Migrating from the old per-app files

Older installs kept settings in `frontend/.env.local` and `backend/.env`.
Both are still read as fallbacks, so nothing breaks, but the root file wins
for any variable set in both. `node scripts/check-env.mjs` lists anything
still in a legacy file and any obsolete variable (e.g. the old `EXOTEL_*`
set, and `NEXT_PUBLIC_API_URL`, which no code reads).

## Never

- Put a secret in a `NEXT_PUBLIC_*` variable. `check-env` flags this.
- Commit `/.env.local`, or paste key values into docs, tests, or logs.
- Read `process.env` directly in new frontend code. Add the value to
  `frontend/src/config/publicEnv.ts` or `serverEnv.ts` instead.
