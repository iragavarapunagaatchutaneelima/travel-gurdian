# API Configuration

Step-by-step setup for every external service. All values go in the
repository-root `/.env.local` ([ENVIRONMENT.md](../ENVIRONMENT.md)). Check
your setup any time with `node scripts/check-env.mjs`.

## Google Maps Platform (required)

1. In Google Cloud Console, enable: Maps JavaScript API, Places API (New),
   Geocoding API, Directions API, Routes API.
2. Create a browser key, restricted by HTTP referrer
   (`http://localhost:3000/*`, your production domain) and to those APIs.
   Set `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`.
3. Optional but recommended for production: a second, IP-restricted key
   for server-side Routes/Places calls. Set `GOOGLE_ROUTES_API_KEY`.
4. Billing must be enabled or requests fail with `OVER_QUERY_LIMIT`.

## Gemini (optional)

1. Create a key at https://aistudio.google.com/app/apikey. Set `GEMINI_API_KEY`.
2. `GEMINI_MODEL` defaults to `gemini-2.5-flash`.
3. The free tier is very small (20 requests/day at the time of writing).
   When it's exhausted, AI Guardian keeps answering from the deterministic
   grounded tools and labels each reply "Gemini quota exceeded". Use a
   billed project for demos.

## Nugen Intelligence (Midnight Task 2)

1. Get an API key from your Nugen dashboard. Set `NUGEN_API_KEY`.
2. Run the alignment workflow (base-model discovery, corpus upload,
   benchmark, alignment, deployment); see
   [NUGEN_INTEGRATION.md](NUGEN_INTEGRATION.md). It records the real model
   IDs it obtains in `NUGEN_BASE_MODEL_ID` / `NUGEN_ALIGNED_MODEL_ID`.
3. The key is read only by the backend. Never add a `NEXT_PUBLIC_` copy.

## Twilio (optional; emergency SMS/voice)

1. From https://console.twilio.com copy the Account SID and Auth Token, and
   buy (or use the trial) phone number.
2. Set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`.
3. Keep `TWILIO_DRY_RUN=true` until you've confirmed everything; then set it
   to `false`. Trial accounts can only send to verified numbers. See
   [TWILIO_SETUP.md](TWILIO_SETUP.md).

## Keyless live data (no setup)

| Service | Used for | Endpoint | Terms |
|---|---|---|---|
| Open-Meteo Forecast | Live weather, hourly forecast, precipitation, wind | `api.open-meteo.com/v1/forecast` | Free non-commercial (< 10,000 calls/day). Attribution: "Weather data by Open-Meteo.com" (CC BY 4.0) |
| Open-Meteo Flood | River discharge forecast (GloFAS) | `flood-api.open-meteo.com/v1/flood` | Same as above; GloFAS data © Copernicus |
| GDACS | Official disaster alerts (floods, cyclones, earthquakes) | `www.gdacs.org/gdacsapi/api/events/geteventlist/...` | Public UN/EC service; cite GDACS as source |

These need outbound network access from the backend. If they're
unreachable, the app shows the data as UNAVAILABLE with the reason; it
never substitutes invented values.

## Offline map and on-device AI (no keys)

- Offline vector tiles: Protomaps' public OpenStreetMap PMTiles archive
  (`build.protomaps.com`), fetched by the browser when you download a
  journey pack. © OpenStreetMap contributors (ODbL).
- On-device LLM: WebLLM model files from Hugging Face, downloaded by the
  browser on first use (WebGPU browsers only).

The browser's Content-Security-Policy in `frontend/next.config.ts`
allowlists exactly these hosts.
