"""Run pyDecision's edas_method (source file passed as argv[1]) on the EDAS fixtures; documents divergence only."""
import sys, types, importlib.util
import numpy as np
sys.modules.setdefault('matplotlib', types.ModuleType('matplotlib'))
sys.modules.setdefault('matplotlib.pyplot', types.ModuleType('matplotlib.pyplot'))
sys.modules['matplotlib'].pyplot = sys.modules['matplotlib.pyplot']
spec = importlib.util.spec_from_file_location('pyd_edas', sys.argv[1]); pyd = importlib.util.module_from_spec(spec); spec.loader.exec_module(pyd)
spec = importlib.util.spec_from_file_location('ours', sys.argv[2]); E = importlib.util.module_from_spec(spec); spec.loader.exec_module(E)
t = lambda s: ['max' if c == 'b' else 'min' for c in s]
cases = [('F1', E.T1, [1/3]*3, 'bbb')] + [(f'F1b set{k+1}', E.T5, w, 'bbbcccc') for k, w in enumerate(E.T6)] + \
        [('F2 bbcbbcbb', E.F2_X, E.F2_W, 'bbcbbcbb'), ('F3', E.F3_X, E.F3_W, 'bbb')]
for name, X, w, ty in cases:
    a = pyd.edas_method(np.array(X, float), t(ty), np.array(w), graph=False, verbose=False)
    b = E.edas(X, w, ty)['AS']
    print(f'{name:14s} max|pyDecision - ours| = {np.abs(a - b).max():.2e}')
with np.errstate(all='ignore'):
    print('all-equal rows ->', pyd.edas_method(np.array([[1., 1.], [1., 1.]]), ['max', 'max'], np.array([.5, .5]), graph=False, verbose=False))
print("type 'benefit' (not 'max') silently treated as cost:", pyd.edas_method(np.array([[1., 2.], [3., 1.], [2., 2.]]), ['benefit', 'max'], np.array([.5, .5]), graph=False, verbose=False).round(4),
      'vs', E.edas([[1, 2], [3, 1], [2, 2]], [.5, .5], 'bb')['AS'].round(4))
