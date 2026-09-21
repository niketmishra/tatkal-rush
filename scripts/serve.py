#!/usr/bin/env python3
"""Dev server that forbids caching, so edited ES modules never go stale.
Usage: python3 scripts/serve.py [port]   (serves the project root)"""
import functools, http.server, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, max-age=0")
        super().end_headers()

    def log_message(self, *args):
        pass


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8187
    handler = functools.partial(NoCache, directory=ROOT)
    http.server.ThreadingHTTPServer(("", port), handler).serve_forever()
