#!/usr/bin/env python3
"""
SHERLOCK Chaos Simulation Script — Third-Party API Timeout
Triggers the third-party API timeout scenario on the payment-service.
"""
import sys
import httpx

TARGET_URL = "http://localhost:8004/chaos/api-timeout"

def main():
    print(f"🔥 Triggering Third-Party API Timeout Scenario via {TARGET_URL}...")
    try:
        response = httpx.post(TARGET_URL, timeout=5.0)
        if response.status_code == 200:
            print("✅ Success: Third-Party API Timeout scenario activated!")
            print(f"Response: {response.json()}")
        else:
            print(f"❌ Failed: Service returned status code {response.status_code}")
            print(response.text)
            sys.exit(1)
    except Exception as e:
        print(f"❌ Error: Could not connect to payment-service: {e}")
        print("Make sure your docker-compose services are running and accessible on localhost ports.")
        sys.exit(1)

if __name__ == "__main__":
    main()
