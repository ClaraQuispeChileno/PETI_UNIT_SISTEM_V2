# PETI UNIT SISTEM — Base de Datos

**Sistema:** PostgreSQL vía Supabase  
**Cliente:** `@supabase/supabase-js`  
**Total de tablas:** 20

---

## `planes`

Planes estratégicos PETI. Tabla central del sistema.

| Columna | Tipo | Restricciones |
|---------|------|---------------|
| `id` | `SERIAL` | `PK` |
| `nombre` | `VARCHAR(100)` | `NOT NULL` |
| `anio` | `INT` | `NOT NULL` |
| `descripcion` | `TEXT` | |
| `estado` | `VARCHAR(20)` | CHECK(`borrador`, `en_revision`, `activo`, `cerrado`, `rechazado`), DEFAULT `'borrador'` |
| `fecha_inicio` | `DATE` | |
| `fecha_fin` | `DATE` | |
| `creado_por` | `INT` | `FK → usuarios(id)` |
| `aprobado_por` | `INT` | `FK → usuarios(id)` |
| `fecha_aprobacion` | `TIMESTAMP` | |
| `mensaje_revision` | `TEXT` | Mensaje del aprobador (rechazo u observaciones) |
| `updated_at` | `TIMESTAMP` | DEFAULT `CURRENT_TIMESTAMP` |
| `created_at` | `TIMESTAMP` | DEFAULT `CURRENT_TIMESTAMP` |

---

## `usuarios`

Usuarios del sistema. Se autentican contra Supabase Auth (`auth_user_id`).

| Columna | Tipo | Restricciones |
|---------|------|---------------|
| `id` | `SERIAL` | `PK` |
| `username` | `VARCHAR(50)` | `NOT NULL`, `UNIQUE` |
| `email` | `VARCHAR(100)` | `NOT NULL`, `UNIQUE`, index `idx_usuarios_email` |
| `rol` | `VARCHAR(20)` | `NOT NULL`, CHECK(`administrador`, `estratega`, `lider`, `operativo`, `aprobador`) |
| `activo` | `BOOLEAN` | DEFAULT `true` |
| `ultimo_acceso` | `TIMESTAMP` | |
| `creado_en` | `TIMESTAMP` | DEFAULT `CURRENT_TIMESTAMP` |
| `auth_user_id` | `UUID` | |

---

## `empresa`

Datos de la empresa. Solo una fila (id = 1).

| Columna | Tipo | Restricciones |
|---------|------|---------------|
| `id` | `INT` | `PK`, DEFAULT 1 |
| `nombre` | `VARCHAR(200)` | |
| `sector` | `VARCHAR(100)` | |
| `logo_url` | `VARCHAR(255)` | |
| `updated_at` | `TIMESTAMP` | DEFAULT `CURRENT_TIMESTAMP` |

---

## `empresa_contenido`

Contenido global de identidad corporativa (misión, visión, valores). Única fila (id=1), compartida por todos los planes PETI.

| Columna | Tipo | Restricciones |
|---------|------|---------------|
| `id` | `INT` | `PK`, DEFAULT 1, CHECK(id = 1) |
| `mision` | `TEXT` | DEFAULT `''` |
| `vision` | `TEXT` | DEFAULT `''` |
| `valores` | `JSONB` | DEFAULT `'[]'::jsonb` |
| `updated_at` | `TIMESTAMP` | DEFAULT `CURRENT_TIMESTAMP` |
| `updated_by` | `INT` | `FK → usuarios(id)` |

---

## `empresa_historial`

Trazabilidad de cada modificación a `empresa_contenido`. Registra quién, cuándo y qué cambió.

| Columna | Tipo | Restricciones |
|---------|------|---------------|
| `id` | `SERIAL` | `PK` |
| `usuario_id` | `INT` | `FK → usuarios(id)` |
| `username` | `VARCHAR(50)` | |
| `campo` | `VARCHAR(50)` | `NOT NULL` (mision, vision, valores) |
| `valor_anterior` | `TEXT` | |
| `valor_nuevo` | `TEXT` | |
| `plan_id_afectado` | `INT` | `FK → planes(id)` |
| `created_at` | `TIMESTAMP` | DEFAULT `CURRENT_TIMESTAMP` |

---

## `m01_bloqueo_edicion`

Control de concurrencia para edición de M01. Solo un estratega puede editar a la vez.

| Columna | Tipo | Restricciones |
|---------|------|---------------|
| `id` | `INT` | `PK`, DEFAULT 1, CHECK(id = 1) |
| `usuario_id` | `INT` | `FK → usuarios(id)` |
| `username` | `VARCHAR(50)` | |
| `locked_at` | `TIMESTAMP` | |
| `heartbeat` | `TIMESTAMP` | DEFAULT `CURRENT_TIMESTAMP` (se actualiza cada 30s; expira a los 60s) |

---

## `modulos`

Catálogo de módulos del plan estratégico (M01–M09).

| Columna | Tipo | Restricciones |
|---------|------|---------------|
| `id` | `VARCHAR(5)` | `PK` |
| `nombre` | `VARCHAR(100)` | |
| `descripcion` | `TEXT` | |
| `orden` | `INT` | |

---

## `plan_contenido`

Contenido de cada módulo por plan (clave compuesta). Almacena datos en JSONB.

| Columna | Tipo | Restricciones |
|---------|------|---------------|
| `plan_id` | `INT` | `PK`, `FK → planes(id)` |
| `modulo_id` | `VARCHAR(5)` | `PK`, `FK → modulos(id)` |
| `contenido` | `JSONB` | `NOT NULL` |
| `completado` | `BOOLEAN` | DEFAULT `false` |
| `completado_por` | `INT` | `FK → usuarios(id)` |
| `completado_fecha` | `TIMESTAMP` | |

---

## `fuentes_analisis`

Catálogo de fuentes de análisis para los items FODA.

| Columna | Tipo | Restricciones |
|---------|------|---------------|
| `id` | `SERIAL` | `PK` |
| `nombre` | `VARCHAR(50)` | `NOT NULL`, `UNIQUE` |
| `descripcion` | `TEXT` | |

---

## `foda`

Análisis FODA (Fortalezas, Oportunidades, Debilidades, Amenazas).

| Columna | Tipo | Restricciones |
|---------|------|---------------|
| `id` | `SERIAL` | `PK` |
| `plan_id` | `INT` | `NOT NULL`, `FK → planes(id)` |
| `tipo` | `VARCHAR(20)` | `NOT NULL`, CHECK(`fortaleza`, `debilidad`, `oportunidad`, `amenaza`) |
| `descripcion` | `TEXT` | `NOT NULL` |
| `fuente_id` | `INT` | `FK → fuentes_analisis(id)` |

---

## `came`

Análisis CAME derivado del FODA.

| Columna | Tipo | Restricciones |
|---------|------|---------------|
| `id` | `SERIAL` | `PK` |
| `plan_id` | `INT` | `NOT NULL`, `FK → planes(id)` |
| `categoria` | `VARCHAR(20)` | `NOT NULL`, CHECK(`corregir`, `afrontar`, `mantener`, `explotar`) |
| `descripcion` | `TEXT` | `NOT NULL` |
| `orden` | `INT` | |

---

## `estrategia_plan`

Estrategia seleccionada del plan (ofensiva, defensiva, reorientación, supervivencia). Relación 1:1 con `planes`.

| Columna | Tipo | Restricciones |
|---------|------|---------------|
| `plan_id` | `INT` | `PK`, `FK → planes(id)` |
| `tipo_estrategia` | `VARCHAR(20)` | `NOT NULL`, CHECK(`ofensiva`, `defensiva`, `reorientacion`, `supervivencia`) |
| `descripcion` | `TEXT` | |
| `puntaje_fo` | `INT` | |
| `puntaje_fa` | `INT` | |
| `puntaje_od` | `INT` | |
| `puntaje_da` | `INT` | |

---

## `objetivos_generales`

Objetivos estratégicos generales por plan.

| Columna | Tipo | Restricciones |
|---------|------|---------------|
| `id` | `SERIAL` | `PK` |
| `plan_id` | `INT` | `NOT NULL`, `FK → planes(id)` |
| `descripcion` | `TEXT` | `NOT NULL` |
| `prioridad` | `INT` | |
| `orden` | `INT` | |

---

## `objetivos_especificos`

Objetivos específicos, hijos de `objetivos_generales`. Se eliminan en cascada.

| Columna | Tipo | Restricciones |
|---------|------|---------------|
| `id` | `SERIAL` | `PK` |
| `objetivo_general_id` | `INT` | `NOT NULL`, `FK → objetivos_generales(id) ON DELETE CASCADE` |
| `descripcion` | `TEXT` | `NOT NULL` |
| `orden` | `INT` | |

---

## `kpis`

Indicadores clave de rendimiento por plan y opcionalmente por objetivo.

| Columna | Tipo | Restricciones |
|---------|------|---------------|
| `id` | `SERIAL` | `PK` |
| `plan_id` | `INT` | `NOT NULL`, `FK → planes(id)` |
| `objetivo_general_id` | `INT` | `FK → objetivos_generales(id)` |
| `nombre` | `VARCHAR(100)` | `NOT NULL` |
| `meta` | `NUMERIC(10,2)` | |
| `unidad` | `VARCHAR(20)` | |
| `valor_actual` | `NUMERIC(10,2)` | |
| `frecuencia` | `VARCHAR(20)` | CHECK(`diario`, `semanal`, `mensual`, `trimestral`, `anual`) |
| `historial` | `JSONB` | |

---

## `iniciativas`

Iniciativas estratégicas por plan y objetivo.

| Columna | Tipo | Restricciones |
|---------|------|---------------|
| `id` | `SERIAL` | `PK` |
| `plan_id` | `INT` | `NOT NULL`, `FK → planes(id)` |
| `objetivo_general_id` | `INT` | `FK → objetivos_generales(id)` |
| `area` | `VARCHAR(100)` | `NOT NULL` |
| `descripcion` | `TEXT` | `NOT NULL` |
| `fecha_inicio` | `DATE` | |
| `fecha_fin` | `DATE` | |
| `estado` | `VARCHAR(20)` | CHECK(`activa`, `completada`, `retrasada`), DEFAULT `'activa'` |

---

## `proyectos`

Proyectos vinculados a iniciativas.

| Columna | Tipo | Restricciones |
|---------|------|---------------|
| `id` | `SERIAL` | `PK` |
| `plan_id` | `INT` | `NOT NULL`, `FK → planes(id)` |
| `iniciativa_id` | `INT` | `FK → iniciativas(id)` |
| `nombre` | `VARCHAR(200)` | `NOT NULL` |
| `responsable_id` | `INT` | `FK → usuarios(id)` |
| `fecha_inicio` | `DATE` | |
| `fecha_fin` | `DATE` | |
| `estado` | `VARCHAR(20)` | CHECK(`activo`, `pausado`, `completado`), DEFAULT `'activo'` |
| `avance` | `INT` | DEFAULT 0 |

---

## `tareas`

Tareas operativas asignadas a usuarios, vinculadas a proyectos.

| Columna | Tipo | Restricciones |
|---------|------|---------------|
| `id` | `SERIAL` | `PK` |
| `plan_id` | `INT` | `NOT NULL`, `FK → planes(id)` |
| `proyecto_id` | `INT` | `FK → proyectos(id)` |
| `asignado_a` | `INT` | `NOT NULL`, `FK → usuarios(id)` |
| `descripcion` | `TEXT` | `NOT NULL` |
| `fecha_limite` | `DATE` | |
| `prioridad` | `VARCHAR(10)` | CHECK(`alta`, `media`, `baja`), DEFAULT `'media'` |
| `estado` | `VARCHAR(20)` | CHECK(`pendiente`, `en_proceso`, `completada`, `bloqueada`), DEFAULT `'pendiente'` |
| `evidencia` | `TEXT` | |
| `comentarios` | `TEXT` | |
| `solicitud_extension` | `TEXT` | |
| `extension_aprobada` | `BOOLEAN` | |
| `created_at` | `TIMESTAMP` | DEFAULT `CURRENT_TIMESTAMP` |

---

## `alertas`

Alertas/notificaciones del sistema sobre KPIs, proyectos o iniciativas.

| Columna | Tipo | Restricciones |
|---------|------|---------------|
| `id` | `SERIAL` | `PK` |
| `plan_id` | `INT` | `NOT NULL`, `FK → planes(id)` |
| `tipo` | `VARCHAR(20)` | `NOT NULL`, CHECK(`kpi`, `proyecto`, `iniciativa`, `escalada`) |
| `referencia` | `VARCHAR(100)` | |
| `descripcion` | `TEXT` | |
| `revisado` | `BOOLEAN` | DEFAULT `false` |
| `comentario` | `TEXT` | |
| `revisado_por` | `VARCHAR(50)` | |
| `fecha_revision` | `TIMESTAMP` | |
| `tiempo_restante` | `INT` | |
| `fecha_creacion` | `TIMESTAMP` | DEFAULT `CURRENT_TIMESTAMP` |
| `destinatario_id` | `INT` | `FK → usuarios(id)`, NULLABLE |

---

## `reportes_generados`

Registro de reportes generados por el Aprobador y almacenados en Supabase Storage.

| Columna | Tipo | Restricciones |
|---------|------|---------------|
| `id` | `SERIAL` | `PK` |
| `usuario_id` | `INT` | `NOT NULL`, `FK → usuarios(id)` |
| `plan_id` | `INT` | `FK → planes(id) ON DELETE SET NULL` |
| `tipo_reporte` | `VARCHAR(50)` | `NOT NULL` |
| `formato` | `VARCHAR(10)` | `NOT NULL`, CHECK(`PDF`, `Excel`, `CSV`) |
| `titulo` | `VARCHAR(200)` | |
| `archivo_url` | `TEXT` | |
| `archivo_tamano` | `INT` | |
| `created_at` | `TIMESTAMP` | DEFAULT `CURRENT_TIMESTAMP` |

---

## `reportes_lectura`

Tracking de cuándo el Aprobador leyó o reconoció cambios por tipo de reporte para cada plan.

| Columna | Tipo | Restricciones |
|---------|------|---------------|
| `usuario_id` | `INT` | `PK`, `FK → usuarios(id)` |
| `plan_id` | `INT` | `PK`, `FK → planes(id)` |
| `tipo_reporte` | `VARCHAR(50)` | `PK`, `NOT NULL` |
| `leido_en` | `TIMESTAMP` | DEFAULT `CURRENT_TIMESTAMP` |

---

## `auditoria`

Registro de auditoría de todas las acciones del sistema.

| Columna | Tipo | Restricciones |
|---------|------|---------------|
| `id` | `SERIAL` | `PK` |
| `usuario_id` | `INT` | `FK → usuarios(id)` |
| `modulo` | `VARCHAR(50)` | |
| `accion` | `VARCHAR(100)` | |
| `detalle` | `TEXT` | |
| `fecha` | `TIMESTAMP` | DEFAULT `CURRENT_TIMESTAMP` |
| `usuario_email` | `TEXT` | |
| `usuario_nombre` | `TEXT` | |

---

## Relaciones (Diagrama)

```
planes ──┬── plan_contenido        (1:N, compuesta con modulo_id)
          ├── foda                  (1:N)
          ├── came                  (1:N)
          ├── estrategia_plan       (1:1)
          ├── objetivos_generales   (1:N)
          ├── kpis                  (1:N)
          ├── iniciativas           (1:N)
          ├── proyectos             (1:N)
          ├── tareas                (1:N)
          ├── alertas               (1:N)
          └── reportes_generados    (1:N)
               └── usuarios         (FK: creado_por, aprobado_por, etc.)

objetivos_generales ──┬── objetivos_especificos  (1:N, ON DELETE CASCADE)
                       ├── kpis                   (1:N)
                       └── iniciativas            (1:N)

iniciativas ──── proyectos    (1:N)
proyectos  ──── tareas       (1:N)

usuarios ──┬── tareas(asignado_a)
            ├── proyectos(responsable_id)
            ├── plan_contenido(completado_por)
            ├── auditoria(usuario_id)
            ├── alertas(destinatario_id)
            ├── reportes_generados(usuario_id)
            └── reportes_lectura(usuario_id)

fuentes_analisis ──── foda(fuente_id)  (1:N)
```

---

> **Nota:** Este README se actualiza manualmente cuando se modifican tablas, columnas o relaciones en Supabase.
