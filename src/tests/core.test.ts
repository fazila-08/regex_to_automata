import { describe, it, expect } from 'vitest';
import { parse } from '../core/parser';
import { buildTrace } from '../core/trace';
import { simulateNFA, simulateDFA } from '../core/simulate';
import { minimizeDFA } from '../core/minimize';

describe('parser', () => {
  it('parses a literal', () => {
    expect(parse('a')).toEqual({ type: 'literal', value: 'a' });
  });

  it('gives | lowest precedence', () => {
    expect(parse('ab|c').type).toBe('alt');
  });

  it('binds * tighter than concat', () => {
    expect(parse('ab*').type).toBe('concat');
  });

  it('handles grouping', () => {
    const ast = parse('(a|b)*');
    expect(ast.type).toBe('star');
  });

  it('throws on unbalanced parens', () => {
    expect(() => parse('(a')).toThrow();
  });

  it('throws on trailing garbage', () => {
    expect(() => parse('a)')).toThrow();
  });

  it('parses epsilon', () => {
    expect(parse('ε')).toEqual({ type: 'epsilon' });
  });

  it('parses wildcard', () => {
    expect(parse('.')).toEqual({ type: 'dot' });
  });
});

describe('pipeline', () => {
  it('builds NFA and DFA for (a|b)*abb', () => {
    const r = buildTrace('(a|b)*abb');
    expect(r.nfa.states.length).toBeGreaterThan(0);
    expect(r.dfa.states.length).toBeGreaterThan(0);
    expect(r.minDFA).not.toBeNull();
  });

  it('NFA and DFA accept the same strings', () => {
    const r = buildTrace('(a|b)*abb');
    const samples = ['abb', 'aabb', 'babb', 'ababb', 'aababb', '', 'a', 'ab', 'abba', 'b'];
    for (const s of samples) {
      const nfaTrace = simulateNFA(r.nfa, s);
      const dfaTrace = simulateDFA(r.dfa, s);
      const nfaAcc = nfaTrace[nfaTrace.length - 1].states.includes(r.nfa.accept);
      const last = dfaTrace[dfaTrace.length - 1].state;
      const dfaAcc = last !== null && r.dfa.states[last].accepting;
      expect(nfaAcc).toBe(dfaAcc);
    }
  });

  it('minimized DFA agrees with DFA on samples', () => {
    const r = buildTrace('(a|b)*abb');
    const samples = ['abb', 'aabb', 'babb', 'ababb', 'aababb', '', 'a', 'ab', 'abba', 'b'];
    for (const s of samples) {
      const dfaTrace = simulateDFA(r.dfa, s);
      const minTrace = simulateDFA(r.minDFA!, s);
      const lastD = dfaTrace[dfaTrace.length - 1].state;
      const lastM = minTrace[minTrace.length - 1].state;
      const okD = lastD !== null && r.dfa.states[lastD].accepting;
      const okM = lastM !== null && r.minDFA!.states[lastM].accepting;
      expect(okD).toBe(okM);
    }
  });

  it('handles alternation a|b', () => {
    const r = buildTrace('a|b');
    const acc = (s: string) => {
      const t = simulateNFA(r.nfa, s);
      return t[t.length - 1].states.includes(r.nfa.accept);
    };
    expect(acc('a')).toBe(true);
    expect(acc('b')).toBe(true);
    expect(acc('ab')).toBe(false);
    expect(acc('')).toBe(false);
  });

  it('handles optional ab?c', () => {
    const r = buildTrace('ab?c');
    const acc = (s: string) => {
      const t = simulateNFA(r.nfa, s);
      return t[t.length - 1].states.includes(r.nfa.accept);
    };
    expect(acc('ac')).toBe(true);
    expect(acc('abc')).toBe(true);
    expect(acc('abbc')).toBe(false);
    expect(acc('a')).toBe(false);
  });

  it('handles plus (ab)+', () => {
    const r = buildTrace('(ab)+');
    const acc = (s: string) => {
      const t = simulateNFA(r.nfa, s);
      return t[t.length - 1].states.includes(r.nfa.accept);
    };
    expect(acc('ab')).toBe(true);
    expect(acc('abab')).toBe(true);
    expect(acc('')).toBe(false);
    expect(acc('a')).toBe(false);
  });
});

describe('minimize', () => {
  it('returns a DFA no larger than the input', () => {
    const r = buildTrace('(a|b)*abb');
    const m = minimizeDFA(r.dfa)!;
    expect(m.states.length).toBeLessThanOrEqual(r.dfa.states.length);
  });

  it('leaves an already-minimal DFA unchanged in size', () => {
    const r = buildTrace('abc');
    const m = minimizeDFA(r.dfa)!;
    expect(m.states.length).toBe(r.dfa.states.length);
  });
});

describe('trace', () => {
  it('emits one parse step, several Thompson steps, several subset steps', () => {
    const r = buildTrace('(a|b)*abb');
    const parseSteps = r.steps.filter((s) => s.stage === 'parse');
    const thompsonSteps = r.steps.filter((s) => s.stage === 'thompson');
    const subsetSteps = r.steps.filter((s) => s.stage === 'subset');
    expect(parseSteps.length).toBe(1);
    expect(thompsonSteps.length).toBeGreaterThan(1);
    expect(subsetSteps.length).toBeGreaterThan(1);
  });
});