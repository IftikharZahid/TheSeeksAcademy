import os
import re

directory = 'src/screens'
hardcoded_color_regex = re.compile(r"'#fff'|'#ffffff'|'#000'|'#000000'|'white'|'black'|'#f1f5f9'|'#e2e8f0'", re.IGNORECASE)
exclude_strings = ["color: '#ffffff'", 'color="#ffffff"'] # These are often used for text on primary colored backgrounds which is OK

results = []

for root, _, files in os.walk(directory):
    for file in files:
        if file.endswith('.tsx'):
            path = os.path.join(root, file)
            try:
                with open(path, 'r', encoding='utf-8') as f:
                    lines = f.readlines()
                    matches = []
                    for i, line in enumerate(lines):
                        if hardcoded_color_regex.search(line):
                            # Exclude white text which is often valid on headers
                            if not ("color: '#ffffff'" in line or 'color="#ffffff"' in line or 'color: "#ffffff"' in line or "color: '#fff'" in line or 'color="#fff"' in line):
                                matches.append(f"  Line {i+1}: {line.strip()}")
                    
                    if matches:
                        results.append(f"{path}:\n" + "\n".join(matches))
            except Exception as e:
                print(f"Error reading {path}: {e}")

if results:
    print("\n\n".join(results))
else:
    print("No hardcoded colors found.")
