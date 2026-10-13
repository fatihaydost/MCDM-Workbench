import numpy as np
X=np.array([[6,2.0],[7,2.75],[10,3.5]]);cost=[True,False]
def C(w):
    R=X/np.sqrt((X**2).sum(0));V=R*w
    b=np.where(cost,V.min(0),V.max(0));wo=np.where(cost,V.max(0),V.min(0))
    dp=np.sqrt(((V-b)**2).sum(1));dm=np.sqrt(((V-wo)**2).sum(1));return dm/(dp+dm)
xs=np.linspace(0,1,100001);first=[np.argmax(C(np.array([x,1-x]))) for x in xs]
seg=[x for x,f in zip(xs,first) if f==1];print(min(seg),max(seg))
print(C(np.array([.5,.5])))
