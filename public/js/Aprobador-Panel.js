let supabaseClient;

let currentUser = null;
let currentAprobarPlanId = null;
let currentTabPlanes = 'todos';

let selectedReportPlanId = null;
let comentariosPorModulo = {};

function cerrarModalAbierto() {
  const modales = document.querySelectorAll('.modal[style*="flex"]');
  modales.forEach(m => m.style.display = 'none');
}

function showToast(message, type = 'info') {
  const existing = document.querySelector('.peti-toast');
  if (existing) existing.remove();
  if (type === 'success') cerrarModalAbierto();

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

async function insertAuditoria(accion, detalle) {
  try {
    const { error } = await supabaseClient.from('auditoria').insert({
      usuario_id: currentUser.id || null,
      modulo: 'planes',
      accion: accion,
      detalle: detalle,
      usuario_email: currentUser.email || currentUser.username + '@contaperu.pe',
      usuario_nombre: currentUser.username || null
    });
    if (error) {
      console.error('Error insertando auditoría:', error);
      console.warn('⚠️ RLS en tabla auditoria está bloqueando el INSERT. Ejecuta el SQL de corrección en Supabase Dashboard.');
    }
  } catch (e) {
    console.error('Excepción insertando auditoría:', e);
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  try {
    if (typeof window.supabase !== 'undefined' && window.supabase.createClient) {
      supabaseClient = window.supabase.createClient(window.CONFIG.SUPABASE_URL, window.CONFIG.SUPABASE_ANON_KEY);
    } else {
      throw new Error('window.supabase no disponible');
    }
  } catch (e) {
    console.error('Error al crear Supabase client:', e);
  }

  const session = localStorage.getItem('peti_session');
  if (!session) { window.location.href = '../index.html'; return; }
  currentUser = JSON.parse(session);
  if (currentUser.role !== 'aprobador') { showToast('No tienes permiso para acceder a este panel.', 'error'); window.location.href = '../index.html'; return; }

  // Restaurar sesión de Supabase para que las queries incluyan el token JWT
  await supabaseClient.auth.getSession();

  const { data: userRecord, error: userLookupError } = await supabaseClient.from('usuarios').select('id,email').eq('auth_user_id', currentUser.user_id).maybeSingle();
  if (userLookupError) console.error('Error buscando usuario:', userLookupError);
  if (userRecord) { currentUser.id = userRecord.id; currentUser.email = userRecord.email; }
  else { console.warn('No se encontró registro en tabla usuarios para auth_user_id:', currentUser.user_id); }
  document.getElementById('userNameDisplay').innerText = currentUser.username;

  // Carga inicial paralelizada
  await Promise.all([
    cargarDashboard(),
    cargarActualizacionesRecientes(),
    cargarPlanesGenerados(),
    cargarM01Global(),
    verificarPlanesVencidos()
  ]);
  await actualizarBadges();

  // Verificar planes vencidos cada 5 minutos
  setInterval(verificarPlanesVencidos, 5 * 60 * 1000);

  // Navegación sidebar
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', async (e) => {
      e.preventDefault();
      const sectionId = item.getAttribute('data-section');
      if (sectionId === 'aprobar') await cargarAprobarPlanes();
      if (sectionId === 'empresa') await cargarM01Global();
      if (sectionId === 'planes') await cargarPlanesGenerados();

      document.querySelectorAll('.section-content').forEach(sec => sec.classList.remove('active-section'));
      document.getElementById(sectionId).classList.add('active-section');
      document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
      item.classList.add('active');
    });
  });

  // Logout con confirmación
  document.getElementById('logoutBtn').addEventListener('click', () => {
    document.getElementById('confirmarLogoutModal').style.display = 'flex';
  });

  document.getElementById('currentDate').innerText = `Último acceso: ${new Date().toLocaleString()}`;

  // Rechazo modal
  document.getElementById('rechazoConfirmBtn').addEventListener('click', confirmarRechazo);
  document.getElementById('rechazoCancelBtn').addEventListener('click', () => { document.getElementById('rechazoModal').style.display = 'none'; });

  // Obs modal
  document.getElementById('obsConfirmBtn').addEventListener('click', confirmarAprobacionConObs);
  document.getElementById('obsCancelBtn').addEventListener('click', () => { document.getElementById('observacionModal').style.display = 'none'; });

  // Nuevo plan
  document.getElementById('nuevoPlanBtn').addEventListener('click', abrirModalNuevoPlan);
  document.getElementById('nuevoPlanSaveBtn').addEventListener('click', crearNuevoPlan);
  document.getElementById('nuevoPlanCancelBtn').addEventListener('click', () => { document.getElementById('nuevoPlanModal').style.display = 'none'; });

  // Editar nombre y descripción del plan
  document.getElementById('editarNombreCancelBtn').addEventListener('click', () => { document.getElementById('editarNombrePlanModal').style.display = 'none'; });
  document.getElementById('editarNombreSaveBtn').addEventListener('click', async () => {
    const planId = document.getElementById('editarNombrePlanId').value;
    const nuevoNombre = document.getElementById('editarNombreInput').value.trim();
    const nuevaDescripcion = document.getElementById('editarDescripcionInput').value.trim();
    if (!nuevoNombre) { showToast('El nombre no puede estar vacío.', 'error'); return; }

    const { data: plan } = await supabaseClient.from('planes').select('nombre, descripcion').eq('id', planId).single();
    if (!plan) { showToast('Plan no encontrado.', 'error'); return; }

    if (plan.nombre === nuevoNombre && (plan.descripcion || '') === nuevaDescripcion) {
      showToast('No se encontraron cambios.', 'info'); return;
    }

    const updates = { nombre: nuevoNombre };
    if (nuevaDescripcion !== (plan.descripcion || '')) updates.descripcion = nuevaDescripcion || null;

    const { error } = await supabaseClient.from('planes').update(updates).eq('id', planId);
    if (error) { showToast('Error al actualizar: ' + error.message, 'error'); return; }

    let auditMsg = `Plan ID ${planId} actualizado`;
    if (plan.nombre !== nuevoNombre) auditMsg += `: nombre cambiado de "${plan.nombre}" a "${nuevoNombre}"`;
    if ((plan.descripcion || '') !== nuevaDescripcion) auditMsg += `, descripción modificada`;
    await insertAuditoria('Editar plan', auditMsg);

    document.getElementById('editarNombrePlanModal').style.display = 'none';
    showToast('Plan actualizado exitosamente.', 'success');
    await cargarPlanesGenerados();
  });

  // Tabs Planes
  document.querySelectorAll('#planesTabs .itab').forEach(tab => {
    tab.addEventListener('click', async () => {
      document.querySelectorAll('#planesTabs .itab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentTabPlanes = tab.getAttribute('data-tab');
      await cargarPlanesGenerados();
    });
  });

  // Reportes: selector de plan
  document.getElementById('reportePlanSelector').addEventListener('change', async function() {
    selectedReportPlanId = this.value ? parseInt(this.value) : null;
    await onPlanSeleccionado();
  });

  // Modal detalles actualización
  document.getElementById('detallesCerrarBtn').addEventListener('click', async function() {
    const tipo = this.getAttribute('data-tipo-reporte');
    document.getElementById('detallesActualizacionModal').style.display = 'none';
    if (tipo && selectedReportPlanId) {
      await registrarLectura(selectedReportPlanId, tipo);
    }
  });
});

// ==================== BADGES ====================

async function actualizarBadges() {
  const { count } = await supabaseClient.from('planes').select('id', { count: 'exact', head: true }).eq('estado', 'en_revision');
  const badgeA = document.getElementById('navAprobarBadge');
  if (badgeA) { if (count > 0) { badgeA.style.display = 'inline-block'; badgeA.innerText = count; } else badgeA.style.display = 'none'; }
}

// ==================== DASHBOARD ====================

async function cargarDashboard() {
  const { data: planes } = await supabaseClient.from('planes').select('estado');
  if (!planes) return;
  document.getElementById('totalPlanes').innerText = planes.length;
  document.getElementById('planesActivos').innerText = planes.filter(p => p.estado === 'activo').length;
  document.getElementById('planesEnRevision').innerText = planes.filter(p => p.estado === 'en_revision').length;
  document.getElementById('planesBorradores').innerText = planes.filter(p => p.estado === 'borrador').length;
}

// ==================== DETECCIÓN DE PLANES VENCIDOS ====================

async function verificarPlanesVencidos() {
  const hoy = new Date().toISOString().split('T')[0];
  const { data: planes } = await supabaseClient
    .from('planes')
    .select('id, nombre, fecha_fin, estado')
    .lt('fecha_fin', hoy)
    .not('estado', 'in', '(cerrado,rechazado)');

  if (!planes || planes.length === 0) return;

  for (const plan of planes) {
    // Crear alerta de vencimiento si no existe ya una activa
    const { data: existing } = await supabaseClient
      .from('alertas')
      .select('id')
      .eq('plan_id', plan.id)
      .eq('tipo', 'proyecto')
      .ilike('descripcion', `%vencido%`)
      .eq('revisado', false)
      .limit(1);

    if (!existing || existing.length === 0) {
      const diffDays = Math.ceil((Date.now() - new Date(plan.fecha_fin).getTime()) / (1000 * 60 * 60 * 24));
      await supabaseClient.from('alertas').insert({
        plan_id: plan.id,
        tipo: 'proyecto',
        descripcion: `Plan "${plan.nombre}" vencido hace ${diffDays} día(s). Se requiere atención inmediata.`,
        revisado: false,
        tiempo_restante: -diffDays
      });
      await insertAuditoria('Alerta automática', `Plan ID ${plan.id} ("${plan.nombre}") marcado como vencido (${diffDays} días de retraso).`);
    }
  }
}

async function cargarActualizacionesRecientes() {
  const { data } = await supabaseClient
    .from('plan_contenido')
    .select('*, planes!inner(nombre), modulos!inner(nombre)')
    .not('completado_fecha', 'is', null)
    .order('completado_fecha', { ascending: false })
    .limit(25);
  const tbody = document.getElementById('recentUpdatesBody');
  if (!data || data.length === 0) { tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#94a3b8;padding:2rem;">No hay actualizaciones recientes</td></tr>'; return; }
  tbody.innerHTML = data.map(pc => `
    <tr>
      <td><strong>${pc.planes?.nombre || 'Plan #' + pc.plan_id}</strong></td>
      <td>${pc.modulos?.nombre || pc.modulo_id}</td>
      <td><span class="${pc.completado ? 'badge-active' : 'badge-inactive'}">${pc.completado ? 'Completado' : 'Pendiente'}</span></td>
      <td>${pc.completado_fecha ? new Date(pc.completado_fecha).toLocaleString() : '—'}</td>
    </tr>`).join('');
}

// ==================== INFO EMPRESA (M01 global) ====================

let cachedM01 = null;

async function cargarM01Global() {
  if (cachedM01) {
    renderM01(cachedM01);
    return;
  }
  try {
    const [empresaRes, globalRes] = await Promise.all([
      supabaseClient.from('empresa').select('*').eq('id', 1).single(),
      supabaseClient.from('empresa_contenido').select('*').eq('id', 1).single()
    ]);
    cachedM01 = { empresa: empresaRes.data, contenido: globalRes.data };
    renderM01(cachedM01);
  } catch (err) { console.error(err); }
}

function renderM01(data) {
  const empresa = data.empresa || {};
  const contenido = data.contenido || {};
  document.getElementById('aNombre').innerText = empresa.nombre || 'ContaPerú S.A.C.';
  document.getElementById('aSector').innerText = empresa.sector || 'Servicios contables';
  document.getElementById('aMision').innerText = contenido.mision || 'No se ha registrado la misión.';
  document.getElementById('aVision').innerText = contenido.vision || 'No se ha registrado la visión.';
  const valores = Array.isArray(contenido.valores) ? contenido.valores : [];
  const container = document.getElementById('aValores');
  if (valores.length === 0) {
    container.innerHTML = '<div class="valor-card" style="flex:1;">No se han registrado valores corporativos aún.</div>';
  } else {
    container.innerHTML = valores.map(v => `<div class="valor-card"><div class="valor-titulo">${v.titulo || v}</div><div class="valor-desc">${v.descripcion || ''}</div></div>`).join('');
  }
}

// ==================== APROBAR PLAN ====================

async function cargarAprobarPlanes() {
  const [modulosResult, planesResult] = await Promise.all([
    supabaseClient.from('modulos').select('*').order('orden'),
    supabaseClient.from('planes').select('*, usuarios!creado_por(username)').eq('estado', 'en_revision').order('created_at', { ascending: true })
  ]);

  const modulos = modulosResult.data || [];
  const planes = planesResult.data || [];

  if (!cachedM01) {
    const [empresaRes, globalRes] = await Promise.all([
      supabaseClient.from('empresa').select('*').eq('id', 1).single(),
      supabaseClient.from('empresa_contenido').select('*').eq('id', 1).single()
    ]);
    cachedM01 = { empresa: empresaRes.data, contenido: globalRes.data };
  }
  const global = cachedM01?.contenido || {};

  const container = document.getElementById('aprobarPlanesList');
  if (!container) return;

  if (!planes || planes.length === 0) {
    document.getElementById('aprobarSubtitle').innerText = '0 planes esperando tu revisión';
    container.innerHTML = '<div style="text-align:center;color:#94a3b8;padding:2rem;"><i class="bi bi-check-circle" style="font-size:2.5rem;display:block;margin-bottom:0.5rem;"></i>No hay planes pendientes de aprobación</div>';
    document.getElementById('lecturaModulosPanel').style.display = 'none';
    document.getElementById('metPendientes').innerText = '0';
    document.getElementById('metAprobados').innerText = '0';
    document.getElementById('metRechazados').innerText = '0';
    document.getElementById('metTiempoProm').innerText = '—';
    return;
  }
  document.getElementById('aprobarSubtitle').innerText = `${planes.length} plan(es) esperando tu revisión · Ordenados por fecha de envío`;

  // Metricas — paralelo
  const ahora = new Date().getFullYear();
  const [aprobadosRes, rechazadosRes, historialRes] = await Promise.all([
    supabaseClient.from('planes').select('id', { count: 'exact', head: true }).eq('estado', 'activo').gte('fecha_aprobacion', `${ahora}-01-01`),
    supabaseClient.from('planes').select('id', { count: 'exact', head: true }).eq('estado', 'rechazado').gte('fecha_aprobacion', `${ahora}-01-01`),
    supabaseClient.from('planes').select('fecha_aprobacion, created_at').eq('estado', 'activo').not('fecha_aprobacion', 'is', null).order('fecha_aprobacion', { ascending: false }).limit(50)
  ]);

  let tiempoProm = '—';
  const historial = historialRes.data || [];
  if (historial.length > 0) {
    const dias = historial.map(p => (new Date(p.fecha_aprobacion) - new Date(p.created_at)) / 86400000).filter(d => d >= 0);
    if (dias.length > 0) tiempoProm = Math.round(dias.reduce((a, b) => a + b, 0) / dias.length) + 'd';
  }
  document.getElementById('metPendientes').innerText = planes.length;
  document.getElementById('metAprobados').innerText = aprobadosRes.count || 0;
  document.getElementById('metRechazados').innerText = rechazadosRes.count || 0;
  document.getElementById('metTiempoProm').innerText = tiempoProm;

  // Batch: obtener plan_contenido de todos los planes en una sola query
  const planIds = planes.map(p => p.id);
  const { data: allContenidos } = await supabaseClient
    .from('plan_contenido')
    .select('plan_id, modulo_id, completado')
    .in('plan_id', planIds);

  const contenidosByPlan = {};
  (allContenidos || []).forEach(c => {
    if (!contenidosByPlan[c.plan_id]) contenidosByPlan[c.plan_id] = [];
    contenidosByPlan[c.plan_id].push(c);
  });

  container.innerHTML = '';
  for (const plan of planes) {
    const contenidos = contenidosByPlan[plan.id] || [];
    const compMap = Object.fromEntries(contenidos.map(c => [c.modulo_id, c.completado]));
    if (!!global.mision?.trim()) compMap['M01'] = true;
    if (!!global.vision?.trim()) compMap['M02'] = true;
    if (Array.isArray(global.valores) && global.valores.length > 0) compMap['M03'] = true;
    const completados = Object.values(compMap).filter(Boolean).length;
    const pct = modulos.length ? Math.round((completados / modulos.length) * 100) : 0;
    const diasDesde = Math.round((Date.now() - new Date(plan.created_at)) / 86400000);
    const isUrgente = diasDesde >= 3;

    const modChips = modulos.map(m => {
      const ok = compMap[m.id];
      return `<span class="mod-chip ${ok ? 'mod-ok' : 'mod-pend'}">${m.id}</span>`;
    }).join('');

    const card = document.createElement('div');
    card.className = `plan-card ${isUrgente ? 'urgente' : ''}`;
    card.innerHTML = `
      <div class="plan-card-header">
        <span class="pill ${isUrgente ? 'pill-amber' : 'pill-gray'}">En revisión${isUrgente ? ' · urgente' : ''}</span>
        <div class="plan-card-name">${plan.nombre}</div>
        <span style="font-size:0.7rem;color:#94a3b8;">Enviado hace ${diasDesde} día(s)</span>
      </div>
      <div class="plan-card-meta">
        Creado por: ${plan.usuarios?.username || '—'} (Estratega) · ${completados}/${modulos.length} módulos · Plan: ${plan.anio}
      </div>
      <div class="mod-chips">${modChips}</div>
      <div class="progress-bar-wrap"><div class="progress-bar-fill" style="width:${pct}%;background:${pct >= 100 ? '#27500A' : '#3b82f6'};"></div></div>
      <div class="plan-actions">
        <button class="btn-small btn-secondary" onclick="verResumenEjecutivo(${plan.id})"><i class="bi bi-eye"></i> Ver resumen</button>
        <button class="btn-small btn-secondary" onclick="leerModulosInline(${plan.id})"><i class="bi bi-book"></i> Leer módulos</button>
        <button class="btn-small btn-danger" onclick="abrirModalRechazo(${plan.id})"><i class="bi bi-x-circle"></i> Rechazar</button>
        <button class="btn-small btn-amber" onclick="abrirModalObs(${plan.id})"><i class="bi bi-journal-check"></i> Aprobar con obs.</button>
        <button class="btn-small btn-primary" onclick="aprobarPlan(${plan.id})"><i class="bi bi-check-lg"></i> Aprobar plan</button>
      </div>`;
    container.appendChild(card);
  }
  document.getElementById('lecturaModulosPanel').style.display = 'none';
}

async function aprobarPlan(planId) {
  if (!confirm('¿Está seguro de aprobar este plan? Pasará a estado activo.')) return;
  const { error } = await supabaseClient.from('planes').update({ estado: 'activo', aprobado_por: currentUser.id, fecha_aprobacion: new Date() }).eq('id', planId);
  if (error) { showToast('Error al aprobar el plan: ' + error.message, 'error'); return; }
  await insertAuditoria('Aprobar plan', `Plan ID ${planId} aprobado`);
  showToast('Plan aprobado exitosamente.', 'success');
  await cargarAprobarPlanes();
  await actualizarBadges();
}

window.aprobarPlan = aprobarPlan;

function abrirModalRechazo(planId) {
  currentAprobarPlanId = planId;
  document.getElementById('rechazoPlanId').value = planId;
  document.getElementById('motivoRechazo').value = '';
  document.getElementById('rechazoModal').style.display = 'flex';
}

window.abrirModalRechazo = abrirModalRechazo;

async function confirmarRechazo() {
  const planId = document.getElementById('rechazoPlanId').value;
  const motivo = document.getElementById('motivoRechazo').value.trim();
  if (!motivo) { showToast('Debe ingresar un motivo de rechazo.', 'error'); return; }
  const { error } = await supabaseClient.from('planes').update({ estado: 'rechazado', aprobado_por: currentUser.id, fecha_aprobacion: new Date() }).eq('id', planId);
  if (error) { showToast('Error: ' + error.message, 'error'); return; }
  try { await supabaseClient.from('planes').update({ mensaje_revision: motivo }).eq('id', planId); } catch (_) {}
  await insertAuditoria('Rechazar plan', `Plan ID ${planId} rechazado. Motivo: ${motivo}`);
  document.getElementById('rechazoModal').style.display = 'none';
  showToast('Plan rechazado.', 'success');
  await cargarAprobarPlanes();
  await cargarDashboard();
  await actualizarBadges();
}

function abrirModalObs(planId) {
  currentAprobarPlanId = planId;
  document.getElementById('observacionPlanId').value = planId;
  document.getElementById('observacionTexto').value = '';
  document.getElementById('observacionModal').style.display = 'flex';
}

window.abrirModalObs = abrirModalObs;

async function confirmarAprobacionConObs() {
  const planId = document.getElementById('observacionPlanId').value;
  const obs = document.getElementById('observacionTexto').value.trim();
  const { error } = await supabaseClient.from('planes').update({ estado: 'activo', aprobado_por: currentUser.id, fecha_aprobacion: new Date() }).eq('id', planId);
  if (error) { showToast('Error: ' + error.message, 'error'); return; }
  try { await supabaseClient.from('planes').update({ mensaje_revision: obs || null }).eq('id', planId); } catch (_) {}
    await insertAuditoria('Aprobar con observaciones', `Plan ID ${planId} aprobado. Obs: ${obs || 'Sin observaciones'}`);
  if (obs) {
    const { data: plan } = await supabaseClient.from('planes').select('nombre, creado_por').eq('id', planId).single();
    await supabaseClient.from('alertas').insert({ plan_id: planId, tipo: 'iniciativa', descripcion: `Plan "${plan?.nombre}" aprobado con observaciones: "${obs}"`, revisado: false, destinatario_id: plan?.creado_por || null });
  }
  document.getElementById('observacionModal').style.display = 'none';
  showToast('Plan aprobado con observaciones.', 'success');
  await cargarAprobarPlanes();
  await cargarDashboard();
  await actualizarBadges();
}

// ==================== LECTURA INLINE (ACCORDION) ====================

async function leerModulosInline(planId) {
  const panel = document.getElementById('lecturaModulosPanel');
  const { data: modulos } = await supabaseClient.from('modulos').select('*').order('orden');
  const { data: contenidos } = await supabaseClient.from('plan_contenido').select('modulo_id, contenido, completado').eq('plan_id', planId);
  const contMap = Object.fromEntries(contenidos?.map(c => [c.modulo_id, c]) || []);
  comentariosPorModulo = {};

  let html = `<div class="lectura-header"><h3 style="font-size:1rem;">Lectura del Plan #${planId}</h3><button class="btn-small btn-secondary" onclick="document.getElementById('lecturaModulosPanel').style.display='none'"><i class="bi bi-x-lg"></i> Cerrar</button></div>`;
  for (const m of modulos) {
    const c = contMap[m.id];
    let texto;
    if (m.id === 'M09') {
      const { data: fodaPC } = await supabaseClient.from('plan_contenido')
        .select('contenido')
        .eq('plan_id', planId)
        .eq('modulo_id', 'M08')
        .maybeSingle();
      const sintesis = fodaPC?.contenido?.sintesis;
      if (sintesis) {
        const rels = [
          { rel: 'FO', label: 'Fortalezas + Oportunidades', tipo: 'Estrategia Ofensiva', punt: sintesis.FO, desc: 'Deber\u00e1 adoptar estrategias de crecimiento' },
          { rel: 'FA', label: 'Fortalezas + Amenazas', tipo: 'Estrategia Defensiva', punt: sintesis.FA, desc: 'La empresa est\u00e1 preparada para enfrentarse a las amenazas' },
          { rel: 'DO', label: 'Debilidades + Oportunidades', tipo: 'Estrategia de Reorientaci\u00f3n', punt: sintesis.DO, desc: 'La empresa no puede aprovechar las oportunidades porque carece de preparaci\u00f3n adecuada' },
          { rel: 'DA', label: 'Debilidades + Amenazas', tipo: 'Estrategia de Supervivencia', punt: sintesis.DA, desc: 'Se enfrenta a amenazas externas sin las fortalezas necesarias para luchar con la competencia' }
        ];
        texto = '<strong style="color:#2563eb;">S\u00cdNTESIS DE RESULTADOS \u2014 MATRIZ FODA</strong>';
        texto += '<table style="width:100%;border-collapse:collapse;margin-top:0.5rem;font-size:0.78rem;">';
        texto += '<thead><tr><th style="text-align:left;padding:0.4rem 0.5rem;background:#f8fafc;border:1px solid #e2e8f0;font-weight:700;color:#475569;">Relaciones</th><th style="text-align:left;padding:0.4rem 0.5rem;background:#f8fafc;border:1px solid #e2e8f0;font-weight:700;color:#475569;">Tipolog\u00eda de estrategia</th><th style="text-align:center;padding:0.4rem 0.5rem;background:#f8fafc;border:1px solid #e2e8f0;font-weight:700;color:#475569;">Puntuaci\u00f3n</th><th style="text-align:left;padding:0.4rem 0.5rem;background:#f8fafc;border:1px solid #e2e8f0;font-weight:700;color:#475569;">Descripci\u00f3n</th></tr></thead><tbody>';
        rels.forEach(function(r) {
          var pv = r.punt !== undefined && r.punt !== null ? r.punt + '%' : '\u2014';
          texto += '<tr><td style="padding:0.4rem 0.5rem;border:1px solid #e2e8f0;"><strong>' + r.rel + '</strong><br><span style="font-size:0.7rem;color:#64748b;">' + r.label + '</span></td><td style="padding:0.4rem 0.5rem;border:1px solid #e2e8f0;">' + r.tipo + '</td><td style="text-align:center;padding:0.4rem 0.5rem;border:1px solid #e2e8f0;font-weight:700;">' + pv + '</td><td style="padding:0.4rem 0.5rem;border:1px solid #e2e8f0;font-size:0.72rem;color:#475569;">' + r.desc + '</td></tr>';
        });
        texto += '</tbody></table>';
      } else {
        texto = '(Sin datos de s\u00edntesis FODA registrados)';
      }
    } else {
      texto = c?.contenido ? (typeof c.contenido === 'string' ? c.contenido : JSON.stringify(c.contenido, null, 2)) : '(Sin contenido registrado)';
    }
    html += `
    <div class="lectura-modulo">
      <div class="lectura-modulo-header" onclick="toggleLecturaModulo(this)">
        <span><strong>${m.id}</strong> ${m.nombre} <span class="mod-chip ${c?.completado ? 'mod-ok' : 'mod-pend'}">${c?.completado ? 'Completado' : 'Pendiente'}</span></span>
        <i class="bi bi-chevron-down"></i>
      </div>
      <div class="lectura-modulo-body">
        <div style="background:#f8fafc;padding:0.5rem;border-radius:0.5rem;margin-bottom:0.5rem;">${texto}</div>
        <textarea placeholder="Dejar comentario sobre este módulo..." oninput="comentariosPorModulo['${m.id}']=this.value"></textarea>
      </div>
    </div>`;
  }
  panel.innerHTML = html;
  panel.style.display = 'block';
  panel.scrollIntoView({ behavior: 'smooth' });
}

window.leerModulosInline = leerModulosInline;

window.toggleLecturaModulo = function(header) {
  const body = header.nextElementSibling;
  const icon = header.querySelector('i');
  body.classList.toggle('open');
  icon.classList.toggle('bi-chevron-down');
  icon.classList.toggle('bi-chevron-up');
};

// ==================== VER RESUMEN EJECUTIVO ====================

async function verResumenEjecutivo(planId) {
  const { data: plan } = await supabaseClient.from('planes').select('*').eq('id', planId).single();
  if (!plan) return;
  if (!cachedM01) {
    const [empresaRes, globalRes] = await Promise.all([
      supabaseClient.from('empresa').select('*').eq('id', 1).single(),
      supabaseClient.from('empresa_contenido').select('*').eq('id', 1).single()
    ]);
    cachedM01 = { empresa: empresaRes.data, contenido: globalRes.data };
  }
  const infoGlobal = cachedM01?.contenido || {};
  const [fodaRes, cvFodaRes, bcgFodaRes, porterRes, pestRes, pcRes] = await Promise.all([
    supabaseClient.from('foda').select('tipo, descripcion').eq('plan_id', planId),
    supabaseClient.from('cadena_valor_foda').select('tipo, descripcion').eq('plan_id', planId),
    supabaseClient.from('bcg_foda').select('tipo, descripcion').eq('plan_id', planId).not('generado_auto', 'eq', true),
    supabaseClient.from('porter_oa').select('tipo, descripcion').eq('plan_id', planId),
    supabaseClient.from('pest_oa').select('tipo, descripcion').eq('plan_id', planId),
    supabaseClient.from('plan_contenido').select('contenido').eq('plan_id', planId).eq('modulo_id', 'M08').maybeSingle()
  ]);
  var foda = { fortalezas: [], debilidades: [], oportunidades: [], amenazas: [] };
  function addToFoda(arr, tipo, desc) {
    if (tipo === 'fortaleza') { if (!arr.fortalezas.some(function(x){return x===desc;})) arr.fortalezas.push(desc); }
    else if (tipo === 'debilidad') { if (!arr.debilidades.some(function(x){return x===desc;})) arr.debilidades.push(desc); }
    else if (tipo === 'oportunidad') { if (!arr.oportunidades.some(function(x){return x===desc;})) arr.oportunidades.push(desc); }
    else if (tipo === 'amenaza') { if (!arr.amenazas.some(function(x){return x===desc;})) arr.amenazas.push(desc); }
  }
  (fodaRes.data || []).forEach(function(f){ addToFoda(foda, f.tipo, f.descripcion); });
  (cvFodaRes.data || []).forEach(function(f){ addToFoda(foda, f.tipo, f.descripcion); });
  (bcgFodaRes.data || []).forEach(function(f){ addToFoda(foda, f.tipo, f.descripcion); });
  (porterRes.data || []).forEach(function(f){ addToFoda(foda, f.tipo, f.descripcion); });
  (pestRes.data || []).forEach(function(f){ addToFoda(foda, f.tipo, f.descripcion); });

  var sintesis = pcRes?.data?.contenido?.sintesis;
  var sintesisHtml = '';
  if (sintesis) {
    var rels = [
      { rel: 'FO', label: 'Fortalezas + Oportunidades', tipo: 'Estrategia Ofensiva', punt: sintesis.FO },
      { rel: 'FA', label: 'Fortalezas + Amenazas', tipo: 'Estrategia Defensiva', punt: sintesis.FA },
      { rel: 'DO', label: 'Debilidades + Oportunidades', tipo: 'Estrategia de Reorientaci\u00f3n', punt: sintesis.DO },
      { rel: 'DA', label: 'Debilidades + Amenazas', tipo: 'Estrategia de Supervivencia', punt: sintesis.DA }
    ];
    sintesisHtml = '<div style="margin-top:0.8rem;"><strong style="color:#2563eb;">S\u00cdNTESIS FODA</strong><table style="width:100%;border-collapse:collapse;margin-top:0.3rem;font-size:0.75rem;"><thead><tr><th style="text-align:left;padding:0.3rem 0.4rem;background:#f8fafc;border:1px solid #e2e8f0;">Rel.</th><th style="text-align:left;padding:0.3rem 0.4rem;background:#f8fafc;border:1px solid #e2e8f0;">Estrategia</th><th style="text-align:center;padding:0.3rem 0.4rem;background:#f8fafc;border:1px solid #e2e8f0;">Punt.</th></tr></thead><tbody>';
    rels.forEach(function(r){ var pv = r.punt !== undefined && r.punt !== null ? r.punt + '%' : '\u2014'; sintesisHtml += '<tr><td style="padding:0.3rem 0.4rem;border:1px solid #e2e8f0;"><strong>' + r.rel + '</strong></td><td style="padding:0.3rem 0.4rem;border:1px solid #e2e8f0;font-size:0.7rem;">' + r.tipo + '</td><td style="text-align:center;padding:0.3rem 0.4rem;border:1px solid #e2e8f0;font-weight:700;">' + pv + '</td></tr>'; });
    sintesisHtml += '</tbody></table></div>';
  }

  document.getElementById('detallePlanContenido').innerHTML = `
    <div style="display:grid;gap:0.8rem;">
      <h4>${plan.nombre} (${plan.anio})</h4>
      <p style="color:#475569;">${plan.descripcion || 'Sin descripción.'}</p>
      ${infoGlobal.mision ? `<div><strong>Misión:</strong> ${infoGlobal.mision}</div>` : ''}
      ${infoGlobal.vision ? `<div><strong>Visión:</strong> ${infoGlobal.vision}</div>` : ''}
      <div><strong>FODA:</strong> F:${foda.fortalezas.length} D:${foda.debilidades.length} O:${foda.oportunidades.length} A:${foda.amenazas.length}</div>
      ${sintesisHtml}
      <div><span class="pill ${plan.estado === 'en_revision' ? 'pill-amber' : plan.estado === 'activo' ? 'pill-green' : 'pill-gray'}">${plan.estado}</span></div>
    </div>`;
  document.getElementById('detallePlanModal').style.display = 'flex';
}

window.verResumenEjecutivo = verResumenEjecutivo;

window.cerrarDetallePlan = () => { document.getElementById('detallePlanModal').style.display = 'none'; };

// ==================== PLANES GENERADOS ====================

function sortPlanes(planes) {
  const isArchived = p => p.estado === 'cerrado' || p.estado === 'rechazado';
  const estadoOrden = { borrador: 0, activo: 1, en_revision: 2 };
  return [...planes].sort((a, b) => {
    const archA = isArchived(a) ? 1 : 0;
    const archB = isArchived(b) ? 1 : 0;
    if (archA !== archB) return archA - archB;
    const ordA = estadoOrden[a.estado] !== undefined ? estadoOrden[a.estado] : 99;
    const ordB = estadoOrden[b.estado] !== undefined ? estadoOrden[b.estado] : 99;
    if (ordA !== ordB) return ordA - ordB;
    return new Date(b.created_at || 0) - new Date(a.created_at || 0);
  });
}

async function cargarPlanesGenerados() {
  const [modulosResult, planesResult, allCountsResult] = await Promise.all([
    supabaseClient.from('modulos').select('*').order('orden'),
    (() => {
      let q = supabaseClient.from('planes').select('*, usuarios!creado_por(username)').order('anio', { ascending: false });
      if (currentTabPlanes === 'activo') q = q.eq('estado', 'activo');
      else if (currentTabPlanes === 'en_revision') q = q.eq('estado', 'en_revision');
      else if (currentTabPlanes === 'borrador') q = q.eq('estado', 'borrador');
      else if (currentTabPlanes === 'archivado') q = q.or('estado.eq.cerrado,estado.eq.rechazado');
      return q;
    })(),
    supabaseClient.from('planes').select('estado')
  ]);

  const modulosRaw = modulosResult.data || [];
  const planesRaw = planesResult.data || [];
  const allPlanes = allCountsResult.data || [];

  const modulos = modulosRaw;
  const planes = sortPlanes([...new Map(planesRaw.map(p => [p.id, p])).values()]);

  if (!cachedM01) {
    const [empresaRes, globalRes] = await Promise.all([
      supabaseClient.from('empresa').select('*').eq('id', 1).single(),
      supabaseClient.from('empresa_contenido').select('*').eq('id', 1).single()
    ]);
    cachedM01 = { empresa: empresaRes.data, contenido: globalRes.data };
  }
  const global = cachedM01?.contenido || {};

  const container = document.getElementById('planesCardsList');
  if (!container) return;

  // Calcular conteos desde allPlanes (una sola query)
  const total = allPlanes.length;
  const activos = allPlanes.filter(p => p.estado === 'activo').length;
  document.getElementById('planesSubtitle').innerText = `${total} planes en total · ${activos} activo(s) en ejecución`;

  const counts = { todos: total };
  for (const estado of ['activo', 'en_revision', 'borrador']) {
    counts[estado] = allPlanes.filter(p => p.estado === estado).length;
  }
  counts['archivado'] = allPlanes.filter(p => p.estado === 'cerrado' || p.estado === 'rechazado').length;

  const tabLabels = { todos: 'Todos', activo: 'Activos', en_revision: 'En revisión', borrador: 'Borradores', archivado: 'Archivados' };
  document.querySelectorAll('#planesTabs .itab').forEach(tab => {
    const key = tab.getAttribute('data-tab');
    tab.innerText = `${tabLabels[key] || key} (${counts[key] || 0})`;
  });

  if (planes.length === 0) {
    container.innerHTML = '<div style="text-align:center;color:#94a3b8;padding:2rem;">No hay planes que mostrar</div>';
    return;
  }

  // Batch: obtener plan_contenido de todos los planes en una sola query
  const planIds = planes.map(p => p.id);
  const { data: allContenidos } = await supabaseClient
    .from('plan_contenido')
    .select('plan_id, modulo_id, completado')
    .in('plan_id', planIds);

  const contenidosByPlan = {};
  (allContenidos || []).forEach(c => {
    if (!contenidosByPlan[c.plan_id]) contenidosByPlan[c.plan_id] = [];
    contenidosByPlan[c.plan_id].push(c);
  });

  // Batch: verificar vacío de todos los planes en paralelo
  const vacioResults = await Promise.all(planIds.map(id => verificarPlanVacio(id)));
  const vacioMap = Object.fromEntries(planIds.map((id, i) => [id, vacioResults[i]]));

  container.innerHTML = '';
  for (const plan of planes) {
    const contenidos = contenidosByPlan[plan.id] || [];
    const compMap = Object.fromEntries(contenidos.map(c => [c.modulo_id, c.completado]));
    if (!!global.mision?.trim()) compMap['M01'] = true;
    if (!!global.vision?.trim()) compMap['M02'] = true;
    if (Array.isArray(global.valores) && global.valores.length > 0) compMap['M03'] = true;
    const completados = Object.values(compMap).filter(Boolean).length;
    const totalModulos = modulos.length;
    const pct = totalModulos > 0 ? Math.round((completados / totalModulos) * 100) : 0;

    let iconBg = '#F1EFE8', iconColor = '#888', iconClass = 'bi-archive';
    let estadoClass = '', estadoLabel = plan.estado;
    if (plan.estado === 'activo') { iconBg = '#EAF3DE'; iconColor = '#27500A'; iconClass = 'bi-play-circle-fill'; estadoClass = 'activo'; }
    else if (plan.estado === 'en_revision') { iconBg = '#FAEEDA'; iconColor = '#633806'; iconClass = 'bi-clock'; estadoClass = ''; }
    else if (plan.estado === 'borrador') { iconBg = '#E6F1FB'; iconColor = '#0C447C'; iconClass = 'bi-pencil'; estadoClass = ''; }
    else if (plan.estado === 'rechazado') { iconBg = '#FCEBEB'; iconColor = '#791F1F'; iconClass = 'bi-x-octagon'; estadoClass = 'archivado'; }
    else { iconBg = '#F1EFE8'; iconColor = '#888'; iconClass = 'bi-archive'; estadoClass = 'archivado'; }

    const planVacio = vacioMap[plan.id];

    // Cronograma banner
    let cronoBanner = '';
    if (plan.fecha_inicio && plan.fecha_fin) {
      const diffTime = new Date(plan.fecha_fin).getTime() - Date.now();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays < 0) {
        cronoBanner = `<div class="crono-banner danger"><i class="bi bi-exclamation-diamond-fill"></i> Vencido hace ${Math.abs(diffDays)} día(s)</div>`;
      } else if (diffDays <= 7) {
        cronoBanner = `<div class="crono-banner warning"><i class="bi bi-clock-fill"></i> Vence en ${diffDays} día(s)</div>`;
      } else {
        cronoBanner = `<div class="crono-banner ok"><i class="bi bi-check-circle-fill"></i> ${new Date(plan.fecha_inicio).toLocaleDateString()} → ${new Date(plan.fecha_fin).toLocaleDateString()} (${diffDays} días)</div>`;
      }
    } else {
      cronoBanner = `<div class="crono-banner warning"><i class="bi bi-calendar-x"></i> Sin cronograma definido</div>`;
    }

    let colVerBtns = '';
    if (plan.estado === 'activo' || plan.estado === 'borrador' || plan.estado === 'en_revision') {
      colVerBtns += `<button class="btn-small btn-outline" onclick="leerModulosInlineGenerados(${plan.id})"><i class="bi bi-journal-text"></i> Módulos</button>`;
    }
    if (plan.estado === 'borrador' || plan.estado === 'activo' || plan.estado === 'en_revision') {
      colVerBtns += `<button class="btn-small btn-outline" onclick="descargarPlanCompleto(${plan.id})"><i class="bi bi-download"></i> Descargar</button>`;
    }
    if (plan.estado === 'rechazado' || plan.estado === 'cerrado') {
      colVerBtns += `<button class="btn-small btn-outline" onclick="leerModulosInlineGenerados(${plan.id})"><i class="bi bi-journal-text"></i> Módulos</button>`;
    }
    if (plan.estado === 'en_revision') {
      colVerBtns += `<button class="btn-small btn-primary" onclick="irAAprobar(${plan.id})"><i class="bi bi-arrow-right"></i> Revisar</button>`;
    }

    let colAdminBtns = `<button class="btn-small btn-icon" onclick="abrirModalEditarNombre(${plan.id})" title="Editar plan"><i class="bi bi-pencil"></i></button><button class="btn-small btn-icon" onclick="abrirModalEditarCronograma(${plan.id})" title="Editar cronograma"><i class="bi bi-calendar-event"></i></button>`;
    if (planVacio) {
      colAdminBtns += `<button class="btn-small btn-danger-outline" onclick="eliminarPlan(${plan.id})"><i class="bi bi-trash3"></i></button>`;
    } else if (plan.estado === 'cerrado' || plan.estado === 'rechazado') {
      colAdminBtns += `<button class="btn-small btn-gray" onclick="habilitarPlan(${plan.id})"><i class="bi bi-check2-circle"></i></button>`;
    } else if (plan.estado !== 'cerrado') {
      colAdminBtns += `<button class="btn-small btn-gray" onclick="inhabilitarPlan(${plan.id})"><i class="bi bi-slash-circle"></i></button>`;
    }

    const row = document.createElement('div');
    row.className = `pgen-row ${estadoClass}`;
    row.innerHTML = `
      <div class="pgen-col-info">
        <div class="pgen-icon" style="background:${iconBg};"><i class="bi ${iconClass}" style="color:${iconColor};"></i></div>
        <div class="pgen-info">
          <div class="pgen-name">${plan.nombre}</div>
          <div class="pgen-meta">${estadoLabel} · ${plan.usuarios?.username || '—'} · ${plan.anio}${plan.fecha_aprobacion ? ` · ${new Date(plan.fecha_aprobacion).toLocaleDateString()}` : ''}</div>
          <div class="progress-bar-wrap" style="width:100px;"><div class="progress-bar-fill" style="width:${pct}%;background:${plan.estado==='activo'?'#27500A':'#94a3b8'};"></div></div>
          ${cronoBanner}
        </div>
      </div>
      <div class="pgen-col-pct">
        <span class="pgen-pct-valor" style="color:${plan.estado==='activo'?'#27500A':'#64748b'};">${pct}%</span>
        <span class="pgen-pct-label">avance</span>
      </div>
      <div class="pgen-col-actions">${colVerBtns}</div>
      <div class="pgen-col-admin">${colAdminBtns}</div>`;
    container.appendChild(row);
  }
}

window.irAAprobar = function(planId) {
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const aprobarNav = document.querySelector('.nav-item[data-section="aprobar"]');
  if (aprobarNav) aprobarNav.click();
};

const SIN_DATOS = '<em style="color:#94a3b8;font-style:italic;">No hay datos existentes</em>';

function tieneContenido(obj) {
  if (!obj) return false;
  if (Array.isArray(obj)) return obj.length > 0;
  if (typeof obj === 'object') return Object.keys(obj).length > 0;
  return String(obj).trim().length > 0;
}

async function generarResumenModulo(moduloId, contenido, planId) {
  try {
    if (moduloId === 'M01' || moduloId === 'M02' || moduloId === 'M03') {
      if (!cachedM01) {
        const [empresaRes, globalRes] = await Promise.all([
          supabaseClient.from('empresa').select('*').eq('id', 1).single(),
          supabaseClient.from('empresa_contenido').select('*').eq('id', 1).single()
        ]);
        cachedM01 = { empresa: empresaRes.data, contenido: globalRes.data };
      }
      const global = cachedM01?.contenido || {};
      if (moduloId === 'M01') {
        const mision = global.mision?.trim();
        if (!mision) return SIN_DATOS;
        return `<div><strong style="color:#2563eb;">Misión</strong><p style="margin:0.2rem 0 0 0;color:#334155;">${mision}</p></div>`;
      }
      if (moduloId === 'M02') {
        const vision = global.vision?.trim();
        if (!vision) return SIN_DATOS;
        return `<div><strong style="color:#2563eb;">Visión</strong><p style="margin:0.2rem 0 0 0;color:#334155;">${vision}</p></div>`;
      }
      const valores = Array.isArray(global.valores) ? global.valores : [];
      if (valores.length === 0) return SIN_DATOS;
      return `<strong style="color:#2563eb;">Valores corporativos</strong>
        <ul style="margin:0.4rem 0 0 1.2rem;padding:0;color:#334155;">
          ${valores.map(v => `<li style="margin-bottom:0.25rem;"><strong>${v.titulo || v}</strong>${v.descripcion ? `<br><span style="color:#64748b;font-size:0.85em;">${v.descripcion}</span>` : ''}</li>`).join('')}
        </ul>`;
    }

    if (moduloId === 'M04') {
      const { data: grales } = await supabaseClient.from('objetivos_generales').select('id, descripcion').eq('plan_id', planId).order('orden');
      if (!grales || grales.length === 0) return SIN_DATOS;
      let res = `<strong style="color:#2563eb;">${grales.length} objetivo(s) general(es)</strong><ul style="margin:0.3rem 0 0 1.2rem;padding:0;">`;
      for (const g of grales) {
        const { data: especs } = await supabaseClient.from('objetivos_especificos').select('descripcion').eq('objetivo_general_id', g.id).order('orden');
        res += `<li style="margin-bottom:0.3rem;"><strong>${g.descripcion}</strong>`;
        if (especs && especs.length > 0) {
          res += `<ul style="margin:0.1rem 0 0.3rem 1rem;padding:0;color:#475569;">`;
          especs.forEach(e => { res += `<li>${e.descripcion}</li>`; });
          res += `</ul>`;
        }
        res += `</li>`;
      }
      return res + '</ul>';
    }

    if (moduloId === 'M05') {
      const info = contenido || {};
      const pt = info.puntaje_total;
      const pm = info.potencial_mejora;
      const totalResp = Array.isArray(info.respuestas) ? info.respuestas.length : 0;
      if (totalResp === 0) return SIN_DATOS;
      const promedio = (pt / totalResp).toFixed(1);
      return `<strong style="color:#2563eb;">Cadena de Valor — Resumen</strong>
        <div style="margin-top:0.4rem;display:grid;grid-template-columns:1fr 1fr 1fr;gap:0.5rem;">
          <div style="background:#f1f5f9;padding:0.4rem 0.6rem;border-radius:0.5rem;text-align:center;">
            <div style="font-size:1.1rem;font-weight:700;color:#0f172a;">${totalResp}</div>
            <div style="font-size:0.65rem;color:#64748b;">Preguntas evaluadas</div>
          </div>
          <div style="background:#f1f5f9;padding:0.4rem 0.6rem;border-radius:0.5rem;text-align:center;">
            <div style="font-size:1.1rem;font-weight:700;color:#2563eb;">${pt ?? '—'}</div>
            <div style="font-size:0.65rem;color:#64748b;">Puntaje total</div>
          </div>
          <div style="background:#f1f5f9;padding:0.4rem 0.6rem;border-radius:0.5rem;text-align:center;">
            <div style="font-size:1.1rem;font-weight:700;color:#059669;">${pm ?? '—'}%</div>
            <div style="font-size:0.65rem;color:#64748b;">Potencial de mejora</div>
          </div>
        </div>
        <div style="margin-top:0.4rem;font-size:0.8rem;color:#475569;">Promedio por pregunta: <strong>${promedio}</strong> / 5.00</div>`;
    }

    if (moduloId === 'M06') {
      let uens = Array.isArray(contenido) ? contenido : (contenido?.datos_uen || []);
      if (uens.length === 0) {
        const { data: bcg } = await supabaseClient.from('matriz_bcg').select('datos_uen').eq('plan_id', planId).single();
        uens = bcg?.datos_uen || [];
      }
      if (uens.length === 0) return SIN_DATOS;
      const cuadrantes = {};
      uens.forEach(u => { cuadrantes[u.cuadrante || '—'] = (cuadrantes[u.cuadrante || '—'] || 0) + 1; });
      const colorMap = { 'Estrella': '#2563eb', 'Vaca': '#059669', 'Interrogante': '#d97706', 'Incógnita': '#d97706', 'Perro': '#dc2626' };
      let res = `<strong style="color:#2563eb;">Matriz BCG — ${uens.length} UEN(s) analizada(s)</strong><div style="margin-top:0.3rem;display:flex;flex-wrap:wrap;gap:0.3rem;">`;
      for (const [c, count] of Object.entries(cuadrantes)) {
        const color = colorMap[c] || '#64748b';
        res += `<span style="background:${color}15;color:${color};padding:0.15rem 0.5rem;border-radius:1rem;font-size:0.75rem;font-weight:600;">${c}: ${count}</span>`;
      }
      res += '</div><ul style="margin:0.4rem 0 0 0;padding:0 0 0 1.2rem;">';
      uens.forEach(u => {
        const color = colorMap[u.cuadrante] || '#64748b';
        res += `<li style="font-size:0.78rem;margin-bottom:0.15rem;"><strong>${u.nombre}</strong> <span style="color:${color};">${u.cuadrante || '—'}</span></li>`;
      });
      return res + '</ul>';
    }

    if (moduloId === 'M07') {
      const labelsMap = { rivalidad: 'Rivalidad', nuevosEntrantes: 'Nuevos entrantes', poderClientes: 'Poder clientes', poderProveedores: 'Poder proveedores', sustitutos: 'Sustitutos' };
      const entries = Object.entries(labelsMap).filter(([key]) => contenido?.[key] !== undefined);
      if (entries.length === 0) return SIN_DATOS;
      let res = '<strong style="color:#2563eb;">5 Fuerzas de Porter</strong><div style="margin-top:0.3rem;display:flex;flex-direction:column;gap:0.25rem;">';
      entries.forEach(([key, label]) => {
        res += `<div style="display:flex;justify-content:space-between;font-size:0.8rem;padding:0.15rem 0.3rem;background:#f8fafc;border-radius:0.3rem;"><span>${label}</span><span style="font-weight:600;">${contenido[key]}</span></div>`;
      });
      return res + '</div>';
    }

    if (moduloId === 'M08') {
      const labelsMap = { politico: 'Político', economico: 'Económico', social: 'Social', tecnologico: 'Tecnológico', ambiental: 'Ambiental' };
      const entries = Object.entries(labelsMap).filter(([key]) => contenido?.[key] !== undefined);
      if (entries.length === 0) return SIN_DATOS;
      let res = '<strong style="color:#2563eb;">Análisis PEST</strong><div style="margin-top:0.3rem;display:flex;flex-direction:column;gap:0.25rem;">';
      entries.forEach(([key, label]) => {
        res += `<div style="display:flex;justify-content:space-between;font-size:0.8rem;padding:0.15rem 0.3rem;background:#f8fafc;border-radius:0.3rem;"><span>${label}</span><span style="font-weight:600;">${contenido[key]}</span></div>`;
      });
      return res + '</div>';
    }

    if (moduloId === 'M09') {
      const { data: foda } = await supabaseClient.from('foda').select('tipo, descripcion').eq('plan_id', planId);
      if (!foda || foda.length === 0) return SIN_DATOS;
      const grupos = { fortaleza: [], debilidad: [], oportunidad: [], amenaza: [] };
      foda.forEach(f => { if (grupos[f.tipo]) grupos[f.tipo].push(f.descripcion); });
      const colores = { fortaleza: '#059669', debilidad: '#dc2626', oportunidad: '#2563eb', amenaza: '#d97706' };
      const labels = { fortaleza: 'Fortalezas', debilidad: 'Debilidades', oportunidad: 'Oportunidades', amenaza: 'Amenazas' };
      let res = `<strong style="color:#2563eb;">Matriz FODA — ${foda.length} item(s)</strong><div style="margin-top:0.3rem;display:grid;grid-template-columns:1fr 1fr;gap:0.3rem;">`;
      for (const [tipo, items] of Object.entries(grupos)) {
        if (items.length > 0) {
          res += `<div style="background:${colores[tipo]}08;border-left:3px solid ${colores[tipo]};padding:0.3rem 0.5rem;border-radius:0.4rem;">
            <strong style="color:${colores[tipo]};font-size:0.75rem;">${labels[tipo]} (${items.length})</strong>
            <ul style="margin:0.2rem 0 0 0.8rem;padding:0;font-size:0.72rem;color:#475569;">`;
          items.slice(0, 5).forEach(d => { res += `<li>${d}</li>`; });
          if (items.length > 5) res += `<li style="color:#94a3b8;">+${items.length - 5} más</li>`;
          res += `</ul></div>`;
        }
      }
      return res + '</div>';
    }

    if (moduloId === 'M10') {
      let items = [];
      if (contenido && typeof contenido === 'object') {
        for (const [cat, desc] of Object.entries(contenido)) {
          if (desc && typeof desc === 'string' && desc.trim()) {
            items.push({ categoria: cat, descripcion: desc });
          }
        }
      }
      if (items.length === 0) {
        const { data: cameRows } = await supabaseClient.from('came').select('categoria, descripcion').eq('plan_id', planId);
        if (cameRows) items = cameRows;
      }
      if (items.length === 0) return SIN_DATOS;
      const catLabels = { corregir: 'Corregir', afrontar: 'Afrontar', mantener: 'Mantener', explotar: 'Explotar' };
      const catColors = { corregir: '#dc2626', afrontar: '#d97706', mantener: '#2563eb', explotar: '#059669' };
      let res = `<strong style="color:#2563eb;">Matriz CAME — ${items.length} estrategia(s)</strong><div style="margin-top:0.3rem;display:flex;flex-direction:column;gap:0.3rem;">`;
      items.forEach(it => {
        const label = catLabels[it.categoria] || it.categoria;
        const color = catColors[it.categoria] || '#64748b';
        res += `<div style="background:${color}08;border-left:3px solid ${color};padding:0.3rem 0.5rem;border-radius:0.4rem;">
          <strong style="color:${color};font-size:0.72rem;">${label}</strong>
          <div style="font-size:0.75rem;color:#334155;margin-top:0.1rem;">${it.descripcion}</div>
        </div>`;
      });
      return res + '</div>';
    }

    if (typeof contenido === 'object' && contenido !== null) {
      const keys = Object.keys(contenido);
      if (keys.length === 0) return SIN_DATOS;
      let res = '<ul style="margin:0;padding:0 0 0 1.2rem;">';
      for (const key of keys.slice(0, 8)) {
        const val = typeof contenido[key] === 'object' ? JSON.stringify(contenido[key]) : contenido[key];
        res += `<li style="font-size:0.78rem;margin-bottom:0.15rem;"><strong>${key}:</strong> ${String(val).substring(0, 120)}</li>`;
      }
      if (keys.length > 8) res += `<li style="color:#94a3b8;font-size:0.7rem;">+${keys.length - 8} campo(s) más</li>`;
      return res + '</ul>';
    }

    return tieneContenido(contenido) ? String(contenido) : SIN_DATOS;
  } catch (e) {
    console.error('Error generando resumen para', moduloId, e);
    return SIN_DATOS;
  }
}

async function leerModulosInlineGenerados(planId) {
  const [planRes, modulosRes, contenidosRes] = await Promise.all([
    supabaseClient.from('planes').select('nombre').eq('id', planId).single(),
    supabaseClient.from('modulos').select('*').order('orden'),
    supabaseClient.from('plan_contenido').select('modulo_id, contenido, completado').eq('plan_id', planId)
  ]);

  const plan = planRes.data;
  const modulosRaw = modulosRes.data || [];
  const contenidos = contenidosRes.data || [];

  const modulos = (modulosRaw || []);
  const contMap = Object.fromEntries(contenidos?.map(c => [c.modulo_id, c]) || {});

  if (!cachedM01) {
    const [empresaRes, globalRes] = await Promise.all([
      supabaseClient.from('empresa').select('*').eq('id', 1).single(),
      supabaseClient.from('empresa_contenido').select('*').eq('id', 1).single()
    ]);
    cachedM01 = { empresa: empresaRes.data, contenido: globalRes.data };
  }
  const global = cachedM01?.contenido || {};

  document.getElementById('planModulosTitulo').innerText = `Módulos del Plan: ${plan?.nombre || '#' + planId}`;

  const lista = document.getElementById('planModulosLista');
  lista.innerHTML = '';
  for (const m of modulos) {
    const c = contMap[m.id];
    let isOk = c?.completado;
    if (['M01', 'M02', 'M03'].includes(m.id)) {
      if (m.id === 'M01') isOk = !!global.mision?.trim();
      else if (m.id === 'M02') isOk = !!global.vision?.trim();
      else if (m.id === 'M03') isOk = Array.isArray(global.valores) && global.valores.length > 0;
    }
    const card = document.createElement('div');
    card.className = 'modulo-card';
    card.innerHTML = `
      <div class="modulo-card-header" style="cursor:default;">
        <span><strong>${m.id}</strong> ${m.nombre}</span>
        <span class="mod-chip ${isOk ? 'mod-ok' : 'mod-pend'}">${isOk ? 'Completado' : 'Pendiente'}</span>
      </div>`;
    lista.appendChild(card);
  }

  document.getElementById('planModulosModal').style.display = 'flex';
}

window.leerModulosInlineGenerados = leerModulosInlineGenerados;

window.cerrarPlanModulosModal = function() {
  document.getElementById('planModulosModal').style.display = 'none';
};

// ==================== ELIMINAR / INHABILITAR PLAN ====================

async function verificarPlanVacio(planId) {
  const tables = ['foda', 'came', 'estrategia_plan', 'objetivos_generales', 'kpis', 'iniciativas', 'proyectos', 'tareas', 'matriz_bcg'];
  const checks = tables.map(t =>
    supabaseClient.from(t).select('id', { count: 'exact', head: true }).eq('plan_id', planId)
  );
  const { count: planContenidoCount } = await supabaseClient.from('plan_contenido').select('id', { count: 'exact', head: true }).eq('plan_id', planId);

  const results = await Promise.all(checks);
  const allEmpty = results.every(r => (r.count || 0) === 0) && (planContenidoCount || 0) === 0;
  return allEmpty;
}

window.eliminarPlan = async function(planId) {
  const modal = document.getElementById('confirmarEliminarPlanModal');
  const confirmBtn = document.getElementById('confirmarEliminarPlanBtn');
  if (modal && confirmBtn) {
    confirmBtn.setAttribute('data-plan-id', planId);
    modal.style.display = 'flex';
  }
};

window.inhabilitarPlan = function(planId) {
  const modal = document.getElementById('confirmarInhabilitarPlanModal');
  const btn = document.getElementById('confirmarInhabilitarPlanBtn');
  if (modal && btn) {
    btn.setAttribute('data-plan-id', planId);
    modal.style.display = 'flex';
  }
};

window.habilitarPlan = function(planId) {
  const modal = document.getElementById('confirmarHabilitarPlanModal');
  const btn = document.getElementById('confirmarHabilitarPlanBtn');
  if (modal && btn) {
    btn.setAttribute('data-plan-id', planId);
    modal.style.display = 'flex';
  }
};

window.confirmarInhabilitarPlan = async function() {
  const planId = parseInt(document.getElementById('confirmarInhabilitarPlanBtn').getAttribute('data-plan-id'));
  document.getElementById('confirmarInhabilitarPlanModal').style.display = 'none';
  const { error } = await supabaseClient.from('planes').update({ estado: 'cerrado' }).eq('id', planId);
  if (error) { showToast('Error al inhabilitar: ' + error.message, 'error'); return; }
  await insertAuditoria('Inhabilitar plan', `Plan ID ${planId} pasado a estado cerrado`);
  showToast('Plan inhabilitado (cerrado).', 'success');
  await cargarPlanesGenerados();
  await actualizarBadges();
};

window.confirmarHabilitarPlan = async function() {
  const planId = parseInt(document.getElementById('confirmarHabilitarPlanBtn').getAttribute('data-plan-id'));
  document.getElementById('confirmarHabilitarPlanModal').style.display = 'none';
  const { error } = await supabaseClient.from('planes').update({ estado: 'borrador' }).eq('id', planId);
  if (error) { showToast('Error al habilitar: ' + error.message, 'error'); return; }
  await insertAuditoria('Habilitar plan', `Plan ID ${planId} restaurado a borrador`);
  showToast('Plan habilitado (borrador).', 'success');
  await cargarPlanesGenerados();
  await actualizarBadges();
};

window.confirmarLogout = async function() {
  document.getElementById('confirmarLogoutModal').style.display = 'none';
  await supabaseClient.auth.signOut();
  localStorage.removeItem('peti_session');
  window.location.href = '../index.html';
};

window.confirmarEliminarPlan = async function() {
  const planId = parseInt(document.getElementById('confirmarEliminarPlanBtn').getAttribute('data-plan-id'));
  document.getElementById('confirmarEliminarPlanModal').style.display = 'none';
  const { error } = await supabaseClient.from('planes').delete().eq('id', planId);
  if (error) { showToast('Error al eliminar: ' + error.message, 'error'); return; }
  await insertAuditoria('Eliminar plan', `Plan ID ${planId} eliminado permanentemente`);
  showToast('Plan eliminado permanentemente.', 'success');
  await cargarPlanesGenerados();
  await cargarDashboard();
  await actualizarBadges();
};

// ==================== NUEVO PLAN ====================

function validarCronograma(fechaInicio, fechaFin, warningId, errorId, warningTextId, errorTextId) {
  const warningEl = document.getElementById(warningId);
  const errorEl = document.getElementById(errorId);
  const warningTextEl = document.getElementById(warningTextId);
  const errorTextEl = document.getElementById(errorTextId);
  if (!fechaInicio || !fechaFin) {
    if (warningEl) warningEl.style.display = 'none';
    if (errorEl) errorEl.style.display = 'none';
    return { valid: true, diffDays: 0 };
  }
  const start = new Date(fechaInicio);
  const end = new Date(fechaFin);
  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  let valid = true;
  if (diffDays < 15) {
    if (errorTextEl) errorTextEl.innerText = `El plazo mínimo es de 15 días. Diferencia actual: ${diffDays} día(s).`;
    if (errorEl) errorEl.style.display = 'flex';
    if (warningEl) warningEl.style.display = 'none';
    valid = false;
  } else if (diffDays > 45) {
    if (errorEl) errorEl.style.display = 'none';
    if (warningTextEl) warningTextEl.innerText = `El plazo de ${diffDays} días supera los 45 días recomendados. Considere reducir el cronograma.`;
    if (warningEl) warningEl.style.display = 'flex';
    valid = true;
  } else {
    if (warningEl) warningEl.style.display = 'none';
    if (errorEl) errorEl.style.display = 'none';
    valid = true;
  }
  return { valid, diffDays };
}

function abrirModalNuevoPlan() {
  document.getElementById('nuevoPlanNombre').value = '';
  document.getElementById('nuevoPlanAnio').value = new Date().getFullYear();
  document.getElementById('nuevoPlanDescripcion').value = '';

  const hoy = new Date();
  const finDefault = new Date(hoy);
  finDefault.setDate(finDefault.getDate() + 30);
  document.getElementById('nuevoPlanFechaInicio').value = hoy.toISOString().split('T')[0];
  document.getElementById('nuevoPlanFechaFin').value = finDefault.toISOString().split('T')[0];
  document.getElementById('cronoPlazoWarning').style.display = 'none';
  document.getElementById('cronoPlazoError').style.display = 'none';
  document.getElementById('nuevoPlanModal').style.display = 'flex';

  // Bind inline validation (solo fecha_fin es editable)
  const ff = document.getElementById('nuevoPlanFechaFin');
  const doValidate = () => validarCronograma(
    document.getElementById('nuevoPlanFechaInicio').value, ff.value,
    'cronoPlazoWarning', 'cronoPlazoError', 'cronoPlazoWarningText', 'cronoPlazoErrorText'
  );
  ff.onchange = doValidate;
  // Run initial validation
  doValidate();
}

async function crearNuevoPlan() {
  const nombre = document.getElementById('nuevoPlanNombre').value.trim();
  const anio = new Date().getFullYear();
  const descripcion = document.getElementById('nuevoPlanDescripcion').value.trim();
  const fechaInicio = document.getElementById('nuevoPlanFechaInicio').value;
  const fechaFin = document.getElementById('nuevoPlanFechaFin').value;

  if (!nombre) { showToast('El nombre del plan es obligatorio.', 'error'); return; }
  if (!currentUser.id) { showToast('Error al identificar al usuario.', 'error'); return; }
  if (!fechaInicio || !fechaFin) { showToast('Debe definir las fechas de inicio y cierre del cronograma.', 'error'); return; }

  const validation = validarCronograma(fechaInicio, fechaFin, 'cronoPlazoWarning', 'cronoPlazoError', 'cronoPlazoWarningText', 'cronoPlazoErrorText');
  if (!validation.valid) { showToast('El cronograma debe tener al menos 15 días de duración.', 'error'); return; }

  const { data, error } = await supabaseClient.from('planes').insert({
    nombre, anio, descripcion: descripcion || null,
    estado: 'borrador', creado_por: currentUser.id,
    fecha_inicio: fechaInicio, fecha_fin: fechaFin
  }).select().single();
  if (error) { showToast('Error al crear el plan: ' + error.message, 'error'); return; }
  await insertAuditoria('Crear plan', `Plan "${nombre}" (ID ${data.id}) creado en estado borrador. Cronograma: ${fechaInicio} → ${fechaFin}`);
  document.getElementById('nuevoPlanModal').style.display = 'none';
  showToast('Plan creado exitosamente en estado borrador.', 'success');
  await cargarPlanesGenerados();
  await cargarDashboard();
  await actualizarBadges();
}

// ==================== EDITAR CRONOGRAMA ====================

window.abrirModalEditarCronograma = async function(planId) {
  const { data: plan } = await supabaseClient.from('planes').select('fecha_inicio, fecha_fin').eq('id', planId).single();
  if (!plan) { showToast('Plan no encontrado.', 'error'); return; }
  document.getElementById('editarCronogramaPlanId').value = planId;
  document.getElementById('editarCronogramaFechaInicio').value = plan.fecha_inicio ? plan.fecha_inicio.split('T')[0] : '';
  document.getElementById('editarCronogramaFechaFin').value = plan.fecha_fin ? plan.fecha_fin.split('T')[0] : '';
  document.getElementById('editarCronogramaMotivo').value = '';
  document.getElementById('editCronoPlazoWarning').style.display = 'none';
  document.getElementById('editCronoPlazoError').style.display = 'none';
  document.getElementById('editarCronogramaModal').style.display = 'flex';

  // Bind validation (solo fecha_fin es editable)
  const ff = document.getElementById('editarCronogramaFechaFin');
  const doValidate = () => validarCronograma(
    document.getElementById('editarCronogramaFechaInicio').value, ff.value,
    'editCronoPlazoWarning', 'editCronoPlazoError', 'editCronoPlazoWarningText', 'editCronoPlazoErrorText'
  );
  ff.onchange = doValidate;
  doValidate();
};

document.getElementById('editarCronogramaCancelBtn')?.addEventListener('click', () => {
  document.getElementById('editarCronogramaModal').style.display = 'none';
});

document.getElementById('editarCronogramaSaveBtn')?.addEventListener('click', async () => {
  const planId = document.getElementById('editarCronogramaPlanId').value;
  const ff = document.getElementById('editarCronogramaFechaFin').value;
  const motivo = document.getElementById('editarCronogramaMotivo').value.trim();

  if (!ff) { showToast('Debe definir la fecha de cierre.', 'error'); return; }
  if (!motivo) { showToast('Debe indicar el motivo del cambio.', 'error'); return; }

  const fi = document.getElementById('editarCronogramaFechaInicio').value;
  const validation = validarCronograma(fi, ff, 'editCronoPlazoWarning', 'editCronoPlazoError', 'editCronoPlazoWarningText', 'editCronoPlazoErrorText');
  if (!validation.valid) { showToast('El cronograma debe tener al menos 15 días de duración.', 'error'); return; }

  const { data: oldPlan } = await supabaseClient.from('planes').select('fecha_inicio, fecha_fin').eq('id', planId).single();

  const { error } = await supabaseClient.from('planes').update({ fecha_fin: ff }).eq('id', planId);
  if (error) { showToast('Error al actualizar: ' + error.message, 'error'); return; }

  const oldInicio = oldPlan?.fecha_inicio ? oldPlan.fecha_inicio.split('T')[0] : '—';
  const oldFin = oldPlan?.fecha_fin ? oldPlan.fecha_fin.split('T')[0] : '—';
  await insertAuditoria('Editar cronograma',
    `Cronograma del plan ID ${planId} modificado: "${oldInicio} → ${oldFin}" cambiado a "${fi} → ${ff}". Motivo: ${motivo}`);

  document.getElementById('editarCronogramaModal').style.display = 'none';
  showToast('Cronograma actualizado exitosamente.', 'success');
  await cargarPlanesGenerados();
  await cargarDashboard();
});

window.abrirModalEditarNombre = async function(planId) {
  const { data: plan } = await supabaseClient.from('planes').select('nombre, descripcion').eq('id', planId).single();
  if (!plan) return;
  document.getElementById('editarNombrePlanId').value = planId;
  document.getElementById('editarNombreInput').value = plan.nombre || '';
  document.getElementById('editarDescripcionInput').value = plan.descripcion || '';
  document.getElementById('editarNombrePlanModal').style.display = 'flex';
};

// ==================== REPORTES ====================

async function cargarPlanSelector() {
  const select = document.getElementById('reportePlanSelector');
  if (!select) return;
  const { data: planes } = await supabaseClient.from('planes').select('id, nombre, anio').order('anio', { ascending: false });
  select.innerHTML = '<option value="">-- Selecciona un plan --</option>' +
    (planes || []).map(p => `<option value="${p.id}">${p.nombre} (${p.anio})</option>`).join('');
  if (!selectedReportPlanId) {
    document.getElementById('reportesContent').style.display = 'none';
  }
}

async function onPlanSeleccionado() {
  const content = document.getElementById('reportesContent');
  if (!selectedReportPlanId) { content.style.display = 'none'; return; }
  content.style.display = 'block';

  const dataCheck = await verificarDatosPlan(selectedReportPlanId);
  const updatesCheck = {};
  for (const tipo of ['resumen','kpis','desempeno','bcg','trazabilidad']) {
    if (dataCheck[tipo]) updatesCheck[tipo] = await verificarActualizaciones(selectedReportPlanId, tipo);
  }
  aplicarEstadoCards(dataCheck, updatesCheck);
  await cargarReportesRecientes();
}

async function verificarDatosPlan(planId) {
  const tipos = ['resumen','kpis','desempeno','bcg','trazabilidad'];
  const result = {};
  const [m01Res, kpisRes, proyRes, bcgRes, fodaRes] = await Promise.all([
    supabaseClient.from('plan_contenido').select('id', { count: 'exact', head: true }).eq('plan_id', planId),
    supabaseClient.from('kpis').select('id', { count: 'exact', head: true }).eq('plan_id', planId),
    supabaseClient.from('proyectos').select('id', { count: 'exact', head: true }).eq('plan_id', planId),
    supabaseClient.from('matriz_bcg').select('plan_id', { count: 'exact', head: true }).eq('plan_id', planId),
    supabaseClient.from('foda').select('id', { count: 'exact', head: true }).eq('plan_id', planId),
  ]);
  result['resumen'] = (m01Res.count || 0) > 0 || (fodaRes.count || 0) > 0;
  result['kpis'] = (kpisRes.count || 0) > 0;
  result['desempeno'] = (proyRes.count || 0) > 0;
  result['bcg'] = (bcgRes.count || 0) > 0;
  result['trazabilidad'] = (fodaRes.count || 0) > 0;
  return result;
}

async function verificarActualizaciones(planId, tipo) {
  const { data: lectura } = await supabaseClient.from('reportes_lectura')
    .select('leido_en')
    .eq('usuario_id', currentUser.id)
    .eq('plan_id', planId)
    .eq('tipo_reporte', tipo)
    .single();

  const desde = lectura?.leido_en ? new Date(lectura.leido_en).toISOString() : '1970-01-01';
  const modulos = {
    resumen: ['empresa','foda','plan_contenido'],
    kpis: ['kpis'],
    desempeno: ['proyectos','tareas'],
    bcg: ['bcg','matriz_bcg'],
    trazabilidad: ['foda','cadena_valor']
  }[tipo] || [];

  const { data: auditoria, error } = await supabaseClient.from('auditoria')
    .select('*')
    .in('modulo', modulos)
    .gt('fecha', desde)
    .order('fecha', { ascending: false })
    .limit(20);

  if (error || !auditoria || auditoria.length === 0) return { hayActualizaciones: false, cantidad: 0, registros: [] };
  return { hayActualizaciones: true, cantidad: auditoria.length, registros: auditoria };
}

async function registrarLectura(planId, tipo) {
  if (!planId || !currentUser) return;
  const { error } = await supabaseClient.from('reportes_lectura').upsert({
    usuario_id: currentUser.id,
    plan_id: planId,
    tipo_reporte: tipo,
    leido_en: new Date()
  }, { onConflict: 'usuario_id,plan_id,tipo_reporte' });
  if (error) console.error('Error registrando lectura:', error);
}

function aplicarEstadoCards(datos, updates) {
  for (const tipo of ['resumen','kpis','desempeno','bcg','trazabilidad']) {
    const card = document.querySelector(`.reporte-card[data-reporte="${tipo}"]`);
    if (!card) continue;
    const tieneDatos = datos[tipo];
    const tieneUpdates = updates[tipo]?.hayActualizaciones;
    const badge = card.querySelector('.update-badge');
    const btnDetalles = card.querySelector('.btn-ver-detalles');
    const btnDescargar = card.querySelector('.btn-descargar');

    if (tieneDatos) {
      card.classList.remove('disabled');
      btnDescargar.disabled = false;
      if (tieneUpdates) {
        if (badge) badge.style.display = 'inline-flex';
        if (btnDetalles) btnDetalles.style.display = 'inline-flex';
      } else {
        if (badge) badge.style.display = 'none';
        if (btnDetalles) btnDetalles.style.display = 'none';
      }
    } else {
      card.classList.add('disabled');
      btnDescargar.disabled = true;
      if (badge) badge.style.display = 'none';
      if (btnDetalles) btnDetalles.style.display = 'none';
    }
  }
}

async function generarYGuardarPDF(tipo, titulo, htmlContenido) {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = `<div style="font-family:Inter,sans-serif;padding:20px;background:white;"><h1 style="color:#0f172a;margin-bottom:0.5rem;">${titulo}</h1>${htmlContenido}<p style="color:#94a3b8;font-size:10px;margin-top:20px;border-top:1px solid #e2e8f0;padding-top:10px;">Generado por ContaPerú PETI · ${new Date().toLocaleString()}</p></div>`;
  const opts = { margin: [10,10,10,10], filename: `${tipo}.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2, logging: false, useCORS: true }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } };
  const pdfBlob = await html2pdf().set(opts).from(wrapper).outputPdf('blob');
  const fileName = `reporte_${tipo}_${Date.now()}.pdf`;
  const { error: uploadError } = await supabaseClient.storage.from('reportes').upload(fileName, pdfBlob, { contentType: 'application/pdf', upsert: false });
  let fileUrl = '';
  if (!uploadError) {
    const { data: publicUrl } = supabaseClient.storage.from('reportes').getPublicUrl(fileName);
    fileUrl = publicUrl?.publicUrl || '';
  }
  await supabaseClient.from('reportes_generados').insert({
    usuario_id: currentUser.id, plan_id: selectedReportPlanId, tipo_reporte: tipo, formato: 'PDF',
    titulo: titulo, archivo_url: fileUrl, archivo_tamano: pdfBlob.size
  });
  // Trigger download
  const a = document.createElement('a'); a.href = URL.createObjectURL(pdfBlob); a.download = `${tipo}.pdf`; a.click(); URL.revokeObjectURL(a.href);

  await registrarLectura(selectedReportPlanId, tipo);
  await onPlanSeleccionado();
  return fileUrl;
}

async function generarHTMLSintesisFODA(planId) {
  try {
    const { data: pc } = await supabaseClient.from('plan_contenido')
      .select('contenido').eq('plan_id', planId).eq('modulo_id', 'M08').maybeSingle();
    const s = pc?.contenido?.sintesis;
    if (!s || (s.FO === undefined && s.FA === undefined)) return '';
    var rels = [
      { rel:'FO', label:'Fortalezas + Oportunidades', tipo:'Estrategia Ofensiva', punt:s.FO, desc:'Deber\u00e1 adoptar estrategias de crecimiento' },
      { rel:'FA', label:'Fortalezas + Amenazas', tipo:'Estrategia Defensiva', punt:s.FA, desc:'La empresa est\u00e1 preparada para enfrentarse a las amenazas' },
      { rel:'DO', label:'Debilidades + Oportunidades', tipo:'Estrategia de Reorientaci\u00f3n', punt:s.DO, desc:'La empresa no puede aprovechar las oportunidades porque carece de preparaci\u00f3n adecuada' },
      { rel:'DA', label:'Debilidades + Amenazas', tipo:'Estrategia de Supervivencia', punt:s.DA, desc:'Se enfrenta a amenazas externas sin las fortalezas necesarias para luchar con la competencia' }
    ];
    var html = '<h3 style="color:#2563eb;margin-top:1rem;">S\u00cdNTESIS DE RESULTADOS \u2014 MATRIZ FODA</h3>';
    html += '<table style="width:100%;border-collapse:collapse;font-size:12px;margin-top:0.5rem;">';
    html += '<thead><tr style="background:#f8fafc;"><th style="text-align:left;padding:6px;border:1px solid #e2e8f0;">Relaciones</th><th style="text-align:left;padding:6px;border:1px solid #e2e8f0;">Tipolog\u00eda de estrategia</th><th style="text-align:center;padding:6px;border:1px solid #e2e8f0;">Puntuaci\u00f3n</th><th style="text-align:left;padding:6px;border:1px solid #e2e8f0;">Descripci\u00f3n</th></tr></thead><tbody>';
    rels.forEach(function(r){
      var pv = r.punt !== undefined && r.punt !== null ? r.punt + '%' : '\u2014';
      html += '<tr><td style="padding:6px;border:1px solid #e2e8f0;"><strong>' + r.rel + '</strong><br><span style="font-size:11px;color:#64748b;">' + r.label + '</span></td><td style="padding:6px;border:1px solid #e2e8f0;">' + r.tipo + '</td><td style="text-align:center;padding:6px;border:1px solid #e2e8f0;font-weight:700;">' + pv + '</td><td style="padding:6px;border:1px solid #e2e8f0;font-size:11px;color:#475569;">' + r.desc + '</td></tr>';
    });
    html += '</tbody></table>';
    return html;
  } catch(e) { console.error('Error generando síntesis FODA:', e); return ''; }
}

window.descargarReporte = async function(tipo) {
  if (!selectedReportPlanId) { showToast('Selecciona un plan primero.', 'error'); return; }
  const { data: plan } = await supabaseClient.from('planes').select('nombre, anio').eq('id', selectedReportPlanId).single();
  const planNombre = plan?.nombre || 'PETI';
  let titulo = '', htmlContenido = '';
  if (tipo === 'resumen') {
    titulo = `Resumen Ejecutivo - ${planNombre}`;
    if (!cachedM01) {
      const [empresaRes, globalRes] = await Promise.all([
        supabaseClient.from('empresa').select('*').eq('id', 1).single(),
        supabaseClient.from('empresa_contenido').select('*').eq('id', 1).single()
      ]);
      cachedM01 = { empresa: empresaRes.data, contenido: globalRes.data };
    }
    const infoGlobal = cachedM01?.contenido || {};
    const { data: foo } = await supabaseClient.from('foda').select('tipo,descripcion').eq('plan_id', selectedReportPlanId).limit(20);
    const sintesisHtml = await generarHTMLSintesisFODA(selectedReportPlanId);
    htmlContenido = `<h2 style="color:#334155;">${planNombre} (${plan?.anio})</h2><h3 style="color:#2563eb;">Misión</h3><p>${infoGlobal.mision || '—'}</p><h3 style="color:#2563eb;">Visión</h3><p>${infoGlobal.vision || '—'}</p><h3 style="color:#2563eb;">FODA</h3>${(foo||[]).map(f=>`<p><strong>${f.tipo}:</strong> ${f.descripcion}</p>`).join('')}${sintesisHtml}`;
  } else if (tipo === 'kpis') {
    titulo = `Avance de KPIs - ${planNombre}`;
    const { data: kpis } = await supabaseClient.from('kpis').select('*').eq('plan_id', selectedReportPlanId);
    htmlContenido = `<h2 style="color:#334155;">KPIs de ${planNombre}</h2><table style="width:100%;border-collapse:collapse;font-size:12px;"><tr style="background:#f8fafc;"><th style="text-align:left;padding:4px;">KPI</th><th style="text-align:right;padding:4px;">Actual</th><th style="text-align:right;padding:4px;">Meta</th></tr>${(kpis||[]).map(k => `<tr><td style="padding:4px;">${k.nombre}</td><td style="text-align:right;padding:4px;">${k.valor_actual || '—'} ${k.unidad||''}</td><td style="text-align:right;padding:4px;">${k.meta || '—'} ${k.unidad||''}</td></tr>`).join('')}</table>`;
  } else if (tipo === 'desempeno') {
    titulo = `Desempeño por Área - ${planNombre}`;
    const { data: proys } = await supabaseClient.from('proyectos').select('nombre, avance, estado').eq('plan_id', selectedReportPlanId);
    htmlContenido = `<h2 style="color:#334155;">Proyectos de ${planNombre}</h2>${(proys||[]).map(p => `<p>${p.nombre}: ${p.avance||0}% (${p.estado})</p>`).join('')}`;
  } else if (tipo === 'bcg') {
    titulo = `Análisis BCG - ${planNombre}`;
    const { data: bcg } = await supabaseClient.from('matriz_bcg').select('datos_uen').eq('plan_id', selectedReportPlanId).single();
    const uens = bcg?.datos_uen || [];
    htmlContenido = `<h2 style="color:#334155;">BCG ${planNombre}</h2>${Array.isArray(uens) ? uens.map((u,i) => `<p>${i+1}. ${u.nombre || 'UEN '+(i+1)}: ${u.cuadrante || '—'}</p>`).join('') : '<p>Sin datos BCG.</p>'}`;
  } else if (tipo === 'trazabilidad') {
    titulo = `Trazabilidad FODA - ${planNombre}`;
    const { data: foo } = await supabaseClient.from('foda').select('*').eq('plan_id', selectedReportPlanId);
    htmlContenido = `<h2 style="color:#334155;">Trazabilidad FODA</h2>${(foo||[]).map(f => `<p><strong>${f.tipo}:</strong> ${f.descripcion}</p>`).join('')}`;
  }
  try {
    await generarYGuardarPDF(tipo, titulo, htmlContenido);
  } catch(e) {
    console.error('Error generando reporte:', e);
    showToast('Error al generar el reporte.', 'error');
  }
};

window.descargarAvanceGeneral = async function() {
  if (!selectedReportPlanId) { showToast('Selecciona un plan primero.', 'error'); return; }
  const { data: plan } = await supabaseClient.from('planes').select('nombre, anio, descripcion').eq('id', selectedReportPlanId).single();
  const planNombre = plan?.nombre || 'PETI';
  const { data: modulos } = await supabaseClient.from('modulos').select('*').order('orden');
  const { data: contenidos } = await supabaseClient.from('plan_contenido').select('modulo_id, completado').eq('plan_id', selectedReportPlanId);
  const { data: kpisAll } = await supabaseClient.from('kpis').select('*').eq('plan_id', selectedReportPlanId);
  const { data: proysAll } = await supabaseClient.from('proyectos').select('*').eq('plan_id', selectedReportPlanId);
  const { data: bcgAll } = await supabaseClient.from('matriz_bcg').select('datos_uen').eq('plan_id', selectedReportPlanId).single();
  const { data: fodaAll } = await supabaseClient.from('foda').select('*').eq('plan_id', selectedReportPlanId).limit(30);
  const sintesisHtml = await generarHTMLSintesisFODA(selectedReportPlanId);

  const compMap = Object.fromEntries((contenidos || []).map(c => [c.modulo_id, c.completado]));
  const completados = Object.values(compMap).filter(Boolean).length;
  const pct = modulos?.length ? Math.round((completados / modulos.length) * 100) : 0;

  let html = `<h1 style="color:#0f172a;">Avance General: ${planNombre} (${plan?.anio || ''})</h1>
    <p style="color:#475569;">${plan?.descripcion || ''}</p>
    <h2 style="color:#2563eb;border-bottom:2px solid #e2e8f0;padding-bottom:4px;">Módulos: ${completados}/${modulos.length} (${pct}%)</h2>
    <table style="width:100%;border-collapse:collapse;font-size:12px;">${(modulos||[]).map(m => `<tr><td>${m.id} ${m.nombre}</td><td style="text-align:right;">${compMap[m.id] ? 'Completado' : 'Pendiente'}</td></tr>`).join('')}</table>
    <h2 style="color:#2563eb;border-bottom:2px solid #e2e8f0;padding-bottom:4px;margin-top:1rem;">KPIs (${kpisAll?.length || 0})</h2>${(kpisAll||[]).map(k => `<p><strong>${k.nombre}:</strong> ${k.valor_actual || '—'}/${k.meta || '—'} ${k.unidad||''}</p>`).join('')}
    <h2 style="color:#2563eb;border-bottom:2px solid #e2e8f0;padding-bottom:4px;margin-top:1rem;">Proyectos (${proysAll?.length || 0})</h2>${(proysAll||[]).map(p => `<p>${p.nombre}: ${p.avance||0}% (${p.estado})</p>`).join('')}
    <h2 style="color:#2563eb;border-bottom:2px solid #e2e8f0;padding-bottom:4px;margin-top:1rem;">FODA (${fodaAll?.length || 0} items)</h2>${(fodaAll||[]).map(f => `<p><strong>${f.tipo}:</strong> ${f.descripcion}</p>`).join('')}${sintesisHtml}`;
  if (bcgAll?.datos_uen) {
    const uens = Array.isArray(bcgAll.datos_uen) ? bcgAll.datos_uen : [];
    html += `<h2 style="color:#2563eb;border-bottom:2px solid #e2e8f0;padding-bottom:4px;margin-top:1rem;">BCG (${uens.length} UEN)</h2>${uens.map((u,i) => `<p>${i+1}. ${u.nombre || 'UEN '+(i+1)}: ${u.cuadrante || '—'}</p>`).join('')}`;
  }

  try {
    await generarYGuardarPDF('avance_general', `Avance General - ${planNombre}`, html);
  } catch(e) {
    console.error('Error generando avance general:', e);
    showToast('Error al generar el reporte.', 'error');
  }
};

window.descargarPlanCompleto = async function(planId) {
  if (!planId) return;

  // Datos generales de la empresa + plan seleccionado
  const [{ data: empresa }, { data: globalContenido }, { data: plan }] = await Promise.all([
    supabaseClient.from('empresa').select('nombre').eq('id', 1).single(),
    supabaseClient.from('empresa_contenido').select('mision, vision, valores').eq('id', 1).single(),
    supabaseClient.from('planes').select('nombre, anio, descripcion, estado').eq('id', planId).single()
  ]);
  if (!plan) { showToast('Plan no encontrado.', 'error'); return; }

  const [
    modulosRes, contenidosRes, objetivosRes,
    cadenaFodaRes, bcgRes, bcgFodaRes, porterRes, pestRes,
    fodaRes, cameRes
  ] = await Promise.all([
    supabaseClient.from('modulos').select('*').order('orden'),
    supabaseClient.from('plan_contenido').select('modulo_id, completado, contenido').eq('plan_id', planId),
    supabaseClient.from('objetivos_generales').select('*').eq('plan_id', planId).order('orden'),
    supabaseClient.from('cadena_valor_foda').select('*').eq('plan_id', planId),
    supabaseClient.from('matriz_bcg').select('*').eq('plan_id', planId).maybeSingle(),
    supabaseClient.from('bcg_foda').select('*').eq('plan_id', planId),
    supabaseClient.from('porter_oa').select('*').eq('plan_id', planId),
    supabaseClient.from('pest_oa').select('*').eq('plan_id', planId),
    supabaseClient.from('foda').select('*').eq('plan_id', planId),
    supabaseClient.from('came').select('*').eq('plan_id', planId)
  ]);

  const modulos = modulosRes.data || [];
  const contenidos = contenidosRes.data || [];
  const contMap = Object.fromEntries(contenidos.map(c => [c.modulo_id, c]));
  const objetivos = objetivosRes.data || [];
  // Query específicos por objetivo_general_id (no por plan_id)
  const generalIds = objetivos.map(og => og.id);
  let especificos = [];
  if (generalIds.length) {
    const { data: especData } = await supabaseClient
      .from('objetivos_especificos')
      .select('*')
      .in('objetivo_general_id', generalIds)
      .order('orden');
    especificos = especData || [];
  }
  const especByObj = {};
  especificos.forEach(e => {
    const key = String(e.objetivo_general_id);
    if (!especByObj[key]) especByObj[key] = [];
    especByObj[key].push(e);
  });
  const cadenaFoda = cadenaFodaRes.data || [];
  const bcgData = bcgRes.data || {};
  const bcgUens = Array.isArray(bcgData.datos_uen) ? bcgData.datos_uen : [];
  const bcgFoda = bcgFodaRes.data || [];
  const porterOA = porterRes.data || [];
  const pestOA = pestRes.data || [];
  const foda = fodaRes.data || [];
  const cameItems = cameRes.data || [];
  const pestContenido = contMap['M07']?.contenido?.normalizados || contMap['M07']?.contenido?.promedios || {};

  const fechaHoy = new Date().toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' });
  const empresaNombre = empresa?.nombre || 'ContaPerú S.A.C.';
  const planNombre = plan.nombre || 'Planeamiento Estratégico';
  const contenidoGlobal = globalContenido || {};
  const valoresGlobal = Array.isArray(contenidoGlobal.valores) && contenidoGlobal.valores.length ? contenidoGlobal.valores : null;

  const lista = items => items.length ? `<ul style="margin:0.3rem 0 0 1.2rem;padding:0;color:#334155;line-height:1.6;">${items.map(i => `<li style="margin-bottom:0.35rem;">${i.descripcion || i}</li>`).join('')}</ul>` : '<p class="pdf-empty">No hay datos registrados.</p>';
  const subtitle = (title, content) => `<div class="pdf-subsection"><h4>${title}</h4>${content}</div>`;

  // Gráfico BCG (burbujas)
  function bcgChartHTML(uens) {
    if (!uens.length) return '';
    const cw = 350, ch = 300, labelW = 24, plotL = 0, plotT = 20, plotR = 20, plotB = 40;
    const pw = cw - plotL - plotR, ph = ch - plotT - plotB;
    const prms = uens.map(u => parseFloat(u.prm) || 0);
    const tcms = uens.map(u => parseFloat(u.tcm) || 0);
    const minPrm = Math.min(0, ...prms), maxPrm = Math.max(1, ...prms);
    const minTcm = Math.min(0, ...tcms), maxTcm = Math.max(10, ...tcms);
    const padX = (maxPrm - minPrm) * 0.1 || 1, padY = (maxTcm - minTcm) * 0.1 || 1;
    const xMin = minPrm - padX, xMax = maxPrm + padX;
    const yMin = minTcm - padY, yMax = maxTcm + padY;
    const toX = prm => plotL + ((prm - xMin) / (xMax - xMin)) * pw;
    const toY = tcm => ch - plotB - ((tcm - yMin) / (yMax - yMin)) * ph;
    const colorMap = { 'Estrella': '#2563eb', 'Vaca': '#059669', 'Interrogante': '#d97706', 'Incógnita': '#d97706', 'Perro': '#dc2626' };
    let dots = '', legend = '';
    uens.forEach((u, idx) => {
      const x = toX(parseFloat(u.prm) || 0);
      const y = toY(parseFloat(u.tcm) || 0);
      const r = Math.max(14, Math.min(30, 14 + ((parseFloat(u.ventas_empresa) || 0) / 2000)));
      dots += `<div style="position:absolute;left:${x}px;top:${y}px;transform:translate(-50%,-50%);width:${r}px;height:${r}px;border-radius:50%;background:${colorMap[u.cuadrante] || '#64748b'};border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.2);" title="${u.nombre}"></div>`;
      legend += `<div style="display:flex;align-items:center;gap:0.3rem;font-size:11px;color:#334155;margin-right:0.8rem;"><span style="width:10px;height:10px;border-radius:50%;background:${colorMap[u.cuadrante] || '#64748b'};"></span>${idx + 1}. ${u.nombre}</div>`;
    });
    return `
      <div style="margin:1rem auto 0.5rem;display:flex;align-items:stretch;width:${cw + labelW}px;height:${ch}px;font-size:11px;">
        <div style="width:${labelW}px;position:relative;">
          <div style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%) rotate(-90deg);white-space:nowrap;color:#64748b;font-size:10px;text-align:center;transform-origin:center;">Tasa de Crecimiento del Mercado (TCM %)</div>
        </div>
        <div style="flex:1;position:relative;">
          <div style="position:absolute;left:${plotL}px;top:${plotT}px;right:${plotR}px;bottom:${plotB}px;background:#f8fafc;border:1px solid #e2e8f0;">
            <div style="position:absolute;left:50%;top:0;bottom:0;width:1px;background:#cbd5e1;"></div>
            <div style="position:absolute;top:50%;left:0;right:0;height:1px;background:#cbd5e1;"></div>
            <div style="position:absolute;left:3px;top:3px;color:#94a3b8;font-size:9px;">Estrella</div>
            <div style="position:absolute;right:3px;top:3px;color:#94a3b8;font-size:9px;">Incógnita</div>
            <div style="position:absolute;left:3px;bottom:3px;color:#94a3b8;font-size:9px;">Vaca</div>
            <div style="position:absolute;right:3px;bottom:3px;color:#94a3b8;font-size:9px;">Perro</div>
            ${dots}
          </div>
          <div style="position:absolute;left:0;right:0;bottom:5px;text-align:center;color:#64748b;font-size:10px;">Participación Relativa en el Mercado (PRM)</div>
        </div>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:0.4rem;justify-content:center;margin-bottom:1rem;">${legend}</div>`;
  }

  // Gráfico PEST (barras)
  function pestChartHTML(impactos) {
    const factors = [];
    for (const [key, val] of Object.entries(impactos)) {
      if (key === 'puntajes') continue;
      const num = parseFloat(val);
      if (!isNaN(num) && val !== null) factors.push({ label: key, value: num });
    }
    if (!factors.length) return '';
    const maxVal = Math.max(1, ...factors.map(f => f.value));
    let bars = '';
    factors.forEach(f => {
      const pct = (f.value / maxVal) * 100;
      const label = f.label.charAt(0).toUpperCase() + f.label.slice(1);
      bars += `<div style="display:flex;align-items:center;margin-bottom:8px;"><div style="width:130px;font-size:12px;color:#334155;">${label}</div><div style="flex:1;background:#f1f5f9;border-radius:4px;height:22px;overflow:hidden;"><div style="width:${pct}%;background:#2563eb;height:100%;border-radius:4px;"></div></div><div style="width:50px;text-align:right;font-size:12px;color:#64748b;padding-left:8px;">${f.value.toFixed(2)}</div></div>`;
    });
    return `<div style="margin:1rem 0;max-width:500px;">${bars}</div>`;
  }

  // Gráfico FODA (barras por tipo)
  function fodaChartHTML(items) {
    if (!items.length) return '';
    const grupos = { fortaleza: 0, debilidad: 0, oportunidad: 0, amenaza: 0 };
    items.forEach(i => { if (grupos[i.tipo] !== undefined) grupos[i.tipo]++; });
    const labels = { fortaleza: 'Fortalezas', debilidad: 'Debilidades', oportunidad: 'Oportunidades', amenaza: 'Amenazas' };
    const colors = { fortaleza: '#059669', debilidad: '#dc2626', oportunidad: '#2563eb', amenaza: '#d97706' };
    const maxCount = Math.max(1, ...Object.values(grupos));
    let bars = '';
    Object.entries(grupos).forEach(([tipo, count]) => {
      const pct = (count / maxCount) * 100;
      bars += `<div style="display:flex;align-items:center;margin-bottom:8px;"><div style="width:110px;font-size:12px;color:#334155;">${labels[tipo]}</div><div style="flex:1;background:#f1f5f9;border-radius:4px;height:22px;overflow:hidden;"><div style="width:${pct}%;background:${colors[tipo]};height:100%;border-radius:4px;"></div></div><div style="width:35px;text-align:right;font-size:12px;color:#64748b;padding-left:8px;">${count}</div></div>`;
    });
    return `<div style="margin:1rem 0;max-width:500px;">${bars}</div>`;
  }

  // FODA cruzada (sintesis desde plan_contenido M08)
  let dafoCont = contMap['M08']?.contenido;
  let dafoScores = dafoCont?.sintesis || null;
  if (!dafoScores) {
    const { data: pcFallback } = await supabaseClient.from('plan_contenido')
      .select('contenido').eq('plan_id', planId).eq('modulo_id', 'M08').maybeSingle();
    if (pcFallback?.contenido?.sintesis) dafoScores = pcFallback.contenido.sintesis;
  }
  const dafoRows = dafoScores ? [
    { rel: 'FO', label: 'Fortalezas + Oportunidades', tipo: 'Estrategia Ofensiva', punt: dafoScores.FO, desc: 'Deber\u00e1 adoptar estrategias de crecimiento', color: '#059669' },
    { rel: 'FA', label: 'Fortalezas + Amenazas', tipo: 'Estrategia Defensiva', punt: dafoScores.FA, desc: 'La empresa est\u00e1 preparada para enfrentarse a las amenazas', color: '#2563eb' },
    { rel: 'DO', label: 'Debilidades + Oportunidades', tipo: 'Estrategia de Reorientaci\u00f3n', punt: dafoScores.DO, desc: 'La empresa no puede aprovechar las oportunidades por falta de preparaci\u00f3n', color: '#d97706' },
    { rel: 'DA', label: 'Debilidades + Amenazas', tipo: 'Estrategia de Supervivencia', punt: dafoScores.DA, desc: 'Se enfrenta a amenazas externas sin las fortalezas necesarias', color: '#dc2626' }
  ] : [];

  const sections = [];
  let secIdx = 0;

  function addSection(name, html) {
    secIdx++;
    sections.push({ num: secIdx, name, html: `<div class="pdf-module-section">${html}</div>` });
  }

  function addSubSection(secNum, subNum, title, content) {
    sections.push({ num: `${secNum}.${subNum}`, name: title, html: `<div class="pdf-subsection pdf-subsection-level2">${content}</div>` });
  }

  // M04 Objetivos
  let objetivosHtml = '';
  if (!objetivos.length) {
    objetivosHtml = '<p class="pdf-empty">No hay datos registrados.</p>';
  } else {
    objetivosHtml = '<ul style="margin:0;padding:0 0 0 1.2rem;color:#334155;line-height:1.6;">';
    objetivos.forEach(og => {
      const especs = especByObj[String(og.id)] || [];
      objetivosHtml += `<li style="margin-bottom:0.8rem;"><strong>${og.descripcion}</strong>`;
      if (especs.length) {
        objetivosHtml += `<ul style="margin:0.3rem 0 0 1rem;padding:0;color:#475569;font-size:0.92em;">${especs.map(e => `<li style="margin-bottom:0.2rem;">${e.descripcion}</li>`).join('')}</ul>`;
      }
      objetivosHtml += `</li>`;
    });
    objetivosHtml += '</ul>';
  }
  addSection('Objetivos específicos y generales', objetivosHtml);

  // M05 Cadena de valor
  addSection('Cadena de valor', '');
  const cadFortalezas = cadenaFoda.filter(i => i.tipo === 'fortaleza');
  const cadDebilidades = cadenaFoda.filter(i => i.tipo === 'debilidad');
  addSubSection(secIdx, 1, 'Fortalezas', lista(cadFortalezas));
  addSubSection(secIdx, 2, 'Debilidades', lista(cadDebilidades));

  // M06 Matriz BCG
  addSection('Matriz BCG', '');
  const bcgFortalezas = bcgFoda.filter(i => i.tipo === 'fortaleza');
  const bcgDebilidades = bcgFoda.filter(i => i.tipo === 'debilidad');
  const bcgChartHtml = bcgChartHTML(bcgUens);
  addSubSection(secIdx, 1, 'Gráfico de burbujas BCG', bcgChartHtml || '<p class="pdf-empty">No hay datos registrados.</p>');
  addSubSection(secIdx, 2, 'Fortalezas', lista(bcgFortalezas));
  addSubSection(secIdx, 3, 'Debilidades', lista(bcgDebilidades));

  // M07 Porter
  addSection('Porter', '');
  const porterOportunidades = porterOA.filter(i => i.tipo === 'oportunidad');
  const porterAmenazas = porterOA.filter(i => i.tipo === 'amenaza');
  addSubSection(secIdx, 1, 'Oportunidades', lista(porterOportunidades));
  addSubSection(secIdx, 2, 'Amenazas', lista(porterAmenazas));

  // M08 PEST
  addSection('PEST', '');
  const pestOportunidades = pestOA.filter(i => i.tipo === 'oportunidad');
  const pestAmenazas = pestOA.filter(i => i.tipo === 'amenaza');
  const pestChartHtml = pestChartHTML(pestContenido);
  addSubSection(secIdx, 1, 'Gráfico de impacto normalizado', pestChartHtml || '<p class="pdf-empty">No hay datos registrados.</p>');
  addSubSection(secIdx, 2, 'Oportunidades', lista(pestOportunidades));
  addSubSection(secIdx, 3, 'Amenazas', lista(pestAmenazas));

  // M09 FODA
  addSection('FODA', '');
  const fodaCruceHtml = dafoRows.length ? `
    <table class="pdf-table">
      <thead><tr><th>Cruce</th><th>Estrategia</th><th>Puntuación</th><th>Interpretación</th></tr></thead>
      <tbody>${dafoRows.map(r => `<tr>
        <td><strong>${r.rel}</strong></td>
        <td>${r.label}</td>
        <td>${typeof r.punt === 'number' ? r.punt + '%' : '—'}</td>
        <td style="font-size:0.9em;">${r.tipo}. ${r.desc}</td>
      </tr>`).join('')}</tbody>
    </table>` : '<p class="pdf-empty">No hay datos registrados.</p>';
  addSubSection(secIdx, 1, 'Tabla de resultados', fodaCruceHtml);

  // M10 CAME
  addSection('Matriz CAME', '');
  const cameCorregir = cameItems.filter(i => i.categoria === 'corregir');
  const cameAfrontar = cameItems.filter(i => i.categoria === 'afrontar');
  const cameMantener = cameItems.filter(i => i.categoria === 'mantener');
  const cameExplotar = cameItems.filter(i => i.categoria === 'explotar');
  addSubSection(secIdx, 1, 'Corregir debilidades', lista(cameCorregir));
  addSubSection(secIdx, 2, 'Afrontar amenazas', lista(cameAfrontar));
  addSubSection(secIdx, 3, 'Mantener fortalezas', lista(cameMantener));
  addSubSection(secIdx, 4, 'Explorar oportunidades', lista(cameExplotar));

  const coverPage = `
    <div class="pdf-page pdf-cover">
      <div class="pdf-cover-content">
        <div class="pdf-cover-empresa">${empresaNombre}</div>
        <div class="pdf-cover-titulo">${planNombre}</div>
        <div class="pdf-cover-sub">Planeamiento Estratégico ${plan.anio || ''}</div>
        <div class="pdf-cover-fecha">${fechaHoy}</div>
      </div>
    </div>`;

  const misionVisionPage = `
    <div class="pdf-page pdf-mision-vision">
      <h2 class="pdf-section-title">Misión, Visión y Valores</h2>
      <div class="pdf-block">
        <h3>Misión</h3>
        ${contenidoGlobal.mision ? `<p>${contenidoGlobal.mision}</p>` : '<p class="pdf-empty">No hay datos registrados actualmente.</p>'}
      </div>
      <div class="pdf-block">
        <h3>Visión</h3>
        ${contenidoGlobal.vision ? `<p>${contenidoGlobal.vision}</p>` : '<p class="pdf-empty">No hay datos registrados actualmente.</p>'}
      </div>
      <div class="pdf-block">
        <h3>Valores corporativos</h3>
        ${valoresGlobal ? `<ul>${valoresGlobal.map(v => `<li><strong>${v.titulo || v}</strong>${v.descripcion ? `<br><span>${v.descripcion}</span>` : ''}</li>`).join('')}</ul>` : '<p class="pdf-empty">No hay datos registrados actualmente.</p>'}
      </div>
    </div>`;

  const modulesPage = `<div class="pdf-page pdf-modules-page">${sections.map(s => {
    const isMain = typeof s.num === 'number';
    return isMain
      ? `<h2 class="pdf-section-title">${s.num}. ${s.name}</h2>${s.html}`
      : `<h3 class="pdf-subsection-title">${s.num} ${s.name}</h3>${s.html}`;
  }).join('')}</div>`;

  const wrapper = document.createElement('div');
  wrapper.innerHTML = `
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
      .pdf-doc { font-family: 'Inter', sans-serif; color: #0f172a; }
      .pdf-page { padding: 30px 40px; box-sizing: border-box; }
      .pdf-cover {
        page-break-after: always;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        background: #ffffff;
        padding: 60px;
      }
      .pdf-cover-content { max-width: 75%; }
      .pdf-cover-empresa { font-size: 26px; color: #64748b; text-transform: uppercase; letter-spacing: 3px; margin-bottom: 30px; }
      .pdf-cover-titulo { font-size: 52px; font-weight: 700; color: #0f172a; margin-bottom: 16px; line-height: 1.1; }
      .pdf-cover-sub { font-size: 22px; color: #334155; margin-bottom: 40px; }
      .pdf-cover-fecha { font-size: 18px; color: #64748b; }
      .pdf-mision-vision { page-break-after: always; }
      .pdf-modules-page { page-break-before: auto; }
      .pdf-section-title { font-size: 20px; color: #2563eb; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; margin: 28px 0 16px 0; }
      .pdf-subsection-title { font-size: 14px; color: #1e293b; font-weight: 600; margin: 14px 0 8px 24px; }
      .pdf-module-section { margin-bottom: 20px; }
      .pdf-subsection { margin-bottom: 14px; page-break-inside: avoid; }
      .pdf-subsection-level2 { margin-left: 48px; }
      .pdf-subsection h4 { font-size: 12px; color: #1e293b; margin: 0 0 5px 0; text-transform: uppercase; letter-spacing: 0.5px; }
      .pdf-block { margin-bottom: 18px; }
      .pdf-block h3 { font-size: 13px; color: #1e293b; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px; }
      .pdf-block p { color: #334155; line-height: 1.6; margin: 0; }
      .pdf-block ul { margin: 6px 0 0 18px; padding: 0; color: #334155; line-height: 1.6; }
      .pdf-block ul li { margin-bottom: 6px; }
      .pdf-empty { color: #94a3b8; font-style: italic; }
      .pdf-table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 6px; }
      .pdf-table th { background: #f8fafc; text-align: left; padding: 6px; border-bottom: 2px solid #e2e8f0; }
      .pdf-table td { padding: 6px; border-bottom: 1px solid #e2e8f0; }
    </style>
    <div class="pdf-doc">
      ${coverPage}
      ${misionVisionPage}
      ${modulesPage}
    </div>`;

  try {
    const pdf = await html2pdf()
      .set({
        margin: [15, 15, 22, 15],
        filename: `${planNombre.replace(/\s+/g,'_')}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, logging: false, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      })
      .from(wrapper)
      .toPdf()
      .get('pdf');

    const totalPages = pdf.internal.getNumberOfPages();
    for (let i = 2; i <= totalPages; i++) {
      pdf.setPage(i);
      pdf.setFontSize(10);
      pdf.setTextColor('#64748b');
      pdf.text(`Página ${i - 1}`, pdf.internal.pageSize.getWidth() - 15, pdf.internal.pageSize.getHeight() - 10, { align: 'right' });
    }

    pdf.save(`${planNombre.replace(/\s+/g,'_')}.pdf`);
    showToast('PDF descargado correctamente.', 'success');
  } catch(e) {
    console.error('Error generando PDF:', e);
    showToast('Error al generar el PDF.', 'error');
  }
};

window.mostrarDetallesActualizacion = async function(tipo) {
  if (!selectedReportPlanId) return;
  const result = await verificarActualizaciones(selectedReportPlanId, tipo);
  if (!result.hayActualizaciones) { showToast('No hay actualizaciones recientes para este reporte.', 'info'); return; }

  const nombres = { resumen:'Resumen Ejecutivo', kpis:'Avance de KPIs', desempeno:'Desempeño por Área', bcg:'Análisis BCG', trazabilidad:'Trazabilidad FODA' };
  document.getElementById('detallesTituloTipo').innerText = nombres[tipo] || tipo;
  document.getElementById('detallesListaCambios').innerHTML = result.registros.map(a => `
    <div class="update-item">
      <div class="update-item-icon" style="background:${a.accion === 'EDITAR' || a.accion === 'ACTUALIZAR' ? '#FAEEDA' : '#E6F1FB'};">
        <span style="color:${a.accion === 'EDITAR' || a.accion === 'ACTUALIZAR' ? '#633806' : '#0C447C'};">${a.accion === 'EDITAR' || a.accion === 'ACTUALIZAR' ? '✎' : '✓'}</span>
      </div>
      <div class="update-item-body">
        <strong>${a.accion}</strong> en <strong>${a.modulo}</strong>: ${a.detalle || 'Sin detalles'}
      </div>
      <div class="update-item-time">${new Date(a.fecha).toLocaleDateString()}</div>
    </div>`).join('');
  document.getElementById('detallesCerrarBtn').setAttribute('data-tipo-reporte', tipo);
  document.getElementById('detallesActualizacionModal').style.display = 'flex';
};

async function cargarReportesRecientes() {
  let query = supabaseClient.from('reportes_generados').select('*, planes(nombre)').order('created_at', { ascending: false }).limit(10);
  if (selectedReportPlanId) query = query.eq('plan_id', selectedReportPlanId);
  const { data } = await query;
  const container = document.getElementById('reportesRecientesList');
  if (!container) return;
  if (!data || data.length === 0) { container.innerHTML = '<p style="color:#94a3b8;font-size:0.8rem;">Aún no hay reportes generados.</p>'; return; }
  container.innerHTML = data.map(r => `
    <div class="reporte-reciente-card">
      <div class="reporte-reciente-icon" style="background:#EEEDFE;"><i class="bi bi-file-text" style="color:#534AB7;"></i></div>
      <div class="reporte-reciente-info">
        <div>${r.titulo || r.tipo_reporte}</div>
        <div class="reporte-reciente-meta">Generado el ${new Date(r.created_at).toLocaleDateString()} · ${r.planes?.nombre || '—'} · ${r.formato}</div>
      </div>
      <button class="btn-small btn-secondary" onclick="window.open('${r.archivo_url}','_blank')"><i class="bi bi-download"></i> Descargar</button>
    </div>`).join('');
}


