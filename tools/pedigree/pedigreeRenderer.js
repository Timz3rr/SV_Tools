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

  // Build layout: returns map personId → {cx, cy, slot}
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

    // For each generation, order people so couple partners are adjacent
    var positions = {}; // personId → {cx, cy}
    var gens = Object.keys(byGen).map(Number).sort(function(a,b){return a-b;});

    gens.forEach(function(gen) {
      var ids = byGen[gen].slice(); // copy
      // Build ordered list: pair up partners
      var ordered = [];
      var placed  = {};

      // Find couples whose both parents are in this generation
      couples.forEach(function(couple) {
        var p1 = couple.parents[0], p2 = couple.parents[1];
        if (!p2) return;
        var inGen = ids.indexOf(p1) !== -1 && ids.indexOf(p2) !== -1;
        if (!inGen) return;
        if (placed[p1] || placed[p2]) return;
        // Put female/male first (male left, female right) or just preserve order
        var person1 = people[p1], person2 = people[p2];
        var left = p1, right = p2;
        if (person1 && person2) {
          if (person1.sex === 'female' && person2.sex === 'male') {
            left = p2; right = p1;
          }
        }
        ordered.push(left);
        ordered.push(right);
        placed[left]  = true;
        placed[right] = true;
      });

      // Add remaining (not yet placed)
      ids.forEach(function(id) {
        if (!placed[id]) ordered.push(id);
      });

      var cy = MARGIN + (gen - 1) * ROW_HEIGHT;
      ordered.forEach(function(id, slot) {
        var cx = MARGIN + slot * COL_WIDTH;
        positions[id] = { cx: cx, cy: cy, slot: slot, generation: gen };
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
