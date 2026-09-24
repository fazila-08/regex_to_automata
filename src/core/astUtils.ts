import type { AST } from '../types';

export function walkAST(node: AST, fn: (n: AST) => void): void {
  fn(node);
  if (node.type === 'concat' || node.type === 'alt') {
    walkAST(node.left, fn);
    walkAST(node.right, fn);
  }
  if ('child' in node) walkAST(node.child, fn);
}

export function collectLiterals(ast: AST): string[] {
  const s = new Set<string>();
  walkAST(ast, (n) => {
    if (n.type === 'literal') s.add(n.value);
  });
  return [...s].sort();
}

export function hasDot(ast: AST): boolean {
  let found = false;
  walkAST(ast, (n) => {
    if (n.type === 'dot') found = true;
  });
  return found;
}

export function countNodes(ast: AST): number {
  let n = 0;
  walkAST(ast, () => n++);
  return n;
}