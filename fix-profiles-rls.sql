-- ============================================
-- POLÍTICAS RLS PARA TABLA PROFILES
-- ============================================

-- 1. Habilitar RLS en la tabla profiles (si no está habilitado)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 2. Eliminar políticas existentes (por si acaso)
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver todos los perfiles" ON profiles;
DROP POLICY IF EXISTS "Usuarios autenticados pueden insertar perfiles" ON profiles;
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar perfiles" ON profiles;
DROP POLICY IF EXISTS "Usuarios autenticados pueden eliminar perfiles" ON profiles;
DROP POLICY IF EXISTS "Los usuarios pueden ver su propio perfil" ON profiles;
DROP POLICY IF EXISTS "Los usuarios pueden actualizar su propio perfil" ON profiles;

-- 3. CREAR POLÍTICAS NUEVAS (permisivas para autenticados)

-- Política de SELECT: Usuarios autenticados pueden ver todos los perfiles
CREATE POLICY "Usuarios autenticados pueden ver todos los perfiles" 
ON profiles 
FOR SELECT 
TO authenticated 
USING (true);

-- Política de INSERT: Usuarios autenticados pueden crear perfiles
CREATE POLICY "Usuarios autenticados pueden insertar perfiles" 
ON profiles 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Política de UPDATE: Usuarios autenticados pueden actualizar cualquier perfil
CREATE POLICY "Usuarios autenticados pueden actualizar perfiles" 
ON profiles 
FOR UPDATE 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- Política de DELETE: Solo owners pueden eliminar (opcional)
CREATE POLICY "Owners pueden eliminar perfiles" 
ON profiles 
FOR DELETE 
TO authenticated 
USING (auth.uid() IN (
  SELECT id FROM profiles WHERE role IN ('owner', 'dueno')
));

-- ============================================
-- VERIFICACIÓN
-- ============================================
-- Para verificar las políticas creadas:
-- SELECT * FROM pg_policies WHERE tablename = 'profiles';
