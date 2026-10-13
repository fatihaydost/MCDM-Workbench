import numpy as np
def pyd(X,t):
    X=np.array(X,float)
    for j in range(X.shape[1]):
        if t[j]=='max':
            d=X[:,j].min(); d=1e-9 if d==0 else d; X[:,j]=d/(X[:,j]+1e-9)
        else:
            d=X[:,j].max(); d=1e-9 if d==0 else d; X[:,j]=X[:,j]/(d+1e-9)
    n=X.shape[1]; S=np.log(1+np.abs(np.log(X)).sum(1)/n)
    R=np.array([np.log(1+np.abs(np.log(np.delete(X,j,1))).sum(1)/n) for j in range(n)]).T
    E=np.abs(R.T-S).sum(1); return E/E.sum()
print(pyd([[1,2],[1,2]],['max','max']))
for t in (['max','max'],['max','min']): print(t,pyd([[0,2],[1,3],[2,1]],t))
