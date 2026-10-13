"""Independent skeptic #1 recomputation for cards/edas.md.
Inputs parsed from my own pdftotext -layout extraction in v1/edas_sk1/ (not from the card's script)."""
import re, json, itertools
from decimal import Decimal, ROUND_HALF_UP
import numpy as np

BASE = "/tmp/claude-1000/-home-zuko-obsidianvault-Mybrain/833620e3-e803-409c-aaeb-abb8496558c1/scratchpad/mcdm"
ORIG = open(f"{BASE}/v1/edas_sk1/orig.txt").read().splitlines()
AU = open(f"{BASE}/v1/edas_sk1/aydinunal2019.txt").read().splitlines()


def edas(X, w, types, d_form=True):
    X = np.asarray(X, float); w = np.asarray(w, float)
    AV = X.mean(axis=0)
    PDA = np.zeros_like(X); NDA = np.zeros_like(X)
    for j, t in enumerate(types):
        if d_form:
            d = (X[:, j] - AV[j]) / AV[j]
            if t == "benefit":
                PDA[:, j] = np.maximum(0, d); NDA[:, j] = np.maximum(0, -d)
            else:
                PDA[:, j] = np.maximum(0, -d); NDA[:, j] = np.maximum(0, d)
        else:  # literal paper Eqs. 6-9
            up = np.maximum(0, X[:, j] - AV[j]) / AV[j]
            dn = np.maximum(0, AV[j] - X[:, j]) / AV[j]
            PDA[:, j], NDA[:, j] = (up, dn) if t == "benefit" else (dn, up)
    SP = PDA @ w; SN = NDA @ w
    NSP = SP / SP.max(); NSN = 1 - SN / SN.max()
    AS = (NSP + NSN) / 2
    return dict(AV=AV, PDA=PDA, NDA=NDA, SP=SP, SN=SN, NSP=NSP, NSN=NSN, AS=AS)


def rank_desc(s):
    s = np.asarray(s); return np.array([1 + np.sum(s > v) for v in s])


def r2(x):
    return float(Decimal(repr(float(x))).quantize(Decimal("0.01"), ROUND_HALF_UP))


def r32(x):
    a = Decimal(repr(float(x))).quantize(Decimal("0.001"), ROUND_HALF_UP)
    return float(a.quantize(Decimal("0.01"), ROUND_HALF_UP))


print("=== F1: origin Tables 1-3 ===")
# Table 1
t1 = []
for ln in ORIG:
    m = re.match(r"^S(\d+)\s+([\d.]+)\s+([\d.]+)\s+(\d+)\s*$", ln)
    if m:
        t1.append([float(m.group(2)), float(m.group(3)), float(m.group(4))])
X1 = np.array(t1); print("rows parsed", X1.shape)
# Table 2
t2 = []
start = [i for i, l in enumerate(ORIG) if "The results of the proposed method" in l][0]
for ln in ORIG[start:start + 70]:
    m = re.match(r"^\s*(\d+)\s+((?:[\d.]+\s+){10}[\d.]+)\s*$", ln)
    if m:
        t2.append([float(v) for v in m.group(2).split()])
T2 = np.array(t2); print("Table 2 rows", T2.shape)
w3 = np.full(3, 1 / 3)
r = edas(X1, w3, ["benefit"] * 3)
print("AV", r["AV"], "printed 54.44 1099.68 3.91")
mine = np.column_stack([r["PDA"], r["NDA"], r["SP"] * 3, r["NSP"], r["SN"] * 3, r["NSN"], r["AS"]])
mine_w = np.column_stack([r["PDA"], r["NDA"], r["SP"], r["NSP"], r["SN"], r["NSN"], r["AS"]])
print("max |diff| full precision vs printed", np.abs(mine - T2).max())
single = np.vectorize(r2)(mine); dbl = np.vectorize(r32)(mine)
print("cells off with single 2dp rounding:", int((np.abs(single - T2) > 1e-9).sum()), "of", T2.size)
print("cells off with 3dp->2dp:", int((np.abs(dbl - T2) > 1e-9).sum()))
print("SP printed equals unweighted sum? max diff", np.abs(np.vectorize(r32)(r["SP"] * 3) - T2[:, 6]).max(),
      " vs weighted SP diff", np.abs(r["SP"] - T2[:, 6]).max())
card_AS = [0.6563, 1.0000, 0.6098, 0.4281, 0.5959, 0.4539, 0.4330, 0.5983, 0.6430, 0.7167, 0.1549, 0.3564, 0.5808, 0.5416, 0.4099,
           0.3367, 0.2359, 0.4025, 0.3707, 0.3666, 0.2263, 0.3720, 0.3941, 0.1928, 0.0795, 0.1824, 0.1869, 0.3927, 0.4707, 0.1268,
           0.3455, 0.1780, 0.2971, 0.1409, 0.2476, 0.1748, 0.1994, 0.2458, 0.3084, 0.3036, 0.0000, 0.0792, 0.1789, 0.1828, 0.2285,
           0.0913, 0.0755]
print("card expected AS vs mine max diff", np.abs(np.array(card_AS) - r["AS"]).max())
order = np.argsort(-r["AS"], kind="stable")
A = sorted((order[:10] + 1).tolist()); B = sorted((order[10:24] + 1).tolist())
print("class A", A); print("class B", B)
print("AS at boundary pos 10/11:", r["AS"][order[9]], r["AS"][order[10]], " pos 24/25:", r["AS"][order[23]], r["AS"][order[24]])
# implicit weighting
share = r["PDA"].sum(0) / r["PDA"].sum()
print("PDA column shares", share, "CV pop", X1.std(0) / X1.mean(0), "CV sample", X1.std(0, ddof=1) / X1.mean(0))
print("colsum PDA - NDA", r["PDA"].sum(0) - r["NDA"].sum(0))
# weight scale invariance
r7 = edas(X1, w3 * 7, ["benefit"] * 3); print("w*7 max dAS", np.abs(r7["AS"] - r["AS"]).max())
Xs = X1.copy(); Xs[:, 0] *= 0.001
print("col scale max dAS", np.abs(edas(Xs, w3, ["benefit"] * 3)["AS"] - r["AS"]).max())

print("\n=== F1b: Tables 5-7 ===")
t5 = []; t6 = []
for ln in ORIG:
    m = re.match(r"^A(\d+)\s+((?:[\d.]+\s+){6}[\d.]+)\s*$", ln)
    if m and len(t5) < 10:
        t5.append([float(v) for v in m.group(2).split()])
    m = re.match(r"^Set (\d)\s+((?:0\.\d+\s+){6}0\.\d+)\s*$", ln)
    if m:
        t6.append([float(v) for v in m.group(2).split()])
X5 = np.array(t5); W6 = np.array(t6); print(X5.shape, W6.shape, "weight sums", W6.sum(1))
ed_ranks = []
for ln in ORIG:
    m = re.match(r"^(?:Set \d\s+)?EDAS\s+((?:\d+\s+){9}\d+)\s*$", ln)
    if m:
        ed_ranks.append([int(v) for v in m.group(1).split()])
ed_ranks = np.array(ed_ranks); print("EDAS rank rows", ed_ranks.shape)
T5 = ["benefit"] * 3 + ["cost"] * 4
card_derived = [
    [1.000000, 0.820483, 0.338017, 0.000000, 0.321972, 0.273052, 0.899458, 0.840959, 0.773152, 0.152736],
    [1.000000, 0.842441, 0.323858, 0.000000, 0.320300, 0.278498, 0.904192, 0.848130, 0.783870, 0.195141],
    [1.000000, 0.877633, 0.312207, 0.000000, 0.312905, 0.284413, 0.906849, 0.854573, 0.786213, 0.229317],
    [1.000000, 0.915961, 0.302281, 0.000000, 0.305505, 0.292033, 0.902841, 0.842567, 0.797342, 0.256852],
    [1.000000, 0.930315, 0.300636, 0.000000, 0.297848, 0.288121, 0.898570, 0.834843, 0.794303, 0.247783],
    [1.000000, 0.950280, 0.303597, 0.000000, 0.289971, 0.280273, 0.885172, 0.818683, 0.778084, 0.237805],
    [1.000000, 0.979739, 0.295080, 0.000000, 0.289726, 0.287312, 0.881094, 0.824629, 0.776616, 0.243787]]
ASs = []
mingap = (9, None)
for s in range(7):
    wr = W6[s] / W6[s].sum()
    a = edas(X5, wr, T5)["AS"]; ap = edas(X5, W6[s], T5)["AS"]
    ASs.append(a)
    srt = np.sort(a); g = np.diff(srt).min()
    if g < mingap[0]: mingap = (g, s + 1)
    print(f"set {s+1} ranks renorm ok={np.array_equal(rank_desc(a), ed_ranks[s])} printed-w ok={np.array_equal(rank_desc(ap), ed_ranks[s])} "
          f"card derived diff={np.abs(a - card_derived[s]).max():.2e}")
print("min consecutive gap", mingap)
# shift claim: set 1, +1 on C4
X5s = X5.copy(); X5s[:, 3] += 1
print("set1 C4+1 ranks", rank_desc(edas(X5s, W6[0] / W6[0].sum(), T5)["AS"]), "orig", ed_ranks[0])
# rank reversal: remove one alternative at a time
rev = 0; examples = []
for s in range(7):
    wr = W6[s] / W6[s].sum(); full = ASs[s]
    for k in range(10):
        keep = [i for i in range(10) if i != k]
        sub = edas(X5[keep], wr, T5)["AS"]
        for a_, b_ in itertools.combinations(range(9), 2):
            i, j = keep[a_], keep[b_]
            if np.sign(full[i] - full[j]) != np.sign(sub[a_] - sub[b_]):
                rev += 1; examples.append((s + 1, k + 1, i + 1, j + 1, full[i], full[j], sub[a_], sub[b_]))
print("pairwise reversals", rev)
for e in examples:
    if e[0] == 2: print("  ", e)

print("\n=== F2: Aydin Unal 2019 ===")
def grab(lines, title, nrow, ncol, skip=0):
    st = [i for i, l in enumerate(lines) if title in l][skip]
    out = []
    for ln in lines[st + 1: st + 30]:
        m = re.match(r"^\s*S\d\s+(.*)$", ln)
        if m:
            vals = [float(v.replace(",", "")) for v in m.group(1).split()]
            out.append(vals[:ncol])
        if len(out) == nrow: break
    return np.array(out)
X9 = grab(AU, "Tablo 9. Düzeltilmiş", 7, 8)
P10 = grab(AU, "Tablo 10.", 7, 8); N11 = grab(AU, "Tablo 11.", 7, 8); T12 = grab(AU, "Tablo 12.", 7, 6)
wAU = np.array([0.1595, 0.1334, 0.0662, 0.0885, 0.0199, 0.0758, 0.2969, 0.1598]); print("w sum", wAU.sum())
lab = ["benefit", "benefit", "cost", "benefit", "benefit", "cost", "benefit", "benefit"]
used = ["benefit", "benefit", "cost", "benefit", "cost", "benefit", "benefit", "benefit"]
for name, ty in (("labelled", lab), ("swapped", used)):
    q = edas(X9, wAU, ty)
    print(name, "PDA diff", np.abs(q["PDA"] - P10).max(), "NDA diff", np.abs(q["NDA"] - N11).max(),
          "SP/SN/NSP/NSN/AS diff", [round(float(np.abs(q[k] - T12[:, c]).max()), 5) for c, k in enumerate(["SP", "SN", "NSP", "NSN", "AS"])],
          "ranks", rank_desc(q["AS"]), "printed", T12[:, 5].astype(int))
    if name == "labelled":
        print("  AV", q["AV"]); print("  SP", q["SP"].round(6)); print("  SN", q["SN"].round(6)); print("  AS", q["AS"].round(6))
# exhaustive: which single type flips reproduce?
best = []
for flips in itertools.chain([()], itertools.combinations(range(8), 1), itertools.combinations(range(8), 2)):
    ty = list(lab)
    for f in flips: ty[f] = "cost" if ty[f] == "benefit" else "benefit"
    q = edas(X9, wAU, ty); best.append((np.abs(q["AS"] - T12[:, 4]).max(), flips))
best.sort(); print("best type flips vs printed AS", best[:3])
X9b = X9.copy(); X9b[:, 3] += 10
print("KK4+10 max dAS", np.abs(edas(X9b, wAU, lab)["AS"] - edas(X9, wAU, lab)["AS"]).max())

print("\n=== F3: Sarihan & Aydin 2023 ===")
X3 = np.array([[38848825, 677113055, 2395334], [28879989, 1335400806, 205743112], [412260387, 3033464, 6512010],
               [152738514, 8607944, 300032], [194413476, 151880, 4558944], [66779465, 1509179, 139887],
               [520533558, 86015541, 262295624], [96517647, 19426417, 17893118], [113654549, 4205094, 234729690],
               [845241538, 25939867, 23727158], [224858429, 5013633825, 52057346], [302415677, 1844880, 9656996],
               [678417175, 6821703723, 607132629], [340316558, 294068655, 49850522]], float)  # typed from my extraction of Tablo 2
w3s = np.array([0.124, 0.521, 0.355])
q = edas(X3, w3s, ["benefit"] * 3)
pr_AS = np.array([0.132, 0.468, 0.065, 0.020, 0.033, 0, 0.311, 0.035, 0.232, 0.119, 0.573, 0.063, 1, 0.179])
print("AV", q["AV"]); print("AS", q["AS"].round(6)); print("ranks", rank_desc(q["AS"]), "printed", rank_desc(pr_AS))
print("max |AS - printed|", np.abs(q["AS"] - pr_AS).max(), "at", np.argmax(np.abs(q["AS"] - pr_AS)))
# with printed (wrong) AV
AVp = np.array([301484097, 1348516970, 131217376.])
d = (X3 - AVp) / AVp; P = np.maximum(0, d); N = np.maximum(0, -d); SP = P @ w3s; SN = N @ w3s
ASp = (SP / SP.max() + 1 - SN / SN.max()) / 2
print("printed-AV AS max diff", np.abs(ASp - pr_AS).max())
# entropy check
p = X3 / X3.sum(0); e = -(p * np.log(p)).sum(0) / np.log(14); print("entropy e", e.round(3), "w", ((1 - e) / (1 - e).sum()).round(3))

print("\n=== Edge cases ===")
c = np.array([0.1, 0.1, 0.1]); print("mean", repr(c.mean()), "d", (c - c.mean()) / c.mean())
col = np.array([-4., 1., -3.]); AV = col.mean()
print("AV<0 d-form: PDA", np.maximum(0, (col - AV) / AV), "NDA", np.maximum(0, (AV - col) / AV))
print("AV<0 literal paper: PDA", np.maximum(0, col - AV) / AV, "NDA", np.maximum(0, AV - col) / AV)
# negative values with AV>0: tiny AV amplification
Xn = np.array([[-100, 5], [100.01, 6], [0, 7]], float)
print("tiny-AV column dominates: AS", edas(Xn, [0.01, 0.99], ["benefit", "benefit"])["AS"].round(4),
      " without col1", edas(Xn[:, 1:], [1.0], ["benefit"])["AS"].round(4))
# max SN = 0 while max SP > 0 possible?  sum_i SP = sum_i SN always
rng = np.random.default_rng(0); worst = 0
for _ in range(2000):
    n, m = rng.integers(2, 8), rng.integers(1, 6)
    Xr = rng.uniform(-1, 10, (n, m)); Xr[:, 0] = np.abs(Xr[:, 0]) + 0.1
    if (Xr.mean(0) <= 0).any(): continue
    wr = rng.dirichlet(np.ones(m)); ty = rng.choice(["benefit", "cost"], m)
    q = edas(Xr, wr, ty)
    worst = max(worst, abs(q["SP"].sum() - q["SN"].sum()))
    assert q["AS"].min() >= -1e-12 and q["AS"].max() <= 1 + 1e-12
print("random: max |sum SP - sum SN|", worst, "AS within [0,1] ok")

print("\n=== F3 extra: C vs L ===")
print("printed-AV AS C, L:", ASp[2].round(5), ASp[11].round(5), " correct-AV C, L:", q3C if False else None)
