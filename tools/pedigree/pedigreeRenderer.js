'use strict';

(function(root) {

  var COL_WIDTH  = 90;
  var ROW_HEIGHT = 140;
  var MARGIN     = 60;
  var NODE_R     = 16;
  var UNIT_GAP   = 0;
  var BLOCK_GAP  = 1;

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

  function _personLabel(people, id) {
    return (people[id] && people[id].name) || id;
  }

  function _normalizeCoupleParents(couple, people) {
    var p1 = couple.parents[0];
    var p2 = couple.parents[1];
    var left = p1;
    var right = p2;
    var p1o = people[p1];
    var p2o = people[p2];

    if (p1o && p2o) {
      if (p1o.sex === 'female' && p2o.sex === 'male') {
        left = p2;
        right = p1;
      } else if (p1o.sex === p2o.sex &&
                 _naturalCompare(_personLabel(people, p1), _personLabel(people, p2)) > 0) {
        left = p2;
        right = p1;
      }
    }

    return [left, right];
  }

  function _coupleCenterX(couple, positions) {
    var p1 = positions[couple.parents[0]];
    var p2 = positions[couple.parents[1]];
    if (!p1 || !p2) return null;
    return (p1.cx + p2.cx) / 2;
  }

  // Build layout: returns map personId → {cx, cy}
  // Couples are treated as family units and sibling groups are centered under
  // their actual parent couple whenever that parent couple is already placed.
  function _buildLayout(state) {
    var people = state.people || {};
    var couples = state.couples || [];
    var byGen = {};

    Object.values(people).forEach(function(p) {
      var g = p.generation || 1;
      if (!byGen[g]) byGen[g] = [];
      byGen[g].push(p.id);
    });

    var gens = Object.keys(byGen).map(Number).sort(function(a, b) { return a - b; });
    var positions = {};
    var parentCoupleOf = {};
    var childIndexWithinParentCouple = {};
    var couplesById = {};
    var couplesByGen = {};

    couples.forEach(function(couple) {
      couplesById[couple.id] = couple;

      (couple.children || []).forEach(function(cid, idx) {
        if (parentCoupleOf[cid] === undefined) parentCoupleOf[cid] = couple.id;
        childIndexWithinParentCouple[cid] = idx;
      });

      var p1 = people[couple.parents[0]];
      var p2 = people[couple.parents[1]];
      if (!p1 || !p2) return;
      if ((p1.generation || 1) !== (p2.generation || 1)) return;

      var gen = p1.generation || 1;
      if (!couplesByGen[gen]) couplesByGen[gen] = [];
      couplesByGen[gen].push(couple);
    });

    gens.forEach(function(gen) {
      var cy = MARGIN + (gen - 1) * ROW_HEIGHT;
      var ids = byGen[gen].slice().sort(function(a, b) {
        return _naturalCompare(_personLabel(people, a), _personLabel(people, b));
      });
      var used = {};
      var units = [];
      var unitCounter = 0;
      var blockCounter = 0;

      (couplesByGen[gen] || []).forEach(function(couple) {
        var p1 = couple.parents[0];
        var p2 = couple.parents[1];
        if (used[p1] || used[p2]) return;

        used[p1] = true;
        used[p2] = true;

        var ordered = _normalizeCoupleParents(couple, people);
        var p1ParentCoupleId = parentCoupleOf[p1];
        var p2ParentCoupleId = parentCoupleOf[p2];
        var p1ParentCouple = p1ParentCoupleId ? couplesById[p1ParentCoupleId] : null;
        var p2ParentCouple = p2ParentCoupleId ? couplesById[p2ParentCoupleId] : null;
        var p1AnchorX = p1ParentCouple ? _coupleCenterX(p1ParentCouple, positions) : null;
        var p2AnchorX = p2ParentCouple ? _coupleCenterX(p2ParentCouple, positions) : null;

        if (p1AnchorX !== null && p2AnchorX !== null && p1AnchorX !== p2AnchorX) {
          ordered = p1AnchorX < p2AnchorX ? [p1, p2] : [p2, p1];
        }

        units.push({
          id: 'u' + (unitCounter++),
          kind: 'couple',
          coupleId: couple.id,
          members: ordered,
          widthSlots: 2,
          sortLabel: _personLabel(people, ordered[0]) + ' ' + _personLabel(people, ordered[1]),
        });
      });

      ids.forEach(function(id) {
        if (used[id]) return;
        units.push({
          id: 'u' + (unitCounter++),
          kind: 'single',
          members: [id],
          widthSlots: 1,
          sortLabel: _personLabel(people, id),
        });
      });

      units.forEach(function(unit) {
        var seenAnchorGroups = {};
        var anchorGroups = [];
        var anchorXs = [];
        var orderIndex = null;

        unit.members.forEach(function(id) {
          var parentCoupleId = parentCoupleOf[id];
          if (!parentCoupleId) return;

          var parentCouple = couplesById[parentCoupleId];
          var anchorX = parentCouple ? _coupleCenterX(parentCouple, positions) : null;
          if (anchorX === null) return;

          anchorXs.push(anchorX);
          if (!seenAnchorGroups[parentCoupleId]) {
            seenAnchorGroups[parentCoupleId] = true;
            anchorGroups.push(parentCoupleId);
          }

          var childOrder = childIndexWithinParentCouple[id];
          if (childOrder !== undefined && (orderIndex === null || childOrder < orderIndex)) {
            orderIndex = childOrder;
          }
        });

        unit.anchorX = anchorXs.length
          ? anchorXs.reduce(function(sum, value) { return sum + value; }, 0) / anchorXs.length
          : null;
        unit.anchorGroup = anchorGroups.length === 1 ? anchorGroups[0] : null;
        unit.orderIndex = orderIndex === null ? 9007199254740991 : orderIndex;
      });

      var groupedBlocks = {};
      var blocks = [];

      function _makeBlock(unit, key, anchorX) {
        return {
          id: key || ('b' + (blockCounter++)),
          anchorX: anchorX,
          units: unit ? [unit] : [],
        };
      }

      units.forEach(function(unit) {
        if (unit.anchorGroup) {
          if (!groupedBlocks[unit.anchorGroup]) {
            groupedBlocks[unit.anchorGroup] = _makeBlock(null, unit.anchorGroup, unit.anchorX);
            blocks.push(groupedBlocks[unit.anchorGroup]);
          }
          groupedBlocks[unit.anchorGroup].units.push(unit);
          return;
        }

        blocks.push(_makeBlock(unit, null, unit.anchorX));
      });

      blocks.forEach(function(block) {
        block.units.sort(function(a, b) {
          if (a.orderIndex !== b.orderIndex) return a.orderIndex - b.orderIndex;
          if (a.kind !== b.kind) return a.kind === 'couple' ? -1 : 1;
          return _naturalCompare(a.sortLabel, b.sortLabel);
        });

        block.widthSlots = 0;
        block.hasCouple = false;
        block.sortLabel = block.units.length ? block.units[0].sortLabel : '';

        block.units.forEach(function(unit, idx) {
          block.widthSlots += unit.widthSlots;
          if (idx > 0) block.widthSlots += UNIT_GAP;
          if (unit.kind === 'couple') block.hasCouple = true;
        });
      });

      blocks.sort(function(a, b) {
        if (a.anchorX !== null && b.anchorX !== null) return a.anchorX - b.anchorX;
        if (a.anchorX !== null) return -1;
        if (b.anchorX !== null) return 1;
        if (a.hasCouple !== b.hasCouple) return a.hasCouple ? -1 : 1;
        return _naturalCompare(a.sortLabel, b.sortLabel);
      });

      var nextX = MARGIN;
      blocks.forEach(function(block) {
        var spanPx = (block.widthSlots - 1) * COL_WIDTH;
        var startX = nextX;
        if (block.anchorX !== null) {
          startX = block.anchorX - (spanPx / 2);
          if (startX < nextX) startX = nextX;
        }

        var cursorX = startX;
        block.units.forEach(function(unit, idx) {
          if (idx > 0) cursorX += UNIT_GAP * COL_WIDTH;

          if (unit.kind === 'couple') {
            positions[unit.members[0]] = { cx: cursorX, cy: cy };
            positions[unit.members[1]] = { cx: cursorX + COL_WIDTH, cy: cy };
            cursorX += 2 * COL_WIDTH;
          } else {
            positions[unit.members[0]] = { cx: cursorX, cy: cy };
            cursorX += COL_WIDTH;
          }
        });

        nextX = startX + spanPx + (BLOCK_GAP * COL_WIDTH);
      });
    });

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

      // Use the top-most y so cross-generation couples draw at the upper parent's level
      var coupleY  = pos2 ? Math.min(pos1.cy, pos2.cy) : pos1.cy;
      var midX;
      var leftPos, rightPos;

      if (pos2) {
        // Ensure left/right order
        leftPos  = pos1.cx < pos2.cx ? pos1 : pos2;
        rightPos = pos1.cx < pos2.cx ? pos2 : pos1;
        midX = (leftPos.cx + rightPos.cx) / 2;

        // Couple line — drawn at the y of the upper (or same-level) parent
        linesG.appendChild(_svgEl('line', Object.assign({
          x1: leftPos.cx + NODE_R, y1: coupleY,
          x2: rightPos.cx - NODE_R, y2: coupleY,
        }, lineStyle)));
      } else {
        leftPos = rightPos = null;
        midX = pos1.cx;
      }

      if (couple.children.length === 0) return;

      // Determine children positions
      var childPositions = couple.children.map(function(cid) { return positions[cid]; }).filter(Boolean);
      if (childPositions.length === 0) return;

      var childY    = Math.min.apply(null, childPositions.map(function(p) { return p.cy; }));
      var barY      = coupleY + (childY - coupleY) / 2;

      var childXs = childPositions.map(function(p) { return p.cx; });
      var barX1   = Math.min.apply(null, childXs);
      var barX2   = Math.max.apply(null, childXs);

      // For a single child that lies outside the couple's horizontal span, drop from the
      // nearest couple endpoint instead of midX.  This avoids a long cross-column horizontal
      // line and prevents the descent from visually overlapping an unrelated parent above.
      var dropX = midX;
      if (leftPos && barX1 === barX2) {
        if (barX1 <= leftPos.cx)  dropX = leftPos.cx  + NODE_R;  // child left of couple
        if (barX1 >= rightPos.cx) dropX = rightPos.cx - NODE_R;  // child right of couple
      }

      // Drop line from dropX to barY
      linesG.appendChild(_svgEl('line', Object.assign({
        x1: dropX, y1: coupleY,
        x2: dropX, y2: barY,
      }, lineStyle)));

      // Horizontal bar connecting children
      if (barX1 < barX2) {
        // Multiple children: extend bar to cover dropX as well
        var barLeft  = Math.min(barX1, dropX);
        var barRight = Math.max(barX2, dropX);
        linesG.appendChild(_svgEl('line', Object.assign({
          x1: barLeft, y1: barY,
          x2: barRight, y2: barY,
        }, lineStyle)));
      } else {
        // Single child: horizontal from dropX to child (zero-length if already aligned)
        if (dropX !== barX1) {
          linesG.appendChild(_svgEl('line', Object.assign({
            x1: dropX, y1: barY,
            x2: barX1, y2: barY,
          }, lineStyle)));
        }
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
