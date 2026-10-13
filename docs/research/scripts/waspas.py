"""Independent WASPAS recomputation (numpy only) against published examples.

Fixtures
  A. Zavadskas, Turskis, Antucheviciene & Zakarevicius (2012), Elektronika ir Elektrotechnika 122(6):3-6,
     DOI 10.5755/j01.eee.122.6.1810 -- Table 1 (normalized input), Table 2 (Q for lambda 0..1),
     Table 3 (sigma(Q)), Table 4 (optimal lambda and Q).
  B. Chakraborty & Zavadskas (2014), Informatica 25(1):1-20, DOI 10.15388/Informatica.2014.01 --
     Example 1 cutting fluid (Tables 1-3) and Example 5 industrial robot (Tables 13-15), raw data.
  pyDecision 5.1.1 waspas_method is transcribed (3 lines, not imported: it pulls matplotlib) only to
  document its divergence; it is NOT a reference.

Run: python3 waspas.py
"""
import numpy as np

np.set_printoptions(precision=4, suppress=True, linewidth=160)
LAMBDAS = np.round(np.arange(0, 1.0001, 0.1), 1)


def normalize_linear_max(X, types):
    """Origin Eqs. 2-3: benefit x / max_i x, cost min_i x / x."""
    X = np.asarray(X, float)
    R = np.empty_like(X)
    for j, t in enumerate(types):
        col = X[:, j]
        R[:, j] = col / col.max() if t == "benefit" else col.min() / col
    return R


def waspas(X, types, w, lam):
    R = normalize_linear_max(X, types)
    w = np.asarray(w, float)
    q1 = R @ w                          # Eq. 1 (WSM)
    q2 = np.prod(R ** w, axis=1)        # Eq. 4 (WPM)
    return R, q1, q2, lam * q1 + (1 - lam) * q2  # Eq. 6


def sigmas(R, w, q2, k_over_t=0.05):
    """Eqs. 12-17: sigma^2(x) = (0.05 x)^2; returns sigma^2(Q1), sigma^2(Q2)."""
    var_x = (k_over_t * R) ** 2
    s1 = (w ** 2 * var_x).sum(axis=1)                       # Eq. 14
    s2 = (((q2[:, None] * w) / R) ** 2 * var_x).sum(axis=1)  # Eq. 15 (dQ2/dx_j = Q2 w_j / x_j)
    return s1, s2


def rank_desc(s):
    s = np.asarray(s)
    return np.array([1 + int(np.sum(s > v + 1e-12)) for v in s])


def pydecision_waspas(X, types, w, lam):
    """Transcribed from pyDecision 5.1.1 algorithm/waspas.py (1 + min-max normalization)."""
    X = np.asarray(X, float)
    x = np.zeros_like(X)
    for j, t in enumerate(types):
        c = X[:, j]
        x[:, j] = 1 + ((c - c.min()) if t == "benefit" else (c.max() - c)) / (c.max() - c.min())
    wsm = (x * w).sum(axis=1)
    wpm = np.prod(x ** w, axis=1)
    return wsm, wpm, lam * wsm + (1 - lam) * wpm


def report(name, printed, ours):
    d = np.max(np.abs(np.asarray(printed) - np.asarray(ours)))
    print(f"  {name}: max|diff| = {d:.5f} -> {'MATCH' if d <= 5e-4 else 'MISMATCH'}")
    return d


# ---------------------------------------------------------------- A. Zavadskas et al. 2012
print("=" * 100)
print("A. Zavadskas et al. 2012, Tables 1-4")
W12 = np.array([0.0627, 0.0508, 0.1114, 0.0874, 0.0625, 0.1183, 0.0784, 0.0984, 0.0530, 0.1417, 0.0798, 0.0557])
X12_PRINTED = np.array([
    [0.8486, 0.6364, 0.7982, 0.6707, 1.0000, 0.8534, 0.6622, 0.8618, 0.1432, 0.1585, 1.0000, 0.4531],
    [1.0000, 1.0000, 1.0000, 0.7976, 0.7000, 0.9005, 0.9324, 0.6788, 1.0000, 0.6500, 0.7270, 0.7346],
    [0.6542, 0.7000, 0.9169, 0.8951, 0.6000, 0.9791, 0.6216, 0.9479, 0.1340, 0.1585, 0.9795, 0.6728],
    [0.3694, 0.4375, 0.9407, 1.0000, 1.0000, 1.0000, 1.0000, 1.0000, 0.5478, 1.0000, 0.3754, 1.0000],
])
X12_FIXED = X12_PRINTED.copy()
X12_FIXED[0, 4] = 0.1000  # misprint hypothesis: a1, x5
T2 = np.array([
    [0.4912, 0.5033, 0.5154, 0.5274, 0.5395, 0.5516, 0.5637, 0.5758, 0.5878, 0.5999, 0.6120],
    [0.8173, 0.8185, 0.8197, 0.8209, 0.8221, 0.8233, 0.8244, 0.8256, 0.8268, 0.8280, 0.8292],
    [0.5873, 0.5983, 0.6093, 0.6203, 0.6313, 0.6423, 0.6532, 0.6642, 0.6752, 0.6862, 0.6972],
    [0.8015, 0.8066, 0.8116, 0.8167, 0.8217, 0.8268, 0.8318, 0.8369, 0.8419, 0.8470, 0.8520],
])
T3 = np.array([
    [0.0075, 0.0068, 0.0064, 0.0062, 0.0062, 0.0066, 0.0071, 0.0079, 0.0088, 0.0098, 0.0108],
    [0.0124, 0.0113, 0.0103, 0.0095, 0.0090, 0.0088, 0.0090, 0.0096, 0.0104, 0.0114, 0.0126],
    [0.0089, 0.0081, 0.0075, 0.0072, 0.0071, 0.0073, 0.0078, 0.0085, 0.0094, 0.0104, 0.0116],
    [0.0122, 0.0111, 0.0102, 0.0095, 0.0092, 0.0093, 0.0097, 0.0105, 0.0115, 0.0127, 0.0140],
])
T4_LAM = np.array([0.32, 0.49, 0.37, 0.43])
T4_Q = np.array([0.5303, 0.8232, 0.6284, 0.8233])
types12 = ["benefit"] * 12
print(f"  weights sum (printed) = {W12.sum():.4f}")

for label, X in (("as printed (a1 x5 = 1.0000)", X12_PRINTED), ("corrected (a1 x5 = 0.1000)", X12_FIXED)):
    print(f"-- matrix {label}")
    R, q1, q2, _ = waspas(X, types12, W12, 0.5)
    assert np.allclose(R, X), "already normalized: max-normalization must leave it unchanged"
    Q = np.array([[lam * a + (1 - lam) * b for lam in LAMBDAS] for a, b in zip(q1, q2)])
    print("  WSM", q1, " WPM", q2)
    print("  Q(lambda=0.5)", Q[:, 5], " rank", rank_desc(Q[:, 5]))
    report("Table 2 (44 values)", T2, Q)
    print("  per-row max diff", np.abs(T2 - Q).max(axis=1))
    s1, s2 = sigmas(R, W12, q2)
    sig = np.array([[np.sqrt(l * l * a + (1 - l) ** 2 * b) for l in LAMBDAS] for a, b in zip(s1, s2)])
    report("Table 3 sigma(Q) (44 values)", T3, sig)
    lam_opt = s2 / (s1 + s2)  # Eq. 19
    print("  lambda_opt (Eq. 19)", lam_opt, " printed", T4_LAM)
    report("Table 4 lambda_opt (2 d.p.)", T4_LAM, np.round(lam_opt, 2))
    q_opt_exact = lam_opt * q1 + (1 - lam_opt) * q2
    q_opt_printed_lam = T4_LAM * q1 + (1 - T4_LAM) * q2
    print("  Q at exact lambda_opt", q_opt_exact, " Q at printed lambda_opt", q_opt_printed_lam, " printed", T4_Q)
    report("Table 4 Q (exact lambda_opt)", T4_Q, q_opt_exact)
    report("Table 4 Q (printed lambda_opt)", T4_Q, q_opt_printed_lam)
    print("  Table 4 rank (exact)", rank_desc(q_opt_exact))

# Which single-cell misprint explains row a1? brute-force check over a1 cells: value v that fits Table 2 best
print("-- misprint search: for each a1 cell, best replacement value in {0.1000, 0.0100, printed}")
for j in range(12):
    for v in (0.1, 0.01):
        X = X12_PRINTED.copy(); X[0, j] = v
        _, q1, q2, _ = waspas(X, types12, W12, 0.5)
        Q = np.array([lam * q1[0] + (1 - lam) * q2[0] for lam in LAMBDAS])
        d = np.abs(Q - T2[0]).max()
        if d < 5e-3:
            print(f"   a1 x{j+1} -> {v}: max diff row a1 = {d:.5f}")

# pyDecision divergence
wsm, wpm, wq = pydecision_waspas(X12_FIXED, types12, W12, 0.5)
print("  pyDecision 5.1.1 (corrected matrix) lambda=0.5:", wq, " rank", rank_desc(wq))

# Renormalized weights effect
_, q1, q2, _ = waspas(X12_FIXED, types12, W12 / W12.sum(), 0.5)
Qn = np.array([[lam * a + (1 - lam) * b for lam in LAMBDAS] for a, b in zip(q1, q2)])
report("Table 2 with weights renormalized to sum 1", T2, Qn)

# ---------------------------------------------------------------- B1. cutting fluid
print("=" * 100)
print("B1. Chakraborty & Zavadskas 2014, Example 1 cutting fluid (Tables 1-3)")
X_cf = np.array([
    [0.035, 34.5, 847, 1.76, 0.335, 0.500, 0.590, 0.590],
    [0.027, 36.8, 834, 1.68, 0.335, 0.665, 0.665, 0.665],
    [0.037, 38.6, 808, 2.40, 0.590, 0.590, 0.410, 0.500],
    [0.028, 32.6, 821, 1.59, 0.500, 0.590, 0.590, 0.410],
])
t_cf = ["cost", "cost", "cost", "cost", "benefit", "cost", "cost", "benefit"]
w_cf = np.array([0.3306, 0.0718, 0.1808, 0.0718, 0.0459, 0.1260, 0.1260, 0.0472])
T2_cf_R = np.array([
    [0.7714, 0.9449, 0.9539, 0.9034, 0.5678, 1.0000, 0.6949, 0.8872],
    [1.0000, 0.8859, 0.9688, 0.9464, 0.5678, 0.7519, 0.6165, 1.0000],
    [0.7297, 0.8446, 1.0000, 0.6625, 1.0000, 0.8474, 1.0000, 0.7519],
    [0.9643, 1.0000, 0.9842, 1.0000, 0.8474, 0.8474, 0.6949, 0.6165],
])
T2_cf_q = np.array([[0.8417, 0.8995, 0.8706], [0.8830, 0.8683, 0.8756], [0.8444, 0.9172, 0.8808], [0.9027, 0.9037, 0.9032]])
T3_cf = np.array([
    [0.8995, 0.8937, 0.8879, 0.8821, 0.8764, 0.8706, 0.8648, 0.8590, 0.8533, 0.8475, 0.8417],
    [0.8683, 0.8698, 0.8712, 0.8727, 0.8742, 0.8756, 0.8771, 0.8786, 0.8801, 0.8815, 0.8830],
    [0.9172, 0.9099, 0.9026, 0.8954, 0.8881, 0.8808, 0.8735, 0.8662, 0.8590, 0.8517, 0.8444],
    [0.9037, 0.9036, 0.9035, 0.9034, 0.9033, 0.9032, 0.9031, 0.9030, 0.9029, 0.9028, 0.9027],
])
T3_cf_rank = np.array([
    [3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4],
    [4, 4, 4, 4, 4, 3, 2, 2, 2, 2, 2],
    [1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 3],
    [2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1],
])
print(f"  weights sum = {w_cf.sum():.4f}")
R, q1, q2, Q = waspas(X_cf, t_cf, w_cf, 0.5)
print(R)
report("Table 2 normalized matrix", T2_cf_R, R)
print("  per-cell diffs > 5e-4:", [(i + 1, j + 1, T2_cf_R[i, j], round(R[i, j], 4)) for i in range(4) for j in range(8) if abs(T2_cf_R[i, j] - R[i, j]) > 5e-4])
print("  Q1", q1, " Q2", q2, " Q", Q, " rank", rank_desc(Q))
report("Table 2 Q1/Q2/Q", T2_cf_q, np.c_[q1, q2, Q])
Qg = np.array([[lam * a + (1 - lam) * b for lam in LAMBDAS] for a, b in zip(q1, q2)])
report("Table 3 (44 values)", T3_cf, Qg)
ranks = np.array([rank_desc(Qg[:, k]) for k in range(11)]).T
print("  ranks per lambda:\n", ranks)
print("  rank cells differing from Table 3:", int((ranks != T3_cf_rank).sum()))
# Same from the printed normalized matrix (removes raw-data rounding)
_, q1p, q2p, Qp = waspas(T2_cf_R, ["benefit"] * 8, w_cf, 0.5)
report("Table 2 Q1/Q2/Q from printed normalized matrix", T2_cf_q, np.c_[q1p, q2p, Qp])
print("  pyDecision lambda=0.5:", pydecision_waspas(X_cf, t_cf, w_cf, 0.5)[2], " rank", rank_desc(pydecision_waspas(X_cf, t_cf, w_cf, 0.5)[2]))

# ---------------------------------------------------------------- B5. industrial robot
print("=" * 100)
print("B5. Chakraborty & Zavadskas 2014, Example 5 industrial robot (Tables 13-15)")
X_rb = np.array([
    [60, 0.40, 2540, 500, 990],
    [6.35, 0.15, 1016, 3000, 1041],
    [6.8, 0.10, 1727.2, 1500, 1676],
    [10, 0.20, 1000, 2000, 965],
    [2.5, 0.10, 560, 500, 915],
    [4.5, 0.08, 1016, 350, 508],
    [3, 0.10, 1778, 1000, 920],
])
t_rb = ["benefit", "cost", "benefit", "benefit", "benefit"]
w_rb = np.array([0.036, 0.192, 0.326, 0.326, 0.120])
T14_R = np.array([
    [1, 0.2, 1, 0.1667, 0.5907],
    [0.1058, 0.5333, 0.4, 1, 0.6211],
    [0.1133, 0.8, 0.68, 0.5, 1],
    [0.1667, 0.4, 0.3937, 0.6667, 0.5758],
    [0.0417, 0.8, 0.2205, 0.1667, 0.5459],
    [0.0750, 1, 0.4, 0.1167, 0.3031],
    [0.0500, 0.8, 0.7, 0.3333, 0.5489],
])
T14_q = np.array([[0.5256, 0.3843, 0.4550], [0.6371, 0.5727, 0.6049], [0.6624, 0.6232, 0.6428], [0.4976, 0.4758, 0.4867],
                  [0.3468, 0.2706, 0.3087], [0.3995, 0.2907, 0.3451], [0.5581, 0.4980, 0.5281]])
T15 = np.array([
    [0.3843, 0.3984, 0.4126, 0.4267, 0.4408, 0.4550, 0.4691, 0.4832, 0.4973, 0.5115, 0.5256],
    [0.5727, 0.5791, 0.5856, 0.5920, 0.5985, 0.6049, 0.6114, 0.6178, 0.6242, 0.6307, 0.6371],
    [0.6232, 0.6271, 0.6310, 0.6349, 0.6388, 0.6428, 0.6469, 0.6506, 0.6545, 0.6584, 0.6624],
    [0.4758, 0.4780, 0.4802, 0.4823, 0.4845, 0.4867, 0.4889, 0.4910, 0.4932, 0.4954, 0.4976],
    [0.2706, 0.2783, 0.2859, 0.2935, 0.3011, 0.3087, 0.3163, 0.3240, 0.3316, 0.3392, 0.3468],
    [0.2907, 0.3015, 0.3124, 0.3233, 0.3342, 0.3451, 0.3560, 0.3668, 0.3778, 0.3886, 0.3995],
    [0.4980, 0.5040, 0.5100, 0.5161, 0.5221, 0.5281, 0.5341, 0.5401, 0.5461, 0.5521, 0.5581],
])
T15_rank = np.array([[5] * 8 + [4] * 3, [2] * 11, [1] * 11, [4] * 8 + [5] * 3, [7] * 11, [6] * 11, [3] * 11])
print(f"  weights sum = {w_rb.sum():.4f}")
R, q1, q2, Q = waspas(X_rb, t_rb, w_rb, 0.5)
print(R)
report("Table 14 normalized matrix", T14_R, R)
print("  per-cell diffs > 5e-4:", [(i + 1, j + 1, T14_R[i, j], round(R[i, j], 4)) for i in range(7) for j in range(5) if abs(T14_R[i, j] - R[i, j]) > 5e-4])
print("  Q1", q1, "\n  Q2", q2, "\n  Q", Q, " rank", rank_desc(Q))
report("Table 14 Q1/Q2/Q", T14_q, np.c_[q1, q2, Q])
Qg = np.array([[lam * a + (1 - lam) * b for lam in LAMBDAS] for a, b in zip(q1, q2)])
dd = np.abs(T15 - Qg)
report("Table 15 (77 values)", T15, Qg)
print("  cells > 5e-4:", [(i + 1, float(LAMBDAS[k]), T15[i, k], round(Qg[i, k], 4)) for i in range(7) for k in range(11) if dd[i, k] > 5e-4])
ranks = np.array([rank_desc(Qg[:, k]) for k in range(11)]).T
print("  rank cells differing from Table 15:", int((ranks != T15_rank).sum()))
print("  ranks per lambda:\n", ranks)
w_pd = pydecision_waspas(X_rb, t_rb, w_rb, 0.5)[2]
print("  pyDecision lambda=0.5:", w_pd, " rank", rank_desc(w_pd))


# ---------------------------------------------------------------- C. Aytaç Adalı & Tuş Işık 2017 (SWARA -> WASPAS)
print("=" * 100)
print("C. Aytac Adali & Tus Isik 2017, IREM 5(4):56-77, Tables 4-7 (supplier selection, SWARA weights)")
X_aa = np.array([
    [3, 12.5, 2, 120, 14, 3],
    [5, 15, 3, 110, 38, 4],
    [3, 13, 2, 120, 19, 3],
    [4, 14, 2, 100, 31, 4],
    [3, 15, 1.5, 125, 40, 4],
])
t_aa = ["benefit", "cost", "cost", "benefit", "cost", "benefit"]
w_aa = np.array([0.221, 0.159, 0.175, 0.127, 0.117, 0.201])
T6_aa = np.array([
    [0.600, 1.000, 0.750, 0.960, 1.000, 0.750],
    [1.000, 0.833, 0.500, 0.880, 0.368, 1.000],
    [0.600, 0.962, 0.750, 0.960, 0.737, 0.750],
    [0.800, 0.893, 0.750, 0.800, 0.452, 1.000],
    [0.600, 0.833, 1.000, 1.000, 0.350, 1.000],
])
T7_aa = np.array([
    [0.7975, 0.7990, 0.8005, 0.8020, 0.8035, 0.8050, 0.8065, 0.8080, 0.8095, 0.8110, 0.8125],
    [0.7533, 0.7576, 0.7620, 0.7663, 0.7707, 0.7751, 0.7794, 0.7838, 0.7881, 0.7925, 0.7969],
    [0.7647, 0.7658, 0.7669, 0.7680, 0.7691, 0.7702, 0.7713, 0.7724, 0.7734, 0.7745, 0.7756],
    [0.7874, 0.7892, 0.7910, 0.7928, 0.7946, 0.7964, 0.7982, 0.8000, 0.8018, 0.8036, 0.8055],
    [0.7674, 0.7716, 0.7758, 0.7799, 0.7841, 0.7882, 0.7924, 0.7966, 0.8007, 0.8049, 0.8091],
])
# SWARA weights from Table 4 (k_j = 1 + s_j, w_j = w_{j-1}/k_j, q_j = w_j / sum), order C1, C6, C3, C2, C4, C5
s_sw = [0, 0.100, 0.150, 0.100, 0.250, 0.083]
wv = [1.0]
for s_ in s_sw[1:]:
    wv.append(wv[-1] / (1 + s_))
q_sw = np.array(wv) / sum(wv)
print("  SWARA q (C1,C6,C3,C2,C4,C5) recomputed", q_sw.round(4), " printed [0.221 0.201 0.175 0.159 0.127 0.117]")
print(f"  weights sum = {w_aa.sum():.4f}")
R, q1, q2, Q = waspas(X_aa, t_aa, w_aa, 0.5)
report("Table 6 normalized matrix (3 d.p.)", T6_aa, R)
Qg = np.array([[lam * a + (1 - lam) * b for lam in LAMBDAS] for a, b in zip(q1, q2)])
print("  WSM", q1, " WPM", q2)
report("Table 7 (55 values)", T7_aa, Qg)
print("  per-row max diff", np.abs(T7_aa - Qg).max(axis=1))
for k in range(11):
    print(f"   lambda={LAMBDAS[k]}: ours rank {rank_desc(Qg[:, k])}  printed-values rank {rank_desc(T7_aa[:, k])}")
_, q1p, q2p, _ = waspas(T6_aa, ["benefit"] * 6, w_aa, 0.5)
Qp = np.array([[lam * a + (1 - lam) * b for lam in LAMBDAS] for a, b in zip(q1p, q2p)])
report("Table 7 from printed (3 d.p.) Table 6", T7_aa, Qp)
print("  pyDecision lambda=0.5:", pydecision_waspas(X_aa, t_aa, w_aa, 0.5)[2])

# ---------------------------------------------------------------- edge cases
print("=" * 100)
print("Edge cases")
# constant column: x/max = 1 for all -> factor 1 in product, adds w_j to WSM; ranking unaffected
Xc = np.array([[1, 5.0], [2, 5.0], [4, 5.0]])
print("  constant column:", waspas(Xc, ["benefit", "benefit"], np.array([0.5, 0.5]), 0.5)[3])
print("  pyDecision constant column (0/0):", pydecision_waspas(Xc, ["benefit", "benefit"], np.array([0.5, 0.5]), 0.5)[2])
# zero benefit cell -> WPM 0 for that alternative
Xz = np.array([[0.0, 3.0], [2, 1.0], [4, 2.0]])
print("  zero benefit cell, WPM:", waspas(Xz, ["benefit", "benefit"], np.array([0.5, 0.5]), 0.5)[2])
# zero weight with zero cell: 0**0 = 1 in IEEE/JS Math.pow as well
print("  0**0 =", 0.0 ** 0.0)

# ---------------------------------------------------------------- invariant: WPM <= WSM (weighted AM-GM, sum w = 1)
print("=" * 100)
print("Invariant WPM <= WSM (weighted AM-GM); Q is non-decreasing in lambda")
for name, X, t, w in (("robot", X_rb, t_rb, w_rb), ("supplier", X_aa, t_aa, w_aa), ("origin fixed", X12_FIXED, types12, W12 / W12.sum())):
    _, a, b, _ = waspas(X, t, w, 0.5)
    print(f"  {name}: all WPM <= WSM: {bool(np.all(b <= a + 1e-15))}")
print("  cutting fluid printed Table 2: Q2 > Q1 in rows", [i + 1 for i in range(4) if T2_cf_q[i, 1] > T2_cf_q[i, 0]],
      "-> impossible under weighted AM-GM, so the printed WPM column is wrong for those rows")
rng = np.random.default_rng(1)
bad = 0
for _ in range(2000):
    m, n = rng.integers(2, 8), rng.integers(2, 8)
    X = rng.uniform(0.01, 100, (m, n)); w = rng.dirichlet(np.ones(n)); t = list(rng.choice(["benefit", "cost"], n))
    _, a, b, _ = waspas(X, t, w, 0.5)
    bad += int(np.any(b > a + 1e-12))
print("  random 2000 problems, violations:", bad)
