'use strict';

function $(id) { return document.getElementById(id); }

// ─── Exemples ─────────────────────────────────────────────────────────────────

var EXAMPLES = {
  '1': {
    diseaseName: 'Daltonisme (deutéranopie)',
    affectsLymphocytes: false,
    motherPeaks: '12, 16',
    fatherPeaks: '14',
    affectedMalesPeaks: '12',
    targetLabel: 'Thomas (garçon atteint)',
    targetSex: 'male',
    targetTissue: 'blood',
    peaksWithout: '12',
    peaksWith: '',
  },
  '2': {
    diseaseName: 'Daltonisme (deutéranopie)',
    affectsLymphocytes: false,
    motherPeaks: '12, 16',
    fatherPeaks: '14',
    affectedMalesPeaks: '12',
    targetLabel: 'Sophie (fille à analyser)',
    targetSex: 'female',
    targetTissue: 'blood',
    peaksWithout: '12, 14',
    peaksWith: '12, 14',
  },
  '3': {
    diseaseName: 'X-SCID (déficit immunitaire combiné sévère lié à l\'X)',
    affectsLymphocytes: true,
    motherPeaks: '15, 17',
    fatherPeaks: '13',
    affectedMalesPeaks: '15',
    targetLabel: 'Lucie (fille, sang)',
    targetSex: 'female',
    targetTissue: 'blood',
    peaksWithout: '13, 15',
    peaksWith: '15',
  },
  '4': {
    diseaseName: 'X-SCID (déficit immunitaire combiné sévère lié à l\'X)',
    affectsLymphocytes: true,
    motherPeaks: '15, 17',
    fatherPeaks: '13',
    affectedMalesPeaks: '15',
    targetLabel: 'Clara (fille, cellules buccales)',
    targetSex: 'female',
    targetTissue: 'buccal',
    peaksWithout: '13, 15',
    peaksWith: '13, 15',
  },
  '5': {
    diseaseName: 'X-SCID (déficit immunitaire combiné sévère lié à l\'X)',
    affectsLymphocytes: true,
    motherPeaks: '15, 17',
    fatherPeaks: '13',
    affectedMalesPeaks: '15',
    targetLabel: 'Emma (fille, sang)',
    targetSex: 'female',
    targetTissue: 'blood',
    peaksWithout: '13, 17',
    peaksWith: '13, 17',
  },
};

function loadExample() {
  var ex = EXAMPLES[$('example-select').value];
  if (!ex) return;
  $('disease-name').value          = ex.diseaseName;
  $('affects-lymphocytes').checked = ex.affectsLymphocytes;
  $('mother-peaks').value          = ex.motherPeaks;
  $('father-peaks').value          = ex.fatherPeaks;
  $('affected-males-peaks').value  = ex.affectedMalesPeaks;
  $('target-label').value          = ex.targetLabel;
  $('target-sex').value            = ex.targetSex;
  $('target-tissue').value         = ex.targetTissue;
  $('peaks-without').value         = ex.peaksWithout;
  $('peaks-with').value            = ex.peaksWith;
  clearResults();
}

// ─── Parsing ──────────────────────────────────────────────────────────────────

function parsePeaks(str) {
  if (!str || !str.trim()) return [];
  return str.trim().split(/[\s,]+/)
    .filter(function(s) { return s.length > 0; })
    .map(function(s) {
      var n = parseInt(s, 10);
      if (isNaN(n)) throw new Error('Valeur invalide : "' + s + '". Entrez des nombres entiers.');
      return n;
    });
}

// ─── Analyse principale ───────────────────────────────────────────────────────

function analyse() {
  clearResults();
  var errEl = $('error-area');
  errEl.className = 'hidden';
  errEl.innerHTML = '';

  try {
    var diseaseName       = $('disease-name').value.trim() || 'maladie X-liée';
    var affectsLymphocytes = $('affects-lymphocytes').checked;
    var motherPeaks       = parsePeaks($('mother-peaks').value);
    var fatherPeaks       = parsePeaks($('father-peaks').value);
    var affectedMaleRaw   = parsePeaks($('affected-males-peaks').value);
    var targetLabel       = $('target-label').value.trim() || 'Individu analysé';
    var targetSex         = $('target-sex').value;
    var targetTissue      = $('target-tissue').value;
    var peaksWithout      = parsePeaks($('peaks-without').value);
    var peaksWith         = parsePeaks($('peaks-with').value);

    if (motherPeaks.length === 0) throw new Error('Les pics HUMARA de la mère sont requis.');
    if (peaksWithout.length === 0) throw new Error('Les pics sans HpaII de l\'individu à analyser sont requis.');

    var steps = [];

    // ── Étape 1 : Identification de l'allèle muté ─────────────────────────
    var mutatedAllele = null;
    if (affectedMaleRaw.length > 0) {
      var affectedMales = affectedMaleRaw.map(function(a, i) {
        return { id: 'Garçon atteint ' + (i + 1), maternalAllele: a };
      });
      var mutRes = HumaraLogic.inferMutatedAllele({ affectedMales: affectedMales, diseaseName: diseaseName });
      mutatedAllele = mutRes.mutatedAllele;
      steps.push({
        title: 'Identification de l\'allèle muté',
        content: mutRes.explanation,
        badge: mutRes.consistent
          ? '<span class="xi-badge xi-random">Cohérent</span>'
          : '<span class="xi-badge xi-skewed">Incohérent</span>',
        highlight: 'Allèle X maternel muté : <span class="allele-chip mutated">' + mutatedAllele + '</span>',
      });
    } else {
      steps.push({
        title: 'Allèle muté non déterminé',
        content: 'Aucun garçon atteint renseigné — l\'allèle muté ne peut pas être identifié. L\'analyse de portage sera limitée.',
        badge: '<span class="xi-badge xi-na">Info manquante</span>',
        highlight: null,
      });
    }

    // ── Étape 2 : Origine parentale des allèles ───────────────────────────
    var originRes = HumaraLogic.inferParentalOrigin({
      childPeaks:  peaksWithout,
      motherPeaks: motherPeaks,
      fatherPeaks: fatherPeaks,
      sex:         targetSex,
    });

    var originHighlight = '';
    if (!originRes.ambiguous) {
      originHighlight = 'Allèle maternel : <span class="allele-chip' +
        (originRes.maternalAllele === mutatedAllele ? ' mutated' : ' safe') + '">' +
        originRes.maternalAllele + '</span>';
      if (originRes.paternalAllele !== null) {
        originHighlight += '&emsp;Allèle paternel : <span class="allele-chip">' + originRes.paternalAllele + '</span>';
      }
    } else {
      originHighlight = 'Résultat ambigu — voir explication.';
    }

    steps.push({
      title: 'Origine parentale des allèles',
      content: originRes.explanation,
      badge: originRes.ambiguous
        ? '<span class="xi-badge xi-skewed">Ambigu</span>'
        : '<span class="xi-badge xi-random">Déterminé</span>',
      highlight: originHighlight,
    });

    // ── Étape 3 : Inactivation X (si données HpaII disponibles) ──────────
    var xiRes = null;
    if (peaksWith.length > 0) {
      xiRes = HumaraLogic.interpretXInactivation({
        sex:              targetSex,
        peaksWithHpaII:   peaksWith,
        peaksWithoutHpaII: peaksWithout,
      });

      var xiBadge = '';
      if (xiRes.xInactivationPattern === 'random')   xiBadge = '<span class="xi-badge xi-random">Aléatoire</span>';
      if (xiRes.xInactivationPattern === 'skewed')   xiBadge = '<span class="xi-badge xi-skewed">Biaisée</span>';
      if (xiRes.xInactivationPattern === 'not_applicable') xiBadge = '<span class="xi-badge xi-na">N/A</span>';

      var xiHighlight = '';
      if (xiRes.inactiveXAlleles.length > 0) {
        xiHighlight = 'X inactif : <span class="allele-chip">' + xiRes.inactiveXAlleles.join(', ') + '</span>';
      }
      if (xiRes.activeXAlleles && xiRes.activeXAlleles.length > 0) {
        xiHighlight += '&emsp;X actif : <span class="allele-chip">' + xiRes.activeXAlleles.join(', ') + '</span>';
      }

      steps.push({
        title: 'Profil d\'inactivation X (HpaII)',
        content: xiRes.explanation,
        badge: xiBadge,
        highlight: xiHighlight || null,
      });
    }

    // ── Étape 4 : Évaluation du statut de conductrice ─────────────────────
    var evalRes = null;
    if (targetSex === 'female') {
      var xiPattern    = xiRes ? xiRes.xInactivationPattern : 'not_applicable';
      var inactiveAll  = xiRes ? xiRes.inactiveXAlleles : [];

      evalRes = HumaraLogic.evaluateCarrierLikelihood({
        xInactivationPattern:      xiPattern,
        inactiveXAlleles:          inactiveAll,
        allPeaksWithoutHpaII:      peaksWithout,
        mutatedAllele:             mutatedAllele,
        tissue:                    targetTissue,
        diseaseAffectsLymphocytes: affectsLymphocytes,
      });

      steps.push({
        title: 'Évaluation du statut de conductrice',
        content: evalRes.explanation,
        badge: null,
        highlight: null,
        carrierResult: evalRes.carrierLikelihood,
      });
    }

    renderResults(targetLabel, steps, evalRes);

  } catch(e) {
    errEl.innerHTML = '<div class="error-box">' + e.message + '</div>';
    errEl.className = '';
  }
}

// ─── Rendu ────────────────────────────────────────────────────────────────────

var CARRIER_LABEL = {
  likely:        'Conductrice probable',
  unlikely:      'Probablement non conductrice',
  inconclusive:  'Statut non conclusif',
};
var CARRIER_CLASS = {
  likely:       'carrier-likely',
  unlikely:     'carrier-unlikely',
  inconclusive: 'carrier-inconclusive',
};

function renderResults(label, steps, evalRes) {
  var area = $('results-area');
  var html = '';

  // Résumé conductrice
  if (evalRes) {
    var cls = CARRIER_CLASS[evalRes.carrierLikelihood] || 'carrier-inconclusive';
    html += '<div class="carrier-card ' + cls + '">';
    html += '<div class="carrier-name">' + label + '</div>';
    html += '<div style="font-size:1rem;font-weight:600">' + CARRIER_LABEL[evalRes.carrierLikelihood] + '</div>';
    html += '</div>';
  }

  // Étapes
  html += '<div class="btn-row"><button class="btn btn-show-all" id="btn-steps" onclick="toggleSteps()">▼ Voir les étapes détaillées</button></div>';
  html += '<div id="steps-detail" class="hidden">';

  steps.forEach(function(s, i) {
    html += '<div class="step visible">';
    html += '<div class="step-header">';
    html += '<span class="step-num">' + (i + 1) + '</span>';
    html += '<div><div class="step-title">' + s.title + '</div>';
    if (s.badge) html += '<div style="margin-top:.2rem">' + s.badge + '</div>';
    html += '</div></div>';
    if (s.highlight) {
      html += '<div class="info-box" style="margin:.4rem 0;font-size:.875rem">' + s.highlight + '</div>';
    }
    html += '<div class="step-desc" style="margin-top:.3rem">' + s.content + '</div>';
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
