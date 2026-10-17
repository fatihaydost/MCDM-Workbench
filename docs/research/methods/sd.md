# Standard Deviation weighting (sd)

**Re-verified 2026-10-13** against primary sources: the full text of Diakoulaki, Mavrotas & Papayannakis (1995) (found open, see Sources) and the full PDF of Mukhametzyanov (2021). Both fixtures recomputed independently with numpy (`scripts/sd.py`): MATCH. The origin paper has misprints in Tables 2, 5 and 7, a layout error in Table 4 (inverse permutation) that Table 8 inherits; all recorded below. See "Changes on re-verification" at the end.

- **Family:** weighting (objective)
- **Origin:** Diakoulaki, D., Mavrotas, G. & Papayannakis, L. (1995). Determining objective weights in multiple criteria problems: The CRITIC method. *Computers & Operations Research* 22(7), 763–770. DOI [10.1016/0305-0548(94)00059-H](https://doi.org/10.1016/0305-0548(94)00059-H). **Full text read.** Sec. 4 defines "SD weights" as a named method next to CRITIC: "a method based only on the contrast intensity of criteria, quantified by means of the standard deviation σ_j of the scores in criterion j", Eq. 7 $w_j = \sigma_j/\sum_k \sigma_k$, computed on the Eq. 2 score matrix. This is the earliest formal statement with a worked example that we could read. Diakoulaki et al. credit the idea itself to Zeleny (1982), *Multiple Criteria Decision Making*, McGraw-Hill (ref. [16]): "The standard deviation or an 'entropy' measure of importance have been proposed for quantifying contrast intensity" (Sec. 1). Zeleny's book: not read, no DOI.
- **Later restatements:** Mukhametzyanov (2021), Sec. 2.3, Eq. 11 (read). Jahan, Mustapha, Sapuan, Ismail & Bahraminasab (2012), *Int. J. Adv. Manuf. Technol.* 58, 411–420, and Wang & Luo (2010), *Math. Comput. Model.* 51(1–2), 1–12, DOI [10.1016/j.mcm.2009.07.016](https://doi.org/10.1016/j.mcm.2009.07.016) (proposes CCSD, a correlation-extended SD method): **not read** (Wang & Luo returned only metadata; Jahan et al. paywalled; search APIs rate-limited during this pass). They are cited only as "also used by".
- **Popularity:** In the 30-study review table of Keshavarz-Ghorabaee et al. (2021, *Symmetry* 13(4), 525, Table 1; studies from 2020–2021) Standard Deviation is used in 8 studies (Entropy 12, CRITIC 13); count taken from the Entropy card's 05.10 recount, not re-opened today (MDPI blocked the fetch). Crossref cited-by for Diakoulaki et al. (1995): 3,094 (29.09, from the CRITIC card); most of these citations are for CRITIC, not SD.

## For users (site copy)
- **EN:** SD weighting rescales every criterion to 0–1 (min–max) and gives more weight to criteria whose values are more spread out across the alternatives. Use it as a simple, transparent objective baseline, and switch to CRITIC when some criteria measure nearly the same thing.
- **TR:** SD ağırlıklandırması her kriteri 0–1 aralığına (min-maks) ölçekler ve değerleri alternatifler arasında daha çok yayılan kriterlere daha çok ağırlık verir. Basit ve şeffaf bir nesnel temel olarak kullanın; bazı kriterler hemen hemen aynı şeyi ölçüyorsa CRITIC'e geçin.

**When to use / combined with (site bullets, each backed by a source read in full):**
- **EN:** Use it when no expert weights are available and you want weights that follow only how strongly each criterion separates the alternatives. *(Diakoulaki et al. 1995, Sec. 1 and Eq. 7)*
  **TR:** Uzman ağırlığı yoksa ve ağırlıkların yalnız her kriterin alternatifleri ne kadar ayırdığına göre belirlenmesini istiyorsanız kullanın.
- **EN:** SD does not see that two criteria may say the same thing; correlated criteria are counted twice. CRITIC is SD multiplied by a conflict term and reduces this. *(Diakoulaki et al. 1995, Tables 3–5: SD gives market share 0.341 and its ranking ignores that criterion, ρ = −0.476; CRITIC gives 0.481)*
  **TR:** SD iki kriterin aynı şeyi söylediğini görmez; birbirine bağlı kriterler iki kez sayılır. CRITIC, SD'yi bir çelişki terimiyle çarpar ve bunu azaltır.
- **EN:** SD weights stay fairly close to equal, because min-max σ is bounded. In one published comparison on four related data sets they varied less than Entropy weights, but they still move when the set of alternatives changes. *(Diakoulaki et al. 1995, Sec. 5: in their case "SD weights do not differ significantly to each other"; Mukhametzyanov 2021, Table 2: std of each weight across DM-1/2/3/12 ≤ 0.018 for SD vs up to 0.050 for Entropy, and p. 82: "Even when replacing one alternative, the weights of the criteria change significantly")*
  **TR:** SD ağırlıkları eşite oldukça yakın kalır, çünkü min-maks ölçeğinde σ sınırlıdır. Yayımlanmış bir karşılaştırmada dört ilişkili veri setinde Entropi ağırlıklarından daha az değişti; yine de alternatif kümesi değişince ağırlıklar da değişir.
- **EN:** It only produces weights; a ranking method uses them. Published examples feed SD weights into a weighted sum (SAW). *(Diakoulaki et al. 1995, Eq. 9; Mukhametzyanov 2021, Table 2 "Rank (SAW)")*
  **TR:** Yalnız ağırlık üretir; sıralamayı başka bir yöntem yapar. Yayımlanmış örneklerde SD ağırlıkları ağırlıklı toplamda (SAW) kullanılır.

## When to use / when not
- **Use when:** a quick, explainable objective weighting is needed; data can have any sign (negatives are fine, the origin example has negative profitability); as a baseline next to CRITIC and Entropy.
- **Do not use when:** criteria are strongly correlated (SD double-counts them; Diakoulaki et al. 1995 built CRITIC for exactly this case, profitability–productivity ρ = 0.811); there are outliers (one extreme value turns the min–max column into roughly {0, …, 0, 1}, so σ reflects that one alternative rather than how the others are spread; for small m it can even raise the weight, see Pitfalls); the decision context already tells you which criteria matter; m = 2 (every non-constant criterion gets the same weight, see Pitfalls).

## Inputs
- Decision matrix X (m × n), m ≥ 2, any finite real values (negatives and zeros allowed).
- Criterion types `benefit`/`cost`: used in the normalization, but **they do not change the weights** (σ of 1 − r equals σ of r; checked numerically, 2.8e-17). They change only the displayed normalized matrix.
- No weights in, no parameters.

## Algorithm
Origin variant (Diakoulaki et al. 1995, Eqs. 2 and 7; same as Mukhametzyanov 2021, Eqs. 1, 2, 11):
1. Min–max normalization to the ideal/anti-ideal of the sample (Eq. 2: "the degree to which the alternative a is close to the ideal value f*_j … and far from the anti-ideal value f_j*"):
   benefit $r_{ij} = \dfrac{x_{ij}-\min_i x_{ij}}{\max_i x_{ij}-\min_i x_{ij}}$, cost $r_{ij} = \dfrac{\max_i x_{ij}-x_{ij}}{\max_i x_{ij}-\min_i x_{ij}}$; $r_{ij}\in[0,1]$, best = 1, worst = 0.
2. Contrast intensity: $\sigma_j = \sqrt{\tfrac{1}{m-1}\sum_i (r_{ij}-\bar r_j)^2}$ (sample SD; see "σ denominator" below).
3. Weights: $w_j = \sigma_j / \sum_{k=1}^{n} \sigma_k$.

Notation warning: Diakoulaki et al. use n for alternatives and m for criteria (Eq. 8: MW weights $w_j = 1/m$); we use m alternatives, n criteria as in the rest of the repo.

**σ denominator (1/m or 1/(m−1)).** It has no effect on the weights (common factor √(m/(m−1)) cancels; numerically 5.6e-17 on the origin data). It does change the σ shown in the step view:
- Diakoulaki et al. (1995) do not state it in the text, but their printed σ = 0.263, 0.321, 0.358 are the **population** SD (1/m): recomputed 0.2631, 0.3214, 0.3582; the sample SD would be 0.2812, 0.3435, 0.3829.
- Mukhametzyanov (2021) Eq. 11 states **1/(m−1)** explicitly and his Table 4 σ (0.366, 0.354, 0.361, 0.319, 0.341) match it.
- The repo's CRITIC uses `sampleStd` (1/(m−1)). Decision for the owner, see below.

**Variants found in the literature (we implement only the origin variant):**
- **(a) Min–max, origin** (Diakoulaki 1995; Mukhametzyanov 2021 Sec. 2.3) — **implemented.** Reason: it is the origin definition; it puts every criterion on the same [0, 1] range so σ is comparable across criteria; Mukhametzyanov (2021, p. 85) argues that only min–max (or his IZ variant, which gives identical weights) is consistent, because with other normalizations "the key indicators q_j = s_j for various criteria are not consistent with each other, and the result depends on the transformation method".
- **(b) Other normalizations before σ** (Mukhametzyanov 2021, Table 4, DM-1): x/max with cost 1 − x/max → w4 = 0.331; vector with cost 1 − x/‖x‖ → w4 = 0.403; Sum → w4 = 0.411; dSum → 0.135; min–max → 0.183. Recomputed: Max and Vec rows reproduced exactly (to 3 d.p.); Sum not reproduced with cost 1/x (max diff 0.018; his cost inversion for Sum is not stated). The same data give weights for C4 from 0.135 to 0.411 depending only on the normalization. Not offered.
- **(c) WASPAS-type normalization** (x/max, min/x) in the comparison of Keshavarz-Ghorabaee et al. (2021) Table 6. The 29.09 draft reported a 3-d.p. match; not re-run in this pass (MDPI fetch blocked). Not offered.
- **(d) σ on raw data, no normalization** (pymcdm documentation v1.3.1, Eqs. 2.5–2.6, population SD on $x_{ij}$; docs read, code not read; also the Rust crate `mcdm` docs). Scale-dependent: on DM-1 it gives [0.004, 0.569, 0.012, 0.363, 0.052] because price (C2, thousands) and C4 dominate. Not offered; worth a note because users may compare with that library.
- **(e) CCSD** (Wang & Luo 2010): σ combined with correlation to an aggregate criterion; a different method (needs a solver). Not part of SD.
- **pyDecision:** no SD function (GitHub `pyDecision/algorithm/` listing checked 2026-10-13: 95 files, no `sd.py`/`std`). Its `critic_method` uses the same min–max with a `+1e-10` guard and 1/(m−1); SD equals that code with the conflict term removed.

## Commonly combined with
- **SD → weighted sum of min–max scores (SAW-type)** in the origin paper: Diakoulaki et al. (1995), Eq. 9 $D_i = \sum_j w_j x_{ij}$ on the Eq. 2 matrix, Table 4 (read).
- **SD → SAW**, compared with Entropy and CRITIC on four matrices: Mukhametzyanov (2021), DOI [10.31181/dmame210402076i](https://doi.org/10.31181/dmame210402076i), Table 2 (read). His SAW top-3 (A2 > A4 > A6, B3 > B1 > B5) is reproduced when SAW uses x/max with cost 1 − x/max; with min–max SAW DM-1 starts A4 > A2 (inference from recomputation; the paper does not state its SAW normalization).
- **SD as one of the competing objective weights** (with Entropy, CRITIC, MEREC): Keshavarz-Ghorabaee et al. (2021), DOI [10.3390/sym13040525](https://doi.org/10.3390/sym13040525), Sec. 2 reviews SD → MULTIMOORA/MOOSRA, SD → EDAS/COPRAS/TOPSIS/ARAS, SD → GRA/TOPSIS/ORESTE (from the 29.09 pass; not re-opened today).
- **SD vs Entropy vs CRITIC similarity:** a Symmetry 2021 study, 13(10), 1874 (mdpi.com/2073-8994/13/10/1874), reports SD weights correlate 0.99 with statistical variance and 0.84 with Entropy; seen in a search summary only, not read, so not used on the site.
- Risk to show on the site (combinations.md B.3 #1): SD → TOPSIS/VIKOR counts dispersion twice.

## Pitfalls
- **Constant column:** max = min → do not divide; r = 0, σ = 0, weight 0, with the existing `constant-column` warning (same as CRITIC). Recomputed: DM-1 with C3 constant → [0.2652, 0.2564, 0, 0.2315, 0.2470] (an earlier version of this line printed w4 = 0.232, a rounding slip).
- **All columns constant:** Σσ = 0 → equal weights 1/n plus a warning (same rule as CRITIC/Entropy).
- **m = 2:** every non-constant column becomes {0, 1}, σ is identical, so all non-constant criteria get equal weight (recomputed: DM-1 first two rows → 0.2 each). Warn.
- **Direction has no effect:** cost/benefit only flips r; the weights are the same. Say so in the step view so users are not surprised.
- **Negatives and zeros:** fine; min–max is invariant to adding a constant and to positive scaling (recomputed: x·3.7 + 100 → max diff 2.8e-17). The origin example has negative values (−6.1, −34.6).
- **Outliers:** one extreme value compresses the rest of the column toward 0 (or 1), so σ describes the outlier, not the spread of the other alternatives. The direction depends on m: sample σ of {0, …, 0, 1} is 1/√m, versus an evenly spread column: m = 4 0.500 vs 0.430, m = 8 0.354 vs 0.350, m = 10 0.316 vs 0.336, m = 20 0.224 vs 0.311. So for m ≤ ~8 an outlier tends to raise the weight, for larger m to lower it. Example: DM-1 with A1/C4 set to 100000 raises w4 from 0.183 to 0.198.
- **Near-constant column:** the constant check is a relative tolerance, `isConstant`: max − min ≤ 1e-12 · max(|max|, |min|), so float noise such as 0.1 + 0.2 vs 0.3 counts as constant. Min–max is scale-invariant, so a meaningless difference just above that band is stretched to [0, 1] and gets a full, roughly 1/n weight. Recomputed: DM-1 with C3 = 150 + i·1e-9 → [0.2115, 0.2045, 0.2024, 0.1846, 0.1970], w3 = 0.202 instead of 0. Same behavior in CRITIC. Decided (owner decision 6): warn only, weight unchanged. Known limitation: the tolerance is relative with no absolute floor, so data centred on zero such as [0, 1e-17, 0] is neither constant nor warned.
- **Flat weights:** min–max σ is bounded (≤ ~0.707 for m = 2, sample SD), so weights are often close to 1/n (origin: 0.279–0.380; Mukhametzyanov: 0.175–0.231). Users may read this as "the method did nothing"; it is the method.
- **Correlated criteria double-counted** (see When not).
- **Change of alternatives:** adding or replacing an alternative moves min/max and σ. Across all four matrices of Mukhametzyanov's Table 2, SD varies least of the three (std of each weight across DM-1/2/3/12 ≤ 0.018, Entropy up to 0.050; p. 82 prints "largest variation" Entropy 185%, SD 24%; from the Table 2 rows the largest max/min ratio of one weight is Entropy 0.249/0.134 = 1.86 and SD 0.225/0.181 = 1.24, so the paper's 185% is a ratio and its 24% an increase, not the same measure). But for the one-alternative replacement (DM-1 → DM-3) SD moves about as much as Entropy: max |Δw| 0.022 vs 0.026, max relative change 10.8% vs 11.7%. Mukhametzyanov's one-cell example (p. 88, a12 85 → 72, SD w1 0.2102 → 0.2104, σ 5.120 → 5.125) was **not reproduced**: changing A2/C1 to 72 gives σ 5.097 and w1 0.2095; no single C1 cell set to 72 gives his numbers. Not used on the site.
- **Ties:** equal σ give equal weights; no tie-breaking needed (weights are not ranked).
- **Missing / non-numeric cells:** rejected by `validateProblem`.

## Reference example (test fixture)
- **Source A (origin, primary fixture):** Diakoulaki, Mavrotas & Papayannakis (1995), DOI [10.1016/0305-0548(94)00059-H](https://doi.org/10.1016/0305-0548(94)00059-H). Input: Table 1 (8 Greek pharmaceutical firms × 3 criteria: profitability %, market share %, productivity $ million; all benefit). Outputs: Sec. 5 σ values, Table 2 (normalized "source matrix"), Table 3 row "SD", Table 5 row "SD" (Spearman ρ of the SD ranking against each single-criterion ranking).
- **Misprints in Source A:**
  1. Table 2, firm C, profitability: printed **0.524**, data give (16.3 + 34.6)/95.6 = **0.5324**. Probably a transposition (0.532 → 0.524). Eight cells in total differ from the recomputation by more than 5e-4: C profitability (+0.0084, the misprint), D profitability 0.455 vs 0.4561 (+0.0011), and six productivity cells: A 0.996 vs 0.9970 (+0.0010), C 0.460 vs 0.4613 (+0.0013), E 0.401 vs 0.4018 (+0.0008), G 0.335 vs 0.3333 (−0.0017), and two at rounding level, D 0.200 vs 0.1994 (−0.0006) and F 0.069 vs 0.0685 (−0.0005). Apart from C, these look like the authors worked from unrounded data (Table 1 prints 2 decimals). The printed σ and weights match the data, not the printed Table 2.
  2. Table 4 ("Multicriteria rank orders", p. 768) is a **layout error, not scattered misprints**: every column lists the firm at each rank position (the inverse permutation), although the rows are labelled by firm. SD column printed A1 B2 C7 D5 E6 F3 G4 H8; read as ranks per firm, the recomputation gives **A1 B2 C6 D7 E4 F5 G3 H8** (scores D = [0.7304, 0.5414, 0.4758, 0.4707, 0.4911, 0.4796, 0.4978, 0.2694]); the order by position of these scores is exactly [1, 2, 7, 5, 6, 3, 4, 8] = the printed column. CRITIC: printed [1, 6, 7, 4, 5, 3, 2, 8] is the position order of the recomputed ranks [1, 7, 6, 4, 5, 2, 3, 8]. MW: printed [1, 2, 7, 6, 5, 4, 3, 8] is its own inverse, so it fits either reading and is **not** a control. The paper is internally inconsistent:
     - Table 5 (p. 768) was computed from the true ranks: printed SD ρ = 0.571, −0.476, 0.762 equals the recomputed ranking exactly; the printed Table 4 column read as ranks would give 0.571, −0.286, 0.524. Small extra misprint: Table 5 MW/profitability printed **0.525**, correct 11/21 = **0.524**.
     - Table 8 (p. 769, ρ with the PCA ranking [1, 7, 6, 4, 5, 2, 3, 8] of Table 7) was computed from the printed Table 4 columns read as ranks: printed CRITIC **0.9524**, SD **0.6429**, MW 0.5952 are reproduced exactly that way; with the true ranks they are CRITIC **1.0000**, SD **0.4762**, MW 0.5952. So Table 8 inherits the Table 4 error (and the true CRITIC–PCA agreement is perfect, which supports the paper's own conclusion more strongly).
     - Side note, Table 7: F's normalized PC1 printed **0.236**, correct 0.2854/1.387 = **0.206**; the PCA ranking column matches the corrected value (with 0.236, F would rank first).
     Rankings are not part of the SD weight fixture; record only.
- **Source B (second fixture, cost criteria, four matrices):** Mukhametzyanov, I.Z. (2021). Specific character of objective methods for determining weights of criteria in MCDM problems: Entropy, CRITIC, SD. *Decision Making: Applications in Management and Engineering* 4(2), 76–105, DOI [10.31181/dmame210402076i](https://doi.org/10.31181/dmame210402076i). Input: Table 1 (DM-1, DM-2; 8 × 5; C2 and C5 cost). DM-3 = DM-1 with row A1 replaced by B1; DM-12 = DM-1 stacked on DM-2 (16 × 5), both as defined in the text above Table 1. Output: Table 2 "SD" rows (3 d.p.), Table 4 row "Max-Min" (σ with 1/(m−1)).

```json
{
  "id": "sd-diakoulaki1995",
  "variant": "minmax (Eq. 2), w = sigma / sum sigma (Eq. 7)",
  "source": "Diakoulaki, Mavrotas & Papayannakis 1995, Computers & OR 22(7):763-770, Table 1 (input), Sec. 5 sigma and Table 3 SD (output)",
  "criteria": ["profitability_pct", "market_share_pct", "productivity_musd"],
  "types": ["benefit", "benefit", "benefit"],
  "alternatives": ["A", "B", "C", "D", "E", "F", "G", "H"],
  "matrix": [[61.0, 1.08, 4.33], [20.7, 0.26, 4.34], [16.3, 1.98, 2.53], [9.0, 3.29, 1.65], [5.4, 2.77, 2.33], [4.0, 4.12, 1.21], [-6.1, 3.52, 2.10], [-34.6, 3.31, 0.98]],
  "published": {"sigma_population": [0.263, 0.321, 0.358], "weights": [0.279, 0.341, 0.380]},
  "expected": {
    "weights": [0.27908, 0.34093, 0.37999],
    "sigma_population": [0.26306, 0.32135, 0.35817],
    "sigma_sample": [0.28122, 0.34353, 0.38290],
    "tolerance_vs_published": 5e-4
  },
  "misprints": {
    "table2_C_profitability": {"printed": 0.524, "corrected": 0.5324},
    "table4_sd_ranking": {"printed": [1, 2, 7, 5, 6, 3, 4, 8], "corrected": [1, 2, 6, 7, 4, 5, 3, 8], "evidence": "printed column is the inverse permutation (firm at each rank position); Table 5 SD row (0.571, -0.476, 0.762) matches the corrected ranks"},
    "table4_critic_ranking": {"printed": [1, 6, 7, 4, 5, 3, 2, 8], "corrected": [1, 7, 6, 4, 5, 2, 3, 8]},
    "table8_rho_vs_pca": {"printed": {"CRITIC": 0.9524, "SD": 0.6429, "MW": 0.5952}, "corrected": {"CRITIC": 1.0, "SD": 0.4762, "MW": 0.5952}, "evidence": "printed values follow from the printed Table 4 columns read as ranks"},
    "table5_mw_profitability": {"printed": 0.525, "corrected": 0.5238},
    "table7_F_normalized_pc1": {"printed": 0.236, "corrected": 0.2058}
  }
}
```

```json
{
  "id": "sd-mukhametzyanov2021",
  "variant": "minmax with cost inversion (Eqs. 1-2), sigma with 1/(m-1) (Eq. 11)",
  "source": "Mukhametzyanov 2021, DMAME 4(2):76-105, Table 1 (input), Table 2 SD rows and Table 4 Max-Min (output)",
  "types": ["benefit", "cost", "benefit", "benefit", "cost"],
  "matrices": {
    "DM-1": [[71, 4500, 150, 1056, 478], [85, 5800, 145, 2680, 564], [76, 5600, 135, 1230, 620], [74, 4200, 160, 1480, 448], [82, 6200, 183, 1350, 615], [81, 6000, 178, 2065, 580], [80, 5900, 160, 1650, 610], [85, 6500, 140, 1650, 667]],
    "DM-2": [[83, 5322, 170, 1682, 500], [84, 6021, 155, 2140, 513], [76, 4219, 155, 1613, 454], [73, 6154, 157, 2047, 582], [78, 5453, 173, 2136, 598], [82, 6030, 174, 1238, 587], [80, 4344, 172, 1365, 507], [77, 6114, 158, 1585, 592]],
    "DM-3": "DM-1 with row 1 replaced by DM-2 row 1",
    "DM-12": "DM-1 rows followed by DM-2 rows (16 x 5)"
  },
  "expected": {
    "DM-1": {"weights": [0.210, 0.203, 0.207, 0.183, 0.196], "sigma_sample": [0.366, 0.354, 0.361, 0.319, 0.341]},
    "DM-2": {"weights": [0.175, 0.206, 0.231, 0.195, 0.192]},
    "DM-3": {"weights": [0.216, 0.181, 0.220, 0.189, 0.193]},
    "DM-12": {"weights": [0.208, 0.225, 0.192, 0.176, 0.199]},
    "tolerance": 5e-4
  }
}
```

- **Recomputed** (`scratchpad/mcdm/scripts/sd.py`, numpy, independent of the repo code):
  - A: weights [0.27908, 0.34093, 0.37999] vs printed [0.279, 0.341, 0.380] → **MATCH**, max abs diff 8.3e-5. σ (1/m) [0.2631, 0.3214, 0.3582] vs printed [0.263, 0.321, 0.358] → **MATCH**, 3.5e-4. Table 2: 8 cells differ by > 5e-4 (misprints above). Side result: CRITIC on the same data gives [0.2022, 0.4809, 0.3169] vs printed [0.202, 0.481, 0.317] — the CRITIC card can now cite the origin as read.
  - B: DM-1 [0.2102, 0.2032, 0.2073, 0.1835, 0.1958] (4.7e-4); DM-2 (4.9e-4); DM-3 (4.7e-4); DM-12 (4.6e-4); σ DM-1 (4.5e-4) → **MATCH** at 3 d.p. for all.
  - pyDecision: not applicable (no SD function).

## Implementation notes
- New `src/core/methods/sd.ts`, `export const sd: WeightingMethod = { id: 'sd', kind: 'weighting', compute(problem) }`, no `params`; register in `registry.ts` next to `critic`.
- Share step 1 with CRITIC: extract the min–max loop of `critic.ts` (lines with `const r = zeros(m, n)` … `constant[j] = true`) into one helper, e.g. `minMaxNormalize(problem): { r: number[][]; constant: boolean[] }` in `math.ts` or a `normalize.ts`. Entropy's `minmax` branch has the same loop and could use it too. SD then is: `sigma = columns.map(sampleStd)`, `total = sum(sigma)`, `total === 0 ? 1/n : sigma/total`.
- Validation: `assertValid(validateProblem(problem))` only; no sign check (any sign allowed). Map `constant-column` issues to `sd.constant-column` warnings, as CRITIC does.
- Warnings: `sd.constant-column` (col), `sd.all-constant-equal-weights`, `sd.two-alternatives` (m = 2). Optional: reuse the site rule "one weight > 0.5" (cannot happen with SD unless most columns are constant, so skip).
- Steps: `sd.normalized` (matrix r), `sd.sigma` (vector), `sd.sigmaTotal` (scalar), `sd.weights` (vector). Label σ with its denominator in the UI ("örneklem std, n−1" / "sample SD, n−1") if the owner keeps 1/(m−1).
- Tests (Vitest): fixture A weights to 5e-4 against the published values and to 1e-4 against `expected.weights`; if σ uses `sampleStd`, assert σ = `expected.sigma_sample` and note in the test that the paper prints population σ. Fixture B DM-1/2/3/12 weights to 5e-4, DM-1 σ to 5e-4. Property tests: types flipped → same weights; affine transform per column → same weights; constant column → weight 0; all constant → 1/n; m = 2 → equal weights over non-constant columns.

## Decisions for the owner
1. **σ shown in the step view: sample (1/(m−1)) or population (1/m)?** Weights are identical. Recommendation: **sample**, reusing `sampleStd`, so SD and CRITIC show the same σ for the same data (CRITIC already uses n−1, and Mukhametzyanov's Eq. 11 states n−1); add a one-line note that Diakoulaki (1995) prints the population value.
2. **Normalization parameter exposed?** Recommendation: **no parameter, min–max only.** Other normalizations change the weights strongly (C4: 0.135–0.411 on the same data) and only min–max makes σ comparable across criteria (Mukhametzyanov 2021). Unlike Entropy there is no second published default worth offering.
3. **m = 2 warning** (all non-constant criteria get equal weight): recommendation **yes**.
4. **Shared min–max helper** refactor of `critic.ts` (and Entropy's min–max branch) when adding SD: recommendation **yes**, with CRITIC's existing tests as the guard.
5. **Site hint "your criteria are strongly correlated, consider CRITIC"** (e.g. when some |ρ| > 0.9): recommendation **not in v1**; keep it in the copy only. Revisit if the step view shows ρ anyway.
6. **Near-constant columns.** **Decided (2026-10-17): warn only, weight unchanged, for SD and CRITIC** (`sd.near-constant-column`, `critic.near-constant-column`, with `col`). The constant check was already a relative tolerance (`isConstant`, range ≤ 1e-12 · max|x|), so the warning covers the band 1e-12 < range / max|x| ≤ 1e-9 (`isNearConstant`, `NEAR_CONSTANT_TOLERANCE` in `src/core/math.ts`). Published fixtures do not trigger it. Known limitation: no absolute floor, so data centred on zero like [0, 1e-17, 0] is neither constant nor warned.

## Sources
- Diakoulaki, D., Mavrotas, G. & Papayannakis, L. (1995), *Computers & Operations Research* 22(7), 763–770, DOI 10.1016/0305-0548(94)00059-H — **full text read** (PDF hosted at reformship.github.io/pages/1capacity/1model/11evaluation/…The CRITIC method.pdf; header, page numbers 763–770 and content consistent with the Elsevier record): Sec. 1, Eqs. 2, 7, 9, Sec. 5, Tables 1–5.
- Mukhametzyanov, I.Z. (2021), *DMAME* 4(2), 76–105, DOI 10.31181/dmame210402076i — full PDF (distantreader.org copy of the journal PDF; dmame-journal.org download link exists), Sec. 2.3, Eqs. 1, 2, 11, Tables 1, 2, 4.
- Keshavarz-Ghorabaee, M. et al. (2021), *Symmetry* 13(4), 525, DOI 10.3390/sym13040525 — Table 1 count and Sec. 2 pairings from the 29.09/05.10 passes; not re-opened today.
- pyDecision GitHub `pyDecision/algorithm/` file listing and `critic.py` (read 2026-10-13).
- pymcdm docs v1.3.1, "Objective weights", Standard deviation method (Eqs. 2.5–2.6) — docs page only.
- Zeleny (1982); Jahan et al. (2012); Wang & Luo (2010) — not read.

## Changes on re-verification (2026-10-13)
- **Origin paper read in full** (the draft said "not verified, paywalled"): SD is defined in Diakoulaki et al. (1995) Sec. 4, Eq. 7, on the Eq. 2 min–max matrix. It is now the primary fixture (input Table 1, output Sec. 5 σ and Table 3), and it covers negative values.
- **σ denominator:** the origin prints population σ (1/m); Mukhametzyanov uses 1/(m−1). The draft said only "no effect on weights". Added as an owner decision.
- **Misprints recorded:** Diakoulaki Table 2 cell C/profitability (0.524 → 0.5324); Table 4 columns printed as inverse permutations (Table 5 uses the true ranks, Table 8 the printed columns); Table 5 MW 0.525 → 0.524; Table 7 F 0.236 → 0.206.
- Mukhametzyanov fixture extended with DM-3 and DM-12 (all MATCH); Table 4 variants Max and Vec reproduced exactly, Sum not (cost inversion unstated).
- New variant (d): SD on raw data (pymcdm docs) documented as a divergence.
- Site copy shortened to one sentence each (EN/TR, "min-maks", "siz"), plus sourced use/combined-with bullets.
- Pitfalls: added m = 2, affine invariance, ties, stability numbers; removed nothing that was correct.
- Not verified: Keshavarz-Ghorabaee Table 6 (WASPAS-type) not re-run; Jahan et al. (2012), Wang & Luo (2010), Zeleny (1982) not read.

## Verification log (reconciler, 2026-10-13)
Checked against the primary PDFs (`dl/diak_v1/t.txt`, `dl/muk/muk.txt`) and an independent recomputation, `scripts/sd_reconcile.py` (numpy).
1. **Site bullet "change little when one alternative is replaced, much less than Entropy"** (blocker): **skeptics right.** DM-1 → DM-3 (one alternative replaced) moves SD max |Δw| 0.022 (rel. 10.8%) vs Entropy 0.026 (11.7%), printed Table 2 and recomputed SD alike. The four-matrix pooled std (SD ≤ 0.018, Entropy ≤ 0.050) does show SD varies less overall; Diakoulaki's quote is about one case only. Bullet rewritten in EN/TR ("one published comparison, four related data sets"; quotes Mukhametzyanov p. 82 that one replacement still changes weights); Pitfall "Change of alternatives" now gives both numbers. Mukhametzyanov's one-cell example (p. 88) could not be reproduced and is not used.
2. **Table 4 ranking misprint explanation** (two skeptics): **right.** Printed columns are the inverse permutations of the true ranks (SD, CRITIC exact; MW self-inverse, so the "control" wording is dropped). Table 8 printed 0.9524/0.6429/0.5952 reproduced only from the printed columns; true 1.0000/0.4762/0.5952. Table 5 MW 0.525 → 0.5238 and Table 7 F 0.236 → 0.206 confirmed. Card text and fixture `misprints` updated; fixture weights unchanged.
3. **Outlier "lowers σ"** (two skeptics): **right.** Sample σ of {0,…,0,1} = 1/√m is above the evenly spread value up to m ≈ 8–9 and below from m = 10 (recomputed 4: 0.500/0.430, 8: 0.354/0.350, 10: 0.316/0.336, 20: 0.224/0.311). "When not" and Pitfalls rephrased to "distorts".
4. **Near-constant column not covered:** **right.** DM-1 with C3 = 150 + i·1e-9 → w3 = 0.2024 (recomputed). Added as a Pitfall and owner decision 6.
5. **"CRITIC corrects double counting":** **right.** CRITIC multiplies σ by Σ(1 − r) and only down-weights; Diakoulaki Sec. 5 says "better resolution of the conflict". Changed to "reduces" / "azaltır".
6. **Table 2 "six productivity cells differ by 0.001–0.002":** **right.** D (−0.0006) and F (−0.0005) are rounding level. Text now lists all eight cells with signed differences.

