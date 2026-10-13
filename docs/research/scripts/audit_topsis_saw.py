import json,numpy as np,sys
R=sys.argv[1]
def topsis(X,t,w):
    X=np.array(X,float);w=np.array(w,float)
    r=X/np.sqrt((X**2).sum(0));v=r*w
    cost=np.array([x=='cost' for x in t])
    best=np.where(cost,v.min(0),v.max(0));worst=np.where(cost,v.max(0),v.min(0))
    dp=np.sqrt(((v-best)**2).sum(1));dm=np.sqrt(((v-worst)**2).sum(1))
    return dp,dm,dm/(dp+dm)
for f in ['opricovic-tzeng-2004-f','opricovic-tzeng-2004-phi']:
    fx=json.load(open(f'{R}/tests/fixtures/{f}.json'))
    dp,dm,c=topsis(fx['matrix'],fx['types'],fx['weights'])
    e=fx['expected']
    print(f,np.round(c,4),'maxdiff C',np.abs(c-e['closeness']).max(),'D+',np.abs(dp-e['d_plus']).max(),'D-',np.abs(dm-e['d_minus']).max())
fx=json.load(open(f'{R}/tests/fixtures/saw-podvezko2011.json'))
X=np.array(fx['matrix'],float);w=np.array(fx['weights']);t=fx['types']
cost=np.array([x=='cost' for x in t])
r=np.where(cost,X.min(0)/X,X/X.max(0));S=r@w
print('SAW lm',np.round(S,6),'vs expected',fx['linearMax']['expected']['S'],'printed',fx['linearMax']['published_table3']['S'])
b=np.where(cost,1/X,X);r2=b/b.sum(0);S2=r2@w
print('SAW sum',np.round(S2,6),'vs',fx['sum']['published_table6']['S'],np.abs(S2-np.array(fx['sum']['published_table6']['S'])).max())
