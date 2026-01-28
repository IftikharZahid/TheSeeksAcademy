import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

export const AboutScreen: React.FC = () => {
  const navigation = useNavigation();
  const { theme, isDark } = useTheme();

  const handleLinkPress = (url: string) => {
    Linking.openURL(url);
  };

  const socialLinks = [
    { key: 'github', icon: 'logo-github', color: isDark ? '#fff' : '#333', url: 'https://github.com/iftikharzahid', label: 'GitHub' },
    { key: 'linkedin', icon: 'logo-linkedin', color: '#0A66C2', url: 'https://linkedin.com/in/iftikharzahid', label: 'LinkedIn' },
    { key: 'globe', icon: 'globe-outline', color: theme.primary, url: 'https://zahid.codes', label: 'Portfolio' },
    { key: 'whatsapp', icon: 'logo-whatsapp', color: '#25D366', url: 'https://wa.me/923007971374', label: 'WhatsApp' },
  ];

  const techStack = [
    { name: 'React Native', color: '#61DAFB' },
    { name: 'Expo', color: isDark ? '#fff' : '#000' },
    { name: 'TypeScript', color: '#3178C6' },
    { name: 'Firebase', color: '#F5820D' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.backBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
        >
          <Ionicons name="chevron-back" size={20} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>About</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* App Card */}
        <View style={[styles.card, { backgroundColor: theme.card }]}>
          <View style={styles.appRow}>
            <Image
              source={require('../../../assets/icon.png')}
              style={styles.appLogo}
              resizeMode="contain"
            />
            <View style={styles.appInfo}>
              <Text style={[styles.appName, { color: theme.text }]}>The Seeks Academy</Text>
              <Text style={[styles.appTagline, { color: theme.textSecondary }]}>Learn. Grow. Succeed.</Text>
            </View>
          </View>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <View style={styles.appMeta}>
            <View style={styles.metaItem}>
              <Ionicons name="layers-outline" size={16} color={theme.primary} />
              <Text style={[styles.metaLabel, { color: theme.textSecondary }]}>Version</Text>
              <Text style={[styles.metaValue, { color: theme.text }]}>1.0.0</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="calendar-outline" size={16} color={theme.primary} />
              <Text style={[styles.metaLabel, { color: theme.textSecondary }]}>Released</Text>
              <Text style={[styles.metaValue, { color: theme.text }]}>2024</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="star-outline" size={16} color={theme.primary} />
              <Text style={[styles.metaLabel, { color: theme.textSecondary }]}>Rating</Text>
              <Text style={[styles.metaValue, { color: theme.text }]}>5.0</Text>
            </View>
          </View>
        </View>

        {/* Developer Card */}
        <View style={[styles.card, { backgroundColor: theme.card }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconCircle, { backgroundColor: isDark ? theme.primary + '20' : theme.primary + '15' }]}>
              <Ionicons name="person-outline" size={16} color={theme.primary} />
            </View>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Developer</Text>
          </View>

          <View style={styles.devRow}>
            <Image
              source={require('../../assets/profile.jpg')}
              style={styles.devAvatar}
            />
            <View style={styles.devInfo}>
              <Text style={[styles.devName, { color: theme.text }]}>Iftikhar Zahid</Text>
              <View style={[styles.roleBadge, { backgroundColor: isDark ? theme.primary + '20' : theme.primary + '15' }]}>
                <Text style={[styles.roleText, { color: theme.primary }]}>Full Stack Developer</Text>
              </View>
            </View>
          </View>

          <Text style={[styles.devBio, { color: theme.textSecondary }]}>
            Passionate about building intuitive mobile apps with clean code and modern design principles.
          </Text>

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          {/* Social Links */}
          <Text style={[styles.subTitle, { color: theme.textSecondary }]}>Connect</Text>
          <View style={styles.socialGrid}>
            {socialLinks.map((item) => (
              <TouchableOpacity
                key={item.key}
                style={[styles.socialCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}
                onPress={() => handleLinkPress(item.url)}
                activeOpacity={0.7}
              >
                <View style={[styles.socialIconWrap, { backgroundColor: item.color + '15' }]}>
                  <Ionicons name={item.icon as any} size={18} color={item.color} />
                </View>
                <Text style={[styles.socialLabel, { color: theme.text }]}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Tech Stack Card */}
        <View style={[styles.card, { backgroundColor: theme.card }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconCircle, { backgroundColor: '#8b5cf620' }]}>
              <Ionicons name="code-slash-outline" size={16} color="#8b5cf6" />
            </View>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Built With</Text>
          </View>

          <View style={styles.techGrid}>
            {techStack.map((tech) => (
              <View
                key={tech.name}
                style={[styles.techCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}
              >
                <View style={[styles.techDot, { backgroundColor: tech.color }]} />
                <Text style={[styles.techName, { color: theme.text }]}>{tech.name}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Support Card */}
        <View style={[styles.card, { backgroundColor: theme.card }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconCircle, { backgroundColor: '#10b98120' }]}>
              <Ionicons name="heart-outline" size={16} color="#10b981" />
            </View>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Support Us</Text>
          </View>

          <Text style={[styles.supportText, { color: theme.textSecondary }]}>
            If you enjoy using The Seeks Academy, please rate us on the app store and share with friends!
          </Text>

          <View style={styles.supportBtns}>
            <TouchableOpacity
              style={[styles.supportBtn, { backgroundColor: isDark ? theme.primary + '20' : theme.primary + '15' }]}
              activeOpacity={0.7}
            >
              <Ionicons name="star" size={16} color={theme.primary} />
              <Text style={[styles.supportBtnText, { color: theme.primary }]}>Rate App</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.supportBtn, { backgroundColor: isDark ? '#10b98120' : '#10b98115' }]}
              activeOpacity={0.7}
            >
              <Ionicons name="share-social" size={16} color="#10b981" />
              <Text style={[styles.supportBtnText, { color: '#10b981' }]}>Share</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer */}
        <Text style={[styles.footer, { color: theme.textTertiary }]}>
          Made with ❤️ in Pakistan
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 14,
    paddingBottom: 40,
  },
  card: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  // App Card
  appRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appLogo: {
    width: 52,
    height: 52,
    borderRadius: 12,
  },
  appInfo: {
    marginLeft: 12,
    flex: 1,
  },
  appName: {
    fontSize: 16,
    fontWeight: '700',
  },
  appTagline: {
    fontSize: 12,
    marginTop: 2,
  },
  appMeta: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  metaItem: {
    alignItems: 'center',
    gap: 4,
  },
  metaLabel: {
    fontSize: 10,
  },
  metaValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  // Developer Card
  devRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  devAvatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
  },
  devInfo: {
    marginLeft: 12,
    flex: 1,
  },
  devName: {
    fontSize: 15,
    fontWeight: '600',
  },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 4,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '600',
  },
  devBio: {
    fontSize: 13,
    lineHeight: 18,
  },
  subTitle: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  socialGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  socialCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 8,
  },
  socialIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  socialLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  // Tech Stack
  techGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  techCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  techDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  techName: {
    fontSize: 12,
    fontWeight: '500',
  },
  // Support
  supportText: {
    fontSize: 13,
    lineHeight: 18,
  },
  supportBtns: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  supportBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  supportBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  footer: {
    textAlign: 'center',
    fontSize: 12,
    marginTop: 6,
  },
});
