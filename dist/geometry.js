'use strict';

const catalog = [];
const roles = new Set(['body', 'base', 'lid', 'flap', 'glue', 'structure']);
const validPoint = p => Array.isArray(p) && p.length === 2 && p.every(v => Number.isFinite(v) && Math.abs(v) <= 100000);
const samePoint = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]) < 1e-6;

function panelPath(points) {
  return 'M' + points.map(p => p.map(n => +n.toFixed(5)).join(' ')).join('L') + 'Z';
}

function traceOutline(panels) {
  const vertices = panels.flatMap(p => p.points);
  const edges = new Map();
  for (const { points } of panels) {
    points.forEach((a, i) => {
      const b = points[(i + 1) % points.length];
      const [dx, dy] = b.map((v, j) => v - a[j]);
      const length = Math.hypot(dx, dy);
      const stops = vertices
        .filter(([x, y]) => Math.abs((x - a[0]) * dy - (y - a[1]) * dx) < 1e-6 * length)
        .map(([x, y]) => ((x - a[0]) * dx + (y - a[1]) * dy) / length ** 2)
        .filter(t => t > 1e-7 && t < 1 - 1e-7);
      const splits = [...new Set([0, ...stops, 1])].sort((s, t) => s - t);
      for (let j = 1; j < splits.length; j++) {
        const ends = [splits[j - 1], splits[j]].map(t => [a[0] + t * dx, a[1] + t * dy].map(n => +n.toFixed(5)).join(' ')).sort();
        if (ends[0] === ends[1]) continue;
        const key = 'M' + ends.join('L');
        edges.set(key, 1 + (edges.get(key) || 0));
      }
    });
  }
  return [...edges].filter(([, count]) => count === 1).map(([edge]) => edge).join(' ');
}

function validateStructure(input) {
  if (!input || typeof input.name !== 'string' || !input.name.trim() || !Array.isArray(input.panels) || input.panels.length < 1 || input.panels.length > 50) {
    throw Error('请填写结构名称并提供 1–50 个面。');
  }
  let pointCount = 0;
  const panelMap = new Map();
  for (const p of input.panels) {
    if (!p || typeof p.id !== 'string' || !p.id.trim() || panelMap.has(p.id)) throw Error('每个面需要唯一的 id。');
    const ring = points => Array.isArray(points) && points.length >= 3 && points.every(validPoint)
      && points.every((v, i) => !samePoint(v, points[(i + 1) % points.length]))
      && Math.abs(points.reduce((area, [x, y], i) => {
        const [nx, ny] = points[(i + 1) % points.length];
        return area + x * ny - y * nx;
      }, 0)) > 1e-6;
    if (!ring(p.points) || (p.holes !== undefined && (!Array.isArray(p.holes) || !p.holes.every(ring))) || (p.role && !roles.has(p.role))) {
      throw Error('面 ' + p.id + ' 的轮廓、孔位或类型有误。');
    }
    pointCount += p.points.length + (p.holes || []).reduce((count, hole) => count + hole.length, 0);
    if (pointCount > 650) throw Error('坐标点超过 650 个，请简化描线。');
    panelMap.set(p.id, p);
  }
  const onContour = (point, { points }) => points.some((a, i) => {
    const b = points[(i + 1) % points.length];
    const d = Math.hypot(a[0] - b[0], a[1] - b[1]);
    return Math.abs(Math.hypot(point[0] - a[0], point[1] - a[1]) + Math.hypot(point[0] - b[0], point[1] - b[1]) - d) < 1e-5;
  });
  for (const p of input.panels) {
    if (p.hinge == null) continue;
    const { parent, edge, angle, start = 0, end = 1 } = p.hinge;
    const base = panelMap.get(parent);
    if (!base || !Array.isArray(edge) || edge.length !== 2 || !edge.every(validPoint)
        || samePoint(edge[0], edge[1]) || !Number.isFinite(angle) || Math.abs(angle) > 180
        || !Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end > 1 || start >= end
        || !edge.every(point => onContour(point, p) && onContour(point, base))) {
      throw Error('面 ' + p.id + ' 的折线必须与相邻面的边对齐，并填写折叠角度。');
    }
    const visited = new Set([p.id]);
    let ancestor = base;
    while (ancestor) {
      if (visited.has(ancestor.id)) throw Error('折叠关系存在循环。');
      visited.add(ancestor.id);
      ancestor = panelMap.get(ancestor.hinge?.parent);
    }
  }
  const lines = input.cuts ?? [];
  if (!Array.isArray(lines) || lines.length > 80 || lines.some(line => !Array.isArray(line) || line.length < 2 || line.length > 90 || !line.every(validPoint))) {
    throw Error('独立裁切线的坐标格式有误。');
  }
  return { name: input.name.trim().slice(0, 70), panels: input.panels, cuts: lines, units: input.units === 'mm' ? 'mm' : 'px' };
}

function compileStructure(input) {
  const design = validateStructure(input);
  design.outline = traceOutline(design.panels);
  design.holes = design.panels.flatMap(p => p.holes || []).map(panelPath).join(' ');
  design.score = design.panels.filter(p => p.hinge).map(p => 'M' + p.hinge.edge.map(pt => pt.join(' ')).join('L')).join(' ');
  design.slits = design.cuts.map(line => 'M' + line.map(pt => pt.join(' ')).join('L')).join(' ');
  return design;
}

function flatBounds(panels) {
  const xs = panels.flatMap(p => p.points.map(v => v[0]));
  const ys = panels.flatMap(p => p.points.map(v => v[1]));
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  return [minX, minY, Math.max(...xs) - minX || 1, Math.max(...ys) - minY || 1];
}

function buildPanelModel(design, id, progress, scale, detail = {}) {
  const { panels, outline, holes, slits, score, units, name } = design;
  const [x, y, w, h] = flatBounds(panels);
  const margin = Math.max(w, h) * .04;
  const view = [x - margin, y - margin, w + 2 * margin, h + 2 * margin];
  const transformers = new Map();
  const parent = new Map(panels.map(item => [item.id, item]));
  const mapPoint = ([a, b]) => [a, 0, b];
  function getTransform(panel) {
    if (transformers.has(panel.id)) return transformers.get(panel.id);
    if (!panel.hinge) return p => p;
    const { edge, angle, parent: from, start = 0, end = 1 } = panel.hinge;
    const previous = getTransform(parent.get(from));
    const pivot = mapPoint(edge[0]);
    const axis = mapPoint(edge[1]).map((n, i) => n - pivot[i]);
    const len = Math.hypot(...axis);
    const [ax, , az] = axis.map(v => v / len);
    const ratio = Math.min(1, Math.max(0, (progress - start) / (end - start)));
    const theta = angle * ratio * Math.PI / 180;
    const cos = Math.cos(theta), sin = Math.sin(theta);
    const transform = ([px, py, pz]) => {
      const dx = px - pivot[0], dz = pz - pivot[2], along = dx * ax + dz * az;
      return previous([
        pivot[0] + dx * cos - az * py * sin + ax * along * (1 - cos),
        py * cos + (az * dx - ax * dz) * sin,
        pivot[2] + dz * cos + ax * py * sin + az * along * (1 - cos)
      ]);
    };
    transformers.set(panel.id, transform);
    return transform;
  }
  const uv = ([u, v]) => [(u - view[0]) / view[2], (v - view[1]) / view[3]];
  const orientation = detail.upright ? progress * Math.PI / 2 : 0;
  const cos = Math.cos(orientation), sin = Math.sin(orientation);
  const faces = panels.map(panel => {
    const transform = getTransform(panel);
    const coords = point => {
      const [a, b, c] = transform(mapPoint(point));
      return [a, b * cos - c * sin, b * sin + c * cos].map(n => n * scale);
    };
    return { p: panel.points.map(coords), h: (panel.holes || []).map(r => r.map(coords)), uv: panel.points.map(uv),
      print: panel.role !== 'glue', seam: panel.role !== 'glue', internal: panel.role === 'glue', panelId: panel.id };
  });
  const hit = panels.map(panel => ({
    name: String(panel.name || panel.id), path: [panelPath(panel.points), ...(panel.holes || []).map(panelPath)].join(' ')
  }));
  return { id, name, faces, panels: hit, box: view.join(' '), cut: [outline, holes, slits].join(' '), fold: score,
    design, foldable: panels.some(p => p.hinge), dimensions: units === 'mm' ? [view[2] * scale, view[3] * scale] : null,
    exportScale: scale, ...detail };
}
