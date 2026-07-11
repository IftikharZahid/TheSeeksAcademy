import os
import re

files_to_fix = [
    "src/screens/Academics/DocumentsScreen.tsx",
    "src/screens/Academics/ResultsScreen.tsx",
    "src/screens/Academics/StudentLibraryScreen.tsx",
    "src/screens/Academics/TimetableScreen.tsx",
    "src/screens/CoreScreens/HomeScreen.tsx",
    "src/screens/CoreScreens/ProfileScreen.tsx",
    "src/screens/Finance/FeeDetailScreen.tsx",
    "src/screens/Lectures/LikedVideosScreen.tsx",
    "src/screens/Teachers/TeacherDetailsScreen.tsx",
    "src/screens/Teachers/TeachersListScreen.tsx",
]

for filepath in files_to_fix:
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        if 'const getStyles = ' in content:
            continue
            
        # 1. Replace StyleSheet.create
        content = re.sub(
            r'const styles = StyleSheet\.create\(\{', 
            r'const getStyles = (theme: any, isDark?: boolean) => StyleSheet.create({', 
            content
        )

        # 2. Inject `const styles = getStyles(theme, isDark);`
        # Find where `useTheme()` is called
        match = re.search(r'const\s+\{\s*theme([^}]*)\}\s*=\s*useTheme\(\);', content)
        if match:
            # Check if isDark is extracted
            is_dark_extracted = 'isDark' in match.group(1)
            
            insert_str = '\n  const styles = getStyles(theme, ' + ('isDark' if is_dark_extracted else 'false') + ');'
            
            # Insert right after the match
            end_pos = match.end()
            content = content[:end_pos] + insert_str + content[end_pos:]
        else:
            print(f"Could not find useTheme() in {filepath}")
            
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
            
        print(f"Fixed: {filepath}")

    except Exception as e:
        print(f"Error processing {filepath}: {e}")
