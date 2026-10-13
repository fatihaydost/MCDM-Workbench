# Independent skeptic #2 recomputation for WASPAS card (written from the PDFs, not from waspas.py)
import numpy as np
np.set_printoptions(precision=4, suppress=True, linewidth=160)
L = np.round(np.arange(0, 1.0001, 0.1), 1)

def norm(X, ben):
    X = np.asarray(X, float); N = np.empty_like(X)
    for j in range(X.shape[1]):
        N[:, j] = X[:, j] / X[:, j].max() if ben[j] else X[:, j].min() / X[:, j]
    return N

def wsm_wpm(N, w):
    w = np.asarray(w, float)
    return N @ w, np.prod(N ** w, axis=1)

def ranks(q):  # competition ranking desc
    return [1 + int(np.sum(q > v + 1e-12 * abs(v))) for v in q]

def grid(q1, q2):
    return np.array([[l * a + (1 - l) * b for l in L] for a, b in zip(q1, q2)])

print("=== A: Aytac Adali & Tus Isik 2017 ===")
X = [[3, 12.5, 2, 120, 14, 3], [5, 15, 3, 110, 38, 4], [3, 13, 2, 120, 19, 3],
     [4, 14, 2, 100, 31, 4], [3, 15, 1.5, 125, 40, 4]]
ben = [1, 0, 0, 1, 0, 1]
w = [0.221, 0.159, 0.175, 0.127, 0.117, 0.201]
print("sum w", sum(w))
T6 = np.array([[.600, 1.000, .750, .960, 1.000, .750], [1.000, .833, .500, .880, .368, 1.000],
               [.600, .962, .750, .960, .737, .750], [.800, .893, .750, .800, .452, 1.000],
               [.600, .833, 1.000, 1.000, .350, 1.000]])
T7 = np.array([[.7975, .7990, .8005, .8020, .8035, .8050, .8065, .8080, .8095, .8110, .8125],
               [.7533, .7576, .7620, .7663, .7707, .7751, .7794, .7838, .7881, .7925, .7969],
               [.7647, .7658, .7669, .7680, .7691, .7702, .7713, .7724, .7734, .7745, .7756],
               [.7874, .7892, .7910, .7928, .7946, .7964, .7982, .8000, .8018, .8036, .8055],
               [.7674, .7716, .7758, .7799, .7841, .7882, .7924, .7966, .8007, .8049, .8091]])
N = norm(X, ben); q1, q2 = wsm_wpm(N, w); G = grid(q1, q2)
print("T6 maxdiff", np.abs(N - T6).max()); print("Q1", q1); print("Q2", q2)
print("T7 maxdiff", np.abs(G - T7).max())
for k, l in enumerate(L): print(l, ranks(G[:, k]), ranks(T7[:, k]))
# also: does using printed 3dp Table6 change anything
q1b, q2b = wsm_wpm(T6, w); print("from printed T6: T7 maxdiff", np.abs(grid(q1b, q2b) - T7).max())
# SWARA
s = [None, .100, .150, .100, .250, .083]; k = [1] + [1 + x for x in s[1:]]
ww = [1.0]
for kk in k[1:]: ww.append(ww[-1] / kk)
print("SWARA q (C1,C6,C3,C2,C4,C5)", np.array(ww) / sum(ww), "sum wj", sum(ww))
# pyDecision-style 1+minmax
Xa = np.array(X, float); P = np.empty_like(Xa)
for j in range(6):
    mn, mx = Xa[:, j].min(), Xa[:, j].max()
    P[:, j] = 1 + ((Xa[:, j] - mn) if ben[j] else (mx - Xa[:, j])) / (mx - mn)
a, b = wsm_wpm(P, w); print("1+minmax lam.5", 0.5 * a + 0.5 * b)

print("\n=== B: Chakraborty & Zavadskas 2014 robot ===")
X = [[60, .40, 2540, 500, 990], [6.35, .15, 1016, 3000, 1041], [6.8, .10, 1727.2, 1500, 1676],
     [10, .20, 1000, 2000, 965], [2.5, .10, 560, 500, 915], [4.5, .08, 1016, 350, 508], [3, .10, 1778, 1000, 920]]
ben = [1, 0, 1, 1, 1]; w = [.036, .192, .326, .326, .120]
T14 = np.array([[1, .2, 1, .1667, .5907, .5256, .3843, .4550], [.1058, .5333, .4, 1, .6211, .6371, .5727, .6049],
                [.1133, .8, .68, .5, 1, .6624, .6232, .6428], [.1667, .4, .3937, .6667, .5758, .4976, .4758, .4867],
                [.0417, .8, .2205, .1667, .5459, .3468, .2706, .3087], [.0750, 1, .4, .1167, .3031, .3995, .2907, .3451],
                [.0500, .8, .7, .3333, .5489, .5581, .4980, .5281]])
T15 = np.array([[.3843, .3984, .4126, .4267, .4408, .4550, .4691, .4832, .4973, .5115, .5256],
                [.5727, .5791, .5856, .5920, .5985, .6049, .6114, .6178, .6242, .6307, .6371],
                [.6232, .6271, .6310, .6349, .6388, .6428, .6469, .6506, .6545, .6584, .6624],
                [.4758, .4780, .4802, .4823, .4845, .4867, .4889, .4910, .4932, .4954, .4976],
                [.2706, .2783, .2859, .2935, .3011, .3087, .3163, .3240, .3316, .3392, .3468],
                [.2907, .3015, .3124, .3233, .3342, .3451, .3560, .3668, .3778, .3886, .3995],
                [.4980, .5040, .5100, .5161, .5221, .5281, .5341, .5401, .5461, .5521, .5581]])
N = norm(X, ben); q1, q2 = wsm_wpm(N, w); G = grid(q1, q2)
print("T14 norm maxdiff", np.abs(N - T14[:, :5]).max())
print("Q1", q1, np.abs(q1 - T14[:, 5]).max()); print("Q2", q2, np.abs(q2 - T14[:, 6]).max())
D = np.abs(G - T15); print("T15 maxdiff", D.max(), np.unravel_index(D.argmax(), D.shape), G[2, 6])
for k, l in enumerate(L): print(l, ranks(G[:, k]))

print("\n=== C: Zavadskas et al. 2012 ===")
w = np.array([.0627, .0508, .1114, .0874, .0625, .1183, .0784, .0984, .0530, .1417, .0798, .0557]); print("sum w", w.sum())
Np = np.array([[.8486, .6364, .7982, .6707, 1.0000, .8534, .6622, .8618, .1432, .1585, 1.0000, .4531],
               [1.0000, 1.0000, 1.0000, .7976, .7000, .9005, .9324, .6788, 1.0000, .6500, .7270, .7346],
               [.6542, .7000, .9169, .8951, .6000, .9791, .6216, .9479, .1340, .1585, .9795, .6728],
               [.3694, .4375, .9407, 1.0000, 1.0000, 1.0000, 1.0000, 1.0000, .5478, 1.0000, .3754, 1.0000]])
T2 = np.array([[.4912, .5033, .5154, .5274, .5395, .5516, .5637, .5758, .5878, .5999, .6120],
               [.8173, .8185, .8197, .8209, .8221, .8233, .8244, .8256, .8268, .8280, .8292],
               [.5873, .5983, .6093, .6203, .6313, .6423, .6532, .6642, .6752, .6862, .6972],
               [.8015, .8066, .8116, .8167, .8217, .8268, .8318, .8369, .8419, .8470, .8520]])
T3 = np.array([[.0075, .0068, .0064, .0062, .0062, .0066, .0071, .0079, .0088, .0098, .0108],
               [.0124, .0113, .0103, .0095, .0090, .0088, .0090, .0096, .0104, .0114, .0126],
               [.0089, .0081, .0075, .0072, .0071, .0073, .0078, .0085, .0094, .0104, .0116],
               [.0122, .0111, .0102, .0095, .0092, .0093, .0097, .0105, .0115, .0127, .0140]])
for name, M in [("printed", Np), ("a1x5=0.1", np.where(np.arange(48).reshape(4, 12) == 4, .1, Np))]:
    q1, q2 = wsm_wpm(M, w); G = grid(q1, q2)
    print(name, "Q1", q1, "Q2", q2, "T2 maxdiff per row", np.abs(G - T2).max(axis=1))
    s2x = (0.05 * M) ** 2
    v1 = (w ** 2 * s2x).sum(1); v2 = ((q2[:, None] * w / M) ** 2 * s2x).sum(1)
    S = np.sqrt(np.array([[l * l * a + (1 - l) ** 2 * b for l in L] for a, b in zip(v1, v2)]))
    print("  T3 maxdiff per row", np.abs(S - T3).max(axis=1))
    lo = v2 / (v1 + v2); print("  lambda_opt", lo, "Q at opt", lo * q1 + (1 - lo) * q2,
                               "Q at printed", np.array([.32, .49, .37, .43]) * q1 + (1 - np.array([.32, .49, .37, .43])) * q2)
# ranking per lambda from the PRINTED Table 2
print("Table 2 ranks per lambda (printed values):")
for k, l in enumerate(L): print(l, ranks(T2[:, k]))
# brute force single-cell misprint search on a1
best = []
for j in range(12):
    for f in (0.1, 0.01, 10, 0.5):
        M = Np.copy(); M[0, j] = Np[0, j] * f
        if M[0, j] > 1: continue
        q1, q2 = wsm_wpm(M, w); best.append((np.abs(grid(q1, q2)[0] - T2[0]).max(), j, f))
print("a1 single-cell search top3", sorted(best)[:3])

print("\n=== AM-GM invariant on random problems ===")
rng = np.random.default_rng(7); bad = 0
for _ in range(5000):
    m, n = rng.integers(2, 9), rng.integers(2, 12)
    M = rng.uniform(0.01, 1, (m, n)); ww = rng.dirichlet(np.ones(n))
    a, b = wsm_wpm(M, ww); bad += np.sum(b > a + 1e-15)
print("violations", bad)
print("cutting fluid printed Q2>Q1:", [(0.8995, 0.8417), (0.9172, 0.8444), (0.9037, 0.9027)])
X = [[0.035, 34.5, 847, 1.76, .335, .5, .59, .59], [.027, 36.8, 834, 1.68, .335, .665, .665, .665],
     [.037, 38.6, 808, 2.40, .59, .59, .41, .5], [.028, 32.6, 821, 1.59, .5, .59, .59, .41]]
ben = [0, 0, 0, 0, 1, 0, 0, 1]; w = [.3306, .0718, .1808, .0718, .0459, .1260, .1260, .0472]
N = norm(X, ben); q1, q2 = wsm_wpm(N, w); print("CF norm", N); print("CF Q1", q1, "Q2", q2, "sumw", sum(w))
for k, l in enumerate(L): print(l, ranks(grid(q1, q2)[:, k]))
