"""
SHERLOCK — Socket-level hostname resolution patch for local (non-Docker) execution.
Loaded automatically via PYTHONPATH/sitecustomize.py.
Redirects Docker container hostnames to 127.0.0.1 so all inter-service
calls work transparently on localhost.
"""
import socket

_original_getaddrinfo = socket.getaddrinfo
_original_gethostbyname = socket.gethostbyname

LOCAL_MAPPINGS = {
    "auth-service",
    "checkout-service",
    "recommendation-service",
    "payment-service",
    "prometheus",
    "grafana",
    "backend",
}

def custom_getaddrinfo(host, port, family=0, type=0, proto=0, flags=0):
    if isinstance(host, str) and host in LOCAL_MAPPINGS:
        host = "127.0.0.1"
    return _original_getaddrinfo(host, port, family, type, proto, flags)

def custom_gethostbyname(host):
    if isinstance(host, str) and host in LOCAL_MAPPINGS:
        return "127.0.0.1"
    return _original_gethostbyname(host)

socket.getaddrinfo = custom_getaddrinfo
socket.gethostbyname = custom_gethostbyname

print("[SHERLOCK LOCAL PATCH] Hooked socket DNS resolution for hostnames:", sorted(LOCAL_MAPPINGS))
