import numpy as np
def spearmanr(a,b):
    a=np.array(a,float);b=np.array(b,float);return (np.corrcoef(a,b)[0,1],)
def mm(X,t):
    X=np.array(X,float); r=np.zeros_like(X)
    for j in range(X.shape[1]):
        lo,hi=X[:,j].min(),X[:,j].max(); rg=hi-lo
        if rg==0: continue
        r[:,j]=(X[:,j]-lo)/rg if t[j]=='b' else (hi-X[:,j])/rg
    return r
def sd(X,t):
    r=mm(X,t); s=r.std(0,ddof=1); return s/s.sum()
def ent(X,t):
    X=np.array(X,float).copy()
    # Mukhametzyanov entropy uses sum normalization; cost? use 1/x? Just report SD
    return None
t='bcbbc'
DM1=[[71,4500,150,1056,478],[85,5800,145,2680,564],[76,5600,135,1230,620],[74,4200,160,1480,448],[82,6200,183,1350,615],[81,6000,178,2065,580],[80,5900,160,1650,610],[85,6500,140,1650,667]]
DM2=[[83,5322,170,1682,500],[84,6021,155,2140,513],[76,4219,155,1613,454],[73,6154,157,2047,582],[78,5453,173,2136,598],[82,6030,174,1238,587],[80,4344,172,1365,507],[77,6114,158,1585,592]]
DM3=[DM2[0]]+DM1[1:]
w1,w3=sd(DM1,t),sd(DM3,t); print('SD DM1',w1.round(4),'DM3',w3.round(4),'|d|',abs(w1-w3).round(3))
# printed Table 2 values
sdp={'1':[0.210,0.203,0.207,0.183,0.196],'2':[0.175,0.206,0.231,0.195,0.192],'3':[0.216,0.181,0.220,0.189,0.193],'12':[0.208,0.225,0.192,0.176,0.199]}
print('printed SD |d1-3|',abs(np.subtract(sdp['1'],sdp['3'])).round(3))
# Diakoulaki
X=[[61.0,1.08,4.33],[20.7,0.26,4.34],[16.3,1.98,2.53],[9.0,3.29,1.65],[5.4,2.77,2.33],[4.0,4.12,1.21],[-6.1,3.52,2.10],[-34.6,3.31,0.98]]
r=mm(X,'bbb'); w=sd(X,'bbb'); D=r@w
rank=(-D).argsort().argsort()+1; print('SD ranks',rank)
order=(-D).argsort()+1; print('SD order by position',order)
s=r.std(0,ddof=1); C=np.corrcoef(r.T); c=s*(1-C).sum(0); wc=c/c.sum(); Dc=r@wc
print('CRITIC w',wc.round(4),'ranks',(-Dc).argsort().argsort()+1,'order',(-Dc).argsort()+1)
pca=[1,7,6,4,5,2,3,8]
for nm,v in [('CRITIC true',(-Dc).argsort().argsort()+1),('SD true',rank),('CRITIC printed',[1,6,7,4,5,3,2,8]),('SD printed',[1,2,7,5,6,3,4,8]),('MW',[1,2,7,6,5,4,3,8])]:
    print(nm,'rho vs PCA',round(spearmanr(v,pca)[0],4))
print('11/21',11/21)
# outlier sigma
for m in [4,5,8,10,12,20]:
    a=np.zeros(m);a[-1]=1;b=np.linspace(0,1,m);print(m,round(a.std(ddof=1),3),round(b.std(ddof=1),3))
# near-constant
X2=np.array(DM1,float); X2[:,2]=150+np.arange(8)*1e-9; print('nearconst',sd(X2,t).round(4))
X3=np.array(DM1,float); X3[1,0]=72; print('a12 85->72 SD w',sd(X3,t).round(4), 'raw std C1',np.array(DM1)[:,0].std(ddof=1).round(3),X3[:,0].std(ddof=1).round(3))
W=np.array([sdp[k] for k in ['1','2','3','12']]); print('SD max rel var %',((W.max(0)-W.min(0))/W.min(0)*100).round(1))
E=np.array([[0.146,0.228,0.211,0.223,0.191],[0.107,0.287,0.240,0.134,0.232],[0.144,0.216,0.200,0.249,0.191],[0.159,0.280,0.165,0.220,0.176]]); print('Ent max rel var %',((E.max(0)-E.min(0))/E.min(0)*100).round(1))
print('rel change DM1->DM3 SD',(abs(np.subtract(sdp['3'],sdp['1']))/sdp['1']*100).round(1),'Ent',(abs(E[2]-E[0])/E[0]*100).round(1))
for i in range(8):
    X4=np.array(DM1,float); X4[i,0]=72; print('row',i+1,'C1->72 SD w1',sd(X4,t)[0].round(4),'std',X4[:,0].std(ddof=1).round(3))
