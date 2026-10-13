"""Independent COPRAS recomputation (skeptic #2). Written from Zavadskas et al. 2007 Eq.1-6, not from copras.py."""
import numpy as np
np.set_printoptions(precision=6, suppress=True, linewidth=160)

def copras(X, w, cost, simplified=True):
    X = np.asarray(X, float); w = np.asarray(w, float); cost = np.asarray(cost, bool)
    D = w * X / X.sum(axis=0)
    sp = D[:, ~cost].sum(1); sm = D[:, cost].sum(1)
    if cost.sum() == 0 or w[cost].sum() == 0:
        Q = sp.copy()
    elif simplified:
        Q = sp + sm.sum() / (sm * (1 / sm).sum())
    else:
        smin = sm.min()
        Q = sp + smin * sm.sum() / (sm * (smin / sm).sum())
    N = 100 * Q / Q.max()
    return D, sp, sm, Q, N

def rank_desc(v):
    v = np.asarray(v); return np.array([1 + np.sum(v > x + 1e-12) for x in v])

print("=== F6 Ozcan & Celik 2021 ===")
X6 = [[10,3.5,7.7,15,1.3,39,2],[20,6,6.8,20,1.6,65,1],[15,9,5.05,30,1.6,60,2],[18,15,6.2,18.5,1.3,68,1],
      [10,15,5.7,18.5,1.5,87,2],[20,18,6.2,18.5,1.8,120,1],[12.5,15,5.1,15,1.1,42,2]]
w6 = np.array([0.1186,0.3442,0.0323,0.086,0.0368,0.2148,0.1672]); c6 = [0,0,0,1,1,1,1]
D10 = np.array([[0.0112,0.0148,0.0058,0.0095,0.0047,0.0174,0.0304],[0.0225,0.0253,0.0051,0.0127,0.0058,0.0290,0.0152],
 [0.0169,0.0380,0.0038,0.0190,0.0058,0.0268,0.0304],[0.0202,0.0633,0.0047,0.0117,0.0047,0.0304,0.0152],
 [0.0112,0.0633,0.0043,0.0117,0.0054,0.0389,0.0304],[0.0225,0.0760,0.0047,0.0117,0.0065,0.0536,0.0152],
 [0.0141,0.0633,0.0039,0.0095,0.0040,0.0188,0.0304]])
Q11 = np.array([0.1137,0.1340,0.1206,0.1702,0.1377,0.1615,0.1623])
print("sum w", w6.sum())
for lab, w in [("printed", w6), ("renorm", w6 / w6.sum())]:
    D, sp, sm, Q, N = copras(X6, w, c6)
    print(lab, "D maxdiff", np.abs(D - D10).max(), "Q", Q, "Qdiff", np.abs(Q - Q11).max())
    print("  S+", sp, "S-", sm, "N", N, "rank", rank_desc(Q), "sumQ", Q.sum())
# entropy weights
P = np.asarray(X6) / np.asarray(X6).sum(0); E = -(P * np.log(P)).sum(0) / np.log(7); we = (1 - E) / (1 - E).sum()
print("entropy w", we, "diff vs T2", np.abs(we - w6).max())
D, sp, sm, Q, N = copras(X6, we, c6); print("  Q(entropy)", Q, "diff", np.abs(Q - Q11).max(), rank_desc(Q))
# what does S+ + S- give?
D, sp, sm, Q, N = copras(X6, w6, c6); print("  S+ + S- (pymcdm form)", sp + sm, rank_desc(sp + sm))

print("\n=== F2 Podvezko 2011 Table 7/8 ===")
w2 = [0.26,0.23,0.24,0.27]; c2 = [0,0,1,1]
for lab, X in [("VarI 105/215", [[42,19,13,105],[71,18,11,215],[53,20,12,149]]),
               ("VarII 110/200", [[42,19,13,110],[71,18,11,200],[53,20,12,149]]),
               ("VarI 105/220", [[42,19,13,105],[71,18,11,220],[53,20,12,149]])]:
    D, sp, sm, Q, N = copras(X, w2, c2)
    print(lab, "S+", sp, "S-", sm, "Q", Q, "rank", rank_desc(Q), "N", N)

print("\n=== F1 Zavadskas 2007 ===")
X1 = [[30,12.487,6.261,10.880,7.610],[20,12.372,5.961,10.880,7.460],[27,11.096,6.262,9.920,6.690],
      [18,10.982,5.962,9.920,6.540],[24,11.017,6.283,9.980,7.000],[16,10.903,5.983,9.980,6.850]]
c1 = [0,1,1,1,1]
pub = {"Wa": dict(sp=[0.1178,0.0785,0.1060,0.0707,0.0942,0.0628], sm=[0.0833,0.0818,0.0766,0.0750,0.0775,0.0759],
                  Q=[0.2011,0.1603,0.1826,0.1456,0.1717,0.1387]),
       "Wb": dict(sp=[0.0167,0.0111,0.0150,0.0100,0.0133,0.0089], sm=[0.1665,0.1645,0.1496,0.1475,0.1494,0.1474],
                  Q=[0.1832,0.1756,0.1646,0.1575,0.1628,0.1563])}
for lab, w in [("Wa", [0.53,0.1175,0.1175,0.1175,0.1175]), ("Wb", [0.075,0.70,0.075,0.075,0.075])]:
    D, sp, sm, Q, N = copras(X1, w, c1)
    _, _, _, Qo, _ = copras(X1, w, c1, simplified=False)
    p = pub[lab]
    print(lab, "S+ diff", np.abs(sp - p["sp"]).max(), "S- diff", np.abs(sm - p["sm"]).max())
    print("  Eq5 Q", Q, "rank", rank_desc(Q), "N", N, "orig-vs-simpl", np.abs(Q - Qo).max())
    print("  printedQ - (S+ + S-)", np.abs(np.array(p["Q"]) - (sp + sm)).max(), "printedQ-Eq5", np.abs(np.array(p["Q"]) - Q).max())
    print("  rank(S+ + S-)", rank_desc(sp + sm))
    print("  normalized x", (np.asarray(X1) / np.asarray(X1).sum(0)).round(5)[:, 2])

print("\n=== F3 Podvezko Table 9 ===")
sp = np.array([0.1374,0.1292,0.1109,0.1116,0.0496]); sm = np.array([0.1405,0.0898,0.0855,0.0983,0.0470])
Z = sp + sm.sum() / (sm * (1 / sm).sum()); print(Z, np.abs(Z - [0.1908,0.2129,0.1988,0.1880,0.2093]).max(), "S+ + S-", sp + sm)

print("\n=== F5 Adali & Tus Isik 2016 ===")
X5 = [[4.60,5.00,1,2750,38,45,800,760],[3.30,3.71,1,2267,39,65,880,900],[3.61,3.84,1,1584,38,50,990,970],
      [3.37,3.62,1,1650,35,53,1010,1050],[4.09,4.40,0,2650,40,55,870,860],[3.24,3.88,0,3340,57,52,1080,1030]]
c5 = [0,0,0,1,1,1,1,1]
for lab, w in [("printed", [0.2817,0.1387,0.0413,0.0413,0.0215,0.0215,0.0215,0.2817]),
               ("reconstr", [0.2817,0.1387,0.0413,0.0749,0.0215,0.0215,0.1387,0.2817])]:
    D, sp, sm, Q, N = copras(X5, w, c5)
    print(lab, "sumw", sum(w), "Q", Q, "diff", np.abs(Q - [0.1982,0.1652,0.1682,0.1592,0.1697,0.1394]).max(), rank_desc(Q))
print("  which criteria are cost? card says 3 benefit, 5 cost")

print("\n=== Edge examples ===")
D, sp, sm, Q, N = copras([[5,0.01,4],[9,4,5],[9,4,5.0001]], [1/3]*3, [0,1,1]); print("near-zero (guess layout)", Q)
D, sp, sm, Q, N = copras([[1,1],[4,6],[6,4]], [0.5,0.5], [0,1]); print("const before", Q, rank_desc(Q))
D, sp, sm, Q, N = copras([[1,1,1],[4,6,1],[6,4,1]], [0.25,0.25,0.5], [0,1,1]); print("const after", Q, rank_desc(Q))
rng = np.random.default_rng(1)
cnt = 0; cntb = 0; cntm2 = 0
for _ in range(2000):
    X = rng.uniform(1, 10, (4, 3)); w = rng.dirichlet(np.ones(3))
    r0 = rank_desc(copras(X, w, [0,1,1])[3])
    r1 = rank_desc(copras(np.c_[X, np.ones(4)], np.r_[0.7 * w, 0.3], [0,1,1,1])[3]); cnt += (r0 != r1).any()
    r2 = rank_desc(copras(np.c_[X, np.ones(4)], np.r_[0.7 * w, 0.3], [0,1,1,0])[3]); cntb += (r0 != r2).any()
    X2 = X[:2]; a = copras(X2, w, [0,1,1]); b = copras(np.c_[X2, np.ones(2)], np.r_[0.7*w, 0.3], [0,1,1,1])
    cntm2 += (rank_desc(a[3]) != rank_desc(b[3])).any()
    assert np.allclose(a[3], a[1] + a[2][::-1])
print("const cost col changes rank", cnt, "/2000; const benefit", cntb, "; m=2 cost", cntm2)
# W_C = 0
print("Wc=0", copras([[1,2],[3,4]], [1,0], [0,1])[3])
# scale invariance and sumQ
X = rng.uniform(1, 10, (5, 4)); w = rng.dirichlet(np.ones(4)); Q = copras(X, w, [0,1,0,1])[3]
print("sumQ", Q.sum(), "scale", np.abs(copras(X * [1,100,3,0.01], w, [0,1,0,1])[3] - Q).max())

print("\n=== near-zero layouts ===")
for X in ([[5,0.01],[9,4],[9,5]], [[5,0.01,0.01],[9,4,4],[9,5,5]]):
    k = len(X[0]); print(X, copras(X, [1/k]*k, [0]+[1]*(k-1))[3])
