-- =============================================
-- MIGRACIÓN: Tabla dedicada para FODA de Cadena de Valor
-- Propósito: Guardar fortalezas y debilidades derivadas del
--            autodiagnóstico M04, independientes de las respuestas.
-- =============================================

CREATE TABLE IF NOT EXISTS public.cadena_valor_foda (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id INT NOT NULL REFERENCES public.planes(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('fortaleza', 'debilidad')),
  descripcion text NOT NULL,
  item_num int,
  bloque text,
  puntaje int,
  generado_auto boolean DEFAULT true,
  trazabilidad jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cadena_valor_foda_plan ON public.cadena_valor_foda(plan_id);
CREATE INDEX IF NOT EXISTS idx_cadena_valor_foda_tipo ON public.cadena_valor_foda(tipo);

-- RLS Policies
ALTER TABLE public.cadena_valor_foda ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Estrategas pueden ver todos los FODA de cadena de valor"
  ON public.cadena_valor_foda FOR SELECT
  USING (true);

CREATE POLICY "Estrategas pueden insertar FODA de cadena de valor"
  ON public.cadena_valor_foda FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Estrategas pueden actualizar FODA de cadena de valor"
  ON public.cadena_valor_foda FOR UPDATE
  USING (true);

CREATE POLICY "Estrategas pueden eliminar FODA de cadena de valor"
  ON public.cadena_valor_foda FOR DELETE
  USING (true);
