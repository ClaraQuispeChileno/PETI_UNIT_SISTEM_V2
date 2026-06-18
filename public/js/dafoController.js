(function() {
"use strict";

var itemsF = [];
var itemsD = [];
var itemsO = [];
var itemsA = [];

var matrixScores = {};
var dafoCompletado = false;
var dafoModoActualizacion = false;
var dafoMatrixGuardados = null;

var matrixConfig = [
  { id:'FO', label:'FO - Fortalezas vs Oportunidades', desc:'Las fortalezas permiten aprovechar las oportunidades.', rows:function(){return itemsF;}, cols:function(){return itemsO;}, rowLabel:'Fortalezas', colLabel:'Oportunidades', rowKey:'fortaleza', colKey:'oportunidad',
    rowPrefix:'F', colPrefix:'O', headerClass:'fortalezas-header', totalClass:'total-fo' },
  { id:'FA', label:'FA - Fortalezas vs Amenazas', desc:'Las fortalezas evaden o reducen el efecto negativo de las amenazas.', rows:function(){return itemsF;}, cols:function(){return itemsA;}, rowLabel:'Fortalezas', colLabel:'Amenazas', rowKey:'fortaleza', colKey:'amenaza',
    rowPrefix:'F', colPrefix:'A', headerClass:'fortalezas-header', totalClass:'total-fa' },
  { id:'DO', label:'DO - Debilidades vs Oportunidades', desc:'Las debilidades pueden superarse aprovechando las oportunidades.', rows:function(){return itemsD;}, cols:function(){return itemsO;}, rowLabel:'Debilidades', colLabel:'Oportunidades', rowKey:'debilidad', colKey:'oportunidad',
    rowPrefix:'D', colPrefix:'O', headerClass:'debilidades-header', totalClass:'total-do' },
  { id:'DA', label:'DA - Debilidades vs Amenazas', desc:'Las debilidades intensifican notablemente el efecto negativo de las amenazas.', rows:function(){return itemsD;}, cols:function(){return itemsA;}, rowLabel:'Debilidades', colLabel:'Amenazas', rowKey:'debilidad', colKey:'amenaza',
    rowPrefix:'D', colPrefix:'A', headerClass:'debilidades-header', totalClass:'total-da' }
];

function getMatrixKey(matrixId, rowId, colId) {
  return matrixId + '_' + rowId + '_' + colId;
}

function getCellValue(matrixId, rowId, colId) {
  if (!matrixScores[matrixId]) return '';
  if (!matrixScores[matrixId][rowId]) return '';
  var v = matrixScores[matrixId][rowId][colId];
  return (v !== undefined && v !== null) ? v : '';
}

function setCellValue(matrixId, rowId, colId, val) {
  if (!matrixScores[matrixId]) matrixScores[matrixId] = {};
  if (!matrixScores[matrixId][rowId]) matrixScores[matrixId][rowId] = {};
  matrixScores[matrixId][rowId][colId] = val;
}

function calcColTotal(matrixId, colId) {
  var cfg = matrixConfig.find(function(m) { return m.id === matrixId; });
  if (!cfg) return 0;
  var rows = cfg.rows();
  var total = 0;
  rows.forEach(function(row) {
    var v = getCellValue(matrixId, row.id, colId);
    if (v !== '' && !isNaN(v)) total += parseInt(v);
  });
  return total;
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>]/g, function(m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  });
}

function truncateText(text, maxLen) {
  if (!text) return '';
  return text.length > maxLen ? text.substring(0, maxLen) + '...' : text;
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
      if (pcRes && pcRes.contenido && pcRes.contenido.matrixScores) {
        matrixScores = pcRes.contenido.matrixScores || {};
        dafoMatrixGuardados = pcRes.contenido.matrixScores || null;
      } else if (pcRes && pcRes.contenido && pcRes.contenido.scores) {
        var oldScores = pcRes.contenido.scores || {};
        matrixScores = {};
        dafoMatrixGuardados = null;
      } else {
        matrixScores = {};
        dafoMatrixGuardados = null;
      }

      dafoModoActualizacion = false;
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
    renderMatrixResults();
  }

  var wizard = document.getElementById("dafoWizardContainer");
  if (dafoModoActualizacion) {
    if (wizard) wizard.style.display = "block";
    renderMatrices();
  } else {
    if (wizard) wizard.style.display = "none";
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
        html += '<li>' + escapeHtml(truncateText(item.descripcion, 90)) + '</li>';
      });
      html += '</ul>';
    }
    html += '</div></div>';
  });
  html += '</div>';
  grid.innerHTML = html;
}

function renderMatrixResults() {
  var container = document.getElementById("dafoResultadosGuardados");
  var section = document.getElementById("dafoFactoresSection");
  if (!container) return;

  if (!dafoMatrixGuardados) {
    container.style.display = "none";
    container.innerHTML = "";
    if (section) section.classList.remove("dafo-factores-section-results");
    return;
  }

  var html = '<div class="dafo-matrix-section">';
  html += '<h3 class="dafo-matrix-section-title"><i class="bi bi-table"></i> Matriz FODA - Resultados Guardados</h3>';
  html += '<div class="dafo-matrices-grid">';

  matrixConfig.forEach(function(cfg) {
    html += renderMatrixTable(cfg, true);
  });

  html += '</div></div>';

  container.innerHTML = html;
  container.style.display = "block";
  if (section) section.classList.add("dafo-factores-section-results");
}

function renderMatrixTable(cfg, readOnly) {
  var rows = cfg.rows();
  var cols = cfg.cols();

  if (rows.length === 0 || cols.length === 0) {
    return '<div class="dafo-matrix-empty">No hay suficientes factores para la matriz ' + cfg.id + '.</div>';
  }

  var html = '<div class="dafo-matrix-card">';
  html += '<div class="dafo-matrix-header ' + cfg.headerClass + '">';
  html += '<div class="dafo-matrix-title">' + cfg.label + '</div>';
  html += '<div class="dafo-matrix-desc">' + cfg.desc + '</div>';
  html += '</div>';

  html += '<div class="dafo-matrix-table-wrapper">';
  html += '<table class="dafo-matrix-table">';
  html += '<thead><tr><th class="dafo-matrix-row-header">' + cfg.rowLabel + ' / ' + cfg.colLabel + '</th>';

  cols.forEach(function(col, ci) {
    var colLabel = cfg.colPrefix + (ci + 1);
    html += '<th class="dafo-matrix-col-header" title="' + escapeHtml(col.descripcion) + '">' + colLabel + '<br><span class="dafo-matrix-col-desc">' + escapeHtml(truncateText(col.descripcion, 40)) + '</span></th>';
  });

  html += '<th class="dafo-matrix-total-header ' + cfg.totalClass + '">Total</th>';
  html += '</tr></thead><tbody>';

  rows.forEach(function(row, ri) {
    var rowLabel = cfg.rowPrefix + (ri + 1);
    html += '<tr>';
    html += '<td class="dafo-matrix-row-label" title="' + escapeHtml(row.descripcion) + '"><strong>' + rowLabel + '</strong><br><span class="dafo-matrix-row-desc">' + escapeHtml(truncateText(row.descripcion, 40)) + '</span></td>';

    var rowTotal = 0;
    cols.forEach(function(col, ci) {
      var key = getMatrixKey(cfg.id, row.id, col.id);
      var val = getCellValue(cfg.id, row.id, col.id);
      var numVal = (val !== '' && !isNaN(val)) ? parseInt(val) : 0;
      rowTotal += numVal;

      if (readOnly) {
        html += '<td class="dafo-matrix-cell dafo-matrix-cell-readonly">' + (val !== '' ? val : '-') + '</td>';
      } else {
        html += '<td class="dafo-matrix-cell">';
        html += '<input type="number" class="dafo-matrix-input" min="0" max="4" step="1" ';
        html += 'data-matrix="' + cfg.id + '" data-row-id="' + row.id + '" data-col-id="' + col.id + '" ';
        html += 'value="' + (val !== '' ? val : '') + '" placeholder="0">';
        html += '</td>';
      }
    });

    html += '<td class="dafo-matrix-total-cell ' + cfg.totalClass + '">' + rowTotal + '</td>';
    html += '</tr>';
  });

  html += '<tr class="dafo-matrix-total-row">';
  html += '<td class="dafo-matrix-row-label"><strong>Total</strong></td>';

  cols.forEach(function(col, ci) {
    var colTotal = calcColTotal(cfg.id, col.id);
    html += '<td class="dafo-matrix-total-cell ' + cfg.totalClass + '">' + colTotal + '</td>';
  });

  var grandTotal = 0;
  rows.forEach(function(row) {
    cols.forEach(function(col) {
      var val = getCellValue(cfg.id, row.id, col.id);
      if (val !== '' && !isNaN(val)) grandTotal += parseInt(val);
    });
  });
  html += '<td class="dafo-matrix-grand-total ' + cfg.totalClass + '">' + grandTotal + '</td>';
  html += '</tr>';

  html += '</tbody></table>';
  html += '</div></div>';

  return html;
}

function renderMatrices() {
  var content = document.getElementById("dafoStepContent");
  if (!content) return;

  var tituloEl = document.getElementById("dafoBloqueTitulo");
  if (tituloEl) tituloEl.textContent = "MATRIZ FODA — EVALUACIÓN CRUZADA (0-4)";

  var stepperContainer = document.querySelector("#dafoWizardContainer > .wizard-stepper-container");
  if (stepperContainer) stepperContainer.style.display = "none";

  if (itemsF.length === 0 || itemsD.length === 0 || itemsO.length === 0 || itemsA.length === 0) {
    content.innerHTML = '<div style="text-align:center;color:#94a3b8;padding:2.5rem;"><i class="bi bi-inbox" style="font-size:2rem;display:block;margin-bottom:0.75rem;"></i>Se requieren factores de los 4 tipos (Fortalezas, Debilidades, Oportunidades, Amenazas) para generar la Matriz FODA.<br>Complete los módulos de análisis previos (Cadena de Valor, BCG, Porter, PEST) para registrar los factores necesarios.</div>';
    var nextBtn = document.getElementById("dafoNextBtn");
    if (nextBtn) nextBtn.disabled = true;
    return;
  }

  var html = '<div class="dafo-matrices-section">';
  html += '<div class="dafo-matrices-grid">';

  matrixConfig.forEach(function(cfg) {
    html += renderMatrixTable(cfg, false);
  });

  html += '</div></div>';

  html += '<div class="dafo-escala-leyenda" style="margin-top:1rem;padding-top:0.75rem;border-top:1px solid #f1f5f9;">';
  html += '<div style="display:flex;gap:0.5rem;flex-wrap:wrap;font-size:0.78rem;color:#64748b;">';
  var escalaItems = [
    { val: 0, label: 'En total desacuerdo' },
    { val: 1, label: 'No está de acuerdo' },
    { val: 2, label: 'Está de acuerdo' },
    { val: 3, label: 'Bastante de acuerdo' },
    { val: 4, label: 'En total acuerdo' }
  ];
  escalaItems.forEach(function(opt, idx) {
    html += '<span><strong>' + opt.val + '</strong> = ' + opt.label + '</span>';
    if (idx < escalaItems.length - 1) html += '<span style="color:#d1d5db;">|</span>';
  });
  html += '</div></div>';

  content.innerHTML = html;

  var prevBtn = document.getElementById("dafoPrevBtn");
  var nextBtn = document.getElementById("dafoNextBtn");
  var cancelBtn = document.getElementById("dafoCancelBtn");

  if (prevBtn) prevBtn.disabled = true;
  if (nextBtn) {
    nextBtn.disabled = false;
    nextBtn.innerHTML = 'Mostrar resultados <i class="bi bi-bar-chart-fill"></i>';
  }
  if (cancelBtn) cancelBtn.style.display = dafoModoActualizacion ? "" : "none";

  var infoEl = document.getElementById("dafoStepInfo");
  if (infoEl) infoEl.textContent = "Asigne una puntuación (0-4) a cada relación de la matriz";

  var countEl = document.getElementById("dafoItemsCount");
  if (countEl) countEl.textContent = (itemsF.length + itemsD.length + itemsO.length + itemsA.length) + " factores";

  updateMatrixTotals();
  setupMatrixInputListeners();
}

function updateMatrixTotals() {
  matrixConfig.forEach(function(cfg) {
    var rows = cfg.rows();
    var cols = cfg.cols();
    var table = document.querySelector('.dafo-matrix-card:has(.dafo-matrix-header.' + cfg.headerClass + ') table.dafo-matrix-table');
    if (!table) return;

    var tbody = table.querySelector('tbody');
    if (!tbody) return;

    var rowEls = tbody.querySelectorAll('tr:not(.dafo-matrix-total-row)');
    rowEls.forEach(function(rowEl, ri) {
      if (ri >= rows.length) return;
      var row = rows[ri];
      if (!row) return;
      var cellEls = rowEl.querySelectorAll('.dafo-matrix-cell');
      var rowTotal = 0;
      cellEls.forEach(function(cellEl, ci) {
        if (ci >= cols.length) return;
        var input = cellEl.querySelector('.dafo-matrix-input');
        if (input) {
          var v = input.value;
          if (v !== '' && !isNaN(v)) rowTotal += parseInt(v);
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
        var colTotal = 0;
        rowEls.forEach(function(rowEl, ri) {
          if (ri >= rows.length) return;
          var cellEls = rowEl.querySelectorAll('.dafo-matrix-cell');
          if (ci >= cellEls.length) return;
          var input = cellEls[ci] ? cellEls[ci].querySelector('.dafo-matrix-input') : null;
          if (input) {
            var v = input.value;
            if (v !== '' && !isNaN(v)) colTotal += parseInt(v);
          }
        });
        colTotalCells[ci].textContent = colTotal;
      });

      var grandTotalCell = totalRow.querySelector('.dafo-matrix-grand-total');
      if (grandTotalCell) {
        var grandTotal = 0;
        rowEls.forEach(function(rowEl) {
          var cellEls = rowEl.querySelectorAll('.dafo-matrix-cell');
          cellEls.forEach(function(cellEl) {
            var input = cellEl.querySelector('.dafo-matrix-input');
            if (input) {
              var v = input.value;
              if (v !== '' && !isNaN(v)) grandTotal += parseInt(v);
            }
          });
        });
        grandTotalCell.textContent = grandTotal;
      }
    }
  });
}

function setupMatrixInputListeners() {
  var inputs = document.querySelectorAll('.dafo-matrix-input');
  inputs.forEach(function(input) {
    input.addEventListener('input', function() {
      var val = this.value;
      if (val !== '') {
        var num = parseInt(val);
        if (isNaN(num) || num < 0) this.value = 0;
        else if (num > 4) this.value = 4;
        else this.value = num;
      }
      var matrixId = this.getAttribute('data-matrix');
      var rowId = this.getAttribute('data-row-id');
      var colId = this.getAttribute('data-col-id');
      var newVal = this.value !== '' ? parseInt(this.value) : null;
      setCellValue(matrixId, rowId, colId, newVal);
      updateMatrixTotals();
    });

    input.addEventListener('blur', function() {
      if (this.value === '') this.value = '';
    });

    input.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        this.blur();
        var nextInput = this.closest('td').nextElementSibling;
        if (nextInput) {
          var nextInp = nextInput.querySelector('.dafo-matrix-input');
          if (nextInp) nextInp.focus();
        }
      }
    });
  });
}

function mostrarResultadosMatriz() {
  var factoresSection = document.getElementById("dafoFactoresSection");
  var wizard = document.getElementById("dafoWizardContainer");
  var resultadosGuardados = document.getElementById("dafoResultadosGuardados");

  if (wizard) wizard.style.display = "none";
  if (factoresSection) {
    factoresSection.style.display = "block";
    factoresSection.classList.add("dafo-factores-section-results");
  }

  renderFactoresGrid();

  var html = '<div class="dafo-matrix-section">';
  html += '<h3 class="dafo-matrix-section-title"><i class="bi bi-table"></i> Matriz FODA - Resultados</h3>';
  html += '<div class="dafo-matrices-grid">';

  matrixConfig.forEach(function(cfg) {
    html += renderMatrixTable(cfg, true);
  });

  html += '</div></div>';

  html += '<div id="dafoSaveSection" style="display:flex;justify-content:center;gap:1rem;margin-top:1.5rem;padding-top:1.5rem;border-top:2px solid #e2e8f0;">';
  html += '<button id="dafoGuardarActualizacionBtn" class="btn-primary" style="background:#2563eb;color:white;padding:0.7rem 2rem;font-weight:700;font-size:0.95rem;"><i class="bi bi-check-lg"></i> Guardar actualización</button>';
  html += '<button id="dafoCancelarActualizacionBtn" class="btn-secondary" style="padding:0.7rem 2rem;font-weight:600;font-size:0.95rem;"><i class="bi bi-x-lg"></i> Cancelar actualización</button>';
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
  if (alertText) alertText.textContent = "Revise los resultados de la Matriz FODA antes de guardar o cancelar la actualización.";
}

function guardarDafo() {
  if (typeof currentPlanId === "undefined" || !currentPlanId) {
    if (typeof showToast !== "undefined") showToast("Error: No hay un plan seleccionado.", "error");
    return;
  }

  var contenido = {
    matrixScores: matrixScores,
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
      detalle: "Matriz FODA " + (dafoCompletado ? "actualizada" : "creada") + " con matrices FO, FA, DO, DA."
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
  matrixScores = {};
  renderDafoUI();
}

var setupDone = false;
function setupEvents() {
  if (setupDone) return;
  setupDone = true;

  var actualizarBtn = document.getElementById("dafoActualizarBtn");
  if (actualizarBtn) actualizarBtn.onclick = function() { iniciarActualizacion(); };

  var prevBtn = document.getElementById("dafoPrevBtn");
  if (prevBtn) prevBtn.onclick = function() { };

  var nextBtn = document.getElementById("dafoNextBtn");
  if (nextBtn) nextBtn.onclick = function() { mostrarResultadosMatriz(); };

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
