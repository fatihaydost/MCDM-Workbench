# Independent skeptic #2 recomputation of EDAS (Keshavarz Ghorabaee et al. 2015)
import sys, re, json
import numpy as np
from decimal import Decimal, ROUND_HALF_UP

TXT = sys.argv[1]  # pdftotext -layout of the origin PDF (own download)

def edas(X, w, types):
    X = np.asarray(X, float); w = np.asarray(w, float)
    AV = X.mean(0)
    D = (X - AV) / AV
    ben = np.array([t == 'b' for t in types])
    PDA = np.where(ben, np.maximum(0, D), np.maximum(0, -D))
    NDA = np.where(ben, np.maximum(0, -D), np.maximum(0, D))
    SP = PDA @ w; SN = NDA @ w
    NSP = SP / SP.max(); NSN = 1 - SN / SN.max()
    AS = (NSP + NSN) / 2
    return dict(AV=AV, PDA=PDA, NDA=NDA, SP=SP, SN=SN, NSP=NSP, NSN=NSN, AS=AS)

def rank_desc(s):
    s = np.asarray(s); return [1 + int(np.sum(s > v + 1e-12)) for v in s]

lines = open(TXT, encoding='utf8').read().splitlines()
# Table 1
t1 = []
for L in lines:
    m = re.match(r'^S(\d+)\s+([\d.]+)\s+([\d.]+)\s+(\d+)\s*$', L)
    if m: t1.append([float(m.group(2)), float(m.group(3)), float(m.group(4))])
t1 = np.array(t1); assert t1.shape == (47, 3), t1.shape
# Table 2
t2 = []
for L in lines:
    m = re.match(r'^\s*(\d+)((\s+[\d.]+){11})\s*$', L)
    if m and 1 <= int(m.group(1)) <= 47 and len(t2) < 47 and int(m.group(1)) == len(t2) + 1:
        t2.append([float(x) for x in m.group(2).split()])
t2 = np.array(t2); assert t2.shape == (47, 11), t2.shape

r = edas(t1, [1/3]*3, 'bbb')
print('F1 AV', r['AV'])
# columns: PDA1-3 NDA1-3 SP NSP SN NSN AS ; paper SP/SN = unweighted sums
calc = np.column_stack([r['PDA'], r['NDA'], r['SP']*3, r['NSP'], r['SN']*3, r['NSN'], r['AS']])
diff = np.abs(calc - t2)
print('F1 Table2 max|diff| (raw)', diff.max(), 'cells>0.005:', int((diff > 0.005 + 1e-12).sum()), 'of', diff.size)
def hu(x, nd): return float(Decimal(repr(float(x))).quantize(Decimal(1).scaleb(-nd), rounding=ROUND_HALF_UP))
r2 = np.vectorize(lambda x: hu(x, 2))(calc)
r32 = np.vectorize(lambda x: hu(hu(x, 3), 2))(calc)
print('F1 single 2dp mismatches', int((np.abs(r2 - t2) > 1e-9).sum()), ' double 3->2 mismatches', int((np.abs(r32 - t2) > 1e-9).sum()))
bad = np.argwhere(np.abs(r32 - t2) > 1e-9)
for i, j in bad[:10]: print('   still off', i+1, j, calc[i, j], t2[i, j])
print('F1 AS 4dp', np.round(r['AS'], 4).tolist())
order = np.argsort(-r['AS'], kind='stable')
print('F1 class A', sorted((order[:10]+1).tolist()), 'class B', sorted((order[10:24]+1).tolist()))
print('   AS around cut 10/11:', r['AS'][order[9]], r['AS'][order[10]], ' 24/25:', r['AS'][order[23]], r['AS'][order[24]])
# dispersion share
sh = r['PDA'].sum(0) / r['PDA'].sum(); cv = t1.std(0) / t1.mean(0); cv1 = t1.std(0, ddof=1) / t1.mean(0)
print('F1 PDA share', sh, 'CV pop', cv, 'CV sample', cv1)
print('F1 SP1 weighted', r['SP'][0])

# Table 5/6/7
X5 = np.array([[23,264,2.37,0.05,167,8900,8.71],[20,220,2.2,0.04,171,9100,8.23],[17,231,1.98,0.15,192,10800,9.91],
 [12,210,1.73,0.2,195,12300,10.21],[15,243,2,0.14,187,12600,9.34],[14,222,1.89,0.13,180,13200,9.22],
 [21,262,2.43,0.06,160,10300,8.93],[20,256,2.6,0.07,163,11400,8.44],[19,266,2.1,0.06,157,11200,9.04],[8,218,1.94,0.11,190,13400,10.11]])
W6 = np.array([[0.250,0.214,0.179,0.143,0.107,0.071,0.036],[0.182,0.212,0.182,0.152,0.121,0.091,0.061],
 [0.139,0.167,0.194,0.167,0.139,0.111,0.083],[0.108,0.135,0.162,0.189,0.162,0.135,0.108],
 [0.083,0.111,0.139,0.167,0.194,0.167,0.139],[0.061,0.091,0.121,0.152,0.182,0.212,0.182],[0.036,0.071,0.107,0.143,0.179,0.214,0.250]])
R7 = [[1,4,6,10,7,8,2,3,5,9],[1,4,6,10,7,8,2,3,5,9],[1,3,7,10,6,8,2,4,5,9],[1,2,7,10,6,8,3,4,5,9],[1,2,6,10,7,8,3,4,5,9],[1,2,6,10,7,8,3,4,5,9],[1,2,6,10,7,8,3,4,5,9]]
print('W6 sums', W6.sum(1))
T = 'bbbcccc'
for k in range(7):
    a = edas(X5, W6[k], T)['AS']; b = edas(X5, W6[k]/W6[k].sum(), T)['AS']
    print('set', k+1, 'ranks', rank_desc(a) == R7[k], rank_desc(b) == R7[k], 'AS', np.round(b, 6).tolist(), 'mingap', np.min(np.diff(np.sort(b))))
# rank reversal: removal of one alternative
tot = 0
for k in range(7):
    w = W6[k]/W6[k].sum(); base = edas(X5, w, T)['AS']
    for rm in range(10):
        keep = [i for i in range(10) if i != rm]
        s = edas(X5[keep], w, T)['AS']
        for a_ in range(9):
            for b_ in range(a_+1, 9):
                ia, ib = keep[a_], keep[b_]
                if np.sign(base[ia]-base[ib]) != np.sign(s[a_]-s[b_]): tot += 1
print('rank reversal pairs (7 sets x 10 removals)', tot)
w2 = W6[1]/W6[1].sum(); keep=[0,1,2,4,5,6,7,8,9]
print('set2 base A2,A8', edas(X5,w2,T)['AS'][[1,7]], 'without A4', edas(X5[keep],w2,T)['AS'][[1,6]])
# shift C4 by +1 set 1
w1 = W6[0]/W6[0].sum(); Xs = X5.copy(); Xs[:,3] += 1
print('set1 ranks base', rank_desc(edas(X5,w1,T)['AS']), 'C4+1', rank_desc(edas(Xs,w1,T)['AS']))
# edge cases
print('neg AV column [-4,1,-3]', edas(np.array([[-4.],[1.],[-3.]]), [1], 'b'))
v = np.array([0.1,0.1,0.1]); print('const col float', (v - v.mean())/v.mean(), v.mean())
print('scale inv', np.abs(edas(X5,w1*7,T)['AS'] - edas(X5,w1,T)['AS']).max())
Xc = X5.copy(); Xc[:,5] *= 0.001; print('col scale inv', np.abs(edas(Xc,w1,T)['AS'] - edas(X5,w1,T)['AS']).max())

# ---- F2 Aydin Unal 2019 (Tablo 9 input, Tablo 7 weights, Tablo 10-12 output; typed from own pdftotext)
X2 = np.array([[932143175,570609202,0.7128,2.6919,0.6077,0.6285,0.1005,0.0898],
 [1377948801,1627541169,0.5183,2.0065,0.7102,0.7016,0.1293,0.0670],
 [449610569,680244795,0.3300,1.8694,0.5450,0.8286,0.0031,0.0019],
 [395098644,255665969,0.8922,2.8270,0.7184,0.8962,0.0736,0.0534],
 [245424866,185771819,0.3693,2.5091,0.4149,0.7850,0.0204,0.0089],
 [151287176,819078906,0.1864,0.0005,0.9745,0.6673,0.5916,0.0904],
 [140454210,240289953,0.4992,2.7956,0.9603,0.2260,0.3740,0.1366]])
w2_ = np.array([0.1595,0.1334,0.0662,0.0885,0.0199,0.0758,0.2969,0.1598])
P12 = np.array([[0.2145,0.1804,0.2671,0.6894,0.4782],[0.4813,0.0953,0.5994,0.8359,0.7176],[0.0559,0.4802,0.0696,0.1730,0.1213],
 [0.0553,0.3760,0.0688,0.3524,0.2106],[0.0551,0.5807,0.0686,0.0000,0.0343],[0.8031,0.2109,1.0000,0.6368,0.8184],[0.5152,0.2569,0.6416,0.5576,0.5996]])
P10 = np.array([[0.7674,0,0,0.2819,0.1373,0,0,0.4033],[1.6126,1.6016,0,0,0,0.0375,0,0.0472],[0,0.0873,0.3416,0,0.2263,0.2255,0,0],
 [0,0,0,0.3462,0,0.3254,0,0],[0,0,0.2631,0.1948,0.4109,0.1610,0,0],[0,0.3093,0.6281,0,0,0,2.2042,0.4119],[0,0,0.0039,0.3313,0,0,1.0254,1.1344]])
print('F2 wsum', w2_.sum())
for name, ty in [('labelled', 'bbcbbcbb'), ('swapped KK5/KK6', 'bbcbcbbb')]:
    r = edas(X2, w2_, ty)
    c = np.column_stack([r['SP'], r['SN'], r['NSP'], r['NSN'], r['AS']])
    print('F2', name, 'max|T12 diff|', np.abs(c - P12).max(), 'AS diff', np.abs(r['AS']-P12[:,4]).max(), 'PDA diff', np.abs(r['PDA']-P10).max(), 'ranks', rank_desc(r['AS']))
    print('   AV', r['AV'].tolist()); print('   AS', np.round(r['AS'],6).tolist(), 'SP', np.round(r['SP'],6).tolist(), 'SN', np.round(r['SN'],6).tolist())
# ---- F3 Sarihan & Aydin 2023
X3 = np.array([[38848825,677113055,2395334],[28879989,1335400806,205743112],[412260387,3033464,6512010],[152738514,8607944,300032],
 [194413476,151880,4558944],[66779465,1509179,139887],[520533558,86015541,262295624],[96517647,19426417,17893118],
 [113654549,4205094,234729690],[845241538,25939867,23727158],[224858429,5013633825,52057346],[302415677,1844880,9656996],
 [678417175,6821703723,607132629],[340316558,294068655,49850522]], float)
w3 = np.array([0.124,0.521,0.355])
r = edas(X3, w3, 'bbb'); print('F3 AV', r['AV'].tolist(), 'AS', np.round(r['AS'],6).tolist(), 'ranks', rank_desc(r['AS']))
AVw = np.array([301484097,1348516970,131217376.])
D = (X3-AVw)/AVw; PDA=np.maximum(0,D); NDA=np.maximum(0,-D); SP=PDA@w3; SN=NDA@w3; ASw=(SP/SP.max()+1-SN/SN.max())/2
print('F3 with printed AV: AS', np.round(ASw,3).tolist(), 'ranks', rank_desc(ASw))
# entropy check
p = X3/X3.sum(0); e = -(p*np.log(p)).sum(0)/np.log(14); print('F3 entropy e', e, 'w', (1-e)/(1-e).sum())
r = edas(t1, [1/3]*3, 'bbb'); print('F1 max |AS-round4|', np.abs(r['AS']-np.round(r['AS'],4)).max())
r = edas(X3, w3, 'bbb'); print('F3 C vs L AS gap (correct AV)', r['AS'][11]-r['AS'][2])
