# Multi-Attributive Border Approximation area Comparison (MABAC)

**Re-verified 2026-10-18** against the origin paper itself (Pamučar & Ćirović 2015, author's manuscript, read in full: Eqs. 13–24, Tables 5–12, sensitivity section 4 and Appendix Tables 16–19) and two independent worked examples (Biswas & Das 2018, open access; Çelik 2020, Turkish, DergiPark), all read in full. Three fixtures recomputed in numpy (`scripts/mabac.py`, output `scripts/mabac.out`), against pyDecision 5.1.8, pymcdm 1.4.0 and pyrepo-mcda 0.1.15 (all run). See "Changes on re-verification" at the end.

- **Family:** ranking (compensatory / distance from a border: min–max normalized values shifted by +1, weighted, compared with their per-criterion geometric mean)
- **Origin:** Pamučar, D. & Ćirović, G. (2015). The selection of transport and handling resources in logistics centers using Multi-Attributive Border Approximation area Comparison (MABAC). *Expert Systems with Applications* 42(6):3016–3028, DOI [10.1016/j.eswa.2014.11.057](https://doi.org/10.1016/j.eswa.2014.11.057). Publisher version paywalled (OpenAlex `is_oa: false`, no repository copy). The **author's manuscript** (Word file on academia.edu, document 9846829, uploaded by Pamučar) was read in full through Exa's fetch: §2 MABAC steps 1–6 (Eqs. 13–24), §3 forklift example (Tables 5–12), §4 sensitivity (Tables 13–20). Its numbers are the ones pymcdm's docstring prints, so it matches the published example.
- **Popularity:** cited-by Crossref 1,007, OpenAlex 1,143 (both 2026-10-18; Crossref 985 on 29.09). Turkish use is very common (DergiPark search, 2026-10-18: CRITIC, Entropy, FUCOM, fuzzy DEMATEL pairings; Çelik 2020 read in full, the rest snippets).

## For users (site copy)
- **EN:** MABAC draws a border line for every criterion, the geometric mean of all alternatives, and adds up how far each alternative lies above or below it. A positive score means the alternative is above the border overall, a negative one below it.
- **TR:** MABAC her kriter için bir sınır çizer (tüm alternatiflerin geometrik ortalaması) ve her alternatifin bu sınırın ne kadar üstünde ya da altında kaldığını toplar. Pozitif skor alternatifin genel olarak sınırın üstünde, negatif skor altında olduğunu gösterir.

**When to use / combined with (site bullets, one sentence each, each backed by sources read in full unless marked):**
- **EN:** Use it when your data mix units or contain zeros or negative values: every criterion is rescaled to 0–1 between its worst and best value first. *(origin Eqs. 15–16 and §4.2; our check: per-column x → a·x + b leaves S unchanged, 1.3e-15)*
  **TR:** Verileriniz farklı birimlerdeyse ya da sıfır veya negatif değer içeriyorsa kullanın: her kriter önce en kötü ve en iyi değeri arasında 0–1 aralığına ölçeklenir.
- **EN:** MABAC gives exactly the same order as a weighted sum of 0–1 (min–max) scores; the border only decides which scores are positive and which negative. *(our algebra, Algorithm step 6; 0/2000 random cases differ)*
  **TR:** MABAC, 0–1 (min–maks) ölçekli değerlerin ağırlıklı toplamıyla birebir aynı sıralamayı verir; sınır yalnız hangi skorların pozitif, hangilerinin negatif olacağını belirler.
- **EN:** MABAC only ranks; published studies take its weights from DEMATEL, Entropy or CRITIC. *(DEMATEL: origin Table 5; Entropy: Biswas & Das 2018, Fig. 1; CRITIC: Çelik 2020, Table 7)*
  **TR:** MABAC yalnız sıralar; yayımlanmış çalışmalarda ağırlıklar DEMATEL, Entropi ya da CRITIC'ten gelir.
- **EN:** Be careful: the border is computed from the alternatives in the table, so adding or removing one can change a score's sign and the order of the others. *(our check: removing one alternative changes the order of the rest in 176/1000 random problems)*
  **TR:** Dikkat: sınır tablodaki alternatiflerden hesaplanır; bir alternatif eklemek ya da çıkarmak skorların işaretini ve diğerlerinin sırasını değiştirebilir.

**UI labels:** score column EN "Distance to border S" / TR "Sınıra uzaklık S"; steps EN "Normalized (min–max)" / TR "Normalize (min–maks)", EN "Weighted V = w(t + 1)" / TR "Ağırlıklı V = w(t + 1)", EN "Border G" / TR "Sınır G", EN "Distance Q" / TR "Uzaklık Q". Q cells coloured by sign: EN "upper area" / TR "üst bölge" (> 0), EN "lower area" / TR "alt bölge" (< 0). No options.

### Visual proposal (site): "one border, many distances"
One criterion at a time (selector), plus a summary strip. For the selected criterion j: a vertical axis from w_j (= worst, t = 0) to 2w_j (= best, t = 1). A horizontal band at g_j labelled "border G", the area above it tinted accent ("upper area G⁺", the ideal side) and below it grey ("lower area G⁻", the anti-ideal side), as in the origin's Figure 2. Each alternative is a dot at v_ij with a vertical stick to the border: the stick is q_ij, accent if up, grey if down. A second, faint tick marks the arithmetic mean of the dots, just above the border (geometric ≤ arithmetic mean), so the eye sees the border sits slightly below the middle. Summary strip under it: one horizontal bar per alternative, S_i = Σ_j q_ij, centred on zero, sorted. Default data F1 (forklifts, criterion C1 price) or F3.
- **EN:** For every criterion MABAC sets a border at the geometric mean of the alternatives and measures how far each one sits above or below it. The bars add those distances up: right of zero is above the border overall.
- **TR:** MABAC her kriterde alternatiflerin geometrik ortalamasına bir sınır koyar ve her alternatifin bu sınırın ne kadar üstünde ya da altında olduğunu ölçer. Çubuklar bu uzaklıkları toplar: sıfırın sağı genel olarak sınırın üstü demektir.

## When to use / when not
- **Use when:** criteria are on different, possibly interval scales (min–max is shift- and scale-invariant, so negative values, zeros and temperatures work; the origin's §4.2 demonstrates exactly this with a Likert rescale y = 2x − 1, Table 16); you want a signed score with a "above / below average" reading; you want results comparable with the Pamučar-school and Turkish finance literature (DEMATEL/CRITIC/Entropy → MABAC).
- **Do not use when:** you want an independent second opinion to a min–max weighted sum: MABAC's ranking **is** the min–max weighted sum's (step 6), so it adds no information beyond a sign (it still counts as its own vote in Compare, Decision 3); you need a score comparable across problems (the border moves with the alternative set); the origin's claim of invariance under reciprocal reformulation (x → 60/x, its IFC case 2) does not hold in general (347/1000 random problems reorder, Pitfalls).

## Inputs
- Decision matrix X (m × n), m ≥ 2, n ≥ 1, **any finite values** (negatives and zeros allowed; no `requires.positiveValues`), see Decision 2.
- Criterion types `benefit|cost`; weights w ≥ 0, Σw = 1 (from the weighting step). Zero weights are harmless (the criterion drops out, Pitfalls).
- **No parameters.**

## Algorithm
Notation as in Pamučar & Ćirović (2015): alternatives i = 1..m, criteria j = 1..n.

1. **Decision matrix** (Eq. 13).
2. **Min–max normalization** (Eqs. 14–16): benefit $t_{ij} = \dfrac{x_{ij} - x_j^-}{x_j^+ - x_j^-}$, cost $t_{ij} = \dfrac{x_{ij} - x_j^+}{x_j^- - x_j^+}$, with $x_j^+ = \max_i x_{ij}$, $x_j^- = \min_i x_{ij}$. The cost form equals $(x_j^+ - x_{ij})/(x_j^+ - x_j^-)$, so this is **exactly** this project's `minMaxNormalize` (`src/core/math.ts`), already used by CoCoSo, CRITIC, SD and Entropy (b).
3. **Weighted matrix** (Eq. 17): $v_{ij} = w_j t_{ij} + w_j = w_j (t_{ij} + 1)$, so $v_{ij} \in [w_j, 2w_j]$.
4. **Border approximation area** (Eq. 18): $g_j = \left(\prod_{i=1}^{m} v_{ij}\right)^{1/m}$, the geometric mean of column j; G is the 1 × n vector of the $g_j$ (Eq. 19). (The manuscript's Eq. 18 writes the product index as j = 1..m; the worked example multiplies down the column, $g_1 = (0.171 \cdot 0.292 \cdots 0.261)^{1/7} = 0.2086$.)
5. **Distance matrix** (Eqs. 20–22): $q_{ij} = v_{ij} - g_j$. Eq. 23: $q_{ij} > 0$ → the alternative is in the upper approximation area G⁺ (towards the ideal) on criterion j, $< 0$ → lower area G⁻ (towards the anti-ideal), $= 0$ → on the border.
6. **Criterion function** (Eq. 24): $S_i = \sum_j q_{ij}$; rank by decreasing $S_i$; competition ranking for ties.
7. **Structure (our derivation, checked numerically).** Write $\mathrm{GM}_j$ for the geometric mean of $(1 + t_{ij})$ over i, so $g_j = w_j\,\mathrm{GM}_j$. Then
   $$S_i = \sum_j w_j t_{ij} \;-\; B,\qquad B = \sum_j w_j\,(\mathrm{GM}_j - 1),$$
   and B is **the same number for every alternative**. So:
   - **Ranking: MABAC = SAW with min–max normalization**, exactly, ties included. The first term is CoCoSo's S (Eq. 4 there). Checked: F1–F3 spread of SAW_mm − S ≤ 2.2e-16; 2000 random problems (m 2–8, n 2–7, mixed types, Dirichlet weights) max spread 4.4e-16, **ranking differences 0/2000**.
   - **G only sets the zero point.** Any border vector, right or wrong, shifts every S by the same constant and cannot reorder anything; it changes only the signs of S and of the Q cells (the "upper/lower area" reading). Two published consequences: the underflow case and Altın 2021 below rank correctly with a wrong G.
   - **B ≥ 0 and B ≤ mean SAW_mm** (AM–GM: $1 \le \mathrm{GM}_j \le$ arithmetic mean of $1 + t_{ij}$, equality only for a constant column). Hence mean S ≥ 0 and **at least one alternative has S > 0** whenever any column varies (2000/2000 random); about 58 % of alternatives are positive on random data, for any m.
   - **Why the origin found MABAC "consistent" where SAW was not** (§4.2–4.3, Tables 16–17): its SAW uses x/max normalization, which is not shift-invariant; MABAC's min–max is. The difference is the normalization, not the border. Under the reciprocal reformulation (IFC case 2) both its MABAC and SAW kept their ranks on that dataset, but the S values moved (Table 18) and in general min–max is not invariant to x → C/x (Pitfalls).

**Variants found (and what we do):**
- **Origin formulas** (Eqs. 15–24): implemented. pymcdm 1.4.0 `MABAC` and pyrepo-mcda 0.1.15 `MABAC` compute the same S (identical to ours on F1–F3, max diff 2.5e-16) and differ only in edge handling (constant column → ones, harmless here, Pitfalls). pyrepo-mcda's `MABAC` **crashes on numpy ≥ 2** (`np.product` was removed); it runs with `np.product = np.prod` patched in.
- **pyDecision 5.1.8 `mabac_method(dataset, criterion_type, graph, verbose)` has no weights argument** and uses $v_{ij} = (1 + t_{ij})/m$: the weight is replaced by 1/(number of alternatives). Result: $S^{py} = (n/m) \cdot S^{\text{equal weights}}$ (F1–F3, 7.5e-16), i.e. an equal-weight min–max SAW ranking; differs from the papers on all three fixtures (max |ΔS| 0.11–0.19, rankings differ). Per-column workaround $S_i = \sum_j m\,w_j\,S^{py}_i(X_{\cdot j})$ reproduces ours (2.9e-16). Not a reference.
- **Other normalizations inside MABAC** (pymcdm and pyrepo accept any normalization function; vector or sum variants appear in later papers): by step 7, MABAC with normalization N is a weighted sum with N plus a constant; not offered.
- **Rough, fuzzy, interval, neutrosophic, grey MABAC:** other data types, out of scope.

## Commonly combined with
- **Weights:** fuzzy DEMATEL (origin, Table 5), Entropy (Biswas & Das 2018, Fig. 1 and Table 4), CRITIC (Çelik 2020, Table 7, read in full; Öksüzkaya 2022 development banks; Aydın & Sevinç 2024 software sector, DOI 10.17671/gazibtd.1500545: snippets only), FUCOM (iç denetim study, DergiPark article-file 2820010, snippet with its G vector), equal weights (Altın 2021, DOI 10.29216/ueip.929743, snippet).
- **Compared with:** SAW, COPRAS, TOPSIS, MOORA, VIKOR (origin §4, Tables 16–20). By step 7, a SAW with min–max normalization would have matched MABAC's ranks in every one of those tables.

## Pitfalls
- **Ranking is the min–max SAW ranking (step 7).** Not a pitfall of the method, but of using it as an "extra" method: in a consensus or a Compare view it duplicates SAW min–max and CoCoSo's S. Say so on the method page (Decision 3).
- **Geometric mean underflow for many alternatives.** $\prod_i v_{ij}$ with $v \in [w, 2w]$ and w ≈ 0.1 underflows to 0 in floating point for m in the hundreds: with n = 10, prod^(1/m) gives G = 0 in 5/10 columns at m = 300, 9/10 at m = 1000. The ranking survives (step 7) but every q in such a column becomes v > 0 ("upper area" for everyone) and S shifts by up to 0.95. Compute G as $\exp(\tfrac1m \sum_i \ln v_{ij})$ (Implementation notes). A published Turkish application with m = 286 (Altın 2021, snippet: spreadsheet formula `=KUVVET(ÇARPIM(C592:C878);(1/4))`, i.e. exponent 1/n instead of 1/m) prints G = 0.00 for every criterion and all S positive (1.21–1.39); its ranks are still the SAW ranks, its signs are meaningless.
- **Constant column:** t = 0 for everyone (`minMaxNormalize`), v = w, g = w, q = 0: identical to dropping the column (0.0 difference). pymcdm and pyrepo set t = 1 instead; then v = 2w, g = 2w, q = 0 too, so here (unlike CoCoSo) the choice does not matter (5.6e-17). Keep the existing `constant-column` warning.
- **All alternatives equal** (every column constant): S = 0 for all, a full tie at rank 1. Not an error; the existing constant-column warnings explain it.
- **Zero weight:** v = 0 for the whole column, $g = 0$ (geometric mean of zeros; the log form gives exp(−∞) = 0), q = 0: the criterion drops out, S unchanged (0.0). With the log form, guard $w_j = 0$ explicitly (skip the column) rather than relying on `Math.log(0) = -Infinity`.
- **Near-constant column:** min–max stretches a 1e-9-relative spread to [0, 1] and gives it full weight; warn as CoCoSo/CRITIC/SD do (`mabac.near-constant-column` from `nearConstant`).
- **Negative values and zeros:** allowed. Per-column x → a·x + b (a > 0) leaves S unchanged (1.3e-15 over 1000 random problems with negatives); the complement reformulation x → C − x with a benefit/cost swap (origin IFC case 1) gives identical S by construction.
- **Reciprocal reformulation is not invariant:** x → 60/x with a benefit/cost swap (origin IFC case 2) reorders 347/1000 random problems; the origin's "MABAC is consistent" (Table 18) holds for its dataset only. Same as SAW min–max.
- **Small m:** for m = 2 every non-constant column has $g_j = \sqrt2\,w_j$, so $q \in \{w_j(1 - \sqrt2),\ w_j(2 - \sqrt2)\}$ and $\sum_i S_i = (3 - 2\sqrt2)\sum_j w_j \approx 0.17$; the "better" alternative is positive, the other negative unless it wins some criteria. Nothing breaks; the border is coarse. m = 1: blocked by `MIN_ALTERNATIVES = 2` (all t = 0, S = 0).
- **Rank reversal:** removing one random alternative changes the order of the others in 176/1000 random problems (min–max ranges move; by step 7 this is exactly SAW min–max's rate). The border's movement alone never reorders.
- **Rounded chains in papers:** papers print V to 3 d.p. and then sum Q; S recomputed from printed Q differs from printed S by up to 1e-4 (origin) and 1e-3 (Çelik). Use the tolerances below.

## Reference example (test fixture)

### F1 (main): Pamučar & Ćirović (2015), forklift selection, 7 × 10
- **Source:** origin §3, **Table 5** (DEMATEL weights $w_i$), **Table 6** (Likert scale), **Table 7** (data and types: C1 price, C5 maintenance cost, C6 fuel consumption min; the rest max), **Table 8** (N), **Table 9** (V), **Table 10** (G), **Table 11** (Q), **Table 12** (S, rank). Author's manuscript, read in full.
- **Linguistic columns:** C3 (service network) and C4 (spare parts) are Likert terms VG/G/F/P/VP; the crisp middle values 5/4/3/2/1 of Table 6 reproduce Table 8 exactly (min–max is invariant to the scale, so any affine coding gives the same result, as §4.2 shows). The CRAN package `mabacR` (`mabac_df`) and pymcdm's docstring use the same coding.
- **Paper notes:** (i) the text computes $v_{11} = 0.146 \cdot 0.173 + 0.146 = 0.170$, Table 9 prints 0.171 (ours 0.1713, from the unrounded t). (ii) Eq. 18's product index is written j = 1..m (should run over alternatives i). (iii) The introduction calls the model "DEMATEL-MARICA" once (typo). (iv) Table 18 (IFC case 2) prints S1 values different from Table 12 for the same alternatives (−0.0038 vs 0.0826 for forklift 1), so case 2 used a different C10 dataset that the paper does not print; not reproducible, not used.
- **Recomputed:** t vs Table 8 MATCH (4.3e-4, 3 d.p. print), V vs Table 9 (5.0e-4), G vs Table 10 (5e-5), Q vs Table 11 (5e-5), S vs Table 12 (4e-5), ranking **MATCH 7/7**.

```json
{
  "id": "mabac-pamucar-cirovic-2015-forklifts",
  "source": "Pamucar & Cirovic 2015, Expert Systems with Applications 42(6):3016-3028, DOI 10.1016/j.eswa.2014.11.057, Tables 5, 7-12 (Likert VG=5, G=4, F=3, P=2, VP=1)",
  "alternatives": ["Forklift 1", "Forklift 2", "Forklift 3", "Forklift 4", "Forklift 5", "Forklift 6", "Forklift 7"],
  "criteria": ["C1 purchase price", "C2 manufacturer's warranty", "C3 service network", "C4 availability of spare parts", "C5 average cost of maintenance", "C6 fuel consumption", "C7 maximum bearing capacity", "C8 maximum lifting capacity", "C9 movement speed (with/without load)", "C10 speed of lifting/lowering"],
  "types": ["cost", "benefit", "benefit", "benefit", "cost", "cost", "benefit", "benefit", "benefit", "benefit"],
  "weights": [0.146, 0.144, 0.119, 0.121, 0.115, 0.101, 0.088, 0.068, 0.050, 0.048],
  "matrix": [
    [22600, 3800, 2, 5, 1.06, 3.00, 3.5, 2.8, 24.5, 6.5],
    [19500, 4200, 3, 2, 0.95, 3.00, 3.4, 2.2, 24, 7.0],
    [21700, 4000, 1, 3, 1.25, 3.20, 3.3, 2.5, 24.5, 7.3],
    [20600, 3800, 2, 5, 1.05, 3.25, 3.2, 2.0, 22.5, 11.0],
    [22500, 3800, 4, 3, 1.35, 3.20, 3.7, 2.1, 23, 6.3],
    [23250, 4210, 3, 5, 1.45, 3.60, 3.5, 2.8, 23.5, 7.0],
    [20300, 3850, 2, 5, 0.90, 3.25, 3.0, 2.6, 21.5, 6.0]
  ],
  "published": {
    "G": [0.2086, 0.1885, 0.1720, 0.1952, 0.1740, 0.1625, 0.1319, 0.1010, 0.0789, 0.0590],
    "S": [0.0826, 0.2183, -0.0488, 0.0246, -0.0704, 0.0465, 0.0464],
    "ranking": [2, 1, 6, 5, 7, 3, 4]
  },
  "expected": {
    "G": [0.208555, 0.188538, 0.171982, 0.195209, 0.174016, 0.162456, 0.131865, 0.101044, 0.078937, 0.058984],
    "S": [0.082591, 0.218334, -0.048816, 0.024617, -0.070429, 0.046539, 0.046412],
    "ranking": [2, 1, 6, 5, 7, 3, 4],
    "tolerance_vs_published": { "G": 1e-4, "S": 1e-4 }
  }
}
```
Note: forklifts 6 and 7 differ by 1.3e-4 in S (0.046539 vs 0.046412); the tolerance must stay below that or the ranking check must use `expected`.

### F2 (secondary): Biswas & Das (2018), hybrid vehicle selection, 9 × 5, Entropy weights
- **Source:** Biswas, T.K. & Das, M.C. (2018). Selection of hybrid vehicle for green environment using multi-attributive border approximation area comparison method. *Management Science Letters* 8:121–130, DOI 10.5267/j.msl.2017.11.004 (open access). Read in full: **Table 2** (data), Table 3 (N, 9 digits), **Table 4** (V), **Table 5** (G), Table 6 (Q), **Table 7** (S, ranks).
- **Weights:** Fig. 1 prints only rounded percentages; the text gives the extremes (0.1406 fuel economy, 0.3342 price). The other three are read off Table 4 where $t_{ij} = 0$ (then $v_{ij} = w_j$): C2 0.1671 (HEV3), C3 0.183 (HEV4), C4 0.1751 (HEV3). Sum 1.0000. Directions per Table 3: C1, C2, C4 benefit; C3 emissions and C5 price cost.
- **Recomputed:** G and S MATCH to the 9 printed digits (< 5e-9), ranking **MATCH 9/9**. Nothing to reconcile.

```json
{
  "id": "mabac-biswas-das-2018",
  "source": "Biswas & Das 2018, Management Science Letters 8:121-130, DOI 10.5267/j.msl.2017.11.004, Tables 2-7",
  "alternatives": ["HEV1", "HEV2", "HEV3", "HEV4", "HEV5", "HEV6", "HEV7", "HEV8", "HEV9"],
  "criteria": ["C1 fuel economy MPG", "C2 tank size gal", "C3 emissions t/yr", "C4 passenger volume ft3", "C5 base price k$"],
  "types": ["benefit", "benefit", "cost", "benefit", "cost"],
  "weights": [0.1406, 0.1671, 0.183, 0.1751, 0.3342],
  "matrix": [
    [39, 13.5, 3.1, 100, 24], [48, 11, 4.5, 103, 29.6], [36, 10.6, 4.3, 49.1, 20.295],
    [30, 17.8, 5.1, 100, 50], [42, 11.9, 3.5, 86, 31], [40, 17.2, 3.6, 101, 26],
    [56, 11.9, 2.8, 96, 25], [44, 11.9, 3.3, 94, 31.12], [46, 13, 3.2, 95, 28.756]
  ],
  "published": {
    "G": [0.203764178, 0.221141521, 0.287306161, 0.307462238, 0.555521737],
    "S": [0.157778583, -0.01622203, -0.14489751, -0.24274166, -0.0191927, 0.190021847, 0.212200519, 0.032174523, 0.106320697],
    "ranking": [3, 6, 8, 9, 7, 2, 1, 5, 4]
  },
  "expected": {
    "G": [0.203764, 0.221142, 0.287306, 0.307462, 0.555522],
    "S": [0.157779, -0.016222, -0.144898, -0.242742, -0.019193, 0.190022, 0.212201, 0.032175, 0.106321],
    "ranking": [3, 6, 8, 9, 7, 2, 1, 5, 4],
    "tolerance_vs_published": 1e-6
  }
}
```

### F3 (secondary, Turkish): Çelik (2020), CRITIC → MABAC, 6 participation banks × 10 criteria, 2019
- **Source:** Çelik, S. (2020). Türk Katılım Bankacılığı Sektöründe Performans Analizi: Bütünleşik CRITIC ve MABAC Uygulaması. *İslam Ekonomisi ve Finansı Dergisi / Journal of Islamic Economics and Finance* 6(2):311–334 (page header prints 312–335; DergiPark article-file 1194510; no DOI printed). Read in full: **Table 3** (directions: K5 fixed assets/assets, K8 personnel/other operating expense, K9 branches, K10 employees min; the rest max), **Table 4** (data, as printed: ratios rounded to 2 d.p.), **Table 7** (CRITIC weights), Table 8 (N), Table 9 (V), **Table 10** (G), **Table 11** (Q), **Table 12** (S, ranks).
- **Why this one:** independent author, Turkish, objective weights, 4 cost criteria, coarse (rounded) ratio columns with many ties at 0/1 (K5 is 0 or 1 only). The CRITIC step also reproduces: Table 7's $c_j$ match the **sample** σ (ddof 1) and the weights match to 3 d.p., so F3 can be an end-to-end CRITIC → MABAC test.
- **Paper notes:** the text says "Tablo 11 bu değerleri göstermektedir" for S; they are in Table 12. Rows of printed Q sum to S within 1e-3 (Albaraka −0.163 vs printed −0.162).
- **Recomputed:** t vs Table 8 (4.8e-4), G vs Table 10 (6.9e-4, 3 d.p. print), Q (6.9e-4), S (8.6e-4), ranking **MATCH 6/6**.

```json
{
  "id": "mabac-celik-2020-participation-banks",
  "source": "Celik 2020, Journal of Islamic Economics and Finance 6(2):311-334, Tables 3, 4, 7, 10-12 (DergiPark article-file 1194510)",
  "alternatives": ["Albaraka Turk", "Kuveyt Turk", "Emlak Katilim", "Turkiye Finans", "Vakif Katilim", "Ziraat Katilim"],
  "criteria": ["K1 total assets", "K2 total loans", "K3 total funds collected", "K4 equity/assets", "K5 fixed assets/assets", "K6 liquid assets/short-term liabilities", "K7 net profit/assets", "K8 personnel/other operating expense", "K9 branches", "K10 employees"],
  "types": ["benefit", "benefit", "benefit", "benefit", "cost", "benefit", "benefit", "cost", "cost", "cost"],
  "weights": [0.081, 0.078, 0.082, 0.115, 0.120, 0.099, 0.092, 0.092, 0.121, 0.120],
  "matrix": [
    [51392368, 30880921, 39769408, 0.07, 0.03, 0.41, 0.02, 1.5, 230, 3791],
    [104439345, 57925969, 85494387, 0.07, 0.01, 0.5, 0.16, 1.13, 431, 5955],
    [9282271, 1097529, 5952676, 0.13, 0.01, 0.29, 0.04, 1.6, 11, 381],
    [52427410, 33272689, 39974514, 0.09, 0.03, 0.41, 0.08, 0.9, 310, 3461],
    [30348784, 18770501, 22953215, 0.06, 0.01, 0.41, 0.17, 1.02, 104, 1322],
    [36392174, 29565030, 25457245, 0.09, 0.01, 0.25, 0.16, 0.76, 93, 1129]
  ],
  "published": {
    "G": [0.111, 0.113, 0.111, 0.152, 0.191, 0.146, 0.139, 0.137, 0.183, 0.185],
    "S": [-0.162, 0.146, 0.035, -0.038, 0.124, 0.162],
    "ranking": [6, 2, 4, 5, 3, 1]
  },
  "expected": {
    "G": [0.110882, 0.113301, 0.110993, 0.151997, 0.190488, 0.145872, 0.138934, 0.136817, 0.183656, 0.185693],
    "S": [-0.161812, 0.145137, 0.035472, -0.038009, 0.123914, 0.162048],
    "ranking": [6, 2, 4, 5, 3, 1],
    "tolerance_vs_published": 1e-3
  }
}
```

### Libraries (divergence only, never a reference)
- **pymcdm 1.4.0 `MABAC(normalization_function=minmax_normalization)`** (run): identical on F1–F3 (2.5e-16); its docstring example is F1 and prints the origin's S. Constant column → ones (harmless for MABAC).
- **pyrepo-mcda 0.1.15 `MABAC(normalization_method=minmax_normalization)`** (run with `np.product` patched): identical on F1–F3; crashes unpatched on numpy 2.x.
- **pyDecision 5.1.8 `mabac_method`** (run): ignores weights, $v = (1+t)/m$ (Variants); ranking differs on all three fixtures.

## Implementation notes
- `src/core/methods/mabac.ts`, `export const mabac: RankingMethod = { id: 'mabac', kind: 'ranking', params: [], compute }`; **no `requires`** (negatives allowed). Register in `registry.ts`, export from `core/index.ts`.
- Validation as `cocoso.ts`: `validateProblem` → `validateWeights` → `assertValid`. No method-specific blocking error exists (no division, no log of a data value).
- **Reuse (by name):**
  - `minMaxNormalize(problem)` from `src/core/math.ts`: exactly Eqs. 15–16, constant column → zeros (harmless here), `nearConstant` for the warning. Shared with `cocoso.ts`, `critic.ts`, `sd.ts`, `entropy.ts`.
  - `column`, `sum`, `zeros` (`math.ts`); `rankScores(S, 'desc')` (`rank.ts`).
  - From `cocoso.ts`: the S line `r.map(row => row.reduce((a, x, j) => a + x * weights[j]!, 0))` **is** SAW min–max; MABAC's S equals it minus B. Do not compute S that way, though: compute V, G, Q as in the paper so the steps view shows them, and assert the identity in a test.
  - **Not reusable:** SAW's `compute` (`saw.ts`) has `linearMax` and `sum` normalizations only, no min–max; WASPAS's `wsm`/`wpm` run on `linearMaxNormalize`.
- **G via logs:** `g[j] = weights[j] > 0 ? Math.exp(sum(column(V, j).map(Math.log)) / m) : 0` (no underflow; prod^(1/m) fails from m ≈ 300, Pitfalls). V > 0 whenever w > 0, so `Math.log` is safe there.
- Return `scores: S`, `order: 'desc'`, `ranking: rankScores(S, 'desc')`. Steps (i18n keys): `mabac.normalized` (matrix t), `mabac.weighted` (matrix V), `mabac.border` (vector G over criteria), `mabac.distance` (matrix Q, coloured by sign), `mabac.scores`. Diagnostics: `{ border: B }` (the constant S is shifted by; optional, for the "same order as SAW min–max" note).
- Warnings: `constant-column` (existing), `mabac.near-constant-column`.
- Tests (Vitest): F1–F3 vs `published` (tolerances in JSON) and `expected` (1e-6), rankings; F3 end-to-end with the project's CRITIC (`critic.ts`, sample σ) feeding MABAC; properties: S + B = min–max weighted sum (1e-12) with B the same for every row, max S > 0 when any column varies, x → a·x + b per column leaves S unchanged (negatives), constant column = dropped column, zero-weight column = dropped column, G finite and > 0 for m = 1000 with w ≈ 0.1; edge: all-equal → all S = 0 and all rank 1, m = 1 → `too-few-alternatives`.

## Decisions for Fatih
1. **G computation:** geometric mean through logs, `exp(mean(log v))`, skipping zero-weight columns (recommended): identical to the paper for normal m, correct for m in the hundreds where the literal product underflows to G = 0 (5/10 columns at m = 300). Alternative: the literal formula, with a hard cap on m.
2. **Negative / zero values:** allowed, no `requires.positiveValues` (recommended): min–max makes MABAC invariant to shifting and scaling a column (checked, 1.3e-15), and the origin's §4.2 is built on that property. Same rule as CoCoSo.
3. **Same order as SAW min–max:** state it on the method page and in Compare (badge "same order as a min–max weighted sum; MABAC adds a sign"), and do not count MABAC as an independent vote next to CoCoSo's S in any consensus (recommended). Alternative: add a SAW `minMax` normalization option and show the identity live; more UI for a duplicate.
   **Decided: Fatih (18.10): independent vote in Compare, no badge — SAW has no min-max option.** (Overrides the recommendation above.)
4. **Sign reading:** show Q cells coloured by sign and S centred on zero, with the note that the border moves with the alternative set (recommended). No user-set border (the paper has none; a fixed border would only shift S, step 7).
5. **Fixtures:** F1 origin forklifts as main (now readable; tolerance 1e-4, below the forklift 6/7 gap of 1.3e-4), F2 Biswas & Das (9-digit match) and F3 Çelik 2020 (Turkish, CRITIC weights, end-to-end) as secondary (recommended).

## Sources
- Pamučar, D. & Ćirović, G. (2015). *Expert Systems with Applications* 42(6):3016–3028, DOI 10.1016/j.eswa.2014.11.057. Author's manuscript https://www.academia.edu/9846829 , **read in full** through Exa's fetch (2026-10-18): Eqs. 13–24, Tables 5–20, Figure 2 described in text (image not seen). Publisher version not opened (paywall; OpenAlex `is_oa: false`, `any_repository_has_fulltext: false`). Cited-by: Crossref and OpenAlex APIs (2026-10-18).
- Biswas, T.K. & Das, M.C. (2018). *Management Science Letters* 8:121–130, DOI 10.5267/j.msl.2017.11.004, https://pdfs.semanticscholar.org/fd88/d941691858669a0b2ee93e89a871a99b5640.pdf , **read in full** (Eqs. 7–12, Tables 2–7, Fig. 1).
- Çelik, S. (2020). *İslam Ekonomisi ve Finansı Dergisi* 6(2):311–334, https://dergipark.org.tr/tr/download/article-file/1194510 , **read in full** (Formulas 1–12, Tables 3–12).
- Altın, H. (2021), DOI 10.29216/ueip.929743 (m = 286, exponent 1/n spreadsheet formula); Öksüzkaya (2022, DergiPark article-file 2700275); Aydın & Sevinç (2024), DOI 10.17671/gazibtd.1500545; FUCOM–MABAC internal-audit study (DergiPark article-file 2820010); Entropi ve MABAC personel seçimi (DergiPark article-file 791011, downloaded, not used): **search snippets only** unless stated.
- CRAN `mabacR` 0.1.0, dataset `mabac_df` (rdrr.io page, title only).
- Code read and run 2026-10-18: pyDecision 5.1.8 `pyDecision/algorithm/mabac.py`; pymcdm 1.4.0 `pymcdm/methods/mabac.py`, `normalizations.py`; pyrepo-mcda 0.1.15 `mcda_methods/mabac.py`, `normalizations.py`; this repo `src/core/math.ts` (`minMaxNormalize`), `src/core/methods/cocoso.ts`, `saw.ts`, `src/core/validate.ts`.
- Recompute: `docs/research/scripts/mabac.py` (numpy 2.5.4), output `docs/research/scripts/mabac.out` (library section produced in a scratch venv with the three libraries installed; without them the script skips it).

## Changes on re-verification (2026-10-18)
- **Origin now read in full** (author's manuscript): formulas unchanged from the 29.09 draft; its forklift example becomes **F1** (MATCH 7/7, S 4e-5). Draft said "paywalled, not accessible".
- **New fixture F3** (Çelik 2020, Turkish, CRITIC weights, MATCH 6/6, CRITIC step reproduced with sample σ). F2 unchanged (9-digit match).
- **Structure:** MABAC = SAW min–max − B (0/2000 random ranking differences); G only sets the sign; B ≤ mean SAW_mm so some S > 0; the origin's consistency results explained by normalization, and its IFC case 2 claim shown not to generalize (347/1000).
- **Libraries:** pymcdm and pyrepo-mcda added and run (identical; pyrepo crashes on numpy 2); pyDecision 5.1.8 still ignores weights, shown to equal (n/m) × equal-weight MABAC.
- **Edge cases quantified:** product underflow for large m (and a published case of a wrong G), constant column (zeros = ones = dropped), zero weights, m = 2 closed form, rank reversal rate, shift/scale invariance.
- Draft's recompute script path (scratchpad) replaced by `scripts/mabac.py`; site bullets, visual proposal, UI labels and Decisions added.
- Not verified: the publisher's version; the origin's Figure 2 image; the snippet-only pairings; Table 18's alternate C10 dataset.
