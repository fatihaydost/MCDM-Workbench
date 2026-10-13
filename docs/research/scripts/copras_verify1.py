# Independent skeptic recompute of COPRAS card fixtures (written from scratch, Eq. 5 of Zavadskas et al. 2007)
import numpy as np
np.set_printoptions(precision=6, suppress=True, linewidth=160)

def copras_eq5(X, w, ben):
    X=np.asarray(X,float); w=np.asarray(w,float); ben=np.asarray(ben,bool)
    D = X/X.sum(0)*w
    Sp = D[:,ben].sum(1); Sm = D[:,~ben].sum(1)
    if (~ben).sum()==0 or w[~ben].sum()==0:
        Q=Sp.copy()
    else:
        smin=Sm.min()
        Q = Sp + smin*Sm.sum()/(Sm*np.sum(smin/Sm))
    N = 100*Q/Q.max()
    return D,Sp,Sm,Q,N

def copras_simpl(X,w,ben):
    X=np.asarray(X,float); w=np.asarray(w,float); ben=np.asarray(ben,bool)
    D = X/X.sum(0)*w
    Sp=D[:,ben].sum(1); Sm=D[:,~ben].sum(1); Wc=w[~ben].sum()
    inv=1/Sm; return Sp + Wc*inv/inv.sum()

def rank_desc(q):
    q=np.asarray(q); return np.array([1+np.sum(q>v) for v in q])

def mx(a,b): return np.max(np.abs(np.asarray(a)-np.asarray(b)))

print("=== F6 Ozcan & Celik 2021 ===")
X6=[[10,3.5,7.7,15,1.3,39,2],[20,6,6.8,20,1.6,65,1],[15,9,5.05,30,1.6,60,2],[18,15,6.2,18.5,1.3,68,1],
    [10,15,5.7,18.5,1.5,87,2],[20,18,6.2,18.5,1.8,120,1],[12.5,15,5.1,15,1.1,42,2]]
w6=np.array([0.1186,0.3442,0.0323,0.086,0.0368,0.2148,0.1672]); b6=[1,1,1,0,0,0,0]
print("sum w printed", w6.sum())
D6pub=np.array([[0.0112,0.0148,0.0058,0.0095,0.0047,0.0174,0.0304],[0.0225,0.0253,0.0051,0.0127,0.0058,0.0290,0.0152],
 [0.0169,0.0380,0.0038,0.0190,0.0058,0.0268,0.0304],[0.0202,0.0633,0.0047,0.0117,0.0047,0.0304,0.0152],
 [0.0112,0.0633,0.0043,0.0117,0.0054,0.0389,0.0304],[0.0225,0.0760,0.0047,0.0117,0.0065,0.0536,0.0152],
 [0.0141,0.0633,0.0039,0.0095,0.0040,0.0188,0.0304]])
Q6pub=np.array([0.1137,0.1340,0.1206,0.1702,0.1377,0.1615,0.1623])
for lab,w in [("printed",w6),("renorm",w6/w6.sum())]:
    D,Sp,Sm,Q,N=copras_eq5(X6,w,b6)
    print(lab,"D maxdiff",mx(D,D6pub),"Q",Q,"maxdiff",mx(Q,Q6pub),"rank",rank_desc(Q))
    print("  Sp",Sp,"Sm",Sm,"N",N, "sumQ",Q.sum())
# entropy weights
P=np.array(X6,float); P=P/P.sum(0); k=1/np.log(7); E=-k*(P*np.log(P)).sum(0); dvec=1-E; we=dvec/dvec.sum()
print("entropy w",we,"diff vs Table2",mx(we,w6))
D,Sp,Sm,Q,N=copras_eq5(X6,we,b6); print("entropy-chain Q",Q,"maxdiff",mx(Q,Q6pub),"rank",rank_desc(Q))
print("rank implied by printed Q",rank_desc(Q6pub))

print("\n=== F2 Podvezko 2011 Table 7/8 ===")
wP=[0.26,0.23,0.24,0.27]; bP=[1,1,0,0]
for lab,X in [("VarI",[[42,19,13,105],[71,18,11,215],[53,20,12,149]]),("VarII",[[42,19,13,110],[71,18,11,200],[53,20,12,149]]),
              ("VarI A2R4=220",[[42,19,13,105],[71,18,11,220],[53,20,12,149]])]:
    D,Sp,Sm,Q,N=copras_eq5(X,wP,bP); print(lab,"Sp",Sp,"Sm",Sm,"Q",Q,"N",N,"rank",rank_desc(Q))
D,Sp,Sm,Q,N=copras_eq5([[42,19,13,110],[71,18,11,200],[53,20,12,149]],wP,bP)
print("VarII vs printed: Sp",mx(Sp,[0.142,0.184,0.164]),"Sm",mx(Sm,[0.151,0.191,0.168]),"Q",mx(Q,[0.332,0.334,0.335]))

print("\n=== F1 Zavadskas 2007 ===")
X1=[[30,12.487,6.261,10.880,7.610],[20,12.372,5.961,10.880,7.460],[27,11.096,6.262,9.920,6.690],
    [18,10.982,5.962,9.920,6.540],[24,11.017,6.283,9.980,7.000],[16,10.903,5.983,9.980,6.850]]
b1=[1,0,0,0,0]
pub={"Wa":dict(w=[0.53,.1175,.1175,.1175,.1175],Sp=[0.1178,0.0785,0.1060,0.0707,0.0942,0.0628],Sm=[0.0833,0.0818,0.0766,0.0750,0.0775,0.0759],
      Q=[0.2011,0.1603,0.1826,0.1456,0.1717,0.1387],N=[100,76.70,90.78,72.43,85.37,68.98],
      D=[[0.1178,0.0785,0.1060,0.0707,0.0942,0.0628],[0.0213,0.0211,0.0189,0.0187,0.0188,0.0186],[0.0200,0.0191,0.0200,0.0191,0.0201,0.0191],[0.0208,0.0208,0.0189,0.0189,0.0190,0.0190],[0.0212,0.0208,0.0186,0.0182,0.0195,0.0191]]),
     "Wb":dict(w=[0.075,0.70,0.075,0.075,0.075],Sp=[0.0167,0.0111,0.0150,0.0100,0.0133,0.0089],Sm=[0.1665,0.1645,0.1496,0.1475,0.1494,0.1474],
      Q=[0.1832,0.1756,0.1646,0.1575,0.1628,0.1563],N=[100,95.85,89.84,86.00,88.86,85.32],
      D=[[0.0167,0.0111,0.0150,0.0100,0.0133,0.0088],[0.1269,0.1258,0.1128,0.1116,0.1120,0.1108],[0.0128,0.0122,0.0128,0.0122,0.0128,0.0122],[0.0132,0.0132,0.0121,0.0121,0.0122,0.0122],[0.0135,0.0133,0.0119,0.0116,0.0124,0.0122]])}
for k,p in pub.items():
    D,Sp,Sm,Q,N=copras_eq5(X1,p['w'],b1)
    print(k,"D diff",mx(D.T,p['D']),"Sp diff",mx(Sp,p['Sp']),"Sm diff",mx(Sm,p['Sm']))
    print("  Eq5 Q",Q,"N",N,"rank",rank_desc(Q))
    print("  printed Q vs Eq5 diff",mx(Q,p['Q']),"; printed Q vs Sp+Sm diff",mx(Sp+Sm,p['Q']),"; printed Q vs printedSp+printedSm",mx(np.add(p['Sp'],p['Sm']),p['Q']))
    print("  printed rank",rank_desc(p['Q']), "N from printed Q",100*np.array(p['Q'])/max(p['Q']))
    print("  normalized x3:", (np.array(X1)[:,2]/np.array(X1)[:,2].sum()))

print("\n=== F3 Podvezko Table 9 ===")
Sp=np.array([0.1374,0.1292,0.1109,0.1116,0.0496]); Sm=np.array([0.1405,0.0898,0.0855,0.0983,0.0470])
Z=Sp+Sm.sum()/(Sm*np.sum(1/Sm)); print("Z",Z,"diff",mx(Z,[0.1908,0.2129,0.1988,0.1880,0.2093]),"Sp+Sm",Sp+Sm)

print("\n=== F5 Aytac Adali & Tus Isik 2016 (reconstructed weights, zeros present) ===")
X5=[[4.60,5.00,1,2750,38,45,800,760],[3.30,3.71,1,2267,39,65,880,900],[3.61,3.84,1,1584,38,50,990,970],
    [3.37,3.62,1,1650,35,53,1010,1050],[4.09,4.40,0,2650,40,55,870,860],[3.24,3.88,0,3340,57,52,1080,1030]]
b5=[1,1,1,0,0,0,0,0]
for lab,w in [("recon",[0.2817,0.1387,0.0413,0.0749,0.0215,0.0215,0.1387,0.2817]),("printed",[0.2817,0.1387,0.0413,0.0413,0.0215,0.0215,0.0215,0.2817])]:
    D,Sp,Sm,Q,N=copras_eq5(X5,w,b5); print(lab,"sumw",sum(w),"Q",Q,"diff",mx(Q,[0.1982,0.1652,0.1682,0.1592,0.1697,0.1394]),"N",N,"rank",rank_desc(Q))

print("\n=== F4 EDAS 2015 Table 5-7 ===")
X4=[[23,264,2.37,0.05,167,8900,8.71],[20,220,2.2,0.04,171,9100,8.23],[17,231,1.98,0.15,192,10800,9.91],[12,210,1.73,0.2,195,12300,10.21],
    [15,243,2,0.14,187,12600,9.34],[14,222,1.89,0.13,180,13200,9.22],[21,262,2.43,0.06,160,10300,8.93],[20,256,2.6,0.07,163,11400,8.44],
    [19,266,2.1,0.06,157,11200,9.04],[8,218,1.94,0.11,190,13400,10.11]]
b4=[1,1,1,0,0,0,0]
W4=[[0.250,0.214,0.179,0.143,0.107,0.071,0.036],[0.182,0.212,0.182,0.152,0.121,0.091,0.061],[0.139,0.167,0.194,0.167,0.139,0.111,0.083],
    [0.108,0.135,0.162,0.189,0.162,0.135,0.108],[0.083,0.111,0.139,0.167,0.194,0.167,0.139],[0.061,0.091,0.121,0.152,0.182,0.212,0.182],[0.036,0.071,0.107,0.143,0.179,0.214,0.250]]
R4=[[1,3,6,10,7,8,2,4,5,9],[1,3,6,10,7,8,2,4,5,9],[1,2,6,10,7,8,3,4,5,9],[1,2,7,10,6,8,3,4,5,9],[1,2,7,10,6,8,3,4,5,9],[1,2,6,10,7,8,3,4,5,9],[2,1,7,10,6,8,3,4,5,9]]
ok=0; okw=0
for s,(w,r) in enumerate(zip(W4,R4)):
    w=np.array(w); D,Sp,Sm,Q,N=copras_eq5(X4,w/w.sum(),b4); rr=rank_desc(Q); ok+= (rr==r).all()
    okw += (rank_desc(Sp+Sm)==r).all()
    gaps=np.diff(np.sort(Q)); print("set",s+1,"sumw",w.sum(),"rank",rr,"match",(rr==r).all(),"min gap %.6f"%gaps.min())
    if s==0: print("  set1 Q",Q)
print("Eq5 match",ok,"/7; Sp+Sm match",okw,"/7")

print("\n=== Edge cases ===")
X=[[5,0.01,4],[9,4,5]]  # guess at near-zero example: benefit 5 vs 9, cost?
print("simplified==eq5 on F1:",mx(copras_simpl(X1,pub['Wa']['w'],b1),copras_eq5(X1,pub['Wa']['w'],b1)[3]))
# constant cost column example
Xa=[[1,1],[4,6],[6,4]]; Q=copras_eq5(Xa,[.5,.5],[1,0])[3]; print("const-cost base Q",Q,rank_desc(Q))
Xb=[[1,1,1],[4,6,1],[6,4,1]]; Q=copras_eq5(Xb,[.25,.25,.5],[1,0,0])[3]; print("const-cost added Q",Q,rank_desc(Q))
# m=2 identity
rng=np.random.default_rng(1)
X=rng.uniform(1,10,(2,4)); w=rng.dirichlet(np.ones(4)); b=[1,0,1,0]
D,Sp,Sm,Q,N=copras_eq5(X,w,b); print("m=2 identity diff",mx(Q,Sp+Sm[::-1]))
# all-benefit equals SAW sum
X=rng.uniform(1,10,(5,3)); w=rng.dirichlet(np.ones(3)); Q=copras_eq5(X,w,[1,1,1])[3]; print("all-benefit vs SAWsum", mx(Q,(X/X.sum(0)*w).sum(1)))
# scale invariance & sumQ
X=rng.uniform(1,10,(5,4)); w=rng.dirichlet(np.ones(4)); b=[1,0,0,1]
Q1=copras_eq5(X,w,b)[3]; X2=X*np.array([3,0.1,7,2]); print("scale inv",mx(Q1,copras_eq5(X2,w,b)[3]),"sumQ",Q1.sum())
# Wc=0 with cost criteria present
Q=copras_eq5(X,[0.5,0,0,0.5],b)[3]; print("Wc=0 eq5 (guarded) Q",Q)
with np.errstate(all='ignore'):
    D=X/X.sum(0)*np.array([0.5,0,0,0.5]); Sm=D[:,[1,2]].sum(1); print("Wc=0 raw Sm",Sm)
# Wc>0 but some cost criterion weight 0 and other positive: fine. Cost weight>0 but S- of alternative 0? impossible with x>0.
# constant-cost randomized stat
cnt=0
for t in range(2000):
    X=rng.uniform(1,10,(4,3)); w=rng.dirichlet(np.ones(3)); b=[1,0,0]
    r0=rank_desc(copras_eq5(X,w,b)[3])
    Xc=np.hstack([X,np.full((4,1),5.0)]); wc=np.append(w*0.7,0.3)
    r1=rank_desc(copras_eq5(Xc,wc,b+[0])[3]); cnt+= not (r0==r1).all()
print("constant cost column changed ranking in",cnt,"/2000")
cntb=0
for t in range(2000):
    X=rng.uniform(1,10,(4,3)); w=rng.dirichlet(np.ones(3)); b=[1,0,0]
    r0=rank_desc(copras_eq5(X,w,b)[3])
    Xc=np.hstack([X,np.full((4,1),5.0)]); wc=np.append(w*0.7,0.3)
    r1=rank_desc(copras_eq5(Xc,wc,b+[1])[3]); cntb+= not (r0==r1).all()
print("constant BENEFIT column (weight 0.3, others x0.7) changed ranking in",cntb,"/2000")
cntb2=0
for t in range(2000):
    X=rng.uniform(1,10,(4,3)); w=rng.dirichlet(np.ones(3)); b=[1,1,1]
    r0=rank_desc(copras_eq5(X,w,b)[3])
    Xc=np.hstack([X,np.full((4,1),5.0)]); wc=np.append(w*0.7,0.3)
    r1=rank_desc(copras_eq5(Xc,wc,b+[1])[3]); cntb2+= not (r0==r1).all()
print("constant benefit column, all-benefit problem, changed ranking in",cntb2,"/2000")

print("\n=== near-zero cost example check ===")
X=np.array([[5.0,0.01],[9.0,4.0],[9.0,5.0]])
Q=copras_eq5(X,[.5,.5],[1,0])[3]; print("COPRAS Q",Q,rank_desc(Q))
# SAW sum with cost inverted 1/x, and max-norm with min/x
inv=np.c_[X[:,0],1/X[:,1]]; s=(inv/inv.sum(0)*.5).sum(1); print("SAW sum (1/x for cost)",s,rank_desc(s))
mm=np.c_[X[:,0]/X[:,0].max(), X[:,1].min()/X[:,1]]; s2=(mm*.5).sum(1); print("SAW max (min/x)",s2,rank_desc(s2))
# Q bounded? cost part max for one alt is Wc as S-_i -> 0
for e in [1e-1,1e-3,1e-6,1e-9]:
    X[0,1]=e; print(e, copras_eq5(X,[.5,.5],[1,0])[3])
