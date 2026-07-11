import os

def fix_messages():
    path = "src/screens/Communication/MessagesScreen.tsx"
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    if 'StatusBar' not in content[:500]:
        content = content.replace("import { View, Text, StyleSheet,", "import { View, Text, StyleSheet, StatusBar,")
        if "import { View, Text, StyleSheet," not in content:
            content = content.replace("import { View, Text, StyleSheet", "import { View, Text, StyleSheet, StatusBar")
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

def fix_library():
    path = "src/screens/Academics/StudentLibraryScreen.tsx"
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    content = content.replace("backgroundColor: isDark ? '#1e293b' : '#fff'", "backgroundColor: theme.card")
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

fix_messages()
fix_library()
