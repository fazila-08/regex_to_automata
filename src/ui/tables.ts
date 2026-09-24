import type { DFA, NFA } from '../types';

const esc = (s: string): string =>
  s.replace(/[&<>"]/g, (c) =>
    c === '&' ? '&amp;' : c === '<' ? '&lt;' : c === '>' ? '&gt;' : '&quot;',
  );

export function renderNFATable(nfa: NFA | null, alphabet: string[]): string {
  if (!nfa) return '<div class="empty">—</div>';

  const cols = [...alphabet, 'ε'];
  let h = '<table><thead><tr><th>state</th>';
  for (const c of cols) h += `<th>${esc(c)}</th>`;
  h += '</tr></thead><tbody>';

  for (const s of nfa.states) {
    const isAcc = s.id === nfa.accept;
    const isStart = s.id === nfa.start;
    h += `<tr class="${isAcc ? 'acc' : ''} ${isStart ? 'start' : ''}">`;
    h += `<td>${isStart ? '→ ' : ''}${s.id}${isAcc ? ' *' : ''}</td>`;
    for (const c of cols) {
      const tgts = nfa.transitions
        .filter((t) => t.from === s.id && t.symbol === c)
        .map((t) => t.to);
      h += `<td>${tgts.length ? esc(tgts.join(',')) : '–'}</td>`;
    }
    h += '</tr>';
  }
  return h + '</tbody></table>';
}

export function renderDFATable(dfa: DFA | null): string {
  if (!dfa) return '<div class="empty">—</div>';

  const cols = dfa.alphabet ?? [];
  let h = '<table><thead><tr><th>state</th><th>NFA set</th>';
  for (const c of cols) h += `<th>${esc(c)}</th>`;
  h += '</tr></thead><tbody>';

  for (const s of dfa.states) {
    const isStart = s.id === dfa.start;
    h += `<tr class="${s.accepting ? 'acc' : ''} ${isStart ? 'start' : ''}">`;
    h += `<td>${isStart ? '→ ' : ''}${s.id}${s.accepting ? ' *' : ''}</td>`;
    h += `<td>${esc(s.nfaStates.length ? '{' + s.nfaStates.join(',') + '}' : '∅')}</td>`;
    for (const c of cols) {
      const t = dfa.transitions.find((t) => t.from === s.id && t.symbol === c);
      h += `<td>${t ? t.to : '–'}</td>`;
    }
    h += '</tr>';
  }
  return h + '</tbody></table>';
}