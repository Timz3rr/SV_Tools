/**
 * Tests pour tools/humara/humaraLogic.js
 * Compatible Node.js (node tests/humara.test.js) et navigateur (run-tests.html)
 */

// ─── Chargement ───────────────────────────────────────────────────────────────
var HL = (function() {
  if (typeof require !== 'undefined') {
    var logic = require('../tools/humara/humaraLogic.js');

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
        toEqual: function(exp) {
          var a = JSON.stringify(actual), b = JSON.stringify(exp);
          if (a !== b) throw new Error('Expected\n  ' + b + '\ngot\n  ' + a);
        },
        toBeTruthy: function() {
          if (!actual) throw new Error('Expected truthy, got ' + JSON.stringify(actual));
        },
        toBeFalsy: function() {
          if (actual) throw new Error('Expected falsy, got ' + JSON.stringify(actual));
        },
        toContain: function(item) {
          if (Array.isArray(actual)) {
            if (actual.indexOf(item) === -1)
              throw new Error('Expected array to contain ' + JSON.stringify(item));
          } else if (typeof actual === 'string') {
            if (actual.indexOf(item) === -1)
              throw new Error('Expected string to contain ' + JSON.stringify(item));
          } else {
            throw new Error('toContain requires array or string');
          }
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
  return self.HumaraLogic;
})();

var inferOrigin    = HL.inferParentalOrigin;
var inferMutated   = HL.inferMutatedAllele;
var predictHpaII   = HL.predictHpaIIAfterPCR;
var interpretXI    = HL.interpretXInactivation;
var evalCarrier    = HL.evaluateCarrierLikelihood;

// ─────────────────────────────────────────────────────────────────────────────
// FAMILLE 1 — Daltonisme (deutéranopie, X-lié récessif)
//
// Mère     : allèles HUMARA [12, 16]
// Père     : allèle  HUMARA [14]  (indemne)
// Thomas   : garçon atteint, pic [12]   → allèle maternel 12 = muté
// Marc     : garçon indemne, pic [16]
// Sophie   : fille,  pics [12, 14]       → conductrice potentielle
// Nathalie : fille,  pics [14, 16]       → non-conductrice
// ─────────────────────────────────────────────────────────────────────────────

describe('Famille 1 — Daltonisme : inferParentalOrigin', function() {

  it('Thomas (garçon atteint) : allèle maternel = 12, paternel = null', function() {
    var r = inferOrigin({ childPeaks: [12], motherPeaks: [12, 16], fatherPeaks: [14], sex: 'male' });
    expect(r.maternalAllele).toBe(12);
    expect(r.paternalAllele).toBe(null);
    expect(r.ambiguous).toBeFalsy();
  });

  it('Marc (garçon indemne) : allèle maternel = 16', function() {
    var r = inferOrigin({ childPeaks: [16], motherPeaks: [12, 16], fatherPeaks: [14], sex: 'male' });
    expect(r.maternalAllele).toBe(16);
    expect(r.paternalAllele).toBe(null);
    expect(r.ambiguous).toBeFalsy();
  });

  it('Sophie (fille) : maternel = 12, paternel = 14', function() {
    var r = inferOrigin({ childPeaks: [12, 14], motherPeaks: [12, 16], fatherPeaks: [14], sex: 'female' });
    expect(r.maternalAllele).toBe(12);
    expect(r.paternalAllele).toBe(14);
    expect(r.ambiguous).toBeFalsy();
  });

  it('Nathalie (fille) : maternel = 16, paternel = 14', function() {
    var r = inferOrigin({ childPeaks: [14, 16], motherPeaks: [12, 16], fatherPeaks: [14], sex: 'female' });
    expect(r.maternalAllele).toBe(16);
    expect(r.paternalAllele).toBe(14);
    expect(r.ambiguous).toBeFalsy();
  });

  it('Fille homozygote (pics [14, 14]) : résultat ambigu', function() {
    var r = inferOrigin({ childPeaks: [14], motherPeaks: [12, 14], fatherPeaks: [14], sex: 'female' });
    expect(r.ambiguous).toBeTruthy();
  });

  it('Garçon avec allèle absent chez la mère : lève une erreur', function() {
    expect(function() {
      inferOrigin({ childPeaks: [99], motherPeaks: [12, 16], fatherPeaks: [14], sex: 'male' });
    }).toThrow = (function(fn) {
      try { fn(); return false; } catch(e) { return true; }
    })(function() {
      inferOrigin({ childPeaks: [99], motherPeaks: [12, 16], fatherPeaks: [14], sex: 'male' });
    });
    // Vérification directe
    var threw = false;
    try { inferOrigin({ childPeaks: [99], motherPeaks: [12, 16], fatherPeaks: [14], sex: 'male' }); }
    catch(e) { threw = true; }
    expect(threw).toBeTruthy();
  });

});

describe('Famille 1 — Daltonisme : inferMutatedAllele', function() {

  it('Thomas seul → allèle muté = 12', function() {
    var r = inferMutated({
      affectedMales: [{ id: 'Thomas', maternalAllele: 12 }],
      diseaseName: 'daltonisme'
    });
    expect(r.mutatedAllele).toBe(12);
    expect(r.consistent).toBeTruthy();
  });

  it('Deux garçons atteints, même allèle maternel → cohérent', function() {
    var r = inferMutated({
      affectedMales: [
        { id: 'Thomas', maternalAllele: 12 },
        { id: 'Cousin', maternalAllele: 12 }
      ],
      diseaseName: 'daltonisme'
    });
    expect(r.mutatedAllele).toBe(12);
    expect(r.consistent).toBeTruthy();
  });

  it('Deux garçons atteints avec allèles différents → incohérent', function() {
    var r = inferMutated({
      affectedMales: [
        { id: 'A', maternalAllele: 12 },
        { id: 'B', maternalAllele: 16 }
      ]
    });
    expect(r.consistent).toBeFalsy();
  });

  it('Aucun garçon atteint → lève une erreur', function() {
    var threw = false;
    try { inferMutated({ affectedMales: [] }); }
    catch(e) { threw = true; }
    expect(threw).toBeTruthy();
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// FAMILLE 2 — Déficit immunitaire combiné sévère lié à l'X (X-SCID)
//
// Maladie affectant la viabilité des lymphocytes.
//
// Mère    : allèles HUMARA [15, 17]
// Père    : allèle  HUMARA [13]
// Alexis  : garçon atteint, pic [15]  → allèle maternel 15 = muté
//
// Lucie   : fille, sang
//   sans HpaII : [13, 15]   (a hérité de l'allèle paternel 13 et maternel muté 15)
//   avec HpaII : [15]       → inactivation biaisée → conductrice
//
// Emma    : fille, sang
//   sans HpaII : [13, 17]   (allèle paternel 13 et maternel normal 17)
//   avec HpaII : [13, 17]   → inactivation aléatoire → non-conductrice
//
// Clara   : fille, cellules buccales
//   sans HpaII : [13, 15]
//   avec HpaII : [13, 15]   → aléatoire (tissu buccal) → non conclusif
// ─────────────────────────────────────────────────────────────────────────────

var MUTATED_ALLELE_FAM2 = 15;

describe('Famille 2 — X-SCID : inferParentalOrigin & inferMutatedAllele', function() {

  it('Alexis (garçon atteint) : allèle maternel = 15', function() {
    var r = inferOrigin({ childPeaks: [15], motherPeaks: [15, 17], fatherPeaks: [13], sex: 'male' });
    expect(r.maternalAllele).toBe(15);
    expect(r.paternalAllele).toBe(null);
    expect(r.ambiguous).toBeFalsy();
  });

  it('Lucie : allèle maternel = 15, paternel = 13', function() {
    var r = inferOrigin({ childPeaks: [13, 15], motherPeaks: [15, 17], fatherPeaks: [13], sex: 'female' });
    expect(r.maternalAllele).toBe(15);
    expect(r.paternalAllele).toBe(13);
    expect(r.ambiguous).toBeFalsy();
  });

  it('Emma : allèle maternel = 17, paternel = 13', function() {
    var r = inferOrigin({ childPeaks: [13, 17], motherPeaks: [15, 17], fatherPeaks: [13], sex: 'female' });
    expect(r.maternalAllele).toBe(17);
    expect(r.paternalAllele).toBe(13);
    expect(r.ambiguous).toBeFalsy();
  });

  it('inferMutatedAllele depuis Alexis → allèle muté = 15', function() {
    var r = inferMutated({
      affectedMales: [{ id: 'Alexis', maternalAllele: 15 }],
      diseaseName: 'X-SCID'
    });
    expect(r.mutatedAllele).toBe(15);
    expect(r.consistent).toBeTruthy();
  });

});

describe('Famille 2 — X-SCID : predictHpaIIAfterPCR', function() {

  it('Père (homme) : aucun pic attendu après HpaII', function() {
    var r = predictHpaII({ sex: 'male', maternalAllele: 13, paternalAllele: null,
      mutatedAllele: null, isCarrier: false, tissue: 'blood', diseaseAffectsLymphocytes: true });
    expect(r.expectedPeaks).toEqual([]);
    expect(r.xInactivationExpected).toBe('not_applicable');
  });

  it('Lucie (conductrice, sang, X-SCID) : pic attendu = [15] seulement', function() {
    var r = predictHpaII({ sex: 'female', maternalAllele: 15, paternalAllele: 13,
      mutatedAllele: MUTATED_ALLELE_FAM2, isCarrier: true,
      tissue: 'blood', diseaseAffectsLymphocytes: true });
    expect(r.expectedPeaks).toEqual([15]);
    expect(r.xInactivationExpected).toBe('skewed');
  });

  it('Emma (non-conductrice, sang) : deux pics attendus [13, 17]', function() {
    var r = predictHpaII({ sex: 'female', maternalAllele: 17, paternalAllele: 13,
      mutatedAllele: MUTATED_ALLELE_FAM2, isCarrier: false,
      tissue: 'blood', diseaseAffectsLymphocytes: true });
    expect(r.expectedPeaks).toEqual([13, 17]);
    expect(r.xInactivationExpected).toBe('random');
  });

  it('Clara (conductrice, buccal) : deux pics attendus malgré le portage', function() {
    var r = predictHpaII({ sex: 'female', maternalAllele: 15, paternalAllele: 13,
      mutatedAllele: MUTATED_ALLELE_FAM2, isCarrier: true,
      tissue: 'buccal', diseaseAffectsLymphocytes: true });
    expect(r.expectedPeaks).toEqual([13, 15]);
    expect(r.xInactivationExpected).toBe('random');
  });

});

describe('Famille 2 — X-SCID : interpretXInactivation', function() {

  it('Lucie (sang, biaisé) : pattern = skewed', function() {
    var r = interpretXI({ sex: 'female', peaksWithHpaII: [15], peaksWithoutHpaII: [13, 15] });
    expect(r.xInactivationPattern).toBe('skewed');
    expect(r.inactiveXAlleles).toEqual([15]);
    expect(r.activeXAlleles).toEqual([13]);
  });

  it('Emma (sang, aléatoire) : pattern = random', function() {
    var r = interpretXI({ sex: 'female', peaksWithHpaII: [13, 17], peaksWithoutHpaII: [13, 17] });
    expect(r.xInactivationPattern).toBe('random');
    expect(r.inactiveXAlleles).toEqual([13, 17]);
  });

  it('Clara (buccal, aléatoire) : pattern = random', function() {
    var r = interpretXI({ sex: 'female', peaksWithHpaII: [13, 15], peaksWithoutHpaII: [13, 15] });
    expect(r.xInactivationPattern).toBe('random');
  });

  it('Père (homme) : pattern = not_applicable', function() {
    var r = interpretXI({ sex: 'male', peaksWithHpaII: [], peaksWithoutHpaII: [13] });
    expect(r.xInactivationPattern).toBe('not_applicable');
  });

});

describe('Famille 2 — X-SCID : evaluateCarrierLikelihood', function() {

  it('Lucie (sang, biaisé vers allèle muté 15) : likely carrier', function() {
    var r = evalCarrier({
      xInactivationPattern: 'skewed',
      inactiveXAlleles: [15],
      allPeaksWithoutHpaII: [13, 15],
      mutatedAllele: MUTATED_ALLELE_FAM2,
      tissue: 'blood',
      diseaseAffectsLymphocytes: true
    });
    expect(r.carrierLikelihood).toBe('likely');
  });

  it('Emma (sang, aléatoire) : unlikely carrier', function() {
    var r = evalCarrier({
      xInactivationPattern: 'random',
      inactiveXAlleles: [13, 17],
      allPeaksWithoutHpaII: [13, 17],
      mutatedAllele: MUTATED_ALLELE_FAM2,
      tissue: 'blood',
      diseaseAffectsLymphocytes: true
    });
    expect(r.carrierLikelihood).toBe('unlikely');
  });

  it('Emma n\'a pas l\'allèle 15 → unlikely (allèle absent)', function() {
    var r = evalCarrier({
      xInactivationPattern: 'random',
      inactiveXAlleles: [13, 17],
      allPeaksWithoutHpaII: [13, 17],
      mutatedAllele: MUTATED_ALLELE_FAM2,
      tissue: 'blood',
      diseaseAffectsLymphocytes: true
    });
    expect(r.carrierLikelihood).toBe('unlikely');
  });

  it('Clara (buccal) : inconclusive quelle que soit l\'inactivation', function() {
    var r = evalCarrier({
      xInactivationPattern: 'random',
      inactiveXAlleles: [13, 15],
      allPeaksWithoutHpaII: [13, 15],
      mutatedAllele: MUTATED_ALLELE_FAM2,
      tissue: 'buccal',
      diseaseAffectsLymphocytes: true
    });
    expect(r.carrierLikelihood).toBe('inconclusive');
  });

  it('Homme : inconclusive (not_applicable)', function() {
    var r = evalCarrier({
      xInactivationPattern: 'not_applicable',
      inactiveXAlleles: [],
      allPeaksWithoutHpaII: [13],
      mutatedAllele: MUTATED_ALLELE_FAM2,
      tissue: 'blood',
      diseaseAffectsLymphocytes: true
    });
    expect(r.carrierLikelihood).toBe('inconclusive');
  });

});
