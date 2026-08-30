import http.server
import socketserver
import threading
import subprocess
import webbrowser
import time
import os
import re
import sys

PORT = 8080
os.chdir(os.path.dirname(os.path.abspath(__file__)))

class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()

def run_http_server():
    with socketserver.TCPServer(('', PORT), Handler) as httpd:
        httpd.serve_forever()

# Start HTTP server in background thread
t = threading.Thread(target=run_http_server, daemon=True)
t.start()

try:
    if sys.stdout.encoding.lower() != 'utf-8':
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
except Exception:
    pass

print('=====================================================')
print(' [王者荣耀 3D MOBA] 全网公网分享链接生成器')
print('=====================================================')
print(' 正在为你申请安全公网通道 (任何人任何手机均可打开)...')

# Try localhost.run SSH tunnel
cmd = ['ssh', '-o', 'StrictHostKeyChecking=no', '-R', f'80:localhost:{PORT}', 'nokey@localhost.run']
try:
    proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, bufsize=1)
    public_url = None

    start_time = time.time()
    for line in proc.stdout:
        print(line.strip())
        match = re.search(r'(https://[a-zA-Z0-9\-\.]+\.lhr\.life|https://[a-zA-Z0-9\-\.]+\.localhost\.run)', line)
        if match:
            public_url = match.group(1)
            break
        if time.time() - start_time > 12:
            break

    if public_url:
        print('\n' + '=' * 60)
        print(f' [公网链接生成成功!] 任何人在任何手机/电脑上均可直接打开:')
        print(f' 网址: {public_url}')
        print('=' * 60)

        try:
            import qrcode
            qr = qrcode.QRCode(box_size=8, border=2)
            qr.add_data(public_url)
            qr.make(fit=True)
            img = qr.make_image(fill_color="black", back_color="white")
            os.makedirs("assets", exist_ok=True)
            img.save("assets/qrcode_public.png")
            print(f' [公网手机扫码图片]: assets/qrcode_public.png (发给好友扫码即可)')
        except Exception:
            pass

        webbrowser.open(public_url)
    else:
        print('提示: 无法获取动态SSH域名，请使用永久云部署方案 (参见 DEPLOY_PERMANENT.md)')

    # Keep alive
    proc.wait()
except Exception as e:
    print('Tunnel error:', e)

