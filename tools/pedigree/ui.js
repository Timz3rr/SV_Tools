'use strict';

function $(id) { return document.getElementById(id); }

// ─── Exemples ─────────────────────────────────────────────────────────────────

var EXAMPLES = {
  'xl': {
    calcType: 'x_linked',
    xlMotherP: '1/4',
  },
  'ar': {
    calcType: 'ar',
    arMotherP: '1/3',
    arFatherP: '1/2',
  },
  'bayes': {
    calcType: 'bayes',
    bayesPrior: '1/2',
    bayesSons: '1',
  },
  'q61': {
    calcType: 'combined',
    caName: 'Cataracte', caType: 'ar',
    caArMc: '1/4', caArMa: '0', caArFc: '0', caArFa: '1',
    cbName: 'Daltonisme', cbType: 'x_linked',
    cbXlMc: '1',
    combSex: 'male',
  },
  'q62': {
    calcType: 'combined',
    caName: 'Cataracte', caType: 'ar',
    caArMc: '1/3', caArMa: '0', caArFc: '1/2', caArFa: '0',
    cbName: 'Daltonisme', cbType: 'x_linked',
    cbXlMc: '1/2',
    combSex: 'male',
  },
};

function loadExample() {
  var ex = EXAMPLES[$('example-select').value];
  if (!ex) return;
  $('calc-type').value = ex.calcType;
  updateFields();

  if (ex.xlMotherP !== undefined)  $('xl-mother-p').value = ex.xlMotherP;
  if (ex.arMotherP !== undefined)  $('ar-mother-p').value = ex.arMotherP;
  if (ex.arFatherP !== undefined)  $('ar-father-p').value = ex.arFatherP;
  if (ex.bayesPrior !== undefined) $('bayes-prior').value = ex.bayesPrior;
  if (ex.bayesSons  !== undefined) $('bayes-sons').value  = ex.bayesSons;

  if (ex.calcType === 'combined') {
    // Maladie A
    if (ex.caName)  $('ca-name').value  = ex.caName;
    if (ex.caType)  { $('ca-type').value = ex.caType; updateCombinedFields('a'); }
    if (ex.caArMc !== undefined) $('ca-ar-mc').value = ex.caArMc;
    if (ex.caArMa !== undefined) $('ca-ar-ma').value = ex.caArMa;
    if (ex.caArFc !== undefined) $('ca-ar-fc').value = ex.caArFc;
    if (ex.caArFa !== undefined) $('ca-ar-fa').value = ex.caArFa;
    if (ex.caXlMc !== undefined) $('ca-xl-mc').value = ex.caXlMc;
    if (ex.caAdMa !== undefined) $('ca-ad-ma').value = ex.caAdMa;
    if (ex.caAdFa !== undefined) $('ca-ad-fa').value = ex.caAdFa;
    // Maladie B
    if (ex.cbName)  $('cb-name').value  = ex.cbName;
    if (ex.cbType)  { $('cb-type').value = ex.cbType; updateCombinedFields('b'); }
    if (ex.cbArMc !== undefined) $('cb-ar-mc').value = ex.cbArMc;
    if (ex.cbArMa !== undefined) $('cb-ar-ma').value = ex.cbArMa;
    if (ex.cbArFc !== undefined) $('cb-ar-fc').value = ex.cbArFc;
    if (ex.cbArFa !== undefined) $('cb-ar-fa').value = ex.cbArFa;
    if (ex.cbXlMc !== undefined) $('cb-xl-mc').value = ex.cbXlMc;
    if (ex.cbAdMa !== undefined) $('cb-ad-ma').value = ex.cbAdMa;
    if (ex.cbAdFa !== undefined) $('cb-ad-fa').value = ex.cbAdFa;
    if (ex.combSex) $('comb-sex').value = ex.combSex;
  }

  clearResults();
}

// ─── Affichage des champs ──────────────────────────────────────────────────────

function updateFields() {
  var type = $('calc-type').value;
  $('fields-x-linked').classList.toggle('section-hidden', type !== 'x_linked');
  $('fields-ar').classList.toggle('section-hidden',       type !== 'ar');
  $('fields-ad').classList.toggle('section-hidden',       type !== 'ad');
  $('fields-bayes').classList.toggle('section-hidden',    type !== 'bayes');
  $('fields-combined').classList.toggle('section-hidden', type !== 'combined');
  clearResults();
}

function updateCombinedFields(ab) {
  var prefix = 'c' + ab;
  var type = $(prefix + '-type').value;
  $(prefix + '-ar').classList.toggle('section-hidden', type !== 'ar');
  $(prefix + '-xl').classList.toggle('section-hidden', type !== 'x_linked');
  $(prefix + '-ad').classList.toggle('section-hidden', type !== 'ad');
}

// ─── Parsing ──────────────────────────────────────────────────────────────────

function parseProb(str, defaultVal) {
  if ((!str || !str.trim()) && defaultVal !== undefined) return defaultVal;
  if (!str || !str.trim()) throw new Error('Probabilité manquante.');
  str = str.trim();
  var fracMatch = str.match(/^(-?\d+)\s*\/\s*(\d+)$/);
  if (fracMatch) {
    var n = parseInt(fracMatch[1], 10);
    var d = parseInt(fracMatch[2], 10);
    if (d === 0) throw new Error('Dénominateur nul.');
    var v = n / d;
    if (v < 0 || v > 1) throw new Error('Probabilité hors [0,1] : ' + str);
    return str; // return as string for engine
  }
  var v2 = parseFloat(str);
  if (isNaN(v2)) throw new Error('Valeur invalide : "' + str + '".');
  if (v2 < 0 || v2 > 1) throw new Error('Probabilité hors [0,1] : ' + str);
  return str;
}

function parseProbFloat(str) {
  if (!str || !str.trim()) return 0;
  str = str.trim();
  var m = str.match(/^(-?\d+)\s*\/\s*(\d+)$/);
  if (m) return parseInt(m[1], 10) / parseInt(m[2], 10);
  return parseFloat(str) || 0;
}

// ─── Calcul ───────────────────────────────────────────────────────────────────

function calculate() {
  clearResults();
  var errEl = $('error-area');
  errEl.className = 'hidden';
  errEl.innerHTML = '';

  try {
    var type = $('calc-type').value;

    if (type === 'combined') {
      calculateCombined();
      return;
    }

    var steps = [], results = [];

    if (type === 'x_linked') {
      var pm = parseProbFloat($('xl-mother-p').value);
      var sonR = PedigreeLogic.xLinkedRecessiveSonRisk({ motherCarrierProbability: pm });
      var dauR = PedigreeLogic.xLinkedRecessiveDaughterCarrierRisk({ motherCarrierProbability: pm });
      steps.push('P(mère conductrice) = <span class="fraction-highlight">' + PedigreeLogic._toFractionStr(pm) + '</span>');
      steps.push(sonR.explanation);
      steps.push(dauR.explanation);
      results.push({ label: 'P(fils atteint)',      value: sonR.fractionStr });
      results.push({ label: 'P(fille conductrice)', value: dauR.fractionStr });

    } else if (type === 'ar') {
      var pm2 = parseProbFloat($('ar-mother-p').value);
      var pf  = parseProbFloat($('ar-father-p').value);
      var r   = PedigreeLogic.autosomalRecessiveRisk({ motherCarrierProbability: pm2, fatherCarrierProbability: pf });
      steps.push('P(mère conductrice) = <span class="fraction-highlight">' + PedigreeLogic._toFractionStr(pm2) + '</span>');
      steps.push('P(père conducteur) = <span class="fraction-highlight">' + PedigreeLogic._toFractionStr(pf) + '</span>');
      steps.push(r.explanation);
      results.push({ label: 'P(enfant atteint)', value: r.fractionStr });

    } else if (type === 'ad') {
      var rawAd = $('ad-parent-p').value.trim();
      var pp = rawAd ? parseProbFloat(rawAd) : 1;
      var r2 = PedigreeLogic.autosomalDominantRisk({ affectedParentHeterozygousProbability: pp });
      steps.push('P(parent hétérozygote Aa) = <span class="fraction-highlight">' + PedigreeLogic._toFractionStr(pp) + '</span>');
      steps.push(r2.explanation);
      results.push({ label: 'P(enfant atteint)', value: r2.fractionStr });

    } else if (type === 'bayes') {
      var prior = parseProbFloat($('bayes-prior').value);
      var nSons = parseInt($('bayes-sons').value, 10);
      if (isNaN(nSons) || nSons < 0) throw new Error('Nombre de fils indemnes invalide.');

      // Utilise PedigreeEngine pour fractions exactes
      var bayesResult = PedigreeEngine.bayesXLinkedAfterUnaffectedSons(
        $('bayes-prior').value.trim() || String(prior), nSons);

      var bayesRows = [];
      for (var k = 0; k <= nSons; k++) {
        var bk = PedigreeEngine.bayesXLinkedAfterUnaffectedSons(
          $('bayes-prior').value.trim() || String(prior), k);
        bayesRows.push({
          n: k,
          posterior:     bk.posteriorCarrierProbability,
          riskAffected:  bk.riskNextSonAffected,
          riskUnaffected:bk.riskNextSonUnaffected,
        });
      }

      steps.push('P(conductrice) a priori = <span class="fraction-highlight">' + bayesResult._posteriorFraction ? '' : '' + '</span>');
      bayesResult.explanationSteps.forEach(function(s) {
        steps.push('<span class="fraction-highlight" style="all:unset">' + s + '</span>');
      });

      results.push({ label: 'P(conductrice) a posteriori', value: bayesResult.posteriorCarrierProbability });
      results.push({ label: 'P(prochain fils atteint)',     value: bayesResult.riskNextSonAffected });
      results.push({ label: 'P(prochain fils indemne)',     value: bayesResult.riskNextSonUnaffected });

      renderResults(results, bayesResult.explanationSteps, bayesRows);
      return;
    }

    renderResults(results, steps, null);

  } catch(e) {
    errEl.innerHTML = '<div class="error-box">' + e.message + '</div>';
    errEl.className = '';
  }
}

// ─── Mapping types ────────────────────────────────────────────────────────────

var TYPE_MAP = {
  'ar':       'autosomal_recessive',
  'x_linked': 'x_linked_recessive',
  'ad':       'autosomal_dominant',
};

// ─── Mode combined ────────────────────────────────────────────────────────────

function buildDiseaseOverride(prefix) {
  var type = $(prefix + '-type').value;
  var mother = { sex: 'female', id: 'mother', phenotypes: {}, statusOverrides: {} };
  var father = { sex: 'male',   id: 'father', phenotypes: {}, statusOverrides: {} };

  var ov = {};
  if (type === 'x_linked') {
    var mc = parseProb($('c' + prefix[1] + '-xl-mc') ? $(prefix.replace('c','c') + '-xl-mc').value : '', '0');
    ov.mother = { carrierProbability: mc, affectedProbability: '0', source: 'saisie' };
    ov.father = { carrierProbability: '0', affectedProbability: '0', source: 'saisie' };
  } else if (type === 'ar') {
    ov.mother = {
      carrierProbability:  parseProb($(prefix + '-ar-mc').value, '0'),
      affectedProbability: parseProb($(prefix + '-ar-ma').value, '0'),
      source: 'saisie',
    };
    ov.father = {
      carrierProbability:  parseProb($(prefix + '-ar-fc').value, '0'),
      affectedProbability: parseProb($(prefix + '-ar-fa').value, '0'),
      source: 'saisie',
    };
  } else if (type === 'ad') {
    ov.mother = { carrierProbability: parseProb($(prefix + '-ad-ma').value, '0'), affectedProbability: parseProb($(prefix + '-ad-ma').value, '0'), source: 'saisie' };
    ov.father = { carrierProbability: parseProb($(prefix + '-ad-fa').value, '0'), affectedProbability: parseProb($(prefix + '-ad-fa').value, '0'), source: 'saisie' };
  }
  return { type: type, overrides: ov };
}

function calculateCombined() {
  var errEl = $('error-area');
  var childSex = $('comb-sex').value;
  var nameA = $('ca-name').value.trim() || 'Maladie A';
  var nameB = $('cb-name').value.trim() || 'Maladie B';

  // Build pedigree
  var typeA = $('ca-type').value;
  var typeB = $('cb-type').value;

  var motherOverrides = {}, fatherOverrides = {};

  // Disease A
  if (typeA === 'x_linked') {
    var mc = ($('ca-xl-mc').value || '').trim() || '0';
    motherOverrides['dA'] = { carrierProbability: mc,  affectedProbability: '0', source: 'saisie' };
    fatherOverrides['dA'] = { carrierProbability: '0', affectedProbability: '0', source: 'saisie' };
  } else if (typeA === 'ar') {
    motherOverrides['dA'] = { carrierProbability: ($('ca-ar-mc').value||'0').trim(), affectedProbability: ($('ca-ar-ma').value||'0').trim(), source: 'saisie' };
    fatherOverrides['dA'] = { carrierProbability: ($('ca-ar-fc').value||'0').trim(), affectedProbability: ($('ca-ar-fa').value||'0').trim(), source: 'saisie' };
  } else if (typeA === 'ad') {
    motherOverrides['dA'] = { carrierProbability: ($('ca-ad-ma').value||'0').trim(), affectedProbability: ($('ca-ad-ma').value||'0').trim(), source: 'saisie' };
    fatherOverrides['dA'] = { carrierProbability: ($('ca-ad-fa').value||'0').trim(), affectedProbability: ($('ca-ad-fa').value||'0').trim(), source: 'saisie' };
  }

  // Disease B
  if (typeB === 'x_linked') {
    var mc2 = ($('cb-xl-mc').value || '').trim() || '0';
    motherOverrides['dB'] = { carrierProbability: mc2,  affectedProbability: '0', source: 'saisie' };
    fatherOverrides['dB'] = { carrierProbability: '0',  affectedProbability: '0', source: 'saisie' };
  } else if (typeB === 'ar') {
    motherOverrides['dB'] = { carrierProbability: ($('cb-ar-mc').value||'0').trim(), affectedProbability: ($('cb-ar-ma').value||'0').trim(), source: 'saisie' };
    fatherOverrides['dB'] = { carrierProbability: ($('cb-ar-fc').value||'0').trim(), affectedProbability: ($('cb-ar-fa').value||'0').trim(), source: 'saisie' };
  } else if (typeB === 'ad') {
    motherOverrides['dB'] = { carrierProbability: ($('cb-ad-ma').value||'0').trim(), affectedProbability: ($('cb-ad-ma').value||'0').trim(), source: 'saisie' };
    fatherOverrides['dB'] = { carrierProbability: ($('cb-ad-fa').value||'0').trim(), affectedProbability: ($('cb-ad-fa').value||'0').trim(), source: 'saisie' };
  }

  var pedigree = {
    diseases: {
      dA: { name: nameA, inheritance: TYPE_MAP[typeA] || typeA },
      dB: { name: nameB, inheritance: TYPE_MAP[typeB] || typeB },
    },
    people: {
      mother: { id: 'mother', sex: 'female', phenotypes: {}, statusOverrides: motherOverrides },
      father: { id: 'father', sex: 'male',   phenotypes: {}, statusOverrides: fatherOverrides },
    },
    couples: [],
  };

  var result = PedigreeEngine.solvePedigreeQuestion(pedigree, {
    type: 'future_child_combined_risk',
    parents: ['mother', 'father'],
    childSex: childSex,
    diseases: ['dA', 'dB'],
  });

  renderCombined(result, nameA, nameB, childSex);
}

// ─── Rendu Combined ───────────────────────────────────────────────────────────

function renderCombined(result, nameA, nameB, childSex) {
  var area = $('results-area');
  var sexLabel = childSex === 'male' ? 'fils' : 'fille';
  var rA = result.childRisks['dA'];
  var rB = result.childRisks['dB'];
  var c  = result.combined;

  var html = '';

  // Risques individuels
  html += '<div class="step visible">';
  html += '<div class="step-header"><span class="step-num">1</span><div><div class="step-title">Risques individuels pour un ' + sexLabel + '</div></div></div>';
  html += '<div class="result-row"><span class="result-label">P(' + nameA + ')</span><span class="result-value fraction-highlight">' + rA + '</span></div>';
  html += '<div class="result-row"><span class="result-label">P(' + nameB + ')</span><span class="result-value fraction-highlight">' + rB + '</span></div>';
  html += '</div>';

  // Tableau combiné
  if (c) {
    html += '<div class="step visible">';
    html += '<div class="step-header"><span class="step-num">2</span><div><div class="step-title">Combinaisons (maladies indépendantes)</div></div></div>';
    html += '<table class="comb-table">';
    html += '<thead><tr><th>Situation</th><th>Probabilité</th></tr></thead><tbody>';

    var rows = [
      { label: nameA + ' <b>et</b> ' + nameB,               val: c.both },
      { label: nameA + ' seul (sans ' + nameB + ')',         val: c.onlyA },
      { label: nameB + ' seul (sans ' + nameA + ')',         val: c.onlyB },
      { label: 'Aucune des deux maladies',                   val: c.neither },
    ];

    rows.forEach(function(r) {
      html += '<tr><td>' + r.label + '</td><td class="comb-frac">' + r.val + '</td></tr>';
    });
    html += '</tbody></table></div>';
  }

  // Étapes détaillées
  html += '<div class="btn-row"><button class="btn btn-show-all" id="btn-steps" onclick="toggleSteps()">▼ Voir les étapes détaillées</button></div>';
  html += '<div id="steps-detail" class="hidden">';
  result.explanationSteps.forEach(function(text, i) {
    html += '<div class="step visible">';
    html += '<div class="step-header"><span class="step-num">' + (i + 1) + '</span><div class="step-title">Étape ' + (i + 1) + '</div></div>';
    html += '<div class="step-desc">' + text + '</div>';
    html += '</div>';
  });
  html += '</div>';

  area.innerHTML = html;
  area.className = '';
  area.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ─── Rendu standard ───────────────────────────────────────────────────────────

function renderResults(results, steps, bayesRows) {
  var area = $('results-area');
  var html = '';

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
  updateCombinedFields('a');
  updateCombinedFields('b');
});
