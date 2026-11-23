"""Local dev server for the Bonito demo (no caching, so edits show immediately).
Usage:  python3 serve.py [port]   → http://localhost:5180
"""
import http.server, sys, os

class NoCache(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map, '.js': 'text/javascript', '.webp': 'image/webp', '.svg': 'image/svg+xml'}
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

os.chdir(os.path.dirname(os.path.abspath(__file__)))
port = int(sys.argv[1]) if len(sys.argv) > 1 else 5180
print(f'Bonito demo → http://localhost:{port}')
http.server.ThreadingHTTPServer(('127.0.0.1', port), NoCache).serve_forever()
