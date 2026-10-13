import json, numpy as np
exec(open('/tmp/claude-1000/-home-zuko-obsidianvault-Mybrain/833620e3-e803-409c-aaeb-abb8496558c1/scratchpad/mcdm/scripts/rob_check.py').read().split('base = rank')[0].replace('sys.argv[1]',"'/tmp/claude-1000/-home-zuko-obsidianvault-Mybrain/833620e3-e803-409c-aaeb-abb8496558c1/scratchpad/mcdm/scripts/rob_dump.json'"))
print(X)
k=2
for t in [0.99, 0.9999, 0.999997, 0.99999893, 0.9999995, 1.0]:
    others=np.delete(w,k); w2=np.insert(others*(1-t)/others.sum(),k,t)
    s=topsis(X,w2,types); print(t, s, rank(s))
