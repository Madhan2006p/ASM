import os

files = [
    r"c:/Users/skdha/Downloads/ASM-staging/ASM-staging/frontend/src/components/Dashboard/Overview.jsx",
    r"c:/Users/skdha/Downloads/ASM-staging/ASM-staging/frontend/src/components/ImpersonatingAccount/ImpersonatingAccount.jsx"
]

for file_path in files:
    print(f"\n--- {os.path.basename(file_path)} ---")
    if os.path.exists(file_path):
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            lines = f.readlines()
            for idx, line in enumerate(lines):
                if "Quick Scan" in line or "quick_scan" in line:
                    start = max(0, idx - 5)
                    end = min(len(lines), idx + 6)
                    print(f"Line {idx+1}:")
                    for i in range(start, end):
                        marker = "-> " if i == idx else "   "
                        print(f"{marker}{i+1}: {lines[i].rstrip()}")
    else:
        print("File not found")
