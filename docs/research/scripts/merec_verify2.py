# Independent skeptic #2 recomputation of MEREC (Keshavarz-Ghorabaee et al. 2021, Eqs. 2-6)
import numpy as np
np.set_printoptions(precision=5, suppress=True)

def merec(X, benefit, divisor=None, log=np.log, wnorm=False, rem_div=None):
    X = np.asarray(X, float); m, n = X.shape
    b = np.asarray(benefit, bool)
    N = np.empty_like(X)
    for j in range(n):
        c = X[:, j]
        if b[j] ^ wnorm: N[:, j] = c.min() / c
        else: N[:, j] = c / c.max()
    d = n if divisor is None else divisor
    L = np.abs(log(N))
    S = np.log(1 + L.sum(1) / d)
    rd = d if rem_div is None else rem_div
    Sp = np.array([[np.log(1 + (L[i].sum() - L[i, j]) / rd) for j in range(n)] for i in range(m)])
    E = np.abs(Sp - S[:, None]).sum(0)
    return N, S, Sp, E, E / E.sum()

def rep(name, got, exp):
    got = np.asarray(got); exp = np.asarray(exp)
    print(f"{name}: max|diff| = {np.abs(got-exp).max():.2e}")

# Fixture 1 (Sec 4.1, Table 2)
X1 = [[450,8000,54,145],[10,9100,2,160],[100,8200,31,153],[220,9300,1,162],[5,8400,23,158]]
B1 = [1,1,0,0]
N,S,Sp,E,w = merec(X1,B1)
print("F1 N\n",N); print("S",S); print("S'\n",Sp); print("E",E); print("w",w)
rep("F1 N vs Table3", N, [[0.011,1,1,0.895],[0.5,0.879,0.037,0.988],[0.05,0.976,0.574,0.944],[0.023,0.86,0.019,1],[1,0.952,0.426,0.975]])
rep("F1 S vs Step3", S, [0.77,0.71,0.65,1.09,0.21])
rep("F1 S' vs Table4", Sp, [[0.03,0.77,0.77,0.75],[0.62,0.69,0.19,0.71],[0.15,0.64,0.57,0.64],[0.71,1.08,0.68,1.09],[0.21,0.20,0.02,0.20]])
rep("F1 E vs Step5", E, [1.71,0.04,1.19,0.03])
rep("F1 w vs Step6", w, [0.5752,0.0141,0.4016,0.0091])
print("printed-E ratio", np.array([1.71,.04,1.19,.03])/2.97)
# Step-5 printed sums of rounded terms
St=np.array([0.77,0.71,0.65,1.09,0.21]); Tp=np.array([[0.03,0.77,0.77,0.75],[0.62,0.69,0.19,0.71],[0.15,0.64,0.57,0.64],[0.71,1.08,0.68,1.09],[0.21,0.20,0.02,0.20]])
print("sum of rounded |S'-S|", np.abs(Tp-St[:,None]).sum(0))
# weights from rounded Table 3
Nr=np.array([[0.011,1,1,0.895],[0.5,0.879,0.037,0.988],[0.05,0.976,0.574,0.944],[0.023,0.86,0.019,1],[1,0.952,0.426,0.975]])
L=-np.log(Nr); S_=np.log(1+L.sum(1)/4); Sp_=np.log(1+(L.sum(1)[:,None]-L)/4); E_=(S_[:,None]-Sp_).sum(0); print("w from rounded Table3", E_/E_.sum(), np.abs(E_/E_.sum()-w).max())

# Variants
print("n-1 removed divisor", merec(X1,B1,rem_div=3)[4])
print("log10", merec(X1,B1,log=np.log10)[4], np.abs(merec(X1,B1,log=np.log10)[4]-w).max())
print("WASPAS-style norm", merec(X1,B1,wnorm=True)[4])
print("divisor=m alternatives", merec(X1,B1,divisor=5)[4])

# Fixture 2 (Sec 4.2, Table 5)
X2=[[23,264,2.37,0.05,167,8900,8.71],[20,220,2.2,0.04,171,9100,8.23],[17,231,1.98,0.15,192,10800,9.91],[12,210,1.73,0.2,195,12300,10.21],[15,243,2,0.14,187,12600,9.34],[14,222,1.89,0.13,180,13200,9.22],[21,262,2.43,0.06,160,10300,8.93],[20,256,2.6,0.07,163,11400,8.44],[19,266,2.1,0.06,157,11200,9.04],[8,218,1.94,0.11,190,13400,10.11]]
w2=merec(X2,[1,1,1,0,0,0,0])[4]; print("F2 w",w2); rep("F2 vs Table6", w2,[0.324,0.055,0.086,0.368,0.044,0.077,0.045])

# Fixture 3 Dua 2024 Case 2
X3=[[242,55.9,94.9,42,41,44],[232,65.7,33.9,42,12,14],[234,39.4,68.2,23,44,43],[213,77.6,61.4,32,33,34],[321,37.4,38.1,31,43,34],[431,24.3,76.8,24,24,14]]
w3=merec(X3,[1]*6)[4]; print("F3 w",w3); rep("F3 vs Table9",w3,[0.0758,0.2002,0.1602,0.0953,0.2747,0.1938])

# Edge cases
Xs=np.array(X1,float); Xs[:,0]+=100; print("shift C1+100", merec(Xs,B1)[4])
Xm=np.array(X1,float); Xm[:,1]*=1000; print("scale C2x1000 diff", np.abs(merec(Xm,B1)[4]-w).max())
print("constant col", merec([[1,5,3],[2,5,1],[4,5,2]],[1,1,1])[4])
Nn,Sn,Spn,En,_=merec([[1,2],[1,2]],[1,1]) if True else None
print("all-constant E", En)
# S' <= S always
for X,B in [(X1,B1),(X2,[1,1,1,0,0,0,0]),(X3,[1]*6)]:
    _,S,Sp,_,_=merec(X,B); assert (Sp<=S[:,None]+1e-15).all()
print("S'<=S holds")
# dominant ratio claim: per column ln(max/min)
for X in (X1,X2):
    X=np.array(X,float); print("ln(max/min)", np.log(X.max(0)/X.min(0)))

print("\n--- secondary sources ---")
# Ulutas 2022 Table 1; P and FL cost
XU=[[2500,6150,18,1150,200,5,7],[2500,7400,18,1150,195,8,7],[2000,7250,12,800,190,5,8],[2000,5750,24,1100,200,7,8],[3000,7600,18,1150,190,7,7],[3000,8400,24,1100,200,5,8]]
BU=[1,0,1,0,1,1,1]
TU=[0.153,0.189,0.102,0.241,0.189,0.200]; wU=[0.178,0.150,0.367,0.068,0.023,0.159,0.056]
for d in (7,6):
    _,S,Sp,E,w=merec(XU,BU,divisor=d); print("Ulutas divisor",d,"S",S, "S diff",np.abs(S-TU).max(),"w",w,"w diff",np.abs(w-wU).max())
# Dua Case 1
XD1=[[0.883,95,9,71.73],[0.953,82,8.67,75.82],[0.9058,390,4.9,12.67],[0.8316,166,2.67,8.04]]
print("Dua case1 (C1 cost)", merec(XD1,[0,1,1,1])[4], "printed [0.8196,0.0601,0.0601,0.0601]")
import itertools
best=min(((np.abs(merec(XD1,list(b))[4]-[0.8196,.0601,.0601,.0601]).max(),b) for b in itertools.product([0,1],repeat=4)))
print("Dua case1 best type assignment", best)
# Dua Case 3 Table 12, C7 cost
XD3=[[780,18,55,635,229,880,22000],[880,15,50,735,225,390,30000],[930,13,45,785,269,590,31000],[980,15,45,785,217,600,22000],[980,12,45,835,250,950,24000],[1080,12,50,930,220,960,22000],[885,12,40,685,195,970,21000],[750,12,45,400,179,940,20000]]
w3c=merec(XD3,[1,1,1,1,1,1,0])[4]; print("Dua case3", w3c); rep("Dua case3 vs Table13", w3c,[0.0837,0.0536,0.0705,0.2640,0.0972,0.3077,0.1233])
XP=[[3,3,3,2,2],[5,4,5,5,5],[3,3,4,5,5]]
pw=[0.097,0.056,0.153,0.347,0.347]
for d in (5,3,4):
    w=merec(XP,[1]*5,divisor=d)[4]; print("Popovic div",d,w,np.abs(w-pw).max())
