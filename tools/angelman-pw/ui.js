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

function renderBandVisualForValue(southernValue) {
  var matAbsent = southernValue === 'mat_absent_pat_only' || southernValue === 'unknown';
  var patAbsent = southernValue === 'pat_absent_mat_only' || southernValue === 'unknown';
  return '' +
    '<div class="band-visual compact">' +
      '<div>' +
        '<div class="text-muted" style="font-size:.7rem;margin-bottom:.25rem">4,2 kb</div>' +
        '<div class="band band-mat' + (matAbsent ? ' band-absent' : '') + '">MAT</div>' +
      '</div>' +
      '<div>' +
        '<div class="text-muted" style="font-size:.7rem;margin-bottom:.25rem">0,9 kb</div>' +
        '<div class="band band-pat' + (patAbsent ? ' band-absent' : '') + '">PAT</div>' +
      '</div>' +
    '</div>';
}

function buildSouthernBandsForRole(southernValue, role) {
  if (role !== 'child') {
    return { mat: true, pat: true };
  }

  if (southernValue === 'mat_absent_pat_only') return { mat: false, pat: true };
  if (southernValue === 'pat_absent_mat_only') return { mat: true, pat: false };
  if (southernValue === 'normal') return { mat: true, pat: true };
  return { mat: false, pat: false };
}

function renderSouthernSchema(southernValue) {
  var persons = [
    { label: 'Pere', x: 120, bands: buildSouthernBandsForRole(southernValue, 'father') },
    { label: 'Enfant', x: 310, bands: buildSouthernBandsForRole(southernValue, 'child') },
    { label: 'Mere', x: 500, bands: buildSouthernBandsForRole(southernValue, 'mother') },
  ];

  var svg = '';
  svg += '<svg class="exam-schema" viewBox="0 0 620 260" aria-label="Schema Southern blot attendu">';
  svg += '<rect x="0" y="0" width="620" height="260" fill="#ffffff"/>';

  // Probe map
  svg += '<line x1="400" y1="34" x2="595" y2="34" stroke="#2563eb" stroke-width="2"/>';
  svg += '<line x1="440" y1="12" x2="440" y2="34" stroke="#2563eb" stroke-width="2"/>';
  svg += '<line x1="470" y1="12" x2="470" y2="34" stroke="#2563eb" stroke-width="2"/>';
  svg += '<line x1="565" y1="12" x2="565" y2="34" stroke="#2563eb" stroke-width="2"/>';
  svg += '<text x="446" y="10" font-size="10" fill="#111827" transform="rotate(-90 446 10)">XbaI</text>';
  svg += '<text x="476" y="10" font-size="10" fill="#111827" transform="rotate(-90 476 10)">NotI</text>';
  svg += '<text x="571" y="10" font-size="10" fill="#111827" transform="rotate(-90 571 10)">XbaI</text>';
  svg += '<line x1="448" y1="54" x2="468" y2="54" stroke="#ef4444" stroke-width="3"/>';
  svg += '<text x="452" y="68" font-size="10" fill="#ef4444">sonde</text>';

  svg += '<text x="28" y="96" font-size="11" fill="#6b7280">4,2 kb</text>';
  svg += '<text x="28" y="164" font-size="11" fill="#6b7280">0,9 kb</text>';

  persons.forEach(function(person) {
    svg += '<text x="' + person.x + '" y="92" text-anchor="middle" font-size="11" fill="#111827">' + person.label + '</text>';
    svg += '<line x1="' + person.x + '" y1="110" x2="' + person.x + '" y2="182" stroke="#e5e7eb" stroke-width="1"/>';
    svg += '<line x1="' + (person.x - 32) + '" y1="98" x2="' + (person.x + 32) + '" y2="98" stroke="' + (person.bands.mat ? '#111827' : '#cbd5e1') + '" stroke-width="' + (person.bands.mat ? '3' : '1.5') + '"/>';
    svg += '<line x1="' + (person.x - 26) + '" y1="156" x2="' + (person.x + 26) + '" y2="156" stroke="' + (person.bands.pat ? '#111827' : '#cbd5e1') + '" stroke-width="' + (person.bands.pat ? '3' : '1.5') + '"/>';
  });

  svg += '<text x="62" y="222" font-size="11" fill="#374151">Schema simplifie du Southern attendu</text>';
  svg += '</svg>';
  return svg;
}

function buildMicrosatSchemaData(value, locusName) {
  var father = locusName === 'critical' ? [22, 54] : [20, 56];
  var mother = locusName === 'critical' ? [30, 64] : [34, 70];
  var child;

  if (value === 'maternal_and_paternal') {
    child = [father[1], mother[1]];
  } else if (value === 'paternal_only') {
    child = [father[1]];
  } else if (value === 'maternal_only') {
    child = [mother[1]];
  } else if (value === 'non_informative') {
    father = [42];
    mother = [42];
    child = [42];
  } else {
    child = [];
  }

  return { father: father, mother: mother, child: child };
}

function renderPeaks(xs, baseX, baseY, scaleX) {
  return xs.map(function(x) {
    var px = baseX + (x * scaleX);
    return '<path d="M ' + (px - 10) + ' ' + baseY + ' Q ' + px + ' ' + (baseY - 34) + ' ' + (px + 10) + ' ' + baseY + '" stroke="#111827" stroke-width="2" fill="none"/>';
  }).join('');
}

function renderMicrosatSchema(criticalValue, outsideValue) {
  var critical = buildMicrosatSchemaData(criticalValue, 'critical');
  var outside = buildMicrosatSchemaData(outsideValue, 'outside');
  var rows = [
    { label: 'Pere', y: 88, key: 'father' },
    { label: 'Mere', y: 164, key: 'mother' },
    { label: 'Enfant', y: 240, key: 'child' },
  ];
  var scaleX = 2.2;
  var svg = '';
  svg += '<svg class="exam-schema" viewBox="0 0 720 300" aria-label="Schema microsatellites attendu">';
  svg += '<rect x="0" y="0" width="720" height="300" fill="#ffffff"/>';
  svg += '<text x="230" y="28" text-anchor="middle" font-size="14" fill="#111827">D15S128</text>';
  svg += '<text x="230" y="44" text-anchor="middle" font-size="11" fill="#6b7280">region critique</text>';
  svg += '<text x="510" y="28" text-anchor="middle" font-size="14" fill="#111827">D15S165</text>';
  svg += '<text x="510" y="44" text-anchor="middle" font-size="11" fill="#6b7280">hors region critique</text>';

  rows.forEach(function(row) {
    svg += '<text x="44" y="' + (row.y - 6) + '" font-size="12" fill="#111827">' + row.label + '</text>';
    svg += '<line x1="120" y1="' + row.y + '" x2="335" y2="' + row.y + '" stroke="#9ca3af" stroke-width="1.5"/>';
    svg += '<line x1="400" y1="' + row.y + '" x2="615" y2="' + row.y + '" stroke="#9ca3af" stroke-width="1.5"/>';
  });

  svg += '<line x1="360" y1="54" x2="360" y2="262" stroke="#e5e7eb" stroke-width="1.5"/>';

  svg += renderPeaks(critical.father, 132, 88, scaleX);
  svg += renderPeaks(critical.mother, 132, 164, scaleX);
  svg += renderPeaks(critical.child, 132, 240, scaleX);
  svg += renderPeaks(outside.father, 412, 88, scaleX);
  svg += renderPeaks(outside.mother, 412, 164, scaleX);
  svg += renderPeaks(outside.child, 412, 240, scaleX);

  svg += '</svg>';
  return svg;
}

function renderMarkerVisual(value) {
  if (value === 'maternal_and_paternal') {
    return '<div class="marker-visual">' +
      '<span class="marker-pill marker-mat">Allèle MAT</span>' +
      '<span class="marker-pill marker-pat">Allèle PAT</span>' +
      '</div>';
  }
  if (value === 'maternal_only') {
    return '<div class="marker-visual">' +
      '<span class="marker-pill marker-mat">Allèle MAT</span>' +
      '<span class="marker-pill marker-missing">PAT absent</span>' +
      '</div>';
  }
  if (value === 'paternal_only') {
    return '<div class="marker-visual">' +
      '<span class="marker-pill marker-missing">MAT absent</span>' +
      '<span class="marker-pill marker-pat">Allèle PAT</span>' +
      '</div>';
  }
  if (value === 'non_informative') {
    return '<div class="marker-visual">' +
      '<span class="marker-pill marker-mat">MAT = PAT</span>' +
      '<span class="marker-pill marker-pat">Locus non informatif</span>' +
      '</div>';
  }
  return '<div class="marker-visual"><span class="marker-pill marker-missing">Inconnu</span></div>';
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

function generateExpectedPattern() {
  clearResults();
  var errorEl = $('error-area');
  var reverseEl = $('reverse-results');
  errorEl.className = 'hidden';
  errorEl.innerHTML = '';

  try {
    var diagnosisId = $('reverse-diagnosis').value;
    var result = AngelmanPW.buildExpectedPatternFromCause(diagnosisId);
    renderExpectedPattern(result);
  } catch(e) {
    if (reverseEl) {
      reverseEl.className = 'hidden';
      reverseEl.innerHTML = '';
    }
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

function renderExpectedPattern(result) {
  var area = $('reverse-results');
  if (!area) return;

  var html = '';
  html += '<div class="reverse-summary">';
  html += '<div class="diagnosis-name">' + result.diagnosisLabel + '</div>';
  html += '<div class="step-desc">' + result.summary + '</div>';
  html += '</div>';

  html += '<div class="reverse-grid">';

  html += '<div class="reverse-box">';
  html += '<div class="reverse-box-title">Southern blot attendu</div>';
  html += '<div class="step-desc">' + result.explanationSteps[0] + '</div>';
  html += renderSouthernSchema(result.expected.southern);
  html += '<div class="schema-caption">Parents affichés comme profils de référence normaux ; le profil enfant reflète le mécanisme causal choisi.</div>';
  html += '</div>';

  html += '<div class="reverse-box">';
  html += '<div class="reverse-box-title">Lecture rapide</div>';
  html += '<div class="step-desc" style="margin-bottom:.45rem">' + result.explanationSteps[1] + '</div>';
  html += renderMarkerVisual(result.expected.criticalRegionMicrosatellites);
  html += '<div class="step-desc" style="margin:.6rem 0 .45rem">' + result.explanationSteps[2] + '</div>';
  html += renderMarkerVisual(result.expected.outsideRegionMicrosatellites);
  html += '</div>';

  html += '<div class="reverse-box" style="grid-column:1 / -1">';
  html += '<div class="reverse-box-title">Schema microsatellites attendu</div>';
  html += renderMicrosatSchema(result.expected.criticalRegionMicrosatellites, result.expected.outsideRegionMicrosatellites);
  html += '<div class="schema-caption">Schema illustratif : les positions exactes des pics sont arbitraires, mais la presence ou l\'absence des contributions maternelles et paternelles correspond au mecanisme choisi.</div>';
  html += '</div>';

  html += '<div class="reverse-box" style="grid-column:1 / -1">';
  html += '<div class="reverse-box-title">Raisonnement</div>';
  html += '<div class="step-desc" style="margin-bottom:.6rem">' + result.explanationSteps[3] + '</div>';
  html += '<div class="info-box" style="font-size:.85rem">→ ' + result.examTip + '</div>';
  html += '</div>';

  html += '</div>';

  area.innerHTML = html;
  area.className = '';
  area.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
