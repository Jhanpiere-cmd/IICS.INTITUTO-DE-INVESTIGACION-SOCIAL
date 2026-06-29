# 🦂 LOGO SGR - Sistema de Gestión de Revista ACS

## CONCEPTO DEL DISEÑO

El logo del SGR incorpora la figura estilizada de un **escorpión**, símbolo que representa:

### Significado del Escorpión
- ⚡ **Fuerza y Precisión** - Como el escorpión, el equipo actúa con efectividad
- 🎯 **Rigor Académico** - Precisión en cada acción, como el aguijón del escorpión
- 🛡️ **Protección y Defensa** - De los estándares académicos de la revista
- 🔬 **Adaptabilidad** - El escorpión sobrevive en ambientes difíciles, como el equipo en retos académicos
- 💪 **Trabajo en Equipo** - Las pinzas representan coordinación y colaboración

---

## DISEÑO MINIMALISTA

**Estilo:** Inspirado en Apple, Nike - Limpio, moderno, atemporal

### Elementos del Logo:

```
┌─────────────────────────────────┐
│                                 │
│        ╭───────────╮            │
│       ╱  Escorpión  ╲           │
│      │  Estilizado   │          │
│       ╲    SGR      ╱           │
│        ╰───────────╯            │
│                                 │
│           S G R                 │
│  Sistema de Gestión de Revista  │
└─────────────────────────────────┘
```

### Componentes:

1. **Círculo con Gradiente**
   - Color: Índigo (#4F46E5) a Púrpura (#7C3AED)
   - Representa unidad y completitud

2. **Escorpión Minimalista**
   - Formas geométricas simples
   - Color blanco para contraste
   - Diseño reconocible pero abstracto

3. **Tipografía SGR**
   - Sans-serif bold
   - Espaciado amplio (letter-spacing: 2)
   - Profesional y académico

---

## PALETA DE COLORES

| Color | Hex | Uso |
|-------|-----|-----|
| **Índigo Principal** | `#4F46E5` | Fondo gradiente inicio |
| **Púrpura** | `#7C3AED` | Fondo gradiente final |
| **Blanco** | `#FFFFFF` | Escorpión y texto |

---

## SIMBOLISMO ACADÉMICO

### El Escorpión en Contexto Académico:

**Pinzas:** Representan la capacidad de **capturar** conocimiento e información

**Cuerpo Central:** El **núcleo** del equipo - estructura sólida y organizada

**Cola Curva:** La **flexibilidad** en estrategias de comunicación

**Aguijón:** El **impacto** preciso de las publicaciones académicas

---

## USO DEL LOGO

### Componente Principal: `<Logo />`
```tsx
import { Logo } from './components/common/Logo';

// Tamaño por defecto (80px)
<Logo />

// Tamaño personalizado
<Logo size={120} />

// Con className adicional
<Logo size={100} className="shadow-lg" />
```

### Componente Horizontal: `<LogoHorizontal />`
```tsx
import { LogoHorizontal } from './components/common/Logo';

<LogoHorizontal size={120} />
```

---

## IMPLEMENTACIÓN

### 1. Página de Login ✅
- Logo principal (100px)
- Título: "SGR - Sistema de Gestión de Revista"
- Subtítulo: "Equipo de Comunicación y Marketing - ACS"
- Institución: "Facultad de Ciencias Sociales - UNC"

### 2. Futuras Implementaciones
- Favicon del navegador
- Header del dashboard
- Documentos oficiales
- Firma de email
- Redes sociales

---

## PROMPT PARA IA DE GENERACIÓN DE IMÁGENES

### Versión en Inglés:
```
Create a minimalist logo for "SGR" (Sistema de Gestión de Revista - ACS)

Style: Clean, modern, minimal like Apple or Nike
Symbol: Stylized scorpion (representing strength, precision, academic rigor)

Requirements:
- Minimalist design with geometric shapes
- Scorpion integrated subtly with "SGR" letters
- Color palette: Deep purple/indigo (#4F46E5) and black
- Professional, academic, yet bold appearance
- Scalable vector-style design
- White background

Design approach:
- Scorpion tail forming the letter "S"
- Clean sans-serif typography
- Negative space usage
- Modern, timeless aesthetic
- Suitable for academic publication branding

Format: Square, high contrast, professional logo mark
```

### Versión en Español:
```
Crea un logo minimalista para "SGR" (Sistema de Gestión de Revista - ACS)

Estilo: Limpio, moderno, minimalista como Apple o Nike
Símbolo: Escorpión estilizado (representa fuerza, precisión, rigor académico)

Requisitos:
- Diseño minimalista con formas geométricas
- Escorpión integrado sutilmente con las letras "SGR"
- Paleta de colores: Morado/índigo profundo (#4F46E5) y negro
- Apariencia profesional, académica pero audaz
- Diseño tipo vectorial escalable
- Fondo blanco

Enfoque de diseño:
- Cola de escorpión formando la letra "S"
- Tipografía sans-serif limpia
- Uso de espacio negativo
- Estética moderna y atemporal
- Adecuado para branding de publicación académica

Formato: Cuadrado, alto contraste, marca de logo profesional
```

---

## VARIACIONES DEL LOGO

### Tamaños Recomendados:
- **Favicon:** 32px × 32px
- **Móvil:** 60px × 60px
- **Tablet:** 80px × 80px
- **Desktop:** 100px × 100px
- **Impresión:** 300px × 300px o más

### Versiones:
1. **Completo:** Logo + texto SGR + subtítulos
2. **Compacto:** Solo logo + SGR
3. **Icono:** Solo escorpión circular

---

## ALINEACIÓN CON LINEAMIENTOS DEL EQUIPO

El logo refleja los **valores del Equipo de Comunicación y Marketing - ACS:**

| Valor | Representación en Logo |
|-------|----------------------|
| **Rigor Académico** | Formas geométricas precisas |
| **Fuerza Colectiva** | Estructura sólida del escorpión |
| **Innovación** | Diseño moderno y minimalista |
| **Profesionalismo** | Paleta de colores corporativa |
| **Impacto Social** | Aguijón que simboliza impacto |

---

## INTEGRACIÓN INSTITUCIONAL

### Base Legal (según Lineamientos):
- ✅ Constitución Política del Perú
- ✅ Ley N° 28740 - Calidad Educativa
- ✅ Estatuto de la UNC

### Representación:
- **Facultad:** Ciencias Sociales
- **Universidad:** Nacional de Cajamarca
- **Equipo:** Comunicación y Marketing
- **Publicación:** Revista ACS

---

## ARCHIVOS RELACIONADOS

- `components/common/Logo.tsx` - Componente React del logo
- `LINEAMIENTOS-EQUIPO-ACS.md` - Lineamientos oficiales del equipo
- `LOGO-DESCRIPCION.md` - Este documento

---

## CRÉDITOS

**Diseño:** Equipo de Comunicación y Marketing - ACS
**Concepto:** Basado en lineamientos del equipo
**Simbolismo:** Escorpión - Fuerza, Precisión, Rigor Académico
**Implementación:** Sistema de Gestión de Revista (SGR)

---

## CONTACTO

**Equipo de Comunicación y Marketing - Revista ACS**
Facultad de Ciencias Sociales
Universidad Nacional de Cajamarca

**Director:** Edwar Jhanpiere Saenz Tello

---

*Logo oficial del Sistema de Gestión de Revista - ACS*
*Octubre 2025*
