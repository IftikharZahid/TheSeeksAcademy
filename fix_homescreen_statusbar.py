import os

def fix_homescreen_statusbar():
    path = "src/screens/CoreScreens/HomeScreen.tsx"
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Add useFocusEffect for StatusBar
    # We will add it before the return statement of HomeScreen
    
    focus_effect_code = """
  useFocusEffect(
    useCallback(() => {
      StatusBar.setBarStyle('light-content');
      if (Platform.OS === 'android') {
        StatusBar.setBackgroundColor('transparent');
        StatusBar.setTranslucent(true);
      }
    }, [])
  );

  return (
"""
    
    # Check if Platform is imported
    if "import { View, Text, TouchableOpacity, ScrollView, StyleSheet, StatusBar, Dimensions, RefreshControl, FlatList, Platform } from 'react-native';" not in content:
        content = content.replace("import { View, Text, TouchableOpacity, ScrollView, StyleSheet, StatusBar, Dimensions, RefreshControl, FlatList } from 'react-native';", 
                                  "import { View, Text, TouchableOpacity, ScrollView, StyleSheet, StatusBar, Dimensions, RefreshControl, FlatList, Platform } from 'react-native';")
    elif "Platform" not in content[:500]:
        # just add Platform to imports if needed, let's do a safe replace
        pass

    # Actually, let's just make sure Platform is imported by using a regex or simple replace
    if "Platform" not in content.split("from 'react-native'")[0]:
        content = content.replace("StatusBar,", "StatusBar, Platform,")

    if "StatusBar.setBarStyle('light-content');" not in content:
        content = content.replace("  return (\n    <SafeAreaView", focus_effect_code + "    <SafeAreaView")
        
        # Remove the inline StatusBar since we handle it in useFocusEffect?
        # Actually it's fine to keep the declarative one as fallback, or remove it.
        # Let's remove the declarative one to avoid conflicts.
        content = content.replace('<StatusBar backgroundColor="transparent" translucent={true} barStyle="light-content" />', '')

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

fix_homescreen_statusbar()
