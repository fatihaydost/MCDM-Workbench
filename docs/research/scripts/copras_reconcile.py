import numpy as np
def copras(X,t,w):
    X=np.array(X,float);w=np.array(w,float);D=w*X/X.sum(0)
    sp=D[:,t==0].sum(1);sm=D[:,t==1].sum(1);Wc=w[t==1].sum()
    return sp+Wc*(1/sm)/(1/sm).sum()
def sawsum(X,t,w):
    X=np.array(X,float);B=np.where(t==1,1/X,X);return (w*B/B.sum(0)).sum(1)
rng=np.random.default_rng(1)
for nc in (1,2):
    t=np.array([0]+[1]*nc);mx=0;diffrank=0
    for _ in range(2000):
        X=rng.uniform(1,10,(4,1+nc));w=rng.dirichlet(np.ones(1+nc))
        a,b=copras(X,t,w),sawsum(X,t,w);mx=max(mx,abs(a-b).max())
        diffrank+= (np.argsort(-a)!=np.argsort(-b)).any()
    print(f"cost criteria={nc}: max|COPRAS-SAWsum|={mx:.2e}, ranking differs in {diffrank}/2000")
X=[[5,0.01],[9,4],[9,5]];t=np.array([0,1]);w=[.5,.5]
print("near-zero Q",copras(X,t,w).round(6),"bound S+1+Wc =",round(.5*5/23+.5,6))
# Podvezko variants
P=lambda r4:[[42,19,13,r4[0]],[71,18,11,r4[1]],[53,20,12,149]]
t=np.array([0,0,1,1]);w=[.26,.23,.24,.27]
for name,r4 in (("VarI",(105,215)),("VarII",(110,200)),("only A1 105->110",(110,215)),("only A2 215->200",(105,200))):
    q=copras(P(r4),t,w);print(name,q.round(6),"ranks",(np.argsort(np.argsort(-q))+1))
