# Measurement of Alternatives and Ranking according to COmpromise Solution (MARCOS)

**Re-verified 2026-10-18** against Stević & Brković (2020, *Logistics*, open access, read in full; Eqs. 1–12 and Figure 2 read from the page images) and a second, independent worked example (Madenoğlu 2020, Turkish, DergiPark, read in full). Both fixtures recomputed in numpy (`scripts/marcos.py`, output `scripts/marcos.out`), against pyDecision's source and against this project's own `saw.ts`. The 2020 origin paper in *Computers & Industrial Engineering* is **paywalled and was not opened**; no open copy was found (OpenAlex: `is_oa: false`, no repository copy). See "Changes on re-verification" at the end.

- **Family:** ranking (compensatory / utility: weighted sum divided by the sums of two reference rows)
- **Origin:** Stević, Ž., Pamučar, D., Puška, A. & Chatterjee, P. (2020). Sustainable supplier selection in healthcare industries using a new MCDM method: Measurement of alternatives and ranking according to COmpromise solution (MARCOS). *Computers & Industrial Engineering* 140:106231, DOI [10.1016/j.cie.2019.106231](https://doi.org/10.1016/j.cie.2019.106231). **Not opened** (Elsevier paywall; OpenAlex and a web search found no open copy; only the abstract and highlights were read: 8 alternatives × 21 criteria, "seven simple steps"). The formulas below are taken from the method author's own open-access restatement, Stević & Brković (2020), *Logistics* 4(1):4, DOI [10.3390/logistics4010004](https://doi.org/10.3390/logistics4010004), Eqs. 1–12, and match the restatements in Madenoğlu (2020, Eqs. 1–12), Özdağoğlu et al. (2020, Eqs. 10–22, search snippet), pyDecision and RMCDA.
- **Popularity:** cited-by for the CIE paper: Crossref 1,261, OpenAlex 1,420; *Logistics* paper: Crossref 202 (all 2026-10-18). A bibliometric review (Demir, Chatterjee, Kadry, Abdelhadi & Pamučar 2024, *DMAME*, DOI [10.31181/dmame7220241137](https://doi.org/10.31181/dmame7220241137)) lists CRITIC as the weighting method most often paired with MARCOS (13 papers), then BWM, Entropy and FUCOM (search snippet only, not read; the snippet's counts for the last three are ambiguous). Turkish use is common (DergiPark: AHP, CRITIC, IDOCRIW, MEREC and ANP pairings found in one search; titles only except Madenoğlu).

## For users (site copy)
- **EN:** MARCOS adds two imaginary alternatives to the table, an ideal one with the best value of every criterion and an anti-ideal one with the worst, and scores each real alternative by how its weighted total compares with theirs.
- **TR:** MARCOS tabloya iki hayali alternatif ekler: her kriterde en iyi değere sahip ideal ve en kötü değere sahip anti-ideal; her gerçek alternatifi, ağırlıklı toplamının bu ikisininkiyle oranına göre puanlar.

**When to use / combined with (site bullets, one sentence each, each backed by sources read in full unless marked):**
- **EN:** Use it when all values are positive and you want results that speak in terms of "how close to the ideal, how far from the worst". *(Stević & Brković 2020, Eqs. 2–3, 7–8, p. 4)*
  **TR:** Tüm değerler pozitifse ve sonuçları "ideale ne kadar yakın, en kötüden ne kadar uzak" diliyle anlatmak istiyorsanız kullanın.
- **EN:** MARCOS gives exactly the same order as SAW with the "Linear (x / max)" option; only the scale of the scores differs. *(our algebra, Algorithm step 7; 0/2000 random cases differ; Stević & Brković 2020, Table 6: Spearman 1.000 between MARCOS and SAW)*
  **TR:** MARCOS, SAW'ın "Doğrusal (x / maks)" seçeneğiyle birebir aynı sıralamayı verir; yalnız skorların ölçeği farklıdır.
- **EN:** MARCOS only ranks; published studies take its weights from FUCOM, AHP, CRITIC or Entropy. *(FUCOM: Stević & Brković 2020, Figure 2; AHP: Madenoğlu 2020, Table 3; CRITIC, Entropy: Demir et al. 2024 and El-Araby et al. 2024, snippets only)*
  **TR:** MARCOS yalnız sıralar; yayımlanmış çalışmalarda ağırlıklar FUCOM, AHP, CRITIC ya da Entropi'den gelir.
- **EN:** Be careful: zero values are not allowed; the method's authors replaced a zero with 0.001, and the value you choose instead of zero changes the scores. *(Stević & Brković 2020, p. 7: 0.001 means no damage and is "used for the purpose of calculation and to avoid a value of zero"; our check, Pitfalls)*
  **TR:** Dikkat: sıfır değer kabul edilmez; yöntemin yazarları sıfır yerine 0,001 yazmıştır ve sıfırın yerine seçtiğiniz değer skorları değiştirir.

**Why the same order as SAW (site, method page and Compare stage):**
- **EN:** MARCOS divides each alternative's weighted total by two fixed numbers, the totals of the ideal and the anti-ideal row, so its score is the SAW score times one constant: same order, different scale.
- **TR:** MARCOS her alternatifin ağırlıklı toplamını iki sabit sayıya, ideal ve anti-ideal satırın toplamlarına böler; bu yüzden skoru SAW skorunun tek bir sabitle çarpımıdır: sıra aynı, ölçek farklı.

**UI labels:** score column EN "Utility f(K)" / TR "Fayda f(K)"; step columns EN "Weighted total S" / TR "Ağırlıklı toplam S", K⁻ / K⁺ unchanged. No options.

### Visual proposals (site)
1. **Method idea, one picture: "two ghost rows and two ratios".** A horizontal number line from 0 to Σw (= 1). Two fixed markers: the anti-ideal total S_aai (grey, dashed) and the ideal total S_ai = 1 (accent, dashed). Each alternative is a dot at its weighted total S_i. Above a selected dot, two brackets: K⁻ = S_i / S_aai ("how many anti-ideals it is worth", > 1) and K⁺ = S_i / S_ai ("what share of the ideal it reaches", ≤ 1). Next to it, a mini table with the AAI row on top and the AI row at the bottom in a lighter style (as Table 2 of the paper lays it out). Data for the default example comes from F1 or F2 below.
2. **"Why the same order as SAW": one scatter, one line.** x = SAW (Linear) score, y = MARCOS f(K), one dot per alternative. All dots lie on one straight line through the origin with slope c (label: "f(K) = c · S, c = 0.87"). No dot can leave the line, so no pair can swap. In the Compare stage, when both SAW (Linear) and MARCOS are selected: draw the two rank columns with straight, non-crossing connectors and a small badge "same order (f(K) = c · SAW)". Only for SAW's `linearMax` option; SAW `sum` can differ.

## When to use / when not
- **Use when:** all values are positive ratio-scale amounts; stakeholders expect ideal / anti-ideal wording; you want results comparable with the Stević–Pamučar literature (FUCOM/CRITIC/BWM → MARCOS).
- **Do not use when:** you want a second, independent opinion next to SAW (Linear): it is the same ranking (step 7), so it must not be counted as an extra method in a consensus; data contain zeros or negatives (blocked); interval-scale data (x / max is not shift-invariant, same as SAW).

## Inputs
- Decision matrix X (m × n), m ≥ 2, n ≥ 2, **all x_ij > 0** (blocking `non-positive-value`, same rule as SAW, WASPAS and COPRAS; see Decision 1).
- Criterion types `benefit|cost`; weights w ≥ 0, Σw = 1 (from the weighting step).
- **No parameters.** AI and AAI are taken from the data (Eqs. 2–3). User-defined AI/AAI are not offered (Decision 2).

## Algorithm
Notation as in Stević & Brković (2020): alternatives i = 1..m, criteria j = 1..n, B = benefit, C = cost.

1. **Extended matrix** (Eq. 1): add the anti-ideal row AAI on top and the ideal row AI at the bottom.
2. **Reference rows** (Eqs. 2–3): $AAI_j = \min_i x_{ij}$ ($j\in B$), $\max_i x_{ij}$ ($j\in C$); $AI_j = \max_i x_{ij}$ ($j\in B$), $\min_i x_{ij}$ ($j\in C$).
3. **Normalization** of all m + 2 rows (Eqs. 4–5): $n_{ij} = x_{ai,j}/x_{ij}$ ($j\in C$), $n_{ij} = x_{ij}/x_{ai,j}$ ($j\in B$). With data-derived AI this is benefit x/max, cost min/x: **exactly** this project's `linearMaxNormalize` (`src/core/math.ts`, shared by SAW `linearMax` and WASPAS). The AI row becomes all 1; the AAI row becomes $\min_j/\max_j$ in every column (benefit min/max, cost min/max).
4. **Weighted matrix** (Eq. 6): $v_{ij} = w_j n_{ij}$; **row sums** (Eq. 9): $S_i = \sum_j v_{ij}$, and the same for the reference rows: $S_{ai} = \sum_j w_j = 1$, $S_{aai} = \sum_j w_j \min_j/\max_j$.
5. **Utility degrees** (Eqs. 7–8): $K_i^- = S_i / S_{aai}$, $K_i^+ = S_i / S_{ai}$.
6. **Utility functions** (Eqs. 11–12): $f(K_i^-) = \dfrac{K_i^+}{K_i^+ + K_i^-}$, $f(K_i^+) = \dfrac{K_i^-}{K_i^+ + K_i^-}$; **final utility** (Eq. 10):
   $$f(K_i) = \frac{K_i^+ + K_i^-}{1 + \dfrac{1-f(K_i^+)}{f(K_i^+)} + \dfrac{1-f(K_i^-)}{f(K_i^-)}}.$$
   Rank by decreasing $f(K_i)$ (Step 7); competition ranking for ties.
7. **Equivalence with SAW (our derivation).** Write $a = S_{aai}$, $b = S_{ai}$; both are the same for every alternative. Then $K_i^- = S_i/a$, $K_i^+ = S_i/b$, so
   - $f(K_i^-) = \dfrac{1/b}{1/a + 1/b} = \dfrac{a}{a+b}$ and $f(K_i^+) = \dfrac{b}{a+b}$: **constants**, the same in every row (the paper's Table 5 prints 0.320 / 0.680 in all 23 rows; F2 prints 0.27 / 0.73 in all 6);
   - $\dfrac{1-f(K^+)}{f(K^+)} = \dfrac{a}{b}$, $\dfrac{1-f(K^-)}{f(K^-)} = \dfrac{b}{a}$;
   - $f(K_i) = \dfrac{S_i(1/a + 1/b)}{1 + a/b + b/a} = c \cdot S_i$ with $c = \dfrac{a+b}{a^2+ab+b^2}$, and with $b = \sum w = 1$: $c = \dfrac{1+a}{1+a+a^2}$.

   Since $c > 0$ is one number for the whole table and $S_i$ is the SAW `linearMax` score (step 3), **f(K) is the SAW (Linear) score times a constant**: same ranking, same ratios between alternatives, same ties. Checked: F1 c = 0.869505, max |f(K) − c·S| = 2.2e-16; F2 c = 0.909803, 5.6e-17; 2000 random problems (m 2–8, n 2–7, mixed types, Dirichlet weights): max relative spread of f(K)/S_SAW 5.8e-16, ranking differences 0/2000. **Against the project's own code** (`saw.compute(problem, w, { normalization: 'linearMax' })` run through node on F1, F2 and 300 random problems): max |n_MARCOS − `linearMaxNormalize`| = 0, max |f(K) − c·S_saw.ts| = 3.3e-16, rankings identical 302/302, and saw.ts reproduces the published ranks of both fixtures. The *Logistics* paper's own comparison agrees: "MARCOS, SAW, and ARAS are consistent and are in complete correlation SCC = 1.000" (p. 11). A short search found no published derivation of this identity; it is ours.

   **Consequences:** f(K) ∈ (0, c] and f(K) ≤ c < 1; the best alternative's f(K) is c only if it is best in every column. The identity holds for any AI/AAI rows (K± are always S divided by two constants), so MARCOS with *any* normalization is a weighted sum with that normalization; with user-defined AI it becomes SAW with reweighted criteria (see Decision 2).

**Variants found (and what we do):**
- **Crisp MARCOS, data-derived AI/AAI** (Stević & Brković 2020; Madenoğlu 2020; pyDecision; RMCDA): implemented.
- **User-defined AI/AAI:** the 29.09 draft said the origin allows it; that cannot be checked (CIE not opened) and the *Logistics* restatement defines AI/AAI only from the data (Eqs. 2–3). Not offered (Decision 2).
- **Other normalizations** inside MARCOS (mentioned by Do Duc Trung 2022 and Tran Van Dua 2024 citing "the ability to combine with various data normalization methods", snippets only): not offered; by step 7 each is just a weighted sum with that normalization.
- **Fuzzy, grey, rough, intuitionistic, Pythagorean MARCOS:** other data types, out of scope.
- **pyDecision `marcos_method`** (GitHub master source, PyPI 5.1.8): same formulas, identical to ours on F1 and F2 (diff 0). No positivity check (from reading the code).
- **RMCDA `apply.MARCOS`** (R, CRAN, source on rdrr.io, read): same formulas, data-derived AI/AAI only; its variable names swap the meaning of f(K⁺)/f(K⁻) but the final f(K) is the same.

## Commonly combined with
- **Weights:** FUCOM (F1, read), AHP (F2, read), CRITIC (most frequent per Demir et al. 2024, snippet; e.g. "CRITIC Temelli MARCOS Yöntemi ile …", DergiPark article-file 1854435, title and method section snippet only), BWM, Entropy (El-Araby, Sabry & El-Assal 2024, DOI [10.31181/dma21202435](https://doi.org/10.31181/dma21202435), snippet), IDOCRIW, MEREC (DergiPark titles only).
- **Compared with:** SAW, ARAS, WASPAS, EDAS, CoCoSo, MABAC, TOPSIS (Stević & Brković 2020, Figure 3, Table 6: SAW and ARAS 1.000, WASPAS 0.999, EDAS 0.968, MABAC 0.919, CoCoSo 0.909, TOPSIS 0.875).
- **Relation to SAW:** identical ranking to SAW `linearMax` (step 7). The only extra information MARCOS shows is the two reference totals S_aai and S_ai.

## Pitfalls
- **Not an independent method next to SAW (Linear).** Same order always; in a consensus / Compare view it must not count as a second vote that agrees with SAW (Decision 4).
- **Zero or negative values:** blocked with `non-positive-value` (`requires.positiveValues`), as SAW, WASPAS and COPRAS. Mathematically: a zero in a **cost** column makes AI = 0 and every normalized value of that column 0/x or 0/0 (ours: f(K) = NaN for all rows); a zero in a **benefit** column is computable (n = 0) unless the whole column is 0; a negative value gives negative normalized values (benefit x = −1 → n = −0.5) and meaningless K. The paper's own workaround, 0.001 for "no damage" (p. 7), is a modelling choice: in F1, replacing 0.001 by 0.005 / 0.01 / 0.02 moves A6's f(K) 0.5446 → 0.5597 / 0.5783 / 0.6146 (its C2 value 0.05 normalizes to ε/0.05); here no rank changes, but in general the choice of ε sets the whole column's spread. We do not substitute silently; the user enters a positive stand-in and sees it (Decision 1).
- **All alternatives equal:** S_i = S_aai = S_ai = 1, f(K) = 2/3 for every row (general: $2/(3\sum w)$); all tie at rank 1. Computable, no special case.
- **Constant column:** rank-neutral (as in SAW linearMax: every alternative gets w_j), but it changes S_aai and so c and every f(K) value (example in `marcos.out`: 0.6033, 0.4955, 0.7756 → 0.6271, 0.5457, 0.7575, order kept). The existing `constant-column` warning is enough.
- **Single alternative:** blocked by `MIN_ALTERNATIVES = 2` (it would get f(K) = 2/3).
- **Rank reversal** when alternatives are added or removed: exactly the same as SAW linearMax (column max/min change), because the order is identical on every set.
- **Weights not summing to 1:** then S_ai = Σw ≠ 1; c uses b = S_ai, the identity still holds (b enters c). Ranks are unchanged by a common weight factor. Validation requires Σw = 1 anyway.
- **Reading f(K⁻), f(K⁺) per row:** they are the same number in every row (step 7); showing them as columns suggests per-alternative information that does not exist (Decision 3).
- **Rounded chains in papers:** F1 divides by the rounded S_aai = 0.470 (exact 0.4696), so its K⁻ is off by up to 0.0015 and f(K) by up to 0.0006; F2 divides by 0.37 (exact 0.3683). Use the tolerances below.

## Reference example (test fixture)

### F1 (main): Stević & Brković (2020), FUCOM → MARCOS, 23 drivers × 5 criteria
- **Source:** Stević, Ž. & Brković, N. (2020). A Novel Integrated FUCOM-MARCOS Model for Evaluation of Human Resources in a Transport Company. *Logistics* 4(1):4, DOI 10.3390/logistics4010004 (CC BY). PDF read in full; Table 2 (extended matrix), Table 3 (normalized), Table 4 (weighted), **Table 5** (S, K⁻, K⁺, f(K⁻), f(K⁺), f(K), rank), Figure 2 (FUCOM weights, read from the page image).
- **Weight inconsistency (kept from the draft, re-checked on the image):** Figure 2 gives C4 = 0.128 and C3 = 0.096 (FUCOM order C1 > C2 > C4 > C3 > C5, Table 1), but **Table 4 applies 0.128 to C3 and 0.096 to C4** (A1: C3 0.778 × 0.128 = 0.099, C4 1.000 × 0.096 = 0.096; AI row 0.434, 0.255, 0.128, 0.096, 0.087). Table 5 follows Table 4. The fixture uses the Table 4 weights. With the Figure 2 weights 9 of 23 ranks change (A1 12 → 11, A4 7 → 6, A5 8 → 9, A9 9 → 8, A13 11 → 15, A17 21 → 20, A21 15 → 12, A22 6 → 7, A23 20 → 21). Second slip: the text under Figure 2 gives the second criterion "a value of 0.128"; the figure and Table 4 give 0.255.
- **Zero stand-in:** C2 (damage per km) uses 0.001 for "no damage" (p. 7); the fixture keeps it as printed.

```json
{
  "id": "marcos-stevic-brkovic-2020",
  "source": "Stevic & Brkovic 2020, Logistics 4(1):4, DOI 10.3390/logistics4010004, Tables 2-5, Figure 2",
  "criteria": ["fuel consumption l/100km", "damage per km", "vehicle maintenance", "information timeliness", "loyalty"],
  "types": ["cost", "cost", "benefit", "benefit", "benefit"],
  "weights": [0.434, 0.255, 0.128, 0.096, 0.087],
  "weights_note": "as applied in Table 4; FUCOM Figure 2 gives [0.434, 0.255, 0.096, 0.128, 0.087] (9 ranks differ)",
  "matrix": [
    [33.9, 0.001, 7, 9, 7], [30.0, 0.001, 9, 7, 7], [31.5, 0.001, 9, 7, 9], [33.0, 0.001, 7, 9, 9],
    [31.9, 0.001, 9, 7, 7], [31.1, 0.050, 7, 7, 9], [34.8, 0.001, 7, 7, 7], [25.8, 0.001, 7, 7, 7],
    [31.7, 0.001, 7, 7, 9], [35.7, 0.001, 7, 7, 7], [34.2, 0.001, 7, 7, 9], [29.6, 0.100, 7, 7, 7],
    [30.2, 0.001, 9, 5, 5], [34.3, 0.001, 7, 7, 9], [31.0, 0.001, 5, 7, 7], [34.5, 0.001, 7, 7, 7],
    [33.9, 0.001, 5, 7, 7], [33.1, 0.001, 9, 9, 9], [32.7, 0.001, 9, 9, 9], [35.0, 0.001, 9, 9, 7],
    [31.8, 0.001, 5, 7, 9], [31.0, 0.001, 9, 7, 7], [32.5, 0.001, 7, 7, 3]
  ],
  "published": {
    "S_aai": 0.470, "S_ai": 1.000,
    "S": [0.849, 0.898, 0.900, 0.877, 0.876, 0.626, 0.819, 0.931, 0.869, 0.811, 0.844, 0.623, 0.856, 0.843, 0.830, 0.822, 0.799, 0.904, 0.908, 0.867, 0.840, 0.887, 0.803],
    "K_minus": [1.807, 1.913, 1.917, 1.868, 1.866, 1.333, 1.744, 1.983, 1.852, 1.726, 1.797, 1.326, 1.823, 1.795, 1.767, 1.750, 1.701, 1.926, 1.935, 1.846, 1.789, 1.888, 1.710],
    "fK_minus": 0.320, "fK_plus": 0.680,
    "fK": [0.738, 0.781, 0.783, 0.763, 0.762, 0.544, 0.712, 0.809, 0.756, 0.705, 0.734, 0.541, 0.744, 0.733, 0.722, 0.714, 0.695, 0.786, 0.790, 0.754, 0.730, 0.771, 0.698],
    "ranking": [12, 5, 4, 7, 8, 22, 18, 1, 9, 19, 13, 23, 11, 14, 16, 17, 21, 3, 2, 10, 15, 6, 20]
  },
  "expected": {
    "S_aai": 0.469642, "S_ai": 1.0, "c": 0.869505,
    "fK_minus": 0.319562, "fK_plus": 0.680438,
    "S": [0.848523, 0.898573, 0.900133, 0.876865, 0.876343, 0.626361, 0.818648, 0.930889, 0.869446, 0.810536, 0.843626, 0.622723, 0.855435, 0.842671, 0.829644, 0.821445, 0.798745, 0.904284, 0.908422, 0.866587, 0.839891, 0.886533, 0.802751],
    "fK": [0.737795, 0.781314, 0.782670, 0.762438, 0.761984, 0.544624, 0.711818, 0.809413, 0.755988, 0.704765, 0.733537, 0.541461, 0.743805, 0.732707, 0.721380, 0.714251, 0.694513, 0.786280, 0.789878, 0.753501, 0.730289, 0.770845, 0.697996],
    "ranking": [12, 5, 4, 7, 8, 22, 18, 1, 9, 19, 13, 23, 11, 14, 16, 17, 21, 3, 2, 10, 15, 6, 20],
    "tolerance_vs_published": { "S": 1e-3, "K_minus": 2e-3, "fK": 1e-3 }
  }
}
```
- **Recomputed:** S MATCH (max diff 0.00057), K⁻ MATCH (0.0015, from the rounded divisor 0.470), f(K) MATCH (0.00062; A1 by hand from the paper's chain 2.656 / 3.596 = 0.7386), AAI row vs Table 3 (0.00044) and Table 4 (0.00067) MATCH; ranking **MATCH 23/23**. f(K⁻) and f(K⁺) identical in all rows (spread 5.6e-17). pyDecision: identical (diff 0). Project `saw.ts` linearMax: same ranking 23/23, f(K) = 0.869505 · S_saw.

### F2 (secondary, Turkish): Madenoğlu (2020), AHP → MARCOS, 6 suppliers × 16 criteria
- **Source:** Madenoğlu, F. S. (2020). Dengeli Puan Kart-AHP-MARCOS Yöntemlerine Dayalı Tedarikçi Seçimi. *Economics Business and Organization Research* 2(2):99–120 (open access, PDF https://dergipark.org.tr/tr/download/article-file/1432780 ; no DOI printed). Full text read: Table 2 (criteria), **Table 3** (AHP sub-criterion weights, sum 1.000), **Table 4** (extended matrix, geometric mean of three decision makers), Table 5 (normalized), Table 6 (weighted), **Table 7** (S, K⁻, K⁺, f(K⁻), f(K⁺), f(K), rank). Everything printed to 2 d.p.
- **Criterion types:** not printed as such; read from Table 4, where the AAI row is the column maximum and the AI row the column minimum for F2 (transport cost per product), M2 (response time) and İ3 (delivery time): cost. All others benefit. Our AAI and AI rows reproduce Table 4 exactly (diff 0).
- **Minor:** the text says "Eşitlik 4'deki normalizasyon" (the cost formula) for the whole of Table 5; Table 5 uses Eqs. 4 and 5. S_aai printed 0.37 (exact 0.3683) and used rounded in the chain, so A3's f(K) prints 0.82 (ours 0.8150).

```json
{
  "id": "marcos-madenoglu-2020",
  "source": "Madenoglu 2020, Economics Business and Organization Research 2(2):99-120, Tables 3, 4, 7 (DergiPark article-file 1432780)",
  "alternatives": ["A1", "A2", "A3", "A4", "A5", "A6"],
  "criteria": ["F1 price stability", "F2 transport cost per product", "F3 financial reliability", "F4 cost-reduction activities",
               "M1 customer satisfaction", "M2 response time", "M3 reputation", "M4 customer growth",
               "I1 quality", "I2 production flexibility", "I3 delivery time", "I4 capacity",
               "Y1 openness to innovation", "Y2 employee satisfaction", "Y3 competitiveness", "Y4 information sharing"],
  "types": ["benefit", "cost", "benefit", "benefit", "benefit", "cost", "benefit", "benefit",
            "benefit", "benefit", "cost", "benefit", "benefit", "benefit", "benefit", "benefit"],
  "weights": [0.153, 0.022, 0.103, 0.048, 0.013, 0.015, 0.033, 0.007, 0.128, 0.046, 0.175, 0.095, 0.058, 0.024, 0.071, 0.009],
  "matrix": [
    [5.00, 4.72, 7.00, 7.40, 1.91, 3.98, 3.98, 5.24, 6.08, 4.33, 5.74, 7.61, 1.91, 3.98, 7.00, 8.28],
    [1.71, 4.72, 3.56, 1.71, 4.22, 4.22, 4.22, 4.22, 1.71, 3.56, 3.98, 5.00, 1.91, 2.47, 3.00, 2.08],
    [5.59, 5.59, 6.26, 5.00, 6.80, 3.98, 6.80, 7.00, 9.00, 8.28, 2.92, 7.61, 7.40, 7.61, 6.08, 8.28],
    [5.74, 3.00, 5.74, 6.24, 6.80, 3.56, 6.80, 7.40, 7.61, 7.40, 3.66, 9.00, 6.80, 6.24, 7.61, 7.40],
    [7.00, 5.74, 6.26, 6.26, 8.28, 6.24, 7.61, 6.80, 3.27, 3.27, 4.33, 3.66, 2.92, 3.66, 4.33, 3.66],
    [4.22, 5.59, 6.80, 4.22, 2.92, 3.56, 4.72, 4.22, 5.00, 5.59, 4.22, 5.59, 4.72, 5.13, 5.59, 6.80]
  ],
  "published": {
    "S_aai": 0.37, "S_ai": 1.00,
    "S": [0.69, 0.43, 0.90, 0.87, 0.66, 0.67],
    "K_minus": [1.89, 1.18, 2.43, 2.36, 1.79, 1.82],
    "fK_minus": 0.27, "fK_plus": 0.73,
    "fK": [0.63, 0.40, 0.82, 0.79, 0.60, 0.61],
    "ranking": [3, 6, 1, 2, 5, 4]
  },
  "expected": {
    "S_aai": 0.368311, "S_ai": 1.0, "c": 0.909803,
    "fK_minus": 0.269172, "fK_plus": 0.730828,
    "S": [0.694610, 0.434683, 0.895788, 0.870539, 0.658331, 0.670499],
    "K_minus": [1.885935, 1.180206, 2.432152, 2.363600, 1.787435, 1.820471],
    "fK": [0.631958, 0.395476, 0.814991, 0.792019, 0.598952, 0.610022],
    "ranking": [3, 6, 1, 2, 5, 4],
    "tolerance_vs_published": 6e-3
  }
}
```
- **Recomputed:** AAI/AI rows MATCH (0), normalized matrix vs Table 5 MATCH at 2 d.p. (0.0056), S MATCH (0.0047), K⁻ MATCH (0.0041), f(K) MATCH (0.0050, A3; chained rounding above), ranking **MATCH 6/6**; f(K⁻) = 0.2692 and f(K⁺) = 0.7308 in every row (printed 0.27 / 0.73). pyDecision identical (diff 0). Project `saw.ts`: same ranking, f(K) = 0.909803 · S_saw. This fixture is independent of F1 (other author, other weighting method, three cost criteria among 16).

### Libraries (divergence only, never a reference)
- **pyDecision `marcos_method(dataset, weights, criterion_type, graph, verbose)`** (`pyDecision/algorithm/marcos.py`, GitHub master, run from source with matplotlib stubbed): returns f(K) only; identical on F1/F2. No positivity check.
- **RMCDA `apply.MARCOS(mat, weights, beneficial.vector)`** (R): same formulas (source read, not run).

## Implementation notes
- `src/core/methods/marcos.ts`, `export const marcos: RankingMethod = { id: 'marcos', kind: 'ranking', requires: { positiveValues: true }, compute }`; no `params`. Register in `registry.ts` `ranking` list and export from `core/index.ts`.
- Validation exactly as `saw.ts`: `validateProblem` → (if no structural error) `validateRequirements(problem, marcos)` → `validateWeights` → `assertValid`.
- **Reuse:** normalization is `linearMaxNormalize(problem)` from `src/core/math.ts` (the helper SAW `linearMax` and WASPAS already share); `S` is then the same vector `saw.compute(problem, weights, { normalization: 'linearMax' }).scores` returns. Compute $S_{ai} = \sum_j w_j$, $S_{aai} = \sum_j w_j \cdot \min_j / \max_j$ (one formula for both types: for a cost column AI/AAI = min/max as well), then K⁻, K⁺, f(K⁻), f(K⁺), f(K) by Eqs. 7–12 literally (keep the paper's formulas, so the step view matches papers) and assert in tests that f(K) = c · S.
- Return `scores: fK`, `order: 'desc'`, `ranking: rankScores(fK, 'desc')`. Steps (i18n keys): `marcos.normalized` (matrix, = SAW linear), `marcos.weighted` (matrix), `marcos.sAai` and `marcos.sAi` (scalars), `marcos.s` (vector), `marcos.kMinus`, `marcos.kPlus` (vectors), `marcos.fKMinus`, `marcos.fKPlus` (scalars, see Decision 3), `marcos.utility` (vector). Diagnostics: `{ sAai, sAi, c }`.
- Warnings: none beyond `constant-column`. The SAW equivalence is shown as a fixed note on the method page and in Compare, not as a warning (Decision 4).
- Tests (Vitest): F1 f(K)/S/K⁻ vs published (tolerances in JSON) and vs `expected` (1e-6), ranks 23/23; F1 with Figure-2 weights gives the 9 moved ranks (documents the paper's inconsistency); F2 vs published (6e-3) and `expected` (1e-6), ranks; property tests: f(K) = c · `saw` linearMax scores (1e-12) and identical rankings on random problems, f(K⁻), f(K⁺) constant, Σw = 1 ⇒ S_ai = 1; all-equal ⇒ f(K) = 2/3 and all rank 1; constant column keeps the ranking; validation: zero/negative cell → `non-positive-value`, m = 1 → `too-few-alternatives`.

## Decisions for Fatih
1. **Zero / negative values:** block with `non-positive-value`, no shift and no automatic 0.001 substitution (recommended: the same rule as SAW, WASPAS and COPRAS; the user can type a positive stand-in such as 0.001 and sees it in the table). Alternative: allow zeros in benefit columns only (computable, but breaks the uniform rule).
2. **User-defined AI/AAI:** not supported (recommended). Reason: a user AI only rescales each column, so MARCOS becomes SAW with hidden weights $w_j \cdot \max_j/AI_j$ (benefit) or $w_j \cdot AI_j/\min_j$ (cost), which changed the order in 634/2000 random cases; a user AAI changes only the constant c, never the order. If a user wants a different emphasis, the weights are the honest place for it. The *Logistics* restatement defines AI/AAI from the data only; pyDecision and RMCDA have no such input.
3. **What the result table shows:** f(K) as the score column; S, K⁻, K⁺ in the steps; f(K⁻) and f(K⁺) shown once as two numbers ("same for every alternative"), not as per-row columns (recommended), or as columns like the papers' tables.
4. **SAW equivalence on the site:** fixed one-line note on the MARCOS page with the scatter (all dots on one line, f(K) = c · S), and in Compare a "same order as SAW (Linear)" badge plus non-crossing connectors when both are selected; MARCOS is not counted as an extra agreeing vote next to SAW `linearMax` in any agreement summary (recommended). The claim is shown only for SAW's `linearMax` option, never for `sum`.
5. **Fixtures:** F1 *Logistics* (Table 4 weights, weight inconsistency documented) as main and F2 Madenoğlu (2 d.p., Turkish, AHP, three cost criteria) as second (recommended).

## Sources
- Stević, Ž. & Brković, N. (2020). *Logistics* 4(1):4, DOI 10.3390/logistics4010004, PDF https://mdpi-res.com/d_attachment/logistics/logistics-04-00004/article_deploy/logistics-04-00004.pdf , read in full (Eqs. 1–12 and Figure 2 from page images; Tables 1–6, Figure 3).
- Madenoğlu, F. S. (2020). *Economics Business and Organization Research* 2(2):99–120, https://dergipark.org.tr/tr/download/article-file/1432780 , read in full (Eqs. 1–12, Tables 2–7).
- Stević, Ž., Pamučar, D., Puška, A. & Chatterjee, P. (2020). *Computers & Industrial Engineering* 140:106231, DOI 10.1016/j.cie.2019.106231: **not opened** (paywall; OpenAlex `is_oa: false`, no repository copy); abstract and highlights read via a search result. Cited-by from Crossref and OpenAlex APIs (2026-10-18).
- Demir, G. et al. (2024), DMAME, DOI 10.31181/dmame7220241137; El-Araby, A., Sabry, I. & El-Assal, A. (2024), DOI 10.31181/dma21202435; Do Duc Trung (2022), *Manufacturing Review* (mfreview210046); Tran Van Dua (2024), ETASR, DOI 10.48084/etasr.7992; Özdağoğlu, Ulutaş & Keleş (2020), EBOR (DergiPark 848976): **search snippets only**.
- Code read 2026-10-18: pyDecision `pyDecision/algorithm/marcos.py` (github.com/Valdecy/pyDecision, master; PyPI latest 5.1.8); RMCDA `R/MARCOS.R` (rdrr.io); this repo `src/core/methods/saw.ts`, `src/core/math.ts` (`linearMaxNormalize`), `src/core/validate.ts`.
- Recompute: `docs/research/scripts/marcos.py` (numpy 2.5.4), output `docs/research/scripts/marcos.out`. The project-code check runs `saw.ts` through node with a small resolve hook (`saw_run.mjs` + `register.mjs`, kept in the scratchpad, not in the repo); without it the script skips that section.

## Changes on re-verification (2026-10-18)
- Origin line now says plainly that the CIE paper is paywalled and not opened, and that no open copy exists (OpenAlex, web search). The draft's claim that the origin allows user-defined AI/AAI is marked unverified.
- **Formulas re-read from the page images** of *Logistics* (Eqs. 1–12); identical to the draft.
- **SAW equivalence made exact:** closed form f(K) = c · S with c = (a + b)/(a² + ab + b²), checked against the paper's constants, 2000 random cases and the project's own `saw.ts` (302 problems, diff ≤ 3.3e-16). The draft said "SAW with linear max/min normalization"; precisely it is SAW `linearMax` (`linearMaxNormalize`), not min-max.
- **New second fixture** F2 Madenoğlu 2020 (Turkish, AHP, 6 × 16): ranks 6/6 MATCH, values at 2 d.p.
- F1 re-run: unchanged MATCH; weight inconsistency confirmed on the Figure 2 image, full list of the 9 rank changes with Figure-2 weights (draft named two), second text slip (0.128 for C2) added; ε sensitivity of the 0.001 stand-in quantified.
- Site copy rewritten (one sentence each, "siz"), equivalence sentence EN/TR, two visual proposals, UI labels; Inputs: no parameters; Pitfalls: zero/negative policy aligned with SAW/WASPAS/COPRAS, all-equal (2/3), single alternative, constant column; Decisions section added.
- Not verified: CIE origin text; Demir et al. 2024 counts and the other snippet-only pairings; RMCDA not run.
