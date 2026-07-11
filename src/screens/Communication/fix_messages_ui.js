const fs = require('fs');

const file = 'c:/p/TheSeeks-Students/src/screens/Communication/MessagesScreen.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Fix SafeAreaView and StatusBar in main view (lines ~752)
content = content.replace(
  /<SafeAreaView style=\{\[styles\.container, \{ backgroundColor: theme\.background \}\]\} edges=\{\['top', 'left', 'right'\]\}>\s*<StatusBar backgroundColor=\{theme\.card\} barStyle=\{isDark \? 'light-content' : 'dark-content'\} \/>/,
  "<SafeAreaView style={[styles.container, { backgroundColor: theme.card }]} edges={['top', 'left', 'right']}>\n        <StatusBar translucent backgroundColor=\"transparent\" barStyle={isDark ? 'light-content' : 'dark-content'} />"
);

// 2. Remove back button
content = content.replace(
  /<TouchableOpacity onPress=\{\(\) => navigation\.goBack\(\)\} style=\{styles\.backButtonNoticeStyle\}>\s*<Ionicons name="arrow-back" size=\{scale\(24\)\} color=\{theme\.text\} \/>\s*<\/TouchableOpacity>/,
  "<View style={styles.placeholderButton} />"
);

// 3. Fix SafeAreaView and StatusBar in active chat (lines ~1003)
content = content.replace(
  /<SafeAreaView style=\{\[styles\.container, \{ backgroundColor: theme\.backgroundSecondary \}\]\} edges=\{\['top', 'left', 'right'\]\}>\s*<StatusBar backgroundColor=\{theme\.card\} barStyle=\{isDark \? 'light-content' : 'dark-content'\} \/>/,
  "<SafeAreaView style={[styles.container, { backgroundColor: theme.card }]} edges={['top', 'left', 'right']}>\n      <StatusBar translucent backgroundColor=\"transparent\" barStyle={isDark ? 'light-content' : 'dark-content'} />"
);

fs.writeFileSync(file, content);
console.log('Fixed MessagesScreen.tsx via Regex');
