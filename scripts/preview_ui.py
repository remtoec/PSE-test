"""Local UI preview with synthetic fixtures. Test routes are never deployed."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class Preview(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT / "web"), **kwargs)

    def do_GET(self):
        if self.path.startswith('/__test__/'):
            name = self.path.split('?', 1)[0]
            if name == '/__test__/fixtures.js':
                body = (ROOT / 'tests/web_fixtures.js').read_bytes()
                mime = 'text/javascript; charset=utf-8'
            elif name == '/__test__/harness.js':
                body = (ROOT / 'tests/ui_harness.js').read_bytes()
                mime = 'text/javascript; charset=utf-8'
            elif name == '/__test__/':
                html = (ROOT / 'web/index.html').read_text(encoding='utf-8')
                html = html.replace('<head>', '<head><base href="/">')
                html = html.replace('href="#', 'href="' + self.path + '#')
                html = html.replace('<script src="app.js" defer></script>',
                    '<script src="/__test__/harness.js"></script>'
                    '<script src="app.js" defer></script>'
                    '<script src="/__test__/fixtures.js" defer></script>')
                body, mime = html.encode(), 'text/html; charset=utf-8'
            else:
                self.send_error(404)
                return
            self.send_response(200)
            self.send_header('Content-Type', mime)
            self.send_header('Cache-Control', 'no-store')
            self.end_headers()
            self.wfile.write(body)
            return
        super().do_GET()


if __name__ == '__main__':
    ThreadingHTTPServer(('127.0.0.1', 8081), Preview).serve_forever()
