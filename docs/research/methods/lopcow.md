# LOPCOW — LOgarithmic Percentage Change-driven Objective Weighting (lopcow)

- **Family:** weighting (objective)
- **Origin:** Ecer, F. & Pamucar, D. (2022). A novel LOPCOW-DOBI multi-criteria sustainability performance assessment methodology: An application in developing country banking sector. *Omega* 112, 102690. DOI [10.1016/j.omega.2022.102690](https://doi.org/10.1016/j.omega.2022.102690) (Crossref verified; **full text not accessible** — paywalled). The formulas below are taken from four open-access papers that quote Ecer & Pamucar (2022, pp. 4–5) identically (Keleş 2023; Ayçın & Bektaş 2024; isarder LOPCOW-RAM 2024; Dua et al. 2024), and confirmed numerically on Keleş (2023).
- **Popularity:** Crossref cited-by 310 for the origin paper (2026-09-29). Keleş (2023) Table 1 lists 8 LOPCOW applications within the first year (mostly with EDAS).

## For users (site copy)
- **EN:** LOPCOW scales each criterion to 0–1 and compares its typical size (root-mean-square) with its spread (standard deviation) on a logarithmic scale. This dampens the huge weight gaps that Entropy can produce and works with negative raw data. Pick it when you want objective weights that are more even than Entropy's.
- **TR:** LOPCOW her kriteri 0–1 aralığına ölçekler ve tipik büyüklüğünü (karesel ortalama) yayılımıyla (standart sapma) logaritmik ölçekte karşılaştırır. Entropinin üretebildiği aşırı ağırlık farklarını yumuşatır ve negatif ham verilerle çalışır. Entropiden daha dengeli nesnel ağırlıklar istediğinizde seçin.

## When to use / when not
- **Use when:** data include negative values (financial ratios, growth rates); you want flatter, less extreme objective weights; paired with the newer ranking methods (EDAS, CRADIS, RAM, DOBI).
- **Do not use when:** a criterion is constant (σ = 0 → division by zero); you need a well-studied method with known axiomatic properties (LOPCOW is new and its behaviour is only empirically described).

## Inputs
- Decision matrix X (m × n), any real values, m ≥ 2.
- Criterion types `max`/`min` (min–max normalization with cost inversion).
- No parameters.

## Algorithm
1. Min–max normalization: $r_{ij} = \frac{x_{ij}-x_j^{\min}}{x_j^{\max}-x_j^{\min}}$ (benefit), $r_{ij} = \frac{x_j^{\max}-x_{ij}}{x_j^{\max}-x_j^{\min}}$ (cost).
2. Percentage value: $PV_j = \left|\,\ln\!\left(\dfrac{\sqrt{\tfrac{1}{m}\sum_{i=1}^{m} r_{ij}^2}}{\sigma_j}\right)\cdot 100\,\right|$, with $\sigma_j$ the **sample** standard deviation of $r_{\cdot j}$ (divisor m − 1).
3. Weights: $w_j = PV_j / \sum_k PV_k$.

**Variants.**
- **σ with m vs m − 1 matters here** (unlike CRITIC/SD): Keleş (2023) is reproduced only with m − 1 (see Recomputed; population σ misses by up to 0.0045). The origin paper's definition could not be read; we implement m − 1 and record this as an assumption backed by one reproduction.
- **Why the absolute value:** with population σ, RMS ≥ σ always, so ln ≥ 0; with sample σ the ratio can drop below 1 and the |·| folds it back. Near ratio = 1 the weight goes to 0 and then rises again — a kink the site should not hide.
- **Non-standard "LOPCOW" in the wild:** some papers normalize with $x_{ij}/(m + \sum x_{ij}^2)$ (e.g., Indonesian applications seen in search results) — a different method; do not use them as fixtures. Dua et al. (2024) publish LOPCOW weights we could not reproduce with either σ (see Recomputed).
- pyDecision v5.1.1 has **no LOPCOW** function.

## Commonly combined with
- LOPCOW → DOBI (Dombi–Bonferroni): Ecer & Pamucar (2022), DOI [10.1016/j.omega.2022.102690](https://doi.org/10.1016/j.omega.2022.102690).
- LOPCOW → CRADIS: Keleş (2023), DOI [10.25287/ohuiibf.1239201](https://doi.org/10.25287/ohuiibf.1239201).
- LOPCOW → EDAS (Biswas et al. 2022a–e, Niu et al. 2022) and LOPCOW + MEREC → CoCoSo/EDAS (Bektaş 2022), as listed in Keleş (2023) Table 1.
- LOPCOW → MARA / RAM / PIV: Dua et al. (2024), DOI [10.21303/2461-4262.2024.003171](https://doi.org/10.21303/2461-4262.2024.003171).

## Pitfalls
- **Constant column:** σ = 0 → PV undefined. Choose: weight 0 with warning (not in any source; our decision).
- **Column with RMS = σ exactly** gives PV = 0, weight 0, even though the criterion varies — an artefact of the |ln| form.
- **Negative raw data:** handled by min–max (claimed advantage in the origin paper).
- **Rank reversal of criteria:** min–max depends on the alternative set.
- **Sample vs population σ:** a silent source of 0.3–0.5 percentage-point differences between implementations; state the choice in the UI.

## Reference example (test fixture)
- **Source:** Keleş, N. (2023). Lopcow ve Cradis yöntemleriyle G7 ülkelerinin ve Türkiye'nin yaşanabilir güç merkezi şehirlerinin değerlendirilmesi. *Ömer Halisdemir Üniversitesi İİBF Dergisi* 16(3), 727–747. DOI [10.25287/ohuiibf.1239201](https://doi.org/10.25287/ohuiibf.1239201) (DergiPark, open access). Input and output in the same tables: Table 6 (GPCI, 15 cities × 6 benefit criteria, weight row), Table 7 (QLI, 15 × 8, 3 benefit + 5 cost), Table 8 (all 14 criteria). Weights printed to 3 decimals; no PV values printed.

```json
{
  "id": "lopcow-keles2023-gpci",
  "source": "Keles 2023, OHU IIBF Dergisi 16(3):727-747, Table 6",
  "alternatives": ["New York", "London", "Tokyo", "San Francisco", "Washington", "Paris", "Toronto", "Los Angeles", "Boston", "Chicago", "Vancouver", "Frankfurt", "Berlin", "Milan", "Istanbul"],
  "criteria": ["economy", "rnd", "cultural_interaction", "livability", "environment", "accessibility"],
  "types": ["max", "max", "max", "max", "max", "max"],
  "matrix": [[362.5, 207.4, 254.3, 304, 157.1, 220.6], [324.5, 181.3, 338.9, 358.3, 192.9, 196.6], [292, 145.4, 210.6, 353.1, 181, 185.1], [281.3, 118.2, 95.5, 300.6, 136.8, 133.8], [264.4, 85.9, 75.9, 273.7, 142.4, 132.9], [253.1, 103.1, 235.5, 383.4, 156.3, 225.4], [245.9, 61, 94.7, 352.9, 173, 145.5], [239.3, 155.8, 113.3, 302.9, 144.2, 146.1], [238.2, 135.4, 65.7, 289.1, 159.5, 145.4], [228.3, 109.5, 106.9, 287.2, 133.7, 192.8], [236.7, 45.8, 59.4, 322.8, 198.7, 113.2], [220.9, 30.6, 78.1, 346.8, 179.4, 217.8], [222.8, 80.9, 171.6, 359, 195.2, 153.5], [177.1, 27.8, 118.7, 362.5, 159.2, 171.8], [132.4, 37.3, 195.7, 318.4, 146.8, 166.7]],
  "expected": {"weights": [0.241, 0.142, 0.105, 0.180, 0.151, 0.181], "ranking": [1, 5, 6, 3, 4, 2], "tolerance": 5e-4},
  "our_pv_sample_sd": [83.4439, 49.1586, 36.2992, 62.4807, 52.4317, 62.9266]
}
```

```json
{
  "id": "lopcow-keles2023-qli",
  "source": "Keles 2023, Table 7",
  "criteria": ["purchasing_power", "safety", "health_care", "cost_of_living", "property_price_to_income", "traffic_commute_time", "pollution", "climate"],
  "types": ["max", "max", "max", "min", "min", "min", "min", "min"],
  "matrix": [[100, 50.9, 62.3, 100, 10.2, 43.6, 57.6, 79.7], [88.1, 46.2, 70.2, 74.2, 16, 44.4, 58.1, 88.3], [90, 75.4, 79.9, 73.7, 12.6, 41.6, 43, 85.3], [104, 38.9, 63.9, 99.6, 9.2, 51, 50.4, 97.3], [127.9, 39.9, 69.9, 83.8, 5.5, 40.5, 40.2, 81.6], [77.9, 43.1, 79.1, 76.1, 20.2, 41.5, 63.9, 88.4], [91, 57.8, 75.6, 73, 12.9, 44.8, 37.5, 65.3], [116, 47.8, 62.5, 78.7, 7.3, 61, 67.3, 95.5], [111.1, 60.6, 74.5, 84.6, 8.1, 45, 30.9, 71.7], [121.3, 33.9, 64.8, 79, 3.4, 41.6, 49.2, 66.1], [94, 60.4, 73.9, 71.7, 12.9, 36.6, 25.4, 91.2], [108, 55.3, 75.2, 70.1, 13.2, 25.7, 36.3, 84.7], [98, 56.8, 68, 69.7, 11.4, 34.4, 39, 83.3], [55.4, 51.3, 71.7, 73.6, 19, 36.2, 67.8, 88.1], [28.5, 52.5, 69.5, 34.6, 21, 51.7, 69.1, 93]],
  "expected": {"weights": [0.185, 0.120, 0.104, 0.114, 0.122, 0.163, 0.097, 0.094], "tolerance": 5e-4}
}
```

- **Third case (Table 8):** the 15 × 14 concatenation of the two matrices above (types concatenated); expected weights [0.093, 0.055, 0.041, 0.070, 0.059, 0.070, 0.113, 0.074, 0.064, 0.070, 0.074, 0.100, 0.060, 0.057].
- **Recomputed** (`scratchpad/mcdm/agirlik/recompute_all.py`):
  - Table 6: numpy (sample σ) = [0.24065, 0.14177, 0.10469, 0.18019, 0.15121, 0.18148] → **MATCH**, max abs diff 4.8e-4. Population σ = [0.2365, 0.1432, 0.1082, 0.1794, 0.1521, 0.1806] → MISMATCH (4.5e-3).
  - Table 7: sample σ → **MATCH** (4.4e-4); population σ → MISMATCH (3.0e-3).
  - Table 8: sample σ → **MATCH** (5.0e-4, at the rounding limit; w12 = 0.09969 printed as 0.100); population σ → MISMATCH (2.0e-3).
  - pyDecision: **not run** (no LOPCOW in v5.1.1).
  - Checked, not usable: Dua et al. (2024) Case 1/2 LOPCOW weights (e.g., Case 2 [0.2831, 0.1700, 0.1818, 0.1068, 0.1244, 0.1339]) are not reproduced by either σ (ours: [0.0753, 0.1849, 0.1687, 0.1484, 0.2527, 0.1700] with sample σ). Their MEREC weights on the same data are reproduced exactly, so the input transcription is right; their LOPCOW computation differs from the published formula (cause unknown).

## Implementation notes
- TS: compute r, then `rms = sqrt(sum(r^2)/m)`, `sd = sqrt(sum((r-mean)^2)/(m-1))`, `pv = 100*abs(log(rms/sd))`.
- Edge cases: sd = 0 → weight 0 + warning; all PV = 0 → equal weights + warning.
- Return r, RMS, σ, PV for the step view.

## Sources
- Ecer & Pamucar (2022) — Crossref metadata only; formulas as quoted in the open-access papers below.
- Keleş (2023), DOI 10.25287/ohuiibf.1239201 — full PDF (DergiPark), Tables 1, 3, 4, 6, 7, 8.
- Dua et al. (2024), DOI 10.21303/2461-4262.2024.003171 — full text, Eqs. (10)–(13), Tables 1, 2, 8, 9.
- Ayçın & Bektaş (2024), BIST Kocaeli LOPCOW–OPARA (DergiPark; seen only as a search snippet) and "Bankaların Finansal Performansının LOPCOW-RAM Yöntemiyle Değerlendirilmesi" (isarder.org, 2024) — used only to cross-check the formula text (the latter's Table 6 row "Kareler Toplamı" is actually √(Σr²/m): ln(0.6807/0.3763)·100 = 59.28 = its PV for C1).
