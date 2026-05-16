/**
 * Tests pour tools/angelman-pw/logic.js
 * Compatible Node.js (node tests/angelman-pw.test.js) et navigateur (run-tests.html)
 */

// ─── Chargement ───────────────────────────────────────────────────────────────
var APW = (function() {
  if (typeof require !== 'undefined') {
    var logic = require('../tools/angelman-pw/logic.js');

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
        toContain: function(substr) {
          if (typeof actual === 'string') {
            if (actual.indexOf(substr) === -1)
              throw new Error('Expected string to contain ' + JSON.stringify(substr) + '\nGot: ' + JSON.stringify(actual));
          } else if (Array.isArray(actual)) {
            if (actual.indexOf(substr) === -1)
              throw new Error('Expected array to contain ' + JSON.stringify(substr));
          } else {
            throw new Error('toContain requires string or array');
          }
        },
        toBeTruthy: function() {
          if (!actual) throw new Error('Expected truthy, got ' + JSON.stringify(actual));
        },
        toBeFalsy: function() {
          if (actual) throw new Error('Expected falsy, got ' + JSON.stringify(actual));
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
  return self.AngelmanPW;
})();

var interpret    = APW.interpretAngelmanPraderWilli;
var evalDiagnosis = APW.evaluateDiagnosis;
var DIAGNOSES    = APW.DIAGNOSES;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function diagNamed(result, substr) {
  return result.possibleDiagnoses.find(function(d) {
    return d.diagnosis.indexOf(substr) !== -1;
  });
}

function warnContains(result, substr) {
  return result.warnings.some(function(w) { return w.indexOf(substr) !== -1; });
}

// ─── Test 1 : Angelman — mutation ponctuelle UBE3A ────────────────────────────

describe('Test 1 — Angelman : mutation ponctuelle UBE3A', function() {
  var r = interpret({
    clinicalSuspicion:              'Angelman',
    southern:                       'normal',
    criticalRegionMicrosatellites:  'maternal_and_paternal',
    outsideRegionMicrosatellites:   'maternal_and_paternal',
  });

  it('diagnostic le plus probable : UBE3A', function() {
    expect(r.mostLikelyDiagnosis).toContain('UBE3A');
  });
  it('confiance = high', function() {
    expect(r.confidence).toBe('high');
  });
  it('UBE3A → possible', function() {
    expect(diagNamed(r, 'UBE3A').status).toBe('possible');
  });
  it('délétion maternelle → impossible', function() {
    expect(diagNamed(r, 'délétion maternelle').status).toBe('impossible');
  });
  it('UPD paternelle → impossible', function() {
    expect(diagNamed(r, 'uniparentale paternelle').status).toBe('impossible');
  });
  it("erreur d'empreinte maternelle → impossible", function() {
    expect(diagNamed(r, "empreinte maternelle").status).toBe('impossible');
  });
  it('nextStep mentionne séquençage', function() {
    expect(diagNamed(r, 'UBE3A').nextStep).toContain('quençage');
  });
  it('pas de warnings', function() {
    expect(r.warnings.length).toBe(0);
  });
});

// ─── Test 2 : Angelman — disomie uniparentale paternelle ─────────────────────

describe('Test 2 — Angelman : disomie uniparentale paternelle (UPD pat)', function() {
  var r = interpret({
    clinicalSuspicion:              'Angelman',
    southern:                       'mat_absent_pat_only',
    criticalRegionMicrosatellites:  'paternal_only',
    outsideRegionMicrosatellites:   'paternal_only',
  });

  it('diagnostic le plus probable : UPD paternelle', function() {
    expect(r.mostLikelyDiagnosis).toContain('uniparentale paternelle');
  });
  it('confiance = high', function() {
    expect(r.confidence).toBe('high');
  });
  it('UPD paternelle → possible', function() {
    expect(diagNamed(r, 'uniparentale paternelle').status).toBe('possible');
  });
  it('délétion maternelle → impossible (outside ne correspond pas)', function() {
    expect(diagNamed(r, 'délétion maternelle').status).toBe('impossible');
  });
  it("erreur d'empreinte → impossible", function() {
    expect(diagNamed(r, 'empreinte maternelle').status).toBe('impossible');
  });
  it('UBE3A → impossible (southern ne correspond pas)', function() {
    expect(diagNamed(r, 'UBE3A').status).toBe('impossible');
  });
});

// ─── Test 3 : Angelman — délétion maternelle ─────────────────────────────────

describe('Test 3 — Angelman : délétion maternelle', function() {
  var r = interpret({
    clinicalSuspicion:              'Angelman',
    southern:                       'mat_absent_pat_only',
    criticalRegionMicrosatellites:  'paternal_only',
    outsideRegionMicrosatellites:   'maternal_and_paternal',
  });

  it('diagnostic le plus probable : délétion maternelle', function() {
    expect(r.mostLikelyDiagnosis).toContain('délétion maternelle');
  });
  it('confiance = high', function() {
    expect(r.confidence).toBe('high');
  });
  it('délétion maternelle → possible', function() {
    expect(diagNamed(r, 'délétion maternelle').status).toBe('possible');
  });
  it('UPD paternelle → impossible (outside ne correspond pas)', function() {
    expect(diagNamed(r, 'uniparentale paternelle').status).toBe('impossible');
  });
  it("erreur d'empreinte → impossible (critical ne correspond pas)", function() {
    expect(diagNamed(r, 'empreinte maternelle').status).toBe('impossible');
  });
});

// ─── Test 4 : Angelman — erreur d'empreinte maternelle ───────────────────────

describe("Test 4 — Angelman : erreur d'empreinte maternelle", function() {
  var r = interpret({
    clinicalSuspicion:              'Angelman',
    southern:                       'mat_absent_pat_only',
    criticalRegionMicrosatellites:  'maternal_and_paternal',
    outsideRegionMicrosatellites:   'maternal_and_paternal',
  });

  it("diagnostic le plus probable : erreur d'empreinte maternelle", function() {
    expect(r.mostLikelyDiagnosis).toContain('empreinte maternelle');
  });
  it('confiance = high', function() {
    expect(r.confidence).toBe('high');
  });
  it("erreur d'empreinte → possible", function() {
    expect(diagNamed(r, 'empreinte maternelle').status).toBe('possible');
  });
  it('UPD paternelle → impossible (critical ne correspond pas)', function() {
    expect(diagNamed(r, 'uniparentale paternelle').status).toBe('impossible');
  });
  it('délétion maternelle → impossible (critical ne correspond pas)', function() {
    expect(diagNamed(r, 'délétion maternelle').status).toBe('impossible');
  });
});

// ─── Test 5 : Prader-Willi — disomie uniparentale maternelle ─────────────────

describe('Test 5 — Prader-Willi : disomie uniparentale maternelle (UPD mat)', function() {
  var r = interpret({
    clinicalSuspicion:              'Prader-Willi',
    southern:                       'pat_absent_mat_only',
    criticalRegionMicrosatellites:  'maternal_only',
    outsideRegionMicrosatellites:   'maternal_only',
  });

  it('diagnostic le plus probable : UPD maternelle', function() {
    expect(r.mostLikelyDiagnosis).toContain('uniparentale maternelle');
  });
  it('confiance = high', function() {
    expect(r.confidence).toBe('high');
  });
  it('UPD maternelle → possible', function() {
    expect(diagNamed(r, 'uniparentale maternelle').status).toBe('possible');
  });
  it('délétion paternelle → impossible (outside ne correspond pas)', function() {
    expect(diagNamed(r, 'délétion paternelle').status).toBe('impossible');
  });
  it("erreur d'empreinte paternelle → impossible", function() {
    expect(diagNamed(r, 'empreinte paternelle').status).toBe('impossible');
  });
});

// ─── Test 6 : Prader-Willi — délétion paternelle ─────────────────────────────

describe('Test 6 — Prader-Willi : délétion paternelle', function() {
  var r = interpret({
    clinicalSuspicion:              'Prader-Willi',
    southern:                       'pat_absent_mat_only',
    criticalRegionMicrosatellites:  'maternal_only',
    outsideRegionMicrosatellites:   'maternal_and_paternal',
  });

  it('diagnostic le plus probable : délétion paternelle', function() {
    expect(r.mostLikelyDiagnosis).toContain('délétion paternelle');
  });
  it('confiance = high', function() {
    expect(r.confidence).toBe('high');
  });
  it('délétion paternelle → possible', function() {
    expect(diagNamed(r, 'délétion paternelle').status).toBe('possible');
  });
  it('UPD maternelle → impossible (outside ne correspond pas)', function() {
    expect(diagNamed(r, 'uniparentale maternelle').status).toBe('impossible');
  });
  it("erreur d'empreinte paternelle → impossible (critical ne correspond pas)", function() {
    expect(diagNamed(r, 'empreinte paternelle').status).toBe('impossible');
  });
});

// ─── Test 7 : Prader-Willi — erreur d'empreinte paternelle ───────────────────

describe("Test 7 — Prader-Willi : erreur d'empreinte paternelle", function() {
  var r = interpret({
    clinicalSuspicion:              'Prader-Willi',
    southern:                       'pat_absent_mat_only',
    criticalRegionMicrosatellites:  'maternal_and_paternal',
    outsideRegionMicrosatellites:   'maternal_and_paternal',
  });

  it("diagnostic le plus probable : erreur d'empreinte paternelle", function() {
    expect(r.mostLikelyDiagnosis).toContain('empreinte paternelle');
  });
  it('confiance = high', function() {
    expect(r.confidence).toBe('high');
  });
  it("erreur d'empreinte paternelle → possible", function() {
    expect(diagNamed(r, 'empreinte paternelle').status).toBe('possible');
  });
  it('UPD maternelle → impossible', function() {
    expect(diagNamed(r, 'uniparentale maternelle').status).toBe('impossible');
  });
  it('délétion paternelle → impossible', function() {
    expect(diagNamed(r, 'délétion paternelle').status).toBe('impossible');
  });
});

// ─── Test 8 : cas non informatif ─────────────────────────────────────────────

describe('Test 8 — Angelman : microsatellite région critique non informatif', function() {
  var r = interpret({
    clinicalSuspicion:              'Angelman',
    southern:                       'normal',
    criticalRegionMicrosatellites:  'non_informative',
    outsideRegionMicrosatellites:   'maternal_and_paternal',
  });

  it('UBE3A → ambiguous (pas impossible — non exclu)', function() {
    expect(diagNamed(r, 'UBE3A').status).toBe('ambiguous');
  });
  it('diagnostic le plus probable : UBE3A (seul non-impossible)', function() {
    expect(r.mostLikelyDiagnosis).toContain('UBE3A');
  });
  it('confiance = low (ambigu)', function() {
    expect(r.confidence).toBe('low');
  });
  it('UPD paternelle → impossible (southern normal)', function() {
    expect(diagNamed(r, 'uniparentale paternelle').status).toBe('impossible');
  });
  it('warning sur locus non informatif présent', function() {
    expect(warnContains(r, 'non informatif')).toBe(true);
  });
  it("warning recommande d'utiliser d'autres loci", function() {
    expect(warnContains(r, 'autres loci')).toBe(true);
  });
});

// ─── Test 9 : suspicion "unknown" — les 7 diagnostics sont évalués ───────────

describe("Test 9 — suspicion 'unknown' : tous les diagnostics évalués", function() {
  var r = interpret({
    clinicalSuspicion:              'unknown',
    southern:                       'mat_absent_pat_only',
    criticalRegionMicrosatellites:  'paternal_only',
    outsideRegionMicrosatellites:   'maternal_and_paternal',
  });

  it('7 diagnostics évalués', function() {
    expect(r.possibleDiagnoses.length).toBe(7);
  });
  it('diagnostic trouvé : délétion maternelle', function() {
    expect(r.mostLikelyDiagnosis).toContain('délétion maternelle');
  });
  it('confiance = high', function() {
    expect(r.confidence).toBe('high');
  });
  it('les diagnostics Prader-Willi sont impossibles (southern ne correspond pas)', function() {
    var pwDiags = r.possibleDiagnoses.filter(function(d) {
      return d.diagnosis.indexOf('Prader-Willi') !== -1;
    });
    var allImpossible = pwDiags.every(function(d) { return d.status === 'impossible'; });
    expect(allImpossible).toBe(true);
  });
});

// ─── Test 10 : toutes les valeurs unknown → confiance low ────────────────────

describe('Test 10 — toutes les données unknown → résultat prudent', function() {
  var r = interpret({
    clinicalSuspicion:              'Angelman',
    southern:                       'unknown',
    criticalRegionMicrosatellites:  'unknown',
    outsideRegionMicrosatellites:   'unknown',
  });

  it('confiance = low', function() {
    expect(r.confidence).toBe('low');
  });
  it('tous les diagnostics Angelman sont ambiguous', function() {
    var allAmbig = r.possibleDiagnoses.every(function(d) { return d.status === 'ambiguous'; });
    expect(allAmbig).toBe(true);
  });
  it('warning sur Southern manquant', function() {
    expect(warnContains(r, 'Southern')).toBe(true);
  });
});

// ─── Gestion des erreurs ──────────────────────────────────────────────────────

describe('Gestion des erreurs', function() {
  it('clinicalSuspicion invalide → erreur', function() {
    var threw = false;
    try { interpret({ clinicalSuspicion: 'Autre', southern: 'normal',
                      criticalRegionMicrosatellites: 'unknown',
                      outsideRegionMicrosatellites: 'unknown' }); }
    catch(e) { threw = true; }
    expect(threw).toBe(true);
  });

  it('southern invalide → erreur', function() {
    var threw = false;
    try { interpret({ clinicalSuspicion: 'Angelman', southern: 'bizarre',
                      criticalRegionMicrosatellites: 'unknown',
                      outsideRegionMicrosatellites: 'unknown' }); }
    catch(e) { threw = true; }
    expect(threw).toBe(true);
  });

  it('microsatellite invalide → erreur', function() {
    var threw = false;
    try { interpret({ clinicalSuspicion: 'Angelman', southern: 'normal',
                      criticalRegionMicrosatellites: 'both', // invalide
                      outsideRegionMicrosatellites: 'unknown' }); }
    catch(e) { threw = true; }
    expect(threw).toBe(true);
  });
});
