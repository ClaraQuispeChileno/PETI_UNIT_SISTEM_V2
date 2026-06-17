// =====================================================================
// CONTROLADOR PEST (M07) - PETI UNIT SISTEM
// Archivo independiente. Cualquier error queda aislado del resto.
// =====================================================================
(function() {
"use strict";

var preguntasPest = [
  { factor:"sociales", label:"Sociales y Demograficos", variables:[
    "Los cambios en la composicion etnica de los consumidores de nuestro sector afectan la demanda.",
    "El envejecimiento de la poblacion tiene un importante impacto en la demanda.",
    "Los nuevos estilos de vida y tendencias originan cambios en la oferta de nuestro sector.",
    "El envejecimiento de la poblacion tiene un importante impacto en la oferta del sector donde operamos.",
    "Las variaciones en el nivel de riqueza de la poblacion impactan considerablemente en la demanda de los productos/servicios del sector donde operamos."
  ]},
  { factor:"politicos", label:"Politico / Legal", variables:[
    "La legislacion fiscal afecta muy considerablemente a la economia de las empresas del sector donde operamos.",
    "La legislacion laboral afecta muy considerablemente a la operativa del sector donde actuamos.",
    "Las subvenciones otorgadas por las Administraciones Publicas son claves en el desarrollo competitivo del mercado donde operamos.",
    "El impacto que tiene la legislacion de proteccion al consumidor, en la manera de producir bienes y/o servicios es muy importante.",
    "La normativa autonomica tiene un impacto considerable en el funcionamiento del sector donde actuamos."
  ]},
  { factor:"economicos", label:"Economicos", variables:[
    "Las expectativas de crecimiento economico generales afectan crucialmente al mercado donde operamos.",
    "La politica de tipos de interes es fundamental en el desarrollo financiero del sector donde trabaja nuestra empresa.",
    "La globalizacion permite a nuestra industria gozar de importantes oportunidades en nuevos mercados.",
    "La situacion del empleo es fundamental para el desarrollo economico de nuestra empresa y nuestro sector.",
    "Las expectativas del ciclo economico de nuestro sector impactan en la situacion economica de sus empresas."
  ]},
  { factor:"tecnologicos", label:"Tecnologicos", variables:[
    "Las Administraciones Publicas estan incentivando el esfuerzo tecnologico de las empresas de nuestro sector.",
    "Internet, el comercio electronico, el wireless y otras NTIC estan impactando en la demanda de nuestros productos/servicios y en los de la competencia.",
    "El empleo de NTIC es generalizado en el sector donde trabajamos.",
    "En nuestro sector, es de gran importancia ser pionero o referente en el empleo de aplicaciones tecnologicas.",
    "En el sector donde operamos, para ser competitivos, es condicion sine qua non innovar constantemente."
  ]},
  { factor:"ambientales", label:"Medioambientales", variables:[
    "La legislacion medioambiental afecta al desarrollo de nuestro sector.",
    "Los clientes de nuestro mercado exigen que seamos socialmente responsables, en el plano medioambiental.",
    "En nuestro sector, las politicas medioambientales son una fuente de ventajas competitivas.",
    "La creciente preocupacion social por el medio ambiente impacta notablemente en la demanda de productos/servicios ofertados en nuestro mercado.",
    "El factor ecologico es una fuente de diferenciacion clara en el sector donde opera nuestra empresa."
  ]}
];

var currentStep = 1;
var respuestas = {};
var completadoPreviamente = false;
var modoActualizacion = false;
var chartInstance = null;
var _pestEditingId = null;
var _pestOALocal = null;

function getKey(step, idx) {
  if (typeof step === "string") return step + "_" + idx;
  return preguntasPest[step-1].factor + "_" + idx;
}
function stepComplete(step) {
  return preguntasPest[step-1].variables.every(function(_, i) {
    return respuestas[getKey(step, i)] !== undefined;
  });
}
function promedio(factorKey) {
  var f = preguntasPest.find(function(x) { return x.factor === factorKey; });
  if (!f) return null;
  var sum = 0, cnt = 0;
  f.variables.forEach(function(_, i) {
    var v = respuestas[factorKey + "_" + i];
    if (v !== undefined) { sum += v; cnt++; }
  });
  return cnt > 0 ? sum / cnt : null;
}
function clasificarPromedio(p) {
  if (p === null) return { label: "--", cls: "" };
  if (p <= 0.35) return { label: "Bajo Impacto", cls: "solido" };
  if (p <= 0.65) return { label: "Impacto Moderado", cls: "mejorable" };
  return { label: "Alto Impacto", cls: "critico" };
}
function clasificarRaw(raw) {
  if (raw === null) return { label: "--", cls: "" };
  if (raw <= 1.4) return { label: "Bajo", cls: "solido" };
  if (raw <= 2.6) return { label: "Medio", cls: "mejorable" };
  return { label: "Alto", cls: "critico" };
}

function renderStepper() {
  var steps = document.querySelectorAll("#pestStepper .stepper-step");
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
  var line = document.getElementById("pestStepperProgressLine");
  if (line) {
    var c = 0;
    for (var s2 = 1; s2 <= 5; s2++) if (completos[s2]) c++;
    line.style.width = Math.min((c / 4) * 100, 100) + "%";
  }
  var lbl = document.getElementById("pestStepperCurrentLabel");
  if (lbl) lbl.innerText = "Paso " + currentStep + " de 5: " + preguntasPest[currentStep-1].label;
}

function renderBlock() {
  var wc = document.getElementById("pestWizardContainer"); if (wc) wc.style.display = "block";
  var rc = document.getElementById("pestResultsContainer"); if (rc) rc.style.display = "none";
  var f = preguntasPest[currentStep-1]; if (!f) return;
  var bt = document.getElementById("pestBloqueTitulo"); if (bt) bt.innerText = f.label.toUpperCase() + " -- ITEMS " + ((currentStep-1)*5+1) + " AL " + (currentStep*5);

  var tipBanner = document.getElementById("pestTipBanner");
  if (tipBanner) tipBanner.style.display = modoActualizacion ? "none" : "";

  var html = "", answ = 0;
  f.variables.forEach(function(v, i) {
    var key = getKey(currentStep, i), val = respuestas[key];
    if (val !== undefined) answ++;
    var btns = "";
    for (var s = 0; s <= 4; s++) {
      btns += "<button class='btn-likert" + (val === s ? " selected" : "") + "' data-pkey='" + key + "' data-pval='" + s + "' " + (typeof isObjetivosEditable !== "undefined" ? (isObjetivosEditable() ? "" : "disabled") : "") + ">" + s + "</button>";
    }
    html += "<div class='pregunta-row" + (val !== undefined ? " has-response" : "") + "' data-pkey='" + key + "'><div class='pregunta-num-col'>" + (i+1) + "</div><div class='pregunta-texto-col'>" + v + "</div><div class='pregunta-likert-col'>" + btns + "</div></div>";
  });
  var pc = document.getElementById("pestCuestionario"); if (pc) pc.innerHTML = html;

  var t = f.variables.length;
  var bf = document.getElementById("pestBarFill"); if (bf) bf.style.width = (answ / t * 100) + "%";
  var bl = document.getElementById("pestBarLabel"); if (bl) bl.innerText = answ + "/" + t;

  var avg = promedio(f.factor);
  var pm = document.getElementById("pestPromedio"); if (pm) pm.innerText = avg !== null ? avg.toFixed(1) : "-";
  var cl = document.getElementById("pestClasif");
  if (cl) {
    var c = clasificarRaw(avg);
    if (avg === null) { cl.innerText = "-"; cl.className = "potencial-pill"; }
    else if (c.cls === "solido") { cl.innerText = c.label; cl.className = "potencial-pill badge-bajo"; }
    else if (c.cls === "mejorable") { cl.innerText = c.label; cl.className = "potencial-pill badge-medio"; }
    else { cl.innerText = c.label; cl.className = "potencial-pill badge-alto"; }
  }

  var pp = document.getElementById("pestPrevBtn"); if (pp) pp.disabled = (currentStep === 1);
  var pn = document.getElementById("pestNextBtn");
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
  var pcb = document.getElementById("pestCancelBtn"); if (pcb) pcb.style.display = modoActualizacion ? "" : "none";
}

function anterior() {
  if (currentStep > 1) { currentStep--; renderStepper(); renderBlock(); document.getElementById("m07").scrollIntoView({ behavior:"smooth", block:"start" }); }
}
function siguiente() {
  if (!stepComplete(currentStep)) { if (typeof showToast !== "undefined") showToast("Responda todas las preguntas antes de continuar.", "error"); return; }
  if (currentStep < 5) { currentStep++; renderStepper(); renderBlock(); document.getElementById("m07").scrollIntoView({ behavior:"smooth", block:"start" }); }
  else {
    if (modoActualizacion) {
      mostrarResultadosPendientes();
    } else {
      finalizar();
    }
  }
}
function responder(key, score) {
  respuestas[key] = score; renderStepper(); renderBlock();
}

function finalizar() {
  var proms = {};
  preguntasPest.forEach(function(f) { proms[f.factor] = promedio(f.factor); });
  var promsNorm = {};
  preguntasPest.forEach(function(f) { promsNorm[f.factor + "_norm"] = proms[f.factor] !== null ? proms[f.factor] / 4 : null; });
  var avgRaw = Object.values(proms).reduce(function(a,b){return a+b;}, 0) / 5;
  var avgNorm = avgRaw / 4;

  var recs = [];
  if (avgNorm >= 0.65) recs.push("ALTO IMPACTO del entorno general. Factores externos desfavorables en su mayoria.");
  else if (avgNorm >= 0.35) recs.push("IMPACTO MODERADO del entorno general. Existen riesgos y oportunidades balanceados.");
  else recs.push("BAJO IMPACTO del entorno general. Factores externos favorables en su mayoria.");

  supabaseClient.from("pest_resultados").upsert({
    plan_id: currentPlanId, usuario_id: currentUser ? currentUser.id : null, estado:"procesado",
    resultados:{ promedios:proms, normalizados:promsNorm, respuestas:respuestas }, recomendaciones:recs
  }, { onConflict:"plan_id" }).then(function() {
    return supabaseClient.from("plan_contenido").upsert({
      plan_id: currentPlanId, modulo_id:"M07",
      contenido:{ promedios:proms, normalizados:promsNorm, respuestas:respuestas },
      completado:true, completado_fecha: new Date()
    }, { onConflict:"plan_id, modulo_id" });
  }).then(function() {
    return supabaseClient.from("auditoria").insert({
      usuario_id: currentUser ? currentUser.id : null, modulo:"M07",
      accion: completadoPreviamente ? "ACTUALIZAR" : "CREAR",
      detalle:"Analisis PEST del entorno general completado."
    });
  }).then(function() {
    return sincFoda(proms);
  }).then(function() {
    if (_pestOALocal !== null) {
      return supabaseClient.from("pest_oa").delete().eq("plan_id", currentPlanId).then(function() {
        if (_pestOALocal.length > 0) {
          var inserts = _pestOALocal.map(function(item) {
            return { plan_id: currentPlanId, tipo: item.tipo, descripcion: item.descripcion, orden: item.orden || 0 };
          });
          return supabaseClient.from("pest_oa").insert(inserts);
        }
      });
    }
  }).then(function() {
    completadoPreviamente = true;
    modoActualizacion = false;
    var badge = document.getElementById("m07EstadoBadge");
    if (badge) { badge.innerText = "COMPLETO"; badge.className = "m05-badge-progreso completado"; }
    var ab = document.getElementById("pestAlertBanner");
    if (ab) { ab.style.display = "flex"; ab.style.justifyContent = "space-between"; ab.style.alignItems = "center"; }
    var at = document.getElementById("pestAlertText");
    if (at) at.textContent = "Este planeamiento ya cuenta con un analisis PEST procesado.";
    var bb = document.getElementById("pestBackBtn");
    if (bb) bb.style.display = "";
    var ua = document.getElementById("pestUpdateActions");
    if (ua) ua.style.display = "none";
    var wc = document.getElementById("pestWizardContainer"); if (wc) wc.style.display = "none";
    var rc = document.getElementById("pestResultsContainer"); if (rc) rc.style.display = "block";
    document.getElementById("m07").scrollIntoView({ behavior:"smooth", block:"start" });
    mostrarResultados(proms, promsNorm, avgNorm, recs);
    cargarPestOA();
    if (typeof showToast !== "undefined") showToast("Analisis PEST guardado.", "success");
    if (typeof cargarDashboard !== "undefined") cargarDashboard();
  }).then(null, function(e) { console.error("Error finalizarPEST:", e);
    if (typeof showToast !== "undefined") showToast("Error al guardar: " + e.message, "error");
  });
}

function sincFoda(proms) {
  return supabaseClient.from("foda").select("*").eq("plan_id", currentPlanId).then(function(res) {
      var items = res.data || [];
      preguntasPest.forEach(function(f) {
        var raw = proms[f.factor];
        if (raw === null) return;
        var norm = raw / 4;
        var tipo = norm >= 0.65 ? "amenaza" : (norm <= 0.35 ? "oportunidad" : null);
        if (!tipo) return;
        var t = { origen:"pest", factor:f.factor, promedio:raw, normalizado:norm, generado_automaticamente:true };
        var exist = items.find(function(x) {
          return x.trazabilidad && x.trazabilidad.origen === "pest" && x.trazabilidad.factor === f.factor;
        });
        var row = { plan_id: currentPlanId, tipo:tipo, descripcion:"["+f.label+"] Impacto promedio: "+raw.toFixed(1)+"/4 (normalizado: "+norm.toFixed(2)+")", trazabilidad:t, generado_auto:true };
        if (exist) supabaseClient.from("foda").update(row).eq("id", exist.id);
        else supabaseClient.from("foda").insert(row);
      });
    }).then(null, function(e){ console.error("Error sincFoda:", e); });
}
function mostrarResultados(proms, promsNorm, avgNorm, recs) {
  var pi = document.getElementById("pestImpacto"); if (pi) pi.innerText = avgNorm.toFixed(2);
  var cc = clasificarPromedio(avgNorm); if (pi) pi.className = "clasificacion-total-premium " + cc.cls;
  var pit = document.getElementById("pestImpactoTxt"); if (pit) pit.innerText = cc.label;
  var pd = document.getElementById("pestFactorDominante"); if (pd) {
    var dk = "", dv = 0; Object.entries(proms).forEach(function(e){if(e[1]>dv){dk=e[0];dv=e[1];}});
    var di = preguntasPest.find(function(f){return f.factor===dk;});
    pd.innerText = di ? di.label : "-";
  }
  var pdt = document.getElementById("pestFactorDominanteTxt"); if (pdt) {
    var dv2 = 0; Object.values(proms).forEach(function(v){if(v>dv2)dv2=v;});
    pdt.innerText = "Promedio: " + dv2.toFixed(1) + "/4 (Norm: " + (dv2/4).toFixed(2) + ")";
  }
  var pr = document.getElementById("pestRec"); if (pr) {
    if (avgNorm >= 0.65) pr.innerText = "PRECAUCION";
    else if (avgNorm <= 0.35) pr.innerText = "FAVORABLE";
    else pr.innerText = "MODERADO";
    pr.className = "clasificacion-total-premium " + cc.cls;
  }
  var prt = document.getElementById("pestRecTxt"); if (prt) prt.innerText = recs && recs[0] ? recs[0] : "-";

  var bd = "";
  preguntasPest.forEach(function(f) {
    var raw = proms[f.factor] || 0, norm = raw / 4;
    var c = clasificarPromedio(norm);
    bd += "<div class='bloque-score-card " + c.cls + "'><div class='bloque-name'>" + f.label + "</div><div class='bloque-score-value'>" + raw.toFixed(1) + "</div><div class='bloque-score-max'>/4</div><div style='font-size:0.7rem;color:#94a3b8;'>Norm: " + norm.toFixed(2) + "</div><div class='bloque-score-bar'><div class='bar-fill-bloque' style='width:" + (norm * 100) + "%'></div></div></div>";
  });
  var pbk = document.getElementById("pestBreakdown"); if (pbk) pbk.innerHTML = bd;

  renderChart(promsNorm);
}

function renderChart(promsNorm) {
  var ctx = document.getElementById("pestChart"); if (!ctx) return;
  if (chartInstance) { try { chartInstance.destroy(); } catch(e) {} }
  try {
    chartInstance = new Chart(ctx, {
      type:"bar",
      data:{
        labels: preguntasPest.map(function(f){return f.label;}),
        datasets:[{
          label:"Impacto Normalizado",
          data: preguntasPest.map(function(f){return promsNorm[f.factor + "_norm"] || 0;}),
          backgroundColor: preguntasPest.map(function(f){
            var v = promsNorm[f.factor + "_norm"] || 0;
            if (v >= 0.65) return "#ef4444";
            if (v >= 0.35) return "#f59e0b";
            return "#10b981";
          }),
          borderColor: preguntasPest.map(function(f){
            var v = promsNorm[f.factor + "_norm"] || 0;
            if (v >= 0.65) return "#dc2626";
            if (v >= 0.35) return "#d97706";
            return "#059669";
          }),
          borderWidth: 1,
          borderRadius: 4,
          maxBarThickness: 50
        }]
      },
      options:{
        responsive:true, maintainAspectRatio:false,
        indexAxis:"y",
        scales:{
          x: { min:0, max:1, ticks:{ stepSize:0.1, color:"#94a3b8", font:{size:10} }, grid:{ color:"#f1f5f9" }, title:{ display:true, text:"Nivel de impacto (0 = minimo, 1 = maximo)", color:"#64748b", font:{size:11, weight:"600"} } },
          y: { ticks:{ color:"#1e293b", font:{size:11, weight:"600", family:"Inter"} }, grid:{ display:false } }
        },
        plugins:{
          legend:{ display:false },
          tooltip:{ callbacks:{ label:function(context){ return "Impacto: " + (context.raw * 4).toFixed(1) + "/4 (Norm: " + context.raw.toFixed(2) + ")"; } } }
        }
      }
    });
  } catch(e) { console.error("Error renderChart:", e); }
}
function mostrarResultadosUI() {
  completadoPreviamente = true;
  var badge = document.getElementById("m07EstadoBadge");
  if (badge) {
    if (modoActualizacion) {
      badge.innerText = "ACTUALIZANDO";
      badge.className = "m05-badge-progreso actualizando";
    } else {
      badge.innerText = "COMPLETO";
      badge.className = "m05-badge-progreso completado";
    }
  }
  var ab = document.getElementById("pestAlertBanner");
  if (ab) {
    ab.style.display = "flex";
    ab.style.alignItems = "center";
    if (modoActualizacion) {
      ab.style.justifyContent = "center";
      document.getElementById("pestAlertText").textContent = "Este planeamiento se esta actualizando, no olvide guardar su registro.";
      var bb = document.getElementById("pestBackBtn");
      if (bb) bb.style.display = "none";
      var ua = document.getElementById("pestUpdateActions");
      if (ua) ua.style.display = "flex";
    } else {
      ab.style.justifyContent = "space-between";
      document.getElementById("pestAlertText").textContent = "Este planeamiento ya cuenta con un analisis PEST procesado.";
      var bb2 = document.getElementById("pestBackBtn");
      if (bb2) bb2.style.display = "";
      var ua2 = document.getElementById("pestUpdateActions");
      if (ua2) ua2.style.display = "none";
    }
  }
  var wc = document.getElementById("pestWizardContainer"); if (wc) wc.style.display = "none";
  var rc = document.getElementById("pestResultsContainer"); if (rc) rc.style.display = "block";
  var proms = {}; preguntasPest.forEach(function(f){proms[f.factor] = promedio(f.factor);});
  var promsNorm = {}; preguntasPest.forEach(function(f){promsNorm[f.factor + "_norm"] = proms[f.factor] !== null ? proms[f.factor] / 4 : null;});
  var avgNorm = Object.values(promsNorm).reduce(function(a,b){return a+b;}, 0) / 5;
  mostrarResultados(proms, promsNorm, avgNorm, []);
  cargarPestOA();
}
function mostrarWizardUI() {
  completadoPreviamente = false;
  var badge = document.getElementById("m07EstadoBadge");
  if (badge) {
    if (modoActualizacion) {
      badge.innerText = "ACTUALIZANDO";
      badge.className = "m05-badge-progreso actualizando";
    } else {
      badge.innerText = "NO INICIADO";
      badge.className = "m05-badge-progreso no-iniciado";
    }
  }
  var ab = document.getElementById("pestAlertBanner");
  if (ab) {
    if (modoActualizacion) {
      ab.style.display = "flex";
      ab.style.justifyContent = "center";
      ab.style.alignItems = "center";
      document.getElementById("pestAlertText").textContent = "Este planeamiento se esta actualizando, no olvide guardar su registro.";
      var bb = document.getElementById("pestBackBtn");
      if (bb) bb.style.display = "none";
      var ua = document.getElementById("pestUpdateActions");
      if (ua) ua.style.display = "none";
    } else {
      ab.style.display = "none";
    }
  }
  var wc = document.getElementById("pestWizardContainer"); if (wc) wc.style.display = "block";
  var rc = document.getElementById("pestResultsContainer"); if (rc) rc.style.display = "none";
  currentStep = 1; renderStepper(); renderBlock();
}

function cargarPest() {
  try {
    if (typeof currentPlanId === "undefined" || !currentPlanId) return;

    // 1. Intentar desde pest_resultados
    supabaseClient.from("pest_resultados").select("*").eq("plan_id", currentPlanId).maybeSingle().then(function(res) {
      var data = res.data;
      if (res.error && res.error.code === "42P01") data = null;

      if (data && data.estado === "procesado") {
        respuestas = data.resultados && data.resultados.respuestas ? data.resultados.respuestas : {};
        mostrarResultadosUI();
        return;
      }

      // 2. Fallback: plan_contenido (legacy)
      supabaseClient.from("plan_contenido").select("contenido").eq("plan_id", currentPlanId).eq("modulo_id", "M07").maybeSingle().then(function(legacy) {
        var legacyData = legacy.data;
        if (legacyData && legacyData.contenido && legacyData.contenido.respuestas) {
          respuestas = legacyData.contenido.respuestas;
          var proms = {}; preguntasPest.forEach(function(f){proms[f.factor] = promedio(f.factor);});
          supabaseClient.from("pest_resultados").upsert({
            plan_id: currentPlanId, usuario_id: currentUser ? currentUser.id : null, estado:"procesado",
            resultados:{ promedios:proms, respuestas:respuestas }
          }, { onConflict:"plan_id" }).then(null, function(){});
          mostrarResultadosUI();
          return;
        }
        respuestas = {};
        mostrarWizardUI();
      }).then(null, function() {
        respuestas = {};
        mostrarWizardUI();
      });

    }).then(null, function(e) { console.error("Error cargarPest DB:", e); });
  } catch(e2) { console.error("Error en cargarPest:", e2); }
}

function setupEvents() {
  var ppb = document.getElementById("pestPrevBtn"); if (ppb) ppb.onclick = anterior;
  var pnb = document.getElementById("pestNextBtn"); if (pnb) pnb.onclick = siguiente;
  var pcb = document.getElementById("pestCancelBtn"); if (pcb) pcb.onclick = function() { modoActualizacion = false; cargarPest(); };
  var pbb = document.getElementById("pestBackBtn"); if (pbb) pbb.onclick = function() {
    modoActualizacion = true; completadoPreviamente = false;
    respuestas = {};
    _pestOALocal = [];
    _pestEditingId = null;
    var badge = document.getElementById("m07EstadoBadge");
    if (badge) { badge.innerText = "ACTUALIZANDO"; badge.className = "m05-badge-progreso actualizando"; }
    var ab = document.getElementById("pestAlertBanner");
    if (ab) { ab.style.display = "flex"; ab.style.justifyContent = "center"; ab.style.alignItems = "center"; }
    var at = document.getElementById("pestAlertText");
    if (at) at.textContent = "Este planeamiento se esta actualizando, no olvide guardar su registro.";
    if (pbb) pbb.style.display = "none";
    var tipBanner = document.getElementById("pestTipBanner");
    if (tipBanner) tipBanner.style.display = "none";
    var ua = document.getElementById("pestUpdateActions");
    if (ua) ua.style.display = "none";
    var wc = document.getElementById("pestWizardContainer"); if (wc) wc.style.display = "block";
    var rc = document.getElementById("pestResultsContainer"); if (rc) rc.style.display = "none";
    currentStep = 1; renderStepper(); renderBlock();
    document.getElementById("m07").scrollIntoView({ behavior:"smooth", block:"start" });
  };
  var pc = document.getElementById("pestCuestionario"); if (pc) pc.onclick = function(e) {
    var btn = e.target.closest(".btn-likert");
    if (btn) responder(btn.getAttribute("data-pkey"), parseInt(btn.getAttribute("data-pval")));
  };
  var ps = document.getElementById("pestStepper"); if (ps) ps.onclick = function(e) {
    var stepEl = e.target.closest(".stepper-step");
    if (stepEl && !stepEl.classList.contains("locked")) { currentStep = parseInt(stepEl.getAttribute("data-step")); renderStepper(); renderBlock(); }
  };
  // Pest OA events
  var poa1 = document.getElementById("pestAddOpBtn"); if (poa1) poa1.addEventListener("click", function() { agregarPestOA("oportunidad"); });
  var poa2 = document.getElementById("pestAddAmBtn"); if (poa2) poa2.addEventListener("click", function() { agregarPestOA("amenaza"); });
  var poa3 = document.getElementById("pestOpInput"); if (poa3) poa3.addEventListener("keydown", function(e) { if (e.key === "Enter") agregarPestOA("oportunidad"); });
  var poa4 = document.getElementById("pestAmInput"); if (poa4) poa4.addEventListener("keydown", function(e) { if (e.key === "Enter") agregarPestOA("amenaza"); });
  var poa5 = document.getElementById("pestTablaOp"); if (poa5) poa5.addEventListener("click", _pestClickHandler);
  var poa6 = document.getElementById("pestTablaAm"); if (poa6) poa6.addEventListener("click", _pestClickHandler);
  var pg = document.getElementById("pestGuardarActualizacionesBtn"); if (pg) pg.addEventListener("click", guardarActualizacionesPest);
  var pcancel = document.getElementById("pestCancelarActualizacionesBtn"); if (pcancel) pcancel.addEventListener("click", cancelarActualizacionesPest);
  var pcc = document.getElementById("pestCancelConfirmBtn"); if (pcc) pcc.addEventListener("click", _confirmarCancelarPest);
}

// ==================== PEST OA — OPORTUNIDADES Y AMENAZAS EDITABLES ====================
function cargarPestOA() {
  if (!currentPlanId) return;
  supabaseClient.from("pest_oa").select("*").eq("plan_id", currentPlanId).order("orden").order("id").then(function(res) {
    var items = res.data || [];
    if (modoActualizacion) {
      _pestOALocal = JSON.parse(JSON.stringify(items));
      renderPestOATables(_pestOALocal);
    } else {
      _pestOALocal = null;
      renderPestOATables(items);
    }
  }).then(null, function() {
    if (modoActualizacion) { _pestOALocal = []; renderPestOATables(_pestOALocal); }
    else { renderPestOATables([]); }
  });
}

function renderPestOATables(items) {
  var tbOp = document.querySelector("#pestTablaOp tbody");
  var tbAm = document.querySelector("#pestTablaAm tbody");
  if (!tbOp || !tbAm) return;
  var ops = items.filter(function(i) { return i.tipo === "oportunidad"; });
  var ams = items.filter(function(i) { return i.tipo === "amenaza"; });
  tbOp.innerHTML = "";
  tbAm.innerHTML = "";
  ops.forEach(function(item, idx) { tbOp.insertAdjacentHTML("beforeend", _pestOARow(item, idx + 1)); });
  ams.forEach(function(item, idx) { tbAm.insertAdjacentHTML("beforeend", _pestOARow(item, idx + 1)); });
  if (ops.length === 0) tbOp.innerHTML = "<tr class='empty-state-row'><td colspan='3'><i class='bi bi-sun'></i><br>No se registraron oportunidades</td></tr>";
  if (ams.length === 0) tbAm.innerHTML = "<tr class='empty-state-row'><td colspan='3'><i class='bi bi-exclamation-triangle'></i><br>No se registraron amenazas</td></tr>";
  var pco = document.getElementById("pestCountOp"); if (pco) pco.innerText = ops.length;
  var pca = document.getElementById("pestCountAm"); if (pca) pca.innerText = ams.length;
}

function _pestOARow(item, num) {
  var edit = (_pestEditingId === item.id);
  var desc = edit
    ? '<input type="text" class="pest-edit-input" value="' + _escPest(item.descripcion) + '" data-oid="' + item.id + '" style="width:100%;padding:4px 8px;border:1px solid #cbd5e1;border-radius:6px;font-size:0.9em;">'
    : '<div style="font-weight:600;color:#1e293b;line-height:1.5;">' + _escPest(item.descripcion) + '</div>';
  var acts = edit
    ? '<button class="btn-small btn-success pest-save-btn" data-oid="' + item.id + '" title="Guardar"><i class="bi bi-check-lg"></i></button><button class="btn-small btn-secondary pest-cancel-btn" title="Cancelar"><i class="bi bi-x-lg"></i></button>'
    : '<button class="btn-small btn-secondary pest-edit-btn" data-oid="' + item.id + '" title="Editar"><i class="bi bi-pencil"></i></button><button class="btn-small btn-danger pest-delete-btn" data-oid="' + item.id + '" title="Eliminar"><i class="bi bi-trash"></i></button>';
  return '<tr data-oid="' + item.id + '"><td style="text-align:center;"><div class="pregunta-num-col" style="margin:0 auto;">' + num + '</div></td><td>' + desc + '</td><td style="text-align:center;white-space:nowrap;">' + acts + '</td></tr>';
}

function _escPest(t) { return t ? String(t).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;") : ""; }

function agregarPestOA(tipo) {
  if (typeof isObjetivosEditable !== "undefined" && !isObjetivosEditable()) { if (typeof showToast !== "undefined") showToast("No se puede modificar en un plan en revision.", "error"); return; }
  var input = document.getElementById(tipo === "oportunidad" ? "pestOpInput" : "pestAmInput");
  if (!input || !input.value.trim()) { if (typeof showToast !== "undefined") showToast("Escribe un enunciado.", "error"); return; }
  if (modoActualizacion && _pestOALocal !== null) {
    var newId = Date.now() + Math.random();
    _pestOALocal.push({ id: newId, tipo: tipo, descripcion: input.value.trim(), orden: 0 });
    input.value = "";
    renderPestOATables(_pestOALocal);
  } else {
    supabaseClient.from("pest_oa").insert({
      plan_id: currentPlanId, tipo: tipo, descripcion: input.value.trim(), orden: 0
    }).then(function() {
      input.value = "";
      cargarPestOA();
    }).then(null, function(e) { if (typeof showToast !== "undefined") showToast("Error al guardar: " + e.message, "error"); });
  }
}

function _pestClickHandler(e) {
  var btn = e.target.closest("button");
  if (!btn) return;
  var oid = btn.getAttribute("data-oid");
  var isLocal = _pestOALocal !== null;
  var source = isLocal ? _pestOALocal : null;

  if (btn.classList.contains("pest-edit-btn")) {
    _pestEditingId = typeof oid === "string" && oid.indexOf(".") > -1 ? parseFloat(oid) : parseInt(oid);
    if (isLocal) renderPestOATables(_pestOALocal);
    else cargarPestOA();
  } else if (btn.classList.contains("pest-delete-btn")) {
    if (!confirm("Eliminar este elemento?")) return;
    if (isLocal) {
      var idx = _pestOALocal.findIndex(function(i) { return String(i.id) === oid; });
      if (idx > -1) _pestOALocal.splice(idx, 1);
      renderPestOATables(_pestOALocal);
    } else {
      supabaseClient.from("pest_oa").delete().eq("id", oid).then(function() { cargarPestOA(); }).then(null, function(e) { if (typeof showToast !== "undefined") showToast("Error al eliminar: " + e.message, "error"); });
    }
  } else if (btn.classList.contains("pest-save-btn")) {
    var input = document.querySelector('.pest-edit-input[data-oid="' + oid + '"]');
    if (!input || !input.value.trim()) { if (typeof showToast !== "undefined") showToast("El enunciado no puede estar vacio.", "error"); return; }
    if (isLocal) {
      var item = _pestOALocal.find(function(i) { return String(i.id) === oid; });
      if (item) item.descripcion = input.value.trim();
      _pestEditingId = null;
      renderPestOATables(_pestOALocal);
    } else {
      supabaseClient.from("pest_oa").update({ descripcion: input.value.trim() }).eq("id", oid).then(function() {
        _pestEditingId = null;
        cargarPestOA();
      }).then(null, function(e) { if (typeof showToast !== "undefined") showToast("Error al guardar: " + e.message, "error"); });
    }
  } else if (btn.classList.contains("pest-cancel-btn")) {
    _pestEditingId = null;
    if (isLocal) renderPestOATables(_pestOALocal);
    else cargarPestOA();
  }
}

function mostrarResultadosPendientes() {
  var proms = {};
  preguntasPest.forEach(function(f) { proms[f.factor] = promedio(f.factor); });
  var promsNorm = {};
  preguntasPest.forEach(function(f) { promsNorm[f.factor + "_norm"] = proms[f.factor] !== null ? proms[f.factor] / 4 : null; });
  var avgRaw = Object.values(proms).reduce(function(a,b){return a+b;}, 0) / 5;
  var avgNorm = avgRaw / 4;

  var recs = [];
  if (avgNorm >= 0.65) recs.push("ALTO IMPACTO del entorno general. Factores externos desfavorables en su mayoria.");
  else if (avgNorm >= 0.35) recs.push("IMPACTO MODERADO del entorno general. Existen riesgos y oportunidades balanceados.");
  else recs.push("BAJO IMPACTO del entorno general. Factores externos favorables en su mayoria.");

  mostrarResultados(proms, promsNorm, avgNorm, recs);

  var wc = document.getElementById("pestWizardContainer"); if (wc) wc.style.display = "none";
  var rc = document.getElementById("pestResultsContainer"); if (rc) rc.style.display = "block";
  document.getElementById("m07").scrollIntoView({ behavior:"smooth", block:"start" });

  var badge = document.getElementById("m07EstadoBadge");
  if (badge) { badge.innerText = "ACTUALIZANDO"; badge.className = "m05-badge-progreso actualizando"; }

  var ab = document.getElementById("pestAlertBanner");
  if (ab) { ab.style.display = "flex"; ab.style.justifyContent = "center"; ab.style.alignItems = "center"; }
  var at = document.getElementById("pestAlertText");
  if (at) at.textContent = "Este planeamiento se esta actualizando, no olvide guardar su registro.";
  var bb = document.getElementById("pestBackBtn");
  if (bb) bb.style.display = "none";

  var ua = document.getElementById("pestUpdateActions");
  if (ua) ua.style.display = "flex";

  cargarPestOA();
}

function guardarActualizacionesPest() {
  var proms = {};
  preguntasPest.forEach(function(f) { proms[f.factor] = promedio(f.factor); });
  var promsNorm = {};
  preguntasPest.forEach(function(f) { promsNorm[f.factor + "_norm"] = proms[f.factor] !== null ? proms[f.factor] / 4 : null; });
  var avgRaw = Object.values(proms).reduce(function(a,b){return a+b;}, 0) / 5;
  var avgNorm = avgRaw / 4;

  var recs = [];
  if (avgNorm >= 0.65) recs.push("ALTO IMPACTO del entorno general. Factores externos desfavorables en su mayoria.");
  else if (avgNorm >= 0.35) recs.push("IMPACTO MODERADO del entorno general. Existen riesgos y oportunidades balanceados.");
  else recs.push("BAJO IMPACTO del entorno general. Factores externos favorables en su mayoria.");

  supabaseClient.from("pest_resultados").upsert({
    plan_id: currentPlanId, usuario_id: currentUser ? currentUser.id : null, estado:"procesado",
    resultados:{ promedios:proms, normalizados:promsNorm, respuestas:respuestas }, recomendaciones:recs
  }, { onConflict:"plan_id" }).then(function() {
    return supabaseClient.from("plan_contenido").upsert({
      plan_id: currentPlanId, modulo_id:"M07",
      contenido:{ promedios:proms, normalizados:promsNorm, respuestas:respuestas },
      completado:true, completado_fecha: new Date()
    }, { onConflict:"plan_id, modulo_id" });
  }).then(function() {
    return supabaseClient.from("auditoria").insert({
      usuario_id: currentUser ? currentUser.id : null, modulo:"M07",
      accion: "ACTUALIZAR",
      detalle:"Analisis PEST del entorno general actualizado."
    });
  }).then(function() {
    return sincFoda(proms);
  }).then(function() {
    if (_pestOALocal !== null) {
      return supabaseClient.from("pest_oa").delete().eq("plan_id", currentPlanId).then(function() {
        if (_pestOALocal.length > 0) {
          var inserts = _pestOALocal.map(function(item) {
            return { plan_id: currentPlanId, tipo: item.tipo, descripcion: item.descripcion, orden: item.orden || 0 };
          });
          return supabaseClient.from("pest_oa").insert(inserts);
        }
      });
    }
  }).then(function() {
    completadoPreviamente = true;
    modoActualizacion = false;
    _pestOALocal = null;
    _pestEditingId = null;
    var badge = document.getElementById("m07EstadoBadge");
    if (badge) { badge.innerText = "COMPLETO"; badge.className = "m05-badge-progreso completado"; }
    var ab = document.getElementById("pestAlertBanner");
    if (ab) { ab.style.display = "flex"; ab.style.justifyContent = "space-between"; ab.style.alignItems = "center"; }
    var at = document.getElementById("pestAlertText");
    if (at) at.textContent = "Este planeamiento ya cuenta con un analisis PEST procesado.";
    var bb = document.getElementById("pestBackBtn");
    if (bb) bb.style.display = "";
    var ua = document.getElementById("pestUpdateActions");
    if (ua) ua.style.display = "none";
    mostrarResultados(proms, promsNorm, avgNorm, recs);
    cargarPestOA();
    if (typeof showToast !== "undefined") showToast("Datos guardados correctamente.", "success");
    if (typeof cargarDashboard !== "undefined") cargarDashboard();
  }).then(null, function(e) {
    if (typeof showToast !== "undefined") showToast("Error al guardar: " + e.message, "error");
  });
}

function cancelarActualizacionesPest() {
  document.getElementById("pestCancelConfirmModal").style.display = "flex";
}

function _confirmarCancelarPest() {
  document.getElementById("pestCancelConfirmModal").style.display = "none";
  modoActualizacion = false;
  _pestOALocal = null;
  _pestEditingId = null;
  respuestas = {};
  if (typeof showToast !== "undefined") showToast("Actualizaciones canceladas.", "info");
  cargarPest();
}

window.cargarPest = cargarPest;

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", function() { setTimeout(setupEvents, 150); });
} else {
  setTimeout(setupEvents, 150);
}

document.addEventListener("click", function(e) {
  var nav = e.target.closest(".nav-item");
  if (nav && nav.getAttribute("data-section") === "m07") {
    setTimeout(cargarPest, 200);
  }
});

})();
