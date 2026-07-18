import os
import re

src_dir = r'c:\p\TheSeeks-Students\src'

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content

    # Fix \'light-content\' -> 'light-content'
    content = content.replace(r"\'light-content\'", "'light-content'")
    content = content.replace(r"\'#ffffff\'", "'#ffffff'")
    content = content.replace(r"\'rgba(255,255,255,0.7)\'", "'rgba(255,255,255,0.7)'")
    
    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f'Fixed {filepath}')

for root, _, files in os.walk(src_dir):
    for file in files:
        if file.endswith('.tsx') or file.endswith('.ts'):
            process_file(os.path.join(root, file))
