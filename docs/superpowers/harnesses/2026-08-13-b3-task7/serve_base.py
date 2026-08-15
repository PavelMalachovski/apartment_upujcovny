"""Serve the BASE (c2bb0bd) worktree's tour/ on port 8743, with the SAME save
endpoint tools/serve.py has.

Task 7 measures the plan's own claim before and after, and "before" means
c2bb0bd's tree.  That tree is checked out in a detached worktree so the branch
is never disturbed; this script puts it behind a second port, so both sides can
be measured in one session by the same harness scripts, pointed at TOUR_BASE.

The save endpoint matters: the `?fov=legacy` resemblance capture POSTs each
frame back to the origin it was loaded from, and a plain http.server 404s
those silently.  So rather than re-implement do_POST (and risk it drifting
from the real one), this execs tools/serve.py's own source with the final
three server-start lines dropped, and only redirects `directory=` at the
worktree.  ROOT/SHOTS therefore still resolve to the MAIN repo, which is
where shots.mjs and tools/delta_e.py look for the frames.

    python serve_base.py <path-to-worktree>            # default port 8743

Needs the sandbox disabled, exactly like tools/serve.py: sandboxed, POST
/save/ returns 200 while writing nothing and captures silently vanish.
"""
import http.server
import os
import socketserver
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..'))
SERVE = os.path.join(ROOT, 'tools', 'serve.py')

WORKTREE = sys.argv[1] if len(sys.argv) > 1 else None
PORT = int(sys.argv[2]) if len(sys.argv) > 2 else 8743
if not WORKTREE or not os.path.isdir(os.path.join(WORKTREE, 'tour')):
    raise SystemExit('usage: python serve_base.py <path-to-worktree> [port]')

src = open(SERVE, encoding='utf-8').read()
cut = src.index("socketserver.ThreadingTCPServer.allow_reuse_address")
ns = {'__file__': SERVE, '__name__': 'serve_base_inner'}
exec(compile(src[:cut], SERVE, 'exec'), ns)          # noqa: S102 -- the repo's own server

BaseHandler = ns['Handler']
BASE_TOUR = os.path.join(WORKTREE, 'tour')


class Handler(BaseHandler):
    def __init__(self, *a, **kw):
        # BaseHandler.__init__ pins directory=TOUR (the main repo). Skip it and
        # go straight to SimpleHTTPRequestHandler with the worktree instead;
        # do_POST, and therefore SHOTS, are inherited untouched.
        http.server.SimpleHTTPRequestHandler.__init__(self, *a, directory=BASE_TOUR, **kw)


socketserver.ThreadingTCPServer.allow_reuse_address = True
print('serving %s on http://localhost:%d  (saves -> %s)' % (BASE_TOUR, PORT, ns['SHOTS']))
with socketserver.ThreadingTCPServer(('127.0.0.1', PORT), Handler) as srv:
    srv.serve_forever()
