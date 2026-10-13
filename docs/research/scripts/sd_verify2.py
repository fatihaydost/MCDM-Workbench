import numpy as np
from itertools import permutations
np.set_printoptions(precision=5, suppress=True)
def mm(X, types):
    X=np.asarray(X,float); mn=X.min(0); mx=X.max(0); rng=mx-mn
    R=np.zeros_like(X)
    for j,t in enumerate(types):
        if rng[j]==0: continue
        R[:,j]=(X[:,j]-mn[j])/rng[j] if t=='b' else (mx[j]-X[:,j])/rng[j]
    return R
def sdw(R,ddof=1):
    s=R.std(0,ddof=ddof); T=s.sum()
    return (np.full(R.shape[1],1/R.shape[1]) if T==0 else s/T), s
def rank_desc(v):
    o=np.argsort(-v); r=np.empty(len(v),int); r[o]=np.arange(1,len(v)+1); return r
def spearman(a,b):
    a=np.asarray(a,float); b=np.asarray(b,float); n=len(a)
    return 1-6*((a-b)**2).sum()/(n*(n*n-1))
# Diakoulaki 1995 Table 1
X=[[61.0,1.08,4.33],[20.7,0.26,4.34],[16.3,1.98,2.53],[9.0,3.29,1.65],[5.4,2.77,2.33],[4.0,4.12,1.21],[-6.1,3.52,2.10],[-34.6,3.31,0.98]]
X=np.array(X); R=mm(X,'bbb')
print("Table2 recomputed\n",R)
T2=np.array([[1,.212,.996],[.578,0,1],[.524,.446,.460],[.455,.785,.2],[.418,.65,.401],[.404,1,.069],[.298,.845,.335],[0,.79,0]])
d=np.abs(R-T2); print("Table2 cells diff>5e-4:", [(i,j,T2[i,j],round(R[i,j],4)) for i,j in zip(*np.where(d>5e-4))])
wp,sp=sdw(R,0); ws,ss=sdw(R,1)
print("sigma pop",sp,"sample",ss); print("w pop",wp,"w samp",ws, "diff", np.abs(wp-ws).max())
print("vs printed w", np.abs(wp-[0.279,0.341,0.380]).max(), "sigma", np.abs(sp-[0.263,0.321,0.358]).max())
C=np.corrcoef(R.T); print("corr",C)
c=ss*(1-C).sum(1); wc=c/c.sum(); print("CRITIC",wc)
# rankings
uni=np.array([[1,7,2],[2,8,1],[3,6,3],[4,4,6],[5,5,4],[6,1,7],[7,2,5],[8,3,8]])
printedT4={'CRITIC':[1,6,7,4,5,3,2,8],'SD':[1,2,7,5,6,3,4,8],'MW':[1,2,7,6,5,4,3,8]}
for name,w in [('CRITIC',wc),('SD',ws),('MW',np.ones(3)/3)]:
    D=R@w; rk=rank_desc(D); p=np.array(printedT4[name])
    inv=np.empty(8,int); inv[p-1]=np.arange(1,9)  # if printed col lists firm at rank k
    print(name,"D",D.round(4),"rank",rk,"printed",p,"inverse-of-printed",inv)
    print("  rho recomputed", [round(spearman(rk,uni[:,j]),3) for j in range(3)], " rho printed-as-rank", [round(spearman(p,uni[:,j]),3) for j in range(3)])
# Table 8 check: PCA ranking
pca=np.array([1,7,6,4,5,2,3,8])
for name,w in [('CRITIC',wc),('SD',ws),('MW',np.ones(3)/3)]:
    print("T8",name, round(spearman(rank_desc(R@w),pca),4), "printed-as-rank", round(spearman(np.array(printedT4[name]),pca),4))
# invariances
print("cost flip", np.abs(sdw(mm(X,'ccc'))[0]-ws).max(), "affine", np.abs(sdw(mm(X*3.7+100,'bbb'))[0]-ws).max())
print("m=2", sdw(mm(X[:2],'bbb'))[0])
# Mukhametzyanov
DM1=np.array([[71,4500,150,1056,478],[85,5800,145,2680,564],[76,5600,135,1230,620],[74,4200,160,1480,448],[82,6200,183,1350,615],[81,6000,178,2065,580],[80,5900,160,1650,610],[85,6500,140,1650,667]],float)
DM2=np.array([[83,5322,170,1682,500],[84,6021,155,2140,513],[76,4219,155,1613,454],[73,6154,157,2047,582],[78,5453,173,2136,598],[82,6030,174,1238,587],[80,4344,172,1365,507],[77,6114,158,1585,592]],float)
DM3=DM1.copy(); DM3[0]=DM2[0]; DM12=np.vstack([DM1,DM2]); ty='bcbbc'
pub={'DM-1':[0.210,0.203,0.207,0.183,0.196],'DM-2':[0.175,0.206,0.231,0.195,0.192],'DM-3':[0.216,0.181,0.220,0.189,0.193],'DM-12':[0.208,0.225,0.192,0.176,0.199]}
for k,M in [('DM-1',DM1),('DM-2',DM2),('DM-3',DM3),('DM-12',DM12)]:
    w,s=sdw(mm(M,ty)); print(k,w,"maxdiff",np.abs(w-pub[k]).max(), "sigma",s)
print("Table1 std row (sample)", DM1.std(0,ddof=1).round(1), DM2.std(0,ddof=1).round(1))
# DM-1 constant C3
M=DM1.copy(); M[:,2]=150; print("const C3",sdw(mm(M,ty))[0])
# raw sigma (pymcdm-style pop)
s=DM1.std(0); print("raw",s/s.sum())
# Max norm variant
Rm=DM1/DM1.max(0); Rm[:,[1,4]]=1-Rm[:,[1,4]]; print("Max",sdw(Rm)[0], sdw(Rm)[1])
# Keshavarz-Ghorabaee 2021 Table 5/6, WASPAS-type normalization (variant c)
K=np.array([[23,264,2.37,0.05,167,8900,8.71],[20,220,2.2,0.04,171,9100,8.23],[17,231,1.98,0.15,192,10800,9.91],[12,210,1.73,0.2,195,12300,10.21],[15,243,2,0.14,187,12600,9.34],[14,222,1.89,0.13,180,13200,9.22],[21,262,2.43,0.06,160,10300,8.93],[20,256,2.6,0.07,163,11400,8.44],[19,266,2.1,0.06,157,11200,9.04],[8,218,1.94,0.11,190,13400,10.11]],float)
N=K.copy(); N[:,:3]=K[:,:3]/K[:,:3].max(0); N[:,3:]=K[:,3:].min(0)/K[:,3:]
w=sdw(N)[0]; print("KG Table6 SD", w.round(3), "maxdiff", np.abs(w-[0.221,0.089,0.115,0.293,0.080,0.130,0.073]).max())
# outlier pitfall check: one outlier vs evenly spread, sample SD
for m in (4,8,10,20):
    o=np.zeros(m); o[-1]=1; e=np.linspace(0,1,m); print("m",m,"outlier sd",o.std(ddof=1).round(3),"even sd",e.std(ddof=1).round(3))
