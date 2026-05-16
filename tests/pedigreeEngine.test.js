/**
 * Tests pour tools/pedigree/fraction.js + tools/pedigree/pedigreeEngine.js
 * Compatible Node.js (node tests/pedigreeEngine.test.js) et navigateur (run-tests.html)
 */

// ─── Chargement ───────────────────────────────────────────────────────────────
(function() {
  var F, PE;

  if (typeof require !== 'undefined') {
    F  = require('../tools/pedigree/fraction.js');
    PE = require('../tools/pedigree/pedigreeEngine.js');

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
      };
    };

    // run at end of file
    global._finalize = function() {
      console.log('\n── ' + _p + ' passés, ' + _f + ' échoués ──');
      if (_f > 0) process.exit(1);
    };
  } else {
    F  = self.Fraction;
    PE = self.PedigreeEngine;
    global = window;
    global._finalize = function() {};
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 1 — fraction.js
  // ═══════════════════════════════════════════════════════════════════════════

  describe('fraction.js — arithmétique exacte', function() {

    it('F.frac(1, 4) → { n:1, d:4 }', function() {
      var f = F.frac(1, 4);
      expect(f.n).toBe(1); expect(f.d).toBe(4);
    });

    it('F.frac(6, 4) → { n:3, d:2 } (simplification)', function() {
      var f = F.frac(6, 4);
      expect(f.n).toBe(3); expect(f.d).toBe(2);
    });

    it('F.parse("1/4") → { n:1, d:4 }', function() {
      var f = F.parse('1/4');
      expect(f.n).toBe(1); expect(f.d).toBe(4);
    });

    it('F.parse("3/96") → { n:1, d:32 } (simplification 3/96)', function() {
      var f = F.parse('3/96');
      expect(f.n).toBe(1); expect(f.d).toBe(32);
    });

    it('F.mul(1/4, 1/2) = 1/8', function() {
      var r = F.mul(F.frac(1,4), F.HALF);
      expect(r.n).toBe(1); expect(r.d).toBe(8);
    });

    it('F.mul(1/4, 1/4) = 1/16', function() {
      var r = F.mul(F.frac(1,4), F.frac(1,4));
      expect(r.n).toBe(1); expect(r.d).toBe(16);
    });

    it('F.mul(1/4, 3/4) = 3/16', function() {
      var r = F.mul(F.frac(1,4), F.frac(3,4));
      expect(r.n).toBe(3); expect(r.d).toBe(16);
    });

    it('F.add(1/4, 1/4) = 1/2', function() {
      var r = F.add(F.frac(1,4), F.frac(1,4));
      expect(r.n).toBe(1); expect(r.d).toBe(2);
    });

    it('F.complement(1/4) = 3/4', function() {
      var r = F.complement(F.frac(1,4));
      expect(r.n).toBe(3); expect(r.d).toBe(4);
    });

    it('F.fmt(1/96) = "1/96"', function() {
      expect(F.fmt(F.frac(1, 96))).toBe('1/96');
    });

    it('F.fmt(F.ZERO) = "0"', function() {
      expect(F.fmt(F.ZERO)).toBe('0');
    });

    it('F.fmt(F.ONE) = "1"', function() {
      expect(F.fmt(F.ONE)).toBe('1');
    });

    it('F.div(1/4, 3/4) = 1/3', function() {
      var r = F.div(F.frac(1,4), F.frac(3,4));
      expect(r.n).toBe(1); expect(r.d).toBe(3);
    });

    it('bayesien exact : (1/4)÷(3/4) = 1/3', function() {
      // Vérifie que la division entière ne dérive pas en float
      var num = F.mul(F.HALF, F.frac(1,2));   // prior × like = 1/2 × 1/2 = 1/4
      var den = F.add(num, F.complement(F.HALF)); // 1/4 + 1/2 = 3/4
      var post = F.div(num, den);               // 1/4 ÷ 3/4 = 1/3
      expect(post.n).toBe(1); expect(post.d).toBe(3);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 2 — inférence auto (porteurs obligatoires)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('inferAutosomalRecessiveStatus — porteur obligatoire bottom-up', function() {

    var pedigreeAR = {
      diseases: { cat: { name: 'Cataracte', inheritance: 'autosomal_recessive' } },
      people: {
        father: { id: 'father', sex: 'male',   phenotypes: { cat: 'unaffected' } },
        mother: { id: 'mother', sex: 'female', phenotypes: { cat: 'unaffected' } },
        child:  { id: 'child',  sex: 'male',   phenotypes: { cat: 'affected'   } },
      },
      couples: [{ id: 'c1', parents: ['father','mother'], children: ['child'] }],
    };

    it('père non atteint avec enfant atteint → porteur obligatoire (inferred)', function() {
      var s = PE.inferAutosomalRecessiveStatus('father', 'cat', pedigreeAR);
      expect(F.fmt(s.carrierProbability)).toBe('1');
      expect(s.source).toBe('inferred');
    });

    it('mère non atteinte avec enfant atteint → porteuse obligatoire (inferred)', function() {
      var s = PE.inferAutosomalRecessiveStatus('mother', 'cat', pedigreeAR);
      expect(F.fmt(s.carrierProbability)).toBe('1');
      expect(s.source).toBe('inferred');
    });

    it('enfant atteint → affectedProbability = 1, source = phenotype', function() {
      var s = PE.inferAutosomalRecessiveStatus('child', 'cat', pedigreeAR);
      expect(F.fmt(s.affectedProbability)).toBe('1');
      expect(s.source).toBe('phenotype');
    });
  });

  describe('inferAutosomalRecessiveStatus — frère sain de enfant atteint → porteur 2/3', function() {

    var pedigreeSib = {
      diseases: { cat: { name: 'Cataracte', inheritance: 'autosomal_recessive' } },
      people: {
        father:  { id: 'father',  sex: 'male',   phenotypes: { cat: 'unaffected' } },
        mother:  { id: 'mother',  sex: 'female', phenotypes: { cat: 'unaffected' } },
        affected:{ id: 'affected',sex: 'male',   phenotypes: { cat: 'affected'   } },
        healthy: { id: 'healthy', sex: 'male',   phenotypes: { cat: 'unaffected' } },
      },
      couples: [{ id: 'c1', parents: ['father','mother'], children: ['affected','healthy'] }],
    };

    it('enfant sain de deux porteurs obligatoires → P(porteur) = 2/3', function() {
      var s = PE.inferAutosomalRecessiveStatus('healthy', 'cat', pedigreeSib);
      expect(F.fmt(s.carrierProbability)).toBe('2/3');
      expect(s.source).toBe('inferred');
    });
  });

  describe('inferXLinkedRecessiveStatus — conductrice obligatoire', function() {

    var pedigreeXL = {
      diseases: { cb: { name: 'Daltonisme', inheritance: 'x_linked_recessive' } },
      people: {
        grandfather: { id: 'grandfather', sex: 'male',   phenotypes: { cb: 'affected'   } },
        grandmother: { id: 'grandmother', sex: 'female', phenotypes: { cb: 'unaffected' } },
        daughter:    { id: 'daughter',    sex: 'female', phenotypes: { cb: 'unaffected' } },
      },
      couples: [{ id: 'c1', parents: ['grandfather','grandmother'], children: ['daughter'] }],
    };

    it('fille non atteinte de père atteint + mère non conductrice → conductrice obligatoire', function() {
      var s = PE.inferXLinkedRecessiveStatus('daughter', 'cb', pedigreeXL);
      expect(F.fmt(s.carrierProbability)).toBe('1');
      expect(F.fmt(s.affectedProbability)).toBe('0');
      expect(s.source).toBe('inferred');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 3 — Q6.1 : Aline × Bob
  // ═══════════════════════════════════════════════════════════════════════════
  //
  // Contexte :
  //   • Daltonisme (X-lié récessif) : Aline conductrice certaine (override)
  //   • Cataracte (autosomique récessif) : Aline porteuse avec P=1/4 (override), Bob atteint
  //   • Question : P(futur fils) atteint pour chaque maladie, puis combinaison
  //   • Attendu : daltonisme 1/2, cataracte 1/8 → both=1/16, onlyA=1/16, onlyB=7/16, neither=7/16
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Q6.1 — Aline × Bob (fils)', function() {

    var pedigreeQ61 = {
      diseases: {
        colorblindness: { name: 'Daltonisme',  inheritance: 'x_linked_recessive'  },
        cataract:       { name: 'Cataracte',   inheritance: 'autosomal_recessive'  },
      },
      people: {
        Aline: {
          id: 'Aline', name: 'Aline', sex: 'female',
          phenotypes: { colorblindness: 'unaffected', cataract: 'unaffected' },
          statusOverrides: {
            colorblindness: { carrierProbability: '1',   affectedProbability: '0', source: 'conductrice certaine (pedigree)' },
            cataract:       { carrierProbability: '1/4', affectedProbability: '0', source: 'dérivé du pedigree amont' },
          },
        },
        Bob: {
          id: 'Bob', name: 'Bob', sex: 'male',
          phenotypes: { colorblindness: 'unaffected', cataract: 'affected' },
        },
      },
      couples: [],
    };

    // diseases[0]=cataract (riskA=1/8), diseases[1]=colorblindness (riskB=1/2)
    // onlyA = cataract seule = 1/8 × 1/2 = 1/16
    // onlyB = daltonisme seul = 7/8 × 1/2 = 7/16
    var res;
    try {
      res = PE.solvePedigreeQuestion(pedigreeQ61, {
        type: 'future_child_combined_risk',
        parents: ['Aline', 'Bob'],
        childSex: 'male',
        diseases: ['cataract', 'colorblindness'],
      });
    } catch(e) {
      res = null;
    }

    it('solvePedigreeQuestion ne lève pas d\'exception', function() {
      expect(res).toBeTruthy();
    });

    it('risque daltonisme fils = 1/2', function() {
      expect(res && res.childRisks['colorblindness']).toBe('1/2');
    });

    it('risque cataracte fils = 1/8', function() {
      expect(res && res.childRisks['cataract']).toBe('1/8');
    });

    it('P(les deux) = 1/16', function() {
      expect(res && res.combined && res.combined.both).toBe('1/16');
    });

    it('P(cataracte seule) = 1/16  [onlyA]', function() {
      expect(res && res.combined && res.combined.onlyA).toBe('1/16');
    });

    it('P(daltonisme seul) = 7/16  [onlyB]', function() {
      expect(res && res.combined && res.combined.onlyB).toBe('7/16');
    });

    it('P(aucune) = 7/16', function() {
      expect(res && res.combined && res.combined.neither).toBe('7/16');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 4 — Q6.2 : Kevin × Zoé
  // ═══════════════════════════════════════════════════════════════════════════
  //
  // Contexte :
  //   • Daltonisme (X-lié récessif) : Zoé conductrice avec P=1/2 (override)
  //   • Cataracte (AR) : Kevin porteur P=1/2 (override), Zoé porteuse P=1/3 (override)
  //   • Question : P(futur fils)
  //   • Attendu : daltonisme 1/4, cataracte 1/24
  //     → both=1/96, onlyA=1/32 (3/96), onlyB=23/96, neither=23/32 (69/96)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Q6.2 — Kevin × Zoé (fils)', function() {

    var pedigreeQ62 = {
      diseases: {
        colorblindness: { name: 'Daltonisme', inheritance: 'x_linked_recessive' },
        cataract:       { name: 'Cataracte',  inheritance: 'autosomal_recessive' },
      },
      people: {
        Kevin: {
          id: 'Kevin', name: 'Kevin', sex: 'male',
          phenotypes: { colorblindness: 'unaffected', cataract: 'unaffected' },
          statusOverrides: {
            cataract: { carrierProbability: '1/2', affectedProbability: '0', source: 'dérivé du pedigree' },
          },
        },
        Zoe: {
          id: 'Zoe', name: 'Zoé', sex: 'female',
          phenotypes: { colorblindness: 'unaffected', cataract: 'unaffected' },
          statusOverrides: {
            colorblindness: { carrierProbability: '1/2', affectedProbability: '0', source: 'dérivé du pedigree' },
            cataract:       { carrierProbability: '1/3', affectedProbability: '0', source: 'dérivé du pedigree' },
          },
        },
      },
      couples: [],
    };

    var res;
    try {
      res = PE.solvePedigreeQuestion(pedigreeQ62, {
        type: 'future_child_combined_risk',
        parents: ['Kevin', 'Zoe'],
        childSex: 'male',
        // diseases[0]=cataract (riskA=1/24), diseases[1]=colorblindness (riskB=1/4)
        // onlyA = cataract seule = 1/24 × 3/4 = 3/96 = 1/32
        // onlyB = daltonisme seul = 23/24 × 1/4 = 23/96
        diseases: ['cataract', 'colorblindness'],
      });
    } catch(e) {
      res = null;
    }

    it('solvePedigreeQuestion ne lève pas d\'exception', function() {
      expect(res).toBeTruthy();
    });

    it('risque daltonisme fils = 1/4', function() {
      expect(res && res.childRisks['colorblindness']).toBe('1/4');
    });

    it('risque cataracte fils = 1/24', function() {
      expect(res && res.childRisks['cataract']).toBe('1/24');
    });

    it('P(les deux) = 1/96', function() {
      expect(res && res.combined && res.combined.both).toBe('1/96');
    });

    it('P(cataracte seule) = 1/32  [= 3/96 simplifié]  [onlyA]', function() {
      expect(res && res.combined && res.combined.onlyA).toBe('1/32');
    });

    it('P(daltonisme seul) = 23/96  [onlyB]', function() {
      expect(res && res.combined && res.combined.onlyB).toBe('23/96');
    });

    it('P(aucune) = 23/32  [= 69/96 simplifié]', function() {
      expect(res && res.combined && res.combined.neither).toBe('23/32');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 5 — Q6.3 : Mise à jour bayésienne
  // ═══════════════════════════════════════════════════════════════════════════
  //
  // Contexte :
  //   • Mère avec prior P(conductrice) = 1/2
  //   • 1 fils non daltonien observé
  //   • Attendu : posterior = 1/3, P(prochain fils non daltonien) = 5/6
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Q6.3 — Bayes X-lié (1 fils sain)', function() {

    var res = PE.bayesXLinkedAfterUnaffectedSons('1/2', 1);

    it('posteriorCarrierProbability = 1/3', function() {
      expect(res.posteriorCarrierProbability).toBe('1/3');
    });

    it('riskNextSonAffected = 1/6', function() {
      expect(res.riskNextSonAffected).toBe('1/6');
    });

    it('riskNextSonUnaffected = 5/6', function() {
      expect(res.riskNextSonUnaffected).toBe('5/6');
    });

    it('via solvePedigreeQuestion (bayes_x_linked)', function() {
      var res2 = PE.solvePedigreeQuestion({}, {
        type: 'bayes_x_linked',
        priorCarrierProbability: '1/2',
        nUnaffectedSons: 1,
      });
      expect(res2.posteriorCarrierProbability).toBe('1/3');
      expect(res2.riskNextSonUnaffected).toBe('5/6');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 6 — combineChildRisks (unitaire)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('combineChildRisks — indépendance', function() {

    // riskA=1/2, riskB=1/8: onlyA=1/2×7/8=7/16, onlyB=1/2×1/8=1/16
    it('riskA=1/2, riskB=1/8 → both=1/16, onlyA=7/16, onlyB=1/16, neither=7/16', function() {
      var c = PE.combineChildRisks({ riskA: '1/2', riskB: '1/8' });
      expect(c.both).toBe('1/16');
      expect(c.onlyA).toBe('7/16');
      expect(c.onlyB).toBe('1/16');
      expect(c.neither).toBe('7/16');
    });

    // riskA=1/24, riskB=1/4: onlyA=1/24×3/4=1/32, onlyB=23/24×1/4=23/96
    it('riskA=1/24, riskB=1/4 → both=1/96, onlyA=1/32, onlyB=23/96, neither=23/32', function() {
      var c = PE.combineChildRisks({ riskA: '1/24', riskB: '1/4' });
      expect(c.both).toBe('1/96');
      expect(c.onlyA).toBe('1/32');
      expect(c.onlyB).toBe('23/96');
      expect(c.neither).toBe('23/32');
    });
  });

  // ─── Finalisation (Node.js uniquement) ───────────────────────────────────
  global._finalize();

})();
