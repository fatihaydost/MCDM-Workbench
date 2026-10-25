# CODAS

- **Slug:** `codas`
- **Full name:** Combinative Distance-based Assessment
- **Category:** Ranking
- **Origin:** Keshavarz Ghorabaee, M., Zavadskas, E. K., Turskis, Z., & Antucheviciene, J. (2016). A new combinative distance-based assessment (CODAS) method for multi-criteria decision-making. *Economic Computation and Economic Cybernetics Studies and Research*, 50(3), 25-44. RePEc: `RePEc:cys:ecocyb:v:50:y:2016:i:3:p:25-44` (`https://ideas.repec.org/a/cys/ecocyb/v50y2016i3p25-44.html`; OpenAlex `W2605207615`, no Crossref DOI issued by the journal).
- **Secondary sources:**
  - Badi, I., Abdulshahed, A. M., & Shetwan, A. (2018). A case study of supplier selection for a steelmaking company in Libya by using the Combinative Distance-based Assessment (CODAS) model. *Decision Making: Applications in Management and Engineering*, 1(1), 1-12. DOI: `10.31181/dmame180101b`. (Note: an earlier draft of this card cited `10.22190/FUACR1801001B` in *Facta Universitatis*; Crossref verification showed that DOI belongs to an unrelated paper, and the true supplier-selection benchmark is `10.31181/dmame180101b`, which is also the worked example in `pymcdm.methods.CODAS`.)
  - Trung, D. D. (2022). Expanding data normalization method to CODAS method for multi-criteria decision making. *Applied Engineering Letters*, 7(2), 54-66. DOI: `10.18485/aeletters.2022.7.2.2`.
  - Çınaroğlu, E. (2021). Entropi tabanlı CODAS ve EDAS yöntemleri ile İSO 500'deki otomotiv işletmelerinin performans analizi. *Bingöl Üniversitesi İktisadi ve İdari Bilimler Fakültesi Dergisi*, 5(1), 337-364. DOI: `10.33399/biibfad.868418`.
  - Akgün, M. (2022). CRITIC temelli CODAS yöntemi ile e-ticaret sitelerinin değerlendirilmesi. *Selçuk Üniversitesi Sosyal Bilimler Enstitüsü Dergisi*, (48), 338-356. DOI: `10.52642/susbed.1111547`.
- **Verification script:** [`scripts/codas.py`](../scripts/codas.py)
- **Test fixture:** [`tests/fixtures/codas-ghorabaee2016.json`](../../../tests/fixtures/codas-ghorabaee2016.json)

## 1. Intuition

CODAS scores each alternative by how far it stands above the **negative-ideal solution** $ns$ (the column-wise minimum of the weighted normalized matrix), combining two norms on the weighted normalized space:

1. **Primary measure:** the Euclidean ($\ell_2$) distance $E_i$ from $ns$.
2. **Secondary tie-breaker:** the Taxicab ($\ell_1$, Manhattan) distance $T_i$ from $ns$, which enters the pairwise comparison matrix $h_{ik}$ through a threshold function $\psi(E_i - E_k)$ controlled by parameter $\tau \in [0.01, 0.05]$ (default $\tau = 0.02$).

Summing row $i$ of the antisymmetric pairwise matrix $R_a = [h_{ik}]_{n \times n}$ gives the assessment score $H_i = \sum_{k=1}^{n} h_{ik}$. Because $h_{ik} = -h_{ki}$, the scores satisfy $\sum_{i=1}^{n} H_i = 0$; alternatives with $H_i > 0$ stand above average in combined distance from the negative-ideal point, and larger $H_i$ is better.

## 2. Inputs & constraints

- Decision matrix $X = [x_{ij}]_{n \times m}$ with $n \ge 2$ alternatives and $m \ge 1$ criteria (note: the origin paper uses $n$ for alternatives and $m$ for criteria in Eqs. (1)-(9)).
- Criterion types $t_j \in \{\text{benefit}, \text{cost}\}$.
- Weights $w_j > 0$ with $\sum_{j=1}^m w_j = 1$.
- Threshold parameter $\tau \in [0.01, 0.10]$, default $\tau = 0.02$ (Keshavarz Ghorabaee et al., 2016, Step 6, p. 28 suggests $\tau \in [0.01, 0.05]$ and uses $\tau = 0.02$ throughout Section 3).
- **Positivity constraint ($x_{ij} > 0$):** Step 2 uses linear ratio normalization ($x_{ij}/\max_i x_{ij}$ for benefit, $\min_i x_{ij}/x_{ij}$ for cost). Any $x_{ij} \le 0$ causes division by zero on cost criteria or reverses the sign/hyperbolic scale of $n_{ij}$. Our implementation sets `requires: { positiveValues: true }` and rejects non-positive entries via `assertValidInputs`.

## 3. Step-by-step mathematical formulation

Following Keshavarz Ghorabaee et al. (2016), Section 2, Steps 1-8, Eqs. (1)-(9), pp. 27-29:

### Step 1 (`codas.normalized`) - Linear max/min normalization

For each alternative $i \in \{1, \dots, n\}$ and criterion $j \in \{1, \dots, m\}$, Eq. (2):

$$n_{ij} = \begin{cases} \dfrac{x_{ij}}{\max_{k} x_{kj}} & \text{if } j \in N_b \text{ (benefit)} \\[8pt] \dfrac{\min_{k} x_{kj}}{x_{ij}} & \text{if } j \in N_c \text{ (cost)} \end{cases}$$

### Step 2 (`codas.weighted`) - Weighted normalized matrix

Eq. (3):

$$r_{ij} = w_j \, n_{ij}, \qquad \sum_{j=1}^{m} w_j = 1, \; w_j > 0$$

### Step 3 (`codas.negativeIdeal`) - Negative-ideal solution

Eqs. (4)-(5):

$$ns = [ns_j]_{1 \times m}, \qquad ns_j = \min_{1 \le i \le n} r_{ij}$$

### Step 4 (`codas.euclidean`, `codas.taxicab`) - Euclidean and Taxicab distances from $ns$

Eq. (6):

$$E_i = \sqrt{\sum_{j=1}^{m} (r_{ij} - ns_j)^2}, \qquad T_i = \sum_{j=1}^{m} |r_{ij} - ns_j|$$

Since $ns_j = \min_k r_{kj} \le r_{ij}$, we have $r_{ij} - ns_j \ge 0$, so $T_i = \sum_{j=1}^m (r_{ij} - ns_j)$.

### Step 5 (`codas.relativeAssessment`) - Relative assessment matrix $R_a = [h_{ik}]_{n \times n}$

Eqs. (7)-(8):

$$h_{ik} = (E_i - E_k) + \bigl(\psi(E_i - E_k) \times (T_i - T_k)\bigr)$$

where the threshold indicator function $\psi$ as printed in Eq. (8) is:

$$\psi(x) = \begin{cases} 1 & \text{if } |x| \ge \tau \\ 0 & \text{if } |x| < \tau \end{cases}$$

Note that $\psi(-x) = \psi(x)$, so $h_{ki} = -h_{ik}$ and $h_{ii} = 0$.

### Step 6 (`codas.score`) - Assessment score & ranking

Eq. (9):

$$H_i = \sum_{k=1}^{n} h_{ik}$$

Rank alternatives in **descending** order of $H_i$ (largest $H_i$ gets rank 1).

## 4. Literature & library variants

### 4.1 The $\psi(x)$ threshold direction paradox in Keshavarz Ghorabaee et al. (2016)

There is a famous discrepancy between the prose motivation and Eq. (8) of the origin paper:

- **Prose (Section 2, p. 28):** *"If the Euclidean distance of two alternatives is very close to each other, the Taxicab distance is used to compare them. The degree of closeness of Euclidean distances is set by a threshold parameter ($\tau$)."* Taken literally as a closeness test, this prose corresponds to $\psi_{\text{lt}}(x) = 1$ if $|x| < \tau$ else $0$.
- **Printed formula, Eq. (8) (p. 28):** Prints the opposite inequality:
  $$\psi(x) = \begin{cases} 1 & \text{if } |x| \ge \tau \\ 0 & \text{if } |x| < \tau \end{cases}$$
- **Which formula did the origin paper actually compute?** Our script (`scripts/codas.py`) tests both conventions against every table in Keshavarz Ghorabaee et al. (2016):
  1. **Section 3, Example 1 (Tables 1-4, $7 \times 5$ robots) and Example 2 (Tables 5-8, $14 \times 6$ offices):** Every entry of $h_{ik}$ and $H_i$ in Table 4 and Table 8 was computed with **Eq. (8) as printed** ($\psi(x) = 1$ if $|x| \ge \tau$ else $0$). For instance, in Table 4, $E_1 = 0.2593$ and $E_2 = 0.3032$ give $|E_1 - E_2| = 0.0439 \ge 0.02$, and the paper adds $T_1 - T_2 = -0.1115$ to $E_1 - E_2 = -0.0439$; whereas $E_1 = 0.2593$ and $E_3 = 0.2415$ give $|E_1 - E_3| = 0.0178 < 0.02$, and Table 4 prints $h_{13} = E_1 - E_3 = 0.0178$ with no Taxicab contribution.
  2. **How $A_8$ vs. $A_9$ tie-breaking actually works in Example 2 (Tables 7-8):** In Example 2, the paper highlights that $E_8 = 0.1550$ and $E_9 = 0.1550$ tie to 4 d.p. ($E_8 = 0.154973, E_9 = 0.155033$), yet $H_8 = 2.929 > H_9 = 2.890$. Under Eq. (8) ($|x| \ge 0.02$), the direct cell $h_{8,9}$ has $|E_8 - E_9| = 0.000060 < 0.02$, so $\psi(E_8 - E_9) = 0$ and $h_{8,9} = -0.000060$. However, against the 12 *other* alternatives $k \notin \{8, 9\}$, $|E_8 - E_k| \ge 0.02$ and $|E_9 - E_k| \ge 0.02$ both hold ($\psi = 1$), so each of those 12 columns contributes $(T_8 - T_k) - (T_9 - T_k) = T_8 - T_9 = +0.003315$ to $H_8 - H_9$, yielding $H_8 - H_9 = 14(E_8 - E_9) + 12(T_8 - T_9) = +0.038939$. Thus $T_8 > T_9$ breaks the near-tie between $A_8$ and $A_9$ through the third-party columns $k \notin \{8, 9\}$ rather than through $h_{8,9}$ itself.
  3. **Section 4 sensitivity analysis (Tables 9-13, Figure 2, $10 \times 7$):** When the authors generated the sensitivity tables in Section 4, their script used the **opposite inequality** $\psi_{\text{lt}}(x) = \mathbf{1}[|x| < \tau]$:
     - In Table 13 (15 values of $\tau \in \{0.01, \dots, 1.00\}$ on weight set 1; note the 11th column header is misprinted `0.015` between `0.1` and `0.2` for `0.15`), $\psi_{\text{lt}}(x) = \mathbf{1}[|x| < \tau]$ reproduces **15/15** published rankings identically, including the non-monotonic rank shifts at $\tau = 0.08, 0.09, 0.10, 0.15$ and the return to the $E + T$ ranking `[2, 1, 7, 10, 6, 8, 3, 4, 5, 9]` for $\tau \ge 0.20$ (since $\max_{i,k}|E_i - E_k| = 0.1629 < 0.20$). Under Eq. (8) ($\mathbf{1}[|x| \ge \tau]$), $\tau \in [0.01, 0.07]$ gives `[2, 1, 7, 10, 6, 8, 3, 4, 5, 9]` (7/15 matches) and $\tau \ge 0.08$ gives the pure-$E$ ranking `[2, 1, 7, 10, 6, 8, 3, 5, 4, 9]`.
     - In Table 11 (10 simulated weight sets at $\tau = 0.02$), $\mathbf{1}[|x| \ge 0.02]$ matches 8/10 sets (all except Sets 7 and 10) and $\mathbf{1}[|x| < 0.02]$ matches 9/10 sets (all except Set 8, where $H_2$ and $H_7$ differ by $0.0008$).
- **What subsequent literature and libraries implement:** Badi et al. (2018), Trung (2022), Çınaroğlu (2021), Akgün (2022), `pymcdm` 1.4.0, and `pyrepo-mcda` 0.1.15 all implement **Eq. (8) as printed** ($\psi(x) = 1$ if $|x| \ge \tau$ else $0$). Across 500 random positive problems in `scripts/codas.py`, flipping $\psi$ from $|x| \ge \tau$ to $|x| < \tau$ changes the ranking in 116/500 (23.2%) problems. We implement Eq. (8) as printed ($\psi(x) = 1$ if $|x| \ge \tau$ else $0$), matching Section 3 of the origin paper, Badi et al. (2018), `pymcdm`, and `pyrepo-mcda`.

### 4.2 Audit of open-source Python libraries

We inspected the source code of three open-source Python MCDM libraries (`scripts/codas.py`):

| Library | Version | Module / Function | Formula for $h_{ik}$ | Agreement with Eq. (8) & Table 4 |
| --- | --- | --- | --- | --- |
| `pymcdm` | 1.4.0 | `pymcdm.methods.CODAS` | `(E_i - E_k) + _psi(E_i - E_k) * (T_i - T_k)` with `_psi(x) = 1 if abs(x) >= 0.02 else 0` | Exact (`0.0e+00` on F1, F2, F4). Note: `tau = 0.02` is hard-coded inside `CODAS._psi` and not exposed in `__init__`. |
| `pyrepo-mcda` | 0.1.15 | `pyrepo_mcda.mcda_methods.CODAS` | `(E_i - E_k) + psi * (T_i - T_k)` with `psi = 1 if abs(E_i - E_k) >= tau else 0` | Exact (`0.0e+00` on F1, F2, F4), with configurable `tau` (default `0.02`). |
| `pyDecision` | 5.1.8 | `pyDecision.algorithm.codas_method` | `(e_i[i] - e_i[j]) + lmbd * ((e_i[i] - e_i[j]) * (t_i[i] - t_i[j]))` | **Broken.** Replaces the threshold indicator $\psi(E_i - E_k)$ with continuous multiplication $\lambda (E_i - E_k)(T_i - T_k)$. Because $(E_i - E_k)(T_i - T_k)$ is symmetric in $(i, k)$, the second term has the **same sign** in $h_{ik}$ and $h_{ki}$, violating $h_{ik} + h_{ki} = 0$ and $\sum_i H_i = 0$. On F1 (Table 4), `pyDecision` gives $H = [0.323, 0.631, 0.199, -0.129, -0.652, -0.341, -0.031]$ ($\max|H - H_{\text{pub}}| = 1.2024$) and swaps the ranks of $A_1$ and $A_3$ (`[2, 1, 3, 5, 7, 6, 4]` vs. `[3, 1, 2, 5, 7, 6, 4]`). On F2 (Table 8), it swaps $A_8$ and $A_9$ (rank 1 vs. 2). |

## 5. Verification against published numerical examples

### 5.1 Fixture F1: Keshavarz Ghorabaee et al. (2016), Example 1 (Tables 1-4, pp. 29-31)

7 industrial robots ($A_1, \dots, A_7$) evaluated on 5 criteria, adapted from Chakraborty & Zavadskas (2014) (*Informatica*, 25(1), 1-20, DOI `10.15388/Informatica.2014.01`):

- $C_1$: Load capacity (kg, benefit, $w_1 = 0.036$)
- $C_2$: Repeatability (mm, cost, $w_2 = 0.192$)
- $C_3$: Maximum tip speed (mm/s, benefit, $w_3 = 0.326$)
- $C_4$: Memory capacity (steps, benefit, $w_4 = 0.326$)
- $C_5$: Manipulator reach (mm, benefit, $w_5 = 0.120$)

**Documented header swap in Tables 1-2 of the origin paper:** In Tables 1 and 2 of Keshavarz Ghorabaee et al. (2016) (p. 29-30), the column titles *"Maximum tip speed (mm/s)"* and *"Repeatability (mm)"* and their stated weights ($w = 0.326, 0.192$) are transposed relative to the numerical columns: column 2 contains `[0.4, 0.15, 0.10, 0.2, 0.10, 0.08, 0.1]` (which is Repeatability in mm, cost, $\min = 0.08$, weighted by $0.192$ in Table 3 to give $r_{i2} = [0.0384, 0.1024, 0.1536, 0.0768, 0.1536, 0.1920, 0.1536]$) and column 3 contains `[2540, 1016, 1727.2, 1000, 560, 1016, 1778]` (which is Maximum tip speed in mm/s, benefit, $\max = 2540$, weighted by $0.326$ in Table 3 to give $r_{i3} = [0.3260, 0.1304, 0.2217, 0.1283, 0.0719, 0.1304, 0.2282]$). When each data column is paired with its true criterion type and weight, every table in the paper (Tables 2, 3, and 4) is reproduced to 4 decimal places (`max|diff| <= 0.00005` on $r, ns, E, T, H$). (Note: Trung 2022, Table 3-4 later copied the swapped headers literally, treating `[0.4, 0.15, ...]` as benefit with $w = 0.326$ and `[2540, 1016, ...]` as cost with $w = 0.192$.)

**Documented single-digit print typo in Table 4:** In Table 4 (p. 31), cell $h_{12}$ (row $A_1$, column $A_2$) is printed as `-0.1460`, whereas its transpose cell $h_{21}$ (row $A_2$, column $A_1$) is printed as `0.1560`, and from Table 3 ($E_1 - E_2 = 0.2593 - 0.3032 = -0.0439$, $T_1 - T_2 = 0.3394 - 0.4510 = -0.1116$) the true value is $-0.1554$ (or $-0.1555$ from rounded $E, T$). Moreover, the row sum printed in Table 4 for $A_1$ ($H_1 = 0.5122$) uses the uncorrupted value $-0.1554$, not $-0.1460$.

| Alt | $E_i$ (ours) | $E_i$ (pub) | $T_i$ (ours) | $T_i$ (pub) | $H_i$ (ours) | $H_i$ (pub) | Rank (ours / pub) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| $A_1$ | `0.259282` | `0.2593` | `0.339437` | `0.3394` | `0.512176` | `0.5122` | 3 / 3 |
| $A_2$ | `0.303163` | `0.3032` | `0.450965` | `0.4510` | `1.463300` | `1.4633` | 1 / 1 |
| $A_3$ | `0.241516` | `0.2415` | `0.476180` | `0.4762` | `1.071533` | `1.0715` | 2 / 2 |
| $A_4$ | `0.194687` | `0.1947` | `0.311393` | `0.3114` | `-0.212468` | `-0.2125` | 5 / 5 |
| $A_5$ | `0.119941` | `0.1199` | `0.160641` | `0.1606` | `-1.851521` | `-1.8515` | 7 / 7 |
| $A_6$ | `0.164377` | `0.1644` | `0.213326` | `0.2133` | `-1.171677` | `-1.1717` | 6 / 6 |
| $A_7$ | `0.208730` | `0.2087` | `0.371958` | `0.3720` | `0.188656` | `0.1887` | 4 / 4 |

Maximum absolute discrepancy across all 7 alternatives on $E_i$, $T_i$, and $H_i$: **$0.00004$** (pure 4 d.p. rounding of unrounded IEEE-754 floats).

### 5.2 Fixture F2: Keshavarz Ghorabaee et al. (2016), Example 2 (Tables 5-8, pp. 32-36)

14 office microclimate alternatives ($A_1, \dots, A_{14}$) across 6 criteria ($C_1, \dots, C_4$ benefit, $C_5, C_6$ cost) with weights $w = [0.21, 0.16, 0.26, 0.17, 0.12, 0.08]$ and $\tau = 0.02$:

- `max|n - n_pub| = 0.00005`, `max|r - r_pub| = 0.00005`, `max|ns - ns_pub| = 0.00003`
- `max|E - E_pub| = 0.00005`, `max|T - T_pub| = 0.00005`, `max|H - H_pub| = 0.00049` (Table 8 prints $H_i$ to 3 decimal places)
- Ranking: `[3, 6, 9, 10, 14, 13, 12, 1, 2, 11, 4, 7, 8, 5]` — **14/14 exact match** ($A_8 \succ A_9 \succ A_1 \succ A_{11} \succ A_{14} \succ A_2 \succ A_{12} \succ A_{13} \succ A_3 \succ A_4 \succ A_{10} \succ A_7 \succ A_6 \succ A_5$).

### 5.3 Fixture F4: Badi, Abdulshahed & Shetwan (2018) (Tables 1-5, DOI `10.31181/dmame180101b`)

6 steelmaking suppliers ($S_1, \dots, S_6$) across 4 criteria ($C_1$ benefit, $C_2$ cost, $C_3$ benefit, $C_4$ benefit) with AHP weights $w = [0.2857, 0.3036, 0.2321, 0.1786]$ and $\tau = 0.02$:

- Note: In Table 3 of Badi et al. (2018), the bottom row prints $ns_3 = 0.0719$ (a copy-paste typo from column 3 of Table 3 in Keshavarz Ghorabaee et al. 2016!), whereas $\min_i r_{i3} = 0.1161$. All subsequent numbers in Badi et al. ($E_i$, $T_i$, $h_{ik}$, $H_i$) use the true $ns_3 = 0.1161$.
- `max|E - E_pub| = 0.00004`, `max|T - T_pub| = 0.00004`, `max|H - H_pub| = 0.00005` ($H = [1.3914, 0.3411, -0.2170, -0.5381, -0.7292, -0.2482]$).
- Ranking at $\tau \in \{0.01, 0.02, 0.03\}$: `[1, 2, 3, 5, 6, 4]`; ranking at $\tau \in \{0.04, 0.05, 0.10, 0.15, 0.30, 0.50, 1.00\}$: `[1, 2, 4, 5, 6, 3]` (since $|E_3 - E_6| = 0.0089 < \tau$ while $|E_6 - E_k| \in [0.0248, 0.0316]$ for $k \in \{2, 4\}$ crosses $\tau$ between $0.03$ and $0.04$). Matches Table 5 of Badi et al. (2018) across all 10 tested $\tau$ values.

### 5.4 Fixture F5: Trung (2022) (Example 3, Tables 12, 14-16, DOI `10.18485/aeletters.2022.7.2.2`)

16 turning process trials ($A_1, \dots, A_{16}$) on 2 criteria ($Ra$ cost, $MRR$ benefit):

- With $w = [0.7174, 0.2826]$ ($\sum w = 1$; p. 62 misprints $w_2 = 0.2816$), our first row $h_{1,k}$ matches all 16 entries of Table 14 row $A_1$ to 3 d.p. (`max|diff| = 0.0005`).
- Note two table-editing bugs in Trung (2022): (a) Table 13 (labeled "applying method N1") inadvertently prints the $n_{ij}, r_{ij}, E_i, T_i$ values of method N5 (logarithmic normalization, with negative entries $n_{4,1} = -0.001$), while Table 14 is from N1; and (b) in the lower triangle of Table 14, spreadsheet formulas for $-h_{ki}$ in columns $A_1$ (row $A_{10}$), $A_2$ (rows $A_5, A_8\text{--}A_{12}$), and $A_5$ (rows $A_{10}\text{--}A_{16}$, which duplicate column $A_6$) broke antisymmetry, shifting two middle ranks ($A_6/A_{12}$ and $A_7/A_{10}$) in Table 15.

## 6. Algebraic properties & edge cases

Verified across 500 random positive problems in `scripts/codas.py`:

1. **Antisymmetry of $R_a$ and zero-sum of $H$:** Because $\psi(-x) = \psi(x)$, $h_{ik} + h_{ki} = 0$ for all $i, k$ (`max|h + h^T| = 0.0`), and $\sum_{i=1}^n H_i = 0$ (`max|sum H| = 3.6e-15`).
2. **Column scale invariance:** Multiplying any criterion column $x_{\cdot j}$ by $c_j > 0$ leaves $n_{ij}, r_{ij}, ns_j, E_i, T_i, h_{ik}, H_i$ unchanged (`max|dH| = 2.7e-15`).
3. **Asymptotic regimes in $\tau$:**
   - When $\tau > \max_{i,k}|E_i - E_k|$ (e.g. $\tau > 1$), $\psi(E_i - E_k) = 0$ everywhere and $H_i = n (E_i - \bar{E})$, reducing CODAS to pure Euclidean distance from $ns$ (500/500).
   - When $\tau \to 0^+$ (and all $E_i$ are distinct), $\psi(E_i - E_k) = 1$ for all $i \ne k$ and $H_i = n\bigl((E_i + T_i) - (\overline{E + T})\bigr)$, ranking by $E_i + T_i$ (500/500).
4. **Constant criterion column ($x_{1j} = \dots = x_{nj} > 0$):** Both $x_{ij}/\max_k x_{kj}$ and $\min_k x_{kj}/x_{ij}$ equal $1$ (`linearMaxNormalize` sets flat columns to $1$), so $r_{ij} = w_j$ and $ns_j = w_j$, giving $r_{ij} - ns_j = 0$ for every alternative. A constant criterion contributes $0$ to both $E_i$ and $T_i$ (`max|H - H_dropped| = 0.0`).
5. **All equal alternatives:** $r_{ij} = ns_j$ for all $i, j$, so $E_i = 0$, $T_i = 0$, $h_{ik} = 0$, $H_i = 0$, and all alternatives tie at rank 1.
6. **Non-positive values ($x_{ij} \le 0$):** Rejected at validation (`requires: { positiveValues: true }`).

## 7. Implementation mapping

- **Core module:** `src/core/methods/codas.ts` (`codas`, `CODAS_DEFAULT_TAU = 0.02`, `CodasParams = { tau?: number }`).
- **Parameter specification:** `params: [{ key: 'tau', kind: 'number', min: 0.01, max: 0.1, step: 0.01, default: 0.02 }]` (strictly validated in `compute`: `typeof tau !== 'number' || !Number.isFinite(tau) || tau < 0.01 || tau > 0.1` throws `RangeError`).
- **Intermediate steps emitted:**
  1. `codas.normalized` (`kind: 'matrix'`, $n_{ij}$)
  2. `codas.weighted` (`kind: 'matrix'`, $r_{ij}$)
  3. `codas.negativeIdeal` (`kind: 'vector'`, $ns_j$)
  4. `codas.euclidean` (`kind: 'vector'`, $E_i$)
  5. `codas.taxicab` (`kind: 'vector'`, $T_i$)
  6. `codas.relativeAssessment` (`kind: 'matrix'`, $h_{ik}$)
  7. `codas.score` (`kind: 'vector'`, $H_i$)
- **Score order:** `order: 'desc'`.
- **Reference example in `src/data/examples.ts`:** `badi-2018-suppliers` (6 steelmaking suppliers $\times$ 4 criteria, Badi, Abdulshahed & Shetwan 2018, Tables 1-5, `referenceFor: ['codas']`).
