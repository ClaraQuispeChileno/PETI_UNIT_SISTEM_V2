// =====================================================================
// CONTROLADOR PORTER (M06) - PETI UNIT SISTEM
// Archivo independiente. Cualquier error queda aislado del resto.
// =====================================================================
(function() {
'use strict';

var preguntasPorter = [
  { fuerza:'nuevos_entrantes', label:'Nuevos Entrantes', variables:[
    'Economia de escala','Grado de diferenciacion del producto/servicio','Necesidades de capital','Costes de cambio','Acceso a los canales de distribucion','Otros factores (patentes, materias primas, ubicacion, ayudas gubernamentales)'
  ]},
  { fuerza:'rivalidad', label:'Rivalidad de Competidores', variables:[
    'Gran numero de competidores, o competidores muy equilibrados','Crecimiento lento en el mercado','Costes fijos o de almacenamiento elevados','Baja diferenciacion de productos','Intereses estrategicos','Barreras de salida (activos especializados, costes fijos de salida, restricciones sociales, barreras emocionales)'
  ]},
  { fuerza:'sustitutos', label:'Productos Sustitutivos', variables:[
    'Nivel de precio/calidad de los productos sustitutivos (incluyendo sustitutivos no evidentes)'
  ]},
  { fuerza:'compradores', label:'Poder de Compradores', variables:[
    'Concentracion o compra de grandes volumenes relativos','Importancia del coste de la materia prima','Productos no diferenciados','Coste de cambiar de proveedor pequeno','Ausencia de amenaza de integracion','Nivel de informacion total del cliente','Baja importancia de la calidad para el cliente'
  ]},
  { fuerza:'proveedores', label:'Poder de Proveedores', variables:[
    'Mayor concentracion que el sector que compra','Inexistencia de productos sustitutivos con los que competir','El comprador no es un cliente importante','El producto es muy importante para el comprador','El producto esta altamente diferenciado','Representan una amenaza real de integracion'
  ]}
];
var currentStep = 1;
var respuestas = {};
var completadoPreviamente = false;
var modoActualizacion = false;
var chartInstance = null;

function getKey(step, idx) {
  if (typeof step === "string") return step + "_" + idx;
  return preguntasPorter[step-1].fuerza + "_" + idx;
}
function stepComplete(step) {
  return preguntasPorter[step-1].variables.every(function(_, i) {
    return respuestas[getKey(step, i)] !== undefined;
  });
}
function promedio(fuerzaKey) {
  var f = preguntasPorter.find(function(x) { return x.fuerza === fuerzaKey; });
  if (!f) return null;
  var sum = 0, cnt = 0;
  f.variables.forEach(function(_, i) {
    var v = respuestas[fuerzaKey + "_" + i];
    if (v !== undefined) { sum += v; cnt++; }
  });
  return cnt > 0 ? sum / cnt : null;
}
function clasificar(p) {
  if (p === null) return { label:"-", cls:"" };
  if (p <= 2.3) return { label:"Baja", cls:"solido" };
  if (p <= 3.7) return { label:"Media", cls:"mejorable" };
  return { label:"Alta", cls:"critico" };
}

function renderStepper() {
  var steps = document.querySelectorAll("#porterStepper .stepper-step");
  if (!steps.length) return;
  var completos = [false,false,false,false,false,false];
  for (var s = 1; s <= 5; s++) completos[s] = stepComplete(s);
  steps.forEach(function(el) {
    var s = parseInt(el.getAttribute("data-step"));
    el.classList.remove("active","completed","locked");
    var u = true;
    for (var p = 1; p < s; p++) { if (!completos[p]) { u = false; break; } }
    if (s === currentStep) el.classList.add("active");
    else if (completos[s]) el.classList.add("completed");
    else if (!u) el.classList.add("locked");
  });
  var line = document.getElementById("porterStepperProgressLine");
  if (line) {
    var c = 0;
    for (var s2 = 1; s2 <= 5; s2++) if (completos[s2]) c++;
    line.style.width = Math.min((c / 4) * 100, 100) + "%";
  }
  var lbl = document.getElementById("porterStepperCurrentLabel");
  if (lbl) lbl.innerText = "Paso " + currentStep + " de 5: " + preguntasPorter[currentStep-1].label;
}

function renderBlock() {
  var wc = document.getElementById("porterWizardContainer"); if (wc) wc.style.display = "block";
  var rc = document.getElementById("porterResultsContainer"); if (rc) rc.style.display = "none";
  var f = preguntasPorter[currentStep-1]; if (!f) return;
  var bt = document.getElementById("porterBloqueTitulo"); if (bt) bt.innerText = f.label.toUpperCase();
  var html = "", answ = 0;
  f.variables.forEach(function(v, i) {
    var key = getKey(currentStep, i), val = respuestas[key];
    if (val !== undefined) answ++;
    var btns = "";
    for (var s = 1; s <= 5; s++) {
      btns += "<button class='btn-likert" + (val === s ? " selected" : "") + "' data-pkey='" + key + "' data-pval='" + s + "' " + (typeof isObjetivosEditable !== "undefined" ? (isObjetivosEditable() ? "" : "disabled") : "") + ">" + s + "</button>";
    }
    html += "<div class='pregunta-row" + (val !== undefined ? " has-response" : "") + "' data-pkey='" + key + "'><div class='pregunta-num-col'>" + (i+1) + "</div><div class='pregunta-texto-col'>" + v + "</div><div class='pregunta-likert-col'>" + btns + "</div></div>";
  });
  var pc = document.getElementById("porterCuestionario"); if (pc) pc.innerHTML = html;
  var t = f.variables.length;
  var bf = document.getElementById("porterBarFill"); if (bf) bf.style.width = (answ / t * 100) + "%";
  var bl = document.getElementById("porterBarLabel"); if (bl) bl.innerText = answ + "/" + t;
  var avg = promedio(f.fuerza);
  var pm = document.getElementById("porterPromedio"); if (pm) pm.innerText = avg !== null ? avg.toFixed(1) : "-";
  var cl = document.getElementById("porterClasif");
  if (cl) {
    if (avg === null) { cl.innerText = "-"; cl.className = "potencial-pill"; }
    else if (avg <= 2.3) { cl.innerText = "BAJA"; cl.className = "potencial-pill badge-bajo"; }
    else if (avg <= 3.7) { cl.innerText = "MEDIA"; cl.className = "potencial-pill badge-medio"; }
    else { cl.innerText = "ALTA"; cl.className = "potencial-pill badge-alto"; }
  }
  var pp = document.getElementById("porterPrevBtn"); if (pp) pp.disabled = (currentStep === 1);
  var pn = document.getElementById("porterNextBtn");
  if (pn) {
    pn.disabled = (answ < t);
    if (currentStep === 5 && answ === t && !modoActualizacion) {
      pn.innerHTML = "Finalizar <i class='bi bi-check-lg'></i>";
      pn.classList.remove("btn-primary"); pn.classList.add("btn-primary-solid");
    } else {
      pn.innerHTML = "Siguiente <i class='bi bi-arrow-right'></i>";
      pn.classList.remove("btn-primary-solid"); pn.classList.add("btn-primary");
    }
  }
  var pcb = document.getElementById("porterCancelBtn"); if (pcb) pcb.style.display = modoActualizacion ? "" : "none";
}

function anterior() {
  if (currentStep > 1) { currentStep--; renderStepper(); renderBlock(); document.getElementById("m06").scrollIntoView({ behavior:"smooth", block:"start" }); }
}
function siguiente() {
  if (!stepComplete(currentStep)) { if (typeof showToast !== "undefined") showToast("Responda todas las variables antes de continuar.", "error"); return; }
  if (currentStep < 5) { currentStep++; renderStepper(); renderBlock(); document.getElementById("m06").scrollIntoView({ behavior:"smooth", block:"start" }); }
  else if (modoActualizacion) {
    mostrarResultadosActualizacion();
  } else {
    finalizar();
  }
}
function responder(key, score) {
  respuestas[key] = score; renderStepper(); renderBlock();
}

function finalizar() {
  var proms = {};
  preguntasPorter.forEach(function(f) { proms[f.fuerza] = promedio(f.fuerza); });
  var avg = Object.values(proms).reduce(function(a,b){return a+b;}, 0) / 5;
  var recs = [];
  if (avg >= 3.8) recs.push("Industria con ALTA intensidad competitiva. Rendimientos escasos.");
  else if (avg >= 2.4) recs.push("Intensidad MODERADA. Riesgos gestionables.");
  else recs.push("Sector ATRACTIVO. Alta viabilidad para inversion.");
  if (Object.values(proms).filter(function(p){return p>=3.8;}).length >= 3) recs.push("ALERTA: 3+ fuerzas con intensidad ALTA. Viabilidad comprometida.");

  var ok = true;

  supabaseClient.from("porter_resultados").upsert({
    plan_id: currentPlanId, usuario_id: currentUser ? currentUser.id : null, estado:"procesado",
    resultados:{ promedios:proms, respuestas:respuestas }, recomendaciones:recs
  }, { onConflict:"plan_id" }).then(function() {
    return supabaseClient.from("plan_contenido").upsert({
      plan_id: currentPlanId, modulo_id:"M06",
      contenido:{ promedios:proms, respuestas:respuestas },
      completado:true, completado_fecha: new Date()
    }, { onConflict:"plan_id, modulo_id" });
  }).then(function() {
    return supabaseClient.from("auditoria").insert({
      usuario_id: currentUser ? currentUser.id : null, modulo:"M06",
      accion: completadoPreviamente ? "ACTUALIZAR" : "CREAR",
      detalle:"Analisis de las 5 Fuerzas de Porter completado."
    });
  }).then(function() {
    return sincFoda();
  }).then(function() {
    completadoPreviamente = true;
    var badge = document.getElementById("m06EstadoBadge");
    if (badge) { badge.innerText = "COMPLETO"; badge.className = "m05-badge-progreso procesado"; }
    mostrarResultadosUI();
    if (typeof showToast !== "undefined") showToast("Analisis Porter guardado.", "success");
    if (typeof cargarDashboard !== "undefined") cargarDashboard();
  }).then(null, function(e) {
    console.error("Error finalizarPorter:", e);
    if (typeof showToast !== "undefined") showToast("Error al guardar: " + e.message, "error");
  });
}

function sincFoda() {
  return supabaseClient.from("foda").select("*").eq("plan_id", currentPlanId).then(function(res) {
      var items = res.data || [];
      preguntasPorter.forEach(function(f) {
        f.variables.forEach(function(v, i) {
          var key = f.fuerza + "_" + i, score = respuestas[key];
          if (score === undefined || score === 3) return;
          var tipo = score >= 4 ? "amenaza" : "oportunidad";
          var t = { origen:"porter", fuerza:f.fuerza, variable:v, puntaje:score, generado_automaticamente:true, puede_editarse:true };
          var exist = items.find(function(x) {
            return x.trazabilidad && x.trazabilidad.origen === "porter" && x.trazabilidad.fuerza === f.fuerza && x.trazabilidad.variable === v;
          });
          var row = { plan_id: currentPlanId, tipo:tipo, descripcion:"["+f.label+"] "+v+" (Puntaje: "+score+"/5)", trazabilidad:t, generado_auto:true };
          if (exist) supabaseClient.from("foda").update(row).eq("id", exist.id);
          else supabaseClient.from("foda").insert(row);
        });
      });
    }).then(null, function(e){ console.error("Error FODA Porter:", e); });
}

function mostrarResultados() {
  if (Object.keys(respuestas).length === 0) return;
  var proms = {};
  preguntasPorter.forEach(function(f) { proms[f.fuerza] = promedio(f.fuerza); });
  var avg = Object.values(proms).reduce(function(a,b){return a+b;}, 0) / 5;
  var c = clasificar(avg);

  var pi = document.getElementById("porterIntensidad"); if (pi) { pi.innerText = avg.toFixed(1); pi.className = "clasificacion-total-premium " + c.cls; }
  var pit = document.getElementById("porterIntensidadTxt"); if (pit) pit.innerText = "Intensidad competitiva " + c.label.toLowerCase() + " del sector";
  var dk = "", dv = 0;
  Object.entries(proms).forEach(function(e) { if (e[1] > dv) { dk = e[0]; dv = e[1]; } });
  var di = preguntasPorter.find(function(f) { return f.fuerza === dk; });
  var pd = document.getElementById("porterDominante"); if (pd) pd.innerText = di ? di.label : "-";
  var pdt = document.getElementById("porterDominanteTxt"); if (pdt) pdt.innerText = dv.toFixed(1) + " sobre 5";
  var rl = avg >= 3.8 ? "PRECAUCION" : (avg <= 2.3 ? "VIABLE" : "MODERADO");
  var pr = document.getElementById("porterRec"); if (pr) pr.innerText = rl;
  var prt = document.getElementById("porterRecTxt"); if (prt) prt.innerText = avg >= 3.8 ? "Alta intensidad. Rendimientos escasos." : (avg <= 2.3 ? "Sector atractivo. Viable para inversion." : "Riesgos gestionables.");

  var bd = "";
  preguntasPorter.forEach(function(f) {
    var a = proms[f.fuerza], cc = clasificar(a || 0);
    bd += "<div class='bloque-score-card " + cc.cls + "'><div class='bloque-name'>" + f.label + "</div><div class='bloque-score-value'>" + (a ? a.toFixed(1) : "-") + "</div><div class='bloque-score-max'>/5</div><div class='bloque-score-bar'><div class='bar-fill-bloque' style='width:" + ((a ? a / 5 * 100 : 0)) + "%'></div></div></div>";
  });
  var pbk = document.getElementById("porterBreakdown"); if (pbk) pbk.innerHTML = bd;
  renderRadar(proms);
  cargarPorterOA();
}

function renderRadar(proms) {
  var ctx = document.getElementById("porterRadarChart"); if (!ctx) return;
  if (chartInstance) { try { chartInstance.destroy(); } catch(e) {} }
  try {
    chartInstance = new Chart(ctx, {
      type:"radar",
      data:{
        labels: preguntasPorter.map(function(f){return f.label;}),
        datasets:[
          { label:"Intensidad", data: preguntasPorter.map(function(f){return proms[f.fuerza]||0;}),
            backgroundColor:"rgba(37,99,235,0.15)", borderColor:"rgba(37,99,235,0.9)", borderWidth:2.5,
            pointBackgroundColor:function(c){var v=c.raw;if(v>=3.8)return"#dc2626";if(v>=2.4)return"#d97706";return"#059669";},
            pointBorderColor:"#fff", pointBorderWidth:2, pointRadius:6, pointHoverRadius:8 },
          { label:"Maximo (5)", data:[5,5,5,5,5], backgroundColor:"rgba(16,185,129,0.06)",
            borderColor:"rgba(16,185,129,0.3)", borderWidth:1.5, borderDash:[5,5], pointRadius:0 }
        ]},
      options:{
        responsive:true, maintainAspectRatio:false,
        scales:{ r:{ angleLines:{display:true,color:"#e2e8f0"}, grid:{color:"#e2e8f0"}, suggestedMin:0, suggestedMax:5,
          ticks:{stepSize:1,backdropColor:"transparent",color:"#64748b",font:{size:13,weight:"600"}},
          pointLabels:{color:"#1e293b",font:{size:15,family:"Inter",weight:"700"}} } },
        plugins:{ legend:{display:true,position:"bottom",labels:{padding:20,usePointStyle:true,font:{size:14,family:"Inter",weight:"600"}}} }
      }
    });
  } catch(e) { console.error("Error renderRadar:", e); }
}

function mostrarResultadosUI() {
  completadoPreviamente = true;
  modoActualizacion = false;
  var badge = document.getElementById("m06EstadoBadge"); if (badge) { badge.innerText = "COMPLETO"; badge.className = "m05-badge-progreso procesado"; }
  var abt = document.getElementById("m06AlertText"); if (abt) abt.innerText = "Este planeamiento ya cuenta con un análisis Porter completo.";
  var ab = document.getElementById("m06AlertBanner"); if (ab) { ab.style.display = "flex"; ab.style.justifyContent = "space-between"; }
  var ua = document.getElementById("porterUpdateActions"); if (ua) ua.style.display = "none";
  var pbb = document.getElementById("porterBackBtn"); if (pbb) pbb.style.display = "";
  var wc = document.getElementById("porterWizardContainer"); if (wc) wc.style.display = "none";
  var rc = document.getElementById("porterResultsContainer"); if (rc) rc.style.display = "block";
  mostrarResultados();
}

function mostrarWizardUI() {
  completadoPreviamente = false;
  respuestas = {};
  var badge = document.getElementById("m06EstadoBadge");
  if (modoActualizacion) {
    if (badge) { badge.innerText = "ACTUALIZANDO"; badge.className = "m05-badge-progreso actualizando"; }
    var abt = document.getElementById("m06AlertText"); if (abt) abt.innerText = "Este planeamiento se está actualizando, no olvide guardar su registro.";
    var pbb = document.getElementById("porterBackBtn"); if (pbb) pbb.style.display = "none";
    var ab = document.getElementById("m06AlertBanner"); if (ab) { ab.style.display = "flex"; ab.style.justifyContent = "space-between"; }
  } else {
    if (badge) { badge.innerText = "NO INICIADO"; badge.className = "m05-badge-progreso"; }
    var ab = document.getElementById("m06AlertBanner"); if (ab) ab.style.display = "none";
  }
  var wc = document.getElementById("porterWizardContainer"); if (wc) wc.style.display = "block";
  var rc = document.getElementById("porterResultsContainer"); if (rc) rc.style.display = "none";
  currentStep = 1; renderStepper(); renderBlock();
}

function cargarPorter() {
  try {
    if (typeof currentPlanId === "undefined" || !currentPlanId) return;

    // 1. Intentar carga desde tabla especializada porter_resultados
    supabaseClient.from("porter_resultados").select("*").eq("plan_id", currentPlanId).maybeSingle().then(function(res) {
      var data = res.data;
      if (res.error && res.error.code === "42P01") data = null;

      if (data && data.estado === "procesado") {
        respuestas = data.resultados && data.resultados.respuestas ? data.resultados.respuestas : {};
        mostrarResultadosUI();
        return;
      }

      // 2. Fallback: intentar desde plan_contenido (legacy)
      supabaseClient.from("plan_contenido").select("contenido").eq("plan_id", currentPlanId).eq("modulo_id", "M06").maybeSingle().then(function(legacy) {
        var legacyData = legacy.data;
        if (legacyData && legacyData.contenido && legacyData.contenido.respuestas) {
          respuestas = legacyData.contenido.respuestas;
          // Migrar automaticamente a porter_resultados
          var proms = {}; preguntasPorter.forEach(function(f){proms[f.fuerza] = promedio(f.fuerza);});
          supabaseClient.from("porter_resultados").upsert({
            plan_id: currentPlanId, usuario_id: currentUser ? currentUser.id : null, estado:"procesado",
            resultados:{ promedios:proms, respuestas:respuestas }
          }, { onConflict:"plan_id" }).then(null, function(){});
          mostrarResultadosUI();
          return;
        }
        // 3. Sin datos en ninguna tabla
        respuestas = {};
        mostrarWizardUI();
      }).then(null, function() {
        // plan_contenido no tiene datos (PGRST116)
        respuestas = {};
        mostrarWizardUI();
      });

    }).then(null, function(e) { console.error("Error cargarPorter DB:", e); });
  } catch(e2) { console.error("Error en cargarPorter:", e2); }
}
function setupEvents() {
  var ppb = document.getElementById("porterPrevBtn"); if (ppb) ppb.onclick = anterior;
  var pnb = document.getElementById("porterNextBtn"); if (pnb) pnb.onclick = siguiente;
  var pcb = document.getElementById("porterCancelBtn"); if (pcb) pcb.onclick = function() { document.getElementById("porterCancelConfirmModal").style.display = "flex"; };
  var pbb = document.getElementById("porterBackBtn"); if (pbb) pbb.onclick = function() {
    modoActualizacion = true; completadoPreviamente = false;
    respuestas = {};
    pbb.style.display = "none";
    var badge = document.getElementById("m06EstadoBadge"); if (badge) { badge.innerText = "ACTUALIZANDO"; badge.className = "m05-badge-progreso actualizando"; }
    var abt = document.getElementById("m06AlertText"); if (abt) abt.innerText = "Este planeamiento se está actualizando, no olvide guardar su registro.";
    var ab = document.getElementById("m06AlertBanner"); if (ab) { ab.style.display = "flex"; ab.style.justifyContent = "space-between"; }
    var ua = document.getElementById("porterUpdateActions"); if (ua) ua.style.display = "none";
    var wc = document.getElementById("porterWizardContainer"); if (wc) wc.style.display = "block";
    var rc = document.getElementById("porterResultsContainer"); if (rc) rc.style.display = "none";
    currentStep = 1; renderStepper(); renderBlock();
    document.getElementById("m06").scrollIntoView({ behavior:"smooth", block:"start" });
  };
  var pc = document.getElementById("porterCuestionario"); if (pc) pc.onclick = function(e) {
    var btn = e.target.closest(".btn-likert");
    if (btn) responder(btn.getAttribute("data-pkey"), parseInt(btn.getAttribute("data-pval")));
  };
  var ps = document.getElementById("porterStepper"); if (ps) ps.onclick = function(e) {
    var stepEl = e.target.closest(".stepper-step");
    if (stepEl && !stepEl.classList.contains("locked")) { currentStep = parseInt(stepEl.getAttribute("data-step")); renderStepper(); renderBlock(); }
  };
  var poa1 = document.getElementById("porterAddOpBtn"); if (poa1) poa1.addEventListener("click", function() { agregarPorterOA("oportunidad"); });
  var poa2 = document.getElementById("porterAddAmBtn"); if (poa2) poa2.addEventListener("click", function() { agregarPorterOA("amenaza"); });
  var poa3 = document.getElementById("porterOpInput"); if (poa3) poa3.addEventListener("keydown", function(e) { if (e.key === "Enter") agregarPorterOA("oportunidad"); });
  var poa4 = document.getElementById("porterAmInput"); if (poa4) poa4.addEventListener("keydown", function(e) { if (e.key === "Enter") agregarPorterOA("amenaza"); });
  var poa5 = document.getElementById("porterTablaOp"); if (poa5) poa5.addEventListener("click", _porterClickHandler);
  var poa6 = document.getElementById("porterTablaAm"); if (poa6) poa6.addEventListener("click", _porterClickHandler);
  var pg = document.getElementById("porterGuardarActualizacionesBtn"); if (pg) pg.addEventListener("click", guardarActualizacionesPorter);
  var pcancel = document.getElementById("porterCancelarActualizacionesBtn"); if (pcancel) pcancel.addEventListener("click", function() { document.getElementById("porterCancelConfirmModal").style.display = "flex"; });
  var pcc = document.getElementById("porterCancelConfirmBtn"); if (pcc) pcc.addEventListener("click", cancelarActualizacionesPorter);
}

// ==================== PORTER OA — OPORTUNIDADES Y AMENAZAS EDITABLES ====================
var _porterEditingId = null;
var _porterOALocal = null;

function cargarPorterOA() {
  if (!currentPlanId) return;
  supabaseClient.from("porter_oa").select("*").eq("plan_id", currentPlanId).order("orden").order("id").then(function(res) {
    var items = res.data || [];
    if (modoActualizacion) {
      _porterOALocal = JSON.parse(JSON.stringify(items));
      renderPorterOATables(_porterOALocal);
    } else {
      _porterOALocal = null;
      renderPorterOATables(items);
    }
  }).then(null, function() {
    if (modoActualizacion) { _porterOALocal = []; renderPorterOATables(_porterOALocal); }
    else { renderPorterOATables([]); }
  });
}

function renderPorterOATables(items) {
  var tbOp = document.querySelector("#porterTablaOp tbody");
  var tbAm = document.querySelector("#porterTablaAm tbody");
  if (!tbOp || !tbAm) return;
  var ops = items.filter(function(i) { return i.tipo === "oportunidad"; });
  var ams = items.filter(function(i) { return i.tipo === "amenaza"; });
  tbOp.innerHTML = "";
  tbAm.innerHTML = "";
  ops.forEach(function(item, idx) { tbOp.insertAdjacentHTML("beforeend", _porterOARow(item, idx + 1)); });
  ams.forEach(function(item, idx) { tbAm.insertAdjacentHTML("beforeend", _porterOARow(item, idx + 1)); });
  if (ops.length === 0) tbOp.innerHTML = "<tr class='empty-state-row'><td colspan='3'><i class='bi bi-sun'></i><br>No se registraron oportunidades</td></tr>";
  if (ams.length === 0) tbAm.innerHTML = "<tr class='empty-state-row'><td colspan='3'><i class='bi bi-exclamation-triangle'></i><br>No se registraron amenazas</td></tr>";
  document.getElementById("porterCountOp").innerText = ops.length;
  document.getElementById("porterCountAm").innerText = ams.length;
  var addOp = document.getElementById("porterAddOp");
  var addAm = document.getElementById("porterAddAm");
  if (addOp) addOp.style.display = ops.length >= 4 ? "none" : "";
  if (addAm) addAm.style.display = ams.length >= 4 ? "none" : "";
}

function _porterOARow(item, num) {
  var edit = (_porterEditingId === item.id);
  var desc = edit
    ? '<input type="text" class="porter-edit-input" value="' + _escPorter(item.descripcion) + '" data-oid="' + item.id + '" style="width:100%;padding:4px 8px;border:1px solid #cbd5e1;border-radius:6px;font-size:0.9em;">'
    : '<div style="font-weight:600;color:#1e293b;line-height:1.5;">' + _escPorter(item.descripcion) + '</div>';
  var acts = edit
    ? '<button class="btn-small btn-success porter-save-btn" data-oid="' + item.id + '" title="Guardar"><i class="bi bi-check-lg"></i></button><button class="btn-small btn-secondary porter-cancel-btn" title="Cancelar"><i class="bi bi-x-lg"></i></button>'
    : '<button class="btn-small btn-secondary porter-edit-btn" data-oid="' + item.id + '" title="Editar"><i class="bi bi-pencil"></i></button><button class="btn-small btn-danger porter-delete-btn" data-oid="' + item.id + '" title="Eliminar"><i class="bi bi-trash"></i></button>';
  return '<tr data-oid="' + item.id + '"><td style="text-align:center;"><div class="pregunta-num-col" style="margin:0 auto;">' + num + '</div></td><td>' + desc + '</td><td style="text-align:center;white-space:nowrap;">' + acts + '</td></tr>';
}

function _escPorter(t) { return t ? String(t).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;") : ""; }

function agregarPorterOA(tipo) {
  if (typeof isObjetivosEditable !== "undefined" && !isObjetivosEditable()) { if (typeof showToast !== "undefined") showToast("No se puede modificar en un plan en revisión.", "error"); return; }
  var input = document.getElementById(tipo === "oportunidad" ? "porterOpInput" : "porterAmInput");
  if (!input || !input.value.trim()) { if (typeof showToast !== "undefined") showToast("Escribe un enunciado.", "error"); return; }
  var count = parseInt(document.getElementById(tipo === "oportunidad" ? "porterCountOp" : "porterCountAm").innerText) || 0;
  if (count >= 4) {
    if (typeof showToast !== "undefined") showToast("Máximo 4 " + (tipo === "oportunidad" ? "oportunidades" : "amenazas") + " permitidas.", "error");
    return;
  }
  if (modoActualizacion && _porterOALocal !== null) {
    var newId = Date.now() + Math.random();
    _porterOALocal.push({ id: newId, tipo: tipo, descripcion: input.value.trim(), orden: 0 });
    input.value = "";
    renderPorterOATables(_porterOALocal);
  } else {
    supabaseClient.from("porter_oa").insert({
      plan_id: currentPlanId, tipo: tipo, descripcion: input.value.trim(), orden: 0
    }).then(function() {
      input.value = "";
      cargarPorterOA();
    }).then(null, function(e) { if (typeof showToast !== "undefined") showToast("Error al guardar: " + e.message, "error"); });
  }
}

function _porterClickHandler(e) {
  var btn = e.target.closest("button");
  if (!btn) return;
  var oid = btn.getAttribute("data-oid");
  var isLocal = _porterOALocal !== null;
  var source = isLocal ? _porterOALocal : null;

  if (btn.classList.contains("porter-edit-btn")) {
    _porterEditingId = typeof oid === "string" && oid.indexOf(".") > -1 ? parseFloat(oid) : parseInt(oid);
    if (isLocal) renderPorterOATables(_porterOALocal);
    else cargarPorterOA();
  } else if (btn.classList.contains("porter-delete-btn")) {
    if (!confirm("¿Eliminar este elemento?")) return;
    if (isLocal) {
      var idx = _porterOALocal.findIndex(function(i) { return String(i.id) === oid; });
      if (idx > -1) _porterOALocal.splice(idx, 1);
      renderPorterOATables(_porterOALocal);
    } else {
      supabaseClient.from("porter_oa").delete().eq("id", oid).then(function() { cargarPorterOA(); }).then(null, function(e) { if (typeof showToast !== "undefined") showToast("Error al eliminar: " + e.message, "error"); });
    }
  } else if (btn.classList.contains("porter-save-btn")) {
    var input = document.querySelector('.porter-edit-input[data-oid="' + oid + '"]');
    if (!input || !input.value.trim()) { if (typeof showToast !== "undefined") showToast("El enunciado no puede estar vacío.", "error"); return; }
    if (isLocal) {
      var item = _porterOALocal.find(function(i) { return String(i.id) === oid; });
      if (item) item.descripcion = input.value.trim();
      _porterEditingId = null;
      renderPorterOATables(_porterOALocal);
    } else {
      supabaseClient.from("porter_oa").update({ descripcion: input.value.trim() }).eq("id", oid).then(function() {
        _porterEditingId = null;
        cargarPorterOA();
      }).then(null, function(e) { if (typeof showToast !== "undefined") showToast("Error al guardar: " + e.message, "error"); });
    }
  } else if (btn.classList.contains("porter-cancel-btn")) {
    _porterEditingId = null;
    if (isLocal) renderPorterOATables(_porterOALocal);
    else cargarPorterOA();
  }
}

// ==================== PORTER ACTUALIZACIÓN — PREVIEW, GUARDAR, CANCELAR ====================
function mostrarResultadosActualizacion() {
  completadoPreviamente = false;
  var proms = {};
  preguntasPorter.forEach(function(f) { proms[f.fuerza] = promedio(f.fuerza); });
  var avg = Object.values(proms).reduce(function(a,b){return a+b;}, 0) / 5;
  var c = clasificar(avg);

  var pi = document.getElementById("porterIntensidad"); if (pi) { pi.innerText = avg.toFixed(1); pi.className = "clasificacion-total-premium " + c.cls; }
  var pit = document.getElementById("porterIntensidadTxt"); if (pit) pit.innerText = "Intensidad competitiva " + c.label.toLowerCase() + " del sector";
  var dk = "", dv = 0;
  Object.entries(proms).forEach(function(e) { if (e[1] > dv) { dk = e[0]; dv = e[1]; } });
  var di = preguntasPorter.find(function(f) { return f.fuerza === dk; });
  var pd = document.getElementById("porterDominante"); if (pd) pd.innerText = di ? di.label : "-";
  var pdt = document.getElementById("porterDominanteTxt"); if (pdt) pdt.innerText = dv.toFixed(1) + " sobre 5";
  var rl = avg >= 3.8 ? "PRECAUCION" : (avg <= 2.3 ? "VIABLE" : "MODERADO");
  var pr = document.getElementById("porterRec"); if (pr) pr.innerText = rl;
  var prt = document.getElementById("porterRecTxt"); if (prt) prt.innerText = avg >= 3.8 ? "Alta intensidad. Rendimientos escasos." : (avg <= 2.3 ? "Sector atractivo. Viable para inversion." : "Riesgos gestionables.");

  var bd = "";
  preguntasPorter.forEach(function(f) {
    var a = proms[f.fuerza], cc = clasificar(a || 0);
    bd += "<div class='bloque-score-card " + cc.cls + "'><div class='bloque-name'>" + f.label + "</div><div class='bloque-score-value'>" + (a ? a.toFixed(1) : "-") + "</div><div class='bloque-score-max'>/5</div><div class='bloque-score-bar'><div class='bar-fill-bloque' style='width:" + ((a ? a / 5 * 100 : 0)) + "%'></div></div></div>";
  });
  var pbk = document.getElementById("porterBreakdown"); if (pbk) pbk.innerHTML = bd;
  renderRadar(proms);

  var wc = document.getElementById("porterWizardContainer"); if (wc) wc.style.display = "none";
  var rc = document.getElementById("porterResultsContainer"); if (rc) rc.style.display = "block";
  var ua = document.getElementById("porterUpdateActions"); if (ua) ua.style.display = "flex";
  var pbb = document.getElementById("porterBackBtn"); if (pbb) pbb.style.display = "none";
  var abt = document.getElementById("m06AlertText"); if (abt) abt.innerText = "Este planeamiento se está actualizando, no olvide guardar su registro.";
  var ab = document.getElementById("m06AlertBanner"); if (ab) { ab.style.display = "flex"; ab.style.justifyContent = "space-between"; }
  var badge = document.getElementById("m06EstadoBadge"); if (badge) { badge.innerText = "ACTUALIZANDO"; badge.className = "m05-badge-progreso actualizando"; }

  cargarPorterOA();
  document.getElementById("m06").scrollIntoView({ behavior:"smooth", block:"start" });
}

function guardarActualizacionesPorter() {
  var proms = {};
  preguntasPorter.forEach(function(f) { proms[f.fuerza] = promedio(f.fuerza); });
  var avg = Object.values(proms).reduce(function(a,b){return a+b;}, 0) / 5;
  var recs = [];
  if (avg >= 3.8) recs.push("Industria con ALTA intensidad competitiva. Rendimientos escasos.");
  else if (avg >= 2.4) recs.push("Intensidad MODERADA. Riesgos gestionables.");
  else recs.push("Sector ATRACTIVO. Alta viabilidad para inversion.");
  if (Object.values(proms).filter(function(p){return p>=3.8;}).length >= 3) recs.push("ALERTA: 3+ fuerzas con intensidad ALTA. Viabilidad comprometida.");

  supabaseClient.from("porter_resultados").upsert({
    plan_id: currentPlanId, usuario_id: currentUser ? currentUser.id : null, estado:"procesado",
    resultados:{ promedios:proms, respuestas:respuestas }, recomendaciones:recs
  }, { onConflict:"plan_id" }).then(function() {
    return supabaseClient.from("plan_contenido").upsert({
      plan_id: currentPlanId, modulo_id:"M06",
      contenido:{ promedios:proms, respuestas:respuestas },
      completado:true, completado_fecha: new Date()
    }, { onConflict:"plan_id, modulo_id" });
  }).then(function() {
    return supabaseClient.from("auditoria").insert({
      usuario_id: currentUser ? currentUser.id : null, modulo:"M06",
      accion: "ACTUALIZAR",
      detalle:"Analisis de las 5 Fuerzas de Porter actualizado."
    });
  }).then(function() {
    if (_porterOALocal !== null) {
      return supabaseClient.from("porter_oa").delete().eq("plan_id", currentPlanId).then(function() {
        if (_porterOALocal.length > 0) {
          var inserts = _porterOALocal.map(function(item) {
            return { plan_id: currentPlanId, tipo: item.tipo, descripcion: item.descripcion, orden: item.orden || 0 };
          });
          return supabaseClient.from("porter_oa").insert(inserts);
        }
      });
    }
  }).then(function() {
    _porterOALocal = null;
    completadoPreviamente = true; modoActualizacion = false;
    var badge = document.getElementById("m06EstadoBadge");
    if (badge) { badge.innerText = "COMPLETO"; badge.className = "m05-badge-progreso procesado"; }
    var abt = document.getElementById("m06AlertText"); if (abt) abt.innerText = "Este planeamiento ya cuenta con un análisis Porter completo.";
    var ua = document.getElementById("porterUpdateActions"); if (ua) ua.style.display = "none";
    var pbb = document.getElementById("porterBackBtn"); if (pbb) pbb.style.display = "";
    var ab = document.getElementById("m06AlertBanner"); if (ab) { ab.style.display = "flex"; ab.style.justifyContent = "space-between"; }
    mostrarResultados();
    if (typeof showToast !== "undefined") showToast("Los datos se actualizaron correctamente.", "success");
    if (typeof cargarDashboard !== "undefined") cargarDashboard();
  }).then(null, function(e) {
    console.error("Error guardar actualizaciones:", e);
    if (typeof showToast !== "undefined") showToast("Error al guardar: " + e.message, "error");
  });
}

function cancelarActualizacionesPorter() {
  document.getElementById("porterCancelConfirmModal").style.display = "none";
  _porterOALocal = null;
  modoActualizacion = false; completadoPreviamente = true;
  respuestas = {};
  var badge = document.getElementById("m06EstadoBadge");
  if (badge) { badge.innerText = "COMPLETO"; badge.className = "m05-badge-progreso procesado"; }
  var abt = document.getElementById("m06AlertText"); if (abt) abt.innerText = "Este planeamiento ya cuenta con un análisis Porter completo.";
  var ua = document.getElementById("porterUpdateActions"); if (ua) ua.style.display = "none";
  var pbb = document.getElementById("porterBackBtn"); if (pbb) pbb.style.display = "";
  var ab = document.getElementById("m06AlertBanner"); if (ab) { ab.style.display = "flex"; ab.style.justifyContent = "space-between"; }
  cargarPorter();
  if (typeof showToast !== "undefined") showToast("Las actualizaciones se cancelaron. Los datos originales se restauraron.", "info");
  if (typeof cargarDashboard !== "undefined") cargarDashboard();
}

// Exponer
window.cargarPorter = cargarPorter;
window.guardarActualizacionesPorter = guardarActualizacionesPorter;
window.cancelarActualizacionesPorter = cancelarActualizacionesPorter;

// Inicializar eventos al cargar DOM (si los elementos ya existen)
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", function() { setTimeout(setupEvents, 100); });
} else {
  setTimeout(setupEvents, 100);
}

// Escuchar navegacion a la seccion M06
document.addEventListener("click", function(e) {
  var nav = e.target.closest(".nav-item");
  if (nav && nav.getAttribute("data-section") === "m06") {
    setTimeout(cargarPorter, 200);
  }
});

})();


