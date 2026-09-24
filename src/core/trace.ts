import type { BuildResult, DFA, TraceStep } from '../types';
import { parse } from './parser';
import { collectLiterals, hasDot } from './astUtils';
import { buildNFAWithTrace } from './thompson';
import { buildDFAWithTrace } from './subset';
import { minimizeDFA } from './minimize';

/**
 * Full pipeline: parse → Thompson → subset → minimize.
 * Returns a snapshot of every intermediate state so the UI can step through.
 */
export function buildTrace(regexSrc: string, extraAlpha = ''): BuildResult {
  const steps: TraceStep[] = [];

  // ---- 1. Parse ----
  const ast = parse(regexSrc);
  steps.push({
    stage: 'parse',
    tab: 'ast',
    title: 'Parse',
    detail: `Parsed "${regexSrc}" into an abstract syntax tree.`,
    ast,
    hl: { states: [], trans: [] },
  });

  // ---- 2. Thompson ----
  const nfa = buildNFAWithTrace(ast, steps);
  steps.push({
    stage: 'thompson',
    tab: 'nfa',
    title: 'ε‑NFA complete',
    detail: `Done. ${nfa.states.length} states, ${nfa.transitions.length} transitions. Accepting state is ${nfa.accept}.`,
    ast,
    nfa,
    hl: { states: [nfa.accept], trans: [] },
  });

  // ---- 3. Alphabet ----
  const alphabet = collectLiterals(ast);
  if (hasDot(ast)) {
    for (const c of extraAlpha) {
      if (!alphabet.includes(c)) alphabet.push(c);
    }
    alphabet.sort();
  }
  if (alphabet.length === 0) alphabet.push('a'); // ε-only regex safety

  // ---- 4. Subset construction ----
  const dfa = buildDFAWithTrace(nfa, alphabet, steps);
  steps.push({
    stage: 'subset',
    tab: 'dfa',
    title: 'DFA complete',
    detail: `${dfa.states.length} DFA states, ${dfa.transitions.length} transitions over alphabet {${alphabet.join(', ')}}.`,
    ast,
    nfa,
    dfa,
    hl: { states: dfa.states.map((s) => s.id), trans: [] },
  });

  // ---- 5. Minimization (best-effort) ----
  let minDFA: DFA | null = null;
  try {
    minDFA = minimizeDFA(dfa);
  } catch {
    minDFA = null;
  }

  return { steps, ast, nfa, dfa, minDFA, alphabet };
}