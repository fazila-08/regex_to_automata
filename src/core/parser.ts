import type { AST } from '../types';

interface Token {
  t: string;
  v?: string;
}

/**
 * Tokenize a regex source string.
 * Supports: literals, \escape, ε/&, |, *, +, ?, (, ), .
 */
export function tokenize(src: string): Token[] {
  const toks: Token[] = [];
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (/\s/.test(c)) continue;

    if (c === '\\') {
      const n = src[++i];
      if (n === undefined) throw new Error('Dangling backslash');
      toks.push({ t: 'CHAR', v: n });
      continue;
    }
    if (c === 'ε' || c === '&') { toks.push({ t: 'EPS' }); continue; }
    if (c === '|') { toks.push({ t: 'ALT' }); continue; }
    if (c === '*') { toks.push({ t: 'STAR' }); continue; }
    if (c === '+') { toks.push({ t: 'PLUS' }); continue; }
    if (c === '?') { toks.push({ t: 'OPT' }); continue; }
    if (c === '(') { toks.push({ t: 'LP' }); continue; }
    if (c === ')') { toks.push({ t: 'RP' }); continue; }
    if (c === '.') { toks.push({ t: 'DOT' }); continue; }

    toks.push({ t: 'CHAR', v: c });
  }
  toks.push({ t: 'EOF' });
  return toks;
}

/**
 * Recursive descent parser.
 *   regex       := alternation
 *   alternation := concat ('|' concat)*
 *   concat      := repeat+
 *   repeat      := atom ('*' | '+' | '?')*
 *   atom        := CHAR | '.' | 'ε' | '(' regex ')'
 */
export function parse(src: string): AST {
  const toks = tokenize(src);
  let p = 0;
  const peek = () => toks[p];
  const next = () => toks[p++];

  function parseAlt(): AST {
    let left = parseConcat();
    while (peek().t === 'ALT') {
      next();
      const right = parseConcat();
      left = { type: 'alt', left, right };
    }
    return left;
  }

  function parseConcat(): AST {
    const parts: AST[] = [];
    while (true) {
      const t = peek().t;
      if (t === 'CHAR' || t === 'DOT' || t === 'LP' || t === 'EPS') {
        parts.push(parseRepeat());
      } else break;
    }
    if (parts.length === 0) return { type: 'epsilon' };
    return parts.reduce((a, b) => ({ type: 'concat', left: a, right: b }));
  }

  function parseRepeat(): AST {
    let node = parseAtom();
    while (true) {
      const t = peek().t;
      if (t === 'STAR') { next(); node = { type: 'star', child: node }; }
      else if (t === 'PLUS') { next(); node = { type: 'plus', child: node }; }
      else if (t === 'OPT') { next(); node = { type: 'optional', child: node }; }
      else break;
    }
    return node;
  }

  function parseAtom(): AST {
    const tk = next();
    if (tk.t === 'CHAR') return { type: 'literal', value: tk.v! };
    if (tk.t === 'DOT') return { type: 'dot' };
    if (tk.t === 'EPS') return { type: 'epsilon' };
    if (tk.t === 'LP') {
      const inner = parseAlt();
      if (peek().t !== 'RP') throw new Error('Missing closing parenthesis');
      next();
      return inner;
    }
    throw new Error('Unexpected token: ' + (tk.t === 'EOF' ? 'end of input' : tk.t));
  }

  const ast = parseAlt();
  if (peek().t !== 'EOF') throw new Error('Unexpected trailing input');
  return ast;
}