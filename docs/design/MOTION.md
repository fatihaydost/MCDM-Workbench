# Motion

The contract behind the `Motion` dial in [DESIGN.md](DESIGN.md). Motion explains a change of state; it is never
decoration. The test (Stripe Checkout): turn the animations off and the flow should feel broken. If it does not,
the animation is not needed.

## When motion is allowed

| Purpose | Example | Allowed |
|---|---|---|
| Object constancy: the same data mark moves to its new place | TOPSIS points when the view changes, bars when a weight changes | Yes, the main use |
| State change of one control | tab indicator, open/close of a disclosure or a floating layer | Yes, short |
| Feedback that a value was recomputed | short accent tint on a changed cell | Yes, colour only |
| Explain: a user-triggered, one-off teaching moment | "Step through" a method's idea: each step transforms the picture into the next | Yes, `--dur-explain`, at most two phases (the second after `--delay-explain`, 700 ms in all); never automatic, never looped |
| Progress of a calculation that is really running: the Monte Carlo heat map fills from partial counts while the draws accumulate, with "3,000 / 10,000" | Random weights, Robustness | Yes, only after the job has run longer than `SLOW_MS` (250 ms); a faster job shows its result at once. Colour change only (`fade`, `--dur`), no movement |
| Entry of a page, section or card; scroll reveal; stagger | | No |
| Count-up numbers, typewriter, looping pulse, shimmer, parallax, hover lift, glow | | No |
| First paint of a chart (bars growing from zero) | | No: data is shown, not performed |

Progress is a state, not a performance. It does not conflict with "count-up numbers" and "first paint of a chart":
the numbers are the partial counts of a calculation the worker is actually doing (each snapshot is the result's own
statistic over the draws so far, and the last snapshot is the result), not an animation of a finished value. A job
that finishes within `SLOW_MS` never draws a partial picture, so nothing flashes, and under `prefers-reduced-motion`
the cells change colour at once (`--dur` is 0). The status in words ("Calculating") stays the only `aria-live` text;
the counter is `aria-hidden`.

Frequency rule: the more often a thing happens, the shorter and quieter its motion. Keyboard-driven, high-frequency
actions (typing in the grid, arrowing through cells) get none.

Evidence for animating data changes and against animating the analysis itself: Heer and Robertson 2007
(animated transitions between statistical graphics), Bostock "Object constancy", Robertson et al. 2008.

## Tokens

In `src/styles/tokens.css`, all set to `0ms` under `prefers-reduced-motion: reduce`:

| Token | Value | Use |
|---|---|---|
| `--ease` | `cubic-bezier(0.2, 0, 0, 1)` | everything that moves or changes on screen |
| `--ease-exit` | `cubic-bezier(0.3, 0, 1, 1)` | leaving elements (floating layers closing) |
| `--dur-fast` | `100ms` | exits, tooltips, press feedback |
| `--dur` | `150ms` | colour and small state changes (default for `transition-*`) |
| `--dur-slow` | `200ms` | indicators, disclosures, sheets |
| `--dur-data` | `320ms` | data marks moving to a new position (object constancy) |
| `--dur-explain` | `450ms` | explain steps: rare, chosen by the reader, so slower than a data change |
| `--delay-explain` | `250ms` | start of an explain step's second phase (Heer and Robertson: stage simply, shape first, then value) |

No hard-coded durations in components: a literal `ms` escapes reduced motion. JS animation (Web Animations API)
reads the tokens and checks `matchMedia('(prefers-reduced-motion: reduce)')`.

Hold times are not motion: how long a colour highlight stays on a changed cell or a moved row (e.g.
`MOVED_HOLD_MS` in the live ranking (`src/app/ranking`), the grid's type-changed tint) is a named constant in the feature, the
same with reduced motion, since the highlight is how a reduced-motion reader sees what changed.

## Rules

- Animate `transform` and `opacity` (and colour). Never `transition: all`, never layout properties, except a
  disclosure's `block-size` through `interpolate-size` where supported (others open instantly).
- Prerendered pages are re-rendered by React on load (`createRoot`, not hydrate): no keyframe animation may run on
  mount, or it plays twice. Transitions are safe, they do not fire on first insertion.
- Theme change happens in one frame: transitions are suspended while `data-theme` switches.
- No dependency: CSS transitions, `@starting-style` for layers that open later, the Web Animations API for FLIP.
  Radix floating layers use the `animate-*-in` / `animate-*-out` keyframes in `app.css` instead: Radix keeps a
  closing layer mounted until its `animationend` (not `transitionend`), and a layer is never open on first paint.
- SVG lines that move between two places transition the CSS `d` property of a `<path>` (the `d` attribute stays as the
  fallback, which jumps). A unit line stretched by `transform: scale()` smears its dashes and caps while the transform
  animates, because the browser scales the painted stroke.
- `aria-live` text lands in the DOM at once; motion never delays or duplicates it. Content that is being replaced
  (workbench stages) does not animate out, so ids and focus never point at a leaving element.
- The final frame of every animation equals the reduced-motion render.
