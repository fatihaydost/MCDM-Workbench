import sys
p=sys.argv[1]; t=open(p,encoding='utf-8').read()
def R(a,b):
    global t
    assert t.count(a)==1, a[:60]
    t=t.replace(a,b)
R("because MEREC works with ratios to the column's best value.","because MEREC works with ratios to the column's worst value.")
R("çünkü MEREC sütunun en iyi değerine oranlarla çalışır.","çünkü MEREC sütunun en kötü değerine oranlarla çalışır.")
R("Three fixtures recomputed independently: MATCH.","Four fixtures recomputed independently: MATCH. Reconciled against two skeptic reviews the same day (see \"Verification log\").")
R("- **(a) Origin, Eqs. 2–6, divisor n (number of criteria).** Default and only option. Reproduced on all three fixtures below.","- **(a) Origin, Eqs. 2–6, divisor n (number of criteria).** Default and only option. Reproduced on all four fixtures below.")
R("- **(f) Missing absolute value.** Dua et al. (2024) Eqs. 6–7 print ln(n_ij) without |·|; with 0 < n ≤ 1 this makes the argument of the outer ln < 1 and can make it ≤ 0. It is a typesetting slip, since their Case 2 weights match the |·| form.\n",
  "- *(Removed on reconciliation: an earlier \"variant (f), Dua et al. print ln(n_ij) without |·|\". The rendered PDF, p. 133, shows the bars in Eqs. 6, 7 and 8; pdftotext drops them. Dua's Eq. 7 does print the summand as n_ij under Σ_{k≠j}, an index slip for n_ik; their Case 2 and Case 3 weights match the origin form.)*\n")
R("- **Fixture 3 (independent authors):** Dua et al. (2024), Case 2. Input Table 8 (six steels, six benefit criteria), output Table 9 row MEREC (4 d.p.).",
  "- **Fixture 3 (independent authors):** Dua et al. (2024), Case 2. Input Table 8 (six steels, six benefit criteria), output Table 9 row MEREC (4 d.p.).\n- **Fixture 4 (independent authors, mixed types):** Dua et al. (2024), Case 3, p. 143. Input Table 12 (eight heavy-duty gear materials MG1–MG8, seven criteria; C1–C6 benefit, C7 cost per the text), output Table 13 row MEREC (4 d.p.). Fills the gap that fixture 3 is all benefit. Printed-text misprint, harmless: the paragraph says \"C8 has the smallest value in MG8\"; there is no C8, it means C7 (cost, MG8 = 20000 is the minimum).")
R('''  "expected": {"weights": [0.0758, 0.2002, 0.1602, 0.0953, 0.2747, 0.1938], "tolerance": 5e-5}
}
```
''','''  "expected": {"weights": [0.0758, 0.2002, 0.1602, 0.0953, 0.2747, 0.1938], "tolerance": 5e-5}
}
```

```json
{
  "id": "merec-dua2024-case3",
  "source": "Dua, Duc, Bao & Trung 2024, EUREKA: Physics and Engineering (2), doi:10.21303/2461-4262.2024.003171, p. 143: Table 12 (input), Table 13 row MEREC (output)",
  "alternatives": ["MG1", "MG2", "MG3", "MG4", "MG5", "MG6", "MG7", "MG8"],
  "criteria": ["tensile_strength", "elongation", "reduction_in_area", "C4", "hardness_HB", "impact_strength", "cost"],
  "types": ["benefit", "benefit", "benefit", "benefit", "benefit", "benefit", "cost"],
  "matrix": [[780, 18, 55, 635, 229, 880, 22000], [880, 15, 50, 735, 225, 390, 30000], [930, 13, 45, 785, 269, 590, 31000], [980, 15, 45, 785, 217, 600, 22000], [980, 12, 45, 835, 250, 950, 24000], [1080, 12, 50, 930, 220, 960, 22000], [885, 12, 40, 685, 195, 970, 21000], [750, 12, 45, 400, 179, 940, 20000]],
  "expected": {"weights": [0.0837, 0.0536, 0.0705, 0.2640, 0.0972, 0.3077, 0.1233], "tolerance": 5e-5}
}
```
(C4 is labelled "melting point (MPa)" in the paper, a unit mismatch in the source; the label is kept neutral.)
''')
R('"tolerance": {"normalized": 5e-4, "S": 5e-3, "S_removed": 5e-3, "E": 5e-3, "weights": 5e-5}',
  '"tolerance": {"normalized": 0.000500001, "S": 0.005000001, "S_removed": 0.005000001, "E": 0.005000001, "weights": 5e-5}')
R('"expected": {"weights": [0.324, 0.055, 0.086, 0.368, 0.044, 0.077, 0.045], "tolerance": 5e-4}',
  '"expected": {"weights": [0.324, 0.055, 0.086, 0.368, 0.044, 0.077, 0.045], "tolerance": 0.000500001}')
R("  - Fixture 3: w = [0.07582, 0.20019, 0.16018, 0.09530, 0.27470, 0.19381] → **MATCH**, max abs diff 1.8e-5.",
  "  - Fixture 3: w = [0.07582, 0.20019, 0.16018, 0.09530, 0.27470, 0.19381] → **MATCH**, max abs diff 1.8e-5.\n  - Fixture 4: w = [0.08372, 0.05359, 0.07049, 0.26396, 0.09719, 0.30769, 0.12334] → **MATCH**, max abs diff 4.4e-5; every weight rounds to the printed 4 d.p. Of all 128 benefit/cost assignments the stated one fits best (next best 2.3e-3). Script `scripts/merec_reconcile.py`.\n  - **Tolerance margins (why the odd tolerances above):** the printed values are correct roundings that sit at the half-step. Fixture 1 A4/C3: S' = 0.68496 vs printed 0.68 (diff 4.96e-3, margin 4e-5); fixture 2 C5: w = 0.04449 vs 0.044 (diff 4.91e-4, margin 9e-6). Tests use `|x − printed| ≤ 0.5·10^-k + 1e-9` (the JSON values), never a strict `<` against 0.5·10^-k and never rounded intermediates.")
R("  - Fixture 2: w = [0.32443, 0.05518, 0.08636, 0.36777, 0.04449, 0.07662, 0.04514] → **MATCH** at 3 d.p., max abs diff 4.9e-4.",
  "  - Fixture 2: w = [0.32443, 0.05518, 0.08636, 0.36777, 0.04449, 0.07662, 0.04514] → **MATCH** at 3 d.p., max abs diff 4.9e-4 (every weight rounds to the printed value).")
R("- Compute in float64. L_ij = |ln n_ij| = −ln n_ij (n ≤ 1). Compute it once, then rowSum_i = Σ_j L_ij, S_i = ln(1 + rowSum_i / n), S'_ij = ln(1 + (rowSum_i − L_ij)/n). This is O(mn), not O(mn²). Use `Math.log1p` for both for accuracy when the sums are small. E_j = Σ_i (S_i − S'_ij), clamped to ≥ 0 against float noise.",
  "- Compute in float64. L_ij = |ln n_ij| = −ln n_ij (n ≤ 1). Compute it once, then R_i = Σ_j L_ij, S_i = log1p(R_i / n), S'_ij = log1p((R_i − L_ij)/n) (for the step view). This is O(mn), not O(mn²). For E use the cancellation-free identity S_i − S'_ij = ln((n + R_i)/(n + R_i − L_ij)) = `Math.log1p(L_ij / (n + R_i − L_ij))`, so E_j = Σ_i log1p(L_ij / (n + R_i − L_ij)). It is ≥ 0 by construction and exactly 0 when L_ij = 0, so no clamp is needed. (Robustness only: the naive difference already matches every fixture; on a near-constant column beside a widely spread one it carries ~4e-4 relative error on a ~1e-13 weight.)")
R("- Constant column: detect it with `col.every(v => v === col[0])` and set L_ij = 0 exactly (so E_j = 0 exactly). Emit warning `merec.constant-column`.\n- If ΣE < 1e-12, use weights 1/n plus warning `merec.all-constant-equal-weights` (mirrors `ENTROPY_NO_INFORMATION`).",
  "- Constant column: detect it with `col.every(v => v === col[0])` and set L_ij = 0 exactly (so E_j = 0 exactly). Emit warning `merec.constant-column`.\n- All-constant: `allConstant` = every column is constant by that exact test; then weights 1/n plus warning `merec.all-constant-equal-weights` (mirrors `ENTROPY_NO_INFORMATION`). No absolute ΣE threshold: a matrix whose columns differ by one ulp (0.1 + 0.2 vs 0.3) gives ΣE ≈ 2e-16, is not all-constant, and must not get the all-constant warning. Keep only a 0/0 guard: if ΣE === 0 while `allConstant` is false (possible only when every min/x rounds to exactly 1), also return 1/n with the same warning and set `allConstant = true` in the diagnostics, so detection and fallback never disagree.")
R("- Tests: the three fixtures as JSON", "- Tests: the four fixtures as JSON")
R("  - an all-constant matrix gives 1/n\n", "  - an all-constant matrix gives 1/n\n  - a one-ulp near-constant matrix ([[0.3, 1], [0.1 + 0.2, 1]]) gives finite weights summing to 1 and no all-constant warning\n")
R('''  - replace "Trung et al. (2024)" with "Dua et al. (2024)" (also in `equal.ts` line 32)''',
  '''  - replace "Trung et al. (2024)" / "Trung vd. (2024)" with "Dua et al. (2024)" / "Dua vd. (2024)" at every occurrence (grep of main-ro/src/content, 2026-10-13): `merec.ts` lines 51 (EN), 52 (TR), 81 (source label); `equal.ts` lines 32, 33, 56; `lopcow.ts` lines 76, 77, 83. OpenAlex gives the first author as Tran Van Dua.''')
R("- Not obtained: the Figshare supplementary data (ref. [65], the simulation matrices behind Tables 7–9). Crossref lists the reference without a DOI, and a Figshare API search found nothing.",
  "- Figshare supplementary data (ref. [65], the simulation matrices behind Tables 7–9). **Printed DOI misprint:** the PDF links `10.6084/m6089.figshare.13806302` (HTTP 404). **Corrected:** `10.6084/m9.figshare.13806302` resolves (302 to figshare.com/articles/dataset/…/13806302), checked 2026-10-13. Data set not downloaded; not needed for the fixtures.")
R("  - (f) Dua's missing |·|\n", "  - (f) Dua's missing |·| (withdrawn on reconciliation, see Verification log)\n")
t=t.rstrip('\n')+'''

## Verification log (reconciliation, 2026-10-13)
Two skeptic reviews (10 items, 8 distinct). Each checked against the primary PDFs and `scripts/merec_reconcile.py`.
1. **Site copy "ratios to the column's best value" (blocker, raised twice):** skeptics right. Eq. 2 divides by the column's worst value (benefit min/x, cost x/max); recomputed N[A5,C1] = 1.0 (worst), N[A1,C1] = 0.0111 (best). Fixed EN "worst value", TR "en kötü değerine".
2. **Dua Case 3 missing (raised twice):** skeptics right. Recomputed to 4.4e-5, all 4 d.p. equal; stated types are the best of 128. Added as fixture 4.
3. **"Trung" list incomplete (raised twice):** skeptics right; grep confirms 9 lines in merec.ts, equal.ts, lopcow.ts. Implementation note lists all.
4. **log1p does not address cancellation:** skeptic right (algebra checked; small effect measured). Implementation note now uses log1p(L/(n + R − L)), no clamp. Not a fixture issue.
5. **All-constant threshold vs exact detection:** skeptic right (one-ulp matrix gives ΣE = 2.2e-16). Rule changed to exact all-constant plus a ΣE === 0 guard; new edge test.
6. **Tolerance margins:** skeptic right (margins 4e-5 and 9e-6, reproduced). Tolerances widened to 0.5·10^-k + 1e-9; rounding-equality noted.
7. **Variant (f) Dua missing |·|:** skeptic right. Rendered p. 133 shows the bars in Eqs. 6–8; the claim came from pdftotext. Variant deleted; the real slip (n_ij for n_ik in Eq. 7) noted instead.
8. **Figshare data "not found":** skeptic right. Printed DOI (m6089) 404s; corrected m9 DOI resolves. Both recorded in Sources.
'''
open(p,'w',encoding='utf-8').write(t)
print("ok")
