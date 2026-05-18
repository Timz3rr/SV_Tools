/**
 * logic.js — Interpréteur Angelman / Prader-Willi
 * Fonctions pures uniquement. Zéro DOM, zéro effet de bord.
 *
 * Région concernée : 15q11-q13 (empreinte génomique)
 * Southern blot de méthylation + microsatellites
 */

// ─── Table de diagnostics ─────────────────────────────────────────────────────
//
// Chaque entrée décrit les résultats attendus pour un diagnostic précis.
// Les trois champs "expected" sont comparés aux données de l'entrée.

var DIAGNOSES = [

  // ── Angelman ──────────────────────────────────────────────────────────────

  {
    id:        'angelman_ube3a',
    label:     'Angelman - mutation ponctuelle UBE3A',
    syndrome:  'Angelman',
    expected: {
      southern:                       'normal',
      criticalRegionMicrosatellites:  'maternal_and_paternal',
      outsideRegionMicrosatellites:   'maternal_and_paternal',
    },
    explanation:
      'Le Southern est normal (MAT + PAT présentes) et les microsatellites montrent ' +
      'une contribution maternelle et paternelle dans la région critique et hors région critique. ' +
      "Cela exclut une délétion maternelle et une UPD paternelle. " +
      "Si le phénotype est Angelman, une mutation ponctuelle UBE3A reste possible.",
    nextStep: 'Séquençage du gène UBE3A.',
  },

  {
    id:        'angelman_upd_pat',
    label:     'Angelman - disomie uniparentale paternelle',
    syndrome:  'Angelman',
    expected: {
      southern:                       'mat_absent_pat_only',
      criticalRegionMicrosatellites:  'paternal_only',
      outsideRegionMicrosatellites:   'paternal_only',
    },
    explanation:
      "Southern : bande MAT absente, méthylation maternelle nulle. " +
      "Microsatellites dans la région critique et hors région critique : " +
      "allèles uniquement paternels, pas de contribution maternelle détectable. " +
      "L'enfant possède deux copies paternelles du chromosome 15.",
    nextStep: null,
  },

  {
    id:        'angelman_del_mat',
    label:     'Angelman - délétion maternelle',
    syndrome:  'Angelman',
    expected: {
      southern:                       'mat_absent_pat_only',
      criticalRegionMicrosatellites:  'paternal_only',
      outsideRegionMicrosatellites:   'maternal_and_paternal',
    },
    explanation:
      "Southern : méthylation maternelle absente. " +
      "Microsatellites région critique : pas d'allèle maternel dans la région critique. " +
      "Microsatellites hors région critique : contribution maternelle présente. " +
      "Le chromosome maternel existe, mais sa région critique (15q11-q13) est délétée.",
    nextStep: null,
  },

  {
    id:        'angelman_imprint_mat',
    label:     "Angelman - erreur d'empreinte maternelle",
    syndrome:  'Angelman',
    expected: {
      southern:                       'mat_absent_pat_only',
      criticalRegionMicrosatellites:  'maternal_and_paternal',
      outsideRegionMicrosatellites:   'maternal_and_paternal',
    },
    explanation:
      "Southern : méthylation maternelle absente, mais microsatellites maternels et paternels " +
      "présents dans la région critique et hors région critique. " +
      "Cela exclut une délétion maternelle et une UPD paternelle. " +
      "Le chromosome maternel est structurellement présent mais porte une empreinte de type paternel.",
    nextStep: null,
  },

  // ── Prader-Willi ──────────────────────────────────────────────────────────

  {
    id:        'pw_upd_mat',
    label:     'Prader-Willi - disomie uniparentale maternelle',
    syndrome:  'Prader-Willi',
    expected: {
      southern:                       'pat_absent_mat_only',
      criticalRegionMicrosatellites:  'maternal_only',
      outsideRegionMicrosatellites:   'maternal_only',
    },
    explanation:
      "Southern : bande PAT absente, méthylation paternelle nulle. " +
      "Microsatellites dans la région critique et hors région critique : " +
      "allèles uniquement maternels, pas de contribution paternelle détectable. " +
      "L'enfant possède deux copies maternelles du chromosome 15.",
    nextStep: null,
  },

  {
    id:        'pw_del_pat',
    label:     'Prader-Willi - délétion paternelle',
    syndrome:  'Prader-Willi',
    expected: {
      southern:                       'pat_absent_mat_only',
      criticalRegionMicrosatellites:  'maternal_only',
      outsideRegionMicrosatellites:   'maternal_and_paternal',
    },
    explanation:
      "Southern : méthylation paternelle absente. " +
      "Microsatellites région critique : pas d'allèle paternel dans la région critique. " +
      "Microsatellites hors région critique : contribution paternelle présente. " +
      "Le chromosome paternel existe, mais sa région critique (15q11-q13) est délétée.",
    nextStep: null,
  },

  {
    id:        'pw_imprint_pat',
    label:     "Prader-Willi - erreur d'empreinte paternelle",
    syndrome:  'Prader-Willi',
    expected: {
      southern:                       'pat_absent_mat_only',
      criticalRegionMicrosatellites:  'maternal_and_paternal',
      outsideRegionMicrosatellites:   'maternal_and_paternal',
    },
    explanation:
      "Southern : méthylation paternelle absente, mais microsatellites maternels et paternels " +
      "présents dans la région critique et hors région critique. " +
      "Cela exclut une délétion paternelle et une UPD maternelle. " +
      "Le chromosome paternel est structurellement présent mais porte une empreinte de type maternel.",
    nextStep: null,
  },
];

// ─── Valeurs valides ──────────────────────────────────────────────────────────

var VALID_SUSPICION = ['Angelman', 'Prader-Willi', 'unknown'];
var VALID_SOUTHERN  = ['normal', 'mat_absent_pat_only', 'pat_absent_mat_only', 'unknown'];
var VALID_MICRO     = ['maternal_and_paternal', 'paternal_only', 'maternal_only',
                       'non_informative', 'unknown'];

// ─── evaluateDiagnosis ────────────────────────────────────────────────────────
/**
 * Compare les données d'entrée aux valeurs attendues d'un diagnostic.
 *
 * Retourne :
 *   'possible'    — tous les champs correspondent
 *   'impossible'  — au moins un champ contredit le diagnostic
 *   'ambiguous'   — aucune contradiction, mais au moins un champ est inconnu / non informatif
 *
 * @param {object} input
 * @param {object} diagnosis  — entrée de DIAGNOSES
 * @returns {'possible'|'impossible'|'ambiguous'}
 */
function evaluateDiagnosis(input, diagnosis) {
  var fields = ['southern', 'criticalRegionMicrosatellites', 'outsideRegionMicrosatellites'];
  var hasMismatch = false;
  var hasUnknown  = false;

  for (var i = 0; i < fields.length; i++) {
    var field     = fields[i];
    var inputVal  = input[field];
    var expected  = diagnosis.expected[field];

    if (inputVal === 'unknown' || inputVal === 'non_informative') {
      hasUnknown = true;
    } else if (inputVal !== expected) {
      hasMismatch = true;
      break; // inutile de continuer
    }
  }

  if (hasMismatch) return 'impossible';
  if (hasUnknown)  return 'ambiguous';
  return 'possible';
}

// ─── buildExplanationSteps ────────────────────────────────────────────────────

var SOUTHERN_LABELS = {
  'normal':              'Normal — bandes MAT (4,2 kb) et PAT (0,9 kb) toutes deux présentes.',
  'mat_absent_pat_only': 'Bande MAT absente, PAT seule présente → profil compatible Angelman.',
  'pat_absent_mat_only': 'Bande PAT absente, MAT seule présente → profil compatible Prader-Willi.',
  'unknown':             'Résultat inconnu ou non disponible.',
};

var MICRO_LABELS = {
  'maternal_and_paternal': 'Allèles maternels et paternels présents.',
  'paternal_only':         'Allèles paternels uniquement — pas de contribution maternelle.',
  'maternal_only':         'Allèles maternels uniquement — pas de contribution paternelle.',
  'non_informative':       'Non informatif (les parents partagent des allèles de même taille sur ce locus).',
  'unknown':               'Inconnu ou non disponible.',
};

function buildExplanationSteps(input) {
  return [
    'Étape 1 — Southern blot de méthylation : ' +
      (SOUTHERN_LABELS[input.southern] || input.southern),

    'Étape 2 — Microsatellites région critique (15q11-q13) : ' +
      (MICRO_LABELS[input.criticalRegionMicrosatellites] || input.criticalRegionMicrosatellites),

    'Étape 3 — Microsatellites hors région critique (chromosome 15) : ' +
      (MICRO_LABELS[input.outsideRegionMicrosatellites] || input.outsideRegionMicrosatellites),

    'Étape 4 — Comparaison avec la table diagnostique : ' +
      "chaque diagnostic connu est évalué sur la base des trois résultats ci-dessus.",
  ];
}

// ─── Outil inverse : cause → profil attendu ──────────────────────────────────

function getDiagnosisById(id) {
  for (var i = 0; i < DIAGNOSES.length; i++) {
    if (DIAGNOSES[i].id === id) return DIAGNOSES[i];
  }
  return null;
}

function buildExpectedPatternFromCause(diagnosisId) {
  var diagnosis = getDiagnosisById(diagnosisId);
  if (!diagnosis) {
    throw new Error('Diagnostic inconnu : ' + diagnosisId);
  }

  var expected = diagnosis.expected;
  var southernMeaning = SOUTHERN_LABELS[expected.southern] || expected.southern;
  var criticalMeaning = MICRO_LABELS[expected.criticalRegionMicrosatellites] || expected.criticalRegionMicrosatellites;
  var outsideMeaning = MICRO_LABELS[expected.outsideRegionMicrosatellites] || expected.outsideRegionMicrosatellites;

  return {
    diagnosisId: diagnosis.id,
    diagnosisLabel: diagnosis.label,
    syndrome: diagnosis.syndrome,
    expected: {
      southern: expected.southern,
      criticalRegionMicrosatellites: expected.criticalRegionMicrosatellites,
      outsideRegionMicrosatellites: expected.outsideRegionMicrosatellites,
    },
    summary:
      'Si la cause est "' + diagnosis.label + '", alors le Southern et les microsatellites attendus doivent reproduire ce mécanisme.',
    explanationSteps: [
      'Southern attendu : ' + southernMeaning,
      'Microsatellites dans la région critique : ' + criticalMeaning,
      'Microsatellites hors région critique : ' + outsideMeaning,
      diagnosis.explanation,
    ],
    examTip:
      "À l'examen, pars du mécanisme : délétion = perte d'un parent seulement dans la région critique ; " +
      "UPD = un seul parent partout sur le chromosome 15 ; erreur d'empreinte = Southern anormal mais microsatellites biparentaux ; " +
      "mutation UBE3A = Southern et microsatellites normaux.",
  };
}

// ─── buildWarnings ────────────────────────────────────────────────────────────

function buildWarnings(input, possible, ambiguous) {
  var warnings = [];

  if (input.criticalRegionMicrosatellites === 'non_informative') {
    warnings.push(
      "Le microsatellite dans la région critique est non informatif " +
      "(les parents partagent des allèles de même taille sur ce locus). " +
      "Il ne faut pas conclure sur la base de ce seul résultat — d'autres loci doivent être analysés."
    );
  }
  if (input.outsideRegionMicrosatellites === 'non_informative') {
    warnings.push(
      "Le microsatellite hors région critique est non informatif. " +
      "D'autres loci du chromosome 15 doivent être analysés."
    );
  }
  if (input.southern === 'unknown') {
    warnings.push(
      "Le résultat du Southern blot est manquant. " +
      "Ce test est indispensable pour distinguer les mécanismes — le diagnostic est très limité sans lui."
    );
  }
  if (possible.length === 0 && ambiguous.length === 0) {
    warnings.push(
      "Aucun diagnostic connu ne correspond à cette combinaison de résultats. " +
      "Vérifier les données saisies ou envisager un diagnostic non répertorié ici."
    );
  }
  if (possible.length > 1) {
    warnings.push(
      "Plusieurs diagnostics sont compatibles avec ces résultats. " +
      "Des analyses complémentaires sont nécessaires pour les distinguer."
    );
  }

  return warnings;
}

// ─── interpretAngelmanPraderWilli ─────────────────────────────────────────────
/**
 * Interprète les résultats d'un bilan Angelman / Prader-Willi.
 *
 * @param {{
 *   clinicalSuspicion: string,
 *   southern: string,
 *   criticalRegionMicrosatellites: string,
 *   outsideRegionMicrosatellites: string
 * }} input
 *
 * @returns {{
 *   mostLikelyDiagnosis: string|null,
 *   confidence: 'high'|'medium'|'low',
 *   possibleDiagnoses: object[],
 *   explanationSteps: string[],
 *   warnings: string[]
 * }}
 */
function interpretAngelmanPraderWilli(input) {

  // ── Validation ──────────────────────────────────────────────────────────
  if (!input || typeof input !== 'object')
    throw new Error("L'entrée doit être un objet.");
  if (VALID_SUSPICION.indexOf(input.clinicalSuspicion) === -1)
    throw new Error('clinicalSuspicion invalide : ' + input.clinicalSuspicion);
  if (VALID_SOUTHERN.indexOf(input.southern) === -1)
    throw new Error('southern invalide : ' + input.southern);
  if (VALID_MICRO.indexOf(input.criticalRegionMicrosatellites) === -1)
    throw new Error('criticalRegionMicrosatellites invalide : ' + input.criticalRegionMicrosatellites);
  if (VALID_MICRO.indexOf(input.outsideRegionMicrosatellites) === -1)
    throw new Error('outsideRegionMicrosatellites invalide : ' + input.outsideRegionMicrosatellites);

  // ── Filtrage par suspicion clinique ─────────────────────────────────────
  var candidates = DIAGNOSES.filter(function(d) {
    return input.clinicalSuspicion === 'unknown' || d.syndrome === input.clinicalSuspicion;
  });

  // ── Évaluation de chaque diagnostic ─────────────────────────────────────
  var evaluated = candidates.map(function(d) {
    var status = evaluateDiagnosis(input, d);
    var entry = {
      diagnosis:   d.label,
      status:      status,
      explanation: d.explanation,
    };
    if (d.nextStep) entry.nextStep = d.nextStep;
    return entry;
  });

  // ── Diagnostic le plus probable ─────────────────────────────────────────
  var possible  = evaluated.filter(function(d) { return d.status === 'possible'; });
  var ambiguous = evaluated.filter(function(d) { return d.status === 'ambiguous'; });

  var mostLikely = null;
  var confidence = 'low';

  if (possible.length === 1) {
    mostLikely = possible[0].diagnosis;
    confidence = 'high';
  } else if (possible.length > 1) {
    mostLikely = possible[0].diagnosis;
    confidence = 'medium';
  } else if (ambiguous.length >= 1) {
    mostLikely = ambiguous[0].diagnosis;
    confidence = 'low';
  }

  return {
    mostLikelyDiagnosis: mostLikely,
    confidence:          confidence,
    possibleDiagnoses:   evaluated,
    explanationSteps:    buildExplanationSteps(input),
    warnings:            buildWarnings(input, possible, ambiguous),
  };
}

// ─── Exposition ───────────────────────────────────────────────────────────────
(function(exports) {
  exports.interpretAngelmanPraderWilli = interpretAngelmanPraderWilli;
  exports.evaluateDiagnosis            = evaluateDiagnosis;
  exports.buildExpectedPatternFromCause = buildExpectedPatternFromCause;
  exports.DIAGNOSES                    = DIAGNOSES;
})(typeof module !== 'undefined' && module.exports
   ? module.exports
   : (function() { return (self.AngelmanPW = {}); })());
