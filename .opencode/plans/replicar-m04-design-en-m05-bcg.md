# Plan: Replicar diseño premium de Cadena de Valor (M04) en Matriz BCG (M05)

## Objetivo
Tomar el diseño visual y de navegación de M04 (stepper, wizard con tarjeta, resultados premium, botonera) y aplicarlo a M05, manteniendo el contenido único de BCG (UENs, ventas, crecimiento, competencia, matriz de burbujas).

---

## Archivos a modificar

| Archivo | Cambios |
|---------|---------|
| `public/css/Estratega-Panel.css` | + BCG summary cards, + BCG progress bar, + stepper reuse tweaks |
| `public/html/Estratega-Panel.html` | + BCG stepper, + premium cards, + wizard footer nav, + summary cards, + cancel modal |
| `public/js/Estratega-Panel.js` | + New BCG state, + stepper render, + navigation (Anterior/Siguiente/Cancelar), + historial, + refactor load/render/results |
| `public/js/bcgService.js` | Sin cambios (lógica de negocio intacta) |

---

## 1. CSS (`Estratega-Panel.css`)

### 1.1 Agregar después de la línea 2655 (antes del responsive BCG)

```css
/* --- BCG Summary Cards (like M04) --- */
.bcg-resumen-cards-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.25rem;
  margin-bottom: 2rem;
}

/* --- BCG wizard block adjustments --- */
#m05 .bloque-card-premium {
  margin-bottom: 1.5rem;
}

#m05 .bloque-card-header h2 {
  font-size: 0.9rem;
}

/* --- BCG step progress bar --- */
#m05 .bloque-progress-bar {
  display: flex !important;
  align-items: center;
  gap: 0.5rem;
}

#m05 .bloque-progress-bar .bar-track {
  width: 100px;
  height: 6px;
  background: #f1f5f9;
  border-radius: 3px;
  overflow: hidden;
}

#m05 .bloque-progress-bar .bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #2563eb, #3b82f6);
  border-radius: 3px;
  transition: width 0.4s ease;
}

#m05 .bloque-progress-bar .bar-label {
  font-size: 0.78rem;
  font-weight: 700;
  color: #64748b;
  white-space: nowrap;
}

#m05 .bloque-card-footer .puntaje-acumulado-col {
  font-size: 0.85rem;
}
```

#### 1.2 Responsive (dentro del @media existente o nuevo)
```css
@media (max-width: 1024px) {
  .bcg-resumen-cards-grid {
    grid-template-columns: 1fr 1fr;
  }
}
@media (max-width: 768px) {
  .bcg-resumen-cards-grid {
    grid-template-columns: 1fr;
  }
}
```

---

## 2. HTML (`Estratega-Panel.html`) — Sección M05 (líneas 511-656)

### 2.1 Stepper BCG (reemplazar `.bcg-tabs`)

Después del tip banner (`m05TipBanner`) y antes del wizard container, agregar stepper con 3 pasos similar al de M04:

```html
<!-- STEPPER BCG -->
<div class="wizard-stepper-container">
  <div class="wizard-stepper" id="bcgStepper">
    <div class="stepper-progress-line" id="bcgStepperProgressLine"></div>
    <div class="stepper-step active" data-step="1">
      <div class="stepper-circle">1</div>
      <span class="stepper-step-label">Portafolio</span>
    </div>
    <div class="stepper-step locked" data-step="2">
      <div class="stepper-circle">2</div>
      <span class="stepper-step-label">Mercado</span>
    </div>
    <div class="stepper-step locked" data-step="3">
      <div class="stepper-circle">3</div>
      <span class="stepper-step-label">Competencia</span>
    </div>
  </div>
  <div class="stepper-current-label" id="bcgStepperCurrentLabel">
    <i class="bi bi-arrow-right-circle-fill"></i> Paso 1 de 3: Portafolio y Ventas
  </div>
</div>
```

### 2.2 Wizard Container — Envolver panels en `.bloque-card-premium`

Actualizar `#m05WizardContainer`: mantener los 3 `.bcg-panel` pero ahora dentro de un `.bloque-card-premium` con header y footer:

```html
<div id="m05WizardContainer">
  <!-- Tip banner (se mantiene) -->
  <div class="m05-tip-banner" id="m05TipBanner">...</div>
  
  <!-- Stepper (nuevo, ver 2.1) -->
  <div class="wizard-stepper-container">...</div>

  <!-- Bloque card premium -->
  <div class="bloque-card-premium">
    <div class="bloque-card-header">
      <h2 id="bcgBloqueTitulo"><span class="bloque-icon"><i class="bi bi-graph-up"></i></span> PORTAFOLIO Y VENTAS — PASO 1</h2>
      <div class="bloque-progress-bar" id="bcgBloqueProgressBar">
        <div class="bar-track"><div class="bar-fill" id="bcgBloqueBarFill" style="width: 0%"></div></div>
        <span class="bar-label" id="bcgBloqueBarLabel">0/5</span>
      </div>
    </div>
    
    <div class="bcg-tab-content">
      <!-- Paso 1 -->
      <div class="bcg-panel active" id="bcgPanel1">...</div>
      <!-- Paso 2 -->
      <div class="bcg-panel" id="bcgPanel2">...</div>
      <!-- Paso 3 -->
      <div class="bcg-panel" id="bcgPanel3">...</div>
    </div>
    
    <div class="bloque-card-footer">
      <div class="puntaje-acumulado-col">
        UENs registradas: <strong id="bcgUensCount">0</strong> / 5
      </div>
    </div>
  </div>

  <!-- Footer de navegación (reemplaza bcg-wizard-footer) -->
  <div class="wizard-footer-nav">
    <button id="bcgCancelBtn" class="btn-secondary" style="display:none;">
      Cancelar actualización
    </button>
    <button id="bcgPrevBtn" class="btn-secondary" disabled>
      <i class="bi bi-arrow-left"></i> Anterior
    </button>
    <button id="bcgNextBtn" class="btn-primary" disabled>
      Siguiente bloque <i class="bi bi-arrow-right"></i>
    </button>
  </div>
</div>
```

### 2.3 Results Container — Agregar summary cards

Antes del `.bcg-dashboard-grid`, agregar 3 summary cards:

```html
<div class="bcg-resumen-cards-grid">
  <div class="resumen-card-premium">
    <span class="card-label">UENs Analizadas</span>
    <div class="puntaje-total-premium" id="bcgResultUensCount">5</div>
    <p class="card-subtext">Unidades estratégicas evaluadas</p>
  </div>
  <div class="resumen-card-premium">
    <span class="card-label">Cuadrante Dominante</span>
    <div class="clasificacion-total-premium" id="bcgResultCuadranteDominante">—</div>
    <p class="card-subtext" id="bcgResultCuadranteTexto">Cuadrante con mayor presencia</p>
  </div>
  <div class="resumen-card-premium">
    <span class="card-label">Cobertura de Mercado</span>
    <div class="potencial-total-premium" id="bcgResultCobertura">0%</div>
    <p class="card-subtext" id="bcgResultCoberturaTexto">Participación estimada del portafolio</p>
  </div>
</div>
```

### 2.4 Botón "Actualizar matriz BCG" (reemplazar `m05RecalcularBtn`)

```html
<button class="btn-actualizar-cadena" id="btnBackToBCG" style="display:none;">
  <i class="bi bi-arrow-repeat"></i> Actualizar matriz BCG
</button>
```

### 2.5 Modal de confirmación cancelar BCG

Agregar modal similar a `m04CancelConfirmModal` pero para BCG:

```html
<div id="bcgCancelConfirmModal" class="m01-modal" style="display: none;">
  <div class="m01-modal-content">
    <div class="m01-modal-header" style="border-bottom-color: #f1f5f9;">
      <h3 style="color: #92400e; display: flex; align-items: center; gap: 0.5rem; margin: 0; font-size: 1.1rem;">
        <i class="bi bi-exclamation-triangle-fill" style="color: #d97706;"></i> ¿Cancelar actualización?
      </h3>
      <button type="button" class="m01-modal-close" id="bcgCancelCloseBtn"><i class="bi bi-x-lg"></i></button>
    </div>
    <div class="m01-modal-body" style="padding: 1.5rem;">
      <p style="color: #475569; line-height: 1.6; margin: 0; font-size: 0.92rem;">
        ¿Está seguro de salir? Los datos no se guardarán ya que no finalizó el análisis BCG.
      </p>
    </div>
    <div class="m01-modal-footer">
      <button type="button" class="btn-secondary" onclick="document.getElementById('bcgCancelConfirmModal').style.display='none'">Volver al análisis</button>
      <button type="button" class="btn-primary" id="bcgCancelConfirmBtn" style="background-color: #dc2626; border-color: #dc2626; color: white;">Sí, cancelar</button>
    </div>
  </div>
</div>
```

---

## 3. JS (`Estratega-Panel.js`)

### 3.1 Nuevas variables de estado (después de línea 73)

```javascript
let bcgCompletadoPreviamente = false;
let bcgModoActualizacion = false;
```

### 3.2 Nueva función `renderBcgStepper()`

```javascript
function renderBcgStepper() {
  const steps = document.querySelectorAll('#bcgStepper .stepper-step');
  const labels = ['Portafolio y Ventas', 'Crecimiento Mercado', 'Competencia Directa'];

  // Determinar qué pasos están completos
  const pasosCompletos = [false, false, false, false];
  for (let s = 1; s <= 3; s++) {
    const isComplete = bcgStepIsComplete(s);
    pasosCompletos[s] = isComplete;
  }

  steps.forEach(stepEl => {
    const step = parseInt(stepEl.getAttribute('data-step'));
    stepEl.classList.remove('active', 'completed', 'locked');

    // Verificar si pasos anteriores están completos
    let unlocked = true;
    for (let prev = 1; prev < step; prev++) {
      if (!pasosCompletos[prev]) {
        unlocked = false;
        break;
      }
    }

    if (step === currentBcgStep) {
      stepEl.classList.add('active');
    } else if (pasosCompletos[step]) {
      stepEl.classList.add('completed');
    } else if (unlocked) {
      // Disponible pero no completado
    } else {
      stepEl.classList.add('locked');
    }
  });

  // Línea de progreso
  const progressLine = document.getElementById('bcgStepperProgressLine');
  if (progressLine) {
    let completed = 0;
    for (let s = 1; s <= 3; s++) if (pasosCompletos[s]) completed++;
    progressLine.style.width = Math.min((completed / 2) * 100, 100) + '%';
  }

  // Etiqueta del paso actual
  const labelEl = document.getElementById('bcgStepperCurrentLabel');
  if (labelEl) {
    labelEl.innerHTML = `<i class="bi bi-arrow-right-circle-fill"></i> Paso ${currentBcgStep} de 3: ${labels[currentBcgStep - 1]}`;
  }
}
```

### 3.3 Nueva función `bcgStepIsComplete(step)`

```javascript
function bcgStepIsComplete(step) {
  if (!bcgUensData || bcgUensData.length === 0) return false;
  
  if (step === 1) {
    return bcgUensData.every(u => u.ventas_empresa && parseFloat(u.ventas_empresa) > 0);
  } else if (step === 2) {
    return bcgUensData.every(u => u.ventas_mercado_anterior && parseFloat(u.ventas_mercado_anterior) > 0
      && u.ventas_mercado_actual && parseFloat(u.ventas_mercado_actual) > 0);
  } else if (step === 3) {
    return bcgUensData.every(u => u.nombre_competidor_lider && u.nombre_competidor_lider.trim()
      && u.ventas_competidor_lider && parseFloat(u.ventas_competidor_lider) > 0);
  }
  return false;
}
```

### 3.4 Nueva función `renderBcgBlock()`

```javascript
function renderBcgBlock() {
  document.getElementById('m05ResultsContainer').style.display = 'none';
  document.getElementById('m05WizardContainer').style.display = 'block';

  // Cancel button visibility
  const cancelBtn = document.getElementById('bcgCancelBtn');
  if (cancelBtn) cancelBtn.style.display = bcgModoActualizacion ? '' : 'none';

  // Only show current panel
  document.querySelectorAll('.bcg-panel').forEach(p => p.classList.remove('active'));
  document.getElementById(`bcgPanel${currentBcgStep}`).classList.add('active');

  // Tip text
  const tipText = document.getElementById('m05TipText');
  if (tipText) {
    const tips = [
      'Ingrese los ingresos por ventas anuales de cada servicio de ContaPerú para determinar el peso de la UEN.',
      'Ingrese las ventas anuales globales del mercado para determinar el crecimiento del mercado (Eje Y).',
      'Registre el nombre y las ventas anuales del rival más fuerte de cada servicio para evaluar la cuota relativa (Eje X).'
    ];
    tipText.innerText = tips[currentBcgStep - 1];
  }

  // Block title
  const blockTitles = [
    'PORTAFOLIO Y VENTAS — PASO 1',
    'CRECIMIENTO DE MERCADO — PASO 2',
    'COMPETENCIA DIRECTA — PASO 3'
  ];
  const tituloEl = document.getElementById('bcgBloqueTitulo');
  if (tituloEl) tituloEl.innerText = blockTitles[currentBcgStep - 1];

  // Progress bar: count completed rows
  let totalFields = 0;
  let completedFields = 0;
  if (currentBcgStep === 1) {
    bcgUensData.forEach(u => {
      totalFields++;
      if (u.ventas_empresa && parseFloat(u.ventas_empresa) > 0) completedFields++;
    });
  } else if (currentBcgStep === 2) {
    bcgUensData.forEach(u => {
      totalFields += 2;
      if (u.ventas_mercado_anterior && parseFloat(u.ventas_mercado_anterior) > 0) completedFields++;
      if (u.ventas_mercado_actual && parseFloat(u.ventas_mercado_actual) > 0) completedFields++;
    });
  } else {
    bcgUensData.forEach(u => {
      totalFields += 2;
      if (u.nombre_competidor_lider && u.nombre_competidor_lider.trim()) completedFields++;
      if (u.ventas_competidor_lider && parseFloat(u.ventas_competidor_lider) > 0) completedFields++;
    });
  }
  const barFill = document.getElementById('bcgBloqueBarFill');
  const barLabel = document.getElementById('bcgBloqueBarLabel');
  if (barFill) barFill.style.width = totalFields > 0 ? `${(completedFields / totalFields) * 100}%` : '0%';
  if (barLabel) barLabel.innerText = `${completedFields}/${totalFields}`;

  // UENs count in card footer
  const uensCountEl = document.getElementById('bcgUensCount');
  if (uensCountEl) uensCountEl.innerText = bcgUensData.length;

  // Navigation buttons
  const prevBtn = document.getElementById('bcgPrevBtn');
  const nextBtn = document.getElementById('bcgNextBtn');
  if (prevBtn) prevBtn.disabled = (currentBcgStep === 1);
  
  const stepComplete = bcgStepIsComplete(currentBcgStep);
  if (nextBtn) {
    nextBtn.disabled = !stepComplete;
    if (currentBcgStep === 3 && stepComplete) {
      nextBtn.innerHTML = 'Generar Matriz BCG <i class="bi bi-bar-chart-fill"></i>';
      nextBtn.classList.remove('btn-primary');
      nextBtn.classList.add('btn-primary-solid');
    } else {
      nextBtn.innerHTML = 'Siguiente bloque <i class="bi bi-arrow-right"></i>';
      nextBtn.classList.remove('btn-primary-solid');
      nextBtn.classList.add('btn-primary');
    }
  }
}
```

### 3.5 Navegación

```javascript
function navegarBcgAnterior() {
  if (currentBcgStep > 1) {
    recolectarDatosWizardBCG();
    currentBcgStep--;
    renderBcgStepper();
    renderBcgBlock();
  }
}

async function navegarBcgSiguiente() {
  recolectarDatosWizardBCG();
  if (!bcgStepIsComplete(currentBcgStep)) {
    showToast('Complete todos los campos requeridos del paso actual antes de continuar.', 'error');
    return;
  }
  if (currentBcgStep < 3) {
    currentBcgStep++;
    renderBcgStepper();
    renderBcgBlock();
  } else {
    await ejecutarMatrizBCG();
  }
}
```

### 3.6 Modificar `ejecutarMatrizBCG()` 

Cambios clave:
- Reemplazar `alert()` por `showToast()`
- Agregar `guardarSnapshotHistorialBCG()` antes de sobrescribir
- Agregar `guardarHistorialBCG()` después de guardar
- Agregar auditoria con accion CREAR/ACTUALIZAR
- Llamar a `cargarBCG()` al final

```javascript
async function ejecutarMatrizBCG() {
  recolectarDatosWizardBCG();

  // Validaciones...
  let errorMsg = '';
  for (let i = 0; i < bcgUensData.length; i++) {
    const uen = bcgUensData[i];
    if (!uen.ventas_empresa || uen.ventas_empresa <= 0) {
      errorMsg = `Ventas Empresa para "${uen.nombre}" debe ser > 0.`; break;
    }
    // ... mismas validaciones ...
  }
  if (errorMsg) {
    const modal = document.getElementById('m05WarningModal');
    const warningText = document.getElementById('m05WarningText');
    if (modal && warningText) { warningText.innerText = errorMsg; modal.style.display = 'flex'; }
    return;
  }

  // Guardar snapshot historial si hay datos previos
  if (bcgCompletadoPreviamente) {
    await guardarSnapshotHistorialBCG();
  }

  const resultadosCalculados = BCGService.procesarMatriz(bcgUensData);

  const { error } = await supabaseClient.from('matriz_bcg').upsert({
    plan_id: currentPlanId,
    usuario_id: currentUser.user_id,
    estado: 'procesado',
    datos_uen: resultadosCalculados,
    bloqueado_por: null,
    bloqueado_por_nombre: null,
    bloqueado_desde: null
  }, { onConflict: 'plan_id' });

  if (error) {
    showToast('Error al generar Matriz BCG: ' + error.message, 'error');
    return;
  }

  // Guardar en plan_contenido
  try {
    await supabaseClient.from('plan_contenido').upsert({
      plan_id: currentPlanId,
      modulo_id: 'M05',
      contenido: resultadosCalculados,
      completado: true,
      completado_fecha: new Date()
    }, { onConflict: 'plan_id, modulo_id' });
  } catch (err) {
    console.error('Error al guardar plan_contenido M05:', err);
  }

  // Guardar historial del nuevo estado
  await guardarHistorialBCG(resultadosCalculados, bcgCompletadoPreviamente ? 'actualizacion' : 'creacion');

  // Auditoria
  try {
    await supabaseClient.from('auditoria').insert({
      usuario_id: currentUser.user_id,
      modulo: 'M05',
      accion: bcgCompletadoPreviamente ? 'ACTUALIZAR' : 'CREAR',
      detalle: `Se ${bcgCompletadoPreviamente ? 'actualizó' : 'generó'} la Matriz BCG. UENs analizadas: ${bcgUensData.length}.`
    });
  } catch (err) {
    console.error('Error al guardar auditoría:', err);
  }

  showToast(
    bcgCompletadoPreviamente
      ? 'Matriz BCG actualizada correctamente.'
      : 'Matriz BCG generada correctamente.',
    'success'
  );

  await cargarBCG();
  await cargarDashboard();
  await cargarDatosPlan();
}
```

### 3.7 Funciones de historial

```javascript
async function guardarSnapshotHistorialBCG() {
  try {
    const { data } = await supabaseClient
      .from('matriz_bcg')
      .select('datos_uen')
      .eq('plan_id', currentPlanId)
      .single();
    if (data?.datos_uen) {
      await supabaseClient.from('auditoria').insert({
        usuario_id: currentUser.user_id,
        modulo: 'M05',
        accion: 'HISTORIAL',
        detalle: JSON.stringify(data.datos_uen)
      });
    }
  } catch (err) {
    console.error('Error al guardar snapshot historial BCG:', err);
  }
}

async function guardarHistorialBCG(contenido, tipo) {
  try {
    await supabaseClient.from('auditoria').insert({
      usuario_id: currentUser.user_id,
      modulo: 'M05',
      accion: 'HISTORIAL',
      detalle: JSON.stringify({
        plan_id: currentPlanId,
        tipo: tipo,
        fecha: new Date().toISOString(),
        contenido: contenido
      })
    });
  } catch (err) {
    console.error('Error al guardar historial BCG:', err);
  }
}
```

### 3.8 Modificar `cargarBCG()` — resultados-first

En la parte donde se evalúa `data.estado === 'procesado'`:
1. Agregar `bcgCompletadoPreviamente = true;`
2. Renderizar stepper
3. Mostrar resultados

En la parte de "Vacío":
1. Inicializar datos
2. Renderizar stepper
3. Llamar `renderBcgBlock()`

### 3.9 Modificar `mostrarResultadosBCG()` (reemplazar lógica actual `cargarBCG` results block)

Renombrar la parte de renderizado de resultados a una función `mostrarResultadosBCG()`:
- Ocultar wizard, mostrar results
- Renderizar summary cards
- Renderizar chart
- Renderizar conclusiones
- Botón "Actualizar matriz BCG"

### 3.10 Event listeners (actualizar `setupEventListeners()`)

Reemplazar:
```javascript
// OLD:
// bcgRecalcularBtn -> abre modal
// bcgConfirmRecalcularBtn -> iniciarRecalculoBCG
// bcgResetBtn -> reiniciarValoresBCG
// bcgDraftBtn -> guardarBorradorBCG
// bcgExecuteBtn -> ejecutarMatrizBCG
// .bcg-tab click -> cambia paso

// NEW:
// bcgPrevBtn -> navegarBcgAnterior
// bcgNextBtn -> navegarBcgSiguiente
// bcgCancelBtn -> mostrar modal confirmacion
// btnBackToBCG -> reiniciar wizard en modo actualizacion
// bcgCancelConfirmBtn -> confirmar cancelacion
// bcgCancelCloseBtn -> cerrar modal
```

---

## 4. Resumen de flujos

### 4.1 Sin datos guardados
1. Navega a M05 → `cargarBCG()` 
2. No hay datos → inicializa UENs por defecto
3. `renderBcgStepper()` (paso 1 activo)
4. `renderBcgBlock()` (Panel 1 visible, Anterior disabled, Siguiente disabled hasta completar)
5. Usuario completa paso 1 → Siguiente se habilita
6. Paso 2 → igual, Paso 3 → igual
7. Paso 3 completo → botón cambia a "Generar Matriz BCG" (azul sólido)
8. Click → `ejecutarMatrizBCG()` → guarda + historial + auditoría → muestra resultados

### 4.2 Con datos guardados
1. Navega a M05 → `cargarBCG()`
2. `bcgCompletadoPreviamente = true`
3. `mostrarResultadosBCG()`: 3 summary cards + chart + conclusiones + "Actualizar matriz BCG"
4. Click "Actualizar" → limpia estado de procesado → `bcgModoActualizacion = true`
5. Stepper + wizard con Cancelar visible
6. Cancelar → modal confirm → vuelve a resultados

---

## Notas
- No se modifica `bcgService.js` — la lógica BCG sigue igual
- Las clases `.wizard-stepper-container`, `.stepper-step`, `.stepper-circle`, `.stepper-progress-line`, `.bloque-card-premium`, `.wizard-footer-nav`, `.btn-primary-solid`, `.btn-actualizar-cadena`, `.resumen-card-premium` se **reutilizan** de M04 (ya existen)
- Las tablas BCG (`.bcg-wizard-table`, `.bcg-summary-table`) se mantienen sin cambios
- `recolectarDatosWizardBCG()`, `calcularPesosBCG()`, `reiniciarValoresBCG()`, `guardarBorradorBCG()` se mantienen funcionales

---

## Archivos listos para ejecutar
Solicitar cambiar a modo ejecución para aplicar los cambios descritos.
