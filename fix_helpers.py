import os
import re

files_with_helpers = [
    "src/screens/Academics/DocumentsScreen.tsx",
    "src/screens/Academics/StudentLibraryScreen.tsx",
    "src/screens/Lectures/LikedVideosScreen.tsx"
]

for filepath in files_with_helpers:
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        # Find all functional components like `const XXX = ({...}) => {`
        # and inject `const { theme, isDark } = useTheme(); const styles = getStyles(theme, isDark);`
        
        # In DocumentsScreen:
        # const StatCard = ...
        # const FilterDropdown = ...
        # const FilterChip = ...
        # In StudentLibraryScreen:
        # const FilterChip = ...
        # const CategoryCard = ...
        # In LikedVideosScreen:
        # const EmptyState = ...
        
        helpers = ['StatCard', 'FilterDropdown', 'FilterChip', 'CategoryCard', 'EmptyState']
        
        for helper in helpers:
            # Look for `const Helper = ({...}: any) => {`
            pattern = re.compile(r'(const\s+' + helper + r'\s*=\s*\([^)]*\)\s*(?::\s*[^=]+)?\s*=>\s*\{)')
            
            def repl(m):
                # Only inject if not already there
                return m.group(1) + '\n  const { theme, isDark } = useTheme();\n  const styles = getStyles(theme, isDark);'
            
            content = pattern.sub(repl, content)

        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
            
        print(f"Fixed helpers in: {filepath}")

    except Exception as e:
        print(f"Error processing {filepath}: {e}")
