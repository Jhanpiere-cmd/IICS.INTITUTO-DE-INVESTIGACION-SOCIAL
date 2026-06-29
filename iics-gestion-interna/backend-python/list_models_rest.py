import os
import requests
import json
from dotenv import load_dotenv

load_dotenv('.env.local')
api_key = os.getenv('VITE_GEMINI_API_KEY')

url = f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}"

try:
    print(f"[INFO] Consultando modelos...")
    response = requests.get(url)
    
    if response.status_code == 200:
        models = response.json().get('models', [])
        print(f"[OK] Se encontraron {len(models)} modelos:")
        for m in models:
            if 'generateContent' in m.get('supportedGenerationMethods', []):
                print(f"  - {m['name']}")
    else:
        print("[ERROR]", response.text)

except Exception as e:
    print(e)
