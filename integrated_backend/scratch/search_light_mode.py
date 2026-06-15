import os
import re

search_dir = r"c:/Users/skdha/Downloads/ASM-staging/ASM-staging/frontend/src"
patterns = [
    r"light-mode",
    r"light",
    r"dark-mode",
    r"dark"
]

for root, dirs, files in os.walk(search_dir):
    for file in files:
        if file.endswith('.css'):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
                for pat in patterns:
                    matches = list(re.finditer(pat, content))
                    if matches:
                        print(f"Found '{pat}' in {file} (count: {len(matches)})")
