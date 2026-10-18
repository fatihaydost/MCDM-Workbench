"""Independent AHP (criteria weights) recomputation against published examples, plus RI, variant, library and UX checks.

Fixtures
  F1  Saaty (2008), Int. J. Services Sciences 1(1):83-98, DOI 10.1504/IJSSCI.2008.017590:
      Table 3 (best job, 5 criteria), Table 2 (drinks, 7 x 7, a(Tea, Wine) typo), Table 4 (3 x 3).
  F2  Doguc (2022), Ekonomi, Isletme ve Maliye Arastirmalari Dergisi 4(2):126-145, DOI 10.38009/ekimad.1142952,
      Tables 4-7 (recruitment, 5 criteria; Turkish; additive normalization "mean" variant, lambda via mean(Aw/w)).
  F3  Bozoki, Fulop & Ronyai (2010), Math. Comput. Modelling 52:318-333, DOI 10.1016/j.mcm.2010.02.047,
      Example 2 (8 x 8 incomplete "buying a house" matrix M, 12 of 28 judgments missing): incomplete LLSM
      weights (Eq. 33) and the lambda_max-optimal completion (Section 5).
Also: random index (RI) tables vs our own Monte Carlo, eigenvector vs row geometric mean, the "most inconsistent
judgment" heuristics on planted errors, group aggregation (AIJ), libraries pyDecision / pymcdm / pyrepo-mcda
(divergence only; skipped when not importable), edge cases.

Run: python3 -I -W ignore ahp.py   (numpy + scipy; the library section runs when the interpreter has pyDecision 5.1.8,
     pymcdm 1.4.0 and pyrepo-mcda 0.1.15 installed, e.g. from a venv; ahp.out was made that way)
"""
import numpy as np
from scipy.optimize import minimize

np.set_printoptions(legacy='1.25', precision=4, suppress=True, linewidth=160)
RNG = np.random.default_rng(20261018)
SCALE = np.array([1 / 9, 1 / 8, 1 / 7, 1 / 6, 1 / 5, 1 / 4, 1 / 3, 1 / 2, 1, 2, 3, 4, 5, 6, 7, 8, 9])  # 17 values

# RI tables. Index = n. Saaty: as in pyDecision 5.1.8 and most papers (n = 11..15 from Saaty's later table).
RI_SAATY = {1: 0, 2: 0, 3: 0.58, 4: 0.90, 5: 1.12, 6: 1.24, 7: 1.32, 8: 1.41, 9: 1.45, 10: 1.49, 11: 1.51, 12: 1.48,
            13: 1.56, 14: 1.57, 15: 1.59}
# Alonso & Lamata (2006), Table 2, 500,000 matrices per n (Saaty scale, uniform).
RI_AL = {1: 0, 2: 0, 3: 0.5247, 4: 0.8816, 5: 1.1086, 6: 1.2479, 7: 1.3417, 8: 1.4057, 9: 1.4499, 10: 1.4854,
         11: 1.5140, 12: 1.5365, 13: 1.5551, 14: 1.5713, 15: 1.5838}
# pymcdm 1.4.0 AHP.RI_M (docstring cites Tummala & Ling 1998; the numbers are Golden & Wang's column in A&L Table 1).
RI_PYMCDM = {1: 0, 2: 0, 3: 0.5799, 4: 0.8921, 5: 1.1159, 6: 1.2358, 7: 1.3322, 8: 1.3952, 9: 1.4537, 10: 1.4882,
             11: 1.5117, 12: 1.5356, 13: 1.5571, 14: 1.5714, 15: 1.5831}


def ri_alonso_fit(n):
    """Alonso & Lamata (2006) Eq. 9: lambda_max(random) = 2.7699 n - 4.3513, so RI = (1.7699 n - 4.3513) / (n - 1)."""
    return (2.7699 * n - 4.3513 - n) / (n - 1)


# ---------------------------------------------------------------- core
def from_upper(n, upper):
    """Reciprocal matrix from the upper triangle, row by row: a12, a13, ..., a1n, a23, ..."""
    A = np.ones((n, n))
    k = 0
    for i in range(n):
        for j in range(i + 1, n):
            A[i, j] = upper[k]
            A[j, i] = 1 / upper[k]
            k += 1
    return A


def eigen(A, tol=1e-12, it=1000):
    """Principal right eigenvector by power iteration (what a TS port would do), normalized to sum 1."""
    A = np.asarray(A, float)
    w = np.full(len(A), 1 / len(A))
    for _ in range(it):
        v = A @ w
        v /= v.sum()
        if np.max(np.abs(v - w)) < tol:
            w = v
            break
        w = v
    lam = float(np.mean((A @ w) / w))
    return w, lam


def rgmm(A):
    A = np.asarray(A, float)
    g = np.exp(np.log(A).mean(1))
    return g / g.sum()


def additive(A):
    """'Mean' / additive normalization (pyDecision default wd='m', most Turkish papers)."""
    A = np.asarray(A, float)
    return (A / A.sum(0)).mean(1)


def lam_of(A, w):
    """lambda estimate mean((Aw)_i / w_i), as papers compute it from approximate weights."""
    return float(np.mean((np.asarray(A) @ w) / w))


def perron(A):
    return float(np.max(np.linalg.eigvals(np.asarray(A, float)).real))


def cr(A, ri=RI_SAATY, lam=None):
    n = len(A)
    if n < 3:
        return float('nan')
    lam = perron(A) if lam is None else lam
    return (lam - n) / (n - 1) / ri[n]


def mx(a, b):
    return float(np.max(np.abs(np.asarray(a, float) - np.asarray(b, float))))


def fmt(v, d=4):
    return '[' + ', '.join(f'{x:.{d}f}' for x in np.asarray(v, float)) + ']'


def verdict(d, tol):
    return 'MATCH' if d <= tol else 'MISMATCH'


# ---------------------------------------------------------------- fixtures
F1_JOB = dict(
    name='F1a Saaty 2008 Table 3, best job (eigenvector)',
    A=[[1, 1 / 4, 1 / 6, 1 / 4, 1 / 8], [4, 1, 1 / 3, 3, 1 / 7], [6, 3, 1, 4, 1 / 2], [4, 1 / 3, 1 / 4, 1, 1 / 7],
       [8, 7, 2, 7, 1]],
    pub=dict(w=[0.036, 0.122, 0.262, 0.075, 0.506]), tol=5e-4)
DRINKS_PRINTED = [[1, 9, 5, 2, 1, 1, 1 / 2], [1 / 9, 1, 1 / 3, 1 / 9, 1 / 9, 1 / 9, 1 / 9], [1 / 5, 2, 1, 1 / 3, 1 / 4, 1 / 3, 1 / 9],
                  [1 / 2, 9, 3, 1, 1 / 2, 1, 1 / 3], [1, 9, 4, 2, 1, 2, 1 / 2], [1, 9, 3, 1, 1 / 2, 1, 1 / 3], [2, 9, 9, 3, 2, 3, 1]]
F1_DRINKS = dict(
    name='F1b Saaty 2008 Table 2, drinks, a(Tea,Wine) = 3 (printed 2, typo)',
    A=[r[:] for r in DRINKS_PRINTED], pub=dict(w=[0.177, 0.019, 0.042, 0.116, 0.190, 0.129, 0.327], CR=0.022), tol=5e-4)
F1_DRINKS['A'][2][1] = 3
F1_FLEX = dict(name='F1c Saaty 2008 Table 4, 3 x 3', A=[[1, 1 / 3, 1 / 6], [3, 1, 1 / 4], [6, 4, 1]],
               pub=dict(w=[0.091, 0.218, 0.691]), tol=5e-4)
F2 = dict(
    name='F2 Doguc 2022 Tables 4-7, recruitment criteria (additive normalization)',
    criteria=['Bilisim/Teknik', 'Is Tecrubesi', 'Egitim Duzeyi', 'Yetenek/Kisilik', 'Performans'],
    A=[[1, 1 / 3, 3, 1 / 2, 1 / 3], [3, 1, 4, 3, 1 / 2], [1 / 3, 1 / 4, 1, 1 / 2, 1 / 3], [2, 1 / 3, 2, 1, 1 / 2],
       [3, 2, 3, 2, 1]],
    pub=dict(w=[0.1239, 0.3001, 0.0746, 0.1567, 0.3447], lam=5.2693, CI=0.0673, CR=0.0601,
             AwOverW=[5.1734, 5.3735, 5.1511, 5.2709, 5.3777]), tol=5e-5)
X = None  # missing judgment
F3_M = [[1, 5, 3, 7, 6, 6, 1 / 3, 1 / 4], [1 / 5, 1, X, 5, X, 3, X, 1 / 7], [1 / 3, X, 1, X, 3, X, 6, X],
        [1 / 7, 1 / 5, X, 1, X, 1 / 4, X, 1 / 8], [1 / 6, X, 1 / 3, X, 1, X, 1 / 5, X], [1 / 6, 1 / 3, X, 4, X, 1, X, 1 / 6],
        [3, X, 1 / 6, X, 5, X, 1, X], [4, 7, X, 8, X, 6, X, 1]]
F3_PUB = dict(y=[-0.6485, -1.6101, -0.6485, -2.8449, -2.2214, -2.0998, -0.8674],
              w_llsm=[0.1770, 0.0676, 0.1770, 0.0197, 0.0367, 0.0415, 0.1422, 0.3385],
              lam_em=9.2981, w_em=[0.1894, 0.0567, 0.2116, 0.0175, 0.0319, 0.0354, 0.1509, 0.3066],
              x_em=[0.3300, 1.7197, 0.4663, 9.9205, 4.8525, 0.5696, 0.5253, 0.1424, 0.9312, 0.1093, 0.2912, 0.4031])


def llsm_incomplete(M):
    """Incomplete LLSM (Bozoki et al. 2010, Eq. 30): Laplacian system L y = r, y_n = 0. Unique iff the graph is connected."""
    n = len(M)
    L = np.zeros((n, n))
    r = np.zeros(n)
    for i in range(n):
        for j in range(n):
            if i != j and M[i][j] is not None:
                L[i, i] += 1
                L[i, j] -= 1
                r[i] += np.log(M[i][j])
    y = np.zeros(n)
    y[:-1] = np.linalg.solve(L[:-1, :-1], r[:-1])
    w = np.exp(y)
    return w / w.sum(), y, L


def connected(M):
    n = len(M)
    seen, stack = {0}, [0]
    while stack:
        i = stack.pop()
        for j in range(n):
            if j not in seen and M[i][j] is not None:
                seen.add(j)
                stack.append(j)
    return len(seen) == n


def em_completion(M):
    """lambda_max-optimal completion (Bozoki et al. 2010, Section 5). lambda_max is convex in log(x) (their Theorem 1)."""
    n = len(M)
    miss = [(i, j) for i in range(n) for j in range(i + 1, n) if M[i][j] is None]

    def fill(t):
        A = np.array([[np.nan if v is None else v for v in row] for row in M], float)
        for (i, j), tk in zip(miss, t):
            A[i, j], A[j, i] = np.exp(tk), np.exp(-tk)
        return A
    res = minimize(lambda t: perron(fill(t)), np.zeros(len(miss)), method='Nelder-Mead',
                   options=dict(xatol=1e-10, fatol=1e-12, maxiter=200000, maxfev=200000))
    res = minimize(lambda t: perron(fill(t)), res.x, method='BFGS', options=dict(gtol=1e-10))
    A = fill(res.x)
    w, lam = eigen(A)
    return w, lam, np.exp(res.x), A


def report_matrix(f, ri=RI_SAATY):
    A = np.asarray(f['A'], float)
    n = len(A)
    we, lam = eigen(A)
    wg, wa = rgmm(A), additive(A)
    print(f"== {f['name']}")
    print(f'  reciprocal: {np.allclose(A * A.T, 1)}')
    print(f'  eigen     {fmt(we)}  lambda {lam:.4f}  CI {(lam - n) / (n - 1):.4f}  CR(Saaty RI) {cr(A, RI_SAATY):.4f}'
          f'  CR(A&L RI) {cr(A, RI_AL):.4f}')
    print(f'  RGMM      {fmt(wg)}  max|eigen - RGMM| {mx(we, wg):.4f}')
    print(f'  additive  {fmt(wa)}  max|eigen - additive| {mx(we, wa):.4f}')
    return A, we, wg, wa, lam


def fixtures():
    out = {}
    for f in (F1_JOB, F1_DRINKS, F1_FLEX):
        A, we, wg, wa, lam = report_matrix(f)
        d = mx(we, f['pub']['w'])
        print(f"  vs published (eigen): {d:.5f} {verdict(d, f['tol'])}; RGMM {mx(wg, f['pub']['w']):.5f}; "
              f"additive {mx(wa, f['pub']['w']):.5f}")
        if 'CR' in f['pub']:
            print(f"  CR ours {cr(A):.4f} vs published {f['pub']['CR']} -> {verdict(abs(cr(A) - f['pub']['CR']), 5e-4)}")
        out[f['name'][:3]] = A
    Ap = np.asarray(DRINKS_PRINTED, float)
    wp, _ = eigen(Ap)
    print(f'  drinks as printed (non-reciprocal): eigen {fmt(wp)} CR {cr(Ap):.4f} -> tea {wp[2]:.4f} vs 0.042: MISMATCH (typo)')
    print(f'  Table 4: max|eigen - RGMM| = {mx(eigen(F1_FLEX["A"])[0], rgmm(F1_FLEX["A"])):.1e} (n = 3: identical)')

    # F2
    A, we, wg, wa, lam = report_matrix(F2)
    p = F2['pub']
    aw = (A @ wa) / wa
    lam_a = float(aw.mean())
    print(f'  additive vs published w: {mx(wa, p["w"]):.5f} {verdict(mx(wa, p["w"]), 5e-5)}')
    print(f'  Aw/w (additive w) {fmt(aw)} vs published {fmt(p["AwOverW"])}: {mx(aw, p["AwOverW"]):.4f}')
    print(f'  lambda from additive w {lam_a:.4f} (published {p["lam"]}), CI {(lam_a - 5) / 4:.4f} ({p["CI"]}), '
          f'CR {(lam_a - 5) / 4 / 1.12:.4f} ({p["CR"]})')
    print(f'  true Perron lambda {perron(A):.4f}, CR {cr(A):.4f}: the paper\'s lambda is the approximation (+{lam_a - perron(A):.4f})')
    print(f'  rank eigen {rank_desc(we)} RGMM {rank_desc(wg)} additive {rank_desc(wa)} published {rank_desc(p["w"])}')

    # F3
    print('== F3 Bozoki et al. 2010 Example 2, incomplete 8 x 8 (12 of 28 missing)')
    print(f'  graph connected: {connected(F3_M)}; given judgments {sum(v is not None for r in F3_M for v in r) // 2 - 4} '
          f'of 28 (spanning tree needs 7)')
    w, y, L = llsm_incomplete(F3_M)
    print(f'  Laplacian diagonal (degrees) {np.diag(L).astype(int).tolist()}')
    print(f'  LLSM y {fmt(y[:-1])} vs published: {mx(y[:-1], F3_PUB["y"]):.5f} {verdict(mx(y[:-1], F3_PUB["y"]), 5e-5)}')
    print(f'  LLSM w {fmt(w)} vs published: {mx(w, F3_PUB["w_llsm"]):.5f} {verdict(mx(w, F3_PUB["w_llsm"]), 5e-5)}')
    we3, lam3, x3, A3 = em_completion(F3_M)
    print(f'  EM completion lambda {lam3:.4f} (published {F3_PUB["lam_em"]}), w {fmt(we3)} vs published: '
          f'{mx(we3, F3_PUB["w_em"]):.5f} {verdict(mx(we3, F3_PUB["w_em"]), 5e-5)}')
    print(f'  completed x (row-wise upper) {fmt(x3)} vs published Table 1 k=20: {mx(x3, F3_PUB["x_em"]):.4f}')
    print(f'  CR of the completion (Saaty RI 1.41): {(lam3 - 8) / 7 / 1.41:.4f}; RGMM of the completion {fmt(rgmm(A3))}')
    return out


def rank_desc(w, tol=1e-9):
    w = np.asarray(w, float)
    return [1 + int(np.sum(w > v + tol)) for v in w]


# ---------------------------------------------------------------- random index
def random_index(N=100000):
    print('== RI: our Monte Carlo (uniform over the 17 Saaty values, upper triangle iid), N =', N)
    print('   n   ours      std     Saaty   A&L-T2   pymcdm  A&L fit')
    rows = {}
    for n in range(3, 21):
        k = n * (n - 1) // 2
        iu = np.triu_indices(n, 1)
        cis = []
        for chunk in range(0, N, 20000):
            m = min(20000, N - chunk)
            V = SCALE[RNG.integers(0, 17, (m, k))]
            A = np.ones((m, n, n))
            A[:, iu[0], iu[1]] = V
            A[:, iu[1], iu[0]] = 1 / V
            lam = np.linalg.eigvals(A).real.max(1)
            cis.append((lam - n) / (n - 1))
        ci = np.concatenate(cis)
        rows[n] = ci.mean()
        print(f'  {n:2d}  {ci.mean():.4f}  {ci.std():.4f}   {RI_SAATY.get(n, float("nan")):.2f}   '
              f'{RI_AL.get(n, float("nan")):.4f}   {RI_PYMCDM.get(n, float("nan")):.4f}   {ri_alonso_fit(n):.4f}')
    d_al = max(abs(rows[n] - RI_AL[n]) for n in range(3, 16))
    d_s = max(abs(rows[n] - RI_SAATY[n]) for n in range(3, 16))
    print(f'  max|ours - A&L| n 3-15: {d_al:.4f}; max|ours - Saaty|: {d_s:.4f} (Saaty n=3: {RI_SAATY[3]} vs {rows[3]:.4f})')
    print(f'  Saaty table not monotone: RI(11) {RI_SAATY[11]} > RI(12) {RI_SAATY[12]}')
    print('  CR at the threshold lambda: a matrix with CR(A&L) = 0.10 has CR(Saaty) = '
          + ', '.join(f'n{n}:{0.1 * RI_AL[n] / RI_SAATY[n]:.3f}' for n in (3, 4, 5, 7, 9, 12)))
    return rows


# ---------------------------------------------------------------- variants and inconsistency
def nearest_scale(x):
    return SCALE[np.argmin(np.abs(np.log(SCALE) - np.log(x)))]


def random_pcm(n, noise=0.0):
    """Judgments a DM might give: true w (Dirichlet), log-normal noise, rounded to the 1-9 scale."""
    w = RNG.dirichlet(np.ones(n))
    A = np.ones((n, n))
    for i in range(n):
        for j in range(i + 1, n):
            v = nearest_scale(w[i] / w[j] * np.exp(RNG.normal(0, noise)))
            A[i, j], A[j, i] = v, 1 / v
    return A, w


def eigen_vs_rgmm(trials=3000):
    print('== eigenvector vs RGMM on random judgment matrices (n 3-9, noise sigma in {0, 0.3, 0.6, 1.0} on log ratios)')
    for noise in (0.0, 0.3, 0.6, 1.0):
        dmax, rdiff, crs, top = [], 0, [], 0
        for _ in range(trials // 4):
            n = int(RNG.integers(3, 10))
            A, _ = random_pcm(n, noise)
            we, _ = eigen(A)
            wg = rgmm(A)
            dmax.append(mx(we, wg))
            rdiff += rank_desc(we) != rank_desc(wg)
            top += int(np.argmax(we)) != int(np.argmax(wg))
            crs.append(cr(A))
        crs = np.array(crs)
        print(f'  sigma {noise}: median CR {np.median(crs):.3f}, share CR>0.1 {np.mean(crs > 0.1):.2f}; max|w_e - w_g| '
              f'median {np.median(dmax):.4f} max {np.max(dmax):.4f}; ranking differs {rdiff}/{trials // 4}, top differs {top}')


def inconsistency_finders(trials=2000):
    """Plant one wrong judgment in a consistent-ish matrix; which rule finds it?"""
    print('== most inconsistent judgment: planted single error (n 4-9, true matrix rounded, error = other side or x3 off)')
    hits = dict(eps_eigen=0, eps_rgmm=0, best_cr_drop=0, loo_llsm=0)
    fixed = dict(eps_eigen=0, loo_llsm=0)
    cr_before, cr_after = [], []
    for _ in range(trials):
        n = int(RNG.integers(4, 10))
        A, _ = random_pcm(n, 0.0)
        i, j = sorted(RNG.choice(n, 2, replace=False))
        orig = A[i, j]
        bad = nearest_scale(1 / orig) if abs(np.log(orig)) > np.log(2.5) else nearest_scale(orig * 9 if orig >= 1 else orig / 9)
        if bad == orig:
            bad = nearest_scale(orig * 5)
        B = A.copy()
        B[i, j], B[j, i] = bad, 1 / bad
        pairs = [(p, q) for p in range(n) for q in range(p + 1, n)]
        we, _ = eigen(B)
        wg = rgmm(B)
        e_e = {pq: abs(np.log(B[pq] * we[pq[1]] / we[pq[0]])) for pq in pairs}
        e_g = {pq: abs(np.log(B[pq] * wg[pq[1]] / wg[pq[0]])) for pq in pairs}
        hits['eps_eigen'] += max(e_e, key=e_e.get) == (i, j)
        hits['eps_rgmm'] += max(e_g, key=e_g.get) == (i, j)
        # best single change: replace each judgment by its best fit (nearest scale to w_p/w_q) and keep the largest CR drop
        base = cr(B)
        drops = {}
        for p, q in pairs:
            C = B.copy()
            v = nearest_scale(we[p] / we[q])
            C[p, q], C[q, p] = v, 1 / v
            drops[(p, q)] = base - cr(C)
        hits['best_cr_drop'] += max(drops, key=drops.get) == (i, j)
        # leave-one-out: weights from all other judgments (incomplete LLSM), residual of the left-out one
        loo = {}
        for p, q in pairs:
            M = [[None if (r, c) in ((p, q), (q, p)) else B[r, c] for c in range(n)] for r in range(n)]
            wl, _, _ = llsm_incomplete(M)
            loo[(p, q)] = (abs(np.log(B[p, q] * wl[q] / wl[p])), nearest_scale(wl[p] / wl[q]))
        k = max(loo, key=lambda pq: loo[pq][0])
        hits['loo_llsm'] += k == (i, j)
        fixed['loo_llsm'] += k == (i, j) and loo[k][1] == orig
        fixed['eps_eigen'] += max(e_e, key=e_e.get) == (i, j) and nearest_scale(we[i] / we[j]) == orig
        cr_before.append(base)
        C = B.copy()
        C[k], C[k[::-1]] = loo[k][1], 1 / loo[k][1]
        cr_after.append(cr(C))
    for k, v in hits.items():
        print(f'  {k:13s} finds the planted pair {v}/{trials} ({v / trials:.1%})')
    print(f'  suggested value = original judgment: best fit from all-judgment eigen weights {fixed["eps_eigen"]}/{trials}, '
          f'from leave-one-out LLSM {fixed["loo_llsm"]}/{trials}')
    print(f'  CR before median {np.median(cr_before):.3f}, after applying the leave-one-out suggestion median '
          f'{np.median(cr_after):.3f}; share still > 0.1: {np.mean(np.array(cr_after) > 0.1):.3f}')


def group_aij():
    print('== group: aggregation of individual judgments (AIJ)')
    A1 = from_upper(3, [3, 5, 2])
    A2 = from_upper(3, [1 / 3, 1, 4])
    G = np.sqrt(A1 * A2)
    Ar = (A1 + A2) / 2
    print(f'  geometric AIJ reciprocal: {np.allclose(G * G.T, 1)}; arithmetic AIJ reciprocal: {np.allclose(Ar * Ar.T, 1)}')
    print(f'  opposite judgments 3 and 1/3 -> geometric mean {np.sqrt(3 * (1 / 3)):.3f} ("equal"), the disagreement is lost')
    print(f'  RGMM(geometric AIJ) = normalized geometric mean of individual RGMM weights: '
          f'{mx(rgmm(G), (lambda g: g / g.sum())(np.sqrt(rgmm(A1) * rgmm(A2)))):.1e}')


def ux_counts():
    print('== judgments to ask: AHP full n(n-1)/2, minimum spanning n-1, Comparion "two diagonals" 2n-3, BWM 2n-3')
    for n in (3, 4, 5, 6, 7, 8, 9, 10, 12, 15):
        print(f'  n {n:2d}: full {n * (n - 1) // 2:3d}  spanning {n - 1:2d}  two diagonals {2 * n - 3:2d}')


def two_diagonals_quality(trials=2000):
    """How close are weights from first + second diagonals only (incomplete LLSM) to the full-matrix weights?"""
    print('== incomplete input: first + second diagonal only (2n-3 judgments), LLSM, vs full matrix (RGMM)')
    for noise in (0.0, 0.3, 0.6):
        d, rk = [], 0
        for _ in range(trials // 3):
            n = int(RNG.integers(4, 10))
            A, _ = random_pcm(n, noise)
            M = [[A[r, c] if abs(r - c) <= 2 else None for c in range(n)] for r in range(n)]
            wl, _, _ = llsm_incomplete(M)
            wg = rgmm(A)
            d.append(mx(wl, wg))
            rk += rank_desc(wl) != rank_desc(wg)
        print(f'  sigma {noise}: max|w_2diag - w_full| median {np.median(d):.4f}, p90 {np.quantile(d, .9):.4f}; '
              f'ranking differs {rk}/{trials // 3}')


def edges():
    print('== edges')
    print(f'  n = 2, a12 = 5: eigen {fmt(eigen(from_upper(2, [5]))[0])} lambda {perron(from_upper(2, [5])):.4f} -> CI 0, '
          f'RI(2) = 0, CR = 0/0 (undefined; show "not applicable")')
    A = np.ones((4, 4))
    print(f'  all "equal" (n 4): w {fmt(eigen(A)[0])}, CR {cr(A):.4f}')
    A = from_upper(3, [9, 9, 9])
    print(f'  chain at the scale end A>B 9, B>C 9, A>C 9 (should be 81): w {fmt(eigen(A)[0])} CR {cr(A):.4f} '
          '-> the 1-9 cap alone forces CR > 0.1')
    A = from_upper(3, [9, 1 / 9, 9])  # upper order a12, a13, a23
    print(f'  cyclic A>B 9, B>C 9, C>A 9: w {fmt(eigen(A)[0])} CR {cr(A):.3f} (intransitive)')
    A = from_upper(3, [3, 3, 3])
    print(f'  A>B 3, B>C 3, A>C 3 (should be 9): CR {cr(A):.4f}; with A>C 5: {cr(from_upper(3, [3, 5, 3])):.4f}; '
          f'A>C 9: {cr(from_upper(3, [3, 9, 3])):.4f}')
    # n > 15: Saaty table stops; A&L fit continues
    for n in (16, 20):
        print(f'  n {n}: Saaty RI table has no entry; A&L fit RI {ri_alonso_fit(n):.4f}')
    # power iteration convergence on the worst matrices
    its = []
    for _ in range(500):
        n = int(RNG.integers(3, 16))
        A, _ = random_pcm(n, 1.5)
        w = np.full(n, 1 / n)
        for k in range(1, 1001):
            v = A @ w
            v /= v.sum()
            if np.max(np.abs(v - w)) < 1e-12:
                break
            w = v
        its.append(k)
        assert mx(w, np.abs(np.linalg.eig(A)[1][:, np.argmax(np.linalg.eig(A)[0].real)].real)
                  / np.abs(np.linalg.eig(A)[1][:, np.argmax(np.linalg.eig(A)[0].real)].real).sum()) < 1e-9
    print(f'  power iteration to 1e-12 on 500 noisy matrices n 3-15: max {max(its)} iterations, median {int(np.median(its))}')


# ---------------------------------------------------------------- libraries (divergence only)
def libraries(mats):
    print('== libraries')
    try:
        from pyDecision.algorithm import ahp_method
        for name, A in mats.items():
            r = {wd: ahp_method(np.asarray(A, float), wd=wd) for wd in ('me', 'g', 'm')}
            we, _ = eigen(A)
            print(f'  pyDecision {name}: me {mx(r["me"][0], we):.1e} (CR {r["me"][1]:.4f}), g vs RGMM {mx(r["g"][0], rgmm(A)):.1e} '
                  f'(CR {r["g"][1]:.4f}), m vs additive {mx(r["m"][0], additive(A)):.1e} (CR {r["m"][1]:.4f}); our CR {cr(A):.4f}')
        with np.errstate(all='ignore'):
            print(f'  pyDecision n = 2: CR {ahp_method(from_upper(2, [5]), wd="me")[1]}')
        try:
            ahp_method(np.ones((16, 16)), wd='me')
        except Exception as e:  # noqa: BLE001
            print(f'  pyDecision n = 16: {type(e).__name__}: {e}')
    except Exception as e:  # noqa: BLE001
        print(f'  pyDecision not available: {type(e).__name__}')
    try:
        from pymcdm.weights.subjective import AHP
        for name, A in mats.items():
            a = AHP(matrix=np.asarray(A, float))
            w = a()
            print(f'  pymcdm {name}: w vs eigen {mx(w, eigen(A)[0]):.1e}; get_cr {a.get_cr():.4f} '
                  f'(= CI / Golden-Wang RI; ours with that RI {cr(A, RI_PYMCDM):.4f})')
        a = AHP(matrix=from_upper(2, [5]))
        a()
        print(f'  pymcdm n = 2: get_cr {a.get_cr()}')
        a = AHP(matrix=np.ones((16, 16)))
        a()
        try:
            a.get_cr()
        except Exception as e:  # noqa: BLE001
            print(f'  pymcdm n = 16: {type(e).__name__}: {e} (the intended ValueError is built but not raised)')
        print(f'  pymcdm AHP(ranking=[1, 2, 4, 3]) docstring weights reproduced: {fmt(AHP(ranking=[1, 2, 4, 3])())}')
    except Exception as e:  # noqa: BLE001
        print(f'  pymcdm not available: {type(e).__name__}')
    try:
        import contextlib
        import io
        from pyrepo_mcda.mcda_methods import AHP as PR
        p = PR()
        for name, A in mats.items():
            A = np.asarray(A, float)
            buf = io.StringIO()
            with contextlib.redirect_stdout(buf):
                p._check_consistency(A)
            print(f'  pyrepo-mcda {name}: eigen {mx(p._calculate_eigenvector(A), eigen(A)[0]):.1e}, '
                  f'geometric {mx(p._geometric_mean(A), rgmm(A)):.1e}, "normalized column sum" (row sums / total) vs additive '
                  f'{mx(p._normalized_column_sum(A), additive(A)):.4f}; prints {buf.getvalue().split(chr(10))[0]!r}')
    except Exception as e:  # noqa: BLE001
        print(f'  pyrepo-mcda not available: {type(e).__name__}')


if __name__ == '__main__':
    mats = fixtures()
    mats['F2 '] = np.asarray(F2['A'], float)
    random_index()
    eigen_vs_rgmm()
    inconsistency_finders()
    two_diagonals_quality()
    group_aij()
    ux_counts()
    edges()
    libraries(mats)
