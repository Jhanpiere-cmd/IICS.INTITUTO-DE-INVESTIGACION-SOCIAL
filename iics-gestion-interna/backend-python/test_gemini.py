import os
import google.generativeai as genai
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv('.env.local')

api_key = os.getenv('VITE_GEMINI_API_KEY')

if not api_key:
    print("[ERROR] Error: No encontrada VITE_GEMINI_API_KEY en .env.local")
    exit(1)

print(f"[INFO] Key encontrada: {api_key[:5]}...{api_key[-5:]}")

try:
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel('gemini-1.5-pro')
    
    print("\n[INFO] Intentando conectar con Gemini 1.5 Pro...")
    response = model.generate_content("Responde solo con la palabra: CONEXION_EXITOSA")
    
    print(f"[OK] Respuesta recibida: {response.text.strip()}")
    print("\n[OK] La API funciona correctamente con Gemini Pro.")

except Exception as e:
    print(f"\n[ERROR] ERROR DE CONEXION:\n{str(e)}")
