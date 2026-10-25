# Method combinations, compatibility and robustness

Research note for the site and product design. Written 2026-09-29. Scope: which weighting → ranking pipelines are common and why, which combinations are unsafe, what a robustness panel should compute, how to aggregate rankings, what to ship first, and how competitors explain methods. Statements marked **(analysis)** are our own reasoning from the formulas; everything else carries a source. Scripts and raw numbers: `scratchpad/mcdm/kombinasyon/` of the research session (OpenAlex counts in `counts.tsv`).

---

## A. Most common weighting + ranking pipelines

### A.1 What review papers say
- **AHP is the most integrated weighting method, and TOPSIS its most frequent partner.** Çebi, Onar, Öztayşi & Kahraman (2022), *Integration of AHP with other MCDM methods: a literature review*, ISAHP 2022 (Scopus-based): "TOPSIS, VIKOR, PROMETHEE, Entropy, and DEMATEL methods are the most integrated MCDM methods with AHP"; TOPSIS is first every year in crisp and fuzzy settings; Entropy second in crisp, VIKOR second in fuzzy; WASPAS and COPRAS rising. https://isahp.org/uploads/36_001.pdf
- **TOPSIS survey:** Behzadian, Khanmohammadi Otaghsara, Yazdani & Ignatius (2012), *ESWA* 39(17), 13051–13069, DOI [10.1016/j.eswa.2012.05.056](https://doi.org/10.1016/j.eswa.2012.05.056): 266 papers, 103 journals (2000–2012), classified by "other methods combined or compared with TOPSIS".
- **Hybrid MCDM (sustainability):** Zavadskas, Govindan, Antucheviciene & Turskis (2016), *Economic Research* 29(1), 857–887, DOI [10.1080/1331677X.2016.1237302](https://doi.org/10.1080/1331677X.2016.1237302) (WoS): most frequent building blocks of hybrids are ANP, DEMATEL, AHP, TOPSIS, VIKOR, "each applied from 57 up to 110 times"; COPRAS (14) and SWARA (10) follow.
- **BWM:** Mi, Tang, Liao, Shen & Lev (2019), *Omega* 87, 205–225, DOI [10.1016/j.omega.2019.01.009](https://doi.org/10.1016/j.omega.2019.01.009): of 124 BWM publications (2015 – Jan 2019), 83 integrate BWM with other methods (40 single, 43 multiple integrations); TOPSIS and VIKOR are the recurring partners (e.g., You et al. 2017, BWM–TOPSIS, *Sustainability* 9(12), 2329, DOI [10.3390/su9122329](https://doi.org/10.3390/su9122329); Gupta 2018, BWM–VIKOR, *J. Air Transport Management* 68, 35–47, DOI [10.1016/j.jairtraman.2017.06.001](https://doi.org/10.1016/j.jairtraman.2017.06.001)).
- **PROMETHEE / ELECTRE:** Behzadian et al. (2010), 217 PROMETHEE papers, DOI [10.1016/j.ejor.2009.01.021](https://doi.org/10.1016/j.ejor.2009.01.021); Govindan & Jepsen (2016), 686 ELECTRE papers, DOI [10.1016/j.ejor.2015.07.019](https://doi.org/10.1016/j.ejor.2015.07.019).

### A.2 Turkish literature (DergiPark / TR Dizin)
- **TR Dizin, social sciences, 739 articles to May 2025:** "AHP, TOPSIS ve Entropi yöntemleri yaygın; son dönemde PROMETHEE, EDAS ve ARAS'a ilgi artmış"; financial performance is the dominant theme; the most cited paper is a TOPSIS financial analysis (Uygurtürk & Korkmaz 2012). Polatgıl, M. (2025), in *Sosyal Bilimlerde Stratejik Karar Verme*, Özgür Yayınları, DOI [10.58830/ozgur.pub768.c3164](https://doi.org/10.58830/ozgur.pub768.c3164).
- **EBSCO, Turkish "çok kriterli karar verme" articles of 2021 (196 usable of 272):** method mentions (310 in total, several per paper): TOPSIS 58 (18.7 %), AHP 56 (18.1 %), CRITIC 14 (4.5 %), grey relational 13, PROMETHEE 11, VIKOR 11, DEMATEL 11, SWARA 11, MOORA 11 (+3 as a second spelling), EDAS 10, WASPAS 8, COPRAS 8. Kocatürk Çetin, S. (2023), *SDÜ İİBF Dergisi* 28(3), 365–385 (Tablo 8). https://dergipark.org.tr/tr/download/article-file/3209445
- **47 studies 2006–2020:** among methods used more than once, TOPSIS 35 %, AHP 21 %, VIKOR 17 %. Dalbudak & Rençber (2022), *Gaziantep Üniv. İİBF Dergisi* 4(1), 1–17, DOI [10.55769/gauniibf.1068692](https://doi.org/10.55769/gauniibf.1068692).
- **Typical Turkish pipelines (examples, all DergiPark):** Entropi–TOPSIS for BIST financial performance (Ersoy & Orçun 2022, DOI [10.47138/jeaa.1187426](https://doi.org/10.47138/jeaa.1187426)); Entropi–EDAS (Aydın Ünal 2019, BIST insurers, DOI [10.29106/fesa.649946](https://doi.org/10.29106/fesa.649946); Sarıhan & Aydın 2023, exporters, DOI [10.46928/iticusbe.1263122](https://doi.org/10.46928/iticusbe.1263122)); CRITIC–EDAS (Bayram 2021, participation banks, DOI [10.14784/marufacd.879171](https://doi.org/10.14784/marufacd.879171)); LOPCOW–CRITIC–CoCoSo (Yılmaz Özekenci 2024, BIST energy, DOI [10.29249/selcuksbmyd.1400056](https://doi.org/10.29249/selcuksbmyd.1400056)); AHP–ELECTRE (Soner & Önüt 2006, *Sigma* 24(4)). Pattern **(analysis of these examples)**: objective weights (Entropi, CRITIC, MEREC, LOPCOW) on financial-ratio matrices, ranked with a compensatory method, is the dominant Turkish template — the same template this project's original CRITIC–TOPSIS app implements.

### A.3 Our co-occurrence counts (OpenAlex)
Query: OpenAlex `title_and_abstract.search` with Boolean phrases, run 2026-09-29, all years, all document types. The count is "works whose title or abstract mentions both", which includes comparisons and reviews, not only pipelines. Weighting terms: AHP = ("analytic hierarchy process" OR "analytical hierarchy process" OR AHP); Entropy = ("entropy weight" OR "entropy method" OR "Shannon entropy" OR "entropy-based weight" OR "entropy weighting"); CRITIC = ("criteria importance through intercriteria correlation" OR "CRITIC method" OR "CRITIC weighting" OR "CRITIC weights" OR "CRITIC-based"); BWM = ("best-worst method" OR "best worst method" OR BWM); SWARA; MEREC. Script `openalex_counts.py`.

| weighting \ ranking | TOPSIS | VIKOR | PROMETHEE | ELECTRE | GRA | MOORA/MULTIMOORA | COPRAS | WASPAS | EDAS* | CoCoSo | MABAC |
|---|---|---|---|---|---|---|---|---|---|---|---|
| AHP | **10,451** | 1,753 | 1,484 | 817 | 789 | 434 | 344 | 284 | 223 | 127 | 108 |
| Entropy | **4,639** | 435 | 143 | 81 | 598 | 120 | 116 | 90 | 104 | 65 | 63 |
| BWM | 585 | 232 | 90 | 44 | 51 | 84 | 62 | 83 | 67 | 96 | 81 |
| CRITIC | 540 | 128 | 60 | 18 | 95 | 55 | 66 | 93 | 94 | 91 | 59 |
| SWARA | 201 | 91 | 29 | 34 | 12 | 92 | 154 | 224 | 94 | 94 | 41 |
| MEREC | 130 | 30 | 22 | 8 | – | 28 | 31 | 58 | 45 | – | – |

\*EDAS, MARCOS, ARAS and SAW are also ordinary words or other acronyms (single-term counts: MARCOS 451,466, SAW 411,788, ARAS 79,175, EDAS 42,787 versus TOPSIS 46,212), so their pair counts are upper bounds; MARCOS/ARAS/SAW columns are omitted. "–" = not collected (OpenAlex's anonymous daily budget ran out; the Türkiye-affiliation run could not be done — rerun `openalex_counts.py counts.tsv TR` with an API key).

### A.4 The five most common pipelines (evidence summary)
| # | Pipeline | Evidence | Example papers |
|---|---|---|---|
| 1 | **AHP → TOPSIS** (crisp and fuzzy) | 10,451 co-mentions; first partner of AHP every year (Çebi et al. 2022); top-2 methods in Turkish counts | Dağdeviren, Yavuz & Kılınç (2009), weapon selection, fuzzy AHP–TOPSIS, *ESWA* 36, 8143–8151, DOI [10.1016/j.eswa.2008.10.016](https://doi.org/10.1016/j.eswa.2008.10.016); Önüt & Soner (2008), *Waste Management* 28, 1552–1559, DOI [10.1016/j.wasman.2007.05.019](https://doi.org/10.1016/j.wasman.2007.05.019) |
| 2 | **Entropy → TOPSIS** | 4,639; Entropy is AHP's second partner (Çebi et al.); recurs in the Turkish financial-performance papers we found **(analysis of examples; no source counts the pairing)** | Deng, Yeh & Willis (2000), *Computers & OR* 27, 963–973, DOI [10.1016/S0305-0548(99)00069-6](https://doi.org/10.1016/S0305-0548(99)00069-6); Ersoy & Orçun (2022) |
| 3 | **AHP → VIKOR** | 1,753; VIKOR second partner of fuzzy AHP (Çebi et al.) | Kaya & Kahraman (2010), fuzzy VIKOR & AHP, Istanbul energy planning, *Energy* 35, 2517–2527, DOI [10.1016/j.energy.2010.02.051](https://doi.org/10.1016/j.energy.2010.02.051) |
| 4 | **AHP → PROMETHEE** | 1,484; first AHP–PROMETHEE paper 1995 (Çebi et al.) | Dağdeviren (2008), *J. Intell. Manuf.* 19, 397–406, DOI [10.1007/s10845-008-0091-7](https://doi.org/10.1007/s10845-008-0091-7) |
| 5 | **AHP → ELECTRE** | 817 | Soner & Önüt (2006), Sigma 24(4), 110–120 |

Fast-growing "newer" pipelines, relevant because they are what Turkish users now ask for: **BWM → TOPSIS / VIKOR** (585 / 232; Mi et al. 2019), **CRITIC → TOPSIS** (540; e.g., Lakshmi, Mathew & Kinol 2022, CRITIC-TOPSIS and Entropy-TOPSIS, *Environ. Sci. Pollut. Res.* 29, 61370–61382, DOI [10.1007/s11356-022-20219-9](https://doi.org/10.1007/s11356-022-20219-9)), **Entropy / CRITIC → EDAS** (Turkish examples above), **SWARA → WASPAS** (224, larger than SWARA–TOPSIS; Lithuanian school), **CRITIC → CoCoSo / WASPAS** (91–93).

---

## B. Compatibility rules

### B.1 What each ranking method needs (from the method definitions)
"Negatives" means raw values below zero in any column; "zeros" means exact zeros. When a method is marked "no", the site must either block it or apply a declared shift (x − min + ε) and say so, because a shift changes the result of ratio-based methods **(analysis)**.

| Method (origin) | Built-in normalization | Negatives | Zeros | Weights | Extra parameters | Output |
|---|---|---|---|---|---|---|
| WSM / SAW | linear max (x/max, min/x), or sum ((min/x)/Σ(min/x) for cost); min–max not offered (no fixture; 0/7 published EDAS ranks) | no (values must be > 0, no shifting) | cost min/x fails at 0 | yes | – | score |
| WPM | ratios / powers x^w | no | no | yes | – | score |
| WASPAS (Zavadskas et al. 2012, DOI [10.5755/j01.eee.122.6.1810](https://doi.org/10.5755/j01.eee.122.6.1810)) | linear max | no | degenerate (WPM part → 0) | yes | λ ∈ [0,1], default 0.5 | score |
| TOPSIS (Hwang & Yoon 1981, DOI [10.1007/978-3-642-48318-9](https://doi.org/10.1007/978-3-642-48318-9)) | vector | computable, but vector normalization is not shift-invariant, so results depend on where zero is | all-zero column → 0/0 | yes | distance (Euclidean default) | closeness ∈ [0,1] |
| VIKOR (Opricovic & Tzeng 2004, DOI [10.1016/S0377-2217(03)00020-1](https://doi.org/10.1016/S0377-2217(03)00020-1)) | linear (f* − f)/(f* − f⁻) | yes | yes | yes | v ∈ [0,1], default 0.5; conditions C1/C2 | S, R, Q + compromise set |
| EDAS (Keshavarz Ghorabaee et al. 2015, DOI [10.15388/Informatica.2015.57](https://doi.org/10.15388/Informatica.2015.57)) | distance from column average, divided by the average | only if column average > 0 | yes if average > 0 | yes | – | appraisal score ∈ [0,1] |
| CODAS (Keshavarz Ghorabaee et al. 2016) | linear max (x/max, min/x) | no | no (values must be > 0) | yes | τ ∈ [0.01, 0.10], default 0.02 | assessment score H (sums to 0) |
| COPRAS (Zavadskas et al. 1994) | sum x/Σx | no | S⁻ = 0 → division by zero | yes | – | Q, utility % |
| MOORA ratio system (Brauers & Zavadskas 2006; robustness 2009, DOI [10.3846/1392-8619.2009.15.352-375](https://doi.org/10.3846/1392-8619.2009.15.352-375)) | vector | yes (ratio system); MULTIMOORA's multiplicative form: no | yes / no | yes | – | score |
| ARAS (Zavadskas & Turskis 2010, DOI [10.3846/tede.2010.10](https://doi.org/10.3846/tede.2010.10)) | sum, with an added optimal alternative; cost via 1/x | no | no for cost | yes | – | utility degree |
| MARCOS (Stević et al. 2020, DOI [10.1016/j.cie.2019.106231](https://doi.org/10.1016/j.cie.2019.106231)) | ratio to ideal / anti-ideal | no | no | yes | – | utility |
| CoCoSo (Yazdani et al. 2019, DOI [10.1108/MD-05-2017-0458](https://doi.org/10.1108/MD-05-2017-0458)) | min–max, then Σ r^w | yes | yes, except an alternative that is worst on every criterion (min S = 0 → k_b divides by zero; see `methods/cocoso.md`) | yes | λ, default 0.5 | score |
| MABAC (Pamučar & Ćirović 2015, DOI [10.1016/j.eswa.2014.11.057](https://doi.org/10.1016/j.eswa.2014.11.057)) | min–max, v = w(r + 1) | yes | yes | yes | – | distance to border area |
| GRA | min–max | yes | yes | yes (for the grade) | ρ, default 0.5 | grey relational grade |
| PROMETHEE II | none (raw differences) | yes | yes | yes | preference function + q, p, s per criterion | net flow ∈ [−1,1] |
| ELECTRE I / III | none (raw differences; ELECTRE I Roy needs a common scale) | yes | yes | yes (voting power) | ĉ, d̂ / q, p, v, s(λ) | kernel / partial pre-order |

Per-method details and edge-case decisions are in the individual cards under `methods/`; this table is the cross-method summary. Every method with min–max or linear (f* − f)/(f* − f⁻) normalization divides by the column range; a **constant column** must be dropped or given zero contribution with a warning.

### B.2 What each weighting method needs
| Weighting | Data requirement | Normalization dependence | Degenerate case |
|---|---|---|---|
| Entropy (Shannon; Zeleny 1982; Hwang & Yoon 1981) | x ≥ 0, column sum > 0, convention 0·ln 0 = 0 | invariant to pure rescaling (sum, vector, max normalization give the same weights); **changes under min–max**, which also creates zeros (Roszkowska & Wachowicz 2024, *Entropy* 26(5), 365, DOI [10.3390/e26050365](https://doi.org/10.3390/e26050365); Chen 2019, *ESWA* 136, 33–41, DOI [10.1016/j.eswa.2019.06.035](https://doi.org/10.1016/j.eswa.2019.06.035)) | constant column → weight 0 |
| CRITIC (Diakoulaki, Mavrotas & Papayannakis 1995, DOI [10.1016/0305-0548(94)00059-H](https://doi.org/10.1016/0305-0548(94)00059-H)) | any sign (min–max first) | weights depend on the normalization; Mukhametzyanov (2021, DOI [10.31181/dmame210402076i](https://doi.org/10.31181/dmame210402076i)) argues the method is only correct with max–min | constant column → correlation undefined (0/0); must be removed first (the workbench leaves it out of every conflict sum, which equals removing it; ρ = 0 alone would shift the other weights) |
| Standard deviation | any sign | depends on normalization (Mukhametzyanov 2021) | constant column → 0 |
| MEREC (Keshavarz-Ghorabaee et al. 2021, DOI [10.3390/sym13040525](https://doi.org/10.3390/sym13040525)) | strictly positive (uses ln and min/x, x/max) | – | zeros break ln |
| AHP (Saaty) | pairwise judgments, 1–9 scale | – | CR ≥ 0.10 → ask to revise |
| BWM (Rezaei 2015, DOI [10.1016/j.omega.2014.11.009](https://doi.org/10.1016/j.omega.2014.11.009); linear model 2016, DOI [10.1016/j.omega.2015.12.001](https://doi.org/10.1016/j.omega.2015.12.001)) | best-to-others and others-to-worst vectors | – | needs an LP (linear model) or NLP; multiple optima in the non-linear model |
| SWARA (Keršulienė, Zavadskas & Turskis 2010, DOI [10.3846/jbem.2010.12](https://doi.org/10.3846/jbem.2010.12)) | criteria ranked + comparative importance s_j | – | – |

Report the normalization together with the weighting method whenever the weights depend on it (Mukhametzyanov 2021).

### B.3 Risky or meaningless combinations
1. **Dispersion counted twice: objective dispersion weights + distance-based ranking.** Entropy, SD and CRITIC give more weight to criteria whose values are more spread out. TOPSIS (vector normalization), VIKOR and GRA also let a criterion with larger normalized spread contribute more to the distances. In Entropy/SD → TOPSIS the spread of a noisy criterion therefore enters twice: as an explicit weight and as an implicit one **(analysis)**. Supporting evidence: weights only have meaning relative to the normalization and ranges used (Choo, Schoner & Wedley 1999, *Computers & Industrial Engineering* 37, 527–541, DOI [10.1016/S0360-8352(00)00019-X](https://doi.org/10.1016/S0360-8352(00)00019-X)); entropy weights are "hypersensitive": changing one value (85 → 72) raised a criterion's weight from 0.146 to 0.231 and changed the ranking, while SD weights moved 0.1 % (Mukhametzyanov 2021, as printed; the paper also calls 0.146 → 0.231 "by 158 %", which is +58 %). **Recomputed (audit 13.10):** DM-1 with min-max entropy reproduces Table 2 (w1 = 0.146), but changing either 85 in criterion 1 to 72 gives w1 = 0.1958, e1 = 0.8435 (printed 0.231, 0.8065), and the SD weight falls 0.2102 → 0.2095 (printed: rises to 0.2104); no single cell of that column changed to 72 exceeds 0.2034, and both 85s changed give 0.2319 but contradict the SD claim. The qualitative point holds (Entropy w1 +34 %, SD barely moves); normalization changes entropy–TOPSIS outcomes (Chen 2019). Site rule: with objective weights, always show an equal-weights run and the Monte Carlo panel (§C) next to the main result, and warn when one criterion takes more than half the weight.
2. **Min–max normalization before Entropy.** It creates zeros (the column minimum) and changes the weights; Chen (2019) advises against it. Use raw non-negative data or sum normalization for Entropy.
3. **CRITIC with a constant or near-constant column, or with a non-min–max normalization.** Undefined or normalization-driven (B.2).
4. **Weights applied twice.** Feeding an already weighted matrix (e.g., AHP global priorities, or a v_ij = w_j r_ij matrix exported from another tool) into a ranking method that applies weights again squares the weights **(analysis)**. The import screen should ask "are these raw performances or weighted scores?".
5. **Chaining rankers.** Using the scores of one ranking method as the decision matrix of another (TOPSIS closeness into VIKOR, SMART → ELECTRE → TOPSIS chains) has no decision-theoretic meaning beyond "a second aggregation"; if the aim is robustness, use §C–D instead **(analysis)**.
6. **Dispersion-based weights in outranking methods.** In ELECTRE, weights are voting powers independent of scales, not trade-offs (Figueira, Mousseau & Roy 2005, DOI [10.1007/0-387-23081-5_4](https://doi.org/10.1007/0-387-23081-5_4)); entropy/CRITIC weights computed on a normalized matrix combined with thresholds in raw units mix two meanings. Allowed, but label it.
7. **Ratio-based methods on shifted data.** WPM, WASPAS, COPRAS, ARAS, MARCOS, MEREC need positive data; silently shifting (x − min + 1) changes rankings. Block or require an explicit, displayed shift.
8. **Reading agreement as validation.** High Spearman between TOPSIS and MOORA (both vector-normalized, compensatory) says little; methods of the same family agree by construction (Sałabun, Wątróbski & Shekhovtsov 2020, *Symmetry* 12(9), 1549, DOI [10.3390/sym12091549](https://doi.org/10.3390/sym12091549), show similarity depends on normalization and weighting choices). Compare across families (compensatory vs outranking) and report WS as well as ρ.

---

## C. Robustness and sensitivity panel
Background: Więckowski & Sałabun (2023), *Sensitivity analysis approaches in MCDA: a systematic review*, *Applied Soft Computing* 148, 110915, DOI [10.1016/j.asoc.2023.110915](https://doi.org/10.1016/j.asoc.2023.110915).

### C.1 One-at-a-time weight perturbation
Change criterion k by a relative step δ and rescale the others proportionally so that the sum stays 1:
$$w_k' = \min\{1, \max\{0, w_k(1+\delta)\}\},\qquad w_j' = w_j\,\frac{1 - w_k'}{1 - w_k}\quad (j \ne k).$$
Default grid δ ∈ {−20 %, −10 %, −5 %, +5 %, +10 %, +20 %} (MetricGate's TOPSIS page uses ±20 %, see §F). Also sweep $w_k' \in [0,1]$ in 0.01 steps to find the switch points: the interval of $w_k$ over which the first place (or the full ranking) is unchanged is the **weight stability interval** (Mareschal 1988, *EJOR* 33, 54–64, DOI [10.1016/0377-2217(88)90254-8](https://doi.org/10.1016/0377-2217(88)90254-8)); the smallest change that reverses two alternatives is the criticality measure of Triantaphyllou & Sánchez (1997), *Decision Sciences* 28(1), 151–194, DOI [10.1111/j.1540-5915.1997.tb01306.x](https://doi.org/10.1111/j.1540-5915.1997.tb01306.x). Edge case: $w_k = 1$ (others cannot be rescaled) → skip.

### C.2 Monte Carlo weight sampling (Dirichlet)
- **Uninformed:** $w \sim \text{Dirichlet}(1,\dots,1)$, i.e., uniform on the simplex. This is the SMAA setting (Lahdelma, Hokkanen & Salminen 1998, *EJOR* 106, 137–143, DOI [10.1016/S0377-2217(97)00163-X](https://doi.org/10.1016/S0377-2217(97)00163-X); sampling algorithms in Tervonen & Lahdelma 2007, *EJOR* 178, 500–513, DOI [10.1016/j.ejor.2005.12.037](https://doi.org/10.1016/j.ejor.2005.12.037)).
- **Around the user's weights:** $w \sim \text{Dirichlet}(\kappa\bar w)$ with concentration κ (UI presets e.g. 20 / 100 / 500; larger κ = tighter around $\bar w$; mean is $\bar w$, $\text{Var}(w_j) = \bar w_j(1-\bar w_j)/(\kappa+1)$). Draw $g_j \sim \text{Gamma}(\kappa\bar w_j, 1)$ and set $w_j = g_j / \sum g$.
- **Ordinal information** (e.g., "w₁ ≥ w₂ ≥ w₃" from a ranking of criteria): rejection sampling from the uniform Dirichlet, or sort a uniform draw (Tervonen & Lahdelma 2007).
- **Outputs:** rank acceptability index $b_i^r = \#\{\text{runs with } \text{rank}(i) = r\}/N$; first-rank acceptability $b_i^1$; mean rank and 2.5–97.5 % rank interval; for the base ranking, the share of runs with identical top-1 and the mean ρ / WS to the base. Sample size: the standard error of any share is $\sqrt{p(1-p)/N} \le 0.5/\sqrt N$, so N = 10,000 gives ≤ 0.005 **(analysis)**; run in a Web Worker.

### C.3 Criterion removal (leave-one-criterion-out)
For each criterion j: drop it, renormalize the remaining weights ($w_k/(1-w_j)$) or, for objective weighting, recompute the weights on the reduced matrix (offer both), rerun, and report top-1 change, ρ and WS to the base ranking. Removing a non-discriminating criterion should not change the ranking; when it does, that is rank-reversal type #5 in Aires & Ferreira (2018). Simulation study of criteria removal: Więckowski, Kołodziejczyk & Sałabun (2025), ISD 2025, DOI [10.62036/ISD.2025.34](https://doi.org/10.62036/ISD.2025.34).

### C.4 Rank-reversal tests
Types from Aires & Ferreira (2018), *Pesquisa Operacional* 38(2), 331–362, DOI [10.1590/0101-7438.2018.038.02.0331](https://doi.org/10.1590/0101-7438.2018.038.02.0331) (130 papers reviewed; 99 of them on AHP, 4 on PROMETHEE) and the test criteria of Wang & Triantaphyllou (2008), *Omega* 36(1), 45–63, DOI [10.1016/j.omega.2005.12.003](https://doi.org/10.1016/j.omega.2005.12.003):
1. **Remove / add an alternative** (type #1): leave-one-alternative-out for every non-top alternative, and add a dominated copy of the worst one; report pairs whose order changes.
2. **Replace a non-optimal alternative by a worse one** (W&T test #1, type #2): worsen one alternative on all criteria by a small factor; the best alternative should not change.
3. **Pairwise decomposition** (W&T tests #2–#3, types #3–#4): rank every pair alone; check transitivity and agreement with the full ranking.
4. **Method-specific quick flag:** in PROMETHEE II, removing one alternative cannot swap a and b when $\phi(a) - \phi(b) > 2/(n-1)$ (see `methods/promethee-ii.md`).

### C.5 Parameter sensitivity
One slider per method parameter with the same outputs as C.1: PROMETHEE q/p/s, VIKOR v, WASPAS/CoCoSo λ, ELECTRE ĉ/d̂ and q/p/v, GRA ρ, TOPSIS normalization/distance choice.

### C.6 Agreement between rankings
With ranks $x_i$ (reference) and $y_i$ (test), n alternatives:
- **Spearman** $\rho = 1 - \dfrac{6\sum_i (x_i - y_i)^2}{n(n^2-1)}$ without ties; with ties use Pearson correlation of mid-ranks.
- **Kendall** $\tau_b = \dfrac{n_c - n_d}{\sqrt{(n_0 - n_1)(n_0 - n_2)}}$, $n_0 = n(n-1)/2$, $n_1, n_2$ tied pairs in x and y.
- **Weighted Spearman** (top-weighted) $r_w = 1 - \dfrac{6\sum_i (x_i - y_i)^2\,[(n - x_i + 1) + (n - y_i + 1)]}{n^4 + n^3 - n^2 - n}$ (Pinto da Costa & Soares 2005, *Aust. N. Z. J. Stat.* 47(4), 515–529, DOI [10.1111/j.1467-842X.2005.00413.x](https://doi.org/10.1111/j.1467-842X.2005.00413.x)).
- **WS coefficient** $WS = 1 - \sum_{i=1}^{n} 2^{-x_i}\dfrac{|x_i - y_i|}{\max\{|x_i - 1|, |x_i - n|\}}$ (Sałabun & Urbaniak 2020, ICCS 2020, LNCS 12138, 632–645, DOI [10.1007/978-3-030-50417-5_47](https://doi.org/10.1007/978-3-030-50417-5_47)). Asymmetric (x is the reference), ∈ [0,1], top positions dominate. Their linguistic bands: low < 0.234, medium 0.352–0.689, high > 0.808 (partial membership in between).
- **Kendall's W** for m rankings (method panel): $W = \dfrac{12\sum_i (R_i - \bar R)^2}{m^2(n^3 - n)}$, $R_i$ = sum of ranks of alternative i (Kendall & Babington Smith 1939, *Ann. Math. Stat.* 10, 275–287, DOI [10.1214/aoms/1177732186](https://doi.org/10.1214/aoms/1177732186)).
- Always also show "same top-1?" — it is what users care about.

**Proposed default robustness panel (v1):** OAT ±5/10/20 % with stability intervals; Dirichlet Monte Carlo (κ preset + uniform) with rank-acceptability heat map; leave-one-criterion-out; leave-one-alternative-out; method-comparison matrix with ρ, τ_b, WS and top-1 agreement plus Kendall's W.

---

## D. Rank aggregation (ensemble)
- **Borda:** $B_i = \sum_k (n - r_{ik})$ (or equivalently the sum/average of ranks, lower is better). **Average rank** gives the same order as Borda for complete rankings. **Copeland:** $C_i = \sum_{j\ne i} \operatorname{sign}\big(\#\{k: r_{ik} < r_{jk}\} - \#\{k: r_{ik} > r_{jk}\}\big)$ (pairwise majority wins minus losses). Kemeny is the distance-optimal consensus but NP-hard; not needed in v1.
- **Evidence on behaviour:** Borda and Copeland are the rules most used in MCDM papers that aggregate method outputs; in 500,000 simulated aggregations (Borda, Copeland, Dodgson, Kemeny) a complete (tie-free) consensus was not reached in about 78 % of cases, more often with many alternatives (Orakçı & Özdemir 2024, *Alphanumeric Journal* 12(1), 21–38, DOI [10.17093/alphanumeric.1426694](https://doi.org/10.17093/alphanumeric.1426694)). Under low disagreement most rules give similar consensus; under high disagreement they diverge; Borda, median rank, RRF and Schulze scale well, Kemeny–Young and Plackett–Luce do not (Pereira, Basílio & Yiğit 2026, *IJITDM*, DOI [10.1142/S0219622026500525](https://doi.org/10.1142/S0219622026500525); code: pyRankMCDA).
- **When to use:** the user deliberately ran ≥ 3 methods from different families and has no principled reason to prefer one; show the ensemble next to (not instead of) the individual rankings, with Kendall's W. **When not to:** to hide disagreement (low W means "the data do not support a clear order", which is the finding); with several near-duplicate methods (they outvote the rest); with a partial order (ELECTRE III) mixed in without a rule for incomparability.
- pyDecision `borda_method` / `copeland_method` take a matrix and criterion types, i.e., methods as columns with type "min" on a rank matrix; `argsort` breaks ties arbitrarily. Our version: mid-ranks for ties, Copeland with Borda as tie-break, report remaining ties.

---

## E. Recommended implementation order
Rationale: (1) usage (A.3–A.4 and Turkish counts), (2) a published fixture exists and has been reproduced (our cards, other agents' cards), (3) closed-form and cheap in TypeScript, (4) composes with the robustness panel.

**v1 (first public release)**
- Weights: equal; direct entry; rank-based (ROC); **Entropy**, **CRITIC**, **SD**, **MEREC**; **AHP** (eigenvector + CR). BWM if the linear model (small LP) is ready, else v1.1.
- Ranking: **WSM/SAW**, **TOPSIS**, **VIKOR**, **EDAS**, **WASPAS**, **COPRAS**, **MOORA**, **PROMETHEE II (+ PROMETHEE I view)**, **ELECTRE I (Roy)**. These cover the top pipelines in A.4, the Turkish EDAS/CRITIC wave and one outranking family member with a verified fixture.
- Robustness: §C default panel; aggregation: Borda, Copeland, average rank (§D).
- Compatibility guard (§B) implemented as input checks, not as documentation only.

**v2**
- **ELECTRE III** (fixture ready; needs threshold UI, distillation and partial-order display), ELECTRE (Hwang–Yoon net-index variant for Turkish users), **CoCoSo**, **MARCOS**, **MABAC**, **GRA**, **ARAS**, **CODAS**, **SWARA**, BWM (if not in v1), LOPCOW, CILOS (cards for most of these already exist under `methods/`).
- Full SMAA (central weights, confidence factors); Kemeny for n ≤ 8.

**Later**
- Fuzzy / interval versions (fuzzy AHP, fuzzy TOPSIS): input model and UI are the cost, not the math; wait until users ask.
- Group decisions: aggregation of individual judgments (AIJ, geometric mean) or of priorities (AIP) for AHP (Forman & Peniwati 1998, *EJOR* 108, 165–169, DOI [10.1016/S0377-2217(97)00244-0](https://doi.org/10.1016/S0377-2217(97)00244-0)); needs accounts/sharing, which conflicts with a no-login first version.

---

## F. How competitors present methods (short)
- **mcdm-assistance.streamlit.app** (Prof. Dr. Ö. F. Rençber, Gaziantep Univ.; TR/EN): landing page claims 57 methods (24 classical ranking, 24 fuzzy, 9 objective + 5 subjective weighting), Monte Carlo sensitivity, and "SSCI akademik rapor (Word + Excel)"; login required and it logs user e-mails. We did not register, so the in-app method explanations were not inspected. Positioning is "publication-ready report", not method teaching.
- **MetricGate** (metricgate.com, R-backed calculators): each method has a documentation page with overview, key takeaways, formulas, normalization advice, limitations, related methods and an FAQ ("When should I use TOPSIS vs AHP?"); its TOPSIS calculator re-runs with each weight ±20 % and flags winner changes. It recommends "AHP-derived weights + TOPSIS" as the "strongest practical workflow" without evidence. Good template for per-method pages; no general "which method?" guide found.
- **1000minds**: long MCDA explainer; "Which method is best?" reduces to a checklist of issues from De Montis et al. (2004) (trade-off elicitation, time, cognitive burden, facilitator needed, assumptions, outputs) and then argues for its own PAPRIKA method. It describes outranking methods as combining pairwise results "but not via weights", which is inaccurate for PROMETHEE/ELECTRE (both use weights).
- **MCDMaker** (mcdmaker.com): landing page only ("different methods", visualisation, export), content behind registration; not inspected.
- **Best examples of a method-choice guide (academic, free):** Wątróbski et al. (2019), *Generalised framework for multi-criteria method selection*, *Omega* 86, 107–124, DOI [10.1016/j.omega.2018.07.004](https://doi.org/10.1016/j.omega.2018.07.004) — rule base over 56 methods and 9 problem characteristics, web tool www.mcda.it; Cinelli et al. (2020), *Omega* 96, 102261, DOI [10.1016/j.omega.2020.102261](https://doi.org/10.1016/j.omega.2020.102261) and the MCDA-MSS question tool (https://mcda.cs.put.poznan.pl) — four sections of questions (problem typology, preference model, elicitation, exploitation) that narrow the method list live; Roy & Słowiński (2013), *EURO J. Decis. Process.* 1, 69–97, DOI [10.1007/s40070-013-0004-7](https://doi.org/10.1007/s40070-013-0004-7) — hierarchy of questions starting with "what type of result do you need?"; Guitouni & Martel (1998), *EJOR* 109, 501–521, DOI [10.1016/S0377-2217(98)00073-3](https://doi.org/10.1016/S0377-2217(98)00073-3).
- **Design takeaway (analysis):** none of the four competitors offers a question-driven chooser; the MCDA-MSS pattern (a few questions → shortlist with "why") reduced to 4–5 plain questions (Do you need a full ranking or a shortlist? Can a strength compensate a weakness? Do you have expert weights or only data? Are small differences meaningful? Any negative values?) plus the §B compatibility guard would be a real differentiator.

---

## Sources (not already given with DOI above)
- Çebi, S., Onar, S. Ç., Öztayşi, B. & Kahraman, C. (2022). Integration of AHP with other MCDM methods: a literature review. ISAHP 2022. https://isahp.org/uploads/36_001.pdf
- Kocatürk Çetin, S. (2023). Çok kriterli karar verme alanında yayınlanan çalışmalar üzerine bir içerik analizi; EBSCO veri tabanı incelemesi. SDÜ İİBF Dergisi 28(3), 365–385.
- Soner, S. & Önüt, S. (2006). Çok kriterli tedarikçi seçimi: bir ELECTRE-AHP uygulaması. Sigma 24(4), 110–120.
- Zavadskas, E. K., Kaklauskas, A. & Šarka, V. (1994). The new method of multicriteria complex proportional assessment of projects. Technological and Economic Development of Economy 1(3), 131–139 (COPRAS origin; no DOI found).
- Brauers, W. K. M. & Zavadskas, E. K. (2006). The MOORA method and its application to privatization in a transition economy. Control and Cybernetics 35(2), 445–469 (no DOI).
- De Montis, A. et al. (2004), as cited by 1000minds (not read).
- Competitor pages read 2026-09-29: https://mcdm-assistance.streamlit.app/, https://metricgate.com/docs/topsis-multi-criteria/, https://www.1000minds.com/decision-making/what-is-mcdm-mcda, https://mcdmaker.com/
