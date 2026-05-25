"""
SHERLOCK -- Local Windows Process Orchestrator (No Docker)
Run all services locally: Prometheus, 4 microservices, FastAPI backend, Vite frontend.
"""
import os
import sys
import time
import subprocess
import urllib.request
import zipfile
import shutil
import signal

def print_yellow(msg): print(f"\033[93m{msg}\033[0m")
def print_green(msg):  print(f"\033[92m{msg}\033[0m")
def print_cyan(msg):   print(f"\033[96m{msg}\033[0m")
def print_red(msg):    print(f"\033[91m{msg}\033[0m")

print_cyan("=======================================================")
print_cyan("         INITIATING SHERLOCK SRE PLATFORM (LOCAL)      ")
print_cyan("=======================================================")
print()

root_dir = os.path.dirname(os.path.abspath(__file__))
logs_dir = os.path.join(root_dir, "logs")
os.makedirs(logs_dir, exist_ok=True)

# ---- Step 1: Python dependencies ----
print_yellow("[Step 1/4] Checking and installing Python dependencies...")
subprocess.run(
    [sys.executable, "-m", "pip", "install", "-r",
     os.path.join(root_dir, "backend", "requirements.txt"), "--quiet"],
    check=False,
)
# Also install demo-service deps (psutil)
subprocess.run(
    [sys.executable, "-m", "pip", "install",
     "psutil==5.9.7", "--quiet"],
    check=False,
)
print_green("[OK] Python dependencies are ready.")

# ---- Step 2: Prometheus binary ----
print_yellow("[Step 2/4] Checking Prometheus binary...")
prom_bin_dir = os.path.join(root_dir, "prometheus-bin")
prom_exe = os.path.join(prom_bin_dir, "prometheus.exe")

if not os.path.exists(prom_exe):
    print_yellow("  Prometheus binary not found. Downloading v2.52.0 for Windows...")
    zip_path = os.path.join(root_dir, "prometheus.zip")
    temp_dir = os.path.join(root_dir, "prom-temp")
    url = "https://github.com/prometheus/prometheus/releases/download/v2.52.0/prometheus-2.52.0.windows-amd64.zip"
    urllib.request.urlretrieve(url, zip_path)
    print_yellow("  Extracting...")
    with zipfile.ZipFile(zip_path, "r") as zf:
        zf.extractall(temp_dir)
    os.makedirs(prom_bin_dir, exist_ok=True)
    src = os.path.join(temp_dir, "prometheus-2.52.0.windows-amd64")
    for item in os.listdir(src):
        s, d = os.path.join(src, item), os.path.join(prom_bin_dir, item)
        if os.path.isdir(s):
            shutil.copytree(s, d, dirs_exist_ok=True)
        else:
            shutil.copy2(s, d)
    os.remove(zip_path)
    shutil.rmtree(temp_dir)
    print_green("[OK] Prometheus downloaded and ready!")
else:
    print_green("[OK] Prometheus binary found.")

# ---- Step 3: npm dependencies ----
print_yellow("[Step 3/4] Checking npm dependencies...")
frontend_dir = os.path.join(root_dir, "frontend")
if not os.path.exists(os.path.join(frontend_dir, "node_modules")):
    print_yellow("  Installing npm packages for frontend (this may take a minute)...")
    subprocess.run(["npm", "install"], shell=True, cwd=frontend_dir, check=False)
    print_green("[OK] npm dependencies installed.")
else:
    print_green("[OK] Frontend dependencies are ready.")

# ---- Step 4: Launch all services ----
print_yellow("[Step 4/4] Starting all services...")

# Build environment for child processes
custom_env = os.environ.copy()

# PYTHONPATH: patch dir first (sitecustomize.py), then shared service base
patch_dir  = os.path.join(root_dir, "patch")
demo_dir   = os.path.join(root_dir, "demo-services")
shared_dir = os.path.join(demo_dir, "shared")
custom_env["PYTHONPATH"] = os.pathsep.join([patch_dir, demo_dir, shared_dir])

# Local env vars so services talk to localhost instead of Docker hostnames
custom_env["PROMETHEUS_URL"] = "http://localhost:9090"
custom_env["GRAFANA_URL"]    = "http://localhost:3001"
custom_env["AUTH_SERVICE_URL"]    = "http://localhost:8001"
custom_env["PAYMENT_SERVICE_URL"] = "http://localhost:8004"
custom_env["VITE_API_URL"]        = "http://localhost:8000"

processes = []

def start_process(name, cmd, log_name, cwd=root_dir, use_shell=False):
    print(f"  Starting {name}...")
    out = open(os.path.join(logs_dir, f"{log_name}.log"), "w")
    err = open(os.path.join(logs_dir, f"{log_name}.err.log"), "w")
    p = subprocess.Popen(cmd, env=custom_env, cwd=cwd,
                         stdout=out, stderr=err, shell=use_shell)
    processes.append((name, p, out, err))

# 4a. Prometheus
prom_config = os.path.join(root_dir, "prometheus", "prometheus-local.yml")
prom_data   = os.path.join(prom_bin_dir, "data")
start_process("Prometheus",
              f'"{prom_exe}" --config.file="{prom_config}" --storage.tsdb.path="{prom_data}"',
              "prometheus", use_shell=True)

# 4b. Demo microservices
for svc, port in [("auth-service", "8001"), ("checkout-service", "8002"),
                  ("recommendation-service", "8003"), ("payment-service", "8004")]:
    svc_main = os.path.join(demo_dir, svc, "main.py")
    svc_env = custom_env.copy()
    svc_env["SERVICE_NAME"] = svc
    svc_env["SERVICE_PORT"] = port
    out = open(os.path.join(logs_dir, f"{svc}.log"), "w")
    err = open(os.path.join(logs_dir, f"{svc}.err.log"), "w")
    p = subprocess.Popen([sys.executable, svc_main], env=svc_env, cwd=root_dir,
                         stdout=out, stderr=err)
    processes.append((svc, p, out, err))
    print(f"  Starting {svc}...")

# 4c. FastAPI Backend (use uvicorn as module with import string to avoid reload issue)
backend_dir = os.path.join(root_dir, "backend")
backend_env = custom_env.copy()
backend_env["PYTHONPATH"] = os.pathsep.join([patch_dir, backend_dir, custom_env.get("PYTHONPATH", "")])
print("  Starting FastAPI Backend...")
be_out = open(os.path.join(logs_dir, "backend.log"), "w")
be_err = open(os.path.join(logs_dir, "backend.err.log"), "w")
be_proc = subprocess.Popen(
    [sys.executable, "-m", "uvicorn", "main:app",
     "--host", "0.0.0.0", "--port", "8000"],
    env=backend_env, cwd=backend_dir,
    stdout=be_out, stderr=be_err)
processes.append(("FastAPI Backend", be_proc, be_out, be_err))

# 4d. Frontend Vite dev server
start_process("Vite Frontend", ["npm", "run", "dev"], "frontend", cwd=frontend_dir, use_shell=True)

# Wait a moment for services to boot
time.sleep(2)

print()
print_green("=======================================================")
print_green("[SUCCESS] SHERLOCK IS NOW LIVE LOCALLY!")
print()
print("  Dashboard UI:  http://localhost:5173")
print("  Backend API:   http://localhost:8000")
print("  Prometheus:    http://localhost:9090")
print()
print(f"  Logs directory: {logs_dir}")
print_green("=======================================================")
print_yellow("Press Ctrl+C to terminate all services cleanly...")
print()

try:
    while True:
        for name, p, _, _ in processes:
            rc = p.poll()
            if rc is not None:
                print_red(f"  [!] '{name}' exited (code {rc})")
        time.sleep(3)
except KeyboardInterrupt:
    pass
finally:
    print_red("\nShutting down all services...")
    for name, p, out, err in processes:
        if p.poll() is None:
            print(f"  Stopping {name} (PID {p.pid})...")
            p.terminate()
            try:
                p.wait(timeout=3)
            except subprocess.TimeoutExpired:
                p.kill()
        out.close()
        err.close()
    print_green("[OK] Clean shutdown complete.")
