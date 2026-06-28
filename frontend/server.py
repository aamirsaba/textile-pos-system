from http.server import HTTPServer, SimpleHTTPRequestHandler
import os

class UTF8HTTPRequestHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        if self.path.endswith('.html') or self.path.endswith('.htm'):
            self.send_header('Content-Type', 'text/html; charset=utf-8')
        super().end_headers()

if __name__ == '__main__':
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    server = HTTPServer(('localhost', 3000), UTF8HTTPRequestHandler)
    print('========================================')
    print('🚀 Textile POS - Local Server (UTF-8)')
    print('========================================')
    print('📱 http://localhost:3000')
    print('🔑 admin / admin123')
    print('========================================')
    server.serve_forever()
