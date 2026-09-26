# TWILIO EMERGENCY COMMUNICATION SETUP

This document provides setup instructions and production deployment guidelines for integrating Twilio emergency SMS and outbound voice calls into Travel Guardian.

> **Dry-run by default.** `TWILIO_DRY_RUN` defaults to `true`. While it is
> true, every SMS/call request is fully built and validated (phone
> normalization, request construction) but **never sent over the network**
> and does **not** require real credentials -- the response reports
> `status: "dry_run"`, never `"sent"`/`"initiated"`. Set `TWILIO_DRY_RUN=false`
> only once you have a real Twilio account, `TWILIO_ACCOUNT_SID`,
> `TWILIO_AUTH_TOKEN`, and `TWILIO_PHONE_NUMBER` configured. Never flip this
> to `false` in a shared/demo/CI environment.
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

Travel Guardian uses an `EmergencyCommunicationProvider` abstraction
(`backend/app/services/communication/`) so the emergency SMS/call vendor is
swappable without touching API routes. `TwilioProvider` is the real
implementation; `MockProvider` is used only for Safety Check demo mode and
automated tests, and always simulates.

```
Travel Guardian Frontend
        │
        │ HTTPS POST (strictly no credentials / no arbitrary numbers)
        ▼
FastAPI Backend  ──►  comms_service (provider facade)
        │
        │ Authenticated Twilio REST API (Basic Auth: Account SID + Auth Token)
        ▼
   Twilio API (api.twilio.com)
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
- **Official Emergency Line (112)**: Handled exclusively via the client-side direct dialer (`tel:112`). It is never routed through Twilio.
- **Twilio SMS & Voice**: Routes strictly to the user's stored trusted contact from the backend database (`EmergencyContact`).
- **Arbitrary Numbers**: Prohibited. The frontend does not accept or send arbitrary destination phone numbers.

---

## 2. Setup Step-by-Step

### Step 1: Create a Twilio Account
1. Visit [https://www.twilio.com/try-twilio](https://www.twilio.com/try-twilio) and sign up.
2. Trial accounts get free credit but can only send to phone numbers you've verified under **Phone Numbers -> Manage -> Verified Caller IDs**.

### Step 2: Get a Twilio Phone Number
1. In the [Twilio Console](https://console.twilio.com), go to **Phone Numbers -> Manage -> Buy a number**.
2. Buy (or use the trial's free) number with SMS + Voice capability.

### Step 3: Obtain API Credentials
1. On the [Console dashboard](https://console.twilio.com), copy your:
   - **Account SID** (starts with `AC`)
   - **Auth Token** (click "show" to reveal it)

### Step 4: Add Credentials to Backend Environment (`.env`)
1. Create or open `backend/.env`:
   ```bash
   cp backend/.env.example backend/.env
   ```
2. Set your Twilio configuration (replace with your real values):
   ```env
   TWILIO_ACCOUNT_SID=ACyour_real_account_sid_here
   TWILIO_AUTH_TOKEN=your_real_auth_token_here
   TWILIO_PHONE_NUMBER=+15551234567
   TWILIO_DRY_RUN=false
   ```

### Step 5: Security Rules (Never Expose Credentials to Frontend)
- **NEVER** add `NEXT_PUBLIC_TWILIO_*` variables to any frontend environment or client bundle.
- **NEVER** commit the real `.env` file to git.
- The backend handles all communication with Twilio servers.

### Step 6: Configure Trusted Contact
1. Launch the Travel Guardian application.
2. Navigate to the **Emergency Portal** (`/emergency`).
3. Under **Trusted Guardian Contacts**, add and enable your primary guardian contact (e.g. `+91 98765 43210`).
4. **On a trial Twilio account**, this exact number must also be added under **Verified Caller IDs** in the Twilio Console, or Twilio will reject the send with error 21608.

### Step 7: Test Emergency SMS
1. On `/emergency`, click **Alert Trusted Contact (SMS)**.
2. Verify the recipient receives an SMS with your name and live Google Maps location URL.

### Step 8: Test Emergency Voice Call
1. Click **Call Trusted Contact (Voice)**.
2. Verify the trusted contact receives an incoming call from your Twilio number with a spoken alert.

### Step 9: Test Full SOS Broadcast
1. Click **SOS — Broadcast to Trusted Contact (SMS + Call)**.
2. Verify both SMS and Voice Call are dispatched and the UI reflects `Overall: COMPLETED`.

### Step 10: Verify 112 Separately
1. Confirm the **Call Emergency Services — 112** button remains visible and triggers the native phone dialer (`tel:112`).
2. Confirm 112 is never dialed through Twilio.

---

## 3. Account Limitations & Production Requirements

> [!NOTE]
> **Trial Accounts vs Production**:
> - Trial accounts can only send SMS/calls to numbers verified under **Verified Caller IDs**, and every SMS is prefixed with "Sent from your Twilio trial account -".
> - Upgrade to a paid account to remove these restrictions.

> [!IMPORTANT]
> **India SMS delivery**: carriers may filter unregistered international sender traffic. For reliable production delivery to Indian numbers, consider a Twilio-registered Indian sender ID / entity, or an approved WhatsApp Business sender as a fallback channel.

---

## 4. Production Deployment Checklist
1. **Backend**: Provide `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` as secure server environment variables in your hosting environment (e.g., Cloud Run, Railway, Docker, Render).
2. **Frontend (Vercel)**: Only configure `NEXT_PUBLIC_API_URL` pointing to the backend domain. Never add Twilio secrets to Vercel environment variables.
3. **Database**: Ensure persistent database storage (PostgreSQL/MySQL or mounted volume for SQLite) so user trusted contacts persist across deploys.
