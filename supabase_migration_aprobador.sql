-- ============================================================================
-- SCRIPTS SQL PARA EJECUTAR EN SUPABASE SQL EDITOR
-- Rol Aprobador PETI - Cambios en base de datos
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. AGREGAR COLUMNA destinatario_id A alertas
--    Permite dirigir alertas a usuarios específicos (notificaciones)
-- ----------------------------------------------------------------------------
ALTER TABLE alertas ADD COLUMN IF NOT EXISTS destinatario_id INT REFERENCES usuarios(id);

-- Crear índice para búsquedas por destinatario
CREATE INDEX IF NOT EXISTS idx_alertas_destinatario ON alertas(destinatario_id);


-- ----------------------------------------------------------------------------
-- 2. CREAR TABLA reportes_generados
--    Registro de reportes generados y almacenados en Storage
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reportes_generados (
  id SERIAL PRIMARY KEY,
  usuario_id INT NOT NULL REFERENCES usuarios(id),
  plan_id INT REFERENCES planes(id) ON DELETE SET NULL,
  tipo_reporte VARCHAR(50) NOT NULL,
  formato VARCHAR(10) NOT NULL CHECK(formato IN ('PDF', 'Excel', 'CSV')),
  titulo VARCHAR(200),
  archivo_url TEXT,
  archivo_tamano INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reportes_usuario ON reportes_generados(usuario_id);
CREATE INDEX IF NOT EXISTS idx_reportes_plan ON reportes_generados(plan_id);


-- ----------------------------------------------------------------------------
-- 3. ACTUALIZAR CHECK CONSTRAINT de planes.estado
--    Agrega 'en_revision' y 'rechazado' a los valores permitidos
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  constraint_name_var TEXT;
BEGIN
  -- Encontrar el nombre real del CHECK constraint
  SELECT con.conname INTO constraint_name_var
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  WHERE rel.relname = 'planes'
    AND con.contype = 'c'
    AND pg_get_constraintdef(con.oid) LIKE '%estado%';

  IF constraint_name_var IS NOT NULL THEN
    -- Eliminar el constraint existente
    EXECUTE format('ALTER TABLE planes DROP CONSTRAINT %I', constraint_name_var);

    -- Crear nuevo constraint con los 5 valores
    EXECUTE 'ALTER TABLE planes ADD CONSTRAINT ' || constraint_name_var || ' CHECK (estado IN (''borrador'', ''activo'', ''cerrado'', ''rechazado'', ''en_revision''))';
  ELSE
    -- Si no existe CHECK constraint, crear uno nuevo
    EXECUTE 'ALTER TABLE planes ADD CONSTRAINT planes_estado_check CHECK (estado IN (''borrador'', ''activo'', ''cerrado'', ''rechazado'', ''en_revision''))';
  END IF;
END $$;


-- ----------------------------------------------------------------------------
-- 4. CREAR BUCKET DE STORAGE PARA REPORTES
--    (Ejecutar en la consola SQL o crear manualmente en Supabase Dashboard)
-- ----------------------------------------------------------------------------
-- Ve a Supabase Dashboard → Storage → New Bucket
-- Nombre del bucket: reportes
-- Public bucket: NO (mantener privado, acceso vía RLS)
-- File size limit: 50 MB

-- Política RLS para el bucket reportes (insertar):
CREATE POLICY "Usuarios autenticados pueden subir reportes"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'reportes');

-- Política RLS para el bucket reportes (leer):
CREATE POLICY "Usuarios autenticados pueden leer reportes"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'reportes');


-- ----------------------------------------------------------------------------
-- 5. CREAR TABLA reportes_lectura
--    Tracking de cuándo el usuario leyó/reconoció cambios por tipo de reporte
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reportes_lectura (
  usuario_id INT NOT NULL REFERENCES usuarios(id),
  plan_id INT NOT NULL REFERENCES planes(id),
  tipo_reporte VARCHAR(50) NOT NULL,
  leido_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (usuario_id, plan_id, tipo_reporte)
);

CREATE INDEX IF NOT EXISTS idx_reportes_lectura_usuario ON reportes_lectura(usuario_id);
CREATE INDEX IF NOT EXISTS idx_reportes_lectura_plan ON reportes_lectura(plan_id);
