import os
import requests
import json
from dotenv import load_dotenv

load_dotenv('.env.local')
api_key = os.getenv('VITE_GEMINI_API_KEY')

if not api_key:
    print("[ERROR] No API Key")
    exit(1)

url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key={api_key}"

headers = {
    'Content-Type': 'application/json'
}

data = {
    "contents": [{
        "parts": [{"text": "Responde solo OK"}]
    }]
}

try:
    print(f"[INFO] Conectando a {url[:40]}...")
    response = requests.post(url, headers=headers, json=data)
    
    print(f"[INFO] Status Code: {response.status_code}")
    
    if response.status_code == 200:
        print("[OK] Respuesta:", response.json()['candidates'][0]['content']['parts'][0]['text'])
    else:
        print("[ERROR] Respuesta:", response.text)

except Exception as e:
    print(f"[ERROR] Excepcion: {e}")
