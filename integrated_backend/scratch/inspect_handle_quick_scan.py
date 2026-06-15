with open(r"c:/Users/skdha/Downloads/ASM-staging/ASM-staging/frontend/src/components/Dashboard/Overview.jsx", 'r', encoding='utf-8', errors='ignore') as f:
    lines = f.readlines()
    for idx, line in enumerate(lines):
        if "handleQuickScan" in line or "QuickScan" in line:
            print(f"Line {idx+1}: {line.rstrip()}")
