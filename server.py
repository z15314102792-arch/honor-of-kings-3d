import http.server
import socketserver
import webbrowser
import socket
import os
import sys

PORT = 8080
os.chdir(os.path.dirname(os.path.abspath(__file__)))

def get_local_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(('8.8.8.8', 80))
        ip = s.getsockname()[0]
    except Exception:
        ip = '127.0.0.1'
    finally:
        s.close()
    return ip

local_ip = get_local_ip()
mobile_url = f"http://{local_ip}:{PORT}"
local_url = f"http://localhost:{PORT}"

has_qr = False
try:
    import qrcode
    qr = qrcode.QRCode(box_size=8, border=2)
    qr.add_data(mobile_url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    os.makedirs("assets", exist_ok=True)
    img.save("assets/qrcode_mobile.png")
    has_qr = True
except Exception as e:
    pass

class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()

try:
    if sys.stdout.encoding.lower() != 'utf-8':
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
except Exception:
    pass

with socketserver.TCPServer(('', PORT), Handler) as httpd:
    print('=====================================================')
    print(' [王者荣耀 3D Web MOBA] 游戏服务器已就绪!')
    print('=====================================================')
    print(f' [电脑本机访问]: {local_url}')
    print(f' [手机局域网访问]: {mobile_url}')
    if has_qr:
        print(f' [手机扫码图片]: assets/qrcode_mobile.png (双击图片扫码即可)')
    print('=====================================================')
    print(' 提示: 手机连接同一WiFi后，输入手机地址或扫码即可立即进入游戏!')
    print(' 提示: 手机浏览器内点击 [添加到主屏幕] 即可作为独立App全屏体验!')
    print('=====================================================')
    
    webbrowser.open(local_url)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print('\n服务器已停止。')
