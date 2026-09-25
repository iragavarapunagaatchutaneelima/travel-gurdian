import time
import json
import urllib.request
import urllib.error
import subprocess
import sys

def run_live_test():
    print("Starting uvicorn test process on port 8009...")
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

        # 1. Test root
        req = urllib.request.Request("http://127.0.0.1:8009/")
        with urllib.request.urlopen(req, timeout=5) as res:
            data = json.loads(res.read().decode())
            print(f"Root endpoint OK: status={data.get('status')}")
            assert data.get("status") == "online"

        # 2. Test config status
        req = urllib.request.Request("http://127.0.0.1:8009/api/emergency/config-status")
        with urllib.request.urlopen(req, timeout=5) as res:
            cfg = json.loads(res.read().decode())
            print(f"Exotel config status endpoint OK: {cfg}")
            assert "is_configured" in cfg

        # 3. Test contacts
        req = urllib.request.Request("http://127.0.0.1:8009/api/assist/contacts")
        with urllib.request.urlopen(req, timeout=5) as res:
            contacts = json.loads(res.read().decode())
            print(f"Contacts retrieved: count={len(contacts)}")
            assert isinstance(contacts, list)

        # 4. Test emergency SMS endpoint with missing credentials -> safe handling
        sms_payload = json.dumps({"latitude": 12.9716, "longitude": 77.5946}).encode()
        req = urllib.request.Request(
            "http://127.0.0.1:8009/api/emergency/sms",
            data=sms_payload,
            headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(req, timeout=5) as res:
            sms_data = json.loads(res.read().decode())
            print(f"Emergency SMS endpoint response: {sms_data}")
            assert "success" in sms_data
            assert "status" in sms_data
            # Verify secrets are NOT leaked in response
            response_str = json.dumps(sms_data)
            assert "EXOTEL_API_KEY" not in response_str
            assert "EXOTEL_API_TOKEN" not in response_str

        # 5. Test emergency Call endpoint
        call_payload = json.dumps({"latitude": 12.9716, "longitude": 77.5946}).encode()
        req = urllib.request.Request(
            "http://127.0.0.1:8009/api/emergency/call",
            data=call_payload,
            headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(req, timeout=5) as res:
            call_data = json.loads(res.read().decode())
            print(f"Emergency Call endpoint response: {call_data}")
            assert "success" in call_data
            assert "status" in call_data

        print("\nALL LIVE SERVER TESTS PASSED SUCCESSFULLY!")

    finally:
        proc.terminate()
        try:
            proc.wait(timeout=3)
        except Exception:
            proc.kill()

if __name__ == "__main__":
    run_live_test()
