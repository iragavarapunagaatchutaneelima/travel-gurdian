# EXOTEL EMERGENCY COMMUNICATION SETUP

This document provides setup instructions and production deployment guidelines for integrating Exotel emergency SMS and outbound voice calls into Travel Guardian.

> **Dry-run by default.** `EXOTEL_DRY_RUN` defaults to `true`. While it is
> true, every SMS/call request is fully built and validated (phone
> normalization, credential checks, request construction) but **never sent
> over the network** -- the response reports `status: "dry_run"`, never
> `"sent"`/`"initiated"`. Set `EXOTEL_DRY_RUN=false` only once you have real,
> KYC-approved credentials and a provisioned ExoPhone. Never flip this to
> `false` in a shared/demo/CI environment.
>
> **Primary contact resolution is deterministic.** Each `EmergencyContact`
> row has an `is_primary` flag; exactly one enabled contact per device is
> primary (auto-assigned to the first contact created, re-assigned
> automatically if the primary is deleted or disabled). Dispatch always
> targets that contact -- never "whichever row the database happens to
> return first".
>
> **Contacts are scoped per device**, not to a single shared "default_user".
> Each browser gets its own `tg_device_id` cookie (see
> `backend/app/core/identity.py`) and only ever sees its own contacts.

---

## 1. Overview & Architecture

Travel Guardian uses Exotel strictly for emergency communication directed to the traveler's configured **Trusted Guardian Contact**.

```
Travel Guardian Frontend
        │
        │ HTTPS POST (strictly no credentials / no arbitrary numbers)
        ▼
FastAPI Backend
        │
        │ Authenticated Exotel REST API (Basic Auth: API Key + Token)
        ▼
   Exotel API
   (api.exotel.com / Subdomain)
        │
   ┌────┴─────────────────┐
   ▼                      ▼
Emergency SMS       Outbound Voice Call
   │                      │
   └──────────┬───────────┘
              ▼
    Stored Trusted Contact
```

### Destination Restrictions
- **Official Emergency Line (112)**: Handled exclusively via the client-side direct dialer (`tel:112`). It is never routed through Exotel.
- **Exotel SMS & Voice**: Routes strictly to the user's stored trusted contact from the backend database (`EmergencyContact`).
- **Arbitrary Numbers**: Prohibited. The frontend does not accept or send arbitrary destination phone numbers.

---

## 2. Setup Step-by-Step

### Step 1: Create an Exotel Account
1. Visit [https://my.exotel.com/auth/register](https://my.exotel.com/auth/register) and register for an Exotel account.
2. Complete account registration and email/phone verification.

### Step 2: Obtain API Credentials
1. Log in to your [Exotel Dashboard](https://my.exotel.com).
2. Navigate to **API Settings** (or **Settings > API & Webhooks**).
3. Find your:
   - **Account SID** (e.g. `your_account_sid`)
   - **API Key**
   - **API Token**
   - **Exophone** (your virtual caller ID number provided by Exotel, e.g. `080xxxxxxxx`)
   - **Subdomain** (e.g. `api.exotel.com` or your specific regional cluster)

### Step 3: Add Credentials to Backend Environment (`.env`)
1. Create or open `backend/.env`:
   ```bash
   cp backend/.env.example backend/.env
   ```
2. Set your Exotel configuration (replace with your real credentials):
   ```env
   EXOTEL_API_KEY=your_real_api_key_here
   EXOTEL_API_TOKEN=your_real_api_token_here
   EXOTEL_ACCOUNT_SID=your_real_account_sid_here
   EXOTEL_EXOPHONE=your_real_exophone_here
   EXOTEL_SUBDOMAIN=api.exotel.com
   ```
   *(Optional)* If using an IVR App/Flow for outbound emergency calls:
   ```env
   EXOTEL_APP_ID=your_app_id
   ```

### Step 4: Security Rules (Never Expose Credentials to Frontend)
- **NEVER** add `NEXT_PUBLIC_EXOTEL_*` variables to any frontend environment or client bundle.
- **NEVER** commit the real `.env` file to git.
- The backend handles all communication with Exotel servers securely.

### Step 5: Configure Trusted Contact
1. Launch the Travel Guardian application.
2. Navigate to the **Emergency Portal** (`/emergency`).
3. Under **Trusted Guardian Contacts**, ensure your primary guardian contact is added and enabled (e.g., name and phone number with country code, e.g. `+91 98765 43210`).

### Step 6: Test Emergency SMS
1. On `/emergency`, click **Alert Trusted Contact (SMS)**.
2. Verify that:
   - Status transitions to `SENDING` -> `SENT`.
   - The recipient receives the SMS alert with your name and live Google Maps location URL:
     ```
     TRAVEL GUARDIAN EMERGENCY ALERT

     An emergency alert has been activated by [NAME].

     Current location:
     https://www.google.com/maps?q=LATITUDE,LONGITUDE

     Please contact them immediately.

     Travel Guardian
     ```

### Step 7: Test Emergency Voice Call
1. Click **Call Trusted Contact (Voice)**.
2. Verify that:
   - Status transitions to `INITIATED`.
   - The trusted contact receives an incoming call from your configured Exophone.

### Step 8: Test Full SOS Broadcast
1. Click **SOS — Broadcast to Trusted Contact (SMS + Call)**.
2. Verify that both SMS and Voice Call are dispatched simultaneously and the UI reflects `Overall: COMPLETED`.

### Step 9: Verify 112 Separately
1. Verify that the **Call Emergency Services — 112** button remains visible and triggers the native phone dialer (`tel:112`).
2. Confirm that 112 is never dialed through Exotel.

---

## 3. Account Limitations, DLT & Production Requirements

> [!NOTE]
> **Trial Accounts vs Production**:
> - Exotel trial accounts typically have restricted calling credits and can only make calls/SMS to pre-whitelisted phone numbers.
> - For unrestricted live testing, whitelist your personal/guardian numbers in the Exotel dashboard under **Numbers > Whitelisted Numbers**.

> [!IMPORTANT]
> **DLT / Regulatory Requirements for India**:
> - In India, regulatory compliance (TRAI DLT) mandates that SMS templates and Sender IDs (Header) must be registered on a DLT portal (e.g. Jio, Airtel, Vodafone DLT).
> - For production SMS delivery, your Exotel account must be linked to an approved DLT Principal Entity and DLT Content Template.

---

## 4. Production Deployment Checklist
1. **Backend**: Provide `EXOTEL_API_KEY`, `EXOTEL_API_TOKEN`, `EXOTEL_ACCOUNT_SID`, `EXOTEL_EXOPHONE` as secure server environment variables in your hosting environment (e.g., Cloud Run, Railway, Docker, Render).
2. **Frontend (Vercel)**: Only configure `NEXT_PUBLIC_API_URL` pointing to the backend domain. Never add Exotel secrets to Vercel environment variables.
3. **Database**: Ensure persistent database storage (PostgreSQL/MySQL or mounted volume for SQLite) so user trusted contacts persist across deploys.
