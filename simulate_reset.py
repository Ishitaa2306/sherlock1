#!/usr/bin/env python3
"""
SHERLOCK Chaos Reset Script
Resets all failure modes and chaos states across all demo services.
"""
import sys
import httpx

SERVICES = {
    "auth-service": "http://localhost:8001/chaos/reset",
    "checkout-service": "http://localhost:8002/chaos/reset",
    "recommendation-service": "http://localhost:8003/chaos/reset",
    "payment-service": "http://localhost:8004/chaos/reset"
}

def main():
    print("♻️ Resetting all service chaos states...")
    errors = 0
    for name, url in SERVICES.items():
        try:
            response = httpx.post(url, timeout=3.0)
            if response.status_code == 200:
                print(f"✅ Reset successful for {name}")
            else:
                print(f"⚠️ Service {name} returned status {response.status_code} on reset")
        except Exception as e:
            print(f"❌ Error: Could not connect to {name} at {url}: {e}")
            errors += 1
    
    if errors:
        print("\n⚠️ Done with some errors. Ensure your docker-compose containers are running.")
    else:
        print("\n✅ All service states successfully reset to normal!")

if __name__ == "__main__":
    main()
