# COmplex PRoportional ASsessment (COPRAS)

**Re-verified 2026-10-13** against the method authors' own restatement (Zavadskas, Kaklauskas, Peldschus & Turskis 2007, read in full, tables read from the page images), Podvezko (2011, read in full) and three later worked examples (Özcan & Çelik 2021, Aytaç Adalı & Tuş Işık 2016, Keshavarz Ghorabaee et al. 2015). Six fixtures recomputed independently in numpy (`scripts/copras.py`, output `scripts/copras.out`). The 1994 origin paper and the 1996 monograph are **not online and were not opened** (see Origin). See "Changes on re-verification" at the end.

- **Family:** ranking (compensatory / utility: additive in the benefit part, reciprocal-proportional in the cost part)
- **Origin:** Zavadskas, E.K., Kaklauskas, A. & Šarka, V. (1994). The new method of multicriteria complex proportional assessment of projects. *Technological and Economic Development of Economy* 1(3), 131–139. This is the reference the method's authors give themselves (Zavadskas et al. 2007, ref. [43]: "The COPRAS [43] method developed by the authors"); no DOI, no Crossref or OpenAlex record, no copy online. Podvezko (2011, p. 137) dates the method to Zavadskas & Kaklauskas (1996), *Pastatų sistemotechninis įvertinimas* (Multicriteria evaluation of buildings), Technika, Vilnius, also not online. **Neither origin text was opened.** The formulas below are taken from the authors' own restatement, Zavadskas, Kaklauskas, Peldschus & Turskis (2007), *The Baltic Journal of Road and Bridge Engineering* 2(4):195–203, Eqs. 1–6 (OA PDF, bjrbe-journals.rtu.lv; no DOI in Crossref), and checked against Podvezko (2011), DOI [10.5755/j01.ee.22.2.310](https://doi.org/10.5755/j01.ee.22.2.310), Eqs. 8–14.
- **Popularity:** Podvezko (2011, p. 135), after listing SR, GM, SAW, TOPSIS, VIKOR, COPRAS and PROMETHEE as used in Lithuania: "the most commonly used methods are SAW, COPRAS and TOPSIS". Cited-by: Kaklauskas et al. 2006 (*Energy and Buildings*, DOI 10.1016/j.enbuild.2005.08.005) 332 (OpenAlex), Zavadskas et al. 2007 BJRBE 218 (OpenAlex), Podvezko 2011 250 (Crossref, 2026-10-13); Google Scholar lists the 1994 paper at 711 (seen only in a search snippet, not verified). OpenAlex co-mention counts from `combinations.md` A.3 (29.09): AHP 344, SWARA 154, Entropy 116, CRITIC 66, BWM 62. Zavadskas et al. (2016, WoS): COPRAS appears in 14 hybrid sustainability models (from `combinations.md`, not re-read). Turkish 2021 EBSCO sample: 8 mentions (Kocatürk Çetin 2023, from `combinations.md`).

## For users (site copy)
- **EN:** COPRAS adds up each alternative's weighted share of the "higher is better" criteria, gives a bonus that grows as its share of the "lower is better" criteria shrinks, and shows every alternative as a percentage of the best one.
- **TR:** COPRAS her alternatifin "yüksek olsun" kriterlerindeki ağırlıklı payını toplar, "düşük olsun" kriterlerindeki payı küçüldükçe artan bir puan ekler ve her alternatifi en iyisinin yüzdesi olarak gösterir.

**When to use / combined with (site bullets, one sentence each, each backed by sources read in full unless marked):**
- **EN:** Use it when every value is a positive amount and you want the cost criteria (price, time, risk) handled in their own term instead of being flipped into benefits first. *(Zavadskas et al. 2007, Eqs. 3–5; Podvezko 2011, p. 138: "the influence of maximizing and minimizing criteria on the evaluation result is considered separately")*
  **TR:** Tüm değerler pozitif miktarlarsa ve maliyet kriterlerinin (fiyat, süre, risk) önce faydaya çevrilmeden kendi teriminde ele alınmasını istiyorsanız kullanın.
- **EN:** COPRAS only ranks; published studies take its weights from experts, AHP, SWARA or Entropy. *(experts: Zavadskas et al. 2007, Fig. 2; AHP: Aytaç Adalı & Tuş Işık 2016, Table 1; Entropy: Özcan & Çelik 2021, DOI 10.4995/ijpme.2021.14734, Table 2; SWARA: Hashemkhani Zolfani & Bahrami 2014, DOI 10.3846/20294913.2014.881435, abstract only)*
  **TR:** COPRAS yalnız sıralar; yayımlanmış çalışmalarda ağırlıklar uzmanlardan, AHP'den, SWARA'dan ya da Entropi'den gelir.
- **EN:** Be careful: an alternative with a very small cost total gets a large bonus, and small changes in cost values can reorder alternatives that score close to each other. *(Podvezko 2011, p. 139–140 and Tables 7–8: two values of the cost criterion R4 changed, A1 105 → 110 and A2 215 → 200, and the ranks 1-3-2 became 3-2-1)*
  **TR:** Dikkat: maliyet toplamı çok küçük olan bir alternatif büyük bir puan alır; maliyet değerlerindeki küçük değişiklikler de skorları birbirine yakın alternatiflerin sırasını değiştirebilir.
- **EN:** With no cost criterion, or with only one, COPRAS gives exactly the same result as SAW with the "Sum" option; the two differ only when there are two or more cost criteria. *(no cost criteria: Podvezko 2011, p. 138: "If only maximizing criteria are used, Z_j = S_+j = S_j"; one cost criterion: algebra in Algorithm step 8, checked numerically, `scripts/copras_reconcile.py`)*
  **TR:** Hiç maliyet kriteri yoksa ya da yalnız bir tane varsa COPRAS, SAW'ın "Toplam" seçeneğiyle birebir aynı sonucu verir; ikisi yalnız iki ya da daha fazla maliyet kriteri olduğunda ayrışır.

**UI labels:** score column EN "Relative significance Q" / TR "Göreli önem Q"; second column EN "Utility degree N (%)" / TR "Fayda derecesi N (%)". No options.

## When to use / when not
- **Use when:** all values are positive on ratio scales (amounts, prices, durations); the problem mixes benefit and cost criteria; you want a check that the arithmetic is right (ΣQ = Σw, see Pitfalls); you want results comparable with the Vilnius-school literature (SWARA/AHP → COPRAS).
- **Do not use when:** data contain zeros or negatives (blocked, see Pitfalls); the cost criteria dominate and alternatives are close (Podvezko 2011 shows the ranking flipping when two cost values change slightly; our check: a constant cost column reorders alternatives in 174 of 2000 random 4 × 3 cases, see Pitfalls); interval-scale data (shares x/Σx are not shift-invariant); you need every criterion treated the same way (benefit criteria are additive, cost criteria enter only through the reciprocal of their sum).

## Inputs
- Decision matrix X (m × n), m ≥ 2, **all x_ij > 0** (blocking `non-positive-value`, same rule as SAW; see Decision 1).
- Criterion types `benefit|cost`; weights w ≥ 0, Σw = 1 (from the weighting step).
- **No parameters.** The method has none in any source read; the two Q formulas in the literature are algebraically identical (Algorithm, step 4).

## Algorithm
Notation: alternatives i = 1..m, criteria j = 1..n, B = benefit criteria, C = cost criteria. The 2007 paper indexes the other way round (x_ij = criterion i of alternative j); formulas below are rewritten in this project's row-per-alternative layout.

1. **Weighted sum normalization** (Zavadskas et al. 2007, Eq. 1): $d_{ij} = \dfrac{w_j\, x_{ij}}{\sum_{k=1}^{m} x_{kj}}$. The same formula for benefit and cost criteria; nothing is inverted. Column sums $\sum_i d_{ij} = w_j$ (Eq. 2).
2. **Sums per alternative** (Eq. 3): $S_{+i} = \sum_{j \in B} d_{ij}$, $S_{-i} = \sum_{j \in C} d_{ij}$. Totals: $\sum_i S_{+i} = \sum_{j\in B} w_j$, $\sum_i S_{-i} = \sum_{j\in C} w_j$ (Eq. 4; Podvezko Eqs. 15–16).
3. **Relative significance** (Eq. 5, the authors' form):
   $$Q_i = S_{+i} + \frac{S_{-\min}\sum_{k=1}^{m} S_{-k}}{S_{-i}\sum_{k=1}^{m} \dfrac{S_{-\min}}{S_{-k}}}, \qquad S_{-\min} = \min_k S_{-k}.$$
4. **Same thing, simplified** (Podvezko 2011 Eq. 11; Hajiagha et al. 2013 Eq. 8; Popović et al. 2012 Eq. 11): $S_{-\min}$ cancels, so
   $$Q_i = S_{+i} + \frac{\sum_k S_{-k}}{S_{-i}\sum_k 1/S_{-k}} = S_{+i} + W_C \cdot \frac{1/S_{-i}}{\sum_k 1/S_{-k}}, \qquad W_C = \sum_{j \in C} w_j .$$
   Read: the cost part hands out the total cost weight $W_C$ in proportion to the reciprocal of each alternative's cost sum. Verified numerically identical (max diff 2.8e-17 on F1). **We implement the simplified form** (no $S_{-\min}$, fewer operations, same value).
5. **Utility degree** (Eq. 6): $N_i = 100\,\% \cdot Q_i / Q_{\max}$. The best alternative gets 100 %.
6. **Rank** by decreasing Q (equivalently N); competition ranking for ties.
7. **No cost criteria** (or $W_C = 0$): $Q_i = S_{+i}$ (Podvezko p. 138), which is SAW with sum normalization. This is also the limit of step 4 as $W_C \to 0$.
8. **Exactly one cost criterion** $c$: $S_{-i} = w_c x_{ic}/\sum_k x_{kc}$, so $\frac{1/S_{-i}}{\sum_k 1/S_{-k}} = \frac{1/x_{ic}}{\sum_k 1/x_{kc}}$ and $Q_i$ equals SAW `sum` with $1/x$ for the cost column (this project's `saw.ts`, lines 14–15 and 45–46). COPRAS and SAW `sum` differ only with **two or more** cost criteria, where COPRAS takes the reciprocal of the *sum* of the cost shares instead of summing reciprocals per criterion. Ours (`scripts/copras_reconcile.py`, 2000 random 4 × n cases): one cost criterion, max |Q − SAW| = 2.2e-16, 0 ranking differences; two cost criteria, max diff 0.168, ranking differs in 437/2000.

Properties used in tests: $\sum_i Q_i = \sum_j w_j$ (= 1) (Podvezko Eqs. 17–20); Q is unchanged by a change of units in any column (scale invariance) and scales linearly with a common factor on all weights; with m = 2 the cost part reduces to $Q_i = S_{+i} + S_{-,\text{other}}$.

**Variants found in the literature (and what we do):**
- **Original vs simplified Q formula:** identical (step 4). Both appear in papers (original: Zavadskas et al. 2007, Aytaç Adalı & Tuş Işık 2016 Eq. 7 prints both; simplified: Podvezko 2011, Hajiagha et al. 2013, Popović et al. 2012, pyrepo-mcda).
- **"Q = S₊ + S₋" (a wrong reduction):** pymcdm 1.x (`pymcdm/methods/copras.py`, read 2026-10-13) computes `Sp + (min(Sm)*Sm) / (Sm*(min(Sm)/Sm))`, i.e. the sums in Eq. 5 dropped, which reduces elementwise to $S_{+i} + S_{-i}$: a larger cost sum *raises* Q. The **printed Q rows of Zavadskas et al. 2007 Table 2 are exactly S₊ + S₋** (max diff 1.0e-4, both weight sets), so the error is already in the authors' 2007 example and pymcdm reproduces that table rather than Eq. 5 (see Reference example). Not offered: it contradicts Eq. 5 of the same paper and the 2001 monograph values (F3).
- **Cost criteria inverted first** (1/x or min/x, then sum normalization): that is SAW `sum`, not COPRAS. It coincides with COPRAS when there is at most one cost criterion (step 8) and differs from two cost criteria on. Not offered.
- **Normalization:** every source read uses x/Σx. scikit-criteria's `COPRAS` does not normalize internally (expects a SumScaler before it). Not a variant of the method.
- **COPRAS-G (grey/interval), fuzzy COPRAS, IVIF COPRAS** (Zavadskas et al. 2008; Hajiagha et al. 2013): other data types, out of scope.
- **pyDecision 5.1.1** follows Eq. 5 (no divergence in the formula; differences listed under Implementation notes).

## Commonly combined with
- **Weights:** AHP (OpenAlex co-mentions 344; Aytaç Adalı & Tuş Işık 2016, AHP weights, read), SWARA (154; Hashemkhani Zolfani & Bahrami 2014, TEDE, DOI [10.3846/20294913.2014.881435](https://doi.org/10.3846/20294913.2014.881435); Valipour et al. 2017, JCEM, DOI [10.3846/13923730.2017.1281842](https://doi.org/10.3846/13923730.2017.1281842); Aghdaie et al. 2013, SWARA + COPRAS-G, DOI [10.5755/j01.ee.24.1.2822](https://doi.org/10.5755/j01.ee.24.1.2822): metadata and abstracts only), Entropy (116; Özcan & Çelik 2021, DOI [10.4995/ijpme.2021.14734](https://doi.org/10.4995/ijpme.2021.14734), read: Entropy weights reproduced from the data, then COPRAS, our fixture F6), expert weights (Zavadskas et al. 2007, two stakeholder groups, read). CRITIC 66, BWM 62 (counts only).
- **Other ranking methods:** compared side by side with SAW and TOPSIS (Podvezko 2011), TOPSIS and GRA (Özcan & Çelik 2021), ARAS (Aytaç Adalı & Tuş Işık 2016); used as a reference method in the EDAS paper (Keshavarz Ghorabaee et al. 2015, Table 7, with SAW, TOPSIS, VIKOR).
- **Relation to SAW:** S₊ is SAW-`sum` restricted to the benefit criteria; with no cost criteria COPRAS = SAW `sum` (Podvezko p. 138; checked numerically), and with exactly one cost criterion too (step 8, algebra + numeric check). The methods differ only with two or more cost criteria.

## Pitfalls
- **Zero or negative values:** blocked with `non-positive-value` (`requires.positiveValues`). Mathematically a zero in a *benefit* column is harmless (x/Σx = 0) and a zero in a cost column is harmless unless all of an alternative's cost cells are 0 ($S_{-i} = 0$ → division by zero), but a near-zero cost cell dominates the cost part: X = [[5, 0.01], [9, 4], [9, 5]], benefit/cost, w = (0.5, 0.5) → Q = 0.6065, 0.1969, 0.1966, A1 wins despite the lower benefit value (its cost is 400–500 times lower). The bonus is bounded: $Q_i \le S_{+i} + W_C$ (here 0.1087 + 0.5 = 0.6087, reached as the cost cell → 0). This is not COPRAS-specific: with one cost criterion the result is identical to SAW `sum` (step 8), and SAW `linearMax` ranks A1 first too (0.7778, 0.5013, 0.5010). Negative values make shares and reciprocals meaningless. Same rule as SAW (Fatih, 06.10: non-positive value = blocking error; no shifting); see Decision 1.
- **Division by zero in step 4:** impossible once x > 0 and $W_C > 0$ (every $S_{-i} > 0$). The only remaining case is $W_C = 0$ (cost criteria present but all their weights are 0, which `validateWeights` allows): use step 7, Q = S₊. pyDecision returns NaN there (0/0, from reading the code).
- **Constant column:** a constant *benefit* column adds $w_j/m$ to every Q and never changes the ranking (0/2000 random cases). A constant **cost** column is not neutral: it adds the same amount to every $S_{-i}$, which changes the reciprocal shares. Example (ours, `copras.py`): X = [[1, 1], [4, 6], [6, 4]], types benefit/cost, w = (0.5, 0.5) → Q = 0.3984, 0.2406, 0.3610, ranks 1-3-2; add a cost column of 1s with weight 0.5 and halve the others → Q = 0.3405, 0.2895, 0.3700, ranks 2-3-1. In random 4 × 3 cases (1 benefit, 2 cost) a constant cost column (weight 0.3, rest scaled by 0.7) changed the ranking in 174/2000. With m = 2 it never does (cost part = the other alternative's S₋). The existing `constant-column` warning covers the input; the COPRAS help text should say why it matters here (Decision 4).
- **Instability (Podvezko 2011, Tables 7–8):** changing two cost values (R4: A1 105 → 110, A2 215 → 200; p. 139) flips 1-3-2 to 3-2-1 while TOPSIS keeps its order (ours: Q 0.336088, 0.328361, 0.335551 → 0.331652, 0.333799, 0.334549; either change alone gives 2-3-1 or keeps 1-3-2); Q values there differ by 0.001–0.003. Show Q to 4 decimals and N to 2.
- **Ties / near ties:** competition ranking via `rankScores(Q, 'desc')`. Near ties are common: EDAS example set 5 has a gap of 0.00001 between two consecutive Q values (set 3 and 7: 0.00008).
- **Rank reversal** when alternatives are added or removed (column sums and the reciprocal shares depend on the set): removing one alternative reordered the other four in 235/2000 random 5 × 4 cases.
- **Single alternative:** blocked by `MIN_ALTERNATIVES = 2`.
- **Only cost criteria:** S₊ = 0, Q = cost part only; computable, no special case.
- **Weights not summing to 1** (published fixtures with 0.999/1.0001): Q scales linearly with a common factor on w, so renormalizing the weights before the test does not change any rank and moves Q by < 2e-5 on F4/F6.

## Reference example (test fixture)

### F6 (main): Özcan & Çelik (2021), Entropy → COPRAS
- **Source:** Özcan, S. & Çelik, A.K. (2021). A comparison of TOPSIS, grey relational analysis and COPRAS methods for machine selection problem in the food industry of Turkey. *International Journal of Production Management and Engineering* 9(2):81–92. DOI 10.4995/ijpme.2021.14734 (printed in the PDF; CC BY-NC-ND). Full text read. **Table 1** (input, 7 cream separators × 7 criteria), **Table 2** (Entropy weights), **Table 10** (weighted normalized matrix D), **Table 11** (Q, ranks).
- **Why main:** all inputs positive, full input printed, intermediate D printed, Q to 4 d.p., Eq. 25 is the authors' Eq. 5, and the weights come from Entropy, which our `entropy.ts` reproduces from the same matrix (max diff 4.9e-5), so it also tests the Entropy → COPRAS chain.
- **Misprint:** Table 11 ranks are 7, 6, 5, 1, 4, 3, 2 and the text gives A4 > A7 > A6 > A5 > **A3 > A2** > A1, but the printed Q of A2 (0.1340) is larger than that of A3 (0.1206). Ranks implied by the printed Q: 7, **5, 6**, 1, 4, 3, 2 (= ours). The rank row and the sentence are wrong, the Q values are right. Likely cause: the COPRAS rank column is an exact copy of the TOPSIS rank column in the same table (7, 6, 5, 1, 4, 3, 2), and the sentence (p. 88, "At the end of the analysis of TOPSIS and COPRAS ... A4 > A7 > A6 > A5 > A3 > A2 > A1") states one order for both methods, which is the TOPSIS order.

```json
{
  "id": "copras-ozcan-celik-2021",
  "source": "Ozcan & Celik 2021, Int. J. Prod. Manag. Eng. 9(2):81-92, DOI 10.4995/ijpme.2021.14734, Tables 1, 2, 10, 11",
  "alternatives": ["A1", "A2", "A3", "A4", "A5", "A6", "A7"],
  "criteria": ["separation performance", "drum discharge volume", "drum turnover", "energy consumption", "weight", "price", "number of separators"],
  "types": ["benefit", "benefit", "benefit", "cost", "cost", "cost", "cost"],
  "weights_printed_table2": [0.1186, 0.3442, 0.0323, 0.086, 0.0368, 0.2148, 0.1672],
  "weights_note": "sum 0.9999; renormalize to 1 before compute (validateWeights tolerance 1e-6); or use Entropy on the matrix",
  "matrix": [
    [10, 3.5, 7.7, 15, 1.3, 39, 2],
    [20, 6, 6.8, 20, 1.6, 65, 1],
    [15, 9, 5.05, 30, 1.6, 60, 2],
    [18, 15, 6.2, 18.5, 1.3, 68, 1],
    [10, 15, 5.7, 18.5, 1.5, 87, 2],
    [20, 18, 6.2, 18.5, 1.8, 120, 1],
    [12.5, 15, 5.1, 15, 1.1, 42, 2]
  ],
  "published": {
    "D_table10": [
      [0.0112, 0.0148, 0.0058, 0.0095, 0.0047, 0.0174, 0.0304],
      [0.0225, 0.0253, 0.0051, 0.0127, 0.0058, 0.0290, 0.0152],
      [0.0169, 0.0380, 0.0038, 0.0190, 0.0058, 0.0268, 0.0304],
      [0.0202, 0.0633, 0.0047, 0.0117, 0.0047, 0.0304, 0.0152],
      [0.0112, 0.0633, 0.0043, 0.0117, 0.0054, 0.0389, 0.0304],
      [0.0225, 0.0760, 0.0047, 0.0117, 0.0065, 0.0536, 0.0152],
      [0.0141, 0.0633, 0.0039, 0.0095, 0.0040, 0.0188, 0.0304]
    ],
    "Q_table11": [0.1137, 0.1340, 0.1206, 0.1702, 0.1377, 0.1615, 0.1623],
    "ranking_table11_misprinted": [7, 6, 5, 1, 4, 3, 2]
  },
  "expected": {
    "note": "renormalized printed weights",
    "S_plus":  [0.031844, 0.052966, 0.058694, 0.088278, 0.078906, 0.103198, 0.081263],
    "S_minus": [0.062033, 0.062700, 0.082016, 0.062005, 0.086414, 0.087033, 0.062651],
    "Q": [0.113709, 0.133960, 0.120612, 0.170179, 0.137673, 0.161547, 0.162320],
    "N_percent": [66.8169, 78.7171, 70.8736, 100.0, 80.8988, 94.9274, 95.3816],
    "ranking": [7, 5, 6, 1, 4, 3, 2],
    "tolerance_vs_published": 1e-4
  }
}
```

- **Published outputs:** Q = 0.1137, 0.1340, 0.1206, 0.1702, 0.1377, 0.1615, 0.1623; best A4, worst A1.
- **Recomputed:** Entropy weights from Table 1 vs Table 2 MATCH (4.9e-5). D vs Table 10 MATCH (5.0e-5, all 49 cells). Q vs Table 11 **MATCH, max abs diff 5.3e-5** with the printed weights, 4.7e-5 renormalized, 3.7e-5 with our own Entropy weights. Ranking: MISMATCH with the printed rank row (A2/A3 swapped), MATCH with the ranks implied by the printed Q (misprint above).

### F2: Podvezko (2011), Tables 7–8, Variant II
- **Source:** Podvezko, V. (2011). The Comparative Analysis of MCDA Methods SAW and COPRAS. *Inžinerinė ekonomika – Engineering Economics* 22(2):134–146. DOI 10.5755/j01.ee.22.2.310. Full PDF read; Tables 7–8 from the text layer.
- **Misprints (Variant I, not used as a fixture):** (i) The printed Z row of Variant I (0.332, 0.334, 0.335) is the Variant II row repeated and contradicts its own rank row 1, 3, 2; our Variant I Q = 0.3361, 0.3284, 0.3356 gives 1, 3, 2. (ii) Variant I S₋ as printed (0.147, 0.199, 0.165) does not follow from Table 7 (A2-R4 = 215; ours 0.1471, 0.1971, 0.1658, diff 0.0019); with A2-R4 = 220 it is 0.1465, 0.1986, 0.1649 (diff 5.2e-4, rounding level). The text agrees with the table that A2-R4 is 215 in Variant I, so this stays an unexplained inconsistency. (iii) The text says "the values of the 3rd criterion have slightly changed"; Table 7 changes the 4th.

```json
{
  "id": "copras-podvezko-2011-variant2",
  "source": "Podvezko 2011, Engineering Economics 22(2):134-146, DOI 10.5755/j01.ee.22.2.310, Table 7 (Variant II), Table 8",
  "types": ["benefit", "benefit", "cost", "cost"],
  "weights": [0.26, 0.23, 0.24, 0.27],
  "matrix": [[42, 19, 13, 110], [71, 18, 11, 200], [53, 20, 12, 149]],
  "published": { "S_plus": [0.142, 0.184, 0.164], "S_minus": [0.151, 0.191, 0.168], "Q": [0.332, 0.334, 0.335], "ranking": [3, 2, 1] },
  "expected": {
    "S_plus": [0.142450, 0.183836, 0.163714],
    "S_minus": [0.151373, 0.190980, 0.167647],
    "Q": [0.331652, 0.333799, 0.334549],
    "N_percent": [99.13405, 99.77598, 100.0],
    "ranking": [3, 2, 1],
    "tolerance_vs_published": 5e-4
  }
}
```
- **Recomputed:** S₊ MATCH (4.5e-4), S₋ MATCH (3.7e-4), Q MATCH (4.5e-4), ranks MATCH. ΣQ = 1.

### F1 (steps only): Zavadskas, Kaklauskas, Peldschus & Turskis (2007), the authors' own example
- **Source:** *The Baltic Journal of Road and Bridge Engineering* 2(4):195–203 (OA PDF, bjrbe-journals.rtu.lv; no DOI found). **Table 1** (input, 6 road designs × 5 criteria, weight sets Wa and Wb, normalized matrix), **Table 2** (D, S₊, S₋, Q, N, rank); both tables are images, read from the extracted page images.
- **Computation error in the paper:** the printed Q rows equal **S₊ + S₋** (max diff 1.0e-4 in both weight sets), not Eq. 5 of the same paper. With Wa the ranking happens to be the same either way (1, 4, 2, 5, 3, 6); with Wb it is not: printed 1, 2, 3, 5, 4, 6 (a1 best, 100 %), Eq. 5 gives 5, 6, 1, 3, 2, 4 (a3 best). The S₊ + S₋ ranking rewards the alternatives with the highest price (Wb puts 0.70 on price, a1 is the most expensive), which is what Eq. 5 is built to avoid. Use this example for steps 1–2 only.
- **Minor:** normalized x3 of a3 printed 0.1705, 6.262/36.712 = 0.17057 (diff 7.1e-5); a few Wb cells of D appear truncated instead of rounded (max diff 8.9e-5).

```json
{
  "id": "copras-zavadskas-2007-bjrbe",
  "source": "Zavadskas, Kaklauskas, Peldschus & Turskis 2007, Baltic J. Road Bridge Eng. 2(4):195-203, Tables 1-2",
  "alternatives": ["a1", "a2", "a3", "a4", "a5", "a6"],
  "criteria": ["longevity (years)", "price (MEUR)", "environment (10 dB(A))", "economic validity (100 m)", "duration (100 days)"],
  "types": ["benefit", "cost", "cost", "cost", "cost"],
  "weights": { "Wa": [0.53, 0.1175, 0.1175, 0.1175, 0.1175], "Wb": [0.075, 0.70, 0.075, 0.075, 0.075] },
  "matrix": [
    [30, 12.487, 6.261, 10.880, 7.610],
    [20, 12.372, 5.961, 10.880, 7.460],
    [27, 11.096, 6.262, 9.920, 6.690],
    [18, 10.982, 5.962, 9.920, 6.540],
    [24, 11.017, 6.283, 9.980, 7.000],
    [16, 10.903, 5.983, 9.980, 6.850]
  ],
  "published": {
    "Wa": { "S_plus": [0.1178, 0.0785, 0.1060, 0.0707, 0.0942, 0.0628], "S_minus": [0.0833, 0.0818, 0.0766, 0.0750, 0.0775, 0.0759],
            "Q_wrong_equals_Splus_plus_Sminus": [0.2011, 0.1603, 0.1826, 0.1456, 0.1717, 0.1387], "N": [100, 76.70, 90.78, 72.43, 85.37, 68.98], "ranking": [1, 4, 2, 5, 3, 6] },
    "Wb": { "S_plus": [0.0167, 0.0111, 0.0150, 0.0100, 0.0133, 0.0089], "S_minus": [0.1665, 0.1645, 0.1496, 0.1475, 0.1494, 0.1474],
            "Q_wrong_equals_Splus_plus_Sminus": [0.1832, 0.1756, 0.1646, 0.1575, 0.1628, 0.1563], "N": [100, 95.85, 89.84, 86.00, 88.86, 85.32], "ranking": [1, 2, 3, 5, 4, 6] }
  },
  "expected_eq5": {
    "Wa": { "Q": [0.191303, 0.153460, 0.186025, 0.152370, 0.173306, 0.143537], "N_percent": [100.0, 80.2182, 97.2407, 79.6483, 90.5922, 75.0312], "ranking": [1, 4, 2, 5, 3, 6] },
    "Wb": { "Q": [0.159009, 0.155227, 0.173468, 0.170657, 0.171945, 0.169694], "N_percent": [91.6651, 89.4846, 100.0, 98.3799, 99.1220, 97.8245], "ranking": [5, 6, 1, 3, 2, 4] }
  },
  "tolerance_steps_vs_published": 1e-4
}
```
- **Recomputed:** D MATCH (Wa 4.9e-5, Wb 8.9e-5), S₊ MATCH (3.3e-5), S₋ MATCH (4.9e-5) in both sets; Q/N/rank: **MISMATCH** (Q 0.0098 Wa, 0.0242 Wb; Wb ranking differs), fully explained by the S₊ + S₋ error.

### F3 (Q step only): Podvezko (2011), Table 9
- S₊ and S₋ printed for 5 plots (from Zavadskas, Kaklauskas & Banaitienė 2001, Table 6.20, the authors' monograph; not opened): S₊ = 0.1374, 0.1292, 0.1109, 0.1116, 0.0496; S₋ = 0.1405, 0.0898, 0.0855, 0.0983, 0.0470; printed Z = 0.1908, 0.2129, 0.1988, 0.1880, 0.2093 (ΣZ = 0.9998). Step 4 on the printed S₊/S₋ gives 0.1909, 0.2128, 0.1987, 0.1880, 0.2094: **MATCH (8.6e-5)**. This is the evidence that the authors' own 2001 computation follows Eq. 5, not S₊ + S₋.

### F5 (secondary): Aytaç Adalı & Tuş Işık (2016)
- **Source:** Aytaç Adalı, E. & Tuş Işık, A. (2016). Air conditioner selection problem with COPRAS and ARAS methods. *Manas Sosyal Araştırmalar Dergisi* 5(2):124–138 (DergiPark article-file 577434; page range inferred from the PDF running heads, first page unnumbered). Full text read; Table 1 checked on the page image.
- **Misprint:** the weight row of Table 1 (0.2817, 0.1387, 0.0413, **0.0413**, 0.0215, 0.0215, **0.0215**, 0.2817) sums to 0.8492. Table 3 / Table 2 give back C4 ≈ 0.0748 and C7 ≈ 0.1388; with C4 = 0.0749 and C7 = 0.1387 (sum 1.0000) everything matches. The text also says "the last six criteria" for five cost criteria.
- **Not usable as a `compute()` test while zeros are blocked:** C3 (ionizer present, 0/1) has zeros.
- Input: X = [[4.60, 5.00, 1, 2750, 38, 45, 800, 760], [3.30, 3.71, 1, 2267, 39, 65, 880, 900], [3.61, 3.84, 1, 1584, 38, 50, 990, 970], [3.37, 3.62, 1, 1650, 35, 53, 1010, 1050], [4.09, 4.40, 0, 2650, 40, 55, 870, 860], [3.24, 3.88, 0, 3340, 57, 52, 1080, 1030]], types 3 × benefit, 5 × cost.
- **Published:** Q = 0.1982, 0.1652, 0.1682, 0.1592, 0.1697, 0.1394; U = 100, 83.3211, 84.8544, 80.3317, 85.5961, 70.3159 %; ranks 1, 4, 3, 5, 2, 6.
- **Recomputed** (reconstructed weights): Q = 0.198241, 0.165183, 0.168227, 0.159261, 0.169690, 0.139397 → **MATCH (6.1e-5)**; U MATCH (0.0057 percentage points); D rows A1–A4 MATCH (6.4e-5); ranks MATCH. With the printed weights: Q MISMATCH (0.027), ranks still the same.

### F4 (ranks): Keshavarz Ghorabaee et al. (2015), Tables 5–7
- 10 × 7 matrix and 7 weight sets (JSON `edas-2015-table5-set1` in `edas.md`). Published COPRAS ranks reproduced in **7/7 sets (MATCH)**. Ranks only. Weight sets sum to 0.999–1.001; renormalizing does not change ranks (Q is linear in a common weight factor). Set-1 Q (4 d.p., derived): 0.1235, 0.1159, 0.0901, 0.0743, 0.0889, 0.0857, 0.1177, 0.1141, 0.1117, 0.0781. The S₊ + S₋ (pymcdm) formula reproduces 0/7 sets.

### Libraries (divergence only, never a reference)
- **pyDecision 5.1.1 `copras_method(dataset, weights, criterion_type, graph, verbose)`** (`pyDecision/algorithm/copras.py`, run from the wheel with matplotlib stubbed): uses Eq. 5; returns only $u_i = Q_i/Q_{\max}$ (N/100, no Q, no S₊/S₋); with no `'min'` criteria returns Q = S₊ (same as ours). F1 Wa/Wb: equal to our N/100 (diff 1.1e-16). From the code: no positivity check; all cost weights 0 → 0/0 → NaN.
- **pymcdm 1.x `COPRAS`:** Q = S₊ + S₋ (see Variants); raises an error if all criteria are benefit. Reproduces the wrong 2007 Table 2, fails F3, F4 (0/7), F6.
- **scikit-criteria `COPRAS`:** Eq. 5, but no internal normalization (the user must apply a sum scaler first); rejects all-benefit problems and any alternative whose cost cells are all 0.
- **pyrepo-mcda `COPRAS`:** simplified form (step 4) with sum normalization; same as ours.

## Implementation notes
- `src/core/methods/copras.ts`, `export const copras: RankingMethod = { id: 'copras', kind: 'ranking', requires: { positiveValues: true }, compute }`; no `params` (property absent, like methods without options). Register in `registry.ts` `ranking` list.
- Validation exactly like `saw.ts`: `validateProblem` → (if no structural error) `validateRequirements(problem, copras)` → `validateWeights` → `assertValid`.
- Compute in float64, in this order: column sums $\sum_i x_{ij}$; `D[i][j] = w[j] * x[i][j] / colSum[j]`; `sPlus[i]`, `sMinus[i]`; `wCost = Σ_{j∈C} w_j`; if no cost criterion or `wCost === 0` → `Q = sPlus` (step 7); else `inv[i] = 1 / sMinus[i]`, `Q[i] = sPlus[i] + wCost * inv[i] / Σ inv` (step 4, uses ΣS₋ = W_C; computing ΣS₋ from the vector instead is equivalent, pick one and test the invariant). `N[i] = 100 * Q[i] / max(Q)`.
- Return `scores: Q`, `order: 'desc'`, `ranking: rankScores(Q, 'desc')`. Steps (keys for i18n): `copras.normalizedSum` (x/Σx, matrix), `copras.weighted` (D, matrix), `copras.sPlus` (vector), `copras.sMinus` (vector), `copras.significance` (Q, vector), `copras.utility` (N %, vector). Diagnostics: `{ sumQ }` (should equal Σw), optionally `wCost`.
- Warnings: none needed beyond the existing `constant-column`; optional `copras-no-cost-criteria` (info: result equals SAW `sum`), see Decision 2.
- Tests (Vitest): F6 Q (tol 1e-4 vs published, 1e-6 vs `expected`), F6 D (tol 5e-5), F6 Entropy → COPRAS chain ranks; F2 S₊/S₋/Q (tol 5e-4) and ranks; F1 S₊/S₋ (tol 1e-4) and `expected_eq5` Q (tol 1e-6) for both weight sets (documents that we do not follow the printed Q); F3 step-4 helper on printed S₊/S₋ (tol 1e-4) if the helper is exported; F4 ranks 7/7 with renormalized weights; property tests: ΣQ = Σw (1e-12), scale invariance per column, all-benefit and single-cost-criterion problems equal `saw` with `normalization: 'sum'` (scores identical), a two-cost-criteria case where they differ, m = 2 identity Q_i = S₊i + S₋other, original vs simplified Q form identical; validation: zero/negative cell → `non-positive-value`, m = 1 → `too-few-alternatives`, all cost weights 0 → Q = S₊ (no NaN), tie → shared rank, constant cost column example above changes ranks 1-3-2 → 2-3-1 (documents the behaviour).

## Decisions for the owner
1. **Zeros:** block every non-positive value as in SAW (recommended: one rule for all ratio methods, and it closes the near-zero-cost trap only partly but the S₋ = 0 case fully), or allow zeros in benefit columns only (mathematically safe; would make F5 testable). Recommendation: block, keep the rule uniform.
2. **No cost criteria:** compute Q = S₊ (= SAW `sum`) and show an info note (recommended; pyDecision and the Podvezko text do this), or refuse like pymcdm and scikit-criteria. Recommendation: compute + note.
3. **What the table shows:** Q as the score column and N % as a second column (recommended; N is what the authors report, Q is what sums to 1). No parameter is exposed.
4. **Constant cost column:** keep the generic `constant-column` warning but make its COPRAS help text say that, unlike SAW, a constant cost column can change the ranking (recommended), or add a COPRAS-specific warning code.
5. **Main fixture:** F6 Özcan & Çelik 2021 (clean, positive, Entropy chain) with F2 Podvezko as the second; F1 used for steps only with the S₊ + S₋ error documented (recommended).

## Sources
- Zavadskas, E.K., Kaklauskas, A., Peldschus, F. & Turskis, Z. (2007). Multi-attribute assessment of road design solutions by using the COPRAS method. *The Baltic Journal of Road and Bridge Engineering* 2(4):195–203. OA PDF https://bjrbe-journals.rtu.lv/bjrbe/article/download/1822-427X.2007.4.195%E2%80%93203/34 , read in full; Tables 1–2 read from the embedded images. Eqs. 1–6.
- Podvezko, V. (2011). *Engineering Economics* 22(2):134–146, DOI 10.5755/j01.ee.22.2.310, PDF https://inzeko.ktu.lt/index.php/EE/article/download/310/19875 , read in full (Eqs. 8–20, Tables 7–9).
- Özcan, S. & Çelik, A.K. (2021). *Int. J. Production Management and Engineering* 9(2):81–92, DOI 10.4995/ijpme.2021.14734, PDF via distantreader.org mirror (stacks/journals/ijpme/ijpme-14734.pdf), read in full (Eqs. 23–25, Tables 1, 2, 10, 11).
- Aytaç Adalı, E. & Tuş Işık, A. (2016). *Manas Sosyal Araştırmalar Dergisi* 5(2), https://dergipark.org.tr/en/download/article-file/577434 , read in full (Eqs. 1–8, Tables 1–4; Table 1 on the page image).
- Keshavarz Ghorabaee, M. et al. (2015). *Informatica* 26(3):435–451, DOI 10.15388/Informatica.2015.57 (Table 7 COPRAS ranks, JSON from `edas.md`; not re-read today).
- Razavi Hajiagha, S.H., Hashemi, S.S. & Zavadskas, E.K. (2013). *TEDE* 19(1):22–37, DOI 10.3846/20294913.2012.762953, read Section 1 (Eqs. 2–10, crisp COPRAS restated, simplified form Eq. 8).
- Popović, G., Stanujkić, D. & Stojanović, S. (2012). *Serbian Journal of Management* 7(2):257–269, DOI 10.5937/sjm7-2268, read Section 3 (Eqs. 7–12); its example mixes interval data, not used.
- Zavadskas, Kaklauskas & Šarka (1994), TEDE 1(3):131–139; Zavadskas & Kaklauskas (1996), Technika; Zavadskas, Kaklauskas & Banaitienė (2001): **not opened** (not online).
- Hashemkhani Zolfani & Bahrami (2014), Valipour et al. (2017), Aghdaie et al. (2013): OpenAlex metadata and abstracts only.
- Code read 2026-10-13: pyDecision 5.1.1 `algorithm/copras.py` (local wheel); pymcdm `pymcdm/methods/copras.py` (gitlab.com/shekhand/mcda, master); pyrepo-mcda `mcda_methods/copras.py` (github.com/energyinpython, main); scikit-criteria `skcriteria/agg/copras.py` (rendered source on scikit-criteria.quatrope.org).
- Recompute: `scratchpad/mcdm/scripts/copras.py` (numpy 2.5.3), output `scratchpad/mcdm/scripts/copras.out`.

## Changes on re-verification (2026-10-13)
- Formulas now from the authors' own 2007 restatement (read in full) instead of Podvezko only; origin line says plainly that the 1994 paper and 1996 book were not opened and are not online.
- **New finding:** the authors' 2007 worked example prints Q = S₊ + S₋, not their Eq. 5 (both weight sets; Wb ranking changes). pymcdm implements that same wrong reduction. Documented as a variant not offered; F3 (2001 monograph values via Podvezko Table 9) confirms Eq. 5 is the authors' method.
- **New main fixture** F6 (Özcan & Çelik 2021): Entropy → COPRAS chain, D and Q MATCH (5.3e-5); printed rank row misprint (A2/A3) recorded.
- **New secondary** F5 (Aytaç Adalı & Tuş Işık 2016): weight-row misprint reconstructed (C4 0.0749, C7 0.1387), Q MATCH (6.1e-5); not a compute() test while zeros are blocked.
- F2 (Podvezko Variant II) re-run: MATCH (4.5e-4). Variant I: the draft said A2-R4 = 220 reproduces S₋ "to 0.0005"; precise value is 5.2e-4 (rounding level), and the text confirms 215, so it stays unexplained, not a fixture.
- F4 (EDAS ranks) re-run: 7/7.
- Algorithm: simplified form written as a share of the reciprocal cost sums ($W_C$ · reciprocal share), chosen for the implementation; W_C = 0 case defined; m = 2 identity added.
- Pitfalls: constant **cost** column shown to change rankings (example + 174/2000), unlike SAW; near-zero cost example; rank-reversal rate quantified; near-tie gaps from F4.
- Site copy shortened to one sentence each (EN/TR, "siz"), four sourced bullets, UI labels.
- pyDecision divergence corrected: it returns N/100 only; pymcdm, scikit-criteria, pyrepo-mcda behaviour added.
- Not verified: origin texts; Google Scholar count; SWARA–COPRAS papers (abstracts only); Zavadskas et al. 2016 hybrid count and Kocatürk Çetin counts (carried from `combinations.md`).

## Verification log (reconciliation, 2026-10-13)
Primary sources re-opened: Podvezko 2011 PDF text layer (`sk2copras/podvezko.txt`), Özcan & Çelik 2021 (`copras-src/ijpme.txt`), project `saw.ts`. Recompute: `scripts/copras_reconcile.py` → `scripts/copras_reconcile.out`.
1. **Near-zero cost example overclaimed** ("huge bonus", "clearly weaker alternative wins"): skeptic right. A1's cost is 400–500× lower, so it is not clearly weaker; result identical to SAW `sum` (diff 0) and SAW `linearMax` also ranks A1 first; bonus bounded by $S_{+i} + W_C$ = 0.6087 (the skeptic's "0.1957" for $S_{+1}$ is a slip; $S_{+1}$ = 0.1087). Pitfall rewritten.
2. **COPRAS = SAW `sum` also with one cost criterion:** skeptic right (algebra + 2000 random cases, diff 2.2e-16; with two cost criteria rankings differ in 437/2000). Added Algorithm step 8; fixed the Variants line, Relation to SAW, the EN/TR site bullet and the tests list.
3. **"One cost value changed" (site source note, Pitfalls, Use-when):** skeptic right. Podvezko p. 139: "r41 =105 is replaced by r41 =110 and r42 =215 is substituted for r42 =200". Recompute VarI 1-3-2, VarII 3-2-1 confirmed. The user-facing sentence ("small changes in cost values") was already accurate and stays. Fixed in three places.
4. **p. 137 → p. 138** for "considered separately" and "If only maximizing criteria are used": skeptic right (footer "- 137 -" at text line 308, quotes at 328–332, "- 138 -" at 415). Fixed in the site bullets and Algorithm step 7. The origin-dating citation (p. 137, "In 1996 ... Zavadskas, Kaklauskas 1996") is before the 137 footer, so it stays p. 137.
5. **F6 misprint explanation:** skeptic right that it should be more precise. Table 11 TOPSIS rank column 7, 6, 5, 1, 4, 3, 2 equals the printed COPRAS ranks, and the sentence covers both methods. Added as the likely source; conclusion (printed Q correct, printed ranks wrong) unchanged.
6. **Duplicate of 3** (second skeptic): same resolution.
7. **Duplicate of 4** (second skeptic): same resolution.
8. **Popularity quote not verbatim:** skeptic right. Replaced with the verbatim words "the most commonly used methods are SAW, COPRAS and TOPSIS" (p. 135, text line 101).

