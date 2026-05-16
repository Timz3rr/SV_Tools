'use strict';

function $(id) { return document.getElementById(id); }

// ─── Exemples ─────────────────────────────────────────────────────────────────

var EXAMPLES = {
  '1': {
    calcType: 'x_linked',
    xlMotherP: '1/4',
  },
  '2': {
    calcType: 'ar',
    arMotherP: '1/3',
    arFatherP: '1/2',
  },
  '3': {
    calcType: 'bayes',
    bayesPrior: '1/2',
    bayesSons: '1',
  },
};

function loadExample() {
  var ex = EXAMPLES[$('example-select').value];
  if (!ex) return;
  $('calc-type').value = ex.calcType;
  updateFields();

  if (ex.xlMotherP)  $('xl-mother-p').value  = ex.xlMotherP;
  if (ex.arMotherP)  $('ar-mother-p').value  = ex.arMotherP;
  if (ex.arFatherP)  $('ar-father-p').value  = ex.arFatherP;
  if (ex.adParentP)  $('ad-parent-p').value  = ex.adParentP;
  if (ex.bayesPrior) $('bayes-prior').value  = ex.bayesPrior;
  if (ex.bayesSons !== undefined) $('bayes-sons').value = ex.bayesSons;

  clearResults();
}

// ─── Affichage des champs selon le type de calcul ─────────────────────────────

function updateFields() {
  var type = $('calc-type').value;
  $('fields-x-linked').classList.toggle('section-hidden', type !== 'x_linked');
  $('fields-ar').classList.toggle('section-hidden',       type !== 'ar');
  $('fields-ad').classList.toggle('section-hidden',       type !== 'ad');
  $('fields-bayes').classList.toggle('section-hidden',    type !== 'bayes');
  clearResults();
}

// ─── Parsing des probabilités ─────────────────────────────────────────────────

function parseProb(str) {
  if (!str || !str.trim()) throw new Error('Probabilité manquante.');
  str = str.trim();

  // Fraction : "1/4", "2/3"…
  var fracMatch = str.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (fracMatch) {
    var n = parseInt(fracMatch[1], 10);
    var d = parseInt(fracMatch[2], 10);
    if (d === 0) throw new Error('Dénominateur nul.');
    var v = n / d;
    if (v < 0 || v > 1) throw new Error('Probabilité hors de [0, 1] : ' + str);
    return v;
  }

  // Décimale
  var v2 = parseFloat(str);
  if (isNaN(v2)) throw new Error('Valeur invalide : "' + str + '".');
  if (v2 < 0 || v2 > 1) throw new Error('Probabilité hors de [0, 1] : ' + str);
  return v2;
}

// ─── Calcul ───────────────────────────────────────────────────────────────────

function calculate() {
  clearResults();
  var errEl = $('error-area');
  errEl.className = 'hidden';
  errEl.innerHTML = '';

  try {
    var type = $('calc-type').value;
    var steps = [], results = [];

    if (type === 'x_linked') {
      var pm = parseProb($('xl-mother-p').value);
      var sonR = PedigreeLogic.xLinkedRecessiveSonRisk({ motherCarrierProbability: pm });
      var dauR = PedigreeLogic.xLinkedRecessiveDaughterCarrierRisk({ motherCarrierProbability: pm });

      steps.push('P(mère conductrice) renseignée : <span class="fraction-highlight">' + PedigreeLogic._toFractionStr(pm) + '</span>');
      steps.push(sonR.explanation);
      steps.push(dauR.explanation);

      results.push({ label: 'P(fils atteint)',          value: sonR.fractionStr });
      results.push({ label: 'P(fille conductrice)',     value: dauR.fractionStr });

    } else if (type === 'ar') {
      var pm2 = parseProb($('ar-mother-p').value);
      var pf  = parseProb($('ar-father-p').value);
      var r   = PedigreeLogic.autosomalRecessiveRisk({ motherCarrierProbability: pm2, fatherCarrierProbability: pf });

      steps.push('P(mère conductrice) : <span class="fraction-highlight">' + PedigreeLogic._toFractionStr(pm2) + '</span>');
      steps.push('P(père conducteur) : <span class="fraction-highlight">' + PedigreeLogic._toFractionStr(pf) + '</span>');
      steps.push(r.explanation);

      results.push({ label: 'P(enfant atteint)', value: r.fractionStr });

    } else if (type === 'ad') {
      var rawAd = $('ad-parent-p').value.trim();
      var pp = rawAd ? parseProb(rawAd) : 1;
      var r2 = PedigreeLogic.autosomalDominantRisk({ affectedParentHeterozygousProbability: pp });

      steps.push('P(parent hétérozygote Aa) : <span class="fraction-highlight">' + PedigreeLogic._toFractionStr(pp) + '</span>');
      steps.push(r2.explanation);

      results.push({ label: 'P(enfant atteint)', value: r2.fractionStr });

    } else if (type === 'bayes') {
      var prior = parseProb($('bayes-prior').value);
      var nSons = parseInt($('bayes-sons').value, 10);
      if (isNaN(nSons) || nSons < 0) throw new Error('Nombre de fils indemnes invalide.');

      // Tableau Bayes : de 0 jusqu'à nSons
      var bayesRows = [];
      for (var k = 0; k <= nSons; k++) {
        var bk = PedigreeLogic.bayesCarrierAfterUnaffectedSon({ priorCarrierProbability: prior, nUnaffectedSons: k });
        bayesRows.push({ n: k, posterior: bk.fractionStr, riskAffected: bk.riskNextSonAffectedFractionStr, riskUnaffected: bk.riskNextSonUnaffectedFractionStr });
      }
      var finalBayes = PedigreeLogic.bayesCarrierAfterUnaffectedSon({ priorCarrierProbability: prior, nUnaffectedSons: nSons });

      steps.push('P(conductrice) a priori : <span class="fraction-highlight">' + PedigreeLogic._toFractionStr(prior) + '</span>');
      steps.push(finalBayes.explanation.replace(/\n/g, '<br>'));

      results.push({ label: 'P(conductrice) a posteriori',   value: finalBayes.fractionStr });
      results.push({ label: 'P(prochain fils atteint)',       value: finalBayes.riskNextSonAffectedFractionStr });
      results.push({ label: 'P(prochain fils indemne)',       value: finalBayes.riskNextSonUnaffectedFractionStr });

      renderResults(results, steps, bayesRows);
      return;
    }

    renderResults(results, steps, null);

  } catch(e) {
    errEl.innerHTML = '<div class="error-box">' + e.message + '</div>';
    errEl.className = '';
  }
}

// ─── Rendu ────────────────────────────────────────────────────────────────────

function renderResults(results, steps, bayesRows) {
  var area = $('results-area');
  var html = '';

  // Résultats principaux
  html += '<div class="step visible">';
  html += '<div class="step-header"><span class="step-num">✓</span>';
  html += '<div><div class="step-title">Résultats</div></div></div>';
  results.forEach(function(r) {
    html += '<div class="result-row">';
    html += '<span class="result-label">' + r.label + '</span>';
    html += '<span class="result-value fraction-highlight">' + r.value + '</span>';
    html += '</div>';
  });
  html += '</div>';

  // Tableau Bayes
  if (bayesRows && bayesRows.length > 1) {
    html += '<div class="step visible">';
    html += '<div class="step-header"><span class="step-num">2</span>';
    html += '<div><div class="step-title">Évolution de la probabilité de portage</div></div></div>';
    html += '<div class="table-wrapper"><table class="bayes-table">';
    html += '<thead><tr><th>Fils indemnes (n)</th><th>P(conductrice)</th><th>P(prochain fils atteint)</th><th>P(prochain fils indemne)</th></tr></thead><tbody>';
    bayesRows.forEach(function(row) {
      var isLast = row.n === bayesRows[bayesRows.length - 1].n;
      html += '<tr' + (isLast ? ' class="bayes-row-highlight"' : '') + '>';
      html += '<td>' + row.n + '</td><td>' + row.posterior + '</td><td>' + row.riskAffected + '</td><td>' + row.riskUnaffected + '</td>';
      html += '</tr>';
    });
    html += '</tbody></table></div></div>';
  }

  // Étapes détaillées
  html += '<div class="btn-row"><button class="btn btn-show-all" id="btn-steps" onclick="toggleSteps()">▼ Voir les étapes détaillées</button></div>';
  html += '<div id="steps-detail" class="hidden">';
  steps.forEach(function(text, i) {
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
  updateFields();
});
