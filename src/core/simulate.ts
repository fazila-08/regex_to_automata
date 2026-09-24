import type { DFA, NFA } from '../types';
import { epsilonClosure } from './epsilon';

export interface NFAStep {
  ch: string;
  states: number[];
}
export interface DFAStep {
  ch: string;
  state: number | null;
}

export function simulateNFA(nfa: NFA, input: string): NFAStep[] {
  let cur = [...epsilonClosure(nfa, [nfa.start])].sort((a, b) => a - b);
  const trace: NFAStep[] = [{ ch: '', states: cur }];

  for (const ch of input) {
    const nxt = new Set<number>();
    for (const t of nfa.transitions) {
      if (cur.includes(t.from) && (t.symbol === ch || t.symbol === '.')) {
        nxt.add(t.to);
      }
    }
    cur = [...epsilonClosure(nfa, [...nxt])].sort((a, b) => a - b);
    trace.push({ ch, states: cur });
  }
  return trace;
}

export function simulateDFA(dfa: DFA, input: string): DFAStep[] {
  let cur: number | null = dfa.start;
  const trace: DFAStep[] = [{ ch: '', state: cur }];

  for (const ch of input) {
    const t = dfa.transitions.find((t) => t.from === cur && t.symbol === ch);
    if (!t) {
      trace.push({ ch, state: null });
      break;
    }
    cur = t.to;
    trace.push({ ch, state: cur });
  }
  return trace;
}