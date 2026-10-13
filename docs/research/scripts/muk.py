import numpy as np, sys
sys.path.insert(0,'/tmp/claude-1000/-home-zuko-obsidianvault-Mybrain/833620e3-e803-409c-aaeb-abb8496558c1/scratchpad/mcdm/scripts')
np.set_printoptions(precision=4, suppress=True)
exec(open('/tmp/claude-1000/-home-zuko-obsidianvault-Mybrain/833620e3-e803-409c-aaeb-abb8496558c1/scratchpad/mcdm/scripts/content_audit.py').read().split('K=[[')[0])
src=open('/tmp/claude-1000/-home-zuko-obsidianvault-Mybrain/833620e3-e803-409c-aaeb-abb8496558c1/scratchpad/mcdm/scripts/content_audit.py').read()
exec(src[src.index('def entropy'):src.index('w,e=entropy(K')])
M=np.array([[71,4500,150,1056,478],[85,5800,145,2680,564],[76,5600,135,1230,620],[74,4200,160,1480,448],[82,6200,183,1350,615],[81,6000,178,2065,580],[80,5900,160,1650,610],[85,6500,140,1650,667]],float)
t=['max','min','max','max','min']
print('DM1 entropy minmax',entropy(M,t,'minmax')[0])
def sd(X,t):
    X=np.asarray(X,float);r=np.zeros_like(X)
    for j in range(X.shape[1]):
        lo,hi=X[:,j].min(),X[:,j].max(); r[:,j]=(X[:,j]-lo)/(hi-lo) if t[j]=='max' else (hi-X[:,j])/(hi-lo)
    s=r.std(0,ddof=1); return s/s.sum()
print('DM1 SD',sd(M,t))
for i in range(8):
    if M[i,0]==85:
        M2=M.copy(); M2[i,0]=72
        print('row',i,'85->72 entropy',entropy(M2,t,'minmax')[0],'SD',sd(M2,t))
print('e DM1',entropy(M,t,'minmax')[1])
M2=M.copy(); M2[1,0]=72; print('e after a21 85->72',entropy(M2,t,'minmax')[1])
# try any cell change to 72 in col1
for i in range(8):
    M3=M.copy(); M3[i,0]=72; w,e=entropy(M3,t,'minmax'); print(i,M[i,0],'->72 w1',round(w[0],4),'e1',round(e[0],4))
