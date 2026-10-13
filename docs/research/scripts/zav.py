import json,re,numpy as np
t=open('/tmp/claude-1000/-home-zuko-obsidianvault-Mybrain/833620e3-e803-409c-aaeb-abb8496558c1/scratchpad/mcdm/main-ro/docs/research/methods/entropy.md').read()
blk=t[t.index('{\n  "id": "entropy-zavadskas2017-economic"'):]
blk=blk[:blk.index('```')]
d=json.loads(blk)
X=np.array(list(d['matrix_transposed_by_criterion'].values())).T
P=X/X.sum(0); e=-(P*np.log(P)).sum(0)/np.log(X.shape[0]); w=(1-e)/(1-e).sum()
print(w, np.abs(w-d['expected']['weights']).max())
pub=np.array(d['published_as_printed']['weights']); perm=[2,4,0,1,3]
print('printed row k vs ours[perm[k]]',np.abs(pub-w[perm]).max())
