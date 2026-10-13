"""Independent recomputation of Standard Deviation (SD) objective weighting.

Fixtures:
  A. Diakoulaki, Mavrotas & Papayannakis (1995), Computers & OR 22(7):763-770,
     DOI 10.1016/0305-0548(94)00059-H. Table 1 input, Eq. 2 (min-max), Eq. 7 (SD weights),
     Sec. 5 sigma values, Table 2 (score matrix), Table 3 (SD weights), Tables 4-5 (rankings).
  B. Mukhametzyanov (2021), DMAME 4(2):76-105, DOI 10.31181/dmame210402076i.
     Table 1 (DM-1, DM-2; DM-3 and DM-12 derived as the paper describes), Eq. 1-2 + 11,
     Table 2 SD rows, Table 4 (sigma and weights under six normalizations).

Run: python3 sd.py   (numpy only; no pyDecision - it has no SD function)
"""
import numpy as np

np.set_printoptions(precision=4, suppress=True)


def minmax(X, types):
    """Eq. 2 of Diakoulaki 1995 / Eqs. 1-2 of Mukhametzyanov 2021: best -> 1, worst -> 0."""
    X = np.asarray(X, float)
    lo, hi = X.min(0), X.max(0)
    rng = hi - lo
    R = np.zeros_like(X)
    for j, t in enumerate(types):
        if rng[j] == 0:
            continue  # constant column: r = 0, sigma = 0, weight 0
        R[:, j] = (X[:, j] - lo[j]) / rng[j] if t == "max" else (hi[j] - X[:, j]) / rng[j]
    return R


def sd_weights(X, types, ddof=1, norm=minmax):
    R = norm(X, types)
    s = R.std(0, ddof=ddof)
    tot = s.sum()
    w = np.full(len(s), 1 / len(s)) if tot == 0 else s / tot
    return R, s, w


def rank_desc(v):
    """Competition ranking, 1 = largest."""
    v = np.asarray(v)
    return np.array([1 + int((v > x + 1e-12).sum()) for x in v])


def spearman(a, b):
    a, b = np.asarray(a), np.asarray(b)
    n = len(a)
    return 1 - 6 * ((a - b) ** 2).sum() / (n * (n * n - 1))


def report(name, got, printed):
    got, printed = np.asarray(got), np.asarray(printed)
    d = np.abs(got - printed).max()
    print(f"  {name}: got {np.round(got, 5)} printed {printed} max|diff| {d:.2e}")
    return d


# ---------------------------------------------------------------- Fixture A
print("A. Diakoulaki et al. 1995 (all criteria benefit)")
XA = np.array([
    [61.0, 1.08, 4.33], [20.7, 0.26, 4.34], [16.3, 1.98, 2.53], [9.0, 3.29, 1.65],
    [5.4, 2.77, 2.33], [4.0, 4.12, 1.21], [-6.1, 3.52, 2.10], [-34.6, 3.31, 0.98]])
tA = ["max"] * 3
RA, s0, wA = sd_weights(XA, tA, ddof=0)
_, s1, _ = sd_weights(XA, tA, ddof=1)
T2 = np.array([[1, 0.212, 0.996], [0.578, 0, 1], [0.524, 0.446, 0.460], [0.455, 0.785, 0.200],
               [0.418, 0.650, 0.401], [0.404, 1, 0.069], [0.298, 0.845, 0.335], [0, 0.790, 0]])
dT2 = np.abs(RA - T2)
print("  Table 2 recomputed:\n", np.round(RA, 4))
print("  Table 2 cells off by > 5e-4 (row, col, printed, recomputed):")
for i, j in zip(*np.where(dT2 > 5e-4)):
    print(f"    {'ABCDEFGH'[i]} c{j+1}: {T2[i, j]} vs {RA[i, j]:.5f}")
report("sigma (population, 1/m)", s0, [0.263, 0.321, 0.358])
print(f"  sigma (sample, 1/(m-1)) = {np.round(s1, 4)}  -> does NOT match printed sigma")
dA = report("weights Table 3 SD", wA, [0.279, 0.341, 0.380])
assert dA < 5e-4
w_s1 = s1 / s1.sum()
print(f"  weights with 1/(m-1): diff to 1/m weights {np.abs(w_s1 - wA).max():.1e}")
DA = RA @ wA
print(f"  D_i = sum w_j r_ij (Eq. 9): {np.round(DA, 4)}")
rkA = rank_desc(DA)
print(f"  ranking recomputed {rkA}, Table 4 printed SD column [1 2 7 5 6 3 4 8]")
prof, ms, prod = [1, 2, 3, 4, 5, 6, 7, 8], [7, 8, 6, 4, 5, 1, 2, 3], [2, 1, 3, 6, 4, 7, 5, 8]
print("  Spearman vs Table 1 unicriteria ranks (Table 5 printed SD: 0.571 -0.476 0.762)")
print("    recomputed ranking :", [round(spearman(rkA, c), 3) for c in (prof, ms, prod)])
print("    Table 4 printed    :", [round(spearman([1, 2, 7, 5, 6, 3, 4, 8], c), 3) for c in (prof, ms, prod)])
# Same check for MW (equal weights) as a control: printed Table 4 MW = [1 2 7 6 5 4 3 8]
print("  control MW ranking:", rank_desc(RA.mean(1)), "printed [1 2 7 6 5 4 3 8]")

# ---------------------------------------------------------------- Fixture B
print("\nB. Mukhametzyanov 2021")
tB = ["max", "min", "max", "max", "min"]
DM1 = np.array([[71, 4500, 150, 1056, 478], [85, 5800, 145, 2680, 564], [76, 5600, 135, 1230, 620],
                [74, 4200, 160, 1480, 448], [82, 6200, 183, 1350, 615], [81, 6000, 178, 2065, 580],
                [80, 5900, 160, 1650, 610], [85, 6500, 140, 1650, 667]], float)
DM2 = np.array([[83, 5322, 170, 1682, 500], [84, 6021, 155, 2140, 513], [76, 4219, 155, 1613, 454],
                [73, 6154, 157, 2047, 582], [78, 5453, 173, 2136, 598], [82, 6030, 174, 1238, 587],
                [80, 4344, 172, 1365, 507], [77, 6114, 158, 1585, 592]], float)
DM3 = DM1.copy(); DM3[0] = DM2[0]          # "replacing A1 of DM-1 with B1 of DM-2"
DM12 = np.vstack([DM1, DM2])               # concatenation [16x5]
printed = {
    "DM-1": [0.210, 0.203, 0.207, 0.183, 0.196],
    "DM-2": [0.175, 0.206, 0.231, 0.195, 0.192],
    "DM-3": [0.216, 0.181, 0.220, 0.189, 0.193],
    "DM-12": [0.208, 0.225, 0.192, 0.176, 0.199],
}
maxd = 0
for name, M in [("DM-1", DM1), ("DM-2", DM2), ("DM-3", DM3), ("DM-12", DM12)]:
    _, s, w = sd_weights(M, tB, ddof=1)
    maxd = max(maxd, report(f"{name} weights", w, printed[name]))
    if name == "DM-1":
        report("DM-1 sigma Table 4 Max-Min (1/(m-1))", s, [0.366, 0.354, 0.361, 0.319, 0.341])
assert maxd < 5e-4

# Table 2 'Rank (SAW)' column for SD: DM-1 A2>A4>A6>..., DM-2 B3>B1>B5>...
for name, M in [("DM-1", DM1), ("DM-2", DM2)]:
    R, _, w = sd_weights(M, tB)
    S = R @ w
    order = np.argsort(-S)[:3] + 1
    print(f"  {name} SAW on min-max with SD weights, top-3 alternatives: {order}")

# Table 4: other normalizations (documentation of variants only)
print("\n  Table 4 variants on DM-1 (sigma with 1/(m-1)):")


def norm_max(X, t):   # benefit x/max, cost min/x
    return np.column_stack([X[:, j] / X[:, j].max() if t[j] == "max" else X[:, j].min() / X[:, j] for j in range(X.shape[1])])


def norm_max_inv1(X, t):   # benefit x/max, cost 1 - x/max
    return np.column_stack([X[:, j] / X[:, j].max() if t[j] == "max" else 1 - X[:, j] / X[:, j].max() for j in range(X.shape[1])])


def norm_sum(X, t):   # benefit x/sum, cost (1/x)/sum(1/x)
    return np.column_stack([X[:, j] / X[:, j].sum() if t[j] == "max" else (1 / X[:, j]) / (1 / X[:, j]).sum() for j in range(X.shape[1])])


def norm_vec(X, t):   # benefit x/||x||, cost 1 - x/||x||  and min/x variants tried below
    return np.column_stack([X[:, j] / np.linalg.norm(X[:, j]) if t[j] == "max" else 1 - X[:, j] / np.linalg.norm(X[:, j]) for j in range(X.shape[1])])


def norm_raw(X, t):   # SD on raw data (pymcdm-doc style, no normalization)
    return np.asarray(X, float)


T4 = {"Max": ([0.060, 0.125, 0.095, 0.193, 0.112], [0.103, 0.214, 0.162, 0.331, 0.191]),
      "Sum": ([0.008, 0.018, 0.014, 0.039, 0.016], [0.084, 0.190, 0.144, 0.411, 0.170]),
      "Vec": ([0.023, 0.051, 0.039, 0.107, 0.046], [0.086, 0.192, 0.147, 0.403, 0.172])}
for label, f in [("Max (cost min/x)", norm_max), ("Max (cost 1-x/max)", norm_max_inv1),
                 ("Sum (cost 1/x)", norm_sum), ("Vec (cost 1-x/||x||)", norm_vec)]:
    _, s, w = sd_weights(DM1, tB, norm=f)
    key = label.split()[0]
    ps, pw = T4[key]
    print(f"    {label:22s} sigma {np.round(s, 3)} w {np.round(w, 3)}  | printed w {pw}  max|dw| {np.abs(w - pw).max():.3f}")
_, s, w = sd_weights(DM1, tB, norm=norm_raw)
print(f"    raw data (no norm.)    w {np.round(w, 3)}  (scale-dependent; C2/C4 dominate)")

# Invariance checks (properties used in the card)
R1, s1, w1 = sd_weights(DM1, tB)
_, _, w_flip = sd_weights(DM1, ["max"] * 5)
print(f"\n  types ignored by min-max SD? max|w(types) - w(all max)| = {np.abs(w1 - w_flip).max():.1e}")
_, _, w_aff = sd_weights(DM1 * 3.7 + 100, tB)
print(f"  affine invariance (x*3.7+100): max|dw| = {np.abs(w1 - w_aff).max():.1e}")
# Constant column and all-constant fallbacks
Xc = DM1.copy(); Xc[:, 2] = 150
print("  constant column C3 ->", np.round(sd_weights(Xc, tB)[2], 4))
print("  all constant      ->", sd_weights(np.ones((4, 3)), ["max"] * 3)[2])
# m = 2: every non-constant column becomes (0, 1) -> equal weights
print("  m = 2             ->", np.round(sd_weights(DM1[:2], tB)[2], 4))
print("\nALL FIXTURES MATCH")
