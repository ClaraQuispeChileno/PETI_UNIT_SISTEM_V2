-- ============================================================================
-- ESQUEMA COMPLETO - PETI UNIT SISTEM
-- Ejecutar TODO este script en el SQL Editor de la NUEVA cuenta de Supabase
-- ============================================================================

-- ============================================================================
-- 1. EXTENSIONES
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 2. TABLA: usuarios
-- ============================================================================
CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(100) NOT NULL UNIQUE,
  rol VARCHAR(20) NOT NULL CHECK (rol IN ('administrador', 'estratega', 'lider', 'operativo', 'aprobador')),
  activo BOOLEAN DEFAULT true,
  ultimo_acceso TIMESTAMP,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  auth_user_id UUID
);

CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);

-- ============================================================================
-- 3. TABLA: planes
-- ============================================================================
CREATE TABLE IF NOT EXISTS planes (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  anio INT NOT NULL,
  descripcion TEXT,
  estado VARCHAR(20) DEFAULT 'borrador' CHECK (estado IN ('borrador', 'en_revision', 'activo', 'cerrado', 'rechazado')),
  fecha_inicio DATE,
  fecha_fin DATE,
  creado_por INT REFERENCES usuarios(id),
  aprobado_por INT REFERENCES usuarios(id),
  fecha_aprobacion TIMESTAMP,
  mensaje_revision TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 4. TABLA: empresa
-- ============================================================================
CREATE TABLE IF NOT EXISTS empresa (
  id INT PRIMARY KEY DEFAULT 1,
  nombre VARCHAR(200),
  sector VARCHAR(100),
  logo_url VARCHAR(255),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Fila inicial de empresa
INSERT INTO empresa (id, nombre, sector)
VALUES (1, 'ContaPerú S.A.C.', 'Servicios contables')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 5. TABLA: empresa_contenido (M01 global)
-- ============================================================================
CREATE TABLE IF NOT EXISTS empresa_contenido (
  id INT PRIMARY KEY DEFAULT 1 CHECK(id = 1),
  mision TEXT DEFAULT '',
  vision TEXT DEFAULT '',
  valores JSONB DEFAULT '[]'::jsonb,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by INT REFERENCES usuarios(id)
);

INSERT INTO empresa_contenido (id, mision, vision, valores)
VALUES (1, '', '', '[]'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 6. TABLA: empresa_historial
-- ============================================================================
CREATE TABLE IF NOT EXISTS empresa_historial (
  id SERIAL PRIMARY KEY,
  usuario_id INT REFERENCES usuarios(id),
  username VARCHAR(50),
  campo VARCHAR(50) NOT NULL,
  valor_anterior TEXT,
  valor_nuevo TEXT,
  plan_id_afectado INT REFERENCES planes(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_empresa_historial_campo ON empresa_historial(campo);
CREATE INDEX IF NOT EXISTS idx_empresa_historial_created ON empresa_historial(created_at);

-- ============================================================================
-- 7. TABLA: m01_bloqueo_edicion
-- ============================================================================
CREATE TABLE IF NOT EXISTS m01_bloqueo_edicion (
  id INT PRIMARY KEY DEFAULT 1 CHECK(id = 1),
  usuario_id INT REFERENCES usuarios(id),
  username VARCHAR(50),
  locked_at TIMESTAMP,
  heartbeat TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO m01_bloqueo_edicion (id, usuario_id, username, locked_at, heartbeat)
VALUES (1, NULL, NULL, NULL, NULL)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 8. TABLA: modulos (catálogo M01-M09)
-- ============================================================================
CREATE TABLE IF NOT EXISTS modulos (
  id VARCHAR(5) PRIMARY KEY,
  nombre VARCHAR(100),
  descripcion TEXT,
  orden INT
);

INSERT INTO modulos (id, nombre, descripcion, orden) VALUES
  ('M01', 'Información de la Empresa', 'Datos generales de la empresa', 1),
  ('M02', 'Identidad Corporativa', 'Misión, visión y valores corporativos', 2),
  ('M03', 'Objetivos Estratégicos', 'Objetivos generales y específicos', 3),
  ('M04', 'Cadena de Valor', 'Autodiagnóstico de la cadena de valor interna', 4),
  ('M05', 'Matriz BCG', 'Análisis de portafolio de servicios', 5),
  ('M06', '5 Fuerzas de Porter', 'Análisis competitivo del sector', 6),
  ('M07', 'Análisis PEST', 'Análisis del entorno político, económico, social y tecnológico', 7),
  ('M08', 'Matriz FODA', 'Fortalezas, oportunidades, debilidades y amenazas', 8),
  ('M09', 'Matriz CAME', 'Corregir, afrontar, mantener y explotar', 9)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 9. TABLA: plan_contenido
-- ============================================================================
CREATE TABLE IF NOT EXISTS plan_contenido (
  plan_id INT NOT NULL REFERENCES planes(id),
  modulo_id VARCHAR(5) NOT NULL REFERENCES modulos(id),
  contenido JSONB NOT NULL,
  completado BOOLEAN DEFAULT false,
  completado_por INT REFERENCES usuarios(id),
  completado_fecha TIMESTAMP,
  PRIMARY KEY (plan_id, modulo_id)
);

-- ============================================================================
-- 10. TABLA: fuentes_analisis
-- ============================================================================
CREATE TABLE IF NOT EXISTS fuentes_analisis (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(50) NOT NULL UNIQUE,
  descripcion TEXT
);

INSERT INTO fuentes_analisis (nombre, descripcion) VALUES
  ('Cadena de Valor', 'Generado automáticamente desde autodiagnóstico M04'),
  ('Manual', 'Ingresado directamente por el estratega'),
  ('Entrevista', 'Obtenido de entrevistas con stakeholders'),
  ('Encuesta', 'Obtenido de encuestas internas')
ON CONFLICT (nombre) DO NOTHING;

-- ============================================================================
-- 11. TABLA: foda (con trazabilidad)
-- ============================================================================
CREATE TABLE IF NOT EXISTS foda (
  id SERIAL PRIMARY KEY,
  plan_id INT NOT NULL REFERENCES planes(id),
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('fortaleza', 'debilidad', 'oportunidad', 'amenaza')),
  descripcion TEXT NOT NULL,
  fuente_id INT REFERENCES fuentes_analisis(id),
  trazabilidad JSONB,
  generado_auto BOOLEAN DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_foda_plan ON foda(plan_id);

-- ============================================================================
-- 12. TABLA: came
-- ============================================================================
CREATE TABLE IF NOT EXISTS came (
  id SERIAL PRIMARY KEY,
  plan_id INT NOT NULL REFERENCES planes(id),
  categoria VARCHAR(20) NOT NULL CHECK (categoria IN ('corregir', 'afrontar', 'mantener', 'explotar')),
  descripcion TEXT NOT NULL,
  orden INT
);

CREATE INDEX IF NOT EXISTS idx_came_plan ON came(plan_id);

-- ============================================================================
-- 13. TABLA: estrategia_plan
-- ============================================================================
CREATE TABLE IF NOT EXISTS estrategia_plan (
  plan_id INT PRIMARY KEY REFERENCES planes(id),
  tipo_estrategia VARCHAR(20) NOT NULL CHECK (tipo_estrategia IN ('ofensiva', 'defensiva', 'reorientacion', 'supervivencia')),
  descripcion TEXT,
  puntaje_fo INT,
  puntaje_fa INT,
  puntaje_od INT,
  puntaje_da INT
);

-- ============================================================================
-- 14. TABLA: objetivos_generales
-- ============================================================================
CREATE TABLE IF NOT EXISTS objetivos_generales (
  id SERIAL PRIMARY KEY,
  plan_id INT NOT NULL REFERENCES planes(id),
  descripcion TEXT NOT NULL,
  prioridad INT,
  orden INT
);

CREATE INDEX IF NOT EXISTS idx_objetivos_generales_plan ON objetivos_generales(plan_id);

-- ============================================================================
-- 15. TABLA: objetivos_especificos
-- ============================================================================
CREATE TABLE IF NOT EXISTS objetivos_especificos (
  id SERIAL PRIMARY KEY,
  objetivo_general_id INT NOT NULL REFERENCES objetivos_generales(id) ON DELETE CASCADE,
  descripcion TEXT NOT NULL,
  orden INT
);

CREATE INDEX IF NOT EXISTS idx_objetivos_especificos_og ON objetivos_especificos(objetivo_general_id);

-- ============================================================================
-- 16. TABLA: kpis
-- ============================================================================
CREATE TABLE IF NOT EXISTS kpis (
  id SERIAL PRIMARY KEY,
  plan_id INT NOT NULL REFERENCES planes(id),
  objetivo_general_id INT REFERENCES objetivos_generales(id),
  nombre VARCHAR(100) NOT NULL,
  meta NUMERIC(10,2),
  unidad VARCHAR(20),
  valor_actual NUMERIC(10,2),
  frecuencia VARCHAR(20) CHECK (frecuencia IN ('diario', 'semanal', 'mensual', 'trimestral', 'anual')),
  historial JSONB
);

CREATE INDEX IF NOT EXISTS idx_kpis_plan ON kpis(plan_id);

-- ============================================================================
-- 17. TABLA: iniciativas
-- ============================================================================
CREATE TABLE IF NOT EXISTS iniciativas (
  id SERIAL PRIMARY KEY,
  plan_id INT NOT NULL REFERENCES planes(id),
  objetivo_general_id INT REFERENCES objetivos_generales(id),
  area VARCHAR(100) NOT NULL,
  descripcion TEXT NOT NULL,
  fecha_inicio DATE,
  fecha_fin DATE,
  estado VARCHAR(20) DEFAULT 'activa' CHECK (estado IN ('activa', 'completada', 'retrasada'))
);

CREATE INDEX IF NOT EXISTS idx_iniciativas_plan ON iniciativas(plan_id);

-- ============================================================================
-- 18. TABLA: proyectos
-- ============================================================================
CREATE TABLE IF NOT EXISTS proyectos (
  id SERIAL PRIMARY KEY,
  plan_id INT NOT NULL REFERENCES planes(id),
  iniciativa_id INT REFERENCES iniciativas(id),
  nombre VARCHAR(200) NOT NULL,
  responsable_id INT REFERENCES usuarios(id),
  fecha_inicio DATE,
  fecha_fin DATE,
  estado VARCHAR(20) DEFAULT 'activo' CHECK (estado IN ('activo', 'pausado', 'completado')),
  avance INT DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_proyectos_plan ON proyectos(plan_id);

-- ============================================================================
-- 19. TABLA: tareas
-- ============================================================================
CREATE TABLE IF NOT EXISTS tareas (
  id SERIAL PRIMARY KEY,
  plan_id INT NOT NULL REFERENCES planes(id),
  proyecto_id INT REFERENCES proyectos(id),
  asignado_a INT NOT NULL REFERENCES usuarios(id),
  descripcion TEXT NOT NULL,
  fecha_limite DATE,
  prioridad VARCHAR(10) DEFAULT 'media' CHECK (prioridad IN ('alta', 'media', 'baja')),
  estado VARCHAR(20) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'en_proceso', 'completada', 'bloqueada')),
  evidencia TEXT,
  comentarios TEXT,
  solicitud_extension TEXT,
  extension_aprobada BOOLEAN,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tareas_asignado ON tareas(asignado_a);

-- ============================================================================
-- 20. TABLA: alertas
-- ============================================================================
CREATE TABLE IF NOT EXISTS alertas (
  id SERIAL PRIMARY KEY,
  plan_id INT NOT NULL REFERENCES planes(id),
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('kpi', 'proyecto', 'iniciativa', 'escalada')),
  referencia VARCHAR(100),
  descripcion TEXT,
  revisado BOOLEAN DEFAULT false,
  comentario TEXT,
  revisado_por VARCHAR(50),
  fecha_revision TIMESTAMP,
  tiempo_restante INT,
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  destinatario_id INT REFERENCES usuarios(id)
);

CREATE INDEX IF NOT EXISTS idx_alertas_destinatario ON alertas(destinatario_id);

-- ============================================================================
-- 21. TABLA: reportes_generados
-- ============================================================================
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

-- ============================================================================
-- 22. TABLA: reportes_lectura
-- ============================================================================
CREATE TABLE IF NOT EXISTS reportes_lectura (
  usuario_id INT NOT NULL REFERENCES usuarios(id),
  plan_id INT NOT NULL REFERENCES planes(id),
  tipo_reporte VARCHAR(50) NOT NULL,
  leido_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (usuario_id, plan_id, tipo_reporte)
);

CREATE INDEX IF NOT EXISTS idx_reportes_lectura_usuario ON reportes_lectura(usuario_id);
CREATE INDEX IF NOT EXISTS idx_reportes_lectura_plan ON reportes_lectura(plan_id);

-- ============================================================================
-- 23. TABLA: auditoria
-- ============================================================================
CREATE TABLE IF NOT EXISTS auditoria (
  id SERIAL PRIMARY KEY,
  usuario_id INT REFERENCES usuarios(id),
  modulo VARCHAR(50),
  accion VARCHAR(100),
  detalle TEXT,
  fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  usuario_email TEXT,
  usuario_nombre TEXT
);

CREATE INDEX IF NOT EXISTS idx_auditoria_fecha ON auditoria(fecha);
CREATE INDEX IF NOT EXISTS idx_auditoria_modulo ON auditoria(modulo);

-- ============================================================================
-- 24. TABLA: autodiag_cadena (M04 - respuestas de autodiagnóstico)
-- ============================================================================
CREATE TABLE IF NOT EXISTS autodiag_cadena (
  plan_id INT NOT NULL REFERENCES planes(id),
  item_num INT NOT NULL,
  usuario_id INT REFERENCES usuarios(id),
  bloque VARCHAR(100) NOT NULL,
  enunciado TEXT NOT NULL,
  puntaje INT NOT NULL CHECK (puntaje >= 0 AND puntaje <= 4),
  PRIMARY KEY (plan_id, item_num)
);

-- ============================================================================
-- 25. TABLA: matriz_bcg (M05 - Matriz BCG)
-- ============================================================================
CREATE TABLE IF NOT EXISTS matriz_bcg (
  id SERIAL PRIMARY KEY,
  plan_id INT NOT NULL UNIQUE REFERENCES planes(id),
  usuario_id INT REFERENCES usuarios(id),
  estado VARCHAR(20) NOT NULL DEFAULT 'en_edicion' CHECK (estado IN ('en_edicion', 'procesado')),
  datos_uen JSONB NOT NULL DEFAULT '[]'::jsonb,
  bloqueado_por INT REFERENCES usuarios(id),
  bloqueado_por_nombre VARCHAR(100),
  bloqueado_desde TIMESTAMP,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 26. TABLA: porter_resultados (M06 - 5 Fuerzas de Porter)
-- ============================================================================
CREATE TABLE IF NOT EXISTS porter_resultados (
  plan_id INT NOT NULL UNIQUE REFERENCES planes(id),
  usuario_id INT REFERENCES usuarios(id),
  estado VARCHAR(20) NOT NULL DEFAULT 'en_edicion' CHECK (estado IN ('en_edicion', 'procesado')),
  resultados JSONB NOT NULL DEFAULT '{}',
  recomendaciones JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 27. FUNCIÓN: limpiar_auditoria (elimina registros mayores a 30 días)
-- ============================================================================
CREATE OR REPLACE FUNCTION limpiar_auditoria()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM auditoria WHERE fecha < NOW() - INTERVAL '30 days';
END;
$$;

-- ============================================================================
-- 27. STORAGE: Bucket "reportes"
-- ============================================================================
-- NOTA: Crear el bucket manualmente en Supabase Dashboard → Storage → New Bucket
-- Nombre: reportes
-- Público: NO
-- Límite: 50 MB
-- Luego ejecutar las políticas RLS debajo (o crearlas desde el Dashboard)

-- Política para INSERT en storage.objects
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Usuarios autenticados pueden subir reportes'
  ) THEN
    CREATE POLICY "Usuarios autenticados pueden subir reportes"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'reportes');
  END IF;
END;
$$;

-- Política para SELECT en storage.objects
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Usuarios autenticados pueden leer reportes'
  ) THEN
    CREATE POLICY "Usuarios autenticados pueden leer reportes"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (bucket_id = 'reportes');
  END IF;
END;
$$;

-- ============================================================================
-- 28. RLS (Row Level Security) - Recomendaciones
-- ============================================================================
-- Habilita RLS en las tablas principales (opcional, por seguridad):
-- ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE planes ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE auditoria ENABLE ROW LEVEL SECURITY;
--
-- Para desarrollo inicial, puedes dejar RLS deshabilitado.
-- Si habilitas RLS, crea políticas como:
-- CREATE POLICY "Usuarios autenticados pueden leer usuarios"
--   ON usuarios FOR SELECT TO authenticated USING (true);

-- ============================================================================
-- ¡ESQUEMA COMPLETO!
-- Luego de ejecutar este script:
-- 1. Crea el bucket "reportes" en Storage manualmente
-- 2. Actualiza public/js/config.js con tus nuevas credenciales
-- 3. Crea el primer usuario administrador desde Auth en el Dashboard
-- 4. Inserta su registro en la tabla usuarios manualmente
-- ============================================================================
