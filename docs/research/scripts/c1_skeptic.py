import numpy as np
X=np.array([[649,4.7,326,7.1,143],[749,5.5,401,7.3,192],[740,5.7,520,7.6,171],[400,5.7,520,11.1,179],[600,5.5,538,8.9,152]],float)
cost=[1,0,0,1,1]
def crit(X,cost):
    m,n=X.shape; r=np.zeros((m,n)); const=np.zeros(n,bool)
    for j in range(n):
        lo,hi=X[:,j].min(),X[:,j].max()
        if hi==lo: const[j]=True; continue
        r[:,j]=(hi-X[:,j])/(hi-lo) if cost[j] else (X[:,j]-lo)/(hi-lo)
    s=r.std(0,ddof=1); rho=np.eye(n)
    for j in range(n):
        for k in range(j+1,n):
            v=0 if const[j] or const[k] else np.corrcoef(r[:,j],r[:,k])[0,1]
            rho[j,k]=rho[k,j]=v
    C=s*(1-rho).sum(1); return C/C.sum()
w0=crit(X,cost); print(np.round(w0,4))
for k in (1,3):
    w=crit(np.hstack([X,np.full((5,k),3.0)]),cost+[0]*k)
    print(k,np.round(w,4), 'maxdiff',np.abs(w[:5]-w0).max().round(4))
