"""
API FastAPI para generación de documentos Word
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import os
from datetime import datetime
from pathlib import Path

# Importar generadores
import sys
sys.path.append(str(Path(__file__).parent.parent))
from generators.templates import ActaReunion, InformeEjecutivo, ArticuloAcademico
from ai.gemini_processor import GeminiProcessor

app = FastAPI(title="SGR-ACS Document Generator API")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Directorio temporal para documentos generados
TEMP_DIR = Path("temp_documentos")
TEMP_DIR.mkdir(exist_ok=True)


# Modelos Pydantic
class Mensaje(BaseModel):
    role: str
    content: str


class SolicitudDocumento(BaseModel):
    conversacion: List[Mensaje] | str
    tipo: Optional[str] = None  # 'acta_reunion', 'informe_ejecutivo', 'articulo_academico'
    datos_manuales: Optional[Dict[str, Any]] = None  # Si el usuario quiere especificar datos


@app.get("/")
def root():
    return {"message": "SGR-ACS Document Generator API", "version": "1.0"}


@app.post("/api/detectar-tipo-documento")
async def detectar_tipo(request: SolicitudDocumento):
    """Detecta qué tipo de documento se debe generar"""
    try:
        processor = GeminiProcessor()
        
        # Convertir conversación
        if isinstance(request.conversacion, list):
            conversacion = '\n\n'.join([
                f"{msg.role}: {msg.content}"
                for msg in request.conversacion
            ])
        else:
            conversacion = request.conversacion
        
        tipo = processor.detectar_tipo_documento(conversacion)
        
        return {
            "tipo": tipo,
            "sugerencias": {
                "acta_reunion": "Acta de Reunión con logos institucionales",
                "informe_ejecutivo": "Informe Ejecutivo con análisis y conclusiones",
                "articulo_academico": "Artículo Académico en formato APA 7"
            }.get(tipo, "Documento profesional")
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/generar-documento")
async def generar_documento(request: SolicitudDocumento):
    """Genera un documento Word basado en la conversación"""
    try:
        # 1. Procesar conversación con Gemini
        processor = GeminiProcessor()
        resultado = processor.procesar_conversacion(
            request.conversacion,
            tipo_forzado=request.tipo
        )
        
        tipo = resultado['tipo']
        datos = resultado['datos']
        
        # Sobrescribir con datos manuales si existen
        if request.datos_manuales:
            datos.update(request.datos_manuales)
        
        # 2. Generar documento según el tipo
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        if tipo == 'acta_reunion':
            doc = ActaReunion()
            doc.generar(datos)
            filename = f"Acta_Reunion_{timestamp}.docx"
        
        elif tipo == 'informe_ejecutivo':
            doc = InformeEjecutivo()
            doc.generar(datos)
            filename = f"Informe_Ejecutivo_{timestamp}.docx"
        
        elif tipo == 'articulo_academico':
            doc = ArticuloAcademico()
            doc.generar(datos)
            filename = f"Articulo_Academico_{timestamp}.docx"
        
        else:
            # Por defecto, informe ejecutivo
            doc = InformeEjecutivo()
            doc.generar(datos)
            filename = f"Documento_{timestamp}.docx"
        
        # 3. Guardar archivo
        filepath = TEMP_DIR / filename
        doc.guardar(str(filepath))
        
        # 4. Retornar archivo
        return FileResponse(
            path=str(filepath),
            filename=filename,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"'
            }
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generando documento: {str(e)}")


@app.post("/api/preview-documento")
async def preview_documento(request: SolicitudDocumento):
    """Retorna una vista previa de lo que se generaría sin crear el archivo"""
    try:
        processor = GeminiProcessor()
        resultado = processor.procesar_conversacion(
            request.conversacion,
            tipo_forzado=request.tipo
        )
        
        return {
            "tipo": resultado['tipo'],
            "datos_extraidos": resultado['datos'],
            "sugerencias": "Revisa los datos extraídos antes de generar el documento"
        }
    
    except Exception as e:
        raise HTTPException(status_code=500,detail=f"Error en preview: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
