# Configuration Architecture

How configuration flows from one file into two applications. For the list
of variables see [../ENVIRONMENT.md](../ENVIRONMENT.md).

```
                  /.env.local   (repo root, gitignored, canonical)
                        │
          ┌─────────────┴──────────────┐
          ▼                            ▼
 frontend/next.config.ts        backend/app/core/config.py
 loads root file into           pydantic-settings Settings,
 process.env at startup         env_file = (backend/.env, /.env.local)
          │                            │
    ┌─────┴──────────┐                 ▼
    ▼                ▼          settings.* used by every backend module
config/publicEnv.ts  config/serverEnv.ts      (no os.getenv anywhere)
NEXT_PUBLIC_* only   secrets for app/api/*
inlined into the     route handlers; throws if
browser bundle       ever imported in a browser
```

## Precedence

| App | Order (later wins) |
|---|---|
| Frontend | `frontend/.env.local` (legacy, auto-loaded by Next.js) → `/.env.local` (applied in `next.config.ts`, overriding) |
| Backend | `backend/.env` (legacy) → `/.env.local` |

Empty values in `/.env.local` do not override a legacy value on the
frontend; on the backend, pydantic treats an empty value as set-but-empty,
and every consumer treats empty as "not configured".

## Why the backend owns the Nugen key

Nugen alignment, deployment, and inference run only in FastAPI. The Next.js
AI route asks the backend for a Nugen explanation over the same-origin
proxy, so `NUGEN_API_KEY` exists in exactly one process and is never
reachable from the browser. The Twilio credentials follow the same rule.

## Why `NEXT_PUBLIC_*` values are spelled out literally

Next.js replaces `process.env.NEXT_PUBLIC_X` with its value at build time,
but only for literal expressions. `publicEnv.ts` therefore lists each one
explicitly instead of looking names up dynamically.

## Restart required

Both apps read configuration at startup. After editing `/.env.local`,
restart `npm run dev` and `uvicorn`.
