import re

file_path = "c:/Users/USER/Desktop/Mobile App Dev/TheSeeks Projects/TheSeeks-Students/src/screens/CoreScreens/ProfileScreen.tsx"

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add ProfileBanner import
content = content.replace(
    "import { CompactCard, MenuRow } from '../../components/CompactUI';",
    "import { CompactCard, MenuRow } from '../../components/CompactUI';\nimport { ProfileBanner } from '../../components/ProfileBanner';"
)

# 2. Replace Top Bar with Absolute Top Bar
top_bar_old = """      {/* ── Top Bar ───────────────────────────────────────────────────── */}
      <View style={[styles.topBar, { backgroundColor: theme.primary, paddingTop: insets.top + scale(12), paddingBottom: scale(12) }]}>
        <TouchableOpacity
          style={[styles.iconBtn, { backgroundColor: 'transparent', borderColor: 'transparent', borderWidth: 0 }]}
          onPress={toggleTheme}
          activeOpacity={0.7}
        >
          <Ionicons name={isDark ? 'sunny' : 'moon'} size={scale(20)} color="#ffffff" />
        </TouchableOpacity>

        <View style={styles.titleCenter}>
          <Text style={[styles.screenTitle, { color: '#ffffff' }]}>Profile</Text>
          {isOffline && profileData && (
            <View style={[styles.offlineBadge, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}>
              <Ionicons name="cloud-offline-outline" size={scale(8)} color="#ffffff" style={{ marginRight: scale(3) }} />
              <Text style={[styles.offlineBadgeText, { color: '#ffffff' }]}>Offline Cache</Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[styles.iconBtn, { backgroundColor: 'transparent', borderColor: 'transparent', borderWidth: 0 }]}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <Ionicons name="log-out-outline" size={scale(20)} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, scale(24)) }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
      >"""

top_bar_new = """      {/* ── Top Bar (Absolute) ────────────────────────────────────────────────── */}
      <View style={[styles.topBar, { 
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100,
        backgroundColor: 'transparent', paddingTop: insets.top + scale(12), paddingBottom: scale(12) 
      }]}>
        <TouchableOpacity style={[styles.iconBtn, { backgroundColor: 'rgba(255, 255, 255, 0.15)', borderColor: 'transparent', borderWidth: 0 }]} onPress={toggleTheme} activeOpacity={0.7}>
          <Ionicons name={isDark ? 'sunny' : 'moon'} size={scale(20)} color="#ffffff" />
        </TouchableOpacity>

        <View style={styles.titleCenter}>
          <Text style={[styles.screenTitle, { color: '#ffffff' }]}>Profile</Text>
          {isOffline && profileData && (
            <View style={[styles.offlineBadge, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}>
              <Ionicons name="cloud-offline-outline" size={scale(8)} color="#ffffff" style={{ marginRight: scale(3) }} />
              <Text style={[styles.offlineBadgeText, { color: '#ffffff' }]}>Offline Cache</Text>
            </View>
          )}
        </View>

        <TouchableOpacity style={[styles.iconBtn, { backgroundColor: 'rgba(255, 255, 255, 0.15)', borderColor: 'transparent', borderWidth: 0 }]} onPress={handleLogout} activeOpacity={0.7}>
          <Ionicons name="log-out-outline" size={scale(20)} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, scale(24)) }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
      >
        <ProfileBanner />"""

content = content.replace(top_bar_old, top_bar_new)

# 3. Replace heroSection with avatarSection
hero_old = """            {/* ── Profile Header ────────────────────────────────────────── */}
            <View style={styles.heroSection}>
              <TouchableOpacity style={[styles.avatarWrap, { borderColor: theme.border }]} onPress={handleImagePick} disabled={uploadingImage} activeOpacity={0.7}>
                <Image
                  source={displayImage && !imageError ? { uri: displayImage } : require('../../assets/default-profile.png')}
                  defaultSource={require('../../assets/default-profile.png')}
                  onError={() => setImageError(true)}
                  style={[styles.avatar, (!displayImage || imageError) && isDark ? { tintColor: '#fff' } : null]}
                />
                {uploadingImage && (
                  <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }]}>
                    <ActivityIndicator size="small" color="#fff" />
                  </View>
                )}
                <View style={{ position: 'absolute', bottom: 0, right: 0, backgroundColor: theme.primary, width: scale(20), height: scale(20), borderRadius: scale(10), justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: theme.card }}>
                  <Ionicons name="camera" size={10} color="#fff" />
                </View>
              </TouchableOpacity>
              <View style={styles.heroInfo}>
                <Text style={[styles.heroName, { color: theme.text }]} numberOfLines={1}>{displayName}</Text>
                {profileData?.email ? (
                  <Text style={[styles.heroEmail, { color: theme.textSecondary }]} numberOfLines={1}>{profileData.email}</Text>
                ) : null}
                <View style={styles.heroBadges}>
                  <View style={[styles.badge, { backgroundColor: theme.primary + '15' }]}>
                    <Text style={[styles.badgeText, { color: theme.primary }]}>{displayRole}</Text>
                  </View>
                  {!!profileData?.gender && (
                    <View style={[styles.badge, { backgroundColor: '#10b98115' }]}>
                      <Text style={[styles.badgeText, { color: '#10b981' }]}>{profileData.gender}</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>"""

avatar_new = """            {/* ── Profile Avatar Header ─────────────────────────────────── */}
            <View style={styles.avatarSection}>
              <TouchableOpacity style={[styles.avatarContainer, { borderColor: theme.background }]} onPress={handleImagePick} disabled={uploadingImage} activeOpacity={0.7}>
                <Image
                  source={displayImage && !imageError ? { uri: displayImage } : require('../../assets/default-profile.png')}
                  defaultSource={require('../../assets/default-profile.png')}
                  onError={() => setImageError(true)}
                  style={[styles.avatar, (!displayImage || imageError) && isDark ? { tintColor: '#fff' } : null]}
                />
                {uploadingImage && (
                  <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }]}>
                    <ActivityIndicator size="small" color="#fff" />
                  </View>
                )}
                <View style={{ position: 'absolute', bottom: 0, right: 0, backgroundColor: theme.primary, width: scale(28), height: scale(28), borderRadius: scale(14), justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: theme.card }}>
                  <Ionicons name="camera" size={scale(14)} color="#fff" />
                </View>
              </TouchableOpacity>
              <Text style={[styles.name, { color: theme.text }]}>{displayName}</Text>
              {profileData?.email ? (
                <Text style={[styles.heroEmail, { color: theme.textSecondary, marginTop: scale(2) }]} numberOfLines={1}>{profileData.email}</Text>
              ) : null}
              <View style={{ flexDirection: 'row', gap: scale(6), marginTop: scale(6) }}>
                <View style={[styles.roleBadge, { backgroundColor: theme.primary + '15' }]}>
                  <Text style={[styles.roleText, { color: theme.primary }]}>{displayRole}</Text>
                </View>
                {!!profileData?.gender && (
                  <View style={[styles.roleBadge, { backgroundColor: '#10b98115' }]}>
                    <Text style={[styles.roleText, { color: '#10b981' }]}>{profileData.gender}</Text>
                  </View>
                )}
              </View>
            </View>"""

content = content.replace(hero_old, avatar_new)

# 4. Replace styles
style_old = """  // ── Profile Hero ───────────────────────────────────────────────────────────
  heroSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scale(20),
    paddingHorizontal: scale(4),
  },
  avatarWrap: {
    width: scale(56),
    height: scale(56),
    borderRadius: scale(28),
    borderWidth: 1,
    overflow: 'hidden',
    marginRight: scale(14),
  },
  avatar: { width: '100%', height: '100%' },
  heroInfo: { flex: 1, justifyContent: 'center' },
  heroName: { fontSize: scale(16), fontWeight: '700', letterSpacing: -0.2, marginBottom: scale(2) },
  heroEmail: { fontSize: scale(11), marginBottom: scale(6) },
  heroBadges: { flexDirection: 'row', gap: scale(6) },
  badge: { paddingHorizontal: scale(8), paddingVertical: scale(3), borderRadius: scale(12) },
  badgeText: { fontSize: scale(9), fontWeight: '700', textTransform: 'uppercase' },"""

style_new = """  // ── Profile Avatar Overlap ─────────────────────────────────────────────────
  avatarSection: {
    alignItems: 'center',
    marginTop: -scale(80),
    paddingBottom: scale(16),
    zIndex: 10,
  },
  avatarContainer: {
    width: scale(110),
    height: scale(110),
    borderRadius: scale(55),
    borderWidth: 4,
    overflow: 'hidden',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: scale(4) },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  avatar: { width: '100%', height: '100%' },
  name: {
    fontSize: scale(20),
    fontWeight: '800',
    marginTop: scale(12),
    letterSpacing: -0.5,
  },
  heroEmail: { fontSize: scale(13) },
  roleBadge: {
    paddingHorizontal: scale(10),
    paddingVertical: scale(4),
    borderRadius: scale(12),
  },
  roleText: {
    fontSize: scale(11),
    fontWeight: '700',
    textTransform: 'uppercase'
  },"""

content = content.replace(style_old, style_new)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("ProfileScreen.tsx updated successfully.")
