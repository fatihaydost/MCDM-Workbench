"""Independent BWM recomputation against published examples, plus solver, consistency and edge-case checks.

Models
  linear     Rezaei (2016) model (19): min xi s.t. |w_B - a_Bj w_j| <= xi, |w_j - a_jW w_W| <= xi, sum w = 1, w >= 0.
             (a) LP with scipy HiGHS (oracle), (b) closed form of Ratandhara & Kumar (2025/26, arXiv 2506.17666,
             Theorem 2, Eqs. 7-18) -- the candidate for the browser (no LP solver).
  nonlinear  Rezaei (2015) model (6): min xi s.t. |w_B/w_j - a_Bj| <= xi, |w_j/w_W - a_jW| <= xi. Solved exactly:
             for a fixed xi the constraints are linear in w, so bisection on xi with an LP feasibility test gives the
             global xi*; weight intervals (Rezaei 2016 Sec. 3) by min/max of each w_j over the optimal set.
Consistency
  CI (output-based, Rezaei 2015 Eq. 8 / Table 1), CR_O = xi*/CI(a_BW); CR_I (Liang, Brunelli & Rezaei 2020, Eqs. 6-7)
  with the Table 3 thresholds; ordinal ratio OR (Eqs. 9-11); linear-model CI (Ratandhara & Kumar Eq. 22, Table 1).
Fixtures
  F1 Rezaei 2016 Examples 1-3 (car, n = 5) = Rezaei's Excel solver 'Example' sheet = Liang 2020 Tables 1-2.
  F2 Rezaei 2015 Example 1 and Table 5 (transport mode, n = 3, non-linear, 64 cases).
  F3 Ratandhara & Kumar Examples 1-4 (closed form, linear).
  F4 Demir & Bircan 2020 (Turkish, private school, n = 9, linear, LINGO 17), Table 5-7.
  F5 Arsu & Uguz Arsu 2021 (Turkish, personnel selection, expert 1, n = 5..9), Tables 4-6.
Also: pyDecision 5.1.8 bw_method (divergence only; skipped when not importable), random agreement and edge cases.

Run: python3 -I -W ignore bwm.py   (needs numpy + scipy; the pyDecision section runs when pyDecision 5.1.8 is
     importable; bwm.out was made in a scratch venv with numpy 2.5.4, scipy 1.18.1, pyDecision 5.1.8)
"""
import io
import itertools
import time
import contextlib

import numpy as np
from scipy.optimize import linprog

np.set_printoptions(legacy='1.25', precision=4, suppress=True, linewidth=160)
RNG = np.random.default_rng(20261018)


def fmt(v, d=4):
    return '[' + ', '.join(f'{x:.{d}f}' for x in np.asarray(v, float)) + ']'


def mx(a, b):
    return float(np.max(np.abs(np.asarray(a, float) - np.asarray(b, float))))


def best_worst(bo, ow):
    """B = the criterion with a_BB = 1 that the vectors agree on; W likewise. Explicit indices are passed where ties exist."""
    return int(np.argmin(bo)), int(np.argmin(ow))


# ---------------------------------------------------------------- linear model
def linear_lp(bo, ow, B, W):
    """Rezaei 2016 model (19) as an LP: variables w_1..w_n, xi; minimise xi."""
    bo, ow = np.asarray(bo, float), np.asarray(ow, float)
    n = len(bo)
    A, b = [], []
    for j in range(n):
        r = np.zeros(n + 1); r[B] += 1; r[j] -= bo[j]; r[n] = -1          # w_B - a_Bj w_j - xi <= 0
        A.append(r.copy()); r[:n] *= -1; A.append(r)                       # -(...) - xi <= 0
        r = np.zeros(n + 1); r[j] += 1; r[W] -= ow[j]; r[n] = -1           # w_j - a_jW w_W - xi <= 0
        A.append(r.copy()); r[:n] *= -1; A.append(r)
    res = linprog(np.r_[np.zeros(n), 1.0], A_ub=np.array(A), b_ub=np.zeros(len(A)),
                  A_eq=np.r_[np.ones(n), 0.0][None, :], b_eq=[1.0], bounds=[(0, None)] * (n + 1), method='highs')
    assert res.status == 0, res.message
    return res.x[:n], float(res.x[n])


def linear_closed(bo, ow, B, W):
    """Ratandhara & Kumar, Theorem 2 (Eqs. 7, 11, 16-18). D = criteria other than B and W."""
    bo, ow = np.asarray(bo, float), np.asarray(ow, float)
    n = len(bo)
    abw = bo[W]
    D = [i for i in range(n) if i not in (B, W)]
    p = {i: bo[i] * ow[i] for i in D}                                       # a_Bi * a_iW, consistent iff = a_BW
    D1 = [i for i in D if p[i] < abw]
    D2 = [i for i in D if p[i] > abw]
    eps = {i: abs(p[i] - abw) / (bo[i] + 2) for i in D}                     # Eq. 7
    cand = [(eps[i], 'i', i, None) for i in D]
    cand += [(abs(p[i] - p[j]) / (bo[i] + bo[j] + 2), 'ij', i, j) for i in D1 for j in D2]   # Eq. 11
    eta, kind, i0, j0 = max(cand, key=lambda c: c[0]) if cand else (0.0, 'i', None, None)
    v = np.zeros(n)                                                         # v = w * sigma, w_W = 1 / sigma
    v[W] = 1.0
    if eta == 0:                                                            # fully consistent (or n = 2)
        v[B] = abw
        for i in D:
            v[i] = ow[i]
    elif kind == 'i' and i0 in D1:                                          # Eq. 16
        v[B] = abw - eta; v[i0] = ow[i0] + eta
        for i in D:
            if i != i0:
                v[i] = min(ow[i] + eta, abw / bo[i])
    elif kind == 'i':                                                       # i0 in D2, Eq. 17
        v[B] = abw + eta; v[i0] = ow[i0] - eta
        for i in D:
            if i != i0:
                v[i] = min(ow[i] + eta, (abw + 2 * eta) / bo[i])
    else:                                                                   # Eq. 18
        top = bo[i0] * ow[i0]
        v[B] = top + (bo[i0] + 1) * eta; v[i0] = ow[i0] + eta; v[j0] = ow[j0] - eta
        for i in D:
            if i not in (i0, j0):
                v[i] = min(ow[i] + eta, (top + (bo[i0] + 2) * eta) / bo[i])
    sigma = v.sum()
    return v / sigma, eta / sigma


def xi_of(w, bo, ow, B, W):
    """Max absolute deviation of the linear model for given w (the objective)."""
    w, bo, ow = (np.asarray(x, float) for x in (w, bo, ow))
    return float(max(np.max(np.abs(w[B] - bo * w)), np.max(np.abs(w - ow * w[W]))))


# ---------------------------------------------------------------- non-linear model
def _nl_rows(bo, ow, B, W, xi):
    """For fixed xi: |w_B - a_Bj w_j| <= xi w_j and |w_j - a_jW w_W| <= xi w_W (model (6) multiplied out)."""
    n = len(bo)
    A = []
    for j in range(n):
        if j == B:
            continue
        r = np.zeros(n); r[B] += 1; r[j] -= bo[j] + xi; A.append(r)        # w_B - (a + xi) w_j <= 0
        r = np.zeros(n); r[B] -= 1; r[j] += bo[j] - xi; A.append(r)        # (a - xi) w_j - w_B <= 0
    for j in range(n):
        if j == W:
            continue
        r = np.zeros(n); r[j] += 1; r[W] -= ow[j] + xi; A.append(r)
        r = np.zeros(n); r[j] -= 1; r[W] += ow[j] - xi; A.append(r)
    return np.array(A)


def _nl_lp(c, bo, ow, B, W, xi):
    n = len(bo)
    return linprog(c, A_ub=_nl_rows(bo, ow, B, W, xi), b_ub=np.zeros(2 * (2 * n - 2)),
                   A_eq=np.ones((1, n)), b_eq=[1.0], bounds=[(1e-12, None)] * n, method='highs')


def nonlinear(bo, ow, B, W, tol=1e-10):
    """Global xi* of Rezaei 2015 model (6) by bisection, and the weight interval of every criterion at xi*."""
    bo, ow = np.asarray(bo, float), np.asarray(ow, float)
    n = len(bo)
    lo, hi = 0.0, float(max(bo.max(), ow.max()))
    if _nl_lp(np.zeros(n), bo, ow, B, W, 0.0).status == 0:
        hi = 0.0
    while hi - lo > tol:
        mid = (lo + hi) / 2
        if _nl_lp(np.zeros(n), bo, ow, B, W, mid).status == 0:
            hi = mid
        else:
            lo = mid
    for slack in (1e-6, 1e-5, 1e-4):                                        # HiGHS tolerances: widen until feasible
        xi, iv = hi * (1 + slack) + slack, []
        for j in range(n):
            e = np.zeros(n); e[j] = 1
            lo_r, hi_r = _nl_lp(e, bo, ow, B, W, xi), _nl_lp(-e, bo, ow, B, W, xi)
            if lo_r.status != 0 or hi_r.status != 0:
                break
            iv.append((lo_r.fun, -hi_r.fun))
        if len(iv) == n:
            break
    assert len(iv) == n, 'interval LPs failed'
    return hi, np.array(iv)


# ---------------------------------------------------------------- consistency
def ci_nonlinear(abw):
    """Rezaei 2015 Eq. 8: xi^2 - (1 + 2a) xi + (a^2 - a) = 0, smaller root."""
    a = float(abw)
    return ((1 + 2 * a) - np.sqrt((1 + 2 * a) ** 2 - 4 * (a * a - a))) / 2


def ci_linear(abw, n):
    """Ratandhara & Kumar Eq. 22 (entries on 1..a_BW)."""
    a = float(abw)
    if n == 3:
        return a * (a - 1) / (2 * a * a + 5 * a + 2)
    return max(a * (a - 1) / (2 * a * a + (3 * n - 4) * a + 2),
               (a * a - 1) / (3 * a * a + 6 * a + 7 + (n - 4) * min(a * a + a + 2, 1 + 3 * a)))


def cr_input(bo, ow, B, W):
    """Liang et al. 2020 Eqs. 6-7: local CR_I_j and global max."""
    bo, ow = np.asarray(bo, float), np.asarray(ow, float)
    abw = bo[W]
    loc = np.zeros(len(bo)) if abw == 1 else np.abs(bo * ow - abw) / (abw * abw - abw)
    return float(loc.max()), loc


# Liang et al. 2020 Table 3 (input-based) and Table 4 (output-based); rows scale 3..9, columns n = 3..9
CRI_T = np.array([[0.1667] * 7,
                  [0.1121, 0.1529, 0.1898, 0.2206, 0.2527, 0.2577, 0.2683],
                  [0.1354, 0.1994, 0.2306, 0.2546, 0.2716, 0.2844, 0.2960],
                  [0.1330, 0.1990, 0.2643, 0.3044, 0.3144, 0.3221, 0.3262],
                  [0.1294, 0.2457, 0.2819, 0.3029, 0.3144, 0.3251, 0.3403],
                  [0.1309, 0.2521, 0.2958, 0.3154, 0.3408, 0.3620, 0.3657],
                  [0.1359, 0.2681, 0.3062, 0.3337, 0.3517, 0.3620, 0.3662]])
CRO_T = np.array([[0.2087] * 7,
                  [0.1581, 0.2352, 0.2738, 0.2928, 0.3102, 0.3154, 0.3273],
                  [0.2111, 0.2848, 0.3019, 0.3309, 0.3479, 0.3611, 0.3741],
                  [0.2164, 0.2922, 0.3565, 0.3924, 0.4061, 0.4168, 0.4225],
                  [0.2090, 0.3313, 0.3734, 0.3931, 0.4035, 0.4108, 0.4298],
                  [0.2267, 0.3409, 0.4029, 0.4230, 0.4379, 0.4543, 0.4599],
                  [0.2122, 0.3653, 0.4055, 0.4225, 0.4445, 0.4587, 0.4747]])


def cri_threshold(abw, n):
    """Scale = a_BW (Liang's own example and Rezaei's Excel solver use a_BW); a_BW <= 2 -> 0 (Liang footnote 2).
    n > 9 -> the n = 9 column (no published value; our choice); n < 3 -> 0 (always consistent)."""
    if abw <= 2 or n < 3:
        return 0.0
    return float(CRI_T[int(abw) - 3, min(n, 9) - 3])


def ordinal_ratio(bo, ow):
    """Liang et al. 2020 Eqs. 9-11."""
    bo, ow = np.asarray(bo, float), np.asarray(ow, float)
    n = len(bo)
    loc = np.zeros(n)
    for j in range(n):
        s = 0.0
        for i in range(n):
            a, b = bo[i] - bo[j], ow[j] - ow[i]
            if a * b < 0:
                s += 1
            elif a * b == 0 and (a == 0) != (b == 0):
                s += 0.5
        loc[j] = s / n
    return float(loc.max()), loc


def rank_desc(s, tol=1e-5):
    s = np.asarray(s, float)
    return np.array([1 + int(np.sum(s > v + tol)) for v in s])


def random_pcs(n, scale=9, consistent_order=False, rng=None):
    """Random BO/OW pair on 1..a_BW with B = 0, W = n - 1 (entries capped at a_BW as Rezaei 2015 and Liang 2020)."""
    rng = RNG if rng is None else rng
    abw = int(rng.integers(2, scale + 1))
    bo = rng.integers(1, abw + 1, n).astype(float); ow = rng.integers(1, abw + 1, n).astype(float)
    bo[0], ow[0], bo[-1], ow[-1] = 1, abw, abw, 1
    return bo, ow, 0, n - 1


# ---------------------------------------------------------------- fixtures
CAR = ['quality', 'price', 'comfort', 'safety', 'style']
F1 = [  # Rezaei 2016 Tables 2-4; B = price (1), W = style (4)
    dict(name='Ex1 (Table 2, consistent)', bo=[2, 1, 4, 2, 8], ow=[4, 8, 2, 4, 1],
         lin=[0.2105, 0.4211, 0.1053, 0.2105, 0.0526], xiL=0.0, xiN=0.0),
    dict(name='Ex2 (Table 3)', bo=[2, 1, 4, 3, 8], ow=[4, 8, 2, 3, 1],
         lin=[0.2295, 0.4481, 0.1148, 0.1530, 0.0546], xiL=0.0109, xiN=0.1459,
         iv=[[0.2145, 0.2289], [0.4461, 0.4571], [0.1085, 0.1176], [0.1563, 0.1602], [0.0548, 0.0561]]),
    dict(name='Ex3 (Table 4)', bo=[2, 1, 4, 3, 8], ow=[4, 8, 4, 2, 1], xiN=1.0),
]
EXCEL_EX2 = [0.22950819672131148, 0.44808743169398907, 0.11475409836065574, 0.1530054644808743, 0.0546448087431694]
EXCEL_EX2_XI = 0.01092896174863388

# Rezaei 2015 Table 5: rows a21 = 1..8 (C2 over worst C1), columns a32 = 1..8 (best C3 over C2); a31 = 8
T5_XI = [[1.54, 1.16, 0.85, 0.61, 0.41, 0.24, 0.11, 0.00],
         [1.16, 0.70, 0.32, 0.00, 0.26, 0.47, 0.64, 0.78],
         [0.85, 0.32, 0.15, 0.54, 0.86, 1.13, 1.35, 1.53],
         [0.61, 0.00, 0.54, 1.00, 1.39, 1.73, 2.00, 2.23],
         [0.41, 0.26, 0.86, 1.39, 1.86, 2.26, 2.59, 2.88],
         [0.24, 0.47, 1.13, 1.73, 2.26, 2.73, 3.13, 3.47],
         [0.11, 0.64, 1.35, 2.00, 2.59, 3.13, 3.59, 4.00],
         [0.00, 0.78, 1.53, 2.23, 2.88, 3.47, 4.00, 4.47]]
T5_W2 = [[0.25, 0.22, 0.19, 0.16, 0.14, 0.12, 0.11, 0.10],
         [0.29, 0.25, 0.21, 0.18, 0.16, 0.14, 0.12, 0.11],
         [0.32, 0.28, 0.24, 0.21, 0.18, 0.16, 0.14, 0.12],
         [0.35, 0.31, 0.27, 0.23, 0.20, 0.17, 0.15, 0.14],
         [0.39, 0.34, 0.30, 0.26, 0.22, 0.20, 0.17, 0.15],
         [0.42, 0.37, 0.32, 0.28, 0.25, 0.22, 0.19, 0.17],
         [0.44, 0.40, 0.35, 0.31, 0.28, 0.24, 0.21, 0.19],
         [0.47, 0.42, 0.38, 0.34, 0.30, 0.27, 0.24, 0.21]]
T5_W1 = [0.10, 0.09, 0.08, 0.08, 0.07, 0.07, 0.06, 0.06]       # constant along each row

F3 = [  # Ratandhara & Kumar Examples 1-4: B = c1, W = c_n
    dict(name='Ex1', bo=[1, 2, 3, 4, 7], ow=[7, 2, 3, 2, 1], w=[0.4438, None, None, 0.1243, 0.0710], xi=0.0533, cr=0.2246),
    dict(name='Ex2', bo=[1, 4, 3, 2, 9], ow=[9, 2, 4, 7, 1], w=[0.4323, 0.1213, 0.1617, 0.2425, 0.0422], xi=0.0527, cr=0.1925),
    dict(name='Ex3', bo=[1, 1, 4, 3, 2, 4, 5], ow=[5, 2, 5, 2, 3, 2, 1],
         w=[0.2783, 0.1781, 0.0946, 0.1262, 0.1892, 0.0946, 0.0390], xi=0.1002, cr=0.6680),
    dict(name='Ex4', bo=[1, 5, 4, 8], ow=[8, 4, 1, 1], w=[0.6182, 0.1455, 0.1727, 0.0636], xi=0.1091, cr=0.3779),
]
RK_CI = {  # Ratandhara & Kumar Table 1, rows n = 3..10, columns a_BW = 2..9
    3: [0.1, 0.1714, 0.2222, 0.2597, 0.2885, 0.3111, 0.3294, 0.3445],
    5: [0.0789, 0.1290, 0.1630, 0.1875, 0.2143, 0.2373, 0.2569, 0.2738],
    7: [0.0577, 0.0976, 0.1271, 0.15, 0.1705, 0.1918, 0.2105, 0.2271],
    10: [0.0411, 0.0714, 0.0955, 0.1154, 0.1321, 0.1489, 0.1657, 0.1809],
}

F4 = dict(  # Demir & Bircan 2020, Tables 5-7; B = K8 (basari durumu), W = K3 (vizyon/misyon)
    name='Demir & Bircan 2020 (private school, n = 9)', B=7, W=2,
    bo=[2, 5, 9, 3, 4, 7, 6, 1, 8], ow=[6, 4, 1, 7, 3, 2, 8, 9, 5],
    w=[0.1991, 0.0796, 0.0212, 0.1327, 0.0996, 0.0569, 0.0664, 0.2947, 0.0498], xi=0.1040)

F5 = [  # Arsu & Uguz Arsu 2021, Table 4 (expert 1 inputs) and Tables 5-6 (expert 1 rows: weights, "TO")
    dict(name='main criteria K1-K5', B=2, W=4, bo=[7, 2, 1, 3, 7], ow=[3, 7, 7, 3, 1],
         w=[0.0750, 0.2625, 0.4375, 0.1750, 0.0500], to=0.0234, parent=None),
    dict(name='K1 sub-criteria', B=0, W=2, bo=[1, 3, 9, 3, 3], ow=[9, 3, 1, 5, 7],
         w=[0.0326, 0.0131, 0.0028, 0.0131, 0.0131], to=0.0175, parent=0.0750),
    dict(name='K2 sub-criteria', B=5, W=0, bo=[9, 9, 9, 7, 9, 1], ow=[1, 5, 3, 7, 7, 9],
         w=[0.0109, 0.0229, 0.0229, 0.0295, 0.0229, 0.1529], to=0.0393, parent=0.2625),
    dict(name='K3 sub-criteria', B=8, W=0, bo=[9, 3, 3, 3, 5, 3, 3, 3, 1], ow=[1, 7, 3, 7, 7, 2, 3, 7, 9],
         w=[0.0087, 0.0480, 0.0480, 0.0480, 0.0288, 0.0480, 0.0480, 0.0480, 0.1115], to=0.0142, parent=0.4375),
    dict(name='K4 sub-criteria', B=7, W=0, bo=[9, 7, 2, 2, 3, 3, 5, 1], ow=[1, 9, 7, 9, 9, 7, 5, 9],
         w=[0.0030, 0.0090, 0.0315, 0.0315, 0.0210, 0.0210, 0.0126, 0.0451], to=0.0197, parent=0.1750),
    dict(name='K5 sub-criteria', B=4, W=6, bo=[9, 2, 2, 2, 1, 2, 9], ow=[5, 5, 3, 3, 9, 5, 1],
         w=[0.0020, 0.0090, 0.0072, 0.0072, 0.0142, 0.0090, 0.0011], to=0.0145, parent=0.0500),
]


def section(t):
    print('\n' + '=' * 100 + '\n' + t + '\n' + '=' * 100)


def main():
    section('0. Consistency index tables')
    ci = [round(ci_nonlinear(a), 2) for a in range(1, 10)]
    print('  CI (Rezaei 2015 Eq. 8), a_BW = 1..9:', ci)
    print('  published Table 1:                   ', [0.00, 0.44, 1.00, 1.63, 2.30, 3.00, 3.73, 4.47, 5.23],
          'MATCH' if ci == [0.00, 0.44, 1.00, 1.63, 2.30, 3.00, 3.73, 4.47, 5.23] else 'MISMATCH')
    worst = 0.0
    for n, row in RK_CI.items():
        ours = [ci_linear(a, n) for a in range(2, 10)]
        worst = max(worst, mx(np.round(ours, 4), row))
    print(f'  linear CI (Ratandhara & Kumar Eq. 22) vs their Table 1 rows n = 3, 5, 7, 10: max diff {worst:.1e}')
    # brute force: maximum xi^L over every PCS on 1..a_BW, n = 3 and 4
    for n in (3, 4):
        bad = 0
        for a in range(2, 10):
            best = 0.0
            for vals in itertools.product(range(1, a + 1), repeat=2 * (n - 2)):
                bo = [1] + list(vals[:n - 2]) + [a]
                ow = [a] + list(vals[n - 2:]) + [1]
                best = max(best, linear_closed(bo, ow, 0, n - 1)[1])
            bad += abs(best - ci_linear(a, n)) > 1e-12
        print(f'  brute force max xi^L over all inputs on 1..a_BW, n = {n}, a_BW = 2..9: {8 - bad}/8 equal Eq. 22')

    section('1. F1 Rezaei 2016 Examples 1-3 (car, B = price, W = style)')
    for f in F1:
        bo, ow = f['bo'], f['ow']
        B, W = 1, 4
        wl, xl = linear_lp(bo, ow, B, W)
        wc, xc = linear_closed(bo, ow, B, W)
        xn, iv = nonlinear(bo, ow, B, W)
        cri, loc = cr_input(bo, ow, B, W)
        orr, oloc = ordinal_ratio(bo, ow)
        print(f"  {f['name']}: bo {bo} ow {ow}")
        print(f"    linear LP     w {fmt(wl)} xi^L {xl:.6f}")
        print(f"    linear closed w {fmt(wc)} xi^L {xc:.6f}   |closed - LP| {mx(wc, wl):.1e}")
        if 'lin' in f:
            print(f"    published linear w {fmt(f['lin'])} xi^L {f['xiL']}: max diff {mx(wc, f['lin']):.1e} "
                  f"{'MATCH' if mx(wc, f['lin']) < 6e-5 and abs(xc - f['xiL']) < 6e-5 else 'MISMATCH'}")
        print(f"    non-linear xi* {xn:.4f} (published {f['xiN']}) "
              f"{'MATCH' if abs(xn - f['xiN']) < 6e-5 else 'MISMATCH'}; CR_O = xi*/CI({bo[W]}) = {xn / ci_nonlinear(bo[W]):.4f}")
        print(f"    non-linear weight intervals {np.round(iv, 4).tolist()}")
        if 'iv' in f:
            print(f"    published intervals         {f['iv']}: max diff {mx(iv, f['iv']):.1e}")
            inside = [f['iv'][j][0] - 5e-5 <= wc[j] <= f['iv'][j][1] + 5e-5 for j in range(5)]
            print(f"    linear w inside the non-linear intervals: {inside}")
        print(f"    CR_I {cri:.4f} local {fmt(loc)} -> most inconsistent: {CAR[int(np.argmax(loc))]}; "
              f"threshold (a_BW = {bo[W]}, n = 5) {cri_threshold(bo[W], 5)} -> {'ok' if cri <= cri_threshold(bo[W], 5) else 'revise'}")
        print(f"    ordinal OR {orr:.2f} local {fmt(oloc, 2)}")
    print(f"  Rezaei's Excel solver (BWM-Solver-6.xlsx, sheet 'Example' = Ex2): stored w vs our closed form "
          f"{mx(linear_closed([2, 1, 4, 3, 8], [4, 8, 2, 3, 1], 1, 4)[0], EXCEL_EX2):.1e}, "
          f"xi {abs(linear_closed([2, 1, 4, 3, 8], [4, 8, 2, 3, 1], 1, 4)[1] - EXCEL_EX2_XI):.1e}")
    print('  Liang 2020 Table 1 (Ex3 inputs): CR_I_j printed [0, 0, 0.14, 0.04, 0] (columns price, quality, comfort, safety, style); '
          'Table 2 OR_j [0, 0, 0.3, 0.2, 0]; Sec. 5.3 CR_O 0.223 (= 1/4.47)')

    section('2. F2 Rezaei 2015 Example 1 and Table 5 (n = 3, non-linear; unique for n = 3)')
    # criteria C1 load flexibility (worst), C2 accessibility, C3 cost (best); BO = (a31, a32, 1), OW = (1, a21, 8)
    xn, iv = nonlinear([8, 2, 1], [1, 5, 8], 2, 0)
    print(f'  Ex1: xi* {xn:.4f} (published 0.26), w {fmt(iv.mean(1))} (published [0.0714, 0.3387, 0.5899]), '
          f'interval width {np.max(iv[:, 1] - iv[:, 0]):.1e}, CR_O {xn / ci_nonlinear(8):.3f} (published 0.058)')
    d_xi = d_w = 0.0
    n_ok = 0
    for r, a21 in enumerate(range(1, 9)):
        for c, a32 in enumerate(range(1, 9)):
            xn, iv = nonlinear([8, a32, 1], [1, a21, 8], 2, 0)
            w = iv.mean(1)
            e1, e2 = abs(xn - T5_XI[r][c]), max(abs(w[1] - T5_W2[r][c]), abs(w[0] - T5_W1[r]))
            d_xi, d_w = max(d_xi, e1), max(d_w, e2)
            n_ok += e1 <= 0.005 + 1e-9 and e2 <= 0.005 + 1e-9
    print(f'  Table 5, 64 cases: max |xi* - printed| {d_xi:.4f}, max |w - printed| {d_w:.4f}; within 2-d.p. rounding: {n_ok}/64')

    section('3. F3 Ratandhara & Kumar Examples 1-4 (closed form of the linear model)')
    for f in F3:
        n = len(f['bo'])
        wc, xc = linear_closed(f['bo'], f['ow'], 0, n - 1)
        wl, xl = linear_lp(f['bo'], f['ow'], 0, n - 1)
        pub = [x for x in f['w'] if x is not None]
        ours = [wc[k] for k, x in enumerate(f['w']) if x is not None]
        cr = xc / ci_linear(f['bo'][-1], n)
        print(f"  {f['name']}: w {fmt(wc)} xi {xc:.4f} CR_lin {cr:.4f} | published xi {f['xi']} CR {f['cr']} "
              f"w-diff {mx(ours, pub):.1e} | LP diff {mx(wc, wl):.1e} "
              f"{'MATCH' if mx(ours, pub) < 6e-5 and abs(xc - f['xi']) < 6e-5 else 'MISMATCH'}")

    section('4. F4 Demir & Bircan 2020 (Turkish, linear model, LINGO 17)')
    f = F4
    wc, xc = linear_closed(f['bo'], f['ow'], f['B'], f['W'])
    wl, xl = linear_lp(f['bo'], f['ow'], f['B'], f['W'])
    print(f"  ours   w {fmt(wc)} xi^L {xc:.4f}  (LP diff {mx(wc, wl):.1e})")
    print(f"  paper  w {fmt(f['w'])} xi^L {f['xi']}")
    print(f"  max diff {mx(wc, f['w']):.1e}; xi diff {abs(xc - f['xi']):.1e}; xi of the printed w {xi_of(f['w'], f['bo'], f['ow'], f['B'], f['W']):.4f}")
    cri, loc = cr_input(f['bo'], f['ow'], f['B'], f['W'])
    print(f"  paper CR = xi^L / CI(9) = 0.104 / 5.23 = 0.020 'consistent (< 0.1)' -- mixes the linear xi with the non-linear CI table.")
    print(f"  ours: CR_I {cri:.4f} (threshold a_BW 9, n 9: {cri_threshold(9, 9)}) -> {'ok' if cri <= cri_threshold(9, 9) else 'REVISE'}; "
          f"most inconsistent criterion K{int(np.argmax(loc)) + 1} (a_B = {f['bo'][int(np.argmax(loc))]}, a_W = {f['ow'][int(np.argmax(loc))]}); "
          f"linear CR = xi^L / CI_lin(9, 9) = {xc / ci_linear(9, 9):.3f}")
    xn, _ = nonlinear(f['bo'], f['ow'], f['B'], f['W'])
    print(f"  non-linear xi* {xn:.4f}, CR_O {xn / ci_nonlinear(9):.4f} (threshold {CRO_T[6, 6]})")

    section('5. F5 Arsu & Uguz Arsu 2021 (Turkish, expert 1; "linear programming" model, solver not named)')
    for f in F5:
        n = len(f['bo'])
        wc, xc = linear_closed(f['bo'], f['ow'], f['B'], f['W'])
        xn, iv = nonlinear(f['bo'], f['ow'], f['B'], f['W'])
        pub = np.array(f['w'])
        if f['parent']:
            pub = pub / f['parent']                     # Table 6 prints local weight x parent weight
        pub_n = pub / pub.sum()
        in_iv = all(iv[j, 0] - 6e-4 <= pub_n[j] <= iv[j, 1] + 6e-4 for j in range(n))
        cri, _ = cr_input(f['bo'], f['ow'], f['B'], f['W'])
        print(f"  {f['name']}: printed (local) {fmt(pub_n)}")
        print(f"    linear {fmt(wc)} diff {mx(wc, pub_n):.4f} | non-linear xi* {xn:.4f}, printed inside intervals: {in_iv} | "
              f"printed TO {f['to']} vs xi^L/CI {xc / ci_nonlinear(f['bo'][f['W']]):.4f}, xi*/CI {xn / ci_nonlinear(f['bo'][f['W']]):.4f} | CR_I {cri:.4f}")

    section('6. Closed form vs LP (HiGHS) on random inputs; timing')
    worst = 0.0
    N = 0
    for n in range(3, 16):
        for _ in range(300):
            bo, ow, B, W = random_pcs(n)
            wc, xc = linear_closed(bo, ow, B, W)
            wl, xl = linear_lp(bo, ow, B, W)
            worst = max(worst, abs(xc - xl), mx(wc, wl))
            N += 1
    print(f'  n = 3..15, {N} random inputs on 1..a_BW: max |closed - LP| over w and xi {worst:.1e}')
    worst = 0.0
    for _ in range(500):  # entries NOT capped at a_BW (a careless UI): does the closed form still hold?
        n = int(RNG.integers(3, 10))
        bo = RNG.integers(1, 10, n).astype(float); ow = RNG.integers(1, 10, n).astype(float)
        bo[0], ow[-1] = 1, 1; ow[0] = bo[-1]
        wc, xc = linear_closed(bo, ow, 0, n - 1)
        wl, xl = linear_lp(bo, ow, 0, n - 1)
        worst = max(worst, abs(xc - xl), mx(wc, wl))
    print(f'  500 inputs with entries above a_BW allowed: max |closed - LP| {worst:.1e}')
    bo, ow, B, W = random_pcs(15)
    t = time.perf_counter()
    for _ in range(2000):
        linear_closed(bo, ow, B, W)
    tc = (time.perf_counter() - t) / 2000
    t = time.perf_counter()
    for _ in range(200):
        linear_lp(bo, ow, B, W)
    tl = (time.perf_counter() - t) / 200
    print(f'  n = 15, CPython: closed form {tc * 1e6:.0f} us per solve, scipy HiGHS LP {tl * 1e3:.1f} ms per solve')

    section('7. Linear vs non-linear, CR_I vs CR_O, sensitivity (random inputs on 1..a_BW)')
    agree = inside = total = 0
    gaps = []
    acc = dict(n=0, agree=0, gaps=[])
    for _ in range(400):
        n = int(RNG.integers(4, 8))
        bo, ow, B, W = random_pcs(n)
        wc, _ = linear_closed(bo, ow, B, W)
        xn, iv = nonlinear(bo, ow, B, W)
        mid = iv.mean(1)
        same = rank_desc(wc).tolist() == rank_desc(mid).tolist()
        agree += same
        inside += all(iv[j, 0] - 1e-5 <= wc[j] <= iv[j, 1] + 1e-5 for j in range(n))
        gaps.append(mx(wc, mid))
        total += 1
        if bo[W] >= 3 and cr_input(bo, ow, B, W)[0] <= cri_threshold(bo[W], n):
            acc['n'] += 1; acc['agree'] += same; acc['gaps'].append(mx(wc, mid))
    print(f'  n = 4..7, {total} inputs: same criterion ranks, ties within 1e-5 (linear vs midpoint of non-linear intervals) {agree}/{total}; '
          f'linear w inside every non-linear interval {inside}/{total}; max |w_lin - midpoint| median {np.median(gaps):.3f}, 90th pct {np.percentile(gaps, 90):.3f}')
    print(f"    of these, the {acc['n']} with CR_I under the threshold: same ranks {acc['agree']}/{acc['n']}, "
          f"max |w_lin - midpoint| median {np.median(acc['gaps']):.3f}, 90th pct {np.percentile(acc['gaps'], 90):.3f}")
    flag_i = flag_o = both = 0
    for _ in range(400):
        n = int(RNG.integers(3, 10))
        bo, ow, B, W = random_pcs(n)
        a = int(bo[W])
        if a < 3:
            continue
        cri, _ = cr_input(bo, ow, B, W)
        xn, _ = nonlinear(bo, ow, B, W)
        fi = cri > cri_threshold(a, n)
        fo = xn / ci_nonlinear(a) > CRO_T[a - 3, n - 3]
        flag_i += fi; flag_o += fo; both += fi == fo
    print(f'  400 inputs (a_BW >= 3, n 3..9): over threshold by CR_I {flag_i}, by CR_O {flag_o}; same verdict {both}')
    same = moves = 0
    for _ in range(300):
        n = int(RNG.integers(4, 9))
        bo, ow, B, W = random_pcs(n)
        w0, _ = linear_closed(bo, ow, B, W)
        abw = bo[W]
        for j in range(1, n - 1):
            for vec in (bo, ow):
                for d in (-1, 1):
                    if 1 <= vec[j] + d <= abw:
                        vec[j] += d
                        w1, _ = linear_closed(bo, ow, B, W)
                        vec[j] -= d
                        moves += 1
                        same += mx(w0, w1) < 1e-12
    print(f'  one judgement moved by +-1 (within 1..a_BW): weights unchanged in {same}/{moves} moves '
          f'({100 * same / moves:.0f} %, the "low sensitivity" of Ratandhara & Kumar Corollary 1)')

    section('8. Edge cases')
    w, x = linear_closed([1, 3], [3, 1], 0, 1)
    print(f'  n = 2, a_BW = 3: w {fmt(w)} xi {x}; (a_BW/(1+a_BW), 1/(1+a_BW)) = {fmt([0.75, 0.25])}')
    w, x = linear_closed([1, 1, 1, 1], [1, 1, 1, 1], 0, 3)
    print(f'  all ones (a_BW = 1): w {fmt(w)} xi {x}, CR_I {cr_input([1] * 4, [1] * 4, 0, 3)[0]} -> equal weights')
    bo, ow = [1, 9, 1], [1, 1, 1]
    w, x = linear_closed(bo, ow, 0, 2)
    print(f'  a_BW = 1 but a_B2 = 9 (entry above a_BW): w {fmt(w)} xi {x:.4f}; CR_I {cr_input(bo, ow, 0, 2)[0]} '
          '(Liang Eq. 7 sets CR_I = 0 whenever a_BW = 1: the inconsistency is invisible -> cap entries at a_BW)')
    bo, ow = [1, 2, 2], [2, 2, 1]
    print(f'  a_BW = 2, n = 3, bo {bo} ow {ow}: CR_I {cr_input(bo, ow, 0, 2)[0]:.3f}, threshold {cri_threshold(2, 3)} '
          '(Liang footnote 2: any CR_I > 0 is "revise"); Excel solver shows no threshold (VLOOKUP starts at 3)')
    bo, ow = [1, 4, 9], [9, 4, 1]
    print(f'  B over j and j over W both 4 with a_BW = 9 (4 x 4 = 16 != 9): CR_I {cr_input(bo, ow, 0, 2)[0]:.3f}, '
          f'suggested fix for j: a_jW = a_BW / a_Bj = {9 / 4:.2f} -> 2 (CR_I_j {abs(4 * 2 - 9) / 72:.3f})')
    for n in (2, 3, 5, 9, 15):
        print(f'  n = {n:>2}: BWM asks 2n - 3 = {2 * n - 3:>2} judgements, AHP n(n - 1)/2 = {n * (n - 1) // 2:>3}')

    section('9. pyDecision 5.1.8 bw_method (divergence only)')
    try:
        from pyDecision.algorithm import bw_method
    except Exception as e:  # noqa: BLE001
        print(f'  skipped ({type(e).__name__})')
        return
    cases = [('F1 Ex1', [2, 1, 4, 2, 8], [4, 8, 2, 4, 1], 1, 4), ('F1 Ex2', [2, 1, 4, 3, 8], [4, 8, 2, 3, 1], 1, 4),
             ('F1 Ex3', [2, 1, 4, 3, 8], [4, 8, 4, 2, 1], 1, 4), ('F4 Demir', F4['bo'], F4['ow'], 7, 2),
             ('F3 Ex2', [1, 4, 3, 2, 9], [9, 2, 4, 7, 1], 0, 4)]
    for name, bo, ow, B, W in cases:
        buf = io.StringIO()
        with contextlib.redirect_stdout(buf):
            wp = bw_method(np.array(bo), np.array(ow), eps_penalty=1, verbose=True)   # int arrays: floats crash threshold[mx]
        wc, _ = linear_closed(bo, ow, B, W)
        printed = ' | '.join(l.strip() for l in buf.getvalue().splitlines())
        print(f'  {name}: pyDecision {fmt(wp)} vs linear {fmt(wc)} max diff {mx(wp, wc):.1e}; prints: {printed}')
    buf = io.StringIO()
    with contextlib.redirect_stdout(buf):
        bw_method(np.array([1, 1, 1]), np.array([1, 1, 1]), verbose=True)
    print(f"  all ones: prints '{buf.getvalue().splitlines()[0]}' (bug: a fully consistent input flagged; Liang defines CR_I = 0)")
    bo, ow = [1, 2, 3, 9], [9, 2, 2, 1]
    buf = io.StringIO()
    with contextlib.redirect_stdout(buf):
        bw_method(np.array(bo), np.array(ow), verbose=True)
    print(f"  bo {bo} ow {ow}: pyDecision '{buf.getvalue().splitlines()[0]}' vs Liang CR_I {cr_input(bo, ow, 0, 3)[0]:.4f} "
          '(pyDecision omits the absolute value, so products below a_BW count as negative)')


def oracle():
    """JSON oracle for the TypeScript closed form: 50 random inputs (n cycling 3..15) and their LP solution."""
    import json
    rng = np.random.default_rng(20261019)
    cases = []
    for k in range(50):
        bo, ow, B, W = random_pcs(3 + k % 13, rng=rng)
        w, xi = linear_lp(bo, ow, B, W)
        cases.append({'bestToOthers': [int(x) for x in bo], 'othersToWorst': [int(x) for x in ow], 'best': B, 'worst': W,
                      'weights': [float(x) for x in w], 'xi': xi})
    print(json.dumps({'source': 'bwm.py linear_lp (HiGHS), seed 20261019', 'cases': cases}, indent=1))


if __name__ == '__main__':
    import sys
    oracle() if sys.argv[1:] == ['--oracle'] else main()
