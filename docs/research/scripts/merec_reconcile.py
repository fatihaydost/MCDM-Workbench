import numpy as np, itertools
def merec(X, ben, stable=False):
    X=np.asarray(X,float); m,n=X.shape
    N=np.where(ben, X.min(0)/X, X/X.max(0))
    L=-np.log(N); R=L.sum(1)
    S=np.log1p(R/n); Sp=np.log1p((R[:,None]-L)/n)
    if stable: D=np.log1p(L/(n+R[:,None]-L))
    else: D=S[:,None]-Sp
    E=D.sum(0); return E/E.sum(), N, S, Sp, E
X=[[780,18,55,635,229,880,22000],[880,15,50,735,225,390,30000],[930,13,45,785,269,590,31000],[980,15,45,785,217,600,22000],[980,12,45,835,250,950,24000],[1080,12,50,930,220,960,22000],[885,12,40,685,195,970,21000],[750,12,45,400,179,940,20000]]
P=np.array([0.0837,0.0536,0.0705,0.2640,0.0972,0.3077,0.1233])
ben=np.array([1,1,1,1,1,1,0],bool)
w=merec(X,ben)[0]; print("case3",np.round(w,5),"maxdiff",abs(w-P).max(), "all round4 equal:", np.all(np.round(w,4)==P))
best=sorted((abs(merec(X,np.array(b,bool))[0]-P).max(),b) for b in itertools.product([0,1],repeat=7))[:3]; print(best)
# fixture1 margins
X1=[[450,8000,54,145],[10,9100,2,160],[100,8200,31,153],[220,9300,1,162],[5,8400,23,158]]
w,N,S,Sp,E=merec(X1,np.array([1,1,0,0],bool))
Spp=np.array([[0.03,0.77,0.77,0.75],[0.62,0.69,0.19,0.71],[0.15,0.64,0.57,0.64],[0.71,1.08,0.68,1.09],[0.21,0.20,0.02,0.20]])
print("Sp maxdiff",abs(Sp-Spp).max(), "round2 eq:",np.all(np.round(Sp,2)==Spp), Sp[3,2])
print("N[A5,C1],N[A1,C1]",N[4,0],N[0,0])
X2=[[23,264,2.37,0.05,167,8900,8.71],[20,220,2.2,0.04,171,9100,8.23],[17,231,1.98,0.15,192,10800,9.91],[12,210,1.73,0.2,195,12300,10.21],[15,243,2,0.14,187,12600,9.34],[14,222,1.89,0.13,180,13200,9.22],[21,262,2.43,0.06,160,10300,8.93],[20,256,2.6,0.07,163,11400,8.44],[19,266,2.1,0.06,157,11200,9.04],[8,218,1.94,0.11,190,13400,10.11]]
w2=merec(X2,np.array([1,1,1,0,0,0,0],bool))[0]; P2=np.array([0.324,0.055,0.086,0.368,0.044,0.077,0.045])
print("F2",np.round(w2,5),abs(w2-P2).max(),"round3 eq:",np.all(np.round(w2,3)==P2))
# stable vs naive cancellation: near-constant column next to a spread one
X3=[[1e-6*0+1.0,1],[1.0+1e-12,1e6],[1.0+2e-12,3]]
for st in (False,True):
    w,_,_,_,E=merec(X3,np.array([1,1],bool),stable=st); print("stable" if st else "naive",E,w)
# near-equal not exactly constant
X4=[[0.1+0.2,1],[0.3,1.0000000000000002]]
w,_,_,_,E=merec(X4,np.array([1,1],bool)); print("near-const E",E,E.sum())
