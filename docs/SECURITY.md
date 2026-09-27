# Security & Safety

The security and life-safety posture of Travel Guardian, with how each claim
is enforced and verified. Where something is a known limitation, it says so.

---

## 1. Secrets

| Rule | Enforcement | Verified by |
|---|---|---|
| One canonical, git-ignored env file (`/.env.local`); `.env.example` has placeholders only | `.gitignore` (`.env*`); frontend `next.config.ts` and backend `config.py` both read `/.env.local` | `node scripts/check-env.mjs` (reports status per variable, **never prints values**, flags secret-like `NEXT_PUBLIC_*` names) |
| Server secrets never reach the browser | Only `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is public (`config/publicEnv.ts`). Server keys are read via `config/serverEnv.ts`, which **throws if imported in the browser** | `node scripts/check-secret-exposure.mjs`: fetches 12 pages and every JS/CSS chunk they load (74 resources), searches for the **actual values** of `GEMINI_API_KEY`, `GOOGLE_ROUTES_API_KEY`, `NUGEN_API_KEY`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `DATABASE_URL`, `SECRET_KEY`. Result 2026-09-27: none found; the public Maps key found as a control (so the scan does reach client bundles) |
| No secrets in client components | `testProductionHardening.ts` asserts no client component imports `serverEnv` or references `NUGEN_*` / `GEMINI_API_KEY` | `npm test` |
| No secrets committed | Pre-commit diff scan for key patterns (`AIza…`, `AC…` SIDs, `sk-…`) on every commit in this work | Commit discipline; `git log -p` contains no key material |
| Config status without values | `GET /api/emergency/config-status` returns booleans only (`account_sid_configured`, …) | `backend/app/api/emergency.py` |

The Google Maps browser key is public by design. It should be restricted in
Google Cloud Console to HTTP referrers and to the Maps JavaScript / Places
APIs.

## 2. Browser hardening (`frontend/next.config.ts`)

- **CSP:** `default-src 'self'`; `frame-ancestors 'none'`; `connect-src` is an
  explicit allow-list (self, Google Maps/Generative Language, Protomaps,
  Hugging Face + raw.githubusercontent.com for the optional on-device model).
  `worker-src 'self' blob:`.
- `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`,
  `Referrer-Policy: strict-origin-when-cross-origin`,
  `Permissions-Policy: geolocation=(self), camera=(), microphone=()`.
- The backend is reached only via the same-origin `/backend-api/*` rewrite, so
  its real origin never appears in client code or the CSP.
- The service worker never intercepts cross-origin requests and never caches
  `/api/*` or `/backend-api/*` responses.

## 3. Identity & data isolation

- There are no user accounts. Each browser gets a random **device identity**
  in an `httpOnly`, `SameSite=Lax` cookie (`tg_device_id`, `Secure` over
  HTTPS), set by `backend/app/core/identity.py`.
- Contacts, check-ins, SOS state and emergency logs are scoped to that device
  ID. The old client-supplied `?user_id=` (which let anyone read anyone's data)
  was removed.
- **Limitation:** anyone with access to the same browser profile (a shared or
  compromised device) has that device's data. This is lightweight isolation,
  not authentication.

## 4. Abuse controls

- `/api/ai`: 20 requests/min per IP (HTTP 429). `/api/routes/compute` is also
  rate limited. The limiter is in-process: per server instance, reset on
  restart.
- AI input is sanitised (script tags and instruction-override phrases
  stripped); tested in `testGeminiTools.ts` and `testOfflineGuardian.ts`.
- AI Guardian tools are an **allow-list**. Anything with side effects is only
  a *proposal* the user must confirm in the UI; the model cannot execute it.
- Backend inputs are validated by Pydantic (coordinates range-checked; Digital
  Twin routes ≤ 20,000 points; simulated rainfall 0–150 mm/h).

## 5. Life-safety invariants

| Invariant | How |
|---|---|
| **112 is never called automatically** | No code path dials 112 without a user tap. The Emergency page's in-app 112 calling is **locked**: *Activate 112* confirmation, then a separate *Dial 112 Now* confirmation. AI can only *propose* a 112 call; the dialer opens only on the user's confirmation |
| **112 is never a Twilio destination** | `comms_service.normalize_phone_number` rejects 112, 911, short codes, 555 and repeated-digit numbers; `test_sos_audit_scenarios.py::test_scenario_02_invalid_number` |
| **Twilio only to the device's own trusted contacts** | Recipients for `/emergency/sms`, `/call`, `/notify-trusted-contact` are resolved server-side from the device's stored, enabled contacts. The request's optional `contact_phone` (sent by the UI for display) is **ignored**: with no stored contact the request is refused, and with one the stored number is used. Covered by `test_api_integration.py::test_client_supplied_contact_phone_is_never_the_recipient` |
| **No fake delivery** | Success only when Twilio accepts (a SID is returned). `TWILIO_DRY_RUN=true` by default and is labelled as such; failures say "Emergency communication failed … dial 112 directly" |
| **Simulations never communicate** | The Digital Twin what-if is a pure function on a deep-copied state with no access to Twilio, contacts or Safety Check. A test patches SMS/call to raise during a 100 mm/h simulation, and the E2E asserts zero `/emergency` or `/sos` requests during a what-if |
| **Offline never triggers Twilio** | Offline tools are read-only; Safety Check escalation happens on the backend when reachable, and the UI says so |
| **SOS always reachable** | Map overlays are isolated below the fixed bottom nav; E2E scenario 39 hit-tests the SOS button with the offline overlay shown |

**Note for the team:** outside the locked Emergency page, some screens
(landing page, SOS modal, Safety Check widget, offline Survival Card) contain a
direct `tel:112` link. It only opens the phone's own dialer, and the user must
still press call, so nothing is automatic. Whether those shortcuts should also
be gated like the Emergency page is a product decision, left as is on purpose.

## 6. No fabricated data

A standing rule, audited repeatedly. Recent removals: a hardcoded Safety Fit
89 and fake destination in AI context; invented trip history, city scores and
reviews; a default Chennai journey with synthetic route and made-up tile/size
figures; an unverified consular number in the Survival PDF; SOS failure
responses listing contacts as "broadcasted". Missing data is shown as
`UNAVAILABLE` with a reason. See `docs/MIDNIGHT_TASK_1_DIGITAL_TWIN.md` §7 and
`docs/OFFLINE_ARCHITECTURE.md` for the provenance rules.

## 7. Known gaps

- No authentication or accounts (see §3).
- The rate limiter and Digital Twin cache are in-process, not shared across
  instances.
- SQLite by default; production should use a managed database with backups.
- The on-device LLM grounding guard is heuristic (numbers, a risk lexicon,
  length). Facts always come from the deterministic layer.
- Dependency vulnerability scanning (`npm audit`, `pip-audit`) is not wired
  into CI.

## Reporting

Report security issues privately to the maintainer rather than opening a
public issue.
