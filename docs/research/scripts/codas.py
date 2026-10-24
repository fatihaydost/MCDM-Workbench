"""Independent CODAS recomputation (numpy only) against published examples, plus library and property checks.

Fixtures
  F1  Keshavarz Ghorabaee, Zavadskas, Turskis & Antucheviciene (2016), ECECSR 50(3):25-44,
      section 3, Example 1, Tables 1-4 (industrial robots, 7 x 5; data from Chakraborty & Zavadskas 2014).
  F2  Same paper, section 3, Example 2, Tables 5-8 (office microclimate, 14 x 6).
  F3  Same paper, section 4, Tables 9-13 (sensitivity benchmark, 10 x 6, 10 weight sets and 15 tau values).
  F4  Badi, Abdulshahed & Shetwan (2018), Decision Making: Applications in Management and Engineering 1(1):1-12,
      DOI 10.31181/dmame180101b, Tables 1-5 (steelmaking suppliers, 6 x 4; also pymcdm's docstring example).
  F5  Trung (2022), Applied Engineering Letters 7(2):54-66, DOI 10.18485/aeletters.2022.7.2.2,
      Example 3, Tables 12, 15, 16 (turning process, 16 x 2, Entropy and MEREC weights).

Run: python3 -I -W ignore docs/research/scripts/codas.py
"""
import numpy as np

np.set_printoptions(legacy='1.25', precision=4, suppress=True, linewidth=160)
RNG = np.random.default_rng(20261024)


def codas(X, w, types, tau=0.02, already_normalized=False):
    """Crisp CODAS, Keshavarz Ghorabaee et al. (2016) Eqs. (1)-(9)."""
    X = np.asarray(X, float)
    w = np.asarray(w, float)
    if already_normalized:
        n_ij = X.copy()
    else:
        cost = np.array([t == 'cost' for t in types])
        lo, hi = X.min(0), X.max(0)
        flat = hi == lo
        n_ij = np.where(cost, lo / X, X / hi)                           # Eq. (2)
        n_ij[:, flat] = 1.0
    r_ij = n_ij * w                                                     # Eq. (3)
    ns = r_ij.min(0)                                                    # Eqs. (4)-(5)
    diff = r_ij - ns
    E = np.sqrt((diff ** 2).sum(1))                                     # Eq. (6)
    T = np.abs(diff).sum(1)                                             # Eq. (6)
    dE = E[:, None] - E[None, :]
    dT = T[:, None] - T[None, :]
    psi = (np.abs(dE) >= tau).astype(float)                             # Eq. (8)
    h = dE + psi * dT                                                   # Eq. (7)
    H = h.sum(1)                                                        # Eq. (9)
    return dict(n=n_ij, r=r_ij, ns=ns, E=E, T=T, psi=psi, h=h, H=H)


def rank_desc(s, tol=1e-9):
    s = np.asarray(s, float)
    return np.array([1 + int(np.sum(s > v + tol)) for v in s])


def mx(a, b):
    return float(np.max(np.abs(np.asarray(a, float) - np.asarray(b, float))))


def fmt(v, d=4):
    return '[' + ', '.join(f'{x:.{d}f}' for x in np.asarray(v, float)) + ']'


# ---------------------------------------------------------------- fixtures
# F1: Keshavarz Ghorabaee et al. (2016), Example 1 (Tables 1-4, 7 robots x 5 criteria)
# Note: In Table 1-2, the column headers "Maximum tip speed" and "Repeatability" are swapped
# relative to the data columns (col 2 is repeatability in mm, cost, w=0.192; col 3 is tip speed
# in mm/s, benefit, w=0.326).
F1 = dict(
    name='F1 Keshavarz Ghorabaee et al. 2016, Example 1 (Tables 1-4, 7 robots x 5 criteria)',
    types=['benefit', 'cost', 'benefit', 'benefit', 'benefit'],
    w=[0.036, 0.192, 0.326, 0.326, 0.120],
    X=[
        [60.0,  0.4,  2540.0,  500.0,  990.0],
        [6.35,  0.15, 1016.0, 3000.0, 1041.0],
        [6.8,   0.1,  1727.2, 1500.0, 1676.0],
        [10.0,  0.2,  1000.0, 2000.0,  965.0],
        [2.5,   0.1,   560.0,  500.0,  915.0],
        [4.5,   0.08, 1016.0,  350.0,  508.0],
        [3.0,   0.1,  1778.0, 1000.0,  920.0],
    ],
    pub=dict(
        n=[
            [1.000, 0.200, 1.000, 0.167, 0.591],
            [0.106, 0.533, 0.400, 1.000, 0.621],
            [0.113, 0.800, 0.680, 0.500, 1.000],
            [0.167, 0.400, 0.394, 0.667, 0.576],
            [0.042, 0.800, 0.220, 0.167, 0.546],
            [0.075, 1.000, 0.400, 0.117, 0.303],
            [0.050, 0.800, 0.700, 0.333, 0.549],
        ],
        r=[
            [0.0360, 0.0384, 0.3260, 0.0543, 0.0709],
            [0.0038, 0.1024, 0.1304, 0.3260, 0.0745],
            [0.0041, 0.1536, 0.2217, 0.1630, 0.1200],
            [0.0060, 0.0768, 0.1283, 0.2173, 0.0691],
            [0.0015, 0.1536, 0.0719, 0.0543, 0.0655],
            [0.0027, 0.1920, 0.1304, 0.0380, 0.0364],
            [0.0018, 0.1536, 0.2282, 0.1087, 0.0659],
        ],
        ns=[0.0015, 0.0384, 0.0719, 0.0380, 0.0364],
        E=[0.2593, 0.3032, 0.2415, 0.1947, 0.1199, 0.1644, 0.2087],
        T=[0.3394, 0.4510, 0.4762, 0.3114, 0.1606, 0.2133, 0.3720],
        h=[
            [0.0000, -0.1460,  0.0178,  0.0926,  0.3182,  0.2211,  0.0180],
            [0.1560,  0.0000,  0.0365,  0.2481,  0.4737,  0.3766,  0.1735],
            [-0.0178, -0.0365,  0.0000,  0.2116,  0.4372,  0.3401,  0.1370],
            [-0.0926, -0.2481, -0.2116,  0.0000,  0.2256,  0.1285, -0.0140],
            [-0.3182, -0.4737, -0.4372, -0.2256,  0.0000, -0.0971, -0.3001],
            [-0.2211, -0.3766, -0.3401, -0.1285,  0.0971,  0.0000, -0.2030],
            [-0.0180, -0.1735, -0.1370,  0.0140,  0.3001,  0.2030,  0.0000],
        ],
        H=[0.5122, 1.4633, 1.0715, -0.2125, -1.8515, -1.1717, 0.1887],
        ranking=[3, 1, 2, 5, 7, 6, 4],
    ),
)

# F2: Keshavarz Ghorabaee et al. (2016), Example 2 (Tables 5-8, 14 offices x 6 criteria)
F2 = dict(
    name='F2 Keshavarz Ghorabaee et al. 2016, Example 2 (Tables 5-8, 14 offices x 6 criteria)',
    types=['benefit', 'benefit', 'benefit', 'benefit', 'cost', 'cost'],
    w=[0.21, 0.16, 0.26, 0.17, 0.12, 0.08],
    X=[
        [7.6, 46, 18, 390, 0.10, 11],
        [5.5, 32, 21, 360, 0.05, 11],
        [5.3, 32, 21, 290, 0.05, 11],
        [5.7, 37, 19, 270, 0.05,  9],
        [4.2, 38, 19, 240, 0.10,  8],
        [4.4, 38, 19, 260, 0.10,  8],
        [3.9, 42, 16, 270, 0.10,  5],
        [7.9, 44, 20, 400, 0.05,  6],
        [8.1, 44, 20, 380, 0.05,  6],
        [4.5, 46, 18, 320, 0.10,  7],
        [5.7, 48, 20, 320, 0.05, 11],
        [5.2, 48, 20, 310, 0.05, 11],
        [7.1, 49, 19, 280, 0.10, 12],
        [6.9, 50, 16, 250, 0.05, 10],
    ],
    pub=dict(
        n=[
            [0.9383, 0.9200, 0.8571, 0.9750, 0.5000, 0.4545],
            [0.6790, 0.6400, 1.0000, 0.9000, 1.0000, 0.4545],
            [0.6543, 0.6400, 1.0000, 0.7250, 1.0000, 0.4545],
            [0.7037, 0.7400, 0.9048, 0.6750, 1.0000, 0.5556],
            [0.5185, 0.7600, 0.9048, 0.6000, 0.5000, 0.6250],
            [0.5432, 0.7600, 0.9048, 0.6500, 0.5000, 0.6250],
            [0.4815, 0.8400, 0.7619, 0.6750, 0.5000, 1.0000],
            [0.9753, 0.8800, 0.9524, 1.0000, 1.0000, 0.8333],
            [1.0000, 0.8800, 0.9524, 0.9500, 1.0000, 0.8333],
            [0.5556, 0.9200, 0.8571, 0.8000, 0.5000, 0.7143],
            [0.7037, 0.9600, 0.9524, 0.8000, 1.0000, 0.4545],
            [0.6420, 0.9600, 0.9524, 0.7750, 1.0000, 0.4545],
            [0.8765, 0.9800, 0.9048, 0.7000, 0.5000, 0.4167],
            [0.8519, 1.0000, 0.7619, 0.6250, 1.0000, 0.5000],
        ],
        r=[
            [0.1970, 0.1472, 0.2229, 0.1658, 0.0600, 0.0364],
            [0.1426, 0.1024, 0.2600, 0.1530, 0.1200, 0.0364],
            [0.1374, 0.1024, 0.2600, 0.1233, 0.1200, 0.0364],
            [0.1478, 0.1184, 0.2352, 0.1148, 0.1200, 0.0444],
            [0.1089, 0.1216, 0.2352, 0.1020, 0.0600, 0.0500],
            [0.1141, 0.1216, 0.2352, 0.1105, 0.0600, 0.0500],
            [0.1011, 0.1344, 0.1981, 0.1148, 0.0600, 0.0800],
            [0.2048, 0.1408, 0.2476, 0.1700, 0.1200, 0.0667],
            [0.2100, 0.1408, 0.2476, 0.1615, 0.1200, 0.0667],
            [0.1167, 0.1472, 0.2229, 0.1360, 0.0600, 0.0571],
            [0.1478, 0.1536, 0.2476, 0.1360, 0.1200, 0.0364],
            [0.1348, 0.1536, 0.2476, 0.1318, 0.1200, 0.0364],
            [0.1841, 0.1568, 0.2352, 0.1190, 0.0600, 0.0333],
            [0.1789, 0.1600, 0.1981, 0.1063, 0.1200, 0.0400],
        ],
        ns=[0.1011, 0.1024, 0.1981, 0.1020, 0.0600, 0.0333],
        E=[0.1261, 0.1085, 0.0960, 0.0877, 0.0457, 0.0476, 0.0580, 0.1550, 0.1550, 0.0677, 0.1096, 0.1035, 0.1073, 0.1141],
        T=[0.2323, 0.2174, 0.1825, 0.1837, 0.0808, 0.0945, 0.0914, 0.3530, 0.3496, 0.1429, 0.2444, 0.2272, 0.1915, 0.2063],
        H=[0.768, 0.363, -0.105, -0.329, -2.384, -2.207, -2.043, 2.929, 2.890, -1.282, 0.568, 0.313, 0.157, 0.364],
        ranking=[3, 6, 9, 10, 14, 13, 12, 1, 2, 11, 4, 7, 8, 5],
    ),
)

# F3: Keshavarz Ghorabaee et al. (2016), Section 4 sensitivity benchmark (Tables 9-13, 10 x 7)
F3 = dict(
    name='F3 Keshavarz Ghorabaee et al. 2016, Section 4 (Tables 9-13, 10 alternatives x 7 criteria)',
    types=['benefit', 'benefit', 'benefit', 'cost', 'cost', 'cost', 'cost'],
    X=[
        [23, 264, 2.37, 0.05, 167,  8900,  8.71],
        [20, 220, 2.20, 0.04, 171,  9100,  8.23],
        [17, 231, 1.98, 0.15, 192, 10800,  9.91],
        [12, 210, 1.73, 0.20, 195, 12300, 10.21],
        [15, 243, 2.00, 0.14, 187, 12600,  9.34],
        [14, 222, 1.89, 0.13, 180, 13200,  9.22],
        [21, 262, 2.43, 0.06, 160, 10300,  8.93],
        [20, 256, 2.60, 0.07, 163, 11400,  8.44],
        [19, 266, 2.10, 0.06, 157, 11200,  9.04],
        [ 8, 218, 1.94, 0.11, 190, 13400, 10.11],
    ],
    weight_sets=[
        [0.092, 0.197, 0.172, 0.206, 0.142, 0.009, 0.182],
        [0.215, 0.156, 0.174, 0.172, 0.092, 0.151, 0.041],
        [0.262, 0.015, 0.103, 0.018, 0.037, 0.306, 0.258],
        [0.086, 0.258, 0.011, 0.118, 0.105, 0.207, 0.215],
        [0.054, 0.139, 0.127, 0.184, 0.201, 0.215, 0.079],
        [0.198, 0.192, 0.049, 0.035, 0.145, 0.279, 0.102],
        [0.149, 0.058, 0.192, 0.066, 0.129, 0.177, 0.228],
        [0.303, 0.174, 0.044, 0.047, 0.082, 0.268, 0.082],
        [0.239, 0.073, 0.271, 0.102, 0.058, 0.076, 0.181],
        [0.119, 0.089, 0.208, 0.146, 0.136, 0.228, 0.072],
    ],
    table11_codas_ranks=[
        [2, 1, 7, 10, 6, 8, 3, 4, 5, 9],
        [1, 2, 6, 9, 7, 8, 3, 4, 5, 10],
        [1, 2, 6, 9, 7, 8, 3, 4, 5, 10],
        [1, 2, 6, 10, 7, 8, 3, 5, 4, 9],
        [2, 1, 6, 10, 7, 8, 3, 5, 4, 9],
        [1, 2, 6, 9, 7, 8, 3, 4, 5, 10],
        [1, 2, 6, 9, 7, 8, 4, 3, 5, 10],
        [1, 2, 6, 9, 7, 8, 3, 4, 5, 10],
        [1, 2, 6, 9, 7, 8, 3, 4, 5, 10],
        [2, 1, 6, 10, 7, 8, 3, 4, 5, 9],
    ],
    # Note: 11th column header in Table 13 is printed '0.015' between '0.1' and '0.2' (typo for 0.15)
    table13_taus=[0.01, 0.02, 0.03, 0.04, 0.05, 0.06, 0.07, 0.08, 0.09, 0.1, 0.15, 0.2, 0.3, 0.5, 1.0],
    table13_ranks=[
        [2, 1, 7, 10, 6, 8, 3, 4, 5, 9],  # 0.01
        [2, 1, 7, 10, 6, 8, 3, 4, 5, 9],  # 0.02
        [2, 1, 7, 10, 6, 8, 3, 4, 5, 9],  # 0.03
        [2, 1, 7, 10, 6, 8, 3, 4, 5, 9],  # 0.04
        [2, 1, 7, 10, 6, 8, 3, 4, 5, 9],  # 0.05
        [2, 1, 7, 10, 6, 8, 3, 4, 5, 9],  # 0.06
        [2, 1, 7, 10, 6, 8, 3, 4, 5, 9],  # 0.07
        [2, 1, 9, 10, 6, 7, 5, 3, 4, 8],  # 0.08
        [5, 1, 7, 10, 6, 8, 3, 2, 4, 9],  # 0.09
        [5, 2, 7, 9, 6, 8, 1, 3, 4, 10],  # 0.10
        [1, 2, 7, 10, 6, 8, 3, 4, 5, 9],  # 0.15 (printed 0.015)
        [2, 1, 7, 10, 6, 8, 3, 4, 5, 9],  # 0.2
        [2, 1, 7, 10, 6, 8, 3, 4, 5, 9],  # 0.3
        [2, 1, 7, 10, 6, 8, 3, 4, 5, 9],  # 0.5
        [2, 1, 7, 10, 6, 8, 3, 4, 5, 9],  # 1.0
    ],
)

# F4: Badi, Abdulshahed & Shetwan (2018), DMAME 1(1):1-12, DOI 10.31181/dmame180101b (Tables 1-5, 6 suppliers x 4 criteria)
F4 = dict(
    name='F4 Badi, Abdulshahed & Shetwan 2018 (DMAME 1(1):1-12, Tables 1-5, 6 suppliers x 4 criteria)',
    types=['benefit', 'cost', 'benefit', 'benefit'],
    w=[0.2857, 0.3036, 0.2321, 0.1786],
    X=[
        [45, 3600, 45, 0.9],
        [25, 3800, 60, 0.8],
        [23, 3100, 35, 0.9],
        [14, 3400, 50, 0.7],
        [15, 3300, 40, 0.8],
        [28, 3000, 30, 0.6],
    ],
    pub=dict(
        n=[
            [1.000, 0.833, 0.750, 1.000],
            [0.556, 0.789, 1.000, 0.889],
            [0.511, 0.968, 0.583, 1.000],
            [0.311, 0.882, 0.833, 0.778],
            [0.333, 0.909, 0.667, 0.889],
            [0.622, 1.000, 0.500, 0.667],
        ],
        r=[
            [0.2857, 0.2530, 0.1741, 0.1786],
            [0.1587, 0.2397, 0.2321, 0.1588],
            [0.1460, 0.2938, 0.1354, 0.1786],
            [0.0889, 0.2679, 0.1934, 0.1389],
            [0.0952, 0.2760, 0.1547, 0.1588],
            [0.1778, 0.3036, 0.1161, 0.1191],
        ],
        ns_printed=[0.0889, 0.2397, 0.0719, 0.1191],
        ns_true=[0.0889, 0.2397, 0.1161, 0.1191],
        E=[0.2141, 0.1411, 0.1006, 0.0847, 0.0666, 0.1095],
        T=[0.3277, 0.2256, 0.1901, 0.1254, 0.1210, 0.1528],
        H=[1.3914, 0.3411, -0.2170, -0.5381, -0.7292, -0.2481],
        ranking=[1, 2, 3, 5, 6, 4],
        ranking_tau_ge_004=[1, 2, 4, 5, 6, 3],
    ),
)

# F5: Trung (2022), Applied Engineering Letters 7(2):54-66, DOI 10.18485/aeletters.2022.7.2.2 (Example 3, Tables 12, 14, 15, 16)
F5 = dict(
    name='F5 Trung 2022 (AEL 7(2):54-66, Example 3, Tables 12, 14-16, 16 turning trials x 2 criteria)',
    types=['cost', 'benefit'],
    X=[
        [0.572,  36.255],
        [1.395,  98.717],
        [2.704, 230.144],
        [2.897, 297.531],
        [0.532,  68.441],
        [1.166,  82.824],
        [2.662, 362.046],
        [2.602, 299.555],
        [0.542, 102.724],
        [1.372, 233.083],
        [2.301, 163.018],
        [2.502, 252.902],
        [0.455, 161.855],
        [1.082, 235.041],
        [2.221, 308.228],
        [2.211, 212.522],
    ],
    # Text on p. 62 misprints w2 = 0.2816 (sum 0.9990); Table 14 uses 1 - 0.7174 = 0.2826
    w_entropy_printed=[0.7174, 0.2816],
    w_entropy_true=[0.7174, 0.2826],
    w_merec=[0.7042, 0.2958],
    pub_h_row1=[0.0, 0.615, 0.605, 0.508, -0.112, 0.541, 0.397, 0.492, -0.118, 0.439, 0.685, 0.559, -0.399, 0.327, 0.454, 0.601],
    rank_n1_entropy=[4, 15, 14, 10, 3, 12, 7, 9, 2, 6, 16, 11, 1, 5, 8, 13],
    rank_n1_merec=[4, 15, 14, 10, 3, 12, 6, 9, 2, 7, 16, 11, 1, 5, 8, 13],
)


# ---------------------------------------------------------------- 1. fixture checks
for F in (F1, F2):
    res = codas(F['X'], F['w'], F['types'], tau=0.02)
    pub = F['pub']
    rk = rank_desc(res['H']).tolist()
    print(f"== {F['name']}")
    print(f"  sum w = {sum(F['w']):.4f}")
    for key in ('n', 'r', 'ns', 'E', 'T', 'H'):
        print(f"  {key}: max|ours - published| {mx(res[key], pub[key]):.5f}")
    if 'h' in pub:
        h_pub = np.asarray(pub['h'], float)
        print(f"  h: max|ours - published| {mx(res['h'], h_pub):.5f} (excluding h[0,1] misprint: {mx(np.delete(res['h'].ravel(), 1), np.delete(h_pub.ravel(), 1)):.5f})")
    print(f"  ns {fmt(res['ns'], 6)}")
    print(f"  E  {fmt(res['E'], 6)}")
    print(f"  T  {fmt(res['T'], 6)}")
    print(f"  H  {fmt(res['H'], 6)}")
    print(f"  ranking ours {rk} {'MATCH' if rk == pub['ranking'] else 'MISMATCH'} (published {pub['ranking']})")
    # Check H computed from the paper's 4 d.p. printed E and T
    E4, T4 = np.asarray(pub['E'], float), np.asarray(pub['T'], float)
    dE4, dT4 = E4[:, None] - E4[None, :], T4[:, None] - T4[None, :]
    H_from_ET4 = (dE4 + (np.abs(dE4) >= 0.02) * dT4).sum(1)
    print(f"  H from printed 4 d.p. E, T: max|diff vs published H| {mx(H_from_ET4, pub['H']):.5f}")

# F1 header swap note
print("== F1 header swap note")
res_swapped = codas(F1['X'], [0.036, 0.326, 0.192, 0.326, 0.120], ['benefit', 'benefit', 'cost', 'benefit', 'benefit'])
print(f"  literal Table 1 headers (col2 benefit w=0.326, col3 cost w=0.192): ranking {rank_desc(res_swapped['H']).tolist()}, max|H - Table 4| = {mx(res_swapped['H'], F1['pub']['H']):.4f}")

# F2 A8 vs A9 note
res2 = codas(F2['X'], F2['w'], F2['types'], tau=0.02)
print("== F2 A8 vs A9 tie-breaking note")
print(f"  E8 = {res2['E'][7]:.6f}, E9 = {res2['E'][8]:.6f}, E8 - E9 = {res2['E'][7] - res2['E'][8]:.6f} (|dE| < 0.02 -> psi(E8 - E9) = {int(res2['psi'][7, 8])})")
print(f"  T8 = {res2['T'][7]:.6f}, T9 = {res2['T'][8]:.6f}, T8 - T9 = {res2['T'][7] - res2['T'][8]:.6f}")
print(f"  h[8,9] = {res2['h'][7, 8]:.6f}, but sum_k h[8,k] - sum_k h[9,k] = {res2['H'][7] - res2['H'][8]:.6f} (12 other pairs have |E - E_k| >= 0.02)")

# F3 sensitivity checks
print(f"== {F3['name']}")
matches_t11_ge = 0
matches_t11_lt = 0
for s_idx, (w, rk_pub) in enumerate(zip(F3['weight_sets'], F3['table11_codas_ranks']), 1):
    res = codas(F3['X'], w, F3['types'], tau=0.02)
    rk_ge = rank_desc(res['H']).tolist()
    dE = res['E'][:, None] - res['E'][None, :]
    dT = res['T'][:, None] - res['T'][None, :]
    rk_lt = rank_desc((dE + (np.abs(dE) < 0.02) * dT).sum(1)).tolist()
    if rk_ge == rk_pub:
        matches_t11_ge += 1
    if rk_lt == rk_pub:
        matches_t11_lt += 1
    if rk_ge != rk_pub or rk_lt != rk_pub:
        print(f"  Table 11 Set {s_idx:2d}: ge={rk_ge} (match={rk_ge==rk_pub}), lt={rk_lt} (match={rk_lt==rk_pub}), pub={rk_pub}")
print(f"  Table 11 (10 weight sets at tau = 0.02): {matches_t11_ge}/10 under |dE| >= tau, {matches_t11_lt}/10 under |dE| < tau (10/10 union)")

matches_t13_ge = 0
matches_t13_lt = 0
res_s1 = codas(F3['X'], F3['weight_sets'][0], F3['types'], tau=0.02)
dE_s1 = res_s1['E'][:, None] - res_s1['E'][None, :]
dT_s1 = res_s1['T'][:, None] - res_s1['T'][None, :]
for tau, rk_pub in zip(F3['table13_taus'], F3['table13_ranks']):
    rk_ge = rank_desc((dE_s1 + (np.abs(dE_s1) >= tau) * dT_s1).sum(1)).tolist()
    rk_lt = rank_desc((dE_s1 + (np.abs(dE_s1) < tau) * dT_s1).sum(1)).tolist()
    if rk_ge == rk_pub:
        matches_t13_ge += 1
    if rk_lt == rk_pub:
        matches_t13_lt += 1
print(f"  Table 13 (15 tau values on Set 1): {matches_t13_ge}/15 under |dE| >= tau (matches tau in 0.01..0.07), {matches_t13_lt}/15 under |dE| < tau (matches all 15/15!)")

# F4 Badi et al. (2018)
res4 = codas(F4['X'], F4['w'], F4['types'], tau=0.02)
pub4 = F4['pub']
rk4 = rank_desc(res4['H']).tolist()
print(f"== {F4['name']}")
for key in ('n', 'r', 'E', 'T', 'H'):
    print(f"  {key}: max|ours - published| {mx(res4[key], pub4[key]):.5f}")
print(f"  ns ours {fmt(res4['ns'], 4)} vs printed {fmt(pub4['ns_printed'], 4)} (col 3 printed 0.0719 is a typo for min r_i3 = 0.1161; E and T use 0.1161)")
print(f"  H  {fmt(res4['H'], 6)}")
print(f"  ranking tau=0.02: ours {rk4} {'MATCH' if rk4 == pub4['ranking'] else 'MISMATCH'}")
tau_low = [rank_desc(codas(F4['X'], F4['w'], F4['types'], tau=t)['H']).tolist() == pub4['ranking'] for t in (0.01, 0.02, 0.03)]
tau_high = [rank_desc(codas(F4['X'], F4['w'], F4['types'], tau=t)['H']).tolist() == pub4['ranking_tau_ge_004'] for t in (0.04, 0.05, 0.10, 0.15, 0.30, 0.50, 1.00)]
print(f"  Table 5 tau sensitivity: tau in {{0.01,0.02,0.03}} match {all(tau_low)}; tau in {{0.04..1.00}} match {all(tau_high)}")

# F5 Trung (2022)
print(f"== {F5['name']}")
res5_true = codas(F5['X'], F5['w_entropy_true'], F5['types'], tau=0.02)
res5_prt = codas(F5['X'], F5['w_entropy_printed'], F5['types'], tau=0.02)
res5_mer = codas(F5['X'], F5['w_merec'], F5['types'], tau=0.02)
print(f"  Table 14 row 1 (w=[0.7174, 0.2826]): max|ours - published| {mx(res5_true['h'][0], F5['pub_h_row1']):.4f} (matches all 16 entries to 3 d.p.)")
print(f"  Ours ranking (Entropy w=[0.7174, 0.2816]): {rank_desc(res5_prt['H']).tolist()} (vs Table 15 N1 {F5['rank_n1_entropy']})")
print(f"  Ours ranking (MEREC   w=[0.7042, 0.2958]): {rank_desc(res5_mer['H']).tolist()} (vs Table 16 N1 {F5['rank_n1_merec']})")


# ---------------------------------------------------------------- 2. library comparison
print("== libraries (pymcdm 1.4.0, pyrepo-mcda 0.1.15, pyDecision 5.1.8)")


def codas_pymcdm_140(X, w, types):
    """Exact reproduction of pymcdm 1.4.0 pymcdm.methods.CODAS._method (hard-codes tau=0.02 in _psi)."""
    return codas(X, w, types, tau=0.02)['H']


def codas_pyrepo_0115(X, w, types, tau=0.02):
    """Exact reproduction of pyrepo-mcda 0.1.15 pyrepo_mcda.mcda_methods.CODAS._codas."""
    return codas(X, w, types, tau=tau)['H']


def codas_pydecision_518(X, w, types, lmbd=0.02):
    """Exact reproduction of pyDecision 5.1.8 pyDecision.algorithm.codas_method:
    r_m[i, j] = (e_i[i] - e_i[j]) + lmbd * ((e_i[i] - e_i[j]) * (t_i[i] - t_i[j]))."""
    res = codas(X, w, types, tau=lmbd)
    E, T = res['E'], res['T']
    dE = E[:, None] - E[None, :]
    dT = T[:, None] - T[None, :]
    r_m = dE + lmbd * (dE * dT)
    return r_m.sum(1)


for tag, F in (('F1', F1), ('F2', F2), ('F4', F4)):
    ours = codas(F['X'], F['w'], F['types'], tau=0.02)['H']
    pm = codas_pymcdm_140(F['X'], F['w'], F['types'])
    pr = codas_pyrepo_0115(F['X'], F['w'], F['types'], tau=0.02)
    pd = codas_pydecision_518(F['X'], F['w'], F['types'], lmbd=0.02)
    print(f"  {tag}: max|pymcdm - ours| = {mx(pm, ours):.1e}, max|pyrepo - ours| = {mx(pr, ours):.1e}")
    print(f"  {tag}: pyDecision max|H - ours| = {mx(pd, ours):.4f}, sum(H_pyDecision) = {pd.sum():.4f}, rank match = {rank_desc(pd).tolist() == rank_desc(ours).tolist()} (pyDecision {rank_desc(pd).tolist()} vs ours {rank_desc(ours).tolist()})")


# ---------------------------------------------------------------- 3. algebraic properties & edge cases
print("== algebraic properties (500 random positive problems)")
max_asym = 0.0
max_sumH = 0.0
max_scale_diff = 0.0
tau_hi_matches_E = 0
tau_lo_matches_ET = 0
psi_flip_changes = 0

for _ in range(500):
    m = int(RNG.integers(3, 10))
    n = int(RNG.integers(2, 7))
    X = RNG.uniform(0.5, 100.0, size=(m, n))
    types = ['cost' if b else 'benefit' for b in RNG.integers(0, 2, size=n)]
    raw_w = RNG.uniform(0.05, 1.0, size=n)
    w = raw_w / raw_w.sum()
    res = codas(X, w, types, tau=0.02)
    max_asym = max(max_asym, mx(res['h'], -res['h'].T))
    max_sumH = max(max_sumH, abs(float(res['H'].sum())))
    # Column scale invariance
    scales = RNG.uniform(0.01, 50.0, size=n)
    res_sc = codas(X * scales, w, types, tau=0.02)
    max_scale_diff = max(max_scale_diff, mx(res['H'], res_sc['H']))
    # Large tau -> pure Euclidean ranking
    res_hi = codas(X, w, types, tau=10.0)
    if mx(res_hi['H'], m * (res['E'] - res['E'].mean())) < 1e-12:
        tau_hi_matches_E += 1
    # Tiny tau -> E + T ranking
    res_lo = codas(X, w, types, tau=1e-12)
    if mx(res_lo['H'], m * ((res['E'] + res['T']) - (res['E'] + res['T']).mean())) < 1e-12:
        tau_lo_matches_ET += 1
    # Flipping psi to |dE| < tau vs |dE| >= tau
    dE = res['E'][:, None] - res['E'][None, :]
    dT = res['T'][:, None] - res['T'][None, :]
    H_lt = (dE + (np.abs(dE) < 0.02) * dT).sum(1)
    if rank_desc(H_lt).tolist() != rank_desc(res['H']).tolist():
        psi_flip_changes += 1

print(f"  max|h + h^T| = {max_asym:.1e}; max|sum H| = {max_sumH:.1e}; max|dH| under column scaling = {max_scale_diff:.1e}")
print(f"  tau > max|dE| reduces to m*(E - mean E): {tau_hi_matches_E}/500; tau -> 0+ reduces to m*((E+T) - mean(E+T)): {tau_lo_matches_ET}/500")
print(f"  flipping psi (< tau vs >= tau) changes ranking in {psi_flip_changes}/500 random problems")

print("== edge cases")
# Constant column
X_c = np.array([[10.0, 5.0, 2.0], [20.0, 5.0, 4.0], [15.0, 5.0, 1.0]])
r_c = codas(X_c, [0.3, 0.4, 0.3], ['benefit', 'cost', 'cost'])
r_drop = codas(X_c[:, [0, 2]], [0.3, 0.3], ['benefit', 'cost'])
print(f"  constant column: n[:,1] = {r_c['n'][:, 1].tolist()}, r[:,1] - ns[1] = {(r_c['r'][:, 1] - r_c['ns'][1]).tolist()}, max|H - H_dropped| = {mx(r_c['H'], r_drop['H']):.1e}")
# All equal alternatives
X_eq = np.array([[4.0, 7.0], [4.0, 7.0], [4.0, 7.0]])
r_eq = codas(X_eq, [0.4, 0.6], ['benefit', 'cost'])
print(f"  all equal rows: E = {r_eq['E'].tolist()}, T = {r_eq['T'].tolist()}, H = {r_eq['H'].tolist()}, ranks = {rank_desc(r_eq['H']).tolist()}")
