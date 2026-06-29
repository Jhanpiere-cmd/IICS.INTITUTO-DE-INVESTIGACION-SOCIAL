# Plan de Implementación: React Router y Recuperación de Contraseña

## Objetivo
Mejorar la navegación de la aplicación implementando `react-router-dom` para un enrutamiento declarativo y añadir la funcionalidad de recuperación de contraseña.

## Cambios Propuestos

### 1. Instalación de Dependencias
- Instalar `react-router-dom`.

### 2. Refactorización de Enrutamiento
- **`App.tsx`**:
    - Reemplazar el estado `currentView` con `<Routes>` y `<Route>`.
    - Definir rutas para cada vista:
        - `/` -> Dashboard
        - `/login` -> Login
        - `/tasks` -> TasksViewNew
        - `/calendar` -> CalendarViewNew
        - `/meetings` -> MeetingsView
        - `/resources` -> ResourcesManager
        - `/news` -> NewsView
        - `/proposals` -> ProposalsView
        - `/reports` -> ReportsView
        - `/users` -> UserManagement
        - `/settings` -> SettingsView
        - `/chat` -> ChatbotView
        - `/forgot-password` -> ForgotPassword (Nueva)
        - `/update-password` -> UpdatePassword (Nueva)
    - Crear un componente `Layout` o usar una ruta layout para envolver el contenido con `Sidebar` y `Header`.
    - Implementar `ProtectedRoute` para redirigir al login si no hay usuario autenticado.

- **`components/layout/Sidebar.tsx`**:
    - Reemplazar `onClick={() => setCurrentView(...)}` con `<NavLink>` o `useNavigate`.
    - Actualizar estilos para indicar la ruta activa usando `NavLink` `isActive`.

- **`components/layout/Header.tsx`**:
    - Actualizar la navegación de notificaciones y menú de usuario para usar `useNavigate`.

- **`components/dashboard/Dashboard.tsx`**:
    - Actualizar `onNavigate` para usar `useNavigate`.

### 3. Recuperación de Contraseña
- **`contexts/AuthContext.tsx`**:
    - Añadir función `resetPassword(email: string)`.
    - Añadir función `updatePassword(password: string)`.

- **`components/auth/ForgotPassword.tsx`** (Nuevo):
    - Formulario para ingresar email.
    - Llama a `resetPassword`.

- **`components/auth/UpdatePassword.tsx`** (Nuevo):
    - Formulario para ingresar nueva contraseña.
    - Llama a `updatePassword`.
    - Esta es la página a la que redirige el link del correo.

- **`components/auth/Login.tsx`**:
    - Añadir enlace "¿Olvidaste tu contraseña?" que apunte a `/forgot-password`.

#### [MODIFY] [ReportsTab.tsx](file:///d:/Sistema%20oficial%20de%20Gestion%20ACS/components/events/ReportsTab.tsx)
- Add type casting to objects to resolve `Property 'revenue' does not exist on type 'unknown'`.

#### [MODIFY] [FinanceView.tsx](file:///d:/Sistema%20oficial%20de%20Gestion%20ACS/components/finance/FinanceView.tsx)
- Correct the `IImageOptions` structure in `jsPDF.addImage` call.

#### [MODIFY] [ProposalsView.tsx](file:///d:/Sistema%20oficial%20de%20Gestion%20ACS/components/proposals/ProposalsView.tsx)
- Fix the missing `setToast` by using `showToast` from `useToast`.

#### [MODIFY] [UserManagement.tsx](file:///d:/Sistema%20oficial%20de%20Gestion%20ACS/components/users/UserManagement.tsx)
- Fix the missing `setToast` by using `showToast` from `useToast`.

---

### [PHASE 4] Hook and Agent Logic Fixes

## Plan de Verificación
1.  **Navegación**: Verificar que todas las opciones del menú lateral cambien la URL y carguen la vista correcta.
2.  **Historial**: Verificar que los botones "Atrás" y "Adelante" del navegador funcionen.
3.  **Protección**: Intentar acceder a `/dashboard` sin estar logueado (debe redirigir a login).
4.  **Recuperación**:
    - Ir a "Olvidé mi contraseña".
    - Ingresar correo.
    - Verificar recepción de correo (simulado o real si SMTP está configurado).
    - Simular clic en link de recuperación (o ir manualmente a `/update-password` con token simulado si es necesario para pruebas locales).
    - Cambiar contraseña.
    - Loguearse con nueva contraseña.
