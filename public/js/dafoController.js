(function() {
"use strict";

var itemsF = [];
var itemsD = [];
var itemsO = [];
var itemsA = [];

var matrixScores = {};
var dafoCompletado = false;
var dafoModoActualizacion = false;
var dafoHayDatosGuardados = false;
var currentStep = 1;

var stepConfig = [
  { step:1, matrixId:'FO', title:'FORTALEZAS vs OPORTUNIDADES (FO)', desc:'Las fortalezas permiten aprovechar las oportunidades.', rows:function(){return itemsF;}, cols:function(){return itemsO;}, rowLabel:'Fortalezas', colLabel:'Oportunidades', rowPrefix:'F', colPrefix:'O', headerClass:'fortalezas-header', totalClass:'total-fo' },
  { step:2, matrixId:'FA', title:'FORTALEZAS vs AMENAZAS (FA)', desc:'Las fortalezas evaden o reducen el efecto negativo de las amenazas.', rows:function(){return itemsF;}, cols:function(){return itemsA;}, rowLabel:'Fortalezas', colLabel:'Amenazas', rowPrefix:'F', colPrefix:'A', headerClass:'fortalezas-header', totalClass:'total-fa' },
  { step:3, matrixId:'DO', title:'DEBILIDADES vs OPORTUNIDADES (DO)', desc:'Las debilidades pueden superarse aprovechando las oportunidades.', rows:function(){return itemsD;}, cols:function(){return itemsO;}, rowLabel:'Debilidades', colLabel:'Oportunidades', rowPrefix:'D', colPrefix:'O', headerClass:'debilidades-header', totalClass:'total-do' },
  { step:4, matrixId:'DA', title:'DEBILIDADES vs AMENAZAS (DA)', desc:'Las debilidades intensifican notablemente el efecto negativo de las amenazas.', rows:function(){return itemsD;}, cols:function(){return itemsA;}, rowLabel:'Debilidades', colLabel:'Amenazas', rowPrefix:'D', colPrefix:'A', headerClass:'debilidades-header', totalClass:'total-da' }
];

function getStepCfg(step) { return stepConfig[step - 1]; }

function getCellValue(mId, rId, cId) {
  if (!matrixScores[mId] || !matrixScores[mId][rId]) return '';
  var v = matrixScores[mId][rId][cId];
  return (v !== undefined && v !== null) ? v : '';
}

function setCellValue(mId, rId, cId, val) {
  if (!matrixScores[mId]) matrixScores[mId] = {};
  if (!matrixScores[mId][rId]) matrixScores[mId][rId] = {};
  matrixScores[mId][rId][cId] = val;
}

function calcColTotal(mId, cId) {
  var cfg = stepConfig.find(function(m){return m.matrixId===mId;});
  if (!cfg) return 0;
  var total = 0;
  cfg.rows().forEach(function(row){
    var v = getCellValue(mId, row.id, cId);
    if (v !== '' && !isNaN(v)) total += parseInt(v);
  });
  return total;
}

function calcMatrixAvg(mId) {
  var cfg = stepConfig.find(function(m){return m.matrixId===mId;});
  if (!cfg) return 0;
  var rows = cfg.rows(), cols = cfg.cols();
  var sum = 0, count = 0;
  rows.forEach(function(row){
    cols.forEach(function(col){
      var v = getCellValue(mId, row.id, col.id);
      if (v !== '' && !isNaN(v)) { sum += parseInt(v); count++; }
    });
  });
  return count > 0 ? (sum / count) / 4 * 100 : 0;
}

function calcSintesis() {
  return {
    FO: Math.round(calcMatrixAvg('FO')),
    FA: Math.round(calcMatrixAvg('FA')),
    DO: Math.round(calcMatrixAvg('DO')),
    DA: Math.round(calcMatrixAvg('DA'))
  };
}

function stepIsComplete(step) {
  var cfg = getStepCfg(step);
  if (!cfg) return false;
  var rows = cfg.rows(), cols = cfg.cols();
  if (rows.length === 0 || cols.length === 0) return false;
  var allFilled = true;
  rows.forEach(function(row){
    cols.forEach(function(col){
      var v = getCellValue(cfg.matrixId, row.id, col.id);
      if (v === '' || v === null || v === undefined) allFilled = false;
    });
  });
  return allFilled;
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>]/g, function(m){
    if (m==='&') return '&amp;';
    if (m==='<') return '&lt;';
    if (m==='>') return '&gt;';
    return m;
  });
}

function truncateText(text, maxLen) {
  if (!text) return '';
  return text.length > maxLen ? text.substring(0, maxLen) + '...' : text;
}

function hasMatrixData() {
  if (!matrixScores || typeof matrixScores !== 'object') return false;
  for (var mid in matrixScores) {
    if (!matrixScores.hasOwnProperty(mid)) continue;
    var rows = matrixScores[mid];
    if (typeof rows !== 'object') continue;
    for (var rid in rows) {
      if (!rows.hasOwnProperty(rid)) continue;
      var cols = rows[rid];
      if (typeof cols !== 'object') continue;
      for (var cid in cols) {
        if (cols.hasOwnProperty(cid) && cols[cid] !== null && cols[cid] !== undefined) return true;
      }
    }
  }
  return false;
}

function cargarDafo() {
  try {
    if (typeof currentPlanId === "undefined" || !currentPlanId) return;
    var pid = currentPlanId;

    var p1 = supabaseClient.from("foda").select("*").eq("plan_id", pid).order("id");
    var p2 = supabaseClient.from("cadena_valor_foda").select("*").eq("plan_id", pid).order("id");
    var p3 = supabaseClient.from("bcg_foda").select("*").eq("plan_id", pid).not("generado_auto", "eq", true).order("id");
    var p4 = supabaseClient.from("porter_oa").select("*").eq("plan_id", pid).order("id");
    var p5 = supabaseClient.from("pest_oa").select("*").eq("plan_id", pid).order("id");
    var p6 = supabaseClient.from("plan_contenido").select("contenido").eq("plan_id", pid).eq("modulo_id", "M08").maybeSingle();

    Promise.all([p1, p2, p3, p4, p5, p6]).then(function(results) {
      function valid(item) { return item && item.tipo && item.descripcion; }
      function descExists(arr, desc) { return arr.some(function(x){ return x.descripcion === desc; }); }

      itemsF = []; itemsD = []; itemsO = []; itemsA = [];

      (results[1].data || []).filter(valid).forEach(function(item) {
        if (item.tipo !== "fortaleza" && item.tipo !== "debilidad") return;
        if (descExists(itemsF, item.descripcion) || descExists(itemsD, item.descripcion)) return;
        (item.tipo === "fortaleza" ? itemsF : itemsD).push({ id: "cad_valor_" + item.id, tipo: item.tipo, descripcion: item.descripcion, origen: "cadena_valor_foda" });
      });

      (results[2].data || []).filter(valid).forEach(function(item) {
        if (item.tipo !== "fortaleza" && item.tipo !== "debilidad") return;
        if (descExists(itemsF, item.descripcion) || descExists(itemsD, item.descripcion)) return;
        (item.tipo === "fortaleza" ? itemsF : itemsD).push({ id: "bcg_foda_" + item.id, tipo: item.tipo, descripcion: item.descripcion, origen: "bcg_foda" });
      });

      (results[3].data || []).filter(valid).forEach(function(item) {
        if (item.tipo !== "oportunidad" && item.tipo !== "amenaza") return;
        if (descExists(itemsO, item.descripcion) || descExists(itemsA, item.descripcion)) return;
        (item.tipo === "oportunidad" ? itemsO : itemsA).push({ id: "porter_oa_" + item.id, tipo: item.tipo, descripcion: item.descripcion, origen: "porter_oa" });
      });

      (results[4].data || []).filter(valid).forEach(function(item) {
        if (item.tipo !== "oportunidad" && item.tipo !== "amenaza") return;
        if (descExists(itemsO, item.descripcion) || descExists(itemsA, item.descripcion)) return;
        (item.tipo === "oportunidad" ? itemsO : itemsA).push({ id: "pest_oa_" + item.id, tipo: item.tipo, descripcion: item.descripcion, origen: "pest_oa" });
      });

      dafoCompletado = itemsF.length > 0 || itemsD.length > 0 || itemsO.length > 0 || itemsA.length > 0;

      var pcRes = results[5].data;
      dafoHayDatosGuardados = false;
      matrixScores = {};

      if (pcRes && pcRes.contenido && pcRes.contenido.matrixScores) {
        var saved = pcRes.contenido;
        var factorCountMatch =
          saved.total_fortalezas === itemsF.length &&
          saved.total_debilidades === itemsD.length &&
          saved.total_oportunidades === itemsO.length &&
          saved.total_amenazas === itemsA.length;

        if (factorCountMatch) {
          matrixScores = JSON.parse(JSON.stringify(saved.matrixScores));
          dafoHayDatosGuardados = hasMatrixData();
        }
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
    if (alertText) alertText.textContent = "Este planeamiento se está actualizando, complete la evaluación de la matriz.";
    if (actualizarBtn) actualizarBtn.style.display = "none";
  } else if (dafoCompletado) {
    if (alertBanner) { alertBanner.style.display = "flex"; alertBanner.style.justifyContent = "space-between"; }
    if (alertText) alertText.textContent = "Este planeamiento ya cuenta con una Matriz FODA generada.";
    if (actualizarBtn) { actualizarBtn.style.display = ""; actualizarBtnText.textContent = "Actualizar FODA"; }
  } else {
    if (alertBanner) { alertBanner.style.display = "flex"; alertBanner.style.justifyContent = "center"; }
    if (alertText) alertText.textContent = "En este planeamiento no hay datos registrados, agrégalos desde los módulos previos.";
    if (actualizarBtn) { actualizarBtn.style.display = ""; actualizarBtnText.textContent = "Actualizar FODA"; }
  }

  var factoresSection = document.getElementById("dafoFactoresSection");
  if (factoresSection) {
    factoresSection.style.display = dafoModoActualizacion ? "none" : "block";
  }

  if (!dafoModoActualizacion) {
    renderFactoresGrid();
    renderSintesisResultados();
  }

  var wizard = document.getElementById("dafoWizardContainer");
  if (dafoModoActualizacion) {
    if (wizard) wizard.style.display = "block";
    renderStepper();
    renderStep();
  } else {
    if (wizard) wizard.style.display = "none";
  }
}

// ==================== VIEW MODE: FACTORES + SINTESIS ====================

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
        html += '<li>' + escapeHtml(truncateText(item.descripcion, 90)) + '</li>';
      });
      html += '</ul>';
    }
    html += '</div></div>';
  });
  html += '</div>';
  grid.innerHTML = html;
}

function renderSintesisResultados() {
  var container = document.getElementById("dafoResultadosGuardados");
  if (!container) return;

  if (!dafoHayDatosGuardados || !hasMatrixData()) {
    container.style.display = "none";
    container.innerHTML = "";
    return;
  }

  var s = calcSintesis();
  var relaciones = [
    { rel: "FO", label: "Fortalezas + Oportunidades", tipo: "Estrategia Ofensiva", punt: s.FO, desc: "Deber\u00e1 adoptar estrategias de crecimiento", color: "#059669" },
    { rel: "FA", label: "Fortalezas + Amenazas", tipo: "Estrategia Defensiva", punt: s.FA, desc: "La empresa est\u00e1 preparada para enfrentarse a las amenazas", color: "#2563eb" },
    { rel: "DO", label: "Debilidades + Oportunidades", tipo: "Estrategia de Reorientaci\u00f3n", punt: s.DO, desc: "La empresa no puede aprovechar las oportunidades porque carece de preparaci\u00f3n adecuada", color: "#d97706" },
    { rel: "DA", label: "Debilidades + Amenazas", tipo: "Estrategia de Supervivencia", punt: s.DA, desc: "Se enfrenta a amenazas externas sin las fortalezas necesarias para luchar con la competencia", color: "#dc2626" }
  ];

  var html = '<div class="dafo-sintesis-card">';
  html += '<h3 class="dafo-sintesis-title"><i class="bi bi-bar-chart-fill"></i> S\u00cdNTESIS DE RESULTADOS</h3>';
  html += '<div class="dafo-sintesis-table-wrapper"><table class="dafo-sintesis-table">';
  html += '<thead><tr><th>Relaciones</th><th>Tipolog\u00eda de estrategia</th><th>Puntuaci\u00f3n</th><th>Descripci\u00f3n</th></tr></thead><tbody>';
  relaciones.forEach(function(r) {
    var barColor = r.punt >= 70 ? '#059669' : (r.punt >= 40 ? '#d97706' : '#dc2626');
    html += '<tr>';
    html += '<td><strong>' + r.rel + '</strong><br><span style="font-size:0.72rem;color:#64748b;">' + r.label + '</span></td>';
    html += '<td>' + r.tipo + '</td>';
    html += '<td><div class="dafo-sintesis-score-cell"><div class="dafo-sintesis-bar"><div class="dafo-sintesis-fill" style="width:' + r.punt + '%;background:' + barColor + ';"></div></div><span class="dafo-sintesis-value" style="color:' + barColor + ';">' + r.punt + '%</span></div></td>';
    html += '<td style="font-size:0.82rem;color:#64748b;line-height:1.4;">' + r.desc + '</td>';
    html += '</tr>';
  });
  html += '</tbody></table></div>';
  html += '</div>';

  container.innerHTML = html;
  container.style.display = "block";
}

// ==================== WIZARD MODE: STEPPER + MATRIX STEPS ====================

function renderStepper() {
  var steps = document.querySelectorAll("#dafoStepper .stepper-step");
  var completos = [false, false, false, false, false];
  for (var s = 1; s <= 4; s++) {
    completos[s] = stepIsComplete(s);
  }

  var stepLabels = ['FO', 'FA', 'DO', 'DA'];
  steps.forEach(function(el) {
    var s = parseInt(el.getAttribute("data-step"));
    el.classList.remove("active", "completed", "locked");
    var unlocked = true;
    for (var p = 1; p < s; p++) {
      if (!completos[p]) { unlocked = false; break; }
    }
    el.querySelector(".stepper-circle").innerText = stepLabels[s - 1];
    if (s === currentStep) el.classList.add("active");
    else if (completos[s]) el.classList.add("completed");
    else if (!unlocked) el.classList.add("locked");
  });

  var line = document.getElementById("dafoStepperProgressLine");
  if (line) {
    var c = 0;
    for (var s2 = 1; s2 <= 4; s2++) if (completos[s2]) c++;
    line.style.width = Math.min((c / 3) * 100, 100) + "%";
  }

  var labelEl = document.getElementById("dafoStepperCurrentLabel");
  var cfg = getStepCfg(currentStep);
  if (labelEl && cfg) {
    labelEl.innerHTML = '<i class="bi bi-arrow-right-circle-fill"></i> Paso ' + cfg.step + ' de 4: ' + cfg.matrixId;
  }

  var stepperContainer = document.querySelector("#dafoWizardContainer > .wizard-stepper-container");
  if (stepperContainer) stepperContainer.style.display = "";
}

function renderStep() {
  var cfg = getStepCfg(currentStep);
  if (!cfg) return;

  var tituloEl = document.getElementById("dafoBloqueTitulo");
  if (tituloEl) tituloEl.textContent = cfg.title + ' — PUNTUACI\u00d3N (0-4)';

  var stepperContainer = document.querySelector("#dafoWizardContainer > .wizard-stepper-container");
  if (stepperContainer) stepperContainer.style.display = "";

  var content = document.getElementById("dafoStepContent");
  if (!content) return;

  setNextButtonLabel(currentStep);

  var rows = cfg.rows();
  var cols = cfg.cols();
  var mId = cfg.matrixId;

  if (rows.length === 0 || cols.length === 0) {
    content.innerHTML = '<div style="text-align:center;color:#94a3b8;padding:2.5rem;"><i class="bi bi-inbox" style="font-size:2rem;display:block;margin-bottom:0.75rem;"></i>No hay suficientes factores para esta matriz.</div>';
    updateNavButtons(false);
    return;
  }

  // Count filled cells
  var filledCount = 0, totalCells = rows.length * cols.length;
  rows.forEach(function(row) {
    cols.forEach(function(col) {
      var v = getCellValue(mId, row.id, col.id);
      if (v !== '' && v !== null && v !== undefined) filledCount++;
    });
  });

  // Build matrix table
  var html = '<div class="dafo-matrix-card" style="box-shadow:none;border:none;">';
  html += '<div class="dafo-matrix-header ' + cfg.headerClass + '" style="border-radius:0.75rem 0.75rem 0 0;">';
  html += '<div class="dafo-matrix-title">' + cfg.title + '</div>';
  html += '<div class="dafo-matrix-desc">' + cfg.desc + '</div>';
  html += '</div><div class="dafo-matrix-table-wrapper">';
  html += '<table class="dafo-matrix-table">';
  html += '<thead><tr><th class="dafo-matrix-row-header">' + cfg.rowLabel + ' / ' + cfg.colLabel + '</th>';
  cols.forEach(function(col, ci) {
    html += '<th class="dafo-matrix-col-header" title="' + escapeHtml(col.descripcion) + '">' + cfg.colPrefix + (ci+1) + '<br><span class="dafo-matrix-col-desc">' + escapeHtml(truncateText(col.descripcion, 35)) + '</span></th>';
  });
  html += '<th class="dafo-matrix-total-header ' + cfg.totalClass + '">Total</th>';
  html += '</tr></thead><tbody>';

  rows.forEach(function(row, ri) {
    var rowTotal = 0;
    html += '<tr><td class="dafo-matrix-row-label" title="' + escapeHtml(row.descripcion) + '"><strong>' + cfg.rowPrefix + (ri+1) + '</strong><br><span class="dafo-matrix-row-desc">' + escapeHtml(truncateText(row.descripcion, 35)) + '</span></td>';
    cols.forEach(function(col, ci) {
      var val = getCellValue(mId, row.id, col.id);
      var numVal = (val !== '' && !isNaN(val)) ? parseInt(val) : 0;
      rowTotal += numVal;
      html += '<td class="dafo-matrix-cell">';
      html += '<input type="number" class="dafo-matrix-input" min="0" max="4" step="1" ';
      html += 'data-matrix="' + mId + '" data-row-id="' + row.id + '" data-col-id="' + col.id + '" ';
      html += 'value="' + (val !== '' ? val : '') + '" placeholder="0">';
      html += '</td>';
    });
    html += '<td class="dafo-matrix-total-cell ' + cfg.totalClass + '">' + rowTotal + '</td></tr>';
  });

  // Total row
  html += '<tr class="dafo-matrix-total-row"><td class="dafo-matrix-row-label"><strong>Total</strong></td>';
  cols.forEach(function(col, ci) {
    html += '<td class="dafo-matrix-total-cell ' + cfg.totalClass + '">' + calcColTotal(mId, col.id) + '</td>';
  });
  var grandTotal = 0;
  rows.forEach(function(row) {
    cols.forEach(function(col) {
      var v = getCellValue(mId, row.id, col.id);
      if (v !== '' && !isNaN(v)) grandTotal += parseInt(v);
    });
  });
  html += '<td class="dafo-matrix-grand-total ' + cfg.totalClass + '">' + grandTotal + '</td></tr>';
  html += '</tbody></table></div></div>';

  // Legend
  html += '<div class="dafo-escala-leyenda" style="margin-top:0.75rem;padding-top:0.75rem;border-top:1px solid #f1f5f9;">';
  html += '<div style="display:flex;gap:0.5rem;flex-wrap:wrap;font-size:0.78rem;color:#64748b;">';
  var escalaItems = [
    { val:0, label:'En total desacuerdo' },
    { val:1, label:'No est\u00e1 de acuerdo' },
    { val:2, label:'Est\u00e1 de acuerdo' },
    { val:3, label:'Bastante de acuerdo' },
    { val:4, label:'En total acuerdo' }
  ];
  escalaItems.forEach(function(opt, idx) {
    html += '<span><strong>' + opt.val + '</strong> = ' + opt.label + '</span>';
    if (idx < escalaItems.length - 1) html += '<span style="color:#d1d5db;">|</span>';
  });
  html += '</div></div>';

  content.innerHTML = html;

  var countEl = document.getElementById("dafoItemsCount");
  if (countEl) countEl.textContent = filledCount + '/' + totalCells + ' celdas';

  var infoEl = document.getElementById("dafoStepInfo");
  if (infoEl) {
    if (filledCount === totalCells) infoEl.textContent = "Todos los valores han sido asignados";
    else infoEl.textContent = "Asigne un valor (0-4) a cada celda de la matriz";
  }

  updateNavButtons(filledCount === totalCells);
  setupMatrixInputListeners();
}

function setNextButtonLabel(step) {
  var nextBtn = document.getElementById("dafoNextBtn");
  if (!nextBtn) return;
  if (step === 4) {
    nextBtn.innerHTML = 'Finalizar <i class="bi bi-check-lg"></i>';
    nextBtn.classList.remove("btn-primary");
    nextBtn.classList.add("btn-primary-solid");
  } else {
    nextBtn.innerHTML = 'Siguiente <i class="bi bi-arrow-right"></i>';
    nextBtn.classList.remove("btn-primary-solid");
    nextBtn.classList.add("btn-primary");
  }
}

function updateNavButtons(allFilled) {
  var prevBtn = document.getElementById("dafoPrevBtn");
  var nextBtn = document.getElementById("dafoNextBtn");
  var cancelBtn = document.getElementById("dafoCancelBtn");

  if (prevBtn) prevBtn.disabled = (currentStep === 1);
  if (cancelBtn) cancelBtn.style.display = dafoModoActualizacion ? "" : "none";
  if (nextBtn) {
    nextBtn.disabled = !allFilled;
    setNextButtonLabel(currentStep);
  }
}

function setupMatrixInputListeners() {
  document.querySelectorAll('.dafo-matrix-input').forEach(function(input) {
    input._listener = function() {
      var val = this.value;
      if (val !== '') {
        var num = parseInt(val);
        if (isNaN(num) || num < 0) this.value = 0;
        else if (num > 4) this.value = 4;
        else this.value = num;
      }
      var mId = this.getAttribute('data-matrix');
      var rId = this.getAttribute('data-row-id');
      var cId = this.getAttribute('data-col-id');
      setCellValue(mId, rId, cId, this.value !== '' ? parseInt(this.value) : null);
      updateStepTotals();
      updateNavButtons(stepIsComplete(currentStep));
    };
    input.addEventListener('input', input._listener);
    input.addEventListener('blur', function() {
      if (this.value === '') this.value = '';
    });
  });
}

function updateStepTotals() {
  var cfg = getStepCfg(currentStep);
  if (!cfg) return;
  var mId = cfg.matrixId;
  var rows = cfg.rows(), cols = cfg.cols();
  var table = document.querySelector('#dafoStepContent .dafo-matrix-table');
  if (!table) return;
  var tbody = table.querySelector('tbody');
  if (!tbody) return;
  var rowEls = tbody.querySelectorAll('tr:not(.dafo-matrix-total-row)');
  var filledCount = 0, totalCells = rows.length * cols.length;

  rowEls.forEach(function(rowEl, ri) {
    if (ri >= rows.length) return;
    var cellEls = rowEl.querySelectorAll('.dafo-matrix-cell');
    var rowTotal = 0;
    cellEls.forEach(function(cellEl, ci) {
      if (ci >= cols.length) return;
      var inp = cellEl.querySelector('.dafo-matrix-input');
      if (inp) {
        var v = inp.value;
        if (v !== '' && !isNaN(v)) { rowTotal += parseInt(v); filledCount++; }
      }
    });
    var totalCell = rowEl.querySelector('.dafo-matrix-total-cell');
    if (totalCell) totalCell.textContent = rowTotal;
  });

  var totalRow = tbody.querySelector('.dafo-matrix-total-row');
  if (totalRow) {
    var colTotalCells = totalRow.querySelectorAll('.dafo-matrix-total-cell');
    cols.forEach(function(col, ci) {
      if (ci >= colTotalCells.length - 1) return;
      var ct = 0;
      rowEls.forEach(function(rowEl, ri) {
        if (ri >= rows.length) return;
        var cellEls = rowEl.querySelectorAll('.dafo-matrix-cell');
        if (ci >= cellEls.length) return;
        var inp = cellEls[ci] ? cellEls[ci].querySelector('.dafo-matrix-input') : null;
        if (inp) {
          var v = inp.value;
          if (v !== '' && !isNaN(v)) ct += parseInt(v);
        }
      });
      colTotalCells[ci].textContent = ct;
    });

    var grandCell = totalRow.querySelector('.dafo-matrix-grand-total');
    if (grandCell) {
      var gt = 0;
      rowEls.forEach(function(rowEl) {
        rowEl.querySelectorAll('.dafo-matrix-cell').forEach(function(cellEl) {
          var inp = cellEl.querySelector('.dafo-matrix-input');
          if (inp) {
            var v = inp.value;
            if (v !== '' && !isNaN(v)) gt += parseInt(v);
          }
        });
      });
      grandCell.textContent = gt;
    }
  }

  var countEl = document.getElementById("dafoItemsCount");
  if (countEl) countEl.textContent = filledCount + '/' + totalCells + ' celdas';
}

// ==================== NAVEGACION ====================

function navegarAnterior() {
  if (currentStep > 1) {
    currentStep--;
    renderStepper();
    renderStep();
  }
}

function navegarSiguiente() {
  if (!stepIsComplete(currentStep)) {
    if (typeof showToast !== "undefined") showToast("Complete todos los valores de la matriz antes de continuar.", "error");
    return;
  }
  if (currentStep < 4) {
    currentStep++;
    renderStepper();
    renderStep();
  } else {
    mostrarSintesisResultados();
  }
}

function mostrarSintesisResultados() {
  var wizard = document.getElementById("dafoWizardContainer");
  var factoresSection = document.getElementById("dafoFactoresSection");
  var resultadosGuardados = document.getElementById("dafoResultadosGuardados");

  if (wizard) wizard.style.display = "none";
  if (factoresSection) {
    factoresSection.style.display = "block";
    factoresSection.classList.add("dafo-factores-section-results");
  }

  renderFactoresGrid();

  var s = calcSintesis();
  var relaciones = [
    { rel: "FO", label: "Fortalezas + Oportunidades", tipo: "Estrategia Ofensiva", punt: s.FO, desc: "Deber\u00e1 adoptar estrategias de crecimiento", color: "#059669" },
    { rel: "FA", label: "Fortalezas + Amenazas", tipo: "Estrategia Defensiva", punt: s.FA, desc: "La empresa est\u00e1 preparada para enfrentarse a las amenazas", color: "#2563eb" },
    { rel: "DO", label: "Debilidades + Oportunidades", tipo: "Estrategia de Reorientaci\u00f3n", punt: s.DO, desc: "La empresa no puede aprovechar las oportunidades porque carece de preparaci\u00f3n adecuada", color: "#d97706" },
    { rel: "DA", label: "Debilidades + Amenazas", tipo: "Estrategia de Supervivencia", punt: s.DA, desc: "Se enfrenta a amenazas externas sin las fortalezas necesarias para luchar con la competencia", color: "#dc2626" }
  ];

  var html = '<div class="dafo-sintesis-card">';
  html += '<h3 class="dafo-sintesis-title"><i class="bi bi-bar-chart-fill"></i> S\u00cdNTESIS DE RESULTADOS</h3>';
  html += '<div class="dafo-sintesis-table-wrapper"><table class="dafo-sintesis-table">';
  html += '<thead><tr><th>Relaciones</th><th>Tipolog\u00eda de estrategia</th><th>Puntuaci\u00f3n</th><th>Descripci\u00f3n</th></tr></thead><tbody>';
  relaciones.forEach(function(r) {
    var barColor = r.punt >= 70 ? '#059669' : (r.punt >= 40 ? '#d97706' : '#dc2626');
    html += '<tr>';
    html += '<td><strong>' + r.rel + '</strong><br><span style="font-size:0.72rem;color:#64748b;">' + r.label + '</span></td>';
    html += '<td>' + r.tipo + '</td>';
    html += '<td><div class="dafo-sintesis-score-cell"><div class="dafo-sintesis-bar"><div class="dafo-sintesis-fill" style="width:' + r.punt + '%;background:' + barColor + ';"></div></div><span class="dafo-sintesis-value" style="color:' + barColor + ';">' + r.punt + '%</span></div></td>';
    html += '<td style="font-size:0.82rem;color:#64748b;line-height:1.4;">' + r.desc + '</td>';
    html += '</tr>';
  });
  html += '</tbody></table></div>';
  html += '<div id="dafoSaveSection" style="display:flex;justify-content:center;gap:1rem;margin-top:1.5rem;padding-top:1.5rem;border-top:2px solid #e2e8f0;">';
  html += '<button id="dafoGuardarActualizacionBtn" class="btn-primary" style="background:#2563eb;color:white;padding:0.7rem 2rem;font-weight:700;font-size:0.95rem;"><i class="bi bi-check-lg"></i> Guardar actualizaci\u00f3n</button>';
  html += '<button id="dafoCancelarActualizacionBtn" class="btn-secondary" style="padding:0.7rem 2rem;font-weight:600;font-size:0.95rem;"><i class="bi bi-x-lg"></i> Cancelar actualizaci\u00f3n</button>';
  html += '</div>';
  html += '</div>';

  if (resultadosGuardados) {
    resultadosGuardados.innerHTML = html;
    resultadosGuardados.style.display = "block";
  }

  var guardarBtn = document.getElementById("dafoGuardarActualizacionBtn");
  var cancelarBtn = document.getElementById("dafoCancelarActualizacionBtn");
  if (guardarBtn) guardarBtn.onclick = function() { guardarDafo(); };
  if (cancelarBtn) cancelarBtn.onclick = function() { document.getElementById("dafoCancelConfirmModal").style.display = "flex"; };

  var alertBanner = document.getElementById("dafoAlertBanner");
  var alertText = document.getElementById("dafoAlertText");
  if (alertBanner) { alertBanner.style.display = "flex"; alertBanner.style.justifyContent = "center"; }
  if (alertText) alertText.textContent = "Revise los resultados de la Matriz FODA antes de guardar o cancelar la actualizaci\u00f3n.";
}

// ==================== GUARDAR / CANCELAR ====================

function guardarDafo() {
  if (typeof currentPlanId === "undefined" || !currentPlanId) {
    if (typeof showToast !== "undefined") showToast("Error: No hay un plan seleccionado.", "error");
    return;
  }

  var s = calcSintesis();
  var contenido = {
    matrixScores: matrixScores,
    sintesis: s,
    total_fortalezas: itemsF.length,
    total_debilidades: itemsD.length,
    total_oportunidades: itemsO.length,
    total_amenazas: itemsA.length
  };

  supabaseClient.from("plan_contenido").upsert({
      plan_id: currentPlanId,
      modulo_id: "M08",
      contenido: contenido,
      completado: true,
      completado_fecha: new Date()
    }, { onConflict: "plan_id, modulo_id" })
  .then(function() {
    return supabaseClient.from("auditoria").insert({
      usuario_id: currentUser ? currentUser.id : null,
      modulo: "M08",
      accion: dafoCompletado ? "ACTUALIZAR" : "CREAR",
      detalle: "Matriz FODA " + (dafoCompletado ? "actualizada" : "creada") + ". FO:" + s.FO + "% FA:" + s.FA + "% DO:" + s.DO + "% DA:" + s.DA + "%"
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
  currentStep = 1;
  if (typeof showToast !== "undefined") showToast("Los datos por actualizar fueron cancelados.", "info");
  cargarDafo();
}

function iniciarActualizacion() {
  dafoModoActualizacion = true;
  currentStep = 1;
  matrixScores = {};
  renderDafoUI();
}

// ==================== EVENTOS ====================

var setupDone = false;
function setupEvents() {
  if (setupDone) return;
  setupDone = true;

  var actualizarBtn = document.getElementById("dafoActualizarBtn");
  if (actualizarBtn) actualizarBtn.onclick = function() { iniciarActualizacion(); };

  var prevBtn = document.getElementById("dafoPrevBtn");
  if (prevBtn) prevBtn.onclick = navegarAnterior;

  var nextBtn = document.getElementById("dafoNextBtn");
  if (nextBtn) nextBtn.onclick = navegarSiguiente;

  var cancelBtn = document.getElementById("dafoCancelBtn");
  if (cancelBtn) cancelBtn.onclick = function() { document.getElementById("dafoCancelConfirmModal").style.display = "flex"; };

  var cancelConfirmBtn = document.getElementById("dafoCancelConfirmBtn");
  if (cancelConfirmBtn) cancelConfirmBtn.onclick = function() {
    document.getElementById("dafoCancelConfirmModal").style.display = "none";
    cancelarDafo();
  };
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
