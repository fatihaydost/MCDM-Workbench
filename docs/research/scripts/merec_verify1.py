import numpy as np
np.set_printoptions(precision=5, suppress=True)

def merec(X, ben, div=None, log=np.log, norm='origin', removed_div=None, full=False):
    X = np.asarray(X, float); m, n = X.shape
    N = np.empty_like(X)
    for j in range(n):
        c = X[:, j]
        if norm == 'origin':
            N[:, j] = c.min()/c if ben[j] else c/c.max()
        else:
            N[:, j] = c/c.max() if ben[j] else c.min()/c
    L = np.abs(log(N))
    d = n if div is None else div
    dr = d if removed_div is None else removed_div
    S = np.log(1 + L.sum(1)/d)
    Sp = np.log(1 + (L.sum(1)[:, None] - L)/dr)
    E = np.abs(Sp - S[:, None]).sum(0)
    w = E/E.sum()
    return (N, S, Sp, E, w) if full else w

# Fixture 1 (Table 2)
X1 = [[450,8000,54,145],[10,9100,2,160],[100,8200,31,153],[220,9300,1,162],[5,8400,23,158]]
b1 = [1,1,0,0]
N,S,Sp,E,w = merec(X1,b1,full=True)
print("F1 N\n",N); print("S",S); print("Sp\n",Sp); print("E",E); print("w",w)
pubN = np.array([[0.011,1,1,0.895],[0.5,0.879,0.037,0.988],[0.05,0.976,0.574,0.944],[0.023,0.860,0.019,1],[1,0.952,0.426,0.975]])
pubS = np.array([0.77,0.71,0.65,1.09,0.21])
pubSp = np.array([[0.03,0.77,0.77,0.75],[0.62,0.69,0.19,0.71],[0.15,0.64,0.57,0.64],[0.71,1.08,0.68,1.09],[0.21,0.20,0.02,0.20]])
pubE = np.array([1.71,0.04,1.19,0.03]); pubw=np.array([0.5752,0.0141,0.4016,0.0091])
print("dN",abs(N-pubN).max(),"dS",abs(S-pubS).max(),"dSp",abs(Sp-pubSp).max(),"dE",abs(E-pubE).max(),"dw",abs(w-pubw).max())
print("printed E ratio", pubE/pubE.sum())
# weights from printed Table3
L=np.abs(np.log(pubN)); S_=np.log(1+L.sum(1)/4); Sp_=np.log(1+(L.sum(1)[:,None]-L)/4); E_=(S_[:,None]-Sp_).sum(0); print("w from rounded N", E_/E_.sum(), abs(E_/E_.sum()-pubw).max())
# sums of printed rounded terms
print("printed-term sums", np.abs(pubSp-pubS[:,None]).sum(0))
# variants
print("n-1", merec(X1,b1,removed_div=3))
print("log10", merec(X1,b1,log=np.log10))
print("waspas norm", merec(X1,b1,norm='waspas'))
print("shift C1+100", merec(np.array(X1)+np.array([100,0,0,0]),b1))
print("C2*1000", merec(np.array(X1)*np.array([1,1000,1,1]),b1))

# Fixture 2
X2=[[23,264,2.37,0.05,167,8900,8.71],[20,220,2.2,0.04,171,9100,8.23],[17,231,1.98,0.15,192,10800,9.91],[12,210,1.73,0.2,195,12300,10.21],[15,243,2,0.14,187,12600,9.34],[14,222,1.89,0.13,180,13200,9.22],[21,262,2.43,0.06,160,10300,8.93],[20,256,2.6,0.07,163,11400,8.44],[19,266,2.1,0.06,157,11200,9.04],[8,218,1.94,0.11,190,13400,10.11]]
b2=[1,1,1,0,0,0,0]; w2=merec(X2,b2); pub2=np.array([0.324,0.055,0.086,0.368,0.044,0.077,0.045])
print("F2",w2, abs(w2-pub2).max(), "sum pub", pub2.sum())
X2a=np.array(X2,float); print("ratios", X2a.max(0)/X2a.min(0))
# Fixture 3
X3=[[242,55.9,94.9,42,41,44],[232,65.7,33.9,42,12,14],[234,39.4,68.2,23,44,43],[213,77.6,61.4,32,33,34],[321,37.4,38.1,31,43,34],[431,24.3,76.8,24,24,14]]
w3=merec(X3,[1]*6); pub3=np.array([0.0758,0.2002,0.1602,0.0953,0.2747,0.1938]); print("F3",w3,abs(w3-pub3).max())
# edge
print("const col", merec([[1,5,3],[2,5,1],[4,5,2]],[1,1,1]))
print("m=2", merec([[1,2],[3,4]],[1,0]))
# n=1 ? E = sum ln(1+L) ; fine.
# float: constant column with values like 0.1+0.2 vs 0.3
c=[0.1+0.2,0.3,0.3]; print("near-const", merec(np.c_[[1,2,3],c],[1,1]))
# Does S' <= S always? yes since L>=0. log1p accuracy test: tiny diffs
Xt=np.array([[1,1+1e-12],[2,1]],float); print("tiny", merec(Xt,[1,1]))
# dominance: zero-ish value
print("near-zero", merec([[1e-6,5],[1,6],[2,7]],[1,1]))
# cost criterion near-zero: x/max -> tiny n for alternative with near zero cost
print("near-zero cost", merec([[1e-6,5],[1,6],[2,7]],[0,1]))

# Dua Case 1 (Table 1 -> Table 2)
Xc1=[[0.883,95,9,71.73],[0.953,82,8.67,75.82],[0.9058,390,4.9,12.67],[0.8316,166,2.67,8.04]]
print("Dua C1", merec(Xc1,[0,1,1,1]), "pub [0.8196,0.0601,0.0601,0.0601]")
import itertools
best=min((abs(merec(Xc1,list(b))-np.array([0.8196,0.0601,0.0601,0.0601])).max(),b) for b in itertools.product([0,1],repeat=4))
print("best type assignment",best)
# Dua Case 3 (Table 12 -> Table 13)
Xc3=[[780,18,55,635,229,880,22000],[880,15,50,735,225,390,30000],[930,13,45,785,269,590,31000],[980,15,45,785,217,600,22000],[980,12,45,835,250,950,24000],[1080,12,50,930,220,960,22000],[885,12,40,685,195,970,21000],[750,12,45,400,179,940,20000]]
pubc3=np.array([0.0837,0.0536,0.0705,0.2640,0.0972,0.3077,0.1233])
wc3=merec(Xc3,[1,1,1,1,1,1,0]); print("Dua C3", wc3, abs(wc3-pubc3).max())
best=min((abs(merec(Xc3,list(b))-pubc3).max(),b) for b in itertools.product([0,1],repeat=7)); print("C3 best",best)

# Ulutas 2022 Table 1 -> Table 3/5
Xu=[[2500,6150,18,1150,200,5,7],[2500,7400,18,1150,195,8,7],[2000,7250,12,800,190,5,8],[2000,5750,24,1100,200,7,8],[3000,7600,18,1150,190,7,7],[3000,8400,24,1100,200,5,8]]
bu=[1,0,1,0,1,1,1]; pubT=np.array([0.153,0.189,0.102,0.241,0.189,0.200]); pubwu=np.array([0.178,0.150,0.367,0.068,0.023,0.159,0.056])
for d in (7,6):
    N,S,Sp,E,w=merec(Xu,bu,div=d,full=True); print("Ulutas div",d,"dS",abs(S-pubT).max(),"dw",abs(w-pubwu).max(), w)

# Popovic 2022 Table 1 -> Table 2
Xp=[[3,3,3,2,2],[5,4,5,5,5],[3,3,4,5,5]]; pubp=np.array([0.097,0.056,0.153,0.347,0.347])
for d in (5,3,4):
    w=merec(Xp,[1]*5,div=d); print("Popovic div",d,w,abs(w-pubp).max())
w=merec(Xp,[1]*5,removed_div=4); print("Popovic n-1",w,abs(w-pubp).max())
