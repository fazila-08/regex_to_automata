import type { DFA, DFATransition, DFAState, NFA, TraceStep } from '../types';
import { epsilonClosure, move } from './epsilon';

/**
 * Convert an ε-NFA to a DFA via subset construction.
 * Pushes a trace step for the start state and one per (state, symbol) pair.
 */
export function buildDFAWithTrace(
  nfa: NFA,
  alphabet: string[],
  trace: TraceStep[],
): DFA {
  const states: DFAState[] = [];
  const transitions: DFATransition[] = [];
  const map = new Map<string, DFAState>();

  const snap = (): DFA => ({
    states: states.map((s) => ({
      ...s,
      label: s.nfaStates.length ? '{' + s.nfaStates.join(',') + '}' : '∅',
    })),
    transitions: transitions.map((t) => ({ ...t })),
    start: 0,
    alphabet: alphabet.slice(),
  });

  const getOrCreate = (arr: number[]): { st: DFAState; created: boolean } => {
    const key = arr.join(',');
    const existing = map.get(key);
    if (existing) return { st: existing, created: false };
    const s: DFAState = {
      id: states.length,
      nfaStates: arr,
      accepting: arr.includes(nfa.accept),
    };
    states.push(s);
    map.set(key, s);
    return { st: s, created: true };
  };

  const startArr = [...epsilonClosure(nfa, [nfa.start])].sort((a, b) => a - b);
  const startState = getOrCreate(startArr).st;
  const queue: DFAState[] = [startState];

  trace.push({
    stage: 'subset',
    tab: 'dfa',
    title: 'Subset · start state',
    detail: `ε-closure({${nfa.start}}) = {${startArr.join(', ')}}  →  DFA state 0.`,
    nfa,
    dfa: snap(),
    hl: { states: [0], trans: [] },
  });

  while (queue.length) {
    const cur = queue.shift()!;
    for (const a of alphabet) {
      const moved = move(nfa, cur.nfaStates, a);
      const clo = [...epsilonClosure(nfa, moved)].sort((x, y) => x - y);
      const { st: target, created } = getOrCreate(clo);
      if (created) queue.push(target);

      transitions.push({
        id: transitions.length,
        from: cur.id,
        to: target.id,
        symbol: a,
      });

      const setStr = clo.length ? '{' + clo.join(', ') + '}' : '∅';
      trace.push({
        stage: 'subset',
        tab: 'dfa',
        title: `Subset · δ(${cur.id}, ${a})`,
        detail:
          `From {${cur.nfaStates.join(', ') || '∅'}} on "${a}":\n` +
          `  move   = {${moved.join(', ') || '∅'}}\n` +
          `  ε-closure = ${setStr}\n` +
          `  → ${created ? 'new' : 'existing'} DFA state ${target.id}` +
          (target.accepting ? '  (accepting)' : ''),
        nfa,
        dfa: snap(),
        hl: { states: [cur.id, target.id], trans: [transitions.length - 1] },
      });
    }
  }

  return snap();
}