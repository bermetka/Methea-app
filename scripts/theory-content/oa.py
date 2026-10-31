import urllib.error, json, sys, time, urllib.parse, urllib.request, re, unicodedata
import os
M="mailto=bermet.ak@gmail.com&api_key="+os.environ.get("OPENALEX_API_KEY","")
def get(url):
    time.sleep(0.6)
    for i in range(6):
        try:
            with urllib.request.urlopen(url, timeout=30) as r: return json.load(r)
        except urllib.error.HTTPError as e:
            if e.code==429: time.sleep(5*(i+1)); continue
            return None
        except Exception:
            time.sleep(2)
    return None
def norm(s): return re.sub(r'[^a-z0-9 ]','',unicodedata.normalize('NFKD',s.lower()).encode('ascii','ignore').decode())
SEL="id,doi,display_name,publication_year,cited_by_count,authorships,type,best_oa_location,referenced_works,is_retracted,primary_location"
BOOKS={'book','book-chapter','monograph','edited-book','reference-entry'}
def find(title, author, year, slack=3, book=False):
    q=urllib.parse.quote(title)
    lo,hi=year-slack,year+slack
    url=f"https://api.openalex.org/works?filter=title.search:{q},publication_year:{lo}-{hi}&per_page=10&sort=cited_by_count:desc&select={SEL}&{M}"
    d=get(url) or {}
    res=d.get('results',[])
    al=norm(author)
    tn=norm(title)
    best=None
    for w in res:
        names=" ".join(norm(a['author']['display_name']) for a in w.get('authorships',[]))
        tt=norm(w['display_name'] or '')
        if al and al not in names: continue
        if not (tt==tn or tt.startswith(tn+' ')): continue
        if book and w.get('type') not in BOOKS: continue
        if not book and w.get('type') in ('review','paratext','erratum','letter'): continue
        best=w;break
    return best
def slim(w):
    if not w: return None
    loc=(w.get('best_oa_location') or {})
    src=((w.get('primary_location') or {}).get('source') or {}).get('display_name')
    return {"openalex_id":w['id'].rsplit('/',1)[-1],"doi":(w.get('doi') or '').replace('https://doi.org/','') or None,
      "title":w['display_name'],"year":w['publication_year'],"authors":[a['author']['display_name'] for a in w['authorships']][:6],
      "cited_by":w['cited_by_count'],"type":w['type'],"venue":src,"oa_url":loc.get('landing_page_url') if loc.get('is_oa') else None}
def recent(wid, years=10, n=5, term=None):
    t=f',title_and_abstract.search:{urllib.parse.quote(term)}' if term else ''
    url=f"https://api.openalex.org/works?filter=cites:{wid},from_publication_date:{2026-years}-01-01,is_retracted:false{t}&sort=cited_by_count:desc&per_page={n}&select={SEL}&{M}"
    return [slim(w) for w in (get(url) or {}).get('results',[])]
