export interface GraphData {
  states: { id: number; accepting: boolean; label?: string }[];
  transitions: { id: number; from: number; to: number; symbol: string }[];
  start: number;
  hlStates: number[];
  hlTrans: number[];
}

const R = 20;

interface Point {
  x: number;
  y: number;
}

const esc = (s: string): string =>
  s.replace(/[&<>"]/g, (c) => {
    switch (c) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      default: return c;
    }
  });

/**
 * BFS-layered layout: start state at column 0, successors further right,
 * unreachable states moved to the last column.
 */
function computeLayout(
  states: { id: number }[],
  transitions: { from: number; to: number }[],
  start: number,
): Map<number, Point> {
  const pos = new Map<number, Point>();
  if (!states.length) return pos;

  const adj = new Map<number, number[]>();
  for (const s of states) adj.set(s.id, []);
  for (const t of transitions) adj.get(t.from)?.push(t.to);

  const layer = new Map<number, number>();
  if (adj.has(start)) {
    layer.set(start, 0);
    const q = [start];
    while (q.length) {
      const u = q.shift()!;
      for (const v of adj.get(u) ?? []) {
        if (!layer.has(v)) {
          layer.set(v, layer.get(u)! + 1);
          q.push(v);
        }
      }
    }
  }
  let maxL = 0;
  for (const v of layer.values()) maxL = Math.max(maxL, v);
  for (const s of states) if (!layer.has(s.id)) layer.set(s.id, maxL + 1);

  const byLayer = new Map<number, number[]>();
  for (const s of states) {
    const l = layer.get(s.id)!;
    if (!byLayer.has(l)) byLayer.set(l, []);
    byLayer.get(l)!.push(s.id);
  }

  const X = 135;
  const Y = 80;
  for (const [l, ids] of byLayer) {
    ids.sort((a, b) => a - b);
    const k = ids.length;
    ids.forEach((id, i) => {
      pos.set(id, { x: 70 + l * X, y: (i - (k - 1) / 2) * Y });
    });
  }
  return pos;
}

/**
 * Render a graph into a container element, overwriting its contents.
 */
export function renderGraph(container: HTMLElement, data: GraphData): void {
  if (!data.states.length) {
    container.innerHTML = '<div class="empty">—</div>';
    return;
  }

  const { states, transitions, start } = data;
  const hlStates = new Set(data.hlStates);
  const hlTrans = new Set(data.hlTrans);
  const pos = computeLayout(states, transitions, start);

  // ---- group parallel edges ----
  interface EdgeGroup {
    from: number;
    to: number;
    ids: number[];
    symbols: string[];
  }
  const groups = new Map<string, EdgeGroup>();
  for (const t of transitions) {
    const k = t.from + '->' + t.to;
    if (!groups.has(k)) groups.set(k, { from: t.from, to: t.to, ids: [], symbols: [] });
    const g = groups.get(k)!;
    g.ids.push(t.id);
    if (!g.symbols.includes(t.symbol)) g.symbols.push(t.symbol);
  }
  const hasPair = (a: number, b: number) => groups.has(a + '->' + b);

  let svg = '';
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of pos.values()) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }

  // ---- edges ----
  for (const g of groups.values()) {
    const p1 = pos.get(g.from);
    const p2 = pos.get(g.to);
    if (!p1 || !p2) continue;
    const isHL = g.ids.some((id) => hlTrans.has(id));
    const cls = 'edge' + (isHL ? ' hl' : '');
    const marker = isHL ? 'arrowHL' : 'arrow';
    const label = esc(g.symbols.join(','));

    if (g.from === g.to) {
      const { x, y } = p1;
      const d = `M ${x - 9} ${y - R} C ${x - 52} ${y - R - 58}, ${x + 52} ${y - R - 58}, ${x + 9} ${y - R}`;
      svg += `<path d="${d}" class="${cls}" marker-end="url(#${marker})"/>`;
      svg += `<text x="${x}" y="${y - R - 52}" class="elabel${isHL ? ' hl' : ''}" text-anchor="middle">${label}</text>`;
    } else {
      const off = hasPair(g.to, g.from) ? 30 : 0;
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len;
      const ny = dx / len;
      const mx = (p1.x + p2.x) / 2 + nx * off;
      const my = (p1.y + p2.y) / 2 + ny * off;

      const d1 = Math.hypot(mx - p1.x, my - p1.y) || 1;
      const sx = p1.x + ((mx - p1.x) / d1) * R;
      const sy = p1.y + ((my - p1.y) / d1) * R;
      const d2 = Math.hypot(p2.x - mx, p2.y - my) || 1;
      const ex = p2.x - ((p2.x - mx) / d2) * R;
      const ey = p2.y - ((p2.y - my) / d2) * R;

      svg += `<path d="M ${sx} ${sy} Q ${mx} ${my} ${ex} ${ey}" class="${cls}" marker-end="url(#${marker})"/>`;
      const lx = 0.25 * sx + 0.5 * mx + 0.25 * ex;
      const ly = 0.25 * sy + 0.5 * my + 0.25 * ey;
      svg += `<text x="${lx}" y="${ly - 5}" class="elabel${isHL ? ' hl' : ''}" text-anchor="middle">${label}</text>`;
    }
  }

  // ---- start arrow ----
  const sp = pos.get(start);
  if (sp) {
    svg += `<path d="M ${sp.x - R - 38} ${sp.y} L ${sp.x - R - 3} ${sp.y}" class="edge start" marker-end="url(#arrowStart)"/>`;
    minX = Math.min(minX, sp.x - R - 45);
  }

  // ---- nodes ----
  for (const s of states) {
    const p = pos.get(s.id);
    if (!p) continue;
    const isHL = hlStates.has(s.id);
    const cls = 'node' + (s.accepting ? ' accept' : '') + (isHL ? ' hl' : '');
    svg += `<circle cx="${p.x}" cy="${p.y}" r="${R}" class="${cls}"/>`;
    if (s.accepting) {
      svg += `<circle cx="${p.x}" cy="${p.y}" r="${R - 5}" class="inner"/>`;
    }
    svg += `<text x="${p.x}" y="${p.y + 4.5}" class="nlabel" text-anchor="middle">${s.id}</text>`;
    if (s.label) {
      svg += `<text x="${p.x}" y="${p.y + R + 16}" class="slabel" text-anchor="middle">${esc(s.label)}</text>`;
    }
  }

  const padX = 70, padTop = 100, padBot = 60;
  const vbX = minX - padX;
  const vbY = minY - padTop;
  const vbW = maxX - minX + padX * 2;
  const vbH = maxY - minY + padTop + padBot;

  container.innerHTML = `
    <svg viewBox="${vbX} ${vbY} ${vbW} ${vbH}" preserveAspectRatio="xMidYMid meet">
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="9.5" refY="5" markerWidth="7" markerHeight="7" orient="auto">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#4a5d80"/>
        </marker>
        <marker id="arrowHL" viewBox="0 0 10 10" refX="9.5" refY="5" markerWidth="7" markerHeight="7" orient="auto">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#fbbf24"/>
        </marker>
        <marker id="arrowStart" viewBox="0 0 10 10" refX="9.5" refY="5" markerWidth="7" markerHeight="7" orient="auto">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#38bdf8"/>
        </marker>
      </defs>
      ${svg}
    </svg>`;
}