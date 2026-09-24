# Regex → ε‑NFA → DFA Visualizer

Takes a regular expression, builds an ε‑NFA via Thompson's construction,
converts it to a DFA via subset construction, and optionally minimizes it.
Every transformation is shown step by step with highlighted states and
transitions.

## Quick start

```bash
npm install
npm run dev       # http://localhost:5173
npm test          # unit tests
npm run build     # production build in dist/
```

## Supported syntax

| Feature          | Example        |
|------------------|----------------|
| Literal          | `a`, `b`, `0`  |
| Concatenation    | `ab`           |
| Alternation      | `a|b`          |
| Kleene star      | `a*`           |
| Plus             | `a+`           |
| Optional         | `a?`           |
| Grouping         | `(ab|a)*`      |
| Any symbol       | `.`            |
| Epsilon          | `ε` or `&`     |
| Escaped literal  | `\*`, `\|`     |

## Architecture

```
regex string
  → parser.ts       → AST
  → thompson.ts     → ε-NFA      (with trace)
  → subset.ts       → DFA        (with trace)
  → minimize.ts     → min-DFA
```

`src/core/` is pure TypeScript with no DOM dependency — usable from a CLI
or another UI. `src/ui/` handles rendering and DOM events.

## Keyboard shortcuts

- `←` / `→` — step back / forward
- `Space`   — play / pause
- `Enter`   — in the regex box: build; in the test box: run

## License

MIT