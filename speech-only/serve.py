import hashlib
import http.server
import json
import mimetypes
import os
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8001
ROOT = os.path.dirname(os.path.abspath(__file__))
WATCH_EXTENSIONS = (".html", ".js", ".mjs", ".css", ".json")

mimetypes.add_type("application/javascript", ".js")
mimetypes.add_type("application/javascript", ".mjs")
mimetypes.add_type("text/css", ".css")


def compute_tree_version() -> str:
    """Computes a lightweight mtime+size fingerprint for live-reload detection."""
    entries: list[str] = []
    for dirpath, dirnames, filenames in os.walk(ROOT):
        dirnames[:] = sorted(d for d in dirnames if not d.startswith(".") and d != "__pycache__")
        for fname in sorted(filenames):
            if not fname.endswith(WATCH_EXTENSIONS):
                continue
            fpath = os.path.join(dirpath, fname)
            try:
                st = os.stat(fpath)
                rel = os.path.relpath(fpath, ROOT)
                entries.append(f"{rel}:{st.st_mtime_ns}:{st.st_size}")
            except OSError:
                continue
    digest = hashlib.sha1("\n".join(entries).encode("utf-8")).hexdigest()[:16]
    return digest


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def do_GET(self):
        if self.path.split("?", 1)[0] == "/__reload":
            payload = json.dumps({"version": compute_tree_version()}).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)
            return
        super().do_GET()

    def do_POST(self):
        if self.path.split("?", 1)[0] == "/__export_backup":
            try:
                content_len = int(self.headers.get("Content-Length", "0"))
                raw_body = self.rfile.read(content_len) if content_len > 0 else b"{}"
                req = json.loads(raw_body.decode("utf-8"))
                target_dir = str(req.get("directory") or "").strip()
                raw_name = str(req.get("filename") or "panamanian-spanish-progress.json").strip()
                safe_name = os.path.basename(raw_name) or "panamanian-spanish-progress.json"
                if not safe_name.lower().endswith(".json"):
                    safe_name += ".json"
                data = req.get("data")
                if not target_dir:
                    raise ValueError("No download folder path provided.")
                expanded_dir = os.path.abspath(os.path.expandvars(os.path.expanduser(target_dir)))
                os.makedirs(expanded_dir, exist_ok=True)
                out_path = os.path.join(expanded_dir, safe_name)
                with open(out_path, "w", encoding="utf-8") as fh:
                    json.dump(data, fh, indent=2, ensure_ascii=False)
                resp = json.dumps({"ok": True, "savedPath": out_path}).encode("utf-8")
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(resp)))
                self.end_headers()
                self.wfile.write(resp)
            except Exception as exc:
                resp = json.dumps({"ok": False, "error": str(exc)}).encode("utf-8")
                self.send_response(400)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(resp)))
                self.end_headers()
                self.wfile.write(resp)
            return
        self.send_error(404, "Not Found")

    def log_message(self, format, *args):
        # Keep terminal output readable by hiding routine live-reload polls
        if args and isinstance(args[0], str) and "/__reload" in args[0]:
            return
        super().log_message(format, *args)


class ReusableThreadedServer(http.server.ThreadingHTTPServer):
    allow_reuse_address = True
    request_queue_size = 64


if __name__ == "__main__":
    print(f"Serving Speech-Only Web App (no-cache + live-reload) from {ROOT} on http://localhost:{PORT}")
    with ReusableThreadedServer(("127.0.0.1", PORT), NoCacheHandler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            pass
