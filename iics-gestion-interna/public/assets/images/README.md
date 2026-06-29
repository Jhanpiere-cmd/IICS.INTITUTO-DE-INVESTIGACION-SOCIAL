# 📁 CARPETA DE IMÁGENES DEL SISTEMA

## 🦂 LOGO SGR

**Instrucciones para agregar tu logo:**

1. **Guarda tu imagen del logo con el nombre:**
   ```
   logo-sgr.png
   ```

2. **Coloca el archivo en esta carpeta:**
   ```
   d:\Sistema oficial de Gestion ACS\public\assets\images\logo-sgr.png
   ```

3. **El sistema automáticamente lo usará en:**
   - ✅ Página de Login
   - ✅ Documentación "Acerca del Sistema"
   - ✅ Cualquier componente que use `<Logo useImage={true} />`

---

## 📏 ESPECIFICACIONES RECOMENDADAS

### Formato:
- **Extensión:** `.png` (con fondo transparente preferiblemente)
- **Alternativas:** `.jpg`, `.svg`, `.webp`

### Tamaño:
- **Mínimo:** 200px × 200px
- **Recomendado:** 500px × 500px
- **Máximo:** 1000px × 1000px

### Peso:
- **Máximo:** 500 KB
- **Recomendado:** < 200 KB

---

## 🎨 USO DEL LOGO EN EL CÓDIGO

### Con imagen real (tu logo):
```tsx
<Logo useImage={true} size={100} />
```

### Con SVG por defecto:
```tsx
<Logo size={100} />
```

---

## 📂 ESTRUCTURA DE ARCHIVOS

```
public/
└── assets/
    └── images/
        ├── logo-sgr.png  ← TU LOGO AQUÍ
        └── README.md     ← Este archivo
```

---

## ✅ VERIFICACIÓN

Después de colocar tu imagen:

1. Reinicia el servidor de desarrollo:
   ```bash
   npm run dev
   ```

2. Abre la página de login

3. Deberías ver tu logo en lugar del SVG por defecto

---

## 🔄 SI NO SE MUESTRA LA IMAGEN

1. **Verifica el nombre:** Debe ser exactamente `logo-sgr.png`

2. **Verifica la ruta:** Debe estar en `public/assets/images/`

3. **Limpia caché del navegador:** Ctrl + Shift + R

4. **Reinicia el servidor**

---

## 📸 OTRAS IMÁGENES DEL SISTEMA

Puedes agregar más imágenes en esta carpeta:

- `favicon.ico` - Icono del navegador
- `og-image.png` - Imagen para redes sociales
- `banner.jpg` - Banner del sistema

---

*Carpeta de recursos gráficos del SGR - Sistema de Gestión de Revista ACS*
