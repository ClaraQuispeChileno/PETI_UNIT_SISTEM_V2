// ==================== CONFIGURACIÓN ====================
const SUPABASE_URL = 'https://ssdphnukjtjqageqfyeu.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_eb5lIWekDOh8Osk9IGydGA_Jw1MktBZ';
let supabaseClient;
let currentUser = null;
let allUsers = [];
let auditoriaData = [];
let auditoriaOrden = { columna: 'fecha', direccion: 'desc' };
let usuariosOrden = { columna: 'username', direccion: 'asc' };
let pendingDelete = null;

// ==================== INICIALIZACIÓN ====================
document.addEventListener('DOMContentLoaded', async () => {
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
  if (!session) { window.location.href = '../index.html'; return; }
  currentUser = JSON.parse(session);
  if (currentUser.role !== 'administrador') { alert('No tienes permiso'); window.location.href = '../index.html'; return; }
  document.getElementById('userNameDisplay').innerText = currentUser.username;
  document.getElementById('currentDate').innerText = `Último acceso: ${new Date().toLocaleString()}`;

  await limpiarAuditoriaAntigua();
  await cargarUsuarios();
  await cargarAuditoria();
  await cargarDashboard();
  await cargarInfoEmpresa();
  setupEventListeners();

  document.getElementById('logoutBtn').addEventListener('click', () => {
    document.getElementById('confirmLogoutModal').style.display = 'flex';
  });
});

// ==================== LIMPIEZA AUDITORÍA ====================
async function limpiarAuditoriaAntigua() {
  try { await supabaseClient.rpc('limpiar_auditoria'); } catch(e) { console.warn(e); }
}

// ==================== AUDITORÍA ====================
async function addAuditoria(modulo, accion, detalle) {
  if (!currentUser) return;
  const fechaPeru = new Date().toLocaleString('en-US', { timeZone: 'America/Lima' });
  await supabaseClient.from('auditoria').insert({
    usuario_email: currentUser.email,
    usuario_nombre: currentUser.username,
    modulo: modulo,
    accion: accion,
    detalle: detalle,
    fecha: fechaPeru
  });
  await cargarAuditoria();
}

// ==================== DASHBOARD ====================
async function cargarDashboard() {
  const { data: usuarios } = await supabaseClient.from('usuarios').select('rol, activo');
  if (!usuarios) return;
  document.getElementById('totalUsuarios').innerText = usuarios.length;
  const fechaLimite = new Date(); fechaLimite.setDate(fechaLimite.getDate() - 30);
  const { data: actividades } = await supabaseClient.from('auditoria').select('id', { count: 'exact' }).gte('fecha', fechaLimite.toISOString());
  document.getElementById('totalActividades').innerText = actividades?.length || 0;
  const { data: ultima } = await supabaseClient.from('auditoria').select('fecha, usuario_nombre, accion, modulo').order('fecha', { ascending: false }).limit(1);
  if (ultima && ultima.length) {
    document.getElementById('ultimaActividadFecha').innerText = new Date(ultima[0].fecha).toLocaleString();
    document.getElementById('ultimaActividadDesc').innerText = `${ultima[0].usuario_nombre} - ${ultima[0].modulo}: ${ultima[0].accion}`;
  } else {
    document.getElementById('ultimaActividadFecha').innerText = 'No hay registros';
    document.getElementById('ultimaActividadDesc').innerText = '—';
  }
  const rolesInteres = ['administrador', 'aprobador', 'estratega'];
  const rolesGrid = document.getElementById('rolesGrid');
  rolesGrid.innerHTML = '';
  for (const rol of rolesInteres) {
    const count = usuarios.filter(u => u.rol === rol && u.activo).length;
    rolesGrid.innerHTML += `<div class="card"><div class="card-title">${rol.toUpperCase()}S</div><div class="card-value">${count}</div><div class="card-desc">activos</div></div>`;
  }
}

// ==================== INFO EMPRESA ====================
async function cargarInfoEmpresa() {
  try {
    const { data: empresa } = await supabaseClient.from('empresa').select('*').eq('id', 1).single();
    if (empresa) {
      document.getElementById('infoEmpresaNombre').innerText = empresa.nombre || 'ContaPerú S.A.C.';
      document.getElementById('infoEmpresaSector').innerText = empresa.sector || 'Servicios contables';
    }
    const { data: global } = await supabaseClient.from('empresa_contenido').select('*').eq('id', 1).single();
    const contenido = global || {};
    document.getElementById('infoEmpresaMision').innerText = contenido.mision || 'No se ha registrado la misión.';
    document.getElementById('infoEmpresaVision').innerText = contenido.vision || 'No se ha registrado la visión.';
    const valores = Array.isArray(contenido.valores) ? contenido.valores : [];
    const valoresContainer = document.getElementById('infoEmpresaValores');
    if (valores.length === 0) {
      valoresContainer.innerHTML = '<div class="valor-card">No se han registrado valores corporativos aún.</div>';
    } else {
      valoresContainer.innerHTML = valores.map(v => `<div class="valor-card"><div class="valor-titulo">${v.titulo || v}</div><div class="valor-desc">${v.descripcion || ''}</div></div>`).join('');
    }
  } catch (err) { console.error(err); }
}

// ==================== USUARIOS ====================
async function cargarUsuarios() {
  const { data, error } = await supabaseClient.from('usuarios').select('*').order('creado_en', { ascending: false });
  if (error) { showToast('Error al cargar usuarios', 'error'); return; }
  allUsers = data;
  renderTablaUsuarios();
  setupUserSorting();
}

function renderTablaUsuarios() {
  const filtro = document.getElementById('buscarUsuario')?.value.toLowerCase() || '';
  let usuariosFiltrados = allUsers.filter(user => {
    if (user.email === currentUser.email) return false;
    if (filtro) return user.username.toLowerCase().includes(filtro) || user.rol.toLowerCase().includes(filtro);
    return true;
  });
  usuariosFiltrados.sort((a, b) => {
    let valA = a[usuariosOrden.columna];
    let valB = b[usuariosOrden.columna];
    if (typeof valA === 'string') valA = valA.toLowerCase();
    if (typeof valB === 'string') valB = valB.toLowerCase();
    if (valA < valB) return usuariosOrden.direccion === 'asc' ? -1 : 1;
    if (valA > valB) return usuariosOrden.direccion === 'asc' ? 1 : -1;
    return 0;
  });
  const tbody = document.getElementById('tablaUsuariosBody');
  tbody.innerHTML = '';
  if (usuariosFiltrados.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="empty-state">❌ No se encontraron usuarios que coincidan con la búsqueda.</td></tr>';
    return;
  }
  const rolCount = {};
  allUsers.forEach(u => { rolCount[u.rol] = (rolCount[u.rol] || 0) + 1; });
  usuariosFiltrados.forEach(user => {
    const isLastOfRol = (rolCount[user.rol] === 1);
    const row = tbody.insertRow();
    row.insertCell(0).innerText = user.username;
    row.insertCell(1).innerText = user.rol;
    row.insertCell(2).innerHTML = user.activo ? '<span class="badge-active">Activo</span>' : '<span class="badge-inactive">Inactivo</span>';
    const acciones = row.insertCell(3);
    acciones.innerHTML = `
      <button class="btn-small btn-secondary editar-usuario" data-id="${user.id}" data-nombre="${user.username}" data-rol="${user.rol}" data-activo="${user.activo}"><i class="bi bi-pencil"></i> Editar</button>
      ${!isLastOfRol ? `<button class="btn-small btn-danger eliminar-usuario" data-id="${user.id}" data-nombre="${user.username}" data-rol="${user.rol}" style="margin-left:0.5rem;"><i class="bi bi-trash"></i> Eliminar</button>` : `<button class="btn-small btn-danger" disabled style="margin-left:0.5rem; opacity:0.5;" title="No se puede eliminar al único usuario con este rol"><i class="bi bi-trash"></i> Eliminar</button>`}
    `;
  });
  attachUserEvents();
}

function attachUserEvents() {
  document.querySelectorAll('.editar-usuario').forEach(btn => btn.addEventListener('click', () => {
    editarUsuario(btn.dataset.id, btn.dataset.nombre, btn.dataset.rol, btn.dataset.activo === 'true');
  }));
  document.querySelectorAll('.eliminar-usuario').forEach(btn => {
    if (!btn.disabled) {
      btn.addEventListener('click', () => {
        pendingDelete = { id: btn.dataset.id, nombre: btn.dataset.nombre, rol: btn.dataset.rol };
        document.getElementById('confirmDeleteModal').style.display = 'flex';
      });
    }
  });
}

function setupUserSorting() {
  const table = document.querySelector('#usuarios .tabla-auditoria');
  if (!table) return;
  const headers = table.querySelectorAll('thead th');
  if (headers.length >= 2) {
    headers[0].style.cursor = 'pointer';
    headers[1].style.cursor = 'pointer';
    headers[0].addEventListener('click', () => {
      if (usuariosOrden.columna === 'username') {
        usuariosOrden.direccion = usuariosOrden.direccion === 'asc' ? 'desc' : 'asc';
      } else {
        usuariosOrden.columna = 'username';
        usuariosOrden.direccion = 'asc';
      }
      renderTablaUsuarios();
    });
    headers[1].addEventListener('click', () => {
      if (usuariosOrden.columna === 'rol') {
        usuariosOrden.direccion = usuariosOrden.direccion === 'asc' ? 'desc' : 'asc';
      } else {
        usuariosOrden.columna = 'rol';
        usuariosOrden.direccion = 'asc';
      }
      renderTablaUsuarios();
    });
  }
}

function mostrarModalCrearUsuario() {
  document.getElementById('modalTitle').innerText = 'Nuevo Usuario';
  document.getElementById('editUserId').value = '';
  document.getElementById('modalUsername').value = '';
  document.getElementById('modalRol').value = 'estratega';
  document.getElementById('modalActivo').checked = true;
  document.getElementById('modalPassword').value = '';
  document.getElementById('usuarioModal').style.display = 'flex';
}

function editarUsuario(id, username, rol, activo) {
  const rolCount = {};
  allUsers.forEach(u => { rolCount[u.rol] = (rolCount[u.rol] || 0) + 1; });
  const isLastOfRol = (rolCount[rol] === 1);
  document.getElementById('modalTitle').innerText = 'Editar Usuario';
  document.getElementById('editUserId').value = id;
  document.getElementById('modalUsername').value = username;
  document.getElementById('modalRol').value = rol;
  document.getElementById('modalActivo').checked = activo;
  document.getElementById('modalPassword').value = '';
  if (isLastOfRol && (rol !== 'administrador' || (rol === 'administrador' && allUsers.filter(u => u.rol === 'administrador').length === 1))) {
    document.getElementById('modalRol').disabled = true;
    document.getElementById('modalActivo').disabled = true;
    showToast('No se puede cambiar el rol ni el estado del único usuario con este rol', 'warning');
  } else {
    document.getElementById('modalRol').disabled = false;
    document.getElementById('modalActivo').disabled = false;
  }
  document.getElementById('usuarioModal').style.display = 'flex';
}

// ==================== ACTUALIZAR CONTRASEÑA VÍA EDGE FUNCTION ====================
async function actualizarPassword(userId, newPassword) {
  const session = localStorage.getItem('peti_session');
  if (!session) throw new Error('No hay sesión');
  const { access_token } = JSON.parse(session);
  const response = await fetch(`${SUPABASE_URL}/functions/v1/update-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${access_token}`
    },
    body: JSON.stringify({ user_id: userId, new_password: newPassword })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Error al actualizar contraseña');
  return data;
}

async function guardarUsuarioModal() {
  const id = document.getElementById('editUserId').value;
  const username = document.getElementById('modalUsername').value.trim();
  const rol = document.getElementById('modalRol').value;
  const activo = document.getElementById('modalActivo').checked;
  const password = document.getElementById('modalPassword').value.trim();
  if (!username) { showToast('Complete el nombre de usuario', 'error'); return; }
  if (!id && !password) { showToast('La contraseña es obligatoria para nuevos usuarios', 'error'); return; }
  if (password && password.length < 6) { showToast('La contraseña debe tener al menos 6 caracteres', 'error'); return; }
  try {
    if (id) {
      // Editar usuario existente
      const userToEdit = allUsers.find(u => u.id == id);
      if (userToEdit && userToEdit.email === currentUser.email && rol !== currentUser.role) {
        showToast('No puedes cambiar tu propio rol', 'error'); return;
      }
      const { error } = await supabaseClient.from('usuarios').update({ username, rol, activo }).eq('id', id);
      if (error) throw error;
      if (password) {
        await actualizarPassword(userToEdit.auth_user_id, password);
      }
      await addAuditoria('usuarios', 'ACTUALIZAR', `Usuario ${username} actualizado. Rol: ${rol}, Activo: ${activo}${password ? ' - Contraseña actualizada' : ''}`);
      showToast('Usuario actualizado correctamente', 'success');
    } else {
      // Crear nuevo usuario
      const email = `${username}@contaperu.pe`;
      const { data: authData, error: authError } = await supabaseClient.auth.signUp({ email, password: password });
      if (authError) throw authError;
      const authUserId = authData.user.id;
      const { error: insertError } = await supabaseClient.from('usuarios').insert({
        username, email, rol, activo, creado_en: new Date().toISOString(), auth_user_id: authUserId
      });
      if (insertError) throw insertError;
      await addAuditoria('usuarios', 'CREAR', `Usuario ${username} creado con rol ${rol}`);
      showToast(`Usuario ${username} creado correctamente con rol ${rol}`, 'success');
    }
    cerrarModalUsuario();
    await cargarUsuarios();
    await cargarDashboard();
  } catch (error) { showToast('Error al guardar usuario: ' + error.message, 'error'); }
}

async function eliminarUsuarioConfirmado() {
  if (!pendingDelete) return;
  const { id, nombre, rol } = pendingDelete;
  const admins = allUsers.filter(u => u.rol === 'administrador' && u.id != id);
  if (rol === 'administrador' && admins.length === 0) { showToast('No se puede eliminar al único administrador', 'error'); cerrarModalConfirmacion(); return; }
  const rolCount = {};
  allUsers.forEach(u => { rolCount[u.rol] = (rolCount[u.rol] || 0) + 1; });
  if (rolCount[rol] === 1) { showToast(`No se puede eliminar al único usuario con rol "${rol}"`, 'error'); cerrarModalConfirmacion(); return; }
  try {
    await supabaseClient.from('usuarios').delete().eq('id', id);
    await addAuditoria('usuarios', 'ELIMINAR', `Usuario ${nombre} eliminado`);
    showToast(`Usuario ${nombre} eliminado`, 'success');
    await cargarUsuarios();
    await cargarDashboard();
  } catch (error) { showToast('Error al eliminar: ' + error.message, 'error'); }
  cerrarModalConfirmacion();
  pendingDelete = null;
}

function cerrarModalUsuario() {
  document.getElementById('usuarioModal').style.display = 'none';
  document.getElementById('modalRol').disabled = false;
  document.getElementById('modalActivo').disabled = false;
}

function cerrarModalConfirmacion() {
  document.getElementById('confirmDeleteModal').style.display = 'none';
  document.getElementById('confirmLogoutModal').style.display = 'none';
  pendingDelete = null;
}

// ==================== AUDITORÍA ====================
let filtroUsuario = '', filtroAccion = '', filtroFecha = '';
async function cargarAuditoria() {
  let query = supabaseClient.from('auditoria').select('*').order('fecha', { ascending: false });
  if (filtroUsuario) query = query.ilike('usuario_nombre', `%${filtroUsuario}%`);
  if (filtroAccion) query = query.eq('accion', filtroAccion);
  if (filtroFecha) {
    const fechaInicio = `${filtroFecha}T00:00:00`, fechaFin = `${filtroFecha}T23:59:59`;
    query = query.gte('fecha', fechaInicio).lte('fecha', fechaFin);
  }
  const { data, error } = await query;
  if (error) { showToast('Error al cargar auditoría', 'error'); return; }
  auditoriaData = data || [];
  renderTablaAuditoria();
}
function renderTablaAuditoria() {
  const ordenar = (a, b) => {
    let valA = a[auditoriaOrden.columna], valB = b[auditoriaOrden.columna];
    if (auditoriaOrden.columna === 'fecha') { valA = new Date(valA); valB = new Date(valB); }
    if (typeof valA === 'string') valA = valA.toLowerCase();
    if (typeof valB === 'string') valB = valB.toLowerCase();
    if (valA < valB) return auditoriaOrden.direccion === 'asc' ? -1 : 1;
    if (valA > valB) return auditoriaOrden.direccion === 'asc' ? 1 : -1;
    return 0;
  };
  const dataOrdenada = [...auditoriaData].sort(ordenar);
  const tbody = document.getElementById('tablaAuditoriaBody');
  tbody.innerHTML = '';
  if (dataOrdenada.length === 0) { tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No hay registros de auditoría</td></tr>'; return; }
  dataOrdenada.forEach(log => {
    const row = tbody.insertRow();
    row.insertCell(0).innerText = new Date(log.fecha).toLocaleString();
    row.insertCell(1).innerText = log.usuario_nombre || log.usuario_email || '—';
    const accionLabel = log.accion || '—';
    let badgeClass = 'accion-default';
    if (accionLabel === 'CREAR') badgeClass = 'accion-CREAR';
    else if (accionLabel === 'ACTUALIZAR') badgeClass = 'accion-ACTUALIZAR';
    else if (accionLabel === 'ELIMINAR') badgeClass = 'accion-ELIMINAR';
    else if (accionLabel.includes('EXPORTAR')) badgeClass = 'accion-EXPORTAR';
    row.insertCell(2).innerHTML = `<span class="accion-badge ${badgeClass}">${accionLabel}</span>`;
    row.insertCell(3).innerHTML = log.detalle || '—';
    const btnDetalle = document.createElement('button');
    btnDetalle.className = 'btn-detalle-auditoria';
    btnDetalle.innerHTML = '<i class="bi bi-eye"></i> Ver detalle';
    btnDetalle.onclick = () => mostrarDetalleAuditoria(log);
    const cell = row.insertCell(4);
    cell.appendChild(btnDetalle);
    ['Fecha', 'Usuario', 'Acción', 'Detalle', 'Acciones'].forEach((label, idx) => {
      row.cells[idx].setAttribute('data-label', label);
    });
  });
}
function mostrarDetalleAuditoria(log) {
  const modal = document.getElementById('detalleAuditoriaModal');
  const contenido = document.getElementById('detalleAuditoriaContenido');
  contenido.innerHTML = `
    <p><strong>Fecha:</strong> ${new Date(log.fecha).toLocaleString()}</p>
    <p><strong>Usuario:</strong> ${log.usuario_nombre || log.usuario_email}</p>
    <p><strong>Acción:</strong> ${log.accion}</p>
    <p><strong>Detalle completo:</strong></p>
    <pre>${log.detalle || 'Sin detalle'}</pre>
    ${log.tiempo_restante ? `<p><strong>Tiempo restante para limpieza:</strong> ${log.tiempo_restante} días</p>` : ''}
    <p><small>ID del registro: ${log.id}</small></p>
  `;
  modal.style.display = 'flex';
}
function exportarAuditoriaCSV() {
  if (auditoriaData.length === 0) { showToast('No hay datos para exportar', 'error'); return; }
  let csv = "Fecha,Usuario,Acción,Detalle\n";
  auditoriaData.forEach(log => {
    const fecha = new Date(log.fecha).toLocaleString();
    const usuario = log.usuario_nombre || log.usuario_email;
    csv += `"${fecha}","${usuario}","${log.accion}","${(log.detalle || '').replace(/"/g, '""')}"\n`;
  });
  const blob = new Blob([csv], { type: 'text/csv' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `auditoria_${new Date().toISOString().slice(0,10)}.csv`;
  link.click();
  addAuditoria('auditoria', 'EXPORTAR_CSV', 'Exportación completa');
}
function exportarAuditoriaPDF() {
  const element = document.getElementById('tablaAuditoria');
  if (!element) { showToast('No hay datos para exportar', 'error'); return; }
  const opt = { margin: 0.5, filename: `auditoria_${new Date().toISOString().slice(0,10)}.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2 }, jsPDF: { unit: 'in', format: 'a4', orientation: 'landscape' } };
  html2pdf().set(opt).from(element).save();
  addAuditoria('auditoria', 'EXPORTAR_PDF', 'Exportación a PDF');
}

// ==================== EVENTOS ====================
function setupEventListeners() {
  document.getElementById('nuevoUsuarioBtn').addEventListener('click', mostrarModalCrearUsuario);
  document.getElementById('modalSaveBtn').addEventListener('click', guardarUsuarioModal);
  document.getElementById('modalCancelBtn').addEventListener('click', cerrarModalUsuario);
  document.getElementById('exportarAuditoriaCSVBtn').addEventListener('click', exportarAuditoriaCSV);
  document.getElementById('exportarAuditoriaPDFBtn').addEventListener('click', exportarAuditoriaPDF);
  document.getElementById('filtroAuditoriaUsuario').addEventListener('input', (e) => { filtroUsuario = e.target.value; cargarAuditoria(); });
  document.getElementById('filtroAuditoriaAccion').addEventListener('change', (e) => { filtroAccion = e.target.value; cargarAuditoria(); });
  document.getElementById('filtroAuditoriaFecha').addEventListener('change', (e) => { filtroFecha = e.target.value; cargarAuditoria(); });
  document.getElementById('buscarUsuario').addEventListener('input', () => renderTablaUsuarios());
  document.querySelectorAll('#tablaAuditoria th').forEach(th => {
    th.addEventListener('click', () => {
      const columna = th.getAttribute('data-col');
      if (!columna) return;
      if (auditoriaOrden.columna === columna) {
        auditoriaOrden.direccion = auditoriaOrden.direccion === 'asc' ? 'desc' : 'asc';
      } else {
        auditoriaOrden.columna = columna;
        auditoriaOrden.direccion = 'asc';
      }
      renderTablaAuditoria();
    });
  });
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const sectionId = item.getAttribute('data-section');
      document.querySelectorAll('.section-content').forEach(sec => sec.classList.remove('active-section'));
      const target = document.getElementById(sectionId);
      if (target) target.classList.add('active-section');
      document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
      item.classList.add('active');
    });
  });
  document.getElementById('confirmDeleteCancelBtn').addEventListener('click', () => { cerrarModalConfirmacion(); pendingDelete = null; });
  document.getElementById('confirmDeleteAcceptBtn').addEventListener('click', eliminarUsuarioConfirmado);
  document.getElementById('confirmLogoutCancelBtn').addEventListener('click', () => { document.getElementById('confirmLogoutModal').style.display = 'none'; });
  document.getElementById('confirmLogoutCancelBtnFooter').addEventListener('click', () => { document.getElementById('confirmLogoutModal').style.display = 'none'; });
  document.getElementById('confirmLogoutAcceptBtn').addEventListener('click', async () => {
    await supabaseClient.auth.signOut();
    localStorage.removeItem('peti_session');
    window.location.href = '../index.html';
  });
}

function showToast(message, type = 'info') {
  const existingToast = document.querySelector('.peti-toast');
  if (existingToast) existingToast.remove();
  const toast = document.createElement('div');
  toast.className = `peti-toast toast-${type}`;
  toast.innerHTML = `<div class="toast-content"><i class="fas ${type === 'success' ? 'fa-circle-check' : (type === 'error' ? 'fa-circle-exclamation' : 'fa-info-circle')}"></i><span>${message}</span></div>`;
  document.body.appendChild(toast);
  if (!document.getElementById('toast-styles')) {
    const style = document.createElement('style');
    style.id = 'toast-styles';
    style.textContent = `
      .peti-toast { position: fixed; bottom: 2rem; left: 50%; transform: translateX(-50%); background: #0f172a; backdrop-filter: blur(12px); border: 1px solid #334155; border-radius: 3rem; padding: 0.7rem 1.5rem; z-index: 2000; animation: slideUp 0.25s ease; box-shadow: 0 10px 20px -5px rgba(0,0,0,0.3); }
      .toast-content { display: flex; align-items: center; gap: 0.7rem; color: white; font-size: 0.85rem; font-weight: 500; }
      .toast-success i { color: #22c55e; } .toast-error i { color: #f97316; } .toast-info i { color: #3b82f6; }
      @keyframes slideUp { from { opacity: 0; transform: translateX(-50%) translateY(20px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
    `;
    document.head.appendChild(style);
  }
  setTimeout(() => toast.remove(), 3500);
}

window.cerrarModalDetalle = () => {
  document.getElementById('detalleAuditoriaModal').style.display = 'none';
};