// ============================================================================
// MIGRACIÓN: data.json → Supabase
// Ejecutar: node scripts/migrar-data.js
// ============================================================================
const fs = require('fs');
const path = require('path');

// CAMBIA AQUÍ los valores de tu nueva cuenta de Supabase
const SUPABASE_URL = 'https://ssdphnukjtjqageqfyeu.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_eb5lIWekDOh8Osk9IGydGA_Jw1MktBZ';
const SERVICE_KEY = SUPABASE_ANON_KEY; // Usar anon key (REST API)

const dataPath = path.join(__dirname, '..', 'data.json');
const raw = fs.readFileSync(dataPath, 'utf-8');
const DATA = JSON.parse(raw);

let totalInsertados = 0;
let totalErrores = 0;

// ─── Helper: llamada a Supabase REST API ───────────────────────────
async function supabaseRest(method, table, body, queryParams) {
  const url = `${SUPABASE_URL}/rest/v1/${table}` + (queryParams ? `?${queryParams}` : '');
  const headers = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal'
  };
  const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`[${table}] ${res.status}: ${errText.substring(0, 300)}`);
  }
  return res;
}

async function supabaseUpsert(table, rows, onConflict) {
  const qp = onConflict ? `on_conflict=${onConflict}` : '';
  await supabaseRest('POST', table, rows, qp);
}

// ─── 1. USUARIOS ───────────────────────────────────────
async function migrarUsuarios() {
  console.log('\n📋 Migrando usuarios...');
  // Role map: data.json rol_id → rol name
  const rolMap = {
    r1: 'administrador',
    r2: 'estratega',   // analista no existe en el sistema actual, lo ponemos como estratega?
    r3: 'lider',       // comiteEstrategico → lider
    r4: 'operativo',   // equipoOperativo
    r5: 'estratega',
    r6: 'lider'        // lideresArea
  };
  
  // First, delete existing users (cascade will handle FKs carefully)
  // Skip deletion if tables have FKs - just do upsert
  
  for (const u of DATA.usuarios || []) {
    const rol = rolMap[u.rol_id] || 'operativo';
    try {
      await supabaseUpsert('usuarios', [{
        username: u.username,
        email: u.email,
        rol: rol,
        activo: u.activo !== false
      }], 'email');
      console.log(`  ✓ Usuario: ${u.username} (${rol})`);
      totalInsertados++;
    } catch (e) {
      console.error(`  ✗ Error usuario ${u.username}: ${e.message}`);
      totalErrores++;
    }
  }
}

// ─── 2. EMPRESA ────────────────────────────────────────
async function migrarEmpresa() {
  console.log('\n📋 Migrando empresa...');
  const emp = DATA.empresa;
  try {
    await supabaseUpsert('empresa', [{
      id: 1,
      nombre: emp.nombre,
      sector: emp.sector
    }], 'id');
    console.log(`  ✓ Empresa: ${emp.nombre}`);
    totalInsertados++;
  } catch (e) {
    console.error(`  ✗ Error empresa: ${e.message}`);
    totalErrores++;
  }
}

// ─── 3. EMPRESA_CONTENIDO (M01 Global) ─────────────────
async function migrarEmpresaContenido() {
  console.log('\n📋 Migrando contenido global de empresa (M01)...');
  const emp = DATA.empresa;
  try {
    const valores = (emp.valores || []).map(v => ({ titulo: v, descripcion: '' }));
    await supabaseUpsert('empresa_contenido', [{
      id: 1,
      mision: emp.mision || '',
      vision: emp.vision || '',
      valores: valores,
      updated_at: new Date().toISOString()
    }], 'id');
    console.log(`  ✓ Misión, Visión y ${valores.length} valores`);
    totalInsertados++;
  } catch (e) {
    console.error(`  ✗ Error empresa_contenido: ${e.message}`);
    totalErrores++;
  }
}

// ─── 4. PLANES ─────────────────────────────────────────
async function migrarPlanes() {
  console.log('\n📋 Migrando planes...');
  const plan = DATA.plan_estrategico;
  if (!plan) return;
  
  try {
    await supabaseUpsert('planes', [{
      nombre: plan.nombre,
      anio: new Date(plan.fechaInicio).getFullYear(),
      descripcion: `PETI versión ${plan.version}. Inversión: S/ ${(plan.inversionPresupuestada || 0).toLocaleString()}`,
      estado: plan.estado,
      fecha_inicio: plan.fechaInicio,
      fecha_fin: plan.fechaFin,
      created_at: new Date().toISOString()
    }], undefined);
    console.log(`  ✓ Plan: ${plan.nombre} (${plan.estado})`);
    totalInsertados++;
  } catch (e) {
    console.error(`  ✗ Error plan: ${e.message}`);
    totalErrores++;
  }
}

// ─── 5. OBJETIVOS GENERALES ────────────────────────────
async function migrarObjetivos() {
  console.log('\n📋 Migrando objetivos...');
  // Get the plan ID from Supabase
  const res = await supabaseRest('GET', 'planes', null, 'select=id&limit=1');
  const planes = await res.json();
  const planId = planes[0]?.id;
  if (!planId) { console.error('  ✗ No se encontró un plan existente en la BD'); return; }

  for (let i = 0; i < (DATA.objetivos || []).length; i++) {
    const obj = DATA.objetivos[i];
    try {
      await supabaseUpsert('objetivos_generales', [{
        plan_id: planId,
        descripcion: obj.nombre,
        orden: i + 1
      }], undefined);
      console.log(`  ✓ Objetivo: ${obj.nombre}`);
      totalInsertados++;
    } catch (e) {
      console.error(`  ✗ Error objetivo ${obj.nombre}: ${e.message}`);
      totalErrores++;
    }
  }
}

// ─── 6. KPIs ───────────────────────────────────────────
async function migrarKPIs() {
  console.log('\n📋 Migrando KPIs...');
  const res = await supabaseRest('GET', 'objetivos_generales', null, 'select=id,descripcion');
  const objetivos = await res.json();

  for (const kpi of DATA.kpis || []) {
    // Find matching objetivo
    const objMatch = objetivos.find(o => {
      const objData = DATA.objetivos.find(ob => ob.id === kpi.objetivo_id);
      return objData && o.descripcion === objData.nombre;
    });
    try {
      await supabaseUpsert('kpis', [{
        plan_id: (await supabaseRest('GET', 'planes', null, 'select=id&limit=1').then(r => r.json()))[0]?.id,
        objetivo_general_id: objMatch?.id || null,
        nombre: kpi.nombre,
        meta: kpi.metaNumero,
        unidad: kpi.unidad,
        valor_actual: kpi.actual,
        historial: kpi.historico || []
      }], undefined);
      console.log(`  ✓ KPI: ${kpi.nombre}`);
      totalInsertados++;
    } catch (e) {
      console.error(`  ✗ Error KPI ${kpi.nombre}: ${e.message}`);
      totalErrores++;
    }
  }
}

// ─── 7. FODA ───────────────────────────────────────────
async function migrarFODA() {
  console.log('\n📋 Migrando análisis FODA...');
  const res = await supabaseRest('GET', 'planes', null, 'select=id&limit=1');
  const planes = await res.json();
  const planId = planes[0]?.id;
  if (!planId) return;

  const foda = DATA.analisis?.foda;
  if (!foda) return;

  const tipos = [
    { tipo: 'fortaleza', items: foda.fortalezas || [] },
    { tipo: 'oportunidad', items: foda.oportunidades || [] },
    { tipo: 'debilidad', items: foda.debilidades || [] },
    { tipo: 'amenaza', items: foda.amenazas || [] }
  ];

  for (const { tipo, items } of tipos) {
    for (const item of items) {
      try {
        await supabaseUpsert('foda', [{
          plan_id: planId,
          tipo: tipo,
          descripcion: item,
          fuente_id: null
        }], undefined);
        console.log(`  ✓ FODA [${tipo}]: ${item.substring(0, 50)}`);
        totalInsertados++;
      } catch (e) {
        console.error(`  ✗ Error FODA: ${e.message}`);
        totalErrores++;
      }
    }
  }

  // Estrategia_plan
  try {
    await supabaseUpsert('estrategia_plan', [{
      plan_id: planId,
      tipo_estrategia: (foda.estrategia_identificada || 'ofensiva').toLowerCase()
    }], 'plan_id');
    console.log(`  ✓ Estrategia identificada: ${foda.estrategia_identificada}`);
    totalInsertados++;
  } catch (e) {
    console.error(`  ✗ Error estrategia: ${e.message}`);
    totalErrores++;
  }
}

// ─── 8. CAME ───────────────────────────────────────────
async function migrarCAME() {
  console.log('\n📋 Migrando CAME...');
  const res = await supabaseRest('GET', 'planes', null, 'select=id&limit=1');
  const planes = await res.json();
  const planId = planes[0]?.id;
  if (!planId) return;

  const came = DATA.analisis?.came;
  if (!came) return;

  const cats = {
    corregir: 'corregir',
    afrontar: 'afrontar',
    mantener: 'mantener',
    explotar: 'explotar'
  };

  for (const [key, categoria] of Object.entries(cats)) {
    if (came[key]) {
      try {
        await supabaseUpsert('came', [{
          plan_id: planId,
          categoria: categoria,
          descripcion: came[key]
        }], undefined);
        console.log(`  ✓ CAME [${categoria}]: ${came[key].substring(0, 50)}`);
        totalInsertados++;
      } catch (e) {
        console.error(`  ✗ Error CAME: ${e.message}`);
        totalErrores++;
      }
    }
  }
}

// ─── 9. PLAN_CONTENIDO (Porter M06, PEST M07, Cadena M04) ──
async function migrarPlanContenido() {
  console.log('\n📋 Migrando contenido de módulos al plan...');
  const res = await supabaseRest('GET', 'planes', null, 'select=id&limit=1');
  const planes = await res.json();
  const planId = planes[0]?.id;
  if (!planId) return;

  // Porter (M06)
  if (DATA.analisis?.porter) {
    try {
      await supabaseUpsert('plan_contenido', [{
        plan_id: planId,
        modulo_id: 'M06',
        contenido: DATA.analisis.porter,
        completado: true,
        completado_fecha: new Date().toISOString()
      }], 'plan_id, modulo_id');
      console.log('  ✓ Porter (M06)');
      totalInsertados++;
    } catch (e) {
      console.error(`  ✗ Error Porter: ${e.message}`);
      totalErrores++;
    }
  }

  // PEST (M07)
  if (DATA.analisis?.pest) {
    try {
      await supabaseUpsert('plan_contenido', [{
        plan_id: planId,
        modulo_id: 'M07',
        contenido: DATA.analisis.pest,
        completado: true,
        completado_fecha: new Date().toISOString()
      }], 'plan_id, modulo_id');
      console.log('  ✓ PEST (M07)');
      totalInsertados++;
    } catch (e) {
      console.error(`  ✗ Error PEST: ${e.message}`);
      totalErrores++;
    }
  }
}

// ─── 10. AUDITORÍA ─────────────────────────────────────
async function migrarAuditoria() {
  console.log('\n📋 Migrando registros de auditoría...');
  const res = await supabaseRest('GET', 'usuarios', null, 'select=id,username');
  const usuarios = await res.json();

  for (const aud of DATA.auditoria || []) {
    const userMatch = usuarios.find(u => u.username === aud.usuario);
    try {
      await supabaseUpsert('auditoria', [{
        usuario_id: userMatch?.id || null,
        modulo: aud.modulo,
        accion: aud.accion,
        detalle: aud.detalle,
        fecha: aud.fecha,
        usuario_nombre: aud.usuario
      }], undefined);
      console.log(`  ✓ Auditoría: [${aud.modulo}] ${aud.accion}`);
      totalInsertados++;
    } catch (e) {
      console.error(`  ✗ Error auditoría: ${e.message}`);
      totalErrores++;
    }
  }
}

// ─── 11. ALERTAS ───────────────────────────────────────
async function migrarAlertas() {
  console.log('\n📋 Migrando alertas...');
  const res = await supabaseRest('GET', 'planes', null, 'select=id&limit=1');
  const planes = await res.json();
  const planId = planes[0]?.id;
  if (!planId) return;

  for (const alerta of DATA.alertas || []) {
    try {
      await supabaseUpsert('alertas', [{
        plan_id: planId,
        tipo: alerta.tipo,
        referencia: alerta.referencia,
        descripcion: alerta.descripcion,
        revisado: alerta.estado === 'revisada',
        comentario: alerta.comentario,
        fecha_creacion: alerta.fecha
      }], undefined);
      console.log(`  ✓ Alerta: ${alerta.descripcion.substring(0, 60)}`);
      totalInsertados++;
    } catch (e) {
      console.error(`  ✗ Error alerta: ${e.message}`);
      totalErrores++;
    }
  }
}

// ─── EJECUCIÓN PRINCIPAL ───────────────────────────────
async function main() {
  console.log('═══════════════════════════════════════════');
  console.log('  MIGRACIÓN data.json → SUPABASE');
  console.log('═══════════════════════════════════════════');
  console.log(`  Total registros en data.json: ${Object.keys(DATA).length} secciones`);
  console.log('');

  try {
    await migrarUsuarios();
    await migrarEmpresa();
    await migrarEmpresaContenido();
    await migrarPlanes();
    await migrarObjetivos();
    await migrarKPIs();
    await migrarFODA();
    await migrarCAME();
    await migrarPlanContenido();
    await migrarAuditoria();
    await migrarAlertas();

    // ─── Eliminar data.json ─────────────────────────────────
    console.log('\n═══════════════════════════════════════════');
    console.log(`  ✅ Migración completada`);
    console.log(`  📊 Insertados: ${totalInsertados}  |  Errores: ${totalErrores}`);
    console.log('═══════════════════════════════════════════');

    if (totalErrores === 0) {
      fs.unlinkSync(dataPath);
      console.log('  🗑️  Archivo data.json eliminado exitosamente.');
    } else {
      console.log('  ⚠️  Hubo errores. data.json NO fue eliminado. Revise los logs.');
    }
  } catch (e) {
    console.error('\n❌ Error fatal durante la migración:', e.message);
    process.exit(1);
  }
}

main();
