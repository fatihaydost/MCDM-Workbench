import json,re,sys,numpy as np
t=open(sys.argv[1]).read();blk=re.search(r'```json\n(\{\s*"id": "edas-2015-table1".*?)\n```',t,re.S).group(1)
f=json.loads(blk);X=np.array(f['matrix'],float);w=np.array(f['weights'])
AV=X.mean(0);D=(X-AV)/AV;P=np.maximum(0,D);N=np.maximum(0,-D);SP=P@w;SN=N@w;AS=(SP/SP.max()+1-SN/SN.max())/2
print(json.dumps([round(float(x),6) for x in AS]));print('max |AS-round6|',np.abs(AS-np.round(AS,6)).max())
