import os
import re

src_dir = r'c:\p\TheSeeks-Students\src\screens'

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content

    # Replace Header Background Colors
    # Usually looks like: backgroundColor: isDark ? theme.card : '#fff'
    # Or: backgroundColor: theme.card
    # Or: backgroundColor: theme.background
    # We want to find patterns where it's part of styles.header or similar View
    
    # 1. Any <View style={[styles.header, { backgroundColor: ... }]}
    content = re.sub(
        r'(<View[^>]*styles\.header[^>]*backgroundColor:\s*)(?:isDark\s*\?\s*[^:]+\s*:\s*[^,}]+|theme\.[a-zA-Z]+|[\'"]#[a-fA-F0-9]+[\'"])',
        r'\1theme.primary',
        content
    )
    
    # 2. Text colors in headers to #ffffff
    # Let's target text that has styles.headerTitle or headerSub
    content = re.sub(
        r'(<Text[^>]*styles\.headerTitle[^>]*color:\s*)(?:isDark\s*\?\s*[^:]+\s*:\s*[^,}]+|theme\.text|theme\.[a-zA-Z]+|[\'"]#[a-fA-F0-9]+[\'"])',
        r'\1\'#ffffff\'',
        content
    )
    content = re.sub(
        r'(<Text[^>]*styles\.headerSub[^>]*color:\s*)(?:isDark\s*\?\s*[^:]+\s*:\s*[^,}]+|theme\.placeholder|theme\.[a-zA-Z]+|[\'"]#[a-fA-F0-9]+[\'"])',
        r'\1\'rgba(255,255,255,0.7)\'',
        content
    )
    
    # 3. Ionicons in headers
    # <Ionicons name="arrow-back" ... color={theme.text} /> -> color="#ffffff"
    content = re.sub(
        r'(<Ionicons[^>]*color=)\{?(?:theme\.text|isDark\s*\?\s*[^:]+\s*:\s*[^}]+)\}?',
        r'\1"#ffffff"',
        content
    )

    # Specific fix for StudentLibraryScreen.tsx
    if 'StudentLibraryScreen.tsx' in filepath:
        content = re.sub(r'color:\s*theme\.text(\s*\}\])\s*>\s*e-Library', r'color: \'#ffffff\'\1>e-Library', content)
        content = re.sub(r'color:\s*theme\.placeholder(\s*\}\])\s*>\s*Educational', r'color: \'rgba(255,255,255,0.7)\'\1>Educational', content)
        
    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f'Updated {filepath}')

for root, _, files in os.walk(src_dir):
    for file in files:
        if file.endswith('.tsx') or file.endswith('.ts'):
            process_file(os.path.join(root, file))

