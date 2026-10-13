import sys
p=sys.argv[1]; s=open(p,encoding='utf-8').read()
R=[
('Podvezko (2011, p. 135): with SAW and TOPSIS among the methods "most commonly used in Lithuania".',
 'Podvezko (2011, p. 135), after listing SR, GM, SAW, TOPSIS, VIKOR, COPRAS and PROMETHEE as used in Lithuania: "the most commonly used methods are SAW, COPRAS and TOPSIS".'),
('Podvezko 2011, p. 137: "the influence of maximizing and minimizing criteria on the evaluation result is considered separately")',
 'Podvezko 2011, p. 138: "the influence of maximizing and minimizing criteria on the evaluation result is considered separately")'),
('*(Podvezko 2011, p. 139–140 and Tables 7–8: one cost value changed, ranks 1-3-2 became 3-2-1)*',
 '*(Podvezko 2011, p. 139–140 and Tables 7–8: two values of the cost criterion R4 changed, A1 105 → 110 and A2 215 → 200, and the ranks 1-3-2 became 3-2-1)*'),
('- **EN:** With no cost criteria COPRAS gives exactly the same result as SAW with the "Sum" option. *(Podvezko 2011, p. 137: "If only maximizing criteria are used, Z_j = S_+j = S_j")*\n  **TR:** Hiç maliyet kriteri yoksa COPRAS, SAW\'ın "Toplam" seçeneğiyle birebir aynı sonucu verir.',
 '- **EN:** With no cost criterion, or with only one, COPRAS gives exactly the same result as SAW with the "Sum" option; the two differ only when there are two or more cost criteria. *(no cost criteria: Podvezko 2011, p. 138: "If only maximizing criteria are used, Z_j = S_+j = S_j"; one cost criterion: algebra in Algorithm step 8, checked numerically, `scripts/copras_reconcile.py`)*\n  **TR:** Hiç maliyet kriteri yoksa ya da yalnız bir tane varsa COPRAS, SAW\'ın "Toplam" seçeneğiyle birebir aynı sonucu verir; ikisi yalnız iki ya da daha fazla maliyet kriteri olduğunda ayrışır.'),
('(Podvezko 2011 shows the ranking flipping on one small change;',
 '(Podvezko 2011 shows the ranking flipping when two cost values change slightly;'),
('7. **No cost criteria** (or $W_C = 0$): $Q_i = S_{+i}$ (Podvezko p. 137), which is SAW with sum normalization. This is also the limit of step 4 as $W_C \\to 0$.',
 '7. **No cost criteria** (or $W_C = 0$): $Q_i = S_{+i}$ (Podvezko p. 138), which is SAW with sum normalization. This is also the limit of step 4 as $W_C \\to 0$.\n8. **Exactly one cost criterion** $c$: $S_{-i} = w_c x_{ic}/\\sum_k x_{kc}$, so $\\frac{1/S_{-i}}{\\sum_k 1/S_{-k}} = \\frac{1/x_{ic}}{\\sum_k 1/x_{kc}}$ and $Q_i$ equals SAW `sum` with $1/x$ for the cost column (this project\'s `saw.ts`, lines 14–15 and 45–46). COPRAS and SAW `sum` differ only with **two or more** cost criteria, where COPRAS takes the reciprocal of the *sum* of the cost shares instead of summing reciprocals per criterion. Ours (`scripts/copras_reconcile.py`, 2000 random 4 × n cases): one cost criterion, max |Q − SAW| = 2.2e-16, 0 ranking differences; two cost criteria, max diff 0.168, ranking differs in 437/2000.'),
('- **Cost criteria inverted first** (1/x or min/x, then sum normalization): that is SAW `sum`, not COPRAS. Not offered.',
 '- **Cost criteria inverted first** (1/x or min/x, then sum normalization): that is SAW `sum`, not COPRAS. It coincides with COPRAS when there is at most one cost criterion (step 8) and differs from two cost criteria on. Not offered.'),
('- **Relation to SAW:** S₊ is SAW-`sum` restricted to the benefit criteria; with no cost criteria COPRAS = SAW `sum` (Podvezko p. 137–138; checked numerically).',
 '- **Relation to SAW:** S₊ is SAW-`sum` restricted to the benefit criteria; with no cost criteria COPRAS = SAW `sum` (Podvezko p. 138; checked numerically), and with exactly one cost criterion too (step 8, algebra + numeric check). The methods differ only with two or more cost criteria.'),
('but a near-zero cost cell gives a huge bonus: benefit 5 vs 9, cost 0.01 vs 4 and 5, equal weights → Q = 0.6065, 0.1969, 0.1966, the clearly weaker alternative wins.',
 'but a near-zero cost cell dominates the cost part: X = [[5, 0.01], [9, 4], [9, 5]], benefit/cost, w = (0.5, 0.5) → Q = 0.6065, 0.1969, 0.1966, A1 wins despite the lower benefit value (its cost is 400–500 times lower). The bonus is bounded: $Q_i \\le S_{+i} + W_C$ (here 0.1087 + 0.5 = 0.6087, reached as the cost cell → 0). This is not COPRAS-specific: with one cost criterion the result is identical to SAW `sum` (step 8), and SAW `linearMax` ranks A1 first too (0.7778, 0.5013, 0.5010).'),
('- **Instability (Podvezko 2011, Tables 7–8):** one cost value change flips 1-3-2 to 3-2-1 while TOPSIS keeps its order;',
 '- **Instability (Podvezko 2011, Tables 7–8):** changing two cost values (R4: A1 105 → 110, A2 215 → 200; p. 139) flips 1-3-2 to 3-2-1 while TOPSIS keeps its order (ours: Q 0.336088, 0.328361, 0.335551 → 0.331652, 0.333799, 0.334549; either change alone gives 2-3-1 or keeps 1-3-2);'),
('Ranks implied by the printed Q: 7, **5, 6**, 1, 4, 3, 2 (= ours). The rank row and the sentence are wrong, the Q values are right.',
 'Ranks implied by the printed Q: 7, **5, 6**, 1, 4, 3, 2 (= ours). The rank row and the sentence are wrong, the Q values are right. Likely cause: the COPRAS rank column is an exact copy of the TOPSIS rank column in the same table (7, 6, 5, 1, 4, 3, 2), and the sentence (p. 89, "At the end of the analysis of TOPSIS and COPRAS ... A4 > A7 > A6 > A5 > A3 > A2 > A1") states one order for both methods, which is the TOPSIS order.'),
('all-benefit equals `saw` with `normalization: \'sum\'` (scores identical),',
 'all-benefit and single-cost-criterion problems equal `saw` with `normalization: \'sum\'` (scores identical), a two-cost-criteria case where they differ,'),
]
for a,b in R:
    n=s.count(a); assert n==1,(n,a[:60]); s=s.replace(a,b)
s=s.rstrip('\n')+'''

## Verification log (reconciliation, 2026-10-13)
Primary sources re-opened: Podvezko 2011 PDF text layer (`sk2copras/podvezko.txt`), Özcan & Çelik 2021 (`copras-src/ijpme.txt`), project `saw.ts`. Recompute: `scripts/copras_reconcile.py` → `scripts/copras_reconcile.out`.
1. **Near-zero cost example overclaimed** ("huge bonus", "clearly weaker alternative wins"): skeptic right. A1's cost is 400–500× lower, so it is not clearly weaker; result identical to SAW `sum` (diff 0) and SAW `linearMax` also ranks A1 first; bonus bounded by $S_{+i} + W_C$ = 0.6087 (the skeptic's "0.1957" for $S_{+1}$ is a slip; $S_{+1}$ = 0.1087). Pitfall rewritten.
2. **COPRAS = SAW `sum` also with one cost criterion:** skeptic right (algebra + 2000 random cases, diff 2.2e-16; with two cost criteria rankings differ in 437/2000). Added Algorithm step 8; fixed the Variants line, Relation to SAW, the EN/TR site bullet and the tests list.
3. **"One cost value changed" (site source note, Pitfalls, Use-when):** skeptic right. Podvezko p. 139: "r41 =105 is replaced by r41 =110 and r42 =215 is substituted for r42 =200". Recompute VarI 1-3-2, VarII 3-2-1 confirmed. The user-facing sentence ("small changes in cost values") was already accurate and stays. Fixed in three places.
4. **p. 137 → p. 138** for "considered separately" and "If only maximizing criteria are used": skeptic right (footer "- 137 -" at text line 308, quotes at 328–332, "- 138 -" at 415). Fixed in the site bullets and Algorithm step 7. The origin-dating citation (p. 137, "In 1996 ... Zavadskas, Kaklauskas 1996") is before the 137 footer, so it stays p. 137.
5. **F6 misprint explanation:** skeptic right that it should be more precise. Table 11 TOPSIS rank column 7, 6, 5, 1, 4, 3, 2 equals the printed COPRAS ranks, and the sentence covers both methods. Added as the likely source; conclusion (printed Q correct, printed ranks wrong) unchanged.
6. **Duplicate of 3** (second skeptic): same resolution.
7. **Duplicate of 4** (second skeptic): same resolution.
8. **Popularity quote not verbatim:** skeptic right. Replaced with the verbatim words "the most commonly used methods are SAW, COPRAS and TOPSIS" (p. 135, text line 101).
'''
open(p,'w',encoding='utf-8').write(s+'\n')
print("ok")
