"""Independent MABAC recomputation (numpy only) against published examples, plus library and property checks.

Fixtures
  F1  Pamucar & Cirovic (2015), Expert Systems with Applications 42(6):3016-3028, DOI 10.1016/j.eswa.2014.11.057,
      section 3, Tables 5, 7-12 (forklifts, 7 x 10; author's manuscript on academia.edu 9846829).
      C3/C4 are Likert terms; crisp middle values VG 5, G 4, F 3, P 2, VP 1 (Table 6) reproduce Table 8 exactly.
  F2  Biswas & Das (2018), Management Science Letters 8:121-130, DOI 10.5267/j.msl.2017.11.004, Tables 2-7
      (hybrid vehicles, 9 x 5, Entropy weights).
  F3  Celik (2020), Journal of Islamic Economics and Finance 6(2):311-334, Tables 3, 4, 7-12 (CRITIC -> MABAC,
      6 participation banks x 10 criteria, 2019; Turkish).
Also: pyDecision mabac_method, pymcdm MABAC, pyrepo-mcda MABAC (divergence only; skipped when not importable),
the MABAC = SAW(min-max) - constant identity, edge cases on random problems.

Run: python3 -I -W ignore mabac.py   (numpy only; the library section runs when the interpreter has pyDecision 5.1.8,
     pymcdm 1.4.0 and pyrepo-mcda 0.1.15 installed, e.g. from a venv; mabac.out was made that way)
"""
import io
import contextlib

import numpy as np

np.set_printoptions(legacy='1.25', precision=4, suppress=True, linewidth=160)
RNG = np.random.default_rng(20261018)


def minmax(X, types, constant=0.0):
    """Eqs. 15-16 of the origin. constant: value a constant column takes (0 = this project's minMaxNormalize)."""
    X = np.asarray(X, float)
    cost = np.array([t == 'cost' for t in types])
    lo, hi = X.min(0), X.max(0)
    rng = hi - lo
    flat = rng == 0
    safe = np.where(flat, 1.0, rng)
    t = np.where(cost, (hi - X) / safe, (X - lo) / safe)
    t[:, flat] = constant
    return t


def mabac(X, w, types, constant=0.0, geo='log'):
    """Crisp MABAC, Pamucar & Cirovic 2015 Eqs. 15-24. geo='log': G as exp(mean(log v)); 'prod': prod(v)**(1/m)."""
    w = np.asarray(w, float)
    t = minmax(X, types, constant)
    V = w * (t + 1)                                                   # Eq. 17
    m = V.shape[0]
    with np.errstate(divide='ignore'):
        G = np.exp(np.log(V).mean(0)) if geo == 'log' else np.prod(V, 0) ** (1 / m)   # Eq. 18 (log(0) -> G = 0 for w = 0)
    Q = V - G                                                         # Eq. 22
    S = Q.sum(1)                                                      # Eq. 24
    return dict(t=t, V=V, G=G, Q=Q, S=S)


def saw_minmax(X, w, types):
    return minmax(X, types) @ np.asarray(w, float)


def rank_desc(s, tol=1e-9):
    s = np.asarray(s, float)
    return np.array([1 + int(np.sum(s > v + tol)) for v in s])


def mx(a, b):
    return float(np.max(np.abs(np.asarray(a, float) - np.asarray(b, float))))


def fmt(v, d=6):
    return '[' + ', '.join(f'{x:.{d}f}' for x in np.asarray(v, float)) + ']'


# ---------------------------------------------------------------- fixtures
L = dict(VG=5, G=4, F=3, P=2, VP=1)
F1 = dict(
    name='F1 Pamucar & Cirovic 2015, forklifts (Tables 5, 7-12)',
    types=['cost', 'benefit', 'benefit', 'benefit', 'cost', 'cost', 'benefit', 'benefit', 'benefit', 'benefit'],
    w=[0.146, 0.144, 0.119, 0.121, 0.115, 0.101, 0.088, 0.068, 0.050, 0.048],
    X=[[22600, 3800, L['P'], L['VG'], 1.06, 3.00, 3.5, 2.8, 24.5, 6.5],
       [19500, 4200, L['F'], L['P'], 0.95, 3.00, 3.4, 2.2, 24, 7.0],
       [21700, 4000, L['VP'], L['F'], 1.25, 3.20, 3.3, 2.5, 24.5, 7.3],
       [20600, 3800, L['P'], L['VG'], 1.05, 3.25, 3.2, 2.0, 22.5, 11.0],
       [22500, 3800, L['G'], L['F'], 1.35, 3.20, 3.7, 2.1, 23, 6.3],
       [23250, 4210, L['F'], L['VG'], 1.45, 3.60, 3.5, 2.8, 23.5, 7.0],
       [20300, 3850, L['P'], L['VG'], 0.90, 3.25, 3.0, 2.6, 21.5, 6.0]],
    pub=dict(
        t=[[0.173, 0, 0.333, 1, 0.709, 1, 0.714, 1, 1, 0.1], [1, 0.976, 0.667, 0, 0.909, 1, 0.571, 0.25, 0.833, 0.2],
           [0.413, 0.488, 0, 0.333, 0.364, 0.667, 0.429, 0.625, 1, 0.26], [0.707, 0, 0.333, 1, 0.727, 0.583, 0.286, 0, 0.333, 1],
           [0.2, 0, 1, 0.333, 0.182, 0.667, 1, 0.125, 0.5, 0.06], [0, 1, 0.667, 1, 0, 0, 0.714, 1, 0.667, 0.2],
           [0.787, 0.122, 0.333, 1, 1, 0.583, 0, 0.75, 0, 0]],
        V=[[0.171, 0.144, 0.159, 0.242, 0.197, 0.202, 0.151, 0.136, 0.100, 0.053],
           [0.292, 0.284, 0.198, 0.121, 0.220, 0.202, 0.138, 0.085, 0.092, 0.058],
           [0.206, 0.214, 0.119, 0.161, 0.157, 0.168, 0.126, 0.111, 0.100, 0.060],
           [0.249, 0.144, 0.159, 0.242, 0.199, 0.160, 0.113, 0.068, 0.067, 0.096],
           [0.175, 0.144, 0.238, 0.161, 0.136, 0.168, 0.176, 0.077, 0.075, 0.051],
           [0.146, 0.288, 0.198, 0.242, 0.115, 0.101, 0.151, 0.136, 0.083, 0.058],
           [0.261, 0.162, 0.159, 0.242, 0.230, 0.160, 0.088, 0.119, 0.050, 0.048]],
        G=[0.2086, 0.1885, 0.1720, 0.1952, 0.1740, 0.1625, 0.1319, 0.1010, 0.0789, 0.0590],
        Q=[[-0.0372, -0.0445, -0.0133, 0.0468, 0.0225, 0.0395, 0.0190, 0.0350, 0.0211, -0.0062],
           [0.0834, 0.0960, 0.0264, -0.0742, 0.0455, 0.0395, 0.0064, -0.0160, 0.0127, -0.0014],
           [-0.0022, 0.0257, -0.0530, -0.0339, -0.0172, 0.0059, -0.0062, 0.0095, 0.0211, 0.0015],
           [0.0406, -0.0445, -0.0133, 0.0468, 0.0246, -0.0025, -0.0187, -0.0330, -0.0123, 0.0370],
           [-0.0334, -0.0445, 0.0660, -0.0339, -0.0381, 0.0059, 0.0441, -0.0245, -0.0039, -0.0081],
           [-0.0626, 0.0995, 0.0264, 0.0468, -0.0590, -0.0615, 0.0190, 0.0350, 0.0044, -0.0014],
           [0.0523, -0.0270, -0.0133, 0.0468, 0.0560, -0.0025, -0.0439, 0.0180, -0.0289, -0.0110]],
        S=[0.0826, 0.2183, -0.0488, 0.0246, -0.0704, 0.0465, 0.0464],
        ranking=[2, 1, 6, 5, 7, 3, 4]),
)
F2 = dict(
    name='F2 Biswas & Das 2018, hybrid vehicles (Tables 2-7)',
    types=['benefit', 'benefit', 'cost', 'benefit', 'cost'],
    w=[0.1406, 0.1671, 0.183, 0.1751, 0.3342],
    X=[[39, 13.5, 3.1, 100, 24], [48, 11, 4.5, 103, 29.6], [36, 10.6, 4.3, 49.1, 20.295],
       [30, 17.8, 5.1, 100, 50], [42, 11.9, 3.5, 86, 31], [40, 17.2, 3.6, 101, 26],
       [56, 11.9, 2.8, 96, 25], [44, 11.9, 3.3, 94, 31.12], [46, 13, 3.2, 95, 28.756]],
    pub=dict(
        G=[0.203764178, 0.221141521, 0.287306161, 0.307462238, 0.555521737],
        S=[0.157778583, -0.01622203, -0.14489751, -0.24274166, -0.0191927, 0.190021847, 0.212200519, 0.032174523, 0.106320697],
        ranking=[3, 6, 8, 9, 7, 2, 1, 5, 4]),
)
F3 = dict(
    name='F3 Celik 2020, CRITIC -> MABAC, participation banks 2019 (Tables 4, 7-12)',
    types=['benefit', 'benefit', 'benefit', 'benefit', 'cost', 'benefit', 'benefit', 'cost', 'cost', 'cost'],
    w=[0.081, 0.078, 0.082, 0.115, 0.120, 0.099, 0.092, 0.092, 0.121, 0.120],
    X=[[51392368, 30880921, 39769408, 0.07, 0.03, 0.41, 0.02, 1.5, 230, 3791],
       [104439345, 57925969, 85494387, 0.07, 0.01, 0.5, 0.16, 1.13, 431, 5955],
       [9282271, 1097529, 5952676, 0.13, 0.01, 0.29, 0.04, 1.6, 11, 381],
       [52427410, 33272689, 39974514, 0.09, 0.03, 0.41, 0.08, 0.9, 310, 3461],
       [30348784, 18770501, 22953215, 0.06, 0.01, 0.41, 0.17, 1.02, 104, 1322],
       [36392174, 29565030, 25457245, 0.09, 0.01, 0.25, 0.16, 0.76, 93, 1129]],
    pub=dict(
        t=[[0.443, 0.524, 0.425, 0.143, 0, 0.640, 0, 0.119, 0.479, 0.388],
           [1, 1, 1, 0.143, 1, 1, 0.933, 0.560, 0, 0],
           [0, 0, 0, 1, 1, 0.160, 0.133, 0, 1, 1],
           [0.453, 0.566, 0.428, 0.429, 0, 0.640, 0.400, 0.833, 0.288, 0.447],
           [0.221, 0.311, 0.214, 0, 1, 0.640, 1, 0.690, 0.779, 0.831],
           [0.285, 0.501, 0.245, 0.429, 1, 0, 0.933, 1, 0.805, 0.866]],
        G=[0.111, 0.113, 0.111, 0.152, 0.191, 0.146, 0.139, 0.137, 0.183, 0.185],
        Q=[[0.006, 0.006, 0.006, -0.021, -0.071, 0.016, -0.047, -0.034, -0.005, -0.019],
           [0.051, 0.043, 0.053, -0.021, 0.050, 0.052, 0.039, 0.007, -0.063, -0.065],
           [-0.030, -0.035, -0.029, 0.078, 0.050, -0.031, -0.035, -0.045, 0.058, 0.054],
           [0.007, 0.009, 0.006, 0.012, -0.071, 0.016, -0.010, 0.032, -0.028, -0.012],
           [-0.012, -0.011, -0.011, -0.037, 0.050, 0.016, 0.045, 0.019, 0.031, 0.034],
           [-0.007, 0.004, -0.009, 0.012, 0.050, -0.047, 0.039, 0.047, 0.035, 0.038]],
        S=[-0.162, 0.146, 0.035, -0.038, 0.124, 0.162],
        ranking=[6, 2, 4, 5, 3, 1]),
)
FIXTURES = [F1, F2, F3]


def check_fixture(f):
    res = mabac(f['X'], f['w'], f['types'])
    pub = f['pub']
    print(f"== {f['name']}")
    print(f"  sum w = {sum(f['w']):.4f}")
    for key in ('t', 'V', 'G', 'Q', 'S'):
        if key in pub:
            print(f'  {key}: max|ours - published| {mx(res[key], pub[key]):.5f}')
    print(f"  G  {fmt(res['G'])}")
    print(f"  S  {fmt(res['S'])}")
    rk = rank_desc(res['S'])
    print(f"  ranking ours {rk.tolist()} {'MATCH' if rk.tolist() == pub['ranking'] else 'MISMATCH'} (published {pub['ranking']})")
    if 'Q' in pub:
        s_from_q = np.asarray(pub['Q']).sum(1)
        print(f"  S from printed Q rows {fmt(s_from_q, 4)}; max|diff| vs printed S {mx(s_from_q, pub['S']):.4f}")
    return res


# ---------------------------------------------------------------- libraries (divergence only)
def libraries():
    out = {}
    try:
        import matplotlib
        matplotlib.use('Agg')
        from pyDecision.algorithm import mabac_method
        out['pyDecision (no weights)'] = lambda X, w, t: mabac_method(np.asarray(X, float), ['max' if x == 'benefit' else 'min' for x in t],
                                                                    graph=False, verbose=False)
    except Exception as e:  # noqa: BLE001
        print(f'  pyDecision not available: {type(e).__name__}')
    try:
        from pymcdm.methods import MABAC as PM
        out['pymcdm'] = lambda X, w, t: PM()(np.asarray(X, float), np.asarray(w, float), np.array([1 if x == 'benefit' else -1 for x in t]))
    except Exception as e:  # noqa: BLE001
        print(f'  pymcdm not available: {type(e).__name__}')
    try:
        from pyrepo_mcda.mcda_methods import MABAC as PR
        fn = lambda X, w, t: PR()(np.asarray(X, float), np.asarray(w, float), np.array([1 if x == 'benefit' else -1 for x in t]))  # noqa: E731
        try:
            fn([[1., 2], [2, 1]], [.5, .5], ['benefit', 'benefit'])
            out['pyrepo-mcda'] = fn
        except AttributeError as e:
            print(f'  pyrepo-mcda MABAC fails on numpy {np.__version__}: {e}; rerun with np.product = np.prod')
            np.product = np.prod
            out['pyrepo-mcda (np.product patched)'] = fn
    except Exception as e:  # noqa: BLE001
        print(f'  pyrepo-mcda not available: {type(e).__name__}')
    return out


def random_problem(m=None, n=None, neg=False):
    m = m or int(RNG.integers(2, 9))
    n = n or int(RNG.integers(2, 8))
    X = RNG.uniform(-50 if neg else 1, 100, (m, n))
    types = ['benefit' if RNG.random() < 0.6 else 'cost' for _ in range(n)]
    w = RNG.dirichlet(np.ones(n))
    return X, w, types


def main():
    results = [check_fixture(f) for f in FIXTURES]

    f1 = results[0]
    print('== F1 notes')
    print(f"  v11 printed 0.171, text computes 0.146*0.173+0.146 = 0.170; ours {f1['V'][0, 0]:.4f}")
    print(f"  Table 16 S1/S2 (affine Likert rescale y = 2x - 1 on C3, C4): MABAC S unchanged by construction")
    X2 = np.asarray(F1['X'], float).copy()
    X2[:, 2:4] = 2 * X2[:, 2:4] - 1
    print(f"    ours: max|S(scale 2) - S(scale 1)| = {mx(mabac(X2, F1['w'], F1['types'])['S'], f1['S']):.1e}")

    print('== F3 notes')
    r3 = results[2]
    print(f"  Table 9 (V) prints 3 d.p.; G ours {fmt(r3['G'], 4)}")

    print('== libraries')
    libs = libraries()
    for name, fn in libs.items():
        diffs, ranks = [], []
        for fx, res in zip(FIXTURES, results):
            with contextlib.redirect_stdout(io.StringIO()):
                s = np.asarray(fn(fx['X'], fx['w'], fx['types']), float)
            diffs.append(mx(s, res['S']))
            ranks.append(rank_desc(s).tolist() == rank_desc(res['S']).tolist())
        print(f'  {name}: max|S - ours| F1 {diffs[0]:.1e}, F2 {diffs[1]:.1e}, F3 {diffs[2]:.1e}; same ranking {ranks}')
        if name.startswith('pyDecision'):
            for fx, res in zip(FIXTURES, results):
                n = len(fx['w'])
                m = len(fx['X'])
                eq = mabac(fx['X'], np.full(n, 1 / n), fx['types'])['S']
                with contextlib.redirect_stdout(io.StringIO()):
                    s = np.asarray(fn(fx['X'], fx['w'], fx['types']), float)
                # per-column rescale workaround: S = sum_j m w_j S_py(X[:, j])
                cols = [np.asarray(fn(np.asarray(fx['X'], float)[:, [j]], None, [fx['types'][j]]), float) for j in range(n)]
                ws = sum(m * fx['w'][j] * cols[j] for j in range(n))
                print(f"    {fx['name'][:2]}: S_py = (n/m) * S_equal-weights: {mx(s, n / m * eq):.1e}; "
                      f"per-column rescale reproduces ours: {mx(ws, res['S']):.1e}")

    # ---------------------------------------------------------------- identity with SAW (min-max)
    print('== identity S_i = SAW_minmax_i - B,  B = sum_j w_j (GM_i(1 + t_ij) - 1)')
    for fx, res in zip(FIXTURES, results):
        saw = saw_minmax(fx['X'], fx['w'], fx['types'])
        B = saw - res['S']
        print(f"  {fx['name'][:2]}: B = {B.mean():.6f} (spread {np.ptp(B):.1e}); mean SAW_mm {saw.mean():.6f} >= B; "
              f"rank(S) == rank(SAW_mm): {rank_desc(res['S']).tolist() == rank_desc(saw).tolist()}")
    worst, diff_rank, min_gap, maxS_pos = 0.0, 0, np.inf, 0
    N = 2000
    for _ in range(N):
        X, w, types = random_problem()
        res = mabac(X, w, types)
        saw = saw_minmax(X, w, types)
        B = saw - res['S']
        worst = max(worst, float(np.ptp(B)))
        diff_rank += rank_desc(res['S']).tolist() != rank_desc(saw).tolist()
        min_gap = min(min_gap, saw.mean() - B[0])
        maxS_pos += res['S'].max() > 0
    print(f'  random {N} (m 2-8, n 2-7, Dirichlet w, mixed types): max spread of SAW_mm - S {worst:.1e}; '
          f'ranking differs {diff_rank}/{N}; min(mean SAW_mm - B) {min_gap:.2e} (>= 0: AM-GM); max S > 0 in {maxS_pos}/{N}')

    # ---------------------------------------------------------------- invariances
    print('== invariances')
    worst_aff, recip_change = 0.0, 0
    N = 1000
    for _ in range(N):
        X, w, types = random_problem(neg=True)
        a = RNG.uniform(0.01, 100, X.shape[1])
        b = RNG.uniform(-1000, 1000, X.shape[1])
        worst_aff = max(worst_aff, mx(mabac(X, w, types)['S'], mabac(a * X + b, w, types)['S']))
        Xp, w2, types2 = random_problem()
        j = 0
        Xr = Xp.copy()
        Xr[:, j] = 60 / Xp[:, j]
        t2 = list(types2)
        t2[j] = 'cost' if types2[j] == 'benefit' else 'benefit'
        recip_change += rank_desc(mabac(Xp, w2, types2)['S']).tolist() != rank_desc(mabac(Xr, w2, t2)['S']).tolist()
    print(f'  per-column x -> a x + b (a > 0, |b| <= 1000, negatives in data): max|dS| {worst_aff:.1e} over {N}')
    print(f'  one column x -> 60 / x with benefit<->cost swapped (origin IFC case 2): ranking changes in {recip_change}/{N}')
    print(f'  complement x -> C - x with type swap (IFC case 1) is affine with a < 0 + type swap: S identical by construction')

    # ---------------------------------------------------------------- edge cases
    print('== edge cases')
    X, w, types = random_problem(m=5, n=4)
    Xc = np.column_stack([X, np.full(5, 7.0)])
    wc = np.append(w * 0.8, 0.2)
    tc = types + ['benefit']
    s0 = mabac(Xc, wc, tc, constant=0.0)
    s1 = mabac(Xc, wc, tc, constant=1.0)
    sd = mabac(X, w * 0.8, types)
    print(f"  constant column: q column zeros {np.allclose(s0['Q'][:, -1], 0)}; t=0 vs t=1 (pymcdm/pyrepo): max|dS| {mx(s0['S'], s1['S']):.1e}; "
          f"vs dropping the column: {mx(s0['S'], sd['S']):.1e}")
    wz = np.append(w, 0.0)
    Xz = np.column_stack([X, RNG.uniform(1, 9, 5)])
    sz = mabac(Xz, wz, types + ['benefit'])
    print(f"  zero weight: v = 0, G = {sz['G'][-1]:.1f}, q column zeros {np.allclose(sz['Q'][:, -1], 0)}; S equals without it: "
          f"{mx(sz['S'], mabac(X, w, types)['S']):.1e}")
    eq = mabac(np.ones((4, 3)) * 5, [0.2, 0.3, 0.5], ['benefit', 'cost', 'benefit'])
    print(f"  all alternatives equal: S = {fmt(eq['S'], 3)} (all tie at 0)")
    one = mabac([[3.0, 4.0]], [0.5, 0.5], ['benefit', 'cost'])
    print(f"  single alternative: t = {one['t'].tolist()}, S = {one['S'].tolist()} (meaningless; blocked by MIN_ALTERNATIVES)")
    neg = mabac([[-3, 2], [0, -1], [5, 4]], [0.6, 0.4], ['benefit', 'cost'])
    print(f"  negative/zero raw values: S = {fmt(neg['S'], 4)} (min-max, no restriction)")

    # m = 2: G_j = w_j * sqrt(2) for a non-constant column
    two = mabac([[1, 9], [4, 2]], [0.7, 0.3], ['benefit', 'benefit'])
    print(f"  m = 2: G / w = {fmt(two['G'] / np.array([0.7, 0.3]), 6)} (sqrt 2 = {np.sqrt(2):.6f}); S = {fmt(two['S'], 4)}, "
          f"sum S = {two['S'].sum():.4f} = (3 - 2 sqrt 2) * sum w = {3 - 2 * np.sqrt(2):.4f}")
    # sign balance: how often an alternative with S > 0 exists, share of positive S by m
    for m in (2, 3, 5, 10, 50):
        pos = []
        for _ in range(300):
            X, w, types = random_problem(m=m, n=5)
            pos.append((mabac(X, w, types)['S'] > 0).mean())
        print(f'  m = {m:>2}: mean share of alternatives with S > 0: {np.mean(pos):.3f}')

    # underflow of prod(v) ** (1/m) for large m
    for m in (100, 300, 400, 1000):
        X, w, types = random_problem(m=m, n=10)
        a = mabac(X, w, types, geo='log')
        b = mabac(X, w, types, geo='prod')
        print(f"  m = {m:>4}, n = 10: G via prod**(1/m) zero in {int((b['G'] == 0).sum())}/10 columns; "
              f"max|S_prod - S_log| {mx(a['S'], b['S']):.1e}; ranking same {rank_desc(a['S']).tolist() == rank_desc(b['S']).tolist()}")

    # rank reversal when one alternative is removed (B moves, but S = SAW_mm - B; min-max ranges move)
    rr = 0
    N = 1000
    for _ in range(N):
        X, w, types = random_problem(m=int(RNG.integers(3, 9)))
        r_full = rank_desc(mabac(X, w, types)['S'])
        k = int(RNG.integers(0, X.shape[0]))
        keep = [i for i in range(X.shape[0]) if i != k]
        r_sub = rank_desc(mabac(X[keep], w, types)['S'])
        order_full = [i for i in np.argsort(r_full, kind='stable') if i != k]
        order_sub = [keep[i] for i in np.argsort(r_sub, kind='stable')]
        rr += order_full != order_sub
    print(f'  remove one random alternative: order of the rest changes in {rr}/{N} (same rate as SAW min-max by the identity)')


if __name__ == '__main__':
    main()
