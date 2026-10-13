# Independent skeptic #1 recomputation of SD weighting (Diakoulaki 1995; Mukhametzyanov 2021)
import numpy as np

class _R:
    def __init__(s,c): s.correlation=c
def rankdata(a):
    a=np.asarray(a,float); o=np.argsort(a,kind='stable'); r=np.empty(len(a)); r[o]=np.arange(1,len(a)+1)
    for v in np.unique(a):
        m=a==v; r[m]=r[m].mean()
    return r
def spearmanr(x,y):
    return _R(np.corrcoef(rankdata(x),rankdata(y))[0,1])
np.set_printoptions(precision=5, suppress=True)

def mm(X, types):
    X = np.asarray(X, float); R = np.zeros_like(X); const = []
    for j in range(X.shape[1]):
        lo, hi = X[:, j].min(), X[:, j].max()
        if hi == lo: const.append(j); continue
        R[:, j] = (X[:, j]-lo)/(hi-lo) if types[j] == 'b' else (hi-X[:, j])/(hi-lo)
    return R, const

def sd(X, types, ddof=1):
    R, c = mm(X, types); s = R.std(axis=0, ddof=ddof); t = s.sum()
    w = s/t if t > 0 else np.full(len(s), 1/len(s))
    return w, s, R, c

print("=== Diakoulaki 1995 ===")
D = [[61.0,1.08,4.33],[20.7,0.26,4.34],[16.3,1.98,2.53],[9.0,3.29,1.65],[5.4,2.77,2.33],[4.0,4.12,1.21],[-6.1,3.52,2.10],[-34.6,3.31,0.98]]
T = 'bbb'
w0, s0, R, _ = sd(D, T, 0); w1, s1, _, _ = sd(D, T, 1)
print("w pop", w0, "w samp", w1, "maxdiff", abs(w0-w1).max())
print("sigma pop", s0, "vs printed [0.263,0.321,0.358]", abs(s0-[0.263,0.321,0.358]).max())
print("sigma samp", s1)
print("w vs printed [.279,.341,.380]", abs(w1-[.279,.341,.380]).max())
T2 = np.array([[1,.212,.996],[.578,0,1],[.524,.446,.460],[.455,.785,.200],[.418,.650,.401],[.404,1,.069],[.298,.845,.335],[0,.790,0]])
print("R\n", R); print("R - Table2\n", R-T2)
print("sigma pop of printed Table2", T2.std(axis=0))
print("corr", np.corrcoef(R.T))
# CRITIC
C = np.corrcoef(R.T); Cj = s0*(1-C).sum(axis=1); print("CRITIC w", Cj/Cj.sum())
for name, w in [("CRITIC", Cj/Cj.sum()), ("SD", w1), ("MW", np.ones(3)/3)]:
    Dsc = R@w; rk = rankdata(-Dsc).astype(int)
    order = np.argsort(-Dsc)+1  # firm index at each rank position
    rhos = [spearmanr(rk, rankdata(-np.asarray(D)[:, j])).correlation for j in range(3)]
    print(name, "scores", Dsc, "ranks", rk, "order(firm# by position)", order, "rho", np.round(rhos, 3))
printed4 = {"CRITIC": [1,6,7,4,5,3,2,8], "SD": [1,2,7,5,6,3,4,8], "MW": [1,2,7,6,5,4,3,8]}
for k, v in printed4.items():
    rhos = [spearmanr(v, rankdata(-np.asarray(D)[:, j])).correlation for j in range(3)]
    print("printed T4 as ranks", k, np.round(rhos, 3))
# PCA rank vs SD rank Table 8 (SD 0.6429)
pca_rank = [1,7,6,4,5,2,3,8]
print("rho(SD ranks, PCA)", spearmanr(rankdata(-(R@w1)), pca_rank).correlation, " printed SD col vs PCA", spearmanr(printed4['SD'], pca_rank).correlation)

print("=== Mukhametzyanov 2021 ===")
DM1 = [[71,4500,150,1056,478],[85,5800,145,2680,564],[76,5600,135,1230,620],[74,4200,160,1480,448],[82,6200,183,1350,615],[81,6000,178,2065,580],[80,5900,160,1650,610],[85,6500,140,1650,667]]
DM2 = [[83,5322,170,1682,500],[84,6021,155,2140,513],[76,4219,155,1613,454],[73,6154,157,2047,582],[78,5453,173,2136,598],[82,6030,174,1238,587],[80,4344,172,1365,507],[77,6114,158,1585,592]]
DM3 = [DM2[0]] + DM1[1:]; DM12 = DM1 + DM2
Tm = 'bcbbc'
pub = {"DM-1":[0.210,0.203,0.207,0.183,0.196],"DM-2":[0.175,0.206,0.231,0.195,0.192],"DM-3":[0.216,0.181,0.220,0.189,0.193],"DM-12":[0.208,0.225,0.192,0.176,0.199]}
for k, X in [("DM-1",DM1),("DM-2",DM2),("DM-3",DM3),("DM-12",DM12)]:
    w, s, _, _ = sd(X, Tm); print(k, w, "diff", abs(w-pub[k]).max())
w, s, _, _ = sd(DM1, Tm); print("DM1 sigma samp", s, abs(s-[0.366,0.354,0.361,0.319,0.341]).max())
# raw std row of Table 1 (std 5.1 813 17.3 518 74.6) - which ddof?
for dd in (0,1): print("raw std ddof", dd, np.asarray(DM1,float).std(axis=0, ddof=dd))
# Max normalization variant
A = np.asarray(DM1, float); M = A/A.max(0); M[:,[1,4]] = 1-M[:,[1,4]]; sM = M.std(0, ddof=1); print("Max", sM, sM/sM.sum())
V = A/np.linalg.norm(A,axis=0); V[:,[1,4]] = 1-V[:,[1,4]]; sV=V.std(0,ddof=1); print("Vec", sV, sV/sV.sum())
# raw (pymcdm-like)
sr = A.std(0); print("raw pop", sr/sr.sum())

print("=== edge cases ===")
X = np.asarray(DM1, float).copy(); X[:,2] = 150; print("C3 const", sd(X, Tm)[0])
print("m=2", sd(DM1[:2], Tm)[0])
print("all const", sd([[1,2],[1,2],[1,2]], 'bb')[0])
print("flip types", abs(sd(DM1,'bbbbb')[0]-sd(DM1,Tm)[0]).max())
Y = A*3.7+100; print("affine", abs(sd(Y,Tm)[0]-sd(A,Tm)[0]).max())
Y = A.copy(); Y[:,0] = -A[:,0]*2; print("negative scaling (direction flip) same w?", abs(sd(Y,Tm)[0]-sd(A,Tm)[0]).max())
# max sample sd of [0,1] values: m=2 -> 0.7071; general bound
for m in (2,3,4,8,100):
    v = np.array([0]*(m//2)+[1]*(m-m//2)); print("m", m, "max samp sd", v.std(ddof=1), "pop", v.std())
# m=2 with one constant -> weights
print("m=2 one const", sd([[1,5,3],[2,5,4]],'bbb')[0])
# near-constant column: tiny range gets full sigma (scale invariance)
Z = A.copy(); Z[:,2] = 150 + np.arange(8)*1e-9; print("near-constant col", sd(Z,Tm)[0])
# outlier effect
O = A.copy(); O[0,3] = 100000; print("outlier C4", sd(O,Tm)[0])

print("=== Table 7/8 consistency (Diakoulaki) ===")
pc = np.array([1,.830,.487,.305,.409,.236,.316,0]); ms = R[:,1]
bi = 0.5*pc+0.5*ms; print("bicriteria", np.round(bi,4), "ranks", rankdata(-bi).astype(int), "order", np.argsort(-bi)+1)
pca_col = [1,7,6,4,5,2,3,8]
recomp = {"CRITIC": rankdata(-(R@(Cj/Cj.sum()))), "SD": rankdata(-(R@w1)), "MW": rankdata(-(R.mean(1)))}
for k in printed4:
    print(k, "T8 using printed T4 col:", round(spearmanr(printed4[k], pca_col).correlation,4), " using recomputed ranks:", round(spearmanr(recomp[k], pca_col).correlation,4))
# stability claim: DM-1 -> DM-3 (one alternative replaced)
ent = {"DM-1":[0.146,0.228,0.211,0.223,0.191],"DM-3":[0.144,0.216,0.200,0.249,0.191]}
sdp = pub
for nm, d in [("Entropy", ent), ("SD", sdp)]:
    dd = np.abs(np.subtract(d["DM-3"], d["DM-1"])); print(nm, "DM1->DM3 |dw|", dd, "max", dd.max(), "mean", dd.mean().round(4), "max rel %", (dd/np.array(d["DM-1"])*100).max().round(1))
# outlier sigma vs m
for m in (5,8,12,20,50):
    v = np.r_[np.zeros(m-1),1.0]; u = np.linspace(0,1,m); print("m",m,"single-outlier samp sd",round(v.std(ddof=1),3),"evenly spread",round(u.std(ddof=1),3))

print("=== SAW top-3 check (Mukhametzyanov Table 2 SD rows) ===")
def norm_max(X):
    X=np.asarray(X,float); M=X/X.max(0); M[:,[1,4]]=1-M[:,[1,4]]; return M
for k,X,lab in [("DM-1",DM1,"A"),("DM-2",DM2,"B")]:
    w=sd(X,Tm)[0]
    for nm,N in [("max",norm_max(X)),("minmax",mm(X,Tm)[0])]:
        o=np.argsort(-(N@w))[:3]+1; print(k,nm,[lab+str(i) for i in o])
