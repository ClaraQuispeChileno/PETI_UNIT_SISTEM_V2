// ==================== CONFIGURACIÓN DE SUPABASE ====================
const SUPABASE_URL = 'https://ssdphnukjtjqageqfyeu.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_eb5lIWekDOh8Osk9IGydGA_Jw1MktBZ';
let supabaseClient;
let currentPlanId = null;
let currentUser = null;
let isEditable = false;

// ==================== PREGUNTAS PARA CADENA DE VALOR (M04) ====================
const preguntasCadenaValor = [
  // BLOQUE 1 — Infraestructura y gestión
  { num: 1, bloque: "Infraestructura y gestión", enunciado: "La empresa dispone de un sistema de información y control de gestión contable eficiente y eficaz." },
  { num: 2, bloque: "Infraestructura y gestión", enunciado: "La empresa siempre trabaja conforme a una estrategia corporativa y objetivos claros de corto, medio y largo plazo." },
  { num: 3, bloque: "Infraestructura y gestión", enunciado: "La empresa tiene optimizada su gestión de costos y el control financiero de sus operaciones contables." },
  { num: 4, bloque: "Infraestructura y gestión", enunciado: "La gestión de tesorería y el circulante están plenamente optimizados en las actividades diarias de la firma." },
  { num: 5, bloque: "Infraestructura y gestión", enunciado: "La excelencia y estandarización de los procedimientos contables son una fuente clave de ventaja competitiva." },

  // BLOQUE 2 — Recursos humanos
  { num: 6, bloque: "Recursos humanos", enunciado: "Los colaboradores son valorados y considerados el activo estratégico principal de la organización." },
  { num: 7, bloque: "Recursos humanos", enunciado: "Se dispone de una plantilla altamente motivada que conoce y se compromete activamente con las metas del PETI." },
  { num: 8, bloque: "Recursos humanos", enunciado: "El personal de la empresa está altamente capacitado y en constante actualización profesional sobre normativas tributarias." },
  { num: 9, bloque: "Recursos humanos", enunciado: "Se fomenta activamente el trabajo colaborativo en equipo y el desarrollo de competencias interpersonales en todos los niveles." },
  { num: 10, bloque: "Recursos humanos", enunciado: "Existen incentivos claros y planes de desarrollo profesional que ayudan a retener el talento estratégico clave." },

  // BLOQUE 3 — Desarrollo tecnológico
  { num: 11, bloque: "Desarrollo tecnológico", enunciado: "La empresa emplea las plataformas de software y bases de datos más avanzadas y seguras del sector de auditoría." },
  { num: 12, bloque: "Desarrollo tecnológico", enunciado: "La infraestructura física y los servidores cloud están preparados para escalar y competir en el mediano y largo plazo." },
  { num: 13, bloque: "Desarrollo tecnológico", enunciado: "La empresa es un referente en la investigación, adopción y desarrollo de innovaciones tecnológicas del sector." },
  { num: 14, bloque: "Desarrollo tecnológico", enunciado: "Los servicios prestados incorporan tecnologías y automatizaciones de procesamiento complejas difíciles de imitar." },
  { num: 15, bloque: "Desarrollo tecnológico", enunciado: "La informatización y automatización de procesos internos es una fuente de ventaja competitiva clara frente a competidores." },

  // BLOQUE 4 — Aprovisionamiento
  { num: 16, bloque: "Aprovisionamiento", enunciado: "La empresa gestiona con eficiencia la compra y licenciamiento de software y herramientas contables especializadas." },
  { num: 17, bloque: "Aprovisionamiento", enunciado: "La selección de proveedores de tecnología crítica (cloud, ciberseguridad) se realiza bajo estándares estrictos de costo-beneficio." },
  { num: 18, bloque: "Aprovisionamiento", enunciado: "Se cuenta con contratos de soporte técnico confiables que garantizan la continuidad de las operaciones del negocio." },
  { num: 19, bloque: "Aprovisionamiento", enunciado: "Se realiza una gestión y compra óptima de los insumos materiales, hardware de oficina y suministros." },
  { num: 20, bloque: "Aprovisionamiento", enunciado: "La página web y canales digitales se emplean eficientemente para cooperar con proveedores clave y redes de contacto contable." },

  // BLOQUE 5 — Actividades primarias
  { num: 21, bloque: "Actividades primarias", enunciado: "La digitalización, recepción y archivo contable de la documentación del cliente está totalmente optimizada." },
  { num: 22, bloque: "Actividades primarias", enunciado: "La elaboración de informes de auditoría y estados financieros sigue un estándar riguroso con cero defectos." },
  { num: 23, bloque: "Actividades primarias", enunciado: "La empresa dispone y ejecuta un plan estructurado de marketing contable y captación de clientes de forma regular." },
  { num: 24, bloque: "Actividades primarias", enunciado: "Nuestra fuerza de ventas corporativa y estrategias comerciales son una ventaja competitiva diferencial en Lima." },
  { num: 25, bloque: "Actividades primarias", enunciado: "El servicio posventa y la atención al cliente fidelizan e incrementan significativamente el ciclo de vida de la cartera." }
];

// Estado del Wizard Cadena de Valor (M04)
let currentStepM04 = 1; // Paso actual (Bloque 1 a 5)
let respuestasM04 = {}; // Almacena respuestas locales { item_num: puntaje }
let chartRadarM04 = null; // Instancia de gráfico Chart.js
let m04CompletadoPreviamente = false; // Si ya se completó el diagnóstico antes
let m04ModoActualizacion = false; // Si estamos en modo actualización (vs nuevo)

// Estado del Wizard Identidad Corporativa (M01)
let currentStepM01 = 1;
let misionM01 = '';
let visionM01 = '';
let valoresM01 = []; // [{ titulo, descripcion }]
let activeEditValorIndex = null; // Para edición de valor corporativo o null si es nuevo

// Estado de la Matriz BCG (M05)
let activeBcgId = null;
let currentBcgStep = 1;
let bcgUensData = [];
let bcgOriginalData = null;
let bcgChartInstance = null;
let bcgLockUser = null;
let bcgCompletadoPreviamente = false;
let bcgModoActualizacion = false;
const defaultBcgUens = [
  "Auditoría de TI",
  "Contabilidad en la Nube",
  "Asesoría Tributaria",
  "Consultoría de Ciberseguridad",
  "Outsourcing Contable"
];



// ==================== INICIALIZACIÓN ====================
document.addEventListener('DOMContentLoaded', async () => {
  console.log('Inicializando panel del estratega...');
  try {
    if (typeof window.supabase !== 'undefined' && window.supabase.createClient) {
      supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } else {
      throw new Error('window.supabase no disponible');
    }
  } catch (e) {
    console.error('Error al crear Supabase client:', e);
  }
  const session = localStorage.getItem('peti_session');
  if (!session) {
    console.error('No hay sesión, redirigiendo al login');
    window.location.href = '../index.html';
    return;
  }
  currentUser = JSON.parse(session);
  console.log('Usuario actual:', currentUser);
  if (currentUser.role !== 'estratega') {
    alert('No tienes permiso para acceder a este panel.');
    window.location.href = '../index.html';
    return;
  }
  document.getElementById('userNameDisplay').innerText = currentUser.username;
  document.getElementById('currentDate').innerText = `Último acceso: ${new Date().toLocaleString()}`;

  await cargarPlanes();
  setupNavigation();
  setupEventListeners();
  await actualizarBadgeNotificaciones();

  document.getElementById('logoutBtn').addEventListener('click', () => {
    document.getElementById('confirmarLogoutModal').style.display = 'flex';
  });

  window.confirmarLogout = async function() {
    document.getElementById('confirmarLogoutModal').style.display = 'none';
    await liberarBloqueoM01();
    await liberarBloqueoBCG();
    await supabaseClient.auth.signOut();
    localStorage.removeItem('peti_session');
    window.location.href = '../index.html';
  };

  // Liberar bloqueos al cerrar la página
  window.addEventListener('beforeunload', async () => {
    await liberarBloqueoM01();
    await liberarBloqueoBCG();
  });

  // Polling periódico para refrescar UI de lock M01 (cada 20s)
  setInterval(async () => {
    const m01Section = document.getElementById('m01');
    if (m01Section && m01Section.classList.contains('active-section')) {
      await actualizarM01LockUI();
    }
  }, 20000);

  // Verificar planes vencidos cada 5 minutos
  setInterval(verificarPlanesVencidos, 5 * 60 * 1000);
});

// ==================== CARGAR PLANES ====================
function showToast(message, type = 'info') {
  const existing = document.querySelector('.peti-toast');
  if (existing) existing.remove();

  const iconMap = { success: 'bi-check-circle-fill', error: 'bi-exclamation-triangle-fill', info: 'bi-info-circle-fill' };
  const toast = document.createElement('div');
  toast.className = `peti-toast toast-${type}`;
  toast.innerHTML = `<div class="toast-content"><i class="bi ${iconMap[type] || iconMap.info}"></i><span>${message}</span></div>`;
  document.body.appendChild(toast);

  if (!document.getElementById('toast-styles')) {
    const s = document.createElement('style'); s.id = 'toast-styles';
    s.textContent = `.peti-toast{position:fixed;bottom:2rem;left:50%;transform:translateX(-50%);background:#0f172a;border:1px solid #334155;border-radius:3rem;padding:0.7rem 1.5rem;z-index:2000;animation:slideUp 0.25s ease;box-shadow:0 10px 20px -5px rgba(0,0,0,0.3);}.toast-content{display:flex;align-items:center;gap:0.7rem;color:white;font-size:0.85rem;font-weight:500;}.toast-success i{color:#22c55e;}.toast-error i{color:#f97316;}.toast-info i{color:#3b82f6;}@keyframes slideUp{from{opacity:0;transform:translateX(-50%) translateY(20px);}to{opacity:1;transform:translateX(-50%) translateY(0);}}`;
    document.head.appendChild(s);
  }
  setTimeout(() => toast.remove(), 3500);
}

async function cargarPlanes() {
  console.log('Cargando planes...');
  const { data, error } = await supabaseClient.from('planes').select('*').order('anio', { ascending: false });
  if (error) {
    console.error('Error al cargar planes:', error);
    alert('Error al cargar los planes. Revisa la consola.');
    return;
  }
  console.log('Planes obtenidos:', data);
  const unicos = data.filter((p, i, arr) => arr.findIndex(x => x.id === p.id) === i);
  if (unicos.length !== data.length) console.warn('Se eliminaron planes duplicados');
  const select = document.getElementById('planSelector');
  if (!select) return;
  const estadoIcons = { borrador: '\u25CB', en_revision: '\u25C9', activo: '\u25CF', cerrado: '\u2297', rechazado: '\u2715' };
  const estadoLabels = { borrador:'Borrador', en_revision:'En Revisión', activo:'Activo', cerrado:'Cerrado', rechazado:'Rechazado' };
  select.innerHTML = unicos.map(p => {
    const icon = estadoIcons[p.estado] || '\u00B7';
    return `<option value="${p.id}" data-estado="${p.estado}">${icon} ${p.nombre} (${p.anio}) \u2014 ${estadoLabels[p.estado] || p.estado}</option>`;
  }).join('');
  select.addEventListener('change', async () => {
    currentPlanId = parseInt(select.value);
    const estado = select.options[select.selectedIndex].getAttribute('data-estado');
    isEditable = (estado === 'borrador' || estado === 'rechazado');
    console.log(`Plan cambiado a ${currentPlanId}, editable: ${isEditable}`);
    await cargarDatosPlan();
  });
  if (unicos.length) {
    currentPlanId = unicos[0].id;
    select.value = currentPlanId;
    isEditable = (unicos[0].estado === 'borrador' || unicos[0].estado === 'rechazado');
    console.log(`Plan inicial seleccionado: ${currentPlanId}, editable: ${isEditable}`);
    await cargarDatosPlan();
  } else {
    console.warn('No hay planes en la base de datos.');
  }
}

// ==================== CARGAR DATOS DEL PLAN ====================
async function cargarDatosPlan() {
  if (!currentPlanId) return;
  console.log(`Cargando datos completos para el plan ${currentPlanId}...`);
  await Promise.all([
    cargarEmpresa(),
    cargarM01(),
    cargarCadenaValor(),
    cargarObjetivos(),
    cargarKPIs(),
    cargarIniciativas(),
    cargarModulosJSON('m04', 'M04'),
    cargarBCG(),
    cargarModulosJSON('m06', 'M06'),
    cargarModulosJSON('m07', 'M07'),
    cargarModulosJSON('m08', 'M08'),
    cargarModulosJSON('m09', 'M09'),
    cargarEstadoPlan(),
    verificarPlanesVencidos()
  ]);
  toggleEditableUI();
  await cargarDashboard();
  console.log('Datos cargados correctamente.');
}

// ==================== EMPRESA (solo lectura) ====================
let cachedEmpresa = null;

async function cargarEmpresa() {
  if (cachedEmpresa) {
    renderEmpresa(cachedEmpresa);
    return;
  }
  const { data, error } = await supabaseClient.from('empresa').select('nombre, sector').eq('id', 1).single();
  if (error) { console.error('Error cargando empresa:', error); return; }
  if (data) {
    cachedEmpresa = data;
    renderEmpresa(data);
  }
}

function renderEmpresa(data) {
  document.getElementById('empresaNombre').value = data.nombre || '';
  document.getElementById('empresaSector').value = data.sector || '';
  
  const viewNombre = document.getElementById('m01ViewNombre');
  const viewSector = document.getElementById('m01ViewSector');
  if (viewNombre) viewNombre.innerText = data.nombre || '—';
  if (viewSector) viewSector.innerHTML = `<i class="bi bi-tag-fill"></i> ${data.sector || '—'}`;
  
  const infoNombre = document.getElementById('m01InfoNombre');
  const infoSector = document.getElementById('m01InfoSector');
  if (infoNombre) infoNombre.innerText = data.nombre || '—';
  if (infoSector) infoSector.innerText = data.sector || '—';
}

// ==================== M01: MISIÓN, VISIÓN, VALORES ====================
async function cargarM01() {
  console.log('Cargando M01 (Misión, Visión, Valores) desde tabla global...');

  let data;
  try {
    const res = await supabaseClient.from('empresa_contenido').select('*').eq('id', 1).single();
    data = res.data;
  } catch (_) { data = null; }

  misionM01 = data?.mision || '';
  visionM01 = data?.vision || '';

  // Parsear valores robustamente
  valoresM01 = [];
  if (Array.isArray(data?.valores)) {
    valoresM01 = data.valores.map(v => {
      if (typeof v === 'string') {
        const parts = v.split(':');
        if (parts.length > 1) {
          return { titulo: parts[0].trim(), descripcion: parts.slice(1).join(':').trim() };
        } else {
          return { titulo: v.trim(), descripcion: '' };
        }
      } else if (typeof v === 'object' && v !== null) {
        return { titulo: v.titulo || '', descripcion: v.descripcion || '' };
      }
      return null;
    }).filter(v => v !== null && v.titulo);
  }
  
  // Sincronizar inputs heredados ocultos
  document.getElementById('mision').value = misionM01;
  document.getElementById('vision').value = visionM01;
  document.getElementById('valores').value = valoresM01.map(v => `${v.titulo}: ${v.descripcion}`).join('\n');

  // Renderizar en la vista de lectura
  document.getElementById('m01ViewMision').innerText = misionM01 || 'No se ha registrado la misión de la empresa.';
  document.getElementById('m01ViewVision').innerText = visionM01 || 'No se ha registrado la visión de la empresa.';
  
  const viewValoresGrid = document.getElementById('m01ViewValoresGrid');
  if (viewValoresGrid) {
    viewValoresGrid.innerHTML = '';
    if (valoresM01.length === 0) {
      viewValoresGrid.innerHTML = `<div style="grid-column: span 2; text-align: center; color: #64748b; padding: 2rem; background: #f8fafc; border-radius: 0.75rem; border: 1px dashed #e2e8f0;">No se han registrado valores corporativos aún.</div>`;
    } else {
      valoresM01.forEach((v, idx) => {
        const card = document.createElement('div');
        card.className = 'm01-view-valor-card';
        card.innerHTML = `
          <div class="m01-view-valor-header">
            <div class="m01-view-valor-icon">${idx + 1}</div>
            <div class="m01-view-valor-title">${escapeHtml(v.titulo)}</div>
          </div>
          <div class="m01-view-valor-desc">${escapeHtml(v.descripcion || 'Sin descripción.')}</div>
        `;
        viewValoresGrid.appendChild(card);
      });
    }
  }

  // Por defecto, mostrar vista de lectura
  toggleM01View(false);

  // Refrescar UI de bloqueo concurrente
  await actualizarM01LockUI();
  
  // Actualizar estado del badge M01
  const badgeM01 = document.getElementById('m01EstadoBadge');
  if (badgeM01) {
    if (misionM01 && visionM01 && valoresM01.length > 0) {
      badgeM01.innerText = 'Completado';
      badgeM01.style.background = '#e2f0d9';
      badgeM01.style.color = '#385723';
      badgeM01.style.borderColor = '#a9d18e';
    } else {
      badgeM01.innerText = 'En progreso';
      badgeM01.style.background = '#eff6ff';
      badgeM01.style.color = '#1e40af';
      badgeM01.style.borderColor = '#bfdbfe';
    }
  }
}

function toggleM01View(editMode) {
  const viewContainer = document.getElementById('m01ViewContainer');
  const editContainer = document.getElementById('m01EditContainer');
  if (!viewContainer || !editContainer) return;
  if (editMode) {
    viewContainer.style.display = 'none';
    editContainer.style.display = 'block';
    currentStepM01 = 1;
    actualizarWizardM01();
  } else {
    viewContainer.style.display = 'block';
    editContainer.style.display = 'none';
  }
}

function actualizarWizardM01() {
  // Stepper
  const steps = document.querySelectorAll('#m01Stepper .m01-step');
  steps.forEach(stepEl => {
    const step = parseInt(stepEl.getAttribute('data-step'));
    stepEl.classList.remove('active', 'completed', 'locked');
    if (step === currentStepM01) {
      stepEl.classList.add('active');
    } else if (step < currentStepM01) {
      stepEl.classList.add('completed');
    } else {
      stepEl.classList.add('locked');
    }
  });

  // Linea de progreso del stepper
  const stepperLine = document.getElementById('m01StepperLine');
  if (stepperLine) {
    const progressPct = ((currentStepM01 - 1) / 2) * 100;
    stepperLine.style.background = `linear-gradient(to right, #2563eb ${progressPct}%, #e2e8f0 ${progressPct}%)`;
  }

  // Tip text
  const tipText = document.getElementById('m01TipText');
  if (tipText) {
    if (currentStepM01 === 1) {
      tipText.innerText = "La misión define el propósito central de la empresa, lo que hace en el día a día y a quién beneficia.";
    } else if (currentStepM01 === 2) {
      tipText.innerText = "La visión proyecta el futuro de la empresa a largo plazo, dónde quiere llegar y en qué se convertirá.";
    } else {
      tipText.innerText = "Los valores corporativos son las creencias y principios éticos que guían las acciones y decisiones de la organización.";
    }
  }

  // Cargar workspaces
  const workspaceWizard = document.getElementById('m01WorkspaceWizard');
  const workspaceValores = document.getElementById('m01WorkspaceValores');
  const activeTextarea = document.getElementById('m01ActiveTextarea');
  const rightHeader = document.getElementById('m01RightCardHeader');

  if (currentStepM01 === 1 || currentStepM01 === 2) {
    if (workspaceWizard) workspaceWizard.style.display = 'grid';
    if (workspaceValores) workspaceValores.style.display = 'none';
    
    if (currentStepM01 === 1) {
      if (rightHeader) rightHeader.innerText = "✎ MISIÓN — EDITANDO AHORA";
      if (activeTextarea) activeTextarea.value = misionM01;
    } else {
      if (rightHeader) rightHeader.innerText = "✎ VISIÓN — EDITANDO AHORA";
      if (activeTextarea) activeTextarea.value = visionM01;
    }
    
    // Forzar counter
    if (activeTextarea) {
      const len = activeTextarea.value.length;
      document.getElementById('m01CharCounter').innerText = `${len} / 500 caracteres`;
    }
  } else {
    if (workspaceWizard) workspaceWizard.style.display = 'none';
    if (workspaceValores) workspaceValores.style.display = 'block';
    renderEditorValoresM01();
  }

  // Botones footer
  const prevBtn = document.getElementById('m01PrevBtn');
  const nextBtn = document.getElementById('m01NextBtn');
  
  if (prevBtn) prevBtn.disabled = (currentStepM01 === 1);
  if (nextBtn) {
    if (currentStepM01 === 3) {
      nextBtn.innerHTML = `Guardar modificaciones <i class="bi bi-check-lg"></i>`;
    } else {
      nextBtn.innerHTML = `Guardar y continuar <i class="bi bi-arrow-right"></i>`;
    }
    actualizarEstadoBotonM01(nextBtn);
  }
}

function actualizarEstadoBotonM01(btn) {
  if (!btn) btn = document.getElementById('m01NextBtn');
  if (!btn) return;
  if (currentStepM01 === 1) {
    const ta = document.getElementById('m01ActiveTextarea');
    btn.disabled = !ta || !ta.value.trim();
  } else if (currentStepM01 === 2) {
    const ta = document.getElementById('m01ActiveTextarea');
    btn.disabled = !ta || !ta.value.trim();
  } else if (currentStepM01 === 3) {
    btn.disabled = !valoresM01 || valoresM01.length === 0;
  }
}

function renderEditorValoresM01() {
  const grid = document.getElementById('m01ValoresGrid');
  const countEl = document.getElementById('m01ValoresCount');
  if (!grid) return;

  grid.innerHTML = '';
  
  if (countEl) {
    countEl.innerText = `${valoresM01.length} de 6 máximo`;
  }

  valoresM01.forEach((v, idx) => {
    const card = document.createElement('div');
    card.className = 'm01-valor-card';
    card.innerHTML = `
      <div class="m01-valor-tag">Valor #${idx + 1}</div>
      <div class="m01-valor-actions">
        <button type="button" class="m01-action-btn edit" onclick="abrirModalValor(${idx})"><i class="bi bi-pencil"></i></button>
        <button type="button" class="m01-action-btn delete" onclick="eliminarValorM01(${idx})"><i class="bi bi-trash"></i></button>
      </div>
      <div class="m01-valor-title">${escapeHtml(v.titulo)}</div>
      <div class="m01-valor-desc">${escapeHtml(v.descripcion || '')}</div>
    `;
    grid.appendChild(card);
  });

  // Mostrar tarjeta "+ Añadir Valor" si no se supera el max de 6
  if (valoresM01.length < 6) {
    const addCard = document.createElement('div');
    addCard.className = 'm01-valor-card dashed';
    addCard.id = 'm01AddValorBtn';
    addCard.onclick = () => abrirModalValor(null);
    addCard.innerHTML = `
      <div class="m01-add-content">
        <i class="bi bi-plus-lg"></i>
        <span>Añadir Valor</span>
      </div>
    `;
    grid.appendChild(addCard);
  }
  actualizarEstadoBotonM01();
}

window.abrirModalValor = (idx) => {
  const modal = document.getElementById('m01ValorModal');
  const titleInput = document.getElementById('m01ModalInputTitle');
  const descInput = document.getElementById('m01ModalInputDesc');
  const modalTitle = document.getElementById('m01ModalTitle');
  
  if (!modal) return;
  activeEditValorIndex = idx;
  
  if (idx === null) {
    if (modalTitle) modalTitle.innerText = "Añadir Valor Corporativo";
    if (titleInput) titleInput.value = '';
    if (descInput) descInput.value = '';
  } else {
    if (modalTitle) modalTitle.innerText = "Editar Valor Corporativo";
    if (titleInput) titleInput.value = valoresM01[idx].titulo || '';
    if (descInput) descInput.value = valoresM01[idx].descripcion || '';
  }
  
  modal.style.display = 'flex';
};

window.eliminarValorM01 = (idx) => {
  if (confirm('¿Está seguro de eliminar este valor corporativo?')) {
    valoresM01.splice(idx, 1);
    renderEditorValoresM01();
  }
};

async function guardarM01() {
  const activeTextarea = document.getElementById('m01ActiveTextarea');
  if (currentStepM01 === 1 && activeTextarea) misionM01 = activeTextarea.value;
  else if (currentStepM01 === 2 && activeTextarea) visionM01 = activeTextarea.value;

  // Leer valores antiguos para detectar cambios (desde empresa_contenido global)
  let oldMision = '', oldVision = '', oldValores = [];
  try {
    const { data: oldRow } = await supabaseClient.from('empresa_contenido').select('*').eq('id', 1).single();
    if (oldRow) {
      oldMision = oldRow.mision || '';
      oldVision = oldRow.vision || '';
      oldValores = oldRow.valores || [];
    }
  } catch (_) {}

  // Validar campos obligatorios
  if (!misionM01 || !misionM01.trim()) {
    showToast('La Misión no puede estar vacía. Escribe la misión de la empresa antes de guardar.', 'error');
    return;
  }
  if (!visionM01 || !visionM01.trim()) {
    showToast('La Visión no puede estar vacía. Escribe la visión de la empresa antes de guardar.', 'error');
    return;
  }
  if (!valoresM01 || valoresM01.length === 0) {
    showToast('Debe registrar al menos un Valor Corporativo antes de guardar.', 'error');
    return;
  }

  // Verificar si hubo cambios reales
  if (misionM01 === oldMision && visionM01 === oldVision && JSON.stringify(valoresM01) === JSON.stringify(oldValores)) {
    showToast('No se detectaron cambios en los datos de la empresa.', 'info');
    return;
  }

  // Guardar en empresa_contenido (tabla global)
  const { error } = await supabaseClient.from('empresa_contenido').upsert({
    id: 1,
    mision: misionM01,
    vision: visionM01,
    valores: valoresM01,
    updated_at: new Date(),
    updated_by: currentUser.id
  }, { onConflict: 'id' });

  if (error) {
    showToast('Error al guardar los datos de la empresa: ' + error.message, 'error');
    return;
  }

  // Trazabilidad: registrar cada campo modificado en empresa_historial
  if (misionM01 !== oldMision) {
    await supabaseClient.from('empresa_historial').insert({
      usuario_id: currentUser.id,
      username: currentUser.username,
      campo: 'mision',
      valor_anterior: oldMision,
      valor_nuevo: misionM01
    });
  }
  if (visionM01 !== oldVision) {
    await supabaseClient.from('empresa_historial').insert({
      usuario_id: currentUser.id,
      username: currentUser.username,
      campo: 'vision',
      valor_anterior: oldVision,
      valor_nuevo: visionM01
    });
  }
  if (JSON.stringify(valoresM01) !== JSON.stringify(oldValores)) {
    await supabaseClient.from('empresa_historial').insert({
      usuario_id: currentUser.id,
      username: currentUser.username,
      campo: 'valores',
      valor_anterior: JSON.stringify(oldValores),
      valor_nuevo: JSON.stringify(valoresM01)
    });
  }

  // Auditoría con detalle de qué cambió
  const cambios = [];
  if (misionM01 !== oldMision) cambios.push('misión');
  if (visionM01 !== oldVision) cambios.push('visión');
  if (JSON.stringify(valoresM01) !== JSON.stringify(oldValores)) cambios.push('valores corporativos');
  await supabaseClient.from('auditoria').insert({
    usuario_id: currentUser.user_id,
    modulo: 'M01',
    accion: 'EDITAR',
    detalle: `Se modificaron los datos de la empresa (${cambios.join(', ')}) para el plan "${document.getElementById('planSelector').options[document.getElementById('planSelector').selectedIndex]?.text || currentPlanId}".`,
    usuario_email: currentUser.email || '',
    usuario_nombre: currentUser.username
  });

  // Liberar bloqueo de edición
  await liberarBloqueoM01();

  showToast('Información de la empresa guardada exitosamente.', 'success');
  await cargarDashboard();
  await cargarM01();
}

// ==================== M04: CADENA DE VALOR (25 preguntas) ====================
async function cargarCadenaValor() {
  console.log('Cargando autodiagnóstico de cadena de valor...');
  respuestasM04 = {};
  m04CompletadoPreviamente = false;
  m04ModoActualizacion = false;
  
  try {
    const { data, error } = await supabaseClient
      .from('autodiag_cadena')
      .select('*')
      .eq('plan_id', currentPlanId);
      
    if (error) throw error;
    
    if (data && data.length > 0) {
      data.forEach(row => { respuestasM04[row.item_num] = row.puntaje; });
    } else {
      await cargarFallbackPlanContenido();
    }
  } catch (err) {
    await cargarFallbackPlanContenido();
  }
  
  // Determinar el bloque actual idóneo
  determinarBloqueActual();
  
  // Renderizar stepper superior
  renderStepper();
  
  // Mostrar pantalla adecuada
  if (totalRespondidos() === 25) {
    m04CompletadoPreviamente = true;
    mostrarPantallaResultados();
  } else {
    renderWizardBlock();
  }
}

async function cargarFallbackPlanContenido() {
  try {
    const { data } = await supabaseClient
      .from('plan_contenido')
      .select('contenido')
      .eq('plan_id', currentPlanId)
      .eq('modulo_id', 'M04')
      .single();
      
    if (data?.contenido?.respuestas) {
      const resps = data.contenido.respuestas;
      resps.forEach((val, idx) => {
        if (val !== null && val !== undefined) {
          respuestasM04[idx + 1] = val;
        }
      });
    }
  } catch (err) {
    console.error("Error al cargar fallback de plan_contenido:", err);
  }
}

function totalRespondidos() {
  let count = 0;
  for (let i = 1; i <= 25; i++) {
    if (respuestasM04[i] !== undefined) count++;
  }
  return count;
}

function determinarBloqueActual() {
  // Encontrar el primer bloque incompleto (1 al 5)
  for (let b = 1; b <= 5; b++) {
    const startIndex = (b - 1) * 5;
    let complete = true;
    for (let i = startIndex + 1; i <= startIndex + 5; i++) {
      if (respuestasM04[i] === undefined) {
        complete = false;
        break;
      }
    }
    if (!complete) {
      currentStepM04 = b;
      return;
    }
  }
  // Si todos están completos, iniciar en bloque 5
  currentStepM04 = 5;
}

// RENDER DE STEPPER SUPERIOR PREMIUM
function renderStepper() {
  const steps = document.querySelectorAll('.stepper-step');
  
  // Calcular cuál es el máximo bloque que ha sido desbloqueado
  const bloquesCompletos = [false, false, false, false, false, false]; // indices 1-5
  for (let b = 1; b <= 5; b++) {
    const startIndex = (b - 1) * 5;
    let bComplete = true;
    for (let i = startIndex + 1; i <= startIndex + 5; i++) {
      if (respuestasM04[i] === undefined) {
        bComplete = false;
        break;
      }
    }
    bloquesCompletos[b] = bComplete;
  }
  
  steps.forEach(stepEl => {
    const step = parseInt(stepEl.getAttribute('data-step'));
    
    // Quitar todas las clases
    stepEl.classList.remove('active', 'completed', 'locked');
    
    // Determinar estado del paso
    const isCompleted = bloquesCompletos[step];
    
    let isUnlocked = true;
    for (let prev = 1; prev < step; prev++) {
      if (!bloquesCompletos[prev]) {
        isUnlocked = false;
        break;
      }
    }
    
    if (step === currentStepM04) {
      stepEl.classList.add('active');
      const circle = stepEl.querySelector('.stepper-circle');
      if (circle) circle.innerText = step;
    } else if (isCompleted) {
      stepEl.classList.add('completed');
      const circle = stepEl.querySelector('.stepper-circle');
      if (circle) circle.innerText = step;
    } else if (isUnlocked) {
      const circle = stepEl.querySelector('.stepper-circle');
      if (circle) circle.innerText = step;
    } else {
      stepEl.classList.add('locked');
      const circle = stepEl.querySelector('.stepper-circle');
      if (circle) circle.innerText = step;
    }
  });
  
  // Actualizar la línea de progreso del stepper
  const progressLine = document.getElementById('stepperProgressLine');
  if (progressLine) {
    // Calculate based on completed steps
    let completedSteps = 0;
    for (let b = 1; b <= 5; b++) {
      if (bloquesCompletos[b]) completedSteps++;
    }
    const progressPct = (completedSteps / 4) * 100;
    progressLine.style.width = Math.min(progressPct, 100) + '%';
  }

  // Actualizar etiqueta del paso actual lateral
  const labelsBloques = [
    "Infraestructura y Gestión",
    "Recursos Humanos",
    "Desarrollo Tecnológico",
    "Aprovisionamiento",
    "Actividades Primarias"
  ];
  const currentLabelEl = document.getElementById('stepperCurrentLabel');
  if (currentLabelEl) {
    currentLabelEl.innerHTML = `<i class="bi bi-arrow-right-circle-fill"></i> Paso ${currentStepM04} de 5: ${labelsBloques[currentStepM04 - 1]}`;
  }

  // Actualizar subtítulo de progreso general
  const progresoCountEl = document.getElementById('progresoCount');
  if (progresoCountEl) {
    progresoCountEl.innerText = `${totalRespondidos()}/25`;
  }
}

// RENDER DE BLOQUE DEL WIZARD (Premium)
function renderWizardBlock() {
  const blockTitles = [
    "INFRAESTRUCTURA Y GESTIÓN — ÍTEMS 1 AL 5",
    "RECURSOS HUMANOS — ÍTEMS 6 AL 10",
    "DESARROLLO TECNOLÓGICO — ÍTEMS 11 AL 15",
    "APROVISIONAMIENTO — ÍTEMS 16 AL 20",
    "ACTIVIDADES PRIMARIAS — ÍTEMS 21 AL 25"
  ];
  const bloqueIcons = [
    '<i class="bi bi-building"></i>',
    '<i class="bi bi-people-fill"></i>',
    '<i class="bi bi-cpu"></i>',
    '<i class="bi bi-box-seam"></i>',
    '<i class="bi bi-gear-fill"></i>'
  ];
  
  const tituloEl = document.getElementById('bloqueTitulo');
  if (tituloEl) {
    tituloEl.innerHTML = `<span class="bloque-icon">${bloqueIcons[currentStepM04 - 1]}</span> ${blockTitles[currentStepM04 - 1]}`;
  }
  
  // Ocultar resultados, mostrar wizard
  document.getElementById('wizardBlockContainer').style.display = 'block';
  document.getElementById('wizardResultsContainer').style.display = 'none';
  // Mostrar subtítulo y stepper en vista de wizard
  const sub = document.querySelector('#m04 > .subtitulo');
  const stepper = document.querySelector('#m04 > .wizard-stepper-container');
  if (sub) sub.style.display = '';
  if (stepper) stepper.style.display = '';
  
  // Calcular respuestas contestadas en el bloque actual
  const startIndex = (currentStepM04 - 1) * 5;
  let answeredInBlock = 0;
  let blockScore = 0;
  for (let i = startIndex + 1; i <= startIndex + 5; i++) {
    if (respuestasM04[i] !== undefined) {
      answeredInBlock++;
      blockScore += respuestasM04[i];
    }
  }
  
  // Update block progress bar
  const barFill = document.getElementById('bloqueBarFill');
  const barLabel = document.getElementById('bloqueBarLabel');
  if (barFill) barFill.style.width = `${(answeredInBlock / 5) * 100}%`;
  if (barLabel) barLabel.innerText = `${answeredInBlock}/5`;
  
  // Generar preguntas en el cuestionario
  const container = document.getElementById('cuestionarioM04');
  if (!container) return;
  
  let html = '';
  const blockQuestions = preguntasCadenaValor.slice(startIndex, startIndex + 5);
  
  blockQuestions.forEach(q => {
    const itemNum = q.num;
    const currentVal = respuestasM04[itemNum];
    const hasResponse = currentVal !== undefined;
    
    let buttonsHtml = '';
    for (let val = 0; val <= 4; val++) {
      const isSelected = currentVal === val ? 'selected' : '';
      const isDisabled = !isObjetivosEditable() ? 'disabled' : '';
      buttonsHtml += `
        <button class="btn-likert ${isSelected}" data-item="${itemNum}" data-val="${val}" ${isDisabled}>
          ${val}
        </button>
      `;
    }
    
    // FODA Impact Indicator
    let impactHtml = '';
    if (hasResponse) {
      if (currentVal >= 3) {
        impactHtml = '<span class="foda-impact-indicator fortaleza"><i class="bi bi-shield-check"></i> Fortaleza</span>';
      } else if (currentVal <= 1) {
        impactHtml = '<span class="foda-impact-indicator debilidad"><i class="bi bi-exclamation-triangle"></i> Debilidad</span>';
      } else {
        impactHtml = '<span class="foda-impact-indicator neutral"><i class="bi bi-dash-circle"></i> Neutral</span>';
      }
    }
    
    html += `
      <div class="pregunta-row ${hasResponse ? 'has-response' : ''}" data-item="${itemNum}">
        <div class="pregunta-num-col">${itemNum}</div>
        <div class="pregunta-texto-col">${q.enunciado} ${impactHtml}</div>
        <div class="pregunta-likert-col">
          ${buttonsHtml}
        </div>
      </div>
    `;
  });
  
  container.innerHTML = html;
  
  // Actualizar pie de tarjeta con Puntaje Acumulado Global
  const globalScore = totalRespondidos() > 0 ? Object.values(respuestasM04).reduce((acc, v) => acc + (v || 0), 0) : 0;
  const puntajeAcumEl = document.getElementById('wizardPuntajeAcumulado');
  if (puntajeAcumEl) {
    puntajeAcumEl.innerText = globalScore;
  }
  
  // Update block score
  const bloqueScoreEl = document.getElementById('wizardBloqueScore');
  if (bloqueScoreEl) {
    bloqueScoreEl.innerText = blockScore;
  }
  
  // Actualizar el pill de potencial
  const potencialPct = Math.round((1 - globalScore / 100) * 100);
  const potencialEl = document.getElementById('wizardPotencialBadge');
  if (potencialEl) {
    potencialEl.className = 'potencial-pill';
    if (totalRespondidos() === 0) {
      potencialEl.innerHTML = '<i class="bi bi-clock"></i> Potencial por calcular';
      potencialEl.classList.add('badge-medio');
    } else if (potencialPct > 70) {
      potencialEl.innerHTML = '<i class="bi bi-arrow-up-circle"></i> Potencial de mejora alto';
      potencialEl.classList.add('badge-alto');
    } else if (potencialPct > 40) {
      potencialEl.innerHTML = '<i class="bi bi-dash-circle"></i> Potencial de mejora medio';
      potencialEl.classList.add('badge-medio');
    } else {
      potencialEl.innerHTML = '<i class="bi bi-check-circle"></i> Potencial de mejora bajo';
      potencialEl.classList.add('badge-bajo');
    }
  }
  
  // Habilitar/Deshabilitar botones del Footer
  document.getElementById('wizardPrevBtn').disabled = (currentStepM04 === 1);
  document.getElementById('wizardNextBtn').disabled = (answeredInBlock < 5);
  
  // Mostrar/ocultar botón cancelar según modo actualización
  const cancelBtn = document.getElementById('wizardCancelBtn');
  if (cancelBtn) {
    cancelBtn.style.display = m04ModoActualizacion ? '' : 'none';
  }
  
  // Cambiar texto y estilo del botón siguiente en bloque 5 completado
  const nextBtn = document.getElementById('wizardNextBtn');
  if (nextBtn) {
    if (currentStepM04 === 5 && answeredInBlock === 5) {
      nextBtn.innerHTML = 'Enviar autodiagnóstico <i class="bi bi-send-fill"></i>';
      nextBtn.classList.remove('btn-primary');
      nextBtn.classList.add('btn-primary-solid');
    } else {
      nextBtn.innerHTML = 'Siguiente bloque <i class="bi bi-arrow-right"></i>';
      nextBtn.classList.remove('btn-primary-solid');
      nextBtn.classList.add('btn-primary');
    }
  }
}

// RESPONDER PREGUNTA CON GUARDADO AUTOMÁTICO
async function responderPregunta(itemNum, score) {
  if (!isObjetivosEditable()) {
    showToast('No se pueden modificar respuestas en un plan en revisión.', 'error');
    return;
  }
  
  respuestasM04[itemNum] = score;
  
  // 1. Obtener la pregunta y bloque
  const item = preguntasCadenaValor[itemNum - 1];
  
  // 2. Upsert inmediato en autodiag_cadena
  try {
    const row = {
      plan_id: currentPlanId,
      usuario_id: currentUser.user_id,
      item_num: itemNum,
      bloque: item.bloque,
      enunciado: item.enunciado,
      puntaje: score
    };
    
    const { error } = await supabaseClient
      .from('autodiag_cadena')
      .upsert(row, { onConflict: 'plan_id, item_num' });
      
    if (error) {
      console.error("Error al guardar autodiagnóstico:", error);
    }
  } catch (err) {
    console.error("Error al realizar upsert en autodiag_cadena:", err);
  }
  
  // 3. Sincronizar tabla foda desde el cliente (como fallback y respuesta instantánea)
  await sincronizarFodaCliente(itemNum, score, item.enunciado, item.bloque);
  
  // 4. Re-renderizar la pantalla
  renderStepper();
  renderWizardBlock();
}

// SINCRONIZACIÓN DE LA TABLA FODA DESDE EL CLIENTE (FALLBACK)
async function sincronizarFodaCliente(itemNum, score, enunciado, bloque) {
  try {
    const origen = 'cadena_de_valor';
    
    // Obtener todos los elementos FODA de este plan para filtrar localmente de forma segura
    const { data: fodaItems, error } = await supabaseClient
      .from('foda')
      .select('*')
      .eq('plan_id', currentPlanId);
      
    if (error) throw error;
    
    // Buscar si ya existe una entrada generada automáticamente por este ítem
    const existing = fodaItems?.find(f => 
      f.trazabilidad && 
      f.trazabilidad.origen === origen && 
      f.trazabilidad.item_num === itemNum
    );
    
    if (score === 2) {
      // Si el puntaje es 2 (Neutral), se debe eliminar de FODA
      if (existing) {
        await supabaseClient
          .from('foda')
          .delete()
          .eq('id', existing.id);
      }
    } else {
      const tipo = score >= 3 ? 'fortaleza' : 'debilidad';
      const trazabilidad = {
        origen: origen,
        bloque: bloque,
        item_num: itemNum,
        puntaje: score,
        descripcion_item: enunciado,
        generado_automaticamente: true,
        puede_editarse: true
      };
      
      const row = {
        plan_id: currentPlanId,
        tipo: tipo,
        descripcion: enunciado,
        trazabilidad: trazabilidad,
        generado_auto: true
      };
      
      if (existing) {
        // Actualizar existente
        await supabaseClient
          .from('foda')
          .update(row)
          .eq('id', existing.id);
      } else {
        // Insertar nuevo
        await supabaseClient
          .from('foda')
          .insert(row);
      }
    }
  } catch (err) {
    console.error("Error sincronizando FODA desde el cliente:", err);
  }
}

// EVENTOS DE NAVEGACIÓN DEL WIZARD
function navegarAnterior() {
  if (currentStepM04 > 1) {
    currentStepM04--;
    renderStepper();
    renderWizardBlock();
  }
}

async function navegarSiguiente() {
  // Comprobar que el bloque actual esté completo
  const startIndex = (currentStepM04 - 1) * 5;
  let complete = true;
  for (let i = startIndex + 1; i <= startIndex + 5; i++) {
    if (respuestasM04[i] === undefined) {
      complete = false;
      break;
    }
  }
  
  if (!complete) {
    showToast('Por favor responda las 5 preguntas del bloque actual antes de continuar.', 'error');
    return;
  }
  
  if (currentStepM04 < 5) {
    currentStepM04++;
    renderStepper();
    renderWizardBlock();
    document.getElementById('m04')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } else {
    // Bloque 5 completado → finalizar diagnóstico
    await finalizarDiagnostico();
  }
}

// MOSTRAR PANTALLA FINAL DE RESULTADOS
async function mostrarPantallaResultados() {
  document.getElementById('wizardBlockContainer').style.display = 'none';
  document.getElementById('wizardResultsContainer').style.display = 'block';
  // Ocultar subtítulo y stepper en vista de resultados
  const sub = document.querySelector('#m04 > .subtitulo');
  const stepper = document.querySelector('#m04 > .wizard-stepper-container');
  if (sub) sub.style.display = 'none';
  if (stepper) stepper.style.display = 'none';
  
  // Scroll to top of section
  document.getElementById('m04')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  
  // Calcular puntaje total
  const scoreTotal = Object.values(respuestasM04).reduce((acc, v) => acc + v, 0);
  document.getElementById('resultadoPuntajeTotal').innerText = scoreTotal;
  
  // Calcular potencial de mejora
  const potencial = Math.round((1 - scoreTotal / 100) * 100);
  document.getElementById('resultadoPotencialMejora').innerText = `${potencial}%`;
  
  const potencialTexto = document.getElementById('resultadoPotencialTexto');
  if (potencial > 70) {
    potencialTexto.className = 'card-subtext';
    potencialTexto.style.color = '#dc2626';
    potencialTexto.innerText = 'Potencial de mejora alto';
  } else if (potencial > 40) {
    potencialTexto.className = 'card-subtext';
    potencialTexto.style.color = '#d97706';
    potencialTexto.innerText = 'Potencial de mejora medio';
  } else {
    potencialTexto.className = 'card-subtext';
    potencialTexto.style.color = '#059669';
    potencialTexto.innerText = 'Potencial de mejora bajo';
  }
  
  // Clasificación global
  const clasificacionEl = document.getElementById('resultadoClasificacion');
  const clasificacionTextoEl = document.getElementById('resultadoClasificacionTexto');
  if (clasificacionEl) {
    clasificacionEl.className = 'clasificacion-total-premium';
    if (scoreTotal < 40) {
      clasificacionEl.innerText = 'CRÍTICO';
      clasificacionEl.classList.add('critico');
      if (clasificacionTextoEl) clasificacionTextoEl.innerText = 'La cadena de valor presenta deficiencias importantes';
    } else if (scoreTotal < 70) {
      clasificacionEl.innerText = 'MEJORABLE';
      clasificacionEl.classList.add('mejorable');
      if (clasificacionTextoEl) clasificacionTextoEl.innerText = 'Existen oportunidades claras de optimización';
    } else {
      clasificacionEl.innerText = 'SÓLIDO';
      clasificacionEl.classList.add('solido');
      if (clasificacionTextoEl) clasificacionTextoEl.innerText = 'La cadena de valor tiene bases competitivas fuertes';
    }
  }
  
  // Renderizar desglose por bloques
  renderBloquesBreakdown();
  
  // Renderizar Gráfico Radar (Chart.js)
  renderRadarChart();
  
  // Cargar tablas de trazabilidad
  await cargarTablasTrazabilidad();
}

// RENDER DESGLOSE POR BLOQUES (Cards)
function renderBloquesBreakdown() {
  const container = document.getElementById('bloquesBreakdown');
  if (!container) return;
  
  const bloqueNames = [
    'Infraestructura y Gestión',
    'Recursos Humanos',
    'Desarrollo Tecnológico',
    'Aprovisionamiento',
    'Actividades Primarias'
  ];
  
  let html = '';
  for (let b = 0; b < 5; b++) {
    let score = 0;
    for (let i = b * 5 + 1; i <= b * 5 + 5; i++) {
      score += respuestasM04[i] || 0;
    }
    const pct = (score / 20) * 100;
    let classLevel = 'critico';
    if (score >= 14) classLevel = 'solido';
    else if (score >= 8) classLevel = 'mejorable';
    
    html += `
      <div class="bloque-score-card ${classLevel}">
        <div class="bloque-name">${bloqueNames[b]}</div>
        <div class="bloque-score-value">${score}</div>
        <div class="bloque-score-max">/ 20</div>
        <div class="bloque-score-bar">
          <div class="bar-fill-bloque" style="width: ${pct}%"></div>
        </div>
      </div>
    `;
  }
  container.innerHTML = html;
}

// RENDERIZACIÓN DEL GRÁFICO RADAR CON CHART.JS
function renderRadarChart() {
  const ctx = document.getElementById('radarChartM04').getContext('2d');
  
  if (chartRadarM04) {
    chartRadarM04.destroy();
  }
  
  // Calcular puntajes por cada bloque (0-20)
  const blockScores = [0, 0, 0, 0, 0];
  for (let i = 1; i <= 25; i++) {
    const blockIdx = Math.floor((i - 1) / 5);
    blockScores[blockIdx] += respuestasM04[i] || 0;
  }
  
  chartRadarM04 = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: [
        'Infraestructura',
        'RR.HH.',
        'Tecnología',
        'Aprovisionamiento',
        'Act. Primarias'
      ],
      datasets: [
        {
          label: 'Puntaje Obtenido',
          data: blockScores,
          backgroundColor: 'rgba(37, 99, 235, 0.15)',
          borderColor: 'rgba(37, 99, 235, 0.9)',
          borderWidth: 2.5,
          pointBackgroundColor: '#2563eb',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 7
        },
        {
          label: 'Máximo (20)',
          data: [20, 20, 20, 20, 20],
          backgroundColor: 'rgba(16, 185, 129, 0.06)',
          borderColor: 'rgba(16, 185, 129, 0.3)',
          borderWidth: 1.5,
          borderDash: [5, 5],
          pointRadius: 0,
          pointHoverRadius: 0
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        r: {
          angleLines: {
            display: true,
            color: '#e2e8f0'
          },
          grid: {
            color: '#e2e8f0'
          },
          suggestedMin: 0,
          suggestedMax: 20,
          ticks: {
            stepSize: 4,
            backdropColor: 'transparent',
            color: '#94a3b8',
            font: {
              size: 10,
              weight: '500'
            }
          },
          pointLabels: {
            color: '#1e293b',
            font: {
              size: 11,
              family: 'Inter',
              weight: '600'
            }
          }
        }
      },
      plugins: {
        legend: {
          display: true,
          position: 'bottom',
          labels: {
            padding: 20,
            usePointStyle: true,
            font: {
              size: 11,
              family: 'Inter',
              weight: '500'
            }
          }
        }
      }
    }
  });
}

// LLENAR TABLAS DE FORTALEZAS Y DEBILIDADES CON TRAZABILIDAD DETALLADA
async function cargarTablasTrazabilidad() {
  const tbodyFortalezas = document.querySelector('#tablaFortalezasM04 tbody');
  const tbodyDebilidades = document.querySelector('#tablaDebilidadesM04 tbody');
  
  tbodyFortalezas.innerHTML = '';
  tbodyDebilidades.innerHTML = '';
  
  const fortalezasList = [];
  const debilidadesList = [];
  
  for (let i = 1; i <= 25; i++) {
    const val = respuestasM04[i];
    if (val === undefined) continue;
    
    const q = preguntasCadenaValor[i - 1];
    const tipo = val >= 3 ? 'fortaleza' : 'debilidad';
    const tipoLabel = val >= 3 ? 'Fortaleza' : 'Debilidad';
    const tipoIcon = val >= 3 ? 'bi-shield-check-fill' : 'bi-exclamation-triangle-fill';
    
    const rowHtml = `
      <tr>
        <td style="text-align: center;">
          <div class="pregunta-num-col" style="margin: 0 auto;">${i}</div>
        </td>
        <td>
          <div style="font-weight: 600; color: #1e293b; margin-bottom: 0.4rem; line-height: 1.5;">${q.enunciado}</div>
          <div class="trazabilidad-metadata-box">
            <span class="meta-label">Trazabilidad:</span>
            <span class="meta-badge"><i class="bi bi-link-45deg"></i> cadena_de_valor</span>
            <span class="meta-badge"><i class="bi bi-hash"></i> ítem ${i}</span>
            <span class="meta-badge"><i class="bi bi-folder2"></i> ${q.bloque}</span>
            <span class="meta-badge"><i class="bi bi-${tipoIcon}"></i> ${tipoLabel}</span>
            <span class="meta-badge"><i class="bi bi-star-fill"></i> ${val}/4</span>
            <span class="meta-badge auto-badge"><i class="bi bi-robot"></i> Auto</span>
          </div>
        </td>
        <td>
          <div class="chip-trazabilidad chip-trazabilidad-bloque">
            <i class="bi bi-folder2-open"></i> ${q.bloque}
          </div>
        </td>
        <td style="text-align: center;">
          <span class="chip-trazabilidad-score ${tipo}">
            <i class="bi bi-${tipoIcon}"></i> ${val}/4
          </span>
        </td>
      </tr>
    `;
    
    if (val >= 3) {
      fortalezasList.push(rowHtml);
    } else if (val <= 1) {
      debilidadesList.push(rowHtml);
    }
  }
  
  // Update count badges
  const countFortalezasEl = document.getElementById('countFortalezas');
  const countDebilidadesEl = document.getElementById('countDebilidades');
  if (countFortalezasEl) countFortalezasEl.innerText = fortalezasList.length;
  if (countDebilidadesEl) countDebilidadesEl.innerText = debilidadesList.length;
  
  if (fortalezasList.length > 0) {
    tbodyFortalezas.innerHTML = fortalezasList.join('');
  } else {
    tbodyFortalezas.innerHTML = `<tr class="empty-state-row"><td colspan="4"><i class="bi bi-shield-slash"></i><br>No se detectaron fortalezas (puntajes 3 o 4)</td></tr>`;
  }
  
  if (debilidadesList.length > 0) {
    tbodyDebilidades.innerHTML = debilidadesList.join('');
  } else {
    tbodyDebilidades.innerHTML = `<tr class="empty-state-row"><td colspan="4"><i class="bi bi-check-circle"></i><br>No se detectaron debilidades (puntajes 0 o 1). ¡Excelente!</td></tr>`;
  }
}

// GUARDAR SNAPSHOT HISTORIAL DE DATOS PREVIOS ANTES DE SOBREESCRIBIR
async function guardarSnapshotHistorial() {
  try {
    const { data } = await supabaseClient
      .from('autodiag_cadena')
      .select('item_num, bloque, enunciado, puntaje')
      .eq('plan_id', currentPlanId);
      
    if (data && data.length > 0) {
      await supabaseClient.from('auditoria').insert({
        usuario_id: currentUser.user_id,
        modulo: 'M04',
        accion: 'HISTORIAL',
        detalle: JSON.stringify(data)
      });
    }
  } catch (err) {
    console.error("Error al guardar snapshot historial:", err);
  }
}

// GUARDAR HISTORIAL DE CADENA DE VALOR (versión completa — se llama siempre)
async function guardarHistorialCadenaValor(contenido, tipo) {
  try {
    await supabaseClient.from('auditoria').insert({
      usuario_id: currentUser.user_id,
      modulo: 'M04',
      accion: 'HISTORIAL',
      detalle: JSON.stringify({
        plan_id: currentPlanId,
        tipo: tipo,
        fecha: new Date().toISOString(),
        contenido: contenido
      })
    });
  } catch (err) {
    console.error("Error al guardar historial de cadena de valor:", err);
  }
}

// FINALIZAR AUTO-DIAGNÓSTICO M04 (guarda en BD y muestra resultados)
async function finalizarDiagnostico() {
  if (!isObjetivosEditable()) {
    showToast('No se puede guardar el diagnóstico en un plan en revisión.', 'error');
    return;
  }
  
  if (totalRespondidos() < 25) {
    showToast('Por favor responda las 25 preguntas antes de finalizar.', 'error');
    return;
  }
  
  const scoreTotal = Object.values(respuestasM04).reduce((acc, v) => acc + v, 0);
  const potencialMejora = Math.round((1 - scoreTotal / 100) * 100);
  
  const respuestasArray = [];
  for (let i = 1; i <= 25; i++) {
    respuestasArray.push(respuestasM04[i]);
  }
  
  const contenido = {
    respuestas: respuestasArray,
    puntaje_total: scoreTotal,
    potencial_mejora: potencialMejora,
    completado: true
  };
  
  // 1. Guardar snapshot historial de datos previos ANTES de sobrescribir
  if (m04CompletadoPreviamente) {
    await guardarSnapshotHistorial();
  }
  
  // 2. Guardar en plan_contenido
  const { error } = await supabaseClient.from('plan_contenido').upsert({
    plan_id: currentPlanId,
    modulo_id: 'M04',
    contenido: contenido,
    completado: true,
    completado_fecha: new Date()
  }, { onConflict: 'plan_id, modulo_id' });
  
  if (error) {
    showToast('Error al guardar: ' + error.message, 'error');
    return;
  }
  
  // 3. Guardar historial del nuevo estado (siempre se ejecuta)
  await guardarHistorialCadenaValor(contenido, m04CompletadoPreviamente ? 'actualizacion' : 'creacion');
  
  // 4. Insertar registro en auditoria
  try {
    await supabaseClient.from('auditoria').insert({
      usuario_id: currentUser.user_id,
      modulo: 'M04',
      accion: m04CompletadoPreviamente ? 'ACTUALIZAR' : 'CREAR',
      detalle: `Se ${m04CompletadoPreviamente ? 'actualizó' : 'completó'} el autodiagnóstico de Cadena de Valor Interna. Puntaje: ${scoreTotal}/100.`
    });
  } catch (err) {
    console.error("Error al guardar en auditoría:", err);
  }
  
  showToast(
    m04CompletadoPreviamente
      ? 'Diagnóstico actualizado correctamente.'
      : 'Diagnóstico guardado correctamente.',
    'success'
  );
  
  // Recargar — ahora mostrará resultados (25 respondidos)
  await cargarCadenaValor();
  await cargarDashboard();
  await cargarDatosPlan();
}

// ==================== OBJETIVOS ====================

let objModalDirty = false;

function isObjetivosEditable() {
  const sel = document.getElementById('planSelector');
  if (!sel) return false;
  const opt = sel.options[sel.selectedIndex];
  return opt ? opt.getAttribute('data-estado') !== 'en_revision' : false;
}

async function cargarObjetivos() {
  const edit = isObjetivosEditable();
  const { data: objetivos, error } = await supabaseClient.from('objetivos_generales').select('*').eq('plan_id', currentPlanId).order('orden');
  if (error) { console.error(error); return; }
  const container = document.getElementById('objetivosContainer');
  if (!container) return;

  // Batch: obtener todos los objetivos_especificos en una sola query
  const objIds = objetivos.map(o => o.id);
  const especByObjId = {};
  if (objIds.length > 0) {
    const { data: allEspec } = await supabaseClient.from('objetivos_especificos').select('*').in('objetivo_general_id', objIds).order('orden');
    (allEspec || []).forEach(e => {
      if (!especByObjId[e.objetivo_general_id]) especByObjId[e.objetivo_general_id] = [];
      especByObjId[e.objetivo_general_id].push(e);
    });
  }

  container.innerHTML = '';
  for (let idx = 0; idx < objetivos.length; idx++) {
    const obj = objetivos[idx];
    const especificos = especByObjId[obj.id] || [];
    const card = document.createElement('div');
    card.className = 'objetivo-card';
    const actionsHtml = edit ? `
      <div class="objetivo-actions">
        <button class="btn-small btn-secondary" onclick="abrirModalObjetivo(${obj.id})"><i class="bi bi-pencil"></i></button>
        <button class="btn-small btn-danger" onclick="confirmarEliminarObjetivo(${obj.id})"><i class="bi bi-trash"></i></button>
      </div>
    ` : '';
    const especificosHtml = (especificos || []).map(esp => `
    <li>
      <span class="especifico-texto">${escapeHtml(esp.descripcion)}</span>
    </li>
    `).join('');
    card.innerHTML = `
      <div class="objetivo-header">
        <div class="objetivo-titulo">${idx+1}. ${escapeHtml(obj.descripcion)}</div>
        ${actionsHtml}
      </div>
      <div class="especificos-list">
        <strong>Objetivos específicos</strong>
        <ul>
          ${especificosHtml || '<li style="color:#94a3b8;font-style:italic;">Sin objetivos específicos</li>'}
        </ul>
      </div>
    `;
    container.appendChild(card);
  }
}

function abrirModalObjetivo(objId) {
  objModalDirty = false;
  const editId = document.getElementById('objModalEditId');
  const title = document.getElementById('objModalTitle');
  const desc = document.getElementById('objGeneralDesc');
  const list = document.getElementById('objEspecList');
  editId.value = objId || '';
  list.innerHTML = '';
  if (objId) {
    title.innerHTML = '<i class="bi bi-pencil-square"></i> Editar objetivo general';
    supabaseClient.from('objetivos_generales').select('*').eq('id', objId).single().then(({ data: obj }) => {
      if (obj) desc.value = obj.descripcion || '';
    });
    supabaseClient.from('objetivos_especificos').select('*').eq('objetivo_general_id', objId).order('orden').then(({ data: especificos }) => {
      list.innerHTML = '';
      (especificos || []).forEach(esp => {
        const row = document.createElement('div');
        row.className = 'obj-espec-row';
        row.innerHTML = `<input type="text" class="obj-esp-input" value="${escapeHtml(esp.descripcion)}" placeholder="Escribe un objetivo específico" oninput="objModalDirty=true"><button class="btn-del-esp" type="button" onclick="this.closest('.obj-espec-row').remove(); objModalDirty=true;"><i class="bi bi-trash"></i></button>`;
        list.appendChild(row);
      });
      if (!especificos || especificos.length === 0) renderObjEspecEmpty();
    });
  } else {
    title.innerHTML = '<i class="bi bi-plus-circle"></i> Nuevo objetivo general';
    desc.value = '';
    renderObjEspecEmpty();
  }
  document.getElementById('objModal').style.display = 'flex';
}

function renderObjEspecEmpty() {
  const list = document.getElementById('objEspecList');
  if (list.querySelector('.obj-espec-row')) return;
  list.innerHTML = '<div class="obj-espec-empty">Aún no hay objetivos específicos. Haz clic en "Añadir específico".</div>';
}

function agregarCampoEspecifico() {
  objModalDirty = true;
  const list = document.getElementById('objEspecList');
  const empty = list.querySelector('.obj-espec-empty');
  if (empty) empty.remove();
  const row = document.createElement('div');
  row.className = 'obj-espec-row';
  row.innerHTML = `<input type="text" class="obj-esp-input" value="" placeholder="Escribe un objetivo específico" oninput="objModalDirty=true"><button class="btn-del-esp" type="button" onclick="this.closest('.obj-espec-row').remove(); objModalDirty=true;"><i class="bi bi-trash"></i></button>`;
  list.appendChild(row);
  row.querySelector('input').focus();
}

async function guardarObjetivoModal() {
  const generalDesc = document.getElementById('objGeneralDesc').value.trim();
  if (!generalDesc) { showToast('El objetivo general no puede estar vacío.', 'error'); return; }

  const espInputs = document.querySelectorAll('#objEspecList .obj-esp-input');
  const especificos = [];
  espInputs.forEach(inp => { const v = inp.value.trim(); if (v) especificos.push(v); });

  const editId = document.getElementById('objModalEditId').value.trim();
  const editMode = !!editId;

  try {
    if (editMode) {
      await supabaseClient.from('objetivos_generales').update({ descripcion: generalDesc }).eq('id', parseInt(editId));
      // Eliminar específicos y reinsertar
      const { data: oldEsp } = await supabaseClient.from('objetivos_especificos').select('id').eq('objetivo_general_id', parseInt(editId));
      for (const e of (oldEsp || [])) {
        await supabaseClient.from('objetivos_especificos').delete().eq('id', e.id);
      }
      for (let i = 0; i < especificos.length; i++) {
        await supabaseClient.from('objetivos_especificos').insert({ objetivo_general_id: parseInt(editId), descripcion: especificos[i], orden: i + 1 });
      }
      await supabaseClient.from('auditoria').insert({
        usuario_id: currentUser.id, modulo: 'M03', accion: 'EDITAR',
        detalle: `Se editó el objetivo general ID ${editId} del plan ${currentPlanId} (${especificos.length} específicos)`,
        usuario_email: currentUser.email || '', usuario_nombre: currentUser.username
      });
      showToast('Objetivo actualizado correctamente.', 'success');
    } else {
      const { data: newObj, error: insErr } = await supabaseClient.from('objetivos_generales').insert({
        plan_id: currentPlanId, descripcion: generalDesc, orden: 0
      }).select().single();
      if (insErr) throw insErr;
      for (let i = 0; i < especificos.length; i++) {
        await supabaseClient.from('objetivos_especificos').insert({ objetivo_general_id: newObj.id, descripcion: especificos[i], orden: i + 1 });
      }
      await supabaseClient.from('auditoria').insert({
        usuario_id: currentUser.id, modulo: 'M03', accion: 'CREAR',
        detalle: `Se creó el objetivo general "${generalDesc}" para el plan ${currentPlanId} (${especificos.length} específicos)`,
        usuario_email: currentUser.email || '', usuario_nombre: currentUser.username
      });
      showToast('Objetivo guardado correctamente.', 'success');
    }
  } catch (err) {
    showToast('Error al guardar: ' + err.message, 'error');
    return;
  }

  document.getElementById('objModal').style.display = 'none';
  await cargarObjetivos();
  await cargarDashboard();
}

function cerrarObjModal() {
  if (objModalDirty) {
    document.getElementById('objConfirmModal').style.display = 'flex';
  } else {
    document.getElementById('objModal').style.display = 'none';
  }
}

function cerrarObjConfirmModal() {
  document.getElementById('objConfirmModal').style.display = 'none';
}

function confirmarSalirSinGuardar() {
  document.getElementById('objConfirmModal').style.display = 'none';
  document.getElementById('objModal').style.display = 'none';
}

function confirmarEliminarObjetivo(id) {
  document.getElementById('objDeleteTargetId').value = id;
  document.getElementById('objDeleteModal').style.display = 'flex';
}

function cerrarObjDeleteModal() {
  document.getElementById('objDeleteModal').style.display = 'none';
}

async function eliminarObjetivoConfirmado() {
  const id = parseInt(document.getElementById('objDeleteTargetId').value);
  if (!id) return;
  try {
    await supabaseClient.from('objetivos_generales').delete().eq('id', id);
    await supabaseClient.from('auditoria').insert({
      usuario_id: currentUser.id, modulo: 'M03', accion: 'ELIMINAR',
      detalle: `Se eliminó el objetivo general ID ${id} del plan ${currentPlanId}`,
      usuario_email: currentUser.email || '', usuario_nombre: currentUser.username
    });
    showToast('Objetivo eliminado correctamente.', 'success');
  } catch (err) {
    showToast('Error al eliminar: ' + err.message, 'error');
  }
  document.getElementById('objDeleteModal').style.display = 'none';
  await cargarObjetivos();
  await cargarDashboard();
}

async function eliminarEspecificoDirecto(id) {
  if (!confirm('¿Eliminar este objetivo específico?')) return;
  try {
    await supabaseClient.from('objetivos_especificos').delete().eq('id', id);
    showToast('Objetivo específico eliminado.', 'success');
    await cargarObjetivos();
  } catch (err) {
    showToast('Error al eliminar: ' + err.message, 'error');
  }
}

// ==================== KPIs ====================
async function cargarKPIs() {
  console.log('Cargando KPIs...');
  const { data, error } = await supabaseClient.from('kpis').select('*, objetivos_generales(descripcion)').eq('plan_id', currentPlanId);
  if (error) {
    console.error('Error cargando KPIs:', error);
    return;
  }
  const container = document.getElementById('kpisContainer');
  if (!container) return;
  container.innerHTML = data.map(k => `
    <div class="kpi-card" style="background:white; border-radius:1rem; padding:1rem; margin-bottom:1rem; border:1px solid #e2e8f0;">
      <strong>${escapeHtml(k.nombre)}</strong> (${escapeHtml(k.unidad)})<br>
      Meta: ${k.meta} | Actual: ${k.valor_actual || '—'}<br>
      Objetivo relacionado: ${k.objetivos_generales?.descripcion || 'Sin objetivo'}<br>
      ${isEditable ? `
        <button class="btn-small btn-secondary" data-action="editarKPI" data-id="${k.id}">Editar valor</button>
        <button class="btn-small btn-danger" data-action="eliminarKPI" data-id="${k.id}">Eliminar</button>
      ` : ''}
    </div>
  `).join('');
  if (isEditable) {
    container.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const action = btn.getAttribute('data-action');
        const id = parseInt(btn.getAttribute('data-id'));
        if (action === 'editarKPI') await editarKPI(id);
        else if (action === 'eliminarKPI') await eliminarKPI(id);
      });
    });
  }
}

async function editarKPI(id) {
  const nuevoValor = prompt('Nuevo valor actual:');
  if (nuevoValor !== null) {
    await supabaseClient.from('kpis').update({ valor_actual: parseFloat(nuevoValor) }).eq('id', id);
    await cargarKPIs();
  }
}

async function eliminarKPI(id) {
  if (confirm('¿Eliminar KPI?')) await supabaseClient.from('kpis').delete().eq('id', id);
  await cargarKPIs();
  await cargarDashboard();
}

window.agregarKPI = async () => {
  if (!isEditable) return alert('Solo editable en borrador');
  const nombre = prompt('Nombre del KPI:');
  if (!nombre) return;
  const meta = prompt('Meta (número):');
  const unidad = prompt('Unidad (%, $, etc.):');
  const { data: objetivos } = await supabaseClient.from('objetivos_generales').select('id, descripcion').eq('plan_id', currentPlanId);
  if (!objetivos.length) { alert('Primero crea objetivos generales'); return; }
  const objIds = objetivos.map(o => `${o.id}: ${o.descripcion}`).join('\n');
  const objId = prompt(`ID del objetivo general al que pertenece:\n${objIds}`);
  if (!objId) return;
  await supabaseClient.from('kpis').insert({
    plan_id: currentPlanId,
    objetivo_general_id: parseInt(objId),
    nombre, meta: parseFloat(meta), unidad, valor_actual: 0, frecuencia: 'mensual', historial: []
  });
  await cargarKPIs();
  await cargarDashboard();
};

// ==================== INICIATIVAS ====================
async function cargarIniciativas() {
  console.log('Cargando iniciativas...');
  const { data, error } = await supabaseClient.from('iniciativas').select('*, objetivos_generales(descripcion)').eq('plan_id', currentPlanId);
  if (error) {
    console.error('Error cargando iniciativas:', error);
    return;
  }
  const container = document.getElementById('iniciativasContainer');
  if (!container) return;
  container.innerHTML = data.map(i => `
    <div class="iniciativa-card" style="background:white; border-radius:1rem; padding:1rem; margin-bottom:1rem; border:1px solid #e2e8f0;">
      <strong>${escapeHtml(i.area)}</strong> - ${escapeHtml(i.descripcion)}<br>
      Objetivo: ${i.objetivos_generales?.descripcion || 'Sin objetivo'}<br>
      Fechas: ${i.fecha_inicio || '—'} a ${i.fecha_fin || '—'}<br>
      Estado: ${i.estado}<br>
      ${isEditable ? `
        <button class="btn-small btn-secondary" data-action="editarIniciativa" data-id="${i.id}">Editar estado</button>
        <button class="btn-small btn-danger" data-action="eliminarIniciativa" data-id="${i.id}">Eliminar</button>
      ` : ''}
    </div>
  `).join('');
  if (isEditable) {
    container.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const action = btn.getAttribute('data-action');
        const id = parseInt(btn.getAttribute('data-id'));
        if (action === 'editarIniciativa') await editarIniciativa(id);
        else if (action === 'eliminarIniciativa') await eliminarIniciativa(id);
      });
    });
  }
}

async function editarIniciativa(id) {
  const nuevoEstado = prompt('Nuevo estado (activa, completada, retrasada):');
  if (nuevoEstado) await supabaseClient.from('iniciativas').update({ estado: nuevoEstado }).eq('id', id);
  await cargarIniciativas();
}

async function eliminarIniciativa(id) {
  if (confirm('¿Eliminar iniciativa?')) await supabaseClient.from('iniciativas').delete().eq('id', id);
  await cargarIniciativas();
  await cargarDashboard();
}

window.agregarIniciativa = async () => {
  if (!isEditable) return alert('Solo editable en borrador');
  const area = prompt('Área responsable:');
  const desc = prompt('Descripción de la iniciativa:');
  if (!area || !desc) return;
  const { data: objetivos } = await supabaseClient.from('objetivos_generales').select('id, descripcion').eq('plan_id', currentPlanId);
  if (!objetivos.length) { alert('Primero crea objetivos generales'); return; }
  const objIds = objetivos.map(o => `${o.id}: ${o.descripcion}`).join('\n');
  const objId = prompt(`ID del objetivo general al que pertenece:\n${objIds}`);
  await supabaseClient.from('iniciativas').insert({
    plan_id: currentPlanId,
    objetivo_general_id: parseInt(objId),
    area, descripcion: desc, estado: 'activa'
  });
  await cargarIniciativas();
  await cargarDashboard();
};

// ==================== MÓDULOS JSON (M05-M09) ====================
async function cargarModulosJSON(divId, moduloId) {
  const { data, error } = await supabaseClient.from('plan_contenido').select('contenido').eq('plan_id', currentPlanId).eq('modulo_id', moduloId).single();
  if (error && error.code !== 'PGRST116') console.error(`Error cargando ${moduloId}:`, error);
  const textarea = document.getElementById(`${divId}Contenido`);
  if (textarea) {
    textarea.value = JSON.stringify(data?.contenido || {}, null, 2);
    textarea.disabled = !isEditable;
  }
}

async function guardarModulo(moduloId, obtenerDatos) {
  if (!isEditable) { alert('Este plan no está en estado borrador. No se puede editar.'); return; }
  const contenido = obtenerDatos();
  const { error } = await supabaseClient.from('plan_contenido').upsert({
    plan_id: currentPlanId,
    modulo_id: moduloId,
    contenido: contenido,
    completado: true,
    completado_fecha: new Date()
  }, { onConflict: 'plan_id, modulo_id' });
  if (error) alert('Error al guardar: ' + error.message);
  else alert('Guardado correctamente');
  await cargarDashboard();
}

// ==================== MÓDULO M05: MATRIZ BCG — CONTROLADOR PRINCIPAL ====================

async function cargarBCG() {
  if (!currentPlanId) return;
  console.log('Cargando Matriz BCG para plan_id:', currentPlanId);
  
  const { data, error } = await supabaseClient
    .from('matriz_bcg')
    .select('*')
    .eq('plan_id', currentPlanId)
    .single();
    
  if (error && error.code !== 'PGRST116') {
    console.error('Error al cargar matriz_bcg:', error);
  }
  
  const badge = document.getElementById('m05EstadoBadge');
  const alertBanner = document.getElementById('m05AlertBanner');
  const alertText = document.getElementById('m05AlertText');
  
  if (data) {
    activeBcgId = data.id;
    bcgUensData = data.datos_uen || [];
    bcgLockUser = {
      user_id: data.bloqueado_por,
      user_name: data.bloqueado_por_nombre,
      locked_at: data.bloqueado_desde
    };
    
    const isLockedByOther = data.bloqueado_por && data.bloqueado_por !== currentUser.id;
    
    if (data.estado === 'procesado') {
      bcgCompletadoPreviamente = true;
      bcgModoActualizacion = false;
      
      if (badge) {
        badge.innerText = 'Procesado';
        badge.className = 'm05-badge-progreso procesado';
      }
      if (alertBanner) {
        alertBanner.style.display = 'flex';
        alertBanner.className = 'm05-alert-banner';
        if (alertText) {
          alertText.innerHTML = `<i class=""></i> Este planeamiento ya cuenta con una Matriz BCG generada el <strong>${new Date(data.actualizado_en || data.creado_en).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</strong> por el Estratega: <strong>${data.bloqueado_por_nombre || 'Estratega'}</strong>.`;
        }
      }
      
      // Results-first
      await mostrarResultadosBCG();
      
      const backBtn = document.getElementById('btnBackToBCG');
      if (backBtn) backBtn.disabled = isLockedByOther;
    } else {
      bcgCompletadoPreviamente = false;
      bcgModoActualizacion = false;
      
      if (badge) {
        badge.innerText = 'En edición';
        badge.className = 'm05-badge-progreso edicion';
      }
      if (alertBanner) alertBanner.style.display = 'none';
      
      document.getElementById('m05ResultsContainer').style.display = 'none';
      document.getElementById('m05WizardContainer').style.display = 'block';
      
      currentBcgStep = 1;
      renderBcgStepper();
      renderBcgBlock();
      
      if (isLockedByOther) {
        mostrarModalBcgBloqueado(data.bloqueado_por_nombre);
      }
    }
  } else {
    activeBcgId = null;
    bcgUensData = defaultBcgUens.map(nombre => ({
      nombre: nombre,
      ventas_empresa: '',
      ventas_mercado_anterior: '',
      ventas_mercado_actual: '',
      nombre_competidor_lider: '',
      ventas_competidor_lider: ''
    }));
    bcgLockUser = null;
    bcgCompletadoPreviamente = false;
    bcgModoActualizacion = false;
    
    if (badge) {
      badge.innerText = 'No iniciado';
      badge.className = 'm05-badge-progreso';
    }
    if (alertBanner) alertBanner.style.display = 'none';
    
    document.getElementById('m05ResultsContainer').style.display = 'none';
    document.getElementById('m05WizardContainer').style.display = 'block';
    
    currentBcgStep = 1;
    renderBcgStepper();
    renderBcgBlock();
  }
}

async function adquirirBloqueoBCG() {
  if (!currentPlanId || !currentUser) return true;
  console.log('Intentando adquirir bloqueo para M05...');
  
  const { data } = await supabaseClient
    .from('matriz_bcg')
    .select('*')
    .eq('plan_id', currentPlanId)
    .single();
    
  if (data) {
    if (data.bloqueado_por && data.bloqueado_por !== currentUser.id) {
      mostrarModalBcgBloqueado(data.bloqueado_por_nombre);
      return false;
    }
  }
  
  const row = {
    plan_id: currentPlanId,
    usuario_id: currentUser.id,
    bloqueado_por: currentUser.id,
    bloqueado_por_nombre: currentUser.username,
    bloqueado_desde: new Date()
  };
  
  if (data) {
    const { error } = await supabaseClient
      .from('matriz_bcg')
      .update({
        bloqueado_por: row.bloqueado_por,
        bloqueado_por_nombre: row.bloqueado_por_nombre,
        bloqueado_desde: row.bloqueado_desde
      })
      .eq('plan_id', currentPlanId);
    if (error) {
      console.error('Error al bloquear:', error);
      return false;
    }
  } else {
    const { error } = await supabaseClient
      .from('matriz_bcg')
      .insert({
        plan_id: currentPlanId,
        usuario_id: currentUser.id,
        estado: 'en_edicion',
        datos_uen: bcgUensData,
        bloqueado_por: row.bloqueado_por,
        bloqueado_por_nombre: row.bloqueado_por_nombre,
        bloqueado_desde: row.bloqueado_desde
      });
    if (error) {
      console.error('Error al insertar con bloqueo:', error);
      return false;
    }
  }
  
  console.log('Bloqueo adquirido exitosamente.');
  return true;
}

async function liberarBloqueoBCG() {
  if (!currentPlanId || !currentUser) return;
  console.log('Liberando bloqueo para M05...');
  
  const { data } = await supabaseClient
    .from('matriz_bcg')
    .select('bloqueado_por')
    .eq('plan_id', currentPlanId)
    .single();
    
  if (data && data.bloqueado_por === currentUser.id) {
    const { error } = await supabaseClient
      .from('matriz_bcg')
      .update({
        bloqueado_por: null,
        bloqueado_por_nombre: null,
        bloqueado_desde: null
      })
      .eq('plan_id', currentPlanId);
    if (error) console.error('Error al liberar bloqueo:', error);
  }
}

window.mostrarModalBcgBloqueado = (nombre) => {
  const modal = document.getElementById('m05LockModal');
  const text = document.getElementById('m05LockText');
  if (modal && text) {
    text.innerHTML = `🔒 El módulo está siendo editado actualmente por el usuario <strong>${escapeHtml(nombre)}</strong>. Intente más tarde.`;
    modal.style.display = 'flex';
  }
  const bcgPrevBtn = document.getElementById('bcgPrevBtn');
  const bcgNextBtn = document.getElementById('bcgNextBtn');
  const bcgCancelBtn = document.getElementById('bcgCancelBtn');
  if (bcgPrevBtn) bcgPrevBtn.disabled = true;
  if (bcgNextBtn) bcgNextBtn.disabled = true;
  if (bcgCancelBtn) bcgCancelBtn.disabled = true;
  
  document.querySelectorAll('#m05WizardContainer input').forEach(inp => inp.disabled = true);
};

window.cerrarBcgModal = (id) => {
  const modal = document.getElementById(id);
  if (modal) modal.style.display = 'none';
  if (id === 'm05LockModal') {
    // Si se cierra el modal de bloqueo, redirigimos al dashboard
    const dbTab = document.querySelector('.nav-item[data-section="dashboard"]');
    if (dbTab) dbTab.click();
  }
};

async function iniciarRecalculoBCG() {
  cerrarBcgModal('m05ConfirmModal');
  const exito = await adquirirBloqueoBCG();
  if (exito) {
    // Guardar backup y limpiar datos para empezar desde cero
    bcgOriginalData = JSON.parse(JSON.stringify(bcgUensData));
    bcgUensData = bcgUensData.map(uen => ({
      nombre: uen.nombre,
      ventas_empresa: '',
      ventas_mercado_anterior: '',
      ventas_mercado_actual: '',
      nombre_competidor_lider: '',
      ventas_competidor_lider: ''
    }));
    const { error } = await supabaseClient
      .from('matriz_bcg')
      .update({ estado: 'en_edicion', datos_uen: bcgUensData })
      .eq('plan_id', currentPlanId);
      
    if (error) {
      alert('Error al iniciar recalculación: ' + error.message);
    } else {
      await cargarBCG();
    }
  }
}

function inicializarWizardBCG() {
  currentBcgStep = 1;
  actualizarTabsBCG();
  
  // Renderizar Paso 1 (Portafolio)
  const tbody1 = document.querySelector('#bcgTablePaso1 tbody');
  if (tbody1) {
    tbody1.innerHTML = bcgUensData.map((uen, idx) => `
      <tr>
        <td><strong>${uen.nombre}</strong></td>
        <td>
          <input type="number" min="0" step="any" class="bcg-ventas-empresa" data-idx="${idx}" value="${uen.ventas_empresa || ''}" placeholder="0.00">
        </td>
        <td style="text-align: center;"><span class="bcg-peso-porcentual" id="bcgPeso-${idx}">0.00%</span></td>
      </tr>
    `).join('');
  }
  
  // Renderizar Paso 2 (Crecimiento Mercado)
  const tbody2 = document.querySelector('#bcgTablePaso2 tbody');
  if (tbody2) {
    tbody2.innerHTML = bcgUensData.map((uen, idx) => `
      <tr>
        <td><strong>${uen.nombre}</strong></td>
        <td>
          <input type="number" min="0" step="any" class="bcg-mercado-anterior" data-idx="${idx}" value="${uen.ventas_mercado_anterior || ''}" placeholder="0.00">
        </td>
        <td>
          <input type="number" min="0" step="any" class="bcg-mercado-actual" data-idx="${idx}" value="${uen.ventas_mercado_actual || ''}" placeholder="0.00">
        </td>
      </tr>
    `).join('');
  }

  // Renderizar Paso 3 (Competencia Directa)
  const tbody3 = document.querySelector('#bcgTablePaso3 tbody');
  if (tbody3) {
    tbody3.innerHTML = bcgUensData.map((uen, idx) => `
      <tr>
        <td><strong>${uen.nombre}</strong></td>
        <td>
          <input type="text" class="bcg-competidor-nombre" data-idx="${idx}" value="${escapeHtml(uen.nombre_competidor_lider || '')}" placeholder="Nombre del rival líder">
        </td>
        <td>
          <input type="number" min="0" step="any" class="bcg-competidor-ventas" data-idx="${idx}" value="${uen.ventas_competidor_lider || ''}" placeholder="0.00">
        </td>
      </tr>
    `).join('');
  }

  // Escuchar inputs del Paso 1 para cálculo dinámico en tiempo real
  document.querySelectorAll('.bcg-ventas-empresa').forEach(input => {
    input.addEventListener('input', calcularPesosBCG);
  });
  
  // Habilitar controles si no hay bloqueo
  const execBtn = document.getElementById('m05ExecuteBtn');
  const draftBtn = document.getElementById('m05DraftBtn');
  const resetBtn = document.getElementById('m05ResetBtn');
  if (execBtn) execBtn.disabled = false;
  if (draftBtn) draftBtn.disabled = false;
  if (resetBtn) resetBtn.disabled = false;
  document.querySelectorAll('#m05WizardContainer input').forEach(inp => inp.disabled = false);

  // Calcular pesos iniciales
  calcularPesosBCG();
}

function calcularPesosBCG() {
  const inputs = document.querySelectorAll('.bcg-ventas-empresa');
  let total = 0;
  inputs.forEach(input => {
    const val = parseFloat(input.value) || 0;
    total += val;
  });
  
  inputs.forEach(input => {
    const idx = parseInt(input.getAttribute('data-idx'));
    const val = parseFloat(input.value) || 0;
    const pct = total > 0 ? ((val / total) * 100).toFixed(2) : '0.00';
    
    // Sincronizar peso y ventas en memoria
    bcgUensData[idx].ventas_empresa = val;
    bcgUensData[idx].peso_porcentual = parseFloat(pct);
    
    const pctEl = document.getElementById(`bcgPeso-${idx}`);
    if (pctEl) pctEl.innerText = `${pct}%`;
  });
  
  const totalEl = document.getElementById('bcgTotalVentasEmpresa');
  if (totalEl) {
    totalEl.innerText = `$${total.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
}

function actualizarTabsBCG() {
  document.querySelectorAll('.bcg-tab').forEach(tab => {
    tab.classList.remove('active');
  });
  document.querySelectorAll('.bcg-panel').forEach(panel => {
    panel.classList.remove('active');
  });
  
  const activeTabBtn = document.getElementById(`bcgTabBtn${currentBcgStep}`);
  if (activeTabBtn) activeTabBtn.classList.add('active');
  
  const activePanel = document.getElementById(`bcgPanel${currentBcgStep}`);
  if (activePanel) activePanel.classList.add('active');
  
  // Actualizar banner contextual
  const tipText = document.getElementById('m05TipText');
  if (tipText) {
    if (currentBcgStep === 1) {
      tipText.innerText = "Ingrese los ingresos por ventas anuales de cada servicio de ContaPerú en Lima para determinar el peso de la UEN.";
    } else if (currentBcgStep === 2) {
      tipText.innerText = "Ingrese las ventas anuales globales del mercado para determinar el crecimiento del mercado (Eje Y).";
    } else {
      tipText.innerText = "Registre el nombre y las ventas anuales del rival más fuerte de cada servicio para evaluar la cuota relativa (Eje X).";
    }
  }
}

function recolectarDatosWizardBCG() {
  // Paso 1
  document.querySelectorAll('.bcg-ventas-empresa').forEach(input => {
    const idx = parseInt(input.getAttribute('data-idx'));
    bcgUensData[idx].ventas_empresa = parseFloat(input.value) || 0;
  });
  
  // Paso 2
  document.querySelectorAll('.bcg-mercado-anterior').forEach(input => {
    const idx = parseInt(input.getAttribute('data-idx'));
    bcgUensData[idx].ventas_mercado_anterior = parseFloat(input.value) || 0;
  });
  document.querySelectorAll('.bcg-mercado-actual').forEach(input => {
    const idx = parseInt(input.getAttribute('data-idx'));
    bcgUensData[idx].ventas_mercado_actual = parseFloat(input.value) || 0;
  });

  // Paso 3
  document.querySelectorAll('.bcg-competidor-nombre').forEach(input => {
    const idx = parseInt(input.getAttribute('data-idx'));
    bcgUensData[idx].nombre_competidor_lider = input.value.trim();
  });
  document.querySelectorAll('.bcg-competidor-ventas').forEach(input => {
    const idx = parseInt(input.getAttribute('data-idx'));
    bcgUensData[idx].ventas_competidor_lider = parseFloat(input.value) || 0;
  });
}

async function guardarBorradorBCG() {
  recolectarDatosWizardBCG();
  
  const { error } = await supabaseClient
    .from('matriz_bcg')
    .upsert({
      plan_id: currentPlanId,
      usuario_id: currentUser.id,
      estado: 'en_edicion',
      datos_uen: bcgUensData,
      bloqueado_por: currentUser.id,
      bloqueado_por_nombre: currentUser.username,
      bloqueado_desde: new Date()
    }, { onConflict: 'plan_id' });
    
  if (error) {
    alert('Error al guardar borrador: ' + error.message);
  } else {
    alert('Borrador guardado correctamente. Módulo en estado "En edición".');
    await cargarBCG();
  }
}

async function ejecutarMatrizBCG() {
  recolectarDatosWizardBCG();
  
  let errorMsg = '';
  for (let i = 0; i < bcgUensData.length; i++) {
    const uen = bcgUensData[i];
    if (!uen.ventas_empresa || uen.ventas_empresa <= 0) {
      errorMsg = `El campo de Ventas Empresa para la UEN "${uen.nombre}" debe ser un número mayor a cero.`;
      break;
    }
    if (!uen.ventas_mercado_anterior || uen.ventas_mercado_anterior <= 0) {
      errorMsg = `El campo de Ventas Mercado Año Anterior para la UEN "${uen.nombre}" debe ser un número mayor a cero.`;
      break;
    }
    if (!uen.ventas_mercado_actual || uen.ventas_mercado_actual <= 0) {
      errorMsg = `El campo de Ventas Mercado Año Actual para la UEN "${uen.nombre}" debe ser un número mayor a cero.`;
      break;
    }
    if (!uen.nombre_competidor_lider) {
      errorMsg = `Debe ingresar el Nombre del Competidor Líder para la UEN "${uen.nombre}".`;
      break;
    }
    if (!uen.ventas_competidor_lider || uen.ventas_competidor_lider <= 0) {
      errorMsg = `El campo de Ventas Competidor Líder para la UEN "${uen.nombre}" debe ser un número mayor a cero.`;
      break;
    }
  }
  
  if (errorMsg) {
    const modal = document.getElementById('m05WarningModal');
    const warningText = document.getElementById('m05WarningText');
    if (modal && warningText) {
      warningText.innerText = errorMsg;
      modal.style.display = 'flex';
    }
    return;
  }
  
  const resultadosCalculados = BCGService.procesarMatriz(bcgUensData);
  
  await guardarSnapshotHistorialBCG();
  
  const { error } = await supabaseClient
    .from('matriz_bcg')
    .upsert({
      plan_id: currentPlanId,
      usuario_id: currentUser.id,
      estado: 'procesado',
      datos_uen: resultadosCalculados,
      bloqueado_por: null,
      bloqueado_por_nombre: null,
      bloqueado_desde: null
    }, { onConflict: 'plan_id' });
    
  if (error) {
    showToast('Error al ejecutar y generar Matriz BCG: ' + error.message, 'error');
    return;
  }
  
  try {
    await supabaseClient.from('plan_contenido').upsert({
      plan_id: currentPlanId,
      modulo_id: 'M05',
      contenido: resultadosCalculados,
      completado: true,
      completado_fecha: new Date()
    }, { onConflict: 'plan_id, modulo_id' });
    
    await supabaseClient.from('auditoria').insert({
      usuario_id: currentUser.id,
      modulo: 'M05',
      accion: activeBcgId ? 'ACTUALIZAR' : 'CREAR',
      detalle: `Se ${bcgbCargado ? 'actualizó' : 'generó'} la Matriz BCG para el plan.`
    });
    
    await guardarHistorialBCG(resultadosCalculados, 'MATRIZ_BCG');
  } catch (err) {
    console.error('Error al sincronizar plan_contenido/auditoria M05:', err);
  }
  
  showToast('Matriz BCG procesada y generada correctamente.', 'success');
  await cargarDashboard();
  await cargarBCG();
}

function reiniciarValoresBCG() {
  if (confirm('¿Está seguro de que desea reiniciar los valores del asistente? Esto borrará todos los campos editados.')) {
    bcgUensData = defaultBcgUens.map(nombre => ({
      nombre: nombre,
      ventas_empresa: '',
      ventas_mercado_anterior: '',
      ventas_mercado_actual: '',
      nombre_competidor_lider: '',
      ventas_competidor_lider: ''
    }));
    document.querySelectorAll('#m05WizardContainer input').forEach(inp => inp.disabled = false);
    currentBcgStep = 1;
    renderBcgStepper();
    renderBcgBlock();
  }
}

// ==================== NUEVAS FUNCIONES BCG (Diseño M04) ====================

function renderBcgStepper() {
  const steps = document.querySelectorAll('#bcgStepper .stepper-step');
  const labels = ['Portafolio y Ventas', 'Crecimiento Mercado', 'Competencia Directa'];

  const pasosCompletos = [false, false, false, false];
  for (let s = 1; s <= 3; s++) {
    pasosCompletos[s] = bcgStepIsComplete(s);
  }

  steps.forEach(stepEl => {
    const step = parseInt(stepEl.getAttribute('data-step'));
    stepEl.classList.remove('active', 'completed', 'locked');

    let unlocked = true;
    for (let prev = 1; prev < step; prev++) {
      if (!pasosCompletos[prev]) { unlocked = false; break; }
    }

    if (step === currentBcgStep) {
      stepEl.classList.add('active');
    } else if (pasosCompletos[step]) {
      stepEl.classList.add('completed');
    } else if (!unlocked) {
      stepEl.classList.add('locked');
    }
  });

  const progressLine = document.getElementById('bcgStepperProgressLine');
  if (progressLine) {
    let completed = 0;
    for (let s = 1; s <= 3; s++) if (pasosCompletos[s]) completed++;
    progressLine.style.width = Math.min((completed / 2) * 100, 100) + '%';
  }

  const labelEl = document.getElementById('bcgStepperCurrentLabel');
  if (labelEl) {
    labelEl.innerHTML = `<i class="bi bi-arrow-right-circle-fill"></i> Paso ${currentBcgStep} de 3: ${labels[currentBcgStep - 1]}`;
  }
}

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

function poblarTablasBCG() {
  const tbody1 = document.querySelector('#bcgTablePaso1 tbody');
  if (tbody1) {
    tbody1.innerHTML = bcgUensData.map((uen, idx) => `
      <tr>
        <td><strong>${uen.nombre}</strong></td>
        <td><input type="number" min="0" step="any" class="bcg-ventas-empresa" data-idx="${idx}" value="${uen.ventas_empresa || ''}" placeholder="0.00"></td>
        <td style="text-align: center;"><span class="bcg-peso-porcentual" id="bcgPeso-${idx}">${((parseFloat(uen.peso_porcentual) || 0) * 100).toFixed(2)}%</span></td>
      </tr>
    `).join('');
  }
  const tbody2 = document.querySelector('#bcgTablePaso2 tbody');
  if (tbody2) {
    tbody2.innerHTML = bcgUensData.map((uen, idx) => `
      <tr>
        <td><strong>${uen.nombre}</strong></td>
        <td><input type="number" min="0" step="any" class="bcg-mercado-anterior" data-idx="${idx}" value="${uen.ventas_mercado_anterior || ''}" placeholder="0.00"></td>
        <td><input type="number" min="0" step="any" class="bcg-mercado-actual" data-idx="${idx}" value="${uen.ventas_mercado_actual || ''}" placeholder="0.00"></td>
      </tr>
    `).join('');
  }
  const tbody3 = document.querySelector('#bcgTablePaso3 tbody');
  if (tbody3) {
    tbody3.innerHTML = bcgUensData.map((uen, idx) => `
      <tr>
        <td><strong>${uen.nombre}</strong></td>
        <td><input type="text" class="bcg-competidor-nombre" data-idx="${idx}" value="${escapeHtml(uen.nombre_competidor_lider || '')}" placeholder="Nombre del rival líder"></td>
        <td><input type="number" min="0" step="any" class="bcg-competidor-ventas" data-idx="${idx}" value="${uen.ventas_competidor_lider || ''}" placeholder="0.00"></td>
      </tr>
    `).join('');
  }
  calcularPesosBCG();
}

function renderBcgBlock() {
  document.getElementById('m05ResultsContainer').style.display = 'none';
  document.getElementById('m05WizardContainer').style.display = 'block';
  poblarTablasBCG();

  const cancelBtn = document.getElementById('bcgCancelBtn');
  if (cancelBtn) cancelBtn.style.display = bcgModoActualizacion ? '' : 'none';

  document.querySelectorAll('.bcg-panel').forEach(p => p.classList.remove('active'));
  document.getElementById(`bcgPanel${currentBcgStep}`).classList.add('active');

  const tipText = document.getElementById('m05TipText');
  if (tipText) {
    const tips = [
      'Ingrese los ingresos por ventas anuales de cada servicio de ContaPerú para determinar el peso de la UEN.',
      'Ingrese las ventas globales del mercado para determinar el crecimiento del mercado (Eje Y).',
      'Registre el nombre y las ventas del rival más fuerte de cada servicio para evaluar la cuota relativa (Eje X).'
    ];
    tipText.innerText = tips[currentBcgStep - 1];
  }

  const blockTitles = ['PORTAFOLIO Y VENTAS — PASO 1', 'CRECIMIENTO DE MERCADO — PASO 2', 'COMPETENCIA DIRECTA — PASO 3'];
  const tituloEl = document.getElementById('bcgBloqueTitulo');
  if (tituloEl) tituloEl.innerText = blockTitles[currentBcgStep - 1];

  let totalFields = 0, completedFields = 0;
  if (currentBcgStep === 1) {
    bcgUensData.forEach(u => { totalFields++; if (u.ventas_empresa && parseFloat(u.ventas_empresa) > 0) completedFields++; });
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

  const uensCountEl = document.getElementById('bcgUensCount');
  if (uensCountEl) uensCountEl.innerText = bcgUensData.length;

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

async function guardarSnapshotHistorialBCG() {
  try {
    const { data } = await supabaseClient
      .from('matriz_bcg')
      .select('datos_uen')
      .eq('plan_id', currentPlanId)
      .single();
    if (data?.datos_uen) {
      await supabaseClient.from('auditoria').insert({
        usuario_id: currentUser.id,
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
      usuario_id: currentUser.id,
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

async function mostrarResultadosBCG() {
  document.getElementById('m05WizardContainer').style.display = 'none';
  document.getElementById('m05ResultsContainer').style.display = 'block';

  document.getElementById('m05').scrollIntoView({ behavior: 'smooth', block: 'start' });

  // Summary cards
  const uensCount = bcgUensData.length;
  document.getElementById('bcgResultUensCount').innerText = uensCount;

  // Cuadrante dominante
  const cuadrantes = {};
  bcgUensData.forEach(u => {
    const c = u.cuadrante || '—';
    cuadrantes[c] = (cuadrantes[c] || 0) + 1;
  });
  let dominante = '—', maxCount = 0;
  for (const [c, count] of Object.entries(cuadrantes)) {
    if (count > maxCount) { dominante = c; maxCount = count; }
  }
  const cuadranteEl = document.getElementById('bcgResultCuadranteDominante');
  if (cuadranteEl) {
    cuadranteEl.innerText = dominante;
    cuadranteEl.className = 'clasificacion-total-premium';
    if (dominante === 'Estrella') cuadranteEl.style.color = '#2563eb';
    else if (dominante === 'Vaca') cuadranteEl.style.color = '#059669';
    else if (dominante === 'Incógnita') cuadranteEl.style.color = '#d97706';
    else if (dominante === 'Perro') cuadranteEl.style.color = '#dc2626';
  }
  const cuadranteTexto = document.getElementById('bcgResultCuadranteTexto');
  if (cuadranteTexto) cuadranteTexto.innerText = `${maxCount} de ${uensCount} UENs en este cuadrante`;

  // Cobertura
  const totalVentas = bcgUensData.reduce((s, u) => s + (parseFloat(u.ventas_empresa) || 0), 0);
  const totalMercado = bcgUensData.reduce((s, u) => s + (parseFloat(u.ventas_mercado_actual) || 0), 0);
  const cobertura = totalMercado > 0 ? ((totalVentas / totalMercado) * 100).toFixed(1) : '0.0';
  document.getElementById('bcgResultCobertura').innerText = `${cobertura}%`;
  document.getElementById('bcgResultCoberturaTexto').innerText = `Participación del portafolio sobre el mercado total`;

  // Button back
  const backBtn = document.getElementById('btnBackToBCG');
  if (backBtn) backBtn.style.display = '';

  renderBCGChart();
  renderBCGConclusions();
}

function renderBCGConclusions() {
  const tbody = document.querySelector('#bcgSummaryTable tbody');
  if (!tbody) return;
  
  tbody.innerHTML = bcgUensData.map(uen => {
    const cuadranteLower = (uen.cuadrante || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    let decisionClass = 'potenciar';
    if (uen.decision === 'MANTENER') decisionClass = 'mantener';
    else if (uen.decision === 'EVALUAR') decisionClass = 'evaluar';
    else if (uen.decision === 'REESTRUCTURAR O DESINVERTIR') decisionClass = 'reestructurar';
    
    return `
      <tr>
        <td><strong>${uen.nombre}</strong></td>
        <td><span class="bcg-badge-cuadrante ${cuadranteLower}">${uen.cuadrante || '—'}</span></td>
        <td>${uen.estrategia || '—'}</td>
        <td>${uen.inversion || '—'}</td>
        <td>${uen.rentabilidad || '—'}</td>
        <td><span class="bcg-decision-pill ${decisionClass}">${uen.decision || '—'}</span></td>
      </tr>
    `;
  }).join('');
}

function renderBCGChart() {
  const ctx = document.getElementById('bcgChart');
  if (!ctx) return;
  
  if (bcgChartInstance) {
    bcgChartInstance.destroy();
  }
  
  const datasets = bcgUensData.map(uen => {
    const prm = parseFloat(uen.prm) || 0;
    const tcm = parseFloat(uen.tcm) || 0;
    const peso = parseFloat(uen.peso_porcentual) || 0;
    
    // Mapear peso porcentual (0-100) al radio de la burbuja (10-45 px)
    const radio = Math.max(10, Math.min(45, (peso / 100) * 35 + 10));
    
    let bgColor = 'rgba(148, 163, 184, 0.4)';
    let borderColor = 'rgba(148, 163, 184, 1)';
    
    if (uen.cuadrante === 'Estrella') {
      bgColor = 'rgba(37, 99, 235, 0.6)';
      borderColor = 'rgba(37, 99, 235, 1)';
    } else if (uen.cuadrante === 'Vaca') {
      bgColor = 'rgba(16, 185, 129, 0.6)';
      borderColor = 'rgba(16, 185, 129, 1)';
    } else if (uen.cuadrante === 'Incógnita') {
      bgColor = 'rgba(245, 158, 11, 0.6)';
      borderColor = 'rgba(245, 158, 11, 1)';
    } else if (uen.cuadrante === 'Perro') {
      bgColor = 'rgba(239, 68, 68, 0.6)';
      borderColor = 'rgba(239, 68, 68, 1)';
    }
    
    return {
      label: uen.nombre,
      data: [{
        x: prm,
        y: tcm,
        r: radio
      }],
      backgroundColor: bgColor,
      borderColor: borderColor,
      borderWidth: 2,
      hoverBorderWidth: 3
    };
  });
  
  const bcgLinesPlugin = {
    id: 'bcgLines',
    afterDraw(chart) {
      const {ctx, chartArea: {top, bottom, left, right}, scales: {x, y}} = chart;
      ctx.save();
      
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 4]);
      
      // 1. Línea horizontal de corte en Y = 10%
      const yPixel = y.getPixelForValue(10);
      if (yPixel >= top && yPixel <= bottom) {
        ctx.beginPath();
        ctx.moveTo(left, yPixel);
        ctx.lineTo(right, yPixel);
        ctx.stroke();
      }
      
      // 2. Línea vertical de corte en X = 1.0
      const xPixel = x.getPixelForValue(1.0);
      if (xPixel >= left && xPixel <= right) {
        ctx.beginPath();
        ctx.moveTo(xPixel, top);
        ctx.lineTo(xPixel, bottom);
        ctx.stroke();
      }
      
      // Texto de los cuadrantes
      ctx.fillStyle = '#64748b';
      ctx.font = 'bold 13px Inter, sans-serif';
      
      // Estrella: Arriba Izquierda (con X revertida, PRM >= 1.0 es a la izquierda)
      ctx.fillText('ESTRELLA', left + 20, top + 30);
      
      // Incógnita: Arriba Derecha
      ctx.fillText('INCÓGNITA', right - 110, top + 30);
      
      // Vaca: Abajo Izquierda
      ctx.fillText('VACA LECHERA', left + 20, bottom - 25);
      
      // Perro: Abajo Derecha
      ctx.fillText('PERRO', right - 70, bottom - 25);
      
      ctx.restore();
    }
  };
  
  const tcms = bcgUensData.map(u => parseFloat(u.tcm) || 0);
  const maxTcm = Math.max(...tcms);
  const yMax = Math.max(20, Math.ceil((maxTcm + 5) / 5) * 5);
  
  bcgChartInstance = new Chart(ctx, {
    type: 'bubble',
    data: {
      datasets: datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          type: 'linear',
          min: -0.2,
          suggestedMax: 2.5,
          reverse: true, // RESTRICCIÓN DE UX CRÍTICA: Eje X invertido
          title: {
            display: true,
            text: 'Participación Relativa en el Mercado (PRM)',
            font: {
              size: 11,
              weight: 'bold',
              family: 'Inter'
            },
            color: '#1e293b'
          },
          ticks: {
            stepSize: 0.25,
            color: '#94a3b8'
          },
          grid: {
            color: '#f1f5f9'
          }
        },
        y: {
          min: -8,
          max: yMax + 5,
          title: {
            display: true,
            text: 'Tasa de Crecimiento del Mercado (TCM %)',
            font: {
              size: 11,
              weight: 'bold',
              family: 'Inter'
            },
            color: '#1e293b'
          },
          ticks: {
            stepSize: 5,
            color: '#94a3b8'
          },
          grid: {
            color: '#f1f5f9'
          }
        }
      },
      plugins: {
        legend: {
          display: true,
          position: 'bottom',
          labels: {
            usePointStyle: true,
            padding: 20,
            font: {
              size: 12,
              weight: 'bold',
              family: 'Inter'
            }
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const uenName = context.dataset.label;
              const prm = context.raw.x;
              const tcm = context.raw.y;
              const idx = bcgUensData.findIndex(u => u.nombre === uenName);
              const peso = idx !== -1 ? bcgUensData[idx].peso_porcentual : 0;
              
              return [
                `${uenName}`,
                `• Participación Relativa (PRM): ${prm}`,
                `• Tasa Crecimiento (TCM): ${tcm}%`,
                `• Peso en Ventas: ${peso}%`
              ];
            }
          }
        }
      }
    },
    plugins: [bcgLinesPlugin]
  });
}

// ==================== DASHBOARD ====================
async function cargarEstadoPlanes() {
  if (!currentPlanId) return;
  const { data: plan, error } = await supabaseClient.from('planes').select('*').eq('id', currentPlanId).single();
  const tbody = document.getElementById('estadoPlanesTbody');
  if (!tbody) return;
  if (error || !plan) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#94a3b8;padding:2rem;">No se encontró el plan.</td></tr>';
    return;
  }
  const estadoConfig = {
    borrador:    { color: '#475569', bg: '#f1f5f9', border: '#cbd5e1', label: 'Borrador' },
    en_revision: { color: '#92400e', bg: '#fffbeb', border: '#fde68a', label: 'En Revisión' },
    activo:      { color: '#065f46', bg: '#ecfdf5', border: '#a7f3d0', label: 'Activo' },
    cerrado:     { color: '#991b1b', bg: '#fef2f2', border: '#fca5a5', label: 'Cerrado' },
    rechazado:   { color: '#9a3412', bg: '#fff7ed', border: '#fed7aa', label: 'Rechazado' }
  };
  const iconos = { borrador:'bi-pencil', en_revision:'bi-hourglass-split', activo:'bi-check-circle-fill', cerrado:'bi-lock-fill', rechazado:'bi-x-circle-fill' };
  const cfg = estadoConfig[plan.estado] || estadoConfig.borrador;
  const icon = iconos[plan.estado] || 'bi-dot';
  const ultima = plan.fecha_aprobacion || plan.updated_at || plan.created_at || null;
  const fechaStr = ultima ? new Date(ultima).toLocaleDateString('es-PE', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '—';
  const mensaje = plan.mensaje_revision || '';
  tbody.innerHTML = `<tr>
    <td class="estado-plan-nombre">${escapeHtml(plan.nombre)} <span style="font-size:0.75rem;color:#94a3b8;">(${plan.anio})</span></td>
    <td><span class="estado-plan-badge" style="color:${cfg.color};background:${cfg.bg};border:1px solid ${cfg.border};"><i class="bi ${icon}"></i> ${cfg.label}</span></td>
    <td class="estado-plan-fecha">${fechaStr}</td>
    <td class="estado-plan-mensaje">${mensaje ? `<div class="estado-plan-msg"><i class="bi bi-chat-left-text-fill"></i> ${escapeHtml(mensaje)}</div>` : '<span style="color:#94a3b8;font-style:italic;">Sin mensaje</span>'}</td>
  </tr>`;
}

async function verificarPlanCompleto() {
  const btn = document.getElementById('solicitarAprobacionBtn');
  if (!btn) return;
  if (!isEditable) { btn.disabled = true; btn.title = 'El plan debe estar en borrador o rechazado para solicitar aprobación.'; return; }

  // Ejecutar todas las verificaciones en paralelo
  const [m01Res, contenidosRes, countObjRes, countKpiRes, countIniciativasRes, bcgRes] = await Promise.all([
    supabaseClient.from('empresa_contenido').select('mision, vision, valores').eq('id', 1).single(),
    supabaseClient.from('plan_contenido').select('modulo_id, completado').eq('plan_id', currentPlanId),
    supabaseClient.from('objetivos_generales').select('id', { count: 'exact', head: true }).eq('plan_id', currentPlanId),
    supabaseClient.from('kpis').select('id', { count: 'exact', head: true }).eq('plan_id', currentPlanId),
    supabaseClient.from('iniciativas').select('id', { count: 'exact', head: true }).eq('plan_id', currentPlanId),
    supabaseClient.from('matriz_bcg').select('estado').eq('plan_id', currentPlanId).maybeSingle()
  ]);

  const pendientes = [];

  const m01 = m01Res.data;
  if (!m01 || !m01.mision) pendientes.push('Misión corporativa');
  if (!m01 || !m01.vision) pendientes.push('Visión corporativa');
  if (!m01 || !Array.isArray(m01.valores) || m01.valores.length === 0) pendientes.push('Valores corporativos');

  const modulosRequeridos = ['M04', 'M06', 'M07', 'M08', 'M09'];
  const completadosMap = {};
  (contenidosRes.data || []).forEach(c => { completadosMap[c.modulo_id] = c.completado; });
  const modulosLabels = { M04:'Cadena de valor', M06:'5 Fuerzas de Porter', M07:'Análisis PEST', M08:'Matriz FODA', M09:'Matriz CAME' };
  for (const mod of modulosRequeridos) {
    if (!completadosMap[mod]) pendientes.push(modulosLabels[mod] || mod);
  }

  const m05Ok = !!completadosMap['M05'] || bcgRes.data?.estado === 'procesado';
  if (!m05Ok) pendientes.push('Matriz BCG');

  if (!countObjRes.count || countObjRes.count === 0) pendientes.push('Objetivos generales');
  if (!countKpiRes.count || countKpiRes.count === 0) pendientes.push('KPIs estratégicos');
  if (!countIniciativasRes.count || countIniciativasRes.count === 0) pendientes.push('Iniciativas estratégicas');

  if (pendientes.length > 0) {
    btn.disabled = true;
    btn.title = `Pendiente: ${pendientes.join(', ')}`;
  } else {
    btn.disabled = false;
    btn.title = 'Enviar plan a revisión del Aprobador';
  }
}

// ==================== DETECCIÓN DE PLANES VENCIDOS ====================

async function verificarPlanesVencidos() {
  if (!currentPlanId) return;
  const { data: plan } = await supabaseClient.from('planes').select('id, nombre, fecha_fin, estado').eq('id', currentPlanId).single();
  if (!plan || !plan.fecha_fin || plan.estado === 'cerrado' || plan.estado === 'rechazado') return;

  const hoy = new Date();
  const fin = new Date(plan.fecha_fin);
  if (fin.getTime() >= hoy.getTime()) return;

  const diffDays = Math.ceil((hoy.getTime() - fin.getTime()) / (1000 * 60 * 60 * 24));

  // Crear alerta si no existe ya una activa para este vencimiento
  const { data: existing } = await supabaseClient
    .from('alertas')
    .select('id')
    .eq('plan_id', plan.id)
    .eq('tipo', 'proyecto')
    .ilike('descripcion', `%vencido%`)
    .eq('revisado', false)
    .limit(1);

  if (!existing || existing.length === 0) {
    await supabaseClient.from('alertas').insert({
      plan_id: plan.id,
      tipo: 'proyecto',
      descripcion: `Plan "${plan.nombre}" vencido hace ${diffDays} día(s). Revise y actualice el cronograma.`,
      revisado: false,
      tiempo_restante: -diffDays,
      destinatario_id: currentUser.id
    });
  }
}

async function cargarDashboard() {
  const [planRes, contenidosRes, objetivosRes, kpisRes, iniciativasRes, bcgRes] = await Promise.all([
    supabaseClient.from('planes').select('fecha_fin, estado, fecha_inicio').eq('id', currentPlanId).single(),
    supabaseClient.from('plan_contenido').select('modulo_id, completado').eq('plan_id', currentPlanId),
    supabaseClient.from('objetivos_generales').select('id').eq('plan_id', currentPlanId),
    supabaseClient.from('kpis').select('id').eq('plan_id', currentPlanId),
    supabaseClient.from('iniciativas').select('id').eq('plan_id', currentPlanId),
    supabaseClient.from('matriz_bcg').select('estado').eq('plan_id', currentPlanId).maybeSingle()
  ]);

  const plan = planRes.data;

  let diasRestantes = '—';
  let desc = 'para el cierre del plan';
  const diasRestantesCard = document.getElementById('diasRestantes');
  const diasRestantesDesc = document.getElementById('diasRestantesDesc');
  if (plan && plan.fecha_fin) {
    const diffTime = new Date(plan.fecha_fin).getTime() - Date.now();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (plan.estado === 'cerrado') {
      diasRestantes = '0';
      desc = 'Plan cerrado. Modificaciones en estado crítico por demoras.';
      if (diasRestantesCard) diasRestantesCard.style.color = '#dc2626';
    } else if (diffDays < 0) {
      diasRestantes = Math.abs(diffDays);
      desc = 'días vencido. Plan en estado crítico.';
      if (diasRestantesCard) diasRestantesCard.style.color = '#dc2626';
    } else if (diffDays <= 7) {
      diasRestantes = diffDays;
      desc = 'días restantes. ¡Fecha límite próxima!';
      if (diasRestantesCard) diasRestantesCard.style.color = '#d97706';
    } else {
      diasRestantes = diffDays;
      desc = 'días restantes para el cierre del plan';
      if (diasRestantesCard) diasRestantesCard.style.color = '#059669';
    }
  }
  if (diasRestantesCard) diasRestantesCard.innerText = diasRestantes;
  if (diasRestantesDesc) diasRestantesDesc.innerText = desc;

  const criticoBanner = document.getElementById('planCriticoBanner');
  if (criticoBanner) {
    criticoBanner.style.display = (plan && plan.estado === 'cerrado') ? 'flex' : 'none';
  }

  const vencidoBanner = document.getElementById('planVencidoBanner');
  if (vencidoBanner) {
    const isOverdue = plan && plan.fecha_fin && new Date(plan.fecha_fin).getTime() < Date.now() && plan.estado !== 'cerrado';
    vencidoBanner.style.display = isOverdue ? 'flex' : 'none';
  }

  const completadosMap = {};
  (contenidosRes.data || []).forEach(c => { completadosMap[c.modulo_id] = c.completado; });

  const m03Ok = (objetivosRes.data || []).length > 0;
  const m04Ok = !!completadosMap['M04'];
  const m05Ok = !!completadosMap['M05'] || bcgRes.data?.estado === 'procesado';
  const m06Ok = !!completadosMap['M06'];
  const m07Ok = !!completadosMap['M07'];
  const m08Ok = !!completadosMap['M08'];
  const m09Ok = !!completadosMap['M09'];
  const kpisOk = (kpisRes.data || []).length > 0;
  const iniciativasOk = (iniciativasRes.data || []).length > 0;

  const modulos = [m03Ok, m04Ok, m05Ok, m06Ok, m07Ok, m08Ok, m09Ok, kpisOk, iniciativasOk];
  const completados = modulos.filter(Boolean).length;

  document.getElementById('modulosCompletados').innerText = completados;
  document.getElementById('totalObjetivos').innerText = (objetivosRes.data || []).length;
  document.getElementById('totalKPIs').innerText = (kpisRes.data || []).length;

  await Promise.all([
    cargarEstadoPlanes(),
    verificarPlanCompleto()
  ]);
}

// ==================== APROBACIÓN DEL PLAN ====================
async function cargarEstadoPlan() {
  const { data, error } = await supabaseClient.from('planes').select('estado, mensaje_revision').eq('id', currentPlanId).single();
  if (error) { console.error('Error cargando estado del plan:', error); return; }
  const msgDiv = document.getElementById('planEstadoMsg');
  const solicitarBtn = document.getElementById('solicitarAprobacionBtn');
  if (data.estado === 'borrador') {
    msgDiv.innerHTML = '<span class="badge-warning">Plan en borrador. Puede solicitar aprobación.</span>';
    await verificarPlanCompleto();
  }
  else if (data.estado === 'en_revision') {
    msgDiv.innerHTML = '<span class="badge-info"><i class="bi bi-hourglass-split"></i> Plan enviado a revisión. Esperando decisión del Aprobador. No se pueden realizar modificaciones hasta recibir respuesta.</span>';
    if (solicitarBtn) solicitarBtn.style.display = 'none';
  }
  else if (data.estado === 'activo') msgDiv.innerHTML = '<span class="badge-success">Plan aprobado y activo.</span>';
  else if (data.estado === 'rechazado') {
    const motivo = data.mensaje_revision ? `<br><small style="color:#92400e;font-style:italic;">Motivo del aprobador: "${escapeHtml(data.mensaje_revision)}"</small>` : '';
    msgDiv.innerHTML = `<span class="badge-danger"><i class="bi bi-x-circle-fill"></i> Plan rechazado por el Aprobador.${motivo}<br>Puede realizar correcciones y volver a enviar.</span>`;
    await verificarPlanCompleto();
  }
  else if (data.estado === 'cerrado') msgDiv.innerHTML = '<span class="badge-cerrado"><i class="bi bi-lock-fill"></i> Plan cerrado. Cualquier modificación se registrará en estado crítico por demoras.</span>';
  else msgDiv.innerHTML = '<span>Plan en estado desconocido.</span>';
}

async function solicitarAprobacion() {
  if (!isEditable) { alert('El plan ya no está en borrador'); return; }
  if (!confirm('¿Está seguro de enviar este plan a revisión? Una vez enviado, no podrá editarlo hasta que el Aprobador tome una decisión.')) return;

  const { error } = await supabaseClient.from('planes').update({ estado: 'en_revision' }).eq('id', currentPlanId);
  if (error) { alert('Error: ' + error.message); return; }

  // Crear alerta para el Aprobador
  const { data: plan } = await supabaseClient.from('planes').select('nombre').eq('id', currentPlanId).single();
  await supabaseClient.from('alertas').insert({
    plan_id: currentPlanId,
    tipo: 'iniciativa',
    descripcion: `El plan "${plan?.nombre || 'PETI'}" fue enviado a revisión por el Estratega. Requiere tu aprobación.`,
    revisado: false
  });

  alert('Plan enviado a revisión. El Aprobador ha sido notificado.');
  isEditable = false;
  await cargarDatosPlan();
  await actualizarBadgeNotificaciones();
}

// ==================== UI CONDICIONAL ====================
function toggleEditableUI() {
  const saveM01 = document.getElementById('saveM01');
  if (saveM01) saveM01.style.display = isEditable ? 'inline-block' : 'none';
  
  ['m06','m07','m08','m09'].forEach(mod => {
    const btn = document.getElementById(`save${mod.toUpperCase()}`);
    if (btn) btn.style.display = isEditable ? 'inline-block' : 'none';
  });
  const aprobarBtn = document.getElementById('solicitarAprobacionBtn');
  if (aprobarBtn) {
    aprobarBtn.style.display = isEditable ? 'inline-flex' : 'none';
  }
  const agregarKPI = document.getElementById('agregarKPI');
  if (agregarKPI) agregarKPI.style.display = isEditable ? 'inline-block' : 'none';
  const agregarIniciativa = document.getElementById('agregarIniciativa');
  if (agregarIniciativa) agregarIniciativa.style.display = isEditable ? 'inline-block' : 'none';
  const nuevoObjContainer = document.getElementById('nuevoObjetivoGeneralContainer');
  if (nuevoObjContainer) nuevoObjContainer.style.display = isEditable ? 'block' : 'none';
}

// ==================== EVENTOS Y NAVEGACIÓN ====================
function setupEventListeners() {
  // Botón para entrar al modo edición M01
  const editBtn = document.getElementById('m01EditBtn');
  if (editBtn) {
    editBtn.onclick = async () => {
      const { locked, username, isOwner } = await verificarBloqueoM01();
      if (locked && !isOwner) {
        alert(`El usuario "${username}" se encuentra editando la información de la empresa. Debes esperar a que finalice.`);
        return;
      }
      if (isOwner) {
        toggleM01View(true);
        return;
      }
      await adquirirBloqueoM01();
      toggleM01View(true);
    };
  }

  // Stepper navegación M01
  const m01Stepper = document.getElementById('m01Stepper');
  if (m01Stepper) {
    m01Stepper.onclick = (e) => {
      const stepEl = e.target.closest('.m01-step');
      if (stepEl) {
        const step = parseInt(stepEl.getAttribute('data-step'));
        const activeTextarea = document.getElementById('m01ActiveTextarea');
        if (currentStepM01 === 1 && activeTextarea) misionM01 = activeTextarea.value;
        else if (currentStepM01 === 2 && activeTextarea) visionM01 = activeTextarea.value;

        currentStepM01 = step;
        actualizarWizardM01();
      }
    };
  }

  // Textarea input character count M01
  const activeTextarea = document.getElementById('m01ActiveTextarea');
  if (activeTextarea) {
    activeTextarea.oninput = () => {
      const len = activeTextarea.value.length;
      document.getElementById('m01CharCounter').innerText = `${len} / 500 caracteres`;
      if (currentStepM01 === 1) misionM01 = activeTextarea.value;
      else if (currentStepM01 === 2) visionM01 = activeTextarea.value;
    };
  }

  // Anterior M01
  const m01PrevBtn = document.getElementById('m01PrevBtn');
  if (m01PrevBtn) {
    m01PrevBtn.onclick = () => {
      if (currentStepM01 > 1) {
        currentStepM01--;
        actualizarWizardM01();
      }
    };
  }

  // Siguiente/Guardar M01
  const m01NextBtn = document.getElementById('m01NextBtn');
  if (m01NextBtn) {
    m01NextBtn.onclick = async () => {
      const activeTextarea = document.getElementById('m01ActiveTextarea');
      if (currentStepM01 === 1) {
        if (activeTextarea) misionM01 = activeTextarea.value;
        currentStepM01 = 2;
        actualizarWizardM01();
      } else if (currentStepM01 === 2) {
        if (activeTextarea) visionM01 = activeTextarea.value;
        currentStepM01 = 3;
        actualizarWizardM01();
      } else if (currentStepM01 === 3) {
        await guardarM01();
      }
    };
  }

  // Habilitar/deshabilitar Guardar según contenido del textarea
  const m01Textarea = document.getElementById('m01ActiveTextarea');
  if (m01Textarea) {
    m01Textarea.addEventListener('input', () => actualizarEstadoBotonM01());
  }

  // Cancelar modificaciones M01
  const m01CancelEditBtn = document.getElementById('m01CancelEditBtn');
  if (m01CancelEditBtn) {
    m01CancelEditBtn.onclick = async () => {
      if (confirm('¿Está seguro de cancelar las modificaciones? Se perderán los cambios no guardados.')) {
        await liberarBloqueoM01();
        await cargarM01();
        await actualizarM01LockUI();
      }
    };
  }

  // Modal cerrar M01
  const cerrarModalValores = () => {
    const modal = document.getElementById('m01ValorModal');
    if (modal) modal.style.display = 'none';
  };
  
  const m01ModalCloseBtn = document.getElementById('m01ModalCloseBtn');
  if (m01ModalCloseBtn) m01ModalCloseBtn.onclick = cerrarModalValores;
  
  const m01ModalCancelBtn = document.getElementById('m01ModalCancelBtn');
  if (m01ModalCancelBtn) m01ModalCancelBtn.onclick = cerrarModalValores;

  // Modal guardar M01
  const m01ModalSaveBtn = document.getElementById('m01ModalSaveBtn');
  if (m01ModalSaveBtn) {
    m01ModalSaveBtn.onclick = () => {
      const titleInput = document.getElementById('m01ModalInputTitle');
      const descInput = document.getElementById('m01ModalInputDesc');
      const titulo = titleInput ? titleInput.value.trim() : '';
      const descripcion = descInput ? descInput.value.trim() : '';
      
      if (!titulo) {
        alert('Por favor ingrese el título del valor.');
        return;
      }
      
      if (activeEditValorIndex === null) {
        valoresM01.push({ titulo, descripcion });
      } else {
        valoresM01[activeEditValorIndex] = { titulo, descripcion };
      }
      
      cerrarModalValores();
      renderEditorValoresM01();
    };
  }

  // Mantener legacy save por si acaso pero ya no es necesario
  const saveM01 = document.getElementById('saveM01');
  if (saveM01) {
    saveM01.onclick = async () => {
      await guardarM01();
    };
  }

  // Eventos de control del Wizard M04 (Cadena de Valor)
  const prevBtn = document.getElementById('wizardPrevBtn');
  if (prevBtn) prevBtn.onclick = navegarAnterior;
  
  const nextBtn = document.getElementById('wizardNextBtn');
  if (nextBtn) nextBtn.onclick = navegarSiguiente;
  
  // Botón "Actualizar cadena valor" en pantalla de resultados
  const backBtn = document.getElementById('btnBackToWizard');
  if (backBtn) {
    backBtn.onclick = () => {
      respuestasM04 = {};
      m04ModoActualizacion = true;
      currentStepM04 = 1;
      determinarBloqueActual();
      renderStepper();
      renderWizardBlock();
    };
  }
  
  // Botón "Cancelar actualización" en wizard
  const cancelBtn = document.getElementById('wizardCancelBtn');
  if (cancelBtn) {
    cancelBtn.onclick = () => {
      if (m04CompletadoPreviamente || Object.keys(respuestasM04).length > 0) {
        document.getElementById('m04CancelConfirmModal').style.display = 'flex';
      } else {
        m04ModoActualizacion = false;
        cargarCadenaValor();
      }
    };
  }

  // Modal de confirmación de cancelar actualización M04
  const m04CancelConfirmBtn = document.getElementById('m04CancelConfirmBtn');
  if (m04CancelConfirmBtn) {
    m04CancelConfirmBtn.onclick = () => {
      document.getElementById('m04CancelConfirmModal').style.display = 'none';
      m04ModoActualizacion = false;
      cargarCadenaValor();
    };
  }
  const m04CancelCloseBtn = document.getElementById('m04CancelCloseBtn');
  if (m04CancelCloseBtn) {
    m04CancelCloseBtn.onclick = () => {
      document.getElementById('m04CancelConfirmModal').style.display = 'none';
    };
  }

  // Delegación de eventos para los clics en botones Likert
  const cuestionarioContainer = document.getElementById('cuestionarioM04');
  if (cuestionarioContainer) {
    cuestionarioContainer.onclick = async (e) => {
      const btn = e.target.closest('.btn-likert');
      if (btn) {
        if (!isObjetivosEditable()) {
          showToast('No se pueden modificar respuestas en un plan en revisión.', 'error');
          return;
        }
        const itemNum = parseInt(btn.getAttribute('data-item'));
        const score = parseInt(btn.getAttribute('data-val'));
        await responderPregunta(itemNum, score);
      }
    };
  }
  
  // Evento click en círculos del Stepper superior
  const stepper = document.getElementById('wizardStepper');
  if (stepper) {
    stepper.onclick = (e) => {
      const stepEl = e.target.closest('.stepper-step');
      if (stepEl) {
        if (stepEl.classList.contains('locked')) {
          return; // No hacer nada si está bloqueado secuencialmente
        }
        const step = parseInt(stepEl.getAttribute('data-step'));
        currentStepM04 = step;
        renderStepper();
        renderWizardBlock();
      }
    };
  }

  ['m06','m07','m08','m09'].forEach(mod => {
    document.getElementById(`save${mod.toUpperCase()}`).onclick = () => {
      let contenido;
      try { contenido = JSON.parse(document.getElementById(`${mod}Contenido`).value); }
      catch(e) { alert('JSON inválido'); return; }
      guardarModulo(mod.toUpperCase(), () => contenido);
    };
  });

  // Eventos BCG (M05)
  const btnBackToBCG = document.getElementById('btnBackToBCG');
  if (btnBackToBCG) {
    btnBackToBCG.onclick = () => {
      const modal = document.getElementById('m05ConfirmModal');
      if (modal) modal.style.display = 'flex';
    };
  }

  const bcgConfirmRecalcularBtn = document.getElementById('m05ConfirmRecalcularBtn');
  if (bcgConfirmRecalcularBtn) {
    bcgConfirmRecalcularBtn.onclick = async () => {
      await iniciarRecalculoBCG();
    };
  }

  const bcgPrevBtn = document.getElementById('bcgPrevBtn');
  if (bcgPrevBtn) {
    bcgPrevBtn.onclick = () => {
      navegarBcgAnterior();
    };
  }

  const bcgNextBtn = document.getElementById('bcgNextBtn');
  if (bcgNextBtn) {
    bcgNextBtn.onclick = async () => {
      await navegarBcgSiguiente();
    };
  }

  const bcgCancelBtn = document.getElementById('bcgCancelBtn');
  if (bcgCancelBtn) {
    bcgCancelBtn.onclick = () => {
      const modal = document.getElementById('bcgCancelConfirmModal');
      if (modal) modal.style.display = 'flex';
    };
  }

  const bcgCancelConfirmBtn = document.getElementById('bcgCancelConfirmBtn');
  if (bcgCancelConfirmBtn) {
    bcgCancelConfirmBtn.onclick = async () => {
      document.getElementById('bcgCancelConfirmModal').style.display = 'none';
      currentBcgStep = 1;
      bcgModoActualizacion = false;
      if (bcgOriginalData) {
        bcgUensData = JSON.parse(JSON.stringify(bcgOriginalData));
        bcgOriginalData = null;
        await Promise.all([
          supabaseClient
            .from('matriz_bcg')
            .update({ estado: 'procesado', datos_uen: bcgUensData, bloqueado_por: null, bloqueado_por_nombre: null, bloqueado_desde: null })
            .eq('plan_id', currentPlanId),
          liberarBloqueoBCG()
        ]);
      }
      await cargarBCG();
    };
  }

  const bcgCancelCloseBtn = document.getElementById('bcgCancelCloseBtn');
  if (bcgCancelCloseBtn) {
    bcgCancelCloseBtn.onclick = () => {
      document.getElementById('bcgCancelConfirmModal').style.display = 'none';
    };
  }

  // Delegated input listeners for BCG wizard tables (live data sync + stepper/progress update)
  document.getElementById('m05WizardContainer').addEventListener('input', (e) => {
    const target = e.target;
    const idx = parseInt(target.getAttribute('data-idx'));
    if (!isNaN(idx) && bcgUensData[idx]) {
      if (target.matches('.bcg-ventas-empresa')) {
        calcularPesosBCG();
      } else if (target.matches('.bcg-mercado-anterior')) {
        bcgUensData[idx].ventas_mercado_anterior = parseFloat(target.value) || 0;
      } else if (target.matches('.bcg-mercado-actual')) {
        bcgUensData[idx].ventas_mercado_actual = parseFloat(target.value) || 0;
      } else if (target.matches('.bcg-competidor-nombre')) {
        bcgUensData[idx].nombre_competidor_lider = target.value.trim();
      } else if (target.matches('.bcg-competidor-ventas')) {
        bcgUensData[idx].ventas_competidor_lider = parseFloat(target.value) || 0;
      }
    }
    renderBcgStepper();
    // Update progress bar + button states without re-populating tables
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
    // Update progress bar
    let totalFields = 0, completedFields = 0;
    if (currentBcgStep === 1) {
      bcgUensData.forEach(u => { totalFields++; if (u.ventas_empresa && parseFloat(u.ventas_empresa) > 0) completedFields++; });
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
  });

  document.getElementById('agregarObjetivoGeneral').onclick = () => {
    if (!isObjetivosEditable()) { showToast('No se pueden editar objetivos en un plan en revisión.', 'error'); return; }
    abrirModalObjetivo(null);
  };

  // Modal objetivo: Cerrar / Cancelar
  document.getElementById('objModalCloseBtn').onclick = cerrarObjModal;
  document.getElementById('objCancelBtn').onclick = cerrarObjModal;
  // Cerrar al hacer clic fuera del modal
  document.getElementById('objModal').addEventListener('click', (e) => { if (e.target === e.currentTarget) cerrarObjModal(); });

  // Modal objetivo: Añadir específico
  document.getElementById('objAddEspecBtn').onclick = agregarCampoEspecifico;

  // Modal objetivo: Guardar
  document.getElementById('objSaveBtn').onclick = guardarObjetivoModal;

  // Confirmación salir sin guardar
  document.getElementById('objConfirmStayBtn').onclick = cerrarObjConfirmModal;
  document.getElementById('objConfirmLeaveBtn').onclick = confirmarSalirSinGuardar;

  // Confirmación eliminar objetivo
  document.getElementById('objDeleteCancelBtn').onclick = cerrarObjDeleteModal;
  document.getElementById('objDeleteConfirmBtn').onclick = eliminarObjetivoConfirmado;

  // Marcar dirty al escribir en el campo general
  document.getElementById('objGeneralDesc').addEventListener('input', () => { objModalDirty = true; });

  document.getElementById('agregarKPI').onclick = () => window.agregarKPI();
  document.getElementById('agregarIniciativa').onclick = () => window.agregarIniciativa();
  document.getElementById('solicitarAprobacionBtn').onclick = () => solicitarAprobacion();
}

function setupNavigation() {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', async (e) => {
      e.preventDefault();
      const sectionId = item.getAttribute('data-section');
      const activeSection = document.querySelector('.section-content.active-section');

      if (activeSection && activeSection.id === 'm01' && sectionId !== 'm01') {
        await liberarBloqueoM01();
      }
      if (activeSection && activeSection.id === 'm05' && sectionId !== 'm05') {
        await liberarBloqueoBCG();
      }
      
      if (sectionId === 'm01') {
        await actualizarM01LockUI();
      } else if (sectionId === 'm05') {
        await cargarBCG();
        const { data } = await supabaseClient
          .from('matriz_bcg')
          .select('estado')
          .eq('plan_id', currentPlanId)
          .single();
        if (!data || data.estado === 'en_edicion') {
          await adquirirBloqueoBCG();
        }
      } else if (sectionId === 'notificaciones') {
        await cargarNotificacionesEstratega();
      }
      
      document.querySelectorAll('.section-content').forEach(sec => sec.classList.remove('active-section'));
      document.getElementById(sectionId).classList.add('active-section');
      document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
      item.classList.add('active');
    });
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>]/g, function(m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  });
}

// ==================== BLOQUEO CONCURRENTE M01 ====================
let m01HeartbeatInterval = null;
let m01LockPollInterval = null;

async function verificarBloqueoM01() {
  if (!currentUser) return { locked: false };
  try {
    const { data, error } = await supabaseClient.from('m01_bloqueo_edicion').select('*').eq('id', 1).single();
    if (error && error.code !== 'PGRST116') {
      console.error('Error verificando bloqueo M01:', error);
      return { locked: false };
    }
    if (!data || !data.usuario_id) return { locked: false };
    if (data.heartbeat) {
      const diff = Date.now() - new Date(data.heartbeat).getTime();
      if (diff > 60000) { try { await liberarBloqueoM01(); } catch (_) {} return { locked: false }; }
    }
    if (data.usuario_id !== currentUser.id) {
      return { locked: true, username: data.username };
    }
    return { locked: false, isOwner: true };
  } catch (_) { return { locked: false }; }
}

async function adquirirBloqueoM01() {
  try {
    const { error } = await supabaseClient.from('m01_bloqueo_edicion').upsert({
      id: 1,
      usuario_id: currentUser.id,
      username: currentUser.username,
      locked_at: new Date(),
      heartbeat: new Date()
    }, { onConflict: 'id' });
    if (error) throw error;
    startM01Heartbeat();
  } catch (_) { /* tabla no existe, se continúa sin bloqueo */ }
}

function startM01Heartbeat() {
  stopM01Heartbeat();
  m01HeartbeatInterval = setInterval(async () => {
    try { await supabaseClient.from('m01_bloqueo_edicion').update({ heartbeat: new Date() }).eq('id', 1).eq('usuario_id', currentUser.id); } catch (_) {}
  }, 30000);
}

function stopM01Heartbeat() {
  if (m01HeartbeatInterval) { clearInterval(m01HeartbeatInterval); m01HeartbeatInterval = null; }
}

async function liberarBloqueoM01() {
  stopM01Heartbeat();
  try { await supabaseClient.from('m01_bloqueo_edicion').update({ usuario_id: null, username: null, locked_at: null, heartbeat: null }).eq('id', 1); } catch (_) {}
}

async function actualizarM01LockUI() {
  const lockIndicator = document.getElementById('m01LockIndicator');
  const lockUser = document.getElementById('m01LockUser');
  const editBtn = document.getElementById('m01EditBtn');
  const { locked, username, isOwner } = await verificarBloqueoM01();

  if (locked && lockIndicator && lockUser && editBtn) {
    lockIndicator.style.display = 'inline';
    lockUser.innerText = username;
    editBtn.disabled = true;
    editBtn.title = `Otro estratega (${username}) está editando la información de la empresa. Debes esperar a que finalice.`;
    // Iniciar sondeo si no está corriendo
    if (!m01LockPollInterval) {
      m01LockPollInterval = setInterval(async () => {
        const res = await verificarBloqueoM01();
        if (!res.locked) {
          actualizarM01LockUI();
          clearInterval(m01LockPollInterval);
          m01LockPollInterval = null;
        }
      }, 10000);
    }
  } else if (isOwner && lockIndicator) {
    lockIndicator.style.display = 'none';
    if (editBtn) { editBtn.disabled = false; editBtn.title = ''; }
    if (m01LockPollInterval) { clearInterval(m01LockPollInterval); m01LockPollInterval = null; }
  } else {
    if (lockIndicator) lockIndicator.style.display = 'none';
    if (editBtn) { editBtn.disabled = false; editBtn.title = ''; }
    if (m01LockPollInterval) { clearInterval(m01LockPollInterval); m01LockPollInterval = null; }
  }
}

// ==================== NOTIFICACIONES ====================

async function actualizarBadgeNotificaciones() {
  const badge = document.getElementById('navNotifBadge');
  if (!badge) return;
  const { count } = await supabaseClient
    .from('alertas')
    .select('*', { count: 'exact', head: true })
    .eq('destinatario_id', currentUser.id)
    .eq('revisado', false);
  if (count > 0) {
    badge.style.display = 'inline-block';
    badge.innerText = count;
  } else {
    badge.style.display = 'none';
  }
}

async function cargarNotificacionesEstratega() {
  const container = document.getElementById('notificacionesEstrategaList');
  if (!container) return;

  const { data } = await supabaseClient
    .from('alertas')
    .select('*, planes!inner(nombre)')
    .or(`destinatario_id.eq.${currentUser.id},and(plan_id.not.is.null)`)
    .order('fecha_creacion', { ascending: false })
    .limit(50);

  // Filtrar: solo alertas para este usuario O alertas de planes creados por este usuario con origen en el Aprobador
  const relevantes = (data || []).filter(a =>
    a.destinatario_id === currentUser.id ||
    (a.tipo === 'escalada' && !a.revisado)
  );

  if (relevantes.length === 0) {
    container.innerHTML = '<div style="text-align:center;color:#94a3b8;padding:2rem;"><i class="bi bi-check-circle" style="font-size:2rem;display:block;margin-bottom:0.5rem;"></i>No tienes notificaciones pendientes</div>';
    return;
  }

  container.innerHTML = relevantes.map(a => `
    <div class="notif-card ${a.revisado ? 'notif-revisada' : 'notif-pendiente'}">
      <div class="notif-body">
        <strong>${a.tipo === 'escalada' ? '🔺 Escalado' : a.tipo === 'plan_enviado' ? '📋 Revisión' : '📢 ' + a.tipo}:</strong>
        <span>${a.descripcion}</span>
        <div style="display:flex;align-items:center;gap:0.5rem;margin-top:0.3rem;">
          <small style="color:#94a3b8;">${a.planes?.nombre || '—'}</small>
          <small style="color:#94a3b8;">· ${new Date(a.fecha_creacion).toLocaleString()}</small>
          ${a.comentario ? `<small style="color:#475569;font-style:italic;">· "${a.comentario}"</small>` : ''}
        </div>
      </div>
      ${!a.revisado ? `<button class="btn-small btn-primary" onclick="marcarNotifRevisada(${a.id})"><i class="bi bi-check-lg"></i> Marcar leída</button>` : `<span style="color:#22c55e;font-size:0.8rem;"><i class="bi bi-check-circle-fill"></i> Leída</span>`}
    </div>
  `).join('');

  await actualizarBadgeNotificaciones();
}

window.marcarNotifRevisada = async (id) => {
  await supabaseClient.from('alertas').update({ revisado: true, revisado_por: currentUser.username, fecha_revision: new Date() }).eq('id', id);
  await cargarNotificacionesEstratega();
};