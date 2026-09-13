# build_partners.mjs가 만든 _party_tmp.csv(UTF-8)를 레포 루트 GBL_PARTY_NOTES.csv(cp949, 엑셀 기본)로.
# 기존 GBL_PARTY_NOTES.csv에 사람이 쓴 party_note가 있으면 (league,id) 기준으로 보존. 실행: py scripts/gbl/write_party_csv.py
import csv, io, os
root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..')
src = os.path.join(root, '_party_tmp.csv'); dst = os.path.join(root, 'GBL_PARTY_NOTES.csv')

def read_any(path):
    b = open(path, 'rb').read()
    for enc in ('utf-8-sig', 'utf-16', 'cp949'):
        try: return b.decode(enc)
        except Exception: pass
    return b.decode('utf-8', 'replace')

keep = {}
if os.path.exists(dst):
    for r in csv.DictReader(io.StringIO(read_any(dst))):
        if (r.get('party_note') or '').strip(): keep[(r['league'], r['id'])] = r['party_note'].strip()
rows = list(csv.DictReader(io.StringIO(read_any(src))))
for r in rows:
    r['party_note'] = keep.get((r['league'], r['id']), '')
with open(dst, 'w', encoding='cp949', newline='', errors='replace') as f:
    w = csv.DictWriter(f, fieldnames=list(rows[0].keys())); w.writeheader(); w.writerows(rows)
os.remove(src)
print(f'GBL_PARTY_NOTES.csv: {len(rows)}행 (기존 party_note {len(keep)}건 보존)')
