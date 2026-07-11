import re

def fix_helpcenter():
    path = "src/screens/SettingScreens/HelpCenterScreen.tsx"
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    # Imports
    content = content.replace("Linking,\n}", "Linking,\n  StatusBar\n}")
    content = content.replace("import { SafeAreaView } from 'react-native-safe-area-context';", "import { useSafeAreaInsets } from 'react-native-safe-area-context';")
    
    # Hooks
    if "const insets = useSafeAreaInsets();" not in content:
        content = content.replace("const { theme } = useTheme();", "const { theme } = useTheme();\n  const insets = useSafeAreaInsets();")

    # Layout
    content = content.replace("<SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'left', 'right', 'bottom']}>", 
                              "<View style={[styles.container, { backgroundColor: theme.background }]}>\n      <StatusBar translucent backgroundColor=\"transparent\" barStyle=\"light-content\" />")
    content = content.replace("</SafeAreaView>", "</View>")
    
    # Header
    content = re.sub(r'<View style=\s*\{\[styles\.header,\s*\{\s*borderBottomColor:\s*theme\.border\s*\}\]\}>',
                     r'<View style={[styles.header, { backgroundColor: theme.primary, paddingTop: insets.top + 15, paddingBottom: 15 }]}>', content)
    content = content.replace("color={theme.text} />", 'color="#fff" />')
    content = content.replace("style={[styles.backBtn, { backgroundColor: theme.backgroundSecondary }]}", "style={styles.backBtn}")
    content = content.replace("color: theme.text }]}>Help Center", "color: '#fff' }]}>Help Center")
    
    # Bottom padding
    content = content.replace("style={[styles.bottomContainer, { borderTopColor: theme.border, backgroundColor: theme.background }]}",
                              "style={[styles.bottomContainer, { borderTopColor: theme.border, backgroundColor: theme.background, paddingBottom: insets.bottom + 20 }]}")

    with open(path, "w", encoding="utf-8") as f:
        f.write(content)

def fix_about():
    path = "src/screens/SettingScreens/AboutScreen.tsx"
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    content = content.replace("Linking,\n}", "Linking,\n  StatusBar\n}")
    content = content.replace("import { SafeAreaView } from 'react-native-safe-area-context';", "import { useSafeAreaInsets } from 'react-native-safe-area-context';")
    if "const insets = useSafeAreaInsets();" not in content:
        content = content.replace("const { theme, isDark } = useTheme();", "const { theme, isDark } = useTheme();\n  const insets = useSafeAreaInsets();")

    content = content.replace("<SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>", 
                              "<View style={[styles.container, { backgroundColor: theme.background }]}>\n      <StatusBar translucent backgroundColor=\"transparent\" barStyle=\"light-content\" />")
    content = content.replace("</SafeAreaView>", "</View>")
    
    content = re.sub(r'<View style=\s*\{\[styles\.header,\s*\{\s*borderBottomColor:\s*theme\.border\s*\}\]\}>',
                     r'<View style={[styles.header, { backgroundColor: theme.primary, paddingTop: insets.top + 15, paddingBottom: 15 }]}>', content)
    content = content.replace("color={theme.text} />", 'color="#fff" />')
    content = content.replace("style={[styles.backBtn, { backgroundColor: theme.backgroundSecondary }]}", "style={styles.backBtn}")
    content = content.replace("color: theme.text }]}>About", "color: '#fff' }]}>About")
    
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)

def fix_settings():
    path = "src/screens/SettingScreens/SettingsScreen.tsx"
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    content = content.replace("Switch,\n}", "Switch,\n  StatusBar\n}")
    content = content.replace("import { SafeAreaView } from 'react-native-safe-area-context';", "import { useSafeAreaInsets } from 'react-native-safe-area-context';")
    if "const insets = useSafeAreaInsets();" not in content:
        content = content.replace("const { theme, isDark, toggleTheme } = useTheme();", "const { theme, isDark, toggleTheme } = useTheme();\n  const insets = useSafeAreaInsets();")

    content = content.replace("<SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>", 
                              "<View style={[styles.container, { backgroundColor: theme.background }]}>\n      <StatusBar translucent backgroundColor=\"transparent\" barStyle=\"light-content\" />")
    content = content.replace("</SafeAreaView>", "</View>")
    
    content = re.sub(r'<View style=\s*\{\[styles\.header,\s*\{\s*borderBottomColor:\s*theme\.border\s*\}\]\}>',
                     r'<View style={[styles.header, { backgroundColor: theme.primary, paddingTop: insets.top + 15, paddingBottom: 15 }]}>', content)
    content = content.replace("color={theme.text} />", 'color="#fff" />')
    content = content.replace("style={[styles.backBtn, { backgroundColor: theme.backgroundSecondary }]}", "style={styles.backBtn}")
    content = content.replace("color: theme.text }]}>Settings", "color: '#fff' }]}>Settings")
    
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)

try:
    fix_helpcenter()
    print("Fixed HelpCenter")
    fix_about()
    print("Fixed About")
    fix_settings()
    print("Fixed Settings")
except Exception as e:
    print(f"Error: {e}")
