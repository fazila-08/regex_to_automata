import type { AST, NFA, NFAState, NFATransition, TraceStep } from '../types';

/**
 * Build an ε-NFA from an AST using Thompson's construction.
 * Pushes one trace step per AST node visited.
 */
export function buildNFAWithTrace(ast: AST, trace: TraceStep[]): NFA {
  let idc = 0;
  const states: NFAState[] = [];
  const transitions: NFATransition[] = [];

  const mk = (): NFAState => {
    const s: NFAState = { id: idc++, accepting: false };
    states.push(s);
    return s;
  };

  const addT = (from: number, to: number, symbol: string): void => {
    transitions.push({ id: transitions.length, from, to, symbol });
  };

  const snap = (start: number, accept: number): NFA => ({
    states: states.map((s) => ({ ...s, accepting: s.id === accept })),
    transitions: transitions.map((t) => ({ ...t })),
    start,
    accept,
  });

  function build(node: AST): { start: number; accept: number } {
    const sBefore = states.length;
    const tBefore = transitions.length;
    let res!: { start: number; accept: number };
    let detail!: string;

    switch (node.type) {
      case 'literal': {
        const s = mk();
        const a = mk();
        addT(s.id, a.id, node.value);
        res = { start: s.id, accept: a.id };
        detail = `Literal "${node.value}": two fresh states joined by a transition on "${node.value}".`;
        break;
      }
      case 'dot': {
        const s = mk();
        const a = mk();
        addT(s.id, a.id, '.');
        res = { start: s.id, accept: a.id };
        detail = `Wildcard ".": two fresh states joined by a transition on any symbol.`;
        break;
      }
      case 'epsilon': {
        const s = mk();
        const a = mk();
        addT(s.id, a.id, 'ε');
        res = { start: s.id, accept: a.id };
        detail = `Empty fragment: two states joined by an ε-transition.`;
        break;
      }
      case 'concat': {
        const L = build(node.left);
        const R = build(node.right);
        addT(L.accept, R.start, 'ε');
        res = { start: L.start, accept: R.accept };
        detail = `Concatenation: ε-transition from left accept (${L.accept}) into right start (${R.start}).`;
        break;
      }
      case 'alt': {
        const s = mk();
        const L = build(node.left);
        const R = build(node.right);
        const a = mk();
        addT(s.id, L.start, 'ε');
        addT(s.id, R.start, 'ε');
        addT(L.accept, a.id, 'ε');
        addT(R.accept, a.id, 'ε');
        res = { start: s.id, accept: a.id };
        detail = `Alternation |: new start ${s.id} branches into both sides; both accepts meet at ${a.id}.`;
        break;
      }
      case 'star': {
        const s = mk();
        const C = build(node.child);
        const a = mk();
        addT(s.id, C.start, 'ε');
        addT(s.id, a.id, 'ε');
        addT(C.accept, C.start, 'ε');
        addT(C.accept, a.id, 'ε');
        res = { start: s.id, accept: a.id };
        detail = `Kleene star *: new start ${s.id} skips the body or enters it; body accept loops back and exits to ${a.id}.`;
        break;
      }
      case 'plus': {
        const C = build(node.child);
        const a = mk();
        addT(C.accept, C.start, 'ε');
        addT(C.accept, a.id, 'ε');
        res = { start: C.start, accept: a.id };
        detail = `Plus +: body is entered at least once; body accept loops back and exits to ${a.id}.`;
        break;
      }
      case 'optional': {
        const s = mk();
        const C = build(node.child);
        const a = mk();
        addT(s.id, C.start, 'ε');
        addT(s.id, a.id, 'ε');
        addT(C.accept, a.id, 'ε');
        res = { start: s.id, accept: a.id };
        detail = `Optional ?: new start ${s.id} either takes the body or ε-skips straight to accept ${a.id}.`;
        break;
      }
    }

    trace.push({
      stage: 'thompson',
      tab: 'nfa',
      title: 'Thompson · ' + node.type,
      detail,
      nfa: snap(res.start, res.accept),
      hl: {
        states: states.slice(sBefore).map((s) => s.id),
        trans: transitions.slice(tBefore).map((t) => t.id),
      },
    });

    return res;
  }

  const frag = build(ast);
  states[frag.accept].accepting = true;

  return {
    states: states.map((s) => ({ ...s })),
    transitions: transitions.map((t) => ({ ...t })),
    start: frag.start,
    accept: frag.accept,
  };
}