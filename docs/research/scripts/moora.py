"""Independent MOORA (Ratio System) recomputation (numpy only) against published examples,
plus library and property checks.

Fixtures
  F1   Brauers & Zavadskas (2010), Technological and Economic Development of Economy 16(1):5-24,
       DOI 10.3846/tede.2010.01, Appendix C Table 2 (2a raw matrix, 2b normalized, 2c ratio system;
       3 projects x 9 criteria, 7 benefit + 2 cost). Tested both unweighted (w = 1, as printed in Table 2c)
       and with normalized equal weights (w_j = 1/9, workbench convention: scales S+, S-, y by 1/9).
  F2a  Brauers & Zavadskas (2006), Control and Cybernetics 35(2):445-469 (origin paper), Table 1 (p. 450,
       privatization in a welfare economy, 3 projects x 7 criteria, 6 benefit + 1 cost).
  F2b  Same paper, Table 5 (p. 464, privatization in a wellbeing economy, 3 projects x 8 criteria,
       6 benefit + 2 cost).
  F3a  Vujicic, Papic & Blagojevic (2017), Tehnika 72(3):422-429, DOI 10.5937/tehnika1703422V,
       Tables 2, 4, 7a Variant 1 (Entropy -> MOORA, 9 air conditioners x 5 criteria, 2 benefit + 3 cost).
  F3b  Same paper, Tables 2, 6, 7b Variant 1 (CRITIC -> MOORA, 9 air conditioners x 5 criteria).
Also: Brauers, Zavadskas, Turskis & Vilutiene (2008) contractor example audit (internal table discrepancies),
pyDecision moora_method, pymcdm MOORA, pyrepo-mcda MOORA (when importable), algebraic properties,
and edge cases on 2,000 random problems.

Run: python3 -I -W ignore docs/research/scripts/moora.py
"""
import contextlib
import io
import numpy as np

np.set_printoptions(legacy='1.25', precision=6, suppress=True, linewidth=160)
RNG = np.random.default_rng(20261024)


def moora(X, w, types):
    """Weighted MOORA Ratio System (Brauers & Zavadskas 2006 Eqs. 2-3; 2009/2010 weighted form).
    Vector normalization x*_ij = x_ij / sqrt(sum_i x_ij^2); zero column stays 0.
    v_ij = w_j * x*_ij; S+_i = sum_{j in B} v_ij; S-_i = sum_{j in C} v_ij; y_i = S+_i - S-_i.
    """
    X = np.asarray(X, float)
    w = np.asarray(w, float)
    norms = np.sqrt((X ** 2).sum(0))
    zero_cols = norms == 0
    safe_norms = np.where(zero_cols, 1.0, norms)
    r = np.where(zero_cols, 0.0, X / safe_norms)
    v = r * w
    ben = np.array([t == 'benefit' for t in types], bool)
    cost = ~ben
    s_plus = v[:, ben].sum(1) if ben.any() else np.zeros(len(X))
    s_minus = v[:, cost].sum(1) if cost.any() else np.zeros(len(X))
    y = s_plus - s_minus
    return dict(norms=norms, r=r, v=v, s_plus=s_plus, s_minus=s_minus, y=y, zero_cols=zero_cols)


def rank_desc(s, tol=1e-9):
    s = np.asarray(s, float)
    return np.array([1 + int(np.sum(s > v + tol)) for v in s])


def mx(a, b):
    return float(np.max(np.abs(np.asarray(a, float) - np.asarray(b, float))))


def fmt(v, d=6):
    return '[' + ', '.join(f'{x:.{d}f}' for x in np.asarray(v, float)) + ']'


# ---------------------------------------------------------------- fixtures
F1 = dict(
    name='F1 Brauers & Zavadskas 2010, Appendix C Table 2 (3 projects x 9 criteria)',
    types=['benefit', 'benefit', 'cost', 'benefit', 'benefit', 'benefit', 'cost', 'benefit', 'benefit'],
    w_unweighted=[1.0] * 9,
    w_equal=[1.0 / 9.0] * 9,
    X=[
        [1.0, 14, 9, 200, 600, 20.0, 20, 3.5, 2.5],
        [1.6, 16, 7, 150, 800, 13.5, 25, 4.0, 1.5],
        [2.0, 17, 5, 80, 1200, 10.0, 30, 3.8, 1.25],
    ],
    pub=dict(
        norms=[2.749545, 27.221, 12.45, 262.4881, 1562.05, 26.12, 43.875, 6.533758, 3.1721444],
        r=[
            [0.363696, 0.5143, 0.7229, 0.761939, 0.384, 0.766, 0.4558, 0.536, 0.788],
            [0.581914, 0.5878, 0.5623, 0.571454, 0.51215, 0.5168, 0.5698, 0.612205, 0.4728662],
            [0.727393, 0.6245, 0.4016, 0.304776, 0.76822, 0.3828, 0.6838, 0.581595, 0.3940552],
        ],
        y_star=[2.93480, 2.723, 2.698],
        ranking=[1, 2, 3],
    ),
)

F2A = dict(
    name='F2a Brauers & Zavadskas 2006 (origin), Table 1 (welfare economy, 3 projects x 7 criteria)',
    types=['benefit', 'cost', 'benefit', 'benefit', 'benefit', 'benefit', 'benefit'],
    w_unweighted=[1.0] * 7,
    w_equal=[1.0 / 7.0] * 7,
    X=[
        [12, 5, 4, 4.5, 750, 700, 150],
        [10, 7, 4, 3.0, 800, 600, 200],
        [10, 8, 1, 2.5, 1000, 900, 225],
    ],
    pub=dict(
        norms=[18.54723699, 11.7473401, 5.74456265, 5.9581876, 1484.08221, 1288.4099, 336.3406012],
        y_star=[3.16759, 2.74248, 2.49314],
        ranking=[1, 2, 3],
    ),
)

F2B = dict(
    name='F2b Brauers & Zavadskas 2006 (origin), Table 5 (wellbeing economy, 3 projects x 8 criteria)',
    types=['benefit', 'cost', 'benefit', 'benefit', 'cost', 'benefit', 'benefit', 'benefit'],
    w_unweighted=[1.0] * 8,
    w_equal=[1.0 / 8.0] * 8,
    X=[
        [12, 5, 4.5, 30, 50, 750, 700, 150],
        [10, 7, 3.0, 25, 35, 800, 600, 200],
        [10, 8, 2.5, 10, 30, 1000, 900, 225],
    ],
    pub=dict(
        norms=[18.547237, 11.7473401, 5.9581876, 40.311289, 68.007353, 1484.08221, 1288.4099, 336.3406012],
        y_star=[2.4802701, 2.151696, 2.126007],
        ranking=[1, 2, 3],
    ),
)

VUJICIC_X = [
    [0.87356, 0.621764706, 520, 25000, 3.160588],
    [0.900285714, 0.789785714, 550, 27500, 4.082143],
    [0.911652, 0.577609, 550, 31500, 2.815217],
    [0.95144, 0.82989, 450, 28500, 3.855556],
    [0.808, 0.837652, 530, 26000, 4.617391],
    [0.947846, 0.636308, 600, 30500, 3.006154],
    [0.95008, 0.50583, 530, 24500, 2.369167],
    [0.9325, 0.788917, 530, 26450, 3.841667],
    [0.930615, 0.791615, 750, 35000, 3.863077],
]
VUJICIC_TYPES = ['benefit', 'cost', 'benefit', 'cost', 'cost']


def entropy_weights(X):
    X = np.asarray(X, float)
    p = X / X.sum(0)
    e = -(p * np.log(p)).sum(0) / np.log(len(X))
    d = 1.0 - e
    return d / d.sum()


F3A = dict(
    name='F3a Vujicic et al. 2017, Table 7a Variant 1 (Entropy -> MOORA, 9 air conditioners x 5 criteria)',
    types=VUJICIC_TYPES,
    w=entropy_weights(VUJICIC_X).tolist(),
    w_printed=[0.024, 0.282, 0.186, 0.129, 0.378],
    X=VUJICIC_X,
    pub=dict(ranking=[4, 7, 2, 8, 9, 3, 1, 6, 5]),
)

F3B = dict(
    name='F3b Vujicic et al. 2017, Table 7b Variant 1 (CRITIC -> MOORA, 9 air conditioners x 5 criteria)',
    types=VUJICIC_TYPES,
    w=[0.263081, 0.214215, 0.154509, 0.164491, 0.203704],
    X=VUJICIC_X,
    pub=dict(ranking=[4, 7, 3, 8, 9, 2, 1, 6, 5]),
)


def libraries():
    out = {}
    try:
        import matplotlib
        matplotlib.use('Agg')
        from pyDecision.algorithm import moora_method
        out['pyDecision'] = lambda X, w, t: moora_method(
            np.asarray(X, float), np.asarray(w, float), ['max' if x == 'benefit' else 'min' for x in t],
            graph=False, verbose=False
        )[:, 1]
    except Exception as e:  # noqa: BLE001
        print(f'  pyDecision not available: {type(e).__name__}')
    try:
        from pymcdm.methods import MOORA as PM
        out['pymcdm'] = lambda X, w, t: PM()(
            np.asarray(X, float), np.asarray(w, float), np.array([1 if x == 'benefit' else -1 for x in t])
        )
    except Exception as e:  # noqa: BLE001
        print(f'  pymcdm not available: {type(e).__name__}')
    try:
        from pyrepo_mcda.mcda_methods import MOORA as PR
        out['pyrepo-mcda'] = lambda X, w, t: PR()(
            np.asarray(X, float), np.asarray(w, float), np.array([1 if x == 'benefit' else -1 for x in t])
        )
    except Exception as e:  # noqa: BLE001
        print(f'  pyrepo-mcda not available: {type(e).__name__}')
    return out


def main():
    # Unweighted origin/MULTIMOORA fixtures (tested both at w = 1 and w = 1/n)
    for fx in (F1, F2A, F2B):
        n = len(fx['types'])
        res_unw = moora(fx['X'], fx['w_unweighted'], fx['types'])
        res_eq = moora(fx['X'], fx['w_equal'], fx['types'])
        pub = fx['pub']
        print(f"== {fx['name']}")
        print(f"  norms max|ours - pub| = {mx(res_unw['norms'], pub['norms']):.2e}")
        if 'r' in pub:
            print(f"  r     max|ours - pub| = {mx(res_unw['r'], pub['r']):.2e}")
        print(f"  unweighted S+ {fmt(res_unw['s_plus'])}  S- {fmt(res_unw['s_minus'])}")
        print(f"  unweighted y* {fmt(res_unw['y'])}  max|ours - pub| = {mx(res_unw['y'], pub['y_star']):.5f}")
        print(f"  equal-w (1/{n}) S+ {fmt(res_eq['s_plus'])}  S- {fmt(res_eq['s_minus'])}")
        print(f"  equal-w (1/{n}) y  {fmt(res_eq['y'])}  max|n*y - y*| = {mx(n * res_eq['y'], res_unw['y']):.1e}")
        rk = rank_desc(res_eq['y']).tolist()
        print(f"  ranking ours {rk} {'MATCH' if rk == pub['ranking'] else 'MISMATCH'} (published {pub['ranking']})")

    # Weighted fixtures (sum w = 1)
    for fx in (F3A, F3B):
        res = moora(fx['X'], fx['w'], fx['types'])
        pub = fx['pub']
        print(f"== {fx['name']}")
        print(f"  sum w = {sum(fx['w']):.6f}")
        print(f"  S+ {fmt(res['s_plus'])}")
        print(f"  S- {fmt(res['s_minus'])}")
        print(f"  y  {fmt(res['y'])}")
        rk = rank_desc(res['y']).tolist()
        print(f"  ranking ours {rk} {'MATCH' if rk == pub['ranking'] else 'MISMATCH'} (published {pub['ranking']})")
        if 'w_printed' in fx:
            w_pr = np.asarray(fx['w_printed'], float)
            w_pr_norm = w_pr / w_pr.sum()
            rk_pr = rank_desc(moora(fx['X'], w_pr_norm, fx['types'])['y']).tolist()
            print(f"  ranking with printed 3 d.p. weights (normalized): {rk_pr} == {pub['ranking']}: {rk_pr == pub['ranking']}")

    # Brauers et al. 2008 internal discrepancy check
    print('== Brauers, Zavadskas, Turskis & Vilutiene (2008) Table 2 audit')
    X_2008 = np.array([
        [135, 1995, 117, 17, 15, 10, 8, 5, 7],
        [120, 290, 99, 15, 25, 10, 7, 5, 8],
        [100, 380, 99, 15, 12, 10, 8, 5, 7],
        [90, 50, 95, 20, 14, 5, 8, 9, 9],
        [95, 45, 77, 15, 3, 5, 9, 5, 8],
        [95, 85, 85, 15, 15, 10, 8, 5, 8],
        [130, 1565, 104, 15, 20, 10, 7, 5, 9],
        [115, 210, 104, 20, 17, 5, 6, 8, 6],
        [120, 260, 115, 15, 22, 5, 8, 9, 7],
        [120, 210, 117, 20, 14, 10, 8, 9, 7],
        [90, 160, 85, 20, 9, 5, 9, 5, 9],
        [80, 70, 90, 15, 10, 10, 8, 5, 9],
        [105, 520, 92, 15, 20, 10, 8, 5, 8],
        [110, 290, 104, 15, 14, 5, 9, 9, 8],
        [120, 240, 118, 15, 22, 5, 9, 5, 9],
    ], float)
    t_2008 = ['cost', 'benefit', 'cost', 'cost', 'cost', 'benefit', 'benefit', 'benefit', 'benefit']
    r_2008 = moora(X_2008, [1.0] * 9, t_2008)
    print(f"  col x2 norm from Table 2a = {r_2008['norms'][1]:.4f}; A1 x*_12 = {r_2008['r'][0, 1]:.4f} (Table 2b prints 0.8586, implying norm ~2323.5)")
    print(f"  recomputed from Table 2a top-3: {[f'A{i+1}' for i in np.argsort(-r_2008['y'])[:3]]} (Table 2b prints A12 > A7 > A1)")

    print('== libraries')
    libs = libraries()
    for name, fn in libs.items():
        for label, fx, w_key in [('F1 eq', F1, 'w_equal'), ('F3a', F3A, 'w'), ('F3b', F3B, 'w')]:
            res = moora(fx['X'], fx[w_key], fx['types'])
            with contextlib.redirect_stdout(io.StringIO()):
                s = np.asarray(fn(fx['X'], fx[w_key], fx['types']), float)
            print(f"  {name:<12} {label}: max|y - ours| = {mx(s, res['y']):.1e}, same ranking = {rank_desc(s).tolist() == rank_desc(res['y']).tolist()}")

    # ---------------------------------------------------------------- random problems & properties
    N = 2000
    max_scale_diff = 0.0
    max_wscale_diff = 0.0
    shift_rank_changes = 0
    neg_runs_ok = 0
    all_ben_matches_saw_vec = 0
    for _ in range(N):
        m = int(RNG.integers(3, 10))
        n = int(RNG.integers(2, 9))
        X = RNG.uniform(1, 100, (m, n))
        types = ['cost' if c else 'benefit' for c in RNG.random(n) < 0.4]
        w = RNG.dirichlet(np.ones(n))
        base = moora(X, w, types)

        # Positive column scale invariance: X[:, j] -> a_j * X[:, j] (a_j > 0)
        a = RNG.uniform(0.01, 500.0, n)
        scaled = moora(X * a, w, types)
        max_scale_diff = max(max_scale_diff, mx(scaled['y'], base['y']))

        # Weight scaling: w -> c * w scales y by c
        c = float(RNG.uniform(0.2, 10.0))
        wscaled = moora(X, c * w, types)
        max_wscale_diff = max(max_wscale_diff, mx(wscaled['y'], c * base['y']))

        # Shift non-invariance: X + b changes vector norms and can change ranks
        b = RNG.uniform(10.0, 200.0, n)
        shifted = moora(X + b, w, types)
        if rank_desc(shifted['y']).tolist() != rank_desc(base['y']).tolist():
            shift_rank_changes += 1

        # Negative values: finite outputs
        X_neg = RNG.uniform(-50.0, 50.0, (m, n))
        res_neg = moora(X_neg, w, types)
        if np.all(np.isfinite(res_neg['y'])):
            neg_runs_ok += 1

        # All-benefit reduction: y_i == sum_j w_j * x*_ij
        res_ben = moora(X, w, ['benefit'] * n)
        saw_vec = (X / np.sqrt((X ** 2).sum(0))) @ w
        if mx(res_ben['y'], saw_vec) < 1e-14:
            all_ben_matches_saw_vec += 1

    print('== properties across 2,000 random problems')
    print(f'  column positive-scale invariance max|y(a*X) - y(X)| = {max_scale_diff:.1e}')
    print(f'  weight-factor proportionality   max|y(c*w) - c*y(w)| = {max_wscale_diff:.1e}')
    print(f'  column shift changes ranks in {shift_rank_changes}/{N} problems ({100 * shift_rank_changes / N:.1f}%)')
    print(f'  negative matrix values finite in {neg_runs_ok}/{N} problems')
    print(f'  all-benefit equals vector-normalized WSM in {all_ben_matches_saw_vec}/{N} problems')


if __name__ == '__main__':
    main()
