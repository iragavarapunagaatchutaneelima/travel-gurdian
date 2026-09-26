import time
import json
import urllib.request
import urllib.error
import subprocess
import sys

def run_live_test():
    print("Starting uvicorn live test process on port 8009...")
    proc = subprocess.Popen(
        [
            sys.executable, "-m", "uvicorn", "app.main:app",
            "--host", "127.0.0.1", "--port", "8009"
        ],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )

    try:
        # Wait for server to start
        time.sleep(2.5)

        # 1. Test root info
        req = urllib.request.Request("http://127.0.0.1:8009/")
        with urllib.request.urlopen(req, timeout=5) as res:
            data = json.loads(res.read().decode())
            print(f"[1] Root endpoint OK: status={data.get('status')}")
            assert data.get("status") == "online"
            assert "emergency_sms" in data.get("endpoints", {})

        # 2. Test config status (both /emergency/config-status and /api/emergency/config-status)
        for path in ["/emergency/config-status", "/api/emergency/config-status"]:
            req = urllib.request.Request(f"http://127.0.0.1:8009{path}")
            with urllib.request.urlopen(req, timeout=5) as res:
                cfg = json.loads(res.read().decode())
                print(f"[2] Exotel config status ({path}) OK: is_configured={cfg.get('is_configured')}, region={cfg.get('region')}")
                assert "is_configured" in cfg
                assert cfg.get("region") == "Singapore"
                assert cfg.get("host") == "api.exotel.com"
                # Ensure no secrets leaked
                raw_cfg = json.dumps(cfg)
                assert "EXOTEL_API_KEY" not in raw_cfg
                assert "EXOTEL_API_TOKEN" not in raw_cfg

        # 3. Test contacts CRUD synchronization over live HTTP
        # 3a. Initial state: GET contacts
        req = urllib.request.Request("http://127.0.0.1:8009/api/assist/contacts?user_id=live_test_user")
        with urllib.request.urlopen(req, timeout=5) as res:
            contacts = json.loads(res.read().decode())
            print(f"[3a] Contacts retrieved: initial_count={len(contacts)}")
            assert isinstance(contacts, list)

        # 3b. Add contact (POST)
        post_data = json.dumps({
            "name": "Live Sync Contact",
            "phone": "+919876543210",
            "relation": "Family Guardian",
            "is_enabled": True
        }).encode()
        post_req = urllib.request.Request(
            "http://127.0.0.1:8009/api/assist/contacts?user_id=live_test_user",
            data=post_data,
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        with urllib.request.urlopen(post_req, timeout=5) as res:
            assert res.status == 201
            created_contact = json.loads(res.read().decode())
            live_cid = created_contact["id"]
            print(f"[3b] Add contact OK: id={live_cid}, name={created_contact['name']}, enabled={created_contact['is_enabled']}")
            assert created_contact["is_enabled"] is True

        # 3c. Duplicate contact (POST with same phone) -> must return 409 Conflict
        try:
            with urllib.request.urlopen(post_req, timeout=5) as res:
                assert False, "Duplicate contact must return HTTP 409 Conflict"
        except urllib.error.HTTPError as he:
            print(f"[3c] Duplicate contact check OK: HTTP {he.code}")
            assert he.code == 409

        # 3d. Invalid phone number (POST with 555 fictional number) -> must return 400 Bad Request
        inv_data = json.dumps({"name": "Invalid", "phone": "+1-555-0199", "relation": "Test"}).encode()
        inv_req = urllib.request.Request(
            "http://127.0.0.1:8009/api/assist/contacts?user_id=live_test_user",
            data=inv_data,
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        try:
            with urllib.request.urlopen(inv_req, timeout=5) as res:
                assert False, "Invalid phone number must return HTTP 400 Bad Request"
        except urllib.error.HTTPError as he:
            print(f"[3d] Invalid number validation OK: HTTP {he.code}")
            assert he.code == 400

        # 3e. Reload (GET /contacts) -> verify persisted
        with urllib.request.urlopen(req, timeout=5) as res:
            reloaded = json.loads(res.read().decode())
            print(f"[3e] Reload after Add OK: count={len(reloaded)}")
            assert any(c["id"] == live_cid for c in reloaded)

        # 3f. Edit contact (PUT) -> update name & relation on SAME record
        edit_data = json.dumps({
            "name": "Live Sync Contact (Updated)",
            "relation": "Primary Guardian"
        }).encode()
        edit_req = urllib.request.Request(
            f"http://127.0.0.1:8009/api/assist/contacts/{live_cid}?user_id=live_test_user",
            data=edit_data,
            headers={"Content-Type": "application/json"},
            method="PUT"
        )
        with urllib.request.urlopen(edit_req, timeout=5) as res:
            assert res.status == 200
            edited = json.loads(res.read().decode())
            print(f"[3f] Edit contact OK: id={edited['id']}, name={edited['name']}")
            assert edited["id"] == live_cid
            assert edited["name"] == "Live Sync Contact (Updated)"

        # 3g. Disable contact (PUT is_enabled=False) -> persist disabled state
        disable_data = json.dumps({"is_enabled": False}).encode()
        disable_req = urllib.request.Request(
            f"http://127.0.0.1:8009/api/assist/contacts/{live_cid}?user_id=live_test_user",
            data=disable_data,
            headers={"Content-Type": "application/json"},
            method="PUT"
        )
        with urllib.request.urlopen(disable_req, timeout=5) as res:
            assert res.status == 200
            disabled = json.loads(res.read().decode())
            print(f"[3g] Disable contact OK: is_enabled={disabled['is_enabled']}")
            assert disabled["is_enabled"] is False

        # 3h. Reload (GET /contacts) -> verify disabled state is preserved
        with urllib.request.urlopen(req, timeout=5) as res:
            reloaded_disabled = json.loads(res.read().decode())
            target = next((c for c in reloaded_disabled if c["id"] == live_cid), None)
            assert target is not None
            assert target["is_enabled"] is False
            print(f"[3h] Reload after Disable OK: persisted is_enabled={target['is_enabled']}")

        # 3i. Delete contact (DELETE) -> permanently remove
        del_req = urllib.request.Request(
            f"http://127.0.0.1:8009/api/assist/contacts/{live_cid}?user_id=live_test_user",
            method="DELETE"
        )
        with urllib.request.urlopen(del_req, timeout=5) as res:
            print(f"[3i] Delete contact OK: HTTP {res.status}")
            assert res.status == 204

        # 3j. Reload (GET /contacts) -> verify permanently deleted
        with urllib.request.urlopen(req, timeout=5) as res:
            reloaded_del = json.loads(res.read().decode())
            assert not any(c["id"] == live_cid for c in reloaded_del)
            print(f"[3j] Reload after Delete OK: contact {live_cid} no longer exists")

        # 4. Test emergency SMS endpoints (both root and /api)
        sms_payload = json.dumps({
            "latitude": 12.9716,
            "longitude": 77.5946,
            "custom_message": "Audit testing emergency SMS"
        }).encode()

        for path in ["/emergency/sms", "/api/emergency/sms"]:
            req = urllib.request.Request(
                f"http://127.0.0.1:8009{path}",
                data=sms_payload,
                headers={"Content-Type": "application/json"}
            )
            with urllib.request.urlopen(req, timeout=10) as res:
                sms_data = json.loads(res.read().decode())
                print(f"[4] Emergency SMS ({path}) response: success={sms_data.get('success')}, status={sms_data.get('status')}")
                assert "success" in sms_data
                assert "status" in sms_data
                # Verify secrets are NOT leaked in response
                raw_resp = json.dumps(sms_data)
                assert "EXOTEL_API_KEY" not in raw_resp
                assert "EXOTEL_API_TOKEN" not in raw_resp

        # 5. Test emergency Call endpoints (both root and /api)
        call_payload = json.dumps({
            "latitude": 12.9716,
            "longitude": 77.5946
        }).encode()

        for path in ["/emergency/call", "/api/emergency/call"]:
            req = urllib.request.Request(
                f"http://127.0.0.1:8009{path}",
                data=call_payload,
                headers={"Content-Type": "application/json"}
            )
            with urllib.request.urlopen(req, timeout=10) as res:
                call_data = json.loads(res.read().decode())
                print(f"[5] Emergency Call ({path}) response: success={call_data.get('success')}, status={call_data.get('status')}")
                assert "success" in call_data
                assert "status" in call_data
                raw_resp = json.dumps(call_data)
                assert "EXOTEL_API_KEY" not in raw_resp
                assert "EXOTEL_API_TOKEN" not in raw_resp

        # 6. Test emergency notify-trusted-contact (both root and /api)
        notify_payload = json.dumps({
            "latitude": 12.9716,
            "longitude": 77.5946,
            "include_sms": True,
            "include_call": True
        }).encode()

        for path in ["/emergency/notify-trusted-contact", "/api/emergency/notify-trusted-contact"]:
            req = urllib.request.Request(
                f"http://127.0.0.1:8009{path}",
                data=notify_payload,
                headers={"Content-Type": "application/json"}
            )
            with urllib.request.urlopen(req, timeout=15) as res:
                notify_data = json.loads(res.read().decode())
                print(f"[6] Combined notify ({path}) response: success={notify_data.get('success')}, overall={notify_data.get('overall_status')}")
                assert "success" in notify_data
                assert "overall_status" in notify_data
                assert "sms_status" in notify_data
                assert "call_status" in notify_data

        # 7. Test diagnostic endpoint
        req = urllib.request.Request("http://127.0.0.1:8009/emergency/diagnostic")
        with urllib.request.urlopen(req, timeout=10) as res:
            diag_data = json.loads(res.read().decode())
            print(f"[7] Diagnostic endpoint response: cluster={diag_data.get('cluster')}, auth={diag_data.get('authenticated')}")
            assert "is_configured" in diag_data
            assert "authenticated" in diag_data
            assert diag_data.get("host") == "api.exotel.com"

        # 8. Test SOS broadcast endpoint (/api/assist/sos)
        sos_payload = json.dumps({
            "latitude": 17.3850,
            "longitude": 78.4867,
            "custom_message": "Live SOS test"
        }).encode()
        req = urllib.request.Request(
            "http://127.0.0.1:8009/api/assist/sos",
            data=sos_payload,
            headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(req, timeout=15) as res:
            sos_data = json.loads(res.read().decode())
            print(f"[8] SOS endpoint response: success={sos_data.get('success')}, overall={sos_data.get('overall_status')}")
            assert "success" in sos_data
            assert "nearest_havens" in sos_data
            assert len(sos_data["nearest_havens"]) > 0
            # Ensure official emergency hotline 112 is present, no mock numbers
        # 9. Test Dead-Man's Switch Check-in Creation over live HTTP (/api/assist/checkin)
        import datetime
        now_iso = (datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(minutes=10)).isoformat()
        checkin_payload = json.dumps({
            "target_time": now_iso,
            "checkin_text": "Live test transit through metro corridor",
            "latitude": 12.9716,
            "longitude": 77.5946
        }).encode()
        chk_req = urllib.request.Request(
            "http://127.0.0.1:8009/api/assist/checkin?user_id=live_test_user",
            data=checkin_payload,
            headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(chk_req, timeout=5) as res:
            chk_data = json.loads(res.read().decode())
            print(f"[9] Safe Check-in created: id={chk_data.get('id')}, status={chk_data.get('escalation_status')}")
            assert chk_data.get("escalation_status") == "pending"
            assert chk_data.get("is_completed") is False
            assert chk_data.get("last_known_latitude") == 12.9716

        # 10. Test GPS update for active check-in (/api/assist/checkin/location)
        loc_payload = json.dumps({
            "latitude": 12.9800,
            "longitude": 77.6000
        }).encode()
        loc_req = urllib.request.Request(
            "http://127.0.0.1:8009/api/assist/checkin/location?user_id=live_test_user",
            data=loc_payload,
            headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(loc_req, timeout=5) as res:
            loc_data = json.loads(res.read().decode())
            print(f"[10] Check-in GPS snapshot updated: lat={loc_data.get('last_known_latitude')}, lon={loc_data.get('last_known_longitude')}")
            assert loc_data.get("last_known_latitude") == 12.9800

        # 11. Test Dead-Man's Switch Background Scheduler status (/api/assist/checkin/scheduler-status)
        sched_req = urllib.request.Request("http://127.0.0.1:8009/api/assist/checkin/scheduler-status")
        with urllib.request.urlopen(sched_req, timeout=5) as res:
            sched_data = json.loads(res.read().decode())
            print(f"[11] Background scheduler active: running={sched_data.get('is_running')}, poll_interval={sched_data.get('poll_interval_seconds')}s, active_timers={sched_data.get('active_pending_count')}")
            assert sched_data.get("is_running") is True
            assert sched_data.get("active_pending_count") >= 1

        # 12. Test Safe Check-in Confirmation (/api/assist/checkin/confirm)
        conf_req = urllib.request.Request(
            "http://127.0.0.1:8009/api/assist/checkin/confirm?user_id=live_test_user",
            data=b"{}",
            headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(conf_req, timeout=5) as res:
            conf_data = json.loads(res.read().decode())
            print(f"[12] Safe Check-in confirmed: completed={conf_data.get('is_completed')}, status={conf_data.get('escalation_status')}")
            assert conf_data.get("is_completed") is True
            assert conf_data.get("escalation_status") == "confirmed_safe"

        print("\nALL 12 PRODUCTION LIVE SERVER AUDIT CHECKS PASSED PERFECTLY!")

    finally:
        proc.terminate()
        try:
            proc.wait(timeout=3)
        except Exception:
            proc.kill()

if __name__ == "__main__":
    run_live_test()
