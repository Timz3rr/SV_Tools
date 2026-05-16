'use strict';

// ─── Arithmétique exacte sur les fractions (n/d, entiers) ────────────────────
//
// Toutes les fractions sont automatiquement simplifiées (forme irréductible).
// Représentation : { n: number, d: number }  (d > 0 toujours)

function _gcd(a, b) {
  a = Math.abs(a); b = Math.abs(b);
  while (b) { var t = b; b = a % b; a = t; }
  return a || 1;
}

function _simplify(n, d) {
  if (d === 0) throw new Error('Fraction : dénominateur nul.');
  if (n === 0) return { n: 0, d: 1 };
  if (d < 0)  { n = -n; d = -d; }
  var g = _gcd(Math.abs(n), d);
  return { n: n / g, d: d / g };
}

var F = {};

// ── Constantes ────────────────────────────────────────────────────────────────
F.ZERO = { n: 0, d: 1 };
F.ONE  = { n: 1, d: 1 };
F.HALF = { n: 1, d: 2 };

// ── Constructeur ──────────────────────────────────────────────────────────────
F.frac = function(n, d) { return _simplify(n, d === undefined ? 1 : d); };

// ── Parsing ───────────────────────────────────────────────────────────────────
// Accepte : { n, d }, "1/4", "2/3", "0", "1", entier
F.parse = function(val) {
  if (val !== null && typeof val === 'object' && 'n' in val && 'd' in val) return val;
  var s = String(val).trim();
  if (s === '0') return F.ZERO;
  if (s === '1') return F.ONE;
  var m = s.match(/^(-?\d+)\s*\/\s*(\d+)$/);
  if (m) return _simplify(parseInt(m[1], 10), parseInt(m[2], 10));
  var v = parseInt(s, 10);
  if (!isNaN(v)) return _simplify(v, 1);
  throw new Error('Impossible de parser la fraction : "' + val + '"');
};

// ── Opérations ────────────────────────────────────────────────────────────────
F.mul = function(a, b) { return _simplify(a.n * b.n, a.d * b.d); };
F.div = function(a, b) {
  if (b.n === 0) throw new Error('Division par zéro.');
  return _simplify(a.n * b.d, a.d * b.n);
};
F.add = function(a, b) { return _simplify(a.n * b.d + b.n * a.d, a.d * b.d); };
F.sub = function(a, b) { return _simplify(a.n * b.d - b.n * a.d, a.d * b.d); };

// 1 - f
F.complement = function(f) { return _simplify(f.d - f.n, f.d); };

// ── Comparaisons ──────────────────────────────────────────────────────────────
F.eq     = function(a, b) { return a.n === b.n && a.d === b.d; };
F.isZero = function(f)    { return f.n === 0; };
F.isOne  = function(f)    { return f.n === f.d; };
F.toFloat = function(f)   { return f.n / f.d; };

// ── Formatage ─────────────────────────────────────────────────────────────────
F.fmt = function(f) {
  if (f.d === 1) return String(f.n);
  return f.n + '/' + f.d;
};

// ─── Export ───────────────────────────────────────────────────────────────────
(function(exports) {
  Object.keys(F).forEach(function(k) { exports[k] = F[k]; });
})(typeof module !== 'undefined' && module.exports
   ? module.exports
   : (function() { return (self.Fraction = F); })());
