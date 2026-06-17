# PETI UNIT SISTEM

Sistema de Planeamiento Estratégico de Tecnologías de Información (PETI) para **ContaPerú S.A.C.** — plataforma web colaborativa que digitaliza y centraliza la elaboración, aprobación, seguimiento y control de planes estratégicos, reemplazando los procesos manuales basados en papel y Excel.

---

## Roles del Sistema (Activos)

| Rol | Descripción |
|-----|-------------|
| **Administrador** | Gestiona usuarios del sistema (crear, editar, eliminar), consulta el panel de auditoría con trazabilidad completa de todas las acciones, visualiza dashboards con métricas de actividad y mantiene la información corporativa global (empresa, sector). Puede exportar reportes de auditoría en CSV y PDF. |
| **Estratega** | Elabora el plan estratégico completo a través de los 10 módulos (M01–M10). Cada módulo cuenta con asistentes wizard guiados, bloqueo de concurrencia para edición colaborativa segura, autoguardado en base de datos y generación automática de análisis derivados. |
| **Aprobador** | Revisa los planes enviados por el Estratega, visualiza resúmenes ejecutivos y el detalle de cada módulo en modo lectura. Aprueba planes (con o sin observaciones), los rechaza con motivo, o los devuelve para corrección. Genera reportes descargables en PDF, Excel y CSV. Supervisa alertas del sistema y gestiona el ciclo de vida de los planes (crear, editar, inhabilitar, eliminar). |

---

## Stack Tecnológico

- **Frontend:** HTML5, CSS3, JavaScript vanilla (sin frameworks), Bootstrap Icons
- **Backend:** Supabase (PostgreSQL 15 + Edge Functions + Auth + Storage)
- **Infraestructura:** Vercel (hosting estático con headers de caché optimizados)
- **Librerías:** Chart.js (radar/gráficos), html2pdf.js (exportación PDF), Supabase JS SDK v2
- **Base de datos:** PostgreSQL 15 — 20 tablas con RLS (Row Level Security)

---

## Módulos del Plan Estratégico (M01–M10)

Cada módulo representa una etapa del planeamiento estratégico. El Estratega los completa de forma secuencial o independiente mediante asistentes visuales tipo wizard con stepper, guardado automático y barras de progreso.

| Módulo | Descripción | Funcionalidades clave |
|--------|-------------|-----------------------|
| **M01** | **Misión** — Definición del propósito central de la empresa, lo que hace en el día a día y a quién beneficia. | Editor de texto con contador de caracteres, wizard paso a paso, guardado con historial de cambios (tabla `empresa_historial`). |
| **M02** | **Visión** — Proyección del futuro de la empresa a largo plazo, hacia dónde quiere llegar y en qué se convertirá. | Mismo editor que M01, integrado en el wizard de Identidad Corporativa. |
| **M03** | **Valores corporativos** — Principios éticos y creencias que guían las acciones y decisiones de la organización. | Editor visual de tarjetas (hasta 6 valores), modal para título y descripción, reordenamiento y eliminación. |
| **M04** | **Objetivos específicos y generales** — Definición de objetivos estratégicos jerárquicos con metas medibles. | Editor de objetivos generales con sub-objetivos específicos anidados, modal de edición, validación de campos. |
| **M05** | **Cadena de Valor** — Autodiagnóstico interno de 25 preguntas distribuidas en 5 bloques: Infraestructura y Gestión, RR.HH., Desarrollo Tecnológico, Aprovisionamiento, Actividades Primarias. | Escala Likert (0–4) con indicador automático de fortaleza/debilidad, gráfico radar (Chart.js), puntaje total /100, potencial de mejora, clasificación (Crítico / Mejorable / Sólido), generación automática de FODA. |
| **M06** | **Matriz BCG** — Análisis de portafolio de Unidades Estratégicas de Negocio (UEN) según tasa de crecimiento y cuota de mercado. | Wizard de 3 pasos (Portafolio y Ventas, Crecimiento de Mercado, Competencia Directa), cálculo automático de peso porcentual y cuadrantes (Estrella, Vaca, Interrogante, Perro), gráfico de burbujas, bloqueo de concurrencia. |
| **M07** | **5 Fuerzas de Porter** — Evaluación de la intensidad competitiva del sector. | Editor estructurado por fuerza (Rivalidad, Nuevos entrantes, Poder de clientes, Poder de proveedores, Sustitutos), guardado en JSONB. |
| **M08** | **Análisis PEST** — Evaluación del macroentorno: factores Políticos, Económicos, Sociales, Tecnológicos y Ambientales. | Editor estructurado por dimensión, guardado en JSONB. |
| **M09** | **Matriz FODA** — Identificación de Fortalezas, Oportunidades, Debilidades y Amenazas. | Alimentado automáticamente desde M05 (Cadena de Valor), permite edición manual, agrupación por tipo con indicadores de color. |
| **M10** | **Matriz CAME** — Estrategias derivadas del FODA: Corregir debilidades, Afrontar amenazas, Mantener fortalezas, Explotar oportunidades. | Wizard de 4 pasos correlacionados con los tipos FODA, permite registrar estrategias por categoría. |

**KPIs e Iniciativas** — Además de los módulos, el sistema permite registrar indicadores clave de rendimiento (KPIs) vinculados a objetivos, iniciativas estratégicas por área, y proyectos con tareas operativas.

---

## Flujo de Trabajo

```
Administrador --> Crea usuarios y asigna roles
       |
       v
Estratega --> Elabora el plan (M01–M10) en estado "borrador"
       |
       v
Estratega --> Envía el plan a revisión (estado "en_revision")
       |
       v
Aprobador --> Revisa módulos, lee resumen ejecutivo
       |
       ├── Aprobar --> estado "activo" (plan en ejecución)
       ├── Aprobar con observaciones --> estado "activo"
       └── Rechazar --> estado "rechazado" (Estratega corrige y reenvía)
```

### Ciclo de vida de un plan
```
Borrador --> En Revisión --> Activo (aprobado)
                         --> Rechazado (vuelve a borrador)
                         --> Cerrado (inhabilitado)
```

---

## Estructura del Proyecto

```
├── public/
│   ├── index.html                    # Login / página principal
│   ├── css/
│   │   ├── index.css                 # Estilos del login
│   │   ├── Admin-Panel.css
│   │   ├── Estratega-Panel.css
│   │   └── Aprobador-Panel.css
│   ├── html/
│   │   ├── Admin-Panel.html          # Panel del Administrador
│   │   ├── Estratega-Panel.html      # Panel del Estratega (M01–M10)
│   │   └── Aprobador-Panel.html      # Panel del Aprobador
│   └── js/
│       ├── config.js                 # Configuración Supabase (URL + Anon Key)
│       ├── index.js                  # Lógica de login y autenticación
│       ├── Admin-Panel.js            # CRUD de usuarios, auditoría, dashboard
│       ├── Estratega-Panel.js        # Wizards M01–M10, KPIs, iniciativas
│       ├── Aprobador-Panel.js        # Revisión, aprobación, reportes, alertas
│       ├── dafoController.js         # Controlador del análisis FODA
│       ├── pestController.js         # Controlador del análisis PEST
│       ├── porterController.js       # Controlador de las 5 Fuerzas de Porter
│       └── bcgService.js             # Servicio de cálculo de Matriz BCG
├── supabase/
│   └── functions/
│       └── create-user/              # Edge Function para creación de usuarios
├── scripts/
│   ├── migrar-data.js                # Migración data.json → Supabase
│   └── migrar-data.ps1               # Script PowerShell helper
├── supabase_migration_*.sql          # Migraciones de esquema Supabase (20 tablas)
├── supabase_schema_completo.sql      # Esquema completo de la base de datos
├── vercel.json                       # Configuración de despliegue Vercel
├── .env.example                      # Variables de entorno de ejemplo
└── README_DB.md                      # Documentación detallada de la BD
```

---

## Base de Datos

El sistema cuenta con **20 tablas** en PostgreSQL con Row Level Security (RLS). Ver `README_DB.md` para el detalle completo de esquema, columnas y relaciones.

**Tablas principales:**
- `planes` — Plan estratégico (ciclo: borrador → en_revision → activo/cerrado/rechazado)
- `usuarios` — Usuarios autenticados vía Supabase Auth (5 roles: administrador, estratega, aprobador, lider, operativo)
- `empresa` / `empresa_contenido` — Datos corporativos (nombre, sector, misión, visión, valores)
- `empresa_historial` — Trazabilidad de cambios en misión, visión y valores
- `modulos` — Catálogo de módulos M01–M10
- `plan_contenido` — Contenido JSONB de cada módulo por plan (clave compuesta plan_id + modulo_id)
- `objetivos_generales` / `objetivos_especificos` — Objetivos jerárquicos con cascada
- `foda` / `came` — Análisis estratégico FODA y CAME
- `fuentes_analisis` — Catálogo de fuentes para items FODA
- `estrategia_plan` — Estrategia seleccionada (ofensiva, defensiva, reorientacion, supervivencia)
- `kpis` — Indicadores clave con meta, valor actual, frecuencia e historial JSONB
- `iniciativas` / `proyectos` / `tareas` — Ejecución operativa del plan
- `alertas` — Notificaciones del sistema (KPIs, proyectos, escaladas)
- `reportes_generados` / `reportes_lectura` — Trazabilidad de generación y lectura de reportes
- `auditoria` — Log de auditoría con detalle de todas las acciones del sistema
- `m01_bloqueo_edicion` — Control de concurrencia para edición de M01

---

## Configuración y Despliegue

### 1. Prerrequisitos

- Node.js 18+
- Cuenta en [Supabase](https://supabase.com)
- Cuenta en [Vercel](https://vercel.com)

### 2. Configurar Supabase

```bash
git clone <repo>
cd PETI_UNIT_SISTEM_V2
```

1. Crear un proyecto en [supabase.com](https://supabase.com)
2. Ejecutar los scripts SQL de migración en orden:
   - `supabase_migration_m01_global.sql`
   - `supabase_migration_cadena_valor_foda.sql`
   - `supabase_migration_aprobador.sql`
   - `supabase_schema_completo.sql` (esquema completo)
3. Copiar `.env.example` a `.env` y completar credenciales
4. Actualizar `public/js/config.js` con la URL y Anon Key del proyecto

### 3. Configurar Autenticación

En el panel de Supabase > Authentication > Settings:
- Deshabilitar "Confirm email" (para entornos de desarrollo)
- Configurar URL del sitio según el dominio de despliegue

### 4. Despliegue en Vercel

```bash
npm i -g vercel
vercel --prod
```

El proyecto se despliega como sitio estático. Las cabeceras de caché se configuran en `vercel.json` para optimizar la carga de assets CSS/JS.

### 5. Migración de datos existentes (opcional)

```bash
node scripts/migrar-data.js
```

Migra datos desde un archivo `data.json` (formato legado) a las tablas de Supabase. Ejecuta la migración de usuarios, empresa, contenido corporativo, planes, objetivos, KPIs, FODA, CAME, Porter, PEST, auditoría y alertas.

---

## Características Técnicas Destacadas

- **Sin framework frontend:** JavaScript vanilla con arquitectura modular, sin dependencias pesadas
- **Bloqueo de concurrencia:** Los módulos M01 y M06 (BCG) implementan bloqueo en base de datos para evitar que dos estrategas editen simultáneamente
- **Trazabilidad completa:** Cada modificación a misión/visión/valores queda registrada en `empresa_historial` con quién, cuándo y qué cambió
- **Auditoría integral:** Todas las acciones (CREAR, ACTUALIZAR, ELIMINAR, EXPORTAR) se registran con timestamp, usuario y detalle
- **Dashboard en tiempo real:** Cada panel muestra métricas actualizadas (usuarios activos, planes por estado, últimas actividades)
- **Exportación de reportes:** CSV y PDF desde el panel de administración y aprobador
- **Alertas automáticas:** Detección de planes vencidos y notificaciones al aprobador
- **Modo actualización:** Los módulos permiten recalcularse sin perder el historial de versiones anteriores

---

## Licencia

PETI_UNIT_SISTEM — ContaPerú S.A.C.
