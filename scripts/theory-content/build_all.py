import json, re
from fetch import work
from oa import recent
TODAY="2026-10-31"
def V(wid, note=None):
    r=work(wid); assert r, wid
    out={"authors":r['authors'][:6],"year":r['year'],"title":r['title'],"type":r['type'],"venue":r['venue'],
         "doi":r['doi'],"openalex_id":wid,"isbn":None,"verified":True,"verified_in":"openalex","oa_url":r['oa_url']}
    if note: out["note"]=note
    return out
def U(authors, year, title, venue, note):
    return {"authors":authors,"year":year,"title":title,"type":"book","venue":venue,"doi":None,"openalex_id":None,"isbn":None,
            "verified":False,"verified_in":None,"note":note}
CLASSIC="Classic book with no clean OpenAlex/Crossref record (searches return reviews or reprints). Check by ISBN before publishing; shown with a ? chip until then."
TERMS={'institutional-theory':'institutional theory','social-constructionism':'social construction','structuration-theory':'structuration','postcolonial-theory':'postcolonial','social-capital-theory':'social capital','practice-theory':'practice theory','diffusion-of-innovations':'diffusion of innovations','capability-approach':'capability approach','critical-realism':'critical realism','dependency-theory':'dependency theory'}
def card(slug,name,original,core,when,mistakes,dev,strands,strengths,critiques,must,anchor=None,notes=""):
    c={"theory_id":None,"library_name":name,"slug":slug,"status":"draft","original":original,
       "citation_anchor_openalex_id":anchor or original.get("openalex_id"),
       "core_idea":core,"key_concepts_note":"Use the concepts already stored for this theory in the library (theories.concepts).",
       "when_to_use":when,"common_mistakes":mistakes,
       "development":[{"kind":k,"work":w,"adds":a} for k,w,a in dev],
       "strands":[{"name":n,"summary":s,"defining_work":w} for n,s,w in strands],
       "strengths":[{"point":p,"source":w} for p,w in strengths],
       "critiques":[{"point":p,"source":w} for p,w in critiques],
       "must_read":[{"role":r,"work":w,"chapter":ch,"why_read":y,"reading_question":q} for r,w,ch,y,q in must],
       "recent_works":"auto: OpenAlex cites:<citation_anchor_openalex_id> + the student's topic terms, last 10 years, top 5 by citations (protocol §5). Preview below uses the theory name instead of a student topic.","recent_search_term":TERMS.get(slug, re.sub(r' \(.*\)', '', name).lower())}
    a=c["citation_anchor_openalex_id"]
    c["recent_works_preview"]={"fetched":TODAY,"items":[{k:x[k] for k in ("openalex_id","title","year","authors","cited_by","oa_url")} for x in (recent(a,term=TERMS.get(slug, re.sub(r' \(.*\)', '', name).lower())) if a else [])]}
    c["verification_log"]=[{"step":"machine","by":"Claude","date":TODAY,"notes":"Every work resolved in OpenAlex by exact title + author (books: book-type records only); bibliographic fields copied from the OpenAlex record. Items marked verified:false are shown with a ? chip. "+notes},
                           {"step":"human","by":"Bermet","date":None,"notes":"Pending review."}]
    json.dump(c,open(f"out/{slug}.json","w"),indent=2,ensure_ascii=False)
    print(slug,"ok")
