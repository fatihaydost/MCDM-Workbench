import json, numpy as np, sys
d = json.load(open(sys.argv[1]))
P = d['problem']; X = np.array(P['matrix'], float); types = [c['type'] for c in P['criteria']]
w = np.array(d['w'])
def topsis(X, w, types):
    R = X/np.sqrt((X**2).sum(0)); V = R*w
    ben = np.array([t=='benefit' for t in types])
    best = np.where(ben, V.max(0), V.min(0)); worst = np.where(ben, V.min(0), V.max(0))
    dp = np.sqrt(((V-best)**2).sum(1)); dm = np.sqrt(((V-worst)**2).sum(1))
    return dm/(dp+dm)
def rank(s):  # competition desc
    return np.array([1+np.sum(s > si + 1e-12*max(1,abs(si))) for si in s])
def critic(X, types):
    mn, mx = X.min(0), X.max(0); rng = mx-mn
    R = np.where(np.array([t=='benefit' for t in types]), (X-mn)/np.where(rng==0,1,rng), (mx-X)/np.where(rng==0,1,rng))
    sd = R.std(0, ddof=1); C = np.corrcoef(R.T); C = np.nan_to_num(C)
    info = sd*(1-C).sum(0); return info/info.sum()
def mid(x):
    x=np.asarray(x,float); o=np.empty(len(x))
    for i,v in enumerate(x): o[i]=np.sum(x<v)+ (np.sum(x==v)+1)/2
    return o
def spear(x,y):
    a,b=mid(x),mid(y); a-=a.mean(); b-=b.mean(); return (a*b).sum()/np.sqrt((a*a).sum()*(b*b).sum())
def ws(x,y):
    a,b=mid(x),mid(y); n=len(a); return 1-sum(2**-a[i]*abs(a[i]-b[i])/max(abs(a[i]-1),abs(a[i]-n)) for i in range(n))
base = rank(topsis(X,w,types)); print('base', base, 'ts', d['base']['ranking'])
print('critic w', w, 'py', critic(X,types))
# removal
for r in d['rem']:
    j=r['j']; keep=[c for c in range(X.shape[1]) if c!=j]; Xr=X[:,keep]; tr=[types[c] for c in keep]
    wr = w[keep]/w[keep].sum() if r['mode']=='renormalize' else critic(Xr,tr)
    rk = rank(topsis(Xr,wr,tr))
    ok = np.allclose(wr, np.array(r['weights'])[keep]) and list(rk)==r['ranking'] and abs(spear(base,rk)-r['spearman'])<1e-12 and abs(ws(base,rk)-r['ws'])<1e-12
    print('rem', j, r['mode'], rk, 'OK' if ok else 'MISMATCH', r['ranking'])
# perturb
bad=0
for r in d['pert']:
    k=r['k']; t=min(1,max(0,w[k]*(1+r['delta']))); w2=w*(1-t)/(1-w[k]); w2[k]=t
    rk=rank(topsis(X,w2,types))
    if not (np.allclose(w2,r['weights']) and list(rk)==r['ranking']): bad+=1
print('perturb mismatches', bad, 'of', len(d['pert']))
# MC statistical
rng=np.random.default_rng(123); N=200000
for key,alpha in [('mcU',np.ones(len(w))),('mcK',100*w),('mcK20',20*w)]:
    W=rng.dirichlet(alpha,N); m=X.shape[0]; cnt=np.zeros((m,m)); top=0
    for wi in W[:40000]:
        rk=rank(topsis(X,wi,types)); cnt[np.arange(m),rk-1]+=1
    acc=cnt/40000; ts=np.array(d[key]['acceptability'])
    se=np.sqrt(acc*(1-acc)/10000+acc*(1-acc)/40000)+1e-9
    z=np.abs(acc-ts)/se
    print(key,'max |z| acceptability', z.max().round(2), 'meanRank ts', np.round(d[key]['meanRank'],3), 'py', np.round((acc*np.arange(1,m+1)).sum(1),3))
# sweep brute check (topsis)
for k,s in enumerate(d['sweeps']):
    ts=np.linspace(0,1,100001); prev=None; sw=[]
    for t in ts:
        others=np.delete(w,k); w2=np.insert(others*(1-t)/others.sum(),k,t)
        rk=tuple(rank(topsis(X,w2,types)))
        if prev is not None and rk!=prev: sw.append(round(t,5))
        prev=rk
    print('sweep',k,'brute switches',sw[:12],'ts cuts',[round(iv['to'],5) for iv in s['ri']][:-1], 'base iv',round(s['b']['from'],5),round(s['b']['to'],5),'w',round(w[k],4))
