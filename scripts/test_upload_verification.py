import os
import requests
import json
import time

API_URL = "http://localhost:5000/api/v1/sync/upload"
FILE_PATH = "DockerUploadVerification.pdf"

print(f"[1] Uploading {FILE_PATH} via {API_URL}...")
with open(FILE_PATH, "rb") as f:
    files = {"file": (os.path.basename(FILE_PATH), f, "application/pdf")}
    data = {"department": "legal"}
    headers = {
        "X-User-Name": "Nam - Chuyen vien",
        "X-User-Email": "nam@graphmind.internal"
    }
    resp = requests.post(API_URL, files=files, data=data, headers=headers)

print(f"Status Code: {resp.status_code}")
data = resp.json()
print("Success:", data.get("success"))
print("File Name:", data.get("file_name"))
print("Department:", data.get("department"))
print("Storage Method:", data.get("storage_method"))
print("Target Path:", data.get("target_path"))


print("\nWaiting 2 seconds for Watcher & Ingestion to complete...")
time.sleep(2)
