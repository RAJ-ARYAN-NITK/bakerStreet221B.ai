import urllib.request
import urllib.parse
import json

url = "http://localhost:8000/upload"

boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW'
body = (
    f'--{boundary}\r\n'
    f'Content-Disposition: form-data; name="file"; filename="dummy.txt"\r\n'
    f'Content-Type: text/plain\r\n\r\n'
    f'This is a dummy evidence document.\r\n'
    f'--{boundary}\r\n'
    f'Content-Disposition: form-data; name="case_id"\r\n\r\n'
    f'test_case\r\n'
    f'--{boundary}--\r\n'
).encode('utf-8')

req = urllib.request.Request(url, data=body)
req.add_header('Content-Type', f'multipart/form-data; boundary={boundary}')

try:
    with urllib.request.urlopen(req, timeout=30) as response:
        print("STATUS:", response.status)
        print("RESPONSE:", response.read().decode('utf-8'))
except Exception as e:
    print("ERROR:", e)
