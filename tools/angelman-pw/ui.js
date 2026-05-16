'use strict';

function $(id) { return document.getElementById(id); }

// ─── Exemples prédéfinis ──────────────────────────────────────────────────────

var EXAMPLES = {
  '1': { clinicalSuspicion: 'Angelman',     southern: 'normal',             criticalRegionMicrosatellites: 'maternal_and_paternal', outsideRegionMicrosatellites: 'maternal_and_paternal' },
  '2': { clinicalSuspicion: 'Angelman',     southern: 'mat_absent_pat_only', criticalRegionMicrosatellites: 'paternal_only',          outsideRegionMicrosatellites: 'paternal_only' },
  '3': { clinicalSuspicion: 'Angelman',     southern: 'mat_absent_pat_only', criticalRegionMicrosatellites: 'paternal_only',          outsideRegionMicrosatellites: 'maternal_and_paternal' },
  '4': { clinicalSuspicion: 'Angelman',     southern: 'mat_absent_pat_only', criticalRegionMicrosatellites: 'maternal_and_paternal',  outsideRegionMicrosatellites: 'maternal_and_paternal' },
  '5': { clinicalSuspicion: 'Prader-Willi', southern: 'pat_absent_mat_only', criticalRegionMicrosatellites: 'maternal_only',          outsideRegionMicrosatellites: 'maternal_only' },
  '6': { clinicalSuspicion: 'Prader-Willi', southern: 'pat_absent_mat_only', criticalRegionMicrosatellites: 'maternal_only',          outsideRegionMicrosatellites: 'maternal_and_paternal' },
  '7': { clinicalSuspicion: 'Prader-Willi', southern: 'pat_absent_mat_only', criticalRegionMicrosatellites: 'maternal_and_paternal',  outsideRegionMicrosatellites: 'maternal_and_paternal' },
  '8': { clinicalSuspicion: 'Angelman',     southern: 'normal',             criticalRegionMicrosatellites: 'non_informative',        outsideRegionMicrosatellites: 'maternal_and_paternal' },
};

function loadExample() {
  var ex = EXAMPLES[$('example-select').value];
  if (!ex) return;
  $('clinical-suspicion').value = ex.clinicalSuspicion;
  $('southern').value           = ex.southern;
  $('critical-micro').value     = ex.criticalRegionMicrosatellites;
  $('outside-micro').value      = ex.outsideRegionMicrosatellites;
  updateBandVisual();
  clearResults();
}

// ─── Visuel bandes Southern ───────────────────────────────────────────────────

function updateBandVisual() {
  var val = $('southern').value;
  $('band-mat').classList.toggle('band-absent', val === 'mat_absent_pat_only' || val === 'unknown');
  $('band-pat').classList.toggle('band-absent', val === 'pat_absent_mat_only' || val === 'unknown');
}

// ─── Lecture des entrées ──────────────────────────────────────────────────────

function readInput() {
  return {
    clinicalSuspicion:             $('clinical-suspicion').value,
    southern:                      $('southern').value,
    criticalRegionMicrosatellites: $('critical-micro').value,
    outsideRegionMicrosatellites:  $('outside-micro').value,
  };
}

// ─── Calcul ───────────────────────────────────────────────────────────────────

function calculate() {
  clearResults();
  var errorEl = $('error-area');
  errorEl.className = 'hidden';
  errorEl.innerHTML = '';

  try {
    var result = AngelmanPW.interpretAngelmanPraderWilli(readInput());
    renderResults(result);
  } catch(e) {
    errorEl.innerHTML = '<div class="error-box">' + e.message + '</div>';
    errorEl.className = '';
  }
}

// ─── Rendu ────────────────────────────────────────────────────────────────────

var STATUS_LABEL = { possible: 'POSSIBLE', impossible: 'IMPOSSIBLE', ambiguous: 'AMBIGU' };
var CONFIDENCE_LABEL = { high: 'Confiance élevée', medium: 'Confiance moyenne', low: 'Confiance faible' };

function renderResults(result) {
  var area = $('results-area');
  var html = '';

  // ── Warnings ──────────────────────────────────────────────────────────────
  result.warnings.forEach(function(w) {
    html += '<div class="warning-box">⚠ ' + w + '</div>';
  });

  // ── Diagnostic principal ───────────────────────────────────────────────────
  html += '<div class="step visible">';
  html += '<div class="step-header"><span class="step-num">✓</span>';
  html += '<div><div class="step-title">Diagnostic le plus probable</div></div></div>';

  if (result.mostLikelyDiagnosis) {
    html += '<div class="diagnosis-main confidence-' + result.confidence + '">';
    html += '<div class="diagnosis-name">' + result.mostLikelyDiagnosis + '</div>';
    html += '<span class="confidence-badge confidence-' + result.confidence + '">' +
            CONFIDENCE_LABEL[result.confidence] + '</span>';

    // nextStep du diagnostic possible
    var mainDiag = result.possibleDiagnoses.find(function(d) {
      return d.diagnosis === result.mostLikelyDiagnosis && d.nextStep;
    });
    if (mainDiag && mainDiag.nextStep) {
      html += '<div class="info-box" style="margin-top:.6rem;font-size:.875rem">' +
              '→ ' + mainDiag.nextStep + '</div>';
    }
    html += '</div>';
  } else {
    html += '<div class="error-box">Aucun diagnostic ne correspond à ces données.</div>';
  }
  html += '</div>';

  // ── Tableau de tous les diagnostics ───────────────────────────────────────
  html += '<div class="step visible">';
  html += '<div class="step-header"><span class="step-num">2</span>';
  html += '<div><div class="step-title">Évaluation de tous les diagnostics</div>';
  html += '<div class="step-desc">Chaque diagnostic est comparé aux résultats saisis.</div></div></div>';

  html += '<div class="table-wrapper"><table>';
  html += '<thead><tr><th>Diagnostic</th><th>Statut</th><th>Justification</th></tr></thead><tbody>';

  result.possibleDiagnoses.forEach(function(d) {
    var statusClass = 'status-' + d.status;
    var isMain = d.diagnosis === result.mostLikelyDiagnosis;
    html += '<tr' + (isMain ? ' style="background:#f0f7ff"' : '') + '>';
    html += '<td style="font-weight:' + (isMain ? '700' : '400') + '">' + d.diagnosis + '</td>';
    html += '<td class="' + statusClass + '">' + STATUS_LABEL[d.status] + '</td>';
    html += '<td style="font-size:.82rem;color:var(--text-muted)">' + d.explanation + '</td>';
    html += '</tr>';
  });

  html += '</tbody></table></div></div>';

  // ── Bouton étapes ──────────────────────────────────────────────────────────
  html += '<div class="btn-row">' +
    '<button class="btn btn-show-all" id="btn-steps" onclick="toggleSteps()">' +
    '▼ Voir les étapes détaillées</button></div>';

  // ── Étapes (masquées par défaut) ───────────────────────────────────────────
  html += '<div id="steps-detail" class="hidden">';
  result.explanationSteps.forEach(function(text, i) {
    html += '<div class="step visible">';
    html += '<div class="step-header"><span class="step-num">' + (i + 1) + '</span>';
    html += '<div class="step-title">Étape ' + (i + 1) + '</div></div>';
    html += '<div class="step-desc">' + text + '</div>';
    html += '</div>';
  });
  html += '</div>';

  area.innerHTML = html;
  area.className = '';
  area.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function toggleSteps() {
  var detail = $('steps-detail');
  var btn    = $('btn-steps');
  var hidden = detail.classList.contains('hidden');
  detail.classList.toggle('hidden', !hidden);
  btn.textContent = hidden ? '▲ Masquer les étapes' : '▼ Voir les étapes détaillées';
}

function clearResults() {
  $('results-area').className = 'hidden';
  $('results-area').innerHTML = '';
}

// ─── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  updateBandVisual();
  $('southern').addEventListener('change', updateBandVisual);
});
