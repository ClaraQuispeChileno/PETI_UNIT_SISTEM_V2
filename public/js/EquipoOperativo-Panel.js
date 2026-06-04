const SUPABASE_URL = 'https://ssdphnukjtjqageqfyeu.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_eb5lIWekDOh8Osk9IGydGA_Jw1MktBZ';
let supabaseClient;
let currentUser = null;

async function cargarM01Global() {
  try {
    const { data: empresa } = await supabaseClient.from('empresa').select('*').eq('id', 1).single();
    if (empresa) {
      document.getElementById('eNombre').innerText = empresa.nombre || 'ContaPerú S.A.C.';
      document.getElementById('eSector').innerText = empresa.sector || 'Servicios contables';
    }
    const { data: global } = await supabaseClient.from('empresa_contenido').select('*').eq('id', 1).single();
    const contenido = global || {};
    document.getElementById('eMision').innerText = contenido.mision || 'No se ha registrado la misión.';
    document.getElementById('eVision').innerText = contenido.vision || 'No se ha registrado la visión.';
    const valores = Array.isArray(contenido.valores) ? contenido.valores : [];
    const container = document.getElementById('eValores');
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
  if (currentUser.role !== 'Equipo Operativo') {
    alert('No tienes permiso para acceder a este panel.');
    window.location.href = '../index.html';
    return;
  }
  document.getElementById('userNameDisplay').innerText = currentUser.username || 'Equipo Operativo';
  document.getElementById('perfilNombre').innerText = currentUser.username || 'Usuario Operativo';

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

  const ctxTareas = document.getElementById('tareasChart')?.getContext('2d');
  if (ctxTareas) {
    new Chart(ctxTareas, {
      type: 'doughnut',
      data: { labels: ['Pendientes', 'En progreso', 'Completadas'], datasets: [{ data: [4, 1, 7], backgroundColor: ['#f97316', '#3b82f6', '#22c55e'] }] },
      options: { responsive: true, maintainAspectRatio: true }
    });
  }
  const ctxCumplimiento = document.getElementById('cumplimientoChart')?.getContext('2d');
  if (ctxCumplimiento) {
    new Chart(ctxCumplimiento, {
      type: 'line',
      data: { labels: ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'], datasets: [{ label: 'Cumplimiento %', data: [65, 70, 75, 78], borderColor: '#2563eb', tension: 0.3 }] },
      options: { responsive: true }
    });
  }

  document.querySelectorAll('.completar').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const row = btn.closest('tr');
      if (row) { row.remove(); alert('Tarea marcada como completada (simulación)'); }
    });
  });

  document.getElementById('reporteIndividual')?.addEventListener('click', () => alert('Generando reporte individual... (simulación)'));
  document.getElementById('reporteEquipo')?.addEventListener('click', () => alert('Generando reporte del equipo... (simulación)'));

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
