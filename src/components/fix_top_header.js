const fs = require('fs');

const targetFile = 'c:/p/TheSeeks-Students/src/components/TopHeader.tsx';
let content = fs.readFileSync(targetFile, 'utf8');

// 1. Update unread state selectors
if (!content.includes('const readNoticeIds')) {
    content = content.replace(
        'const readDiaryIds = useAppSelector((state) => state.notifications.readDiaryIds);',
        `const readDiaryIds = useAppSelector((state) => state.notifications.readDiaryIds);
  const readNoticeIds = useAppSelector((state) => state.notifications.readIds);
  const lastReadTimestampMs = useAppSelector((state) => state.messages.lastReadTimestampMs);`
    );
}

// 2. Increase topUpdates to 5
content = content.replace(
    'const topUpdates = recentUpdates.slice(0, 4);',
    'const topUpdates = recentUpdates.slice(0, 5);'
);

// 3. Make dropdownContainer width scale(290)
content = content.replace(
    /dropdownContainer: \{\s*width: '100%',/g,
    "dropdownContainer: {\n    width: scale(290),"
);

// 4. Compact dropdownItem padding and iconBox size
content = content.replace(
    /paddingVertical: scale\(12\)/g,
    'paddingVertical: scale(10)'
);
content = content.replace(
    /iconBox: \{\s*width: scale\(36\),\s*height: scale\(36\),\s*borderRadius: scale\(18\)/g,
    'iconBox: {\n    width: scale(32),\n    height: scale(32),\n    borderRadius: scale(16)'
);

// 5. Replace dropdownItem JSX block
// We need to carefully replace the mapping of topUpdates
const regexJSX = /topUpdates\.map\(\(update, index\) => \([\s\S]*?<\/TouchableOpacity>\s*\)\)\s*\) :/g;

const newJSX = `topUpdates.map((update, index) => {
                  let isUnread = false;
                  if (update.type === 'diary') {
                    isUnread = !readDiaryIds.includes(update.item.id);
                  } else if (update.type === 'message') {
                    isUnread = lastReadTimestampMs !== null && update.timeMs > lastReadTimestampMs && update.item.senderId !== user?.uid;
                  } else if (update.type === 'notice') {
                    isUnread = !readNoticeIds.includes(update.item.id);
                  }
                  
                  return (
                  <TouchableOpacity
                    key={index}
                    style={[styles.dropdownItem, { borderBottomColor: theme.border }]}
                    onPress={() => {
                      setShowDropdown(false);
                      if (update.type === 'diary') {
                        navigation.navigate('DiaryScreen' as never);
                      } else if (update.type === 'message') {
                        navigation.navigate('Messages' as never);
                      } else if (update.type === 'notice') {
                        navigation.navigate('ELibrary' as never);
                      }
                    }}
                  >
                    <View style={[styles.iconBox, { backgroundColor: isDark ? '#334155' : '#f1f5f9' }]}>
                      <Ionicons
                        name={
                          update.type === 'notice' ? 'megaphone-outline' :
                          update.type === 'diary' ? 'book-outline' : 'chatbubbles-outline'
                        }
                        size={scale(16)}
                        color={theme.primary}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.itemTitle, { color: theme.text, marginBottom: scale(2) }]} numberOfLines={1}>
                          {update.type === 'message'
                            ? \`\${update.item.senderName || 'Student'}\${update.item.senderClass ? \` (\${update.item.senderClass})\` : ''}\`
                            : (update.item.title || update.item.subject || update.item.teacherName || 'Update')}
                      </Text>
                      <Text style={[styles.itemText, { color: theme.textSecondary }]} numberOfLines={1}>
                        {update.item.content || update.item.message || update.item.details || update.item.description || update.item.text || 'No additional details'}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', marginLeft: scale(8), minWidth: scale(50) }}>
                      {isUnread && (
                        <View style={[styles.unreadDot, { backgroundColor: '#10b981', width: scale(8), height: scale(8), borderRadius: scale(4), marginBottom: scale(4) }]} />
                      )}
                      <Text style={[styles.itemTime, { color: theme.textSecondary, fontSize: scale(10) }]}>
                        {formatRelativeTime(update.timeMs)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )})
              ) :`;

content = content.replace(regexJSX, newJSX);

// If styles.unreadDot doesn't exist, we add it just in case, although inline styling handles it above
if (!content.includes('unreadDot: {')) {
  content = content.replace(
    'emptyDropdown: {',
    `unreadDot: {
    width: scale(8),
    height: scale(8),
    borderRadius: scale(4),
    backgroundColor: '#10b981',
    marginBottom: scale(4),
  },
  emptyDropdown: {`
  );
}

fs.writeFileSync(targetFile, content);
console.log('Successfully updated TopHeader.tsx in Student app!');
