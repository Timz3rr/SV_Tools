'use strict';

(function(root) {

  var _state = { people: {}, couples: [], diseases: {}, riskOverrides: {} };
  var _listeners = [];
  var _idCounter = 0;

  function _nextId(prefix) {
    _idCounter++;
    return (prefix || 'p') + _idCounter;
  }

  function _notify() {
    _listeners.forEach(function(fn) { try { fn(_state); } catch(e) {} });
  }

  // ── Diseases ────────────────────────────────────────────────────────────────

  function addDisease(id, name, inheritance, color) {
    if (!id || !name) throw new Error('ID et nom de maladie requis.');
    if (_state.diseases[id]) throw new Error('Maladie "' + id + '" existe déjà.');
    _state.diseases[id] = { name: name, inheritance: inheritance || 'autosomal_recessive', color: color || '#3366cc' };
    _notify();
  }

  function editDisease(id, updates) {
    if (!_state.diseases[id]) throw new Error('Maladie "' + id + '" introuvable.');
    var d = _state.diseases[id];
    if (updates.name !== undefined) d.name = updates.name;
    if (updates.inheritance !== undefined) d.inheritance = updates.inheritance;
    if (updates.color !== undefined) d.color = updates.color;
    _notify();
  }

  function removeDisease(id) {
    if (!_state.diseases[id]) throw new Error('Maladie "' + id + '" introuvable.');
    delete _state.diseases[id];
    // Remove from people phenotypes
    Object.keys(_state.people).forEach(function(pid) {
      var p = _state.people[pid];
      if (p.phenotypes && p.phenotypes[id] !== undefined) {
        delete p.phenotypes[id];
      }
    });
    _notify();
  }

  // ── People ──────────────────────────────────────────────────────────────────

  function addPerson(opts) {
    opts = opts || {};
    var id = opts.id || _nextId('p');
    if (_state.people[id]) throw new Error('Individu "' + id + '" existe déjà.');
    _state.people[id] = {
      id: id,
      name: opts.name || id,
      sex: opts.sex || 'unknown',
      generation: opts.generation || 1,
      phenotypes: opts.phenotypes || {},
      statusOverrides: opts.statusOverrides || undefined,
    };
    if (!_state.people[id].statusOverrides) delete _state.people[id].statusOverrides;
    _notify();
    return id;
  }

  function editPerson(id, updates) {
    if (!_state.people[id]) throw new Error('Individu "' + id + '" introuvable.');
    var p = _state.people[id];
    if (updates.name !== undefined) p.name = updates.name;
    if (updates.sex !== undefined) p.sex = updates.sex;
    if (updates.generation !== undefined) p.generation = updates.generation;
    if (updates.phenotypes !== undefined) p.phenotypes = updates.phenotypes;
    if (updates.statusOverrides !== undefined) {
      if (updates.statusOverrides) {
        p.statusOverrides = updates.statusOverrides;
      } else {
        delete p.statusOverrides;
      }
    }
    _notify();
  }

  function removePerson(id) {
    if (!_state.people[id]) throw new Error('Individu "' + id + '" introuvable.');
    // Remove from couples
    _state.couples = _state.couples.filter(function(c) {
      return c.parents.indexOf(id) === -1 && c.children.indexOf(id) === -1;
    });
    delete _state.people[id];
    _notify();
  }

  // ── Couples ─────────────────────────────────────────────────────────────────

  function addCouple(p1Id, p2Id) {
    if (!_state.people[p1Id]) throw new Error('Individu "' + p1Id + '" introuvable.');
    if (!_state.people[p2Id]) throw new Error('Individu "' + p2Id + '" introuvable.');
    if (p1Id === p2Id) throw new Error('Un individu ne peut pas former un couple avec lui-même.');
    // Check not already coupled
    var existing = _state.couples.find(function(c) {
      return (c.parents[0] === p1Id && c.parents[1] === p2Id) ||
             (c.parents[0] === p2Id && c.parents[1] === p1Id);
    });
    if (existing) throw new Error('Ce couple existe déjà.');
    var coupleId = 'c' + p1Id + '_' + p2Id;
    _state.couples.push({ id: coupleId, parents: [p1Id, p2Id], children: [] });
    _notify();
    return coupleId;
  }

  function removeCouple(coupleId) {
    var idx = _state.couples.findIndex(function(c) { return c.id === coupleId; });
    if (idx === -1) throw new Error('Couple "' + coupleId + '" introuvable.');
    _state.couples.splice(idx, 1);
    _notify();
  }

  function addNewChild(coupleId, opts) {
    var couple = _state.couples.find(function(c) { return c.id === coupleId; });
    if (!couple) throw new Error('Couple "' + coupleId + '" introuvable.');
    opts = opts || {};
    var id = opts.id || _nextId('c');
    if (_state.people[id]) throw new Error('Individu "' + id + '" existe déjà.');
    _state.people[id] = {
      id: id,
      name: opts.name || id,
      sex: opts.sex || 'unknown',
      generation: opts.generation || 1,
      phenotypes: opts.phenotypes || {},
    };
    couple.children.push(id);
    _notify();
    return id;
  }

  // ── Import / Export ──────────────────────────────────────────────────────────

  function exportJSON() {
    return JSON.stringify(_state, null, 2);
  }

  function importJSON(jsonOrString) {
    var data = (typeof jsonOrString === 'string') ? JSON.parse(jsonOrString) : jsonOrString;
    if (!data || typeof data !== 'object') throw new Error('JSON invalide.');
    _state = {
      people:        data.people        || {},
      couples:       data.couples       || [],
      diseases:      data.diseases      || {},
      riskOverrides: data.riskOverrides || {},
    };
    _notify();
  }

  function makeOverrideKey(p1Id, p2Id, childSex) {
    return [p1Id, p2Id].sort().join('_') + '_' + childSex;
  }

  function setRiskOverride(p1Id, p2Id, childSex, overrides) {
    var key = makeOverrideKey(p1Id, p2Id, childSex);
    if (!overrides || Object.keys(overrides).length === 0) {
      delete _state.riskOverrides[key];
    } else {
      _state.riskOverrides[key] = overrides;
    }
    _notify();
  }

  function reset() {
    _state = { people: {}, couples: [], diseases: {}, riskOverrides: {} };
    _idCounter = 0;
    _notify();
  }

  function getState() {
    return _state;
  }

  function onChange(fn) {
    _listeners.push(fn);
  }

  // ── Export ───────────────────────────────────────────────────────────────────

  var PedigreeBuilder = {
    addDisease:      addDisease,
    editDisease:     editDisease,
    removeDisease:   removeDisease,
    addPerson:       addPerson,
    editPerson:      editPerson,
    removePerson:    removePerson,
    addCouple:       addCouple,
    removeCouple:    removeCouple,
    addNewChild:     addNewChild,
    makeOverrideKey: makeOverrideKey,
    setRiskOverride: setRiskOverride,
    exportJSON:      exportJSON,
    importJSON:      importJSON,
    reset:           reset,
    getState:        getState,
    onChange:        onChange,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = PedigreeBuilder;
  } else {
    root.PedigreeBuilder = PedigreeBuilder;
  }

}(typeof self !== 'undefined' ? self : this));
