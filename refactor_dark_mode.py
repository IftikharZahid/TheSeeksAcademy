import os
import re

directory = 'src/screens'

replacements = [
    (r"backgroundColor:\s*isDark\s*\?\s*'#1e293b'\s*:\s*'#fff'", "backgroundColor: theme.card"),
    (r"backgroundColor:\s*isDark\s*\?\s*'#1e293b'\s*:\s*'#ffffff'", "backgroundColor: theme.card"),
    (r"backgroundColor:\s*isDark\s*\?\s*'rgba\(30,\s*41,\s*59,\s*0\.9\)'\s*:\s*'#fff'", "backgroundColor: theme.card"),
    (r"backgroundColor:\s*isDark\s*\?\s*'rgba\(30,41,59,0\.9\)'\s*:\s*'#fff'", "backgroundColor: theme.card"),
    (r"backgroundColor:\s*isDark\s*\?\s*'rgba\(51,65,85,0\.4\)'\s*:\s*'#f1f5f9'", "backgroundColor: theme.backgroundSecondary"),
    (r"backgroundColor:\s*isDark\s*\?\s*'rgba\(255,255,255,0\.05\)'\s*:\s*'#f1f5f9'", "backgroundColor: theme.border"),
    (r"backgroundColor:\s*'#fff'", "backgroundColor: theme.card"),
    (r"backgroundColor:\s*'#ffffff'", "backgroundColor: theme.card"),
    (r"backgroundColor:\s*'#f1f5f9'", "backgroundColor: theme.backgroundSecondary"),
    (r"backgroundColor:\s*isDark\s*\?\s*'#334155'\s*:\s*'#f1f5f9'", "backgroundColor: theme.border"),
    (r"backgroundColor:\s*isDark\s*\?\s*'#1e293b'\s*:\s*'#f1f5f9'", "backgroundColor: theme.backgroundSecondary"),
    (r"backgroundColor:\s*isDark\s*\?\s*'#1e293b'\s*:\s*'#e2e8f0'", "backgroundColor: theme.border"),
    (r"backgroundColor:\s*isDark\s*\?\s*theme.card\s*:\s*'#ffffff'", "backgroundColor: theme.card"),
    (r"backgroundColor:\s*isDark\s*\?\s*theme.card\s*:\s*'#fff'", "backgroundColor: theme.card"),
    (r"borderColor:\s*isDark\s*\?\s*'#334155'\s*:\s*'#e2e8f0'", "borderColor: theme.border"),
    (r"borderColor:\s*'#e2e8f0'", "borderColor: theme.border"),
    (r"borderColor:\s*'#fff'", "borderColor: theme.card"),
    (r"borderColor:\s*'#ffffff'", "borderColor: theme.card"),
    (r"borderBottomColor:\s*'#f1f5f9'", "borderBottomColor: theme.border"),
    (r"borderBottomColor:\s*'#e2e8f0'", "borderBottomColor: theme.border"),
    (r"borderTopColor:\s*'#e2e8f0'", "borderTopColor: theme.border"),
    (r"borderRightColor:\s*'#e2e8f0'", "borderRightColor: theme.border"),
    (r"color:\s*isDark\s*\?\s*theme.textSecondary\s*:\s*'#e2e8f0'", "color: theme.textSecondary"),
    (r"color:\s*'#334155'", "color: theme.textSecondary"),
    (r"color:\s*'#e2e8f0'", "color: theme.textSecondary"),
    (r"color:\s*isDark\s*\?\s*theme.text\s*:\s*'#ffffff'", "color: theme.text"),
    (r"color:\s*isDark\s*\?\s*theme.text\s*:\s*'#fff'", "color: theme.text"),
    (r"color:\s*isDark\s*\?\s*'#fff'\s*:\s*'#1e293b'", "color: theme.text"),
    (r"tintColor:\s*isDark\s*\?\s*'#fff'\s*:\s*'#000'", "tintColor: theme.text"),
]

exclude_files = ['MessagesScreen.tsx'] # We might want to handle this separately if it has specific message bubbles logic

def process_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content
    
    for old, new in replacements:
        content = re.sub(old, new, content)
        
    # Inject `theme` if needed, though most screens already have it.
    
    if content != original_content:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated: {path}")

for root, _, files in os.walk(directory):
    for file in files:
        if file.endswith('.tsx') and file not in exclude_files:
            process_file(os.path.join(root, file))

print("Refactor complete.")
