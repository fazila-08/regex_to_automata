import type { BuildResult, TraceStep } from '../types';
import { buildTrace } from '../core/trace';
import { countNodes } from '../core/astUtils';
import { renderGraph } from './graph';
import { astHTML } from './astView';
import { renderNFATable, renderDFATable } from './tables';
import { simulateNFA, simulateDFA } from '../core/simulate';

const $ = <T extends HTMLElement = HTMLElement>(sel: string): T =>
  document.querySelector(sel) as T;

const EXAMPLES = [
  '(a|b)*abb', 'a(b|c)*', 'ab?c', '(ab)+', 'a*', '(a|b)*', '1(0|1)*0', 'a(b|ε)c',
];

interface AppState {
  steps: TraceStep[];
  idx: number;
  ast: BuildResult['ast'] | null;
  nfa: BuildResult['nfa'] | null;
  dfa: BuildResult['dfa'] | null;
  minDFA: BuildResult['minDFA'];
  alphabet: string[];
  playing: boolean;
  timer: number | null;
}

const S: AppState = {
  steps: [],
  idx: 0,
  ast: null,
  nfa: null,
  dfa: null,
  minDFA: null,
  alphabet: [],
  playing: false,
  timer: null,
};

// ---------- UI helpers ----------
function initExamples(): void {
  const box = $('#examples');
  box.innerHTML = '';
  for (const ex of EXAMPLES) {
    const b = document.createElement('button');
    b.className = 'chip';
    b.textContent = ex;
    b.onclick = () => {
      ($('#regex') as HTMLInputElement).value = ex;
      build();
    };
    box.appendChild(b);
  }
}

function setTab(name: string): void {
  document.querySelectorAll('.tab').forEach((t) =>
    t.classList.toggle('active', (t as HTMLElement).dataset.tab === name),
  );
  document.querySelectorAll('.panel').forEach((p) =>
    p.classList.toggle('active', p.id === 'panel-' + name),
  );
}

function showError(msg: string): void {
  const e = $('#error');
  if (!msg) {
    e.classList.add('hidden');
    e.textContent = '';
    return;
  }
  e.classList.remove('hidden');
  e.textContent = msg;
}

// ---------- build + render ----------
function build(): void {
  showError('');
  stopPlay();
  const src = ($('#regex') as HTMLInputElement).value;
  const extra = ($('#extra') as HTMLInputElement).value;

  try {
    const result = buildTrace(src, extra);
    S.steps = result.steps;
    S.ast = result.ast;
    S.nfa = result.nfa;
    S.dfa = result.dfa;
    S.minDFA = result.minDFA;
    S.alphabet = result.alphabet;
    S.idx = 0;

    ($('#scrub') as HTMLInputElement).max = String(Math.max(0, S.steps.length - 1));
    ($('#scrub') as HTMLInputElement).value = '0';
    render();
  } catch (err) {
    S.steps = [];
    const msg = err instanceof Error ? err.message : String(err);
    showError(msg);
    $('#stepTitle').textContent = 'Error';
    $('#stepDetail').textContent = msg;
    $('#stageBadge').textContent = '—';
    $('#stepCount').textContent = '0 / 0';
    for (const id of ['nfaGraph', 'dfaGraph', 'minGraph']) {
      $('#' + id).innerHTML = '<div class="empty">—</div>';
    }
    $('#astBody').innerHTML = '<div class="empty">—</div>';
    $('#nfaTable').innerHTML = '<div class="empty">—</div>';
    $('#dfaTable').innerHTML = '<div class="empty">—</div>';
  }
}

function render(): void {
  const step = S.steps[S.idx];
  const badge = $('#stageBadge');

  if (step) {
    badge.textContent = step.stage;
    badge.className = 'badge ' + step.stage;
    $('#stepTitle').textContent = `${S.idx + 1}. ${step.title}`;
    $('#stepDetail').textContent = step.detail;
    $('#stepCount').textContent = `${S.idx + 1} / ${S.steps.length}`;
    ($('#scrub') as HTMLInputElement).value = String(S.idx);
    if (step.tab) setTab(step.tab);
  }

  // AST
  if (S.ast) {
    $('#astBody').innerHTML = astHTML(S.ast);
    $('#astMeta').textContent = countNodes(S.ast) + ' nodes';
  }

  // NFA
  const nfaView = step?.nfa ?? S.nfa;
  const nfaHL = step?.nfa && step.hl ? step.hl : { states: [], trans: [] };
  if (nfaView) {
    renderGraph($('#nfaGraph'), {
      states: nfaView.states,
      transitions: nfaView.transitions,
      start: nfaView.start,
      hlStates: nfaHL.states,
      hlTrans: nfaHL.trans,
    });
    $('#nfaMeta').textContent =
      `${nfaView.states.length} states · ${nfaView.transitions.length} transitions` +
      (step?.nfa ? '' : ' (final)');
  }

  // DFA
  const dfaView = step?.dfa ?? S.dfa;
  const dfaHL = step?.dfa && step.hl ? step.hl : { states: [], trans: [] };
  if (dfaView) {
    renderGraph($('#dfaGraph'), {
      states: dfaView.states,
      transitions: dfaView.transitions,
      start: dfaView.start,
      hlStates: dfaHL.states,
      hlTrans: dfaHL.trans,
    });
    $('#dfaMeta').textContent =
      `${dfaView.states.length} states · alphabet {${(dfaView.alphabet ?? []).join(',')}}`;
  } else {
    $('#dfaGraph').innerHTML =
      '<div class="empty">DFA not built yet — step through the ε‑NFA first.</div>';
    $('#dfaMeta').textContent = '';
  }

  // Minimized DFA
  if (S.minDFA) {
    renderGraph($('#minGraph'), {
      states: S.minDFA.states,
      transitions: S.minDFA.transitions,
      start: S.minDFA.start,
      hlStates: [],
      hlTrans: [],
    });
    $('#minMeta').textContent =
      `${S.minDFA.states.length} states (was ${S.dfa ? S.dfa.states.length : '?'})`;
  } else {
    $('#minGraph').innerHTML = '<div class="empty">—</div>';
    $('#minMeta').textContent = '';
  }

  // Tables
  $('#nfaTable').innerHTML = renderNFATable(S.nfa, S.alphabet);
  $('#dfaTable').innerHTML = renderDFATable(S.dfa);

  // Buttons
  ($('#prev') as HTMLButtonElement).disabled = S.idx <= 0;
  ($('#next') as HTMLButtonElement).disabled = S.idx >= S.steps.length - 1;
}

// ---------- playback ----------
function stopPlay(): void {
  S.playing = false;
  if (S.timer !== null) {
    clearInterval(S.timer);
    S.timer = null;
  }
  $('#play').textContent = '▶ Play';
}

function togglePlay(): void {
  if (S.playing) {
    stopPlay();
    return;
  }
  if (S.idx >= S.steps.length - 1) S.idx = 0;
  S.playing = true;
  $('#play').textContent = '❚❚ Pause';
  S.timer = window.setInterval(() => {
    if (S.idx >= S.steps.length - 1) {
      stopPlay();
      return;
    }
    S.idx++;
    render();
  }, 850);
}

// ---------- string testing ----------
function runTest(): void {
  if (!S.nfa || !S.dfa) {
    $('#testResult').innerHTML = '';
    return;
  }
  const input = ($('#testInput') as HTMLInputElement).value;

  const nfaTrace = simulateNFA(S.nfa, input);
  const dfaTrace = simulateDFA(S.dfa, input);
  const minTrace = S.minDFA ? simulateDFA(S.minDFA, input) : null;

  const nfaAcc = nfaTrace[nfaTrace.length - 1].states.includes(S.nfa.accept);
  const dfaLast = dfaTrace[dfaTrace.length - 1].state;
  const dfaAcc = dfaLast !== null && S.dfa.states[dfaLast].accepting;

  const minLast = minTrace ? minTrace[minTrace.length - 1].state : null;
  const minAcc =
    minTrace && minLast !== null ? S.minDFA!.states[minLast].accepting : null;

  const mk = (label: string, ok: boolean) =>
    `<div class="verdict ${ok ? 'ok' : 'no'}">${ok ? '✓' : '✗'} ${label} ${ok ? 'accepts' : 'rejects'}</div>`;

  let html = mk('NFA', nfaAcc) + mk('DFA', dfaAcc);
  if (minAcc !== null) html += mk('Minimized DFA', minAcc);

  html += `<div class="muted" style="margin-top:6px">NFA state sets after each symbol</div><div class="stripe">`;
  nfaTrace.forEach((t, i) => {
    const lbl = i === 0 ? 'ε-closure' : `“${t.ch}” → {${t.states.join(',') || '∅'}}`;
    html += `<span class="st">${lbl}</span>`;
  });
  html += `</div>`;

  html += `<div class="muted" style="margin-top:6px">DFA states after each symbol</div><div class="stripe">`;
  dfaTrace.forEach((t, i) => {
    const lbl = i === 0 ? `start ${t.state}` : `“${t.ch}” → ${t.state === null ? '∅' : t.state}`;
    html += `<span class="st">${lbl}</span>`;
  });
  html += `</div>`;

  $('#testResult').innerHTML = html;

  // Highlight final states in the graphs.
  const lastNFA = nfaTrace[nfaTrace.length - 1].states;
  const lastDFA = dfaLast === null ? [] : [dfaLast];
  const lastMin = minLast !== null ? [minLast] : [];

  renderGraph($('#nfaGraph'), {
    states: S.nfa.states,
    transitions: S.nfa.transitions,
    start: S.nfa.start,
    hlStates: lastNFA,
    hlTrans: [],
  });
  renderGraph($('#dfaGraph'), {
    states: S.dfa.states,
    transitions: S.dfa.transitions,
    start: S.dfa.start,
    hlStates: lastDFA,
    hlTrans: [],
  });
  if (S.minDFA) {
    renderGraph($('#minGraph'), {
      states: S.minDFA.states,
      transitions: S.minDFA.transitions,
      start: S.minDFA.start,
      hlStates: lastMin,
      hlTrans: [],
    });
  }
}

// ---------- mount ----------
export function mount(): void {
  initExamples();

  $('#build').addEventListener('click', build);
  $('#regex').addEventListener('keydown', (e) => {
    if ((e as KeyboardEvent).key === 'Enter') build();
  });
  $('#testInput').addEventListener('keydown', (e) => {
    if ((e as KeyboardEvent).key === 'Enter') runTest();
  });
  $('#testBtn').addEventListener('click', runTest);
  $('#prev').addEventListener('click', () => {
    stopPlay();
    if (S.idx > 0) { S.idx--; render(); }
  });
  $('#next').addEventListener('click', () => {
    stopPlay();
    if (S.idx < S.steps.length - 1) { S.idx++; render(); }
  });
  $('#play').addEventListener('click', togglePlay);
  $('#scrub').addEventListener('input', (e) => {
    stopPlay();
    S.idx = +(e.target as HTMLInputElement).value;
    render();
  });
  $('#tabs').addEventListener('click', (e) => {
    const t = (e.target as HTMLElement).closest('.tab') as HTMLElement | null;
    if (t) setTab(t.dataset.tab!);
  });
  document.addEventListener('keydown', (e) => {
    if ((e.target as HTMLElement).tagName === 'INPUT') return;
    if (e.key === 'ArrowRight') {
      stopPlay();
      if (S.idx < S.steps.length - 1) { S.idx++; render(); }
    }
    if (e.key === 'ArrowLeft') {
      stopPlay();
      if (S.idx > 0) { S.idx--; render(); }
    }
    if (e.key === ' ') {
      e.preventDefault();
      togglePlay();
    }
  });

  build();
}