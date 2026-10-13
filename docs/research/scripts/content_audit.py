import numpy as np
np.set_printoptions(precision=5, suppress=True)

def critic(X, types, abs_rho=False):
    X=np.asarray(X,float); m,n=X.shape
    r=np.zeros_like(X); const=np.zeros(n,bool)
    for j in range(n):
        lo,hi=X[:,j].min(),X[:,j].max()
        if hi==lo: const[j]=True; continue
        r[:,j]=(X[:,j]-lo)/(hi-lo) if types[j]=='max' else (hi-X[:,j])/(hi-lo)
    s=r.std(axis=0,ddof=1)
    rho=np.eye(n)
    for j in range(n):
        for k in range(j+1,n):
            v=0 if const[j] or const[k] else np.corrcoef(r[:,j],r[:,k])[0,1]
            rho[j,k]=rho[k,j]=v
    if abs_rho: rho=np.abs(rho)
    C=s*(1-rho).sum(axis=1)
    return C/C.sum(), s

K=[[649,4.7,326,7.1,143],[749,5.5,401,7.3,192],[740,5.7,520,7.6,171],[400,5.7,520,11.1,179],[600,5.5,538,8.9,152]]
Kt=['min','max','max','min','min']
w,s=critic(K,Kt); print('CRITIC Krishnan w',w,'sigma',s)
print('  published',[0.1872,0.1838,0.1691,0.2599,0.2000], 'maxdiff', np.abs(w-[0.1872,0.1838,0.1691,0.2599,0.2000]).max())

# duplicate a criterion: does the pair "share weight"?
K2=np.array(K,float); K2=np.c_[K2,K2[:,3]]
w2,_=critic(K2,Kt+['min'])
print('dup thickness: weights',w2,' pair total',w2[3]+w2[5],' vs single',w[3])
for j in range(5):
    K3=np.c_[np.array(K,float),np.array(K,float)[:,j]]
    w3,_=critic(K3,Kt+[Kt[j]])
    print(f' dup col {j}: single {w[j]:.4f} pair total {w3[j]+w3[5]:.4f} ratio {(w3[j]+w3[5])/w[j]:.3f}')

# constant column effect on other weights
K4=np.c_[np.array(K,float),np.full(5,3.0)]
w4,_=critic(K4,Kt+['max'])
print('with a constant column:',w4[:5],' vs without',w,' maxdiff',np.abs(w4[:5]-w).max())
K5=np.c_[K4,np.full(5,7.0),np.full(5,1.0)]
w5,_=critic(K5,Kt+['max']*3)
print('with three constant columns:',w5[:5],' maxdiff',np.abs(w5[:5]-w).max())

# Entropy
def entropy(X,types=None,variant='sum'):
    X=np.asarray(X,float); m,n=X.shape
    if variant=='minmax':
        R=np.zeros_like(X)
        for j in range(n):
            lo,hi=X[:,j].min(),X[:,j].max()
            if hi>lo: R[:,j]=(X[:,j]-lo)/(hi-lo) if types[j]=='max' else (hi-X[:,j])/(hi-lo)
    else: R=X
    d=np.zeros(n); e=np.ones(n)
    for j in range(n):
        if np.all(X[:,j]==X[0,j]): continue
        p=R[:,j]/R[:,j].sum(); h=np.sum([q*np.log(q) for q in p if q>0])
        e[j]=-h/np.log(m); d[j]=max(0,1-e[j])
    return d/d.sum(), e
w,e=entropy(K,Kt,'minmax'); print('Entropy Krishnan minmax',w,'pub',[0.3481,0.1360,0.1690,0.1463,0.2006])
V=[[0.87356,0.621764706,520,25000,3.160588],[0.900285714,0.789785714,550,27500,4.082143],[0.911652,0.577609,550,31500,2.815217],[0.95144,0.82989,450,28500,3.855556],[0.808,0.837652,530,26000,4.617391],[0.947846,0.636308,600,30500,3.006154],[0.95008,0.50583,530,24500,2.369167],[0.9325,0.788917,530,26450,3.841667],[0.930615,0.791615,750,35000,3.863077]]
w,e=entropy(V); print('Vujicic sum w',w,'e',e)
# Zhu zero column example from card
Z=np.array([[0.045],[0],[0],[0],[0]])
print('one-nonzero column e',entropy(np.c_[Z,[1,2,3,4,5]])[1])
