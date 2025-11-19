#!/usr/bin/env python3
import json
import os
from http.server import SimpleHTTPRequestHandler, HTTPServer

DATA_FILE = 'data/goal-tracker-data.json'

class CustomHandler(SimpleHTTPRequestHandler):
    def _set_json_headers(self, status=200):
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_OPTIONS(self):
        self._set_json_headers()

    def do_GET(self):
        if self.path == '/api.php' or self.path == '/api':
            self._set_json_headers()
            if os.path.exists(DATA_FILE):
                with open(DATA_FILE, 'r') as f:
                    data = f.read()
                self.wfile.write(data.encode())
            else:
                self.wfile.write(b'null')
        else:
            self.path = '/public' + self.path
            return SimpleHTTPRequestHandler.do_GET(self)

    def do_POST(self):
        if self.path == '/api.php' or self.path == '/api':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)

            try:
                data = json.loads(post_data)
                os.makedirs(os.path.dirname(DATA_FILE), exist_ok=True)

                with open(DATA_FILE, 'w') as f:
                    json.dump(data, f, indent=2)

                self._set_json_headers()
                response = json.dumps({'success': True})
                self.wfile.write(response.encode())
            except Exception as e:
                self._set_json_headers(400)
                response = json.dumps({'error': str(e)})
                self.wfile.write(response.encode())
        else:
            self.send_response(404)
            self.end_headers()

    def log_message(self, format, *args):
        # Enable logging to show server activity
        import sys
        sys.stderr.write("%s - - [%s] %s\n" %
                         (self.address_string(),
                          self.log_date_time_string(),
                          format % args))

if __name__ == '__main__':
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    server = HTTPServer(('0.0.0.0', 8000), CustomHandler)
    server.serve_forever()

