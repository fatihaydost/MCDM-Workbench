import numpy as np
def edas(X,w,ty,AV=None):
    X=np.asarray(X,float);w=np.asarray(w,float);AV=X.mean(0) if AV is None else np.asarray(AV,float)
    D=(X-AV)/AV;b=np.array([t=='b' for t in ty])
    P=np.where(b,np.maximum(0,D),np.maximum(0,-D));N=np.where(b,np.maximum(0,-D),np.maximum(0,D))
    SP=P@w;SN=N@w;return (SP/SP.max()+1-SN/SN.max())/2,P,N
rk=lambda s:[1+int(np.sum(s>v+1e-12)) for v in s]
X3=np.array([[38848825,677113055,2395334],[28879989,1335400806,205743112],[412260387,3033464,6512010],[152738514,8607944,300032],
 [194413476,151880,4558944],[66779465,1509179,139887],[520533558,86015541,262295624],[96517647,19426417,17893118],
 [113654549,4205094,234729690],[845241538,25939867,23727158],[224858429,5013633825,52057346],[302415677,1844880,9656996],
 [678417175,6821703723,607132629],[340316558,294068655,49850522]],float);w3=[0.124,0.521,0.355]
a,_,_=edas(X3,w3,'bbb');print('correct AV C,L',a[2],a[11],'ranks',rk(a))
b,_,_=edas(X3,w3,'bbb',[301484097,1348516970,131217376]);print('printed AV C,L',b[2],b[11],'ranks',rk(b))
pAS=np.array([0.132,0.468,0.065,0.020,0.033,0,0.311,0.035,0.232,0.119,0.573,0.063,1,0.179]);print('rank of printed AS',rk(pAS))
# tiny AV
X=np.array([[-100,5],[100.01,6],[0,7]]);A,P,N=edas(X,[0.01,0.99],'bb');print('tiny AV',X.mean(0),A,'maxPDA',P.max(0),'NDA',N.max(0))
A2,_,_=edas(X[:,1:],[1],'b');print('without col1',A2)
# bound check for nonneg data: PDA<=n-1, NDA<=1
rng=np.random.default_rng(1);mx=0;mn=0
for _ in range(2000):
    n=rng.integers(2,12);Y=rng.exponential(1,(n,3))*(rng.random((n,3))<0.7);Y[0]+=1e-9
    _,P,N=edas(Y,[1/3]*3,'bbb');mx=max(mx,(P/(n-1)).max());mn=max(mn,N.max())
print('nonneg: max PDA/(n-1)',mx,'max NDA',mn)
# literal vs d-form AV<0
c=np.array([-4.,1,-3]);AV=c.mean();print('literal PDA',np.maximum(0,c-AV)/AV,'NDA',np.maximum(0,AV-c)/AV)
