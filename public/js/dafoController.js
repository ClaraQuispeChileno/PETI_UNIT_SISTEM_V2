// =====================================================================
// CONTROLADOR DAFO (M08) - PETI UNIT SISTEM
// Archivo independiente. Cualquier error queda aislado del resto.
// =====================================================================
(function() {
"use strict";

var itemsF = []; // fortalezas
var itemsD = []; // debilidades
var itemsO = []; // oportunidades
var itemsA = []; // amenazas
var scores = {}; // { "FO_{fId}_{oId}": 0-4, "FA_{fId}_{aId}": 0-4, ... }
var completado = false;
var activeTab = "FO";

// etiquetas para los tabs
var tabsDef = [
  { id:"FO", label:"Ofensiva (FO)", desc:"Fortalezas x Oportunidades" },
  { id:"FA", label:"Defensiva (FA)", desc:"Fortalezas x Amenazas" },
  { id:"DO", label:"Reorientacion (DO)", desc:"Debilidades x Oportunidades" },
  { id:"DA", label:"Supervivencia (DA)", desc:"Debilidades x Amenazas" }
];

function cargarDafo() {
  try {
    if (typeof currentPlanId === "undefined" || !currentPlanId) return;

    // Cargar desde MULTIPLES FUENTES: foda + plan_contenido + resultados modulos
    Promise.all([
      supabaseClient.from("foda").select("id,tipo,descripcion,trazabilidad,generado_auto").eq("plan_id", currentPlanId).order("id"),
      supabaseClient.from("plan_contenido").select("contenido").eq("plan_id", currentPlanId).eq("modulo_id", "M08").single(),
      supabaseClient.from("estrategia_plan").select("*").eq("plan_id", currentPlanId).single(),
      supabaseClient.from("porter_resultados").select("resultados").eq("plan_id", currentPlanId).single(),
      supabaseClient.from("pest_resultados").select("resultados").eq("plan_id", currentPlanId).single(),
      supabaseClient.from("plan_contenido").select("contenido").eq("plan_id", currentPlanId).eq("modulo_id", "M04").single()
    ]).then(function(results) {
      var fodaData = (results[0].data || []).filter(function(x){ return x && x.tipo && x.descripcion; });
      var m08Content = results[1].data ? results[1].data.contenido : null;
      var estrategia = results[2].data;
      var porterData = results[3].data ? results[3].data.resultados : null;
      var pestData = results[4].data ? results[4].data.resultados : null;
      var m04Content = results[5].data ? results[5].data.contenido : null;

      // Construir items desde FODA table
      var fItems = fodaData.filter(function(x){return x.tipo==="fortaleza";});
      var dItems = fodaData.filter(function(x){return x.tipo==="debilidad";});
      var oItems = fodaData.filter(function(x){return x.tipo==="oportunidad";});
      var aItems = fodaData.filter(function(x){return x.tipo==="amenaza";});

      // Si foda esta vacio, intentar reconstruir desde plan_contenido/resultados
      if (fItems.length === 0 && dItems.length === 0) {
        // Extraer desde M04 (Cadena de Valor) - respuestas guardadas en plan_contenido
        if (m04Content && m04Content.respuestas) {
          var m04Keys = Object.keys(m04Content.respuestas);
          try {
            m04Keys.forEach(function(k) {
              var score = m04Content.respuestas[k];
              var idx = parseInt(k);
              if (!isNaN(idx) && typeof preguntasCadenaValor !== "undefined" && preguntasCadenaValor[idx-1]) {
                var enunciado = preguntasCadenaValor[idx-1].enunciado;
                if (score >= 3) fItems.push({ id:"m04_f_"+idx, tipo:"fortaleza", descripcion:"[Cadena de Valor] "+enunciado, trazabilidad:{origen:"cadena_de_valor",item_num:idx,puntaje:score}, generado_auto:true });
                else if (score <= 1) dItems.push({ id:"m04_d_"+idx, tipo:"debilidad", descripcion:"[Cadena de Valor] "+enunciado, trazabilidad:{origen:"cadena_de_valor",item_num:idx,puntaje:score}, generado_auto:true });
              }
            });
          } catch(e) {}
        }
      }

      // Extraer O/A desde Porter (resultados en porter_resultados)
      if (porterData && porterData.respuestas) {
        Object.keys(porterData.respuestas).forEach(function(key) {
          var score = porterData.respuestas[key];
          if (score === undefined || score === 3) return;
          var label = key.replace(/_/g," ").replace(/\b\w/g,function(l){return l.toUpperCase();});
          if (score >= 4 && !aItems.find(function(x){return x.descripcion && x.descripcion.indexOf(label)>-1;})) {
            aItems.push({ id:"porter_a_"+key, tipo:"amenaza", descripcion:"[Porter] "+label+" (Puntaje: "+score+"/5)", trazabilidad:{origen:"porter",puntaje:score}, generado_auto:true });
          } else if (score <= 2 && !oItems.find(function(x){return x.descripcion && x.descripcion.indexOf(label)>-1;})) {
            oItems.push({ id:"porter_o_"+key, tipo:"oportunidad", descripcion:"[Porter] "+label+" (Puntaje: "+score+"/5)", trazabilidad:{origen:"porter",puntaje:score}, generado_auto:true });
          }
        });
      }

      // Extraer O/A desde PEST (resultados en pest_resultados)
      if (pestData && pestData.respuestas) {
        var pestProms = pestData.promedios || {};
        Object.keys(pestProms).forEach(function(factor) {
          var raw = pestProms[factor];
          if (raw === null) return;
          var norm = raw / 4;
          var fLabel = factor.charAt(0).toUpperCase() + factor.slice(1);
          if (norm >= 0.65) {
            aItems.push({ id:"pest_a_"+factor, tipo:"amenaza", descripcion:"[PEST - "+fLabel+"] Impacto promedio: "+raw.toFixed(1)+"/4 (norm: "+norm.toFixed(2)+")", trazabilidad:{origen:"pest",factor:factor,promedio:raw}, generado_auto:true });
          } else if (norm <= 0.35) {
            oItems.push({ id:"pest_o_"+factor, tipo:"oportunidad", descripcion:"[PEST - "+fLabel+"] Impacto promedio: "+raw.toFixed(1)+"/4 (norm: "+norm.toFixed(2)+")", trazabilidad:{origen:"pest",factor:factor,promedio:raw}, generado_auto:true });
          }
        });
      }

      // Ordenar items: Cadena de Valor -> BCG -> Porter -> PEST (por trazabilidad.origen)
      var ordenOrigen = ["cadena_de_valor","matriz_bcg","porter","pest"];
      function sortByOrigen(arr) {
        return arr.sort(function(a,b){
          var oa = ordenOrigen.indexOf(a.trazabilidad && a.trazabilidad.origen ? a.trazabilidad.origen : "z");
          var ob = ordenOrigen.indexOf(b.trazabilidad && b.trazabilidad.origen ? b.trazabilidad.origen : "z");
          if (oa === ob) return (a.id||"").localeCompare(b.id||"");
          return oa - ob;
        });
      }
      itemsF = sortByOrigen(fItems);
      itemsD = sortByOrigen(dItems);
      itemsO = sortByOrigen(oItems);
      itemsA = sortByOrigen(aItems);

      // Cargar scores guardados
      if (m08Content && m08Content.scores) {
        scores = m08Content.scores;
        conclusion = m08Content.conclusion || "";
        completado = true;
      } else if (estrategia) {
        completado = true;
      } else {
        scores = {};
        completado = false;
      }

      renderCompleto();
    }).catch(function(e) { console.error("Error cargarDafo:", e); });
  } catch(e2) { console.error("Error cargarDafo:", e2); }
}

function renderCompleto() {
  var badge = document.getElementById("m08EstadoBadge");
  if (badge) { badge.innerText = completado ? "Procesado" : (Object.keys(scores).length ? "En edicion" : "No iniciado"); badge.className = "m05-badge-progreso" + (completado ? " procesado" : (Object.keys(scores).length ? " edicion" : "")); }
  document.getElementById("dafoAlertBanner").style.display = completado ? "flex" : "none";
  document.getElementById("dafoWizardContainer").style.display = completado ? "none" : "block";
  document.getElementById("dafoResultsContainer").style.display = completado ? "block" : "none";

  renderFactores();
  if (!completado) {
    renderMatriz(activeTab);
    actualizarTotales();
  } else {
    renderResultados();
  }
}

function renderFactores() {
  var gridHtml = function(items, tipo, label, cls) {
    if (!items || items.length === 0) return "<div class='bloque-score-card'><div class='bloque-name'>" + label + "</div><div style='text-align:center;color:#94a3b8;padding:1rem;font-size:0.8rem;'>Sin items registrados</div></div>";
    var html = "<div class='bloque-score-card'><div class='bloque-name' style='color:" + cls + ";'>" + label + " (" + items.length + ")</div><div style='max-height:180px;overflow-y:auto;'>";
    items.forEach(function(item, i) {
      html += "<div style='font-size:0.78rem;padding:0.25rem 0;border-bottom:1px solid #f1f5f9;color:#334155;'><strong>" + (tipo === "F" || tipo === "D" ? tipo.toUpperCase() : tipo.toUpperCase()) + (i+1) + ":</strong> " + (item.descripcion.length > 80 ? item.descripcion.substring(0,80) + "..." : item.descripcion) + "</div>";
    });
    html += "</div></div>";
    return html;
  };

  document.getElementById("dafoFactoresGrid").innerHTML =
    "<div class='dafo-grid'>" +
    gridHtml(itemsF, "F", "FORTALEZAS", "#059669") +
    gridHtml(itemsD, "D", "DEBILIDADES", "#dc2626") +
    gridHtml(itemsO, "O", "OPORTUNIDADES", "#2563eb") +
    gridHtml(itemsA, "A", "AMENAZAS", "#d97706") +
    "</div>";
}
function renderMatriz(tabId) {
  activeTab = tabId;
  var def = tabsDef.find(function(t){return t.id===tabId;});
  if (!def) return;

  // Render tabs
  var tabsHtml = "";
  tabsDef.forEach(function(t) { tabsHtml += "<button class='dafo-tab" + (t.id===tabId ? " active" : "") + "' data-tab='" + t.id + "'>" + t.label + "</button>"; });
  document.getElementById("dafoTabs").innerHTML = tabsHtml;

  // Determinar rows y cols segun tab
  var rows = [], cols = [], prefix = "";
  if (tabId === "FO") { rows = itemsF; cols = itemsO; prefix = "FO"; }
  else if (tabId === "FA") { rows = itemsF; cols = itemsA; prefix = "FA"; }
  else if (tabId === "DO") { rows = itemsD; cols = itemsO; prefix = "DO"; }
  else if (tabId === "DA") { rows = itemsD; cols = itemsA; prefix = "DA"; }

  var html = "<div class='dafo-matrix-wrap'><table class='dafo-matrix'><thead><tr><th style='min-width:180px;text-align:left;'>" + def.desc + "</th>";
  cols.forEach(function(col, j) { html += "<th style='text-align:center;min-width:110px;'>" + (tabId==="FO"||tabId==="FA"?"F":"D") + (j+1) + "</th>"; });
  html += "<th style='text-align:center;min-width:50px;'>Subtotal</th></tr></thead><tbody>";

  rows.forEach(function(row, i) {
    var rowLabel = tabId==="FO"||tabId==="FA" ? "F" : "D";
    html += "<tr><td style='font-size:0.78rem;color:#475569;'><strong>" + rowLabel + (i+1) + ":</strong> " + (row.descripcion.length > 60 ? row.descripcion.substring(0,60)+"..." : row.descripcion) + "</td>";
    var rowSum = 0;
    cols.forEach(function(col, j) {
      var key = prefix + "_" + row.id + "_" + col.id;
      var val = scores[key];
      if (val === undefined) val = 0;
      rowSum += val;
      html += "<td style='text-align:center;'><div class='dafo-likert'>";
      for (var s = 0; s <= 4; s++) html += "<button class='dafo-btn" + (val === s ? " selected" : "") + "' data-key='" + key + "' data-val='" + s + "'>" + s + "</button>";
      html += "</div></td>";
    });
    html += "<td style='text-align:center;font-weight:700;'>" + rowSum + "</td></tr>";
  });

  var total = 0;
  cols.forEach(function(col, j) {
    var colSum = 0;
    rows.forEach(function(row, i) {
      var val = scores[prefix + "_" + row.id + "_" + col.id] || 0;
      colSum += val;
    });
    total += colSum;
  });
  html += "</tbody></table></div>";

  document.getElementById("dafoMatrixContent").innerHTML = html;
  document.getElementById("dafoTotalPuntaje").innerText = "Puntaje total " + def.label + ": " + total;

  actualizarTotales();
}

function actualizarTotales() {
  var totals = { FO:0, FA:0, DO:0, DA:0 };
  tabsDef.forEach(function(def) {
    var rows = def.id==="FO"||def.id==="FA" ? itemsF : itemsD;
    var cols = def.id==="FO"||def.id==="DO" ? itemsO : itemsA;
    rows.forEach(function(row) {
      cols.forEach(function(col) {
        var val = scores[def.id + "_" + row.id + "_" + col.id] || 0;
        totals[def.id] += val;
      });
    });
  });

  document.getElementById("dafoResultFO").innerText = totals.FO;
  document.getElementById("dafoResultFA").innerText = totals.FA;
  document.getElementById("dafoResultDO").innerText = totals.DO;
  document.getElementById("dafoResultDA").innerText = totals.DA;

  var max = 0, winner = "-";
  for (var k in totals) { if (totals[k] > max) { max = totals[k]; winner = k; } }
  if (max > 0) {
    var labels = { FO:"Ofensiva", FA:"Defensiva", DO:"Reorientacion", DA:"Supervivencia" };
    document.getElementById("dafoWinner").innerText = "Estrategia " + labels[winner] + " (" + winner + ")";
    document.getElementById("dafoWinner").style.color = winner==="FO"?"#059669":(winner==="FA"?"#2563eb":(winner==="DO"?"#d97706":"#dc2626"));
  }

  var totalSum = totals.FO + totals.FA + totals.DO + totals.DA;
  ["FO","FA","DO","DA"].forEach(function(k) {
    var el = document.getElementById("dafoPct" + k);
    if (el) el.innerText = totalSum > 0 ? (totals[k] / totalSum * 100).toFixed(0) + "%" : "0%";
  });
}
function guardarDafo() {
  var totals = { FO:0, FA:0, DO:0, DA:0 };
  tabsDef.forEach(function(def) {
    var rows = def.id==="FO"||def.id==="FA" ? itemsF : itemsD;
    var cols = def.id==="FO"||def.id==="DO" ? itemsO : itemsA;
    rows.forEach(function(row) {
      cols.forEach(function(col) {
        var val = scores[def.id + "_" + row.id + "_" + col.id] || 0;
        totals[def.id] += val;
      });
    });
  });

  var max = 0, winner = "-";
  for (var k in totals) { if (totals[k] > max) { max = totals[k]; winner = k; } }
  var labels = { FO:"ofensiva", FA:"defensiva", DO:"reorientacion", DA:"supervivencia" };
  var winnerLabel = winner !== "-" ? labels[winner] : "-";
  var winnerDisplay = { FO:"Ofensiva", FA:"Defensiva", DO:"Reorientacion", DA:"Supervivencia" };

  conclusion = "";
  if (winner !== "-") {
    conclusion = "De acuerdo con los resultados obtenidos en la Matriz DAFO, la organizacion debera adoptar una Estrategia " + winnerDisplay[winner] + ", debido a que obtuvo la mayor puntuacion en el analisis realizado (Total: " + max + " puntos). Esta estrategia permitira aprovechar de manera eficiente los recursos y capacidades de la empresa, asi como responder adecuadamente a las oportunidades y amenazas presentes en el entorno.";
  }

  var contenido = { scores: scores, totals: totals, winner: winner, conclusion: conclusion };


  supabaseClient.from("plan_contenido").upsert({
    plan_id: currentPlanId, modulo_id:"M08",
    contenido: contenido,
    completado:true, completado_fecha: new Date()
  }, { onConflict:"plan_id, modulo_id" }).then(function() {
    return supabaseClient.from("estrategia_plan").upsert({
      plan_id: currentPlanId,
      tipo_estrategia: winnerLabel,
      descripcion: conclusion,
      puntaje_fo: totals.FO,
      puntaje_fa: totals.FA,
      puntaje_od: totals.DO,
      puntaje_da: totals.DA
    }, { onConflict:"plan_id" });
  }).then(function() {
    return supabaseClient.from("auditoria").insert({
      usuario_id: currentUser ? currentUser.id : null, modulo:"M08",
      accion: completado ? "ACTUALIZAR" : "CREAR",
      detalle: "Matriz DAFO completada. Estrategia: " + (winnerDisplay[winner] || "-")
    });
  }).then(function() {
    completado = true;
    renderCompleto();
    if (typeof showToast !== "undefined") showToast("Matriz DAFO guardada.", "success");
    if (typeof cargarDashboard !== "undefined") cargarDashboard();
  }).catch(function(e) {
    console.error("Error guardarDafo:", e);
    if (typeof showToast !== "undefined") showToast("Error al guardar: " + e.message, "error");
  });
}

function renderResultados() {
  var totals = { FO:0, FA:0, DO:0, DA:0 };
  tabsDef.forEach(function(def) {
    var rows = def.id==="FO"||def.id==="FA" ? itemsF : itemsD;
    var cols = def.id==="FO"||def.id==="DO" ? itemsO : itemsA;
    rows.forEach(function(row) {
      cols.forEach(function(col) {
        var val = scores[def.id + "_" + row.id + "_" + col.id] || 0;
        totals[def.id] += val;
      });
    });
  });

  var labels = { FO:"Ofensiva", FA:"Defensiva", DO:"Reorientacion", DA:"Supervivencia" };
  var totalSum = totals.FO + totals.FA + totals.DO + totals.DA;

  var html = "<table class='dafo-summary'><thead><tr><th>Relacion</th><th>Estrategia</th><th>Puntaje</th><th>%</th></tr></thead><tbody>";
  ["FO","FA","DO","DA"].forEach(function(k) {
    var pct = totalSum > 0 ? (totals[k] / totalSum * 100).toFixed(1) : "0.0";
    var colors = {FO:"#059669",FA:"#2563eb",DO:"#d97706",DA:"#dc2626"};
    html += "<tr><td>" + k + "</td><td>" + labels[k] + "</td><td style='font-weight:700;color:" + colors[k] + ";'>" + totals[k] + "</td><td>" + pct + "%</td></tr>";
  });
  html += "</tbody></table>";

  var max = 0, winner = "-";
  for (var k in totals) { if (totals[k] > max) { max = totals[k]; winner = k; } }
  if (max > 0) html += "<div class='dafo-winner-box'><strong>Estrategia priorizada: " + labels[winner] + "</strong><p>" + (conclusion || "") + "</p></div>";

  document.getElementById("dafoResultsBody").innerHTML = html;

  // Update synthesis cards in results view
  ["FO","FA","DO","DA"].forEach(function(k) {
    var el = document.getElementById("dafoResult" + k + "2");
    if (el) el.innerText = totals[k];
  });
}
var conclusion = "";

function setupEvents() {
  // Delegated click for tabs and Likert buttons inside dafoWizardContainer
  document.getElementById("dafoWizardContainer").onclick = function(e) {
    // Tab switching
    var tab = e.target.closest(".dafo-tab");
    if (tab) {
      renderMatriz(tab.getAttribute("data-tab"));
      return;
    }
    // Likert buttons in matrix
    var btn = e.target.closest(".dafo-btn");
    if (btn) {
      var key = btn.getAttribute("data-key");
      var val = parseInt(btn.getAttribute("data-val"));
      scores[key] = val;
      renderMatriz(activeTab);
      return;
    }
  };

  document.getElementById("dafoBackBtn").onclick = function() {
    completado = false;
    renderCompleto();
  };

  document.getElementById("dafoGuardarBtn").onclick = function() {
    if (Object.keys(scores).length === 0) {
      if (typeof showToast !== "undefined") showToast("Debe puntuar al menos una relacion antes de guardar.", "error");
      return;
    }
    guardarDafo();
  };

  document.getElementById("dafoCancelBtn").onclick = function() {
    completado = false;
    scores = {};
    renderCompleto();
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
