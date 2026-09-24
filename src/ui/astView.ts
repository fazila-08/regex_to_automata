import type { AST } from '../types';

const esc = (s: string): string =>
  s.replace(/[&<>"]/g, (c) =>
    c === '&' ? '&amp;' : c === '<' ? '&lt;' : c === '>' ? '&gt;' : '&quot;',
  );

export function astHTML(node: AST | undefined): string {
  if (!node) return '';

  const wrap = (head: string, kids = ''): string =>
    `<div class="ast-node"><div class="ast-head">${head}</div>${kids}</div>`;

  switch (node.type) {
    case 'literal':
      return wrap(`<span class="tag lit">literal</span><b>${esc(node.value)}</b>`);
    case 'dot':
      return wrap(`<span class="tag lit">any</span><b>.</b>`);
    case 'epsilon':
      return wrap(`<span class="tag lit">ε</span>`);
    case 'concat':
      return wrap(`<span class="tag">concat</span>`, astHTML(node.left) + astHTML(node.right));
    case 'alt':
      return wrap(`<span class="tag alt">alt |</span>`, astHTML(node.left) + astHTML(node.right));
    case 'star':
      return wrap(`<span class="tag rep">star *</span>`, astHTML(node.child));
    case 'plus':
      return wrap(`<span class="tag rep">plus +</span>`, astHTML(node.child));
    case 'optional':
      return wrap(`<span class="tag rep">optional ?</span>`, astHTML(node.child));
  }
}