import sys, base64
b64_file = sys.argv[1]
out_file = sys.argv[2]
data = base64.b64decode(open(b64_file, "rb").read().strip())
open(out_file, "wb").write(data)
print("Decoded", len(data), "bytes to", out_file)
