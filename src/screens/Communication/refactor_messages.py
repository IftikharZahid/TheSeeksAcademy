import sys

file_path = "c:/Users/USER/Desktop/Mobile App Dev/TheSeeks Projects/TheSeeks-Students/src/screens/Communication/MessagesScreen.tsx"

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Replace first block
block1_old = """  if (!activeGroup) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
        <View style={[styles.headerNoticeStyle, { backgroundColor: theme.card }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButtonNoticeStyle}>
            <Ionicons name="arrow-back" size={scale(24)} color="#ffffff" />
          </TouchableOpacity>
          <Text style={[styles.headerTitleNoticeStyle, { color: theme.text }]}>Messages</Text>
          <View style={styles.placeholderButton} />
        </View>"""

block1_new = """  if (!activeGroup) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />
        <View style={[styles.headerNoticeStyle, { backgroundColor: theme.primary, paddingTop: insets.top + scale(12) }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButtonNoticeStyle}>
            <Ionicons name="arrow-back" size={scale(24)} color="#ffffff" />
          </TouchableOpacity>
          <Text style={[styles.headerTitleNoticeStyle, { color: '#ffffff' }]}>Messages</Text>
          <View style={styles.placeholderButton} />
        </View>"""

# 2. Replace second block
block2_old = """    <SafeAreaView style={[styles.container, { backgroundColor: theme.backgroundSecondary }]} edges={['top', 'left', 'right']}>
      {/* ── Header ── */}
      <View
        style={[styles.headerNoticeStyle, { backgroundColor: theme.card, justifyContent: 'flex-start' }]}
      >
        <TouchableOpacity onPress={() => setActiveGroup(null)} style={[styles.backButtonNoticeStyle, { marginRight: scale(8) }]}>
          <Ionicons name="arrow-back" size={scale(24)} color={theme.text} />
        </TouchableOpacity>

        {groupObj && (
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
            {groupObj.icon && <Text style={{ fontSize: scale(20), marginRight: scale(8) }}>{groupObj.icon}</Text>}
            <View style={{ flex: 1 }}>
              <Text style={[styles.headerTitleNoticeStyle, { color: theme.text, textAlign: 'left', fontSize: scale(16) }]} numberOfLines={1}>
                {groupObj.name}
              </Text>
              <Text style={{ color: theme.textSecondary, fontSize: scale(11) }}>
                {groupObj.subject} • {groupObj.teacherName}
              </Text>
            </View>
          </View>
        )}
      </View>"""

block2_new = """    <View style={[styles.container, { backgroundColor: theme.backgroundSecondary }]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />
      {/* ── Header ── */}
      <View
        style={[styles.headerNoticeStyle, { backgroundColor: theme.primary, justifyContent: 'flex-start', paddingTop: insets.top + scale(12) }]}
      >
        <TouchableOpacity onPress={() => setActiveGroup(null)} style={[styles.backButtonNoticeStyle, { marginRight: scale(8) }]}>
          <Ionicons name="arrow-back" size={scale(24)} color="#ffffff" />
        </TouchableOpacity>

        {groupObj && (
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
            {groupObj.icon && <Text style={{ fontSize: scale(20), marginRight: scale(8) }}>{groupObj.icon}</Text>}
            <View style={{ flex: 1 }}>
              <Text style={[styles.headerTitleNoticeStyle, { color: '#ffffff', textAlign: 'left', fontSize: scale(16) }]} numberOfLines={1}>
                {groupObj.name}
              </Text>
              <Text style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: scale(11) }}>
                {groupObj.subject} • {groupObj.teacherName}
              </Text>
            </View>
          </View>
        )}
      </View>"""

content = content.replace(block1_old, block1_new)
content = content.replace(block2_old, block2_new)

# 3. Replace closing SafeAreaViews
content = content.replace("</SafeAreaView>", "</View>")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("MessagesScreen.tsx updated successfully.")
