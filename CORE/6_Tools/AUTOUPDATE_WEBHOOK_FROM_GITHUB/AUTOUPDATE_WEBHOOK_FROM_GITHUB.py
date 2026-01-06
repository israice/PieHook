import http.server
import socketserver
import os
import hmac
import hashlib
import subprocess
import threading
import re

PORT = 9001
SECRET = os.environ.get("AUTOUPDATE_WEBHOOK_FROM_GITHUB", "").encode("utf-8")
HOST_PROJECT_PATH = os.environ.get("HOST_PROJECT_PATH", "/app")
UpdateLock = threading.Lock()

def get_version_from_readme(path="/app/README.md"):
    """Extract version from README.md git commit line"""
    try:
        with open(path, 'r') as f:
            content = f.read()
            # Find line like: git commit -m "v0.0.7 - ..."
            match = re.search(r'git commit -m "v(\d+\.\d+\.\d+)', content)
            if match:
                return match.group(1)
    except Exception as e:
        print(f"Error reading version from README: {e}", flush=True)
    return None

def get_current_deployed_version():
    """Get current deployed version from git"""
    try:
        result = subprocess.check_output(
            ["git", "log", "-1", "--format=%s"],
            cwd="/app",
            stderr=subprocess.STDOUT,
            text=True
        ).strip()
        # Extract version from commit message like "v0.0.7 - ..."
        match = re.search(r'v(\d+\.\d+\.\d+)', result)
        if match:
            return match.group(1)
    except Exception as e:
        print(f"Error getting current version: {e}", flush=True)
    return None

class WebhookHandler(http.server.BaseHTTPRequestHandler):
    def do_POST(self):
        # Allow both GitHub webhook path and simple token-based path
        webhook_token_path = f"/webhook/{SECRET.decode('utf-8')}" if SECRET else None

        if self.path == "/push_and_update_server":
            # GitHub webhook path - requires signature verification
            self._handle_github_webhook()
        elif webhook_token_path and self.path == webhook_token_path:
            # Simple token-based path - no signature required
            print(f"Received request on token path: {self.path}", flush=True)
            self._trigger_update()
        else:
            self.send_error(404, "Not Found")
            return

    def _handle_github_webhook(self):
        """Handle GitHub webhook with signature verification"""
        # Get headers
        content_length = int(self.headers.get("Content-Length", 0))
        hub_signature = self.headers.get("X-Hub-Signature")

        # Read payload
        payload = self.rfile.read(content_length)

        # Verify signature
        if SECRET:
            if not hub_signature:
                self.send_error(403, "Forbidden: Missing Signature")
                return

            sha_name, signature = hub_signature.split('=')
            if sha_name != 'sha1':
                self.send_error(501, "Not Implemented: Only SHA1 supported")
                return

            mac = hmac.new(SECRET, msg=payload, digestmod=hashlib.sha1)
            if not hmac.compare_digest(str(mac.hexdigest()), str(signature)):
                self.send_error(403, "Forbidden: Invalid Signature")
                return

        # Process payload (optional: check for specific branch)
        # For now, we just trigger the update for any push event
        self._trigger_update()

    def _trigger_update(self):
        """Trigger the update process"""
        
        # Respond immediately to avoid GitHub timeout
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b"Update triggered successfully")
        
        if not UpdateLock.locked():
             threading.Thread(target=self.run_update).start()
        else:
             print("Update already in progress. Skipping.", flush=True)

    def run_update(self):
        # Double check lock or just use it as context if we were blocking, 
        # but here we just want to skip if locked.
        if not UpdateLock.acquire(blocking=False):
             return
        
        try:
            print("Received valid webhook. Starting update process...", flush=True)
            print(f"Host project path: {HOST_PROJECT_PATH}", flush=True)

            # Get current version before pull
            current_version = get_current_deployed_version()
            print(f"Current deployed version: v{current_version}" if current_version else "Current version: unknown", flush=True)

            # Execute git pull
            print("Running: git pull", flush=True)
            result = subprocess.check_output(["git", "pull"], cwd="/app", stderr=subprocess.STDOUT, text=True)
            print(result, flush=True)

            # Check if there were any changes
            if "Already up to date" in result or "Already up-to-date" in result:
                print("No changes detected. Skipping rebuild.", flush=True)
                return

            # Get new version after pull
            new_version = get_version_from_readme()
            print(f"New version from README: v{new_version}" if new_version else "New version: unknown", flush=True)

            # Compare versions
            if current_version and new_version and current_version == new_version:
                print(f"Version unchanged (v{current_version}). Skipping rebuild.", flush=True)
                return

            print(f"Version changed: v{current_version} -> v{new_version}. Proceeding with rebuild...", flush=True)

            # Execute docker compose up
            # Using modern docker compose (v2) command
            # IMPORTANT: We use HOST_PROJECT_PATH for docker compose because when running via docker.sock,
            # Docker needs paths relative to the HOST filesystem, not the container's /app

            # First, update backend and frontend
            print(f"Running: docker compose -p piehook -f docker-compose.prod.yml up -d --build backend frontend", flush=True)
            subprocess.check_call(
                ["docker", "compose", "-p", "piehook", "-f", "docker-compose.prod.yml", "up", "-d", "--build", "backend", "frontend"],
                cwd=HOST_PROJECT_PATH,
                stderr=subprocess.STDOUT
            )

            # Then, update webhook container itself (will cause this script to restart)
            print(f"Running: docker compose -p piehook -f docker-compose.prod.yml up -d --build autoupdate-webhook", flush=True)
            subprocess.check_call(
                ["docker", "compose", "-p", "piehook", "-f", "docker-compose.prod.yml", "up", "-d", "--build", "autoupdate-webhook"],
                cwd=HOST_PROJECT_PATH,
                stderr=subprocess.STDOUT
            )

            print("Update completed successfully.", flush=True)
            
        except subprocess.CalledProcessError as e:
            print(f"Error during update: {e}", flush=True)
        except Exception as e:
            print(f"Unexpected error: {e}", flush=True)
        finally:
            UpdateLock.release()

if __name__ == "__main__":
    # Ensure we are in the right directory (though Docker workdir should handle this)
    # os.chdir("/app")

    with socketserver.TCPServer(("", PORT), WebhookHandler) as httpd:
        print(f"Webhook listener serving at port {PORT}", flush=True)
        print(f"Available endpoints:", flush=True)
        print(f"  - POST /push_and_update_server (GitHub webhook with signature)", flush=True)
        if SECRET:
            print(f"  - POST /webhook/{SECRET.decode('utf-8')} (Simple token-based)", flush=True)
        httpd.serve_forever()
