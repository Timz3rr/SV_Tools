'use strict';

function $(id) { return document.getElementById(id); }

// ─── Lecture des entrées ──────────────────────────────────────────────────────

function readGenes() {
  return [0, 1].map(function(i) {
    return {
      key:       $(('gene-' + i + '-key')).value.trim(),
      dominant:  { symbol: $('gene-' + i + '-dom-sym').value.trim(),
                   phenotype: $('gene-' + i + '-dom-phe').value.trim() },
      recessive: { symbol: $('gene-' + i + '-rec-sym').value.trim(),
                   phenotype: $('gene-' + i + '-rec-phe').value.trim() },
    };
  });
}

function readHaplotypes() {
  return [
    [$('h1-g0').value, $('h1-g1').value],
    [$('h2-g0').value, $('h2-g1').value],
  ];
}

// ─── Sélecteurs d'haplotypes ──────────────────────────────────────────────────

function updateHaplotypeSelects() {
  var genes = readGenes();

  function repopulate(ids, geneIdx) {
    ids.forEach(function(id) {
      var sel  = $(id);
      var prev = sel.value;
      sel.innerHTML = '';
      var symbols = [
        genes[geneIdx].dominant.symbol  || ('dom' + geneIdx),
        genes[geneIdx].recessive.symbol || ('rec' + geneIdx),
      ];
      symbols.forEach(function(sym) {
        var opt = document.createElement('option');
        opt.value = opt.textContent = sym;
        if (sym === prev) opt.selected = true;
        sel.appendChild(opt);
      });
    });
  }

  repopulate(['h1-g0', 'h2-g0'], 0);
  repopulate(['h1-g1', 'h2-g1'], 1);
  updatePhaseIndicator();
}

function setSelect(id, value) {
  var sel = $(id);
  for (var i = 0; i < sel.options.length; i++) {
    if (sel.options[i].value === value) { sel.selectedIndex = i; return; }
  }
}

// ─── Indicateur de phase (live) ───────────────────────────────────────────────

function updatePhaseIndicator() {
  var el = $('phase-indicator');
  try {
    var genes = readGenes();
    var h     = readHaplotypes();
    // Besoin d'au moins des symboles non vides
    if (!genes[0].dominant.symbol || !genes[0].recessive.symbol ||
        !genes[1].dominant.symbol || !genes[1].recessive.symbol) {
      el.innerHTML = ''; return;
    }
    var phase = GeneticDistance.detectPhase(h, genes);
    var color = phase === 'cis' ? '#0d6efd' : '#198754';
    el.innerHTML =
      '<span class="result-value" style="background:' + color +
      ';color:#fff;font-size:.85rem;margin-top:.3rem;display:inline-block">' +
      'Phase : ' + phase.toUpperCase() + '</span>';
  } catch(e) {
    el.innerHTML = '';
  }
}

// ─── Carte génétique à 3 gènes ────────────────────────────────────────────────

function updateMapPairOptions() {
  var g0 = $('map-gene-0').value.trim() || 'gène 1';
  var g1 = $('map-gene-1').value.trim() || 'gène 2';
  var g2 = $('map-gene-2').value.trim() || 'gène 3';
  var sel  = $('map-pair');
  var prev = sel.value;
  sel.innerHTML = '';

  // La paire extrême est proposée en premier (cas le plus courant = non voisins)
  [[g0, g2], [g0, g1], [g1, g2]].forEach(function(p) {
    var opt = document.createElement('option');
    opt.value = p[0] + ',' + p[1];
    opt.textContent = p[0] + '  ×  ' + p[1];
    if (opt.value === prev) opt.selected = true;
    sel.appendChild(opt);
  });
}

function computeGeneMap() {
  var g0  = $('map-gene-0').value.trim();
  var g1  = $('map-gene-1').value.trim();
  var g2  = $('map-gene-2').value.trim();
  var d01 = parseFloat($('map-dist-01').value);
  var d12 = parseFloat($('map-dist-12').value);
  var resultEl = $('map-result');
  resultEl.innerHTML = '';

  if (!g0 || !g1 || !g2 || isNaN(d01) || isNaN(d12)) {
    resultEl.innerHTML = '<div class="error-box mt-1">Remplis les 3 noms de gènes et les 2 distances.</div>';
    return;
  }

  try {
    var pair = $('map-pair').value.split(',');
    var adj  = {};
    adj[g0 + '-' + g1] = d01;
    adj[g1 + '-' + g2] = d12;

    var r = GeneticDistance.solveDistanceFromGeneMap({
      orderedGenes:      [g0, g1, g2],
      adjacentDistances: adj,
      selectedGenes:     pair,
    });

    var html = '<div class="info-box mt-1">' + r.explanation + '</div>';
    if (r.independent) {
      html += '<p class="text-muted mt-1" style="font-size:.85rem">' +
              '→ Distance effective utilisée : <span class="result-value">50 cM</span></p>';
    }
    resultEl.innerHTML = html;

    // Remplir automatiquement la distance principale
    $('distance-input').value = r.distanceCm;

  } catch(e) {
    resultEl.innerHTML = '<div class="error-box mt-1">' + e.message + '</div>';
  }
}

// ─── Charger exemple ──────────────────────────────────────────────────────────
// Exemple : chromosome X de la drosophile, trans, 34 cM
// Croisement P : ♂ blanc/longue  ×  ♀ rouge/miniature
// F1 ♀ en trans : w− m+ / w+ m−

function loadExample() {
  $('gene-0-key').value     = 'w';
  $('gene-0-dom-sym').value = 'w+';
  $('gene-0-dom-phe').value = 'rouge';
  $('gene-0-rec-sym').value = 'w-';
  $('gene-0-rec-phe').value = 'blanc';

  $('gene-1-key').value     = 'm';
  $('gene-1-dom-sym').value = 'm+';
  $('gene-1-dom-phe').value = 'aile longue';
  $('gene-1-rec-sym').value = 'm-';
  $('gene-1-rec-phe').value = 'aile miniature';

  $('distance-input').value = '34';

  updateHaplotypeSelects();  // reconstruit les options

  setSelect('h1-g0', 'w-');  // Chr 1 : w− · m+
  setSelect('h1-g1', 'm+');
  setSelect('h2-g0', 'w+');  // Chr 2 : w+ · m−
  setSelect('h2-g1', 'm-');

  updatePhaseIndicator();
  clearResults();
}

// ─── Calcul ───────────────────────────────────────────────────────────────────

function calculate() {
  clearResults();
  var errorEl = $('error-area');
  errorEl.className = 'hidden';
  errorEl.innerHTML = '';

  try {
    var genes      = readGenes();
    var distanceCm = parseFloat($('distance-input').value);
    var haplotypes = readHaplotypes();

    // Validation basique
    if (!genes[0].key || !genes[1].key)
      throw new Error('Définis les deux gènes avant de calculer.');
    if (isNaN(distanceCm))
      throw new Error('Entre une distance en cM (0 à 100).');

    var result = GeneticDistance.solveTwoGeneTestCross({
      genes:               genes,
      distanceCm:          distanceCm,
      femaleF1Haplotypes:  haplotypes,
    });

    renderResults(result);

  } catch(e) {
    errorEl.innerHTML  = '<div class="error-box">' + e.message + '</div>';
    errorEl.className  = '';
  }
}

// ─── Rendu des résultats ──────────────────────────────────────────────────────

function renderResults(result) {
  var area = $('results-area');

  // ── Tableau principal ──────────────────────────────────────────────────
  var phaseInfo = result.independent
    ? 'Gènes <strong>indépendants</strong> (distance ≥ 50 cM)'
    : 'Phase F1 : <strong>' + result.phase.toUpperCase() + '</strong> — distance : ' +
      result.recombinationRate + ' cM — recombinants : ' + result.recombinationRate + ' %';

  var tableHtml = '<div class="step visible">'
    + '<div class="step-header">'
    + '<span class="step-num">✓</span>'
    + '<div>'
    + '<div class="step-title">Résultats du croisement-test</div>'
    + '<div class="step-desc">' + phaseInfo + '</div>'
    + '</div></div>'
    + '<div class="table-wrapper"><table>'
    + '<thead><tr>'
    + '<th>Phénotype F2</th><th>Haplotype</th><th>% attendu</th><th>Classe</th>'
    + '</tr></thead><tbody>';

  result.classes.forEach(function(c) {
    var typeClass = 'class-' + c.type;
    var typeLabel = c.type === 'parental'    ? 'parental'
                 : c.type === 'recombinant'  ? 'recombinant'
                 : '—';
    tableHtml +=
      '<tr>'
      + '<td>' + c.phenotype + '</td>'
      + '<td class="mono">' + c.haplotype.join(' · ') + '</td>'
      + '<td class="highlight">' + c.percentage + ' %</td>'
      + '<td class="' + typeClass + '">' + typeLabel + '</td>'
      + '</tr>';
  });

  tableHtml += '</tbody></table></div></div>';

  // ── Bouton "Voir les étapes" ───────────────────────────────────────────
  var btnHtml =
    '<div class="btn-row">'
    + '<button class="btn btn-show-all" id="btn-steps" onclick="toggleSteps()">'
    + '▼ Voir les étapes détaillées</button>'
    + '</div>';

  // ── Étapes numérotées (masquées par défaut) ────────────────────────────
  var stepsHtml = '<div id="steps-detail" class="hidden">';

  result.explanationSteps.forEach(function(text, i) {
    stepsHtml +=
      '<div class="step visible">'
      + '<div class="step-header">'
      + '<span class="step-num">' + (i + 1) + '</span>'
      + '<div class="step-title">Étape ' + (i + 1) + '</div>'
      + '</div>'
      + '<div class="step-desc" style="white-space:pre-line">' + text + '</div>'
      + '</div>';
  });

  stepsHtml += '</div>';

  area.innerHTML = tableHtml + btnHtml + stepsHtml;
  area.className = '';

  // Scroll vers les résultats
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
  var area = $('results-area');
  area.className = 'hidden';
  area.innerHTML = '';
}

// ─── Initialisation ───────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', function() {
  // Reconstruire les selects quand les symboles d'allèles changent
  ['gene-0-dom-sym', 'gene-0-rec-sym', 'gene-1-dom-sym', 'gene-1-rec-sym',
   'gene-0-key', 'gene-0-dom-phe', 'gene-0-rec-phe',
   'gene-1-key', 'gene-1-dom-phe', 'gene-1-rec-phe'].forEach(function(id) {
    $(id).addEventListener('input', updateHaplotypeSelects);
  });

  // Mettre à jour la phase en temps réel
  ['h1-g0', 'h1-g1', 'h2-g0', 'h2-g1'].forEach(function(id) {
    $(id).addEventListener('change', updatePhaseIndicator);
  });

  // Mettre à jour les options de paire quand les noms de gènes changent
  ['map-gene-0', 'map-gene-1', 'map-gene-2'].forEach(function(id) {
    $(id).addEventListener('input', updateMapPairOptions);
  });

  // État initial
  updateHaplotypeSelects();
  updateMapPairOptions();
});
