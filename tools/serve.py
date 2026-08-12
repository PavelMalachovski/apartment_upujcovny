"""Static server for the tour plus a save endpoint for offscreen renders.

Run:  python tools/serve.py
Then: http://localhost:8742/?apt=serenity&check=1
"""
import base64
import http.server
import os
import socketserver

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TOUR = os.path.join(ROOT, 'tour')
SHOTS = os.path.join(ROOT, 'tools', 'shots')
os.makedirs(SHOTS, exist_ok=True)


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=TOUR, **kw)

    def do_POST(self):
        if not self.path.startswith('/save/'):
            self.send_response(404)
            self.end_headers()
            return
        name = os.path.basename(self.path)
        n = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(n).decode()
        if ',' in body:
            body = body.split(',', 1)[1]
        with open(os.path.join(SHOTS, name), 'wb') as f:
            f.write(base64.b64decode(body))
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b'ok')

    def log_message(self, *a):
        pass


socketserver.ThreadingTCPServer.allow_reuse_address = True
print('serving tour/ on http://localhost:8742  (renders -> tools/shots/)')
with socketserver.ThreadingTCPServer(('127.0.0.1', 8742), Handler) as srv:
    srv.serve_forever()
