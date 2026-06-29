-- ============================================
-- FIX NOTIFICATIONS PERMISSIONS
-- Script para arreglar permisos de eliminación
-- ============================================

-- 1. Ver las políticas actuales de la tabla notifications
-- (Ejecuta esto primero para ver qué políticas existen)
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'notifications';

-- ============================================

-- 2. ELIMINAR políticas antiguas si existen
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON notifications;

-- ============================================

-- 3. CREAR nuevas políticas correctas

-- Política para VER notificaciones (SELECT)
CREATE POLICY "Users can view their own notifications"
ON notifications
FOR SELECT
USING (auth.uid() = user_id);

-- Política para ACTUALIZAR notificaciones (UPDATE)
-- Permite marcar como leídas
CREATE POLICY "Users can update their own notifications"
ON notifications
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Política para ELIMINAR notificaciones (DELETE) ⭐ IMPORTANTE
CREATE POLICY "Users can delete their own notifications"
ON notifications
FOR DELETE
USING (auth.uid() = user_id);

-- Política para INSERTAR notificaciones (INSERT)
-- El sistema puede crear notificaciones para cualquier usuario
CREATE POLICY "System can insert notifications"
ON notifications
FOR INSERT
WITH CHECK (true);

-- ============================================

-- 4. Verificar que RLS está habilitado
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- ============================================

-- 5. VERIFICAR LAS POLÍTICAS CREADAS
SELECT 
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'notifications';

-- ============================================
-- RESULTADO ESPERADO:
-- 
-- Deberías ver 4 políticas:
-- 1. "Users can view their own notifications" - SELECT
-- 2. "Users can update their own notifications" - UPDATE
-- 3. "Users can delete their own notifications" - DELETE ⭐
-- 4. "System can insert notifications" - INSERT
--
-- ============================================

-- INSTRUCCIONES:
-- 1. Ve a Supabase Dashboard
-- 2. Abre SQL Editor
-- 3. Copia y pega este script
-- 4. Ejecuta todo el script
-- 5. Verifica que las 4 políticas se crearon correctamente
-- 6. Prueba eliminar notificaciones en la aplicación
