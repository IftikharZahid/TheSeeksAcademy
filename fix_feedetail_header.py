import os

def fix_fee_detail():
    path = "src/screens/Finance/FeeDetailScreen.tsx"
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Imports
    if "useSafeAreaInsets" not in content:
        content = content.replace(
            "import { SafeAreaView } from 'react-native-safe-area-context';",
            "import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';"
        )
    if "useFocusEffect" not in content:
        content = content.replace(
            "import { useNavigation } from '@react-navigation/native';",
            "import { useNavigation, useFocusEffect } from '@react-navigation/native';"
        )

    # 2. Add insets
    if "const insets = useSafeAreaInsets();" not in content:
        content = content.replace(
            "const { theme, isDark } = useTheme();",
            "const { theme, isDark } = useTheme();\n  const insets = useSafeAreaInsets();"
        )

    # 3. Add useFocusEffect
    focus_effect_code = """
  useFocusEffect(
    React.useCallback(() => {
      StatusBar.setBarStyle(isDark ? 'light-content' : 'dark-content');
      if (Platform.OS === 'android') {
        StatusBar.setBackgroundColor('transparent');
        StatusBar.setTranslucent(true);
      }
    }, [isDark])
  );
"""
    if "StatusBar.setBarStyle(isDark ?" not in content:
        content = content.replace(
            "const onRefresh = React.useCallback(async () => {",
            focus_effect_code + "\n  const onRefresh = React.useCallback(async () => {"
        )

    # 4. Remove existing StatusBars
    # They are like:
    # <StatusBar 
    #   backgroundColor={theme.card} 
    #   barStyle={isDark ? 'light-content' : 'dark-content'} 
    # />
    import re
    content = re.sub(r'<StatusBar[^>]+/>', '', content)

    # 5. Fix SafeAreaView edges
    content = content.replace(
        "edges={['top', 'bottom', 'left', 'right']}",
        "edges={['bottom', 'left', 'right']}"
    )

    # 6. Fix Headers paddingTop
    # a. Skeleton
    content = content.replace(
        "<View style={{ flexDirection: 'row', alignItems: 'center', padding: scale(16), borderBottomWidth: 1, borderBottomColor: theme.border }}>",
        "<View style={{ flexDirection: 'row', alignItems: 'center', padding: scale(16), paddingTop: insets.top + scale(16), borderBottomWidth: 1, borderBottomColor: theme.border }}>"
    )

    # b. No data view
    content = content.replace(
        "<TouchableOpacity\n          style={{ padding: scale(16) }}",
        "<TouchableOpacity\n          style={{ padding: scale(16), paddingTop: insets.top + scale(16) }}"
    )

    # c. Main Header Animated.View
    # Wait, the main header has style array.
    # style={[
    #       styles.floatingHeader,
    #       {
    #         opacity: headerAnim,
    #         transform: [{
    #           translateY: headerAnim.interpolate({
    #             inputRange: [0, 1],
    #             outputRange: [-10, 0],
    #           })
    #         }],
    #         backgroundColor: theme.card,
    #         borderBottomColor: theme.border,
    #       }
    #     ]}
    
    # We can inject paddingTop into the object.
    if "paddingTop: insets.top +" not in content:
        content = content.replace(
            "backgroundColor: theme.card,\n            borderBottomColor: theme.border,",
            "backgroundColor: theme.card,\n            borderBottomColor: theme.border,\n            paddingTop: insets.top + scale(12),\n            paddingBottom: scale(12),"
        )
    
    # Also need to remove paddingVertical from styles.floatingHeader
    content = content.replace(
        "paddingVertical: scale(12),",
        "// paddingVertical removed in favor of inline padding"
    )

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

fix_fee_detail()
