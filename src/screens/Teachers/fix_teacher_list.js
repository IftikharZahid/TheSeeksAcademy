const fs = require('fs');

const file = 'c:/p/TheSeeks-Students/src/screens/Teachers/TeachersListScreen.tsx';
let content = fs.readFileSync(file, 'utf8');

// The original section is:
/*
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Staff Members</Text>
          <Text style={{ fontSize: scale(12), color: theme.textSecondary }}>{staff.length} available</Text>
        </View>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.navigate('LikedTeachersScreen')}>
          <Ionicons name="heart-outline" size={scale(22)} color={theme.text} />
        </TouchableOpacity>
*/

const oldSection = `        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Staff Members</Text>
          <Text style={{ fontSize: scale(12), color: theme.textSecondary }}>{staff.length} available</Text>
        </View>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.navigate('LikedTeachersScreen')}>
          <Ionicons name="heart-outline" size={scale(22)} color={theme.text} />
        </TouchableOpacity>`;

const newSection = `        <View style={{ flex: 1, justifyContent: 'center' }}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Staff Members</Text>
        </View>
        <View style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : theme.primary + '15', borderRadius: scale(20), paddingHorizontal: scale(12), paddingVertical: scale(6), flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name="people" size={scale(16)} color={theme.primary} style={{ marginRight: scale(6) }} />
          <Text style={{ fontSize: scale(14), fontWeight: '700', color: theme.primary }}>{staff.length} Total</Text>
        </View>`;

content = content.replace(oldSection, newSection);

fs.writeFileSync(file, content);
console.log('Fixed TeachersListScreen top right header');
