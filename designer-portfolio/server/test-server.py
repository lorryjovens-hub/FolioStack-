import http.server
import socketserver
import json

PORT = 3008

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/api/health':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'status': 'ok'}).encode())
            return
        super().do_GET()

with socketserver.TCPServer(('', PORT), MyHTTPRequestHandler) as httpd:
    print(f'Server running on port {PORT}')
    httpd.serve_forever()