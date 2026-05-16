/**
 * Tests pour tools/genetic-distance/logic.js
 *
 * Compatible browser (via run-tests.html) ET Node.js :
 *   node tests/genetic-distance.test.js
 */

// ─── Chargement : Node.js ou navigateur ──────────────────────────────────────
var GD = (function() {
  if (typeof require !== 'undefined') {
    var logic = require('../tools/genetic-distance/logic.js');

    // Mini framework de test pour Node.js
    var _p = 0, _f = 0;
    global.describe = function(name, fn) { console.log('\n' + name); fn(); };
    global.it = function(name, fn) {
      try   { fn(); console.log('  ✓ ' + name); _p++; }
      catch (e) { console.error('  ✗ ' + name + '\n    ' + e.message); _f++; }
    };
    global.expect = function(actual) {
      return {
        toBe: function(exp) {
          if (actual !== exp)
            throw new Error('Expected ' + JSON.stringify(exp) + ', got ' + JSON.stringify(actual));
        },
        toBeTruthy: function() {
          if (!actual)
            throw new Error('Expected truthy, got ' + JSON.stringify(actual));
        },
        toBeFalsy: function() {
          if (actual)
            throw new Error('Expected falsy, got ' + JSON.stringify(actual));
        },
      };
    };
    process.on('exit', function() {
      var ok = _f === 0;
      console.log('\n' + (ok ? '✓' : '✗') + ' ' + _p + ' passé(s), ' + _f + ' échoué(s)');
      if (!ok) process.exitCode = 1;
    });

    return logic;
  }

  // Navigateur : logic.js chargé en préalable par run-tests.html
  return self.GeneticDistance;
})();

var detectPhase              = GD.detectPhase;
var formatPhenotype          = GD.formatPhenotype;
var solveTwoGeneTestCross    = GD.solveTwoGeneTestCross;
var solveDistanceFromGeneMap = GD.solveDistanceFromGeneMap;

// ─── Fixtures ─────────────────────────────────────────────────────────────────

var GENES_W_M = [
  {
    key: 'w',
    dominant:  { symbol: 'w+', phenotype: 'rouge' },
    recessive: { symbol: 'w-', phenotype: 'blanc' },
  },
  {
    key: 'm',
    dominant:  { symbol: 'm+', phenotype: 'aile longue' },
    recessive: { symbol: 'm-', phenotype: 'aile miniature' },
  },
];

var GENES_BODY_WINGS = [
  {
    key: 'body',
    dominant:  { symbol: 'gris',        phenotype: 'corps gris'  },
    recessive: { symbol: 'noir',        phenotype: 'corps noir'  },
  },
  {
    key: 'wings',
    dominant:  { symbol: 'normales',    phenotype: 'ailes normales'    },
    recessive: { symbol: 'vestigiales', phenotype: 'ailes vestigiales' },
  },
];

var GENES_WINGS_EYES = [
  {
    key: 'wings',
    dominant:  { symbol: 'normales',    phenotype: 'ailes normales'    },
    recessive: { symbol: 'vestigiales', phenotype: 'ailes vestigiales' },
  },
  {
    key: 'eyes',
    dominant:  { symbol: 'rouges', phenotype: 'yeux rouges' },
    recessive: { symbol: 'bruns',  phenotype: 'yeux bruns'  },
  },
];

var GENES_BODY_EYES = [
  {
    key: 'body',
    dominant:  { symbol: 'gris',   phenotype: 'corps gris'  },
    recessive: { symbol: 'noir',   phenotype: 'corps noir'  },
  },
  {
    key: 'eyes',
    dominant:  { symbol: 'rouges', phenotype: 'yeux rouges' },
    recessive: { symbol: 'bruns',  phenotype: 'yeux bruns'  },
  },
];

// Retrouve une classe phénotypique par son phénotype, lève une erreur si absent.
function classFor(classes, phenotype) {
  var c = classes.find(function(c) { return c.phenotype === phenotype; });
  if (!c) throw new Error('Classe "' + phenotype + '" introuvable dans les résultats');
  return c;
}

// ─── detectPhase ─────────────────────────────────────────────────────────────

describe('detectPhase', function() {
  it('trans : w- m+ / w+ m-  (récessifs séparés)', function() {
    expect(detectPhase([['w-', 'm+'], ['w+', 'm-']], GENES_W_M)).toBe('trans');
  });
  it('cis : w+ m+ / w- m-  (récessifs ensemble sur chr2)', function() {
    expect(detectPhase([['w+', 'm+'], ['w-', 'm-']], GENES_W_M)).toBe('cis');
  });
  it('cis symétrique : w- m- / w+ m+  (récessifs ensemble sur chr1)', function() {
    expect(detectPhase([['w-', 'm-'], ['w+', 'm+']], GENES_W_M)).toBe('cis');
  });
  it('trans symétrique : w+ m- / w- m+', function() {
    expect(detectPhase([['w+', 'm-'], ['w-', 'm+']], GENES_W_M)).toBe('trans');
  });
});

// ─── formatPhenotype ─────────────────────────────────────────────────────────

describe('formatPhenotype', function() {
  it('w+ m+ → rouge et aile longue', function() {
    expect(formatPhenotype(['w+', 'm+'], GENES_W_M)).toBe('rouge et aile longue');
  });
  it('w+ m- → rouge et aile miniature', function() {
    expect(formatPhenotype(['w+', 'm-'], GENES_W_M)).toBe('rouge et aile miniature');
  });
  it('w- m+ → blanc et aile longue', function() {
    expect(formatPhenotype(['w-', 'm+'], GENES_W_M)).toBe('blanc et aile longue');
  });
  it('w- m- → blanc et aile miniature', function() {
    expect(formatPhenotype(['w-', 'm-'], GENES_W_M)).toBe('blanc et aile miniature');
  });
  it('allèle inconnu → erreur', function() {
    var threw = false;
    try { formatPhenotype(['x?', 'm+'], GENES_W_M); } catch (e) { threw = true; }
    expect(threw).toBe(true);
  });
});

// ─── Test 1 : chrX, trans, 34 cM ─────────────────────────────────────────────
// Croisement P : mâle (blanc × longue) × femelle (rouge × miniature)
// F1 : 100 % rouge/longue, femelle en TRANS : w- m+ / w+ m-

describe('Test 1 — chrX, trans, 34 cM', function() {
  var r = solveTwoGeneTestCross({
    genes: GENES_W_M,
    distanceCm: 34,
    femaleF1Haplotypes: [['w-', 'm+'], ['w+', 'm-']],
    testerMaleHaplotype: ['w-', 'm-'],
  });

  it('phase = trans', function() { expect(r.phase).toBe('trans'); });
  it('non indépendants', function() { expect(r.independent).toBe(false); });

  it('rouge et aile longue : 17 % recombinant', function() {
    var c = classFor(r.classes, 'rouge et aile longue');
    expect(c.percentage).toBe(17);
    expect(c.type).toBe('recombinant');
  });
  it('rouge et aile miniature : 33 % parental', function() {
    var c = classFor(r.classes, 'rouge et aile miniature');
    expect(c.percentage).toBe(33);
    expect(c.type).toBe('parental');
  });
  it('blanc et aile longue : 33 % parental', function() {
    var c = classFor(r.classes, 'blanc et aile longue');
    expect(c.percentage).toBe(33);
    expect(c.type).toBe('parental');
  });
  it('blanc et aile miniature : 17 % recombinant', function() {
    var c = classFor(r.classes, 'blanc et aile miniature');
    expect(c.percentage).toBe(17);
    expect(c.type).toBe('recombinant');
  });
  it('total = 100 %', function() {
    var total = r.classes.reduce(function(s, c) { return s + c.percentage; }, 0);
    expect(total).toBe(100);
  });
});

// ─── Test 2 : chrX, cis, 34 cM (mutations côté mère) ─────────────────────────
// Croisement P : femelle (rouge × longue) × mâle (blanc × miniature)
// F1 femelle en CIS : w+ m+ / w- m-

describe('Test 2 — chrX, cis, 34 cM (mutations côté mère)', function() {
  var r = solveTwoGeneTestCross({
    genes: GENES_W_M,
    distanceCm: 34,
    femaleF1Haplotypes: [['w+', 'm+'], ['w-', 'm-']],
    testerMaleHaplotype: ['w-', 'm-'],
  });

  it('phase = cis', function() { expect(r.phase).toBe('cis'); });

  it('rouge et aile longue : 33 % parental', function() {
    var c = classFor(r.classes, 'rouge et aile longue');
    expect(c.percentage).toBe(33);
    expect(c.type).toBe('parental');
  });
  it('rouge et aile miniature : 17 % recombinant', function() {
    var c = classFor(r.classes, 'rouge et aile miniature');
    expect(c.percentage).toBe(17);
    expect(c.type).toBe('recombinant');
  });
  it('blanc et aile longue : 17 % recombinant', function() {
    var c = classFor(r.classes, 'blanc et aile longue');
    expect(c.percentage).toBe(17);
    expect(c.type).toBe('recombinant');
  });
  it('blanc et aile miniature : 33 % parental', function() {
    var c = classFor(r.classes, 'blanc et aile miniature');
    expect(c.percentage).toBe(33);
    expect(c.type).toBe('parental');
  });
  it('total = 100 %', function() {
    var total = r.classes.reduce(function(s, c) { return s + c.percentage; }, 0);
    expect(total).toBe(100);
  });
});

// ─── Test 3 : chrX, cis, 34 cM (mutations côté père) ─────────────────────────
// Croisement P : femelle (blanc × miniature) × mâle (rouge × longue)
// F1 femelle en CIS : w- m- / w+ m+
// RÉSULTAT IDENTIQUE au test 2 — seul compte la phase de la F1

describe('Test 3 — chrX, cis, 34 cM (mutations côté père, même résultat que test 2)', function() {
  var r = solveTwoGeneTestCross({
    genes: GENES_W_M,
    distanceCm: 34,
    femaleF1Haplotypes: [['w-', 'm-'], ['w+', 'm+']],
    testerMaleHaplotype: ['w-', 'm-'],
  });

  it('phase = cis (haplotype inversé par rapport au test 2)', function() {
    expect(r.phase).toBe('cis');
  });
  it('rouge et aile longue : 33 % parental (idem test 2)', function() {
    var c = classFor(r.classes, 'rouge et aile longue');
    expect(c.percentage).toBe(33);
    expect(c.type).toBe('parental');
  });
  it('rouge et aile miniature : 17 % recombinant', function() {
    var c = classFor(r.classes, 'rouge et aile miniature');
    expect(c.percentage).toBe(17);
    expect(c.type).toBe('recombinant');
  });
  it('blanc et aile longue : 17 % recombinant', function() {
    var c = classFor(r.classes, 'blanc et aile longue');
    expect(c.percentage).toBe(17);
    expect(c.type).toBe('recombinant');
  });
  it('blanc et aile miniature : 33 % parental', function() {
    var c = classFor(r.classes, 'blanc et aile miniature');
    expect(c.percentage).toBe(33);
    expect(c.type).toBe('parental');
  });
});

// ─── Test 4 : chrII, body × wings, trans, 30 cM ──────────────────────────────
// Femelle F1 en TRANS : gris vestigiales / noir normales

describe('Test 4 — chrII, body × wings, trans, 30 cM', function() {
  var r = solveTwoGeneTestCross({
    genes: GENES_BODY_WINGS,
    distanceCm: 30,
    femaleF1Haplotypes: [['gris', 'vestigiales'], ['noir', 'normales']],
    testerMaleHaplotype: ['noir', 'vestigiales'],
  });

  it('phase = trans', function() { expect(r.phase).toBe('trans'); });

  it('corps gris et ailes vestigiales : 35 % parental', function() {
    var c = classFor(r.classes, 'corps gris et ailes vestigiales');
    expect(c.percentage).toBe(35);
    expect(c.type).toBe('parental');
  });
  it('corps noir et ailes normales : 35 % parental', function() {
    var c = classFor(r.classes, 'corps noir et ailes normales');
    expect(c.percentage).toBe(35);
    expect(c.type).toBe('parental');
  });
  it('corps gris et ailes normales : 15 % recombinant', function() {
    var c = classFor(r.classes, 'corps gris et ailes normales');
    expect(c.percentage).toBe(15);
    expect(c.type).toBe('recombinant');
  });
  it('corps noir et ailes vestigiales : 15 % recombinant', function() {
    var c = classFor(r.classes, 'corps noir et ailes vestigiales');
    expect(c.percentage).toBe(15);
    expect(c.type).toBe('recombinant');
  });
  it('total = 100 %', function() {
    var total = r.classes.reduce(function(s, c) { return s + c.percentage; }, 0);
    expect(total).toBe(100);
  });
});

// ─── Test 5 : chrII, wings × eyes, cis, 26 cM ───────────────────────────────
// Femelle F1 en CIS : normales rouges / vestigiales bruns

describe('Test 5 — chrII, wings × eyes, cis, 26 cM', function() {
  var r = solveTwoGeneTestCross({
    genes: GENES_WINGS_EYES,
    distanceCm: 26,
    femaleF1Haplotypes: [['normales', 'rouges'], ['vestigiales', 'bruns']],
    testerMaleHaplotype: ['vestigiales', 'bruns'],
  });

  it('phase = cis', function() { expect(r.phase).toBe('cis'); });

  it('ailes normales et yeux rouges : 37 % parental', function() {
    var c = classFor(r.classes, 'ailes normales et yeux rouges');
    expect(c.percentage).toBe(37);
    expect(c.type).toBe('parental');
  });
  it('ailes vestigiales et yeux bruns : 37 % parental', function() {
    var c = classFor(r.classes, 'ailes vestigiales et yeux bruns');
    expect(c.percentage).toBe(37);
    expect(c.type).toBe('parental');
  });
  it('ailes normales et yeux bruns : 13 % recombinant', function() {
    var c = classFor(r.classes, 'ailes normales et yeux bruns');
    expect(c.percentage).toBe(13);
    expect(c.type).toBe('recombinant');
  });
  it('ailes vestigiales et yeux rouges : 13 % recombinant', function() {
    var c = classFor(r.classes, 'ailes vestigiales et yeux rouges');
    expect(c.percentage).toBe(13);
    expect(c.type).toBe('recombinant');
  });
  it('total = 100 %', function() {
    var total = r.classes.reduce(function(s, c) { return s + c.percentage; }, 0);
    expect(total).toBe(100);
  });
});

// ─── Test 6a : solveDistanceFromGeneMap — body-eyes via wings = 56 cM ─────────

describe('Test 6a — solveDistanceFromGeneMap : body-eyes = 30 + 26 = 56 cM', function() {
  var m = solveDistanceFromGeneMap({
    orderedGenes: ['body', 'wings', 'eyes'],
    adjacentDistances: { 'body-wings': 30, 'wings-eyes': 26 },
    selectedGenes: ['body', 'eyes'],
  });

  it('distanceCm = 56', function() { expect(m.distanceCm).toBe(56); });
  it('effectiveRecombinationRate = 50', function() { expect(m.effectiveRecombinationRate).toBe(50); });
  it('independent = true', function() { expect(m.independent).toBe(true); });
  it('explanation contient "56 cM"', function() {
    expect(m.explanation.indexOf('56') !== -1).toBe(true);
  });
});

// ─── Test 6b : solveTwoGeneTestCross — body × eyes, 56 cM → indépendants ─────

describe('Test 6b — solveTwoGeneTestCross : body × eyes, 56 cM → 4 × 25 %', function() {
  var r = solveTwoGeneTestCross({
    genes: GENES_BODY_EYES,
    distanceCm: 56,
    femaleF1Haplotypes: [['gris', 'bruns'], ['noir', 'rouges']],
    testerMaleHaplotype: ['noir', 'bruns'],
  });

  it('independent = true', function() { expect(r.independent).toBe(true); });
  it('corps gris et yeux rouges : 25 %', function() {
    expect(classFor(r.classes, 'corps gris et yeux rouges').percentage).toBe(25);
  });
  it('corps gris et yeux bruns : 25 %', function() {
    expect(classFor(r.classes, 'corps gris et yeux bruns').percentage).toBe(25);
  });
  it('corps noir et yeux rouges : 25 %', function() {
    expect(classFor(r.classes, 'corps noir et yeux rouges').percentage).toBe(25);
  });
  it('corps noir et yeux bruns : 25 %', function() {
    expect(classFor(r.classes, 'corps noir et yeux bruns').percentage).toBe(25);
  });
  it('total = 100 %', function() {
    var total = r.classes.reduce(function(s, c) { return s + c.percentage; }, 0);
    expect(total).toBe(100);
  });
});

// ─── solveDistanceFromGeneMap — paire directe voisine ────────────────────────

describe('solveDistanceFromGeneMap — paire directe wings-eyes = 26 cM', function() {
  var m = solveDistanceFromGeneMap({
    orderedGenes: ['body', 'wings', 'eyes'],
    adjacentDistances: { 'body-wings': 30, 'wings-eyes': 26 },
    selectedGenes: ['wings', 'eyes'],
  });

  it('distanceCm = 26', function() { expect(m.distanceCm).toBe(26); });
  it('effectiveRecombinationRate = 26', function() { expect(m.effectiveRecombinationRate).toBe(26); });
  it('independent = false', function() { expect(m.independent).toBe(false); });
});

// ─── solveDistanceFromGeneMap — ordre inversé ────────────────────────────────

describe('solveDistanceFromGeneMap — sélection dans le sens inverse', function() {
  var m = solveDistanceFromGeneMap({
    orderedGenes: ['body', 'wings', 'eyes'],
    adjacentDistances: { 'body-wings': 30, 'wings-eyes': 26 },
    selectedGenes: ['eyes', 'body'],   // ordre inversé, doit donner 56 quand même
  });

  it('distanceCm = 56 (même résultat dans les deux sens)', function() {
    expect(m.distanceCm).toBe(56);
  });
  it('independent = true', function() { expect(m.independent).toBe(true); });
});

// ─── Gestion des erreurs ──────────────────────────────────────────────────────

describe('Gestion des erreurs', function() {
  it('distanceCm > 100 → erreur', function() {
    var threw = false;
    try {
      solveTwoGeneTestCross({
        genes: GENES_W_M, distanceCm: 150,
        femaleF1Haplotypes: [['w+', 'm+'], ['w-', 'm-']],
      });
    } catch (e) { threw = true; }
    expect(threw).toBe(true);
  });

  it('distanceCm < 0 → erreur', function() {
    var threw = false;
    try {
      solveTwoGeneTestCross({
        genes: GENES_W_M, distanceCm: -5,
        femaleF1Haplotypes: [['w+', 'm+'], ['w-', 'm-']],
      });
    } catch (e) { threw = true; }
    expect(threw).toBe(true);
  });

  it('allèle inconnu dans formatPhenotype → erreur', function() {
    var threw = false;
    try { formatPhenotype(['x?', 'm+'], GENES_W_M); } catch (e) { threw = true; }
    expect(threw).toBe(true);
  });

  it('gène absent de orderedGenes → erreur', function() {
    var threw = false;
    try {
      solveDistanceFromGeneMap({
        orderedGenes: ['body', 'wings'],
        adjacentDistances: { 'body-wings': 30 },
        selectedGenes: ['body', 'eyes'],
      });
    } catch (e) { threw = true; }
    expect(threw).toBe(true);
  });

  it('distance de paire manquante → erreur', function() {
    var threw = false;
    try {
      solveDistanceFromGeneMap({
        orderedGenes: ['body', 'wings', 'eyes'],
        adjacentDistances: { 'body-wings': 30 },   // wings-eyes manquant
        selectedGenes: ['body', 'eyes'],
      });
    } catch (e) { threw = true; }
    expect(threw).toBe(true);
  });
});
