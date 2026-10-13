# VIseKriterijumska Optimizacija I Kompromisno Resenje (VIKOR)

- **Family:** ranking (compensatory / distance — compromise programming, L1 and L∞ metrics)
- **Origin:** Opricovic, S. (1998). *Multicriteria Optimization of Civil Engineering Systems*. Faculty of Civil Engineering, Belgrade (book, Serbian; not opened). Canonical English statement used here: Opricovic, S.; Tzeng, G.-H. (2004). Compromise solution by MCDM methods: A comparative analysis of VIKOR and TOPSIS. *EJOR* 156(2):445–455, doi:10.1016/S0377-2217(03)00020-1.
- **Popularity:** High. Mardani et al. (2016), *VIKOR Technique: A Systematic Review…*, Sustainability 8(1):37, doi:10.3390/su8010037, reviewed 176 papers (2004–2015) in 83 journals. Crossref cited-by counts (checked 2026-09-29): 4,167 for Opricovic & Tzeng (2004), 367 for the review.

## For users (site copy)
- **EN:** VIKOR looks for a compromise: the alternative that is best for the group overall (S) while keeping the worst single-criterion regret small (R). It also tells you whether the winner is clearly ahead; if not, it returns a short list of equally acceptable compromise options.
- **TR:** VIKOR bir uzlaşı arar: genel toplamda en iyi (S) olurken tek bir kriterdeki en büyük pişmanlığı da küçük tutan (R) alternatifi seçer. Kazananın açık ara önde olup olmadığını da söyler; değilse eşit kabul edilebilir uzlaşık seçeneklerden oluşan kısa bir liste döndürür.

## When to use / when not
- Use: conflicting criteria, decision makers who want a compromise and an explicit "is the winner stable?" test (C1/C2), linear normalization (unit-change invariant, unlike vector-TOPSIS).
- Avoid / warn: very few alternatives make DQ = 1/(J−1) large (J = 3 → DQ = 0.5) so C1 rarely holds; results are relative to the alternative set (adding one alternative can change f*/f−); Q is undefined if all S (or all R) are equal.

## Inputs
- Decision matrix `X` (J alternatives × n criteria), criterion types `benefit|cost`, weights `w` (sum to 1).
- Parameter `v` ∈ [0, 1], default **0.5** ("weight of the strategy of the majority of criteria"); v > 0.5 ≈ majority vote, v ≈ 0.5 consensus, v < 0.5 veto (Opricovic & Tzeng 2004, §2).
- Outputs: S, R, Q (lower is better), three rankings, compromise solution / set, flags C1, C2.

## Algorithm
1. Best/worst per criterion: benefit $f_j^* = \max_i x_{ij}$, $f_j^- = \min_i x_{ij}$; cost reversed.
2. $S_i = \sum_j w_j \dfrac{f_j^* - x_{ij}}{f_j^* - f_j^-}$ (group utility, L1), $R_i = \max_j w_j \dfrac{f_j^* - x_{ij}}{f_j^* - f_j^-}$ (individual regret, L∞).
3. $Q_i = v\dfrac{S_i - S^*}{S^- - S^*} + (1-v)\dfrac{R_i - R^*}{R^- - R^*}$, with $S^* = \min S$, $S^- = \max S$, $R^* = \min R$, $R^- = \max R$.
4. Rank by S, R and Q ascending (three lists).
5. Let $a'$ be best by Q and $a''$ second. $DQ = 1/(J-1)$.
   - **C1 (acceptable advantage):** $Q(a'') - Q(a') \ge DQ$.
   - **C2 (acceptable stability):** $a'$ is also best by S and/or R.
6. Compromise:
   - C1 and C2 → single solution $\{a'\}$.
   - C1 only (C2 fails) → $\{a', a''\}$.
   - C1 fails → $\{a', a'', \dots, a^{(M)}\}$ with M the largest position such that $Q(a^{(M)}) - Q(a') < DQ$.
   (Rule as stated in Opricovic & Tzeng 2004 §2(e), re-read in full on 2026-10-13: "If one of the conditions is not satisfied, then a set of compromise solutions is proposed, which consists of: alternatives a′ and a″ if only condition C2 is not satisfied, or alternatives a′, a″, …, a(M) if condition C1 is not satisfied; a(M) is determined by the relation Q(a(M)) − Q(a′) < DQ for maximum M". C1 is ≥ DQ, the set test is strict <.)
   **Misprint in the paper:** step (d) says "sorting by the values S, R and Q, in decreasing order"; the same section says "the best alternative, ranked by Q, is the one with the minimum value of Q" and Table 3 ranks ascending. Ascending is correct.

Variants: fixed (user-given) f*/f− instead of set-dependent ones (mentioned in Opricovic & Tzeng 2004 §4.1 as a way to avoid set effects); "extended VIKOR" (Opricovic & Tzeng 2007, EJOR; not opened); fuzzy/interval VIKOR. **We implement the 2004 version** (same as pyDecision `vikor_method` for S, R, Q).

## Commonly combined with
- AHP → VIKOR and fuzzy Delphi + AHP → VIKOR (e.g., Ren et al.; Martín-Utrillas et al.) — listed in Mardani et al. 2016, §4.2.9 (sustainability/renewable energy papers).
- VIKOR together with TOPSIS for comparison (Opricovic & Tzeng 2004; Tzeng et al. as listed in Mardani et al. 2016).
- Simulated weight sets for sensitivity (Keshavarz Ghorabaee et al. 2015, Tables 6–7).

## Pitfalls
- **Division by zero:** $f_j^* = f_j^-$ (constant column) → term undefined; set the term to 0. $S^- = S^*$ or $R^- = R^*$ (e.g., 2 identical alternatives, or single alternative) → Q undefined; set that part to 0 and warn. pyDecision adds 1e-16 to $f^* - f^-$ but **not** to the Q denominators (NaN possible).
- Small J: DQ = 1/(J−1) is large; with J = 2, DQ = 1 and C1 needs Q gap = 1.
- Ties in Q at the top: define $a''$ deterministically (stable sort by index) and report tie.
- Rank reversal when the alternative set changes (f*, f− depend on the set).
- Q is a relative index (0 = best, 1 = worst of this set); do not compare Q across problems.

## Reference example (test fixture)
- **Source:** Opricovic & Tzeng (2004), EJOR 156(2):445–455, doi:10.1016/S0377-2217(03)00020-1 (DOI read from the PDF header), Tables 1–3 ("VIKOR" rows). Full text read via a third-party mirror (pdfcoffee); paywalled at Elsevier.

```json
{
  "id": "opricovic-tzeng-2004-vikor",
  "alternatives": ["A1", "A2", "A3"],
  "criteria": ["risk (1-5)", "altitude (m a.s.l.)"],
  "types": ["cost", "benefit"],
  "weights": [0.5, 0.5],
  "params": { "v": 0.5 },
  "matrix": [[1, 3000], [2, 3750], [5, 4500]],
  "expected": {
    "S": [0.5, 0.375, 0.5],
    "R": [0.5, 0.25, 0.5],
    "Q": [1.0, 0.0, 1.0],
    "C1": true, "C2": true,
    "compromise": ["A2"],
    "tolerance": 0.0005
  },
  "note": "Problem phi ([[6,2.0],[7,2.75],[10,3.5]], same types/weights) must give identical S, R, Q (unit-change invariance)."
}
```

- **Published outputs** (Table 3): S = 0.5, 0.375, 0.5; R = 0.5, 0.25, 0.5; Q = 1, 0, 1; ranking A2 ≻ A1 ≈ A3 for S, R and Q; compromise A2; identical for problem φ.
- **Recomputed (numpy):** S = 0.5000, 0.3750, 0.5000; R = 0.5000, 0.2500, 0.5000; Q = 1, 0, 1; C1 true (gap 1 ≥ DQ 0.5), C2 true → compromise {A2}; φ identical. **MATCH** (max abs diff 0).
- **pyDecision 5.1.1 `vikor_method`:** Q identical (**MATCH**); returned `solution` = full Q-sorted list [A2, A1, A3] (see notes).
- **Second fixture for C1/compromise-set logic (ranks published, sets derived):** Keshavarz Ghorabaee et al. (2015), Informatica 26(3):435–451, doi:10.15388/Informatica.2015.57, Table 5 (matrix), Table 6 (7 weight sets), Table 7 (VIKOR ranks). Matrix/weights JSON in `edas.md`. Our Q-ranks equal the published VIKOR ranks in **7/7 sets (MATCH)** (assuming v = 0.5; the paper does not state v). Derived (not published) C1/C2 with DQ = 1/9: C1 fails in all 7 sets, C2 holds; compromise sets = {A7, A1, A8} (sets 1–3), {A1, A7} (sets 4–6), {A1, A2} (set 7). Use these as regression values for the compromise-set branch, labelled "derived".
  - Set 1 Q (ours): 0.0287, 0.4807, 0.5473, 0.9163, 0.5331, 0.6743, 0.0270, 0.0806, 0.2423, 0.9472.

## Re-verification (2026-10-13, before implementation)
- Primary text re-read (§2 steps (a)-(e), §5, Table 3; mirror of the EJOR PDF via Exa). Confirmed: S and R (Eqs. 1-2), Q (Eq. 3) with S* = min, S- = max; v = "weight of the strategy of the majority of criteria (or the maximum group utility)", here 0.5; C1 "Acceptable advantage" Q(a″) − Q(a′) ≥ DQ, DQ = 1/(J − 1); C2 "Acceptable stability in decision making": a′ also best ranked by S or/and R, stable within "voting by majority rule" (v > 0.5), "by consensus" (v ≈ 0.5) or "with veto" (v < 0.5); the three-branch compromise rule above; φ = a f + b leaves the VIKOR result unchanged.
- Found: the step (d) misprint ("decreasing order", see Algorithm). The earlier note that this passage was garbled no longer applies.
- Not in the paper (our choices, see Implementation notes): the guards for a constant column and for all-equal S or R, and the order of tied Q values.

## Implementation notes
- **As implemented (`src/core/methods/vikor.ts`, 2026-10-13):** score = Q, `order: 'asc'`; steps f*, f−, weighted distances d_ij = w_j (f*_j − x_ij)/(f*_j − f−_j), S, R, Q, DQ. A constant column gets d = 0 (notice `vikor.constant-column`); if every S is equal the S term of Q is 0 (only the R term remains, weighted 1 − v), the same for R; both flat gives Q = 0 for all (notices `vikor.equal-group-utility`, `vikor.equal-regret`, `vikor.no-spread`). Q ties for first: a′, a″ by input index, notice `vikor.tie-for-first`, C1 fails and both are in the set. C1 uses ≥ DQ with a 1e-12 tolerance, the set uses < DQ (same tolerance). v is a user parameter (slider, default 0.5).
- Tests: `tests/vikor.test.ts` (Opricovic & Tzeng 2004 exact, φ and any increasing affine change invariant; Keshavarz Ghorabaee 2015 ranks 7/7, Q set 1 and the compromise sets as derived regression values; each branch of the rule).
- pyDecision: `vikor_method(dataset, weights, criterion_type, strategy_coefficient=0.5, graph, verbose)` → `(flow_s, flow_r, flow_q, solution)`; each flow is `[alt_no, value]` sorted ascending.
- pyDecision's `solution` logic deviates from the paper: if C1 **and** C2 hold it returns the whole sorted list (not just a′); if **both** fail it also returns the whole list instead of the {a′…a(M)} set. Implement the three branches explicitly as above.
- Return S, R, Q, the three rankings, C1, C2, DQ and the compromise set; the site should show the "acceptable advantage" and "stability" checks in words.
- Guard all three denominators; for Q, if $S^- = S^*$ use only the R term (and vice versa).

## Sources
- Opricovic & Tzeng 2004, EJOR 156(2):445–455, doi:10.1016/S0377-2217(03)00020-1 (Section 2, Tables 1–3).
- Keshavarz Ghorabaee et al. 2015, Informatica 26(3):435–451, doi:10.15388/Informatica.2015.57 (Tables 5–7).
- Mardani et al. 2016, Sustainability 8(1):37, doi:10.3390/su8010037 (popularity, combinations).
- pyDecision 5.1.1, `pyDecision/algorithm/vikor.py`.
- Recompute script: `scratchpad/mcdm/siralama/scripts/topsis_vikor.py`.
