export type AST =
  | { type: 'literal'; value: string }
  | { type: 'epsilon' }
  | { type: 'dot' }
  | { type: 'concat'; left: AST; right: AST }
  | { type: 'alt'; left: AST; right: AST }
  | { type: 'star'; child: AST }
  | { type: 'plus'; child: AST }
  | { type: 'optional'; child: AST };

export interface NFAState {
  id: number;
  accepting: boolean;
}

export interface NFATransition {
  id: number;
  from: number;
  to: number;
  symbol: string; // a literal, '.', or 'ε'
}

export interface NFA {
  states: NFAState[];
  transitions: NFATransition[];
  start: number;
  accept: number;
}

export interface DFAState {
  id: number;
  nfaStates: number[];
  accepting: boolean;
  label?: string;
}

export interface DFATransition {
  id: number;
  from: number;
  to: number;
  symbol: string;
}

export interface DFA {
  states: DFAState[];
  transitions: DFATransition[];
  start: number;
  alphabet: string[];
}

export type Stage = 'parse' | 'thompson' | 'subset' | 'minimize';
export type TabName = 'ast' | 'nfa' | 'dfa' | 'min' | 'tables';

export interface Highlight {
  states: number[];
  trans: number[];
}

export interface TraceStep {
  stage: Stage;
  tab: TabName;
  title: string;
  detail: string;
  ast?: AST;
  nfa?: NFA;
  dfa?: DFA;
  hl: Highlight;
}

export interface BuildResult {
  steps: TraceStep[];
  ast: AST;
  nfa: NFA;
  dfa: DFA;
  minDFA: DFA | null;
  alphabet: string[];
}