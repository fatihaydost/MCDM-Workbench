"""Independent COPRAS recomputation (numpy only) against published examples.

Fixtures
  F1  Zavadskas, Kaklauskas, Peldschus & Turskis (2007), Baltic J. Road Bridge Eng. 2(4):195-203,
      Table 1 (input + normalized matrix), Table 2 (D, S+, S-, Q, N, rank), weight sets Wa and Wb.
  F2  Podvezko (2011), Engineering Economics 22(2):134-146, DOI 10.5755/j01.ee.22.2.310, Tables 7-8.
  F3  Podvezko (2011) Table 9 (S+, S- from Zavadskas, Kaklauskas & Banaitiene 2001, Table 6.20): Q step only.
  F4  Keshavarz Ghorabaee et al. (2015), Informatica 26(3):435-451, DOI 10.15388/Informatica.2015.57,
      Tables 5-7: published COPRAS ranks for 7 weight sets.
Also: pyDecision 5.1.1 copras_method (divergence only, never a reference) and the pymcdm formula.

Run: python3 -I copras.py
"""
import importlib.util
import sys

import numpy as np

np.set_printoptions(legacy='1.25', precision=4, suppress=True, linewidth=160)


def copras(X, w, types, s_minus_form="original"):
    """Crisp COPRAS. X: m x n (alternatives x criteria), all > 0. types: 'benefit'|'cost'.

    s_minus_form:
      'original'   Q = S+ + S-min * sum(S-) / (S- * sum(S-min / S-))   (Zavadskas et al. 2007 Eq. 5)
      'simplified' Q = S+ + sum(S-) / (S- * sum(1 / S-))                 (Podvezko 2011 Eq. 11)
      'pymcdm'     Q = S+ + (S-min * S-) / (S- * (S-min / S-))  == S+ + S-   (pymcdm 1.x, diverges)
    """
    X = np.asarray(X, float)
    w = np.asarray(w, float)
    cost = np.array([t == "cost" for t in types])
    R = X / X.sum(axis=0)                      # Eq. 1 without weights: share of column total
    D = R * w                                  # d_ij = w_j x_ij / sum_i x_ij
    Sp = D[:, ~cost].sum(axis=1)
    Sm = D[:, cost].sum(axis=1)
    if not cost.any() or w[cost].sum() == 0:   # no (weighted) cost criteria: Q = S+ (Podvezko p. 137)
        Q = Sp.copy()
    elif s_minus_form == "original":
        Q = Sp + Sm.min() * Sm.sum() / (Sm * (Sm.min() / Sm).sum())
    elif s_minus_form == "simplified":
        Q = Sp + Sm.sum() / (Sm * (1.0 / Sm).sum())
    elif s_minus_form == "pymcdm":
        Q = Sp + (Sm.min() * Sm) / (Sm * (Sm.min() / Sm))
    else:
        raise ValueError(s_minus_form)
    N = 100.0 * Q / Q.max()
    return dict(R=R, D=D, Sp=Sp, Sm=Sm, Q=Q, N=N, rank=competition_rank(Q))


def competition_rank(s, rel_tol=1e-12):
    s = np.asarray(s, float)
    out = np.empty(len(s), int)
    for i, v in enumerate(s):
        out[i] = 1 + sum(1 for u in s if u > v and abs(u - v) > rel_tol * max(abs(u), abs(v), 1e-300))
    return out


def report(name, printed, got):
    printed = np.asarray(printed, float)
    got = np.asarray(got, float)
    d = np.max(np.abs(printed - got))
    return d


def cmp(label, printed, got, tol):
    printed = np.asarray(printed, float)
    got = np.asarray(got, float)
    d = float(np.max(np.abs(printed - got)))
    print(f"  {label:<26} max|diff| = {d:.6f}  -> {'MATCH' if d <= tol else 'MISMATCH'} (tol {tol})")
    if d > tol:
        print("     printed:", printed.round(4))
        print("     ours   :", got.round(4))
    return d


# ---------------------------------------------------------------- F1 (method authors, 2007)
print("=" * 100)
print("F1  Zavadskas et al. 2007 BJRBE, Tables 1-2 (6 road design alternatives x 5 criteria)")
F1_types = ["benefit", "cost", "cost", "cost", "cost"]
# Table 1, rows = criteria x1..x5, columns = a1..a6 (decimal commas in the paper)
F1_T = np.array([
    [30, 20, 27, 18, 24, 16],                              # x1 longevity, years, max
    [12.487, 12.372, 11.096, 10.982, 11.017, 10.903],      # x2 price, million EUR, min
    [6.261, 5.961, 6.262, 5.962, 6.283, 5.983],            # x3 environment, 10 dB(A), min
    [10.880, 10.880, 9.920, 9.920, 9.980, 9.980],          # x4 economic validity, 100 m, min
    [7.610, 7.460, 6.690, 6.540, 7.000, 6.850],            # x5 duration, 100 days, min
])
F1_X = F1_T.T
F1_W = {"Wa": [0.5300, 0.1175, 0.1175, 0.1175, 0.1175], "Wb": [0.075, 0.700, 0.075, 0.075, 0.075]}
F1_R_printed = np.array([
    [0.2222, 0.1481, 0.2000, 0.1333, 0.1778, 0.1185],
    [0.1813, 0.1797, 0.1611, 0.1595, 0.1600, 0.1583],
    [0.1705, 0.1624, 0.1705, 0.1624, 0.1711, 0.1630],
    [0.1767, 0.1767, 0.1611, 0.1611, 0.1621, 0.1621],
    [0.1805, 0.1770, 0.1587, 0.1552, 0.1661, 0.1625],
]).T
F1_printed = {
    "Wa": dict(
        D=np.array([
            [0.1178, 0.0785, 0.1060, 0.0707, 0.0942, 0.0628],
            [0.0213, 0.0211, 0.0189, 0.0187, 0.0188, 0.0186],
            [0.0200, 0.0191, 0.0200, 0.0191, 0.0201, 0.0191],
            [0.0208, 0.0208, 0.0189, 0.0189, 0.0190, 0.0190],
            [0.0212, 0.0208, 0.0186, 0.0182, 0.0195, 0.0191],
        ]).T,
        Sp=[0.1178, 0.0785, 0.1060, 0.0707, 0.0942, 0.0628],
        Sm=[0.0833, 0.0818, 0.0766, 0.0750, 0.0775, 0.0759],
        Q=[0.2011, 0.1603, 0.1826, 0.1456, 0.1717, 0.1387],
        N=[100, 76.70, 90.78, 72.43, 85.37, 68.98],
        rank=[1, 4, 2, 5, 3, 6],
    ),
    "Wb": dict(
        D=np.array([
            [0.0167, 0.0111, 0.0150, 0.0100, 0.0133, 0.0088],
            [0.1269, 0.1258, 0.1128, 0.1116, 0.1120, 0.1108],
            [0.0128, 0.0122, 0.0128, 0.0122, 0.0128, 0.0122],
            [0.0132, 0.0132, 0.0121, 0.0121, 0.0122, 0.0122],
            [0.0135, 0.0133, 0.0119, 0.0116, 0.0124, 0.0122],
        ]).T,
        Sp=[0.0167, 0.0111, 0.0150, 0.0100, 0.0133, 0.0089],
        Sm=[0.1665, 0.1645, 0.1496, 0.1475, 0.1494, 0.1474],
        Q=[0.1832, 0.1756, 0.1646, 0.1575, 0.1628, 0.1563],
        N=[100, 95.85, 89.84, 86.00, 88.86, 85.32],
        rank=[1, 2, 3, 5, 4, 6],
    ),
}
r = copras(F1_X, F1_W["Wa"], F1_types)
cmp("normalized matrix (T1)", F1_R_printed, r["R"], 5e-5)
F1_results = {}
for k in ("Wa", "Wb"):
    print(f" weights {k} = {F1_W[k]} (sum {sum(F1_W[k]):.4f})")
    r = copras(F1_X, F1_W[k], F1_types)
    r2 = copras(F1_X, F1_W[k], F1_types, "simplified")
    F1_results[k] = r
    p = F1_printed[k]
    cmp("D (T2)", p["D"], r["D"], 5e-5)
    cmp("S+", p["Sp"], r["Sp"], 5e-5)
    cmp("S-", p["Sm"], r["Sm"], 5e-5)
    cmp("Q", p["Q"], r["Q"], 5e-5)
    cmp("N %", p["N"], r["N"], 5e-3)
    print(f"  rank printed {p['rank']}  ours {list(r['rank'])}  -> {'MATCH' if list(r['rank']) == p['rank'] else 'MISMATCH'}")
    print(f"  original vs simplified Q form: max|diff| = {np.max(np.abs(r['Q'] - r2['Q'])):.2e}")
    print(f"  sum Q = {r['Q'].sum():.6f} (= sum w)   S+ sum = {r['Sp'].sum():.4f}  S- sum = {r['Sm'].sum():.4f}")
    print("  ours Q:", r["Q"].round(6), " N:", r["N"].round(4))
    pr = copras(F1_X, F1_W[k], F1_types, "pymcdm")
    print(f"  pymcdm formula (Q = S+ + S-) ranks: {list(pr['rank'])}")

# ---------------------------------------------------------------- F2 (Podvezko 2011, Tables 7-8)
print("=" * 100)
print("F2  Podvezko 2011, Tables 7-8 (3 alternatives x 4 criteria)")
F2_types = ["benefit", "benefit", "cost", "cost"]
F2_w = [0.26, 0.23, 0.24, 0.27]
F2_variants = {
    "I as printed (A2-R4 = 215)": [[42, 19, 13, 105], [71, 18, 11, 215], [53, 20, 12, 149]],
    "I with A2-R4 = 220": [[42, 19, 13, 105], [71, 18, 11, 220], [53, 20, 12, 149]],
    "II as printed": [[42, 19, 13, 110], [71, 18, 11, 200], [53, 20, 12, 149]],
}
F2_printed = {
    "I": dict(Sp=[0.142, 0.184, 0.164], Sm=[0.147, 0.199, 0.165], Q=[0.332, 0.334, 0.335], rank=[1, 3, 2]),
    "II": dict(Sp=[0.142, 0.184, 0.164], Sm=[0.151, 0.191, 0.168], Q=[0.332, 0.334, 0.335], rank=[3, 2, 1]),
}
for name, X in F2_variants.items():
    p = F2_printed["II" if name.startswith("II") else "I"]
    r = copras(X, F2_w, F2_types)
    print(f" Variant {name}: S+ {r['Sp'].round(4)}  S- {r['Sm'].round(4)}  Q {r['Q'].round(4)}  N {r['N'].round(2)}  rank {list(r['rank'])}")
    cmp("S+", p["Sp"], r["Sp"], 5e-4)
    cmp("S-", p["Sm"], r["Sm"], 5e-4)
    cmp("Q (printed Z)", p["Q"], r["Q"], 5e-4)
    print(f"  rank printed {p['rank']} ours {list(r['rank'])} -> {'MATCH' if list(r['rank']) == p['rank'] else 'MISMATCH'}")

# ---------------------------------------------------------------- F3 (Podvezko Table 9, Q step only)
print("=" * 100)
print("F3  Podvezko 2011 Table 9 (S+, S- printed; Q recomputed from them)")
Sp9 = np.array([0.1374, 0.1292, 0.1109, 0.1116, 0.0496])
Sm9 = np.array([0.1405, 0.0898, 0.0855, 0.0983, 0.0470])
Z9 = np.array([0.1908, 0.2129, 0.1988, 0.1880, 0.2093])
Q9 = Sp9 + Sm9.min() * Sm9.sum() / (Sm9 * (Sm9.min() / Sm9).sum())
cmp("Z (from printed S+, S-)", Z9, Q9, 5e-4)
print("  ours:", Q9.round(4), " sum", Q9.sum().round(4), "(printed 0.9998)  rank", list(competition_rank(Q9)))

# ---------------------------------------------------------------- F4 (EDAS paper, ranks)
print("=" * 100)
print("F4  Keshavarz Ghorabaee et al. 2015, Tables 5-7, COPRAS ranks, 7 weight sets")
F4_types = ["benefit"] * 3 + ["cost"] * 4
F4_X = [
    [23, 264, 2.37, 0.05, 167, 8900, 8.71], [20, 220, 2.2, 0.04, 171, 9100, 8.23],
    [17, 231, 1.98, 0.15, 192, 10800, 9.91], [12, 210, 1.73, 0.2, 195, 12300, 10.21],
    [15, 243, 2, 0.14, 187, 12600, 9.34], [14, 222, 1.89, 0.13, 180, 13200, 9.22],
    [21, 262, 2.43, 0.06, 160, 10300, 8.93], [20, 256, 2.6, 0.07, 163, 11400, 8.44],
    [19, 266, 2.1, 0.06, 157, 11200, 9.04], [8, 218, 1.94, 0.11, 190, 13400, 10.11],
]
F4_W = [
    [0.250, 0.214, 0.179, 0.143, 0.107, 0.071, 0.036], [0.182, 0.212, 0.182, 0.152, 0.121, 0.091, 0.061],
    [0.139, 0.167, 0.194, 0.167, 0.139, 0.111, 0.083], [0.108, 0.135, 0.162, 0.189, 0.162, 0.135, 0.108],
    [0.083, 0.111, 0.139, 0.167, 0.194, 0.167, 0.139], [0.061, 0.091, 0.121, 0.152, 0.182, 0.212, 0.182],
    [0.036, 0.071, 0.107, 0.143, 0.179, 0.214, 0.250],
]
F4_ranks = [[1, 3, 6, 10, 7, 8, 2, 4, 5, 9], [1, 3, 6, 10, 7, 8, 2, 4, 5, 9], [1, 2, 6, 10, 7, 8, 3, 4, 5, 9],
            [1, 2, 7, 10, 6, 8, 3, 4, 5, 9], [1, 2, 7, 10, 6, 8, 3, 4, 5, 9], [1, 2, 6, 10, 7, 8, 3, 4, 5, 9],
            [2, 1, 7, 10, 6, 8, 3, 4, 5, 9]]
ok = 0
for s, (w, pr) in enumerate(zip(F4_W, F4_ranks), 1):
    r = copras(F4_X, w, F4_types)
    rp = copras(F4_X, w, F4_types, "pymcdm")
    m = list(r["rank"]) == pr
    ok += m
    gaps = np.sort(r["Q"])[::-1]
    print(f"  set {s}: sum w {sum(w):.3f}  ours {list(r['rank'])} {'MATCH' if m else 'MISMATCH'}  "
          f"min gap {np.min(-np.diff(gaps)):.5f}  pymcdm-formula match: {list(rp['rank']) == pr}")
    if s == 1:
        print("   set-1 Q:", r["Q"].round(6))
print(f"  {ok}/7 sets match")


# ---------------------------------------------------------------- F5 (Aytac Adali & Tus Isik 2016)
print("=" * 100)
print("F5  Aytac Adali & Tus Isik 2016, Manas J. Social Studies 5(2), Tables 1-4 (6 x 8, AHP weights)")
F5_types = ["benefit"] * 3 + ["cost"] * 5
F5_X = [[4.60, 5.00, 1, 2750, 38, 45, 800, 760], [3.30, 3.71, 1, 2267, 39, 65, 880, 900],
        [3.61, 3.84, 1, 1584, 38, 50, 990, 970], [3.37, 3.62, 1, 1650, 35, 53, 1010, 1050],
        [4.09, 4.40, 0, 2650, 40, 55, 870, 860], [3.24, 3.88, 0, 3340, 57, 52, 1080, 1030]]
F5_w_printed = [0.2817, 0.1387, 0.0413, 0.0413, 0.0215, 0.0215, 0.0215, 0.2817]   # sums to 0.8492
F5_w_used = [0.2817, 0.1387, 0.0413, 0.0749, 0.0215, 0.0215, 0.1387, 0.2817]      # C4, C7 read back from Table 3 / Table 2; C4 = 0.0749 makes the sum 1
F5_D_printed = np.array([
    [0.0583, 0.0284, 0.0103, 0.0144, 0.0033, 0.0030, 0.0197, 0.0384],
    [0.0419, 0.0210, 0.0103, 0.0119, 0.0034, 0.0044, 0.0217, 0.0455],
    [0.0458, 0.0218, 0.0103, 0.0083, 0.0033, 0.0034, 0.0244, 0.0491],
    [0.0427, 0.0205, 0.0103, 0.0087, 0.0030, 0.0036, 0.0249, 0.0531]])
F5_Q = [0.1982, 0.1652, 0.1682, 0.1592, 0.1697, 0.1394]
F5_U = [100.0, 83.3211, 84.8544, 80.3317, 85.5961, 70.3159]
F5_rank = [1, 4, 3, 5, 2, 6]
D = np.asarray(F5_D_printed); Rn = np.asarray(F5_X, float) / np.asarray(F5_X, float).sum(axis=0)
print("  weights read back from Table 3 / Table 2 (rows A1-A4):", (D / Rn[:4]).mean(axis=0).round(4))
for lab, w in (("printed w (sum %.4f)" % sum(F5_w_printed), F5_w_printed), ("used w (sum %.4f)" % sum(F5_w_used), F5_w_used)):
    r = copras(F5_X, w, F5_types)
    print(f" {lab}: Q {r['Q'].round(4)} N {r['N'].round(4)} rank {list(r['rank'])}")
    cmp("D rows A1-A4", F5_D_printed, r["D"][:4], 1e-4)
    cmp("Q", F5_Q, r["Q"], 1e-4)
    cmp("U %", F5_U, r["N"], 1e-2)
    print(f"  rank printed {F5_rank} -> {'MATCH' if list(r['rank']) == F5_rank else 'MISMATCH'}")


# ---------------------------------------------------------------- F6 (Ozcan & Celik 2021, Entropy -> COPRAS)
print("=" * 100)
print("F6  Ozcan & Celik 2021, Int. J. Prod. Manag. Eng. 9(2):81-92, DOI 10.4995/ijpme.2021.14734, Tables 1, 2, 10, 11")
F6_types = ["benefit"] * 3 + ["cost"] * 4
F6_X = np.array([[10, 3.5, 7.7, 15, 1.3, 39, 2], [20, 6, 6.8, 20, 1.6, 65, 1], [15, 9, 5.05, 30, 1.6, 60, 2],
                 [18, 15, 6.2, 18.5, 1.3, 68, 1], [10, 15, 5.7, 18.5, 1.5, 87, 2], [20, 18, 6.2, 18.5, 1.8, 120, 1],
                 [12.5, 15, 5.1, 15, 1.1, 42, 2]], float)
F6_w = [0.1186, 0.3442, 0.0323, 0.086, 0.0368, 0.2148, 0.1672]          # Table 2 (Entropy), sum 0.9999
F6_D = np.array([
    [0.0112, 0.0148, 0.0058, 0.0095, 0.0047, 0.0174, 0.0304], [0.0225, 0.0253, 0.0051, 0.0127, 0.0058, 0.0290, 0.0152],
    [0.0169, 0.0380, 0.0038, 0.0190, 0.0058, 0.0268, 0.0304], [0.0202, 0.0633, 0.0047, 0.0117, 0.0047, 0.0304, 0.0152],
    [0.0112, 0.0633, 0.0043, 0.0117, 0.0054, 0.0389, 0.0304], [0.0225, 0.0760, 0.0047, 0.0117, 0.0065, 0.0536, 0.0152],
    [0.0141, 0.0633, 0.0039, 0.0095, 0.0040, 0.0188, 0.0304]])
F6_Q = [0.1137, 0.1340, 0.1206, 0.1702, 0.1377, 0.1615, 0.1623]
F6_rank_printed = [7, 6, 5, 1, 4, 3, 2]
P = F6_X / F6_X.sum(axis=0)
E = -(P * np.log(P)).sum(axis=0) / np.log(len(F6_X))
ew = (1 - E) / (1 - E).sum()
print("  Entropy weights recomputed:", ew.round(4))
cmp("Entropy w (Table 2)", F6_w, ew, 5e-5)
for lab, w in (("printed w", F6_w), ("recomputed Entropy w", ew)):
    r = copras(F6_X, w, F6_types)
    print(f" {lab}: S+ {r['Sp'].round(4)} S- {r['Sm'].round(4)}")
    print(f"   Q {r['Q'].round(6)} N {r['N'].round(4)} rank {list(r['rank'])}")
    cmp("D (Table 10)", F6_D, r["D"], 5e-5)
    cmp("Q (Table 11)", F6_Q, r["Q"], 1e-4)
    print(f"  rank printed {F6_rank_printed} ours {list(r['rank'])} -> "
          f"{'MATCH' if list(r['rank']) == F6_rank_printed else 'MISMATCH'}")
print(f"  ranks implied by the PRINTED Q: {list(competition_rank(F6_Q))} (printed rank row swaps A2 and A3)")

# ---------------------------------------------------------------- pyDecision (divergence only)
print("=" * 100)
PYD = "/tmp/claude-1000/-home-zuko-obsidianvault-Mybrain/833620e3-e803-409c-aaeb-abb8496558c1/scratchpad/mcdm/dl/pyd/x/pyDecision/algorithm/copras.py"
try:
    sys.modules.setdefault('matplotlib', type(sys)('matplotlib')); sys.modules['matplotlib'].pyplot = type(sys)('pyplot'); sys.modules['matplotlib.pyplot'] = sys.modules['matplotlib'].pyplot
    spec = importlib.util.spec_from_file_location("pyd_copras", PYD)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    for k in ("Wa", "Wb"):
        tt = ["max" if t == "benefit" else "min" for t in F1_types]
        flow = mod.copras_method(F1_X, np.array(F1_W[k]), tt, graph=False, verbose=False)
        u = flow[:, 1]
        print(f"pyDecision 5.1.1 F1 {k}: returns Q/Qmax = {u.round(6)}; ours N/100 diff = "
              f"{np.max(np.abs(u - F1_results[k]['N'] / 100)):.2e}")
    flow = mod.copras_method(np.array(F2_variants["II as printed"]), np.array(F2_w), ["max", "max", "min", "min"],
                             graph=False, verbose=False)
    print(f"pyDecision F2-II: {flow[:, 1].round(6)}")
    # all-benefit case
    flow = mod.copras_method(np.array(F2_variants["II as printed"]), np.array(F2_w), ["max"] * 4, graph=False, verbose=False)
    ours = copras(F2_variants["II as printed"], F2_w, ["benefit"] * 4)
    print(f"pyDecision all-benefit: {flow[:, 1].round(6)} ours N/100 {(ours['N'] / 100).round(6)}")
except Exception as e:  # pragma: no cover
    print("pyDecision not loadable:", e)

# ---------------------------------------------------------------- edge cases
print("=" * 100)
print("Edge cases")
# 1. constant cost column added: does it change the ranking?
base = np.array(F1_X)
# Smallest integer example found: a constant cost column (weights of the others scaled by 0.5) reorders all three
Xa = np.array([[1.0, 1.0], [4.0, 6.0], [6.0, 4.0]])
ra = copras(Xa, [0.5, 0.5], ["benefit", "cost"])
rb = copras(np.c_[Xa, [1.0, 1.0, 1.0]], [0.25, 0.25, 0.5], ["benefit", "cost", "cost"])
print(f"  constant cost column: before Q {ra['Q'].round(4)} rank {list(ra['rank'])}; after Q {rb['Q'].round(4)} rank {list(rb['rank'])}")
# with m = 2 a constant cost column never changes the order: Z-_j = S-_other, the constant is added to both Q
# Hand-made 2-alternative case where a constant cost column flips the order
Xa = np.array([[10.0, 1.0], [8.0, 2.0]])                 # c1 benefit, c2 cost
ra = copras(Xa, [0.5, 0.5], ["benefit", "cost"])
Xb = np.c_[Xa, [5.0, 5.0]]
rb = copras(Xb, [0.25, 0.25, 0.5], ["benefit", "cost", "cost"])
rc = copras(np.c_[Xa, [5.0, 5.0]], [0.25, 0.25, 0.5], ["benefit", "cost", "benefit"])
print(f"  toy: Q {ra['Q'].round(4)} rank {list(ra['rank'])}; + constant cost col (w .5, others halved): "
      f"Q {rb['Q'].round(4)} rank {list(rb['rank'])}; as benefit: rank {list(rc['rank'])}")
# Search a small flip example: constant cost column changes ranking
rng = np.random.default_rng(1)
flips = 0
trials = 2000
for _ in range(trials):
    X = rng.uniform(1, 10, size=(4, 3))
    w = rng.dirichlet(np.ones(3))
    t = ["benefit", "cost", "cost"]
    r0 = copras(X, w, t)
    X1 = np.c_[X, np.full(4, 3.0)]
    w1 = np.r_[w * 0.7, 0.3]
    r1 = copras(X1, w1, t + ["cost"])
    flips += list(r0["rank"]) != list(r1["rank"])
print(f"  random 4x3 (1 benefit, 2 cost): adding a constant cost column (w .3, rest scaled .7) changed the ranking in "
      f"{flips}/{trials}")
flips = 0
for _ in range(trials):
    X = rng.uniform(1, 10, size=(4, 3))
    w = rng.dirichlet(np.ones(3))
    t = ["benefit", "cost", "cost"]
    r0 = copras(X, w, t)
    X1 = np.c_[X, np.full(4, 3.0)]
    w1 = np.r_[w * 0.7, 0.3]
    r1 = copras(X1, w1, t + ["benefit"])
    flips += list(r0["rank"]) != list(r1["rank"])
print(f"  same with a constant BENEFIT column: changed in {flips}/{trials} (expected 0: adds w/m to every S+)")
# Cost zero weights -> S- = 0 for all
r = copras(F1_X, [1.0, 0, 0, 0, 0], F1_types)
print(f"  all cost weights 0 -> Q = S+: {r['Q'].round(4)}")
# Single cost criterion: Z- proportional to 1/x
X = np.array([[5.0, 2.0], [5.0, 4.0], [5.0, 8.0]])
r = copras(X, [0.5, 0.5], ["benefit", "cost"])
print(f"  single cost criterion values 2,4,8: Q = {r['Q'].round(4)} (Z- ratio 4:2:1 -> reciprocal)")
# A near-zero cost value dominates: A1 is far worse on the benefit criterion but has cost 0.01
X = np.array([[5.0, 0.01], [9.0, 4.0], [9.0, 5.0]])
r = copras(X, [0.5, 0.5], ["benefit", "cost"])
print(f"  near-zero cost cell (benefit 5 vs 9, cost 0.01 vs 4-5, equal weights): Q = {r['Q'].round(4)} rank {list(r['rank'])}")
# Scale invariance
r1 = copras(F1_X * np.array([1, 1000, 1, 1, 1]), F1_W["Wa"], F1_types)
print(f"  unit change on x2 (x1000): max|dQ| = {np.max(np.abs(r1['Q'] - F1_results['Wa']['Q'])):.1e}")
# Shift sensitivity
r1 = copras(F1_X + np.array([0, 0, 0, 0, 10]), F1_W["Wa"], F1_types)
print(f"  shift x5 by +10 (1000 days): ranks {list(r1['rank'])} vs {list(F1_results['Wa']['rank'])}")
# Rank reversal when an alternative is removed (F1 Wa: drop a6)
r1 = copras(F1_X[:5], F1_W["Wa"], F1_types)
print(f"  F1 Wa without a6: ranks {list(r1['rank'])} (with a6: {list(F1_results['Wa']['rank'][:5])})")
rr = 0
for _ in range(trials):
    X = rng.uniform(1, 10, size=(5, 4))
    w = rng.dirichlet(np.ones(4))
    t = ["benefit", "benefit", "cost", "cost"]
    r0 = copras(X, w, t)
    r1 = copras(X[:4], w, t)
    o0 = np.argsort(-r0["Q"][:4])
    o1 = np.argsort(-r1["Q"])
    rr += list(o0) != list(o1)
print(f"  random 5x4: removing alternative 5 reorders the other four in {rr}/{trials}")
