import os
import re

src_dir = r'c:\p\TheSeeks-Students\src\screens'

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content

    # Fix color="#ffffff"Secondary} -> color={theme.textSecondary}
    content = content.replace('color="#ffffff"Secondary}', 'color={theme.textSecondary}')
    # Fix color="#ffffff"Tertiary} -> color={theme.textTertiary}
    content = content.replace('color="#ffffff"Tertiary}', 'color={theme.textTertiary}')

    # Also check if there are other similar broken cases like color="#ffffff"Placeholder}
    content = content.replace('color="#ffffff"Placeholder}', 'color={theme.placeholder}')
    
    # Or color="#ffffff"Secondary />
    content = content.replace('color="#ffffff"Secondary', 'color={theme.textSecondary}')
    content = content.replace('color="#ffffff"Tertiary', 'color={theme.textTertiary}')

    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f'Fixed {filepath}')

for root, _, files in os.walk(src_dir):
    for file in files:
        if file.endswith('.tsx') or file.endswith('.ts'):
            process_file(os.path.join(root, file))
