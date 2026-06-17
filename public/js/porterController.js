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
    if (currentStep === 5 && answ === t) {
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
  else finalizar();
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
    if (badge) { badge.innerText = "Procesado"; badge.className = "m05-badge-progreso procesado"; }
    var wc = document.getElementById("porterWizardContainer"); if (wc) wc.style.display = "none";
    var rc = document.getElementById("porterResultsContainer"); if (rc) rc.style.display = "block";
    document.getElementById("m06").scrollIntoView({ behavior:"smooth", block:"start" });
    mostrarResultados();
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

  var tbOp = document.querySelector("#porterTablaOp tbody"), tbAm = document.querySelector("#porterTablaAm tbody");
  if (tbOp) tbOp.innerHTML = ""; if (tbAm) tbAm.innerHTML = "";
  var co = 0, ca = 0;
  preguntasPorter.forEach(function(f) {
    f.variables.forEach(function(v, i) {
      var s = respuestas[f.fuerza + "_" + i]; if (s === undefined || s === 3) return;
      var ico = s >= 4 ? "bi-exclamation-triangle-fill" : "bi-sun-fill";
      var row = "<tr><td><div class='chip-trazabilidad chip-trazabilidad-bloque'>" + f.label + "</div></td><td>" + v + "</td><td style='text-align:center;'><span class='chip-trazabilidad-score " + (s >= 4 ? "debilidad" : "fortaleza") + "'><i class='bi " + ico + "'></i> " + s + "/5</span></td></tr>";
      if (s >= 4) { if (tbAm) tbAm.insertAdjacentHTML("beforeend", row); ca++; } else { if (tbOp) tbOp.insertAdjacentHTML("beforeend", row); co++; }
    });
  });
  var pco = document.getElementById("porterCountOp"); if (pco) pco.innerText = co;
  var pca = document.getElementById("porterCountAm"); if (pca) pca.innerText = ca;
  if (co === 0 && tbOp) tbOp.innerHTML = "<tr class='empty-state-row'><td colspan='3'>No se detectaron oportunidades (puntajes 1 o 2)</td></tr>";
  if (ca === 0 && tbAm) tbAm.innerHTML = "<tr class='empty-state-row'><td colspan='3'>No se detectaron amenazas (puntajes 4 o 5)</td></tr>";
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
          ticks:{stepSize:1,backdropColor:"transparent",color:"#94a3b8",font:{size:10,weight:"500"}},
          pointLabels:{color:"#1e293b",font:{size:11,family:"Inter",weight:"600"}} } },
        plugins:{ legend:{display:true,position:"bottom",labels:{padding:20,usePointStyle:true,font:{size:11,family:"Inter",weight:"500"}}} }
      }
    });
  } catch(e) { console.error("Error renderRadar:", e); }
}

function mostrarResultadosUI() {
  completadoPreviamente = true;
  var badge = document.getElementById("m06EstadoBadge"); if (badge) { badge.innerText = "Procesado"; badge.className = "m05-badge-progreso procesado"; }
  var ab = document.getElementById("m06AlertBanner"); if (ab) { ab.style.display = "flex"; ab.style.justifyContent = "space-between"; }
  var wc = document.getElementById("porterWizardContainer"); if (wc) wc.style.display = "none";
  var rc = document.getElementById("porterResultsContainer"); if (rc) rc.style.display = "block";
  mostrarResultados();
}

function mostrarWizardUI() {
  completadoPreviamente = false;
  var badge = document.getElementById("m06EstadoBadge"); if (badge) { badge.innerText = Object.keys(respuestas).length ? "En edicion" : "No iniciado"; badge.className = "m05-badge-progreso" + (Object.keys(respuestas).length ? " edicion" : ""); }
  var ab = document.getElementById("m06AlertBanner"); if (ab) ab.style.display = "none";
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
  var pcb = document.getElementById("porterCancelBtn"); if (pcb) pcb.onclick = function() { modoActualizacion = false; cargarPorter(); };
  var pbb = document.getElementById("porterBackBtn"); if (pbb) pbb.onclick = function() {
    modoActualizacion = true; completadoPreviamente = false;
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
}

// Exponer
window.cargarPorter = cargarPorter;

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


