# Simple Additive Weighting / Weighted Sum Model (SAW / WSM)

**Re-verified 2026-10-06** against primary sources (full texts of Podvezko 2011, Keshavarz Ghorabaee et al. 2015, Zavadskas et al. 2012, Vujičić et al. 2017; Crossref metadata for the origin papers). Main fixture and three secondary fixtures recomputed independently (numpy). See "Changes on re-verification" at the end.

- **Family:** ranking (compensatory / utility — additive value model)
- **Origin:** Classical. First use is credited to Churchman, C.W. & Ackoff, R.L. (1954). An Approximate Measure of Value. *Journal of the Operations Research Society of America* 2(2), 172–187, DOI [10.1287/opre.2.2.172](https://doi.org/10.1287/opre.2.2.172) (Crossref metadata verified; paper not read; the attribution is stated in Vujičić et al. 2017, Sec. 2.2, which was read). Textbook statement: Hwang, C.-L. & Yoon, K. (1981), *Multiple Attribute Decision Making*, Springer LNEMS 186, DOI [10.1007/978-3-642-48318-9](https://doi.org/10.1007/978-3-642-48318-9) (Crossref metadata; book not read; cited by Podvezko 2011). MacCrimmon (1968, RAND RM-4823-ARPA): **not verified** — not found in Crossref or OpenAlex, no DOI, rand.org page returned an error; dropped from the origin line. Formulas and the main example are taken from Podvezko (2011), DOI [10.5755/j01.ee.22.2.310](https://doi.org/10.5755/j01.ee.22.2.310), Eqs. 1–7.
- **Popularity:** Podvezko (2011, p. 135): "SAW (Simple Additive Weighting) is the oldest, most widely known and practically used method"; Vujičić et al. (2017, Sec. 2.2): "also known as the weighted linear combination or scoring methods, is the oldest, one of the simplest, most natural and most widely used". Zavadskas et al. (2012): WSM "is one of the best known and often applied" MCDM methods. Crossref cited-by (2026-10-06): Hwang & Yoon 1981 7,033; Podvezko 2011 249; Churchman & Ackoff 1954 223. No single origin paper, so no meaningful citation count for the method itself.

## For users (site copy)
- **EN:** SAW rescales every criterion so that the best value gets 1, multiplies each value by the criterion weight and adds the results. Every point of the final score can be traced back to one criterion. Pick it when a weak value on one criterion may be made up for by a strong value on another.
- **TR:** SAW her kriteri en iyi değer 1 olacak şekilde ölçekler, her değeri kriter ağırlığıyla çarpar ve sonuçları toplar. Nihai skordaki her puan bir kritere kadar izlenebilir. Bir kriterdeki zayıf değerin başka bir kriterdeki güçlü değerle telafi edilebileceği durumlarda seçin.

**When to use / combined with (site bullets, each backed by sources read in full):**
- **EN:** Use it when all values are positive measurements (prices, rates, counts) and you want a score anyone can recompute by hand. *(Podvezko 2011, Eqs. 1–3 and p. 135: "all criteria values should be positive", DOI 10.5755/j01.ee.22.2.310; Vujičić et al. 2017, Sec. 2.2, DOI 10.5937/tehnika1703422V)*
  **TR:** Tüm değerler pozitif ölçümlerse (fiyat, oran, adet) ve herkesin elle yeniden hesaplayabileceği bir skor istiyorsanız kullanın.
- **EN:** SAW only ranks; the weights come from you or from a weighting method. Published studies use it with expert weights, Entropy and CRITIC. *(Podvezko 2011, Table 2: weights from Finance Ministry experts; Vujičić et al. 2017, Tables 8a–8b: Entropy and CRITIC)*
  **TR:** SAW yalnız sıralar; ağırlıkları siz girersiniz ya da bir ağırlıklandırma yöntemi üretir. Yayımlanmış çalışmalarda uzman ağırlıkları, Entropi ve CRITIC ile birlikte kullanılır.
- **EN:** It is the usual yardstick when a new ranking method is tested, and a building block of WASPAS and COPRAS. *(Keshavarz Ghorabaee et al. 2015, Table 7, DOI 10.15388/Informatica.2015.57; Zavadskas et al. 2012, Eq. 6 with λ = 1, DOI 10.5755/j01.eee.122.6.1810; Podvezko 2011, p. 137: COPRAS equals SAW when all criteria are benefit)*
  **TR:** Yeni bir sıralama yöntemi denenirken çoğu zaman karşılaştırma ölçütü olarak kullanılır; WASPAS ve COPRAS'ın da yapı taşıdır.
- **EN:** Be careful: a very good value on a heavily weighted criterion can hide weak values elsewhere, and another normalization can swap alternatives that score close to each other. *(Podvezko 2011, p. 136–137, SAW disadvantage 3; Vujičić et al. 2017, Tables 8a–8b: SAW ranks change across normalization variants)*
  **TR:** Dikkat: ağırlığı yüksek bir kriterdeki çok iyi bir değer diğer kriterlerdeki zayıflığı gizleyebilir; başka bir normalizasyon da skorları birbirine yakın alternatiflerin yerini değiştirebilir.

**UI labels for the option:** EN "Linear (x / max)" (default) / "Sum"; TR "Doğrusal (x / maks)" (varsayılan) / "Toplam"; parameter values `linearMax` / `sum`. Min-maks is not offered (see Variants).

## When to use / when not
- **Use when:** values are positive and on ratio scales; you want a transparent baseline or a sanity check next to TOPSIS/VIKOR/EDAS; the decision maker accepts full compensation between criteria.
- **Do not use when:** a very poor value on one criterion must not be offset by others (SAW is fully compensatory; Podvezko 2011, p. 136: "the alternative may be assessed as the best, though the values of its other criteria are relatively small"); data contain zeros or negatives (blocked, see Pitfalls); interval-scale data where the zero point is arbitrary (x/max is not invariant to adding a constant, e.g. °C vs K give different scores).

## Inputs
- Decision matrix X (m × n), m ≥ 2, **all x_ij > 0** (blocking error otherwise; no shifting — Fatih, 06.10).
- Criterion types `benefit|cost`; weights w from the weighting step (sum to 1).
- Parameter `normalization` ∈ {`linear-max` (default), `sum`} (Fatih, 06.10). Min-maks is not offered.

## Algorithm
**Variant `linear-max` (default)** — Podvezko 2011 Eqs. 2–3 + 1; Zavadskas et al. 2012 Eqs. 1–3; Vujičić et al. 2017 "Variant 4 (Stopp)", Eqs. 5–6:
1. Normalize: benefit $r_{ij} = \dfrac{x_{ij}}{\max_i x_{ij}}$; cost $r_{ij} = \dfrac{\min_i x_{ij}}{x_{ij}}$. Then $0 < r_{ij} \le 1$ and the best value of every criterion gets 1.
2. Score $S_i = \sum_{j} w_j\, r_{ij}$, so $0 < S_i \le 1$ (Podvezko p. 136).
3. Rank by decreasing $S_i$ (competition ranking for ties, see Pitfalls).

**Variant `sum`** — Podvezko 2011 Eq. 6 ("classical" normalization), with cost criteria first converted by Eq. 2. The text is explicit (p. 137): "The values of the minimizing 4th criterion were preliminarily transformed by formula (2) (row 4, Table 2)", and for benefit criteria the result "do[es] not depend on the fact whether they were preliminarily transformed by formula (3) or not".
1. benefit $r_{ij} = \dfrac{x_{ij}}{\sum_{k} x_{kj}}$; cost $r_{ij} = \dfrac{\min_k x_{kj} / x_{ij}}{\sum_{k} \min_l x_{lj} / x_{kj}} = \dfrac{1/x_{ij}}{\sum_{k} 1/x_{kj}}$ (the constant $\min x$ cancels, so min/x-then-sum equals reciprocal-then-sum; verified numerically on Podvezko Table 5, identical).
2. $S_i = \sum_j w_j r_{ij}$; with $\sum_j w_j = 1$, $\sum_i S_i = 1$ (Podvezko Eq. 7).
3. Rank by decreasing $S_i$.

**Optional display:** relative score $\tilde S_i = S_i / \sum_k S_k$ (Podvezko Eq. 5, Table 4) for `linear-max`; for `sum` it equals $S_i$.

**Variants not offered:**
- **Min-maks** ($(x-\min)/(\max-\min)$, cost $(\max-x)/(\max-\min)$; Vujičić et al. 2017 "Variant 3 (Weitendorf)", Eqs. 3–4): no published SAW example we reproduce uses it (EDAS Table 7: 0/7 rank sets reproduced, see Recomputed); it gives 0 to the worst alternative on every criterion and 0/0 on a constant column. Fatih, 06.10: not offered.
- **Körth** (cost $1 - x/\max x$, Vujičić Variant 5), **Peldschus** (squared ratios, Variant 6), **vector** (Variant 1): not offered.
- **Shift for negatives** (Podvezko Eq. 4, $\bar r_{ij} = r_{ij} + |\min_j r_{ij}| + 1$, citing Ginevičius & Podvezko 2007a): not offered — x/max is not shift-invariant, so the result depends on an arbitrary constant (e.g. [1, 4, 7] → 0.143, 0.571, 1; the same column +3 → 0.4, 0.7, 1). Podvezko himself notes S "depend[s] on the type of their transformation to positive values" (p. 137).

## Commonly combined with
- **Weights:** expert weights (Podvezko 2011, Table 2; Finance Ministry experts); Entropy and CRITIC (Vujičić et al. 2017, DOI [10.5937/tehnika1703422V](https://doi.org/10.5937/tehnika1703422V), Tables 4, 6, 8a–8b, read); Entropy × CILOS → IDOCRIW with SAW among the ranking methods (Zavadskas et al. 2017, DOI 10.3390/su9050702; read in the Entropy pass, not re-read today).
- **Other ranking methods:** SAW is WASPAS with λ = 1 (Zavadskas et al. 2012, Eq. 6: "when λ = 1, WASPAS is transformed to WSM"); COPRAS's benefit part $S_{+j}$ equals SAW with sum normalization, and COPRAS = SAW when all criteria are benefit (Podvezko 2011, p. 137–138); MOORA run side by side (Vujičić et al. 2017).
- **Baseline for new methods:** EDAS (Keshavarz Ghorabaee et al. 2015, Table 7, with VIKOR, TOPSIS, COPRAS); MABAC (Pamučar & Ćirović 2015, abstract only, not re-checked).

## Pitfalls
- **Zero in a cost criterion:** min/x divides by zero; if the column minimum is 0, every other alternative gets 0 and the zero itself 0/0. **Zero in a benefit criterion** is computable in `linear-max` (r = 0) but is blocked too: Fatih's rule (06.10) is "non-positive value = blocking error", and Podvezko (p. 135) requires all values positive. Use `requires.positiveValues` → `non-positive-value` error in `src/core/validate.ts`.
- **Negative values:** same error, no shift (see Variants). The error message should say why (ratios of negative numbers flip meaning).
- **Constant column:** `linear-max` gives r = 1 for everyone; `sum` gives 1/m. Either way the column adds the same amount to every S and cannot change the ranking (it does raise all S in `linear-max`). No special case; the existing `constant-column` warning is enough.
- **Single alternative:** every r = 1 (`linear-max`) or 1 (`sum`), S = Σw = 1; ranking is trivial. Blocked by `MIN_ALTERNATIVES = 2` (`too-few-alternatives`).
- **Ties:** equal S get the same rank via `rankScores` (competition ranking, relative tolerance 1e-12). Near ties are common: in the EDAS 10 × 7 example the smallest gap between consecutive linear-max scores is 0.0007–0.0008 in sets 1, 2 and 6, and the `sum` variant has gaps of 0.0001–0.0003 exactly where its ranks differ from the published ones. Show S to 4 decimals so users can see how close they are.
- **Full compensation:** see "Do not use when".
- **Normalization changes ranks:** on the EDAS example `sum` differs from the published SAW ranks in 3 of 7 weight sets (`linear-max` 7/7); Vujičić et al. (2017) Tables 8a–8b show different SAW rankings across six normalization variants (best alternative A7 stable).
- **Rank reversal** when alternatives are added or removed: both variants depend on the column max/min/sum of the current set. Not quantified here.
- **MARCOS** with data-derived ideal points gives the same ordering as `linear-max` SAW (claim from `marcos.md`, 29.09; not re-checked).

## Reference example (test fixture)
- **Source:** Podvezko, V. (2011). The Comparative Analysis of MCDA Methods SAW and COPRAS. *Inžinerinė ekonomika – Engineering Economics* 22(2):134–146. DOI 10.5755/j01.ee.22.2.310 (Crossref verified; no update/correction notice). Open-access PDF read in full. **Table 1** (input, 4 countries × 5 criteria; data from Ginevičius et al. 2006), **Table 2** (linear-max values and weights), **Table 3** (SAW S), **Table 4** (relative S), **Table 5** (sum-normalized values), **Table 6** (SAW S, sum variant).
- **Typo in Table 2 (confirmed against the PDF page image):** Lithuania, "Average annual salary" is printed **0.599**; from Table 1, 306/501 = **0.611**. Table 3's S(Lithuania) = 0.872 follows from the printed 0.599 (0.8724), the correct value gives 0.8744. Table 1 is right: Table 5 uses 306 (306/1535 = 0.199; with 300, which 0.599 × 501 would imply, it would be 0.196). All other 19 cells of Table 2 match to 3 d.p. The fixture keeps both the published and the corrected values.
- **Caption error in Table 6:** the caption says "normalization performed by using formulas (3) and (5)"; the text and Table 5 say formulas (6) and (2). The numbers follow (6) and (2).

```json
{
  "id": "saw-podvezko-2011",
  "source": "Podvezko 2011, Engineering Economics 22(2):134-146, DOI 10.5755/j01.ee.22.2.310, Table 1 (input), Table 2 (weights), Tables 3 and 6 (output)",
  "alternatives": ["Estonia", "Latvia", "Lithuania", "Poland"],
  "criteria": ["GDP growth %", "production growth %", "average salary EUR", "unemployment %", "export/import"],
  "types": ["benefit", "benefit", "benefit", "cost", "benefit"],
  "weights": [0.35, 0.10, 0.17, 0.25, 0.13],
  "matrix": [
    [5.1, 9.8, 430, 9.3, 0.70],
    [7.5, 6.5, 298, 10.3, 0.55],
    [9.7, 16.1, 306, 11.6, 0.73],
    [3.8, 8.4, 501, 19.3, 0.79]
  ],
  "linear_max": {
    "published_table3": { "S": [0.756, 0.728, 0.872, 0.610], "ranking": [2, 3, 1, 4], "note": "computed with the Table 2 typo 0.599 for Lithuania/salary" },
    "expected": { "S": [0.7560, 0.7283, 0.8744, 0.6098], "ranking": [2, 3, 1, 4], "tolerance": 1e-4 }
  },
  "sum": {
    "expected_normalized_table5_by_criterion": [
      [0.195, 0.287, 0.372, 0.146],
      [0.240, 0.159, 0.395, 0.206],
      [0.280, 0.194, 0.199, 0.326],
      [0.314, 0.283, 0.252, 0.151],
      [0.253, 0.199, 0.264, 0.285]
    ],
    "expected_table6": { "S": [0.251, 0.246, 0.301, 0.202], "ranking": [2, 3, 1, 4], "tolerance": 5e-4 }
  }
}
```

- **Published outputs:** Table 3 S = 0.756, 0.728, 0.872, 0.610 (Lithuania ≻ Estonia ≻ Latvia ≻ Poland); Table 4 S̃ = 0.255, 0.245, 0.295, 0.206 (ΣS = 2.966); Table 6 (sum) S = 0.251, 0.246, 0.301, 0.202, same ranking.
- **Recomputed** (re-verification 2026-10-06; independent numpy scripts `podvezko.py`, `secondary.py`, `waspas_check.py`, `vujicic_check.py`, `podvezko_t8*.py` in the session scratchpad, not in the repo; all published numbers parsed from the PDFs, EDAS and WASPAS tables parsed programmatically and compared with the JSON in `edas.md`/`waspas.md`: identical):
  - `linear-max`: S = [0.755988, 0.728343, 0.874390, 0.609754], ranking [2, 3, 1, 4]. Against Table 3: **MISMATCH, max abs diff 0.0024** (Lithuania only), fully explained by the Table 2 typo: with the printed Table 2 matrix S = [0.7560, 0.7283, 0.8724, 0.6099] → MATCH (4.5e-4). Ranking identical either way. Corrected S̃ = 0.2547, 0.2454, 0.2946, 0.2054 (Table 4 prints Poland 0.206 because it uses the typo-based ΣS = 2.966).
  - `sum`: Table 5 normalized matrix → **MATCH** (max abs diff 4.6e-4, all 20 cells); S = [0.251340, 0.246160, 0.300587, 0.201912] vs Table 6 → **MATCH** (max abs diff 4.1e-4), ranking identical.
- **Secondary 1 — Keshavarz Ghorabaee et al. (2015), Tables 5–7** (10 × 7, 3 benefit + 4 cost, 7 weight sets; JSON `edas-2015-table5-set1` in `edas.md`). The paper does not say which SAW normalization it used. `linear-max` reproduces the published SAW ranks in **7/7 sets (MATCH)**; `sum` in 4/7 (sets 1, 4, 5 differ, near ties); min-maks in 0/7. This is the evidence that SAW in the comparative literature means `linear-max`. Ranks only: the paper prints no SAW scores.
- **Secondary 2 — Zavadskas et al. (2012), Table 2, λ = 1 column (WSM)** (JSON `waspas-2012-table1` in `waspas.md`, Eqs. 2–3 = `linear-max`, matrix already normalized). With the a1-x̄5 typo fix (1.0000 → 0.1000): WSM = 0.6121, 0.8288, 0.6975, 0.8516 vs 0.6120, 0.8292, 0.6972, 0.8520 → **MATCH** (max abs diff 4.3e-4); all 44 Table 2 values match (4.4e-4). As printed: MISMATCH (λ = 1: 0.056, row a1 only). Weights sum to 1.0001 as printed; used as printed (renormalizing gives 5.1e-4, still within tolerance).
- **Secondary 3 (new) — Vujičić et al. (2017), Tables 8a–8b, "Variant 4" (= `linear-max`)**, Table 2 input (matrix in `entropy.md`, `entropy-vujicic2017-homogeneous`), Entropy weights recomputed from the data (Table 4) and CRITIC weights as printed (Table 6: 0.263081, 0.214215, 0.154509, 0.164491, 0.203704). Ranks a1…a9: Entropy [4, 7, 2, 8, 9, 3, 1, 6, 5], CRITIC [4, 7, 2, 8, 9, 3, 1, 6, 5] → **MATCH 2/2** (also Variant 5/Körth 2/2, not offered). Ranks only.
- **Not reproducible (not a fixture):** Podvezko 2011 Table 8, SAW row (Table 7 data, sum normalization per the text): published 0.337, 0.327, 0.336 / 0.340, 0.336, 0.331; ours 0.3391, 0.3308, 0.3301 / 0.3339, 0.3356, 0.3305 (max diff 0.006). No cost conversion we tried reproduces it, and the published Variant II raises A1's score although A1 got worse on a cost criterion and nothing else changed for A1, which no monotone normalization can do. The surrounding text is also inconsistent (says the 3rd criterion changed; the table changes the 4th). Treated as an error in the paper.
- **pyDecision 5.1.1 `saw_method`:** 29.09 pass found it equal to `linear-max` (diff 0); not re-run today. pyDecision is not a reference for this project.

## Implementation notes
- Method declares `requires: { positiveValues: true }` → existing `non-positive-value` error; m ≥ 2 via `MIN_ALTERNATIVES`; ties via `rankScores(S, 'desc')`.
- Compute in float64; no epsilon guards needed once x > 0 is enforced.
- Step view returns r (normalized matrix), w·r (weighted contributions, the "traceable points"), S, rank; for `linear-max` optionally S̃.
- Tests: Podvezko `linear-max` corrected S (tol 1e-4) + published Table 3 ranks; Podvezko `sum` Table 5 matrix and Table 6 S (tol 5e-4); EDAS Table 7 SAW ranks 7/7; WASPAS Table 2 λ = 1 column (with typo fix, tol 5e-4); Vujičić Tables 8a–8b Variant 4 ranks; validation: zero cost cell, zero benefit cell, negative cell → error; constant column → warning, S unaffected in rank; m = 1 → error; tie → shared rank.

## Sources
- Podvezko, V. (2011), *Engineering Economics* 22(2):134–146, DOI 10.5755/j01.ee.22.2.310 — full PDF (inzeko.ktu.lt/index.php/EE/article/download/310/19875), Eqs. 1–7, Tables 1–8; Table 2 and Eq. 4 checked on the rendered page images.
- Keshavarz Ghorabaee, M., Zavadskas, E.K., Olfat, L. & Turskis, Z. (2015), *Informatica* 26(3):435–451, DOI 10.15388/Informatica.2015.57 — full PDF (informatica.vu.lt), Sec. 4, Tables 5–8.
- Zavadskas, E.K., Turskis, Z., Antucheviciene, J. & Zakarevicius, A. (2012), *Elektronika ir Elektrotechnika* 122(6):3–6, DOI 10.5755/j01.eee.122.6.1810 — full PDF (eejournal.ktu.lt), Eqs. 1–6, Tables 1–2; Eqs. 2–3 checked on the page image.
- Vujičić, M.D., Papić, M.Z. & Blagojević, M.D. (2017), *Tehnika* 72(3):422–429, DOI 10.5937/tehnika1703422V — full PDF (scindeks-clanci.ceon.rs), Sec. 2.2, Eqs. 1–10, 14, Tables 2, 4, 6, 8a–8b.
- Churchman & Ackoff (1954), DOI 10.1287/opre.2.2.172; Hwang & Yoon (1981), DOI 10.1007/978-3-642-48318-9 — Crossref metadata only.
- Zavadskas et al. (2017), DOI 10.3390/su9050702 — read in the Entropy pass (2026-10-05); MDPI blocked direct download today.
- `src/core/validate.ts`, `src/core/rank.ts` (read, for the edge-case mapping).

## Changes on re-verification (2026-10-06)
- Main fixture: Table 1 inputs, weights, Table 3, Tables 5–6 checked against the PDF (page images for Tables 1–3); linear-max MISMATCH 0.0024 explained by the Table 2 typo, sum variant MATCH (4.1e-4). Table 2 typo confirmed (0.599 printed, 0.611 correct; Table 5 proves 306 is right). New: Table 6 caption error; corrected S̃ noted; Table 5 normalized matrix added to the JSON for a step-level test; JSON restructured per variant, linear-max tolerance tightened to 1e-4.
- Sum variant: confirmed cost is converted by Eq. 2 (min/x) before Eq. 6 (explicit in the text); noted it equals (1/x)/Σ(1/x). Full formulas for both variants written out.
- Variants aligned with Fatih's decision (06.10): `linear-max` default, `sum` option, min-maks and Eq. 4 shift moved to "not offered" with reasons; positive values required, no shifting.
- Origin: Churchman & Ackoff corrected to *Journal of the Operations Research Society of America* 2(2):172–187 (was "Operations Research 2:172–180"), DOI added; MacCrimmon 1968 not verifiable, removed from the origin line.
- Site copy rewritten (best value = 1 instead of "0–1", since `sum` does not give 0–1 either way); four "When to use / combined with" bullets in EN + TR, each with two or more DOI'd sources read in full; UI labels for the option.
- Secondaries re-run: EDAS 7/7 (linear-max), 4/7 (sum), 0/7 (min-maks); WASPAS λ = 1 MATCH 4.3e-4. New secondary: Vujičić et al. 2017 Tables 8a–8b, 2/2.
- Pitfalls: edge cases mapped to existing validation (non-positive, constant column, m ≥ 2, competition ties); near-tie gaps quantified; Podvezko Table 8 SAW row documented as not reproducible.
- Not verified: Churchman & Ackoff 1954 and Hwang & Yoon 1981 (metadata only); MacCrimmon 1968; pyDecision not re-run; MARCOS equivalence and MABAC mention carried over from 29.09.
