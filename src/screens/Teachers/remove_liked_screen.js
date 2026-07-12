const fs = require('fs');

// 1. Fix TeachersListScreen Counter Color
const listFile = 'c:/p/TheSeeks-Students/src/screens/Teachers/TeachersListScreen.tsx';
let listContent = fs.readFileSync(listFile, 'utf8');

const oldCounter = `<View style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : theme.primary + '15', borderRadius: scale(20), paddingHorizontal: scale(12), paddingVertical: scale(6), flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name="people" size={scale(16)} color={theme.primary} style={{ marginRight: scale(6) }} />
          <Text style={{ fontSize: scale(14), fontWeight: '700', color: theme.primary }}>{staff.length} Total</Text>
        </View>`;

const newCounter = `<View style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : theme.primary + '15', borderRadius: scale(20), paddingHorizontal: scale(12), paddingVertical: scale(6), flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name="people" size={scale(16)} color={isDark ? theme.text : theme.primary} style={{ marginRight: scale(6) }} />
          <Text style={{ fontSize: scale(14), fontWeight: '700', color: isDark ? theme.text : theme.primary }}>{staff.length} Total</Text>
        </View>`;

listContent = listContent.replace(oldCounter, newCounter);
fs.writeFileSync(listFile, listContent);

// 2. Remove from MainTabs.tsx
const tabsFile = 'c:/p/TheSeeks-Students/src/screens/navigation/MainTabs.tsx';
let tabsContent = fs.readFileSync(tabsFile, 'utf8');
tabsContent = tabsContent.replace(/, 'LikedTeachersScreen'/g, '');
fs.writeFileSync(tabsFile, tabsContent);

// 3. Remove from HomeStack.tsx
const stackFile = 'c:/p/TheSeeks-Students/src/screens/navigation/HomeStack.tsx';
let stackContent = fs.readFileSync(stackFile, 'utf8');
stackContent = stackContent.replace(/import \{ LikedTeachersScreen \} from '\.\.\/Teachers\/LikedTeachersScreen';\r?\n/g, '');
stackContent = stackContent.replace(/\s*LikedTeachersScreen: undefined;\r?\n/g, '\n');
stackContent = stackContent.replace(/\s*<Stack\.Screen name="LikedTeachersScreen" component=\{LikedTeachersScreen\} \/>\r?\n/g, '\n');
fs.writeFileSync(stackFile, stackContent);

console.log('Removed LikedTeachersScreen and fixed counter colors in TeachersListScreen');
