# Evaluation based on Distance from Average Solution (EDAS)

**Re-verified 2026-10-13** against the primary source (full PDF of Keshavarz Ghorabaee et al. 2015, Eqs. 1–14, Tables 1–8) and two Turkish worked examples read in full (Aydın Ünal 2019; Sarıhan & Aydın 2023). All three recomputed independently (numpy, `scratchpad/mcdm/scripts/edas.py`). See "Changes on re-verification" at the end.

- **Family:** ranking (compensatory / distance — distance from the average solution)
- **Origin:** Keshavarz Ghorabaee, M., Zavadskas, E.K., Olfat, L. & Turskis, Z. (2015). Multi-Criteria Inventory Classification Using a New Method of Evaluation Based on Distance from Average Solution (EDAS). *Informatica* 26(3), 435–451. DOI [10.15388/Informatica.2015.57](https://doi.org/10.15388/Informatica.2015.57). Open-access PDF (informatica.vu.lt/journal/INFORMATICA/article/779/file/pdf) read in full; Section 2 gives the method (Steps 1–8, Eqs. 1–14), Section 3 the 47-item example, Section 4 the 10 × 7 comparison.
- **Popularity:** OpenAlex cited-by 1,366 (2026-10-13; the 29.09 draft had Crossref 1,216). A dedicated survey exists: Torkayesh, Deveci, Karagöz & Antuchevičienė (2023), *Expert Systems with Applications*, 119724, DOI 10.1016/j.eswa.2023.119724 (OpenAlex cited-by 126; metadata and abstract only, the full text was blocked). Turkish literature: EDAS has 10 of 310 method mentions in 2021 Turkish MCDM articles and "son dönemde PROMETHEE, EDAS ve ARAS'a ilgi artmış" (both in `combinations.md` §A.2).

## For users (site copy)
- **EN:** EDAS scores each alternative by how far it is above or below the average of all alternatives on each criterion, weighted by criterion importance.
- **TR:** EDAS her alternatifi, her kriterde tüm alternatiflerin ortalamasının ne kadar üstünde ya da altında olduğuna göre, kriter ağırlıklarıyla puanlar.

**When to use / combined with (site bullets, each one sentence, sources read in full unless marked):**
- **EN:** Use it when every criterion is a positive measured quantity whose average is a fair benchmark. *(our analysis, not a statement of the paper: EDAS divides by the column average, so the result depends on where zero is — recomputed shift test, see Pitfalls; the origin only says the method "is very useful when we have some conflicting criteria", Keshavarz Ghorabaee et al. 2015, Sec. 2, p. 438)*
  **TR:** Her kriter, ortalaması anlamlı bir karşılaştırma noktası olan pozitif, ölçülmüş bir büyüklükse kullanın.
- **EN:** EDAS only ranks; in published studies its weights often come from a separate method such as AHP, Entropy, CRITIC or SWARA. *(Aydın Ünal 2019 and Sarıhan & Aydın 2023: Entropy → EDAS; Bayram 2021: CRITIC → EDAS; Ecer 2017: fuzzy AHP → EDAS, abstract only; OpenAlex co-mention counts in "Commonly combined with"; the origin itself uses equal weights and seven hand-set weight sets, Sec. 3 and Table 6)*
  **TR:** EDAS yalnız sıralar; yayımlanmış çalışmalarda ağırlıklar çoğunlukla AHP, Entropi, CRITIC ya da SWARA gibi ayrı bir yöntemden gelir.
- **EN:** Be careful when one criterion varies much more than the others relative to its own average: EDAS measures distance as a share of the average, so that criterion moves the score more than its weight suggests. *(our recomputation of Keshavarz Ghorabaee et al. 2015 Table 2: with equal weights, annual dollar usage, coefficient of variation 1.41 vs 0.70 and 0.42, carries 56 % of all distance; the unit of a column does not matter)*
  **TR:** Bir kriter, kendi ortalamasına göre diğerlerinden çok daha fazla değişkenlik gösteriyorsa dikkat edin: EDAS uzaklığı ortalamanın oranı olarak ölçtüğü için o kriter skoru ağırlığının gösterdiğinden daha çok etkiler.

**UI:** no options. Step view labels: EN "Average solution", "Positive distance (PDA)", "Negative distance (NDA)", "Appraisal score"; TR "Ortalama çözüm", "Pozitif uzaklık (PDA)", "Negatif uzaklık (NDA)", "Değerlendirme skoru".

## When to use / when not
- **Use when:** values are ratio-scale measurements with a meaningful zero; many alternatives (the origin uses 47); you want a score that does not hinge on a single best or worst alternative (EDAS needs no ideal/nadir point, Sec. 2); the Turkish financial-ratio template (Entropy/CRITIC → EDAS).
- **Do not use when:** a column's average is 0 or negative (division by AV; blocked, see Pitfalls); data are interval-scale or have been shifted (z-score + constant, °C) — the result depends on where zero is (recomputed: adding 10 to one column of the Aydın Ünal example moves AS by up to 0.061); criteria differ greatly in relative dispersion and you want weights to mean what they say (see "implicit weighting"); the alternative set is about to change (rank reversal, see Pitfalls).

## Inputs
- Decision matrix X (n alternatives × m criteria in the paper's notation; `matrix[i][j]` in ours), n ≥ 2.
- Criterion types `benefit|cost` (paper: "beneficial / non-beneficial").
- Weights w, Σw = 1 (validator). AS is invariant to a common scale of w (verified: w × 7 → |ΔAS| ≤ 2e-16), so the paper's Table 2 with unweighted sums gives the same AS as w = 1/3.
- **No parameters.** The origin defines none and no later crisp variant we found adds one.
- Value domain (owner decision, see below): recommended — every column average must be > 0; zeros allowed; negatives allowed only with a notice.

## Algorithm
As stated in Keshavarz Ghorabaee et al. (2015), Sec. 2, Steps 3–8 (Steps 1–2 = choose criteria, build X):
1. Average solution (Eq. 3): $AV_j = \dfrac{1}{n}\sum_{i=1}^{n} X_{ij}$.
2. Distances from average (Eqs. 6–9):
   - benefit: $PDA_{ij} = \dfrac{\max(0,\, X_{ij} - AV_j)}{AV_j}$, $NDA_{ij} = \dfrac{\max(0,\, AV_j - X_{ij})}{AV_j}$;
   - cost: $PDA_{ij} = \dfrac{\max(0,\, AV_j - X_{ij})}{AV_j}$, $NDA_{ij} = \dfrac{\max(0,\, X_{ij} - AV_j)}{AV_j}$.
   At most one of PDA, NDA is non-zero per cell (paper, p. 441). Per column $\sum_i PDA_{ij} = \sum_i NDA_{ij}$ (deviations from a mean sum to 0; verified).
3. Weighted sums (Eqs. 10–11): $SP_i = \sum_j w_j PDA_{ij}$, $SN_i = \sum_j w_j NDA_{ij}$.
4. Normalize (Eqs. 12–13): $NSP_i = SP_i / \max_k SP_k$, $NSN_i = 1 - SN_i / \max_k SN_k$.
5. Appraisal score (Eq. 14): $AS_i = \tfrac12 (NSP_i + NSN_i)$, $0 \le AS_i \le 1$.
6. Rank by decreasing AS (Step 8).

There is no separate normalization step: dividing by $AV_j$ is the normalization (scale-invariant per column, verified: C6 × 0.001 → |ΔAS| ≤ 6e-17; **not** shift-invariant).

**Variants found (not offered):**
- Fuzzy EDAS — Keshavarz Ghorabaee, Zavadskas, Amiri & Turskis (2016), *IJCCC* 11(3), DOI 10.15837/ijccc.2016.3.2557 (PDF read: trapezoidal fuzzy numbers, distances divided by the defuzzified average κ(av_j); same structure).
- Interval-valued intuitionistic fuzzy EDAS — Kahraman et al. (2017), *JEELM*, DOI 10.3846/16486897.2017.1281139; interval grey EDAS — Stanujkić et al. (2017), *Studies in Informatics and Control* 26(1), DOI 10.24846/v26i1y201701 (metadata/abstract only).
- Application-level pre-processing seen in Turkish papers (not EDAS variants): Z-score + |min z| shift for a negative column before Entropy and EDAS (Aydın Ünal 2019, Eqs. 19–20).

**Canonical choice:** the 2015 crisp method exactly as above — it is the origin, every crisp application read (2015, 2019, 2021, 2023) uses the same Eqs. 3–14, and pyDecision implements the same formulas. Reason to avoid the fuzzy/grey variants: they need fuzzy/interval inputs the app does not collect.

## Commonly combined with
- **Entropy → EDAS:** Aydın Ünal, E. (2019). Bütünleşik Entropi ve EDAS yöntemleri kullanılarak BIST sigorta şirketlerinin performansının ölçülmesi. *Finans Ekonomi ve Sosyal Araştırmalar Dergisi* 4(4), 555–566, DOI [10.29106/fesa.649946](https://doi.org/10.29106/fesa.649946) (read, recomputed: fixture F2). Sarıhan, A.Y. & Aydın, U. (2023). Entegre Entropi-EDAS yaklaşımıyla lider Türk ihracatçılarının performans analizi. *İstanbul Ticaret Üniversitesi Sosyal Bilimler Dergisi* 22(46), 412–437, DOI [10.46928/iticusbe.1263122](https://doi.org/10.46928/iticusbe.1263122) (read, recomputed: fixture F3). Yazdani et al. (2020), DOI 10.1016/j.susoc.2020.12.002 (metadata, from `entropy.md`).
- **CRITIC → EDAS:** Bayram, E. (2021). Türkiye'deki katılım bankalarının CRITIC temelli EDAS yöntemiyle performans değerlendirmesi. *Finansal Araştırmalar ve Çalışmalar Dergisi* 13(24), 55–72, DOI [10.14784/marufacd.879171](https://doi.org/10.14784/marufacd.879171) (read; Tables 8–10 printed, input table garbled in text extraction, not recomputed).
- **Entropy × CILOS (IDOCRIW) → EDAS** with COPRAS, SAW, TOPSIS: Zavadskas et al. (2017), DOI 10.3390/su9050702 (read in the Entropy pass).
- **Fuzzy AHP → EDAS:** Ecer, F. (2017), *Technological and Economic Development of Economy*, DOI 10.3846/20294913.2016.1213207 (title/abstract only).
- **Co-mention counts (OpenAlex, upper bounds because "EDAS" is also another acronym):** AHP 223, Entropy 104, CRITIC 94, SWARA 94, BWM 67, MEREC 45 (`combinations.md` §A.3).
- **Compared side by side with** VIKOR, TOPSIS, SAW and COPRAS on one matrix and 7 weight sets (origin, Tables 5–8; Spearman r_s ≥ 0.867 with all four).

## Pitfalls
- **Column average ≤ 0:** AV = 0 divides by zero; AV < 0 flips the meaning. Recomputed on column [−4, 1, −3], AV = −2: in our d-form (d = (x − AV)/AV, PDA = max(0, d), NDA = max(0, −d)) the best alternative gets NDA 1.5 and the worst gets PDA 1; the paper's literal Eqs. 6–7 (max(0, x − AV)/AV) give negative distances instead (PDA [0, −1.5, 0], NDA [−1, 0, −0.5]). The two forms agree only when AV > 0. Either way the column is meaningless: must be a blocking error per column.
- **Negative values with AV > 0:** the formulas stay monotone, but the scale is relative to an average whose zero point matters. **Unbounded distances:** with non-negative data PDA ≤ n − 1 and NDA ≤ 1 (checked on 2,000 random matrices); once negatives are allowed AV can sit just above 0 and |x − AV|/AV has no bound, so a column with a tiny weight can decide the ranking. Recomputed: benefit X = [[−100, 5], [100.01, 6], [0, 7]], w = [0.01, 0.99]: column 1 AV = 0.0033 > 0, distances up to 30,002, AS = [0, 1, 0.5003]; without column 1 AS = [0, 0.5, 1] — the 1 %-weight column flips the winner (`scripts/edas_reconcile.py`). A shift is not neutral (Table 5 set 1: +1 on C4 changes ranks A2 4→5, A9 5→4, A4 10→9, A10 9→10; Aydın Ünal KK4 + 10: |ΔAS| up to 0.061, ranks unchanged). Do not offer shifting.
- **Constant column:** contributes nothing (PDA = NDA = 0). Float trap: the mean of [0.1, 0.1, 0.1] is 0.10000000000000002, so (x − AV)/AV = −1.4e-16 for every row instead of 0 (checked in numpy and Node). Detect constant columns and set the distances to exactly 0. An all-zero column is a constant column (AV = 0, but treat it as constant, not as an error).
- **max SP = 0 (and then max SN = 0):** happens only when every non-constant criterion has weight 0 or every column is constant; NSP and NSN are 0/0 (numpy and pyDecision return NaN). Define AS = 0.5 for all (a full tie) and warn; mirrors TOPSIS's 0.5.
- **Implicit weighting by relative dispersion:** distances are |x − AV|/AV, so a skewed column dominates. Origin Table 1 with equal weights: column shares of total PDA = 0.256 / **0.558** / 0.187 (coefficients of variation 0.70 / 1.41 / 0.42). Show weighted PDA/NDA per criterion in the step view.
- **The best AS is not always 1:** AS = 1 only if the same alternative has max SP and SN = 0 (F2: best AS = 0.832). Likewise the minimum is 0 only if one alternative has max SN and SP = 0.
- **Rank reversal:** the average moves when alternatives are added or removed. Table 5, 7 sets × 10 single removals: **17 pairwise reversals**, e.g. set 2, removing the worst alternative A4 swaps A2/A8 (0.8424/0.8481 → 0.8231/0.8180).
- **Ties / near ties:** competition ranking via `rankScores`. Smallest gap between consecutive AS in Table 5 sets: 0.0007 (set 3, A3 vs A5: 0.3122 vs 0.3129). Show AS to 4 decimals.
- **Single alternative:** AV = x, everything 0 → 0/0; blocked by `MIN_ALTERNATIVES = 2`. With n = 2 every non-constant column gives one alternative a PDA and the other an equal NDA.
- **Weight sets that do not sum to 1** (origin Table 6: sets 2 and 6 sum to 1.001, set 4 to 0.999): the validator rejects them; renormalize in tests (ranks unchanged, verified 7/7), as `saw.test.ts` already does.

## Reference example (test fixture)
**F1 — origin, Tables 1–2 (main, intermediates).** Keshavarz Ghorabaee et al. (2015), DOI 10.15388/Informatica.2015.57; Table 1 (input, AV), Table 2 (PDA, NDA, SP, NSP, SN, NSN, AS at 2 dp), Table 3 (A/B/C classes). 47 SKUs × 3 benefit criteria (average unit cost, annual dollar usage, lead time), equal weights. Table 2 was parsed from the PDF text and is identical to the copy in the script.
- **Presentation quirk (not an error in AS):** Table 2's SP and SN are plain sums of PDA/NDA (SP₁ = 0 + 4.31 + 0 = 4.31), i.e. w_j = 1, although the text says the weights are "equally distributed" (w = 1/3 gives SP₁ = 1.4371). NSP, NSN and AS are identical either way. To test SP/SN against Table 2, multiply ours (w = 1/3) by 3.
- **No misprint.** Single 2-dp rounding of our values misses 20 of 517 Table 2 cells by up to 0.0055 (e.g. AS₁₁ 0.1549 printed 0.16; NDA₄,₃ 0.7446 printed 0.75). Rounding half-up to 3 dp and then to 2 dp reproduces **all 517 cells exactly** — the paper double-rounded. AV 54.4415, 1099.6762, 3.9149 → printed 54.44, 1099.68, 3.91 ✓. A/B classes (top 10 / next 14 by AS) equal Table 3.

```json
{
  "id": "edas-2015-table1",
  "source": "Keshavarz Ghorabaee et al. 2015, Informatica 26(3):435-451, DOI 10.15388/Informatica.2015.57, Table 1 (input), Table 2 (output, 2 dp, double-rounded)",
  "types": ["benefit", "benefit", "benefit"],
  "weights": [0.3333333333333333, 0.3333333333333333, 0.3333333333333334],
  "matrix": [
    [49.92, 5840.64, 2], [210, 5670, 5], [23.76, 5037.12, 4], [27.73, 4769.56, 1], [57.98, 3478.8, 3],
    [31.24, 2936.67, 3], [28.2, 2820, 3], [55, 2640, 4], [73.44, 2423.52, 6], [160.5, 2407.5, 4],
    [5.12, 1075.2, 2], [20.87, 1043.5, 5], [86.5, 1038, 7], [110.4, 883.2, 5], [71.2, 854.4, 3],
    [45, 810, 3], [14.66, 703.68, 4], [49.5, 594, 6], [47.5, 570, 5], [58.45, 467.6, 4],
    [24.4, 463.6, 4], [65, 455, 4], [86.5, 432.5, 4], [33.2, 398.4, 3], [37.05, 370.5, 1],
    [33.84, 338.4, 3], [84.03, 336.12, 1], [78.4, 313.6, 6], [134.34, 268.68, 7], [56, 224, 1],
    [72, 216, 5], [53.02, 212.08, 2], [49.48, 197.92, 5], [7.07, 190.89, 7], [60.6, 181.8, 3],
    [40.82, 163.28, 3], [30, 150, 5], [67.4, 134.8, 3], [59.6, 119.2, 5], [51.68, 103.36, 6],
    [19.8, 79.2, 2], [37.7, 75.4, 2], [29.89, 59.78, 5], [48.3, 48.3, 3], [34.4, 34.4, 7],
    [28.8, 28.8, 3], [8.46, 25.38, 5]
  ],
  "published": {
    "AV": [54.44, 1099.68, 3.91],
    "AS": [0.66, 1.00, 0.61, 0.43, 0.60, 0.45, 0.43, 0.60, 0.64, 0.72, 0.16, 0.36, 0.58, 0.54, 0.41, 0.34, 0.24, 0.40, 0.37, 0.37,
           0.23, 0.37, 0.39, 0.19, 0.08, 0.18, 0.19, 0.39, 0.47, 0.13, 0.35, 0.18, 0.30, 0.14, 0.25, 0.18, 0.20, 0.25, 0.31, 0.30,
           0.00, 0.08, 0.18, 0.18, 0.23, 0.09, 0.08],
    "tolerance": 0.006,
    "note": "Table 2 = full-precision values rounded half-up to 3 dp, then to 2 dp; hence diffs up to 0.0055"
  },
  "expected": {
    "AV": [54.441489361702, 1099.676170212766, 3.914893617021],
    "AS": [0.656347, 1.000000, 0.609824, 0.428103, 0.595928, 0.453889, 0.433016, 0.598257, 0.643022, 0.716659, 0.154882, 0.356417,
           0.580774, 0.541568, 0.409897, 0.336726, 0.235879, 0.402456, 0.370678, 0.366583, 0.226283, 0.372044, 0.394146, 0.192810,
           0.079457, 0.182387, 0.186903, 0.392651, 0.470692, 0.126767, 0.345459, 0.178004, 0.297146, 0.140941, 0.247612, 0.174830,
           0.199408, 0.245772, 0.308405, 0.303566, 0.000000, 0.079219, 0.178939, 0.182825, 0.228527, 0.091291, 0.075474],
    "tolerance": 1e-6,
    "class_A_items_1based": [1, 2, 3, 5, 8, 9, 10, 13, 14, 29],
    "class_B_items_1based": [4, 6, 7, 12, 15, 16, 18, 19, 20, 22, 23, 28, 31, 39]
  }
}
```

**F1b — origin, Tables 5–7 (shared cross-method fixture; ranks only).** 10 × 7, C1–C3 benefit, C4–C7 cost, 7 weight sets (Table 6). The paper prints no EDAS scores, only ranks; the AS below are ours (derived, for tighter regression tests). Same matrix and weights as `vikor.md` and `tests/fixtures/saw-secondary.json` (`edas2015`).

```json
{
  "id": "edas-2015-table5",
  "source": "Keshavarz Ghorabaee et al. 2015, Table 5 (input), Table 6 (weights), Table 7 (EDAS ranks)",
  "types": ["benefit", "benefit", "benefit", "cost", "cost", "cost", "cost"],
  "matrix": [
    [23, 264, 2.37, 0.05, 167, 8900, 8.71], [20, 220, 2.2, 0.04, 171, 9100, 8.23],
    [17, 231, 1.98, 0.15, 192, 10800, 9.91], [12, 210, 1.73, 0.2, 195, 12300, 10.21],
    [15, 243, 2, 0.14, 187, 12600, 9.34], [14, 222, 1.89, 0.13, 180, 13200, 9.22],
    [21, 262, 2.43, 0.06, 160, 10300, 8.93], [20, 256, 2.6, 0.07, 163, 11400, 8.44],
    [19, 266, 2.1, 0.06, 157, 11200, 9.04], [8, 218, 1.94, 0.11, 190, 13400, 10.11]
  ],
  "weight_sets_as_printed": [
    [0.250, 0.214, 0.179, 0.143, 0.107, 0.071, 0.036], [0.182, 0.212, 0.182, 0.152, 0.121, 0.091, 0.061],
    [0.139, 0.167, 0.194, 0.167, 0.139, 0.111, 0.083], [0.108, 0.135, 0.162, 0.189, 0.162, 0.135, 0.108],
    [0.083, 0.111, 0.139, 0.167, 0.194, 0.167, 0.139], [0.061, 0.091, 0.121, 0.152, 0.182, 0.212, 0.182],
    [0.036, 0.071, 0.107, 0.143, 0.179, 0.214, 0.250]
  ],
  "weights_note": "sets 2 and 6 sum to 1.001, set 4 to 0.999: divide by the sum before compute()",
  "published_ranks": [
    [1, 4, 6, 10, 7, 8, 2, 3, 5, 9], [1, 4, 6, 10, 7, 8, 2, 3, 5, 9], [1, 3, 7, 10, 6, 8, 2, 4, 5, 9],
    [1, 2, 7, 10, 6, 8, 3, 4, 5, 9], [1, 2, 6, 10, 7, 8, 3, 4, 5, 9], [1, 2, 6, 10, 7, 8, 3, 4, 5, 9],
    [1, 2, 6, 10, 7, 8, 3, 4, 5, 9]
  ],
  "derived_AS_renormalized_weights": [
    [1.000000, 0.820483, 0.338017, 0.000000, 0.321972, 0.273052, 0.899458, 0.840959, 0.773152, 0.152736],
    [1.000000, 0.842441, 0.323858, 0.000000, 0.320300, 0.278498, 0.904192, 0.848130, 0.783870, 0.195141],
    [1.000000, 0.877633, 0.312207, 0.000000, 0.312905, 0.284413, 0.906849, 0.854573, 0.786213, 0.229317],
    [1.000000, 0.915961, 0.302281, 0.000000, 0.305505, 0.292033, 0.902841, 0.842567, 0.797342, 0.256852],
    [1.000000, 0.930315, 0.300636, 0.000000, 0.297848, 0.288121, 0.898570, 0.834843, 0.794303, 0.247783],
    [1.000000, 0.950280, 0.303597, 0.000000, 0.289971, 0.280273, 0.885172, 0.818683, 0.778084, 0.237805],
    [1.000000, 0.979739, 0.295080, 0.000000, 0.289726, 0.287312, 0.881094, 0.824629, 0.776616, 0.243787]
  ],
  "tolerance": 1e-6
}
```

**F2 — Aydın Ünal (2019), Tables 7, 9–12 (second fixture, 4-dp intermediates, Entropy → EDAS).** 7 BIST insurers × 8 criteria; Table 3 and the Table 9 header label KK3 and KK6 as cost ("Maliyet"), the rest benefit; weights from Table 7. KK4 is already Z-score-shifted (Eqs. 19–20), so S6 = 0.0005 is an artefact of the shift.
- **Calculation error in the paper:** Tables 10–12 do not follow the labelled types. They are reproduced only with **KK5 treated as cost and KK6 as benefit** (types swapped between the two columns): then AV, PDA, NDA match to 6e-4 (input printed at 4 dp; KK7/KK8 values as small as 0.0019) and SP, SN, NSP, NSN, AS to **2.4e-4** (AS 1.4e-4). With the labelled types (correct per the paper's own Table 3): AS differ by up to 0.088; **ranks are the same** [4, 2, 6, 5, 7, 1, 3]. SP and SN recomputed from the printed PDA/NDA tables match Table 12 to 1e-4, so Tables 10–12 are consistent with each other; the error is in the type assignment.

```json
{
  "id": "edas-aydinunal2019-q1",
  "source": "Aydin Unal 2019, FESA 4(4):555-566, DOI 10.29106/fesa.649946, Table 9 (input), Table 7 (Entropy weights), Tables 10-12 (output)",
  "alternatives": ["S1", "S2", "S3", "S4", "S5", "S6", "S7"],
  "types_labelled": ["benefit", "benefit", "cost", "benefit", "benefit", "cost", "benefit", "benefit"],
  "types_used_in_paper": ["benefit", "benefit", "cost", "benefit", "cost", "benefit", "benefit", "benefit"],
  "weights": [0.1595, 0.1334, 0.0662, 0.0885, 0.0199, 0.0758, 0.2969, 0.1598],
  "weights_note": "sum = 1.0000 as printed",
  "matrix": [
    [932143175, 570609202, 0.7128, 2.6919, 0.6077, 0.6285, 0.1005, 0.0898],
    [1377948801, 1627541169, 0.5183, 2.0065, 0.7102, 0.7016, 0.1293, 0.0670],
    [449610569, 680244795, 0.3300, 1.8694, 0.5450, 0.8286, 0.0031, 0.0019],
    [395098644, 255665969, 0.8922, 2.8270, 0.7184, 0.8962, 0.0736, 0.0534],
    [245424866, 185771819, 0.3693, 2.5091, 0.4149, 0.7850, 0.0204, 0.0089],
    [151287176, 819078906, 0.1864, 0.0005, 0.9745, 0.6673, 0.5916, 0.0904],
    [140454210, 240289953, 0.4992, 2.7956, 0.9603, 0.2260, 0.3740, 0.1366]
  ],
  "published_table12": {
    "SP": [0.2145, 0.4813, 0.0559, 0.0553, 0.0551, 0.8031, 0.5152],
    "SN": [0.1804, 0.0953, 0.4802, 0.3760, 0.5807, 0.2109, 0.2569],
    "NSP": [0.2671, 0.5994, 0.0696, 0.0688, 0.0686, 1.0000, 0.6416],
    "NSN": [0.6894, 0.8359, 0.1730, 0.3524, 0.0000, 0.6368, 0.5576],
    "AS": [0.4782, 0.7176, 0.1213, 0.2106, 0.0343, 0.8184, 0.5996],
    "ranking": [4, 2, 6, 5, 7, 1, 3],
    "reproduced_with": "types_used_in_paper, tolerance 3e-4 (AS 2e-4)"
  },
  "expected_labelled_types": {
    "AV": [527423920.142857, 625600259.0, 0.501171, 2.1, 0.704429, 0.676171, 0.184643, 0.064],
    "SP": [0.217100, 0.478513, 0.034262, 0.031033, 0.034660, 0.811751, 0.573022],
    "SN": [0.177712, 0.098043, 0.501813, 0.400237, 0.601121, 0.202228, 0.199187],
    "AS": [0.485907, 0.713191, 0.103707, 0.186206, 0.021349, 0.831791, 0.687275],
    "ranking": [4, 2, 6, 5, 7, 1, 3],
    "tolerance": 1e-6
  }
}
```

**F3 — Sarıhan & Aydın (2023), Tables 2, 5–9 (third fixture, ranks; Entropy → EDAS).** 14 firms × 3 benefit criteria, weights 0.124 / 0.521 / 0.355 (Table 5).
- **Misprint/calculation error:** Table 6 AV = 301,484,097 / 1,348,516,970 / 131,217,376 is not the mean of Table 2 (ours: 286,848,270.5 / 1,020,903,880.7 / 105,499,457.3). The paper's own Table 1 prints the group means as 286.8 / 1020.9 / 105.5 million — same as ours — so Table 2 is right and Table 6 is wrong. Tables 7–9's numeric columns (PDA, NDA, SP, SN, NSP, NSN, AS) follow the wrong AV (with the printed AV we reproduce them to 1.2e-3 at 3 dp). With the correct AV, AS differ by up to 0.043 (firm A: 0.1754 vs printed 0.132).
- **Second misprint — Table 9 contradicts itself (p. 427):** the printed AS are C 0,065 and L 0,063, but the printed Sıralama column says C = 10, L = 9. Ranking the printed AS gives C = 9, L = 10, and so does our recompute with the printed (wrong) AV (C 0.065258 > L 0.063050). The printed ranking matches only the correct-AV result, where L 0.066339 > C 0.066124 (gap 2.1e-4, a near-tie) — apparently by coincidence. So: printed ranking [7, 3, **10**, 13, 12, 14, 4, 11, 5, 8, 2, **9**, 1, 6]; ranking implied by the printed AS (corrected for the paper's own numbers) [7, 3, **9**, 13, 12, 14, 4, 11, 5, 8, 2, **10**, 1, 6]; ranking with the correct AV = the printed one. Tests must not derive ranks from `published.AS`; C/L are a near-tie (`scripts/edas_reconcile.py`).
- Side finding for `entropy.md`: Table 5 weights reproduce exactly with Entropy variant (a) (e = 0.872 / 0.465 / 0.636, w = 0.124 / 0.521 / 0.355); the paper's "standardization" (Table 3) is x / max, which cancels in p = x / Σx.

```json
{
  "id": "edas-sarihan2023-dts",
  "source": "Sarihan & Aydin 2023, Istanbul Ticaret Univ. Sosyal Bilimler Dergisi 22(46):412-437, DOI 10.46928/iticusbe.1263122, Table 2 (input), Table 5 (weights), Table 9 (output)",
  "types": ["benefit", "benefit", "benefit"],
  "weights": [0.124, 0.521, 0.355],
  "matrix": [
    [38848825, 677113055, 2395334], [28879989, 1335400806, 205743112], [412260387, 3033464, 6512010],
    [152738514, 8607944, 300032], [194413476, 151880, 4558944], [66779465, 1509179, 139887],
    [520533558, 86015541, 262295624], [96517647, 19426417, 17893118], [113654549, 4205094, 234729690],
    [845241538, 25939867, 23727158], [224858429, 5013633825, 52057346], [302415677, 1844880, 9656996],
    [678417175, 6821703723, 607132629], [340316558, 294068655, 49850522]
  ],
  "published": {
    "AV_table6_wrong": [301484097, 1348516970, 131217376],
    "AS": [0.132, 0.468, 0.065, 0.020, 0.033, 0, 0.311, 0.035, 0.232, 0.119, 0.573, 0.063, 1, 0.179],
    "ranking_printed": [7, 3, 10, 13, 12, 14, 4, 11, 5, 8, 2, 9, 1, 6],
    "ranking_implied_by_printed_AS": [7, 3, 9, 13, 12, 14, 4, 11, 5, 8, 2, 10, 1, 6],
    "note": "Table 9 misprint: printed AS (C 0.065 > L 0.063) contradict the printed ranks (C 10, L 9). AS/PDA/NDA follow the wrong Table 6 AV; the rank column happens to equal the correct-AV ranking. Do not derive ranks from this AS."
  },
  "expected": {
    "AV": [286848270.5, 1020903880.714286, 105499457.285714],
    "AS": [0.175431, 0.494178, 0.066124, 0.021302, 0.035752, 0.000000, 0.319286, 0.042138, 0.239055, 0.121440, 0.604957, 0.066339, 1.000000, 0.214643],
    "ranking": [7, 3, 10, 13, 12, 14, 4, 11, 5, 8, 2, 9, 1, 6],
    "near_tie": "C (0.066124) vs L (0.066339), gap 2.1e-4",
    "tolerance": 1e-6
  }
}
```

- **Recomputed** (2026-10-13, `scratchpad/mcdm/scripts/edas.py`, output in `edas.out.txt`; Table 2 parsed from the PDF text):

| Fixture | Compared | Printed vs recomputed (max abs diff) | Verdict |
|---|---|---|---|
| F1 Table 1 AV | 3 values | 0.0049 (2-dp rounding) | MATCH |
| F1 Table 2 | 517 cells (PDA, NDA, SP, NSP, SN, NSN, AS) | 0.0055; **0 cells off** after 3-dp→2-dp rounding | MATCH (double rounding, no misprint) |
| F1 Table 3 | A/B/C classes | identical | MATCH |
| F1b Table 7 | EDAS ranks, 7 sets | 7/7 identical (also with renormalized weights) | MATCH |
| F2 Tables 10–12 | AV, PDA, NDA, SP, SN, NSP, NSN, AS, ranks | labelled types: AS 0.088, ranks equal; KK5/KK6 swapped: AS 1.4e-4, all ≤ 6e-4 | MISMATCH explained (type swap in paper) |
| F3 Tables 6–9 | AV, PDA, NDA, SP, SN, AS, ranks | correct AV: AS 0.043, ranks equal to printed; printed AV: values ≤ 1.2e-3 but ranks C/L swapped vs the printed rank column | MISMATCH explained (wrong AV + self-contradictory rank column in Table 9) |

- **pyDecision** `edas_method` (GitHub master, source read and run 2026-10-13, `scripts/edas_pydecision_check.py`): same formulas as ours; |Δ| = 0 on F1, F1b (7 sets), F3 and 5.6e-17 on F2. Not used as a reference. Divergences in edge handling only: any type string other than exactly `'max'` is silently treated as cost (`['benefit', 'max']` gives AS [1, 0, 0.64] instead of [0.2, 0.6, 0.7]); no guard for AV = 0 or max SP = 0 (returns NaN); no constant-column handling.

## Implementation notes
- `src/core/methods/edas.ts`: `export const edas: RankingMethod = { id: 'edas', kind: 'ranking', compute(problem, weights) }` — no `params`, no `requires` (EDAS accepts zeros, so `positiveValues` is too strict). Register in `registry.ts` ranking list.
- Validation: `assertValid([...validateProblem(problem), ...validateWeights(weights, n), ...own])`, where `own` (computed only on a well-formed matrix, as in `saw.ts`) holds, per non-constant column with AV ≤ 0, an error `{ code: 'edas.non-positive-average', severity: 'error', col: j, value: AV }` (new `ValidationCode`, needs i18n), plus — depending on the owner decision below — either `negative-value` errors per cell (entropy-style) or an `edas.negative-values` warning per column.
- Compute (float64): constant column (all values `===` the first; same test as `validateProblem`) → PDA = NDA = 0 exactly, no division; otherwise `d = (x - AV) / AV`, benefit PDA = max(0, d), NDA = max(0, −d), cost swapped.
- SP, SN weighted (Eqs. 10–11, not Table 2's unweighted sums). If `max(SP) === 0` (then also `max(SN) === 0`): NSP = 0, NSN = 1, AS = 0.5 for all, warning `edas.no-spread`. Otherwise Eqs. 12–14 (max SN > 0 is then guaranteed).
- Return `{ scores: AS, order: 'desc', ranking: rankScores(AS, 'desc'), steps, warnings }` with steps `edas.average` (vector AV), `edas.pda`, `edas.nda` (matrices), `edas.weightedPda`, `edas.weightedNda` (w·PDA, w·NDA — shows the implicit dispersion weighting), `edas.sp`, `edas.sn`, `edas.nsp`, `edas.nsn`, `edas.scores`.
- Tests (Vitest): F1 AS (expected, 6 dp, tol 1e-6) + published AS (tol 0.006) + Table 2 PDA/NDA after 3-dp→2-dp rounding exactly + AV; SP × 3 vs Table 2 SP; A/B classes. F1b ranks 7/7 with renormalized weights + derived AS (1e-6). F2 published Table 12 with `types_used_in_paper` (tol 3e-4) and `expected_labelled_types` (1e-6). F3 expected AS (1e-6) and expected ranks (= `ranking_printed`; C/L near-tie); published AS checked against our printed-AV recompute (tol 1.5e-3), never ranked. Edge: constant column (exact 0, no noise), all columns constant → AS 0.5 + `edas.no-spread`, column AV ≤ 0 → error, n = 1 → `too-few-alternatives`, weight-scale invariance, shared rank on a tie.
- Fixture JSON for `tests/fixtures/`: the four blocks above (`edas-2015.json` with F1 + F1b, `edas-secondary.json` with F2 + F3).

## Decisions for the owner
1. **Negative values when the column average is > 0.** (a) block them with `negative-value` like Entropy `sum` — conservative, consistent with SAW's "no shifting"; (b) allow with an `edas.negative-values` notice — consistent with `combinations.md` §B.1 ("only if column average > 0"), keeps Turkish financial-ratio matrices (losses) usable. **Recommendation: (b)**; the formula stays monotone while AV > 0, and the notice says the result depends on where zero is. Caveat for (b): with negatives AV can be close to 0 and the distances lose their bound (see Pitfalls, 1 %-weight column flips the winner), so (b) also needs an `edas.unbounded-distance` warning per column when any PDA > n − 1 or NDA > 1 (impossible with non-negative data) or when AV is small relative to max|x| (e.g. AV < 0.05 · max|x|; threshold is ours, not from a paper). If that is too much machinery, (a) is the safe choice.
2. **Column average ≤ 0** (non-constant column): blocking error, no shift. Recommendation: yes (new code `edas.non-positive-average`).
3. **Parameters:** none exposed. Recommendation: none (the canonical method has none).
4. **Degenerate case** (max SP = 0): AS = 0.5 for everyone + warning, like TOPSIS. Recommendation: yes.
5. **Which F2 numbers are the test truth:** keep both — published Table 12 under the paper's actual (swapped) types as a step-level reproduction, and our labelled-type values as the correct result. Recommendation: yes, labelled clearly in the fixture.

## Sources
- Keshavarz Ghorabaee, M., Zavadskas, E.K., Olfat, L. & Turskis, Z. (2015), *Informatica* 26(3), 435–451, DOI 10.15388/Informatica.2015.57 — full PDF (informatica.vu.lt), Sec. 2 Eqs. 1–14, Tables 1–8.
- Keshavarz Ghorabaee, M., Zavadskas, E.K., Amiri, M. & Turskis, Z. (2016), *IJCCC* 11(3), DOI 10.15837/ijccc.2016.3.2557 — full PDF (univagora.ro), fuzzy variant only.
- Aydın Ünal, E. (2019), *FESA* 4(4), 555–566, DOI 10.29106/fesa.649946 — full PDF (DergiPark), Eqs. 9–20, Tables 3–13.
- Sarıhan, A.Y. & Aydın, U. (2023), *İstanbul Ticaret Üniv. Sosyal Bilimler Dergisi* 22(46), 412–437, DOI 10.46928/iticusbe.1263122 — full PDF (DergiPark), Tables 1–9.
- Bayram, E. (2021), *Finansal Araştırmalar ve Çalışmalar Dergisi* 13(24), 55–72, DOI 10.14784/marufacd.879171 — full PDF (DergiPark), text and Tables 8–10 read; input table garbled in extraction, not recomputed.
- Torkayesh et al. (2023), DOI 10.1016/j.eswa.2023.119724; Kahraman et al. (2017), DOI 10.3846/16486897.2017.1281139; Stanujkić et al. (2017), DOI 10.24846/v26i1y201701; Ecer (2017), DOI 10.3846/20294913.2016.1213207 — OpenAlex metadata/abstract only.
- pyDecision `pyDecision/algorithm/edas.py` (GitHub master, read and run 2026-10-13).
- `src/core/types.ts`, `validate.ts`, `rank.ts`, `methods/saw.ts`, `methods/topsis.ts`, `methods/entropy.ts`, `tests/saw.test.ts` (read for the interface and precedents).
- Scripts: `scratchpad/mcdm/scripts/edas.py` (fixtures, rounding check, edge cases), `scratchpad/mcdm/scripts/edas_pydecision_check.py`.

## Changes on re-verification (2026-10-13)
- Origin re-read in full; all formulas confirmed (Eqs. 3, 6–14); "Algorithm" now numbers them and states that division by AV is the only normalization.
- F1: the 0.0052 "edge of rounding" from the draft is now fully explained — Table 2 is double-rounded (3 dp → 2 dp), 517/517 cells reproduced; no misprint. Added full-precision AV and AS (6 dp, tol 1e-6) and Table 3 class check. SP/SN-unweighted note kept and quantified.
- F1b: ranks 7/7 re-confirmed; weight sums 1.001/0.999 documented with renormalization; derived AS to 6 dp.
- New fixtures: F2 Aydın Ünal 2019 (4-dp intermediates; paper swapped the KK5/KK6 types — printed and corrected values both recorded) and F3 Sarıhan & Aydın 2023 (wrong AV in Table 6, contradicted by the paper's own Table 1 — printed and corrected recorded). Both Entropy → EDAS, the Turkish template.
- pyDecision source read and run: identical formulas (diff 0); divergences in type strings and missing guards documented.
- Pitfalls: added the constant-column float trap (−1.4e-16), max SP = 0 rule, implicit dispersion weighting (56 %), shift dependence with numbers, rank reversal count (17 pairs), negative-AV sign flip, best AS < 1.
- "Commonly combined with" now cites read papers (Entropy, CRITIC, IDOCRIW → EDAS) and the OpenAlex co-mention counts; the unverified claim "used as a benchmark in CODAS and CoCoSo" moved out (not re-checked).
- Site copy shortened to one sentence each (EN + TR, "siz"); three source-backed bullets added.
- Popularity updated (OpenAlex 1,366); EDAS survey (Torkayesh et al. 2023) noted, not read.
- Not verified: Torkayesh et al. survey full text; stochastic EDAS; Bayram 2021 numbers; Ecer 2017 beyond abstract.

## Verification log (reconciliation, 2026-10-13)
Two skeptic reviews, checked against the Sarıhan & Aydın PDF (Table 9, p. 427), the origin and our own recompute (`scripts/edas_reconcile.py`, `edas_reconcile.out`, `edas_f1_6dp.py`).
1. **F3 Table 9 rank column contradicts its own AS (C/L)** — raised by both skeptics; **skeptic right.** PDF reads C 0,065 / rank 10, L 0,063 / rank 9; printed-AV recompute gives C 0.065258 > L 0.063050. Recorded as a second misprint with printed and corrected rankings; fixture split into `ranking_printed` / `ranking_implied_by_printed_AS`, near-tie flagged, test text changed.
2. **Decision 1(b) misses the unbounded-distance case** — **skeptic right.** Reproduced: AS [0, 1, 0.5003] vs [0, 0.5, 1] without the 1 %-weight column; bounds PDA ≤ n − 1, NDA ≤ 1 hold for non-negative data (2,000 random cases). Added to Pitfalls and to Decision 1 with a proposed warning.
3. **"Weights come from Entropy, CRITIC or AHP" overclaims** — raised by both; **skeptic right** (SWARA 94 = CRITIC 94, BWM, MEREC, IDOCRIW; origin uses equal and hand-set weights). Softened to "often … such as" / "çoğunlukla … gibi".
4. **Dispersion bullet names the wrong quantity** — **skeptic right.** Scale invariance re-confirmed (|ΔAS| 1.1e-16); PDA shares track CV. EN/TR now say "relative to its own average" / "kendi ortalamasına göre".
5. **Bullet 1 cites Sec. 2 for "prices, ratios or counts"** — raised by both; **skeptic right.** p. 438 has no data-type statement. Bullet now says "positive measured quantity", marked as our analysis, with the paper's only usage claim quoted; "ratios" dropped (financial ratios can be negative, e.g. Aydın Ünal KK4).
6. **AV ≤ 0 numbers depend on formulation** — **skeptic right.** d-form PDA [1, 0, 0.5] / NDA [0, 1.5, 0] vs literal Eqs. 6–7 PDA [0, −1.5, 0] / NDA [−1, 0, −0.5]; both stated, conclusion unchanged.
7. **F1 4-dp expected AS with tol 5e-5 is fragile** — **skeptic right** (max rounding error 4.917e-5). F1 expected AS now at 6 dp (max rounding error 4.7e-7), tol 1e-6.
