import numpy as np, itertools
R=np.array([[0.7714,0.9449,0.9539,0.9034,0.5678,1.0000,0.6949,0.8872],[1.0000,0.8859,0.9688,0.9464,0.5678,0.7519,0.6165,1.0000],[0.7297,0.8446,1.0000,0.6625,1.0000,0.8474,1.0000,0.7519],[0.9643,1.0000,0.9842,1.0000,0.8474,0.8474,0.6949,0.6165]])
w=np.array([0.3306,0.0718,0.1808,0.0718,0.0459,0.1260,0.1260,0.0472])
P=np.array([0.8995,0.8683,0.9172,0.9037])
cands={'prod x^w':np.prod(R**w,1),'geo mean':np.prod(R,1)**(1/8),'prod x^(w*?)':None}
for k,v in cands.items():
  if v is not None: print(k,v.round(4))
# try per-column exclusion and permutations of weights
best=[]
for perm in set(itertools.permutations(range(8))):
  q=np.prod(R**w[list(perm)],1); d=np.abs(q-P).max(); best.append((d,perm))
best.sort(); print(best[:5])
# try dropping each column
for j in range(8):
  m=[k for k in range(8) if k!=j]; print(j, np.prod(R[:,m]**w[m],1).round(4))
