"""Independent CoCoSo recomputation (numpy only) against published examples, plus library and property checks.

Fixtures
  F1  Yazdani, Zarate, Zavadskas & Turskis (2019), Management Decision 57(9):2501-2519, DOI 10.1108/MD-05-2017-0458,
      section 3.1, Tables I, III-VI (logistics providers, 7 x 5).
  F2  Same paper, section 3.2.3, Tables X-XI (green suppliers, 10 x 7; data from Yazdani et al. 2017).
  F3  Akgul (2021), Ekonomi ve Finansal Arastirmalar Dergisi 3(2):71-90, Tables 4, 7, 9-12 (CRITIC -> CoCoSo,
      9 banks x 9 criteria, year 2016; Turkish).
Also: pyDecision cocoso_method, pymcdm COCOSO, pyrepo-mcda COCOSO (divergence only; skipped when not importable),
algebraic properties, lambda sweep, edge cases on random problems.

Run: python3 -I -W ignore cocoso.py   (numpy only; the library section runs when the interpreter has pyDecision 5.1.8,
     pymcdm 1.4.0 and pyrepo-mcda 0.1.15 installed, e.g. from a venv; cocoso.out was made that way)
"""
import io
import contextlib

import numpy as np

np.set_printoptions(legacy='1.25', precision=4, suppress=True, linewidth=160)
RNG = np.random.default_rng(20261018)


def cocoso(X, w, types, lam=0.5, constant='zeros'):
    """Crisp CoCoSo, Yazdani et al. 2019 Eqs. 2-9. Min-max normalization; 0**w = 0 (numpy) for w > 0.
    constant: what a constant column becomes ('zeros' = this project's minMaxNormalize, 'ones' = pymcdm)."""
    X = np.asarray(X, float)
    w = np.asarray(w, float)
    cost = np.array([t == 'cost' for t in types])
    lo, hi = X.min(0), X.max(0)
    rng = hi - lo
    flat = rng == 0
    safe = np.where(flat, 1.0, rng)
    r = np.where(cost, (hi - X) / safe, (X - lo) / safe)               # Eqs. 2-3
    r[:, flat] = 0.0 if constant == 'zeros' else 1.0
    S = (r * w).sum(1)                                                  # Eq. 4
    P = (r ** w).sum(1)                                                 # Eq. 5 (a sum of powers, not a product)
    ka = (P + S) / (P + S).sum()                                        # Eq. 6
    with np.errstate(divide='ignore', invalid='ignore'):
        kb = S / S.min() + P / P.min()                                  # Eq. 7
    kc = (lam * S + (1 - lam) * P) / (lam * S.max() + (1 - lam) * P.max())   # Eq. 8
    k = np.cbrt(ka * kb * kc) + (ka + kb + kc) / 3                      # Eq. 9
    return dict(r=r, S=S, P=P, ka=ka, kb=kb, kc=kc, k=k)


def rank_desc(s, tol=1e-9):
    s = np.asarray(s, float)
    return np.array([1 + int(np.sum(s > v + tol)) for v in s])


def mx(a, b):
    return float(np.max(np.abs(np.asarray(a, float) - np.asarray(b, float))))


def fmt(v, d=6):
    return '[' + ', '.join(f'{x:.{d}f}' for x in np.asarray(v, float)) + ']'


# ---------------------------------------------------------------- fixtures
F1 = dict(
    name='F1 Yazdani et al. 2019, section 3.1 (Tables I, III-VI)',
    types=['benefit', 'cost', 'benefit', 'benefit', 'benefit'],
    w=[0.036, 0.192, 0.326, 0.326, 0.12],
    X=[[60, 0.4, 2540, 500, 990], [6.35, 0.15, 1016, 3000, 1041], [6.8, 0.1, 1727.2, 1500, 1676],
       [10, 0.2, 1000, 2000, 965], [2.5, 0.1, 560, 500, 915], [4.5, 0.08, 1016, 350, 508],
       [3, 0.1, 1778, 1000, 920]],
    pub=dict(
        r=[[1, 0, 1, 0.0566, 0.4127], [0.067, 0.7813, 0.2303, 1, 0.4563], [0.0748, 0.9375, 0.5895, 0.434, 1],
           [0.1304, 0.625, 0.2222, 0.6226, 0.3913], [0, 0.9375, 0, 0.0566, 0.3485], [0.0348, 1, 0.2303, 0, 0],
           [0.0087, 0.9375, 0.6152, 0.2453, 0.3527]],
        Ppow=[[1, 0, 1, 0.3921, 0.8992], [0.9073, 0.9537, 0.6196, 1, 0.9102], [0.9109, 0.9877, 0.8417, 0.7617, 1],
              [0.9293, 0.9137, 0.6124, 0.8569, 0.8935], [0, 0.9877, 0, 0.3921, 0.8812], [0.8861, 1, 0.6196, 0, 0],
              [0.843, 0.988, 0.8535, 0.6325, 0.8825]],
        S=[0.43, 0.6082, 0.6363, 0.4471, 0.2403, 0.2683, 0.5031],
        P=[3.2914, 4.3907, 4.502, 4.2058, 2.261, 2.5057, 4.1991],
        ka=[0.131, 0.175, 0.18, 0.163, 0.088, 0.097, 0.165],
        kb=[3.245, 4.473, 4.64, 3.721, 2, 2.225, 3.951],
        kc=[0.724, 0.973, 1, 0.906, 0.487, 0.54, 0.915],
        k=[2.041, 2.788, 2.882, 2.416, 1.3, 1.443, 2.52],
        ranking=[5, 2, 1, 4, 7, 6, 3]),
)
F2 = dict(
    name='F2 Yazdani et al. 2019, section 3.2.3 (Tables X-XI)',
    types=['benefit', 'cost', 'cost', 'benefit', 'benefit', 'benefit', 'benefit'],
    w=[0.132, 0.135, 0.138, 0.162, 0.09, 0.223, 0.12],
    X=[[0.068, 0.066, 0.15, 0.098, 0.156, 0.114, 0.098], [0.078, 0.076, 0.108, 0.136, 0.082, 0.171, 0.105],
       [0.157, 0.114, 0.128, 0.083, 0.108, 0.113, 0.131], [0.106, 0.139, 0.058, 0.074, 0.132, 0.084, 0.12],
       [0.103, 0.187, 0.125, 0.176, 0.074, 0.064, 0.057], [0.105, 0.083, 0.15, 0.051, 0.134, 0.094, 0.113],
       [0.137, 0.127, 0.056, 0.133, 0.122, 0.119, 0.114], [0.1, 0.082, 0.086, 0.06, 0.062, 0.109, 0.093],
       [0.053, 0.052, 0.043, 0.1, 0.05, 0.078, 0.063], [0.094, 0.074, 0.097, 0.087, 0.08, 0.054, 0.106]],
    pub=dict(
        ka=[0.0974, 0.1177, 0.1142, 0.1113, 0.0742, 0.0832, 0.1205, 0.1072, 0.0778, 0.0964],
        kb=[2.8816, 3.6851, 3.3882, 3.1467, 2, 2.4779, 3.8388, 2.8991, 2.3485, 2.595],
        kc=[0.8087, 0.9772, 0.9477, 0.9236, 0.6158, 0.6906, 1, 0.89, 0.6457, 0.8],
        k=[1.8727, 2.3446, 2.1991, 2.0803, 1.3471, 1.6061, 2.4265, 1.9503, 1.5145, 1.7488],
        ranking=[6, 2, 3, 4, 10, 8, 1, 5, 9, 7]),
)
F3 = dict(
    name='F3 Akgul 2021, CRITIC -> CoCoSo, 2016 (Tables 4, 7, 9-12)',
    types=['benefit'] * 7 + ['cost', 'cost'],
    w=[0.0839, 0.0853, 0.0879, 0.0833, 0.0956, 0.0828, 0.0807, 0.1951, 0.2054],
    X=[[311626, 204257, 177360, 35961, 4500, 4701, 718493, 1374, 24756],
       [231441, 158354, 150263, 21317, 1250, 2558, 911260, 964, 16956],
       [212540, 147712, 123838, 19239, 2500, 2703, 1769710, 924, 15615],
       [252820, 172624, 154275, 26119, 4347, 2933, 1168672, 936, 18366],
       [271016, 161828, 158878, 30655, 4000, 4529, 1417631, 841, 13843],
       [101503, 62900, 53939, 10126, 3150, 1203, 815224, 630, 12451],
       [23819, 17606, 16136, 2533, 1158, 125, 522138, 273, 3611],
       [8218, 5071, 3383, 595, 420, 14, 8714, 44, 809],
       [284155, 186048, 161232, 35539, 4200, 5071, 1515797, 968, 19689]],
    pub=dict(
        S=[0.5453, 0.4799, 0.5403, 0.5878, 0.6834, 0.4336, 0.4061, 0.4004, 0.6594],
        P=[6.9230, 8.2343, 8.3722, 8.4145, 8.5925, 8.1526, 7.5714, 2.0000, 8.4750],
        ka=[0.1045, 0.1219, 0.1247, 0.1260, 0.1298, 0.1201, 0.1116, 0.0336, 0.1278],
        kb=[4.8235, 5.3158, 5.5355, 5.6753, 6.0029, 5.1592, 4.8000, 2.0000, 5.8842],
        kc=[0.8051, 0.9395, 0.9608, 0.9705, 1.0000, 0.9256, 0.8600, 0.2588, 0.9847],
        k=[2.6514, 2.9733, 3.0791, 3.1425, 3.2977, 2.8993, 2.6963, 1.0232, 3.2370],
        ranking=[8, 5, 4, 3, 1, 6, 7, 9, 2]),
)
FIXTURES = [F1, F2, F3]


def check_fixture(f):
    res = cocoso(f['X'], f['w'], f['types'])
    pub = f['pub']
    print(f"== {f['name']}")
    print(f"  sum w = {sum(f['w']):.4f}")
    for key in ('S', 'P', 'ka', 'kb', 'kc', 'k'):
        line = f'  {key:<3}{fmt(res[key])}'
        if key in pub:
            line += f'  max|diff| {mx(res[key], pub[key]):.5f}'
        print(line)
    rk = rank_desc(res['k'])
    print(f"  ranking ours {rk.tolist()} {'MATCH' if rk.tolist() == pub['ranking'] else 'MISMATCH'} (published {pub['ranking']})")
    for key in ('ka', 'kb', 'kc'):
        same = rank_desc(res[key]).tolist() == rk.tolist()
        print(f'    rank({key}) == rank(k): {same}')
    return res


# ---------------------------------------------------------------- libraries (divergence only)
def libraries():
    out = {}
    try:
        import matplotlib
        matplotlib.use('Agg')
        from pyDecision.algorithm import cocoso_method
        out['pyDecision'] = lambda X, w, t: cocoso_method(np.asarray(X, float), ['max' if x == 'benefit' else 'min' for x in t],
                                                         np.asarray(w, float), L=0.5, graph=False, verbose=False)
    except Exception as e:  # noqa: BLE001
        print(f'  pyDecision not available: {type(e).__name__}')
    try:
        from pymcdm.methods import COCOSO as PM
        out['pymcdm'] = lambda X, w, t: PM()(np.asarray(X, float), np.asarray(w, float), np.array([1 if x == 'benefit' else -1 for x in t]))
    except Exception as e:  # noqa: BLE001
        print(f'  pymcdm not available: {type(e).__name__}')
    try:
        from pyrepo_mcda.mcda_methods import COCOSO as PR
        out['pyrepo-mcda'] = lambda X, w, t: PR()(np.asarray(X, float), np.asarray(w, float), np.array([1 if x == 'benefit' else -1 for x in t]))
    except Exception as e:  # noqa: BLE001
        print(f'  pyrepo-mcda not available: {type(e).__name__}')
    return out


def main():
    results = [check_fixture(f) for f in FIXTURES]

    # F1 table-level checks
    f, res = F1, results[0]
    X = np.asarray(f['X'], float)
    print('== F1 table checks')
    print(f"  Table III (r) max|diff| {mx(res['r'], f['pub']['r']):.5f}")
    print(f"  Table V (r**w) max|diff| {mx(res['r'] ** np.asarray(f['w']), f['pub']['Ppow']):.5f}"
          f"; A7/C2 printed 0.988, ours {res['r'][6, 1] ** 0.192:.4f}; A3/A5 C2 printed 0.9877 (same r = 0.9375)")
    sumnorm = X / X.sum(0)
    print(f'  Table II is x / sum(x): A1 C1 60/93.15 = {sumnorm[0, 0]:.4f} (printed 0.6441), A1 C2 = {sumnorm[0, 1]:.4f} (0.3540)')
    k_from_printed = np.cbrt(np.prod([f['pub'][x] for x in ('ka', 'kb', 'kc')], axis=0)) + np.sum([f['pub'][x] for x in ('ka', 'kb', 'kc')], axis=0) / 3
    print(f"  k from printed ka, kb, kc: {fmt(k_from_printed, 4)}; max|diff| vs printed k {mx(k_from_printed, f['pub']['k']):.4f}")

    # F3 normalized-matrix spot checks
    r3 = results[2]['r']
    print(f"== F3 Table 9 spot checks: BNK1 CR6 {r3[0, 5]:.4f} (0.9270), BNK5 CR8 {r3[4, 7]:.4f} (0.4008), "
          f"BNK9 CR9 {r3[8, 8]:.4f} (0.2116); zero cells in r: {int((r3 == 0).sum())}")

    print('== libraries (L = 0.5)')
    libs = libraries()
    for name, fn in libs.items():
        diffs = []
        for fx, res in zip(FIXTURES, results):
            with contextlib.redirect_stdout(io.StringIO()):
                diffs.append(mx(fn(fx['X'], fx['w'], fx['types']), res['k']))
        print(f'  {name}: max|k - ours| F1 {diffs[0]:.1e}, F2 {diffs[1]:.1e}, F3 {diffs[2]:.1e}')

    # ---------------------------------------------------------------- properties
    print('== properties on the fixtures')
    for fx, res in zip(FIXTURES, results):
        ratio = res['kc'] / res['ka']
        S, P = res['S'], res['P']
        print(f"  {fx['name'][:2]}: kc/ka spread at lambda 0.5 = {np.ptp(ratio):.1e} (constant {ratio[0]:.4f}); "
              f"min kb = {res['kb'].min():.4f}; mean S {S.mean():.3f}, mean P {P.mean():.3f}; "
              f"share of P in lambda=0.5 numerator, mean {np.mean(P / (S + P)):.3f}")
    print('== lambda sweep 0, 0.1, ..., 1 on the fixtures')
    for fx in FIXTURES:
        ranks = {lam: rank_desc(cocoso(fx['X'], fx['w'], fx['types'], lam)['k']).tolist() for lam in np.round(np.linspace(0, 1, 11), 1)}
        base = ranks[0.5]
        changed = [lam for lam, rk in ranks.items() if rk != base]
        print(f"  {fx['name'][:2]}: lambdas whose ranking differs from 0.5: {changed}")
        for lam in changed:
            print(f'     lambda {lam}: {ranks[lam]} vs {base}')

    # ---------------------------------------------------------------- random problems
    N = 2000
    stats = dict(worst=0, lam_change=0, k_eq_kb=0, k_eq_kb_n=0, ones_change=0, ones_n=0, zero_w_change=0, zero_w_n=0,
                 drop_same=0, shift_scale=0.0, k_eq_saw=0, hack_change=0, hack_n=0, k_eq_sp=0, lam_mid=0)
    worst_by_n = {}
    for _ in range(N):
        m = int(RNG.integers(3, 9))
        n = int(RNG.integers(2, 8))
        X = RNG.uniform(1, 10, (m, n)).round(1)
        types = ['cost' if c else 'benefit' for c in RNG.random(n) < 0.3]
        w = RNG.dirichlet(np.ones(n))
        res = cocoso(X, w, types)
        worst = bool(res['S'].min() == 0)
        worst_by_n.setdefault(n, [0, 0])
        worst_by_n[n][0] += worst
        worst_by_n[n][1] += 1
        if worst:
            stats['worst'] += 1
            # pyDecision's hack: S + 1 (and P + 1) when the minimum is 0
            S1, P1 = res['S'] + 1, res['P'] + 1
            ka = (S1 + P1) / (S1 + P1).sum()
            kb = S1 / S1.min() + P1 / P1.min()
            kc = (S1 + P1) / (S1.max() + P1.max())
            kh = np.cbrt(ka * kb * kc) + (ka + kb + kc) / 3
            # with min S + 1 = min P + 1 = 1, kb = S + P + 2: all three k's follow the S + P order
            stats['hack_n'] += 1
            stats['hack_change'] += rank_desc(kh).tolist() != rank_desc(res['S'] + res['P']).tolist()
            continue
        rk = rank_desc(res['k']).tolist()
        stats['k_eq_kb'] += rk == rank_desc(res['kb']).tolist()
        stats['k_eq_kb_n'] += 1
        stats['k_eq_saw'] += rk == rank_desc(res['S']).tolist()
        stats['k_eq_sp'] += rk == rank_desc(res['S'] + res['P']).tolist()
        stats['lam_mid'] += any(rank_desc(cocoso(X, w, types, lam)['k']).tolist() != rk for lam in (0.3, 0.4, 0.6, 0.7))
        if any(rank_desc(cocoso(X, w, types, lam)['k']).tolist() != rk for lam in np.linspace(0, 1, 11)):
            stats['lam_change'] += 1
        # shift and scale invariance (negative values allowed): x -> a x + b per column, a > 0
        a = RNG.uniform(0.01, 100, n)
        b = RNG.uniform(-1000, 1000, n)
        stats['shift_scale'] = max(stats['shift_scale'], mx(cocoso(X * a + b, w, types)['k'], res['k']))
        # a constant column: zeros (ours) equals dropping it; ones (pymcdm) can reorder
        Xc = np.column_stack([X, np.full(m, 5.0)])
        wc = np.append(w * 0.8, 0.2)
        tc = types + ['benefit']
        zeros_k = cocoso(Xc, wc, tc, constant='zeros')['k']
        drop_k = cocoso(X, w * 0.8, types)['k']
        stats['drop_same'] += mx(zeros_k, drop_k) < 1e-12
        stats['ones_n'] += 1
        stats['ones_change'] += rank_desc(cocoso(Xc, wc, tc, constant='ones')['k']).tolist() != rank_desc(zeros_k).tolist()
        # a criterion with weight 0 adds 0**0 = 1 to every P
        Xz = np.column_stack([X, RNG.uniform(1, 10, m)])
        rz = cocoso(Xz, np.append(w, 0.0), types + ['benefit'])
        stats['zero_w_n'] += 1
        stats['zero_w_change'] += rank_desc(rz['k']).tolist() != rk
    nn = stats['k_eq_kb_n']
    print(f'== random {N} problems (m 3..8, n 2..7, x in [1, 10] rounded to 0.1, 30 % cost, Dirichlet weights)')
    print(f"  some alternative worst on every criterion (min S = min P = 0, kb divides by 0): {stats['worst']}/{N}")
    print('    by n: ' + ', '.join(f'n={k}: {v[0]}/{v[1]}' for k, v in sorted(worst_by_n.items())))
    print(f"    pyDecision '+1' hack: ranking differs from plain S + P order in {stats['hack_change']}/{stats['hack_n']} (kb becomes S + P + 2)")
    print(f"  of the remaining {nn}:")
    print(f"    rank(k) == rank(kb): {stats['k_eq_kb']}/{nn}; rank(k) == rank(S + P) (= rank ka = rank kc at 0.5): {stats['k_eq_sp']}/{nn}; rank(k) == rank(S) (SAW min-max): {stats['k_eq_saw']}/{nn}")
    print(f"    ranking changes somewhere on the lambda grid 0..1: {stats['lam_change']}/{nn}; within 0.3..0.7: {stats['lam_mid']}/{nn}")
    print(f"    per-column x -> a x + b (a > 0, b may make values negative): max|k diff| {stats['shift_scale']:.1e}")
    print(f"    constant column as zeros == column dropped (weights kept): {stats['drop_same']}/{stats['ones_n']}; "
          f"as ones (pymcdm) reorders: {stats['ones_change']}/{stats['ones_n']}")
    print(f"    an extra criterion with weight 0 (adds 1 to every P) reorders: {stats['zero_w_change']}/{stats['zero_w_n']}")

    # ---------------------------------------------------------------- edge cases
    print('== edge cases')
    eps = [0.1, 0.01, 1e-3, 1e-6]
    print('  the cliff at r = 0: r**0.2 for r = ' + ', '.join(f'{e:g} -> {e ** 0.2:.3f}' for e in eps) + ', 0 -> 0')
    eq = cocoso(np.ones((4, 3)) * 7, [0.3, 0.3, 0.4], ['benefit'] * 3)
    print(f"  all alternatives equal: S {eq['S']}, P {eq['P']}, kb {eq['kb']}, k {eq['k']}")
    Xw = [[1, 9, 1], [3, 2, 7], [5, 4, 2], [2, 1, 3]]
    ww = cocoso(Xw, [0.4, 0.3, 0.3], ['benefit', 'cost', 'benefit'])
    print(f"  A1 worst on every criterion: S {fmt(ww['S'], 4)}, P {fmt(ww['P'], 4)}, kb {ww['kb']}, k {ww['k']}")
    one = cocoso([[1, 2, 3]], [0.3, 0.3, 0.4], ['benefit'] * 3)
    print(f"  single alternative: r {one['r']}, k {one['k']}")
    # two alternatives: one is best everywhere -> other is worst everywhere
    two = cocoso([[1, 2], [2, 3]], [0.5, 0.5], ['benefit'] * 2)
    print(f"  m = 2, A2 better on both: S {two['S']}, kb {two['kb']}")


if __name__ == '__main__':
    main()
