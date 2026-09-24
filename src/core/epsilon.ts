import type { NFA } from '../types';

/** All NFA states reachable from `ids` using only ε-transitions. */
export function epsilonClosure(nfa: NFA, ids: Iterable<number>): Set<number> {
  const set = new Set(ids);
  const stack = [...set];
  while (stack.length) {
    const s = stack.pop()!;
    for (const t of nfa.transitions) {
      if (t.from === s && t.symbol === 'ε' && !set.has(t.to)) {
        set.add(t.to);
        stack.push(t.to);
      }
    }
  }
  return set;
}

/** All states reachable from `ids` on a single symbol (no closure). */
export function move(nfa: NFA, ids: number[], symbol: string): number[] {
  const out = new Set<number>();
  for (const t of nfa.transitions) {
    if (ids.includes(t.from) && (t.symbol === symbol || t.symbol === '.')) {
      out.add(t.to);
    }
  }
  return [...out];
}