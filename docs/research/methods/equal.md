# Equal weights (equal)

- **Family:** weighting (objective; data-free baseline)
- **Origin:** No inventor; the classic justification is Dawes, R.M. & Corrigan, B. (1974). Linear models in decision making. *Psychological Bulletin* 81(2), 95–106. DOI [10.1037/h0037613](https://doi.org/10.1037/h0037613) (Crossref verified; not read — cited as the usual "unit weights" reference). Listed as "EW" in Roszkowska (2013), *Optimum. Studia Ekonomiczne* 5(65), 14–33, DOI [10.15290/ose.2013.05.65.02](https://doi.org/10.15290/ose.2013.05.65.02), Table 4.
- **Popularity:** used as the reference scenario in weighting comparisons (e.g., "MEAN" weights in Dua et al. 2024; "Equal Weights" in 2 of the 30 studies of Keshavarz-Ghorabaee et al. 2021, Table 1, plus Ramasamy et al. in their Sec. 2 text).

## For users (site copy)
- **EN:** Every criterion gets the same weight, 1/n. Use it when you have no reason to prefer one criterion, or as a neutral baseline to see how much another weighting changes the ranking.
- **TR:** Her kriter aynı ağırlığı alır: 1/n. Bir kriteri öne çıkarmak için nedeniniz yoksa ya da başka bir ağırlıklandırmanın sıralamayı ne kadar değiştirdiğini görmek için tarafsız bir karşılaştırma tabanı olarak kullanın.

## When to use / when not
- **Use when:** no information about importance; sensitivity baseline.
- **Do not use when:** criteria overlap (equal weights double-count correlated criteria), or the number of criteria per theme differs (a theme with 5 criteria implicitly gets 5× the weight of a theme with 1).

## Inputs
- Number of criteria n ≥ 1. No matrix needed.

## Algorithm
1. $w_j = 1/n$ for all j.

## Commonly combined with
- Any ranking method, as the "no-weighting" scenario: Dua et al. (2024) run MARA/RAM/PIV with MEAN weights next to Entropy/MEREC/LOPCOW/CRITIC, DOI [10.21303/2461-4262.2024.003171](https://doi.org/10.21303/2461-4262.2024.003171).

## Pitfalls
- Hidden weighting through criterion count (see above).
- Equal weights are equal only after normalization: the ranking method's normalization decides the effective influence of each criterion.
- Floating point: 1/3 etc. do not sum exactly to 1; do not assert `sum === 1` in tests, use a tolerance.

## Reference example (test fixture)
- **Source:** Roszkowska (2013), Table 4, column "Equal weight (EW)": n = 2…7 gives w = 1/n (printed as fractions).

```json
{
  "id": "equal-roszkowska2013",
  "source": "Roszkowska 2013, Optimum. Studia Ekonomiczne 5(65):14-33, Table 4, EW column",
  "cases": [
    {"n": 4, "expected": [0.25, 0.25, 0.25, 0.25]},
    {"n": 3, "expected": [0.3333333333, 0.3333333333, 0.3333333333]}
  ],
  "tolerance": 1e-9
}
```

- **Recomputed:** numpy `np.full(n, 1/n)` → **MATCH** (exact). pyDecision: not needed (no dedicated function).

## Implementation notes
- Trivial; still expose it as a method so the UI can compare rankings under EW vs the chosen weighting.

## Sources
- Roszkowska (2013), DOI 10.15290/ose.2013.05.65.02 — Table 4 seen in full-text extract (exa.ai library copy of the article).
- Dawes & Corrigan (1974) — Crossref metadata only.
- Keshavarz-Ghorabaee et al. (2021), DOI 10.3390/sym13040525, Table 1.
