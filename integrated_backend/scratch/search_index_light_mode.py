with open(r"c:/Users/skdha/Downloads/ASM-staging/ASM-staging/frontend/src/index.css", 'r', encoding='utf-8', errors='ignore') as f:
    lines = f.readlines()
    for idx, line in enumerate(lines):
        if "light-mode" in line:
            print(f"Line {idx+1}: {line.rstrip()}")
            # print surrounding 3 lines
            start = max(0, idx - 2)
            end = min(len(lines), idx + 3)
            for i in range(start, end):
                print(f"  {i+1}: {lines[i].rstrip()}")
            print("-" * 20)
