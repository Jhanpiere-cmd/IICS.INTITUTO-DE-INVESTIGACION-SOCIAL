"""
Plantillas de documentos específicos
"""

from .word_generator import WordGenerator
from datetime import datetime


class ActaReunion(WordGenerator):
    """Plantilla para Acta de Reunión"""
    
    def generar(self, data):
        """
        data = {
            'titulo': str,
            'fecha': str,
            'hora': str,
            'lugar': str,
            'asistentes': [str],
            'agenda': [str],
            'acuerdos': [{'punto': str, 'detalle': str, 'responsable': str, 'plazo': str}],
            'tareas': [{'tarea': str, 'responsable': str, 'plazo': str}]
        }
        """
        self.agregar_encabezado_logos()
        self.agregar_pie_pagina()
        
        # Portada
        self.agregar_portada(
            titulo=f"ACTA DE REUNIÓN\n{data.get('titulo', 'Reunión de Planificación')}",
            autores='Consejo de Facultad',
            fecha=data.get('fecha', datetime.now().strftime('%d de %B de %Y'))
        )
        
        # Información básica
        self.agregar_seccion('Información General', nivel=1)
        self.agregar_parrafo(f"Fecha: {data['fecha']}", negrita=True)
        self.agregar_parrafo(f"Hora: {data.get('hora', 'No especificada')}")
        self.agregar_parrafo(f"Lugar: {data.get('lugar', 'No especificado')}")
        
        # Asistentes
        self.agregar_seccion('Asistentes', nivel=1)
        for asistente in data.get('asistentes', []):
            self.agregar_parrafo(f"• {asistente}")
        
        # Agenda
        if data.get('agenda'):
            self.agregar_seccion('Agenda del Día', nivel=1)
            for i, punto in enumerate(data['agenda'], 1):
                self.agregar_parrafo(f"{i}. {punto}")
        
        # Acuerdos
        if data.get('acuerdos'):
            self.agregar_seccion('Acuerdos Tomados', nivel=1)
            tabla_acuerdos = []
            for acuerdo in data['acuerdos']:
                tabla_acuerdos.append([
                    acuerdo.get('punto', ''),
                    acuerdo.get('detalle', ''),
                    acuerdo.get('responsable', ''),
                    acuerdo.get('plazo', '')
                ])
            self.agregar_tabla(
                datos=tabla_acuerdos,
                encabezados=['#', 'Acuerdo', 'Responsable', 'Plazo']
            )
        
        # Tareas asignadas
        if data.get('tareas'):
            self.agregar_seccion('Tareas Asignadas', nivel=1)
            tabla_tareas = []
            for tarea in data['tareas']:
                tabla_tareas.append([
                    tarea.get('tarea', ''),
                    tarea.get('responsable', ''),
                    tarea.get('plazo', '')
                ])
            self.agregar_tabla(
                datos=tabla_tareas,
                encabezados=['Tarea', 'Responsable', 'Fecha Límite']
            )
        
        return self


class InformeEjecutivo(WordGenerator):
    """Plantilla para Informe Ejecutivo"""
    
    def generar(self, data):
        """
        data = {
            'titulo': str,
            'autor': str,
            'resumen': str,
            'introduccion': str,
            'analisis': [{'titulo': str, 'contenido': str, 'datos': [[]]?}],
            'conclusiones': str,
            'recomendaciones': [str]
        }
        """
        self.agregar_encabezado_logos()
        self.agregar_pie_pagina()
        
        # Portada
        self.agregar_portada(
            titulo=data.get('titulo', 'INFORME EJECUTIVO'),
            autores=data.get('autor', 'Dirección Académica'),
            fecha=data.get('fecha', datetime.now().strftime('%d de %B de %Y'))
        )
        
        # Resumen Ejecutivo
        self.agregar_seccion('Resumen Ejecutivo', nivel=1)
        self.agregar_parrafo(data.get('resumen', ''))
        
        # Introducción
        self.agregar_seccion('Introducción', nivel=1)
        self.agregar_parrafo(data.get('introduccion', ''))
        
        # Análisis
        for seccion in data.get('analisis', []):
            self.agregar_seccion(seccion['titulo'], nivel=2)
            self.agregar_parrafo(seccion['contenido'])
            
            # Si hay datos tabulares
            if seccion.get('datos'):
                self.agregar_tabla(
                    datos=seccion['datos'],
                    encabezados=seccion.get('encabezados')
                )
        
        # Conclusiones
        self.agregar_seccion('Conclusiones', nivel=1)
        self.agregar_parrafo(data.get('conclusiones', ''))
        
        # Recomendaciones
        if data.get('recomendaciones'):
            self.agregar_seccion('Recomendaciones', nivel=1)
            for i, rec in enumerate(data['recomendaciones'], 1):
                self.agregar_parrafo(f"{i}. {rec}")
        
        return self


class ArticuloAcademico(WordGenerator):
    """Plantilla para Artículo Académico en formato APA 7"""
    
    def generar(self, data):
        """
        data = {
            'titulo': str,
            'autores': [str],
            'abstract': str,
            'keywords': [str],
            'introduccion': str,
            'metodologia': str,
            'resultados': str,
            'discusion': str,
            'conclusiones': str,
            'referencias': [str]
        }
        """
        self.agregar_encabezado_logos()
        self.agregar_pie_pagina()
        
        # Portada estilo APA 7
        self.agregar_portada(
            titulo=data.get('titulo', 'TÍTULO DEL ARTÍCULO'),
            autores=data.get('autores', ['Autor']),
            fecha=data.get('fecha', datetime.now().strftime('%d de %B de %Y'))
        )
        
        # Abstract
        self.agregar_seccion('Abstract', nivel=1)
        self.agregar_parrafo(data.get('abstract', ''), cursiva=True)
        
        # Keywords
        if data.get('keywords'):
            self.agregar_parrafo(
                f"Keywords: {', '.join(data['keywords'])}",
                cursiva=True
            )
        
        # Introducción
        self.agregar_seccion('Introducción', nivel=1)
        self.agregar_parrafo(data.get('introduccion', ''))
        
        # Metodología
        self.agregar_seccion('Metodología', nivel=1)
        self.agregar_parrafo(data.get('metodologia', ''))
        
        # Resultados
        self.agregar_seccion('Resultados', nivel=1)
        self.agregar_parrafo(data.get('resultados', ''))
        
        # Discusión
        self.agregar_seccion('Discusión', nivel=1)
        self.agregar_parrafo(data.get('discusion', ''))
        
        # Conclusiones
        self.agregar_seccion('Conclusiones', nivel=1)
        self.agregar_parrafo(data.get('conclusiones', ''))
        
        # Referencias (APA 7)
        if data.get('referencias'):
            self.doc.add_page_break()
            self.agregar_seccion('Referencias', nivel=1)
            for ref in data['referencias']:
                para = self.agregar_parrafo(ref)
                # Sangría francesa APA 7
                para.paragraph_format.first_line_indent = Inches(-0.5)
                para.paragraph_format.left_indent = Inches(0.5)
        
        return self
