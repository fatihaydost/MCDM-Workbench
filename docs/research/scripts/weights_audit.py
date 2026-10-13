import json, numpy as np, sys
R=sys.argv[1]
def critic(X,types,absr=False):
    X=np.array(X,float); m,n=X.shape
    lo,hi=X.min(0),X.max(0); rng=hi-lo
    r=np.zeros_like(X)
    for j in range(n):
        if rng[j]==0: continue
        r[:,j]=(hi[j]-X[:,j])/rng[j] if types[j] in('min','cost') else (X[:,j]-lo[j])/rng[j]
    s=r.std(0,ddof=1)
    with np.errstate(invalid='ignore',divide='ignore'):
        rho=np.corrcoef(r.T)
    rho=np.nan_to_num(rho); np.fill_diagonal(rho,1)
    if absr: rho=np.abs(rho)
    C=s*(1-rho).sum(1)
    return s,C/C.sum()
def entropy(X,types,variant='sum'):
    X=np.array(X,float); m,n=X.shape
    if variant=='minmax':
        lo,hi=X.min(0),X.max(0)
        r=np.array([(hi[j]-X[:,j])/(hi[j]-lo[j]) if types[j] in('min','cost') else (X[:,j]-lo[j])/(hi[j]-lo[j]) for j in range(n)]).T
    else: r=X
    p=r/r.sum(0)
    with np.errstate(divide='ignore',invalid='ignore'):
        pl=np.where(p>0,p*np.log(p),0)
    e=-pl.sum(0)/np.log(m); d=1-e
    return e,d/d.sum()
F=R+'/tests/fixtures/'
k=json.load(open(F+'critic-krishnan2021.json')); s,w=critic(k['matrix'],k['types'])
print('critic krishnan sigma',np.round(s,5),'diff',np.abs(s-k['expected']['sigma_sample']).max())
print('critic krishnan w',np.round(w,5),'diff',np.abs(w-k['expected']['weights']).max())
x=json.load(open(F+'critic-xlsx.json')); s,w=critic(x['matrix'],x['types'])
print('critic xlsx w diff',np.abs(w-x['expected']['weights']).max())
z=json.load(open(F+'entropy-zavadskas2017.json')); e,w=entropy(z['matrix'],z['types'])
print('entropy zav w',np.round(w,5),'diff',np.abs(w-z['expected']['weights']).max(), 'printed perm', z['published_as_printed'])
print('  perm check', np.abs(w[z['published_as_printed']['perm']]-z['published_as_printed']['weights']).max())
kk=json.load(open(F+'entropy-krishnan2021-minmax.json')); e,w=entropy(kk['matrix'],kk['types'],'minmax')
print('entropy krishnan minmax w',np.round(w,5),'diff',np.abs(w-kk['expected']['weights']).max())
# constant column effect in CRITIC
base=[[1,10,3],[4,30,1],[2,20,2],[8,5,7],[3,12,4]]
t=['max','max','min']
_,w0=critic(base,t)
withc=[r+[5] for r in base]
_,w1=critic(withc,t+['max'])
print('CRITIC without const',np.round(w0,6)); print('CRITIC with const col',np.round(w1,6))
_,w2=critic([r+[5,9] for r in base],t+['max','max'])
print('CRITIC with 2 const cols',np.round(w2,6))
