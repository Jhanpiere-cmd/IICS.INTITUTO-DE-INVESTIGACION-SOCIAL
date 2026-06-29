"""
Procesador de IA con Gemini para extraer estructura de documentos
desde conversaciones del chat
"""

import google.generativeai as genai
import json
import os
from dotenv import load_dotenv

load_dotenv()


class GeminiProcessor:
    """Procesa conversaciones con Gemini AI para extraer contenido estructurado"""
    
    def __init__(self, api_key=None):
        self.api_key = api_key or os.getenv('VITE_GEMINI_API_KEY')
        if not self.api_key:
            raise ValueError("API Key de Gemini no configurada")
        
        genai.configure(api_key=self.api_key)
        # Usamos gemini-2.0-flash que está disponible en esta cuenta
        self.model = genai.GenerativeModel('gemini-2.0-flash')
    
    def detectar_tipo_documento(self, conversacion):
        """
        Detecta qué tipo de documento se debe generar basándose en la conversación
        Retorna: 'acta_reunion', 'informe_ejecutivo', 'articulo_academico', u 'otro'
        """
        prompt = f"""
        Analiza la siguiente conversación y determina qué tipo de documento sería más apropiado generar.
        
        Conversación:
        {conversacion}
        
        Opciones:
        - acta_reunion: Si se discute una reunión, asistentes, acuerdos, tareas
        - informe_ejecutivo: Si se discute análisis, conclusiones, recomendaciones
        - articulo_academico: Si se discute investigación, metodología, resultados científicos
        - otro: Si no encaja en ninguna categoría
        
        Responde SOLO con una de estas palabras: acta_reunion, informe_ejecutivo, articulo_academico, o otro
        """
        
        response = self.model.generate_content(prompt)
        tipo = response.text.strip().lower()
        
        return tipo if tipo in ['acta_reunion', 'informe_ejecutivo', 'articulo_academico'] else 'otro'
    
    def extraer_acta_reunion(self, conversacion):
        """Extrae información estructurada para un Acta de Reunión"""
        prompt = f"""
        Extrae información de la conversación para crear un Acta de Reunión.
        
        Conversación:
        {conversacion}
        
        Extrae y devuelve un JSON con esta estructura EXACTA:
        {{
            "titulo": "Título descriptivo de la reunión",
            "fecha": "Fecha de la reunión",
            "hora": "Hora de inicio",
            "lugar": "Lugar físico o virtual",
            "asistentes": ["Nombre 1", "Nombre 2"],
            "agenda": ["Punto 1", "Punto 2"],
            "acuerdos": [
                {{"punto": "1", "detalle": "Descripción del acuerdo", "responsable": "Nombre", "plazo": "Fecha"}}
            ],
            "tareas": [
                {{"tarea": "Descripción", "responsable": "Nombre", "plazo": "Fecha"}}
            ]
        }}
        
        Si no encuentras algún dato, usa valores por defecto razonables.
        Responde SOLO con el JSON, sin texto adicional.
        """
        
        response = self. model.generate_content(prompt)
        try:
            return json.loads(response.text)
        except:
            # Intentar limpiar el texto y parsear
            texto_limpio = response.text.strip().replace('```json', '').replace('```', '')
            return json.loads(texto_limpio)
    
    def extraer_informe_ejecutivo(self, conversacion):
        """Extrae información para un Informe Ejecutivo"""
        prompt = f"""
        Extrae información de la conversación para crear un Informe Ejecutivo.
        
        Conversación:
        {conversacion}
        
        Extrae y devuelve un JSON con esta estructura EXACTA:
        {{
            "titulo": "Título del informe",
            "autor": "Nombre del autor o área",
            "resumen": "Resumen ejecutivo de 2-3 párrafos",
            "introduccion": "Contexto y objetivos",
            "analisis": [
                {{"titulo": "Sección de análisis", "contenido": "Texto del análisis"}}
            ],
            "conclusiones": "Conclusiones principales",
            "recomendaciones": ["Recomendación 1", "Recomendación 2"]
        }}
        
        Responde SOLO con el JSON, sin texto adicional.
        """
        
        response = self.model.generate_content(prompt)
        try:
            return json.loads(response.text)
        except:
            texto_limpio = response.text.strip().replace('```json', '').replace('```', '')
            return json.loads(texto_limpio)
    
    def extraer_articulo_academico(self, conversacion):
        """Extrae información para un Artículo Académico"""
        prompt = f"""
        Extrae información de la conversación para crear un Artículo Académico en formato APA 7.
        
        Conversación:
        {conversacion}
        
        Extrae y devuelve un JSON con esta estructura EXACTA:
        {{
            "titulo": "Título del artículo",
            "autores": ["Autor 1", "Autor 2"],
            "abstract": "Resumen en español (max 250 palabras)",
            "keywords": ["palabra1", "palabra2"],
            "introduccion": "Introducción con marco teórico",
            "metodologia": "Descripción de la metodología",
            "resultados": "Presentación de resultados",
            "discusion": "Interpretación y análisis",
            "conclusiones": "Conclusiones finales",
            "referencias": ["Apellido, N. (2023). Título. Revista, 1(1), 1-10."]
        }}
        
        Responde SOLO con el JSON, sin texto adicional.
        """
        
        response = self.model.generate_content(prompt)
        try:
            return json.loads(response.text)
        except:
            texto_limpio = response.text.strip().replace('```json', '').replace('```', '')
            return json.loads(texto_limpio)
    
    def procesar_conversacion(self, conversacion, tipo_forzado=None):
        """
        Procesa una conversación completa y retorna datos estructurados
        
        Args:
            conversacion: str o list de mensajes
            tipo_forzado: 'acta_reunion', 'informe_ejecutivo', 'articulo_academico' o None
        
        Returns:
            dict: {'tipo': str, 'datos': dict}
        """
        # Convertir lista de mensajes a texto
        if isinstance(conversacion, list):
            conversacion_texto = '\n\n'.join([
                f"{msg.get('role', 'user')}: {msg.get('content', '')}"
                for msg in conversacion
            ])
        else:
            conversacion_texto = conversacion
        
        # Detectar tipo si no está forzado
        tipo = tipo_forzado or self.detectar_tipo_documento(conversacion_texto)
        
        # Extraer datos según el tipo
        if tipo == 'acta_reunion':
            datos = self.extraer_acta_reunion(conversacion_texto)
        elif tipo == 'informe_ejecutivo':
            datos = self.extraer_informe_ejecutivo(conversacion_texto)
        elif tipo == 'articulo_academico':
            datos = self.extraer_articulo_academico(conversacion_texto)
        else:
            # Tipo genérico - informe ejecutivo por defecto
            datos = self.extraer_informe_ejecutivo(conversacion_texto)
            tipo = 'informe_ejecutivo'
        
        return {
            'tipo': tipo,
            'datos': datos
        }


# Ejemplo de uso
if __name__ == '__main__':
    processor = GeminiProcessor()
    
    conversacion_test = """
    Usuario: Buenos días, necesito que me ayudes a documentar la reunión de hoy
    Asistente: Claro, ¿qué información tienes?
    Usuario: Fue a las 10am en la Sala de Consejo. Asistieron el Dr. Miranda, la Dra. Castañeda y yo
    Asistente: Entendido, ¿qué temas se trataron?
    Usuario: Se acordó aprobar el presupuesto 2026 y crear un comité de investigación
    """
    
    resultado = processor.procesar_conversacion(conversacion_test)
    print(f"Tipo detectado: {resultado['tipo']}")
    print(f"Datos extraídos: {json.dumps(resultado['datos'], indent=2, ensure_ascii=False)}")
