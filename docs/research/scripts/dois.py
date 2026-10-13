import json,urllib.request,urllib.parse
ds="""10.1016/S0305-0548(99)00069-6
10.1007/s11356-022-20219-9
10.14784/marufacd.879171
10.47138/jeaa.1187426
10.5937/tehnika1703422V
10.21303/2461-4262.2024.003171
10.15290/ose.2013.05.65.02
10.1037/h0037613
10.1287/opre.2.2.172
10.1016/j.energy.2020.117675
10.1016/j.susoc.2020.12.002
10.3390/sym13060973
10.3390/su9050702
10.1155/2020/3564835
10.1016/S0377-2217(03)00020-1
10.15388/Informatica.2015.57
10.5755/j01.ee.22.2.310
10.5755/j01.eee.122.6.1810
10.1016/j.eswa.2012.05.056
10.1016/0305-0548(94)00059-H
10.31181/dmame210402076i
10.3390/sym13040525
10.1007/978-3-642-48318-9
10.1002/j.1538-7305.1948.tb01338.x
10.1016/j.eswa.2019.06.035
10.3390/e26050365
10.1016/S0360-8352(00)00019-X
10.3390/sym12091549
10.1007/0-387-23081-5_4
10.1016/j.omega.2020.102261
10.1007/s40070-013-0004-7
10.1016/j.omega.2018.07.004""".split()
for d in ds:
    try:
        m=json.load(urllib.request.urlopen("https://api.crossref.org/works/"+urllib.parse.quote(d),timeout=30))["message"]
        a=", ".join(x.get("family","?") for x in m.get("author",[])[:5])
        print(d,"|",a,"|",m.get("issued",{}).get("date-parts",[[None]])[0][0],"|",(m.get("title") or [""])[0][:70],"|",(m.get("container-title") or [""])[0][:40],m.get("volume"),m.get("issue"),m.get("page"))
    except Exception as e: print(d,"ERR",e)
