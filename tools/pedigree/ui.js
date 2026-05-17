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
  $('fields-builder').classList.toggle('section-hidden',  type !== 'builder');
  // Hide/show the calculate button
  var calcBtn = $('calc-button');
  if (calcBtn) calcBtn.style.display = (type === 'builder') ? 'none' : '';
  clearResults();
  // Render builder tree when switching to builder mode
  if (type === 'builder') {
    builderRender();
  }
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
  // Hook up builder onChange
  if (typeof PedigreeBuilder !== 'undefined') {
    PedigreeBuilder.onChange(function() {
      if ($('calc-type').value === 'builder') {
        builderRender();
      }
    });
  }
});

// ─── Builder ──────────────────────────────────────────────────────────────────

var _editingPersonId = null;

function builderRender() {
  if (typeof PedigreeRenderer === 'undefined' || typeof PedigreeBuilder === 'undefined') return;
  PedigreeRenderer.render(PedigreeBuilder.getState(), 'pedigree-tree');
  builderRefreshSelects();
}

function builderRefreshSelects() {
  var state = PedigreeBuilder.getState();

  // Refresh person selects
  var options = '<option value="">--</option>' +
    Object.values(state.people).map(function(p) {
      return '<option value="' + p.id + '">' + p.name + '</option>';
    }).join('');
  $('cf-p1').innerHTML = options;
  $('cf-p2').innerHTML = options;

  // Refresh couple select
  var coupleOptions = '<option value="">-- Couple --</option>' +
    state.couples.map(function(c) {
      var p1 = state.people[c.parents[0]];
      var p2 = state.people[c.parents[1]];
      return '<option value="' + c.id + '">' +
        (p1 ? p1.name : c.parents[0]) + ' × ' + (p2 ? p2.name : (c.parents[1] || '?')) + '</option>';
    }).join('');
  $('chf-couple').innerHTML = coupleOptions;

  // Refresh disease list display
  var diseaseListEl = $('disease-list');
  if (diseaseListEl) {
    diseaseListEl.innerHTML = Object.entries(state.diseases).map(function(entry) {
      var id = entry[0], d = entry[1];
      var inhLabel = d.inheritance
        .replace('autosomal_recessive', 'AR réc.')
        .replace('x_linked_recessive', 'XL réc.')
        .replace('autosomal_dominant', 'AD dom.');
      return '<div class="disease-tag">' +
        '<span class="disease-color-dot" style="background:' + d.color + '"></span>' +
        d.name + ' <small>(' + id + ', ' + inhLabel + ')</small>' +
        '<button class="btn-sm btn-danger" onclick="builderRemoveDisease(\'' + id + '\')" style="margin-left:.3rem;padding:.05rem .3rem;font-size:.7rem">×</button>' +
        '</div>';
    }).join('');
  }

  // Refresh phenotype inputs for person/child forms
  builderRefreshPhenotypeInputs('pf-phenotypes', 'pf-ph-');
  builderRefreshPhenotypeInputs('chf-phenotypes', 'chf-ph-');

  // Refresh risk calculator and bayes selects
  rcRefreshSelects();
}

function builderRefreshPhenotypeInputs(containerId, prefix) {
  var state = PedigreeBuilder.getState();
  var el = $(containerId);
  if (!el) return;
  var diseaseIds = Object.keys(state.diseases);
  if (!diseaseIds.length) { el.innerHTML = ''; return; }
  el.innerHTML = diseaseIds.map(function(dId) {
    var d = state.diseases[dId];
    return '<label><span style="color:' + d.color + '">●</span>&nbsp;' + d.name + ':' +
      '<select id="' + prefix + dId + '" style="font-size:.75rem;padding:.15rem">' +
        '<option value="unknown">?</option>' +
        '<option value="unaffected">sain</option>' +
        '<option value="carrier">porteur</option>' +
        '<option value="affected">atteint</option>' +
      '</select></label>';
  }).join('');
}

function builderAddDisease() {
  try {
    var id    = $('df-id').value.trim();
    var name  = $('df-name').value.trim();
    var inh   = $('df-inh').value;
    var color = $('df-color').value;
    if (!id || !name) throw new Error('ID et nom requis.');
    PedigreeBuilder.addDisease(id, name, inh, color);
    $('df-id').value = ''; $('df-name').value = '';
  } catch(e) { alert(e.message); }
}

function builderRemoveDisease(id) {
  if (confirm('Supprimer la maladie "' + id + '" ?')) PedigreeBuilder.removeDisease(id);
}

function builderAddPerson() {
  try {
    var name = $('pf-name').value.trim();
    if (!name) throw new Error('Le nom est requis.');
    var sex  = $('pf-sex').value;
    var gen  = parseInt($('pf-gen').value) || 1;
    var phenotypes = builderCollectPhenotypes('pf-ph-');
    // Use name as ID by default (names like "II2" work as IDs)
    PedigreeBuilder.addPerson({ id: name, name: name, sex: sex, generation: gen, phenotypes: phenotypes });
    $('pf-name').value = '';
  } catch(e) { alert(e.message); }
}

function builderCollectPhenotypes(prefix) {
  var state = PedigreeBuilder.getState();
  var ph = {};
  Object.keys(state.diseases).forEach(function(dId) {
    var el = $(prefix + dId);
    if (el) ph[dId] = el.value;
  });
  return ph;
}

function builderAddCouple() {
  var fb = $('couple-feedback');
  try {
    var p1 = $('cf-p1').value, p2 = $('cf-p2').value;
    if (!p1 || !p2 || p1 === p2) throw new Error('Sélectionnez deux individus différents.');
    var state = PedigreeBuilder.getState();
    var person1 = state.people[p1], person2 = state.people[p2];
    var warnings = [];
    if (person1 && person2 && person1.generation !== person2.generation) {
      warnings.push('⚠ Générations différentes (' + person1.name + ': gén.' + person1.generation +
        ', ' + person2.name + ': gén.' + person2.generation + ')');
    }
    // Check if either person is already in a couple
    state.couples.forEach(function(c) {
      if (c.parents.indexOf(p1) !== -1) warnings.push('⚠ ' + (person1 ? person1.name : p1) + ' est déjà dans un couple.');
      if (c.parents.indexOf(p2) !== -1) warnings.push('⚠ ' + (person2 ? person2.name : p2) + ' est déjà dans un couple.');
    });
    PedigreeBuilder.addCouple(p1, p2);
    var n1 = person1 ? person1.name : p1, n2 = person2 ? person2.name : p2;
    var msg = '✓ Couple créé : ' + n1 + ' × ' + n2;
    if (warnings.length) msg += '<br><span style="color:#856404">' + warnings.join('<br>') + '</span>';
    fb.innerHTML = msg;
    fb.style.color = '#0a3622';
  } catch(e) {
    if (fb) { fb.innerHTML = '✗ ' + e.message; fb.style.color = '#842029'; }
    else alert(e.message);
  }
}

function builderAddChild() {
  try {
    var coupleId = $('chf-couple').value;
    var name = $('chf-name').value.trim();
    if (!name) throw new Error('Le nom est requis.');
    var sex  = $('chf-sex').value;
    var state = PedigreeBuilder.getState();
    var couple = state.couples.find(function(c) { return c.id === coupleId; });
    if (!couple) throw new Error('Sélectionnez un couple.');
    var parentGens = couple.parents.map(function(pid) {
      return (state.people[pid] && state.people[pid].generation) || 1;
    });
    var childGen = Math.max.apply(null, parentGens) + 1;
    var phenotypes = builderCollectPhenotypes('chf-ph-');
    // Use name as ID by default
    PedigreeBuilder.addNewChild(coupleId, { id: name, name: name, sex: sex, generation: childGen, phenotypes: phenotypes });
    $('chf-name').value = '';
  } catch(e) { alert(e.message); }
}

// Click on person in tree → open edit panel
window.PedigreeUI = {
  onPersonClick: function(personId) {
    var state = PedigreeBuilder.getState();
    var p = state.people[personId];
    if (!p) return;
    _editingPersonId = personId;
    $('ep-name-label').textContent = p.name;
    $('ep-name').value = p.name;
    $('ep-sex').value  = p.sex;
    $('ep-gen').value  = p.generation;
    // Render phenotype selects with current values
    var diseaseIds = Object.keys(state.diseases);
    $('ep-phenotypes').innerHTML = diseaseIds.map(function(dId) {
      var d = state.diseases[dId];
      var val = (p.phenotypes && p.phenotypes[dId]) || 'unknown';
      return '<label><span style="color:' + d.color + '">●</span>&nbsp;' + d.name + ':' +
        '<select id="ep-ph-' + dId + '" style="font-size:.75rem;padding:.15rem">' +
          ['unknown', 'unaffected', 'carrier', 'affected'].map(function(s) {
            return '<option value="' + s + '"' + (val === s ? ' selected' : '') + '>' +
              ({ unknown: '?', unaffected: 'sain', carrier: 'porteur', affected: 'atteint' }[s]) +
              '</option>';
          }).join('') +
        '</select></label>';
    }).join('');
    $('edit-person-panel').style.display = 'block';
  }
};

function builderEditPersonSave() {
  if (!_editingPersonId) return;
  var state = PedigreeBuilder.getState();
  var ph = {};
  Object.keys(state.diseases).forEach(function(dId) {
    var el = $('ep-ph-' + dId);
    if (el) ph[dId] = el.value;
  });
  PedigreeBuilder.editPerson(_editingPersonId, {
    name:       $('ep-name').value.trim(),
    sex:        $('ep-sex').value,
    generation: parseInt($('ep-gen').value) || 1,
    phenotypes: ph,
  });
  $('edit-person-panel').style.display = 'none';
}

function builderRemovePerson() {
  if (!_editingPersonId) return;
  if (confirm('Supprimer "' + _editingPersonId + '" ?')) {
    PedigreeBuilder.removePerson(_editingPersonId);
    $('edit-person-panel').style.display = 'none';
    _editingPersonId = null;
  }
}

function builderExport() {
  $('pedigree-json-text').value = PedigreeBuilder.exportJSON();
  $('builder-json-section').style.display = 'block';
  $('builder-json-section').scrollIntoView({ behavior: 'smooth' });
}

function builderImportOpen() {
  $('pedigree-json-text').value = PedigreeBuilder.exportJSON();
  $('builder-json-section').style.display = 'block';
}

function builderImportFromTextarea() {
  try {
    var json = $('pedigree-json-text').value;
    PedigreeBuilder.importJSON(json);
    alert('Arbre importé avec succès !');
  } catch(e) { alert('JSON invalide : ' + e.message); }
}

function builderDownloadJSON() {
  var json = PedigreeBuilder.exportJSON();
  var blob = new Blob([json], { type: 'application/json' });
  var url  = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url; a.download = 'pedigree.json'; a.click();
  URL.revokeObjectURL(url);
}

function builderLoadQ6() {
  PedigreeBuilder.importJSON(PedigreeExamples.Q6);
}

function builderReset() {
  if (confirm('Réinitialiser l\'arbre ?')) PedigreeBuilder.reset();
}

// ─── Risk Calculator (Builder) ────────────────────────────────────────────────

function rcRefreshSelects() {
  var state = PedigreeBuilder ? PedigreeBuilder.getState() : null;
  if (!state) return;
  var people = Object.values(state.people);
  var pOpts = '<option value="">--</option>' +
    people.map(function(p) {
      return '<option value="' + p.id + '">' + p.name + '</option>';
    }).join('');
  var rcP1 = $('rc-p1'), rcP2 = $('rc-p2'), btMother = $('bt-mother');
  if (rcP1) rcP1.innerHTML = pOpts;
  if (rcP2) rcP2.innerHTML = pOpts;
  if (btMother) btMother.innerHTML = pOpts;

  var diseases = Object.entries(state.diseases);
  var dOpts = '<option value="">-- Maladie --</option>' +
    diseases.map(function(e) {
      return '<option value="' + e[0] + '">' + e[1].name + '</option>';
    }).join('');
  var dOptsOpt = '<option value="">-- (aucune) --</option>' +
    diseases.map(function(e) {
      return '<option value="' + e[0] + '">' + e[1].name + '</option>';
    }).join('');
  var rcDA = $('rc-dA'), rcDB = $('rc-dB');
  if (rcDA) rcDA.innerHTML = dOpts;
  if (rcDB) rcDB.innerHTML = dOptsOpt;

  var btDisease = $('bt-disease');
  if (btDisease) {
    btDisease.innerHTML = '<option value="">-- Maladie XL --</option>' +
      diseases.filter(function(e) { return e[1].inheritance === 'x_linked_recessive'; })
        .map(function(e) { return '<option value="' + e[0] + '">' + e[1].name + '</option>'; })
        .join('');
  }
}

function rcLoadQ61() {
  var state = PedigreeBuilder.getState();
  if (!state.people['Aline'] || !state.people['Bob']) {
    alert('Chargez d\'abord l\'exemple Q6.');
    return;
  }
  $('rc-p1').value = 'Aline';
  $('rc-p2').value = 'Bob';
  $('rc-sex').value = 'male';
  $('rc-dA').value = 'cataract';
  $('rc-dB').value = 'colorblindness';
  $('rc-ov-dA').value = '';
  $('rc-ov-dB').value = '';
  $('rc-result').innerHTML = '';
}

function rcLoadQ62() {
  var state = PedigreeBuilder.getState();
  if (!state.people['Kevin'] || !state.people['Zoe']) {
    alert('Chargez d\'abord l\'exemple Q6.');
    return;
  }
  $('rc-p1').value = 'Kevin';
  $('rc-p2').value = 'Zoe';
  $('rc-sex').value = 'male';
  $('rc-dA').value = 'cataract';
  $('rc-dB').value = 'colorblindness';
  $('rc-ov-dA').value = '';
  $('rc-ov-dB').value = '';
  $('rc-result').innerHTML = '';
}

function rcCalculate() {
  var resultEl = $('rc-result');
  try {
    var state    = PedigreeBuilder.getState();
    var p1Id     = $('rc-p1').value;
    var p2Id     = $('rc-p2').value;
    var childSex = $('rc-sex').value;
    var dAId     = $('rc-dA').value;
    var dBId     = $('rc-dB').value;

    if (!p1Id || !p2Id) throw new Error('Sélectionnez deux parents.');
    if (p1Id === p2Id)  throw new Error('Les deux parents doivent être différents.');
    if (!dAId)          throw new Error('Sélectionnez au moins une maladie.');

    var diseases = dBId ? [dAId, dBId] : [dAId];

    // Check riskOverrides first
    var ovKey = [p1Id, p2Id].sort().join('_') + '_' + childSex;
    var ov    = state.riskOverrides && state.riskOverrides[ovKey];
    var result, source;

    if (ov) {
      source = 'override manuel';
      var childRisks = {};
      diseases.forEach(function(dId) { childRisks[dId] = ov[dId] || '?'; });
      result = { childRisks: childRisks, combined: null, explanationSteps: ['Valeurs issues d\'un override manuel du pedigree.'] };
      if (diseases.length === 2 && ov[dAId] && ov[dBId]) {
        var combined = PedigreeEngine.combineChildRisks({
          riskA:  ov[dAId],
          riskB:  ov[dBId],
          labelA: state.diseases[dAId] ? state.diseases[dAId].name : dAId,
          labelB: state.diseases[dBId] ? state.diseases[dBId].name : dBId,
        });
        result.combined = combined;
        result.explanationSteps = combined.explanation || result.explanationSteps;
      }
    } else {
      source = 'calculé automatiquement';
      result = PedigreeEngine.solvePedigreeQuestion(state, {
        type:     'future_child_combined_risk',
        parents:  [p1Id, p2Id],
        childSex: childSex,
        diseases: diseases,
      });
    }

    // Apply manual field overrides if filled
    var ovDA = ($('rc-ov-dA').value || '').trim();
    var ovDB = ($('rc-ov-dB').value || '').trim();
    if (ovDA || ovDB) {
      source = 'override manuel (champ)';
      if (ovDA) result.childRisks[dAId] = ovDA;
      if (ovDB && dBId) result.childRisks[dBId] = ovDB;
      if (diseases.length === 2 && result.childRisks[dAId] && result.childRisks[dBId]) {
        result.combined = PedigreeEngine.combineChildRisks({
          riskA:  result.childRisks[dAId],
          riskB:  result.childRisks[dBId],
          labelA: state.diseases[dAId] ? state.diseases[dAId].name : dAId,
          labelB: state.diseases[dBId] ? state.diseases[dBId].name : dBId,
        });
      }
    }

    rcRenderResult(result, state, diseases, source);
  } catch(e) {
    resultEl.innerHTML = '<div class="error-box">' + e.message + '</div>';
  }
}

function rcRenderResult(result, state, diseases, source) {
  var resultEl = $('rc-result');
  var dAId = diseases[0], dBId = diseases[1];
  var nameA = state.diseases[dAId] ? state.diseases[dAId].name : dAId;
  var nameB = dBId && state.diseases[dBId] ? state.diseases[dBId].name : (dBId || '');
  var badgeCls = source.indexOf('override') !== -1 ? 'badge-override' : 'badge-inferred';
  var badge = '<span class="badge-source ' + badgeCls + '">' + source + '</span>';

  var html = '<div style="font-size:.85rem">';
  html += '<div style="margin-bottom:.4rem"><b>Risques individuels</b> ' + badge + '</div>';
  diseases.forEach(function(dId) {
    var name = state.diseases[dId] ? state.diseases[dId].name : dId;
    var val  = result.childRisks[dId] || '?';
    html += '<div class="result-row"><span class="result-label">P(' + name + ')</span>';
    html += '<span class="result-value fraction-highlight">' + val + '</span></div>';
  });

  if (result.combined && dBId) {
    html += '<div style="margin-top:.75rem;margin-bottom:.4rem"><b>Combinaisons</b></div>';
    html += '<table class="comb-table">';
    html += '<thead><tr><th>Situation</th><th>Probabilité</th></tr></thead><tbody>';
    var c = result.combined;
    [
      { label: nameA + ' <b>et</b> ' + nameB, val: c.both },
      { label: nameA + ' seul',               val: c.onlyA },
      { label: nameB + ' seul',               val: c.onlyB },
      { label: 'Aucune des deux',             val: c.neither },
    ].forEach(function(r) {
      html += '<tr><td>' + r.label + '</td><td class="comb-frac">' + r.val + '</td></tr>';
    });
    html += '</tbody></table>';
  }

  if (result.explanationSteps && result.explanationSteps.length) {
    html += '<details style="margin-top:.5rem"><summary style="cursor:pointer;font-size:.8rem;color:var(--text-muted)">▶ Étapes détaillées</summary>';
    result.explanationSteps.forEach(function(s) {
      html += '<div style="font-size:.8rem;padding:.2rem 0;border-bottom:1px solid var(--border)">' + s + '</div>';
    });
    html += '</details>';
  }
  html += '</div>';
  resultEl.innerHTML = html;
}

// ─── Bayes Panel (Builder) ────────────────────────────────────────────────────

function btLoadQ63() {
  var state = PedigreeBuilder.getState();
  if (!state.people['III2']) {
    alert('Chargez d\'abord l\'exemple Q6.');
    return;
  }
  $('bt-mother').value  = 'III2';
  $('bt-disease').value = 'colorblindness';
  var p   = state.people['III2'];
  var ovCb = p.statusOverrides && p.statusOverrides['colorblindness'];
  $('bt-prior').value = ovCb ? ovCb.carrierProbability : '1/2';
  $('bt-sons').value  = '1';
  $('bt-result').innerHTML = '';
}

function btCalculate() {
  var resultEl = $('bt-result');
  try {
    var prior = ($('bt-prior').value || '').trim();
    var nSons = parseInt($('bt-sons').value, 10);
    if (!prior)                    throw new Error('Entrez une probabilité a priori.');
    if (isNaN(nSons) || nSons < 0) throw new Error('Nombre de fils indemnes invalide.');

    var r = PedigreeEngine.bayesXLinkedAfterUnaffectedSons(prior, nSons);

    var html = '';
    html += '<div class="result-row"><span class="result-label">P(conductrice) a posteriori</span>';
    html += '<span class="result-value fraction-highlight">' + r.posteriorCarrierProbability + '</span></div>';
    html += '<div class="result-row"><span class="result-label">P(prochain fils atteint)</span>';
    html += '<span class="result-value fraction-highlight">' + r.riskNextSonAffected + '</span></div>';
    html += '<div class="result-row"><span class="result-label">P(prochain fils indemne)</span>';
    html += '<span class="result-value fraction-highlight">' + r.riskNextSonUnaffected + '</span></div>';

    // Evolution table
    if (nSons >= 1) {
      html += '<table class="comb-table" style="margin-top:.5rem">';
      html += '<thead><tr><th>Fils indemnes (n)</th><th>P(conductrice)</th><th>P(fils atteint)</th></tr></thead><tbody>';
      for (var k = 0; k <= nSons; k++) {
        var rk = PedigreeEngine.bayesXLinkedAfterUnaffectedSons(prior, k);
        html += '<tr' + (k === nSons ? ' style="background:var(--highlight)"' : '') + '>';
        html += '<td>' + k + '</td><td>' + rk.posteriorCarrierProbability + '</td><td>' + rk.riskNextSonAffected + '</td>';
        html += '</tr>';
      }
      html += '</tbody></table>';
    }

    if (r.explanationSteps && r.explanationSteps.length) {
      html += '<details style="margin-top:.5rem"><summary style="cursor:pointer;font-size:.8rem;color:var(--text-muted)">▶ Étapes détaillées</summary>';
      r.explanationSteps.forEach(function(s) {
        html += '<div style="font-size:.8rem;padding:.2rem 0;border-bottom:1px solid var(--border)">' + s + '</div>';
      });
      html += '</details>';
    }

    resultEl.innerHTML = html;
  } catch(e) {
    resultEl.innerHTML = '<div class="error-box">' + e.message + '</div>';
  }
}
