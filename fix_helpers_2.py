import os
import re

def fix_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Move getStyles to top, but as function getStyles(theme) so it's hoisted
    content = re.sub(r'const getStyles = \(theme: any, isDark\?: boolean\) => StyleSheet\.create', 
                     r'function getStyles(theme: any, isDark?: boolean) { return StyleSheet.create', content)
    content = re.sub(r'\}\);\s*$', r'});\n}\n', content)

    # For components returning JSX directly `=> (`
    helpers = ['StatCard', 'DropdownBtn', 'FilterChip', 'CategoryCard', 'EmptyState']
    for helper in helpers:
        pattern = re.compile(r'(const\s+' + helper + r'\s*=\s*\([^)]*\)\s*(?::\s*[^=]+)?\s*=>\s*)\(')
        
        def repl(m):
            return m.group(1) + '{\n  const { theme, isDark } = useTheme();\n  const styles = getStyles(theme, isDark);\n  return ('
        
        content = pattern.sub(repl, content)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
        
fix_file("src/screens/Academics/DocumentsScreen.tsx")
fix_file("src/screens/Academics/StudentLibraryScreen.tsx")
fix_file("src/screens/Lectures/LikedVideosScreen.tsx")
