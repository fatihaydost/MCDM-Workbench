# COmbined COmpromise SOlution (CoCoSo)

**Re-verified 2026-10-18** against the origin paper itself (Yazdani, Zaraté, Zavadskas & Turskis 2019, author's accepted version, read in full: Eqs. 1–9, Tables I–XI) and an independent Turkish worked example (Akgül 2021, DergiPark, read in full). Three fixtures recomputed in numpy (`scripts/cocoso.py`, output `scripts/cocoso.out`), against pyDecision 5.1.8, pymcdm 1.4.0 and pyrepo-mcda 0.1.15 (all run). The HAL copy now sits behind an anti-bot page; the text was read through a search-engine fetch of the same HAL document (see Sources). See "Changes on re-verification" at the end.

- **Family:** ranking (compensatory / utility: two aggregations of min–max normalized values, a weighted sum S and a sum of powers P, read three ways and combined)
- **Origin:** Yazdani, M., Zaraté, P., Zavadskas, E.K. & Turskis, Z. (2019). A combined compromise solution (CoCoSo) method for multi-criteria decision-making problems. *Management Decision* 57(9):2501–2519, DOI [10.1108/MD-05-2017-0458](https://doi.org/10.1108/MD-05-2017-0458). Publisher version paywalled (OpenAlex `is_oa: false`); the **author's accepted version** (OATAO 26185, deposited as HAL hal-02879091) was read in full: method section 2 (Eqs. 1–9), example 3.1 (Tables I–VI), validation 3.2 (Tables VII–IX), second example 3.2.3 (Tables X–XI).
- **Popularity:** cited-by Crossref 1,025, OpenAlex 1,124 (both 2026-10-18; 994 on 29.09). Turkish use is common (DergiPark search, 2026-10-18: CRITIC, MEREC, LOPCOW, Entropy pairings with CoCoSo; one read in full, the rest snippets).

## For users (site copy)
- **EN:** CoCoSo gives each alternative two scores, a weighted sum and a sum of weighted powers, reads them in three ways (their share of the total, their size relative to the weakest alternative, and a λ-balanced mix) and adds the three readings into one score.
- **TR:** CoCoSo her alternatife iki puan verir, ağırlıklı toplam ve ağırlıklı üslerin toplamı; bunları üç biçimde okur (toplam içindeki payı, en zayıf alternatife göre büyüklüğü ve λ ile dengelenmiş karışımı) ve üç okumayı tek bir puanda birleştirir.

**When to use / combined with (site bullets, one sentence each, each backed by sources read in full unless marked):**
- **EN:** Use it when your data mix units or contain negative values: every criterion is rescaled to 0–1 between its worst and best value first. *(Yazdani et al. 2019, Eqs. 2–3; our check: per-column x → a·x + b leaves k unchanged, max diff 2.5e-11, Pitfalls)*
  **TR:** Verileriniz farklı birimlerdeyse ya da negatif değer içeriyorsa kullanın: her kriter önce en kötü ve en iyi değeri arasında 0–1 aralığına ölçeklenir.
- **EN:** CoCoSo only ranks; published studies take its weights from experts, CRITIC or MEREC. *(experts: Yazdani et al. 2019, Table I; CRITIC: Akgül 2021, Table 7; MEREC: Özel Sönmez & Toktaş 2024, snippet only)*
  **TR:** CoCoSo yalnız sıralar; yayımlanmış çalışmalarda ağırlıklar uzmanlardan, CRITIC'ten ya da MEREC'ten gelir.
- **EN:** Be careful: an alternative that is the worst on every criterion makes the method divide by zero, so it cannot be ranked with CoCoSo as published. *(Eq. 7; our check: 100 of 2000 random problems, 80 of 349 with two criteria)*
  **TR:** Dikkat: her kriterde en kötü olan bir alternatif yöntemi sıfıra bölmeye zorlar; böyle bir tabloyu yayımlanan CoCoSo ile sıralayamazsınız.
- **EN:** Be careful: a value that is the worst in its column counts as 0 in the power part, while a value just above it already counts for a lot, so being exactly last on a criterion costs much more than being nearly last. *(Eq. 5; our check: 0.001^0.2 = 0.25, 0^0.2 = 0)*
  **TR:** Dikkat: sütununda en kötü olan değer üs kısmında 0 sayılır, hemen üstündeki değer ise şimdiden yüksek puan alır; bu yüzden bir kriterde tam sonuncu olmak, neredeyse sonuncu olmaktan çok daha pahalıdır.

**UI labels:** score column EN "Combined score k" / TR "Birleşik puan k"; steps EN "Weighted sum S" / TR "Ağırlıklı toplam S", EN "Power sum P" / TR "Üs toplamı P", k_a, k_b, k_c unchanged. Option: λ slider (Decision 3).

### Visual proposal (site): "two scores, three lenses"
One scatter: x = S, y = P, one dot per alternative (default data F1). The three strategies are all straight lines in this plane (Algorithm, step 6): k_a and k_c rank by λS + (1−λ)P (at λ = 0.5 both by S + P, so one family of parallel lines, slope −1), k_b ranks by S/min S + P/min P (a second family, slope −min P/min S, the line through the weakest dot is k_b = 2). Draw both families as faint iso-lines, the weakest dot ringed. Beside it, a small stacked strip per alternative: k_a, k_b, k_c and the final k = ∛(k_a k_b k_c) + (k_a + k_b + k_c)/3, so the eye sees that k_b (≥ 2) dominates the sum. The λ slider tilts the k_c lines and nothing else.
- **EN:** CoCoSo reads the same two scores through three lenses: the total, the size relative to the weakest alternative, and a λ-weighted mix. Where the lenses disagree, the final score settles it.
- **TR:** CoCoSo aynı iki puana üç mercekten bakar: toplam, en zayıf alternatife göre büyüklük ve λ ağırlıklı karışım. Mercekler ayrıştığında sonucu birleşik puan belirler.

## When to use / when not
- **Use when:** criteria are on different, possibly interval scales (min–max is shift- and scale-invariant, so negative values and temperatures work); you want results comparable with the Yazdani–Zavadskas and Turkish finance literature (CRITIC/MEREC → CoCoSo); you want a method that punishes "last on some criterion" harder than SAW does (the P part, Pitfalls).
- **Do not use when:** one alternative is the worst on every criterion, or all alternatives are equal (blocked, Decision 1); you need a bounded or interpretable score (k is not a percentage, k_b alone is ≥ 2 and grows with the spread); a very small problem (two criteria: 23 % of random cases hit the divide-by-zero); you need an independent "second opinion" to SAW min–max: CoCoSo's ranking equals the S (SAW min–max) ranking in 790/1900 random cases only, so it is a different method, but it is not robust to adding/removing alternatives (min, max and min S, min P all move).

## Inputs
- Decision matrix X (m × n), m ≥ 2, n ≥ 1, **any finite values** (negatives and zeros allowed; no `requires.positiveValues`), see Decision 2.
- Criterion types `benefit|cost`; weights w ≥ 0, Σw = 1 (from the weighting step). Zero weights: see Decision 4.
- **λ ∈ [0, 1], default 0.5** (Eq. 8: "λ (usually λ = 0.5) is chosen by decision-makers"). Affects only k_c (Decision 3).

## Algorithm
Notation as in Yazdani et al. (2019): alternatives i = 1..m, criteria j = 1..n.

1. **Decision matrix** (Eq. 1).
2. **Min–max ("compromise") normalization** (Eqs. 2–3, after Zeleny 1973): benefit $r_{ij} = \dfrac{x_{ij} - \min_i x_{ij}}{\max_i x_{ij} - \min_i x_{ij}}$, cost $r_{ij} = \dfrac{\max_i x_{ij} - x_{ij}}{\max_i x_{ij} - \min_i x_{ij}}$. This is **exactly** this project's `minMaxNormalize` (`src/core/math.ts`), already used by CRITIC, SD and Entropy (b). The column's worst value becomes 0, its best 1.
3. **Two aggregations** (Eqs. 4–5): $S_i = \sum_j w_j\, r_{ij}$ ("grey relational generation"), $P_i = \sum_j r_{ij}^{\,w_j}$ ("WASPAS multiplicative attitude" in the paper's words, but it is a **sum** of powers, not WASPAS's product $\prod_j r_{ij}^{w_j}$), with $0^{w} = 0$ for $w > 0$ (the paper's Table V prints 0 for r = 0).
4. **Three appraisal scores** (Eqs. 6–8):
   $$k_{ia} = \frac{P_i + S_i}{\sum_{i}(P_i + S_i)},\qquad k_{ib} = \frac{S_i}{\min_i S_i} + \frac{P_i}{\min_i P_i},\qquad k_{ic} = \frac{\lambda S_i + (1-\lambda) P_i}{\lambda \max_i S_i + (1-\lambda)\max_i P_i}.$$
5. **Final score** (Eq. 9): $k_i = (k_{ia} k_{ib} k_{ic})^{1/3} + \tfrac13 (k_{ia} + k_{ib} + k_{ic})$; rank by decreasing $k_i$ ("as more significant as better"); competition ranking for ties.
6. **Structure (our derivation, checked numerically).** All three appraisal scores are positive linear functions of the pair (S_i, P_i) divided by constants:
   - $k_a \propto S + P$ and $k_c \propto \lambda S + (1-\lambda)P$. **At λ = 0.5, k_c = c · k_a** with $c = \sum_i(S_i+P_i)/(\max S + \max P)$: the same information twice (F1 c = 5.5444, F2 8.2993, F3 7.7051, spread ≤ 1.8e-15).
   - $k_b \ge 2$, with equality only for an alternative that has both the smallest S and the smallest P (F1 A5, F2 S5, F3 BNK8 all print 2).
   - P is on a different scale from S: S ≤ Σw = 1, while each P term is close to 1 for any r > 0 (r^w with small w), so P ≈ the number of criteria on which the alternative is not the worst. In the fixtures P makes up 89–93 % of S + P, so **λ = 0.5 does not give the two parts equal influence**; k_a and k_c mostly rank by P, k_b rescales both by their minimum and is more balanced.
   - k is dominated by k_b (k_b ≥ 2, k_a < 1, k_c ≤ 1). On 1900 random problems, rank(k) = rank(k_b) in 1311, rank(k) = rank(S + P) in 737, rank(k) = rank(S) (SAW min–max) in 790. In all three fixtures k_a, k_c and k agree; in F3 k_b swaps BNK1 and BNK7 (4.823 vs 4.800), k follows k_a/k_c.

**Variants found (and what we do):**
- **Origin formulas** (Eqs. 2–9): implemented. pyDecision `cocoso_method`, pymcdm `COCOSO` and pyrepo-mcda `COCOSO` implement the same formulas (identical to ours on F1–F3, max diff 4.4e-16) and differ only in edge handling:
  - **pyDecision 5.1.8** adds 1e-16 to every min–max denominator (a constant column becomes zeros, as ours) and, when min S = 0 (or min P = 0), adds 1 to all S (or all P) before Eqs. 6–8. With S + 1 and P + 1, min = 1 and k_b = S + P + 2, so all three k's follow the S + P order: the ranking collapses to "S + P" (100/100 random cases). Silent, undocumented; not adopted (Decision 1).
  - **pymcdm 1.4.0** makes a constant column all **ones** (`minmax_normalization`, "If all values are equal"), which adds w_j to every S and 1 to every P and **reorders** alternatives in 514/1900 random cases; ours (zeros) is identical to dropping the column (1900/1900). pymcdm and pyrepo divide by zero when min S = 0 (inf/nan, no message). pymcdm's docstring prints k = [2.041, 2.788, 2.882, 2.416, **1.299**, 1.443, **2.519**] for F1: our values, not the paper's rounded 1.3 / 2.52.
- **Product instead of sum for P** (true WPM): seen in secondary descriptions (e.g. MetricGate calls P a "weighted product" while printing the sum formula); the origin, all three libraries and Akgül 2021 use the sum. Not offered.
- **Other normalizations inside CoCoSo** (Ersoy 2022, DOI 10.24889/ifede.974252, abstract only: linear, non-linear and "enhanced accuracy" normalizations suggested as alternatives; vector and sum normalizations "not suitable"): not offered.
- **Fuzzy, grey, neutrosophic, Bonferroni (CoCoSo'B), Heronian CoCoSo:** other data types or aggregators, out of scope.

## Commonly combined with
- **Weights:** expert/given weights (origin, Table I; F2 from Yazdani et al. 2017), CRITIC (Akgül 2021, read in full; Kahreman D8 study with CRITIC + LOPCOW; Gülcemal İzci, Çağlar & Taşçı 2022 insurance; Tanrıverdi & Eryaşar 2022 airlines: snippets only), MEREC (Özel Sönmez & Toktaş 2024, DOI 10.59313/jsr-a.1420728, snippet with tables), Entropy (Akbulut & Hepşen 2021, title from Akgül's reference list only), PIPRECIA (G7 study's literature table, snippet).
- **Compared with:** WASPAS, VIKOR, TOPSIS, CODAS, MOORA, COPRAS, EDAS (origin §3.2.2, Table IX: WASPAS and VIKOR give the same ranking as CoCoSo on F1; TOPSIS and CODAS 0.93, MOORA 0.97, COPRAS 0.86, EDAS 0.58 Spearman); COPRAS ≈ 0.7 and MOORA 0.91 on F2 (Table XI). Stević & Brković (2020, MARCOS card) report CoCoSo 0.909 against MARCOS.

## Pitfalls
- **Worst on every criterion → division by zero.** S_i = 0 ⇔ r_ij = 0 on every criterion with w_j > 0 ⇔ P_i = 0 (for w > 0). Then min S = min P = 0 and k_b = x/0 for everyone (ours: nan/inf). Not rare: 100/2000 random problems (n = 2: 80/349, n = 3: 16/315, n = 4: 4/334, n ≥ 5: 0), and always when m = 2 and one alternative dominates. The paper does not discuss it. Removing that alternative changes every min–max range, and a new all-worst alternative can appear. Decision 1.
- **All alternatives equal** (every column constant): every r = 0, S = P = 0, k = nan. Falls under the same rule (every alternative is "worst everywhere").
- **The cliff at r = 0 (WPM part).** $r^{w}$ with small w is near 1 for any r > 0 and exactly 0 at r = 0: for w = 0.2, r = 0.1 → 0.631, 0.01 → 0.398, 0.001 → 0.251, 10⁻⁶ → 0.063, 0 → 0. Being the single worst on a criterion costs almost a full point of P; being 0.1 % above the worst costs only 0.75 of it. This is the method as published (F1 Table V, F3 Table 11 with 9 zero cells), not a bug; it makes CoCoSo sensitive to who is exactly last per column. Explain on the method page; no special handling.
- **Zero weights.** $r^0 = 1$ for every r (JS `Math.pow(0, 0) = 1`, numpy `0**0 = 1`), so a criterion with w = 0 adds 1 to **every** P, and that shifts k_a, k_b, k_c: an extra zero-weight criterion reorders 320/1900 random problems. It happens in practice: SD/CRITIC give a constant column weight 0, and that column then adds 1 to every P. Decision 4.
- **Constant column:** `minMaxNormalize` returns zeros, which is exactly the same as leaving the column out (1900/1900, k identical to 1e-12); keep the existing `constant-column` warning. pymcdm's "ones" choice reorders (514/1900), so it must not be copied.
- **Near-constant column:** min–max stretches a 1e-9-relative spread to [0, 1] and gives it full weight in S and an almost full point in P; warn as CRITIC/SD do (`cocoso.near-constant-column` from `minMaxNormalize`'s `nearConstant`).
- **Negative values:** allowed. Min–max is invariant to x → a·x + b per column (a > 0): max |Δk| 2.5e-11 over 1900 random problems with shifts up to ±1000.
- **λ sensitivity:** only k_c depends on λ. Fixtures: F1 no change on 0, 0.1, …, 1; F2 changes only at λ = 1 (S8/S1 swap 5↔6); F3 at 0.9 and 1 (BNK1/BNK7 swap 7↔8). Random: 731/1900 change somewhere on the grid, 213/1900 within 0.3–0.7. At λ = 0.5, k_c = c · k_a (step 6).
- **Scale of k:** not bounded (k_b ≥ 2 grows with max/min ratios); k values cannot be compared across problems or read as percentages.
- **Rank reversal:** min/max per column and min S, min P, max S, max P over alternatives all move when alternatives are added or removed. Not quantified here.
- **Single alternative:** blocked by `MIN_ALTERNATIVES = 2` (it would be all zeros, k = nan).
- **Rounded chains in papers:** the origin prints k to 3 d.p. with trailing zeros dropped (1.3, 2.52); k recomputed from the printed k_a, k_b, k_c differs from the printed k by up to 0.0012, so the paper rounded at another stage. Use the tolerances below.

## Reference example (test fixture)

### F1 (main): Yazdani et al. (2019), logistics provider selection, 7 × 5
- **Source:** origin paper §3.1, **Table I** (data, weights, optimal direction: C2 price min, others max), Table II (see note), **Table III** (r), **Table IV** (w·r, S), **Table V** (r^w, P), **Table VI** (k_a, k_b, k_c, k, ranks). Author's version (HAL hal-02879091 / OATAO 26185), read in full.
- **Paper notes:** (i) **Table II** ("normalised decision-making matrix") is a **sum normalization** x/Σx (A1 C1 60/93.15 = 0.6441, C2 0.4/1.13 = 0.3540) and is not used by the method; the min–max values are Table III. (ii) Equation numbering: the method section numbers k_a, k_b, k_c, k as Eqs. (6)–(9), the example text calls them "(7), (8) and (9)" and "(10)". (iii) Table V prints A7/C2 as 0.988 and A3/A5 C2 as 0.9877 for the same r = 0.9375 (ours 0.9877). (iv) The text says the companies are assessed "by the proposed fuzzy model"; the method is crisp. (v) Table I's matrix is the industrial-robot data of CODAS 2016 Example 1 (see `codas.md`), relabelled as logistics providers.
- **Recomputed:** r vs Table III MATCH (5e-5); r^w vs Table V MATCH (3.1e-4, the 0.988 print); S MATCH (5e-5), P MATCH (4e-5), k_a/k_b/k_c MATCH (≤ 5e-4), k max diff **0.0013** (A5 1.2987 vs "1.3", A7 2.5191 vs "2.52"; paper rounding, see Pitfalls), ranking **MATCH 7/7**; all three partial rankings equal the final one, as the paper states.

```json
{
  "id": "cocoso-yazdani-2019-logistics",
  "source": "Yazdani, Zarate, Zavadskas & Turskis 2019, Management Decision 57(9):2501-2519, DOI 10.1108/MD-05-2017-0458, Tables I, III-VI",
  "alternatives": ["A1 Mathez", "A2 Bansard", "A3 GEFCO", "A4 Schneider", "A5 LDI Dimotrans", "A6 SAGA", "A7 GETMA"],
  "criteria": ["C1 inventory capacity", "C2 offered price", "C3 batch/delivery volume", "C4 flexibility", "C5 technology utilisation"],
  "types": ["benefit", "cost", "benefit", "benefit", "benefit"],
  "weights": [0.036, 0.192, 0.326, 0.326, 0.12],
  "params": { "lambda": 0.5 },
  "matrix": [
    [60, 0.4, 2540, 500, 990], [6.35, 0.15, 1016, 3000, 1041], [6.8, 0.1, 1727.2, 1500, 1676],
    [10, 0.2, 1000, 2000, 965], [2.5, 0.1, 560, 500, 915], [4.5, 0.08, 1016, 350, 508],
    [3, 0.1, 1778, 1000, 920]
  ],
  "published": {
    "S":  [0.43, 0.6082, 0.6363, 0.4471, 0.2403, 0.2683, 0.5031],
    "P":  [3.2914, 4.3907, 4.502, 4.2058, 2.261, 2.5057, 4.1991],
    "ka": [0.131, 0.175, 0.18, 0.163, 0.088, 0.097, 0.165],
    "kb": [3.245, 4.473, 4.64, 3.721, 2, 2.225, 3.951],
    "kc": [0.724, 0.973, 1, 0.906, 0.487, 0.54, 0.915],
    "k":  [2.041, 2.788, 2.882, 2.416, 1.3, 1.443, 2.52],
    "ranking": [5, 2, 1, 4, 7, 6, 3]
  },
  "expected": {
    "S":  [0.429973, 0.608249, 0.636339, 0.447073, 0.240268, 0.268331, 0.503143],
    "P":  [3.291361, 4.390712, 4.502038, 4.205820, 2.260980, 2.505710, 4.199086],
    "ka": [0.130623, 0.175469, 0.180363, 0.163322, 0.087797, 0.097372, 0.165054],
    "kb": [3.245282, 4.473498, 4.639646, 3.720904, 2.000000, 2.225040, 3.951291],
    "kc": [0.724224, 0.972868, 1.000000, 0.905518, 0.486778, 0.539867, 0.915120],
    "k":  [2.041313, 2.787990, 2.882350, 2.416046, 1.298692, 1.443143, 2.519094],
    "ranking": [5, 2, 1, 4, 7, 6, 3],
    "tolerance_vs_published": { "S": 5e-4, "P": 5e-4, "ka": 5e-4, "kb": 5e-4, "kc": 5e-4, "k": 1.5e-3 }
  }
}
```

### F2 (secondary, origin): Yazdani et al. (2019), green supplier selection, 10 × 7
- **Source:** origin paper §3.2.3, **Table X** (data and weights, adopted from Yazdani et al. 2017; price P and energy/resource consumption ENRC are cost, the others benefit, per the text), **Table XI** (k_a, k_b, k_c, k, ranks). The printed matrix is already scaled (values ≈ x/Σx); min–max is invariant to that.
- **Recomputed:** k_a MATCH (5e-5), k_b (4e-5), k_c (1.2e-4: S8 printed 0.89, ours 0.8899), k (5e-5), ranking **MATCH 10/10**. Nothing to reconcile.

```json
{
  "id": "cocoso-yazdani-2019-green-suppliers",
  "source": "Yazdani et al. 2019, Management Decision 57(9), section 3.2.3, Tables X-XI",
  "alternatives": ["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8", "S9", "S10"],
  "criteria": ["QD quality adaptation", "P price", "ENRC energy and natural resource consumption", "DS delivery speed", "GD green design", "RRR re-use and recycle rate", "PP production planning"],
  "types": ["benefit", "cost", "cost", "benefit", "benefit", "benefit", "benefit"],
  "weights": [0.132, 0.135, 0.138, 0.162, 0.09, 0.223, 0.12],
  "params": { "lambda": 0.5 },
  "matrix": [
    [0.068, 0.066, 0.15, 0.098, 0.156, 0.114, 0.098], [0.078, 0.076, 0.108, 0.136, 0.082, 0.171, 0.105],
    [0.157, 0.114, 0.128, 0.083, 0.108, 0.113, 0.131], [0.106, 0.139, 0.058, 0.074, 0.132, 0.084, 0.12],
    [0.103, 0.187, 0.125, 0.176, 0.074, 0.064, 0.057], [0.105, 0.083, 0.15, 0.051, 0.134, 0.094, 0.113],
    [0.137, 0.127, 0.056, 0.133, 0.122, 0.119, 0.114], [0.1, 0.082, 0.086, 0.06, 0.062, 0.109, 0.093],
    [0.053, 0.052, 0.043, 0.1, 0.05, 0.078, 0.063], [0.094, 0.074, 0.097, 0.087, 0.08, 0.054, 0.106]
  ],
  "published": {
    "ka": [0.0974, 0.1177, 0.1142, 0.1113, 0.0742, 0.0832, 0.1205, 0.1072, 0.0778, 0.0964],
    "kb": [2.8816, 3.6851, 3.3882, 3.1467, 2, 2.4779, 3.8388, 2.8991, 2.3485, 2.595],
    "kc": [0.8087, 0.9772, 0.9477, 0.9236, 0.6158, 0.6906, 1, 0.89, 0.6457, 0.8],
    "k":  [1.8727, 2.3446, 2.1991, 2.0803, 1.3471, 1.6061, 2.4265, 1.9503, 1.5145, 1.7488],
    "ranking": [6, 2, 3, 4, 10, 8, 1, 5, 9, 7]
  },
  "expected": {
    "S":  [0.471796, 0.635067, 0.556544, 0.492696, 0.297142, 0.408371, 0.671574, 0.432256, 0.391977, 0.384981],
    "P":  [5.406463, 6.467954, 6.331759, 6.220358, 4.178744, 4.611492, 6.596875, 6.035803, 4.301356, 5.429976],
    "ka": [0.097446, 0.117749, 0.114190, 0.111285, 0.074198, 0.083216, 0.120492, 0.107223, 0.077803, 0.096397],
    "kb": [2.881582, 3.685074, 3.388222, 3.146688, 2.000000, 2.477890, 3.838789, 2.899119, 2.348501, 2.595041],
    "kc": [0.808736, 0.977240, 0.947699, 0.923588, 0.615797, 0.690637, 1.000000, 0.889882, 0.645713, 0.800027],
    "k":  [1.872688, 2.344635, 2.199113, 2.080273, 1.347088, 1.606126, 2.426457, 1.950314, 1.514472, 1.748751],
    "ranking": [6, 2, 3, 4, 10, 8, 1, 5, 9, 7],
    "tolerance_vs_published": 2e-4
  }
}
```

### F3 (secondary, Turkish): Akgül (2021), CRITIC → CoCoSo, 9 banks × 9 criteria, 2016
- **Source:** Akgül, Y. (2021). Borsa İstanbul'da İşlem Gören Ticari Bankaların Finansal Performansının Bütünleşik CRITIC CoCoSo Modeliyle Analizi. *Ekonomi ve Finansal Araştırmalar Dergisi* 3(2):71–90 (DergiPark article 1032234, PDF article-file 2114456; no DOI printed). Read in full: **Table 3** (directions: CR1–CR7 max, CR8 branches and CR9 employees min), **Table 4** (2016 matrix, million TL; the commas are thousands separators), **Table 7** (CRITIC weights, sum 1.0000), Table 9 (r), **Table 10** (S), **Table 11** (P), **Table 12** (k_a, k_b, k_c, k, ranks).
- **Why this one:** independent author, Turkish, objective weights, both cost and benefit criteria, and **9 exact zeros in r** (BNK8 is worst on all seven benefit criteria and best on both cost criteria), so it exercises $0^{w} = 0$: BNK8's P = 2.0000 exactly (two ones, seven zeros).
- **Minor:** Table 9 BNK1/CR6 prints 0.9270; from Table 4, (4701 − 14)/(5071 − 14) = 0.9268. Table 5 (the CRITIC normalization) prints the same 0.9270. Weights are used as printed (4 d.p.); the CRITIC step is not re-derived here (Akgül's Eq. 6 uses the population σ).
- **Recomputed:** S MATCH (1.0e-4), P MATCH (1.4e-4), k_a (4e-5), k_b (5.4e-4, BNK1), k_c (6e-5), k (2.4e-4), ranking **MATCH 9/9**. k_b alone ranks BNK1 7th and BNK7 8th (4.8230 vs 4.7999); k follows k_a and k_c.

```json
{
  "id": "cocoso-akgul-2021-banks-2016",
  "source": "Akgul 2021, Ekonomi ve Finansal Arastirmalar Dergisi 3(2):71-90, Tables 3, 4, 7, 10-12 (DergiPark article-file 2114456)",
  "alternatives": ["BNK1 Is Bankasi", "BNK2 Halkbank", "BNK3 Vakifbank", "BNK4 Yapi Kredi", "BNK5 Akbank", "BNK6 QNB Finansbank", "BNK7 Sekerbank", "BNK8 ICBC Turkey", "BNK9 Garanti"],
  "criteria": ["CR1 total assets", "CR2 loans and receivables", "CR3 deposits", "CR4 equity", "CR5 paid-in capital", "CR6 net profit", "CR7 off-balance-sheet", "CR8 branches", "CR9 employees"],
  "types": ["benefit", "benefit", "benefit", "benefit", "benefit", "benefit", "benefit", "cost", "cost"],
  "weights": [0.0839, 0.0853, 0.0879, 0.0833, 0.0956, 0.0828, 0.0807, 0.1951, 0.2054],
  "params": { "lambda": 0.5 },
  "matrix": [
    [311626, 204257, 177360, 35961, 4500, 4701, 718493, 1374, 24756],
    [231441, 158354, 150263, 21317, 1250, 2558, 911260, 964, 16956],
    [212540, 147712, 123838, 19239, 2500, 2703, 1769710, 924, 15615],
    [252820, 172624, 154275, 26119, 4347, 2933, 1168672, 936, 18366],
    [271016, 161828, 158878, 30655, 4000, 4529, 1417631, 841, 13843],
    [101503, 62900, 53939, 10126, 3150, 1203, 815224, 630, 12451],
    [23819, 17606, 16136, 2533, 1158, 125, 522138, 273, 3611],
    [8218, 5071, 3383, 595, 420, 14, 8714, 44, 809],
    [284155, 186048, 161232, 35539, 4200, 5071, 1515797, 968, 19689]
  ],
  "published": {
    "S":  [0.5453, 0.4799, 0.5403, 0.5878, 0.6834, 0.4336, 0.4061, 0.4004, 0.6594],
    "P":  [6.9230, 8.2343, 8.3722, 8.4145, 8.5925, 8.1526, 7.5714, 2.0000, 8.4750],
    "ka": [0.1045, 0.1219, 0.1247, 0.1260, 0.1298, 0.1201, 0.1116, 0.0336, 0.1278],
    "kb": [4.8235, 5.3158, 5.5355, 5.6753, 6.0029, 5.1592, 4.8000, 2.0000, 5.8842],
    "kc": [0.8051, 0.9395, 0.9608, 0.9705, 1.0000, 0.9256, 0.8600, 0.2588, 0.9847],
    "k":  [2.6514, 2.9733, 3.0791, 3.1425, 3.2977, 2.8993, 2.6963, 1.0232, 3.2370],
    "ranking": [8, 5, 4, 3, 1, 6, 7, 9, 2]
  },
  "expected": {
    "S":  [0.545268, 0.479895, 0.540239, 0.587772, 0.683331, 0.433629, 0.406202, 0.400500, 0.659316],
    "P":  [6.923022, 8.234209, 8.372176, 8.414463, 8.592454, 8.152568, 7.571322, 2.000000, 8.474862],
    "ka": [0.104494, 0.121925, 0.124699, 0.125956, 0.129783, 0.120135, 0.111619, 0.033587, 0.127802],
    "kb": [4.822980, 5.315345, 5.534999, 5.674828, 6.002422, 5.159004, 4.799899, 2.000000, 5.883663],
    "kc": [0.805138, 0.939446, 0.960826, 0.970509, 1.000000, 0.925657, 0.860038, 0.258792, 0.984734],
    "k":  [2.651201, 2.973121, 3.078893, 3.142330, 3.297531, 2.899190, 2.696228, 1.023176, 3.236760],
    "ranking": [8, 5, 4, 3, 1, 6, 7, 9, 2],
    "tolerance_vs_published": 1e-3
  }
}
```

### Libraries (divergence only, never a reference)
- **pyDecision 5.1.8 `cocoso_method(dataset, criterion_type, weights, L=0.5, graph, verbose)`** (`pyDecision/algorithm/cocoso.py`, PyPI = GitHub master, run): identical on F1–F3 (4.4e-16). Note the argument order (types before weights), the 1e-16 in the min–max denominator and the "+1 if min is 0" hack (Variants).
- **pymcdm 1.4.0 `COCOSO(l=0.5)`** (run): identical on F1–F3; constant column → ones; no guard for min S = 0.
- **pyrepo-mcda 0.1.15 `COCOSO(lambda_param=0.5)`** (run): identical on F1–F3; no guard.

## Implementation notes
- `src/core/methods/cocoso.ts`, `export const cocoso: RankingMethod<CocosoParams> = { id: 'cocoso', kind: 'ranking', params: [{ key: 'lambda', kind: 'number', min: 0, max: 1, step: 0.1, default: 0.5 }], compute }`; **no `requires`** (negatives allowed). Register in `registry.ts` and export from `core/index.ts`.
- Validation as `waspas.ts`: `validateProblem` → `validateWeights` → `assertValid`, and the same `RangeError` for λ outside [0, 1].
- **Reuse (by name):**
  - `minMaxNormalize(problem)` from `src/core/math.ts`: exactly Eqs. 2–3, constant column → zeros (= column dropped), and its `nearConstant` flags for the warning. Already shared by `critic.ts`, `sd.ts`, `entropy.ts`.
  - `sum`, `minOf`, `maxOf` (`math.ts`) for Σ(S + P), min/max of S and P; `rankScores(k, 'desc')` (`rank.ts`).
  - From `waspas.ts`: the λ **parameter descriptor** and the grid `WASPAS_LAMBDA_GRID` (0, 0.1, …, 1) for the sweep step; import it or move it to a shared `LAMBDA_GRID` (one line).
  - **Not reusable:** WASPAS's `wsm`/`wpm` run on `linearMaxNormalize` and its WPM is a product; CoCoSo needs min–max and a sum of powers. S and P are one `reduce` each (as in `waspas.ts`): `S = r.map(row => row.reduce((a, x, j) => a + x * w[j], 0))`, `P = r.map(row => row.reduce((a, x, j) => a + (w[j] > 0 ? x ** w[j] : 0), 0))` (Decision 4). SAW's `compute` cannot give S either (SAW has `linearMax` and `sum` normalizations, no min–max).
- Return `scores: k`, `order: 'desc'`, `ranking: rankScores(k, 'desc')`. Steps (i18n keys): `cocoso.normalized` (matrix), `cocoso.s`, `cocoso.p`, `cocoso.ka`, `cocoso.kb`, `cocoso.kc` (vectors), `cocoso.scores`, `cocoso.lambdaSweep` (matrix alternatives × λ, as WASPAS). Diagnostics: `{ minS, minP, maxS, maxP }`.
- Errors / warnings: blocking `cocoso.all-worst-alternative` with the row index(es) when min S = 0 (Decision 1; covers "all equal"); warnings `constant-column` (existing), `cocoso.near-constant-column`.
- Tests (Vitest): F1–F3 vs `published` (tolerances in JSON) and `expected` (1e-6), rankings; properties: k_c = c · k_a at λ = 0.5 (1e-12), min k_b = 2 for the row with min S and min P, x → a·x + b per column leaves k unchanged (negative values), a constant column gives the same k as dropping it, a zero-weight criterion leaves k unchanged (Decision 4), λ = 0 / 1 run; edge: an all-worst row → error naming it, all-equal → same error, m = 1 → `too-few-alternatives`.

## Decisions for Fatih
1. **Alternative worst on every criterion (min S = 0, incl. "all equal"):** block with a clear error that names the alternative(s) and says why ("it is the worst on every criterion; CoCoSo divides by its score"), no silent fix (recommended; the same "no hidden substitution" line as MARCOS/COPRAS). Alternative: pyDecision's +1 shift, which keeps CoCoSo running but turns its ranking into plain S + P (shown in the step view with a warning). Frequency: 5 % of random problems, 23 % with two criteria.
2. **Negative / zero values:** allowed, no `requires.positiveValues` (recommended): min–max makes CoCoSo invariant to shifting and scaling a column (checked, 2.5e-11), unlike SAW, WASPAS, MARCOS and COPRAS.
3. **λ:** offer a slider 0–1, step 0.1, default 0.5, same descriptor as WASPAS, plus the λ sweep in the steps (recommended); add a one-line note that λ only moves k_c and that at 0.5 the P part still dominates (89–93 % in the fixtures). Changes the ranking somewhere on the grid in 38 % of random problems, within 0.3–0.7 in 11 %. Alternative: fixed 0.5, no option (all three fixtures use 0.5).
4. **Zero weights:** leave criteria with w_j = 0 out of P (recommended), so a zero-weight criterion has no effect, as in every other method here; this matters when SD/CRITIC give a constant column weight 0. The paper has no zero weights; all three libraries add 0⁰ = 1 to every P (reorders 17 % of random problems). Document as our choice.
5. **Fixtures:** F1 origin §3.1 as main (k tolerance 1.5e-3 for the paper's rounding), F2 origin §3.2.3 and F3 Akgül 2021 (Turkish, CRITIC weights, nine zero cells) as secondary (recommended).

## Sources
- Yazdani, M., Zaraté, P., Zavadskas, E.K. & Turskis, Z. (2019). *Management Decision* 57(9):2501–2519, DOI 10.1108/MD-05-2017-0458. Author's version https://hal.science/hal-02879091/document (OATAO 26185), **read in full** (Eqs. 1–9, Tables I–XI). On 2026-10-18 HAL served an anti-bot page to direct download and OATAO did not respond; the text was read through Exa's fetch of the same HAL URL (the HAL cover page and OATAO header confirm the document). Publisher version not opened (paywall). Cited-by: Crossref and OpenAlex APIs (2026-10-18).
- Akgül, Y. (2021). *Ekonomi ve Finansal Araştırmalar Dergisi* 3(2):71–90, https://dergipark.org.tr/tr/download/article-file/2114456 , **read in full** (Eqs. 8–16, Tables 3–13).
- Özel Sönmez, G. & Toktaş, P. (2024), *Journal of Scientific Reports-A*, DOI 10.59313/jsr-a.1420728 (MEREC–CoCoSo); Ersoy, N. (2022), DOI 10.24889/ifede.974252 (normalization study); Kahreman (D8 study, DergiPark article-file 3320155); Gülcemal İzci, Çağlar & Taşçı (2022), DOI 10.25095/mufad.1168270; Tanrıverdi & Eryaşar (2022), DOI 10.53443/anadoluibfd.1142910; MetricGate CoCoSo page: **search snippets only**. Altıntaş (2021, G7, DOI 10.15637/jlecon.8.3.06) opened but not used: its printed tables are internally inconsistent (Table 5 is not a min–max of Table 4).
- Code read and run 2026-10-18: pyDecision 5.1.8 `pyDecision/algorithm/cocoso.py` (identical to GitHub master); pymcdm 1.4.0 `pymcdm/methods/cocoso.py`, `normalizations.py`; pyrepo-mcda 0.1.15 `mcda_methods/cocoso.py`; this repo `src/core/math.ts` (`minMaxNormalize`), `src/core/methods/waspas.ts`, `saw.ts`, `critic.ts`, `sd.ts`, `entropy.ts`, `src/core/validate.ts`.
- Recompute: `docs/research/scripts/cocoso.py` (numpy 2.5.4), output `docs/research/scripts/cocoso.out` (library section produced in a scratch venv with the three libraries installed; without them the script skips it).

## Changes on re-verification (2026-10-18)
- Origin re-read in full (method, both examples, validation tables); formulas unchanged from the 29.09 draft. New: P is a sum of powers despite the paper calling it WASPAS-multiplicative; equation-numbering slip, Table V print slip and "fuzzy model" text slip documented.
- **New fixtures:** F2 (origin's second example, Tables X–XI, MATCH 10/10, 5e-5) and F3 (Akgül 2021, Turkish, CRITIC weights, MATCH 9/9). F1 unchanged (k diff 0.0013 from the paper's rounding).
- **Libraries:** pymcdm and pyrepo-mcda added and run; pymcdm's constant column = ones found (reorders 27 % of random cases); pyDecision's +1 hack shown to collapse the ranking to S + P.
- **Structure:** k_c = c · k_a at λ = 0.5; k_b ≥ 2; P dominates S (89–93 %); k follows k_b in 69 % of random problems.
- **Edge cases quantified:** all-worst alternative frequency, the r = 0 cliff, zero-weight criteria (17 % reorder), constant column (zeros = dropped), shift/scale invariance (negatives allowed), λ sensitivity.
- The draft's "change the min S = 0 policy" and "constant column → r = 0 and warn" turned into Decisions 1 and Implementation notes; site copy, visual proposal, UI labels and Decisions section added; draft recompute script path (scratchpad) replaced by `scripts/cocoso.py`.
- Not verified: the publisher's version; the snippet-only pairings; rank reversal not measured.
