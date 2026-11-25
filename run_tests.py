import sys
import subprocess
import os

target = os.path.join(os.path.dirname(__file__), "tests", "visual", "run_all_deep_tests.py")
subprocess.call([sys.executable, target])

