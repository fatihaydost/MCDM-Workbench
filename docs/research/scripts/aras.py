"""Independent ARAS recomputation (numpy only) against published examples and algebraic properties.

Fixtures
  F1  Zavadskas & Turskis (2010), Technological and Economic Development of Economy 16(2):159-172,
      DOI 10.3846/tede.2010.10, Tables 1-3 (14 office rooms x 6 criteria, 4 benefit + 2 cost).
      Tested both with the paper's external norm row (F1a) and with the default column-best row (F1b / pyDecision).
  F2  Bakir & Atalik (2018), Isletme Arastirmalari Dergisi 10(1):617-638, DOI 10.20491/isarder.2018.410,
      Tables 3-11 (11 airlines x 7 criteria, Entropy -> ARAS, column-best A0).
  F3  Aytac Adali & Tus Isik (2016), Manas J. Social Studies 5(2):124-138, Tables 1, 5-8
      (6 air conditioners x 8 criteria, 3 benefit + 5 cost, column-best A0; C3 has zeros so secondary).
  F4  Keshavarz Ghorabaee et al. (2015) Table 5 Set 1 (10 x 7 benchmark used in Compare tests).

Run: python3 -I docs/research/scripts/aras.py
"""
import numpy as np

np.set_printoptions(legacy='1.25', precision=6, suppress=True, linewidth=160)


def aras(X, w, types, optimal=None):
    """Crisp ARAS (Zavadskas & Turskis 2010, Eqs. 1-16).

    X: m x n matrix (alternatives x criteria).
    w: length-n weights (sum to 1).
    types: list of 'benefit' | 'cost'.
    optimal: optional length-n optimal row x_0j; defaults to max_i x_ij (benefit) / min_i x_ij (cost).
    """
    X = np.asarray(X, float)
    w = np.asarray(w, float)
    cost = np.array([t == 'cost' for t in types])
    if optimal is None:
        x0 = np.where(cost, X.min(axis=0), X.max(axis=0))
    else:
        x0 = np.asarray(optimal, float)
    E = np.vstack([x0, X])                          # (m + 1) x n extended matrix, rows 0..m
    with np.errstate(divide='ignore'):
        E_star = np.where(cost, 1.0 / E, E)         # cost criteria inverted via 1/x (including row 0)
    col_sums = E_star.sum(axis=0)
    R_all = E_star / col_sums                       # normalized extended matrix \bar{x}_{ij}
    V_all = R_all * w                               # weighted normalized matrix \hat{x}_{ij}
    S_all = V_all.sum(axis=1)                       # optimality function S_0..S_m
    S0 = float(S_all[0])
    S = S_all[1:]
    K = S / S0                                      # utility degree K_i = S_i / S_0
    return dict(
        x0=x0,
        R0=R_all[0],
        R=R_all[1:],
        R_all=R_all,
        V0=V_all[0],
        V=V_all[1:],
        V_all=V_all,
        S0=S0,
        S=S,
        K=K,
        rank=rank_desc(K),
    )


def saw_sum(X, w, types):
    X = np.asarray(X, float)
    w = np.asarray(w, float)
    cost = np.array([t == 'cost' for t in types])
    X_star = np.where(cost, 1.0 / X, X)
    R = X_star / X_star.sum(axis=0)
    return (R * w).sum(axis=1)


def saw_linear_max(X, w, types):
    X = np.asarray(X, float)
    w = np.asarray(w, float)
    cost = np.array([t == 'cost' for t in types])
    R = np.where(cost, X.min(axis=0) / X, X / X.max(axis=0))
    return (R * w).sum(axis=1)


def entropy_weights(X):
    X = np.asarray(X, float)
    P = X / X.sum(axis=0)
    e = -(P * np.log(P)).sum(axis=0) / np.log(X.shape[0])
    d = 1.0 - e
    return d / d.sum(), e, d


def rank_desc(s, tol=1e-9):
    s = np.asarray(s, float)
    return np.array([1 + int(np.sum(s > v + tol)) for v in s])


def maxdiff(a, b):
    return float(np.max(np.abs(np.asarray(a, float) - np.asarray(b, float))))


# ==============================================================================
# F1: Zavadskas & Turskis (2010), 14 rooms x 6 criteria
# ==============================================================================
F1_X = [
    [7.6, 46, 18, 390, 0.10, 11],
    [5.5, 32, 21, 360, 0.05, 11],
    [5.3, 32, 21, 290, 0.05, 11],
    [5.7, 37, 19, 270, 0.05, 9],
    [4.2, 38, 19, 240, 0.10, 8],
    [4.4, 38, 19, 260, 0.10, 8],
    [3.9, 42, 16, 270, 0.10, 5],
    [7.9, 44, 20, 400, 0.05, 6],
    [8.1, 44, 20, 380, 0.05, 6],
    [4.5, 46, 18, 320, 0.10, 7],
    [5.7, 48, 20, 320, 0.05, 11],
    [5.2, 48, 20, 310, 0.05, 11],
    [7.1, 49, 19, 280, 0.10, 12],
    [6.9, 50, 16, 250, 0.05, 10],
]
F1_T = ['benefit', 'benefit', 'benefit', 'benefit', 'cost', 'cost']
F1_W = [0.21, 0.16, 0.26, 0.17, 0.12, 0.08]
F1_OPT_NORMS = [15.0, 50.0, 24.5, 400.0, 0.05, 5.0]

F1_R0_PUB = [0.1546, 0.0776, 0.0843, 0.0846, 0.0833, 0.1067]
F1_S0_PUB = 0.0997
F1_S_PUB = [0.0669, 0.0655, 0.0625, 0.0630, 0.0545, 0.0556, 0.0564, 0.0771, 0.0771, 0.0599, 0.0675, 0.0661, 0.0632, 0.0649]
F1_K_PUB = [0.6707, 0.6564, 0.6269, 0.6315, 0.5464, 0.5580, 0.5659, 0.7727, 0.7734, 0.6004, 0.6773, 0.6628, 0.6334, 0.6511]
F1_RANK_PUB = [4, 6, 10, 9, 14, 13, 12, 2, 1, 11, 3, 5, 8, 7]
F1_RANK_CORR = [4, 6, 10, 9, 14, 13, 12, 1, 2, 11, 3, 5, 8, 7]

r1a = aras(F1_X, F1_W, F1_T, optimal=F1_OPT_NORMS)
print('== F1a Zavadskas & Turskis 2010 (with paper external optimal norms [15, 50, 24.5, 400, 0.05, 5])')
print(f'  R0     {np.round(r1a["R0"], 6).tolist()} (max|diff vs Table 2 row 0| = {maxdiff(r1a["R0"], F1_R0_PUB):.6f})')
print(f'  S0     {r1a["S0"]:.6f} (printed {F1_S0_PUB})')
print(f'  S      {np.round(r1a["S"], 6).tolist()}')
print(f'  K      {np.round(r1a["K"], 6).tolist()}')
print(f'  rank   {r1a["rank"].tolist()} (corrected rank MATCH: {list(r1a["rank"]) == F1_RANK_CORR})')
mask_no8 = [i for i in range(14) if i != 7]
print(f'  max|S - pub| (all 14): {maxdiff(r1a["S"], F1_S_PUB):.6f}; excluding room 8: {maxdiff(r1a["S"][mask_no8], np.array(F1_S_PUB)[mask_no8]):.6f}')
print(f'  max|K - pub| (all 14): {maxdiff(r1a["K"], F1_K_PUB):.6f}; excluding room 8: {maxdiff(r1a["K"][mask_no8], np.array(F1_K_PUB)[mask_no8]):.6f}')
print(f'  Room 8 Table 2 col 4 typo check: true sum(col 4)=4740 -> R0[3]={400/4740:.6f}, R[7,3]={400/4740:.6f}; '
      f'with room 8 col 4 entered as 390 (room 1), sum=4730 -> R0[3]={400/4730:.6f} (pub 0.0846), R[0,3]=R[7,3]={390/4730:.6f} (pub 0.0825)')
X_typo = [list(row) for row in F1_X]
X_typo[7][3] = 390
r1a_typo = aras(X_typo, F1_W, F1_T, optimal=F1_OPT_NORMS)
print(f'  Recomputed with X[7,3]=390: R0={np.round(r1a_typo["R0"], 4).tolist()} (matches Table 2 row 0 {F1_R0_PUB} to 4 d.p.!), '
      f'max|S - pub|={maxdiff(r1a_typo["S"], F1_S_PUB):.6f}, max|K - pub|={maxdiff(r1a_typo["K"], F1_K_PUB):.6f}, '
      f'rank={r1a_typo["rank"].tolist()} == pub: {list(r1a_typo["rank"]) == F1_RANK_PUB}')

r1b = aras(F1_X, F1_W, F1_T)
print('\n== F1b Zavadskas & Turskis 2010 (default column-best A0 = [8.1, 50, 21, 400, 0.05, 5], pyDecision convention)')
print(f'  x0     {r1b["x0"].tolist()}')
print(f'  S0     {r1b["S0"]:.6f}')
print(f'  S      {np.round(r1b["S"], 6).tolist()}')
print(f'  K      {np.round(r1b["K"], 6).tolist()}')
print(f'  rank   {r1b["rank"].tolist()} (same ranking as F1a corrected: {list(r1b["rank"]) == F1_RANK_CORR})')


# ==============================================================================
# F2: Bakir & Atalik (2018), 11 airlines x 7 benefit criteria, Entropy -> ARAS
# ==============================================================================
F2_ALTS = ['Air China', 'Air France', 'ANA', 'British Airways', 'China Southern', 'Emirates', 'Hainan', 'LATAM', 'Lufthansa', 'Qantas', 'THY']
F2_CRIT = ['HL', 'FU', 'HP', 'UK', 'UI', 'EL', 'KY']
F2_T = ['benefit'] * 7
F2_X = [
    [3.100, 2.714, 2.750, 3.500, 3.167, 2.700, 3.219],
    [3.750, 3.929, 4.000, 3.938, 3.667, 3.750, 3.563],
    [4.750, 4.125, 4.000, 4.800, 4.500, 4.625, 4.800],
    [3.500, 3.250, 3.750, 3.300, 3.000, 3.375, 4.200],
    [3.900, 4.071, 4.125, 4.000, 3.667, 3.500, 3.907],
    [3.500, 4.071, 3.750, 3.688, 3.667, 4.417, 3.625],
    [4.250, 3.571, 3.875, 4.875, 4.500, 3.875, 4.187],
    [2.800, 3.000, 3.000, 3.250, 2.667, 3.500, 3.000],
    [3.750, 4.143, 3.375, 4.000, 3.667, 3.800, 3.687],
    [3.900, 4.214, 4.000, 4.125, 4.000, 4.125, 3.969],
    [3.500, 4.429, 3.750, 3.875, 4.000, 4.100, 3.844],
]
F2_W_PUB = [0.146829, 0.166067, 0.111597, 0.128694, 0.179882, 0.146586, 0.120345]
F2_A0_PUB = [4.750, 4.429, 4.125, 4.875, 4.500, 4.625, 4.800]
F2_R_TABLE9_0_TO_10 = [
    [0.1045, 0.0964, 0.0927, 0.1011, 0.1000, 0.0997, 0.1026],  # A0
    [0.0682, 0.0591, 0.0618, 0.0726, 0.0704, 0.0582, 0.0688],  # Air China
    [0.0825, 0.0855, 0.0899, 0.0816, 0.0815, 0.0808, 0.0761],  # Air France
    [0.1045, 0.0898, 0.0899, 0.0995, 0.1000, 0.0997, 0.1026],  # ANA
    [0.0770, 0.0707, 0.0843, 0.0684, 0.0667, 0.0728, 0.0897],  # British Airways
    [0.0858, 0.0886, 0.0927, 0.0829, 0.0815, 0.0754, 0.0835],  # China Southern
    [0.0770, 0.0886, 0.0843, 0.0765, 0.0815, 0.0952, 0.0775],  # Emirates
    [0.0935, 0.0777, 0.0871, 0.1011, 0.1000, 0.0835, 0.0895],  # Hainan
    [0.0616, 0.0653, 0.0674, 0.0674, 0.0593, 0.0754, 0.0641],  # LATAM
    [0.0825, 0.0902, 0.0758, 0.0829, 0.0815, 0.0819, 0.0788],  # Lufthansa
    [0.0858, 0.0917, 0.0899, 0.0855, 0.0889, 0.0889, 0.0848],  # Qantas
]
F2_V_TABLE10_0_TO_10 = [
    [0.01535, 0.01601, 0.01034, 0.01301, 0.01799, 0.01461, 0.01234],  # A0
    [0.01001, 0.00981, 0.00690, 0.00934, 0.01266, 0.00853, 0.00828],  # Air China
    [0.01211, 0.01420, 0.01003, 0.01051, 0.01466, 0.01185, 0.00916],  # Air France
    [0.01535, 0.01491, 0.01003, 0.01281, 0.01799, 0.01461, 0.01234],  # ANA
    [0.01131, 0.01175, 0.00940, 0.00881, 0.01199, 0.01066, 0.01080],  # British Airways
    [0.01260, 0.01471, 0.01034, 0.01067, 0.01466, 0.01106, 0.01005],  # China Southern
    [0.01131, 0.01471, 0.00940, 0.00984, 0.01466, 0.01396, 0.00932],  # Emirates
    [0.01373, 0.01291, 0.00972, 0.01301, 0.01799, 0.01224, 0.01077],  # Hainan
    [0.00905, 0.01084, 0.00752, 0.00867, 0.01066, 0.01106, 0.00771],  # LATAM
    [0.01211, 0.01497, 0.00846, 0.01067, 0.01466, 0.01201, 0.00948],  # Lufthansa
    [0.01260, 0.01523, 0.01003, 0.01101, 0.01599, 0.01303, 0.01021],  # Qantas
]
F2_S0_PUB = 0.099651
F2_S_PUB = [0.065529, 0.082523, 0.098039, 0.074720, 0.084096, 0.083202, 0.090362, 0.065519, 0.082373, 0.088098, 0.085888]
F2_K_PUB = [0.657578, 0.828118, 0.983820, 0.749814, 0.843900, 0.834926, 0.906781, 0.657482, 0.826610, 0.884063, 0.861889]
F2_RANK_PUB = [10, 7, 1, 9, 5, 6, 2, 11, 8, 3, 4]

ew2, e2, d2 = entropy_weights(F2_X)
r2 = aras(F2_X, F2_W_PUB, F2_T)
r2_ent = aras(F2_X, ew2, F2_T)
print('\n== F2 Bakir & Atalik 2018 (11 airlines x 7 criteria, Entropy -> ARAS, column-best A0)')
print(f'  Entropy w vs Table 7: max|diff| = {maxdiff(ew2, F2_W_PUB):.2e}; sum(Table 7 w) = {sum(F2_W_PUB):.6f}')
print(f'  x0 vs Table 8 A0: max|diff| = {maxdiff(r2["x0"], F2_A0_PUB):.2e}')
print(f'  R_all[0..10] vs Table 9 (A0..Qantas): max|diff| = {maxdiff(r2["R_all"][:11], F2_R_TABLE9_0_TO_10):.6f}')
print(f'  V_all[0..10] vs Table 10 (A0..Qantas): max|diff| = {maxdiff(r2["V_all"][:11], F2_V_TABLE10_0_TO_10):.6f}')
print(f'  THY true R[10] = {np.round(r2["R"][10], 4).tolist()}, true V[10] = {np.round(r2["V"][10], 5).tolist()}, sum = {r2["S"][10]:.6f} (Table 11 prints {F2_S_PUB[10]:.6f}; Tables 9-10 accidentally reprinted A0 on THY row)')
print(f'  S0     {r2["S0"]:.6f} (printed {F2_S0_PUB})')
print(f'  S      {np.round(r2["S"], 6).tolist()} (max|S - Table 11| = {maxdiff(r2["S"], F2_S_PUB):.2e})')
print(f'  K      {np.round(r2["K"], 6).tolist()} (max|K - Table 11| = {maxdiff(r2["K"], F2_K_PUB):.2e}; with unrounded Entropy w: {maxdiff(r2_ent["K"], F2_K_PUB):.2e})')
print(f'  rank   {r2["rank"].tolist()} (Table 11 MATCH: {list(r2["rank"]) == F2_RANK_PUB}; Entropy->ARAS rank MATCH: {list(r2_ent["rank"]) == F2_RANK_PUB})')


# ==============================================================================
# F3: Aytac Adali & Tus Isik (2016), 6 air conditioners x 8 criteria (secondary)
# ==============================================================================
F3_X = [
    [4.60, 5.00, 1, 2750, 38, 45, 800, 760],
    [3.30, 3.71, 1, 2267, 39, 65, 880, 900],
    [3.61, 3.84, 1, 1584, 38, 50, 990, 970],
    [3.37, 3.62, 1, 1650, 35, 53, 1010, 1050],
    [4.09, 4.40, 0, 2650, 40, 55, 870, 860],
    [3.24, 3.88, 0, 3340, 57, 52, 1080, 1030],
]
F3_T = ['benefit', 'benefit', 'benefit', 'cost', 'cost', 'cost', 'cost', 'cost']
F3_W_USED = [0.2817, 0.1387, 0.0413, 0.0749, 0.0215, 0.0215, 0.1387, 0.2817]
F3_R_TABLE6 = [
    [0.1716, 0.1698, 0.2000, 0.1884, 0.1605, 0.1633, 0.1623, 0.1666],
    [0.1716, 0.1698, 0.2000, 0.1085, 0.1478, 0.1633, 0.1623, 0.1666],
    [0.1231, 0.1260, 0.2000, 0.1317, 0.1441, 0.1130, 0.1476, 0.1406],
    [0.1347, 0.1304, 0.2000, 0.1884, 0.1478, 0.1470, 0.1312, 0.1305],
    [0.1257, 0.1229, 0.2000, 0.1809, 0.1605, 0.1386, 0.1286, 0.1206],
    [0.1526, 0.1494, 0.0000, 0.1126, 0.1404, 0.1336, 0.1493, 0.1472],
    [0.1209, 0.1317, 0.0000, 0.0894, 0.0986, 0.1413, 0.1203, 0.1229],
]
F3_V_TABLE7_0_TO_5 = [
    [0.0483, 0.0235, 0.0083, 0.0139, 0.0035, 0.0035, 0.0225, 0.0469],
    [0.0483, 0.0235, 0.0083, 0.0080, 0.0032, 0.0035, 0.0225, 0.0469],
    [0.0347, 0.0175, 0.0083, 0.0097, 0.0031, 0.0024, 0.0205, 0.0396],
    [0.0379, 0.0181, 0.0083, 0.0139, 0.0032, 0.0032, 0.0182, 0.0368],
    [0.0354, 0.0170, 0.0083, 0.0133, 0.0035, 0.0030, 0.0178, 0.0340],
    [0.0430, 0.0207, 0.0000, 0.0083, 0.0030, 0.0029, 0.0207, 0.0415],
]
F3_S0_PUB = 0.1704
F3_S_PUB = [0.1643, 0.1357, 0.1395, 0.1323, 0.1401, 0.1154]
F3_K_PUB = [0.9640, 0.7965, 0.8184, 0.7763, 0.8219, 0.6770]
F3_RANK_PUB = [1, 4, 3, 5, 2, 6]

r3 = aras(F3_X, F3_W_USED, F3_T)
print('\n== F3 Aytac Adali & Tus Isik 2016 (6 air conditioners x 8 criteria, reconstructed AHP weights)')
print(f'  R_all vs Table 6: max|diff| = {maxdiff(r3["R_all"], F3_R_TABLE6):.6f}')
print(f'  V_all[0..5] vs Table 7: max|diff| = {maxdiff(r3["V_all"][:6], F3_V_TABLE7_0_TO_5):.6f}')
print(f'  S0     {r3["S0"]:.6f} (printed {F3_S0_PUB}); max|S - Table 8| = {maxdiff(r3["S"], F3_S_PUB):.6f}')
print(f'  K      {np.round(r3["K"], 6).tolist()} (max|K - Table 8| = {maxdiff(r3["K"], F3_K_PUB):.6f})')
print(f'  rank   {r3["rank"].tolist()} (Table 8 MATCH: {list(r3["rank"]) == F3_RANK_PUB})')


# ==============================================================================
# F4: Keshavarz Ghorabaee et al. (2015) Table 5 Set 1 (Compare benchmark)
# ==============================================================================
F4_X = [
    [23, 264, 2.37, 0.05, 167, 8900, 8.71],
    [20, 220, 2.20, 0.04, 171, 9100, 8.23],
    [17, 231, 1.98, 0.15, 192, 10800, 9.91],
    [12, 210, 1.73, 0.20, 195, 12300, 10.21],
    [15, 243, 2.00, 0.14, 187, 12600, 9.34],
    [14, 222, 1.89, 0.13, 180, 13200, 9.22],
    [21, 262, 2.43, 0.06, 160, 10300, 8.93],
    [20, 256, 2.60, 0.07, 163, 11400, 8.44],
    [19, 266, 2.10, 0.06, 157, 11200, 9.04],
    [8, 218, 1.94, 0.11, 190, 13400, 10.11],
]
F4_T = ['benefit', 'benefit', 'benefit', 'cost', 'cost', 'cost', 'cost']
F4_W = np.array([0.250, 0.214, 0.179, 0.143, 0.107, 0.071, 0.036])
F4_W = F4_W / F4_W.sum()
r4 = aras(F4_X, F4_W, F4_T)
print('\n== F4 Keshavarz Ghorabaee 2015 Set 1 (10 x 7 Compare benchmark)')
print(f'  S0     {r4["S0"]:.6f}')
print(f'  K      {np.round(r4["K"], 6).tolist()}')
print(f'  rank   {r4["rank"].tolist()}')
print(f'  SAW linearMax rank: {rank_desc(saw_linear_max(F4_X, F4_W, F4_T)).tolist()}')
print(f'  SAW sum rank      : {rank_desc(saw_sum(F4_X, F4_W, F4_T)).tolist()}')


# ==============================================================================
# Algebraic properties & 2,000 random problems
# ==============================================================================
rng = np.random.default_rng(20261024)
diff_saw_sum = 0
diff_saw_lin = 0
diff_k_vs_s = 0
diff_user_opt = 0
worst_reweight_id = 0.0
worst_bounds = False

for k in range(2000):
    m, n = int(rng.integers(3, 9)), int(rng.integers(2, 8))
    X = rng.uniform(0.5, 100.0, (m, n))
    t = list(rng.choice(['benefit', 'cost'], n))
    w = rng.dirichlet(np.ones(n))
    r = aras(X, w, t)
    s_sum = saw_sum(X, w, t)
    s_lin = saw_linear_max(X, w, t)

    # Check S_i == SAW(sum) with effective weights w_j / (1 + p_0j)
    cost = np.array([c == 'cost' for c in t])
    X_star = np.where(cost, 1.0 / X, X)
    x0_star = np.where(cost, 1.0 / X.min(axis=0), X.max(axis=0))
    p0 = x0_star / X_star.sum(axis=0)
    w_eff = w / (1.0 + p0)
    s_reweighted = saw_sum(X, w_eff, t)
    worst_reweight_id = max(worst_reweight_id, maxdiff(r['S'], s_reweighted))

    # Check K_i in (0, 1] and S_i <= S_0
    if not (np.all(r['K'] > 0) and np.all(r['K'] <= 1.0 + 1e-12)):
        worst_bounds = True

    diff_k_vs_s += int(list(rank_desc(r['K'])) != list(rank_desc(r['S'])))
    diff_saw_sum += int(list(r['rank']) != list(rank_desc(s_sum)))
    diff_saw_lin += int(list(r['rank']) != list(rank_desc(s_lin)))

    # User-defined optimal row (factor u_j in [1, 2] beyond column best)
    u = rng.uniform(1.0, 2.0, n)
    opt_u = np.where(cost, X.min(axis=0) / u, X.max(axis=0) * u)
    ru = aras(X, w, t, optimal=opt_u)
    diff_user_opt += int(list(ru['rank']) != list(r['rank']))

print('\n== Random 2000 problems (m 3..8, n 2..7)')
print(f'  max|S_ARAS - SAW_sum(w / (1 + p0))| = {worst_reweight_id:.1e}')
print(f'  K_i in (0, 1] violated: {worst_bounds}; K vs S ranking diff: {diff_k_vs_s}/2000')
print(f'  ARAS vs SAW(sum) ranking differs in      : {diff_saw_sum}/2000 cases')
print(f'  ARAS vs SAW(linearMax) ranking differs in: {diff_saw_lin}/2000 cases')
print(f'  User optimal (factor 1..2 beyond data) changes ranking in: {diff_user_opt}/2000 cases')

# Constant column invariance (both benefit and cost constant columns)
const_flips_ben = 0
const_flips_cost = 0
for k in range(2000):
    m, n = int(rng.integers(3, 9)), int(rng.integers(2, 7))
    X = rng.uniform(0.5, 100.0, (m, n))
    t = list(rng.choice(['benefit', 'cost'], n))
    w = rng.dirichlet(np.ones(n))
    r0 = aras(X, w, t)
    X_c = np.c_[X, np.full(m, 5.0)]
    w_c = np.r_[w * 0.7, 0.3]
    rb = aras(X_c, w_c, t + ['benefit'])
    rc = aras(X_c, w_c, t + ['cost'])
    const_flips_ben += int(list(r0['rank']) != list(rb['rank']))
    const_flips_cost += int(list(r0['rank']) != list(rc['rank']))
print(f'  Constant column rank changes (2000 random): benefit {const_flips_ben}/2000, cost {const_flips_cost}/2000')

# Rank reversal when removing one alternative (5 x 4)
rr = 0
for k in range(2000):
    X = rng.uniform(1.0, 100.0, (5, 4))
    w = rng.dirichlet(np.ones(4))
    t = ['benefit', 'benefit', 'cost', 'cost']
    r0 = aras(X, w, t)
    r1 = aras(X[:4], w, t)
    rr += int(list(np.argsort(-r0['K'][:4])) != list(np.argsort(-r1['K'])))
print(f'  Rank reversal when dropping alternative 5 (5x4, 2000 random): {rr}/2000')

# Edge cases
eq = aras([[4, 7], [4, 7], [4, 7]], [0.6, 0.4], ['benefit', 'cost'])
print(f'  All alternatives equal (m=3): S0={eq["S0"]:.6f} (1/4=0.25), S={eq["S"].tolist()}, K={eq["K"].tolist()}, rank={eq["rank"].tolist()}')
scale_r = aras(np.array(F1_X) * np.array([10, 0.1, 1, 100, 50, 2]), F1_W, F1_T)
print(f'  Column scaling invariance on F1b: max|dK| = {maxdiff(scale_r["K"], r1b["K"]):.1e}')

# Concrete 3x2 example where ARAS (column-best A0) and SAW (sum) rank differently
X_ex = [[10.0, 7.0], [7.0, 9.0], [9.0, 1.0]]
w_ex = [0.5, 0.5]
t_ex = ['benefit', 'benefit']
r_ex = aras(X_ex, w_ex, t_ex)
s_sum_ex = saw_sum(X_ex, w_ex, t_ex)
s_lin_ex = saw_linear_max(X_ex, w_ex, t_ex)
print(f'  Concrete 3x2 example X={X_ex}, w={w_ex}: '
      f'ARAS K={np.round(r_ex["K"], 4).tolist()} rank={r_ex["rank"].tolist()} vs '
      f'SAW(sum)={np.round(s_sum_ex, 4).tolist()} rank={rank_desc(s_sum_ex).tolist()} vs '
      f'SAW(linearMax)={np.round(s_lin_ex, 4).tolist()} rank={rank_desc(s_lin_ex).tolist()}')


