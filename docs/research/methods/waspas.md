# Weighted Aggregated Sum Product ASsessment (WASPAS)

**Re-verified 2026-10-13** against primary sources (full texts of Zavadskas et al. 2012, Chakraborty & Zavadskas 2014, Aytaç Adalı & Tuş Işık 2017; equations and Table 1 of the origin checked on the rendered page images; pyDecision 5.1.1 source read). Three fixtures recomputed independently (numpy, `scripts/waspas.py`). See "Changes on re-verification" at the end.

- **Family:** ranking (compensatory / utility — convex combination of WSM and WPM)
- **Origin:** Zavadskas, E.K., Turskis, Z., Antucheviciene, J. & Zakarevicius, A. (2012). Optimization of Weighted Aggregated Sum Product Assessment. *Elektronika ir Elektrotechnika* 122(6), 3–6. DOI [10.5755/j01.eee.122.6.1810](https://doi.org/10.5755/j01.eee.122.6.1810) (open access, CC-BY; PDF read in full). The equal-weight blend (Eq. 5, λ = 0.5) is credited there to Šaparauskas, Zavadskas & Turskis (2011), *Int. J. Strategic Property Management* 15(2), 189–203 (not read). WSM and WPM are cited to Triantaphyllou & Mann (1989).
- **Popularity:** OpenAlex cited-by 1,255 for the origin (2026-10-13; the 29.09 draft had Crossref 932). Chakraborty & Zavadskas (2014) 475 (OpenAlex). A dedicated review exists: Mardani et al. (2017), *A systematic review and meta-analysis of SWARA and WASPAS methods*, Applied Soft Computing 57, DOI 10.1016/j.asoc.2017.03.045 (closed access, not read). Turkish 2021 articles: WASPAS 8 of 310 method mentions (combinations.md A.1, Kocatürk Çetin 2023).

## For users (site copy)
- **EN:** WASPAS scores each alternative twice, once as a weighted sum and once as a weighted product, and blends the two with the parameter λ (1 = sum only, 0 = product only, 0.5 = half each). The product part punishes a single very weak value harder than the sum does. Pick it when you want a ranking between "everything can compensate" and "weak spots matter", and check whether the ranking changes as λ moves.
- **TR:** WASPAS her alternatifi iki kez puanlar, bir kez ağırlıklı toplamla, bir kez ağırlıklı çarpımla, sonra ikisini λ parametresiyle karıştırır (1 = yalnız toplam, 0 = yalnız çarpım, 0,5 = yarı yarıya). Çarpım kısmı tek bir çok zayıf değeri toplamdan daha sert cezalandırır. "Her şey birbirini telafi edebilir" ile "zayıf noktalar önemlidir" arasında bir sıralama istediğinizde seçin ve λ değiştikçe sıralamanın değişip değişmediğine bakın.

**When to use / combined with (site bullets, one sentence each, each backed by a source read in full):**
- **EN:** Use it when every value is a positive measurement or score and you want a single number per alternative that you can still trace back to criteria. *(Zavadskas et al. 2012, Eqs. 1–6; Chakraborty & Zavadskas 2014, Sec. 2)*
  **TR:** Tüm değerler pozitif ölçüm ya da puansa ve her alternatif için kriterlere kadar izlenebilen tek bir sayı istiyorsanız kullanın.
- **EN:** WASPAS only ranks; published studies take its weights from Entropy, AHP or SWARA. *(Zavadskas et al. 2012: entropy weights; Chakraborty & Zavadskas 2014, Examples 1 and 5: AHP weights; Aytaç Adalı & Tuş Işık 2017: SWARA weights, DOI 10.18825/iremjournal.335408)*
  **TR:** WASPAS yalnız sıralar; yayımlanmış çalışmalar ağırlıkları Entropi, AHP ya da SWARA'dan alır.
- **EN:** Move λ between 0 and 1 before trusting the order, because close alternatives can swap places. *(Zavadskas et al. 2012, Fig. 1; Aytaç Adalı & Tuş Işık 2017, Table 7: three different orders over λ)*
  **TR:** Sıralamaya güvenmeden önce λ'yı 0 ile 1 arasında gezdirin; birbirine yakın alternatifler yer değiştirebilir.

## When to use / when not
- **Use when:** positive, ratio-scale data (counts, prices, rates, 1–5 scores); you want a blend of additive (fully compensatory) and multiplicative (weak values weigh more) aggregation; you want a built-in sensitivity knob (λ).
- **Do not use when:** data contain zeros or negatives (blocked, see Pitfalls); interval-scale data where zero is arbitrary (x/max is not shift-invariant, same as SAW); you need one parameter-free answer and are not willing to show the λ sweep.

## Inputs
- Decision matrix X (m × n), m ≥ 2, **all x_ij > 0** (blocking `non-positive-value`, same rule as SAW; no shifting).
- Criterion types `benefit|cost`; weights w ≥ 0 summing to 1 (from the weighting step).
- Parameter **λ ∈ [0, 1], default 0.5**. Origin: Eq. 5 is the λ = 0.5 case ("equal contribution of WSM and WPM"), Eq. 6 the general form "λ = 0, …, 1"; every example (origin Table 2, Chakraborty & Zavadskas Tables 3, 15, Aytaç Adalı & Tuş Işık Table 7) sweeps λ in steps of 0.1. Only Chakraborty & Zavadskas (2014) give λ = 0.5 as the headline result (Example 1, cutting fluid: "for a λ value of 0.5"; Example 5 likewise). The origin reports the full grid (Table 2), then recommends a per-alternative optimal λ (p. 5: "Optimal λ (Eq. 19) should be calculated for every alternative before applying WASPAS (Eq. 6)") and gives Table 4 ("a4 = a2 > a3 > a1") as its final ranking. Aytaç Adalı & Tuş Işık (2017) name no main λ: "λ değerinin seçimi, karar vericiye bağlıdır" (p. 67), and p. 71 reports only the three λ-range orders. The 0.5 default therefore rests on origin Eq. 5 (equal contribution of WSM and WPM) and on Chakraborty & Zavadskas 2014, not on a consensus.
- Optional per-alternative "optimal λ" (origin Eqs. 12–19): **not in v1** (see Variants and Decisions).

## Algorithm
Origin, Zavadskas et al. (2012), Eqs. 1–6 (checked on the page image); identical in Chakraborty & Zavadskas (2014) Eqs. 2–7 and Aytaç Adalı & Tuş Işık (2017) Eqs. 5–9.
1. Linear (max) normalization, Eqs. 2–3: benefit $\bar x_{ij} = \dfrac{x_{ij}}{\max_i x_{ij}}$; cost $\bar x_{ij} = \dfrac{\min_i x_{ij}}{x_{ij}}$. So $0 < \bar x_{ij} \le 1$ and the best value of each criterion gets 1 (identical to SAW `linearMax`).
2. WSM, Eq. 1: $Q_i^{(1)} = \sum_{j} \bar x_{ij}\, w_j$.
3. WPM, Eq. 4: $Q_i^{(2)} = \prod_{j} \bar x_{ij}^{\,w_j}$ (the same normalized matrix, cost criteria included; no $x^{-w}$ form).
4. WASPAS, Eq. 6: $Q_i = \lambda Q_i^{(1)} + (1-\lambda) Q_i^{(2)}$. λ = 1 → WSM (= SAW `linearMax`), λ = 0 → WPM.
5. Rank by decreasing $Q_i$ (competition ranking for ties).

**Property (useful as a test invariant):** with $\sum_j w_j = 1$, the weighted AM–GM inequality gives $Q_i^{(2)} \le Q_i^{(1)}$, equality only when all $\bar x_{ij}$ of row i are equal. Hence every $Q_i$ is non-decreasing in λ, and $Q_i^{(2)} \le Q_i \le Q_i^{(1)} \le 1$. Checked on 2,000 random problems: 0 violations. This inequality is also what exposes the misprinted WPM column of Chakraborty & Zavadskas (2014) Table 2 (see Fixtures).

**Origin's accuracy part (Eqs. 7–19), documented, not implemented in v1:** $\sigma^2(\bar x_{ij}) = (k\bar x_{ij}/t)^2 = (0.05\,\bar x_{ij})^2$ (Eqs. 16–17, k = 0.10, t = 2.0); $\sigma^2(Q_i^{(1)}) = \sum_j w_j^2 \sigma^2(\bar x_{ij})$ (Eq. 14); $\sigma^2(Q_i^{(2)}) = \sum_j \big(Q_i^{(2)} w_j / \bar x_{ij}\big)^2 \sigma^2(\bar x_{ij})$ (Eq. 15); $\sigma^2(Q_i) = \lambda^2\sigma^2(Q_i^{(1)}) + (1-\lambda)^2\sigma^2(Q_i^{(2)})$ (Eq. 11); per-alternative optimum $\lambda_i = \dfrac{\sigma^2(Q_i^{(2)})}{\sigma^2(Q_i^{(1)}) + \sigma^2(Q_i^{(2)})}$ (Eq. 19). With Eq. 17 this simplifies to $\lambda_i = \dfrac{(Q_i^{(2)})^2 \sum_j w_j^2}{\sum_j w_j^2 \bar x_{ij}^2 + (Q_i^{(2)})^2 \sum_j w_j^2}$ (the 0.05 cancels). The 29.09 draft wrote "σ²(x̄) = (0.05 x̄)²" correctly but omitted Eqs. 14–15.

**Variants in the literature:**
- **Origin (linear max, scalar λ):** implemented. Same formulas in every later source read.
- **Per-alternative optimal λ (origin Eq. 19):** each alternative is blended with its own λ, so the Q values no longer come from one common scoring rule; the origin's own Table 4 then ends in an (approximate) tie a2 = a4. Few applications use it (Aytaç Adalı & Tuş Işık 2017 mention it, then use the λ grid). Not offered in v1.
- **pyDecision 5.1.1 (`1 + min–max`):** $\bar x = 1 + (x-\min)/(\max-\min)$, cost $1 + (\max-x)/(\max-\min)$. Not the origin; see Reference example for the result difference (it changes the winner in fixture C) and Pitfalls (0/0 on a constant column).
- **Fuzzy, grey, interval type-2, SVNS, rough extensions** (e.g. Keshavarz-Ghorabaee et al. 2017 CRITIC–WASPAS with IT2FS; Zavadskas et al. 2015 WASPAS-SVNS; cited in Aytaç Adalı & Tuş Işık 2017, Sec. 2): out of scope (crisp tool).

## Commonly combined with
- **Entropy → WASPAS:** origin example, "Relative significances of criteria were determined by means of entropy [9]" (Zavadskas et al. 2012, p. 4; read). Akçakanat et al. (2017), Entropy–WASPAS for banks (cited in Aytaç Adalı & Tuş Işık 2017; not read).
- **AHP → WASPAS:** Chakraborty & Zavadskas (2014), DOI [10.15388/Informatica.2014.01](https://doi.org/10.15388/Informatica.2014.01), Example 1 (AHP weights from Rao & Patel 2010) and Example 5 (AHP weights from Rao 2007) (read). OpenAlex co-mentions AHP–WASPAS 284 (combinations.md A.3).
- **SWARA → WASPAS:** Aytaç Adalı & Tuş Işık (2017), DOI [10.18825/iremjournal.335408](https://doi.org/10.18825/iremjournal.335408), supplier selection, SWARA weights then WASPAS (read; Turkish, DergiPark). Earlier: Zolfani et al. (2013), shopping-mall location (cited there, not read). OpenAlex co-mentions SWARA–WASPAS 224, the largest SWARA pairing (combinations.md A.3).
- **CRITIC → WASPAS:** Keshavarz-Ghorabaee, Amiri, Zavadskas & Antuchevičienė (2017), *Transport*, DOI [10.3846/16484142.2017.1282381](https://doi.org/10.3846/16484142.2017.1282381) (interval type-2 fuzzy; OpenAlex metadata only, not read). OpenAlex co-mentions 93.
- **Other ranking methods run side by side:** Chakraborty & Zavadskas (2014) compare with PROMETHEE, GTMA, VIKOR, ELECTRE on the same data; WASPAS itself is compared against in the CODAS and CoCoSo papers (draft, not re-checked).

## Pitfalls
- **Zero in a cost criterion:** with non-negative data a zero is always the column minimum, so that cell is min/x = 0/0 = NaN and every other alternative gets 0/x = 0 (its WPM part becomes 0). A plain x/0 with a non-zero numerator cannot occur without negative values. **Zero in a benefit criterion:** $\bar x = 0$ makes $Q^{(2)} = 0$ for that alternative whatever its other values, so at λ = 0 it ranks last even if it wins every other criterion. Both blocked by `requires.positiveValues` → `non-positive-value` (same rule as SAW, Fatih 06.10: no shifting).
- **Negative values:** same error. A shift (x − min + c) changes ratios and therefore ranks (combinations.md B, rule 7).
- **Constant column:** $\bar x = 1$ for everyone → adds $w_j$ to every WSM and a factor 1 to every WPM; ranking unaffected; the existing `constant-column` warning is enough. (pyDecision gives NaN for every alternative here: (max − min) = 0.)
- **Single alternative:** blocked by `MIN_ALTERNATIVES = 2`.
- **0^0:** a zero weight on a zero cell gives `Math.pow(0, 0) = 1` in JS and numpy; irrelevant once zeros are blocked, but do not "skip zero weights" in a way that changes this.
- **Ties:** `rankScores(Q, 'desc')`, competition ranking, relative tolerance 1e-12. Near ties are real: origin Table 4 calls a2 and a4 "equal" (recomputed 0.8230 vs 0.8231).
- **λ sensitivity:** ranks change with λ in all three fixtures (origin Table 2 / Fig. 1: a2 and a4 swap between λ = 0.4 and 0.5; robot: robots 1 and 4 swap at λ ≥ 0.8; supplier: three different orders). Show the λ sweep.
- **Weight-sum tolerance:** WPM is not linear in w. A paper's weights that sum to 1.0001 cannot be rescaled and scaled back the way the SAW test does (`S · total`): for WPM the relation is $Q^{(2)}(w) = Q^{(2)}(w/t)^{t}$. Tests on the origin fixture must use that or a 6e-4 tolerance (renormalized weights: max diff 5.2e-4).
- **Very small weights:** a near-zero weight removes the criterion from both parts at the same first-order rate (WSM gap $w\,\Delta\bar x$, WPM log-ratio $w\,\Delta\ln\bar x$); this is what a small weight means in any weighted method, not a WPM weakness. If anything WPM separates low values more (N = [[1, 0.2], [1, 0.9]], w = [0.99, 0.01]: relative gap WSM 0.0070, WPM 0.0149; `scripts/waspas_verify1.out`).
- **Rank reversal:** max/min normalization depends on the current set of alternatives, as in SAW. Not quantified here.

## Reference example (test fixture)

### A. Main fixture: Aytaç Adalı & Tuş Işık (2017) — raw data, benefit + cost, full λ grid
- **Source:** Aytaç Adalı, E. & Tuş Işık, A. (2017). Bir Tedarikçi Seçim Problemi İçin SWARA ve WASPAS Yöntemlerine Dayanan Karar Verme Yaklaşımı. *International Review of Economics and Management* 5(4), 56–77. DOI 10.18825/iremjournal.335408 (DergiPark PDF read in full). **Table 4** (SWARA weights), **Table 5** (input, 5 suppliers × 6 criteria, C2, C3, C5 cost), **Table 6** (normalized matrix, 3 d.p.), **Table 7** (Q for λ = 0, 0.1, …, 1).
- **Row labels inferred:** Table VII as printed has no alternative-name column (5 unlabeled rows under the λ headers). The row → A1..A5 mapping follows Table 5's order and is confirmed by the p. 71 text orders and Fig. III; our recompute reproduces every row in that order.
- Why main: raw (not pre-normalized) data with both criterion types, weights summing to exactly 1.000, all 55 published values reproduced from the raw data, and the ranking changes with λ exactly as the text says (p. 71: "0 ≤ λ ≤ 0,3 … A1 > A4 > A5 > A3 > A2; 0,4 ≤ λ ≤ 0,8 … A1 > A4 > A5 > A2 > A3; λ = 0,9 ve λ = 1 … A1 > A5 > A4 > A2 > A3"). Turkish source, fits the site audience. No misprint found.
- SWARA weights recomputed from the printed s_j (Table 4): 0.2210, 0.2009, 0.1747, 0.1589, 0.1271, 0.1173 (order C1, C6, C3, C2, C4, C5) → match the printed 3-d.p. weights.

```json
{
  "id": "waspas-adali-tusisik-2017",
  "source": "Aytaç Adalı & Tuş Işık 2017, IREM 5(4):56-77, DOI 10.18825/iremjournal.335408, Tables 4-7",
  "alternatives": ["A1", "A2", "A3", "A4", "A5"],
  "criteria": ["C1", "C2", "C3", "C4", "C5", "C6"],
  "types": ["benefit", "cost", "cost", "benefit", "cost", "benefit"],
  "weights": [0.221, 0.159, 0.175, 0.127, 0.117, 0.201],
  "matrix": [
    [3, 12.5, 2, 120, 14, 3],
    [5, 15, 3, 110, 38, 4],
    [3, 13, 2, 120, 19, 3],
    [4, 14, 2, 100, 31, 4],
    [3, 15, 1.5, 125, 40, 4]
  ],
  "expected": {
    "normalized_table6": [
      [0.600, 1.000, 0.750, 0.960, 1.000, 0.750],
      [1.000, 0.833, 0.500, 0.880, 0.368, 1.000],
      [0.600, 0.962, 0.750, 0.960, 0.737, 0.750],
      [0.800, 0.893, 0.750, 0.800, 0.452, 1.000],
      [0.600, 0.833, 1.000, 1.000, 0.350, 1.000]
    ],
    "lambda_grid": [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0],
    "Q_table7": [
      [0.7975, 0.7990, 0.8005, 0.8020, 0.8035, 0.8050, 0.8065, 0.8080, 0.8095, 0.8110, 0.8125],
      [0.7533, 0.7576, 0.7620, 0.7663, 0.7707, 0.7751, 0.7794, 0.7838, 0.7881, 0.7925, 0.7969],
      [0.7647, 0.7658, 0.7669, 0.7680, 0.7691, 0.7702, 0.7713, 0.7724, 0.7734, 0.7745, 0.7756],
      [0.7874, 0.7892, 0.7910, 0.7928, 0.7946, 0.7964, 0.7982, 0.8000, 0.8018, 0.8036, 0.8055],
      [0.7674, 0.7716, 0.7758, 0.7799, 0.7841, 0.7882, 0.7924, 0.7966, 0.8007, 0.8049, 0.8091]
    ],
    "ranking": {
      "lambda_0_to_0.3": [1, 5, 4, 2, 3],
      "lambda_0.4_to_0.8": [1, 4, 5, 2, 3],
      "lambda_0.9_to_1": [1, 4, 5, 3, 2]
    },
    "tolerance": { "normalized": 5e-4, "Q": 1e-4 }
  }
}
```

- **Recomputed:** WSM = 0.81250, 0.79690, 0.77560, 0.80550, 0.80910; WPM = 0.79747, 0.75330, 0.76472, 0.78740, 0.76738. Table 6 **MATCH** (max abs diff 4.6e-4, 3-d.p. rounding); Table 7, all 55 values **MATCH (max abs diff 5e-5)**; ranks match the text at all 11 λ.
- **pyDecision 5.1.1:** λ = 0.5 → 1.4605, 1.4461, 1.4132, 1.5170, 1.4601: **A4 first, the paper (and the origin formulas) give A1 first.** Different winner.

### B. Secondary: Chakraborty & Zavadskas (2014), Example 5 — industrial robot (raw data)
- **Source:** Chakraborty, S. & Zavadskas, E.K. (2014). Applications of WASPAS Method in Manufacturing Decision Making. *Informatica* 25(1), 1–20. DOI 10.15388/Informatica.2014.01 (PDF read). **Table 13** (input, data from Bhangale et al. 2004), weights in the text p. 11 (AHP, Rao 2007), **Table 14** (normalized matrix, Q1, Q2, Q at λ = 0.5), **Table 15** (Q and ranks for λ = 0 … 1).
- Note: the text names the third criterion "maximum tip speed (MTS)", the tables "MPS"; same column. Weights in table order: LC 0.036, RE 0.192, MTS 0.326, MC 0.326, MR 0.120 (sum 1.000).

```json
{
  "id": "waspas-chakraborty-zavadskas-2014-robot",
  "source": "Chakraborty & Zavadskas 2014, Informatica 25(1):1-20, DOI 10.15388/Informatica.2014.01, Tables 13-15",
  "criteria": ["LC kg", "RE mm", "MTS mm/s", "MC steps", "MR mm"],
  "types": ["benefit", "cost", "benefit", "benefit", "benefit"],
  "weights": [0.036, 0.192, 0.326, 0.326, 0.120],
  "matrix": [
    [60, 0.40, 2540, 500, 990],
    [6.35, 0.15, 1016, 3000, 1041],
    [6.8, 0.10, 1727.2, 1500, 1676],
    [10, 0.20, 1000, 2000, 965],
    [2.5, 0.10, 560, 500, 915],
    [4.5, 0.08, 1016, 350, 508],
    [3, 0.10, 1778, 1000, 920]
  ],
  "expected": {
    "Q1": [0.5256, 0.6371, 0.6624, 0.4976, 0.3468, 0.3995, 0.5581],
    "Q2": [0.3843, 0.5727, 0.6232, 0.4758, 0.2706, 0.2907, 0.4980],
    "Q_lambda_0.5": [0.4550, 0.6049, 0.6428, 0.4867, 0.3087, 0.3451, 0.5281],
    "ranking_lambda_0_to_0.7": [5, 2, 1, 4, 7, 6, 3],
    "ranking_lambda_0.8_to_1": [4, 2, 1, 5, 7, 6, 3],
    "tolerance": 3e-4
  }
}
```

- **Recomputed:** Table 14 normalized matrix **MATCH** (4e-5); Q1/Q2/Q **MATCH** (6e-5); Table 15, 77 values **MATCH** (max abs diff 2.1e-4, one cell: robot 3, λ = 0.6 printed 0.6469, ours 0.6467; the printed row is not evenly spaced there, 0.6428 → 0.6469 → 0.6506, a small misprint); all 77 printed ranks reproduced.
- **pyDecision 5.1.1:** λ = 0.5 scores 1.3969, 1.5897, 1.6273, 1.4405, 1.2192, 1.2460, 1.4911; same ranks here, different scores.

### C. Origin: Zavadskas et al. (2012), Tables 1–4 (already normalized; misprint)
- **Source:** origin paper, **Table 1** (normalized 4 × 12 matrix and entropy weights), **Table 2** (Q, λ = 0 … 1), **Table 3** (σ(Q)), **Table 4** (optimal λ and Q).
- **Misprint 1 (Table 1, confirmed on the page image):** a1, x̄5 printed **1.0000**; Tables 2, 3 and 4 for a1 are reproduced only with **0.1000** (a brute-force search over all a1 cells with 0.1 / 0.01 finds only this cell; row a1 then fits to 1e-4). Rows a2–a4 match as printed.
- **Misprint 2 (Tables 2 and 3 header):** last column printed "λ = 10", means λ = 1.
- **Misprint 3 (Table 4):** a1 optimal λ printed **0.32**; Eq. 19 gives **0.3425** (with the corrected matrix; Table 3's own σ curve has its minimum between λ = 0.3 and 0.4, so 0.34 is consistent). The printed Q = 0.5303 follows from the printed 0.32 (ours at 0.32: 0.5299), at 0.3425 it would be 0.5326. a2–a4 λ_opt match (0.4948, 0.3741, 0.4318).
- **Weights** sum to 1.0001 as printed (see Pitfalls for how to test with them).

```json
{
  "id": "waspas-2012-table1",
  "types": ["benefit", "benefit", "benefit", "benefit", "benefit", "benefit", "benefit", "benefit", "benefit", "benefit", "benefit", "benefit"],
  "weights_as_printed": [0.0627, 0.0508, 0.1114, 0.0874, 0.0625, 0.1183, 0.0784, 0.0984, 0.0530, 0.1417, 0.0798, 0.0557],
  "matrix_corrected": [
    [0.8486, 0.6364, 0.7982, 0.6707, 0.1000, 0.8534, 0.6622, 0.8618, 0.1432, 0.1585, 1.0000, 0.4531],
    [1.0000, 1.0000, 1.0000, 0.7976, 0.7000, 0.9005, 0.9324, 0.6788, 1.0000, 0.6500, 0.7270, 0.7346],
    [0.6542, 0.7000, 0.9169, 0.8951, 0.6000, 0.9791, 0.6216, 0.9479, 0.1340, 0.1585, 0.9795, 0.6728],
    [0.3694, 0.4375, 0.9407, 1.0000, 1.0000, 1.0000, 1.0000, 1.0000, 0.5478, 1.0000, 0.3754, 1.0000]
  ],
  "typo": { "row": 0, "col": 4, "printed": 1.0000, "corrected": 0.1000 },
  "expected": {
    "lambda_grid": [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0],
    "Q_table2": [
      [0.4912, 0.5033, 0.5154, 0.5274, 0.5395, 0.5516, 0.5637, 0.5758, 0.5878, 0.5999, 0.6120],
      [0.8173, 0.8185, 0.8197, 0.8209, 0.8221, 0.8233, 0.8244, 0.8256, 0.8268, 0.8280, 0.8292],
      [0.5873, 0.5983, 0.6093, 0.6203, 0.6313, 0.6423, 0.6532, 0.6642, 0.6752, 0.6862, 0.6972],
      [0.8015, 0.8066, 0.8116, 0.8167, 0.8217, 0.8268, 0.8318, 0.8369, 0.8419, 0.8470, 0.8520]
    ],
    "sigma_table3": [
      [0.0075, 0.0068, 0.0064, 0.0062, 0.0062, 0.0066, 0.0071, 0.0079, 0.0088, 0.0098, 0.0108],
      [0.0124, 0.0113, 0.0103, 0.0095, 0.0090, 0.0088, 0.0090, 0.0096, 0.0104, 0.0114, 0.0126],
      [0.0089, 0.0081, 0.0075, 0.0072, 0.0071, 0.0073, 0.0078, 0.0085, 0.0094, 0.0104, 0.0116],
      [0.0122, 0.0111, 0.0102, 0.0095, 0.0092, 0.0093, 0.0097, 0.0105, 0.0115, 0.0127, 0.0140]
    ],
    "table4": { "lambda_opt_printed": [0.32, 0.49, 0.37, 0.43], "lambda_opt_recomputed": [0.3425, 0.4948, 0.3741, 0.4318], "Q_printed": [0.5303, 0.8232, 0.6284, 0.8233] },
    "ranking_lambda_0_to_0.4": [4, 1, 3, 2],
    "ranking_lambda_0.5_to_1": [4, 2, 3, 1],
    "tolerance": 5e-4
  }
}
```

- **Recomputed (corrected matrix, weights as printed):** WSM 0.6121, 0.8288, 0.6975, 0.8516; WPM 0.4912, 0.8173, 0.5872, 0.8015. Table 2, 44 values **MATCH (4.4e-4)**; Table 3 σ(Q), 44 values **MATCH (4.5e-4)**; Table 4 Q at the printed λ_opt **MATCH (4.5e-4)**; λ_opt a2–a4 MATCH, a1 MISMATCH (0.32 vs 0.3425, misprint 3). **As printed:** Table 2 MISMATCH 0.076 (row a1 only), Table 3 MISMATCH 1.1e-3. Weights renormalized to 1: Table 2 max diff 5.2e-4. **Ranks:** from the printed Table 2 and from our values alike, a2 is first for λ = 0–0.4 (λ = 0.4: 0.8221 vs 0.8217) and a4 first for λ = 0.5–1 (λ = 0.5: 0.8268 vs 0.8233); the paper's Fig. 1 caption says the order "can vary depending on λ values".
- **pyDecision 5.1.1** (corrected matrix): λ = 0.5 → 1.1915, 1.5957, 1.4740, 1.7189 (same ranks, different scores). The 29.09 draft's 1.2487, 1.5686, 1.4368, 1.7189 are pyDecision on the matrix as printed (reproduced exactly); because min–max uses the column minimum, the a1-x̄5 misprint moves every alternative's pyDecision score, not only a1's.

### Not a fixture: Chakraborty & Zavadskas (2014), Example 1 — cutting fluid
- Table 1 → Table 2 normalized matrix **MATCH** (6e-5) and Q1 **MATCH**; but the printed **Q2 (WPM) column is wrong** for fluids 1, 3, 4: printed Q2 > Q1 (0.8995 > 0.8417, 0.9172 > 0.8444, 0.9037 > 0.9027), which the weighted AM–GM inequality forbids. Ours: Q2 = 0.8326, 0.8683, 0.8351, 0.8940 (fluid 2 matches). Consequently Table 2 Q and Table 3 (Q and ranks over λ) are not reproducible (max diff 0.082; ours give 4-2-3-1 at every λ, the paper 4-3-2-1 at λ = 0.5 and changing ranks). Could be used only for a normalization test (8 columns, 6 cost).

## Implementation notes
- **Interface:** `export const waspas: RankingMethod<WaspasParams>` with `type WaspasParams = { lambda?: number }`, `id: 'waspas'`, `kind: 'ranking'`, `requires: { positiveValues: true }`, `params: [{ key: 'lambda', kind: 'number', min: 0, max: 1, step: 0.1, default: 0.5 }]` (`ParamDescriptor` already documents "WASPAS λ"; `resolveParams` drops an out-of-range λ to the default, but only for callers that go through it). `compute` must also guard itself, like `saw.compute` does for an unknown variant (saw.ts: `throw new RangeError(...)`): `const lambda = params.lambda ?? 0.5; if (!Number.isFinite(lambda) || lambda < 0 || lambda > 1) throw new RangeError('WASPAS lambda must be in [0, 1]')`. Validation exactly as `saw.compute`: `validateProblem`, then `validateRequirements` on a well-formed matrix, `validateWeights`, `assertValid`.
- **Reuse:** the normalization is SAW `linearMax`; factor it out (e.g. `normalizeLinearMax(matrix, criteria)` in `math.ts` or a shared helper) instead of copying, so λ = 1 equals `saw` bit for bit (test: `waspas(λ=1).scores` toEqual `saw.scores`).
- **Compute:** WPM as `Math.exp(Σ w_j · Math.log(x̄_ij))` or a direct product of `Math.pow`; both fine with x̄ ∈ (0, 1] (no underflow at n ≤ ~1000 criteria). Prefer direct `Math.pow` product to stay closest to Eq. 4.
- **Steps:** `waspas.normalized` (matrix x̄), `waspas.wsm` (vector Q1), `waspas.wpm` (vector Q2), `waspas.scores` (Q). Optional `waspas.lambdaSweep` (matrix m × 11, Q at λ = 0, 0.1, …, 1) so the UI can draw the λ chart without recomputing; cheap.
- **Order:** `'desc'`; ties via `rankScores`.
- **Not in v1:** per-alternative optimal λ and the σ(Q) accuracy part (Eqs. 7–19). If added later, test against fixture C Tables 3–4 (λ_opt with the a1 misprint noted).
- **pyDecision:** `waspas_method(dataset, criterion_type, weights, lambda_value, graph)` → `(wsm, wpm, waspas)`; uses `1 + min–max` normalization; NaN on a constant column; different winner on fixture A. Not a reference.
- **Tests:** fixture A (Table 6 tol 5e-4, all 55 Table 7 values tol 1e-4, ranks at all 11 λ); fixture B (Q1, Q2, Q tol 3e-4, ranks at λ = 0.5 and λ = 0.8); fixture C (Table 2 with corrected matrix, weights handled per Pitfalls, tol 5e-4; as printed row a1 off by > 0.05; ranks [4,1,3,2] for λ = 0–0.4 and [4,2,3,1] for λ = 0.5–1); λ = 1 equals SAW; λ = 0 equals WPM; invariant Q2 ≤ Q1 and Q non-decreasing in λ on random inputs; validation: zero cost cell, zero benefit cell, negative cell → `non-positive-value`; constant column → warning, ranks unchanged; m = 1 → error; tie → shared rank; direct `compute` with λ = −0.1, 1.5, NaN → `RangeError`.
- **Site content to update** (`src/content/methods/waspas.ts`): reference → fixture A as main (`match: 'full'` once implemented), list the three origin misprints; replace the OpenAlex-count text in `combinedWith` with the read sources above; add Aytaç Adalı & Tuş Işık 2017 and the Chakraborty & Zavadskas DOI to `sources`.

## Decisions for the owner (Fatih)
1. **λ exposed as a slider (0–1), default 0.5?** Recommend yes: every source sweeps it, and the λ sweep is the method's built-in sensitivity check.
2. **λ step:** recommend 0.1 (all published tables use it); 0.05 is possible but no fixture uses it.
3. **Optimal λ (origin Eq. 19) in v1?** Recommend no: per-alternative λ breaks the common scale, few applications use it, and it adds an error model (k = 0.10, t = 2) the user would have to understand.
4. **Show the λ sweep chart (Q vs λ for all alternatives) on the result page?** Recommend yes (one extra step, no recomputation of normalization).
5. **Main fixture:** recommend Aytaç Adalı & Tuş Işık 2017 (raw data, benefit + cost, exact match, Turkish) over the origin (pre-normalized, misprinted, weights ≠ 1). Keep the origin and the robot example as secondary tests.
6. **Zeros:** recommend the SAW rule (block every value ≤ 0, no shift); a zero benefit value makes that alternative's WPM 0, a zero cost value gives 0/0 for its own cell and 0 for everyone else's.

## Sources
- Zavadskas, E.K., Turskis, Z., Antucheviciene, J. & Zakarevicius, A. (2012), *Elektronika ir Elektrotechnika* 122(6):3–6, DOI 10.5755/j01.eee.122.6.1810 — full PDF (eejournal.ktu.lt/index.php/elt/article/download/1810/1468); Eqs. 1–19 and Tables 1–2 checked on the page images; Tables 3–4 from the text layer. OpenAlex metadata (cited-by 1,255, 2026-10-13).
- Chakraborty, S. & Zavadskas, E.K. (2014), *Informatica* 25(1):1–20, DOI 10.15388/Informatica.2014.01 — full PDF (informatica.vu.lt/journal/INFORMATICA/article/726/file/pdf); Sec. 2 Eqs. 2–7, Examples 1 and 5, Tables 1–3, 13–15.
- Aytaç Adalı, E. & Tuş Işık, A. (2017), *International Review of Economics and Management* 5(4):56–77, DOI 10.18825/iremjournal.335408 — full PDF (dergipark.org.tr/tr/download/article-file/391073); Sec. 3–5, Eqs. 5–9, Tables 2, 4–7.
- Mardani et al. (2017), DOI 10.1016/j.asoc.2017.03.045; Keshavarz-Ghorabaee et al. (2017), DOI 10.3846/16484142.2017.1282381 — OpenAlex metadata only.
- pyDecision 5.1.1 wheel (PyPI), `pyDecision/algorithm/waspas.py` — read; formula transcribed in the script, not imported.
- Recompute script: `scratchpad/mcdm/scripts/waspas.py` (output `waspas.out`); probe for the cutting-fluid WPM column: `scripts/waspas_cf_probe.py`.
- Repo files read: `src/core/types.ts`, `params.ts`, `validate.ts`, `rank.ts`, `registry.ts`, `methods/saw.ts`, `src/content/methods/waspas.ts`, `tests/saw.test.ts` (WASPAS λ = 1 block).

## Changes on re-verification (2026-10-13)
- **Main fixture changed** from the origin (pre-normalized, misprinted) to Aytaç Adalı & Tuş Işık 2017 (raw data, 55/55 values match to 5e-5, λ-dependent ranks match the text). Added a second raw-data fixture: Chakraborty & Zavadskas 2014 robot (77/77 values, 2.1e-4).
- **Origin:** confirmed the a1-x̄5 misprint on the page image; new: Table 3 σ(Q) reproduced (4.5e-4); Table 4 λ_opt for a1 is also misprinted (0.32 vs 0.3425); "λ = 10" header misprint. The draft said Table 4 MATCH without noting the λ_opt mismatch.
- **Algorithm:** added the accuracy part (Eqs. 14–15) and the closed form of Eq. 19, and the WPM ≤ WSM invariant (new, with a 2,000-case check).
- **Cutting-fluid example:** found its printed WPM column impossible (Q2 > Q1); documented as not a fixture. The draft mentioned the 2014 paper with "DOI not checked"; DOI now verified.
- **pyDecision:** confirmed `1 + min–max`; new: it changes the winner on fixture A and returns NaN on a constant column. The draft's pyDecision numbers for the origin were computed on the misprinted matrix; corrected-matrix values added.
- **Combined with:** every pairing now has a paper read in full (Entropy: origin; AHP: Chakraborty & Zavadskas; SWARA: Aytaç Adalı & Tuş Işık); CRITIC kept with metadata only.
- **Popularity:** OpenAlex 1,255 (draft: Crossref 932, different index).
- **Site copy** rewritten (EN + TR, "siz"); three site bullets added (a fourth, on small weights, removed on reconciliation); implementation notes mapped to the current `RankingMethod` / `ParamDescriptor` interface; weight-sum test pitfall for WPM added.

## Verification log (reconciliation, 2026-10-13)
Checked against the source text layers (`dl/sk1-waspas/*.txt`) and `scripts/waspas_verify1.out`.
1. **Fixture C `ranking_all_lambda` [4,2,3,1]** (both skeptics, blocker): skeptics right. Printed Table 2 and our recompute give [4,1,3,2] for λ = 0–0.4 and [4,2,3,1] for λ = 0.5–1. Field split; ranks added to the recompute note and the test list.
2. **Site bullet on small weights** (both skeptics): skeptics right; the effect is the same order in WSM and WPM, and the bullet had no paper behind it. Bullet removed (EN + TR); the Pitfalls entry rewritten as a generic statement with the counterexample.
3. **"two of three fixtures"**: right; changed to all three, with the origin a2/a4 swap named.
4. **Zero in a cost criterion** (both skeptics): right; explanation corrected (0/0 in its own cell, 0 elsewhere). Blocking rule unchanged. Decision 6 reworded to match.
5. **λ validation only in `resolveParams`**: right (params.ts is the only range check; saw.ts throws `RangeError` on an unknown variant). Added a guard in `compute` and three test cases.
6. **"every example reports λ = 0.5 as main result"**: right. Origin p. 5 recommends a per-alternative optimal λ, Table 4 is its final ranking; Aytaç Adalı & Tuş Işık p. 67 leave λ to the decision maker. Inputs text rewritten; the 0.5 default kept, with its real basis (Eq. 5, Chakraborty & Zavadskas 2014).
7. **Fixture A row labels**: right; Table VII has no name column in the text layer. Note added that the mapping is inferred (Table 5 order, p. 71 text, Fig. III) and confirmed by the recompute (5e-5).
