'use strict';

// ─── Utilitaire fractions ─────────────────────────────────────────────────────

var _DENOMINATORS = [1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24, 32, 48, 64, 96, 192];

function _toFractionStr(decimal) {
  if (decimal === 0) return '0';
  if (decimal === 1) return '1';
  for (var i = 0; i < _DENOMINATORS.length; i++) {
    var d = _DENOMINATORS[i];
    var n = Math.round(decimal * d);
    if (n > 0 && Math.abs(n / d - decimal) < 1e-9) {
      if (n === d) return '1';
      return n + '/' + d;
    }
  }
  return decimal.toFixed(6);
}

// ─── combineIndependentRisks ──────────────────────────────────────────────────

/**
 * Multiplie des probabilités indépendantes.
 * input: number[]
 * Returns: number
 */
function combineIndependentRisks(risks) {
  if (!Array.isArray(risks) || risks.length === 0) {
    throw new Error('combineIndependentRisks : tableau de risques requis.');
  }
  return risks.reduce(function(acc, r) { return acc * r; }, 1);
}

// ─── xLinkedRecessiveSonRisk ──────────────────────────────────────────────────

/**
 * Probabilité qu'un fils soit atteint d'une maladie récessive liée à l'X.
 *
 * input: { motherCarrierProbability: number }
 * Returns: { riskSonAffected: number, fractionStr: string, explanation: string }
 */
function xLinkedRecessiveSonRisk(input) {
  var p = input.motherCarrierProbability;
  if (typeof p !== 'number' || p < 0 || p > 1) {
    throw new Error('motherCarrierProbability doit être un nombre entre 0 et 1.');
  }
  var risk = p * 0.5;
  return {
    riskSonAffected: risk,
    fractionStr: _toFractionStr(risk),
    explanation: 'P(fils atteint) = P(mère conductrice) × P(fils hérite du X muté | conductrice) = ' +
                 _toFractionStr(p) + ' × 1/2 = ' + _toFractionStr(risk) + '.'
  };
}

// ─── xLinkedRecessiveDaughterCarrierRisk ──────────────────────────────────────

/**
 * Probabilité qu'une fille soit conductrice d'une maladie récessive liée à l'X.
 *
 * input: { motherCarrierProbability: number }
 * Returns: { riskDaughterCarrier: number, fractionStr: string, explanation: string }
 */
function xLinkedRecessiveDaughterCarrierRisk(input) {
  var p = input.motherCarrierProbability;
  if (typeof p !== 'number' || p < 0 || p > 1) {
    throw new Error('motherCarrierProbability doit être un nombre entre 0 et 1.');
  }
  var risk = p * 0.5;
  return {
    riskDaughterCarrier: risk,
    fractionStr: _toFractionStr(risk),
    explanation: 'P(fille conductrice) = P(mère conductrice) × P(fille hérite du X muté | conductrice) = ' +
                 _toFractionStr(p) + ' × 1/2 = ' + _toFractionStr(risk) + '.'
  };
}

// ─── autosomalRecessiveRisk ───────────────────────────────────────────────────

/**
 * Probabilité d'un enfant atteint pour une maladie autosomique récessive.
 *
 * input: {
 *   motherCarrierProbability: number,
 *   fatherCarrierProbability: number
 * }
 * Returns: { riskChildAffected: number, fractionStr: string, explanation: string }
 */
function autosomalRecessiveRisk(input) {
  var pm = input.motherCarrierProbability;
  var pf = input.fatherCarrierProbability;
  if (typeof pm !== 'number' || pm < 0 || pm > 1) {
    throw new Error('motherCarrierProbability invalide.');
  }
  if (typeof pf !== 'number' || pf < 0 || pf > 1) {
    throw new Error('fatherCarrierProbability invalide.');
  }
  var risk = pm * pf * 0.25;
  return {
    riskChildAffected: risk,
    fractionStr: _toFractionStr(risk),
    explanation: 'P(enfant atteint) = P(mère conductrice) × P(père conducteur) × P(aa | les deux conducteurs) = ' +
                 _toFractionStr(pm) + ' × ' + _toFractionStr(pf) + ' × 1/4 = ' + _toFractionStr(risk) + '.'
  };
}

// ─── autosomalDominantRisk ────────────────────────────────────────────────────

/**
 * Probabilité d'un enfant atteint pour une maladie autosomique dominante.
 * Suppose que le parent atteint est hétérozygote (Aa).
 *
 * input: { affectedParentHeterozygousProbability?: number }  // défaut = 1
 * Returns: { riskChildAffected: number, fractionStr: string, explanation: string }
 */
function autosomalDominantRisk(input) {
  var p = (input && input.affectedParentHeterozygousProbability !== undefined)
    ? input.affectedParentHeterozygousProbability
    : 1;
  var risk = p * 0.5;
  return {
    riskChildAffected: risk,
    fractionStr: _toFractionStr(risk),
    explanation: 'P(enfant atteint) = P(parent Aa) × P(hérite de l\'allèle A) = ' +
                 _toFractionStr(p) + ' × 1/2 = ' + _toFractionStr(risk) + '.'
  };
}

// ─── bayesCarrierAfterUnaffectedSon ──────────────────────────────────────────

/**
 * Mise à jour bayésienne de la probabilité d'être conductrice après n fils indemnes.
 * Modèle X-lié récessif : P(fils indemne | conductrice) = 1/2.
 *
 * input: {
 *   priorCarrierProbability: number,
 *   nUnaffectedSons:         number   // entier ≥ 0
 * }
 * Returns: {
 *   posteriorCarrierProbability: number,
 *   fractionStr:                 string,
 *   riskNextSonAffected:         number,
 *   riskNextSonAffectedFractionStr: string,
 *   riskNextSonUnaffected:       number,
 *   riskNextSonUnaffectedFractionStr: string,
 *   explanation:                 string
 * }
 */
function bayesCarrierAfterUnaffectedSon(input) {
  var prior = input.priorCarrierProbability;
  var n     = input.nUnaffectedSons;

  if (typeof prior !== 'number' || prior < 0 || prior > 1) {
    throw new Error('priorCarrierProbability invalide.');
  }
  if (typeof n !== 'number' || n < 0 || !Number.isInteger(n)) {
    throw new Error('nUnaffectedSons doit être un entier positif ou nul.');
  }

  // P(conductrice | n fils indemnes) ∝ prior × (1/2)^n
  var likelihoodCarrier = Math.pow(0.5, n);
  var numerator   = prior * likelihoodCarrier;
  var denominator = prior * likelihoodCarrier + (1 - prior) * 1;
  var posterior   = denominator === 0 ? 0 : numerator / denominator;

  var riskAffected   = posterior * 0.5;
  var riskUnaffected = 1 - riskAffected;

  return {
    posteriorCarrierProbability: posterior,
    fractionStr: _toFractionStr(posterior),
    riskNextSonAffected: riskAffected,
    riskNextSonAffectedFractionStr: _toFractionStr(riskAffected),
    riskNextSonUnaffected: riskUnaffected,
    riskNextSonUnaffectedFractionStr: _toFractionStr(riskUnaffected),
    explanation: 'Bayes après ' + n + ' fils indemne(s) :\n' +
      'P(conductrice) = (' + _toFractionStr(prior) + ' × (1/2)^' + n + ') / ' +
      '[' + _toFractionStr(prior) + ' × (1/2)^' + n + ' + ' + _toFractionStr(1 - prior) + ' × 1] = ' +
      _toFractionStr(posterior) + '.\n' +
      'Risque prochain fils atteint : ' + _toFractionStr(posterior) + ' × 1/2 = ' + _toFractionStr(riskAffected) + '.\n' +
      'Risque prochain fils indemne : 1 − ' + _toFractionStr(riskAffected) + ' = ' + _toFractionStr(riskUnaffected) + '.'
  };
}

// ─── Export ───────────────────────────────────────────────────────────────────

(function(exports) {
  exports._toFractionStr                     = _toFractionStr;
  exports.combineIndependentRisks            = combineIndependentRisks;
  exports.xLinkedRecessiveSonRisk            = xLinkedRecessiveSonRisk;
  exports.xLinkedRecessiveDaughterCarrierRisk = xLinkedRecessiveDaughterCarrierRisk;
  exports.autosomalRecessiveRisk             = autosomalRecessiveRisk;
  exports.autosomalDominantRisk              = autosomalDominantRisk;
  exports.bayesCarrierAfterUnaffectedSon     = bayesCarrierAfterUnaffectedSon;
})(typeof module !== 'undefined' && module.exports
   ? module.exports
   : (function() { return (self.PedigreeLogic = {}); })());
