'use strict';

(function(root) {

  var COL_WIDTH  = 90;
  var ROW_HEIGHT = 140;
  var MARGIN     = 60;
  var NODE_R     = 16;

  // Lighten a hex color towards white by `factor` (0=same, 1=white)
  function _lightenHex(hex, factor) {
    hex = hex.replace('#', '');
    if (hex.length === 3) {
      hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
    }
    var r = parseInt(hex.substring(0,2), 16);
    var g = parseInt(hex.substring(2,4), 16);
    var b = parseInt(hex.substring(4,6), 16);
    r = Math.round(r + (255 - r) * factor);
    g = Math.round(g + (255 - g) * factor);
    b = Math.round(b + (255 - b) * factor);
    return '#' + [r,g,b].map(function(c) {
      return c.toString(16).padStart(2, '0');
    }).join('');
  }

  function _svgEl(tag, attrs) {
    var el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.keys(attrs || {}).forEach(function(k) { el.setAttribute(k, attrs[k]); });
    return el;
  }

  // Natural string comparison: "II3" < "II10", "I1" < "I2"
  function _naturalCompare(a, b) {
    var re = /(\d+)|(\D+)/g;
    var aParts = (a || '').match(re) || [];
    var bParts = (b || '').match(re) || [];
    for (var i = 0; i < Math.max(aParts.length, bParts.length); i++) {
      var ap = aParts[i] || '', bp = bParts[i] || '';
      var an = parseInt(ap, 10), bn = parseInt(bp, 10);
      if (!isNaN(an) && !isNaN(bn)) { if (an !== bn) return an - bn; }
      else { if (ap < bp) return -1; if (ap > bp) return 1; }
    }
    return 0;
  }

  // Build layout: returns map personId → {cx, cy}
  // Uses a bottom-up pass so parents are centered above their children,
  // which avoids couple drop-lines traversing unrelated nodes.
  function _buildLayout(state) {
    var people  = state.people;
    var couples = state.couples;

    // Group by generation
    var byGen = {};
    Object.values(people).forEach(function(p) {
      var g = p.generation || 1;
      if (!byGen[g]) byGen[g] = [];
      byGen[g].push(p.id);
    });
    var gens = Object.keys(byGen).map(Number).sort(function(a, b) { return a - b; });

    var positions = {};

    // ── Bottom-up: last generation first ──────────────────────────────────────
    for (var gi = gens.length - 1; gi >= 0; gi--) {
      var gen = gens[gi];
      var cy  = MARGIN + (gen - 1) * ROW_HEIGHT;
      var ids = byGen[gen].slice();

      // Collect couples whose both parents are in this generation
      var genCouples = [];
      var inCouple   = {};
      couples.forEach(function(couple) {
        var p1 = couple.parents[0], p2 = couple.parents[1];
        if (!p2) return;
        if (ids.indexOf(p1) === -1 || ids.indexOf(p2) === -1) return;
        if (inCouple[p1] || inCouple[p2]) return;
        inCouple[p1] = inCouple[p2] = true;

        // Convention: male on left, female on right
        var left = p1, right = p2;
        var p1o  = people[p1], p2o = people[p2];
        if (p1o && p2o && p1o.sex === 'female' && p2o.sex === 'male') {
          left = p2; right = p1;
        }

        // Desired left-slot: center this couple above its children (already placed)
        var desiredSlotL = null;
        var children = couple.children || [];
        if (children.length > 0) {
          var childXs = children
            .filter(function(cid) { return positions[cid]; })
            .map(function(cid)    { return positions[cid].cx; });
          if (childXs.length > 0) {
            var minX = Math.min.apply(null, childXs);
            var maxX = Math.max.apply(null, childXs);
            var midX = (minX + maxX) / 2;
            // slot such that MARGIN + (slotL + 0.5)*COL_WIDTH ≈ midX
            desiredSlotL = Math.round((midX - MARGIN - COL_WIDTH / 2) / COL_WIDTH);
            if (desiredSlotL < 0) desiredSlotL = 0;
          }
        }
        genCouples.push({ left: left, right: right, desiredSlotL: desiredSlotL });
      });

      var singles = ids.filter(function(id) { return !inCouple[id]; });

      // Sort: constrained couples first (ascending desired slot), then free couples (by name), then singles
      genCouples.sort(function(a, b) {
        if (a.desiredSlotL !== null && b.desiredSlotL !== null) return a.desiredSlotL - b.desiredSlotL;
        if (a.desiredSlotL !== null) return -1;
        if (b.desiredSlotL !== null) return 1;
        // Both free: sort by left member name
        var na = (people[a.left] && people[a.left].name) || a.left;
        var nb = (people[b.left] && people[b.left].name) || b.left;
        return _naturalCompare(na, nb);
      });

      // Sort singles by name so they appear in numerical order
      singles.sort(function(a, b) {
        var na = (people[a] && people[a].name) || a;
        var nb = (people[b] && people[b].name) || b;
        return _naturalCompare(na, nb);
      });

      // Assign slots ──────────────────────────────────────────────────────────
      var occupied    = {}; // slot → true
      var assignments = {}; // personId → slot

      function pairFits(s) { return !occupied[s] && !occupied[s + 1]; }

      // Constrained couples: place at or after their desired slot
      genCouples.forEach(function(cg) {
        if (cg.desiredSlotL === null) return;
        var s = cg.desiredSlotL;
        while (!pairFits(s)) s++;
        occupied[s] = occupied[s + 1] = true;
        assignments[cg.left]  = s;
        assignments[cg.right] = s + 1;
      });

      // Free couples: pack into earliest available pair
      genCouples.forEach(function(cg) {
        if (cg.desiredSlotL !== null) return;
        var s = 0;
        while (!pairFits(s)) s++;
        occupied[s] = occupied[s + 1] = true;
        assignments[cg.left]  = s;
        assignments[cg.right] = s + 1;
      });

      // Singles: pack into earliest free slot
      singles.forEach(function(id) {
        var s = 0;
        while (occupied[s]) s++;
        occupied[s] = true;
        assignments[id] = s;
      });

      // Store positions
      ids.forEach(function(id) {
        var slot = assignments[id] !== undefined ? assignments[id] : 0;
        positions[id] = { cx: MARGIN + slot * COL_WIDTH, cy: cy };
      });
    }

    return positions;
  }

  function _getFillColor(phenotype, color) {
    if (phenotype === 'affected')   return color;
    if (phenotype === 'carrier')    return _lightenHex(color, 0.6);
    if (phenotype === 'unaffected') return '#ffffff';
    return '#dddddd'; // unknown
  }

  // Render one person node. Returns a <g> element.
  function _renderPerson(person, cx, cy, diseases, svgDefs) {
    var g = _svgEl('g', {
      'class': 'person-node',
      'data-id': person.id,
      'style': 'cursor:pointer',
    });

    var diseaseIds  = Object.keys(diseases);
    var N           = diseaseIds.length;
    var phenotypes  = person.phenotypes || {};
    var hasCarrier  = false;

    if (N === 0) {
      // Single fill: white
      if (person.sex === 'female') {
        g.appendChild(_svgEl('circle', {
          'class': 'person-shape',
          cx: cx, cy: cy, r: NODE_R,
          fill: '#ffffff', stroke: '#333', 'stroke-width': 2,
        }));
      } else if (person.sex === 'male') {
        g.appendChild(_svgEl('rect', {
          'class': 'person-shape',
          x: cx - NODE_R, y: cy - NODE_R,
          width: 2 * NODE_R, height: 2 * NODE_R,
          fill: '#ffffff', stroke: '#333', 'stroke-width': 2,
        }));
      } else {
        var pts = [cx+','+( cy-NODE_R), (cx+NODE_R)+','+cy, cx+','+(cy+NODE_R), (cx-NODE_R)+','+cy].join(' ');
        g.appendChild(_svgEl('polygon', {
          'class': 'person-shape',
          points: pts,
          fill: '#ffffff', stroke: '#333', 'stroke-width': 2,
        }));
      }
    } else {
      // Strips
      var stripW = (2 * NODE_R) / N;

      // For circle: use clipPaths defined in <defs>
      if (person.sex === 'female') {
        diseaseIds.forEach(function(dId, i) {
          var disease    = diseases[dId];
          var phenotype  = phenotypes[dId] || 'unknown';
          var fill       = _getFillColor(phenotype, disease.color);
          if (phenotype === 'carrier') hasCarrier = true;
          var startX     = (cx - NODE_R) + i * stripW;
          var clipId     = 'clip-' + person.id + '-' + i;
          // Add clipPath to defs
          var clipPath   = _svgEl('clipPath', { id: clipId });
          var clipRect   = _svgEl('rect', {
            x: startX, y: cy - NODE_R - 1,
            width: stripW, height: 2 * NODE_R + 2,
          });
          clipPath.appendChild(clipRect);
          svgDefs.appendChild(clipPath);
          // Clipped circle
          var c = _svgEl('circle', {
            cx: cx, cy: cy, r: NODE_R,
            fill: fill,
            'clip-path': 'url(#' + clipId + ')',
          });
          g.appendChild(c);
        });
        // Outline on top
        g.appendChild(_svgEl('circle', {
          'class': 'person-shape',
          cx: cx, cy: cy, r: NODE_R,
          fill: 'none', stroke: '#333', 'stroke-width': 2,
        }));

      } else if (person.sex === 'male') {
        diseaseIds.forEach(function(dId, i) {
          var disease   = diseases[dId];
          var phenotype = phenotypes[dId] || 'unknown';
          var fill      = _getFillColor(phenotype, disease.color);
          if (phenotype === 'carrier') hasCarrier = true;
          var startX    = (cx - NODE_R) + i * stripW;
          g.appendChild(_svgEl('rect', {
            x: startX, y: cy - NODE_R,
            width: stripW, height: 2 * NODE_R,
            fill: fill,
          }));
        });
        g.appendChild(_svgEl('rect', {
          'class': 'person-shape',
          x: cx - NODE_R, y: cy - NODE_R,
          width: 2 * NODE_R, height: 2 * NODE_R,
          fill: 'none', stroke: '#333', 'stroke-width': 2,
        }));

      } else {
        // Diamond (unknown)
        diseaseIds.forEach(function(dId, i) {
          var disease   = diseases[dId];
          var phenotype = phenotypes[dId] || 'unknown';
          var fill      = _getFillColor(phenotype, disease.color);
          if (phenotype === 'carrier') hasCarrier = true;
          var startX    = (cx - NODE_R) + i * stripW;
          var clipId    = 'clip-' + person.id + '-' + i;
          var clipPath  = _svgEl('clipPath', { id: clipId });
          var clipRect  = _svgEl('rect', {
            x: startX, y: cy - NODE_R - 1,
            width: stripW, height: 2 * NODE_R + 2,
          });
          clipPath.appendChild(clipRect);
          svgDefs.appendChild(clipPath);
          var pts = [cx+','+(cy-NODE_R), (cx+NODE_R)+','+cy, cx+','+(cy+NODE_R), (cx-NODE_R)+','+cy].join(' ');
          var poly = _svgEl('polygon', {
            points: pts, fill: fill,
            'clip-path': 'url(#' + clipId + ')',
          });
          g.appendChild(poly);
        });
        var pts2 = [cx+','+(cy-NODE_R), (cx+NODE_R)+','+cy, cx+','+(cy+NODE_R), (cx-NODE_R)+','+cy].join(' ');
        g.appendChild(_svgEl('polygon', {
          'class': 'person-shape',
          points: pts2,
          fill: 'none', stroke: '#333', 'stroke-width': 2,
        }));
      }
    }

    // Carrier dot
    if (hasCarrier) {
      g.appendChild(_svgEl('circle', {
        cx: cx, cy: cy, r: 4,
        fill: '#333',
      }));
    }

    // Label
    var label = _svgEl('text', {
      x: cx, y: cy + NODE_R + 14,
      'text-anchor': 'middle',
      'font-size': '11',
      'font-family': 'sans-serif',
      fill: '#333',
    });
    label.textContent = person.name || person.id;
    g.appendChild(label);

    // Click handler
    g.addEventListener('click', function() {
      if (window.PedigreeUI && typeof window.PedigreeUI.onPersonClick === 'function') {
        window.PedigreeUI.onPersonClick(person.id);
      }
    });

    return g;
  }

  function render(state, containerId) {
    var container = document.getElementById(containerId);
    if (!container) return;

    var people  = state.people  || {};
    var couples = state.couples || [];
    var diseases = state.diseases || {};

    if (Object.keys(people).length === 0) {
      container.innerHTML = '<div class="tree-empty">Aucun individu. Utilisez les formulaires à gauche pour construire l\'arbre.</div>';
      return;
    }

    var positions = _buildLayout(state);

    // Compute SVG dimensions
    var maxCx = MARGIN, maxCy = MARGIN;
    Object.values(positions).forEach(function(pos) {
      if (pos.cx > maxCx) maxCx = pos.cx;
      if (pos.cy > maxCy) maxCy = pos.cy;
    });
    var svgW = maxCx + MARGIN + 60;
    var svgH = maxCy + MARGIN + 60;

    var svg = _svgEl('svg', {
      width:  svgW,
      height: svgH,
      'class': 'pedigree-svg',
    });

    var defs = _svgEl('defs', {});
    svg.appendChild(defs);

    // Lines group (drawn first, behind nodes)
    var linesG = _svgEl('g', { 'class': 'pedigree-lines' });
    svg.appendChild(linesG);

    // Nodes group
    var nodesG = _svgEl('g', { 'class': 'pedigree-nodes' });
    svg.appendChild(nodesG);

    var lineStyle = { stroke: '#555', 'stroke-width': '1.5', fill: 'none' };

    // Draw couple lines and descent lines
    couples.forEach(function(couple) {
      var p1Id = couple.parents[0], p2Id = couple.parents[1];
      var pos1 = positions[p1Id], pos2 = p2Id ? positions[p2Id] : null;
      if (!pos1) return;

      var coupleY  = pos1.cy;
      var midX;

      if (pos2) {
        // Ensure left/right order
        var leftPos  = pos1.cx < pos2.cx ? pos1 : pos2;
        var rightPos = pos1.cx < pos2.cx ? pos2 : pos1;
        midX = (leftPos.cx + rightPos.cx) / 2;

        // Couple line
        linesG.appendChild(_svgEl('line', Object.assign({
          x1: leftPos.cx + NODE_R, y1: coupleY,
          x2: rightPos.cx - NODE_R, y2: coupleY,
        }, lineStyle)));
      } else {
        midX = pos1.cx;
      }

      if (couple.children.length === 0) return;

      // Determine children positions
      var childPositions = couple.children.map(function(cid) { return positions[cid]; }).filter(Boolean);
      if (childPositions.length === 0) return;

      var childY    = childPositions[0].cy;
      var barY      = coupleY + (childY - coupleY) / 2;

      // Drop line from couple midpoint to barY
      linesG.appendChild(_svgEl('line', Object.assign({
        x1: midX, y1: coupleY,
        x2: midX, y2: barY,
      }, lineStyle)));

      // Horizontal bar connecting children
      var childXs = childPositions.map(function(p) { return p.cx; });
      var barX1   = Math.min.apply(null, childXs);
      var barX2   = Math.max.apply(null, childXs);

      if (barX1 < barX2) {
        // Extend bar to midX if midX is outside range
        var barLeft  = Math.min(barX1, midX);
        var barRight = Math.max(barX2, midX);
        linesG.appendChild(_svgEl('line', Object.assign({
          x1: barLeft, y1: barY,
          x2: barRight, y2: barY,
        }, lineStyle)));
      } else {
        // Single child: just draw a line from midX to child
        linesG.appendChild(_svgEl('line', Object.assign({
          x1: midX, y1: barY,
          x2: barX1, y2: barY,
        }, lineStyle)));
      }

      // Stems from bar to each child
      childPositions.forEach(function(cp) {
        linesG.appendChild(_svgEl('line', Object.assign({
          x1: cp.cx, y1: barY,
          x2: cp.cx, y2: cp.cy - NODE_R,
        }, lineStyle)));
      });
    });

    // Draw people
    Object.values(people).forEach(function(person) {
      var pos = positions[person.id];
      if (!pos) return;
      var node = _renderPerson(person, pos.cx, pos.cy, diseases, defs);
      nodesG.appendChild(node);
    });

    container.innerHTML = '';
    container.appendChild(svg);
  }

  var PedigreeRenderer = { render: render };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = PedigreeRenderer;
  } else {
    root.PedigreeRenderer = PedigreeRenderer;
  }

}(typeof self !== 'undefined' ? self : this));
