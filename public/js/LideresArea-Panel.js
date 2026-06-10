let supabaseClient;
let currentUser = null;

async function cargarM01Global() {
  try {
    const { data: empresa } = await supabaseClient.from('empresa').select('*').eq('id', 1).single();
    if (empresa) {
      const el = id => document.getElementById(id);
      el('lNombre').innerText = empresa.nombre || 'ContaPerú S.A.C.';
      el('lSector').innerText = empresa.sector || 'Servicios contables';
    }
    const { data: global } = await supabaseClient.from('empresa_contenido').select('*').eq('id', 1).single();
    const contenido = global || {};
    document.getElementById('lMision').innerText = contenido.mision || 'No se ha registrado la misión.';
    document.getElementById('lVision').innerText = contenido.vision || 'No se ha registrado la visión.';
    const valores = Array.isArray(contenido.valores) ? contenido.valores : [];
    const container = document.getElementById('lValores');
    if (valores.length === 0) {
      container.innerHTML = '<div class="valor-card" style="flex:1;">No se han registrado valores corporativos aún.</div>';
    } else {
      container.innerHTML = valores.map(v => `<div class="valor-card"><div class="valor-titulo">${v.titulo || v}</div><div class="valor-desc">${v.descripcion || ''}</div></div>`).join('');
    }
  } catch (err) { console.error(err); }
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
  if (currentUser.role !== 'Líderes de Área') {
    alert('No tienes permiso para acceder a este panel.');
    window.location.href = '../index.html';
    return;
  }
  document.getElementById('userNameDisplay').innerText = currentUser.username || 'Líder de Área';

  await supabaseClient.auth.getSession();

  const { data: userRecord } = await supabaseClient.from('usuarios').select('id,email').eq('auth_user_id', currentUser.user_id).maybeSingle();
  if (userRecord) { currentUser.id = userRecord.id; currentUser.email = userRecord.email; }

  await cargarM01Global();

  const now = new Date();
  const formattedDate = `${now.getDate()}/${now.getMonth()+1}/${now.getFullYear()} ${now.getHours()}:${now.getMinutes().toString().padStart(2,'0')}`;
  document.getElementById('currentDate').innerText = `Último acceso: ${formattedDate}`;

  document.getElementById('logoutBtn').addEventListener('click', () => {
    document.getElementById('confirmarLogoutModal').style.display = 'flex';
  });

  window.confirmarLogout = async function() {
    document.getElementById('confirmarLogoutModal').style.display = 'none';
    await supabaseClient.auth.signOut();
    localStorage.removeItem('peti_session');
    window.location.href = '../index.html';
  };

  const ctxAvance = document.getElementById('avanceAreaChart')?.getContext('2d');
  if (ctxAvance) {
    new Chart(ctxAvance, {
      type: 'bar',
      data: { labels: ['Cloud Migration', 'Seguridad', 'Optimización'], datasets: [{ label: 'Avance %', data: [80, 45, 30], backgroundColor: '#3b82f6' }] },
      options: { responsive: true, maintainAspectRatio: true }
    });
  }
  const ctxCarga = document.getElementById('cargaEquipoChart')?.getContext('2d');
  if (ctxCarga) {
    new Chart(ctxCarga, {
      type: 'doughnut',
      data: { labels: ['Ana (3 tareas)', 'Jorge (2)', 'Carla (4)', 'Luis (2)'], datasets: [{ data: [3, 2, 4, 2], backgroundColor: ['#3b82f6', '#22c55e', '#f97316', '#a855f7'] }] },
      options: { responsive: true }
    });
  }

  document.getElementById('nuevoProyectoBtn')?.addEventListener('click', () => alert('Funcionalidad de crear nuevo proyecto (simulada)'));
  document.getElementById('agregarMiembroBtn')?.addEventListener('click', () => alert('Funcionalidad de agregar miembro al equipo (simulada)'));
  document.getElementById('nuevaTareaBtn')?.addEventListener('click', () => alert('Funcionalidad de crear nueva tarea (simulada)'));

  document.querySelectorAll('.asignar').forEach(btn => {
    btn.addEventListener('click', () => {
      const miembro = btn.getAttribute('data-miembro');
      alert(`Asignar nueva tarea a ${miembro} (simulación)`);
    });
  });

  document.querySelectorAll('.editar').forEach(btn => {
    btn.addEventListener('click', () => alert('Editar tarea (simulación)'));
  });

  document.getElementById('reporteProyectos')?.addEventListener('click', () => alert('Generando reporte de avance de proyectos...'));
  document.getElementById('reporteEquipo')?.addEventListener('click', () => alert('Generando reporte de rendimiento del equipo...'));
  document.getElementById('reporteGeneral')?.addEventListener('click', () => alert('Generando reporte general del área...'));

  const navItems = document.querySelectorAll('.nav-item');
  const sections = document.querySelectorAll('.section-content');
  navItems.forEach(item => {
    item.addEventListener('click', async (e) => {
      e.preventDefault();
      const sectionId = item.getAttribute('data-section');
      if (sectionId === 'empresa') await cargarM01Global();
      sections.forEach(sec => sec.classList.remove('active-section'));
      const target = document.getElementById(sectionId);
      if (target) target.classList.add('active-section');
      navItems.forEach(nav => nav.classList.remove('active'));
      item.classList.add('active');
    });
  });
});
