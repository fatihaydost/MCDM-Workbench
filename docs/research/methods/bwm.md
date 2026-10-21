# Best-Worst Method (BWM)

**Re-verified 2026-10-18** against the three primary papers (Rezaei 2015, model, CI and Table 5, read through a full-text extract; Rezaei 2016, linear model and interval analysis, read in full; Liang, Brunelli & Rezaei 2020, input-based CR and thresholds, read in full), Rezaei's own review (2026, CC BY, consistency section read), the closed form of the linear model (Ratandhara & Kumar, arXiv 2506.17666, Theorems 2–3 and Examples 1–4 read) and Rezaei's official Excel solver (BWM-Solver-6.xlsx, every formula read). Five fixture groups recomputed (`scripts/bwm.py`, output `scripts/bwm.out`), two of them Turkish, plus pyDecision 5.1.8. See "Changes on re-verification" at the end.

- **Family:** weighting (subjective: two vectors of 1–9 judgements against two anchor criteria, the best and the worst; weights from a min–max fit)
- **Origin:**
  - Rezaei, J. (2015). Best-worst multi-criteria decision-making method. *Omega* 53:49–57, DOI [10.1016/j.omega.2014.11.009](https://doi.org/10.1016/j.omega.2014.11.009). Non-linear min–max model (6), consistency index (Eq. 8, Table 1), Example 1 and Table 5 (64 cases). Read through Exa's full-text extract of a copy on expertchoice.ir (sections 2–3, Tables 1, 4, 5, 7); publisher version not opened.
  - Rezaei, J. (2016). Best-worst multi-criteria decision-making method: Some properties and a linear model. *Omega* 64:126–130, DOI [10.1016/j.omega.2015.12.001](https://doi.org/10.1016/j.omega.2015.12.001). **Linear model** (unique solution), multiple optima of the non-linear model and their intervals, Examples 1–3. Accepted manuscript read in full.
  - Liang, F., Brunelli, M. & Rezaei, J. (2020). Consistency issues in the best worst method: Measurements and thresholds. *Omega* 96:102175, DOI [10.1016/j.omega.2019.102175](https://doi.org/10.1016/j.omega.2019.102175). Input-based CR (Eqs. 6–7), ordinal ratio (Eqs. 8–11), thresholds (Tables 3–4). Final version (TU Delft repository) read in full.
- **Popularity:** Crossref cited-by 3,931 (2015), 1,564 (2016), 362 (Liang 2020) on 2026-10-18 (3,877 / 1,543 on 29.09). Rezaei (2026) calls the linear variant "arguably the most widely applied". Turkish use is common (DergiPark: BWM–TOPSIS, BWM–CoCoSo, BWM vs FUCOM, personnel selection; two read in full, the rest snippets).

## For users (site copy)
- **EN:** In BWM you pick the most important and the least important criterion, say how much more important the first is than the second, then compare every other criterion with these two (1–9). That is 2n − 3 judgements instead of AHP's n(n − 1)/2, and BWM finds the weights that fit them best.
- **TR:** BWM'de en önemli ve en önemsiz kriteri seçer, birincinin ikinciden ne kadar önemli olduğunu söyler, sonra diğer her kriteri bu ikisiyle karşılaştırırsınız (1–9). AHP'deki n(n − 1)/2 yerine 2n − 3 yargı yeterlidir; BWM bu yargılara en iyi uyan ağırlıkları bulur.

**When to use / combined with (site bullets, one sentence each, each backed by sources read in full unless marked):**
- **EN:** Use it when the weights should come from your judgement rather than from the data, and you would rather answer a few questions than fill a full comparison table. *(Rezaei 2015 §2; 9 criteria: 15 questions instead of AHP's 36)*
  **TR:** Ağırlıklar veriden değil sizin yargınızdan gelsin istiyorsanız ve tam bir karşılaştırma tablosu doldurmak yerine birkaç soru yanıtlamayı tercih ediyorsanız kullanın.
- **EN:** Your answers are consistent when "best over a criterion" times "that criterion over worst" equals "best over worst"; the page checks this while you type and points to the answer that fits worst. *(Liang et al. 2020, Eqs. 6–7 and Table 1; Rezaei 2026 §4)*
  **TR:** "En iyinin bir kritere üstünlüğü" ile "o kriterin en kötüye üstünlüğü"nün çarpımı "en iyinin en kötüye üstünlüğü"ne eşitse yanıtlarınız tutarlıdır; sayfa bunu siz yazarken denetler ve en az uyan yanıtı gösterir.
- **EN:** BWM only weights; published studies pass its weights to TOPSIS, CoCoSo or MABAC to rank the alternatives. *(TOPSIS: Zengin Taşdemir, DergiPark 2374395, snippet; CoCoSo: Mühendislik Bilimleri Dergisi 2978441, snippet; MABAC: Telli & Ayçin 2021 cited in Arsu & Uğuz Arsu 2021)*
  **TR:** BWM yalnız ağırlık verir; yayımlanmış çalışmalar bu ağırlıklarla TOPSIS, CoCoSo ya da MABAC'ta alternatifleri sıralar.
- **EN:** Be careful: with more than about nine criteria the questions get hard to answer well; Rezaei suggests grouping criteria and weighing each group separately. *(Rezaei's Excel solver, sheet "C>9"; Liang's thresholds stop at n = 9)*
  **TR:** Dikkat: dokuz civarından fazla kriterde soruları iyi yanıtlamak zorlaşır; Rezaei kriterleri gruplayıp her grubu ayrı ağırlıklandırmayı önerir.

**UI labels:** inputs EN "Most important (best)" / TR "En önemli (en iyi)", EN "Least important (worst)" / TR "En önemsiz (en kötü)", EN "Best over others" / TR "En iyinin diğerlerine üstünlüğü", EN "Others over worst" / TR "Diğerlerinin en kötüye üstünlüğü"; result EN "Consistency (CR)" / TR "Tutarlılık (CR)" with the threshold beside it; steps EN "Deviation ξ" / TR "Sapma ξ". Scale words (shared with AHP): 1 EN "equal" / TR "eşit", 3 "moderately" / "biraz", 5 "strongly" / "güçlü", 7 "very strongly" / "çok güçlü", 9 "extremely" / "son derece".

### Visual proposal (site): "two rulers"
One picture, all numbers from the inputs (no solver needed until the last step). Rows = criteria, sorted by final weight; one horizontal axis in **"times the worst criterion"** (the worst sits at 1). For each criterion j two ticks: the **best's ruler** puts it at a_BW / a_Bj (what "best is a_Bj times j" implies), the **worst's ruler** at a_jW (what "j is a_jW times worst" implies). Fully consistent ⇔ the two ticks coincide (a_Bj · a_jW = a_BW). A grey band between them is the disagreement; the band of the CR^I argmax in the accent (band width |a_jW − a_BW/a_Bj| = |a_Bj a_jW − a_BW| / a_Bj, so the widest band is not always the CR^I argmax: mark by CR^I, not by width). The final weight is a dot on the same axis (w_j / w_W), next to the two ticks it reconciles. Default data: Rezaei 2016 Example 3 (car; comfort's ticks at 2 and 4, the CR^I argmax as in Liang Table 1).

IdeaSteps (Next/Back, 4 steps):
1. Anchors only: best and worst rows, best at a_BW on the axis, worst at 1.
   - **EN:** First the two anchors: the most important criterion and the least important one, and how many times more important the first is.
   - **TR:** Önce iki çapa: en önemli ve en önemsiz kriter, ve birincinin kaç kat önemli olduğu.
2. Best's ruler: one tick per criterion at a_BW / a_Bj.
   - **EN:** Each "best is x times more important than this one" puts the criterion somewhere on the scale.
   - **TR:** Her "en iyi bundan x kat önemli" yanıtı kriteri ölçekte bir yere koyar.
3. Worst's ruler: the second tick at a_jW, bands between the pairs, the CR^I argmax highlighted.
   - **EN:** The answers about the worst criterion place it a second time. Where the two places differ, your answers disagree; the marked one fits worst.
   - **TR:** En kötüyle ilgili yanıtlar kriteri ikinci kez yerleştirir. İki yer farklıysa yanıtlarınız çelişir; işaretli olan en az uyandır.
4. Full picture: weight dots and the weight column (normalized).
   - **EN:** BWM picks the weights that keep the largest of these gaps as small as possible.
   - **TR:** BWM bu aralıkların en büyüğünü olabildiğince küçük tutan ağırlıkları seçer.

## When to use / when not
- **Use when:** weights must reflect a decision maker's priorities (no data-driven weighting fits); n = 3–9; the decision maker can name one clear most and least important criterion; you want a consistency check with fewer questions than AHP (2n − 3 vs n(n − 1)/2: 7 vs 10 at n = 5, 15 vs 36 at n = 9).
- **Do not use when:** the user cannot name a single best and worst (all criteria feel equal: use Equal weights); you need judgements among the "middle" criteria (BWM never compares them directly); n > 9 without grouping (no published threshold, Rezaei recommends clustering); several experts must be combined (Bayesian BWM or averaging, out of scope here).

## Inputs
- n ≥ 2 criteria (from the problem). No decision matrix is used.
- Best B and worst W, **B ≠ W**.
- a_BW ∈ {1..9} (best over worst), asked first.
- Best-to-Others a_Bj for every j ≠ B, W and Others-to-Worst a_jW for every j ≠ B, W, integers in **1..a_BW** (Rezaei 2015 §2.2: "a_ij ∈ {1, …, a_BW}"; Liang 2020 Property 4 uses the same range). a_BB = a_WW = 1, and a_BW appears in both vectors. That is 2n − 3 numbers.
- No parameters (the model is fixed, Decision 1).
- Output: w (Σw = 1, all w > 0), ξ^L (linear model's optimum, in weight units), CR_I with its threshold and the index of the most inconsistent criterion.

## Algorithm
Notation as in Rezaei (2016): criteria j = 1..n, best B, worst W.

1. **Judgements** a_Bj (best over j) and a_jW (j over worst), with a_BB = a_WW = 1.
2. **Consistency definition** (Rezaei 2016, Definition 1): fully consistent ⇔ $a_{Bj}\,a_{jW} = a_{BW}$ for all j. Then $w_W = 1/\sigma$, $w_j = a_{jW}/\sigma$, $w_B = a_{BW}/\sigma$ with σ the sum.
3. **Linear model** (Rezaei 2016, model (19)) — **implemented**:
   $$\min \xi^L \ \ \text{s.t.}\ \ |w_B - a_{Bj} w_j| \le \xi^L,\ \ |w_j - a_{jW} w_W| \le \xi^L\ \ \forall j,\quad \sum_j w_j = 1,\ w_j \ge 0.$$
   An LP with n + 1 variables and 4n inequalities; the optimum is unique (proved in Ratandhara & Kumar, Theorem 2).
4. **Closed form of step 3** (Ratandhara & Kumar 2025/2026, Theorem 2, Eqs. 7–18) — **what the browser runs**. With D = criteria other than B and W, $p_i = a_{Bi} a_{iW}$, D1 = {i: p_i < a_BW}, D2 = {i: p_i > a_BW}:
   $$\epsilon_i = \frac{|p_i - a_{BW}|}{a_{Bi} + 2},\qquad \epsilon_{i,j} = \frac{|p_i - p_j|}{a_{Bi} + a_{Bj} + 2}\ (i \in D1, j \in D2),\qquad \eta = \max\{\epsilon_i, \epsilon_{i,j}\}.$$
   Set $v_W = 1$ and, by which term attains η:
   - η = ε_{i0}, i0 ∈ D1 (Eq. 16): $v_B = a_{BW} - \eta$, $v_{i0} = a_{i0W} + \eta$, $v_i = \min\{a_{iW} + \eta,\ a_{BW}/a_{Bi}\}$;
   - η = ε_{j0}, j0 ∈ D2 (Eq. 17): $v_B = a_{BW} + \eta$, $v_{j0} = a_{j0W} - \eta$, $v_i = \min\{a_{iW} + \eta,\ (a_{BW} + 2\eta)/a_{Bi}\}$;
   - η = ε_{i0,j0} (Eq. 18): $v_B = p_{i0} + (a_{Bi0} + 1)\eta$, $v_{i0} = a_{i0W} + \eta$, $v_{j0} = a_{j0W} - \eta$, $v_i = \min\{a_{iW} + \eta,\ (p_{i0} + (a_{Bi0} + 2)\eta)/a_{Bi}\}$;
   - η = 0 (consistent, or n = 2): step 2.

   Then $\sigma = \sum v$, $w = v/\sigma$, $\xi^L = \eta/\sigma$. **Checked:** equals HiGHS on 3,900 random inputs (n = 3–15, max diff 2.6e-15) and on 500 inputs with entries above a_BW (1.5e-15); reproduces all 4 of the paper's examples and every fixture below. O(n²) for the ε_{i,j} pairs: 28 µs per solve at n = 15 in CPython (HiGHS 1.4 ms).
5. **Input-based consistency ratio** (Liang et al. 2020, Eqs. 6–7) — **shown to the user**:
   $$CR^I_j = \frac{|a_{Bj} a_{jW} - a_{BW}|}{a_{BW}(a_{BW} - 1)}\ (a_{BW} > 1),\quad 0\ (a_{BW} = 1);\qquad CR^I = \max_j CR^I_j \in [0, 1].$$
   Acceptable when CR^I is below the threshold for (scale = a_BW, n), Liang Table 3:

   | a_BW \ n | 3 | 4 | 5 | 6 | 7 | 8 | 9 |
   |---|---|---|---|---|---|---|---|
   | 3 | 0.1667 | 0.1667 | 0.1667 | 0.1667 | 0.1667 | 0.1667 | 0.1667 |
   | 4 | 0.1121 | 0.1529 | 0.1898 | 0.2206 | 0.2527 | 0.2577 | 0.2683 |
   | 5 | 0.1354 | 0.1994 | 0.2306 | 0.2546 | 0.2716 | 0.2844 | 0.2960 |
   | 6 | 0.1330 | 0.1990 | 0.2643 | 0.3044 | 0.3144 | 0.3221 | 0.3262 |
   | 7 | 0.1294 | 0.2457 | 0.2819 | 0.3029 | 0.3144 | 0.3251 | 0.3403 |
   | 8 | 0.1309 | 0.2521 | 0.2958 | 0.3154 | 0.3408 | 0.3620 | 0.3657 |
   | 9 | 0.1359 | 0.2681 | 0.3062 | 0.3337 | 0.3517 | 0.3620 | 0.3662 |

   "Scale" is a_BW: Liang's own example uses a_BW = 8 → the "8-scale" row (§5.3, 0.14 < 0.2958), and Rezaei's Excel looks the row up with `MAX(best-to-others)`. a_BW = 2: threshold 0 (Liang footnote 2: any CR^I > 0 means revise). The table was cross-checked against Rezaei 2026 Table 4 and the Excel's per-sheet tables (identical).
6. **Most inconsistent judgement:** $j^\iota = \arg\max_j CR^I_j$ (Rezaei 2026 §4: "pinpoints the criterion … revising a_Bj and/or a_jW is a natural first step"). A concrete suggestion: the value of a_jW (or a_Bj) in 1..a_BW that makes $a_{Bj} a_{jW}$ closest to a_BW, e.g. a_BW = 9, a_Bj = 4 → a_jW = 2 (CR^I_j 0.097 → 0.014).

**Variants found (and what we do):**
- **Non-linear model** (Rezaei 2015, model (6)): $\min \xi$ s.t. $|w_B/w_j - a_{Bj}| \le \xi$, $|w_j/w_W - a_{jW}| \le \xi$. ξ* is unique, w is not for n > 3 (Rezaei 2016 §3; Wu et al. 2024 prove it). Our exact solver: bisection on ξ with an LP feasibility test (for fixed ξ the constraints are linear), then min/max of each w_j for the interval. Reproduces Rezaei 2016 Example 2 (ξ* 0.1459, all five intervals within 4.9e-5) and Rezaei 2015 Table 5 (64/64 within print rounding). **Not offered** (Decision 1): it needs an LP solver in the browser, its weights are intervals, and it differs materially from the linear model (next bullet).
- **Linear ≠ non-linear.** Rezaei 2016 Example 2: the linear w lies outside the non-linear intervals for quality, safety and style. On 400 random inputs (n 4–7) the linear w is inside every interval in 35/400, the ranks equal the interval midpoints' in 104/400 (36/71 when CR^I is under the threshold), max weight gap median 0.050. So "BWM weights" depend on the model; we name the model on the page.
- **Output-based CR** CR^O = ξ*/CI(a_BW), CI from Eq. 8 ($\xi^2 - (1 + 2a_{BW})\xi + a_{BW}^2 - a_{BW} = 0$; reproduces Table 1: 0.00, 0.44, 1.00, 1.63, 2.30, 3.00, 3.73, 4.47, 5.23). Needs ξ* of the **non-linear** model. Not shown (Decision 3). CR^I and CR^O give the same pass/fail verdict on 323/400 random inputs.
- **Linear-model CR** ξ^L / CI_lin(a_BW, n), CI_lin from Ratandhara & Kumar Eq. 22 (their Table 1 reproduced exactly; checked by brute force over every input for n = 3 and 4). Mathematically sound, but new (one citation) and without thresholds; not shown.
- **Multiplicative, Bayesian, fuzzy, group, parsimonious BWM** (Rezaei 2026 Table 5): out of scope.
- **pyDecision 5.1.8 `bw_method`** is neither model (Pitfalls). `simplified_bw_method` is a different, closed-form average of the two vectors (Amiri et al. 2021, not read); not BWM as published.

## Commonly combined with
- **Ranking:** TOPSIS, CoCoSo, MABAC (Turkish BWM–TOPSIS and BWM–CoCoSo studies: DergiPark article-files 2374395 and 2978441, snippets; BWM–MABAC teacher selection, Telli & Ayçin 2021, cited by Arsu & Uğuz Arsu, not read).
- **Compared with:** FUCOM (Demir & Bircan 2020, read in full), AHP (Rezaei 2015 §3: BWM had lower CR and better minimum violation, total deviation and conformity on 46 respondents).
- **Hierarchies:** criteria → sub-criteria, global weight = parent × local (Arsu & Uğuz Arsu 2021, Table 6; Rezaei's Excel "C>9" sheet).

## Pitfalls
- **Wrong CI for the linear model (common in Turkish papers).** Both Turkish fixtures divide the *linear* ξ^L by the *non-linear* CI table (Demir & Bircan: 0.104 / 5.23 = 0.020 "< 0.1, consistent"; Arsu & Uğuz Arsu: "TO" 0.0234 = ξ^L / 3.73, reproduced to 1e-4 for all six expert-1 tables). ξ^L is in weight units and much smaller than ξ*, so these ratios are near zero whatever the input. Demir & Bircan's input actually has CR^I 0.542 against a threshold of 0.366 (criterion K7: a_B = 6, a_W = 8, product 48 vs a_BW = 9), CR^O 0.640 against 0.475: **inconsistent**. Rezaei 2026 also warns against the fixed 0.1 threshold "irrespective of n and the comparison scale". Never combine ξ^L with Table 1.
- **Entries above a_BW.** A criterion rated less important than the worst (a_Bj > a_BW) contradicts the anchors. With a_BW = 1 and a_B2 = 9 the linear model returns w = [0.576, 0.091, 0.333] with ξ^L 0.242, while CR^I = 0 by definition (Eq. 7): the inconsistency is invisible. Cap inputs at a_BW (Inputs).
- **Low sensitivity of the linear model.** Moving one judgement by ±1 leaves the weights exactly unchanged in 25 % of moves (916/3,697 on random inputs; Ratandhara & Kumar Corollary 1). A user nudging an answer may see nothing happen. Show CR^I_j updating live so the input still feels connected.
- **Multiple optima (non-linear only):** solvers return different w with the same ξ*; tests must check ξ* and interval membership. Not relevant to the linear model (unique).
- **pyDecision 5.1.8 `bw_method(mic, lic)`:** (i) minimizes ξ plus a penalty with `trust-constr` from a seeded random start, so weights differ from the linear optimum: 6.1e-3 (Rezaei Ex2), 4.0e-2 (Ex3), 6.2e-2 (Demir & Bircan); (ii) its CR omits the absolute value of Eq. 7, so products below a_BW are ignored ([1, 2, 3, 9] / [9, 2, 2, 1]: prints 0.0, Liang 0.069); (iii) all-ones input prints "CR: 1 (Not Acceptable)" (Liang: 0); (iv) the threshold row `[0, 0, 0, 0.1667, 0.1898, 0.2306, 0.2643, 0.2819, 0.2958, 0.3062]` is Liang Table 3's **n = 5 column** used for every n; (v) float arrays crash (`threshold[mx]`); (vi) best and worst are `argmin`, so a tie picks the first. Not a reference.
- **n > 9:** no threshold is published. We use the n = 9 column, labelled approximate (our choice); the Excel offers no sheet beyond 9 and recommends clustering.
- **Ordinal ratio OR (Liang Eqs. 9–11):** our reading reproduces Liang Table 2's comfort 0.3, safety 0.2 and global 0.3, but gives quality 0.1 where the paper prints 0 (the tie rule of the step function F is ambiguous in the text). Not used.
- **Rounded inputs in papers:** fixtures print weights to 4 d.p.; Arsu & Uğuz Arsu's sub-criteria are printed as local × parent (products of two rounded numbers), so they match to only 1.3e-3.

## Reference example (test fixture)

### F1 (main): Rezaei (2016), car purchase, n = 5 — also Rezaei's Excel "Example" sheet and Liang (2020) Tables 1–2
- **Source:** Rezaei 2016 Tables 2–4 (inputs), §3 (non-linear ξ*, intervals), §4 (linear weights). Example 2 is the Excel solver's worked example (its stored weights equal our closed form to 5.6e-17). Example 3's inputs are Liang 2020 Table 1 (CR^I_j 0, 0, 0.14, 0.04, 0 in their column order price, quality, comfort, safety, style) and §5.3 (CR^O 0.223).
- **Recomputed:** Ex1 linear MATCH (4.7e-5), Ex2 linear MATCH (4.6e-5, ξ^L 0.0109), non-linear ξ* 0.1459 MATCH and intervals (4.9e-5), Ex3 ξ* 1.0000 MATCH, CR^O 0.2238, CR^I 0.1429 (comfort). Ex3 has no published linear weights.

```json
{
  "id": "bwm-rezaei-2016-car",
  "source": "Rezaei 2016, Omega 64:126-130, DOI 10.1016/j.omega.2015.12.001, Tables 2-4, Sec. 3-4; Ex2 = BWM-Solver-6.xlsx 'Example'; Ex3 = Liang et al. 2020 Table 1",
  "criteria": ["quality", "price", "comfort", "safety", "style"],
  "best": 1, "worst": 4,
  "cases": [
    {"name": "ex1_consistent", "bestToOthers": [2, 1, 4, 2, 8], "othersToWorst": [4, 8, 2, 4, 1],
     "published": {"weights": [0.2105, 0.4211, 0.1053, 0.2105, 0.0526], "xiL": 0.0},
     "expected": {"weights": [0.210526, 0.421053, 0.105263, 0.210526, 0.052632], "xiL": 0.0, "crInput": 0.0}},
    {"name": "ex2", "bestToOthers": [2, 1, 4, 3, 8], "othersToWorst": [4, 8, 2, 3, 1],
     "published": {"weights": [0.2295, 0.4481, 0.1148, 0.1530, 0.0546], "xiL": 0.0109, "xiNonlinear": 0.1459},
     "expected": {"weights": [0.229508, 0.448087, 0.114754, 0.153005, 0.054645], "xiL": 0.010929, "crInput": 0.017857, "mostInconsistent": 3, "threshold": 0.2958}},
    {"name": "ex3", "bestToOthers": [2, 1, 4, 3, 8], "othersToWorst": [4, 8, 4, 2, 1],
     "published": {"xiNonlinear": 1.0, "crInputLocal_liang": {"comfort": 0.14, "safety": 0.04}, "crOutput_liang": 0.223},
     "expected": {"weights": [0.246154, 0.430769, 0.123077, 0.153846, 0.046154], "xiL": 0.061538, "crInput": 0.142857, "mostInconsistent": 2, "threshold": 0.2958}}
  ],
  "tolerance_vs_published": 6e-5
}
```

### F2 (closed-form branches): Ratandhara & Kumar (2025/2026), Examples 1–4
- **Source:** arXiv 2506.17666 §3.3 (published as IMA J. Management Mathematics, DOI 10.1093/imaman/dpag027, Crossref verified, not read). B = c1, W = c_n. Ex1 hits Eq. 16 (η in D1), Ex2 and Ex4 Eq. 17 (D2), Ex3 Eq. 18 (pair): one fixture per branch of step 4.
- **Recomputed:** all MATCH (w ≤ 4.5e-5, ξ exact to 4 d.p.); LP agrees to 1e-16. Ex1 prints only w1, w4, w5 in the extract.

```json
{
  "id": "bwm-ratandhara-kumar-closed-form",
  "source": "Ratandhara & Kumar, arXiv 2506.17666, Examples 1-4 (best = first, worst = last)",
  "cases": [
    {"name": "ex1_eq16", "bestToOthers": [1, 2, 3, 4, 7], "othersToWorst": [7, 2, 3, 2, 1], "expected": {"weights": [0.443787, 0.195266, 0.165680, 0.124260, 0.071006], "xiL": 0.053254}},
    {"name": "ex2_eq17", "bestToOthers": [1, 4, 3, 2, 9], "othersToWorst": [9, 2, 4, 7, 1], "expected": {"weights": [0.432337, 0.121265, 0.161687, 0.242531, 0.042179], "xiL": 0.052724}},
    {"name": "ex3_eq18", "bestToOthers": [1, 1, 4, 3, 2, 4, 5], "othersToWorst": [5, 2, 5, 2, 3, 2, 1], "expected": {"weights": [0.278293, 0.178108, 0.094620, 0.126160, 0.189239, 0.094620, 0.038961], "xiL": 0.100186}},
    {"name": "ex4_eq17", "bestToOthers": [1, 5, 4, 8], "othersToWorst": [8, 4, 1, 1], "expected": {"weights": [0.618182, 0.145455, 0.172727, 0.063636], "xiL": 0.109091}}
  ],
  "published_xi": [0.0533, 0.0527, 0.1002, 0.1091],
  "tolerance_vs_published": 6e-5
}
```

### F3 (secondary, Turkish): Demir & Bircan (2020), private-school criteria, n = 9, linear model (LINGO 17)
- **Source:** Demir, G. & Bircan, H. (2020). Kriter ağırlıklandırma yöntemlerinden BWM ve FUCOM yöntemlerinin karşılaştırılması ve bir uygulama. *Sivas Cumhuriyet Üniversitesi İİBF Dergisi* 21(2):170–185, DOI 10.37880/cumuiibf.616766 (DergiPark article-file 802425). Read in full: Tables 5–7 and the written-out LP. Best K8 (başarı durumu), worst K3 (okulun vizyonu/misyonu).
- **Why this one:** Turkish, n = 9, solved with commercial LP software, and **strongly inconsistent** while the paper calls it consistent (Pitfalls), so it tests the CR^I warning and the "most inconsistent" pointer (K7).
- **Recomputed:** w MATCH 9/9 (4.6e-5); ξ^L 0.10354 vs printed 0.1040 (the printed w give ξ 0.1039, so 0.1040 is LINGO's rounding of a slightly suboptimal or rounded point; tolerance 5e-4 on ξ).

```json
{
  "id": "bwm-demir-bircan-2020-school",
  "source": "Demir & Bircan 2020, Sivas Cumhuriyet Univ. IIBF Dergisi 21(2):170-185, DOI 10.37880/cumuiibf.616766, Tables 5-7",
  "criteria": ["K1 butce", "K2 ulasim", "K3 vizyon/misyon", "K4 egitim programlari", "K5 akademik kadro", "K6 fiziksel ozellikler", "K7 yabanci dil egitimi", "K8 basari durumu", "K9 ek hizmetler"],
  "best": 7, "worst": 2,
  "bestToOthers": [2, 5, 9, 3, 4, 7, 6, 1, 8],
  "othersToWorst": [6, 4, 1, 7, 3, 2, 8, 9, 5],
  "published": {"weights": [0.1991, 0.0796, 0.0212, 0.1327, 0.0996, 0.0569, 0.0664, 0.2947, 0.0498], "xiL": 0.1040, "cr_paper": 0.020},
  "expected": {"weights": [0.199109, 0.079644, 0.021238, 0.132739, 0.099554, 0.056888, 0.066370, 0.294681, 0.049777], "xiL": 0.103537,
               "crInput": 0.541667, "threshold": 0.3662, "acceptable": false, "mostInconsistent": 6},
  "tolerance_vs_published": {"weights": 6e-5, "xiL": 5e-4}
}
```

### F4 (secondary, Turkish): Arsu & Uğuz Arsu (2021), personnel selection, expert 1 main criteria, n = 5
- **Source:** Arsu, T. & Uğuz Arsu, Ş. (2021). Personel seçim sürecinde kullanılan kriterlerin Best-Worst Metodu (BWM) ile değerlendirilmesi. *Üçüncü Sektör Sosyal Ekonomi Dergisi* 56(3):1949–1967, DOI 10.15659/3.sektor-sosyal-ekonomi.21.09.1632. Read in full: Table 4 (expert 1 inputs, main and five sub-criteria sets), Table 5 (weights, "TO"), Table 6 (sub-criteria × parent). Best K3 (kişisel özellik), worst K5 (yönetim becerisi).
- **Recomputed:** main criteria w MATCH exactly (0.0 at 4 d.p.), "TO" = ξ^L/3.73 = 0.0235 vs printed 0.0234; CR^I 0.333 vs threshold 0.2819 (a_BW 7, n 5): **over the threshold** (K1: a_B = 7 = a_BW but a_W = 3). Sub-criteria sets agree within 1.3e-3 (printed as local × parent; usable as loose checks only).

```json
{
  "id": "bwm-arsu-2021-personnel-expert1",
  "source": "Arsu & Uguz Arsu 2021, Ucuncu Sektor Sosyal Ekonomi Dergisi 56(3):1949-1967, DOI 10.15659/3.sektor-sosyal-ekonomi.21.09.1632, Tables 4-5 (expert 1)",
  "criteria": ["K1 on degerlendirme", "K2 mesleki donanim", "K3 kisisel ozellik", "K4 sosyal beceri", "K5 yonetim becerisi"],
  "best": 2, "worst": 4,
  "bestToOthers": [7, 2, 1, 3, 7],
  "othersToWorst": [3, 7, 7, 3, 1],
  "published": {"weights": [0.0750, 0.2625, 0.4375, 0.1750, 0.0500], "to_paper": 0.0234},
  "expected": {"weights": [0.075, 0.2625, 0.4375, 0.175, 0.05], "xiL": 0.0875, "crInput": 0.333333, "threshold": 0.2819, "acceptable": false, "mostInconsistent": 0},
  "tolerance_vs_published": 6e-5
}
```

### Non-linear reference (for the record, not implemented): Rezaei (2015) Example 1 and Table 5
- Transport mode, n = 3 (C1 load flexibility = worst, C2 accessibility, C3 cost = best), a31 = 8, a32 = 2, a21 = 5: published w [0.0714, 0.3387, 0.5899], ξ* 0.26, CR 0.058; ours ξ* 0.2583, same w, CR 0.058 (unique for n = 3, interval width 1.5e-7). Table 5's 64 cases (a32, a21 ∈ 1..8): 64/64 within 2-d.p. print rounding.

## Implementation notes
- `src/core/methods/bwm.ts`, `kind: 'weighting'`. **Input does not fit `WeightingMethod.compute(problem, params)`**: params are `string | number` only and `Problem` has no judgements. BWM and AHP need a shared judgement input (Decision 6). Sketch: `type BwmJudgements = { best: number; worst: number; bestToOthers: number[]; othersToWorst: number[] }`.
- **Solver:** step 4's closed form, ~40 lines, no dependency. No LP or simplex in the bundle (Decision 2).
- Validation (blocking): n ≥ 2; best ≠ worst; integers 1..9; bestToOthers[best] = othersToWorst[worst] = 1; bestToOthers[worst] = othersToWorst[best] (= a_BW); every other entry ≤ a_BW. All ones with best ≠ worst is valid (equal weights, ξ^L = 0, CR^I = 0).
- Return `weights`, steps: `bwm.judgements` (two vectors), `bwm.implied` (a_BW / a_Bj and a_jW, "times the worst", for the picture), `bwm.consistencyLocal` (CR^I_j vector), scalar `bwm.xi` (ξ^L). Diagnostics: `{ crInput, crThreshold, mostInconsistent }`. Warning `bwm.inconsistent` (col = argmax) when CR^I exceeds the threshold, `bwm.threshold-approximate` when n > 9.
- **Tests (Vitest):** F1–F4 vs `expected` (1e-6) and `published` (tolerances in JSON); one case per closed-form branch (F2); properties on random inputs: Σw = 1, all w > 0, ξ^L equals the max deviation of the returned w (`xi_of` in `bwm.py`), consistent input gives ξ^L = 0 and w ∝ a_jW; n = 2 gives (a_BW, 1)/(1 + a_BW); permuting criteria permutes w. Expected values for ~50 random inputs can be dumped from `bwm.py`'s `linear_lp` as a JSON oracle (the LP is the definition; the closed form must match it to 1e-12).

## Girdi UX (input UX)
**How others ask** (read 2026-10-18):
- **Rezaei's Excel (BWM-Solver-6.xlsx, the reference tool):** one sheet per n (3–9); type names; best and worst from dropdowns of those names; a row "Best to Others" and a column "Others to the Worst", each cell a 1–9 dropdown with the scale words beside it (1 equal … 9 absolutely); press Solver; yellow cells give weights, ξ*, "Input-Based CR", "Associated Threshold" and one sentence (acceptable / not acceptable). No cap at a_BW, no pointer to the bad judgement, no threshold for a_BW ≤ 2 (lookup starts at 3).
- **MetricGate BWM calculator:** a table of rows (criterion, best-to-others, others-to-worst); best/worst optional, inferred from the 1s; reports ξ^L, ξ*, CI, CR with fixed 0.10 / 0.25 verdicts (the practice Rezaei 2026 calls inappropriate) and an "a_Bj × a_jW = a_BW" check per row.
- **GenDI, mathresearcher.com, SPSSAU:** same two-vector table; GenDI shows the five steps as cards and "BWM 9 vs AHP 15" at n = 6. SPSSAU takes one row per expert.
- **AHP calculators (SpiceLogic):** one row per pair with a chip scale "1 equal, 3 moderate, 5 strong, 7 very strong, 9 extreme".

**Proposal (mobile first, little text), shared with AHP:**
1. **One question per screen-row, same component for both methods:** a sentence with the two criterion names and a 1–9 chip row (odd numbers labelled, even numbers as plain chips). AHP asks "A or B, and by how much?" (direction toggle + chips); BWM asks fixed-direction questions, so the toggle is hidden. Same component, same scale words.
2. **BWM order:** (a) tap the most important criterion, (b) tap the least important (the first is disabled), (c) "How much more important is *Best* than *Worst*?" → chips 1–9 (this is a_BW), (d) "*Best* vs …" list: one chip row per other criterion, chips above a_BW disabled, (e) "… vs *Worst*" list, same cap. 2n − 3 rows total, a counter "5 / 7".
3. **Live check:** after each answer CR^I and the threshold update in one line ("Consistent" / "Check *Comfort*"); the flagged criterion's two rows get a marker and a suggested value ("2 would fit"). Not blocking.
4. **Shortcuts:** "All equally important" → Equal weights; n = 2 → only question (c).
5. **AHP and BWM on one screen:** a method switch at the top keeps the criterion list and any shared answers (AHP's pair (B, W) = BWM's a_BW; AHP's pairs (B, j) and (j, W) are BWM's rows), so switching does not lose work.

## Edge cases (and our default)
| Case | What happens | Default |
|---|---|---|
| n = 2 | One judgement (a_BW); always consistent; w = (a_BW, 1)/(1 + a_BW) (checked: a_BW 3 → 0.75, 0.25) | Ask only a_BW |
| best = worst chosen | Not a BWM input (a_BW would be 1 against itself) | Block in the picker (second tap disables the first) |
| all ones (a_BW = 1) | Equal weights, ξ^L 0, CR^I 0 (pyDecision wrongly says "Not Acceptable") | Allow; note "same as Equal weights" |
| a_BW = 1 with other entries > 1 | Contradiction invisible to CR^I (always 0) | Prevented by the cap 1..a_BW |
| a_BW = 2 | Threshold 0: any CR^I > 0 flagged (Liang footnote 2); Excel shows none | Follow Liang |
| ties for best or worst | User picks one; the tied criterion gets 1 in that vector | Allowed |
| n > 9 | No published threshold | n = 9 column, "approximate"; hint to group criteria |
| inconsistent input | Weights still unique and computed | Warn with the criterion, never block |

## Decisions for Fatih
1. **Model: linear BWM only** (Rezaei 2016), named on the page (recommended). Unique weights, the most applied variant (Rezaei 2026), and what the author's own Excel solver computes. The non-linear model gives interval weights that differ from the linear ones (inside them in 35/400 random cases) and needs an LP solver. Alternative: offer non-linear as an option with intervals; more UI and a solver for a variant users rarely need.
2. **Solver: closed form** (Ratandhara & Kumar Theorem 2), no dependency, no simplex (recommended). Verified against HiGHS to 2.6e-15 on 3,900 random inputs up to n = 15; O(n²), microseconds. The LP stays in `bwm.py` as the test oracle. Alternative: a hand-written simplex (~150 lines, numerical edge cases) or `javascript-lp-solver` (a dependency); neither needed.
3. **Consistency shown: input-based CR^I with Liang's thresholds** (row a_BW, column n; n > 9 uses column 9 as approximate; a_BW ≤ 2 threshold 0), live while typing, with the most inconsistent criterion and a suggested value; **warning, never blocking** (recommended). This is what Rezaei's Excel and his 2026 review use. No CR^O (needs the non-linear model), no fixed 0.1 rule, never ξ^L / Table 1.
4. **Input format:** best → worst → a_BW → best-to-others → others-to-worst, 1–9 integer chips, entries capped at a_BW, best ≠ worst blocked, "all equal" shortcut (recommended). The cap removes the a_BW = 1 blind spot and matches the papers' domain.
5. **Fixtures:** F1 Rezaei 2016 Ex1–3 (main; same numbers as the Excel and Liang), F2 Ratandhara & Kumar Ex1–4 (one per closed-form branch), F3 Demir & Bircan 2020 and F4 Arsu & Uğuz Arsu 2021 (Turkish, both published as "consistent" but over the CR^I threshold) (recommended).
6. **Shared judgement input for AHP and BWM:** the current `WeightingMethod` takes only `Problem` and scalar params, so a subjective method needs a new input slot (e.g. `problem.judgements` or a third `compute` argument) and one shared editor (UX proposal above). Decide once for both methods before implementing either.

## Sources
- Rezaei (2015), DOI 10.1016/j.omega.2014.11.009: full-text extract via Exa (copy at expertchoice.ir; §2 model (5)–(6), Eqs. 7–8, Table 1, Example 1, Table 5, Table 7). Publisher PDF not opened.
- Rezaei (2016), DOI 10.1016/j.omega.2015.12.001: accepted manuscript (text2fa.ir), read in full.
- Liang, Brunelli & Rezaei (2020), DOI 10.1016/j.omega.2019.102175: final version, TU Delft repository, read in full (§3–5, Tables 1–4, footnotes 2–3, Appendix).
- Rezaei, J. (2026). Best-Worst Method: A decade of evolution and future prospects. *Omega* 143:103546, DOI 10.1016/j.omega.2026.103546 (CC BY, TU Delft repository): §3.1 and §4 read, Tables 2–5.
- Ratandhara, H.M. & Kumar, M. An analytical framework for the linear Best-Worst Method. arXiv 2506.17666 (HTML), §3.1–3.3 read (Theorems 2–3, Corollary 1, Eq. 22, Table 1, Examples 1–4); published version DOI 10.1093/imaman/dpag027 (Crossref only).
- Wu, Q., Liu, X., Zhou, L., Qin, J. & Rezaei, J. (2024). An analytical framework for the best–worst method. *Omega* 123:102974, DOI 10.1016/j.omega.2023.102974: abstract only (closed form of the non-linear model; not needed for Decision 1).
- Demir & Bircan (2020), DOI 10.37880/cumuiibf.616766, and Arsu & Uğuz Arsu (2021), DOI 10.15659/3.sektor-sosyal-ekonomi.21.09.1632: read in full (PDFs from DergiPark and tisej.com).
- Rezaei's BWM-Solver-6.xlsx (bestworstmethod.com/software, "BWM Solver v2.0, 02-02-2022"): every sheet's formulas and validation lists read with openpyxl (no macros run).
- Tools seen 2026-10-18: metricgate.com BWM calculator docs (EN and ES pages), gendi.io/methods/bwm, mathresearcher.com, spssau.net help, spicelogic.com AHP calculator: page text only.
- Code read and run: pyDecision 5.1.8 `pyDecision/algorithm/bwm.py`, `bwm_s.py`. pymcdm 1.4.0 and pyrepo-mcda have no BWM (grep). No `bestworstmethod` package exists on PyPI (pip, 2026-10-18); jakub-tomczak/BWM (R, linear model, 2018) seen on GitHub, not run.
- Recompute: `docs/research/scripts/bwm.py` (numpy 2.5.4, scipy 1.18.1), output `docs/research/scripts/bwm.out` (pyDecision section run in a scratch venv).

## Changes on re-verification (2026-10-18)
- **Liang 2020 now read in full:** the threshold table (Table 3) and the "scale = a_BW" reading are confirmed; the draft's "thresholds not verified" is closed. pyDecision's threshold row is identified as Table 3's n = 5 column. Two more pyDecision CR bugs found (no absolute value; all-ones = 1).
- **Rezaei 2015 read** (extract): Example 1 and Table 5 recomputed (64/64). Draft had Crossref metadata only.
- **Closed form of the linear model found and verified** (Ratandhara & Kumar): replaces the draft's "need a small LP solver"; linear-model CI also reproduced.
- **Rezaei's Excel solver read:** linear model + CR^I + per-n thresholds; its example equals our closed form to 5.6e-17.
- **Two Turkish fixtures added** (Demir & Bircan 2020, Arsu & Uğuz Arsu 2021), both reproducing exactly and both showing the ξ^L / Table 1 mistake.
- **Quantified:** linear vs non-linear divergence, CR^I vs CR^O agreement (323/400), the linear model's 25 % no-change rate, edge cases (n = 2, all ones, a_BW = 1 blind spot, a_BW = 2).
- Draft's recompute path (scratchpad) replaced by `scripts/bwm.py`; site bullets, visual proposal, UX, edge-case table and Decisions added. Draft's non-linear Example 3 note kept (ξ* = 1, now 1.0000 and CR^O 0.2238).
- Not verified: the Rezaei 2015 publisher PDF; Wu et al. 2024 beyond the abstract; the published IMA version of Ratandhara & Kumar; the snippet-only pairings; Liang's OR tie rule.
