#!/usr/bin/env python3
"""
SHERLOCK Chaos Simulation Script — Database Connection Exhaustion
Triggers the database connection exhaustion scenario on the auth-service.
"""
import sys
import httpx

TARGET_URL = "http://localhost:8001/chaos/db-exhaustion"

def main():
    print(f"🔥 Triggering Database Connection Exhaustion via {TARGET_URL}...")
    try:
        response = httpx.post(TARGET_URL, timeout=5.0)
        if response.status_code == 200:
            print("✅ Success: Database connection exhaustion scenario activated!")
            print(f"Response: {response.json()}")
        else:
            print(f"❌ Failed: Service returned status code {response.status_code}")
            print(response.text)
            sys.exit(1)
    except Exception as e:
        print(f"❌ Error: Could not connect to auth-service: {e}")
        print("Make sure your docker-compose services are running and accessible on localhost ports.")
        sys.exit(1)

if __name__ == "__main__":
    main()
