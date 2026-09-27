# Judge Demo Script

Eleven short demos, about 20 minutes in total. Each lists the steps, what you
should see, and what happens if a dependency is down. **The app never fakes a
result.** When something is unavailable, it says so, and that is part of the
demo.

## Setup (once)

```bash
# terminal 1 (backend)
cd backend && venv/Scripts/python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
# terminal 2 (frontend)
cd frontend && npm run dev
# terminal 3 (sanity)
node scripts/check-env.mjs
```

Open http://localhost:3000. Use Chrome or Edge (WebGPU for demo 10b).
`TWILIO_DRY_RUN=true` is the default, so no real SMS or calls go out.
**Never dial 112 during the demo.**

---

### 1. Secrets stay on the server (1 min)
1. Run `node scripts/check-env.mjs`. It shows each variable's status and scope
   and **never prints a value**.
2. Run `node scripts/check-secret-exposure.mjs`. It fetches every page and JS
   chunk and searches for the real secret values.

**Expect:** "No server-only secret value appears…", with the public Maps key
found as a control. *Point out:* one `/.env.local`, and `serverEnv.ts` throws
if it's imported in the browser.

### 2. Plan a real journey (2 min)
1. **Plan Journey** → Hyderabad → Mumbai, Car → Calculate.

**Expect:** at most two real Google routes, each with a Safety Fit score from
the deterministic safety engine and real Places POIs. *Fallback:* if Routes
fails, an error is shown. There is no placeholder route.

### 3. Weather-Driven Digital Twin, live (3 min)
1. Open the route on **Live Map** → **Digital Twin** (waves icon).

**Expect:**
- Source chips: Open-Meteo `LIVE`/`CACHED`, GloFAS `FORECAST`, GDACS, and
  social media `NOT_INTEGRATED`.
- Six impact cards, and a propagation chain (input → rule → output).
- Coloured segment circles and GDACS markers on the Google map.
- An uncertainty block: provider probabilities only; derived impacts labelled
  *deterministic estimate*.

*Point out:* rivers with no significant flow are `NOT_ASSESSED`, not
"normal". Readiness says it's based on the hospitals the route search found.
Method and limits are in `docs/MIDNIGHT_TASK_1_DIGITAL_TWIN.md`.

### 4. What-if simulation (2 min)
1. In the panel, set rain to **20 mm/h** → **Run simulation**.
   **Expect:** `SIMULATED` tab, risk MODERATE, a delay estimate from the FHWA
   speed reductions, and live values shown beside each card.
2. Set **70 mm/h** → Run.
   **Expect:** HIGH, every segment LIKELY, and **delay not quantified**: an
   advisory that violent rain is beyond the study range (not "+0 min").
3. Click **Live**. The live state is unchanged.

*Point out:* the simulation runs on a deep copy with no access to Twilio,
contacts or Safety Check. The E2E test asserts zero emergency requests.

### 5. AI Guardian, grounded answers (3 min)
With the journey selected, go to **AI Guardian** and ask:
- "How will the weather affect my journey?" → route weather with source and
  fetch time, the risk, exposed km and alerts.
- "Is there any flooding risk on my route?" → GloFAS relative signal, "not an
  official flood warning".
- "What is my safety score?" → the real route's Safety Fit.
- "Who is my trusted contact?" → the stored contact with the phone masked, or
  "not configured". It never claims the contact's location.
- "Where am I?" → GPS coordinates, or "location unavailable".

*Point out:* these are answered from application data **before** any LLM
call.

### 6. Honest degradation (1 min)
If Gemini is unavailable (no key or quota exhausted), general questions show
an amber note: *"Gemini quota exceeded (HTTP 429). Answering with the
deterministic safety engine."* Nothing pretends to be the LLM.

### 7. Safety Check dead-man's switch (2 min)
1. **Safety Check** → start a check-in (the timer is enforced by the backend,
   so it survives closing the tab).
2. Use **Demo Mode** for a 30-second simulated cycle.

**Expect:** Demo Mode never dispatches real alerts. With `TWILIO_DRY_RUN`, an
escalation reports `dry_run` and `success: false`, never a fake "sent".

### 8. Emergency: 112 locked, Twilio restricted (2 min)
1. **Emergency** page: there is no 112 dial link until **Activate 112** →
   confirm; then a *second* confirmation (**Dial 112 Now**). *Stop before the
   final tap.*
2. "Notify trusted contact" (dry run) goes only to the stored contact. The
   backend ignores any number sent by the client and rejects 112/911 as
   destinations.

See `docs/SECURITY.md` §5 for the invariants and their tests.

### 9. Offline pack download (2 min)
1. From the Plan route card → **Download Offline Pack**.

**Expect:**
- Real progress (`n / total` tiles) from the public Protomaps OSM archive,
  with a **Cancel** option (cancelling stores nothing).
- The result: about 1,100–1,200 tiles (~14 MB), 135 turns and 26 safe havens
  for this route.
- The sizes shown are measured.

*Point out:* there is no default journey. Without a planned route, the page
asks you to plan one.

### 10. Offline mode (3 min)
Go offline (DevTools → Network → Offline).

a. **Live Map** switches automatically to the MapLibre map of the downloaded
   pack (Google Maps can't load offline, and its tiles are never cached). The
   note says rerouting is unavailable, and **SOS** stays on top.

b. **Offline hub** (`/offline-mode`):
   - The Survival Card: turns, safe havens, 112/1091 and the cached trusted
     contact.
   - Offline AI: "give me the route summary" is answered instantly by the
     deterministic engine.
   - With WebGPU: **Download** the on-device model (~280 MB; do this while
     online beforehand), then ask again. The reply is labelled *on-device LLM
     (grounding-checked)*, or *reply discarded: …* when the model embellished
     and the verified answer is shown instead.

c. Go back online. The live map returns.

### 11. Nugen aligned model (2 min)
**Status: implemented, pending a live run (needs `NUGEN_API_KEY`).** See
`docs/NUGEN_INTEGRATION.md`.

- **Once the workflow has run:** ask demo 5's weather question. The header
  shows `nugen-aligned:<model_id> (confidence N)`, and the reply restates the
  verified answer. Point out the grounding check: an embellished reply is
  discarded, with a visible reason.
- **Before that:** show `GET http://127.0.0.1:8000/api/nugen/status`
  (`api_key_configured: false`), and
  `venv/Scripts/python scripts/nugen_workflow.py discover` refusing honestly.
  No IDs are faked.

---

## If something fails live
| Symptom | Meaning | Say |
|---|---|---|
| Digital Twin chip `UNAVAILABLE` | Provider down or timed out | "The twin shows the reason instead of inventing weather." |
| AI amber "quota exceeded" | Gemini free tier used up | "The deterministic engine answers; the LLM is never faked." |
| Offline map blank when zoomed out | Tiles exist at zoom 10–13 along the route only | Zoom in on the blue line |
| Escalation `dry_run` | Twilio dry run (default) | "No real SMS; it never reports success unless Twilio accepts." |

Automated coverage: `npm test` (frontend unit suites), `pytest` (backend,
61 tests), `npm run test:e2e` (Playwright; 34 passed, 2 documented skips with
no retries). Status per scenario is in `docs/E2E_STATUS.md`.
