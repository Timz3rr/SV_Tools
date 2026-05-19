'use strict';

function $(id) { return document.getElementById(id); }

// ─── Exemples prédéfinis ──────────────────────────────────────────────────────

var EXAMPLES = {
  '1': { clinicalSuspicion: 'Angelman',     southern: 'normal',             criticalRegionMicrosatellites: 'maternal_and_paternal', outsideRegionMicrosatellites: 'maternal_and_paternal' },
  '2': { clinicalSuspicion: 'Angelman',     southern: 'mat_absent_pat_only', criticalRegionMicrosatellites: 'paternal_only',          outsideRegionMicrosatellites: 'paternal_only' },
  '3': { clinicalSuspicion: 'Angelman',     southern: 'mat_absent_pat_only_reduced_intensity', criticalRegionMicrosatellites: 'paternal_only',          outsideRegionMicrosatellites: 'maternal_and_paternal' },
  '4': { clinicalSuspicion: 'Angelman',     southern: 'mat_absent_pat_only', criticalRegionMicrosatellites: 'maternal_and_paternal',  outsideRegionMicrosatellites: 'maternal_and_paternal' },
  '5': { clinicalSuspicion: 'Prader-Willi', southern: 'pat_absent_mat_only', criticalRegionMicrosatellites: 'maternal_only',          outsideRegionMicrosatellites: 'maternal_only' },
  '6': { clinicalSuspicion: 'Prader-Willi', southern: 'pat_absent_mat_only_reduced_intensity', criticalRegionMicrosatellites: 'maternal_only',          outsideRegionMicrosatellites: 'maternal_and_paternal' },
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
  var matAbsent = val === 'mat_absent_pat_only' || val === 'mat_absent_pat_only_reduced_intensity' || val === 'unknown';
  var patAbsent = val === 'pat_absent_mat_only' || val === 'pat_absent_mat_only_reduced_intensity' || val === 'unknown';
  var reducedRemaining = val === 'mat_absent_pat_only_reduced_intensity' || val === 'pat_absent_mat_only_reduced_intensity';

  $('band-mat').classList.toggle('band-absent', matAbsent);
  $('band-pat').classList.toggle('band-absent', patAbsent);
  $('band-mat').style.opacity = (!matAbsent && reducedRemaining) ? '0.55' : '';
  $('band-pat').style.opacity = (!patAbsent && reducedRemaining) ? '0.55' : '';
}

function renderBandVisualForValue(southernValue) {
  var matAbsent = southernValue === 'mat_absent_pat_only' || southernValue === 'mat_absent_pat_only_reduced_intensity' || southernValue === 'unknown';
  var patAbsent = southernValue === 'pat_absent_mat_only' || southernValue === 'pat_absent_mat_only_reduced_intensity' || southernValue === 'unknown';
  var reducedRemaining = southernValue === 'mat_absent_pat_only_reduced_intensity' || southernValue === 'pat_absent_mat_only_reduced_intensity';
  return '' +
    '<div class="band-visual compact">' +
      '<div>' +
        '<div class="text-muted" style="font-size:.7rem;margin-bottom:.25rem">4,2 kb</div>' +
        '<div class="band band-mat' + (matAbsent ? ' band-absent' : '') + '"' + (!matAbsent && reducedRemaining ? ' style="opacity:.55"' : '') + '>MAT</div>' +
      '</div>' +
      '<div>' +
        '<div class="text-muted" style="font-size:.7rem;margin-bottom:.25rem">0,9 kb</div>' +
        '<div class="band band-pat' + (patAbsent ? ' band-absent' : '') + '"' + (!patAbsent && reducedRemaining ? ' style="opacity:.55"' : '') + '>PAT</div>' +
      '</div>' +
    '</div>';
}

function buildSouthernBandsForRole(southernValue, role) {
  var profile = role === 'child' ? southernValue : 'normal';
  var reduced = profile === 'mat_absent_pat_only_reduced_intensity' || profile === 'pat_absent_mat_only_reduced_intensity';
  return {
    xbaI: profile !== 'unknown',
    xbaIDarkness: reduced ? 0.48 : 0.92,
    mat: profile === 'normal' || profile === 'pat_absent_mat_only' || profile === 'pat_absent_mat_only_reduced_intensity',
    matDarkness: reduced ? 0.44 : 0.82,
    pat: profile === 'normal' || profile === 'mat_absent_pat_only' || profile === 'mat_absent_pat_only_reduced_intensity',
    patDarkness: reduced ? 0.44 : 0.82,
  };
}

function renderSouthernBand(cx, cy, width, height, darkness) {
  return '' +
    '<rect x="' + (cx - (width / 2)) + '" y="' + (cy - (height / 2)) + '" width="' + width + '" height="' + height + '" rx="2" fill="rgba(15,23,42,' + darkness + ')"/>' +
    '<rect x="' + (cx - (width / 2) - 2) + '" y="' + (cy - (height / 2) - 1) + '" width="' + (width + 4) + '" height="' + (height + 2) + '" rx="3" fill="rgba(15,23,42,' + (darkness * 0.12) + ')"/>';
}

function renderSouthernSchema(southernValue) {
  var persons = [
    { label: 'Pere :', x: 170, bands: buildSouthernBandsForRole(southernValue, 'father') },
    { label: 'enfant', x: 360, bands: buildSouthernBandsForRole(southernValue, 'child') },
    { label: 'Mere', x: 550, bands: buildSouthernBandsForRole(southernValue, 'mother') },
  ];

  var svg = '';
  svg += '<svg class="exam-schema" viewBox="0 0 720 380" aria-label="Schema Southern blot attendu">';
  svg += '<rect x="0" y="0" width="720" height="380" fill="#ffffff"/>';

  svg += '<text x="20" y="34" font-size="12" fill="#111827">La sonde s\'hybride au IC (Imprinting Center)</text>';
  svg += '<text x="20" y="52" font-size="12" fill="#111827">sur le chromosome 15.</text>';
  svg += '<text x="20" y="78" font-size="12" fill="#111827">L\'ADN genomique a ete digere avec Xba I seulement</text>';
  svg += '<text x="20" y="96" font-size="12" fill="#111827">et avec Xba I + Not I.</text>';

  svg += '<line x1="512" y1="48" x2="682" y2="48" stroke="#2563eb" stroke-width="2"/>';
  svg += '<line x1="552" y1="28" x2="552" y2="48" stroke="#2563eb" stroke-width="2"/>';
  svg += '<line x1="576" y1="28" x2="576" y2="48" stroke="#2563eb" stroke-width="2"/>';
  svg += '<line x1="662" y1="28" x2="662" y2="48" stroke="#2563eb" stroke-width="2"/>';
  svg += '<text x="558" y="24" font-size="10" fill="#111827" transform="rotate(-90 558 24)">Xba I</text>';
  svg += '<text x="582" y="24" font-size="10" fill="#111827" transform="rotate(-90 582 24)">Not I</text>';
  svg += '<text x="668" y="24" font-size="10" fill="#111827" transform="rotate(-90 668 24)">Xba I</text>';
  svg += '<line x1="558" y1="66" x2="584" y2="66" stroke="#ef4444" stroke-width="3"/>';
  svg += '<text x="550" y="84" font-size="10" fill="#ef4444">sonde</text>';

  svg += '<text x="34" y="166" font-size="11" fill="#374151">4,2 kb</text>';
  svg += '<text x="34" y="280" font-size="11" fill="#374151">0,9 kb</text>';
  svg += '<rect x="72" y="138" width="560" height="162" rx="4" fill="#fafaf9" stroke="#e7e5e4"/>';

  persons.forEach(function(person) {
    var laneXba = person.x - 34;
    var laneDouble = person.x + 34;
    svg += '<text x="' + person.x + '" y="132" text-anchor="middle" font-size="13" fill="#111827">' + person.label + '</text>';
    svg += '<rect x="' + (laneXba - 18) + '" y="146" width="36" height="140" fill="rgba(148,163,184,0.08)"/>';
    svg += '<rect x="' + (laneDouble - 18) + '" y="146" width="36" height="140" fill="rgba(148,163,184,0.08)"/>';

    if (person.bands.xbaI) {
      svg += renderSouthernBand(laneXba, 156, 46, 6, person.bands.xbaIDarkness);
    }
    if (person.bands.mat) {
      svg += renderSouthernBand(laneDouble, 156, 46, 5, person.bands.matDarkness);
    }
    if (person.bands.pat) {
      svg += renderSouthernBand(laneDouble, 270, 44, 5, person.bands.patDarkness);
    }
  });

  svg += '<text x="102" y="314" font-size="11" fill="#111827">Xba I</text>';
  svg += '<text x="166" y="314" font-size="11" fill="#111827">Xba I + Not I</text>';
  svg += '<text x="20" y="348" font-size="11" fill="#6b7280">Le profil enfant varie selon le mecanisme causal choisi ; les parents sont montres comme temoins normaux.</text>';
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

function renderSouthernLegend() {
  return '' +
    '<div class="schema-caption" style="margin-top:.55rem">' +
      '<strong>Comment lire ce Southern :</strong> ' +
      'la hauteur de la bande correspond a la taille du fragment detecte (<strong>4,2 kb</strong> en haut, <strong>0,9 kb</strong> en bas). ' +
      'La colonne de gauche correspond a la digestion <strong>Xba I</strong>, celle de droite a la digestion <strong>Xba I + Not I</strong>.' +
    '</div>' +
    '<div class="schema-caption">' +
      '<strong>Comme sur un vrai Southern blot :</strong> l\'intensite d\'une bande peut parfois avoir de l\'importance experimentalement. ' +
      'Ici, une <strong>bande restante plus pale</strong> sert a signaler une <strong>intensite reduite</strong>, utile surtout pour evoquer une deletion. ' +
      'En dehors de ce point, le schema reste simplifie pour privilegier la lecture de <strong>la presence / absence</strong>, de <strong>la taille</strong> et du <strong>profil de digestion</strong>.' +
    '</div>';
}

function renderMicrosatLegend() {
  return '' +
    '<div class="schema-caption" style="margin-top:.55rem">' +
      '<strong>Comment lire les microsatellites :</strong> chaque pic represente un allele detecte. ' +
      'Sa <strong>position horizontale</strong> correspond a une taille relative d\'allele, ce qui permet de comparer pere, mere et enfant.' +
    '</div>' +
    '<div class="schema-caption">' +
      '<strong>Important :</strong> la <strong>hauteur</strong> et la <strong>largeur</strong> des pics sont ici illustratives. ' +
      'Elles ne representent pas une quantite exacte d\'ADN. Ce qui compte surtout est le <strong>nombre de pics</strong> et leur <strong>origine maternelle ou paternelle</strong>.' +
    '</div>';
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
  html += renderSouthernLegend();
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
  html += renderMicrosatLegend();
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
