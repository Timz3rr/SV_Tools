'use strict';

// ─── Utilitaires ─────────────────────────────────────────────────────────────

function _sorted(arr) {
  return arr.slice().sort(function(a, b) { return a - b; });
}

function _peaksEqual(a, b) {
  var sa = _sorted(a), sb = _sorted(b);
  if (sa.length !== sb.length) return false;
  for (var i = 0; i < sa.length; i++) { if (sa[i] !== sb[i]) return false; }
  return true;
}

// ─── inferParentalOrigin ──────────────────────────────────────────────────────

/**
 * Détermine l'origine parentale des allèles HUMARA d'un enfant.
 *
 * input: {
 *   childPeaks:  number[],   // pics HUMARA de l'enfant (sans HpaII)
 *   motherPeaks: number[],   // pics de la mère
 *   fatherPeaks: number[],   // pics du père (tableau vide si inconnu)
 *   sex: 'male' | 'female'
 * }
 * Returns: {
 *   maternalAllele:  number,
 *   paternalAllele:  number | null,
 *   ambiguous:       boolean,
 *   explanation:     string
 * }
 */
function inferParentalOrigin(input) {
  var child  = input.childPeaks;
  var mother = input.motherPeaks;
  var father = input.fatherPeaks || [];
  var sex    = input.sex;

  if (sex === 'male') {
    if (child.length !== 1) {
      throw new Error('Un garçon ne devrait avoir qu\'un seul pic HUMARA (un seul chromosome X).');
    }
    var mat = child[0];
    if (mother.indexOf(mat) === -1) {
      throw new Error('L\'allèle du garçon (' + mat + ') est absent chez la mère — données incohérentes.');
    }
    return {
      maternalAllele: mat,
      paternalAllele: null,
      ambiguous: false,
      explanation: 'Garçon : un seul chromosome X reçu de la mère. Son allèle ' + mat + ' est d\'origine maternelle. Le père transmet le chromosome Y, non analysé par HUMARA.'
    };
  }

  // Fille : deux allèles X
  if (child.length < 1 || child.length > 2) {
    throw new Error('Une fille devrait avoir 1 ou 2 pics HUMARA.');
  }

  if (child.length === 1) {
    return {
      maternalAllele: child[0],
      paternalAllele: child[0],
      ambiguous: true,
      explanation: 'La fille est homozygote pour l\'allèle ' + child[0] + ' — les deux X ont la même taille de répétition. L\'origine parentale ne peut pas être déterminée avec certitude.'
    };
  }

  // 2 allèles — utiliser le père si disponible
  if (father.length > 0) {
    var patMatches   = child.filter(function(p) { return father.indexOf(p) !== -1; });
    var matCandidates = child.filter(function(p) { return father.indexOf(p) === -1; });

    if (patMatches.length === 1 && matCandidates.length === 1) {
      return {
        maternalAllele: matCandidates[0],
        paternalAllele: patMatches[0],
        ambiguous: false,
        explanation: 'Allèle paternel : ' + patMatches[0] + ' (présent chez le père). Allèle maternel : ' + matCandidates[0] + ' (absent chez le père, donc d\'origine maternelle).'
      };
    }
  }

  // Sans données paternelles : utiliser la mère
  var fromMother    = child.filter(function(p) { return mother.indexOf(p) !== -1; });
  var notFromMother = child.filter(function(p) { return mother.indexOf(p) === -1; });

  if (fromMother.length === 1 && notFromMother.length === 1) {
    return {
      maternalAllele: fromMother[0],
      paternalAllele: notFromMother[0],
      ambiguous: false,
      explanation: 'Allèle maternel : ' + fromMother[0] + ' (présent chez la mère). Allèle paternel : ' + notFromMother[0] + ' (absent chez la mère).'
    };
  }

  return {
    maternalAllele: child[0],
    paternalAllele: child[1],
    ambiguous: true,
    explanation: 'Les deux allèles (' + child[0] + ' et ' + child[1] + ') sont présents chez la mère — impossible de distinguer l\'origine sans données paternelles.'
  };
}

// ─── inferMutatedAllele ───────────────────────────────────────────────────────

/**
 * Identifie l'allèle maternel porteur de la mutation à partir des garçons atteints.
 * Un garçon atteint (maladie liée à l'X récessive) a hérité du seul X muté de sa mère.
 *
 * input: {
 *   affectedMales: [{ id: string, maternalAllele: number }],
 *   diseaseName:   string
 * }
 * Returns: {
 *   mutatedAllele: number,
 *   consistent:    boolean,
 *   explanation:   string
 * }
 */
function inferMutatedAllele(input) {
  var males = input.affectedMales;
  if (!males || males.length === 0) {
    throw new Error('Aucun garçon atteint fourni pour inférer l\'allèle muté.');
  }

  var alleles = males.map(function(m) { return m.maternalAllele; });
  var unique  = alleles.filter(function(v, i, a) { return a.indexOf(v) === i; });

  if (unique.length === 1) {
    var allele = unique[0];
    var ids = males.map(function(m) { return m.id; }).join(', ');
    return {
      mutatedAllele: allele,
      consistent: true,
      explanation: 'Tous les garçons atteints (' + ids + ') portent l\'allèle maternel ' + allele + '. C\'est donc le chromosome X maternel portant l\'allèle ' + allele + ' qui est muté pour ' + (input.diseaseName || 'la maladie') + '.'
    };
  }

  return {
    mutatedAllele: alleles[0],
    consistent: false,
    explanation: 'Les garçons atteints portent des allèles maternels différents (' + unique.join(', ') + '). Les données sont incohérentes — vérifier les résultats.'
  };
}

// ─── predictHpaIIAfterPCR ─────────────────────────────────────────────────────

/**
 * Prédit les pics attendus après digestion HpaII + PCR HUMARA.
 *
 * Principe :
 *   - HpaII coupe les sites CCGG non méthylés (X ACTIF) → pas de produit PCR
 *   - X INACTIF (méthylé) est protégé → produit PCR visible
 *
 * input: {
 *   sex:                        'male' | 'female',
 *   maternalAllele:             number,
 *   paternalAllele:             number | null,
 *   mutatedAllele:              number | null,
 *   isCarrier:                  boolean,
 *   tissue:                     'blood' | 'buccal',
 *   diseaseAffectsLymphocytes:  boolean
 * }
 * Returns: {
 *   expectedPeaks:          number[],
 *   xInactivationExpected:  'random' | 'skewed' | 'not_applicable',
 *   explanation:            string
 * }
 */
function predictHpaIIAfterPCR(input) {
  var sex       = input.sex;
  var matAllele = input.maternalAllele;
  var patAllele = input.paternalAllele;
  var mutated   = input.mutatedAllele;
  var isCarrier = input.isCarrier;
  var tissue    = input.tissue || 'blood';
  var affectsL  = input.diseaseAffectsLymphocytes || false;

  if (sex === 'male') {
    return {
      expectedPeaks: [],
      xInactivationExpected: 'not_applicable',
      explanation: 'L\'homme n\'a qu\'un seul chromosome X, toujours actif (non méthylé). HpaII coupe le site → pas de produit PCR. Résultat attendu : aucun pic.'
    };
  }

  // Fille non-conductrice : inactivation X aléatoire dans tous les tissus
  if (!isCarrier) {
    var alleles = _sorted([matAllele, patAllele].filter(function(x) { return x !== null; }));
    return {
      expectedPeaks: alleles,
      xInactivationExpected: 'random',
      explanation: 'Non-conductrice — inactivation X aléatoire. Chaque allèle est sur le X inactif dans ~50 % des cellules. Après HpaII : les deux pics sont visibles.'
    };
  }

  // Conductrice dans les cellules buccales : pas de pression de sélection → aléatoire
  if (tissue === 'buccal') {
    var buccalAlleles = _sorted([matAllele, patAllele].filter(function(x) { return x !== null; }));
    return {
      expectedPeaks: buccalAlleles,
      xInactivationExpected: 'random',
      explanation: 'Conductrice — cellules buccales : aucune pression de sélection cellulaire. L\'inactivation X reste aléatoire. Après HpaII : les deux allèles (' + buccalAlleles.join(' et ') + ') sont visibles.'
    };
  }

  // Conductrice dans le sang, maladie affectant la viabilité des lymphocytes
  if (affectsL && mutated !== null) {
    return {
      expectedPeaks: [mutated],
      xInactivationExpected: 'skewed',
      explanation: 'Conductrice — sang, maladie affectant la viabilité des lymphocytes. Les cellules dont le X muté est ACTIF meurent. Seules les cellules avec le X muté INACTIF (méthylé) survivent. Après HpaII : seul l\'allèle muté (' + mutated + ') est protégé et visible. Inactivation X non aléatoire (biaisée).'
    };
  }

  // Conductrice dans le sang, maladie sans pression de sélection lymphocytaire
  var bloodAlleles = _sorted([matAllele, patAllele].filter(function(x) { return x !== null; }));
  return {
    expectedPeaks: bloodAlleles,
    xInactivationExpected: 'random',
    explanation: 'Conductrice — sang, mais la maladie n\'affecte pas la viabilité des lymphocytes. Pas de pression de sélection. L\'inactivation X reste aléatoire. Après HpaII : les deux allèles sont visibles.'
  };
}

// ─── interpretXInactivation ───────────────────────────────────────────────────

/**
 * Interprète le profil d'inactivation X à partir des résultats HUMARA.
 *
 * input: {
 *   sex:                 'male' | 'female',
 *   peaksWithHpaII:      number[],   // pics après digestion HpaII
 *   peaksWithoutHpaII:   number[]    // pics sans HpaII (tous les allèles)
 * }
 * Returns: {
 *   xInactivationPattern:  'random' | 'skewed' | 'not_applicable',
 *   inactiveXAlleles:      number[],
 *   activeXAlleles:        number[],
 *   explanation:           string
 * }
 */
function interpretXInactivation(input) {
  var sex     = input.sex;
  var withH   = input.peaksWithHpaII   || [];
  var withoutH = input.peaksWithoutHpaII || [];

  if (sex === 'male') {
    return {
      xInactivationPattern: 'not_applicable',
      inactiveXAlleles: [],
      activeXAlleles: withoutH,
      explanation: 'Homme : un seul chromosome X, toujours actif. L\'inactivation X ne s\'applique pas.'
    };
  }

  if (withH.length === 0) {
    return {
      xInactivationPattern: 'not_applicable',
      inactiveXAlleles: [],
      activeXAlleles: withoutH,
      explanation: 'Aucun pic après HpaII — soit tous les allèles sont actifs, soit échec technique.'
    };
  }

  var inactiveAlleles = _sorted(withH);
  var activeAlleles   = withoutH.filter(function(p) { return withH.indexOf(p) === -1; });

  if (_peaksEqual(withH, withoutH)) {
    return {
      xInactivationPattern: 'random',
      inactiveXAlleles: inactiveAlleles,
      activeXAlleles: [],
      explanation: 'Même profil avec et sans HpaII (' + withoutH.join(', ') + '). Les deux allèles sont sur le X inactif dans ~50 % des cellules chacun → inactivation X aléatoire.'
    };
  }

  return {
    xInactivationPattern: 'skewed',
    inactiveXAlleles: inactiveAlleles,
    activeXAlleles: activeAlleles,
    explanation: 'Sans HpaII : ' + withoutH.join(', ') + '. Après HpaII : ' + withH.join(', ') + ' seulement. L\'allèle ' + activeAlleles.join(', ') + ' est sur le X ACTIF (coupé) et ' + withH.join(', ') + ' sur le X INACTIF (protégé). Inactivation X biaisée (non aléatoire).'
  };
}

// ─── evaluateCarrierLikelihood ────────────────────────────────────────────────

/**
 * Évalue la probabilité de portage (conductrice) d'une femme selon le profil HUMARA.
 *
 * input: {
 *   xInactivationPattern:       'random' | 'skewed' | 'not_applicable',
 *   inactiveXAlleles:           number[],
 *   allPeaksWithoutHpaII:       number[],
 *   mutatedAllele:              number,
 *   tissue:                     'blood' | 'buccal',
 *   diseaseAffectsLymphocytes:  boolean
 * }
 * Returns: {
 *   carrierLikelihood:  'likely' | 'unlikely' | 'inconclusive',
 *   explanation:        string
 * }
 */
function evaluateCarrierLikelihood(input) {
  var pattern    = input.xInactivationPattern;
  var inactive   = input.inactiveXAlleles  || [];
  var allPeaks   = input.allPeaksWithoutHpaII || [];
  var mutated    = input.mutatedAllele;
  var tissue     = input.tissue || 'blood';
  var affectsL   = input.diseaseAffectsLymphocytes || false;

  if (pattern === 'not_applicable') {
    return {
      carrierLikelihood: 'inconclusive',
      explanation: 'L\'inactivation X ne s\'applique pas (homme ou résultat non interprétable).'
    };
  }

  // Si la personne ne possède pas l'allèle muté, elle ne peut pas être conductrice
  if (allPeaks.length > 0 && mutated !== null && mutated !== undefined && allPeaks.indexOf(mutated) === -1) {
    return {
      carrierLikelihood: 'unlikely',
      explanation: 'L\'allèle muté (' + mutated + ') est absent chez cette personne (allèles observés : ' + allPeaks.join(', ') + '). Elle ne peut pas être conductrice de cette mutation.'
    };
  }

  // Tissu buccal : pas de pression de sélection → résultat non discriminant
  if (tissue === 'buccal') {
    return {
      carrierLikelihood: 'inconclusive',
      explanation: 'Cellules buccales : l\'inactivation X est toujours aléatoire dans ce tissu, qu\'on soit conductrice ou non. Ce résultat ne permet pas de conclure sur le statut de conductrice.'
    };
  }

  // Sang, maladie affectant les lymphocytes
  if (tissue === 'blood' && affectsL) {
    if (pattern === 'skewed' && inactive.length === 1 && inactive[0] === mutated) {
      return {
        carrierLikelihood: 'likely',
        explanation: 'Sang : inactivation X biaisée, l\'allèle muté (' + mutated + ') est systématiquement sur le X inactif. Les cellules avec l\'X muté ACTIF meurent → seules survivent les cellules avec l\'X muté INACTIF. Ce profil est fortement évocateur d\'une conductrice hétérozygote.'
      };
    }
    if (pattern === 'random') {
      return {
        carrierLikelihood: 'unlikely',
        explanation: 'Sang : inactivation X aléatoire malgré la pression de sélection attendue chez une conductrice. Ce résultat est plutôt en faveur d\'une non-conductrice.'
      };
    }
  }

  return {
    carrierLikelihood: 'inconclusive',
    explanation: 'Le profil d\'inactivation X (' + pattern + ') ne permet pas de conclure avec certitude sur le statut de conductrice dans ce contexte.'
  };
}

// ─── Export ───────────────────────────────────────────────────────────────────

(function(exports) {
  exports.inferParentalOrigin     = inferParentalOrigin;
  exports.inferMutatedAllele      = inferMutatedAllele;
  exports.predictHpaIIAfterPCR    = predictHpaIIAfterPCR;
  exports.interpretXInactivation  = interpretXInactivation;
  exports.evaluateCarrierLikelihood = evaluateCarrierLikelihood;
})(typeof module !== 'undefined' && module.exports
   ? module.exports
   : (function() { return (self.HumaraLogic = {}); })());
