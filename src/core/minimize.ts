import type { DFA } from '../types';

/**
 * Moore's algorithm (table-filling) for DFA minimization.
 * Uses a virtual sink for partial DFAs; drops the unreachable pure-sink group.
 */
export function minimizeDFA(dfa: DFA): DFA | null {
  const n = dfa.states.length;
  const alpha = dfa.alphabet ?? [];
  if (n === 0) return null;

  const T = new Map<string, number>();
  for (const t of dfa.transitions) T.set(t.from + '|' + t.symbol, t.to);

  const sink = n;
  const N = n + 1;

  const go = (i: number, a: string): number =>
    T.has(i + '|' + a) ? T.get(i + '|' + a)! : sink;
  const acc = (i: number): boolean => i < n && dfa.states[i].accepting;

  // ---- distinguishable pairs ----
  const dist: boolean[][] = Array.from({ length: N }, () => new Array(N).fill(false));
  const stack: [number, number][] = [];

  for (let i = 0; i < N; i++) {
    for (let j = i + 1; j < N; j++) {
      if (acc(i) !== acc(j)) {
        dist[i][j] = true;
        stack.push([i, j]);
      }
    }
  }
  while (stack.length) {
    const [i, j] = stack.pop()!;
    for (const a of alpha) {
      const pi = go(i, a);
      const pj = go(j, a);
      const x = Math.min(pi, pj);
      const y = Math.max(pi, pj);
      if (x !== y && !dist[x][y]) {
        dist[x][y] = true;
        stack.push([x, y]);
      }
    }
  }

  // ---- group indistinguishable states ----
  const group = new Array<number>(N).fill(-1);
  let g = 0;
  for (let i = 0; i < N; i++) {
    if (group[i] !== -1) continue;
    group[i] = g;
    for (let j = i + 1; j < N; j++) {
      if (group[j] === -1 && !dist[i][j]) group[j] = g;
    }
    g++;
  }

  const sinkGroup = group[sink];
  let pureSink = true;
  for (let i = 0; i < n; i++) if (group[i] === sinkGroup) pureSink = false;

  // ---- renumber surviving groups ----
  const remap = new Map<number, number>();
  const keep: number[] = [];
  for (let gi = 0; gi < g; gi++) {
    if (gi === sinkGroup && pureSink) continue;
    remap.set(gi, keep.length);
    keep.push(gi);
  }

  const members = keep.map((gi) => {
    const m: number[] = [];
    for (let i = 0; i < n; i++) if (group[i] === gi) m.push(i);
    return m;
  });

  const states = members.map((m, idx) => ({
    id: idx,
    accepting: m.some((i) => dfa.states[i].accepting),
    nfaStates: m,
    label: '{' + m.join(',') + '}',
  }));

  const transitions = [];
  for (let idx = 0; idx < members.length; idx++) {
    const rep = members[idx][0];
    for (const a of alpha) {
      const tgt = go(rep, a);
      const tg = group[tgt];
      if (!remap.has(tg)) continue;
      transitions.push({
        id: transitions.length,
        from: idx,
        to: remap.get(tg)!,
        symbol: a,
      });
    }
  }

  return {
    states,
    transitions,
    start: remap.get(group[dfa.start]) ?? 0,
    alphabet: alpha.slice(),
  };
}