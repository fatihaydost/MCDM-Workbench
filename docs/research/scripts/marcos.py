"""Independent MARCOS recomputation (numpy only) against published examples, plus the SAW equivalence check.

Fixtures
  F1  Stevic & Brkovic (2020), Logistics 4(1):4, DOI 10.3390/logistics4010004, Tables 2-5, Figure 2.
  F2  Madenoglu (2020), Economics Business and Organization Research 2(2):99-120, Tables 3-7.
Also: pyDecision marcos_method (source text, run with matplotlib stubbed; divergence only), the project's own
saw.ts 'linearMax' (run through node, see SAW_RUNNER), algebraic constant c, random equivalence and edge cases.

Run: python3 -I marcos.py [path/to/saw_run.mjs]
"""
import json
import os
import subprocess
import sys
import types as _types

import numpy as np

np.set_printoptions(legacy='1.25', precision=4, suppress=True, linewidth=160)
REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
SAW_RUNNER = sys.argv[1] if len(sys.argv) > 1 else None


def marcos(X, w, types, ai=None, aai=None):
    """Crisp MARCOS, Stevic & Brkovic 2020 Eqs. 1-12. AI/AAI default to the column best/worst (Eqs. 2-3)."""
    X = np.asarray(X, float)
    w = np.asarray(w, float)
    cost = np.array([t == 'cost' for t in types])
    if ai is None:
        ai = np.where(cost, X.min(0), X.max(0))
    if aai is None:
        aai = np.where(cost, X.max(0), X.min(0))
    E = np.vstack([aai, X, ai])                      # extended matrix, Eq. 1
    N = np.where(cost, ai / E, E / ai)               # Eqs. 4-5
    V = N * w                                         # Eq. 6
    S_all = V.sum(1)                                  # Eq. 9
    S_aai, S, S_ai = S_all[0], S_all[1:-1], S_all[-1]
    Km = S / S_aai                                    # Eq. 7
    Kp = S / S_ai                                     # Eq. 8
    fKm = Kp / (Kp + Km)                              # Eq. 11
    fKp = Km / (Kp + Km)                              # Eq. 12
    fK = (Kp + Km) / (1 + (1 - fKp) / fKp + (1 - fKm) / fKm)   # Eq. 10
    return dict(N=N, V=V, S=S, S_aai=S_aai, S_ai=S_ai, Km=Km, Kp=Kp, fKm=fKm, fKp=fKp, fK=fK)


def c_const(a, b):
    """f(K_i) = c * S_i with a = S_aai, b = S_ai (derivation in marcos.md, Algorithm step 7)."""
    return (a + b) / (a * a + a * b + b * b)


def saw_linear_max(X, w, types):
    X = np.asarray(X, float)
    cost = np.array([t == 'cost' for t in types])
    R = np.where(cost, X.min(0) / X, X / X.max(0))
    return (R * np.asarray(w, float)).sum(1)


def rank_desc(s, tol=1e-9):
    s = np.asarray(s, float)
    return np.array([1 + int(np.sum(s > v + tol)) for v in s])


def load_pydecision():
    src = os.environ.get('PYD_MARCOS')
    if not src or not os.path.exists(src):
        return None
    plt = _types.ModuleType('matplotlib.pyplot')
    mpl = _types.ModuleType('matplotlib')
    mpl.pyplot = plt
    sys.modules.setdefault('matplotlib', mpl)
    sys.modules.setdefault('matplotlib.pyplot', plt)
    ns = {}
    exec(compile(open(src).read(), src, 'exec'), ns)
    return ns['marcos_method']


def run_project_saw(fixtures):
    if not SAW_RUNNER:
        return None
    reg = os.path.join(os.path.dirname(SAW_RUNNER), 'register.mjs')
    p = subprocess.run(['node', '--no-deprecation', '--import', reg, SAW_RUNNER, REPO],
                       input=json.dumps(fixtures), capture_output=True, text=True, check=True)
    return json.loads(p.stdout)


def maxdiff(a, b):
    return float(np.max(np.abs(np.asarray(a, float) - np.asarray(b, float))))


# ---------------------------------------------------------------- F1 Stevic & Brkovic 2020
F1_X = [
    [33.9, 0.001, 7, 9, 7], [30.0, 0.001, 9, 7, 7], [31.5, 0.001, 9, 7, 9], [33.0, 0.001, 7, 9, 9],
    [31.9, 0.001, 9, 7, 7], [31.1, 0.050, 7, 7, 9], [34.8, 0.001, 7, 7, 7], [25.8, 0.001, 7, 7, 7],
    [31.7, 0.001, 7, 7, 9], [35.7, 0.001, 7, 7, 7], [34.2, 0.001, 7, 7, 9], [29.6, 0.100, 7, 7, 7],
    [30.2, 0.001, 9, 5, 5], [34.3, 0.001, 7, 7, 9], [31.0, 0.001, 5, 7, 7], [34.5, 0.001, 7, 7, 7],
    [33.9, 0.001, 5, 7, 7], [33.1, 0.001, 9, 9, 9], [32.7, 0.001, 9, 9, 9], [35.0, 0.001, 9, 9, 7],
    [31.8, 0.001, 5, 7, 9], [31.0, 0.001, 9, 7, 7], [32.5, 0.001, 7, 7, 3]]
F1_T = ['cost', 'cost', 'benefit', 'benefit', 'benefit']
F1_W_TABLE4 = [0.434, 0.255, 0.128, 0.096, 0.087]   # as applied in Table 4 (C3 0.128, C4 0.096)
F1_W_FIG2 = [0.434, 0.255, 0.096, 0.128, 0.087]     # Figure 2: C4 = 0.128, C3 = 0.096
F1_S = [0.849, 0.898, 0.900, 0.877, 0.876, 0.626, 0.819, 0.931, 0.869, 0.811, 0.844, 0.623, 0.856, 0.843, 0.830,
        0.822, 0.799, 0.904, 0.908, 0.867, 0.840, 0.887, 0.803]
F1_KM = [1.807, 1.913, 1.917, 1.868, 1.866, 1.333, 1.744, 1.983, 1.852, 1.726, 1.797, 1.326, 1.823, 1.795, 1.767,
         1.750, 1.701, 1.926, 1.935, 1.846, 1.789, 1.888, 1.710]
F1_FK = [0.738, 0.781, 0.783, 0.763, 0.762, 0.544, 0.712, 0.809, 0.756, 0.705, 0.734, 0.541, 0.744, 0.733, 0.722,
         0.714, 0.695, 0.786, 0.790, 0.754, 0.730, 0.771, 0.698]
F1_RANK = [12, 5, 4, 7, 8, 22, 18, 1, 9, 19, 13, 23, 11, 14, 16, 17, 21, 3, 2, 10, 15, 6, 20]
F1_AAI_N = [0.723, 0.010, 0.556, 0.556, 0.333]      # Table 3 AAI row
F1_AAI_V = [0.314, 0.003, 0.071, 0.054, 0.029]      # Table 4 AAI row

# ---------------------------------------------------------------- F2 Madenoglu 2020
F2_X = [
    [5.00, 4.72, 7.00, 7.40, 1.91, 3.98, 3.98, 5.24, 6.08, 4.33, 5.74, 7.61, 1.91, 3.98, 7.00, 8.28],
    [1.71, 4.72, 3.56, 1.71, 4.22, 4.22, 4.22, 4.22, 1.71, 3.56, 3.98, 5.00, 1.91, 2.47, 3.00, 2.08],
    [5.59, 5.59, 6.26, 5.00, 6.80, 3.98, 6.80, 7.00, 9.00, 8.28, 2.92, 7.61, 7.40, 7.61, 6.08, 8.28],
    [5.74, 3.00, 5.74, 6.24, 6.80, 3.56, 6.80, 7.40, 7.61, 7.40, 3.66, 9.00, 6.80, 6.24, 7.61, 7.40],
    [7.00, 5.74, 6.26, 6.26, 8.28, 6.24, 7.61, 6.80, 3.27, 3.27, 4.33, 3.66, 2.92, 3.66, 4.33, 3.66],
    [4.22, 5.59, 6.80, 4.22, 2.92, 3.56, 4.72, 4.22, 5.00, 5.59, 4.22, 5.59, 4.72, 5.13, 5.59, 6.80]]
# F2 transport cost per product, M2 response time, I3 delivery time are cost (Table 4 AAI = column max, AI = min).
F2_T = ['benefit', 'cost', 'benefit', 'benefit', 'benefit', 'cost', 'benefit', 'benefit',
        'benefit', 'benefit', 'cost', 'benefit', 'benefit', 'benefit', 'benefit', 'benefit']
F2_W = [0.153, 0.022, 0.103, 0.048, 0.013, 0.015, 0.033, 0.007, 0.128, 0.046, 0.175, 0.095, 0.058, 0.024, 0.071, 0.009]
F2_AAI = [1.71, 5.74, 3.56, 1.71, 1.91, 6.24, 3.98, 4.22, 1.71, 3.27, 5.74, 3.66, 1.91, 2.47, 3.00, 2.08]
F2_AI = [7.00, 3.00, 7.00, 7.40, 8.28, 3.56, 7.61, 7.40, 9.00, 8.28, 2.92, 9.00, 7.40, 7.61, 7.61, 8.28]
F2_N = [
    [0.71, 0.64, 1.00, 1.00, 0.23, 0.89, 0.52, 0.71, 0.68, 0.52, 0.51, 0.85, 0.26, 0.52, 0.92, 1.00],
    [0.24, 0.64, 0.51, 0.23, 0.51, 0.84, 0.55, 0.57, 0.19, 0.43, 0.73, 0.56, 0.26, 0.32, 0.39, 0.25],
    [0.80, 0.54, 0.89, 0.68, 0.82, 0.89, 0.89, 0.95, 1.00, 1.00, 1.00, 0.85, 1.00, 1.00, 0.80, 1.00],
    [0.82, 1.00, 0.82, 0.84, 0.82, 1.00, 0.89, 1.00, 0.85, 0.89, 0.80, 1.00, 0.92, 0.82, 1.00, 0.89],
    [1.00, 0.52, 0.89, 0.85, 1.00, 0.57, 1.00, 0.92, 0.36, 0.40, 0.68, 0.41, 0.40, 0.48, 0.57, 0.44],
    [0.60, 0.54, 0.97, 0.57, 0.35, 1.00, 0.62, 0.57, 0.56, 0.68, 0.69, 0.62, 0.64, 0.67, 0.73, 0.82]]
F2_S = [0.69, 0.43, 0.90, 0.87, 0.66, 0.67]
F2_KM = [1.89, 1.18, 2.43, 2.36, 1.79, 1.82]
F2_FK = [0.63, 0.40, 0.82, 0.79, 0.60, 0.61]
F2_RANK = [3, 6, 1, 2, 5, 4]


def report_fixture(name, X, w, t, S_pub, Km_pub, fK_pub, rank_pub, extra=None):
    r = marcos(X, w, t)
    print(f'== {name}')
    print(f'  sum w = {sum(w):.4f}; S_aai = {r["S_aai"]:.6f}; S_ai = {r["S_ai"]:.6f}; '
          f'f(K-) = {r["fKm"][0]:.6f} (spread {np.ptp(r["fKm"]):.1e}); f(K+) = {r["fKp"][0]:.6f}')
    print('  S    ', np.round(r['S'], 6).tolist())
    print('  K-   ', np.round(r['Km'], 6).tolist())
    print('  f(K) ', np.round(r['fK'], 6).tolist())
    print(f'  max|S - pub| = {maxdiff(r["S"], S_pub):.5f}; max|K- - pub| = {maxdiff(r["Km"], Km_pub):.5f}; '
          f'max|f(K) - pub| = {maxdiff(r["fK"], fK_pub):.5f}')
    ours = rank_desc(r['fK'])
    print('  ranking ours', ours.tolist(), 'MATCH' if list(ours) == list(rank_pub) else f'MISMATCH vs {rank_pub}')
    c = c_const(r['S_aai'], r['S_ai'])
    print(f'  c = (a+b)/(a^2+ab+b^2) = {c:.6f}; max|f(K) - c*S| = {maxdiff(r["fK"], c * r["S"]):.1e}; '
          f'max|S - SAW linearMax| = {maxdiff(r["S"], saw_linear_max(X, w, t)):.1e}')
    if extra:
        extra(r)
    return r


def f1_extra(r):
    print(f'  AAI row N vs Table 3: {maxdiff(r["N"][0], F1_AAI_N):.5f}; AAI row V vs Table 4: '
          f'{maxdiff(r["V"][0], F1_AAI_V):.5f}')
    # paper's chained rounding: S/0.470, 0.320/0.680
    print(f'  chained-rounding check A1: 0.849/0.470 = {0.849 / 0.470:.4f}; 2.656/3.596 = {2.656 / 3.596:.4f}')
    rf = marcos(F1_X, F1_W_FIG2, F1_T)
    print('  Figure-2 weights ranking', rank_desc(rf['fK']).tolist())
    moved = [(i + 1, F1_RANK[i], int(k)) for i, k in enumerate(rank_desc(rf['fK'])) if F1_RANK[i] != k]
    print('  moved (alt, Table5 rank, Fig2 rank):', moved)
    # sensitivity to the 0.001 stand-in for 'no damage'
    for eps in (0.001, 0.005, 0.01, 0.02):
        X = [[row[0], eps if row[1] == 0.001 else row[1], *row[2:]] for row in F1_X]
        re = marcos(X, F1_W_TABLE4, F1_T)
        rk = rank_desc(re['fK'])
        print(f'  eps {eps}: f(K) A6 {re["fK"][5]:.4f}, A12 {re["fK"][11]:.4f}; rank A6 {rk[5]}, A12 {rk[11]}; '
              f'others unchanged: {all(rk[i] == F1_RANK[i] for i in range(23) if i not in (5, 11))}')


def f2_extra(r):
    print(f'  AAI row vs Table 4: {maxdiff(np.where(np.array(F2_T) == "cost", np.max(F2_X, 0), np.min(F2_X, 0)), F2_AAI):.3f}; '
          f'AI row: {maxdiff(np.where(np.array(F2_T) == "cost", np.min(F2_X, 0), np.max(F2_X, 0)), F2_AI):.3f}')
    print(f'  N (alternatives) vs Table 5: {maxdiff(r["N"][1:-1], F2_N):.4f} (table at 2 d.p.)')
    print(f'  S_aai printed 0.37: ours {r["S_aai"]:.4f}')


r1 = report_fixture('F1 Stevic & Brkovic 2020 (Table 4 weights)', F1_X, F1_W_TABLE4, F1_T, F1_S, F1_KM, F1_FK, F1_RANK, f1_extra)
r2 = report_fixture('F2 Madenoglu 2020', F2_X, F2_W, F2_T, F2_S, F2_KM, F2_FK, F2_RANK, f2_extra)

# ---------------------------------------------------------------- pyDecision
pyd = load_pydecision()
if pyd:
    p1 = pyd(np.array(F1_X), F1_W_TABLE4, ['min' if t == 'cost' else 'max' for t in F1_T], graph=False, verbose=False)
    p2 = pyd(np.array(F2_X), F2_W, ['min' if t == 'cost' else 'max' for t in F2_T], graph=False, verbose=False)
    print(f'== pyDecision marcos_method: F1 max diff {maxdiff(p1, r1["fK"]):.1e}, F2 {maxdiff(p2, r2["fK"]):.1e}')
else:
    print('== pyDecision: source not given (set PYD_MARCOS)')

# ---------------------------------------------------------------- random equivalence (numpy SAW and project saw.ts)
rng = np.random.default_rng(20261018)
cases = {}
worst_c, rank_diff = 0.0, 0
for k in range(2000):
    m, n = int(rng.integers(2, 9)), int(rng.integers(2, 8))  # MIN_ALTERNATIVES = MIN_CRITERIA = 2
    X = rng.uniform(0.1, 100, (m, n))
    if k % 5 == 0:
        X = np.round(X) + 1  # integer data with ties
    t = list(rng.choice(['benefit', 'cost'], n))
    w = rng.dirichlet(np.ones(n))
    r = marcos(X, w, t)
    s = saw_linear_max(X, w, t)
    ratio = r['fK'] / s
    worst_c = max(worst_c, float(np.ptp(ratio) / ratio.mean()), maxdiff(r['fK'], c_const(r['S_aai'], r['S_ai']) * s))
    rank_diff += int(list(rank_desc(r['fK'])) != list(rank_desc(s)))
    if k < 300:
        cases[f'r{k}'] = dict(matrix=X.tolist(), types=t, weights=w.tolist())
print(f'== random 2000 cases (m 2..8, n 2..7): max rel spread of f(K)/S_saw and |f(K) - cS| = {worst_c:.1e}; '
      f'ranking differences {rank_diff}/2000')

# user-defined AI/AAI: still f(K) = c*S, but S is SAW with weights w_j * max_j/AI_j (benefit) or w_j * AI_j/min_j (cost)
X, t, w = np.array(F2_X), F2_T, np.array(F2_W)
ai_user = np.where(np.array(t) == 'cost', 1.0, 9.0)         # scale ends 1..9 as "ideal"
aai_user = np.where(np.array(t) == 'cost', 9.0, 1.0)
ru = marcos(X, w, t, ai=ai_user, aai=aai_user)
cost = np.array(t) == 'cost'
w_eff = w * np.where(cost, ai_user / X.min(0), X.max(0) / ai_user)
s_eff = saw_linear_max(X, w_eff, t)
print(f'== user AI/AAI on F2 (scale ends 9/1): f(K) spread vs c*S {maxdiff(ru["fK"], c_const(ru["S_aai"], ru["S_ai"]) * ru["S"]):.1e}; '
      f'S equals SAW with reweighted w (diff {maxdiff(ru["S"], s_eff):.1e}); ranking {rank_desc(ru["fK"]).tolist()} '
      f'vs data-derived {rank_desc(r2["fK"]).tolist()}')

# user AI beyond the data (benefit: AI = max * u, cost: AI = min / u, u in [1, 2]): how often does the order change?
chg = 0
for k in range(2000):
    m, n = int(rng.integers(3, 9)), int(rng.integers(2, 8))
    X = rng.uniform(0.1, 100, (m, n))
    t = np.array(rng.choice(['benefit', 'cost'], n))
    w = rng.dirichlet(np.ones(n))
    u = rng.uniform(1, 2, n)
    ai = np.where(t == 'cost', X.min(0) / u, X.max(0) * u)
    chg += int(list(rank_desc(marcos(X, w, t, ai=ai)['fK'])) != list(rank_desc(marcos(X, w, t)['fK'])))
print(f'== user AI beyond the data (factor 1..2 per column): ranking changed in {chg}/2000 random cases '
      f'(effect = reweighting w_j by 1/u_j, f(K) still c*S)')

# ---------------------------------------------------------------- edge cases
eq = marcos([[3, 5], [3, 5], [3, 5]], [0.6, 0.4], ['benefit', 'cost'])
print(f'== all alternatives equal: S {eq["S"].tolist()}, S_aai {eq["S_aai"]}, f(K) {np.round(eq["fK"], 6).tolist()} (2/3 = 0.666667)')
one = marcos([[3, 5]], [0.6, 0.4], ['benefit', 'cost'])
print(f'== single alternative: f(K) {np.round(one["fK"], 6).tolist()}')
cc = marcos([[1, 4, 7], [2, 4, 3], [3, 4, 5]], [0.4, 0.2, 0.4], ['benefit', 'cost', 'benefit'])
cc0 = marcos([[1, 7], [2, 3], [3, 5]], [0.5, 0.5], ['benefit', 'benefit'])
print(f'== constant column (w 0.2, others scaled 0.8): ranking {rank_desc(cc["fK"]).tolist()} vs without {rank_desc(cc0["fK"]).tolist()}; '
      f'f(K) {np.round(cc["fK"], 4).tolist()} vs {np.round(cc0["fK"], 4).tolist()} (values change, order does not)')
with np.errstate(divide='ignore', invalid='ignore'):
    z = marcos([[1, 0.0], [2, 3]], [0.5, 0.5], ['benefit', 'cost'])
    zb = marcos([[0.0, 2], [2, 3]], [0.5, 0.5], ['benefit', 'cost'])
    neg = marcos([[-1, 2], [2, 3]], [0.5, 0.5], ['benefit', 'cost'])
print(f'== zero in cost column: f(K) {z["fK"].tolist()}')
print(f'== zero in benefit column: f(K) {np.round(zb["fK"], 4).tolist()} (S_aai {zb["S_aai"]:.3f})')
print(f'== negative benefit value: N row {np.round(neg["N"][1], 3).tolist()}, f(K) {np.round(neg["fK"], 4).tolist()}')

# ---------------------------------------------------------------- project saw.ts
fx = {'F1': dict(matrix=F1_X, types=F1_T, weights=F1_W_TABLE4), 'F2': dict(matrix=F2_X, types=F2_T, weights=F2_W), **cases}
out = run_project_saw(fx)
if out:
    worst, rdiff, rmax = 0.0, 0, 0.0
    for key, f in fx.items():
        r = marcos(f['matrix'], f['weights'], f['types'])
        s = np.array(out[key]['scores'])
        rmax = max(rmax, maxdiff(r['N'][1:-1], out[key]['r']))
        worst = max(worst, maxdiff(r['fK'], c_const(r['S_aai'], r['S_ai']) * s))
        rdiff += int(list(rank_desc(r['fK'])) != list(out[key]['ranking']))
    print(f'== project saw.ts linearMax ({len(fx)} problems: F1, F2, 300 random): '
          f'max|N_MARCOS - linearMaxNormalize| = {rmax:.1e}; max|f(K) - c*S_saw.ts| = {worst:.1e}; '
          f'ranking differences {rdiff}/{len(fx)}')
    print(f'   F1 saw.ts ranking == Table 5: {out["F1"]["ranking"] == F1_RANK}; F2: {out["F2"]["ranking"] == F2_RANK}')
else:
    print('== project saw.ts: runner not given')
