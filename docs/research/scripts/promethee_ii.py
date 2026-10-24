"""PROMETHEE II verification script.

Verifies our reference implementation against:
  - F1: Brans, Vincke & Mareschal (1986), European Journal of Operational
        Research 24(2):228-238, DOI 10.1016/0377-2217(86)90044-5; reproduced
        with full matrices in Mareschal (2019), Exercises with Visual PROMETHEE
        (6 hydroelectric power plant projects x 6 criteria covering all six
        generalized criterion types I-VI, plus weight sensitivity and all-Usual).
  - F2: Goswami (2020), Foundations of Management 12(1):93-110,
        DOI 10.2478/fman-2020-0008 (6 laptops x 7 criteria, Type III V-shape
        with p_j = max_i x_ij - min_i x_ij, Tables 2-18).
  - F3: Abdullah, Chan & Afshari (2019), Journal of Industrial Engineering
        International 15(2):271-285, DOI 10.1007/s40092-018-0289-z (4 green
        suppliers x 7 criteria; Case 1 Usual Type I Tables 8-11, Case 2 mixed
        Linear Type V + Level Type IV Tables 12-16).
  - Library cross-check: pymcdm 1.4.0, pyrepo-mcda 0.1.15, pyDecision 5.1.8.
  - Algebraic identities (Mareschal 2015, Note on the PROMETHEE net flow
    computation) and Monte Carlo invariants over 1,000 random problems.
"""
from __future__ import annotations

import glob
import math
import sys
from typing import Any

import numpy as np


# ---------------------------------------------------------------------------
# Reference implementation of PROMETHEE I & II (Brans & Mareschal 2005)
# ---------------------------------------------------------------------------
def eval_preference(
    d: np.ndarray,
    ftype: str,
    q: float = 0.0,
    p: float = 0.0,
    s: float = 0.0,
) -> np.ndarray:
    """Evaluate Brans & Vincke (1985) generalized preference function P_j(d)."""
    eps = 1e-12
    t = ftype.lower()
    out = np.zeros_like(d, dtype=float)
    if t in ("usual", "i", "type1", "t1"):
        out[d > eps] = 1.0
    elif t in ("u-shape", "ii", "type2", "t2"):
        out[d > q + eps] = 1.0
    elif t in ("v-shape", "iii", "type3", "t3"):
        if p <= eps:
            out[d > eps] = 1.0
        else:
            pos = (d > eps) & (d < p - eps)
            out[pos] = d[pos] / p
            out[d >= p - eps] = 1.0
    elif t in ("level", "iv", "type4", "t4"):
        mid = (d > q + eps) & (d <= p + eps)
        out[mid] = 0.5
        out[d > p + eps] = 1.0
    elif t in ("linear", "v", "type5", "t5"):
        if p <= q + eps:
            out[d > q + eps] = 1.0
        else:
            mid = (d > q + eps) & (d < p - eps)
            out[mid] = (d[mid] - q) / (p - q)
            out[d >= p - eps] = 1.0
    elif t in ("gaussian", "vi", "type6", "t6"):
        if s <= eps:
            out[d > eps] = 1.0
        else:
            pos = d > eps
            out[pos] = 1.0 - np.exp(-(d[pos] ** 2) / (2.0 * (s ** 2)))
    else:
        raise ValueError(f"Unknown preference function type: {ftype}")
    return out


def default_thresholds(col: np.ndarray, ftype: str) -> tuple[float, float, float]:
    """Column-range threshold rules when only family name is chosen."""
    r = float(np.max(col) - np.min(col))
    t = ftype.lower()
    if t in ("usual", "i"):
        return 0.0, 0.0, 0.0
    if t in ("u-shape", "ii"):
        return 0.2 * r, 0.0, 0.0
    if t in ("v-shape", "iii"):
        return 0.0, r, 0.0
    if t in ("level", "iv"):
        return 0.2 * r, 0.6 * r, 0.0
    if t in ("linear", "v"):
        return 0.2 * r, 0.6 * r, 0.0
    if t in ("gaussian", "vi"):
        return 0.0, 0.0, 0.5 * r
    raise ValueError(f"Unknown preference function type: {ftype}")


def promethee_ii(
    matrix: np.ndarray,
    weights: np.ndarray,
    types: np.ndarray,
    criteria_functions: list[dict[str, Any]] | None = None,
    preference_function: str = "v-shape",
) -> dict[str, Any]:
    """Compute PROMETHEE I and II preference matrix and outranking flows.

    types: +1 for benefit, -1 for cost.
    """
    X = np.asarray(matrix, dtype=float)
    m, n = X.shape
    w = np.asarray(weights, dtype=float)
    w = w / np.sum(w)
    signs = np.asarray(types, dtype=float)

    pi = np.zeros((m, m), dtype=float)
    single_net = np.zeros((m, n), dtype=float)

    for j in range(n):
        col = X[:, j]
        # Directed pairwise difference d_j(a, b) = sign_j * (x_{aj} - x_{bj})
        d = signs[j] * (col[:, None] - col[None, :])
        if criteria_functions is not None:
            spec = criteria_functions[j]
            ftype = spec["type"]
            q = float(spec.get("q", 0.0))
            p = float(spec.get("p", 0.0))
            s = float(spec.get("s", 0.0))
        else:
            ftype = preference_function
            q, p, s = default_thresholds(col, ftype)

        P_j = eval_preference(d, ftype, q=q, p=p, s=s)
        np.fill_diagonal(P_j, 0.0)
        pi += w[j] * P_j
        phi_j_plus = np.sum(P_j, axis=1) / (m - 1)
        phi_j_minus = np.sum(P_j, axis=0) / (m - 1)
        single_net[:, j] = phi_j_plus - phi_j_minus

    phi_plus = np.sum(pi, axis=1) / (m - 1)
    phi_minus = np.sum(pi, axis=0) / (m - 1)
    phi_net = phi_plus - phi_minus
    order = np.argsort(-phi_net, kind="mergesort")
    ranks = np.empty(m, dtype=int)
    ranks[order] = np.arange(1, m + 1)

    incomparable_pairs: list[tuple[int, int]] = []
    tol = 1e-9
    for a in range(m):
        for b in range(a + 1, m):
            a_better_pos = phi_plus[a] > phi_plus[b] + tol
            a_worse_neg = phi_minus[a] > phi_minus[b] + tol
            b_better_pos = phi_plus[b] > phi_plus[a] + tol
            b_worse_neg = phi_minus[b] > phi_minus[a] + tol
            if (a_better_pos and a_worse_neg) or (b_better_pos and b_worse_neg):
                incomparable_pairs.append((a, b))

    return {
        "pi": pi,
        "phi_plus": phi_plus,
        "phi_minus": phi_minus,
        "phi_net": phi_net,
        "single_net": single_net,
        "ranks": ranks,
        "incomparable_pairs": incomparable_pairs,
    }


# ---------------------------------------------------------------------------
# F1: Brans, Vincke & Mareschal (1986) / Mareschal (2019) Hydroelectric Plants
# ---------------------------------------------------------------------------
def verify_f1_brans_1986() -> None:
    print("=" * 76)
    print("F1: Brans, Vincke & Mareschal (1986) — 6 Hydroelectric Projects x 6 Criteria")
    print("=" * 76)

    # Alternatives: A1..A6 (Power plants 1..6)
    # Criteria:
    #   C1: Manpower (min, Type II U-shape, q=10)
    #   C2: Power (MW) (max, Type III V-shape, p=30)
    #   C3: Construction cost (10^9 $) (min, Type V Linear, q=50, p=500)
    #   C4: Maintenance cost (10^6 $) (min, Type IV Level, q=1, p=6)
    #   C5: Number of villages to extract (min, Type I Usual)
    #   C6: Security level (max, Type VI Gaussian, s=5)
    X = np.array(
        [
            [80, 90, 600, 5.4, 8, 5],
            [65, 58, 200, 9.7, 1, 1],
            [83, 60, 400, 7.2, 4, 7],
            [40, 80, 1000, 7.5, 7, 10],
            [52, 72, 600, 2.0, 3, 8],
            [94, 96, 700, 3.6, 5, 6],
        ],
        dtype=float,
    )
    types = np.array([-1, +1, -1, -1, -1, +1])
    w_equal = np.ones(6) / 6.0
    specs = [
        {"type": "u-shape", "q": 10.0},
        {"type": "v-shape", "p": 30.0},
        {"type": "linear", "q": 50.0, "p": 500.0},
        {"type": "level", "q": 1.0, "p": 6.0},
        {"type": "usual"},
        {"type": "gaussian", "s": 5.0},
    ]

    res = promethee_ii(X, w_equal, types, criteria_functions=specs)

    # Published 3-decimal pi(a, b) matrix and sum-based net flows from Brans, Vincke &
    # Mareschal (1986) (divided by m-1 = 5 for scaled flows; see promethee-ii.md):
    pub_pi_3dp = np.array(
        [
            [0.000, 0.296, 0.250, 0.268, 0.100, 0.185],
            [0.462, 0.000, 0.389, 0.333, 0.296, 0.500],
            [0.236, 0.180, 0.000, 0.333, 0.056, 0.429],
            [0.399, 0.505, 0.305, 0.000, 0.223, 0.212],
            [0.444, 0.515, 0.487, 0.380, 0.000, 0.448],
            [0.286, 0.399, 0.250, 0.432, 0.133, 0.000],
        ]
    )
    pub_phi_plus = np.array([0.2199, 0.3963, 0.2466, 0.3293, 0.4547, 0.3001])
    pub_phi_minus = np.array([0.3655, 0.3791, 0.3362, 0.3493, 0.1618, 0.3549])
    pub_phi_net = np.array([-0.1457, 0.0172, -0.0895, -0.0200, 0.2929, -0.0549])
    pub_sum_net = np.array([-0.728, 0.085, -0.447, -0.102, 1.466, -0.274])
    pub_ranks = np.array([6, 2, 5, 3, 1, 4])

    err_plus = float(np.max(np.abs(res["phi_plus"] - pub_phi_plus)))
    err_minus = float(np.max(np.abs(res["phi_minus"] - pub_phi_minus)))
    err_net = float(np.max(np.abs(res["phi_net"] - pub_phi_net)))
    err_pi = float(np.max(np.abs(res["pi"] - pub_pi_3dp)))
    err_sum_net = float(np.max(np.abs(res["phi_net"] * 5.0 - pub_sum_net)))

    for i in range(6):
        print(
            f"  A{i+1}: phi+={res['phi_plus'][i]:.4f} (pub {pub_phi_plus[i]:.4f})  "
            f"phi-={res['phi_minus'][i]:.4f} (pub {pub_phi_minus[i]:.4f})  "
            f"phi={res['phi_net'][i]:+.4f} (pub {pub_phi_net[i]:+.4f})  "
            f"rank={res['ranks'][i]} (pub {pub_ranks[i]})"
        )
    print(f"  Max abs diff: phi+={err_plus:.6f}, phi-={err_minus:.6f}, phi={err_net:.6f}")
    print(f"  Max abs diff on 3 d.p. pi matrix: {err_pi:.6f}")
    print(f"  Max abs diff on unscaled sum net flow (phi * 5): {err_sum_net:.6f}")
    print(f"  PROMETHEE I incomparable pairs (0-based): {res['incomparable_pairs']}")
    assert err_plus < 1e-4
    assert err_minus < 1e-4
    assert err_net < 1e-4
    assert err_pi <= 1e-3
    assert err_sum_net <= 2.5e-3
    assert np.array_equal(res["ranks"], pub_ranks)
    # In Mareschal (2019) Figure 1, the 6 incomparable pairs are:
    # (a1, a2), (a2, a3), (a2, a4), (a2, a6), (a3, a4), (a3, a6)
    assert res["incomparable_pairs"] == [(0, 1), (1, 2), (1, 3), (1, 5), (2, 3), (2, 5)]

    # Weight sensitivity (Mareschal 2019, Exercise 1 & Exercise 2):
    # (a) w = [10, 50, 10, 10, 10, 10] -> A6 (France) becomes best (rank 1)
    res_w2 = promethee_ii(
        X, np.array([10, 50, 10, 10, 10, 10], dtype=float), types, criteria_functions=specs
    )
    print(
        f"  Ex 1 (w2=50): phi={np.round(res_w2['phi_net'], 4).tolist()}, "
        f"ranks={res_w2['ranks'].tolist()}"
    )
    assert int(res_w2["ranks"][5]) == 1

    # (b) w = [9, 9, 9, 9, 55, 9] -> A2 (Belgium) becomes best (rank 1)
    res_w5 = promethee_ii(
        X, np.array([9, 9, 9, 9, 55, 9], dtype=float), types, criteria_functions=specs
    )
    print(
        f"  Ex 2 (w5=55): phi={np.round(res_w5['phi_net'], 4).tolist()}, "
        f"ranks={res_w5['ranks'].tolist()}"
    )
    assert int(res_w5["ranks"][1]) == 1

    # Exercise 4: all Usual (Type I) with equal weights
    res_usual = promethee_ii(X, w_equal, types, preference_function="usual")
    print(
        f"  Ex 4 (all Usual): phi+={np.round(res_usual['phi_plus'], 4).tolist()}, "
        f"phi-={np.round(res_usual['phi_minus'], 4).tolist()}, "
        f"phi={np.round(res_usual['phi_net'], 4).tolist()}, "
        f"ranks={res_usual['ranks'].tolist()}"
    )
    assert list(res_usual["ranks"]) == [6, 5, 3, 2, 1, 4]


# ---------------------------------------------------------------------------
# F2: Goswami (2020) — 6 Laptop Models x 7 Criteria (Default V-Shape p_j = R_j)
# ---------------------------------------------------------------------------
def verify_f2_goswami_2020() -> None:
    print("\n" + "=" * 76)
    print("F2: Goswami (2020) — 6 Laptop Models x 7 Criteria (Default V-Shape p_j = R_j)")
    print("=" * 76)

    # Table 7 in Goswami (2020), DOI 10.2478/fman-2020-0008 (page 99):
    # Criteria (all benefit, Hwang & Yoon 1-9 scale):
    #   C1: Processor
    #   C2: Hard disk capacity
    #   C3: Operating system
    #   C4: RAM
    #   C5: Screen size
    #   C6: Brand
    #   C7: Color
    X = np.array(
        [
            [3, 5, 3, 5, 3, 9, 3],
            [5, 7, 5, 5, 7, 3, 3],
            [5, 9, 9, 7, 7, 7, 5],
            [7, 9, 9, 9, 9, 2, 9],
            [5, 7, 9, 7, 7, 9, 9],
            [3, 5, 5, 5, 7, 5, 3],
        ],
        dtype=float,
    )
    types = np.ones(7, dtype=float)
    # Normalized AHP weights (Table 4, page 97; w7 exact row average is 0.022459 -> 0.02246 so sum = 1.00000)
    w = np.array([0.37657, 0.09395, 0.04529, 0.21594, 0.16932, 0.07647, 0.02246])
    assert abs(float(np.sum(w)) - 1.0) < 1e-12

    res = promethee_ii(X, w, types, preference_function="v-shape")

    # Published Table 13, Table 15 & Table 16 in Goswami (2020) (pages 103-104):
    pub_pi = np.array(
        [
            [0.00000, 0.06554, 0.02185, 0.07647, 0.00000, 0.04370],
            [0.36323, 0.00000, 0.00000, 0.01092, 0.00000, 0.23526],
            [0.55586, 0.23632, 0.00000, 0.05462, 0.04697, 0.44973],
            [0.92353, 0.56030, 0.36767, 0.00000, 0.39967, 0.79555],
            [0.52386, 0.22617, 0.03683, 0.07647, 0.00000, 0.43958],
            [0.12798, 0.02185, 0.00000, 0.03277, 0.00000, 0.00000],
        ]
    )
    pub_phi_plus = np.array([0.04151, 0.12188, 0.26870, 0.60934, 0.26058, 0.03652])
    pub_phi_minus = np.array([0.49889, 0.22204, 0.08527, 0.05025, 0.08933, 0.39276])
    pub_phi_net = np.array([-0.45738, -0.10015, 0.18343, 0.55909, 0.17125, -0.35624])
    pub_ranks = np.array([6, 4, 2, 1, 3, 5])

    err_pi = float(np.max(np.abs(res["pi"] - pub_pi)))
    err_plus = float(np.max(np.abs(res["phi_plus"] - pub_phi_plus)))
    err_minus = float(np.max(np.abs(res["phi_minus"] - pub_phi_minus)))
    err_net = float(np.max(np.abs(res["phi_net"] - pub_phi_net)))

    for i in range(6):
        print(
            f"  Model {i+1}: phi+={res['phi_plus'][i]:.5f} (pub {pub_phi_plus[i]:.5f})  "
            f"phi-={res['phi_minus'][i]:.5f} (pub {pub_phi_minus[i]:.5f})  "
            f"phi={res['phi_net'][i]:+.5f} (pub {pub_phi_net[i]:+.5f})  "
            f"rank={res['ranks'][i]} (pub {pub_ranks[i]})"
        )
    print(f"  Max abs diff: pi={err_pi:.6f}, phi+={err_plus:.6f}, phi-={err_minus:.6f}, phi={err_net:.6f}")
    print(f"  PROMETHEE I incomparable pairs (0-based): {res['incomparable_pairs']}")
    assert err_pi <= 2e-5
    assert err_plus <= 2e-5
    assert err_minus <= 2e-5
    assert err_net <= 2e-5
    assert np.array_equal(res["ranks"], pub_ranks)
    # Goswami (2020) Table 17 (page 105, Sl. No. 5) explicitly identifies
    # (Model 1, Model 6) as the unique PROMETHEE I incomparable pair ("Model 1 R Model 6"):
    # Model 1 has higher phi+ (0.04151 > 0.03652) and higher phi- (0.49889 > 0.39276).
    assert res["incomparable_pairs"] == [(0, 5)]


# ---------------------------------------------------------------------------
# F3: Abdullah, Chan & Afshari (2019) — 4 Green Suppliers x 7 Criteria
# ---------------------------------------------------------------------------
def verify_f3_abdullah_2019() -> None:
    print("\n" + "=" * 76)
    print("F3: Abdullah, Chan & Afshari (2019) — 4 Green Suppliers x 7 Criteria")
    print("=" * 76)

    # Table 5 & Table 6 in Abdullah et al. (2019), DOI 10.1007/s40092-018-0289-z (page 279):
    X = np.array(
        [
            [0.80, 0.60, 0.85, 0.70, 0.80, 0.65, 0.60],
            [0.40, 0.40, 0.75, 0.50, 0.50, 0.50, 0.50],
            [0.50, 0.40, 0.60, 0.55, 0.60, 0.55, 0.70],
            [0.50, 0.45, 0.65, 0.60, 0.65, 0.50, 0.55],
        ],
        dtype=float,
    )
    types = np.ones(7, dtype=float)
    # Table 5 weights (sum = 1.0001 in paper; we normalize internally to 1.0)
    w_raw = np.array([0.1859, 0.1870, 0.1262, 0.1669, 0.1085, 0.1080, 0.1176])

    # Case 1: Usual (Type I) preference function — Tables 8-11 (page 280)
    res_c1 = promethee_ii(X, w_raw, types, preference_function="usual")
    pub_c1_plus = np.array([0.9609, 0.084133, 0.343367, 0.4515])
    pub_c1_minus = np.array([0.0392, 0.817633, 0.532433, 0.450633])
    pub_c1_net = np.array([0.9217, -0.7335, -0.189067, 0.000867])
    pub_c1_ranks = np.array([1, 4, 3, 2])

    print("  Case 1 (Usual / Type I):")
    for i in range(4):
        print(
            f"    A{i+1}: phi+={res_c1['phi_plus'][i]:.4f} (pub {pub_c1_plus[i]:.4f})  "
            f"phi-={res_c1['phi_minus'][i]:.4f} (pub {pub_c1_minus[i]:.4f})  "
            f"phi={res_c1['phi_net'][i]:+.4f} (pub {pub_c1_net[i]:+.4f})  "
            f"rank={res_c1['ranks'][i]}"
        )
    # Paper uses w_raw summing to 1.0001 without dividing by 1.0001, so max diff is ~1e-4:
    assert np.max(np.abs(res_c1["phi_plus"] - pub_c1_plus)) < 1.5e-4
    assert np.max(np.abs(res_c1["phi_minus"] - pub_c1_minus)) < 1.5e-4
    assert np.max(np.abs(res_c1["phi_net"] - pub_c1_net)) < 1.5e-4
    assert np.array_equal(res_c1["ranks"], pub_c1_ranks)

    # Case 2: Mixed Linear (C1, V-shape with p=0.10) + Level (C2..C7, with q=0.05, p=0.10)
    # Note: Eq. (8) in the paper writes q+p for the upper boundary, but page 282 states
    # "indifference threshold and preference threshold are set as 0.05 and 0.1, respectively"
    # and Table 13 evaluates Level with standard boundaries q=0.05, p=0.10 (d=0.05 -> 0,
    # d=0.10 -> 0.5, d=0.15 -> 1).
    specs_c2 = [
        {"type": "v-shape", "p": 0.10},
        {"type": "level", "q": 0.05, "p": 0.10},
        {"type": "level", "q": 0.05, "p": 0.10},
        {"type": "level", "q": 0.05, "p": 0.10},
        {"type": "level", "q": 0.05, "p": 0.10},
        {"type": "level", "q": 0.05, "p": 0.10},
        {"type": "level", "q": 0.05, "p": 0.10},
    ]
    res_c2 = promethee_ii(X, w_raw, types, criteria_functions=specs_c2)
    pub_c2_pi = np.array(
        [
            [0.00000, 0.87820, 0.82850, 0.79905],
            [0.00000, 0.00000, 0.12620, 0.06310],
            [0.05880, 0.35775, 0.00000, 0.11760],
            [0.00000, 0.37785, 0.00000, 0.00000],
        ]
    )
    print("  Case 2 (Linear C1 + Level C2-C7, Tables 12-16):")
    print(f"    Max abs diff on Table 14 pi matrix: {np.max(np.abs(res_c2['pi'] - pub_c2_pi)):.6f}")
    assert np.max(np.abs(res_c2["pi"] - pub_c2_pi)) < 1.5e-4
    # Note: In Table 15 of Abdullah et al. (2019), row A1 sum 0.8782 + 0.8285 + 0.79905 = 2.50575,
    # so phi+(A1) = 2.50575 / 3 = 0.83525 (0.8353), which is misprinted in Table 15 with a shifted
    # decimal point as 0.0835 (giving net flow 0.0639 instead of 0.8157). All other entries in
    # Table 15 match to 4 d.p., and the ranking [1, 4, 2, 3] (A1 > A3 > A4 > A2) is identical.
    assert np.allclose(res_c2["phi_plus"], [0.835167, 0.063094, 0.178032, 0.125937], atol=1.5e-4)
    assert np.allclose(res_c2["phi_minus"], [0.019598, 0.537880, 0.318202, 0.326551], atol=1.5e-4)
    assert list(res_c2["ranks"]) == [1, 4, 2, 3]


# ---------------------------------------------------------------------------
# Library Cross-Check (pymcdm 1.4.0, pyrepo-mcda 0.1.15, pyDecision 5.1.8)
# ---------------------------------------------------------------------------
def verify_libraries() -> None:
    print("\n" + "=" * 76)
    print("Library Cross-Check: pymcdm 1.4.0, pyrepo-mcda 0.1.15, pyDecision 5.1.8")
    print("=" * 76)

    for p in (
        "/home/zuko/.cache/uv/archive-v0/NmBJMJdH4C-KHvEv",
        "/home/zuko/.cache/uv/archive-v0/E9lMw93MU5zpctGn",
        "/home/zuko/.cache/uv/archive-v0/l8r6DsWUaBJDH00e",
    ):
        if p not in sys.path:
            sys.path.append(p)

    X = np.array(
        [
            [80, 90, 600, 5.4, 8],
            [65, 58, 200, 9.7, 1],
            [83, 60, 400, 7.2, 4],
            [40, 80, 1000, 7.5, 7],
            [52, 72, 600, 2.0, 3],
            [94, 96, 700, 3.6, 5],
        ],
        dtype=float,
    )
    types = np.array([-1, +1, -1, -1, -1])
    w = np.ones(5) / 5.0

    # 1. pymcdm (supports usual, u_shape, v_shape, level, v_shape_2; lacks gaussian)
    from pymcdm.methods.promethee_ii import PROMETHEE_II as PymcdmPrometheeII

    for our_name, pymcdm_name in [
        ("usual", "usual"),
        ("u-shape", "ushape"),
        ("v-shape", "vshape"),
        ("level", "level"),
    ]:
        qs = [default_thresholds(X[:, j], our_name)[0] for j in range(5)]
        ps = [default_thresholds(X[:, j], our_name)[1] for j in range(5)]
        ours = promethee_ii(X, w, types, preference_function=our_name)["phi_net"]
        m_obj = PymcdmPrometheeII(preference_function=pymcdm_name, p=ps, q=qs)
        theirs = m_obj(X, w, types)
        diff = float(np.max(np.abs(ours - theirs)))
        print(f"  pymcdm ({our_name:8s}): max |phi_ours - phi_pymcdm| = {diff:.2e}")
        assert diff < 1e-12

    # Demonstrate pymcdm generator exhaustion bug on second call:
    bug_obj = PymcdmPrometheeII(preference_function="vshape", p=[10, 10, 10, 10, 10])
    _ = bug_obj(X, w, types)
    second_call_failed = False
    try:
        _ = bug_obj(X, w, types)
    except Exception as exc:
        second_call_failed = True
        print(f"  pymcdm 2nd-call generator bug reproduced: {type(exc).__name__}: {exc}")
    assert second_call_failed

    # 2. pyrepo-mcda (supports Type 1..5 accurately; Type 6 couples s = (p + q) / 2)
    from pyrepo_mcda.mcda_methods.promethee import PROMETHEE_II as PyrepoPrometheeII
    from pyrepo_mcda.promethee_preference_functions import (
        preference_level_function,
        preference_ushape_function,
        preference_usual_function,
        preference_vshape_function,
    )

    pr = PyrepoPrometheeII()
    for our_name, fn in [
        ("usual", preference_usual_function),
        ("u-shape", preference_ushape_function),
        ("v-shape", preference_vshape_function),
        ("level", preference_level_function),
    ]:
        qs = [default_thresholds(X[:, j], our_name)[0] for j in range(5)]
        ps = [default_thresholds(X[:, j], our_name)[1] for j in range(5)]
        ours = promethee_ii(X, w, types, preference_function=our_name)["phi_net"]
        theirs = pr(X, w, types, preference_functions=[fn] * 5, p=ps, q=qs)
        diff = float(np.max(np.abs(ours - theirs)))
        print(f"  pyrepo-mcda ({our_name:8s}): max |phi_ours - phi_pyrepo| = {diff:.2e}")
        assert diff < 1e-12

    # 3. pyDecision (verify on full 6-criterion Brans 1986 with types I-VI)
    from pyDecision.algorithm.p_ii import promethee_ii as pydecision_promethee_ii

    X6 = np.array(
        [
            [80, 90, 600, 5.4, 8, 5],
            [65, 58, 200, 9.7, 1, 1],
            [83, 60, 400, 7.2, 4, 7],
            [40, 80, 1000, 7.5, 7, 10],
            [52, 72, 600, 2.0, 3, 8],
            [94, 96, 700, 3.6, 5, 6],
        ],
        dtype=float,
    )
    types6 = np.array([-1, +1, -1, -1, -1, +1])
    w6 = np.ones(6) / 6.0
    specs6 = [
        {"type": "u-shape", "q": 10.0},
        {"type": "v-shape", "p": 30.0},
        {"type": "linear", "q": 50.0, "p": 500.0},
        {"type": "level", "q": 1.0, "p": 6.0},
        {"type": "usual"},
        {"type": "gaussian", "s": 5.0},
    ]
    # pyDecision assumes all criteria are benefit, so pre-multiply by sign:
    X6_signed = X6 * types6[None, :]
    pyd_res = pydecision_promethee_ii(
        X6_signed,
        W=w6.tolist(),
        Q=[10.0, 0.0, 50.0, 1.0, 0.0, 0.0],
        S=[0.0, 0.0, 0.0, 0.0, 0.0, 5.0],
        P=[0.0, 30.0, 500.0, 6.0, 0.0, 0.0],
        F=["t2", "t3", "t5", "t4", "t1", "t6"],
        sort=False,
        graph=False,
        verbose=False,
    )
    ours6 = promethee_ii(X6, w6, types6, criteria_functions=specs6)["phi_net"]
    diff_pyd = float(np.max(np.abs(ours6 - pyd_res[:, 1])))
    print(f"  pyDecision (Brans 1986 all 6 types): max |phi_ours - phi_pyDecision| = {diff_pyd:.2e}")
    assert diff_pyd < 1e-12


# ---------------------------------------------------------------------------
# Mareschal (2015) Algebraic Identities & Monte Carlo Verification (1,000 runs)
# ---------------------------------------------------------------------------
def verify_identities_and_invariants() -> None:
    print("\n" + "=" * 76)
    print("Algebraic Identities (Mareschal 2015) & Monte Carlo Invariants (1,000 runs)")
    print("=" * 76)

    rng = np.random.default_rng(20260420)
    max_vshape_saw_err = 0.0
    max_usual_borda_err = 0.0
    max_zerosum_err = 0.0
    max_shift_err = 0.0

    for trial in range(1000):
        m = int(rng.integers(3, 12))
        n = int(rng.integers(2, 8))
        X = rng.uniform(-50.0, 200.0, size=(m, n))
        w = rng.uniform(0.05, 1.0, size=n)
        w = w / np.sum(w)
        types = rng.choice([-1.0, 1.0], size=n)

        # 1. V-shape with p_j = R_j vs. centered min-max SAW (Mareschal 2015 Eq. 9):
        #    phi(a) = (m / (m - 1)) * (S_a - mean(S)), where S_a = sum_j w_j r_{aj}
        res_v = promethee_ii(X, w, types, preference_function="v-shape")
        R_norm = np.zeros_like(X)
        for j in range(n):
            col = X[:, j]
            span = float(np.max(col) - np.min(col))
            if span > 0.0:
                if types[j] > 0:
                    R_norm[:, j] = (col - np.min(col)) / span
                else:
                    R_norm[:, j] = (np.max(col) - col) / span
        saw_scores = R_norm @ w
        expected_phi_v = (m / (m - 1.0)) * (saw_scores - np.mean(saw_scores))
        max_vshape_saw_err = max(
            max_vshape_saw_err, float(np.max(np.abs(res_v["phi_net"] - expected_phi_v)))
        )

        # 2. Usual (Type I) vs. weighted Borda midrank score (Mareschal 2015 Eq. 16):
        #    phi_j(a) = (m + 1) / (m - 1) - (2 / (m - 1)) * R_j(a)
        res_u = promethee_ii(X, w, types, preference_function="usual")
        borda_phi = np.zeros(m)
        for j in range(n):
            signed_col = types[j] * X[:, j]
            for a in range(m):
                n_better = int(np.sum(signed_col > signed_col[a]))
                n_equal = int(np.sum(signed_col == signed_col[a]))
                avg_rank = n_better + (n_equal + 1.0) / 2.0
                phi_j_a = (m + 1.0 - 2.0 * avg_rank) / (m - 1.0)
                borda_phi[a] += w[j] * phi_j_a
        max_usual_borda_err = max(
            max_usual_borda_err, float(np.max(np.abs(res_u["phi_net"] - borda_phi)))
        )

        # 3. Zero-sum net flow and location-shift invariance across all 4 families:
        shifts = rng.uniform(-1000.0, 1000.0, size=(1, n))
        for fam in ("v-shape", "usual", "level", "gaussian"):
            r1 = promethee_ii(X, w, types, preference_function=fam)
            r2 = promethee_ii(X + shifts, w, types, preference_function=fam)
            max_zerosum_err = max(max_zerosum_err, abs(float(np.sum(r1["phi_net"]))))
            max_shift_err = max(
                max_shift_err, float(np.max(np.abs(r1["phi_net"] - r2["phi_net"])))
            )

    print(f"  Max |phi_vshape - (m/(m-1))*(SAW - mean(SAW))|: {max_vshape_saw_err:.2e}")
    print(f"  Max |phi_usual  - weighted_Borda_net_flow|:     {max_usual_borda_err:.2e}")
    print(f"  Max |sum_a phi(a)| across 4,000 runs:           {max_zerosum_err:.2e}")
    print(f"  Max shift-invariance diff across 4,000 runs:    {max_shift_err:.2e}")
    assert max_vshape_saw_err < 1e-13
    assert max_usual_borda_err < 1e-13
    assert max_zerosum_err < 1e-13
    assert max_shift_err < 1e-12


if __name__ == "__main__":
    verify_f1_brans_1986()
    verify_f2_goswami_2020()
    verify_f3_abdullah_2019()
    verify_libraries()
    verify_identities_and_invariants()
    print("\nALL PROMETHEE II VERIFICATION CHECKS PASSED.")
