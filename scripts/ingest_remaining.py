import sys
import os
import requests
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

pending = [
    'ADUROBIOTECH,INC_06_02_2020-EX-10.7-CONSULTING AGREEMENT(1).PDF',
    'EMERALDHEALTHTHERAPEUTICSINC_06_10_2020-EX-4.5-CONSULTING AGREEMENT - DR. GAETANO MORELLO N.D. INC..PDF',
    'BABCOCK_WILCOXENTERPRISES,INC_08_04_2015-EX-10.17-INTELLECTUAL PROPERTY AGREEMENT between THE BABCOCK _ WILCOX COMPANY and BABCOCK _ WILCOX ENTERPRISES, INC..PDF',
    'ASHWORTHINC_01_29_1999-EX-10.(D)-PROMOTION AGREEMENT AND NANTZ COMMUNICATIONS, INC..PDF',
    'GSITECHNOLOGYINC_11_16_2009-EX-10.2-INTELLECTUAL PROPERTY AGREEMENT between SONY ELECTRONICS INC. and GSI TECHNOLOGY, INC..PDF',
    'UNITEDNATIONALBANCORP_03_03_1999-EX-99-Outsourcing Agreement with the BISYS Group, Inc..PDF'
]

cuad_root = Path("D:/CUAD_v1/full_contract_pdf")

for idx, fname in enumerate(pending, start=1):
    matches = [fp for fp in cuad_root.rglob("*.pdf") if fp.name.lower() == fname.lower()]
    if not matches:
        matches = [fp for fp in cuad_root.rglob("*.PDF") if fp.name.lower() == fname.lower()]
    if not matches:
        print(f"[{idx}/{len(pending)}] NOT FOUND: {fname}")
        continue
    fp = matches[0]
    size = os.path.getsize(fp)
    print(f"[{idx}/{len(pending)}] Ingesting: {fname} ({size} bytes)...")
    try:
        with open(fp, "rb") as f:
            res = requests.post(
                "http://127.0.0.1:5000/api/v1/sync/file-watcher",
                files={"file": (fname, f, "application/pdf")},
                data={
                    "department": "legal",
                    "file_name": fname,
                    "event_type": "created"
                },
                headers={"Authorization": "Bearer dev-agent-key"},
                timeout=300
            )
        data = res.json()
        print(f"[{idx}/{len(pending)}] Status {res.status_code}: success={data.get('success')}, status={data.get('status')}, chunks={data.get('data', {}).get('chunks_extracted')}")
    except Exception as e:
        print(f"[{idx}/{len(pending)}] ERROR: {fname}: {e}")

print("Completed processing remaining files.")
