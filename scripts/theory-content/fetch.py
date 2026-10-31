import json, os, sys, urllib.request, time
from oa import get, M
CACHE='works_cache.json'
cache=json.load(open(CACHE)) if os.path.exists(CACHE) else {}
def abstract(inv):
    if not inv: return None
    pos={}
    for word,idx in inv.items():
        for i in idx: pos[i]=word
    return " ".join(pos[i] for i in sorted(pos))
def work(wid):
    if wid in cache: return cache[wid]
    w=get(f"https://api.openalex.org/works/{wid}?{M}")
    if not w: return None
    loc=w.get('best_oa_location') or {}
    src=((w.get('primary_location') or {}).get('source') or {}).get('display_name')
    r={"openalex_id":wid,"doi":(w.get('doi') or '').replace('https://doi.org/','') or None,"title":w['display_name'],
       "year":w['publication_year'],"authors":[a['author']['display_name'] for a in w['authorships']],"type":w['type'],
       "venue":src,"cited_by":w['cited_by_count'],"oa_url":(loc.get('landing_page_url') if w.get('open_access',{}).get('is_oa') else None),
       "abstract":abstract(w.get('abstract_inverted_index'))}
    cache[wid]=r; json.dump(cache,open(CACHE,'w'))
    return r
if __name__=='__main__':
    for wid in sys.argv[1:]:
        r=work(wid); print('##',wid,r['year'],r['authors'][:3],r['title'][:90],'|',r['type'],r['venue'],'| cites',r['cited_by']); print('  ',(r['abstract'] or 'NO ABSTRACT')[:700]); print()
