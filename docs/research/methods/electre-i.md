# ELECTRE I (electre-i)

- **Family:** ranking (outranking; choice problem — returns a kernel of non-outranked alternatives, not a full ranking)
- **Origin:** Roy, B. (1968). Classement et choix en présence de points de vue multiples (la méthode ELECTRE). *Revue française d'informatique et de recherche opérationnelle* 2(8), 57–75. DOI [10.1051/ro/196802V100571](https://doi.org/10.1051/ro/196802V100571). Earlier SEMA report: Benayoun, Roy & Sussmann (1966). The normalized "textbook" variant widely used in Turkish literature follows Hwang & Yoon (1981), *Multiple Attribute Decision Making*, Springer, DOI [10.1007/978-3-642-48318-9](https://doi.org/10.1007/978-3-642-48318-9), and Yoon & Hwang (1995), Sage, DOI [10.4135/9781412985161](https://doi.org/10.4135/9781412985161).
- **Popularity:** part of the 686 ELECTRE papers reviewed by Govindan & Jepsen (2016, EJOR 250(1):1–29, DOI [10.1016/j.ejor.2015.07.019](https://doi.org/10.1016/j.ejor.2015.07.019)). In Turkish literature "ELECTRE" without a number almost always means the Hwang–Yoon variant (e.g., Soner & Önüt 2006; Çağıl 2011, *Finans Yazıları*); TR-scope co-occurrence counts in `../combinations.md` §A.

## For users (site copy)
- **EN:** ELECTRE I keeps an alternative "in the running" unless another one beats it on enough of the (weighted) criteria and is never much worse on any single criterion. The result is a short list (the kernel) of alternatives that nobody convincingly beats, not a full ranking. Use it to screen a long list down to a few candidates before looking closer.
- **TR:** ELECTRE I, bir alternatifi ancak başka bir alternatif onu (ağırlıklı) kriterlerin yeterince çoğunda geçiyor ve hiçbir kriterde ondan çok kötü kalmıyorsa elemeye alır. Sonuç tam bir sıralama değil, kimsenin ikna edici biçimde geçemediği kısa bir listedir (çekirdek). Uzun bir listeyi yakından bakmadan önce birkaç adaya indirmek için kullanın.

## When to use / when not
- **Use when:** the task is choice/screening (problematic α); the user wants a transparent majority-with-veto rule; teaching outranking before ELECTRE III/PROMETHEE.
- **Do not use when:** a complete ranking is required (the Turkish "net concordance / net discordance" add-on gives one, but that is a different method, see Variant B); criteria are on different scales and the Roy variant is used without normalization (its discordance compares raw differences across criteria); thresholds ĉ, d̂ cannot be justified.

## Inputs
- Decision matrix X (n × m), criterion directions, weights w_j > 0.
- Variant A (Roy 1968, pyDecision): concordance threshold ĉ ∈ (0.5, 1] (pyDecision default 0.75) and discordance threshold d̂ ∈ [0, 1) (default 0.50). Criteria must share one scale (or be put on a common scale by the user); negatives allowed.
- Variant B (Hwang & Yoon): no thresholds from the user — ĉ = mean of C, d̂ = mean of D. Needs a normalization; vector normalization requires a non-zero column; the reciprocal form for cost criteria (used by Soner & Önüt 2006) requires strictly positive values.

## Algorithm
**Variant A — Roy (1968), our default for "ELECTRE I".**
1. Orient: multiply cost columns by −1.
2. Concordance: $C(a,b) = \sum_{j:\, g_j(a) \ge g_j(b)} w_j \big/ \sum_j w_j$.
3. Discordance: $D(a,b) = \max\big(0, \max_j [g_j(b) - g_j(a)]\big) / \delta$, with $\delta = \max_j \big(\max_i g_{ij} - \min_i g_{ij}\big)$ (largest range on the common scale). Some authors use per-criterion ranges $\max_j \frac{g_j(b)-g_j(a)}{\text{range}_j}$ instead, which removes the common-scale requirement; offer it as an option.
4. Outranking: $a\,S\,b \iff C(a,b) \ge \hat c$ and $D(a,b) \le \hat d$ (a ≠ b).
5. Condense each cycle (strongly connected component) of S into one class, then take the kernel K of the acyclic graph: repeatedly put all classes with no incoming arc in K and delete them and everything they outrank. K is internally stable (no member outranks another) and externally stable (every non-member is outranked by some member).

**Variant B — Hwang & Yoon textbook form (common in DergiPark papers).**
1. Normalize (vector: $r_{ij} = x_{ij}/\sqrt{\sum_i x_{ij}^2}$; for cost criteria papers differ — Soner & Önüt use $r_{ij} = (1/x_{ij}) / \sqrt{\sum_i (1/x_{ij})^2}$ so that larger is better), weight $v_{ij} = w_j r_{ij}$.
2. Concordance set $C_{pq} = \{j : v_{pj} \ge v_{qj}\}$, $c_{pq} = \sum_{j\in C_{pq}} w_j$.
3. Discordance: Hwang & Yoon $d_{pq} = \max_{j\notin C_{pq}} |v_{pj} - v_{qj}| \big/ \max_j |v_{pj} - v_{qj}|$. Some papers (including the fixture below) use the sum ratio $\sum_{j\notin C_{pq}} |v_{pj}-v_{qj}| \big/ \sum_j |v_{pj}-v_{qj}|$; this must be a named option.
4. $\bar c = \frac{1}{n(n-1)}\sum_{p\ne q} c_{pq}$, $\bar d$ likewise; $f_{pq} = [c_{pq} \ge \bar c]$, $g_{pq} = [d_{pq} \le \bar d]$, $e_{pq} = f_{pq} g_{pq}$ (aggregate dominance).
5. Optional complete order: net concordance $C_p = \sum_{k\ne p} c_{pk} - \sum_{k\ne p} c_{kp}$ (higher better), net discordance $D_p = \sum_{k\ne p} d_{pk} - \sum_{k\ne p} d_{kp}$ (lower better); papers combine the two orders by averaging positions.

## Commonly combined with
- **AHP → ELECTRE (variant B):** Soner & Önüt (2006), supplier selection, *Sigma J. Eng. & Nat. Sci.* 24(4), 110–120 (fixture B). Also ANP → ELECTRE (Afyon Kocatepe Üniv. İİBF Dergisi 15(2), 2013, supplier selection).
- **Entropy / CRITIC → ELECTRE** for financial performance of Turkish banks and firms (e.g., Çağıl 2011; TR-scope counts in `../combinations.md` §A).
- **SMART → ELECTRE → TOPSIS** hybrid (Sayed 2016, *IJCA*), an example of chaining methods without a stated reason; the site should discourage chains whose later stage re-ranks the earlier stage's kernel with a compensatory method unless the user wants exactly that.

## Pitfalls
- **Common scale.** Variant A's discordance mixes raw differences across criteria; with mixed units the largest-unit criterion dominates D. Force a scale check (all criteria same unit, or per-criterion ranges).
- **Cycles.** S can contain cycles (on the fixture A2 S A3 and A3 S A2 at ĉ = 0.75, d̂ = 0.5); the kernel is only defined after condensation. pyDecision's `electre_i(..., remove_cycles=False)` returns kernel {a5, a1, a2, a3} at ĉ = 0.85, d̂ = 0.5 although a1 is outranked by a2 and a3 (violates internal stability); with `remove_cycles=True` it deletes arcs instead of merging. Implement condensation ourselves.
- **Threshold sensitivity.** Kernel size moves with ĉ, d̂; show kernel as a function of (ĉ, d̂) on a small grid.
- **Relative thresholds (variant B).** c̄ and d̄ are means over the current set, so adding or removing an alternative changes the thresholds and can change dominance among the others (a rank-reversal channel; Wang & Triantaphyllou 2008 point to the same Δ-dependence for the discordance).
- **Ties / equal values:** both variants count ties as concordant ($\ge$); document it. A constant column is concordant for every pair and inflates C.
- **Cost criteria in variant B:** some papers apply the same vector normalization to cost columns and still treat "larger v is better", which silently reverses the criterion. Our implementation orients first.

## Reference example (test fixture)
**Fixture A — Roy variant (published intermediate outputs).**
- **Source:** Wang & Triantaphyllou (2008), *Omega* 36(1), 45–63, DOI [10.1016/j.omega.2005.12.003](https://doi.org/10.1016/j.omega.2005.12.003), §3.1 (Galway wastewater plant, data from Rogers, Bruen & Maystre 1999): decision matrix and weights p. 48, concordance and discordance matrices pp. 48–49. The paper continues with ELECTRE II, so no ELECTRE I kernel is published; C and D are identical in ELECTRE I and II.
- **Input:**

```json
{
  "matrix": [[1,2,1,5,2,2,4],[3,5,3,5,3,3,3],[3,5,3,5,3,2,2],[1,2,2,5,1,1,1],[1,1,3,5,4,1,5]],
  "types": ["max","max","max","max","max","max","max"],
  "weights": [0.0780,0.1180,0.1570,0.3140,0.2350,0.0390,0.0590],
  "c_hat": 0.75, "d_hat": 0.50
}
```

- **Published:** C rows A1…A5 = [1, .3730, .4120, .8430, .5490], [.9410, 1, 1, 1, .7060], [.9410, .9020, 1, 1, .7060], [.6670, .3140, .3140, 1, .5490], [.8430, .7650, .7650, .8820, 1]; D rows = [0, .75, .75, .25, .5], [.25, 0, 0, 0, .5], [.5, .25, 0, 0, .75], [.75, .75, .75, 0, 1], [.25, 1, 1, .25, 0].
- **Recomputed:** numpy C and D: max abs diff 0.0 and 0.0; pyDecision 5.1.1 `electre_i` C and D: 0.0 and 0.0. **MATCH.** Derived (not published, our implementation): at (ĉ, d̂) = (0.75, 0.50) S = {A1→A4, A2→A1, A2→A3, A2→A4, A3→A1, A3→A2, A3→A4, A5→A1, A5→A4}; kernel = {A2 ≡ A3 (cycle), A5}. Same kernel at (0.85, 0.50) and (0.75, 0.25). pyDecision agrees at (0.75, 0.50) and differs at (0.85, 0.50) as described in Pitfalls (`electre1_kernel.py`, `run_pyd_all.py`).

**Fixture B — Hwang–Yoon variant with net indices (Turkish literature).**
- **Source:** Soner, S. & Önüt, S. (2006). Çok kriterli tedarikçi seçimi: bir ELECTRE-AHP uygulaması. *Sigma Mühendislik ve Fen Bilimleri Dergisi* 24(4), 110–120 (no DOI found). Çizelge 3 (data), 5 (AHP weights), 6 (normalized), 7 (weighted), 9 (C, D), 10 (dominance), 11 (net indices), 12 (ranking). PDF: https://arastirmax.com/tr/system/files/dergiler/845/makaleler/4/arastirmax-cok-kriterli-tedarikci-secimi-bir-electre-ahp-uygulamasi.pdf
- **Input:**

```json
{
  "alternatives": ["Ted1","Ted2","Ted3","Ted4","Ted5"],
  "criteria": ["IM work cost","OFM opportunity cost","M distance","O life","TK technology","H speed","K quality"],
  "matrix": [[1168,108.3,50,8,60,98,65],[1100,36.7,80,10,80,95,88],[1150,89.4,70,5,90,96,85],[1100,36.7,70,8,30,81,45],[1090,26.2,30,6,84,78,67]],
  "types": ["min","min","min","max","max","max","max"],
  "weights": [0.39,0.07,0.04,0.03,0.11,0.22,0.14],
  "normalization": "vector; cost via reciprocal",
  "discordance": "sum_ratio",
  "thresholds": "means"
}
```

- **Published:** C̄ = 0.53, D̄ = 0.46; dominance 1→4, 2→1, 2→3, 2→4, 3→1, 3→4, 5→1, 5→3, 5→4; net C = (−1.35, 1.00, 0.08, −1.00, 1.26), net D = (1.48, −2.02, −0.67, 2.26, −1.03); final 2 = 5 > 3 > 1 = 4.
- **Recomputed** (`electre1_so.py`, `electre1_so2.py`): normalized matrix (Tab. 6) max abs diff 0.0000; weighted matrix (Tab. 7) 0.0029 (paper weights are rounded to 2 decimals); C (Tab. 9) ≤ 0.01; D with the sum-ratio formula matches 18 of 20 cells within 0.005, but D(3,2) = 0.803 vs printed 0.36 and D(4,5) = 0.925 vs printed 0.56 (the max-ratio Hwang–Yoon formula matches neither, so these two cells look like typos). C̄ = 0.5265 (MATCH). Dominance: we get the paper's list except 3→4 — C(3,4) = 0.51 < C̄, so the paper's "EVET" for C(3,4) is an error. Net C = (−1.35, 0.98, 0.08, −0.99, 1.28), max diff 0.02 (weight rounding). Net D with the printed C, D reproduces the paper (1.48, −2.02, −0.66, 2.24, −1.04); with our D it is (1.48, −2.47, −0.23, 2.62, −1.41) because of the two typos. Final classes {2, 5} > 3 > {1, 4}: **MATCH**. Overall: **PARTIAL MATCH** (explained by paper typos and rounded weights); use it as a fixture for normalization, C, net C and the final order, not for D cells (3,2), (4,5).
- pyDecision implements only variant A; variant B "not run" in pyDecision.

## Implementation notes
- pyDecision: `pyDecision.algorithm.electre_i(dataset, W, remove_cycles=False, c_hat=0.75, d_hat=0.50, graph=True)` → `(concordance, discordance, dominance, kernel, dominated)`; benefit-only; δ = max column range.
- Our TypeScript (`src/core/methods/electre-i.ts`):
  - `ElectreIParams`:
    - `discordanceScale?: 'global' | 'range'` (choice parameter, default `'global'`: Roy 1968 common-scale maximum span $\delta = \max_j (\max_i g_{ij} - \min_i g_{ij})$, which reproduces the Wang & Triantaphyllou 2008 §3.1 fixture identically; `'range'`: per-criterion span $\max_j \frac{g_j(b) - g_j(a)}{\text{range}_j}$, which prevents scale distortion when criteria have different units).
    - `cHat?: number` (concordance threshold $\hat{c} \in (0, 1]$, default `0.75`).
    - `dHat?: number` (discordance / veto threshold $\hat{d} \in [0, 1]$, default `0.50`).
  - Steps emitted (`Step[]`):
    1. `electre-i.oriented` (`matrix`, `axes: ['alternatives', 'criteria']`): $g_j(a) = +x_{aj}$ for benefit, $-x_{aj}$ for cost.
    2. `electre-i.concordance` (`matrix`, `axes: ['alternatives', 'alternatives']`): $C(a,b) = \sum_{j: g_j(a) \ge g_j(b) - 10^{-12}} w_j / \sum_j w_j$, with $C(a,a) = 1$.
    3. `electre-i.discordance` (`matrix`, `axes: ['alternatives', 'alternatives']`): $D(a,b)$ under `'global'` or `'range'`, with $D(a,a) = 0$.
    4. `electre-i.outranking` (`matrix`, `axes: ['alternatives', 'alternatives']`): $S(a,b) = 1 \iff a \ne b \land C(a,b) \ge \hat{c} - 10^{-12} \land D(a,b) \le \hat{d} + 10^{-12}$, $S(a,a) = 0$.
    5. `electre-i.kernel` (`vector`, `axes: 'alternatives'`): kernel membership ($1$ if in $K$, $0$ if outranked/eliminated), computed by `electreIKernel(S)` after condensing strongly connected components (cycles) of $S$ into single equivalence classes and iteratively selecting classes with zero incoming arcs and deleting the classes they directly outrank.
    6. `electre-i.netConcordance` (`vector`, `axes: 'alternatives'`): $C_{\text{net}}(a) = \sum_{b \ne a} (C(a,b) - C(b,a))$.
    7. `electre-i.netDiscordance` (`vector`, `axes: 'alternatives'`): $D_{\text{net}}(a) = \sum_{b \ne a} (D(a,b) - D(b,a))$.
    8. `electre-i.netScore` (`vector`, `axes: 'alternatives'`): normalized net outranking score $\Phi(a) = \frac{1}{2(m-1)}(C_{\text{net}}(a) - D_{\text{net}}(a)) \in [-1, 1]$ (`scores` and `ranking` via `rankScores(scores, 'desc')`).

## Sources
- Roy (1968), RIRO 2(8), 57–75, DOI 10.1051/ro/196802V100571.
- Hwang & Yoon (1981), DOI 10.1007/978-3-642-48318-9; Yoon & Hwang (1995), DOI 10.4135/9781412985161.
- Figueira, Mousseau & Roy (2005), ELECTRE methods, DOI 10.1007/0-387-23081-5_4.
- Wang & Triantaphyllou (2008), Omega 36(1), 45–63, DOI 10.1016/j.omega.2005.12.003.
- Soner & Önüt (2006), Sigma 24(4), 110–120.
- Govindan & Jepsen (2016), EJOR 250(1), 1–29, DOI 10.1016/j.ejor.2015.07.019.
- pyDecision 5.1.1, `pyDecision/algorithm/e_i.py`, https://github.com/Valdecy/pyDecision
