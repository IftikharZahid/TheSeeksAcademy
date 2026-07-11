import os

def fix_profile():
    path = "src/screens/CoreScreens/ProfileScreen.tsx"
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    content = content.replace("if (profile) {", "if (profileData) {")
    content = content.replace("dispatch(setProfile({ ...profile,", "dispatch(setProfile({ ...profileData,")
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

def fix_messages():
    path = "src/screens/Communication/MessagesScreen.tsx"
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    content = content.replace("import { View, Text, StyleSheet,", "import { View, Text, StyleSheet, StatusBar,")
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

def fix_library():
    path = "src/screens/Academics/StudentLibraryScreen.tsx"
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    content = content.replace("backgroundColor: theme.card,", "backgroundColor: isDark ? '#1e293b' : '#fff',")
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

fix_profile()
fix_messages()
fix_library()
