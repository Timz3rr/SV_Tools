/**
 * logic.js — Solveur de distances génétiques chez la drosophile
 * Fonctions pures uniquement. Zéro DOM, zéro effet de bord.
 */

// ─── detectPhase ─────────────────────────────────────────────────────────────
/**
 * Détermine si la femelle F1 est en cis ou en trans.
 *
 * Cis  : les deux allèles récessifs sont sur le même chromosome (ex. AB/ab ou ab/AB)
 * Trans : les allèles récessifs sont sur des chromosomes différents (ex. Ab/aB)
 *
 * @param {string[][]} femaleF1Haplotypes  [[allèle_gène0, allèle_gène1], [allèle_gène0, allèle_gène1]]
 * @param {object[]}   genes               tableau de 2 descripteurs de gène
 * @returns {'cis'|'trans'}
 */
function detectPhase(femaleF1Haplotypes, genes) {
  if (!femaleF1Haplotypes || femaleF1Haplotypes.length !== 2)
    throw new Error('femaleF1Haplotypes doit contenir exactement 2 haplotypes');
  if (!genes || genes.length !== 2)
    throw new Error('detectPhase nécessite exactement 2 gènes');

  const h = femaleF1Haplotypes[0];

  // isRec = true si l'allèle correspond au symbole récessif du gène
  const isRec0 = h[0] === genes[0].recessive.symbol;
  const isRec1 = h[1] === genes[1].recessive.symbol;

  // Cis : les deux sont récessifs OU les deux sont dominants sur le même haplotype
  return (isRec0 === isRec1) ? 'cis' : 'trans';
}

// ─── formatPhenotype ─────────────────────────────────────────────────────────
/**
 * Traduit un haplotype (tableau d'allèles) en phénotype lisible.
 * Ex. ['w+', 'm-'] → 'rouge et aile miniature'
 *
 * @param {string[]} haplotype   ex. ['w+', 'm-']
 * @param {object[]} genes       tableau de descripteurs de gène
 * @returns {string}
 */
function formatPhenotype(haplotype, genes) {
  return haplotype.map((allele, i) => {
    const gene = genes[i];
    if (allele === gene.dominant.symbol)  return gene.dominant.phenotype;
    if (allele === gene.recessive.symbol) return gene.recessive.phenotype;
    throw new Error(`Allèle "${allele}" inconnu pour le gène "${gene.key}"`);
  }).join(' et ');
}

// ─── solveTwoGeneTestCross ────────────────────────────────────────────────────
/**
 * Calcule les proportions phénotypiques d'un croisement-test à deux gènes liés.
 *
 * Règle biologique :
 *   distance < 50 cM  → parentaux (100-d)/2 %, recombinants d/2 %
 *   distance ≥ 50 cM  → gènes indépendants, 4 classes à 25 % chacune
 *
 * @param {{
 *   genes: object[],
 *   distanceCm: number,
 *   femaleF1Haplotypes: string[][],
 *   testerMaleHaplotype?: string[]
 * }} input
 * @returns {{
 *   phase: string,
 *   recombinationRate: number,
 *   independent: boolean,
 *   classes: object[],
 *   explanationSteps: string[]
 * }}
 */
function solveTwoGeneTestCross(input) {
  const { genes, distanceCm, femaleF1Haplotypes } = input;

  if (!genes || genes.length !== 2)
    throw new Error('solveTwoGeneTestCross nécessite exactement 2 gènes');
  if (typeof distanceCm !== 'number' || distanceCm < 0 || distanceCm > 100)
    throw new Error('distanceCm doit être un nombre entre 0 et 100');
  if (!femaleF1Haplotypes || femaleF1Haplotypes.length !== 2)
    throw new Error('femaleF1Haplotypes doit contenir exactement 2 haplotypes');

  const phase       = detectPhase(femaleF1Haplotypes, genes);
  const independent = distanceCm >= 50;
  const effectiveRate = independent ? 50 : distanceCm;

  const [h1, h2] = femaleF1Haplotypes;

  // Les 4 haplotypes possibles, triés : dom-dom, dom-rec, rec-dom, rec-rec
  const allHaplotypes = [
    [genes[0].dominant.symbol,  genes[1].dominant.symbol],
    [genes[0].dominant.symbol,  genes[1].recessive.symbol],
    [genes[0].recessive.symbol, genes[1].dominant.symbol],
    [genes[0].recessive.symbol, genes[1].recessive.symbol],
  ];

  // Les deux haplotypes portés par la femelle F1 sont les classes parentales
  const parentalSet = new Set([JSON.stringify(h1), JSON.stringify(h2)]);

  const classes = allHaplotypes.map(function(hap) {
    const hapStr = JSON.stringify(hap);
    var percentage, type;

    if (independent) {
      percentage = 25;
      type = 'independent';
    } else if (parentalSet.has(hapStr)) {
      percentage = (100 - effectiveRate) / 2;
      type = 'parental';
    } else {
      percentage = effectiveRate / 2;
      type = 'recombinant';
    }

    return {
      haplotype: hap,
      phenotype: formatPhenotype(hap, genes),
      percentage: percentage,
      type: type,
    };
  });

  var explanationSteps = _buildExplanationSteps(
    phase, distanceCm, effectiveRate, independent, genes, h1, h2, classes
  );

  return {
    phase: phase,
    recombinationRate: distanceCm,
    independent: independent,
    classes: classes,
    explanationSteps: explanationSteps,
  };
}

// ─── _buildExplanationSteps (privé) ──────────────────────────────────────────
function _buildExplanationSteps(phase, distanceCm, effectiveRate, independent, genes, h1, h2, classes) {
  var steps = [];

  steps.push(
    'Phase de la femelle F1 : ' + phase + '.\n' +
    'Chromosome 1 : ' + h1.join(' ') + '  |  Chromosome 2 : ' + h2.join(' ') + '.'
  );

  if (independent) {
    steps.push(
      'Distance = ' + distanceCm + ' cM ≥ 50 cM → les gènes sont considérés comme indépendants.\n' +
      'Taux de recombinaison effectif = 50 %.'
    );
    steps.push('Les 4 classes phénotypiques sont équiprobables : 25 % chacune.');
  } else {
    var parentalPct = (100 - effectiveRate) / 2;
    var recombPct   = effectiveRate / 2;

    steps.push(
      'Distance = ' + distanceCm + ' cM → ' + distanceCm + ' % de recombinants.'
    );
    steps.push(
      'Gamètes parentaux  : (100 − ' + distanceCm + ') / 2 = ' + parentalPct + ' % chacun.\n' +
      'Gamètes recombinants : ' + distanceCm + ' / 2 = ' + recombPct + ' % chacun.'
    );

    var parentals    = classes.filter(function(c) { return c.type === 'parental'; });
    var recombinants = classes.filter(function(c) { return c.type === 'recombinant'; });

    steps.push(
      'Classes parentales : ' +
      parentals.map(function(c) { return c.phenotype + ' (' + c.percentage + ' %)'; }).join(', ') + '.'
    );
    steps.push(
      'Classes recombinantes : ' +
      recombinants.map(function(c) { return c.phenotype + ' (' + c.percentage + ' %)'; }).join(', ') + '.'
    );
  }

  return steps;
}

// ─── solveDistanceFromGeneMap ─────────────────────────────────────────────────
/**
 * Calcule la distance entre deux gènes en additionnant les distances des segments
 * intermédiaires sur une carte génétique linéaire.
 *
 * Si la distance calculée ≥ 50 cM, les gènes sont traités comme indépendants
 * (effectiveRecombinationRate = 50).
 *
 * @param {{
 *   orderedGenes: string[],
 *   adjacentDistances: object,
 *   selectedGenes: [string, string]
 * }} input
 * @returns {{
 *   distanceCm: number,
 *   effectiveRecombinationRate: number,
 *   independent: boolean,
 *   explanation: string
 * }}
 */
function solveDistanceFromGeneMap(input) {
  var orderedGenes     = input.orderedGenes;
  var adjacentDistances = input.adjacentDistances;
  var selectedGenes    = input.selectedGenes;

  if (!orderedGenes || orderedGenes.length < 2)
    throw new Error('orderedGenes doit contenir au moins 2 gènes');
  if (!selectedGenes || selectedGenes.length !== 2)
    throw new Error('selectedGenes doit contenir exactement 2 gènes');

  var i = orderedGenes.indexOf(selectedGenes[0]);
  var j = orderedGenes.indexOf(selectedGenes[1]);

  if (i === -1) throw new Error('Gène "' + selectedGenes[0] + '" introuvable dans orderedGenes');
  if (j === -1) throw new Error('Gène "' + selectedGenes[1] + '" introuvable dans orderedGenes');
  if (i === j)  throw new Error('selectedGenes doit contenir deux gènes différents');

  var start = Math.min(i, j);
  var end   = Math.max(i, j);

  var total  = 0;
  var values = [];

  for (var k = start; k < end; k++) {
    var gA     = orderedGenes[k];
    var gB     = orderedGenes[k + 1];
    var key    = gA + '-' + gB;
    var revKey = gB + '-' + gA;

    var d = adjacentDistances.hasOwnProperty(key)    ? adjacentDistances[key]
          : adjacentDistances.hasOwnProperty(revKey) ? adjacentDistances[revKey]
          : undefined;

    if (d === undefined)
      throw new Error('Distance introuvable pour la paire ' + key);

    total += d;
    values.push(d);
  }

  var independent              = total >= 50;
  var effectiveRecombinationRate = independent ? 50 : total;

  // Formule textuelle : "30 + 26 = 56 cM" ou simplement "26 cM"
  var formula = values.length === 1
    ? values[0] + ' cM'
    : values.join(' + ') + ' = ' + total + ' cM';

  var explanation = independent
    ? 'La distance ' + selectedGenes[0] + '-' + selectedGenes[1] +
      ' vaut ' + formula + ', donc supérieure à 50 cM.' +
      ' Les gènes sont considérés comme indépendants.'
    : 'La distance ' + selectedGenes[0] + '-' + selectedGenes[1] +
      ' vaut ' + formula + '.';

  return {
    distanceCm: total,
    effectiveRecombinationRate: effectiveRecombinationRate,
    independent: independent,
    explanation: explanation,
  };
}

// ─── Exposition ───────────────────────────────────────────────────────────────
// Browser : window.GeneticDistance
// Node.js : module.exports
(function(exports) {
  exports.detectPhase             = detectPhase;
  exports.formatPhenotype         = formatPhenotype;
  exports.solveTwoGeneTestCross   = solveTwoGeneTestCross;
  exports.solveDistanceFromGeneMap = solveDistanceFromGeneMap;
})(typeof module !== 'undefined' && module.exports
   ? module.exports
   : (function() { return (self.GeneticDistance = {}); })());
