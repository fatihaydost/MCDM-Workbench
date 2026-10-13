"""Independent EDAS recompute (numpy) against published worked examples.

Fixtures
  F1  Keshavarz Ghorabaee et al. 2015, Informatica 26(3):435-451, DOI 10.15388/Informatica.2015.57
      Table 1 (47 SKUs x 3 benefit, equal weights) -> Table 2 (PDA, NDA, SP, NSP, SN, NSN, AS, 2 dp)
      Tables 5-6 (10 x 7, 7 weight sets) -> Table 7 EDAS ranks
  F2  Aydin Unal 2019, Finansal Arastirmalar? -> FESA 4(4), DOI 10.29106/fesa.649946
      Table 9 (7 insurers x 8, mixed), Table 7 Entropy weights -> Tables 10-12 (4 dp)
  F3  Sarihan & Aydin 2023, Istanbul Ticaret Univ. Sos. Bil. Derg. 22(46):412-437, DOI 10.46928/iticusbe.1263122
      Table 2 (14 firms x 3 benefit), Table 5 weights -> Tables 6-9 (3 dp)

Usage: python3 edas.py [path/to/edas2015.txt]   (optional: pdftotext -layout output of the 2015 PDF;
       when given, Table 2 is parsed from it instead of the embedded copy and both are compared)
"""
import sys
import numpy as np

np.set_printoptions(precision=4, suppress=True, linewidth=160)


def edas(X, w, types):
    """Crisp EDAS, Keshavarz Ghorabaee et al. 2015 Eqs. 3-14. types: 'b' benefit / 'c' cost."""
    X = np.asarray(X, float)
    w = np.asarray(w, float)
    av = X.mean(axis=0)                                     # Eq. 3
    diff = (X - av) / av                                    # signed relative distance
    cost = np.array([t == 'c' for t in types])
    pda = np.where(cost, np.maximum(0, -diff), np.maximum(0, diff))  # Eqs. 6, 8
    nda = np.where(cost, np.maximum(0, diff), np.maximum(0, -diff))  # Eqs. 7, 9
    sp = pda @ w                                            # Eq. 10
    sn = nda @ w                                            # Eq. 11
    nsp = sp / sp.max()                                     # Eq. 12
    nsn = 1 - sn / sn.max()                                 # Eq. 13
    as_ = (nsp + nsn) / 2                                   # Eq. 14
    return dict(av=av, pda=pda, nda=nda, sp=sp, sn=sn, nsp=nsp, nsn=nsn, AS=as_)


def rank_desc(s):
    order = np.argsort(-s, kind='stable')
    r = np.empty(len(s), int)
    r[order] = np.arange(1, len(s) + 1)
    return r


def report(name, got, printed):
    got = np.asarray(got, float)
    printed = np.asarray(printed, float)
    d = np.abs(got - printed)
    i = np.unravel_index(np.argmax(d), d.shape)
    print(f'  {name:10s} max|diff| = {d.max():.4g} at {tuple(int(k) for k in i)}  (got {got[i]:.5f}, printed {printed[i]:.5f})')
    return d.max()


# ---------------------------------------------------------------- F1: 2015 Table 1 / Table 2
T1 = [
    [49.92, 5840.64, 2], [210, 5670, 5], [23.76, 5037.12, 4], [27.73, 4769.56, 1], [57.98, 3478.8, 3],
    [31.24, 2936.67, 3], [28.2, 2820, 3], [55, 2640, 4], [73.44, 2423.52, 6], [160.5, 2407.5, 4],
    [5.12, 1075.2, 2], [20.87, 1043.5, 5], [86.5, 1038, 7], [110.4, 883.2, 5], [71.2, 854.4, 3],
    [45, 810, 3], [14.66, 703.68, 4], [49.5, 594, 6], [47.5, 570, 5], [58.45, 467.6, 4],
    [24.4, 463.6, 4], [65, 455, 4], [86.5, 432.5, 4], [33.2, 398.4, 3], [37.05, 370.5, 1],
    [33.84, 338.4, 3], [84.03, 336.12, 1], [78.4, 313.6, 6], [134.34, 268.68, 7], [56, 224, 1],
    [72, 216, 5], [53.02, 212.08, 2], [49.48, 197.92, 5], [7.07, 190.89, 7], [60.6, 181.8, 3],
    [40.82, 163.28, 3], [30, 150, 5], [67.4, 134.8, 3], [59.6, 119.2, 5], [51.68, 103.36, 6],
    [19.8, 79.2, 2], [37.7, 75.4, 2], [29.89, 59.78, 5], [48.3, 48.3, 3], [34.4, 34.4, 7],
    [28.8, 28.8, 3], [8.46, 25.38, 5],
]
T1_AV = [54.44, 1099.68, 3.91]

# Table 2 as printed: PDA1..3, NDA1..3, SP, NSP, SN, NSN, AS  (rows 1..47)
T2_TEXT = """
1 0.00 4.31 0.00 0.08 0.00 0.49 4.31 0.59 0.57 0.72 0.66
2 2.86 4.16 0.28 0.00 0.00 0.00 7.29 1.00 0.00 1.00 1.00
3 0.00 3.58 0.02 0.56 0.00 0.00 3.60 0.49 0.56 0.73 0.61
4 0.00 3.34 0.00 0.49 0.00 0.75 3.34 0.46 1.24 0.40 0.43
5 0.07 2.16 0.00 0.00 0.00 0.23 2.23 0.31 0.23 0.89 0.60
6 0.00 1.67 0.00 0.43 0.00 0.23 1.67 0.23 0.66 0.68 0.45
7 0.00 1.56 0.00 0.48 0.00 0.23 1.56 0.22 0.72 0.65 0.43
8 0.01 1.40 0.02 0.00 0.00 0.00 1.43 0.20 0.00 1.00 0.60
9 0.35 1.20 0.53 0.00 0.00 0.00 2.09 0.29 0.00 1.00 0.64
10 1.95 1.19 0.02 0.00 0.00 0.00 3.16 0.43 0.00 1.00 0.72
11 0.00 0.00 0.00 0.91 0.02 0.49 0.00 0.00 1.42 0.31 0.16
12 0.00 0.00 0.28 0.62 0.05 0.00 0.28 0.04 0.67 0.68 0.36
13 0.59 0.00 0.79 0.00 0.06 0.00 1.38 0.19 0.06 0.97 0.58
14 1.03 0.00 0.28 0.00 0.20 0.00 1.31 0.18 0.20 0.90 0.54
15 0.31 0.00 0.00 0.00 0.22 0.23 0.31 0.04 0.46 0.78 0.41
16 0.00 0.00 0.00 0.17 0.26 0.23 0.00 0.00 0.67 0.67 0.34
17 0.00 0.00 0.02 0.73 0.36 0.00 0.02 0.00 1.09 0.47 0.24
18 0.00 0.00 0.53 0.09 0.46 0.00 0.53 0.07 0.55 0.73 0.40
19 0.00 0.00 0.28 0.13 0.48 0.00 0.28 0.04 0.61 0.70 0.37
20 0.07 0.00 0.02 0.00 0.58 0.00 0.10 0.01 0.58 0.72 0.37
21 0.00 0.00 0.02 0.55 0.58 0.00 0.02 0.00 1.13 0.45 0.23
22 0.19 0.00 0.02 0.00 0.59 0.00 0.22 0.03 0.59 0.72 0.37
23 0.59 0.00 0.02 0.00 0.61 0.00 0.61 0.08 0.61 0.71 0.39
24 0.00 0.00 0.00 0.39 0.64 0.23 0.00 0.00 1.26 0.39 0.19
25 0.00 0.00 0.00 0.32 0.66 0.75 0.00 0.00 1.73 0.16 0.08
26 0.00 0.00 0.00 0.38 0.69 0.23 0.00 0.00 1.30 0.37 0.18
27 0.54 0.00 0.00 0.00 0.69 0.75 0.54 0.08 1.44 0.30 0.19
28 0.44 0.00 0.53 0.00 0.72 0.00 0.97 0.13 0.72 0.65 0.39
29 1.47 0.00 0.79 0.00 0.76 0.00 2.26 0.31 0.76 0.63 0.47
30 0.03 0.00 0.00 0.00 0.80 0.75 0.03 0.00 1.54 0.25 0.13
31 0.32 0.00 0.28 0.00 0.80 0.00 0.60 0.08 0.80 0.61 0.35
32 0.00 0.00 0.00 0.03 0.81 0.49 0.00 0.00 1.32 0.36 0.18
33 0.00 0.00 0.28 0.09 0.82 0.00 0.28 0.04 0.91 0.56 0.30
34 0.00 0.00 0.79 0.87 0.83 0.00 0.79 0.11 1.70 0.17 0.14
35 0.11 0.00 0.00 0.00 0.84 0.23 0.11 0.02 1.07 0.48 0.25
36 0.00 0.00 0.00 0.25 0.85 0.23 0.00 0.00 1.34 0.35 0.18
37 0.00 0.00 0.28 0.45 0.86 0.00 0.28 0.04 1.31 0.36 0.20
38 0.24 0.00 0.00 0.00 0.88 0.23 0.24 0.03 1.11 0.46 0.25
39 0.10 0.00 0.28 0.00 0.89 0.00 0.37 0.05 0.89 0.57 0.31
40 0.00 0.00 0.53 0.05 0.91 0.00 0.53 0.07 0.96 0.53 0.30
41 0.00 0.00 0.00 0.64 0.93 0.49 0.00 0.00 2.05 0.00 0.00
42 0.00 0.00 0.00 0.31 0.93 0.49 0.00 0.00 1.73 0.16 0.08
43 0.00 0.00 0.28 0.45 0.95 0.00 0.28 0.04 1.40 0.32 0.18
44 0.00 0.00 0.00 0.11 0.96 0.23 0.00 0.00 1.30 0.37 0.18
45 0.00 0.00 0.79 0.37 0.97 0.00 0.79 0.11 1.34 0.35 0.23
46 0.00 0.00 0.00 0.47 0.97 0.23 0.00 0.00 1.68 0.18 0.09
47 0.00 0.00 0.28 0.85 0.98 0.00 0.28 0.04 1.82 0.11 0.08
"""


def parse_t2(text):
    rows = []
    for line in text.splitlines():
        p = line.split()
        if len(p) == 12 and p[0].isdigit() and 1 <= int(p[0]) <= 47:
            try:
                rows.append([float(x) for x in p[1:]])
            except ValueError:
                pass
    return np.array(rows)


def f1():
    print('F1  Keshavarz Ghorabaee et al. 2015, Tables 1-2 (47 x 3, all benefit)')
    T2 = parse_t2(T2_TEXT)
    if len(sys.argv) > 1:
        T2pdf = parse_t2(open(sys.argv[1], encoding='utf-8').read())
        print('  Table 2 parsed from PDF text:', T2pdf.shape, ' identical to embedded copy:', np.array_equal(T2pdf, T2))
    assert T2.shape == (47, 11)
    X = np.array(T1)
    # Equal weights. Paper's SP/SN are plain sums (w_j = 1): SP_1 = 0 + 4.31 + 0 = 4.31.
    r1 = edas(X, [1, 1, 1], 'bbb')
    r3 = edas(X, [1 / 3] * 3, 'bbb')
    print('  AV recomputed', r1['av'], ' printed', T1_AV)
    report('AV', r1['av'], T1_AV)
    report('PDA', r1['pda'], T2[:, 0:3])
    report('NDA', r1['nda'], T2[:, 3:6])
    report('SP(w=1)', r1['sp'], T2[:, 6])
    report('NSP', r1['nsp'], T2[:, 7])
    report('SN(w=1)', r1['sn'], T2[:, 8])
    report('NSN', r1['nsn'], T2[:, 9])
    d = report('AS', r1['AS'], T2[:, 10])
    print('  AS identical for w=1 and w=1/3:', np.allclose(r1['AS'], r3['AS'], atol=1e-15))
    print('  AS (4 dp):', ' '.join(f'{x:.4f}' for x in r1['AS']))
    # Cells off by more than half a unit in the 2nd decimal
    for k, name in [(10, 'AS'), (7, 'NSP'), (9, 'NSN'), (6, 'SP'), (8, 'SN')]:
        got = {10: r1['AS'], 7: r1['nsp'], 9: r1['nsn'], 6: r1['sp'], 8: r1['sn']}[k]
        bad = np.where(np.abs(got - T2[:, k]) > 0.005 + 1e-9)[0]
        for i in bad:
            print(f'    {name} item {i + 1}: printed {T2[i, k]:.2f}, recomputed {got[i]:.4f}')
    # Hypothesis: paper rounded PDA/NDA to 2 dp before summing
    Pr, Nr = np.round(r1['pda'], 2), np.round(r1['nda'], 2)
    sp2, sn2 = Pr.sum(1), Nr.sum(1)
    as2 = (sp2 / sp2.max() + 1 - sn2 / sn2.max()) / 2
    report('AS(rnd)', as2, T2[:, 10])
    # Exact explanation of the 0.005x differences: Table 2 = our values rounded half-up to 3 dp, then to 2 dp
    from decimal import Decimal, ROUND_HALF_UP
    rd = lambda x, k: float(Decimal(repr(float(x))).quantize(Decimal(1).scaleb(-k), rounding=ROUND_HALF_UP))
    full = np.column_stack([r1['pda'], r1['nda'], r1['sp'], r1['nsp'], r1['sn'], r1['nsn'], r1['AS']])
    for label, f in [('round 2dp', lambda x: rd(x, 2)), ('round 3dp then 2dp', lambda x: rd(rd(x, 3), 2))]:
        nbad = int((np.abs(np.vectorize(f)(full) - T2) > 1e-9).sum())
        print(f'  Table 2 cells not reproduced by "{label}": {nbad} of {T2.size}')
    # Implicit weighting by relative dispersion: per column, sum PDA == sum NDA == mean |x - AV| / AV * n
    print('  column share of total PDA (equal weights):', (r1['pda'].sum(0) / r1['pda'].sum()).round(3),
          ' sum PDA == sum NDA per column:', np.allclose(r1['pda'].sum(0), r1['nda'].sum(0)))
    # ABC classes per paper: top 10 A, next 14 B, rest C (Table 3)
    rk = rank_desc(r1['AS'])
    print('  top-10 (A class) recomputed:', sorted((np.where(rk <= 10)[0] + 1).tolist()))
    print('  B class recomputed:', sorted((np.where((rk > 10) & (rk <= 24))[0] + 1).tolist()))
    return d


# ---------------------------------------------------------------- F1b: Tables 5-7
T5 = [[23, 264, 2.37, 0.05, 167, 8900, 8.71], [20, 220, 2.2, 0.04, 171, 9100, 8.23],
      [17, 231, 1.98, 0.15, 192, 10800, 9.91], [12, 210, 1.73, 0.2, 195, 12300, 10.21],
      [15, 243, 2, 0.14, 187, 12600, 9.34], [14, 222, 1.89, 0.13, 180, 13200, 9.22],
      [21, 262, 2.43, 0.06, 160, 10300, 8.93], [20, 256, 2.6, 0.07, 163, 11400, 8.44],
      [19, 266, 2.1, 0.06, 157, 11200, 9.04], [8, 218, 1.94, 0.11, 190, 13400, 10.11]]
T6 = [[0.250, 0.214, 0.179, 0.143, 0.107, 0.071, 0.036], [0.182, 0.212, 0.182, 0.152, 0.121, 0.091, 0.061],
      [0.139, 0.167, 0.194, 0.167, 0.139, 0.111, 0.083], [0.108, 0.135, 0.162, 0.189, 0.162, 0.135, 0.108],
      [0.083, 0.111, 0.139, 0.167, 0.194, 0.167, 0.139], [0.061, 0.091, 0.121, 0.152, 0.182, 0.212, 0.182],
      [0.036, 0.071, 0.107, 0.143, 0.179, 0.214, 0.250]]
T7_EDAS = [[1, 4, 6, 10, 7, 8, 2, 3, 5, 9], [1, 4, 6, 10, 7, 8, 2, 3, 5, 9], [1, 3, 7, 10, 6, 8, 2, 4, 5, 9],
           [1, 2, 7, 10, 6, 8, 3, 4, 5, 9], [1, 2, 6, 10, 7, 8, 3, 4, 5, 9], [1, 2, 6, 10, 7, 8, 3, 4, 5, 9],
           [1, 2, 6, 10, 7, 8, 3, 4, 5, 9]]


def f1b():
    print('F1b Keshavarz Ghorabaee et al. 2015, Tables 5-7 (10 x 7, BBBCCCC, 7 weight sets)')
    ok = 0
    for s, w in enumerate(T6):
        print(f'  set {s + 1}: weight sum as printed = {sum(w):.3f}')
        r = edas(T5, w, 'bbbcccc')
        rk = rank_desc(r['AS'])
        rn = rank_desc(edas(T5, np.array(w) / sum(w), 'bbbcccc')['AS'])
        match = list(rk) == T7_EDAS[s]
        ok += match
        gaps = np.sort(r['AS'])[::-1]
        print(f'         AS = {r["AS"].round(4)}  ranks {"MATCH" if match else "MISMATCH " + str(list(rk))}'
              f'  (renormalized weights same ranks: {list(rn) == list(rk)}; min gap {np.min(-np.diff(gaps)):.4f})')
    print(f'  Table 7 EDAS ranks: {ok}/7 sets match')


# ---------------------------------------------------------------- F2: Aydin Unal 2019
F2_X = [[932143175, 570609202, 0.7128, 2.6919, 0.6077, 0.6285, 0.1005, 0.0898],
        [1377948801, 1627541169, 0.5183, 2.0065, 0.7102, 0.7016, 0.1293, 0.0670],
        [449610569, 680244795, 0.3300, 1.8694, 0.5450, 0.8286, 0.0031, 0.0019],
        [395098644, 255665969, 0.8922, 2.8270, 0.7184, 0.8962, 0.0736, 0.0534],
        [245424866, 185771819, 0.3693, 2.5091, 0.4149, 0.7850, 0.0204, 0.0089],
        [151287176, 819078906, 0.1864, 0.0005, 0.9745, 0.6673, 0.5916, 0.0904],
        [140454210, 240289953, 0.4992, 2.7956, 0.9603, 0.2260, 0.3740, 0.1366]]
F2_TYPES = 'bbcbbcbb'  # Table 3 / Table 9 header: KK3, KK6 cost
F2_W = [0.1595, 0.1334, 0.0662, 0.0885, 0.0199, 0.0758, 0.2969, 0.1598]  # Table 7
F2_AV = [527423920, 625600259, 0.5012, 2.1000, 0.7044, 0.6762, 0.1846, 0.0640]
F2_PDA = [[0.7674, 0.0000, 0.0000, 0.2819, 0.1373, 0.0000, 0.0000, 0.4033],
          [1.6126, 1.6016, 0.0000, 0.0000, 0.0000, 0.0375, 0.0000, 0.0472],
          [0.0000, 0.0873, 0.3416, 0.0000, 0.2263, 0.2255, 0.0000, 0.0000],
          [0.0000, 0.0000, 0.0000, 0.3462, 0.0000, 0.3254, 0.0000, 0.0000],
          [0.0000, 0.0000, 0.2631, 0.1948, 0.4109, 0.1610, 0.0000, 0.0000],
          [0.0000, 0.3093, 0.6281, 0.0000, 0.0000, 0.0000, 2.2042, 0.4119],
          [0.0000, 0.0000, 0.0039, 0.3313, 0.0000, 0.0000, 1.0254, 1.1344]]
F2_NDA = [[0.0000, 0.0879, 0.4222, 0.0000, 0.0000, 0.0705, 0.4559, 0.0000],
          [0.0000, 0.0000, 0.0342, 0.0445, 0.0082, 0.0000, 0.2995, 0.0000],
          [0.1475, 0.0000, 0.0000, 0.1098, 0.0000, 0.0000, 0.9832, 0.9707],
          [0.2509, 0.5913, 0.7803, 0.0000, 0.0198, 0.0000, 0.6015, 0.1656],
          [0.5347, 0.7031, 0.0000, 0.0000, 0.0000, 0.0000, 0.8895, 0.8605],
          [0.7132, 0.0000, 0.0000, 0.9998, 0.3834, 0.0132, 0.0000, 0.0000],
          [0.7337, 0.6159, 0.0000, 0.0000, 0.3632, 0.6657, 0.0000, 0.0000]]
F2_T12 = [[0.2145, 0.1804, 0.2671, 0.6894, 0.4782, 4], [0.4813, 0.0953, 0.5994, 0.8359, 0.7176, 2],
          [0.0559, 0.4802, 0.0696, 0.1730, 0.1213, 6], [0.0553, 0.3760, 0.0688, 0.3524, 0.2106, 5],
          [0.0551, 0.5807, 0.0686, 0.0000, 0.0343, 7], [0.8031, 0.2109, 1.0000, 0.6368, 0.8184, 1],
          [0.5152, 0.2569, 0.6416, 0.5576, 0.5996, 3]]


def f2():
    print('F2  Aydin Unal 2019 (FESA), Tables 7, 9-12 (7 x 8, KK3/KK6 cost, Entropy weights)')
    T = np.array(F2_T12)
    for label, types in [('as labelled (KK6 cost)', F2_TYPES), ('KK6 as benefit', 'bbcbbbbb')]:
        r = edas(F2_X, F2_W, types)
        print(f'  -- types {label}: {types}')
        report('AV', r['av'], F2_AV)
        report('PDA', r['pda'], F2_PDA)
        report('NDA', r['nda'], F2_NDA)
        report('SP', r['sp'], T[:, 0])
        report('SN', r['sn'], T[:, 1])
        report('NSP', r['nsp'], T[:, 2])
        report('NSN', r['nsn'], T[:, 3])
        report('AS', r['AS'], T[:, 4])
        print('     AS', r['AS'].round(4), ' ranks', rank_desc(r['AS']), ' printed ranks', T[:, 5].astype(int))
    # Is KK6 PDA/NDA simply swapped relative to the cost rule?
    r = edas(F2_X, F2_W, F2_TYPES)
    print('  KK6 printed PDA == recomputed NDA (cost rule)?', np.allclose(np.array(F2_PDA)[:, 5], r['nda'][:, 5], atol=6e-5))
    # SP/SN from the printed PDA/NDA tables
    sp = np.array(F2_PDA) @ np.array(F2_W)
    sn = np.array(F2_NDA) @ np.array(F2_W)
    report('SP<-tbl', sp, T[:, 0])
    report('SN<-tbl', sn, T[:, 1])


# ---------------------------------------------------------------- F3: Sarihan & Aydin 2023
F3_X = [[38848825, 677113055, 2395334], [28879989, 1335400806, 205743112], [412260387, 3033464, 6512010],
        [152738514, 8607944, 300032], [194413476, 151880, 4558944], [66779465, 1509179, 139887],
        [520533558, 86015541, 262295624], [96517647, 19426417, 17893118], [113654549, 4205094, 234729690],
        [845241538, 25939867, 23727158], [224858429, 5013633825, 52057346], [302415677, 1844880, 9656996],
        [678417175, 6821703723, 607132629], [340316558, 294068655, 49850522]]
F3_W = [0.124, 0.521, 0.355]
F3_AV = [301484097, 1348516970, 131217376]
F3_T9 = [[0, 0.716, 0, 0.263, 0.132, 7], [0.201, 0.118, 0.057, 0.879, 0.468, 3],
         [0.046, 0.857, 0.013, 0.118, 0.065, 10], [0, 0.933, 0, 0.040, 0.020, 13],
         [0, 0.907, 0, 0.066, 0.033, 12], [0, 0.971, 0, 0, 0, 14], [0.445, 0.488, 0.125, 0.498, 0.311, 4],
         [0, 0.904, 0, 0.069, 0.035, 11], [0.280, 0.597, 0.079, 0.386, 0.232, 5],
         [0.224, 0.801, 0.063, 0.175, 0.119, 8], [1.416, 0.246, 0.398, 0.747, 0.573, 2],
         [0.000, 0.849, 0.000, 0.126, 0.063, 9], [3.556, 0, 1, 1, 1, 1], [0.016, 0.627, 0.005, 0.354, 0.179, 6]]
F3_PDA = [[0, 0, 0], [0, 0, 0.568], [0.367, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0], [0.727, 0, 0.999],
          [0, 0, 0], [0, 0, 0.789], [1.804, 0, 0], [0, 2.718, 0], [0.003, 0, 0], [1.250, 4.059, 3.627],
          [0.129, 0, 0]]
F3_NDA = [[0.871, 0.498, 0.982], [0.904, 0.010, 0], [0, 0.998, 0.950], [0.493, 0.994, 0.998],
          [0.355, 1.000, 0.965], [0.778, 0.999, 0.999], [0, 0.936, 0], [0.680, 0.986, 0.864],
          [0.623, 0.997, 0], [0, 0.981, 0.819], [0.254, 0, 0.603], [0, 0.999, 0.926], [0, 0, 0],
          [0, 0.782, 0.620]]


def f3():
    print('F3  Sarihan & Aydin 2023, Tables 2, 5-9 (14 x 3, all benefit, Entropy weights)')
    r = edas(F3_X, F3_W, 'bbb')
    T = np.array(F3_T9)
    report('AV', r['av'], F3_AV)
    report('PDA', r['pda'], F3_PDA)
    report('NDA', r['nda'], F3_NDA)
    report('SP', r['sp'], T[:, 0])
    report('SN', r['sn'], T[:, 1])
    report('NSP', r['nsp'], T[:, 2])
    report('NSN', r['nsn'], T[:, 3])
    report('AS', r['AS'], T[:, 4])
    print('  AS', r['AS'].round(4))
    print('  ranks', rank_desc(r['AS']), ' printed', T[:, 5].astype(int),
          ' MATCH' if list(rank_desc(r['AS'])) == list(T[:, 5].astype(int)) else ' MISMATCH')
    # Entropy weights cross-check (paper: min-max "standardize" Table 3, then p = r / sum r, Table 4-5)
    X = np.array(F3_X, float)
    R = (X - X.min(0)) / (X.max(0) - X.min(0))
    P = R / R.sum(0)
    with np.errstate(divide='ignore', invalid='ignore'):
        e = -np.nansum(np.where(P > 0, P * np.log(P), 0), axis=0) / np.log(len(X))
    w = (1 - e) / (1 - e).sum()
    print('  Entropy (min-max, variant b) recomputed e =', e.round(3), 'w =', w.round(3), ' printed e = [0.872 0.465 0.636] w = [0.124 0.521 0.355]')


# ---------------------------------------------------------------- edge cases
def edge():
    print('Edge cases')
    X = np.array([[1, 2], [1, 3], [1, 4]], float)
    r = edas(X, [0.5, 0.5], 'bb')
    print('  constant col 0: PDA/NDA col0 =', r['pda'][:, 0], r['nda'][:, 0], ' AS =', r['AS'].round(4))
    with np.errstate(all='ignore'):
        r = edas([[1, 1], [1, 1]], [0.5, 0.5], 'bb')
    print('  all rows equal: SP =', r['sp'], ' SN =', r['sn'], ' AS =', r['AS'], '(0/0 -> NaN, needs guard)')
    # every alternative at or above average on SN side -> max SN = 0 only if no one below average -> all equal
    with np.errstate(all='ignore'):
        r = edas([[0, 5], [0, 7]], [0.5, 0.5], 'bb')
    print('  zero-mean column (all 0):', r['pda'][:, 0], '(0/0)')
    r = edas([[-2, 5], [1, 7], [4, 6]], [0.5, 0.5], 'bb')
    print('  negative values, AV>0 col0 =', r['av'][0], ' PDA col0', r['pda'][:, 0].round(3), ' (ok, ratio to mean)')
    r = edas([[-4, 5], [1, 7], [-3, 6]], [0.5, 0.5], 'bb')
    print('  negative AV col0 =', r['av'][0].round(3), ' PDA col0', r['pda'][:, 0].round(3), ' NDA col0',
          r['nda'][:, 0].round(3), ' -> signs flip (best alternative gets NDA)')
    # shift dependence: add constant to a column
    a = edas(T5, T6[0], 'bbbcccc')['AS']
    X2 = np.array(T5, float)
    X2[:, 3] += 1.0
    b = edas(X2, T6[0], 'bbbcccc')['AS']
    print('  T5 set1, +1 on C4: max|dAS| =', np.abs(a - b).max().round(4), ' ranks', rank_desc(a), '->', rank_desc(b))
    # scale invariance
    X3 = np.array(T5, float)
    X3[:, 5] *= 0.001
    c = edas(X3, T6[0], 'bbbcccc')['AS']
    print('  T5 set1, x0.001 on C6: max|dAS| =', np.abs(a - c).max())
    # weight scale invariance
    d = edas(T5, np.array(T6[0]) * 7, 'bbbcccc')['AS']
    print('  weights x7: max|dAS| =', np.abs(a - d).max())
    # one alternative better or equal to mean on all -> SN=0 -> NSN=1 fine; two alternatives
    r = edas([[1, 4], [3, 2]], [0.5, 0.5], 'bb')
    print('  m=2:', r['AS'])
    # rank reversal demo: drop A10 from T5 set1
    full = rank_desc(a)
    sub = rank_desc(edas(np.array(T5)[:9], T6[0], 'bbbcccc')['AS'])
    print('  drop A10: ranks A1..A9', full[:9], '->', sub)
    # rank reversal search: remove one alternative, check whether any pair of the remaining swaps order
    found = 0
    for s_, w in enumerate(T6):
        base = edas(T5, w, 'bbbcccc')['AS']
        for k in range(10):
            keep = [i for i in range(10) if i != k]
            sub = edas(np.array(T5)[keep], w, 'bbbcccc')['AS']
            for a_ in range(9):
                for b_ in range(a_ + 1, 9):
                    i, j = keep[a_], keep[b_]
                    if (base[i] - base[j]) * (sub[a_] - sub[b_]) < 0:
                        found += 1
                        if found <= 5:
                            print(f'  rank reversal: set {s_ + 1}, remove A{k + 1}: A{i + 1} vs A{j + 1} '
                                  f'{base[i]:.4f}/{base[j]:.4f} -> {sub[a_]:.4f}/{sub[b_]:.4f}')
    print(f'  rank reversal pairs over 7 sets x 10 removals: {found}')
    # shift of an interval-scale column (Aydin Unal 2019 KK4 = z-score + A, A = |min z|)
    base = edas(F2_X, F2_W, F2_TYPES)['AS']
    for c in [1.0, 10.0]:
        X = np.array(F2_X, float)
        X[:, 3] += c
        r = edas(X, F2_W, F2_TYPES)['AS']
        print(f'  F2 KK4 + {c:g}: AS {r.round(4)} ranks {rank_desc(r)} (base ranks {rank_desc(base)}, max|dAS| {np.abs(r - base).max():.4f})')


if __name__ == '__main__':
    f1()
    print()
    f1b()
    print()
    f2()
    print()
    f3()
    print()
    edge()
