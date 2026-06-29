# Backend Python para Generación de Documentos

Este directorio contiene el código Python para generar documentos (Word, PDF) con IA.

## No se despliega en Netlify

Este backend NO se despliega en Netlify. Se mantiene aquí solo para desarrollo local.

## Uso Local

```bash
# Instalar dependencias
pip install -r requirements.txt

# Iniciar servidor FastAPI (si es necesario)
cd server
uvicorn api.documentos:app --reload
```

## Archivos

- `requirements.txt` - Dependencias Python
- `test_*.py` - Scripts de prueba para Gemini API
- `server/` - Backend FastAPI (si existe)
