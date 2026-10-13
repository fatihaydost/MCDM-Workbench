import numpy as np
M=np.array([[71,4500,150,1056,478],[85,5800,145,2680,564],[76,5600,135,1230,620],[74,4200,160,1480,448],[82,6200,183,1350,615],[81,6000,178,2065,580],[80,5900,160,1650,610],[85,6500,140,1650,667]],float)
ben=[1,0,1,1,0]
def mm(X):
    R=np.zeros_like(X)
    for j in range(5):
        lo,hi=X[:,j].min(),X[:,j].max()
        R[:,j]=(X[:,j]-lo)/(hi-lo) if ben[j] else (hi-X[:,j])/(hi-lo)
    return R
def ent(R):
    P=R/R.sum(0); m=len(R)
    with np.errstate(divide='ignore',invalid='ignore'):
        L=np.where(P>0,P*np.log(P),0)
    e=-L.sum(0)/np.log(m); d=1-e; return d/d.sum(), e
def sd(R):
    s=R.std(0,ddof=1); return s/s.sum()
w,e=ent(mm(M)); print('base w',w.round(4),'e',e.round(4),'SD',sd(mm(M)).round(4),'std1',M[:,0].std(ddof=1).round(3))
best=[]
for i in range(8):
  for v in range(60,100):
    X=M.copy(); X[i,0]=v; w2,e2=ent(mm(X))
    best.append((abs(w2[0]-0.231),i,v,w2[0].round(4),e2[0].round(4),sd(mm(X))[0].round(4),X[:,0].std(ddof=1).round(3)))
best.sort(); [print(b) for b in best[:6]]
# also: other columns / row1 col2 interpretations
for i in [0,1]:
  for j in range(5):
    X=M.copy(); 
    if M[i,j]==85: X[i,j]=72
    w2,e2=ent(mm(X))
X=M.copy();X[1,0]=72;w2,e2=ent(mm(X));print('A2 85->72',w2.round(4),e2.round(4),sd(mm(X)).round(4),X[:,0].std(ddof=1).round(3))
X=M.copy();X[7,0]=72;w2,e2=ent(mm(X));print('A8 85->72',w2.round(4),e2.round(4),sd(mm(X)).round(4))
X=M.copy();X[1,0]=72;X[7,0]=72;w2,e2=ent(mm(X));print('both 85->72',w2.round(4),e2.round(4),sd(mm(X)).round(4),X[:,0].std(ddof=1).round(3))
