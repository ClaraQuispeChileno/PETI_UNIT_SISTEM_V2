(function() {
"use strict";

var itemsF = [];
var itemsD = [];
var itemsO = [];
var itemsA = [];
var scores = {};
var currentStep = 1;
var dafoCompletado = false;
var dafoModoActualizacion = false;

var pasos = [
  { id: 'fortaleza', label: 'Fortalezas', icon: 'bi-shield-check-fill', color: '#059669' },
  { id: 'debilidad', label: 'Debilidades', icon: 'bi-exclamation-triangle-fill', color: '#dc2626' },
  { id: 'oportunidad', label: 'Oportunidades', icon: 'bi-sun-fill', color: '#2563eb' },
  { id: 'amenaza', label: 'Amenazas', icon: 'bi-cloud-lightning-fill', color: '#d97706' }
];

var escalaLikert = [
  { val: 0, label: 'En total desacuerdo' },
  { val: 1, label: 'No está de acuerdo' },
  { val: 2, label: 'Está de acuerdo' },
  { val: 3, label: 'Bastante de acuerdo' },
  { val: 4, label: 'En total acuerdo' }
];

function obtenerItems() {
  if (currentStep === 1) return itemsF;
  if (currentStep === 2) return itemsD;
  if (currentStep === 3) return itemsO;
  return itemsA;
}

function obtenerTipo() {
  return pasos[currentStep - 1].id;
}

function cargarDafo() {
  try {
    if (typeof currentPlanId === "undefined" || !currentPlanId) return;

    var pid = currentPlanId;

    // Cargar F/D/O/A registrados en base de datos por modulo + plan_contenido M08
    var p1 = supabaseClient.from("foda").select("*").eq("plan_id", pid).or('generado_auto.is.false,generado_auto.is.null').order("id");
    var p2 = supabaseClient.from("cadena_valor_foda").select("*").eq("plan_id", pid).order("id");
    var p3 = supabaseClient.from("bcg_foda").select("*").eq("plan_id", pid).order("id");
    var p4 = supabaseClient.from("porter_oa").select("*").eq("plan_id", pid).order("id");
    var p5 = supabaseClient.from("pest_oa").select("*").eq("plan_id", pid).order("id");
    var p6 = supabaseClient.from("plan_contenido").select("contenido").eq("plan_id", pid).eq("modulo_id", "M08").maybeSingle();

    Promise.all([p1, p2, p3, p4, p5, p6]).then(function(results) {
      function descExists(arr, desc) {
        return arr.some(function(x){ return x.descripcion === desc; });
      }

      // Items propios de la tabla foda
      var fodaData = (results[0].data || []).filter(function(x){ return x && x.tipo && x.descripcion; });
      itemsF = fodaData.filter(function(x){ return x.tipo === "fortaleza"; });
      itemsD = fodaData.filter(function(x){ return x.tipo === "debilidad"; });
      itemsO = fodaData.filter(function(x){ return x.tipo === "oportunidad"; });
      itemsA = fodaData.filter(function(x){ return x.tipo === "amenaza"; });

      // Fortalezas/Debilidades desde Cadena de Valor (M04)
      var cadData = (results[1].data || []).filter(function(x){ return x && x.tipo && x.descripcion; });
      cadData.forEach(function(item) {
        var wrap = { id: "cad_valor_" + item.id, tipo: item.tipo, descripcion: item.descripcion, trazabilidad: { origen: "cadena_valor_foda", id: item.id } };
        if (item.tipo === "fortaleza" && !descExists(itemsF, item.descripcion)) itemsF.push(wrap);
        else if (item.tipo === "debilidad" && !descExists(itemsD, item.descripcion)) itemsD.push(wrap);
      });

      // Fortalezas/Debilidades desde BCG (M05)
      var bcgData = (results[2].data || []).filter(function(x){ return x && x.tipo && x.descripcion; });
      bcgData.forEach(function(item) {
        var wrap = { id: "bcg_foda_" + item.id, tipo: item.tipo, descripcion: item.descripcion, trazabilidad: { origen: "bcg_foda", id: item.id } };
        if (item.tipo === "fortaleza" && !descExists(itemsF, item.descripcion)) itemsF.push(wrap);
        else if (item.tipo === "debilidad" && !descExists(itemsD, item.descripcion)) itemsD.push(wrap);
      });

      // Oportunidades/Amenazas desde Porter (M06)
      var porterData = (results[3].data || []).filter(function(x){ return x && x.tipo && x.descripcion; });
      porterData.forEach(function(item) {
        var wrap = { id: "porter_oa_" + item.id, tipo: item.tipo, descripcion: item.descripcion, trazabilidad: { origen: "porter_oa", id: item.id } };
        if (item.tipo === "oportunidad" && !descExists(itemsO, item.descripcion)) itemsO.push(wrap);
        else if (item.tipo === "amenaza" && !descExists(itemsA, item.descripcion)) itemsA.push(wrap);
      });

      // Oportunidades/Amenazas desde PEST (M07)
      var pestData = (results[4].data || []).filter(function(x){ return x && x.tipo && x.descripcion; });
      pestData.forEach(function(item) {
        var wrap = { id: "pest_oa_" + item.id, tipo: item.tipo, descripcion: item.descripcion, trazabilidad: { origen: "pest_oa", id: item.id } };
        if (item.tipo === "oportunidad" && !descExists(itemsO, item.descripcion)) itemsO.push(wrap);
        else if (item.tipo === "amenaza" && !descExists(itemsA, item.descripcion)) itemsA.push(wrap);
      });

      dafoCompletado = itemsF.length > 0 || itemsD.length > 0 || itemsO.length > 0 || itemsA.length > 0;

      var pcRes = results[5].data;
      if (pcRes && pcRes.contenido && pcRes.contenido.scores) {
        scores = pcRes.contenido.scores;
      } else {
        scores = {};
      }
      dafoModoActualizacion = false;
      currentStep = 1;
      renderDafoUI();
    }).catch(function(e) { console.error("Error cargarDafo:", e); });
  } catch(e2) { console.error("Error cargarDafo:", e2); }
}

function renderDafoUI() {
  var badge = document.getElementById("m08EstadoBadge");
  if (badge) {
    if (dafoModoActualizacion) {
      badge.innerText = "Actualizando";
      badge.className = "m05-badge-progreso actualizando";
    } else if (dafoCompletado) {
      badge.innerText = "Completado";
      badge.className = "m05-badge-progreso completado";
    } else {
      badge.innerText = "No iniciado";
      badge.className = "m05-badge-progreso no-iniciado";
    }
  }

  var alertBanner = document.getElementById("dafoAlertBanner");
  var alertText = document.getElementById("dafoAlertText");
  var actualizarBtn = document.getElementById("dafoActualizarBtn");
  var actualizarBtnText = document.getElementById("dafoActualizarBtnText");

  if (dafoModoActualizacion) {
    if (alertBanner) { alertBanner.style.display = "flex"; alertBanner.style.justifyContent = "center"; }
    if (alertText) alertText.textContent = "Este planeamiento se está actualizando, complete todos los pasos.";
    if (actualizarBtn) actualizarBtn.style.display = "none";
  } else if (dafoCompletado) {
    if (alertBanner) { alertBanner.style.display = "flex"; alertBanner.style.justifyContent = "space-between"; }
    if (alertText) alertText.textContent = "Este planeamiento ya cuenta con una Matriz FODA generada.";
    if (actualizarBtn) { actualizarBtn.style.display = ""; actualizarBtnText.textContent = "Editar matriz"; }
  } else {
    if (alertBanner) { alertBanner.style.display = "flex"; alertBanner.style.justifyContent = "center"; }
    if (alertText) alertText.textContent = "En este planeamiento no hay datos registrados, agregue uno.";
    if (actualizarBtn) { actualizarBtn.style.display = ""; actualizarBtnText.textContent = "Actualizar FODA"; }
  }

  var factoresSection = document.getElementById("dafoFactoresSection");
  if (factoresSection) {
    factoresSection.style.display = dafoModoActualizacion ? "none" : "block";
  }

  if (!dafoModoActualizacion) {
    renderFactoresGrid();
  }

  if (dafoModoActualizacion) {
    document.getElementById("dafoWizardContainer").style.display = "block";
    document.getElementById("dafoResultsContainer").style.display = "none";
    renderDafoStepper();
    renderDafoStep();
  } else {
    document.getElementById("dafoWizardContainer").style.display = "none";
    document.getElementById("dafoResultsContainer").style.display = "none";
  }
}

function renderFactoresGrid() {
  var grid = document.getElementById("dafoFactoresGrid");
  if (!grid) return;

  var cuadros = [
    { items: itemsF, label: "Fortalezas", icon: "bi-shield-check-fill", color: "#059669", bg: "#ecfdf5", border: "#a7f3d0" },
    { items: itemsD, label: "Debilidades", icon: "bi-exclamation-triangle-fill", color: "#dc2626", bg: "#fef2f2", border: "#fca5a5" },
    { items: itemsO, label: "Oportunidades", icon: "bi-sun-fill", color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe" },
    { items: itemsA, label: "Amenazas", icon: "bi-cloud-lightning-fill", color: "#d97706", bg: "#fffbeb", border: "#fde68a" }
  ];

  var html = '<div class="dafo-factores-grid">';
  cuadros.forEach(function(c) {
    html += '<div class="dafo-factores-card" style="border-color:' + c.border + ';">';
    html += '<div class="dafo-factores-header" style="background:' + c.bg + ';border-bottom:1px solid ' + c.border + ';">';
    html += '<i class="bi ' + c.icon + '" style="color:' + c.color + ';"></i> ' + c.label;
    html += '<span class="dafo-factores-count" style="background:' + c.color + ';">' + c.items.length + '</span>';
    html += '</div><div class="dafo-factores-body">';
    if (c.items.length === 0) {
      html += '<div class="dafo-factores-empty">Sin items registrados</div>';
    } else {
      html += '<ul class="dafo-factores-list">';
      c.items.forEach(function(item) {
        var score = scores["" + item.id] !== undefined ? scores["" + item.id] : "—";
        var desc = item.descripcion || "";
        html += '<li><span class="dafo-item-score" style="background:' + c.color + ';">' + score + '</span> ' + (desc.length > 90 ? desc.substring(0, 90) + "..." : desc) + '</li>';
      });
      html += '</ul>';
    }
    html += '</div></div>';
  });
  html += '</div>';
  grid.innerHTML = html;
}

function renderDafoStepper() {
  var steps = document.querySelectorAll("#dafoStepper .stepper-step");
  var completos = [false, false, false, false, false];
  for (var s = 1; s <= 4; s++) {
    completos[s] = dafoStepIsComplete(s);
  }

  steps.forEach(function(stepEl) {
    var step = parseInt(stepEl.getAttribute("data-step"));
    stepEl.classList.remove("active", "completed", "locked");
    var unlocked = true;
    for (var prev = 1; prev < step; prev++) {
      if (!completos[prev]) { unlocked = false; break; }
    }
    if (step === currentStep) {
      stepEl.classList.add("active");
    } else if (completos[step]) {
      stepEl.classList.add("completed");
    } else if (!unlocked) {
      stepEl.classList.add("locked");
    }
  });

  var progressLine = document.getElementById("dafoStepperProgressLine");
  if (progressLine) {
    var completed = 0;
    for (var s = 1; s <= 4; s++) if (completos[s]) completed++;
    progressLine.style.width = Math.min((completed / 3) * 100, 100) + "%";
  }

  var labelEl = document.getElementById("dafoStepperCurrentLabel");
  if (labelEl) {
    labelEl.innerHTML = '<i class="bi bi-arrow-right-circle-fill"></i> Paso ' + currentStep + ' de 4: ' + pasos[currentStep - 1].label;
  }
}

function dafoStepIsComplete(step) {
  var items;
  if (step === 1) items = itemsF;
  else if (step === 2) items = itemsD;
  else if (step === 3) items = itemsO;
  else items = itemsA;
  if (items.length === 0) return false;
  for (var i = 0; i < items.length; i++) {
    var key = "" + items[i].id;
    if (scores[key] === undefined) return false;
  }
  return true;
}

function renderDafoStep() {
  var paso = pasos[currentStep - 1];
  var items = obtenerItems();
  var tipo = paso.id;

  var tituloEl = document.getElementById("dafoBloqueTitulo");
  if (tituloEl) tituloEl.innerHTML = paso.label.toUpperCase() + " — PUNTUACION (0-4)";

  var barFill = document.getElementById("dafoBarFill");
  var barLabel = document.getElementById("dafoBarLabel");
  var completedCount = 0;
  items.forEach(function(item) {
    if (scores["" + item.id] !== undefined) completedCount++;
  });
  var pct = items.length > 0 ? (completedCount / items.length) * 100 : 0;
  if (barFill) barFill.style.width = pct + "%";
  if (barLabel) barLabel.textContent = completedCount + "/" + items.length;

  var prevBtn = document.getElementById("dafoPrevBtn");
  if (prevBtn) prevBtn.disabled = (currentStep === 1);

  var nextBtn = document.getElementById("dafoNextBtn");
  if (nextBtn) {
    nextBtn.disabled = !dafoStepIsComplete(currentStep);
    if (currentStep === 4) {
      nextBtn.innerHTML = 'Mostrar resultados <i class="bi bi-bar-chart-fill"></i>';
    } else {
      nextBtn.innerHTML = 'Siguiente <i class="bi bi-arrow-right"></i>';
    }
  }

  var cancelBtn = document.getElementById("dafoCancelBtn");
  if (cancelBtn) cancelBtn.style.display = dafoModoActualizacion ? "" : "none";

  var infoEl = document.getElementById("dafoStepInfo");
  if (infoEl) {
    if (items.length === 0) {
      infoEl.textContent = "No hay items en esta categoria";
    } else if (completedCount < items.length) {
      infoEl.textContent = "Puntue todos los items para continuar (" + completedCount + "/" + items.length + ")";
    } else {
      infoEl.textContent = "Todos los items han sido puntuados";
    }
  }

  var countEl = document.getElementById("dafoItemsCount");
  if (countEl) countEl.textContent = items.length;

  var content = document.getElementById("dafoStepContent");
  if (!content) return;

  var html = '<div class="dafo-step-items">';
  if (items.length === 0) {
    html += '<div style="text-align:center;color:#94a3b8;padding:1.5rem;">No hay factores de ' + paso.label.toLowerCase() + ' registrados en este plan.</div>';
  } else {
    items.forEach(function(item, idx) {
      var key = "" + item.id;
      var currentScore = scores[key] !== undefined ? scores[key] : -1;
      html += '<div class="dafo-step-item" data-id="' + item.id + '">';
      html += '<div class="dafo-step-item-text">' + escapeHtml(item.descripcion) + '</div>';
      html += '<div class="dafo-likert-group">';
      escalaLikert.forEach(function(opt) {
        var selected = currentScore === opt.val ? ' selected' : '';
        html += '<button class="dafo-likert-btn' + selected + '" data-id="' + item.id + '" data-val="' + opt.val + '" title="' + opt.label + '">' + opt.val + '</button>';
      });
      html += '</div></div>';
    });
  }
  html += '</div>';

  html += '<div class="dafo-escala-leyenda" style="margin-top:0.75rem;padding-top:0.75rem;border-top:1px solid #f1f5f9;">';
  html += '<div style="display:flex;gap:0.5rem;flex-wrap:wrap;font-size:0.78rem;color:#64748b;">';
  escalaLikert.forEach(function(opt) {
    html += '<span><strong>' + opt.val + '</strong> = ' + opt.label + '</span>';
    if (opt.val < 4) html += '<span style="color:#d1d5db;">|</span>';
  });
  html += '</div></div>';

  content.innerHTML = html;
}

function navegarDafoAnterior() {
  if (currentStep > 1) {
    currentStep--;
    renderDafoStepper();
    renderDafoStep();
  }
}

function navegarDafoSiguiente() {
  if (!dafoStepIsComplete(currentStep)) {
    if (typeof showToast !== "undefined") showToast("Puntue todos los items del paso actual antes de continuar.", "error");
    return;
  }
  if (currentStep < 4) {
    currentStep++;
    renderDafoStepper();
    renderDafoStep();
  } else {
    mostrarResultadosDafo();
  }
}

function calcularPuntajes() {
  function avg(items) {
    if (items.length === 0) return 0;
    var sum = 0, count = 0;
    items.forEach(function(item) {
      var s = scores["" + item.id];
      if (s !== undefined) { sum += s; count++; }
    });
    return count > 0 ? sum / count : 0;
  }

  var avgF = avg(itemsF);
  var avgD = avg(itemsD);
  var avgO = avg(itemsO);
  var avgA = avg(itemsA);

  var totalPossible = 4;

  var fo = Math.round(((avgF + avgO) / (2 * totalPossible)) * 100);
  var af = Math.round(((avgA + avgF) / (2 * totalPossible)) * 100);
  var ad = Math.round(((avgA + avgD) / (2 * totalPossible)) * 100);
  var od = Math.round(((avgO + avgD) / (2 * totalPossible)) * 100);

  return { FO: fo, AF: af, AD: ad, OD: od };
}

function mostrarResultadosDafo() {
  document.getElementById("dafoWizardContainer").style.display = "none";
  document.getElementById("dafoResultsContainer").style.display = "block";

  document.getElementById("dafoResultFortalezas").textContent = itemsF.length;
  document.getElementById("dafoResultDebilidades").textContent = itemsD.length;
  document.getElementById("dafoResultOportunidades").textContent = itemsO.length;
  document.getElementById("dafoResultAmenazas").textContent = itemsA.length;

  var puntajes = calcularPuntajes();

  var relaciones = [
    { rel: "FO", tipo: "Estrategia Ofensiva", punt: puntajes.FO, desc: "Deberá adoptar estrategias de crecimiento" },
    { rel: "AF", tipo: "Estrategia Defensiva", punt: puntajes.AF, desc: "La empresa está preparada para enfrentarse a las amenazas" },
    { rel: "AD", tipo: "Estrategia de Supervivencia", punt: puntajes.AD, desc: "Se enfrenta a amenazas externas sin las fortalezas necesarias para luchar con la competencia" },
    { rel: "OD", tipo: "Estrategia de Reorientación", punt: puntajes.OD, desc: "La empresa no puede aprovechar las oportunidades porque carece de preparación adecuada" }
  ];

  var tablaHtml = '<div class="dafo-results-table-wrapper"><table class="dafo-results-table">';
  tablaHtml += '<thead><tr><th>Relaciones</th><th>Tipología de estrategia</th><th>Puntuación</th><th>Descripción</th></tr></thead><tbody>';
  relaciones.forEach(function(r) {
    var barColor = r.punt >= 70 ? '#059669' : (r.punt >= 40 ? '#d97706' : '#dc2626');
    tablaHtml += '<tr>';
    tablaHtml += '<td><strong>' + r.rel + '</strong></td>';
    tablaHtml += '<td>' + r.tipo + '</td>';
    tablaHtml += '<td><div class="dafo-score-cell"><div class="dafo-score-bar"><div class="dafo-score-fill" style="width:' + r.punt + '%;background:' + barColor + ';"></div></div><span class="dafo-score-value" style="color:' + barColor + ';">' + r.punt + '%</span></div></td>';
    tablaHtml += '<td style="font-size:0.82rem;color:#64748b;">' + r.desc + '</td>';
    tablaHtml += '</tr>';
  });
  tablaHtml += '</tbody></table></div>';
  document.getElementById("dafoResultsDetail").innerHTML = tablaHtml;

  var alertBanner = document.getElementById("dafoAlertBanner");
  var alertText = document.getElementById("dafoAlertText");
  if (alertBanner) { alertBanner.style.display = "flex"; alertBanner.style.justifyContent = "center"; }
  if (alertText) alertText.textContent = "Revise los resultados antes de guardar o cancelar la actualizacion.";
}

function guardarDafo() {
  if (typeof currentPlanId === "undefined" || !currentPlanId) {
    if (typeof showToast !== "undefined") showToast("Error: No hay un plan seleccionado.", "error");
    return;
  }

  var puntajes = calcularPuntajes();

  supabaseClient.from("plan_contenido").upsert({
      plan_id: currentPlanId,
      modulo_id: "M08",
      contenido: {
        scores: scores,
        puntajes: puntajes,
        total_fortalezas: itemsF.length,
        total_debilidades: itemsD.length,
        total_oportunidades: itemsO.length,
        total_amenazas: itemsA.length
      },
      completado: true,
      completado_fecha: new Date()
    }, { onConflict: "plan_id, modulo_id" })
  .then(function() {
    return supabaseClient.from("auditoria").insert({
      usuario_id: currentUser ? currentUser.id : null,
      modulo: "M08",
      accion: dafoCompletado ? "ACTUALIZAR" : "CREAR",
      detalle: "Matriz FODA " + (dafoCompletado ? "actualizada" : "creada") + ". FO:" + puntajes.FO + "% AF:" + puntajes.AF + "% AD:" + puntajes.AD + "% OD:" + puntajes.OD + "%"
    });
  }).then(function() {
    dafoCompletado = true;
    dafoModoActualizacion = false;
    if (typeof showToast !== "undefined") showToast("Los datos se guardaron correctamente.", "success");
    if (typeof cargarDashboard !== "undefined") cargarDashboard();
    cargarDafo();
  }).catch(function(e) {
    console.error("Error guardarDafo:", e);
    if (typeof showToast !== "undefined") showToast("Error al guardar: " + e.message, "error");
  });
}

function cancelarDafo() {
  dafoModoActualizacion = false;
  if (typeof showToast !== "undefined") showToast("Los datos por actualizar fueron cancelados.", "info");
  cargarDafo();
}

function iniciarActualizacion() {
  dafoModoActualizacion = true;
  currentStep = 1;
  renderDafoUI();
}

var setupDone = false;
function setupEvents() {
  if (setupDone) return;
  setupDone = true;

  document.getElementById("dafoActualizarBtn").onclick = function() {
    iniciarActualizacion();
  };

  document.getElementById("dafoPrevBtn").onclick = function() {
    navegarDafoAnterior();
  };

  document.getElementById("dafoNextBtn").onclick = function() {
    navegarDafoSiguiente();
  };

  document.getElementById("dafoCancelBtn").onclick = function() {
    document.getElementById("dafoCancelConfirmModal").style.display = "flex";
  };

  document.getElementById("dafoCancelConfirmBtn").onclick = function() {
    document.getElementById("dafoCancelConfirmModal").style.display = "none";
    cancelarDafo();
  };

  document.getElementById("dafoGuardarActualizacionBtn").onclick = function() {
    guardarDafo();
  };

  document.getElementById("dafoCancelarActualizacionBtn").onclick = function() {
    document.getElementById("dafoCancelConfirmModal").style.display = "flex";
  };

  document.getElementById("dafoWizardContainer").addEventListener("click", function(e) {
    var btn = e.target.closest(".dafo-likert-btn");
    if (btn) {
      var id = btn.getAttribute("data-id");
      var val = parseInt(btn.getAttribute("data-val"));
      scores["" + id] = val;
      renderDafoStepper();
      renderDafoStep();
      return;
    }
  });
}

function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/[&<>]/g, function(m) {
    if (m === "&") return "&amp;";
    if (m === "<") return "&lt;";
    if (m === ">") return "&gt;";
    return m;
  });
}

window.cargarDafo = cargarDafo;

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", function() { setTimeout(setupEvents, 200); });
} else {
  setTimeout(setupEvents, 200);
}

document.addEventListener("click", function(e) {
  var nav = e.target.closest(".nav-item");
  if (nav && nav.getAttribute("data-section") === "m08") {
    setTimeout(cargarDafo, 200);
  }
});

})();
