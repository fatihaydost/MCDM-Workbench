# Additive Ratio ASsessment (ARAS)

**Re-verified 2026-10-24** against Zavadskas & Turskis (2010, *TEDE*, open access, Tables 1–3) and two independent Turkish worked examples read in full from DergiPark: Bakır & Atalık (2018, *İşletme Araştırmaları Dergisi*, Entropy → ARAS, 11 airlines × 7 criteria, Tables 3–11) and Aytaç Adalı & Tuş Işık (2016, *Manas Sosyal Araştırmalar Dergisi*, AHP → ARAS, 6 air conditioners × 8 criteria, Tables 1, 5–8), plus Ercan & Kundakcı (2017, *Afyon Kocatepe Üniversitesi Sosyal Bilimler Dergisi*, Eqs. 1–6). All fixtures and algebraic properties recomputed in numpy (`scripts/aras.py`, output `scripts/aras.out`). See "Changes on re-verification" at the end.

- **Family:** ranking (compensatory / utility: additive weighted sum of extended-column sum-normalized values, divided by the optimal row's weighted sum)
- **Origin:** Zavadskas, E.K. & Turskis, Z. (2010). A new additive ratio assessment (ARAS) method in multicriteria decision-making. *Technological and Economic Development of Economy* 16(2):159–172, DOI [10.3846/tede.2010.10](https://doi.org/10.3846/tede.2010.10) (open access). Formulas below match Zavadskas & Turskis (2010) and the verbatim restatements in Bakır & Atalık (2018, Eqs. 6–11) and Aytaç Adalı & Tuş Işık (2016, Eqs. 9–15).
- **Popularity:** cited-by for the 2010 origin paper: Crossref 877, OpenAlex 969 (checked 2026-10-24); Bakır & Atalık (2018): Crossref 48. Widely paired in the Vilnius-school and Turkish MCDM literature with Entropy, AHP, SWARA, CRITIC, and expert weights (Aytaç Adalı & Tuş Işık 2016 literature review, pp. 128–130).

## For users (site copy)
- **EN:** ARAS adds an optimal benchmark row built from the best value on each criterion, totals every row's weighted shares, and scores each alternative as its fraction of that optimal total.
- **TR:** ARAS tabloya her kriterin en iyi değerinden oluşan optimal bir satır ekler, tüm satırların ağırlıklı paylarını toplar ve her alternatifi bu optimal toplamın oranı olarak puanlar.

**When to use / combined with (site bullets, one sentence each, backed by sources read in full):**
- **EN:** Use it when all values are positive and you want each score read as a share of an optimal benchmark. *(Zavadskas & Turskis 2010; Bakır & Atalık 2018, Eq. 11)*
  **TR:** Tüm değerler pozitifse ve her skoru optimal bir kıyas satırının payı olarak okumak istiyorsanız kullanın.
- **EN:** Unlike MARCOS, ARAS does not always match SAW: adding the optimal row into each column sum changes how much each criterion weighs in the total (339/2000 random cases differ from SAW Sum, 679/2000 from SAW Linear). *(our algebra, Algorithm step 7; `scripts/aras.py`)*
  **TR:** MARCOS'un aksine ARAS her zaman SAW ile aynı sırayı vermez: optimal satırı her sütun toplamına katmak kriterlerin toplamdaki etkin ağırlığını değiştirir.
- **EN:** ARAS only ranks; published studies take its weights from Entropy, AHP, SWARA or expert panels. *(experts: Zavadskas & Turskis 2010, Table 1; Entropy: Bakır & Atalık 2018, Table 7; AHP: Aytaç Adalı & Tuş Işık 2016, Table 1; SWARA: Stanujkić et al. 2015)*
  **TR:** ARAS yalnız sıralar; yayımlanmış çalışmalarda ağırlıklar Entropi, AHP, SWARA ya da uzman değerlendirmelerinden gelir.
- **EN:** Be careful: cost criteria are inverted with $1/x$, so zero or negative values cannot be used and very small cost values dominate their column. *(Bakır & Atalık 2018, Eq. 8; Aytaç Adalı & Tuş Işık 2016, Eq. 11)*
  **TR:** Dikkat: maliyet kriterleri $1/x$ ile ters çevrilir; bu yüzden sıfır veya negatif değer kullanılamaz ve çok küçük maliyet değerleri sütuna baskın çıkar.

**UI labels:** score column EN "Utility degree K" / TR "Fayda derecesi K"; step column EN "Optimality S" / TR "Optimallik S"; constant pill $S_0$. No UI options (default optimal row = column best; optional `optimal` vector in the core API for testing external norm vectors).

### Visual proposal (site)
1. **Method idea (`ArasOptimalBar`): "the optimal benchmark bar $A_0$ and each alternative's share $K_i = S_i / S_0$".**
   - Top benchmark row: $A_0$ drawn as a full-width dashed benchmark bar reaching $S_0$, with a vertical dotted reference line dropping down from $S_0$ across all alternative rows and a pill showing $S_0$ ($K_0 = 100\%$).
   - Below a thin separator: one horizontal bar per alternative in rank order, scaled to $S_0$ (so the bar fill length is literally $K_i = S_i / S_0 \in (0, 1]$), with the winner highlighted in `--accent`, $S_i$ printed at the bar tip, and $K_i$ (plus percentage on hover/focus) in the right column.
   - 3-step `IdeaSteps` narrative on the method page:
     - Step 0: each alternative's weighted sum $S_i = \sum_j \hat{x}_{ij}$ from the extended sum-normalized table.
     - Step 1: the optimal row $A_0$ sets the benchmark total $S_0 = \sum_j \hat{x}_{0j}$ at the top of the chart.
     - Step 2: dividing each $S_i$ by $S_0$ gives the utility degree $K_i = S_i / S_0$ and the final ranking.

## When to use / when not
- **Use when:** all values are strictly positive ratio-scale amounts; you want a direct ratio-to-optimum interpretation ($K_i \in (0, 1]$); you want results comparable with the Zavadskas–Turskis and Turkish Entropy/AHP/SWARA → ARAS literature.
- **Do not use when:** data contain zeros or negatives (blocked with `non-positive-value`); data are on an interval scale (reciprocals $1/x$ and column shares are not shift-invariant); full compensation between criteria is unacceptable.

## Inputs
- Decision matrix $X$ ($m \times n$), $m \ge 2$, $n \ge 2$, **all $x_{ij} > 0$** (blocking `non-positive-value` via `requires: { positiveValues: true }`, same rule as SAW, WASPAS, COPRAS and MARCOS).
- Criterion types `benefit|cost`; weights $w_j \ge 0$, $\sum_j w_j = 1$.
- Optional parameter `ArasParams = { optimal?: readonly number[] }` in `aras.compute(problem, weights, params)`:
  - Default (when `optimal` is omitted, as in the UI and in Bakır & Atalık 2018, Aytaç Adalı & Tuş Işık 2016, Ercan & Kundakcı 2017, and `pyDecision`): column best $x_{0j} = \max_{1 \le i \le m} x_{ij}$ for benefit criteria, $x_{0j} = \min_{1 \le i \le m} x_{ij}$ for cost criteria.
  - When `params.optimal` is supplied (for testing external target norms such as Zavadskas & Turskis 2010 Table 1): validates length $n$ and finite positive values $x_{0j} > 0$.

## Algorithm
Notation: alternatives $i = 1..m$, optimal row $i = 0$, criteria $j = 1..n$, $B$ = benefit criteria, $C$ = cost criteria.

1. **Optimal row ($A_0$)** (Bakır & Atalık 2018, Eq. 6):
   $$x_{0j} = \begin{cases} \max_{1 \le i \le m} x_{ij}, & j \in B, \\ \min_{1 \le i \le m} x_{ij}, & j \in C \end{cases}$$
   (or user-supplied $x_{0j} > 0$). Together with $X$, this forms the $(m+1) \times n$ extended decision matrix with rows $i = 0, 1, \dots, m$.
2. **Extended sum normalization** (Eqs. 7–8; Aytaç Adalı & Tuş Işık 2016, Eqs. 10–12):
   - For benefit criteria ($j \in B$), $x^*_{ij} = x_{ij}$ ($i = 0..m$).
   - For cost criteria ($j \in C$), invert all $m+1$ rows (including row 0): $x^*_{ij} = 1 / x_{ij}$ ($i = 0..m$).
   - Normalize each column by its $(m+1)$-row sum (including row 0):
     $$\bar{x}_{ij} = \frac{x^*_{ij}}{\sum_{k=0}^{m} x^*_{kj}}, \qquad i = 0, 1, \dots, m.$$
3. **Weighted normalized matrix** (Eq. 9):
   $$\hat{x}_{ij} = w_j \, \bar{x}_{ij}, \qquad i = 0, 1, \dots, m.$$
4. **Optimal benchmark score ($S_0$)** (Eq. 10 for $i = 0$):
   $$S_0 = \sum_{j=1}^{n} \hat{x}_{0j} = \sum_{j=1}^{n} w_j \, \bar{x}_{0j}.$$
5. **Optimality function ($S_i$)** (Eq. 10 for $i = 1..m$):
   $$S_i = \sum_{j=1}^{n} \hat{x}_{ij}, \qquad i = 1, \dots, m.$$
6. **Utility degree ($K_i$)** (Eq. 11):
   $$K_i = \frac{S_i}{S_0}, \qquad i = 1, \dots, m.$$
   Rank alternatives by decreasing $K_i$ (competition ranking for ties).
7. **Relation to SAW (`sum` and `linearMax`) — why ARAS is not an echo (our derivation):**
   - Let $r^{\text{sum}}_{ij} = \dfrac{x^*_{ij}}{\sum_{k=1}^{m} x^*_{kj}}$ be the SAW `sum` normalized value over the $m$ real alternatives, and let $p_{0j} = \dfrac{x^*_{0j}}{\sum_{k=1}^{m} x^*_{kj}}$ be the optimal row's share relative to the alternatives' column sum.
   - Because ARAS includes $x^*_{0j}$ in the column denominator, for every real alternative $i = 1..m$:
     $$\bar{x}_{ij} = \frac{x^*_{ij}}{x^*_{0j} + \sum_{k=1}^{m} x^*_{kj}} = \frac{1}{1 + p_{0j}} \, r^{\text{sum}}_{ij}.$$
   - Therefore,
     $$S_i = \sum_{j=1}^{n} \frac{w_j}{1 + p_{0j}} \, r^{\text{sum}}_{ij}.$$
     That is: **ARAS $S_i$ equals SAW `sum` with effective unnormalized weights $\tilde{w}_j = w_j / (1 + p_{0j})$** (checked across 2,000 random problems: $\max |S_{\text{ARAS}} - S_{\text{SAW-sum}}(\tilde{w})| = 1.7 \times 10^{-16}$).
   - Because $p_{0j} = \max_i x^*_{ij} / \sum_{k=1}^{m} x^*_{kj} \in [1/m, 1)$ depends on each column's spread (a column where one alternative dominates has $p_{0j}$ close to $1$, downweighting that column by up to $1/2$, whereas a nearly uniform column has $p_{0j} \approx 1/m$, downweighting it by only $m/(m+1)$), **ARAS is not order-equivalent to SAW `sum` or SAW `linearMax`**:
     - In 2,000 random problems ($m \in [3, 8]$, $n \in [2, 7]$), ARAS gave a different ranking from SAW `sum` in **339/2,000** cases (17.0%) and from SAW `linearMax` in **679/2,000** cases (34.0%).
     - Concrete $3 \times 2$ example (both benefit, $w = [0.5, 0.5]$): $X = [[10, 7], [7, 9], [9, 1]]$. Column 1 has sum $26$ and $A_{01} = 10$ (extended sum $36$); column 2 has sum $17$ and $A_{02} = 9$ (extended sum $26$). SAW `sum` scores $[0.3982, 0.3993, 0.2025]$ (ranks **2, 1, 3**), whereas ARAS gives $K = [0.8767, 0.8664, 0.4623]$ (ranks **1, 2, 3**).
     - On the Compare benchmark (`keshavarz-2015-ten-alternatives`, $10 \times 7$), ARAS ranks `[1, 2, 6, 10, 7, 8, 3, 4, 5, 9]`, differing from SAW `linearMax` (`[1, 3, 6, 9, 7, 8, 2, 4, 5, 10]`).
8. **Role of $S_0$ vs $x_{0j}$:**
   - Once $x_{0j}$ is fixed, $S_0 > 0$ is a single constant for the whole table, so $K_i = S_i / S_0$ always has the exact same ranking and pairwise ratios as $S_i$ (0/2,000 differences).
   - Changing $x_{0j}$ (for example, supplying external target norms larger than the column maximums) changes $p_{0j}$ per column, which reweights the criteria and changed the ranking in **295/2,000** random cases (`scripts/aras.py`).

## Commonly combined with
- **Weights:** Expert weights (Zavadskas & Turskis 2010, Table 1), Entropy (Bakır & Atalık 2018, Table 7), AHP (Aytaç Adalı & Tuş Işık 2016, Table 1; Ercan & Kundakcı 2017), SWARA (Stanujkić et al. 2015).
- **Compared with:** COPRAS (Aytaç Adalı & Tuş Işık 2016), SAW, TOPSIS, VIKOR, EDAS, CODAS (Keshavarz Ghorabaee et al. 2016 Example 2 uses the 2010 ARAS microclimate dataset), MARCOS (Stević & Brković 2020).

## Pitfalls
- **Zero or negative values:** blocked with `non-positive-value` (`requires.positiveValues`), same rule as SAW, WASPAS, COPRAS and MARCOS. Cost criteria use $1/x_{ij}$ (including $1/x_{0j}$), which divides by zero at $0$ and flips sign for negative numbers.
- **Bounds and external norms:** with data-derived $x_{0j}$ (column best), $0 < x^*_{ij} \le x^*_{0j}$ for every $i, j$, so $0 < S_i \le S_0 < 1$ and $K_i \in (0, 1]$, with $K_i = 1$ if and only if alternative $i$ achieves the best value on every positively weighted criterion. If a user-supplied `optimal` vector has a target worse than some alternative on a criterion, $K_i$ can exceed $1$.
- **All alternatives equal:** every row $i = 0..m$ has $\bar{x}_{ij} = 1/(m+1)$, so $S_0 = S_i = 1/(m+1)$ (when $\sum w = 1$) and $K_i = 1$ for every alternative; all tie at rank 1.
- **Constant column (with column-best $A_0$):** in a constant column $x_{ij} = c > 0$ (whether benefit or cost), $x_{0j} = c$ and every row $i = 0..m$ gets $\bar{x}_{ij} = 1/(m+1)$ and $\hat{x}_{ij} = w_j / (m+1)$. Adding $\frac{w_j}{m+1}$ to every $S_i$ and to $S_0$ preserves all differences $S_i - S_k$ and **never changes the ranking** (0/2,000 random cases for both benefit and cost constant columns, unlike COPRAS where a constant cost column can flip ranks), though it moves $K_i = S_i / S_0$ closer to $1$.
- **Scale invariance:** multiplying any column $j$ by a positive factor $c_j > 0$ leaves $\bar{x}_{ij}$, $S_i$, $S_0$ and $K_i$ unchanged ($\max |\Delta K| = 3.3 \times 10^{-16}$).
- **Rank reversal** when alternatives are added or removed (column sums and column bests change): dropping one alternative reordered the remaining four in **305/2,000** random $5 \times 4$ cases (`scripts/aras.py`).

## Reference examples (test fixtures)

### F1 (origin): Zavadskas & Turskis (2010), 14 office rooms × 6 criteria (4 benefit, 2 cost)
- **Source:** Zavadskas, E.K. & Turskis, Z. (2010), *Technological and Economic Development of Economy* 16(2):159–172, DOI `10.3846/tede.2010.10`, Tables 1–3. Fixture file: `tests/fixtures/aras-zavadskas-turskis2010.json`.
- **Two variants tested:**
  1. **F1a (paper's external optimal norms `optimal = [15, 50, 24.5, 400, 0.05, 5]`):**
     - **Exact root cause of the Table 2 / Table 3 room 8 discrepancy:** In Table 1, room 8 has illumination $x_{8,4} = 400\text{ lx}$ (equal to the optimal norm $x_{0,4} = 400\text{ lx}$), so column 4 sums to $4740$ and $\bar{x}_{0,4} = \bar{x}_{8,4} = 400/4740 = 0.084388 \approx 0.0844$. When the authors computed column 4 of Table 2, room 8's illumination was accidentally entered as $390\text{ lx}$ (copied from room 1), reducing the column sum by $10$ from $4740$ to $4730$: that single slip simultaneously produced $\bar{x}_{0,4} = 400/4730 = 0.084567 \to \mathbf{0.0846}$ (printed in Table 2 row 0) and $\bar{x}_{1,4} = \bar{x}_{8,4} = 390/4730 = 0.082452 \to \mathbf{0.0825}$ (printed in Table 2 rows 1 and 8)! Recomputing with $x_{8,4} = 390$ reproduces Table 2 row 0 to 4 d.p. (`[0.1546, 0.0776, 0.0843, 0.0846, 0.0833, 0.1067]`), all 14 rows of Table 3 $S_i$ within $4.9 \times 10^{-5}$, all 14 rows of $K_i$ within $5.0 \times 10^{-5}$, and the printed rank order (`9 ≻ 8 ≻ ...`). With the true Table 1 value $x_{8,4} = 400$, room 8 has $S_8 = 0.077391$, $K_8 = 0.776221 > K_9 = 0.773369$, so **room 8 ranks 1st and room 9 ranks 2nd** (`[4, 6, 10, 9, 14, 13, 12, 1, 2, 11, 3, 5, 8, 7]`), while all other 13 rooms match Table 3 within $5.7 \times 10^{-5}$ on $S_i$ and $1.3 \times 10^{-4}$ on $K_i$.
  2. **F1b (default column-best $A_0 = [12, 48, 23.2, 400, 0.09, 5]$, `pyDecision` convention):**
     - Gives $S_0 = 0.083204$, $K = [0.821047, 0.800242, 0.764467, 0.770563, 0.665628, 0.679851, 0.687891, 0.948502, 0.945484, 0.730671, 0.825491, 0.807174, 0.775587, 0.796014]$, and the **exact same 14/14 ranking** `[4, 6, 10, 9, 14, 13, 12, 1, 2, 11, 3, 5, 8, 7]` as F1a corrected, with zero difference against `pyDecision`'s `aras_method`.

### F2 (Turkish, Entropy → ARAS, main example): Bakır & Atalık (2018), 11 airlines × 7 criteria
- **Source:** Bakır, M. & Atalık, Ö. (2018). Entropi ve Aras Yöntemleriyle Havayolu İşletmelerinde Hizmet Kalitesinin Değerlendirilmesi. *İşletme Araştırmaları Dergisi* 10(1):617–638, DOI `10.20491/isarder.2018.410` (open access, read in full). Table 3 (decision matrix, 11 airlines × 7 Skytrax Business Class criteria), Tables 4–7 (Entropy normalization, $e_j$, $d_j$, weights $w_j$), Table 8 (extended matrix with column-best $A_0$), Table 9 (normalized matrix $\bar{x}_{ij}$), Table 10 (weighted matrix $\hat{x}_{ij}$), Table 11 ($S_0$, $S_i$, $K_i$, rank). Fixture file: `tests/fixtures/aras-bakir-atalik2018.json`. Used as the preset example `bakir-atalik-2018-airlines` in `src/data/examples.ts`.
- **Recomputed:**
  - Entropy weights from Table 3 vs Table 7 (`[0.146829, 0.166067, 0.111597, 0.128694, 0.179882, 0.146586, 0.120345]`): **MATCH** ($\max |\Delta w| = 1.33 \times 10^{-5}$).
  - Column-best $A_0 = [4.750, 4.429, 4.125, 4.875, 4.500, 4.625, 4.800]$ vs Table 8: **exact MATCH** (diff 0).
  - Normalized matrix $\bar{x}_{ij}$ vs Table 9 (rows $A_0$ through Qantas): **MATCH** ($\max |\Delta \bar{x}| = 5.7 \times 10^{-5}$, 4 d.p.).
  - Weighted matrix $\hat{x}_{ij}$ vs Table 10 (rows $A_0$ through Qantas): **MATCH** ($\max |\Delta \hat{x}| = 5.0 \times 10^{-6}$, 5 d.p.).
  - **Display misprint in Tables 9 and 10 row `THY` (harmless to Table 11):** In both Table 9 and Table 10, the final row (`THY`) accidentally reprints the top row (`A0`), whereas Table 11 computes THY's $S_{11} = 0.085888$ and $K_{11} = 0.861889$ (rank 4) from THY's true normalized/weighted values ($\sum_j \hat{x}_{11,j} = 0.085888$).
  - Optimality $S_0 = 0.099651$ and $S_i$ vs Table 11: **MATCH** ($\max |\Delta S| = 1.22 \times 10^{-6}$, 6 d.p.).
  - Utility degree $K_i$ vs Table 11: **MATCH** ($\max |\Delta K| = 1.35 \times 10^{-5}$ with Table 7 weights, $1.47 \times 10^{-5}$ chained from `entropy.compute()`).
  - Ranking `[10, 7, 1, 9, 5, 6, 2, 11, 8, 3, 4]` (ANA 1st, Hainan 2nd, Qantas 3rd, THY 4th, ..., LATAM 11th): **11/11 MATCH** both standalone and chained `entropy.compute()` → `aras.compute()`.

### F3 (secondary, Turkish, AHP → ARAS): Aytaç Adalı & Tuş Işık (2016), 6 air conditioners × 8 criteria
- **Source:** Aytaç Adalı, E. & Tuş Işık, A. (2016). Air Conditioner Selection Problem with COPRAS and ARAS Methods. *Manas Sosyal Araştırmalar Dergisi* 5(2):124–138 (DergiPark article-file 577434, read in full), Tables 1, 5–8.
- **Recomputed** (with the Table 1 C4/C7 weight misprint reconstructed as `[0.2817, 0.1387, 0.0413, 0.0749, 0.0215, 0.0215, 0.1387, 0.2817]`, same as in `copras.md` F5): Table 6 $\bar{x}_{ij}$ max diff $8.1 \times 10^{-4}$ (paper rounds $1/x$ to 4 d.p. in stage 1), Table 7 $\hat{x}_{ij}$ max diff $2.6 \times 10^{-4}$, Table 8 $S_i$ max diff $3.6 \times 10^{-4}$, $K_i$ max diff $6.2 \times 10^{-4}$, ranking `[1, 4, 3, 5, 2, 6]` **6/6 MATCH**. Not used as a `compute()` test because criterion C3 (ionizer, 0/1) contains zeros, which `requires.positiveValues` blocks.

## Implementation notes
- `src/core/methods/aras.ts`, `export const aras: RankingMethod<ArasParams> = { id: 'aras', kind: 'ranking', requires: { positiveValues: true }, compute }`. Register in `src/core/registry.ts` (`RANKING_IDS` and `rankingById`) and export `aras, type ArasParams` from `src/core/index.ts`.
- Steps returned by `aras.compute`:
  1. `aras.optimalRow` (vector, `axes: 'criteria'`): $x_{0j}$
  2. `aras.normalized` (matrix $m \times n$, `axes: ['alternatives', 'criteria']`): $\bar{x}_{ij}$ ($i = 1..m$, normalized by $\sum_{k=0}^m x^*_{kj}$)
  3. `aras.weighted` (matrix $m \times n$, `axes: ['alternatives', 'criteria']`): $\hat{x}_{ij} = w_j \bar{x}_{ij}$ ($i = 1..m$)
  4. `aras.optimalScore` (scalar): $S_0 = \sum_{j=1}^n w_j \bar{x}_{0j}$
  5. `aras.optimality` (vector $m$, `axes: 'alternatives'`): $S_i = \sum_{j=1}^n \hat{x}_{ij}$
  6. `aras.utilityDegree` (vector $m$, `axes: 'alternatives'`): $K_i = S_i / S_0$ (`scores`)
- Diagnostics: `{ optimalRow, optimalScore: s0 }`.

## Sources
- Zavadskas, E.K. & Turskis, Z. (2010). *Technological and Economic Development of Economy* 16(2):159–172, DOI 10.3846/tede.2010.10 (Tables 1–3).
- Bakır, M. & Atalık, Ö. (2018). *İşletme Araştırmaları Dergisi* 10(1):617–638, DOI 10.20491/isarder.2018.410 (Eqs. 1–11, Tables 3–11, read in full).
- Aytaç Adalı, E. & Tuş Işık, A. (2016). *Manas Sosyal Araştırmalar Dergisi* 5(2):124–138, DergiPark article-file 577434 (Eqs. 9–15, Tables 1, 5–8, read in full).
- Ercan, E. & Kundakcı, N. (2017). *Afyon Kocatepe Üniversitesi Sosyal Bilimler Dergisi* 19(1):83–105, DOI 10.5578/jss.53866 (Eqs. 1–6, read in full).
- Keshavarz Ghorabaee, M. et al. (2016). *ECECSR* 50(3):25–44 (Example 2, same 14-room microclimate dataset).
- pyDecision `pyDecision/algorithm/aras.py`.
- Recompute: `docs/research/scripts/aras.py`, output `docs/research/scripts/aras.out`.

## Changes on re-verification (2026-10-24)
- **Root cause of the 2010 Table 2 / Table 3 room 8 typo identified:** entering $x_{8,4} = 390$ (room 1) instead of $400$ reduces column 4's sum from $4740$ to $4730$, simultaneously explaining why Table 2 row 0 prints $400/4730 = 0.0846$ (instead of $400/4740 = 0.0844$) and row 8 prints $390/4730 = 0.0825$, and reproducing all 14 rows of Table 3 to $5.0 \times 10^{-5}$.
- **F1b values corrected from the 29.09 draft:** in the 29.09 draft, $S_0$ with column-best $A_0$ was not printed and $K_1$ was rounded to `0.8210`; exact values ($S_0 = 0.083204$, $S_i$ and $K_i$ to 6 d.p.) are now in `aras-zavadskas-turskis2010.json` and `aras.out`.
- **New Turkish fixtures:** F2 Bakır & Atalık (2018, 11 airlines × 7 criteria, Entropy → ARAS, all intermediate tables 8–11 verified to 5–6 d.p., THY row display copy-paste in Tables 9–10 documented) and F3 Aytaç Adalı & Tuş Işık (2016, 6 air conditioners × 8 criteria, AHP → ARAS, Tables 5–8 verified).
- **Algebraic relationship to SAW derived and quantified:** proved $S_i = S_{\text{SAW-sum}}(\tilde{w})$ with $\tilde{w}_j = w_j / (1 + p_{0j})$, quantified ranking divergence vs SAW `sum` (339/2,000) and SAW `linearMax` (679/2,000), and proved constant-column rank invariance (0/2,000 for both benefit and cost columns).
