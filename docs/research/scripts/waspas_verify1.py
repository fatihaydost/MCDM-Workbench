# Independent skeptic #1 recomputation of WASPAS fixtures (written from the papers, not from waspas.py)
import numpy as np
np.set_printoptions(precision=4, suppress=True, linewidth=160)
LG = np.round(np.arange(11) * 0.1, 1)

def norm(X, types):
    X = np.asarray(X, float); N = np.empty_like(X)
    for j, t in enumerate(types):
        c = X[:, j]
        N[:, j] = c / c.max() if t == 'b' else c.min() / c
    return N

def wsm(N, w): return N @ w
def wpm(N, w): return np.prod(N ** w, axis=1)
def q(N, w, lam): return lam * wsm(N, w) + (1 - lam) * wpm(N, w)

def ranks(s):
    # competition ranking, descending
    return np.array([1 + np.sum(s > v + 1e-12) for v in s])

def sweep(N, w): return np.array([q(N, w, l) for l in LG]).T

print("=== A. Aytac Adali & Tus Isik 2017 ===")
XA = [[3, 12.5, 2, 120, 14, 3], [5, 15, 3, 110, 38, 4], [3, 13, 2, 120, 19, 3],
      [4, 14, 2, 100, 31, 4], [3, 15, 1.5, 125, 40, 4]]
tA = ['b', 'c', 'c', 'b', 'c', 'b']
wA = np.array([0.221, 0.159, 0.175, 0.127, 0.117, 0.201])
# SWARA from printed s_j, order C1,C6,C3,C2,C4,C5
s = [0, 0.100, 0.150, 0.100, 0.250, 0.083]
k = [1 + x for x in s]; ww = [1.0]
for kk in k[1:]: ww.append(ww[-1] / kk)
qq = np.array(ww) / sum(ww)
print("SWARA w (C1,C6,C3,C2,C4,C5):", qq, "sum ww", sum(ww))
wA_exact = np.array([qq[0], qq[3], qq[2], qq[4], qq[5], qq[1]])
T6 = np.array([[0.600, 1.000, 0.750, 0.960, 1.000, 0.750], [1.000, 0.833, 0.500, 0.880, 0.368, 1.000],
               [0.600, 0.962, 0.750, 0.960, 0.737, 0.750], [0.800, 0.893, 0.750, 0.800, 0.452, 1.000],
               [0.600, 0.833, 1.000, 1.000, 0.350, 1.000]])
T7 = np.array([[0.7975, 0.7990, 0.8005, 0.8020, 0.8035, 0.8050, 0.8065, 0.8080, 0.8095, 0.8110, 0.8125],
               [0.7533, 0.7576, 0.7620, 0.7663, 0.7707, 0.7751, 0.7794, 0.7838, 0.7881, 0.7925, 0.7969],
               [0.7647, 0.7658, 0.7669, 0.7680, 0.7691, 0.7702, 0.7713, 0.7724, 0.7734, 0.7745, 0.7756],
               [0.7874, 0.7892, 0.7910, 0.7928, 0.7946, 0.7964, 0.7982, 0.8000, 0.8018, 0.8036, 0.8055],
               [0.7674, 0.7716, 0.7758, 0.7799, 0.7841, 0.7882, 0.7924, 0.7966, 0.8007, 0.8049, 0.8091]])
NA = norm(XA, tA)
print("T6 max diff", np.abs(NA - T6).max())
for lab, w in [("printed w", wA), ("exact SWARA w", wA_exact)]:
    S = sweep(NA, w)
    print(lab, "WSM", wsm(NA, w), "WPM", wpm(NA, w), "T7 max diff", np.abs(S - T7).max())
S = sweep(NA, wA)
for i, l in enumerate(LG):
    print(l, "ours", ranks(S[:, i]), "printed-table", ranks(T7[:, i]))

print("=== B. Chakraborty & Zavadskas 2014 Ex 5 ===")
XB = [[60, 0.40, 2540, 500, 990], [6.35, 0.15, 1016, 3000, 1041], [6.8, 0.10, 1727.2, 1500, 1676],
      [10, 0.20, 1000, 2000, 965], [2.5, 0.10, 560, 500, 915], [4.5, 0.08, 1016, 350, 508],
      [3, 0.10, 1778, 1000, 920]]
tB = ['b', 'c', 'b', 'b', 'b']; wB = np.array([0.036, 0.192, 0.326, 0.326, 0.120])
T14 = np.array([[1, 0.2, 1, 0.1667, 0.5907, 0.5256, 0.3843, 0.4550],
                [0.1058, 0.5333, 0.4, 1, 0.6211, 0.6371, 0.5727, 0.6049],
                [0.1133, 0.8, 0.68, 0.5, 1, 0.6624, 0.6232, 0.6428],
                [0.1667, 0.4, 0.3937, 0.6667, 0.5758, 0.4976, 0.4758, 0.4867],
                [0.0417, 0.8, 0.2205, 0.1667, 0.5459, 0.3468, 0.2706, 0.3087],
                [0.0750, 1, 0.4, 0.1167, 0.3031, 0.3995, 0.2907, 0.3451],
                [0.0500, 0.8, 0.7, 0.3333, 0.5489, 0.5581, 0.4980, 0.5281]])
T15 = np.array([[0.3843, 0.3984, 0.4126, 0.4267, 0.4408, 0.4550, 0.4691, 0.4832, 0.4973, 0.5115, 0.5256],
                [0.5727, 0.5791, 0.5856, 0.5920, 0.5985, 0.6049, 0.6114, 0.6178, 0.6242, 0.6307, 0.6371],
                [0.6232, 0.6271, 0.6310, 0.6349, 0.6388, 0.6428, 0.6469, 0.6506, 0.6545, 0.6584, 0.6624],
                [0.4758, 0.4780, 0.4802, 0.4823, 0.4845, 0.4867, 0.4889, 0.4910, 0.4932, 0.4954, 0.4976],
                [0.2706, 0.2783, 0.2859, 0.2935, 0.3011, 0.3087, 0.3163, 0.3240, 0.3316, 0.3392, 0.3468],
                [0.2907, 0.3015, 0.3124, 0.3233, 0.3342, 0.3451, 0.3560, 0.3668, 0.3778, 0.3886, 0.3995],
                [0.4980, 0.5040, 0.5100, 0.5161, 0.5221, 0.5281, 0.5341, 0.5401, 0.5461, 0.5521, 0.5581]])
NB = norm(XB, tB)
print("T14 norm max diff", np.abs(NB - T14[:, :5]).max())
print("Q1", wsm(NB, wB), "d", np.abs(wsm(NB, wB) - T14[:, 5]).max())
print("Q2", wpm(NB, wB), "d", np.abs(wpm(NB, wB) - T14[:, 6]).max())
SB = sweep(NB, wB); D = np.abs(SB - T15)
print("T15 max diff", D.max(), "at", np.unravel_index(D.argmax(), D.shape), SB[np.unravel_index(D.argmax(), D.shape)])
print("T15 cells > 1e-4:", np.argwhere(D > 1e-4).tolist())
for i, l in enumerate(LG):
    print(l, ranks(SB[:, i]))

print("=== Ex 1 cutting fluid ===")
N1 = np.array([[0.7714, 0.9449, 0.9539, 0.9034, 0.5678, 1.0000, 0.6949, 0.8872],
               [1.0000, 0.8859, 0.9688, 0.9464, 0.5678, 0.7519, 0.6165, 1.0000],
               [0.7297, 0.8446, 1.0000, 0.6625, 1.0000, 0.8474, 1.0000, 0.7519],
               [0.9643, 1.0000, 0.9842, 1.0000, 0.8474, 0.8474, 0.6949, 0.6165]])
w1 = np.array([0.3306, 0.0718, 0.1808, 0.0718, 0.0459, 0.1260, 0.1260, 0.0472])
print("sum w", w1.sum(), "Q1", wsm(N1, w1), "Q2", wpm(N1, w1))
X1 = np.array([[0.035, 34.5, 847, 1.76, 0.335, 0.500, 0.590, 0.590], [0.027, 36.8, 834, 1.68, 0.335, 0.665, 0.665, 0.665],
               [0.037, 38.6, 808, 2.40, 0.590, 0.590, 0.410, 0.500], [0.028, 32.6, 821, 1.59, 0.500, 0.590, 0.590, 0.410]])
t1 = ['c', 'c', 'c', 'c', 'b', 'c', 'c', 'b']
print("norm from Table 1 max diff", np.abs(norm(X1, t1) - N1).max())

print("=== C. Zavadskas 2012 origin ===")
XC = np.array([[0.8486, 0.6364, 0.7982, 0.6707, 1.0000, 0.8534, 0.6622, 0.8618, 0.1432, 0.1585, 1.0000, 0.4531],
               [1.0000, 1.0000, 1.0000, 0.7976, 0.7000, 0.9005, 0.9324, 0.6788, 1.0000, 0.6500, 0.7270, 0.7346],
               [0.6542, 0.7000, 0.9169, 0.8951, 0.6000, 0.9791, 0.6216, 0.9479, 0.1340, 0.1585, 0.9795, 0.6728],
               [0.3694, 0.4375, 0.9407, 1.0000, 1.0000, 1.0000, 1.0000, 1.0000, 0.5478, 1.0000, 0.3754, 1.0000]])
wC = np.array([0.0627, 0.0508, 0.1114, 0.0874, 0.0625, 0.1183, 0.0784, 0.0984, 0.0530, 0.1417, 0.0798, 0.0557])
print("sum wC", wC.sum())
T2 = np.array([[0.4912, 0.5033, 0.5154, 0.5274, 0.5395, 0.5516, 0.5637, 0.5758, 0.5878, 0.5999, 0.6120],
               [0.8173, 0.8185, 0.8197, 0.8209, 0.8221, 0.8233, 0.8244, 0.8256, 0.8268, 0.8280, 0.8292],
               [0.5873, 0.5983, 0.6093, 0.6203, 0.6313, 0.6423, 0.6532, 0.6642, 0.6752, 0.6862, 0.6972],
               [0.8015, 0.8066, 0.8116, 0.8167, 0.8217, 0.8268, 0.8318, 0.8369, 0.8419, 0.8470, 0.8520]])
T3 = np.array([[0.0075, 0.0068, 0.0064, 0.0062, 0.0062, 0.0066, 0.0071, 0.0079, 0.0088, 0.0098, 0.0108],
               [0.0124, 0.0113, 0.0103, 0.0095, 0.0090, 0.0088, 0.0090, 0.0096, 0.0104, 0.0114, 0.0126],
               [0.0089, 0.0081, 0.0075, 0.0072, 0.0071, 0.0073, 0.0078, 0.0085, 0.0094, 0.0104, 0.0116],
               [0.0122, 0.0111, 0.0102, 0.0095, 0.0092, 0.0093, 0.0097, 0.0105, 0.0115, 0.0127, 0.0140]])
print("as printed: T2 max diff", np.abs(sweep(XC, wC) - T2).max())
best = []
for i in range(4):
    for j in range(12):
        for f in (0.1, 0.01, 10):
            Y = XC.copy(); Y[i, j] = Y[i, j] * f
            if Y[i, j] > 1: continue
            best.append((np.abs(sweep(Y, wC) - T2).max(), i, j, f))
best.sort(); print("best single-cell fixes", best[:3])
XCc = XC.copy(); XCc[0, 4] = 0.1
SC = sweep(XCc, wC)
print("corrected: WSM", wsm(XCc, wC), "WPM", wpm(XCc, wC), "T2 max diff", np.abs(SC - T2).max())
for i, l in enumerate(LG):
    print(l, "ours", ranks(SC[:, i]), "printed", ranks(T2[:, i]))
def sig(N, w, lam):
    s2x = (0.05 * N) ** 2
    Q2 = wpm(N, w)
    v1 = (w ** 2 * s2x).sum(1)
    v2 = (((Q2[:, None] * w / N)) ** 2 * s2x).sum(1)
    return np.sqrt(lam ** 2 * v1 + (1 - lam) ** 2 * v2), v1, v2
Sig = np.array([sig(XCc, wC, l)[0] for l in LG]).T
print("T3 max diff (corrected)", np.abs(Sig - T3).max())
_, v1, v2 = sig(XCc, wC, 0)
lopt = v2 / (v1 + v2); print("lambda_opt", lopt)
print("Q at printed lopt", [q(XCc, wC, l)[i] for i, l in enumerate([0.32, 0.49, 0.37, 0.43])])
print("Q at exact lopt", [q(XCc, wC, l)[i] for i, l in enumerate(lopt)])
Sigp = np.array([sig(XC, wC, l)[0] for l in LG]).T
print("T3 max diff (as printed)", np.abs(Sigp - T3).max())
wn = wC / wC.sum(); print("renormalized w T2 diff", np.abs(sweep(XCc, wn) - T2).max())
print("identity Q2(w)=Q2(w/t)^t:", np.abs(wpm(XCc, wC) - wpm(XCc, wn) ** wC.sum()).max())

print("=== invariants / edge cases ===")
rng = np.random.default_rng(1); viol = 0
for _ in range(5000):
    m, n = rng.integers(2, 8), rng.integers(1, 10)
    X = rng.uniform(0.01, 100, (m, n)); t = rng.choice(['b', 'c'], n)
    w = rng.dirichlet(np.ones(n)); N = norm(X, t)
    if np.any(wpm(N, w) > wsm(N, w) + 1e-12): viol += 1
print("AM-GM violations", viol)
# constant column
X = rng.uniform(1, 10, (5, 4)); X[:, 2] = 7; t = ['b', 'c', 'b', 'c']; w = np.array([.3, .2, .25, .25])
Xd = np.delete(X, 2, 1); wd = np.delete(w, 2)
for l in (0, 0.5, 1):
    print("const col λ", l, ranks(q(norm(X, t), w, l)), ranks(q(norm(Xd, t[:2] + t[3:]), wd, l)))
# small weight: sensitivity of WSM vs WPM to the low-weight criterion
N = np.array([[1.0, 0.2], [1.0, 0.9]]); w = np.array([0.99, 0.01])
print("small-w: WSM", wsm(N, w), "rel gap", np.diff(wsm(N, w)) / wsm(N, w)[1], "WPM", wpm(N, w), "rel gap", np.diff(wpm(N, w)) / wpm(N, w)[1])

print("=== extra ===")
_, a, b = sig(XC, wC, 0); print("lambda_opt with misprinted a1 row", (b / (a + b)))
def pyd_like(X, t):
    X = np.asarray(X, float); N = np.empty_like(X)
    for j, tt in enumerate(t):
        c = X[:, j]; r = c.max() - c.min()
        N[:, j] = 1 + ((c - c.min()) / r if tt == 'b' else (c.max() - c) / r)
    return N
P = pyd_like(XA, tA); print("1+minmax A lam .5", q(P, wA, 0.5))
