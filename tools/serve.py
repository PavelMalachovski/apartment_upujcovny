"""Static server for the tour plus a save endpoint for offscreen renders.

Run:  python tools/serve.py
Then: http://localhost:8742/?apt=serenity&check=1
"""
import base64
import http.server
import os
import socketserver
import urllib.parse

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
        # self.path is the raw request-line token: BaseHTTPRequestHandler
        # never percent-decodes it (only SimpleHTTPRequestHandler's own
        # GET/HEAD file serving does, via translate_path). Decode it the
        # same way before doing anything else, so an encoded separator
        # ('..%2F..%2Fescape.txt') is seen as the traversal it spells out
        # instead of sailing through as a literal, harmless-looking
        # filename containing a '%'.
        rel = urllib.parse.unquote(self.path[len('/save/'):])
        parts = [p for p in rel.split('/') if p]
        if not parts:
            self.send_response(400)
            self.end_headers()
            return
        dest = os.path.join(SHOTS, *parts)
        # A plain '..'-segment blocklist (the previous version of this
        # check) only ever looks at '/'. On Windows, os.path.join and the
        # filesystem both also treat '\' as a separator, so a single
        # segment with no '/' in it at all -- '..\\..\\..\\Windows\\
        # win.ini', never the literal string '..' -- still walks upward
        # once opened. A drive-absolute segment ('C:\\Windows\\win.ini')
        # is worse: os.path.join discards every earlier component and
        # returns just that absolute path, dropping SHOTS entirely. Both
        # reproduced directly against the old code: realpath(dest) landed
        # at C:\Git\Windows\win.ini and C:\Windows\win.ini respectively.
        # Resolving and checking containment catches all of these plus
        # the plain '../' case plus whatever separator or absolute-path
        # scheme a future caller invents, in one place, instead of
        # growing the blocklist every time a new shape turns up -- so
        # this is now the *only* traversal check; nothing upstream
        # special-cases '.' or '..' any more. Checked before any
        # filesystem mutation, including makedirs: an out-of-bounds
        # destination must not even get its directory created.
        real_shots = os.path.realpath(SHOTS)
        real_dest = os.path.realpath(dest)
        try:
            contained = os.path.commonpath([real_dest, real_shots]) == real_shots
        except ValueError:
            contained = False  # e.g. a different drive on Windows
        if not contained:
            self.send_response(400)
            self.end_headers()
            return
        # A missing or zero Content-Length used to fall straight through:
        # read(0) -> '' -> b64decode('') -> b'' -> a 0-byte file written and
        # HTTP 200 'ok' returned. Every capture harness in this repo
        # (measure.js, refshots.js) treats 200 as "the frame is on disk", so
        # a capture that produced nothing reported success and the empty
        # files were only noticed downstream, if at all -- the exact
        # silent-degradation shape app.js's exposure guard exists to
        # prevent. Reject it here instead: no file created, no directory
        # created, and a status the caller can actually act on. Checked
        # before makedirs for the same reason the traversal check above is.
        n = int(self.headers.get('Content-Length', 0) or 0)
        body = self.rfile.read(n).decode() if n > 0 else ''
        if ',' in body:
            body = body.split(',', 1)[1]
        if not body:
            self.send_response(400)
            self.end_headers()
            self.wfile.write(b'empty body: nothing captured, no file written')
            return
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        with open(dest, 'wb') as f:
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
