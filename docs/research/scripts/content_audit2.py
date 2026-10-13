import numpy as np
np.set_printoptions(precision=4, suppress=True)
def topsis(X,w,t):
    X=np.asarray(X,float); r=X/np.sqrt((X**2).sum(0)); v=r*w
    b=np.where(np.array(t)=='max',v.max(0),v.min(0)); wo=np.where(np.array(t)=='max',v.min(0),v.max(0))
    dp=np.sqrt(((v-b)**2).sum(1)); dm=np.sqrt(((v-wo)**2).sum(1)); return dm/(dp+dm)
print('f',topsis([[1,3000],[2,3750],[5,4500]],[.5,.5],['min','max']))
print('phi',topsis([[6,2.0],[7,2.75],[10,3.5]],[.5,.5],['min','max']))
def saw(X,w,t,var='lin'):
    X=np.asarray(X,float); r=np.zeros_like(X)
    for j in range(X.shape[1]):
        c=X[:,j]
        if var=='lin': r[:,j]= c/c.max() if t[j]=='max' else c.min()/c
        else:
            b=c if t[j]=='max' else 1/c; r[:,j]=b/b.sum()
    return r@w, r
P=[[5.1,9.8,430,9.3,0.70],[7.5,6.5,298,10.3,0.55],[9.7,16.1,306,11.6,0.73],[3.8,8.4,501,19.3,0.79]]
w=np.array([0.35,0.10,0.17,0.25,0.13]); t=['max','max','max','min','max']
S,r=saw(P,w,t); print('SAW lin',S, 'r salary Lith',r[2,2])
S2,_=saw(P,w,t,'sum'); print('SAW sum',S2)
