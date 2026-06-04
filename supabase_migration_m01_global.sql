-- ============================================================================
-- MIGRACIÓN: M01 Global Multi-Plan + Trazabilidad + Bloqueo Concurrente
-- Ejecutar en Supabase SQL Editor
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Tabla global empresa_contenido (misión, visión, valores corporativos)
--    Solo una fila (id=1). Global para todos los planes.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS empresa_contenido (
  id INT PRIMARY KEY DEFAULT 1 CHECK(id = 1),
  mision TEXT DEFAULT '',
  vision TEXT DEFAULT '',
  valores JSONB DEFAULT '[]'::jsonb,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by UUID
);

-- Insertar fila inicial si no existe
INSERT INTO empresa_contenido (id, mision, vision, valores)
VALUES (1, '', '', '[]'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 2. Tabla empresa_historial (trazabilidad de cambios en M01)
--    Registra cada modificación: quién, cuándo, qué cambió, qué plan pudo afectar
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS empresa_historial (
  id SERIAL PRIMARY KEY,
  usuario_id UUID,
  username VARCHAR(50),
  campo VARCHAR(50) NOT NULL,
  valor_anterior TEXT,
  valor_nuevo TEXT,
  plan_id_afectado INT REFERENCES planes(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_empresa_historial_campo ON empresa_historial(campo);
CREATE INDEX IF NOT EXISTS idx_empresa_historial_created ON empresa_historial(created_at);

-- ----------------------------------------------------------------------------
-- 3. Tabla m01_bloqueo_edicion (control de concurrencia)
--    Solo un usuario estratega puede editar M01 a la vez.
--    El heartbeat previene deadlocks si un usuario cierra sin liberar.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m01_bloqueo_edicion (
  id INT PRIMARY KEY DEFAULT 1 CHECK(id = 1),
  usuario_id UUID,
  username VARCHAR(50),
  locked_at TIMESTAMP,
  heartbeat TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO m01_bloqueo_edicion (id, usuario_id, username, locked_at, heartbeat)
VALUES (1, NULL, NULL, NULL, NULL)
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 4. Agregar columna mensaje_revision a planes (mensaje del aprobador)
-- ----------------------------------------------------------------------------
ALTER TABLE planes ADD COLUMN IF NOT EXISTS mensaje_revision TEXT;
ALTER TABLE planes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
