import os
import re

files_to_fix = [
    r"c:\p\TheSeeks-Students\src\screens\CoreScreens\HomeScreen.tsx",
    r"c:\p\TheSeeks-Students\src\screens\Communication\MessagesScreen.tsx",
    r"c:\p\TheSeeks-Students\src\screens\Academics\StudentLibraryScreen.tsx",
    r"c:\p\TheSeeks-Students\src\screens\CoreScreens\ProfileScreen.tsx"
]

def fix_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find <ScreenContainer ... > and add useBottomInset={false}
    # We want to insert it before the closing >
    
    # We will do a generic replace for `<ScreenContainer` that doesn't already have `useBottomInset`
    def repl(m):
        if 'useBottomInset' in m.group(0):
            return m.group(0)
        return m.group(0) + ' useBottomInset={false}'

    # Match <ScreenContainer optionally followed by props
    content = re.sub(r'<ScreenContainer\b', repl, content)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
        
    print(f"Fixed {filepath}")

for path in files_to_fix:
    if os.path.exists(path):
        fix_file(path)
