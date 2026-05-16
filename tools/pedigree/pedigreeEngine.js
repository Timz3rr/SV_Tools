'use strict';

// ─── Dépendance : fraction.js ─────────────────────────────────────────────────
var F = (typeof module !== 'undefined') ? require('./fraction.js') : self.Fraction;

// =============================================================================
// MOTEUR PEDIGREE V2
//
// Principe honnête de cette version :
//   • Déduit automatiquement les statuts "évidents" depuis le pedigree
//     (porteur obligatoire, conductrice certaine, etc.)
//   • Pour les probabilités issues de chaînes multi-générations,
//     accepte des `statusOverrides` explicites dans les données.
//   • Signale toujours la source : 'phenotype' | 'inferred' | 'override' | 'ambiguous'
//
// Structure d'entrée (pedigree) :
// {
//   people:   { [id]: { id, name, sex, phenotypes, statusOverrides? } },
//   couples:  [{ id, parents: [id1, id2], children: [id...] }],
//   diseases: { [diseaseId]: { name, inheritance } }
// }
//
// Valeurs inheritance : 'x_linked_recessive' | 'autosomal_recessive' | 'autosomal_dominant'
// Valeurs phenotypes  : 'affected' | 'unaffected' | 'carrier' | 'unknown'
//
// statusOverrides (sur une personne) :
// { [diseaseId]: { carrierProbability, affectedProbability?, source } }
// =============================================================================

// ─── Helpers internes ─────────────────────────────────────────────────────────

function _phenotype(person, diseaseId) {
  return (person.phenotypes && person.phenotypes[diseaseId]) || 'unknown';
}

function _parentsOf(personId, pedigree) {
  for (var i = 0; i < pedigree.couples.length; i++) {
    var c = pedigree.couples[i];
    if (c.children && c.children.indexOf(personId) !== -1) return c.parents;
  }
  return null;
}

function _couplesOf(personId, pedigree) {
  return pedigree.couples.filter(function(c) {
    return c.parents.indexOf(personId) !== -1;
  });
}

function _hasAffectedChild(personId, diseaseId, pedigree) {
  var couples = _couplesOf(personId, pedigree);
  for (var ci = 0; ci < couples.length; ci++) {
    var children = couples[ci].children || [];
    for (var ki = 0; ki < children.length; ki++) {
      var child = pedigree.people[children[ki]];
      if (child && _phenotype(child, diseaseId) === 'affected') return true;
    }
  }
  return false;
}

// Retourne { carrierProbability: Fraction, affectedProbability: Fraction, source, overrideReason?, explanation: string[] }
function _applyOverride(ov) {
  return {
    carrierProbability:  F.parse(ov.carrierProbability  !== undefined ? ov.carrierProbability  : '0'),
    affectedProbability: F.parse(ov.affectedProbability !== undefined ? ov.affectedProbability : '0'),
    source: 'override',
    overrideReason: ov.source || 'fourni manuellement',
    explanation: ['[OVERRIDE — ' + (ov.source || 'fourni manuellement') + ']'],
  };
}

// =============================================================================
// 1. inferXLinkedRecessiveStatus
// =============================================================================

function inferXLinkedRecessiveStatus(personId, diseaseId, pedigree) {
  var person = pedigree.people[personId];
  if (!person) throw new Error('Individu inconnu : ' + personId);

  // Override explicite → priorité absolue
  if (person.statusOverrides && person.statusOverrides[diseaseId]) {
    return _applyOverride(person.statusOverrides[diseaseId]);
  }

  var ph = _phenotype(person, diseaseId);

  // ── Homme ──────────────────────────────────────────────────────────────────
  if (person.sex === 'male') {
    if (ph === 'affected') return {
      carrierProbability: F.ONE, affectedProbability: F.ONE,
      source: 'phenotype',
      explanation: ['Homme atteint : son unique chromosome X porte la mutation.'],
    };
    if (ph === 'unaffected') return {
      carrierProbability: F.ZERO, affectedProbability: F.ZERO,
      source: 'phenotype',
      explanation: ['Homme non atteint : son chromosome X ne porte pas la mutation.'],
    };
    // Phénotype inconnu : déduire depuis la mère
    var parentIds = _parentsOf(personId, pedigree);
    if (parentIds) {
      var motherId = null;
      for (var pi = 0; pi < parentIds.length; pi++) {
        if (pedigree.people[parentIds[pi]] && pedigree.people[parentIds[pi]].sex === 'female') {
          motherId = parentIds[pi]; break;
        }
      }
      if (motherId) {
        var mStatus = inferXLinkedRecessiveStatus(motherId, diseaseId, pedigree);
        var risk = F.mul(mStatus.carrierProbability, F.HALF);
        return {
          carrierProbability: risk, affectedProbability: risk,
          source: 'inferred',
          explanation: [
            'Homme de phénotype inconnu.',
            'P(atteint) = P(mère conductrice) × 1/2 = ' + F.fmt(mStatus.carrierProbability) + ' × 1/2 = ' + F.fmt(risk) + '.',
          ],
        };
      }
    }
    return { carrierProbability: F.ZERO, affectedProbability: F.ZERO, source: 'ambiguous',
      explanation: ['Homme de phénotype inconnu et mère non renseignée — ambigu.'] };
  }

  // ── Femme ──────────────────────────────────────────────────────────────────
  if (person.sex === 'female') {
    if (ph === 'affected') return {
      carrierProbability: F.ONE, affectedProbability: F.ONE,
      source: 'phenotype',
      explanation: ['Femme atteinte : homozygote X^m X^m.'],
    };
    if (ph === 'carrier') return {
      carrierProbability: F.ONE, affectedProbability: F.ZERO,
      source: 'phenotype',
      explanation: ['Femme conductrice (renseignée explicitement).'],
    };

    // Essayer de déduire depuis les parents
    var pIds = _parentsOf(personId, pedigree);
    if (pIds) {
      var fId = null, mId = null;
      for (var pi2 = 0; pi2 < pIds.length; pi2++) {
        var par = pedigree.people[pIds[pi2]];
        if (par && par.sex === 'male')   fId = pIds[pi2];
        if (par && par.sex === 'female') mId = pIds[pi2];
      }
      var fStatus = fId ? inferXLinkedRecessiveStatus(fId, diseaseId, pedigree) : { carrierProbability: F.ZERO, affectedProbability: F.ZERO };
      var mStatus2 = mId ? inferXLinkedRecessiveStatus(mId, diseaseId, pedigree) : { carrierProbability: F.ZERO, affectedProbability: F.ZERO };

      // P(fille reçoit X^m du père) = P(père atteint)
      var pFromFather = fStatus.affectedProbability;
      // P(fille reçoit X^m de la mère) = P(mère conductrice) × 1/2
      var pFromMother = F.mul(mStatus2.carrierProbability, F.HALF);

      // Cas simple et fréquent : père atteint, mère non conductrice → conductrice obligatoire
      if (F.isOne(pFromFather) && F.isZero(pFromMother) && ph === 'unaffected') {
        return {
          carrierProbability: F.ONE, affectedProbability: F.ZERO,
          source: 'inferred',
          explanation: [
            'Femme non atteinte dont le père est atteint (transmet X^m à toutes ses filles).',
            'La mère n\'est pas conductrice (elle transmet X^n).',
            'Elle est conductrice obligatoire : X^m (paternel) + X^n (maternel).',
          ],
        };
      }

      // Cas général
      // P(atteinte) = P(X^m père) × P(X^m mère)
      var pAff = F.mul(pFromFather, pFromMother);
      // P(conductrice) = P(X^m père)×P(X^n mère) + P(X^n père)×P(X^m mère)
      var pCar = F.add(
        F.mul(pFromFather, F.complement(pFromMother)),
        F.mul(F.complement(pFromFather), pFromMother)
      );

      if (ph === 'unaffected' && !F.isZero(pAff)) {
        // Conditionner sur le fait d'être non atteinte
        var pNotAff = F.complement(pAff);
        if (!F.isZero(pNotAff)) {
          var pCarCond = F.div(pCar, pNotAff);
          return {
            carrierProbability: pCarCond, affectedProbability: F.ZERO,
            source: 'inferred',
            explanation: [
              'Femme non atteinte.',
              'P(conductrice | non atteinte) = ' + F.fmt(pCar) + ' / (1 − ' + F.fmt(pAff) + ') = ' + F.fmt(pCarCond) + '.',
            ],
          };
        }
      }

      if (!F.isZero(pAff) || !F.isZero(pCar)) {
        return {
          carrierProbability: pCar, affectedProbability: pAff,
          source: 'inferred',
          explanation: [
            'P(conductrice) = ' + F.fmt(pCar) + ', P(atteinte) = ' + F.fmt(pAff) + '.',
          ],
        };
      }
    }

    if (ph === 'unaffected') return {
      carrierProbability: F.ZERO, affectedProbability: F.ZERO,
      source: 'ambiguous',
      explanation: ['Femme non atteinte sans données parentales — statut porteur indéterminable.'],
    };

    return { carrierProbability: F.ZERO, affectedProbability: F.ZERO, source: 'ambiguous',
      explanation: ['Phénotype inconnu et parents non renseignés — ambigu.'] };
  }

  return { carrierProbability: F.ZERO, affectedProbability: F.ZERO, source: 'ambiguous',
    explanation: ['Sexe inconnu — impossible de déduire pour une maladie X-liée.'] };
}

// =============================================================================
// 2. inferAutosomalRecessiveStatus
// =============================================================================

function inferAutosomalRecessiveStatus(personId, diseaseId, pedigree) {
  var person = pedigree.people[personId];
  if (!person) throw new Error('Individu inconnu : ' + personId);

  if (person.statusOverrides && person.statusOverrides[diseaseId]) {
    return _applyOverride(person.statusOverrides[diseaseId]);
  }

  var ph = _phenotype(person, diseaseId);

  if (ph === 'affected') return {
    carrierProbability: F.ZERO, affectedProbability: F.ONE,
    source: 'phenotype',
    explanation: ['Individu atteint : génotype aa.'],
  };
  if (ph === 'carrier') return {
    carrierProbability: F.ONE, affectedProbability: F.ZERO,
    source: 'phenotype',
    explanation: ['Individu porteur Aa (renseigné explicitement).'],
  };

  // Inférence bottom-up : porteur obligatoire si un enfant est atteint
  if ((ph === 'unaffected' || ph === 'unknown') && _hasAffectedChild(personId, diseaseId, pedigree)) {
    return {
      carrierProbability: F.ONE, affectedProbability: F.ZERO,
      source: 'inferred',
      explanation: [
        'Individu non atteint ayant un enfant atteint (maladie autosomique récessive).',
        'Les deux parents sont obligatoirement porteurs Aa.',
      ],
    };
  }

  // Inférence top-down depuis les parents
  var pIds = _parentsOf(personId, pedigree);
  if (pIds) {
    var s1 = inferAutosomalRecessiveStatus(pIds[0], diseaseId, pedigree);
    var s2 = inferAutosomalRecessiveStatus(pIds[1], diseaseId, pedigree);

    // Deux parents porteurs certains → enfant sain → P(porteur | sain) = 2/3
    if (F.isOne(s1.carrierProbability) && F.isOne(s2.carrierProbability) && ph === 'unaffected') {
      return {
        carrierProbability: F.frac(2, 3), affectedProbability: F.ZERO,
        source: 'inferred',
        explanation: [
          'Individu sain issu de deux parents porteurs obligatoires (Aa × Aa).',
          'Génotypes sachant non atteint : AA (1/3) ou Aa (2/3).',
          'P(porteur | non atteint) = 2/3.',
        ],
      };
    }

    // Un parent atteint (aa) + un parent sain non porteur → enfant porteur Aa obligatoire
    var oneAffected = F.isOne(s1.affectedProbability) || F.isOne(s2.affectedProbability);
    var otherHealthyNotCarrier = (F.isOne(s1.affectedProbability) && F.isZero(s2.carrierProbability) && F.isZero(s2.affectedProbability))
                              || (F.isOne(s2.affectedProbability) && F.isZero(s1.carrierProbability) && F.isZero(s1.affectedProbability));
    if (oneAffected && otherHealthyNotCarrier && ph === 'unaffected') {
      return {
        carrierProbability: F.ONE, affectedProbability: F.ZERO,
        source: 'inferred',
        explanation: [
          'Un parent est atteint (aa) et l\'autre est non porteur.',
          'Tous les enfants héritent d\'un allèle a du parent atteint et d\'un allèle A de l\'autre → Aa.',
          'Individu porteur Aa obligatoire.',
        ],
      };
    }
  }

  if (ph === 'unaffected') return {
    carrierProbability: F.ZERO, affectedProbability: F.ZERO,
    source: 'ambiguous',
    explanation: ['Individu non atteint sans données parentales suffisantes — statut porteur indéterminable.'],
  };

  return { carrierProbability: F.ZERO, affectedProbability: F.ZERO, source: 'ambiguous',
    explanation: ['Phénotype inconnu et parents non renseignés — ambigu.'] };
}

// =============================================================================
// 3. inferAutosomalDominantStatus
// =============================================================================

function inferAutosomalDominantStatus(personId, diseaseId, pedigree) {
  var person = pedigree.people[personId];
  if (!person) throw new Error('Individu inconnu : ' + personId);

  if (person.statusOverrides && person.statusOverrides[diseaseId]) {
    return _applyOverride(person.statusOverrides[diseaseId]);
  }

  var ph = _phenotype(person, diseaseId);

  if (ph === 'affected') return {
    carrierProbability: F.ONE, affectedProbability: F.ONE,
    source: 'phenotype',
    explanation: ['Individu atteint : supposé hétérozygote Aa (maladie dominante rare).'],
  };
  if (ph === 'unaffected') return {
    carrierProbability: F.ZERO, affectedProbability: F.ZERO,
    source: 'phenotype',
    explanation: ['Individu non atteint : génotype aa (pas d\'allèle dominant).'],
  };

  var pIds = _parentsOf(personId, pedigree);
  if (pIds) {
    var s1 = inferAutosomalDominantStatus(pIds[0], diseaseId, pedigree);
    var s2 = inferAutosomalDominantStatus(pIds[1], diseaseId, pedigree);
    // P(enfant atteint) = 1 − P(aucun parent ne transmet A)
    var pP1A = F.mul(s1.carrierProbability, F.HALF);
    var pP2A = F.mul(s2.carrierProbability, F.HALF);
    var pAff = F.sub(F.ONE, F.mul(F.complement(pP1A), F.complement(pP2A)));
    return {
      carrierProbability: pAff, affectedProbability: pAff,
      source: 'inferred',
      explanation: ['P(atteint) = 1 − P(aucun parent ne transmet A) = ' + F.fmt(pAff) + '.'],
    };
  }

  return { carrierProbability: F.ZERO, affectedProbability: F.ZERO, source: 'ambiguous',
    explanation: ['Phénotype inconnu et parents non renseignés — ambigu.'] };
}

// =============================================================================
// 4. analyzePedigree
// =============================================================================

function analyzePedigree(pedigree) {
  var result = {};
  var peopleIds  = Object.keys(pedigree.people);
  var diseaseIds = Object.keys(pedigree.diseases || {});

  for (var pi = 0; pi < peopleIds.length; pi++) {
    var personId = peopleIds[pi];
    result[personId] = {};
    for (var di = 0; di < diseaseIds.length; di++) {
      var diseaseId = diseaseIds[di];
      var inh = pedigree.diseases[diseaseId].inheritance;
      var status;
      if      (inh === 'x_linked_recessive')  status = inferXLinkedRecessiveStatus(personId, diseaseId, pedigree);
      else if (inh === 'autosomal_recessive')  status = inferAutosomalRecessiveStatus(personId, diseaseId, pedigree);
      else if (inh === 'autosomal_dominant')   status = inferAutosomalDominantStatus(personId, diseaseId, pedigree);
      else status = { carrierProbability: F.ZERO, affectedProbability: F.ZERO, source: 'ambiguous',
                      explanation: ['Type d\'hérédité inconnu : ' + inh] };
      result[personId][diseaseId] = status;
    }
  }
  return result;
}

// =============================================================================
// 5. computeChildRisk
// =============================================================================
//
// Calcule P(futur enfant est atteint) pour une maladie donnée.
// Utilise analyzePedigree + les statusOverrides déjà intégrés dans l'analyse.

function computeChildRisk(pedigree, parent1Id, parent2Id, childSex, diseaseId) {
  var disease = pedigree.diseases && pedigree.diseases[diseaseId];
  if (!disease) throw new Error('Maladie inconnue : ' + diseaseId);

  var analyzed = analyzePedigree(pedigree);

  var p1 = pedigree.people[parent1Id];
  var p2 = pedigree.people[parent2Id];
  if (!p1) throw new Error('Parent inconnu : ' + parent1Id);
  if (!p2) throw new Error('Parent inconnu : ' + parent2Id);

  var motherId = (p1.sex === 'female') ? parent1Id : parent2Id;
  var fatherId = (p1.sex === 'male')   ? parent1Id : parent2Id;

  var ms = analyzed[motherId] && analyzed[motherId][diseaseId];
  var fs = analyzed[fatherId] && analyzed[fatherId][diseaseId];
  if (!ms || !fs) return { affectedRisk: F.ZERO, fractionStr: '?', source: 'ambiguous',
    explanation: ['Statut parental non disponible.'] };

  var affectedRisk, explanation = [];
  var inh = disease.inheritance;

  // ── X-lié récessif ────────────────────────────────────────────────────────
  if (inh === 'x_linked_recessive') {
    if (childSex === 'male') {
      // Fils reçoit X de sa mère, Y de son père
      var pCar = ms.carrierProbability;
      affectedRisk = F.mul(pCar, F.HALF);
      explanation.push('Enfant masculin, maladie récessive liée à l\'X.');
      explanation.push('Le fils reçoit son X de sa mère uniquement.');
      explanation.push('P(mère conductrice) = ' + F.fmt(pCar) + (ms.source === 'override' ? '  [OVERRIDE : ' + ms.overrideReason + ']' : ' (' + ms.source + ')') + '.');
      explanation.push('P(fils atteint) = ' + F.fmt(pCar) + ' × 1/2 = ' + F.fmt(affectedRisk) + '.');
    } else {
      // Fille : reçoit X du père et X de la mère
      var pFromFather = fs.affectedProbability;  // père atteint → transmet X^m certain
      var pFromMother = F.mul(ms.carrierProbability, F.HALF);
      affectedRisk = F.mul(pFromFather, pFromMother);
      var pCarrierDaughter = F.add(
        F.mul(pFromFather, F.complement(pFromMother)),
        F.mul(F.complement(pFromFather), pFromMother)
      );
      explanation.push('Enfant féminin, maladie récessive liée à l\'X.');
      explanation.push('P(atteinte) = P(X^m du père) × P(X^m de la mère) = ' + F.fmt(pFromFather) + ' × ' + F.fmt(pFromMother) + ' = ' + F.fmt(affectedRisk) + '.');
      explanation.push('P(conductrice) = ' + F.fmt(pCarrierDaughter) + '.');
      return {
        diseaseId: diseaseId, affectedRisk: affectedRisk, carrierRisk: pCarrierDaughter,
        fractionStr: F.fmt(affectedRisk),
        source: ms.source,
        explanation: explanation,
      };
    }

  // ── Autosomique récessif ──────────────────────────────────────────────────
  } else if (inh === 'autosomal_recessive') {
    // P(parent transmet 'a') = P(atteint)×1 + P(porteur)×(1/2)
    var pMA = F.add(ms.affectedProbability, F.mul(ms.carrierProbability, F.HALF));
    var pFA = F.add(fs.affectedProbability, F.mul(fs.carrierProbability, F.HALF));
    affectedRisk = F.mul(pMA, pFA);
    explanation.push('Maladie autosomique récessive.');
    explanation.push('P(mère transmet a) = P(mère atteinte) + P(mère porteuse) × 1/2 = '
      + F.fmt(ms.affectedProbability) + ' + ' + F.fmt(ms.carrierProbability) + '×1/2 = ' + F.fmt(pMA)
      + (ms.source === 'override' ? '  [OVERRIDE : ' + ms.overrideReason + ']' : '') + '.');
    explanation.push('P(père transmet a) = P(père atteint) + P(père porteur) × 1/2 = '
      + F.fmt(fs.affectedProbability) + ' + ' + F.fmt(fs.carrierProbability) + '×1/2 = ' + F.fmt(pFA)
      + (fs.source === 'override' ? '  [OVERRIDE : ' + fs.overrideReason + ']' : '') + '.');
    explanation.push('P(enfant atteint) = ' + F.fmt(pMA) + ' × ' + F.fmt(pFA) + ' = ' + F.fmt(affectedRisk) + '.');

  // ── Autosomique dominant ──────────────────────────────────────────────────
  } else if (inh === 'autosomal_dominant') {
    var pMP = F.mul(ms.affectedProbability, F.HALF);
    var pFP = F.mul(fs.affectedProbability, F.HALF);
    // P(atteint) = 1 − P(aucun parent ne transmet A)
    affectedRisk = F.sub(F.ONE, F.mul(F.complement(pMP), F.complement(pFP)));
    explanation.push('Maladie autosomique dominante.');
    explanation.push('P(enfant atteint) = 1 − (1 − ' + F.fmt(pMP) + ') × (1 − ' + F.fmt(pFP) + ') = ' + F.fmt(affectedRisk) + '.');
  } else {
    return { affectedRisk: F.ZERO, fractionStr: '?', source: 'ambiguous',
      explanation: ['Type d\'hérédité non supporté : ' + inh] };
  }

  return {
    diseaseId:    diseaseId,
    affectedRisk: affectedRisk,
    fractionStr:  F.fmt(affectedRisk),
    source:       (ms.source === 'override' || fs.source === 'override') ? 'override' : 'inferred',
    explanation:  explanation,
  };
}

// =============================================================================
// 6. combineChildRisks
// =============================================================================
//
// input: { riskA, riskB, labelA?, labelB? }
// (riskA / riskB : string fraction ou Fraction object)

function combineChildRisks(input) {
  var pA  = F.parse(input.riskA);
  var pB  = F.parse(input.riskB);
  var pNA = F.complement(pA);
  var pNB = F.complement(pB);
  var lA  = input.labelA || 'maladie A';
  var lB  = input.labelB || 'maladie B';

  var both    = F.mul(pA,  pB);
  var onlyA   = F.mul(pA,  pNB);
  var onlyB   = F.mul(pNA, pB);
  var neither = F.mul(pNA, pNB);

  return {
    both:    F.fmt(both),
    onlyA:   F.fmt(onlyA),
    onlyB:   F.fmt(onlyB),
    neither: F.fmt(neither),
    explanation: [
      'Maladies sur chromosomes différents → risques indépendants.',
      'P(' + lA + ') = ' + F.fmt(pA) + '.',
      'P(' + lB + ') = ' + F.fmt(pB) + '.',
      'P(A et B)   = ' + F.fmt(pA)  + ' × ' + F.fmt(pB)  + ' = ' + F.fmt(both)    + '.',
      'P(A seul)   = ' + F.fmt(pA)  + ' × ' + F.fmt(pNB) + ' = ' + F.fmt(onlyA)   + '.',
      'P(B seul)   = ' + F.fmt(pNA) + ' × ' + F.fmt(pB)  + ' = ' + F.fmt(onlyB)   + '.',
      'P(aucune)   = ' + F.fmt(pNA) + ' × ' + F.fmt(pNB) + ' = ' + F.fmt(neither)  + '.',
    ],
  };
}

// =============================================================================
// 7. bayesXLinkedAfterUnaffectedSons
// =============================================================================

function bayesXLinkedAfterUnaffectedSons(priorCarrierProbability, numberOfUnaffectedSons) {
  var prior = F.parse(priorCarrierProbability);
  var n = numberOfUnaffectedSons;
  if (typeof n !== 'number' || n < 0 || !Number.isInteger(n)) {
    throw new Error('numberOfUnaffectedSons doit être un entier ≥ 0.');
  }

  // L(fils indemne | conductrice) = 1/2, L(fils indemne | non conductrice) = 1
  // P(conductrice | n fils indemnes) = prior × (1/2)^n  /  [prior × (1/2)^n + (1−prior) × 1]
  var likeCarrier = F.frac(1, Math.pow(2, n)); // exact car n entier
  var num = F.mul(prior, likeCarrier);
  var den = F.add(num, F.complement(prior));
  var posterior = F.div(num, den);
  var riskAff  = F.mul(posterior, F.HALF);
  var riskSafe = F.complement(riskAff);

  return {
    posteriorCarrierProbability:         F.fmt(posterior),
    riskNextSonAffected:                 F.fmt(riskAff),
    riskNextSonUnaffected:               F.fmt(riskSafe),
    _posteriorFraction: posterior,
    _riskAffFraction:   riskAff,
    _riskSafeFraction:  riskSafe,
    explanationSteps: [
      'Prior P(conductrice) = ' + F.fmt(prior) + '.',
      'P(fils indemne | conductrice) = (1/2)^' + n + ' = ' + F.fmt(likeCarrier) + '.',
      'P(fils indemne | non conductrice) = 1.',
      'Numérateur   = ' + F.fmt(prior) + ' × ' + F.fmt(likeCarrier) + ' = ' + F.fmt(num) + '.',
      'Dénominateur = ' + F.fmt(num) + ' + ' + F.fmt(F.complement(prior)) + ' = ' + F.fmt(den) + '.',
      'P(conductrice | données) = ' + F.fmt(num) + ' / ' + F.fmt(den) + ' = ' + F.fmt(posterior) + '.',
      'P(prochain fils atteint)  = ' + F.fmt(posterior) + ' × 1/2 = ' + F.fmt(riskAff) + '.',
      'P(prochain fils indemne)  = 1 − ' + F.fmt(riskAff) + ' = ' + F.fmt(riskSafe) + '.',
    ],
  };
}

// =============================================================================
// 8. solvePedigreeQuestion
// =============================================================================

function solvePedigreeQuestion(pedigree, question) {
  // ── future_child_combined_risk ─────────────────────────────────────────────
  if (question.type === 'future_child_combined_risk') {
    var p1Id     = question.parents[0];
    var p2Id     = question.parents[1];
    var childSex = question.childSex;
    var diseases = question.diseases; // [diseaseIdA, diseaseIdB]
    var steps    = [];

    var childRisks = {};
    for (var i = 0; i < diseases.length; i++) {
      var dId = diseases[i];
      var cr  = computeChildRisk(pedigree, p1Id, p2Id, childSex, dId);
      childRisks[dId] = cr.fractionStr;
      steps.push('── Risque ' + (pedigree.diseases[dId].name || dId) + ' ──');
      cr.explanation.forEach(function(s) { steps.push(s); });
    }

    var combined = null;
    if (diseases.length === 2) {
      var rA = childRisks[diseases[0]];
      var rB = childRisks[diseases[1]];
      var lA = (pedigree.diseases[diseases[0]] && pedigree.diseases[diseases[0]].name) || diseases[0];
      var lB = (pedigree.diseases[diseases[1]] && pedigree.diseases[diseases[1]].name) || diseases[1];
      combined = combineChildRisks({ riskA: rA, riskB: rB, labelA: lA, labelB: lB });
      steps.push('── Combinaison indépendante ──');
      combined.explanation.forEach(function(s) { steps.push(s); });
    }

    return { childRisks: childRisks, combined: combined, explanationSteps: steps };
  }

  // ── bayes_x_linked ─────────────────────────────────────────────────────────
  if (question.type === 'bayes_x_linked') {
    return bayesXLinkedAfterUnaffectedSons(
      question.priorCarrierProbability,
      question.nUnaffectedSons
    );
  }

  throw new Error('Type de question non supporté : ' + question.type);
}

// =============================================================================
// Export
// =============================================================================

(function(exports) {
  exports.analyzePedigree                  = analyzePedigree;
  exports.inferXLinkedRecessiveStatus      = inferXLinkedRecessiveStatus;
  exports.inferAutosomalRecessiveStatus    = inferAutosomalRecessiveStatus;
  exports.inferAutosomalDominantStatus     = inferAutosomalDominantStatus;
  exports.computeChildRisk                 = computeChildRisk;
  exports.combineChildRisks                = combineChildRisks;
  exports.bayesXLinkedAfterUnaffectedSons  = bayesXLinkedAfterUnaffectedSons;
  exports.solvePedigreeQuestion            = solvePedigreeQuestion;
})(typeof module !== 'undefined' && module.exports
   ? module.exports
   : (function() { return (self.PedigreeEngine = {}); })());
