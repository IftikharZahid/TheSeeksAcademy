import os
import re

src_dir = r'c:\p\TheSeeks-Students\src'

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content

    # Replace dynamic barStyle
    content = re.sub(
        r'barStyle=\{isDark \? [\'"]light-content[\'"] : [\'"]dark-content[\'"]\}',
        r'barStyle="light-content"',
        content
    )
    content = re.sub(
        r'barStyle=\{state\.mode === [\'"]dark[\'"] \? [\'"]light-content[\'"] : [\'"]dark-content[\'"]\}',
        r'barStyle="light-content"',
        content
    )
    content = re.sub(
        r'StatusBar\.setBarStyle\(.*? \? \'light-content\' : \'dark-content\'\);',
        r'StatusBar.setBarStyle(\'light-content\');',
        content
    )

    # Replace AppNavigator status bar
    if 'AppNavigator.tsx' in filepath:
        content = re.sub(
            r'backgroundColor=\{theme\.background\}',
            r'backgroundColor={theme.primary}',
            content
        )

    # For ProfileScreen.tsx
    if 'ProfileScreen.tsx' in filepath:
        content = re.sub(
            r'backgroundColor=\{isDark \? theme\.card : theme\.primary\}',
            r'backgroundColor={theme.primary}',
            content
        )

    # For LikedVideosScreen.tsx
    if 'LikedVideosScreen.tsx' in filepath:
        content = re.sub(
            r'backgroundColor=\{theme\.card\}',
            r'backgroundColor={theme.primary}',
            content
        )

    # For StudentLibraryScreen.tsx
    if 'StudentLibraryScreen.tsx' in filepath:
        content = re.sub(
            r'backgroundColor:\s*theme\.card,\s*borderBottomColor:\s*theme\.border',
            r'backgroundColor: theme.primary, borderBottomColor: theme.primary',
            content
        )
        content = re.sub(
            r'color:\s*theme\.text(\s*\}\])\s*>\s*e-Library',
            r'color: \'#ffffff\'\1>e-Library',
            content
        )
        content = re.sub(
            r'color:\s*theme\.text(\s*\}\])\s*/>',
            r'color: \'#ffffff\'\1/>',
            content
        )
        content = re.sub(
            r'color=\{theme\.text\}',
            r'color="#ffffff"',
            content
        )
        content = re.sub(
            r'color=\{theme\.placeholder\}',
            r'color="rgba(255,255,255,0.7)"',
            content
        )

    # Search for any custom headers and make sure they use theme.primary
    # Some screens use custom headers like FeeDetailScreen, MessagesScreen, etc.
    # We will search and replace dynamically or manually later.

    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f'Updated {filepath}')

for root, _, files in os.walk(src_dir):
    for file in files:
        if file.endswith('.tsx') or file.endswith('.ts'):
            process_file(os.path.join(root, file))
