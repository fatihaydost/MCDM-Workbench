import numpy as np
def critic(X,t):
    X=np.array(X,float);m,n=X.shape;r=np.zeros_like(X);const=[]
    for j in range(n):
        lo,hi=X[:,j].min(),X[:,j].max()
        if hi==lo: const.append(j);continue
        r[:,j]=(X[:,j]-lo)/(hi-lo) if t[j]=='b' else (hi-X[:,j])/(hi-lo)
    s=r.std(0,ddof=1);rho=np.eye(n)
    for j in range(n):
        for k in range(j+1,n):
            v=0 if (j in const or k in const) else np.corrcoef(r[:,j],r[:,k])[0,1]
            rho[j,k]=rho[k,j]=v
    C=s*(1-rho).sum(1);return C/C.sum()
X=[[1,10,3],[4,30,1],[2,20,2],[8,5,7],[3,12,4]]
print(critic(X,'bbc'))
print(critic([r+[5] for r in X],'bbcb'))
print(critic([r+[5,9] for r in X],'bbcbb'))
