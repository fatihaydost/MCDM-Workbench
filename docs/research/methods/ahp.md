# AHP — Analytic Hierarchy Process, criteria weights from pairwise comparisons (ahp)

**Re-verified 2026-10-18** for the site's first subjective weighting method (shared pairwise input screen with BWM). Scope of this card: **AHP as a criteria-weighting method** (one comparison matrix over the criteria); AHP as a ranking method is discussed only as Decision 1. Three fixtures recomputed in numpy (`scripts/ahp.py`, output `scripts/ahp.out`): the origin author's own examples (Saaty 2008), a Turkish application (Doğuç 2022, read in full) and an incomplete-matrix example (Bozóki et al. 2010, author's manuscript read in full). RI tables checked against our own Monte Carlo; pyDecision 5.1.8, pymcdm 1.4.0 and pyrepo-mcda 0.1.15 run. Input UX of four AHP tools reviewed (section "Input UX"). See "Changes on re-verification" at the end.

- **Family:** weighting (subjective; ratio judgements → principal eigenvector)
- **Origin:** Saaty, T.L. (1977). A scaling method for priorities in hierarchical structures. *Journal of Mathematical Psychology* 15(3):234–281, DOI [10.1016/0022-2496(77)90033-5](https://doi.org/10.1016/0022-2496(77)90033-5) (paywalled, **not read**). Book: Saaty (1980), *The Analytic Hierarchy Process*, McGraw-Hill (**not read**). The method as used here (1–9 scale, eigenvector, CI, RI, CR ≤ 0.10) is taken from Saaty (2008), *Int. J. Services Sciences* 1(1):83–98, DOI [10.1504/IJSSCI.2008.017590](https://doi.org/10.1504/IJSSCI.2008.017590) (read in full on 29.09 from a third-party copy; that copy was unreachable on 18.10, so its numbers are re-verified only through the recomputation, which matches them). Row geometric mean variant: Crawford & Williams (1985), *J. Math. Psych.* 29(4):387–405, DOI [10.1016/0022-2496(85)90002-1](https://doi.org/10.1016/0022-2496(85)90002-1) (Crossref only). RI: Alonso & Lamata (2006), *IJUFKS* 14(4):445–459, DOI [10.1142/S0218488506004114](https://doi.org/10.1142/S0218488506004114) (read in full, slideblast copy of the published PDF).
- **Popularity:** Crossref cited-by 8,052 (Saaty 1977), 7,477 (Saaty 1990 EJOR), 5,025 (Saaty 2008) on 2026-10-18. The most used subjective weighting method; in Turkish DergiPark applications AHP → TOPSIS/VIKOR/VZA is the standard pairing (search 2026-10-18, snippets).

## For users (site copy)
- **EN:** In AHP you compare the criteria two at a time: which one matters more, and how much more (1 = equal, 9 = extremely more). AHP turns these judgements into weights and tells you how consistent they were (consistency ratio CR; up to 0.10 is the usual limit).
- **TR:** AHP'de kriterleri ikişer ikişer karşılaştırırsınız: hangisi daha önemli, ne kadar daha önemli (1 = eşit, 9 = kesinlikle daha önemli). AHP bu yargıları ağırlığa çevirir ve ne kadar tutarlı olduklarını söyler (tutarlılık oranı CR; genelde 0,10'a kadar kabul edilir).

**When to use / combined with (site bullets, one sentence each, each backed by sources read in full unless marked):**
- **EN:** Use it when the weights should come from people's judgement, not from the data, and there are about 3 to 9 criteria. *(Goepel 2013 §4.1: each group "should have at least 4, but not more than 7 to 10" elements)*
  **TR:** Ağırlıklar veriden değil insanların yargısından gelmeliyse ve 3 ile 9 arası kriter varsa kullanın.
- **EN:** The number of questions grows fast: n criteria need n(n−1)/2 comparisons, 10 for 5 criteria, 36 for 9. With many criteria, BWM asks only 2n − 3. *(arithmetic; BWM card)*
  **TR:** Soru sayısı hızla artar: n kriter için n(n−1)/2 karşılaştırma gerekir, 5 kriterde 10, 9 kriterde 36. Kriter çoksa BWM yalnız 2n − 3 soru sorar.
- **EN:** A CR above 0.10 does not make the weights unusable; it means some answers contradict each other, and the tool shows which one to look at first. *(Goepel 2013: median CR 0.16 over 80 real participants; Saaty 2008 on improving consistency)*
  **TR:** CR'nin 0,10'u aşması ağırlıkları kullanılmaz yapmaz; bazı cevapların birbiriyle çeliştiğini gösterir ve araç önce hangisine bakmanız gerektiğini gösterir.
- **EN:** AHP only weighs; studies usually feed its weights into TOPSIS, VIKOR or PROMETHEE. *(Doğuç 2022 uses AHP end to end; AHP–TOPSIS/VIKOR pairings: DergiPark snippets, not read)*
  **TR:** AHP yalnız ağırlık üretir; çalışmalar bu ağırlıkları genelde TOPSIS, VIKOR ya da PROMETHEE'ye verir.

**UI labels:** method EN "AHP (pairwise comparisons)" / TR "AHP (ikili karşılaştırma)"; consistency EN "Consistency ratio CR" / TR "Tutarlılık oranı CR"; steps EN "Comparison matrix" / TR "Karşılaştırma matrisi", EN "Priority vector (eigenvector)" / TR "Öncelik vektörü (özvektör)", EN "λmax, CI, CR" / TR "λmaks, CI, CR"; flag EN "Most inconsistent answer" / TR "En tutarsız cevap"; suggestion EN "Your other answers suggest {v}" / TR "Diğer cevaplarınız {v} diyor". Scale words (Saaty 2008 Table 1): 1 EN "equal" / TR "eşit", 3 "moderately" / "biraz", 5 "strongly" / "kuvvetle", 7 "very strongly" / "çok kuvvetle", 9 "extremely" / "kesinlikle"; 2, 4, 6, 8 unlabeled.

### Visual proposal (site): "a matrix of ratios, one vector that fits it"
One picture, the criteria comparison matrix as an n × n grid of cells, weight bars to its right (one per row), a CR gauge under it. Default data: F1a (Saaty's job, 5 criteria, CR 0.073) or F2 (Doğuç, Turkish). Cells above the diagonal hold the user's judgement (number + small arrow towards the winner); cells below are their mirror (1/a), drawn faint. Steps for "step through the idea" (IdeaSteps, 4 steps, last = full drawing):
1. **EN:** Each cell answers "how many times more important is the row than the column?". You fill the upper half; the lower half is its mirror. **TR:** Her hücre "satır, sütundan kaç kat önemli?" sorusunun cevabıdır. Üst yarıyı siz doldurursunuz; alt yarı onun aynasıdır. *(upper cells light up, then mirror into the lower half)*
2. **EN:** If the answers were perfectly consistent, every cell would equal w_row / w_col: one set of weights would explain the whole table. **TR:** Cevaplar tam tutarlı olsaydı her hücre w_satır / w_sütun olurdu: tek bir ağırlık takımı bütün tabloyu açıklardı. *(a faint second number w_i/w_j appears in each cell)*
3. **EN:** AHP finds the weights that fit the table best (the principal eigenvector) and draws them as bars. **TR:** AHP tabloya en iyi uyan ağırlıkları (temel özvektör) bulur ve çubuk olarak çizer. *(bars grow at the row ends)*
4. **EN:** Where an answer and its fitted ratio disagree most, the cell is marked; the CR sums up all disagreements against the 0.10 line. **TR:** Bir cevap ile uydurulan oran en çok nerede ayrışıyorsa hücre işaretlenir; CR tüm ayrışmaları 0,10 çizgisine göre özetler. *(cells tinted by |ln(a_ij w_j / w_i)|, the top one ringed; CR needle on a 0–0.2 gauge with the 0.10 tick)*

Colour: judgement cells `--data-context`, the flagged cell and the bars `--data-accent`; no colour scale beyond one accent ramp for the deviation tint. Table equivalent: rows = criteria, columns = judgements, then w, then (Aw)_i / w_i.

## When to use / when not
- **Use when:** importance comes from a person; n = 3–9 (Goepel 2013 recommends 4 to 7–10 per group from field projects; the 1–9 scale was designed for elements within an order of magnitude, Comparion help "Structure Measure Synthesize"); you want an internal consistency check and a "which answer contradicts the others" aid; you need results comparable with the large AHP literature (Turkish theses especially).
- **Do not use when:** n > 10 (45+ questions; prefer BWM or splitting criteria into groups, which the site's flat criteria list cannot do); weights must be objective or reproducible from data; the decision maker cannot accept ratio statements ("A is 5 times as important as B").

## Inputs
- **Judgements:** for each unordered pair {i, j}, i < j: which criterion is more important and an intensity x ∈ {1, …, 9} (Saaty 2008 Table 1). Stored as a_ij ∈ {1/9, …, 1/2, 1, 2, …, 9} (17 values); a_ji = 1/a_ij, a_ii = 1. Decimal judgements (1.1–1.9 for "nearly equal", Saaty 2008) are allowed by the method but not offered by the UI (Decision 5).
- **Not read:** the decision matrix (like Equal and Manual weights).
- **Parameters:** `priority` ∈ {`eigen` (default), `geometric`, `additive`} (Decision 2). The RI table is not a parameter (Decision 3).
- **Output:** w (Σ = 1), λmax (always the Perron eigenvalue of A), CI, CR, the inconsistency ranking of judgements with a suggested value each.
- **Domain:** 2 ≤ n ≤ 15. n = 1 has no question; n = 2 has one question and CR is undefined; n > 15 has no published RI and 105+ questions (Pitfalls).

## Algorithm
Notation: A = (a_ij), n × n, positive and reciprocal.

1. **Build A** from the n(n−1)/2 upper-triangle answers; fill a_ji = 1/a_ij, a_ii = 1.
2. **Priority vector (default, Saaty 2008):** w is the principal right eigenvector, $A w = \lambda_{\max} w$, normalized to $\sum_j w_j = 1$ (Perron–Frobenius: real, positive, unique for a positive matrix). Compute by power iteration from w = 1/n, normalizing each step, until max change < 1e‑12: at most 123 iterations on 500 noisy matrices with n 3–15 (median 32), agreeing with numpy's `eig` to 1e‑9.
3. **λmax, CI, CR:** $\lambda_{\max} = \frac1n \sum_i (Aw)_i / w_i$ (exact for the eigenvector), $CI = \dfrac{\lambda_{\max} - n}{n - 1}$, $CR = CI / RI_n$; Saaty's rule: acceptable if CR ≤ 0.10. λmax is a property of A; with the `geometric` or `additive` priority options still take the **Perron eigenvalue** for CR (see variant 3 below and F2).
4. **Most inconsistent judgement** (Saaty 2003 via Goepel 2018 Eq. 6; Expert Choice "Inconsistency 1st"): $\varepsilon_{ij} = a_{ij}\, w_j / w_i$; rank pairs by $|\ln \varepsilon_{ij}|$ (ε = 1 means the answer equals the fitted ratio). **Suggested value (our choice, checked):** for the flagged pair, recompute the weights from all *other* answers (incomplete LLSM, step 6 with that pair removed) and offer the scale value nearest to $w_i / w_j$ from those weights. On 2,000 random matrices with one planted wrong answer (n 4–9): every rule flags the planted pair 97–99 % of the time (ε with eigen weights 97.2 %, with RGMM 97.8 %, "largest CR drop" 98.6 %, leave-one-out 97.9 %), but the suggested value recovers the original answer **59 %** of the time with leave-one-out weights and only **1 %** with the all-answers weights (the wrong answer pulls the weights towards itself; Expert Choice's "Best Fit" and AHP-OS's highlight use such all-answers weights as far as their documentation shows). Applying the leave-one-out suggestion takes the median CR from 0.155 to 0.017; 5 % stay above 0.10.
5. **n = 3 shortcut:** eigenvector = RGMM exactly (1.7e‑13 on F1c), CR depends only on $a_{12}a_{23}/a_{13}$.
6. **Incomplete matrices (not offered at launch, used internally by step 4 and for provisional weights):** with some pairs missing, the logarithmic least squares weights are the solution of the graph Laplacian system $L y = r$, $y_i = \ln w_i$, $r_i = \sum_{j: a_{ij}\,\text{given}} \ln a_{ij}$, fixing $y_n = 0$; unique **iff the comparison graph is connected** (Bozóki, Fülöp & Rónyai 2010, Theorem 4, Eq. 30). The eigenvector analogue (complete A by the missing entries that minimize λmax) has the same uniqueness condition (their Theorem 2) and is convex in log x. Both reproduced on F3.

**Variants found (and what we do):**
1. **Eigenvector (EVM)** — Saaty; default. Matches every published Saaty number (F1).
2. **Row geometric mean (RGMM, = LLSM for complete A)** — $w_i \propto (\prod_j a_{ij})^{1/n}$. Option `geometric`. Differs from EVM by little: on random 1–9 judgement matrices (n 3–9) the median max |Δw| is 0.002 (consistent rounding) to 0.020 (noisy, median CR 0.21), max 0.11; the ranking of the weights differs in 0/750, 82/750, 168/750, 269/750 cases as noise grows, the top criterion in 0, 10, 31, 50. AHP-OS's own Excel template uses RGMM per participant and EVM for the summary (Goepel 2013); AHP-OS online uses EVM (Goepel 2018 §2.2). RGMM's advantages: closed form, consistent with geometric group aggregation (RGMM of the AIJ matrix = geometric mean of individual RGMM weights, 5.6e‑17), and it extends to incomplete matrices (step 6).
3. **Additive normalization ("mean")** — divide each column by its sum, average the rows. pyDecision's **default** (`wd='m'`) and the method most Turkish papers print (F2, Sönmez & Tandoğan Öney 2021 snippet). Option `additive`, for matching such papers. These papers compute λ as mean((Aw)_i/w_i) with the additive w, which is not the Perron root: F2 prints λ 5.2693, the Perron root is 5.2672 (CR 0.0601 vs 0.0597). The step view should show the Perron value and note the difference.
4. **Other scales** (balanced, geometric, power, logarithmic; Goepel 2018 Table 1) and **GCI** (geometric consistency index for RGMM, Aguarón & Moreno-Jiménez 2003, not read): out of scope.
5. **pyrepo-mcda's "normalized column sum"** is row sums divided by the grand total, not the additive method (0.03–0.05 from it on our fixtures); not offered.

**Random index (Decision 3).** Published tables differ because they come from small simulations:

| n | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Saaty (pyDecision, most papers) | 0.58 | 0.90 | 1.12 | 1.24 | 1.32 | 1.41 | 1.45 | 1.49 | 1.51 | **1.48** | 1.56 | 1.57 | 1.59 |
| Golden & Wang (pymcdm `RI_M`) | 0.5799 | 0.8921 | 1.1159 | 1.2358 | 1.3322 | 1.3952 | 1.4537 | 1.4882 | 1.5117 | 1.5356 | 1.5571 | 1.5714 | 1.5831 |
| Alonso & Lamata 2006 (Table 2, 500k) | 0.5247 | 0.8816 | 1.1086 | 1.2479 | 1.3417 | 1.4057 | 1.4499 | 1.4854 | 1.5140 | 1.5365 | 1.5551 | 1.5713 | 1.5838 |
| **Ours** (100k per n, uniform over the 17 values) | 0.5257 | 0.8836 | 1.1090 | 1.2490 | 1.3408 | 1.4044 | 1.4510 | 1.4857 | 1.5145 | 1.5365 | 1.5547 | 1.5702 | 1.5837 |

Our simulation agrees with Alonso & Lamata to 0.002; Saaty's table is off by up to 0.057 (n = 3) and is not monotone (RI(12) < RI(11)). Alonso & Lamata's fit $RI_n = (1.7699\,n - 4.3513)/(n-1)$ (their Eq. 21–22; AHP-OS uses it, Goepel 2018 Eq. 5) is good from n ≈ 5 (0.046 off at n = 3). In practice the CR verdict barely moves: a matrix exactly at CR(A&L) = 0.10 has CR(Saaty) 0.090 (n 3), 0.098 (n 4), 0.099–0.104 (n 5–12). pymcdm attributes its table to Tummala & Ling (1998); the numbers are the Golden & Wang column of Alonso & Lamata's Table 1.

## Commonly combined with
- **Ranking:** TOPSIS, VIKOR, PROMETHEE, ELECTRE, VZA/DEA (Turkish: AHP–TOPSIS "Konut Seçimi" DergiPark 1376434, AHP–VIKOR Arslan 2017, AHP–VZA hospitals DergiPark 2176499: snippets only); AHP → PROMETHEE Dağdeviren (2008), DOI 10.1007/s10845-008-0091-7 (cited in `promethee-ii.md`, not read).
- **Full AHP** (alternatives compared pairwise per criterion, then synthesized): Saaty 2008 (job example), Doğuç 2022 (4 candidates × 5 criteria). Not this card (Decision 1).
- **Compared with:** BWM (Rezaei 2015 compares them; not read), rank-order weights (Roszkowska 2013, text extract only).

## Pitfalls
- **Comparison fatigue:** 10 questions at n = 5, 21 at n = 7, 36 at n = 9, 45 at n = 10, 105 at n = 15. Goepel (2013): "more than 10 sub-categories require over 45 pair-wise comparisons; this gets easily too complex and confusing". Show the count before the user starts.
- **CR > 0.10 is common, not exceptional.** Goepel (2013), 80 participants in 4 corporate projects: median CR 0.16, 80th percentile 0.36; "the ten-percent rule is obviously too strict" (they used 0.3 in one project). Random matrices: share with CR > 0.1 goes 6 % → 85 % as judgement noise grows (our simulation). So warn and help, do not block (Decision 4).
- **The 1–9 cap creates inconsistency by itself:** A > B 9, B > C 9 implies A > C 81, but the scale stops at 9: CR 0.48 even for a perfectly transitive user. A > B 3, B > C 3, A > C 3 (should be 9): CR 0.117 (Saaty's own 1988 house matrix has this shape, CR .117). Tell the user why when the flagged triple involves 9s.
- **Intransitive answers** (A > B, B > C, C > A at 9): weights equal (1/3 each), CR 6.1. The flag picks one of the three; the suggestion fixes it.
- **n = 1:** no question; weight 1 (like Equal). **n = 2:** one question, w = (a/(1+a), 1/(1+a)), λ = 2 exactly, CI = 0, RI = 0: CR is 0/0. pyDecision returns `nan`, pymcdm returns 0. Show "not applicable" (no gauge).
- **n > 15:** no published RI; pyDecision raises `IndexError` (index 16), pymcdm raises `IndexError` (its `ValueError` is constructed but never raised). Our Monte Carlo continues smoothly (1.5957 at n 16, 1.6294 at n 20) if ever needed; recommended: block AHP above 15 criteria and point to BWM.
- **Non-reciprocal input** (hand-typed matrices, paper typos): the eigenvector still computes but CR is meaningless (Saaty's drinks table as printed: CR 0.0142 instead of 0.022). Build A only from the upper triangle; on matrix import, check reciprocity to 1e‑9 and report the offending cell.
- **Weights from a non-eigen method with an approximate λ** (F2): CR differs in the 3rd decimal. Always use the Perron root.
- **Rank reversal** belongs to AHP's alternative-synthesis mode, not to criteria weighting. Adding or removing a **criterion** does change the matrix, so the old judgements of the remaining pairs are kept and only the new pairs are asked (Implementation notes).
- **Group judgements** averaged arithmetically lose reciprocity (checked); the geometric mean keeps it but turns 3 vs 1/3 into 1 ("equal"), hiding disagreement (Goepel 2018 §4.2). Out of scope (Decision 6).

## Reference example (test fixture)

### F1 (main, origin author): Saaty (2008), Tables 3, 2, 4
- **Source:** Saaty 2008, *IJSS* 1(1):83–98. Table 3 (job criteria, 5 × 5), Table 2 (drinks, 7 × 7, published w and CR 0.022), Table 4 (3 × 3). Published weights to 3 d.p.
- **Paper notes (typos):** (i) **Table 2 is not reciprocal:** row Tea / column Wine prints 2, row Wine / column Tea prints 1/3. As printed, tea gets 0.0393 (published 0.042) and CR 0.0142 (published 0.022); with a(Tea, Wine) = 3 every published value is reproduced, so the "2" is the typo. (ii) Table 8 (job security ratings) is printed transposed (as printed [0.0841, 0.2109, 0.7049], published [0.6586, 0.2628, 0.0786] belong to the transpose); not a criteria fixture.
- **Recomputed:** F1a eigen [0.0361, 0.1219, 0.2619, 0.0746, 0.5056] vs published, **MATCH** (4.5e‑4, 3 d.p.); RGMM (9.5e‑3) and additive (1.2e‑2) do not match, so Saaty used the eigenvector. F1b corrected: w MATCH (4.6e‑4), CR 0.0223 → 0.022 **MATCH**. F1c MATCH (4.0e‑4), eigen = RGMM.

```json
{
  "id": "ahp-saaty2008-job-criteria",
  "source": "Saaty 2008, International Journal of Services Sciences 1(1):83-98, DOI 10.1504/IJSSCI.2008.017590, Table 3",
  "criteria": ["flexibility", "opportunities", "security", "reputation", "salary"],
  "upper": [0.25, 0.16666666666666666, 0.25, 0.125, 0.3333333333333333, 3, 0.14285714285714285, 4, 0.5, 0.14285714285714285],
  "priority": "eigen",
  "published": { "weights": [0.036, 0.122, 0.262, 0.075, 0.506] },
  "expected": {
    "weights": [0.036050, 0.121903, 0.261893, 0.074553, 0.505602],
    "lambda_max": 5.3263, "CI": 0.0816, "CR_saaty": 0.0728,
    "weights_geometric": [0.0351, 0.1185, 0.2715, 0.0721, 0.5027],
    "weights_additive": [0.0383, 0.1241, 0.2621, 0.0819, 0.4936],
    "tolerance_vs_published": 5e-4
  }
}
```
`upper` lists a12, a13, …, a1n, a23, … row by row (the form the UI stores).

```json
{
  "id": "ahp-saaty2008-drinks-corrected",
  "source": "Saaty 2008, Table 2, with a(Tea,Wine) corrected from 2 to 3 (see typo note)",
  "criteria": ["coffee", "wine", "tea", "beer", "sodas", "milk", "water"],
  "matrix": [
    [1, 9, 5, 2, 1, 1, 0.5],
    [0.1111111111111111, 1, 0.3333333333333333, 0.1111111111111111, 0.1111111111111111, 0.1111111111111111, 0.1111111111111111],
    [0.2, 3, 1, 0.3333333333333333, 0.25, 0.3333333333333333, 0.1111111111111111],
    [0.5, 9, 3, 1, 0.5, 1, 0.3333333333333333],
    [1, 9, 4, 2, 1, 2, 0.5],
    [1, 9, 3, 1, 0.5, 1, 0.3333333333333333],
    [2, 9, 9, 3, 2, 3, 1]
  ],
  "priority": "eigen",
  "published": { "weights": [0.177, 0.019, 0.042, 0.116, 0.190, 0.129, 0.327], "CR": 0.022 },
  "expected": { "weights": [0.1775, 0.0191, 0.0418, 0.1164, 0.1896, 0.1288, 0.3268], "lambda_max": 7.1766, "CR_saaty": 0.0223, "CR_alonso_lamata": 0.0219, "tolerance_vs_published": { "weights": 5e-4, "CR": 5e-4 } }
}
```

```json
{
  "id": "ahp-saaty2008-flexibility-3x3",
  "source": "Saaty 2008, Table 4",
  "upper": [0.3333333333333333, 0.16666666666666666, 0.25],
  "priority": "eigen",
  "published": { "weights": [0.091, 0.218, 0.691] },
  "expected": { "weights": [0.0914, 0.2176, 0.6910], "lambda_max": 3.0536, "CR_saaty": 0.0462, "note": "geometric gives identical weights for n = 3 (1.7e-13)", "tolerance_vs_published": 5e-4 }
}
```

### F2 (secondary, Turkish): Doğuç (2022), recruitment criteria, 5 × 5, additive normalization
- **Source:** Doğuç, Ö. (2022). Eleman İşe Alım Süreci İçin AHP Metodu ile Karar Destek Sistemi. *Ekonomi, İşletme ve Maliye Araştırmaları Dergisi* 4(2):126–145, DOI [10.38009/ekimad.1142952](https://doi.org/10.38009/ekimad.1142952) (DergiPark article-file 2535040, **read in full**: Eqs. 1.1–1.6, Tables 2, 4–7). Matrix "compiled from the literature" (Craft 1995; Dağdeviren 2013; …).
- **Why this one:** Turkish, independent author, 4-d.p. weights, λ, CI and CR all printed, and it uses the additive method with λ = mean(Aw/w) like most Turkish papers, so it tests the `additive` option and shows the λ approximation.
- **Recomputed:** additive w **MATCH** (2e‑5), Aw/w all five values MATCH (< 5e‑5), λ 5.2693, CI 0.0673, CR 0.0601 all **MATCH**. Eigen w [0.1201, 0.3024, 0.0726, 0.1550, 0.3499] differs by up to 0.005; same order of criteria under all three methods (Performans > İş Tecrübesi > Yetenek > Bilişim > Eğitim). Perron λ 5.2672, CR 0.0597.

```json
{
  "id": "ahp-doguc2022-recruitment",
  "source": "Doguc 2022, Ekonomi Isletme ve Maliye Arastirmalari Dergisi 4(2):126-145, DOI 10.38009/ekimad.1142952, Tables 4-7",
  "criteria": ["Bilisim/Teknik Bilgi", "Is Tecrubesi", "Egitim Duzeyi", "Yetenek/Kisilik", "Performans"],
  "upper": [0.3333333333333333, 3, 0.5, 0.3333333333333333, 4, 3, 0.5, 0.5, 0.3333333333333333, 0.5],
  "priority": "additive",
  "published": { "weights": [0.1239, 0.3001, 0.0746, 0.1567, 0.3447], "lambda_approx": 5.2693, "CI": 0.0673, "CR": 0.0601 },
  "expected": {
    "weights_additive": [0.123889, 0.300102, 0.074579, 0.156719, 0.344710],
    "weights_eigen": [0.1201, 0.3024, 0.0726, 0.1550, 0.3499],
    "weights_geometric": [0.1189, 0.3034, 0.0723, 0.1569, 0.3485],
    "lambda_perron": 5.2672, "CR_saaty_perron": 0.0597,
    "tolerance_vs_published": 5e-5
  }
}
```
Note: `expected` values with 6 d.p. come from our run (the script prints 4 d.p.; the 6-d.p. values were printed separately from the same functions).

### F3 (secondary, incomplete): Bozóki, Fülöp & Rónyai (2010), Example 2, 8 × 8 with 12 of 28 judgements missing
- **Source:** *Mathematical and Computer Modelling* 52:318–333, DOI [10.1016/j.mcm.2010.02.047](https://doi.org/10.1016/j.mcm.2010.02.047); author's manuscript (real.mtak.hu/65496), **read in full**: Example 2 matrix M (Eq. 32, an incomplete version of Saaty's "buying a house"), Laplacian system (33) with published y, LLSM weights; Section 5 λmax-optimal completion (Table 1 iterations, completed matrix, λmax 9.2981, EM weights).
- **Why:** the only published example we found with both incomplete-LLSM and incomplete-EM numbers; it tests step 6 (provisional weights while answering, leave-one-out suggestions) and the connectivity check.
- **Recomputed:** graph connected (degrees 7, 4, 3, 4, 3, 4, 3, 4; 16 judgements); y and w_LLSM **MATCH** (5e‑5, 4 d.p.); EM completion λ 9.2981 **MATCH**, w_EM **MATCH** (4e‑5), completed entries vs their Table 1 (1e‑4). The completed matrix has CR 0.13 (Saaty RI 1.41).

```json
{
  "id": "ahp-bozoki2010-incomplete-house",
  "source": "Bozoki, Fulop & Ronyai 2010, Math. Comput. Modelling 52:318-333, DOI 10.1016/j.mcm.2010.02.047, Example 2 (Eq. 32-33) and Section 5",
  "matrix_null_is_missing": [
    [1, 5, 3, 7, 6, 6, 0.3333333333333333, 0.25],
    [0.2, 1, null, 5, null, 3, null, 0.14285714285714285],
    [0.3333333333333333, null, 1, null, 3, null, 6, null],
    [0.14285714285714285, 0.2, null, 1, null, 0.25, null, 0.125],
    [0.16666666666666666, null, 0.3333333333333333, null, 1, null, 0.2, null],
    [0.16666666666666666, 0.3333333333333333, null, 4, null, 1, null, 0.16666666666666666],
    [3, null, 0.16666666666666666, null, 5, null, 1, null],
    [4, 7, null, 8, null, 6, null, 1]
  ],
  "published": {
    "weights_llsm": [0.1770, 0.0676, 0.1770, 0.0197, 0.0367, 0.0415, 0.1422, 0.3385],
    "lambda_max_em_completion": 9.2981,
    "weights_em_completion": [0.1894, 0.0567, 0.2116, 0.0175, 0.0319, 0.0354, 0.1509, 0.3066]
  },
  "tolerance_vs_published": 5e-5
}
```

### Libraries (divergence only, never a reference)
- **pyDecision 5.1.8 `ahp_method(dataset, wd)`** (run): `wd='me'` = our eigen (≤ 1.7e‑13), `'g'` = RGMM, `'m'` (**default**) = additive. CR always uses the Saaty table and, for `'g'`/`'m'`, the approximate λ (F1a CR 0.0721 / 0.0764 vs Perron 0.0728). n = 2 → CR `nan`; n = 16 → `IndexError`.
- **pymcdm 1.4.0 `weights.subjective.AHP(matrix=…)`** (run): eigenvector via `np.linalg.eig` (= ours, 1.7e‑13); `get_cr()` uses the Golden & Wang RI (F1a 0.0731); n = 2 → 0; n = 16 → `IndexError` (missing `raise`). Also `AHP(ranking=…)` builds a matrix from a rank list (docstring weights reproduced) and an interactive console questionnaire (`object_names=`), which asks "1/3 … 9" per pair as text.
- **pyrepo-mcda 0.1.15 `mcda_methods.AHP`** (run): `_calculate_eigenvector` (scipy `eigs`) and `_geometric_mean` equal ours; `_normalized_column_sum` is row sums / grand total (not additive); `_check_consistency` prints CR with the Saaty table up to n = 10 only. Its public `__call__` is a min–max weighted sum, not AHP.

## Input UX (research for the shared AHP/BWM screen)

**How others ask** (each from the vendor's own documentation, read 2026-10-18; screenshots are described in those pages, we did not run the products):

| Tool | Per question | Layout | Consistency feedback | Fewer questions |
|---|---|---|---|---|
| **AHP-OS** (bpmsg.com, free; [calculator](https://bpmsg.com/ahp/ahp-calc.php), [Goepel 2018](https://doi.org/10.13033/ijahp.v10i3.590)) | Choose A or B ("Equal" default), then "How much more?" 1–9 (control type not stated in the page text) under "which criterion is more important, and how much more on a scale 1 to 9?"; scale legend 1/3/5/7/9 | All pairs as a list on one page; 2–20 criteria | CR after "Check Consistency" (not live); if CR > 10 %, the **top 3 inconsistent judgements are highlighted** (ε_ij = a_ij w_j/w_i); CR via Alonso–Lamata fit | Partial judgements across hierarchy nodes; no diagonals |
| **Expert Choice / Comparion** ([measurement methods](https://comparion.knowledgeowl.com/help/measurement-methods), [graphical](https://comparion.knowledgeowl.com/help/multi-pairwise-graphicalnumerical-comparisons), [verbal](https://comparion.knowledgeowl.com/help/single-pairwise-verbal-comparisons), [DTU compendium on EC desktop](https://backend.orbit.dtu.dk/ws/files/104238680/DTU_Transport_Compendium_Part_3_Group_decision_making_.pdf)) | Three modes: **verbal** (click words or between words on a bar between the two elements), **numerical** (slider of numbers), **graphical** (drag two bars whose length ratio is the judgement; > 9:1 typed) | One pair at a time **or** all pairs at once (per cluster); matrix view on desktop | Inconsistency ratio can be shown or hidden; desktop EC: "Inconsistency 1st … 9th" plus "**Best Fit**" value for the flagged cell | **Diagonals:** all pairs, first + second diagonal (2n − 3), or first only (n − 1); "minimum … not recommended unless pairwise graphical judgments" |
| **TransparentChoice** ([survey guide](https://manualspro.net/45747-transparent-choice-completing-a-criteria-weights-survey-software-user-guide), [AHP guide](https://www.transparentchoice.com/analytic-hierarchy-process)) | Radio: criterion 1 / criterion 2 / Equal; then (unless equal) a **9-point scale**; optional comment | Survey, one question per screen, Next | Per-person inconsistency score; navigation "by inconsistency" to revisit the worst answers; group session afterwards on disagreements | None found |
| **SpiceLogic AHP** ([step by step](https://spicelogic.com/docs/ahp-software), [CR page](https://spicelogic.com/docs/ahp-software/intro/ahp-consistency-ratio-transitivity-rule-388)) | **Slider** per pair (one pair at a time, Next arrow, dropdown to jump to any pair, "Completed" tick for a 1:1) | Wizard; "Matrix view" checkbox shows the full matrix, click a cell to edit; weight bar chart updates live | **CR shown live under the slider**, red above 0.10 | "Transitivity rule" checkbox: asks only n − 1, infers the rest (CR = 0 by construction) |

Also seen (research prototypes, not products): Super Decisions questionnaire with radio buttons, PriEsT "equalizer" sliders, and a transitive "data plot" widget that infers all comparisons from n − 1 handles (Casco et al., CIC Buenos Aires repository; search extract only).

**Findings for our screen:**
- Everybody asks **one pair as "A or B, then how much"**; the only difference is the control (radio row, slider, words, bars). A two-sided **17-position scale** (9 … 2 1 2 … 9) is the same thing in one control and works as a segmented row of 17 tap targets: 17 × 20 px = 340 px fits a 375 px phone with 16 px gutters if the numbers are hidden and only 1/3/5/7/9 ticks are labelled; tap targets below 24 px need the row to expand on focus, so on phones prefer two steps (pick side → 9 buttons in a 3 × 3 grid), which is TransparentChoice's pattern.
- **Live feedback wins:** SpiceLogic shows CR and weights live; AHP-OS only on demand. With our sizes (n ≤ 15, 105 cells) eigen + CR + n(n−1)/2 leave-one-out Laplacian solves are microseconds; compute on every answer.
- **Incomplete input is a trap for weights:** first + second diagonal only (2n − 3 answers, Comparion's option and BWM's count) vs the full matrix, on random judgement matrices n 4–9: median max |Δw| 0.026–0.056, p90 0.07–0.12, and the order of the weights differs in 58–68 % of cases. So: require all pairs for the final weights; use incomplete LLSM only for **provisional** weights while the user is still answering (shown as soon as the answered pairs connect all criteria, i.e. from n − 1 well-chosen answers).
- **Order the questions as a spanning path first** (1–2, 2–3, …, (n−1)–n, the first diagonal), then the rest: provisional weights appear after n − 1 answers, and every later answer is a consistency check whose suggestion can already be shown before the user answers ("your answers so far imply about 3").
- **The flag must come with a value:** Expert Choice's "Best Fit" and AHP-OS's highlight both use the weights that include the wrong answer; leave-one-out recovers the user's intended value 59 % vs 1 % (Algorithm step 4).

**Shared with BWM** (BWM card: best-to-others and others-to-worst, 2n − 3 answers, one-sided 1–9):
- Same **pair card**: two criterion chips, "which matters more / how much more", the 1–9 intensity buttons with the same five words, Next / Back, progress "k of K".
- Same **live panel**: weight bars + a consistency badge (AHP: CR with the 0.10 tick; BWM: its CR with its own threshold), "not applicable" for n ≤ 2.
- Same **storage** keyed by criterion name pairs (survives renames/reorders like `carryWeights`), and the same "most inconsistent answer → suggested value" row.
- Different: AHP needs the side choice (two-sided scale), BWM fixes the side (best always wins, worst always loses), and BWM starts with two picker steps (best, worst). A user switching AHP → BWM can keep the answers that are BWM questions (pairs with the best or the worst criterion).

## Implementation notes
- **Core:** `src/core/methods/ahp.ts`, a pure function `ahpWeights(upper: number[] | (number | null)[], n, { priority })` → `WeightingResult` with `diagnostics: { lambdaMax, ci, cr }` (`cr` = NaN for n ≤ 2), `warnings: [{ code: 'ahp.inconsistent' }]` when CR > 0.10, `steps`: `ahp.matrix` (n × n, axes criteria × criteria), `ahp.priorities` (vector), `ahp.lambda`, `ahp.cr` (scalars), `ahp.deviation` (matrix |ln ε|). A separate exported `ahpInconsistency(upper, n)` returns pairs sorted by |ln ε| with the leave-one-out suggestion (nearest of the 17 scale values).
- **Not a registry `WeightingMethod.compute(problem, params)`** as it stands: judgements are not part of `Problem` and `MethodParams` are only strings and numbers. Plug it in like `manual`/`equal` in `computeWeights` (`src/state/workbench.ts` ~l. 479–491): a `weightMethod === 'ahp'` branch that reads `pairwise` from the store and does not validate the decision matrix. Store `pairwise` keyed by criterion names (`"nameA\u0000nameB"` with a fixed order), carried across problem edits like `manualWeights` (`carryWeights`, l. 167); a removed criterion drops its pairs, a new one adds unanswered pairs.
- **Numerics:** power iteration (start 1/n, normalize, stop at 1e‑12 or 1,000 iterations); λ = mean((Aw)_i / w_i); geometric via `exp(mean(log a))`; additive by column sums. Incomplete LLSM: Laplacian solve of size n − 1 (Gaussian elimination is enough at n ≤ 15); connectivity by DFS before solving.
- **Validation:** answers ∈ the 17 scale values (UI), n ≤ 15 (`ahp.too-many-criteria`), all pairs answered for a final result (`ahp.incomplete` otherwise, with provisional weights in diagnostics when connected).
- **Reuse:** none of the existing weighting code fits (they all read the decision matrix). The steps view can reuse the matrix/vector step renderers; the deviation step reuses the signed-cell colouring of MABAC's Q.
- **Tests (Vitest):** F1a–c, F2 (`priority: 'additive'` vs published, Perron CR), F3 (incomplete LLSM vs published; the EM completion is not needed in TS); properties: consistent matrix (a_ij = w_i/w_j exact) → CR = 0 and w recovered; eigen = geometric for n = 3; reciprocal mirror; planted-error case flags the planted pair and suggests the original value; n = 2 → CR NaN, no warning; n = 16 → error; all "equal" → 1/n.

## Decisions for Fatih
1. **Scope: weights only** (recommended). AHP sets criteria weights from one n × n matrix and hands them to the existing ranking methods. Full AHP as a ranking method would need m(m−1)/2 more answers per criterion (5 alternatives × 5 criteria = 50 extra), ignores the decision matrix the site is built around, and brings AHP's distributive-mode rank reversal; its plus is familiarity (Turkish theses do full AHP, e.g. Doğuç 2022). Alternative: a later separate "AHP ranking" decision.
2. **Priority method: eigenvector by default, options `geometric` and `additive`** (recommended). Eigen reproduces Saaty; additive reproduces most Turkish papers (F2) and pyDecision's default; geometric is the closed-form/group-friendly one. CR always from the Perron root. Alternative: eigen only (simplest; users of additive papers see 0.005 differences).
3. **RI table: Saaty's (0.58, 0.90, …, 1.59) for n 3–15** (recommended), labelled with its source in the steps view. It is what papers and pyDecision use, so published CRs reproduce (Saaty 1988 house .117 at n = 3 needs it; A&L would give 0.129). Alonso–Lamata is statistically better (our Monte Carlo agrees to 0.002) but changes verdicts only near the threshold (CR at the line moves by ≤ 0.01 for n ≥ 4). Alternative: Alonso–Lamata table everywhere, like AHP-OS.
4. **CR > 0.10: warn, never block** (recommended). Weights are shown and usable; the CR badge turns to warning colour; the top inconsistent answer is shown with its leave-one-out suggestion and a one-tap "use {v}". Real users exceed 0.10 more often than not (Goepel 2013 median 0.16). Alternative: block ranking until CR ≤ 0.10 (Saaty's strict reading; would stall most users).
5. **Input: one pair per card, all pairs required, spanning-path order, live weights and CR** (recommended). Phone: two taps (side, then 1–9 in a 3 × 3 grid with words on 1/3/5/7/9); desktop: same card plus a compact list/matrix of all pairs for jumping. Integers only (no 1.1–1.9). Incomplete input only as provisional weights. Shared component with BWM. Alternatives: a full editable matrix (fast for experts, error-prone on phones), a 17-step slider (one control, but small targets on phones).
6. **Group decisions: out of scope for now** (recommended). The site has one user and no shared state; AIJ (geometric mean of judgements, Forman & Peniwati 1998, AHP-OS's choice) is easy to add later because it is just another matrix, but it hides disagreement (3 vs 1/3 → 1) and needs a consensus measure to be honest. Alternative: allow pasting several upper-triangle vectors and aggregate geometrically, with a "disagreement" note per pair.
7. **Upper limit: AHP available for 2–15 criteria** (recommended), with the question count shown up front and a BWM hint from n ≥ 8 (28+ questions). Alternative: allow n > 15 with the Alonso–Lamata fit for RI.

## Sources
- Saaty, T.L. (2008). *IJSS* 1(1):83–98, DOI 10.1504/IJSSCI.2008.017590 — read 2026-09-29 (third-party copy, Tables 1–8); copy unreachable 2026-10-18; every number used here re-derived numerically (F1).
- Saaty (1977) DOI 10.1016/0022-2496(77)90033-5; Saaty (1980) book; Saaty (1990) *EJOR* 48:9–26, DOI 10.1016/0377-2217(90)90057-I (ISAHP copy's host unreachable on 18.10; house weights seen on AHP-OS example page `ahp-hierarchy.php?sc=expl08`, matrix not shown); Saaty (2003) on the principal eigenvector (cited by Goepel, not read); Saaty (2004) *JSSSE* 13:1–35 (abstract only); Saaty (1988) ISAHP "How to make a decision" (read 29.09 via exa text, house matrix CR .117); Crawford & Williams (1985): **not read**, Crossref metadata (2026-10-18).
- Alonso, J.A. & Lamata, M.T. (2006). *IJUFKS* 14(4):445–459 — **read in full** (slideblast copy of the published PDF): Table 1 (Oak Ridge, Wharton/Saaty, Golden–Wang, Lane–Verdini, Forman, Noble, Tummala–Wan, Aguarón, A&L), Table 2, Eqs. 6–9, 19–22, Table 6.
- Goepel, K.D. (2018). *IJAHP* 10(3):469–487, DOI 10.13033/ijahp.v10i3.590 — **read in full** (§2.2 power method, §2.3 Alonso–Lamata CR, §2.4 top-3 inconsistencies Eq. 6, Table 1 scales, §3.2 partial judgements, §4 WGM-AIJ and consensus, §5 uncertainty). Goepel (2013) ISAHP, "Implementing the AHP as a standard method … Excel template" — read (§2.2, §4.1, §4.3: CR distribution of 80 participants, 4–10 elements per group). AHP-OS calculator page read (2–20 criteria, A/B + 1–9, "Check Consistency").
- Bozóki, S., Fülöp, J. & Rónyai, L. (2010). *Math. Comput. Modelling* 52:318–333 — author's manuscript **read in full** (Theorems 2, 4; Example 2; Section 5; van Uden triads §6). Harker (1987a, b) incomplete AHP: cited there, not read.
- Doğuç, Ö. (2022). *Ekonomi, İşletme ve Maliye Araştırmaları Dergisi* 4(2):126–145, DOI 10.38009/ekimad.1142952 — **read in full** (DergiPark article-file 2535040). Sönmez & Tandoğan Öney (2021), DOI 10.17482/uumfd.807265 (4 × 4, weights to 2 d.p.; snippet only, not used).
- Forman, E. & Peniwati, K. (1998). *EJOR* 108:165–169, DOI 10.1016/S0377-2217(97)00244-0 — Crossref only; AIJ properties as summarized by Goepel (2018).
- UX: Comparion help pages (measurement methods, multi-pairwise graphical/numerical, single pairwise verbal, PDF table of contents incl. "Show or Hide Inconsistency Ratio"); DTU Transport compendium on Expert Choice desktop (verbal/numerical/graphical modes, "Inconsistency 1st", "Best Fit"); TransparentChoice survey guide (manualspro mirror) and AHP guide; SpiceLogic docs (step-by-step, CR and transitivity rule); Casco et al., "A user interface design for consistent pairwise comparisons" (CIC repository). AHP-OS calculator and Comparion "single pairwise verbal" read as full page text (WebFetch); the other Comparion pages, SpiceLogic, TransparentChoice, the DTU compendium and Casco et al. as search extracts (Exa highlights, several paragraphs each). Images not seen.
- Code read and run 2026-10-18: pyDecision 5.1.8 `algorithm/ahp.py`; pymcdm 1.4.0 `weights/subjective/ahp.py`; pyrepo-mcda 0.1.15 `mcda_methods/ahp.py`; this repo `src/core/types.ts`, `src/state/workbench.ts` (`computeWeights`, `carryWeights`), `src/features/illustrations/ideaSteps.ts`, `src/app/methods/views/critic.pictures.tsx`.
- Recompute: `docs/research/scripts/ahp.py` (numpy 2.5.4, scipy), output `docs/research/scripts/ahp.out` (library section from a scratch venv with the three libraries; seed 20261018; about 50 s).

## Changes on re-verification (2026-10-18)
- **Scope** fixed to criteria weighting; ranking-AHP moved to Decision 1. Inputs now the upper-triangle answers, not a typed matrix.
- **RI:** draft listed Saaty's table only and said n ≥ 11 was unverified. Now three published tables compared with our own 100k-per-n Monte Carlo (agrees with Alonso & Lamata to 0.002; Saaty off by up to 0.057 and non-monotone at n = 12); pymcdm's table identified as Golden & Wang.
- **Inconsistency aid:** draft suggested max a_ij w_j/w_i only. Now measured on planted errors (all rules ~98 % find the pair) and the suggested value changed to leave-one-out LLSM (59 % vs 1 % recovery).
- **New fixtures F2** (Turkish, additive, all numbers MATCH, λ approximation shown) and **F3** (incomplete, LLSM and EM completion MATCH). F1 unchanged (still MATCH; typos still hold).
- **EVM vs RGMM** quantified on random matrices; libraries re-run on the current versions (pyDecision 5.1.8 instead of 5.1.1; pymcdm and pyrepo-mcda added) with their n = 2 and n > 15 behaviour.
- **Added:** Input UX research and shared BWM screen, visual proposal with 4 idea steps, site bullets and labels, implementation plan against the actual store, Decisions.
- **Not verified:** Saaty 1977/1980 originals (paywall), Saaty 2008 re-read (copy offline), Saaty 1990 house matrix, Harker 1987, Forman & Peniwati 1998, Crawford & Williams 1985 (metadata only), GCI thresholds; the vendors' screens were read from their documentation, not used live.
