"""Independent MEREC recomputation (Keshavarz-Ghorabaee et al. 2021, Symmetry 13(4):525, Eqs. 2-6).

Notation as in our core: m alternatives (rows), n criteria (columns). The paper uses the opposite letters
(n alternatives, m criteria); its 1/m in Eqs. 3-4 is 1/(number of criteria).

Run: python3 merec.py
"""
import numpy as np

np.set_printoptions(precision=5, suppress=True, linewidth=140)


def merec(X, types, *, removed_divisor="n", log=np.log, normalized=None):
    """types: 'max' | 'min'. removed_divisor: 'n' (paper Eq. 4) or 'n-1' (variant seen in some later papers)."""
    X = np.asarray(X, float)
    m, n = X.shape
    assert (X > 0).all(), "MEREC needs x > 0 (paper Step 1)"
    if normalized is None:
        N = np.empty_like(X)
        for j, t in enumerate(types):
            col = X[:, j]
            N[:, j] = col.min() / col if t == "max" else col / col.max()  # Eq. 2: everything becomes 'smaller is better'
    else:
        N = np.asarray(normalized, float)
    L = np.abs(log(N))  # |ln n_ij|, >= 0 since 0 < n <= 1
    S = np.log(1 + L.sum(1) / n)  # Eq. 3
    d = n if removed_divisor == "n" else n - 1
    Sp = np.log(1 + (L.sum(1, keepdims=True) - L) / d)  # Eq. 4, S'_ij
    E = np.abs(Sp - S[:, None]).sum(0)  # Eq. 5
    w = E / E.sum()  # Eq. 6
    return dict(N=N, S=S, Sp=Sp, E=E, w=w)


def report(name, res, published, extra=None):
    w = res["w"]
    diff = np.abs(w - np.asarray(published)).max()
    print(f"\n== {name}")
    print("w (ours)      ", w)
    print("w (published) ", np.asarray(published))
    print(f"max |diff| = {diff:.2e}")
    if extra:
        for k, v in extra.items():
            print(k, v)
    return diff


# ---------- Fixture 1: illustrative example, Sec. 4.1, Tables 2-4, Step 6 ----------
X1 = [[450, 8000, 54, 145], [10, 9100, 2, 160], [100, 8200, 31, 153], [220, 9300, 1, 162], [5, 8400, 23, 158]]
T1 = ["max", "max", "min", "min"]
N1_pub = [[0.011, 1, 1, 0.895], [0.500, 0.879, 0.037, 0.988], [0.050, 0.976, 0.574, 0.944], [0.023, 0.860, 0.019, 1], [1, 0.952, 0.426, 0.975]]
S1_pub = [0.77, 0.71, 0.65, 1.09, 0.21]
Sp1_pub = [[0.03, 0.77, 0.77, 0.75], [0.62, 0.69, 0.19, 0.71], [0.15, 0.64, 0.57, 0.64], [0.71, 1.08, 0.68, 1.09], [0.21, 0.20, 0.02, 0.20]]
E1_pub = [1.71, 0.04, 1.19, 0.03]
W1_pub = [0.5752, 0.0141, 0.4016, 0.0091]

r = merec(X1, T1)
report("Illustrative (exact)", r, W1_pub, {
    "N maxdiff vs Table 3": np.abs(r["N"] - N1_pub).max(),
    "S": r["S"], "S maxdiff vs Step 3": np.abs(r["S"] - S1_pub).max(),
    "S' maxdiff vs Table 4": np.abs(r["Sp"] - Sp1_pub).max(),
    "E": r["E"], "E maxdiff vs Step 5 (2 dp)": np.abs(r["E"] - E1_pub).max(),
})
print("S' (ours)\n", r["Sp"])
print("weights from printed E (1.71..)/2.97:", np.array(E1_pub) / sum(E1_pub))
# Is the paper's weight from the rounded Table 3 matrix? (it should not be if they computed at full precision)
rr = merec(X1, T1, normalized=N1_pub)
report("Illustrative, from printed 3-dp Table 3", rr, W1_pub)
# Variants
report("Illustrative, variant n-1 in Eq. 4", merec(X1, T1, removed_divisor="n-1"), W1_pub)
report("Illustrative, variant log10", merec(X1, T1, log=np.log10), W1_pub)
# Wrong normalization (WASPAS-style, i.e. x/max for benefit, min/x for cost) - common error in reuse
Xa = np.asarray(X1, float)
Nw = np.empty_like(Xa)
for j, t in enumerate(T1):
    Nw[:, j] = Xa[:, j] / Xa[:, j].max() if t == "max" else Xa[:, j].min() / Xa[:, j]
report("Illustrative, WASPAS-style normalization (not MEREC)", merec(X1, T1, normalized=Nw), W1_pub)

# ---------- Fixture 2: comparative example, Sec. 4.2, Table 5 (input), Table 6 MEREC (output) ----------
X2 = [[23, 264, 2.37, 0.05, 167, 8900, 8.71], [20, 220, 2.2, 0.04, 171, 9100, 8.23], [17, 231, 1.98, 0.15, 192, 10800, 9.91],
      [12, 210, 1.73, 0.2, 195, 12300, 10.21], [15, 243, 2, 0.14, 187, 12600, 9.34], [14, 222, 1.89, 0.13, 180, 13200, 9.22],
      [21, 262, 2.43, 0.06, 160, 10300, 8.93], [20, 256, 2.6, 0.07, 163, 11400, 8.44], [19, 266, 2.1, 0.06, 157, 11200, 9.04],
      [8, 218, 1.94, 0.11, 190, 13400, 10.11]]
T2 = ["max"] * 3 + ["min"] * 4
W2_pub = [0.324, 0.055, 0.086, 0.368, 0.044, 0.077, 0.045]
r2 = merec(X2, T2)
report("Comparative (Table 6 MEREC)", r2, W2_pub, {"E": r2["E"]})
report("Comparative, variant n-1", merec(X2, T2, removed_divisor="n-1"), W2_pub)

# ---------- Edge cases ----------
print("\n== Edge cases")
Xc = [[1, 5, 3], [2, 5, 1], [4, 5, 2]]
print("constant column 2 ->", merec(Xc, ["max", "max", "min"])["w"])
Xs = [[10, 10], [10, 10]]
rs = merec(Xs, ["max", "min"])
print("all constant -> E =", rs["E"], "w =", rs["w"], "(0/0)")
# scale invariance: multiply a column by 1000
Xk = np.array(X1, float); Xk[:, 1] *= 1000
print("scale x1000 on C2 ->", merec(Xk, T1)["w"])
# shift dependence: add 100 to C1
Xh = np.array(X1, float); Xh[:, 0] += 100
print("shift +100 on C1   ->", merec(Xh, T1)["w"])
# m = 2 sanity
print("m=2:", merec([[1, 2, 3], [2, 1, 4]], ["max", "max", "min"])["w"])


# ---------- Fixture 3: Dua, Duc, Bao & Trung 2024, EUREKA Phys. Eng. (2), Table 8 (input), Table 9 MEREC (output) ----------
X3 = [[242, 55.9, 94.9, 42, 41, 44], [232, 65.7, 33.9, 42, 12, 14], [234, 39.4, 68.2, 23, 44, 43],
      [213, 77.6, 61.4, 32, 33, 34], [321, 37.4, 38.1, 31, 43, 34], [431, 24.3, 76.8, 24, 24, 14]]
T3 = ["max"] * 6
W3_pub = [0.0758, 0.2002, 0.1602, 0.0953, 0.2747, 0.1938]
report("Dua et al. 2024 Case 2 (Table 9 MEREC)", merec(X3, T3), W3_pub)

# Same paper, Case 1 (Table 1 -> Table 2): NOT reproducible by any type assignment (see card).
X3b = [[0.883, 95, 9, 71.73], [0.953, 82, 8.67, 75.82], [0.9058, 390, 4.9, 12.67], [0.8316, 166, 2.67, 8.04]]
report("Dua et al. 2024 Case 1 (Table 2 MEREC) - expected MISMATCH", merec(X3b, ["min", "max", "max", "max"]), [0.8196, 0.0601, 0.0601, 0.0601])

# ---------- Ulutas et al. 2022 (Strategic Management 27(4):23-29), Tables 1-5: divisor = number of ALTERNATIVES ----------
X4 = [[2500, 6150, 18, 1150, 200, 5, 7], [2500, 7400, 18, 1150, 195, 8, 7], [2000, 7250, 12, 800, 190, 5, 8],
      [2000, 5750, 24, 1100, 200, 7, 8], [3000, 7600, 18, 1150, 190, 7, 7], [3000, 8400, 24, 1100, 200, 5, 8]]
T4 = ["max", "min", "max", "min", "max", "max", "max"]
S4_pub = [0.153, 0.189, 0.102, 0.241, 0.189, 0.200]
W4_pub = [0.178, 0.150, 0.367, 0.068, 0.023, 0.159, 0.056]
X4a = np.asarray(X4, float)
N4 = np.column_stack([X4a[:, j].min() / X4a[:, j] if t == "max" else X4a[:, j] / X4a[:, j].max() for j, t in enumerate(T4)])
L4 = np.abs(np.log(N4))
for d, label in [(7, "paper Eq. 3 (1/#criteria)"), (6, "1/#alternatives (what Ulutas printed)")]:
    S = np.log(1 + L4.sum(1) / d)
    Sp = np.log(1 + (L4.sum(1, keepdims=True) - L4) / d)
    E = (S[:, None] - Sp).sum(0)
    print(f"\n== Ulutas 2022, divisor {d} = {label}")
    print("S", S, "maxdiff vs Table 3", np.abs(S - S4_pub).max())
    print("w", E / E.sum(), "maxdiff vs Table 5", np.abs(E / E.sum() - W4_pub).max())


# ---------- pyDecision merec_method (master, last commit 2023-10-26, transcribed for comparison only) ----------
def pydecision_merec(dataset, criterion_type):
    X = np.copy(np.asarray(dataset, float))
    for j in range(X.shape[1]):
        if criterion_type[j] == "max":
            divisor = np.min(X[:, j]) or 1e-9
            X[:, j] = divisor / (X[:, j] + 1e-9)
        else:
            divisor = np.max(X[:, j]) or 1e-9
            X[:, j] = X[:, j] / (divisor + 1e-9)
    S = np.log(1 + (1 / X.shape[1] * np.sum(np.abs(np.log(X)), axis=1)))
    R = np.zeros(X.shape)
    for j in range(X.shape[1]):
        Z = np.delete(X, j, axis=1)
        R[:, j] = np.log(1 + (1 / X.shape[1] * np.sum(np.abs(np.log(Z)), axis=1)))
    E = np.sum(np.abs(R.T - S), axis=1)
    return E / np.sum(E)


print("\n== pyDecision divergence (diff to our numpy)")
for name, X, T in [("illustrative", X1, T1), ("comparative", X2, T2), ("dua case 2", X3, T3)]:
    print(name, f"{np.abs(pydecision_merec(X, T) - merec(X, T)['w']).max():.1e}")
with np.errstate(all="ignore"):
    print("zero in benefit column ->", pydecision_merec([[0, 2], [1, 3], [2, 1]], ["max", "max"]), "(no error; ours rejects)")
    print("negative value         ->", pydecision_merec([[-1, 2], [1, 3], [2, 1]], ["max", "max"]))
    print("all constant           ->", pydecision_merec([[1, 2], [1, 2]], ["max", "max"]))
