# Multi-Objective Optimization on the basis of Ratio Analysis (MOORA) — Ratio System

**Re-verified 2026-10-24** against primary sources (full texts of Brauers & Zavadskas 2006 origin paper, Brauers & Zavadskas 2010 / 2012 MULTIMOORA project-selection papers, Brauers et al. 2008 contractor paper, Vujičić et al. 2017, Hafezalkotob et al. 2019 survey). Five published fixtures recomputed independently (`docs/research/scripts/moora.py`, output in `docs/research/scripts/moora.out`): **MATCH**. See "Changes on re-verification" at the end.

## 1. Identity
- **Family:** ranking (compensatory, ratio system on vector-normalized matrix)
- **Origin:** Brauers, W.K.M.; Zavadskas, E.K. (2006). The MOORA method and its application to privatization in a transition economy. *Control and Cybernetics* 35(2):445–469 (full PDF read via Biblioteka Nauki: https://bibliotekanauki.pl/articles/969961.pdf; EuDML: https://eudml.org/doc/209425; no DOI). Weighted form (significance coefficients $w_j$) in Brauers & Zavadskas (2006, §4, p. 456–457), Brauers & Zavadskas (2009), *Technological and Economic Development of Economy* 15(2):352–375, doi:10.3846/1392-8619.2009.15.352-375, and Brauers & Zavadskas (2010), *Technological and Economic Development of Economy* 16(1):5–24, doi:10.3846/tede.2010.01.
- **Popularity:** Crossref cited-by: 575 for Brauers & Zavadskas 2010 (MULTIMOORA), 156 for Brauers et al. 2008 (contractors); the 2006 origin paper has ~976 citations in Exa/Biblioteka Nauki. In Kocatürk Çetin (2023, *SDÜ İİBF Dergisi* 28(3):365–385, Tablo 8), MOORA appears 14 times among 196 Turkish MCDM articles of 2021.

## 2. Plain-language explanation
- **EN:** MOORA divides each value by the Euclidean length of its column, multiplies by the criterion weight, adds the weighted benefit values and subtracts the weighted cost values:
  - What it takes in: a table of alternatives and criteria (benefit or cost) and criterion weights $w_j$ summing to 1.
  - What it does: divides every value by the square root of the sum of squares of its column ($x^*_{ij} = x_{ij} / \sqrt{\sum_i x_{ij}^2}$), multiplies by the criterion weight ($v_{ij} = w_j x^*_{ij}$), adds the benefit columns ($S^+_i$) and subtracts the cost columns ($S^-_i$).
  - What comes out: a net assessment score $y_i = S^+_i - S^-_i$ for each alternative (which can be negative when cost criteria outweigh benefit criteria); higher $y_i$ ranks better.
- **TR:** MOORA her değeri sütununun Öklid uzunluğuna böler, kriter ağırlığıyla çarpar, ağırlıklı fayda değerlerini toplar ve ağırlıklı maliyet değerlerini çıkarır:
  - Ne alır: alternatif-kriter tablosu (fayda veya maliyet yönlü) ve toplamı 1 olan kriter ağırlıkları $w_j$.
  - Ne yapar: her değeri sütunundaki kareler toplamının kareköküne böler ($x^*_{ij} = x_{ij} / \sqrt{\sum_i x_{ij}^2}$), kriter ağırlığıyla çarpar ($v_{ij} = w_j x^*_{ij}$), fayda sütunlarını toplar ($S^+_i$) ve maliyet sütunlarını çıkarır ($S^-_i$).
  - Ne çıkarır: her alternatif için $y_i = S^+_i - S^-_i$ net değerlendirme skoru (maliyet kriterleri ağır bastığında negatif olabilir); büyük $y_i$ daha üst sırada yer alır.

## 3. When to use / When not to use
- **Use when:**
  - Criteria are measured in incompatible units (currency, percentages, years, headcount) and you want a fast, transparent ratio score without ideal/anti-ideal distance calculations (Brauers & Zavadskas 2006, §1.2, §3).
  - The matrix contains zeros or negative values (e.g. net profit/loss or balance-of-payments changes, as in Brauers & Zavadskas 2006 Table 3a, p. 454; 2012 §7.1, p. 33) where reciprocal cost normalizations ($min/x$) or multiplicative forms fail.
  - All criteria are benefit or all criteria are cost: unlike COPRAS, MOORA subtracts $S^-_i$ from $S^+_i$ and never divides by the cost sum.
- **Do not use when:**
  - Strong non-compensation is required so that a severe weakness on one criterion cannot be offset by gains on others — the Ratio System is fully compensatory; use the Reference Point ($L_\infty$) approach, VIKOR, or an outranking method instead (Brauers & Zavadskas 2006, §5–7; Hafezalkotob et al. 2019, §2.2).
  - Criteria are measured on arbitrary interval scales where shifting a column by a constant ($x_{ij} \to x_{ij} + b_j$) should leave the ranking unchanged — vector normalization is scale-invariant for $a_j > 0$ ($x_{ij} \to a_j x_{ij}$), but not shift-invariant.

## 4. Mathematical specification
Given decision matrix $X = (x_{ij}) \in \mathbb{R}^{m \times n}$ ($m \ge 2$ alternatives, $n \ge 1$ criteria), criterion types $t_j \in \{\text{benefit}, \text{cost}\}$ partitioning $\{1,\dots,n\}$ into benefit set $B$ and cost set $C$, and weights $w_j \ge 0$ with $\sum_{j=1}^n w_j = 1$:

1. **Vector normalization** (Van Delft & Nijkamp 1977; Brauers & Zavadskas 2006, Eq. 2):
   $$x^*_{ij} = \frac{x_{ij}}{\sqrt{\sum_{k=1}^{m} x_{kj}^2}}, \quad i=1,\dots,m,\; j=1,\dots,n$$
   If a column is all zeros ($\sqrt{\sum_{k=1}^m x_{kj}^2} = 0$), set $x^*_{ij} = 0$ for all $i$ and emit warning `moora.zero-column`. For non-negative data $x^*_{ij} \in [0, 1]$; when negative entries are present $x^*_{ij} \in [-1, 1]$ (Brauers & Zavadskas 2012, p. 33).

2. **Weighted normalized matrix** (Brauers & Zavadskas 2006, §4; 2009; 2010; 2012 Eq. 2bis; Vujičić et al. 2017, Eq. 12; Hafezalkotob et al. 2019, Eq. 3):
   $$v_{ij} = w_j \, x^*_{ij}$$
   *(Note: In unweighted presentations where $w_j = 1$ for all $j$, $y^*_i = \sum_{j \in B} x^*_{ij} - \sum_{j \in C} x^*_{ij}$. Under normalized equal weights $w_j = 1/n$, $v_{ij} = x^*_{ij}/n$, scaling $S^+_i, S^-_i, y_i$ by $1/n$ while preserving every ratio and rank identically.)*

3. **Benefit and cost sums per alternative**:
   $$S^+_i = \sum_{j \in B} v_{ij}, \qquad S^-_i = \sum_{j \in C} v_{ij}$$
   (with $S^+_i = 0$ if $B = \emptyset$ and $S^-_i = 0$ if $C = \emptyset$).

4. **Net assessment score (Ratio System)** (Brauers & Zavadskas 2006, Eq. 3; 2010 Eq. 2):
   $$y_i = S^+_i - S^-_i = \sum_{j \in B} w_j x^*_{ij} - \sum_{j \in C} w_j x^*_{ij}$$

5. **Ranking**: Sort alternatives by $y_i$ in **descending** order (largest $y_i$ gets rank 1; ties within `RANK_TIE_TOLERANCE = 1e-9` share the top rank of the tied group, Competition `1224` ranking).

### Algebraic properties (verified in `docs/research/scripts/moora.py` across 2,000 random matrices)
- **Column positive-scale invariance:** Rescaling column $j$ by $a_j > 0$ ($x_{ij} \to a_j x_{ij}$) leaves $x^*_{ij}$, $v_{ij}$, $S^+_i$, $S^-_i$, and $y_i$ identical ($\max|\Delta y| = 2.2 \times 10^{-16}$).
- **Weight proportionality:** Scaling all weights by $c > 0$ ($w \to c w$) scales $S^+_i$, $S^-_i$, and $y_i$ by $c$ ($\max|y(cw) - c y(w)| = 2.7 \times 10^{-15}$) and leaves rankings invariant. In particular, equal weights $w_j = 1/n$ give $y_i = y^*_i / n$.
- **Reduction to vector-normalized WSM on all-benefit problems:** When $C = \emptyset$, $S^-_i = 0$ and $y_i = \sum_{j=1}^n w_j x^*_{ij}$.
- **Shift non-invariance:** Adding a positive constant $b_j$ to column $j$ ($x_{ij} \to x_{ij} + b_j$) changes the column norm $\sqrt{\sum_i (x_{ij} + b_j)^2}$ non-linearly and changed the ranking in 1,090 / 2,000 (54.5%) random test problems.

## 5. Variants & parameters
- **Implemented:** Weighted MOORA **Ratio System** ($y_i = S^+_i - S^-_i$, no extra method parameters; uses the workbench criterion weights $w_j$).
- **Not implemented as separate parameters (documented on the method card):**
  - **Reference Point approach** (Brauers & Zavadskas 2006, Eq. 4): maximal objective reference point $r_j = \max_i x^*_{ij}$ for $j \in B$, $\min_i x^*_{ij}$ for $j \in C$; Tchebycheff ($L_\infty$) deviation $z_i = \max_j w_j |r_j - x^*_{ij}|$, ranked ascending.
  - **Full Multiplicative Form & MULTIMOORA** (Brauers & Zavadskas 2010): $U'_i = \prod_{j \in B} x_{ij}^{w_j} / \prod_{j \in C} x_{ij}^{w_j}$, combined with Ratio System and Reference Point via dominance theory.

## 6. Commonly combined with
- **Equal weights:** Used in the foundational simulations of Brauers & Zavadskas (2006, Tables 1 and 5) and Brauers & Zavadskas (2010, Appendix C Table 2; 2012, Appendix C Table 5).
- **Entropy and CRITIC:** Vujičić, Papić & Blagojević (2017), *Tehnika* 72(3):422–429, doi:10.5937/tehnika1703422V, pair both Entropy (Table 7a) and CRITIC (Table 7b) with MOORA for air-conditioner selection. In Hafezalkotob et al. (2019, *Information Fusion* 51:145–177, Table 3), Entropy is the single most frequent weighting method paired with MOORA/MULTIMOORA, and CRITIC is among the main statistical objective weighting methods.
- **AHP and BWM:** Hafezalkotob et al. (2019, Table 3) report AHP as the most frequent subjective weighting method paired with MOORA/MULTIMOORA (e.g. Chakraborty 2011, *Int J Adv Manuf Technol* 54:1155–1166), alongside BWM and SWARA.
- **Compared side by side with:** SAW (Vujičić et al. 2017), TOPSIS (Brauers & Zavadskas 2006, §5.3), MABAC and COPRAS and VIKOR (Pamučar & Ćirović 2015, *Expert Systems with Applications* 42(6):3016–3028, Tables 16–20), CoCoSo and WASPAS and EDAS (Yazdani et al. 2019, *Management Decision* 57(9):2501–2519, Tables IX & XI).

## 7. Known pitfalls & edge cases
1. **Negative net scores $y_i < 0$ are normal when cost criteria carry more weight than benefit criteria:** Because $y_i = S^+_i - S^-_i$, whenever $\sum_{j \in C} w_j > \sum_{j \in B} w_j$ (as in Vujičić et al. 2017, where 3 of 5 criteria are cost with total weight 0.790 under Entropy and 0.582 under CRITIC), every alternative has $y_i < 0$. Alternatives are still ranked by $y_i$ descending (closest to zero / least negative is best).
2. **All-zero column:** If $\sum_{i=1}^m x_{ij}^2 = 0$, the Euclidean norm is 0. Following `topsis.zero-column`, the column is left as all zeros and `moora.zero-column` is emitted as a warning.
3. **Negative and zero matrix values:** Allowed without restriction (unlike SAW `linearMax`, WASPAS, COPRAS, MARCOS, or MEREC). A negative entry on a benefit criterion reduces $S^+_i$; a negative entry on a cost criterion reduces $S^-_i$ (increasing $y_i = S^+_i - S^-_i$).
4. **Equal-weight scaling ($w_j = 1/n$ vs $w_j = 1$):** Unweighted MOORA papers sum unscaled $x^*_{ij}$ ($w_j = 1$), producing $y^*_i = n \cdot y_i$ where $y_i$ uses normalized equal weights $w_j = 1/n$. Rankings and relative score ratios are identical.

## 8. Worked numerical examples (fixtures)

### Fixture 1 (Primary workbench example): Brauers & Zavadskas (2010), Appendix C Table 2 — Project management
- **Citation:** Brauers, W.K.M.; Zavadskas, E.K. (2010). Project management by MULTIMOORA as an instrument for transition economies. *Technological and Economic Development of Economy* 16(1):5–24, doi:10.3846/tede.2010.01, Appendix C Table 2 (2a raw matrix, 2b sum of squares and square roots, 2c objectives divided by their square roots and MOORA). Reprinted identically in Brauers & Zavadskas (2012), *E+M Ekonomie a Management* 15(1):28–43, Appendix C Table 5.
- **Setup:** 3 projects (`Project A`, `Project B`, `Project C`) × 9 objectives (7 benefit, 2 cost: Payback period and Risk), equal weights ($w_j = 1/9$ in the workbench; $w_j = 1$ in the printed table).
- **Fixture file:** `tests/fixtures/moora-brauers-zavadskas2010.json`
  - Matrix:
    - Project A: `[1, 14, 9, 200, 600, 20, 20, 3.5, 2.5]`
    - Project B: `[1.6, 16, 7, 150, 800, 13.5, 25, 4, 1.5]`
    - Project C: `[2, 17, 5, 80, 1200, 10, 30, 3.8, 1.25]`
  - Unweighted ($w_j = 1$): $S^+ = [4.113538, 3.855209, 3.783400]$, $S^- = [1.178740, 1.132056, 1.085373]$, $y^* = [2.934799, 2.723153, 2.698027]$ vs published `[2.93480, 2.723, 2.698]` ($\max|\Delta| = 1.53 \times 10^{-4}$, matching every printed digit).
  - Equal weights ($w_j = 1/9$): $S^+ = [0.457060, 0.428357, 0.420378]$, $S^- = [0.130971, 0.125784, 0.120597]$, $y = [0.326089, 0.302573, 0.299781]$, ranks `[1, 2, 3]` (**MATCH**).

### Fixture 2 (Origin paper): Brauers & Zavadskas (2006), Tables 1 and 5 — Privatization in a transition economy
- **Citation:** Brauers, W.K.M.; Zavadskas, E.K. (2006). The MOORA method and its application to privatization in a transition economy. *Control and Cybernetics* 35(2):445–469, Table 1 (p. 450, welfare economy, 3 projects × 7 objectives: 6 benefit, 1 cost) and Table 5 (p. 464, wellbeing economy, 3 projects × 8 objectives: 6 benefit, 2 cost).
- **Fixture file:** `tests/fixtures/moora-brauers-zavadskas2010.json` (`origin2006_table1`, `origin2006_table5`)
  - **Table 1:** Unweighted $y^* = [3.167587, 2.742483, 2.493144]$ vs published `[3.16759, 2.74248, 2.49314]` ($\max|\Delta| = 3.1 \times 10^{-6}$); equal-weight ($w_j = 1/7$) $y = [0.452512, 0.391783, 0.356163]$, ranks `[1, 2, 3]` (**MATCH**).
  - **Table 5:** Unweighted $y^* = [2.4802701, 2.1516959, 2.1260073]$ vs published `[2.4802701, 2.151696, 2.126007]` ($\max|\Delta| = 3.1 \times 10^{-7}$); equal-weight ($w_j = 1/8$) $y = [0.310034, 0.268962, 0.265751]$, ranks `[1, 2, 3]` (**MATCH**).

### Fixture 3 (Secondary weighted fixtures): Vujičić, Papić & Blagojević (2017), Tables 7a and 7b Variant 1 — Air conditioners
- **Citation:** Vujičić, M.D.; Papić, M.Z.; Blagojević, M.D. (2017). Comparative analysis of objective techniques for criteria weighing in two MCDM methods on example of an air conditioner selection. *Tehnika* 72(3):422–429, doi:10.5937/tehnika1703422V, Table 2 (9 air conditioners × 5 criteria: 2 benefit, 3 cost), Table 4 (Entropy weights), Table 6 (CRITIC weights), Table 7a Variant 1 (MOORA–Entropy), Table 7b Variant 1 (MOORA–CRITIC).
- **Fixture file:** `tests/fixtures/moora-vujicic2017.json`
  - **Table 7a Variant 1 (Entropy → MOORA):** $S^+ = [0.065071, 0.068616, 0.068716, 0.058035, 0.065596, 0.074551, 0.066849, 0.066694, 0.090947]$, $S^- = [0.230667, 0.288938, 0.222548, 0.287716, 0.311804, 0.235452, 0.186831, 0.278759, 0.292806]$, $y = [-0.165597, -0.220322, -0.153831, -0.229681, -0.246208, -0.160900, -0.119982, -0.212065, -0.201859]$, ranks `[4, 7, 2, 8, 9, 3, 1, 6, 5]` vs published `[4, 7, 2, 8, 9, 3, 1, 6, 5]` (**9/9 MATCH**, also identical when using the 3 d.p. printed Entropy weights).
  - **Table 7b Variant 1 (CRITIC → MOORA):** $S^+ = [0.131570, 0.136886, 0.137978, 0.132637, 0.126188, 0.146037, 0.139837, 0.138148, 0.158127]$, $S^- = [0.169892, 0.208899, 0.171444, 0.210506, 0.220936, 0.178982, 0.142379, 0.202228, 0.219344]$, $y = [-0.038322, -0.072013, -0.033466, -0.077869, -0.094748, -0.032945, -0.002542, -0.064079, -0.061217]$, ranks `[4, 7, 3, 8, 9, 2, 1, 6, 5]` vs published `[4, 7, 3, 8, 9, 2, 1, 6, 5]` (**9/9 MATCH**).

### Rejected candidate: Brauers, Zavadskas, Turskis & Vilutienė (2008), Table 2 — Contractor ranking
- **Citation:** Brauers, W.K.M.; Zavadskas, E.K.; Turskis, Z.; Vilutienė, T. (2008). Multi-objective contractor's ranking by applying the MOORA method. *Journal of Business Economics and Management* 9(4):245–255, doi:10.3846/1611-1699.2008.9.245-255.
- **Reason for rejection as test fixture:** Internally inconsistent between Table 2a (raw inputs) and Table 2b (normalized values). For column $x_2$, Table 2a has $\sqrt{\sum_i x_{i2}^2} = 2695.904$, giving $x^*_{1,2} = 1995 / 2695.904 = 0.7400$, whereas Table 2b prints $0.8586$ (implying a denominator of $\approx 2323.5$). Columns $x_6, x_7, x_8$ show similar denominator discrepancies, shifting the top-3 ranking from the paper's printed `A12 > A7 > A1` to `A1 > A7 > A12` when recomputed from Table 2a. Documented in `docs/research/scripts/moora.py` and in the method card's `reference.note`.

## 9. Python reference implementation
See `docs/research/scripts/moora.py` (output saved in `docs/research/scripts/moora.out`).

## 10. Sources
- Brauers, W.K.M.; Zavadskas, E.K. (2006). The MOORA method and its application to privatization in a transition economy. *Control and Cybernetics* 35(2):445–469. Full PDF: https://bibliotekanauki.pl/articles/969961.pdf (EuDML: https://eudml.org/doc/209425).
- Brauers, W.K.M.; Zavadskas, E.K. (2009). Robustness of the multi-objective MOORA method with a test for the facilities sector. *Technological and Economic Development of Economy* 15(2):352–375, doi:10.3846/1392-8619.2009.15.352-375.
- Brauers, W.K.M.; Zavadskas, E.K. (2010). Project management by MULTIMOORA as an instrument for transition economies. *Technological and Economic Development of Economy* 16(1):5–24, doi:10.3846/tede.2010.01.
- Brauers, W.K.M.; Zavadskas, E.K. (2012). A multi-objective decision support system for project selection with an application for the Tunisian textile industry. *E+M Ekonomie a Management* 15(1):28–43.
- Brauers, W.K.M.; Zavadskas, E.K.; Turskis, Z.; Vilutienė, T. (2008). Multi-objective contractor's ranking by applying the MOORA method. *Journal of Business Economics and Management* 9(4):245–255, doi:10.3846/1611-1699.2008.9.245-255.
- Vujičić, M.D.; Papić, M.Z.; Blagojević, M.D. (2017). Comparative analysis of objective techniques for criteria weighing in two MCDM methods on example of an air conditioner selection. *Tehnika* 72(3):422–429, doi:10.5937/tehnika1703422V.
- Hafezalkotob, A.; Hafezalkotob, A.; Liao, H.; Herrera, F. (2019). An overview of MULTIMOORA for multi-criteria decision-making: Theory, developments, applications, and challenges. *Information Fusion* 51:145–177, doi:10.1016/j.inffus.2018.12.002.

## 11. Changes on re-verification (2026-10-24)
- **Origin paper (Brauers & Zavadskas 2006) read in full** (`bibliotekanauki.pl/articles/969961.pdf`): extracted and verified both privatization simulations (Table 1 welfare economy, 3×7, max diff `3.1e-6`; Table 5 wellbeing economy, 3×8, max diff `3.1e-7`).
- **Corrected Fixture 1 input matrix in `moora.md`:** The draft `moora.md` had paired the raw matrix from Table 1 of Brauers & Zavadskas (2010) (`[[800, 0.14, 0.25, ...]]`, used in the paper's text only for the Multiplicative Form) with the MOORA Ratio System scores $y^* = [2.93480, 2.723, 2.698]$ and Reference Point deviations $[0.38411, 0.315244, 0.457164]$ from Appendix C Table 2 (`[[1, 14, 9, 200, 600, 20, 20, 3.5, 2.5], [1.6, 16, 7, 150, 800, 13.5, 25, 4, 1.5], [2, 17, 5, 80, 1200, 10, 30, 3.8, 1.25]]`, reprinted in Brauers & Zavadskas 2012 Appendix C Table 5). Replaced with the true Appendix C Table 2 matrix, which reproduces every printed norm, normalized cell, $y^* = [2.93480, 2.723, 2.698]$ (to `1.5e-4`), and Reference Point deviation (`[0.384111, 0.315244, 0.457164]`).
- **Added secondary weighted fixtures (`tests/fixtures/moora-vujicic2017.json`):** Vujičić et al. (2017) Table 7a Variant 1 (Entropy → MOORA, 9/9 rank match) and Table 7b Variant 1 (CRITIC → MOORA, 9/9 rank match).
