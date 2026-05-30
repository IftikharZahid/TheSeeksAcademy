import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

export const PrivacyPolicyScreen: React.FC = () => {
  const navigation = useNavigation();
  const { theme } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.backBtn, { backgroundColor: theme.backgroundSecondary }]}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={20} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Privacy & Policy</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Last Updated Badge/Card */}
        <View style={[styles.lastUpdatedCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Ionicons name="time-outline" size={15} color={theme.textSecondary} />
          <Text style={[styles.lastUpdatedText, { color: theme.textSecondary }]}>
            Last Updated: November 30, 2025
          </Text>
        </View>

        {/* 1. Introduction */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIconWrap, { backgroundColor: theme.primary + '15' }]}>
              <Ionicons name="information-circle-outline" size={18} color={theme.primary} />
            </View>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>1. Introduction</Text>
          </View>
          <Text style={[styles.paragraph, { color: theme.textSecondary }]}>
            Welcome to The Seeks Academy. We respect your privacy and are committed to protecting your personal data. This privacy policy will inform you as to how we look after your personal data when you visit our application and tell you about your privacy rights and how the law protects you.
          </Text>
        </View>

        {/* 2. Data We Collect */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIconWrap, { backgroundColor: theme.primary + '15' }]}>
              <Ionicons name="shield-checkmark-outline" size={18} color={theme.primary} />
            </View>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>2. Data We Collect</Text>
          </View>
          <Text style={[styles.paragraph, { color: theme.textSecondary }]}>
            We may collect, use, store and transfer different kinds of personal data about you which we have grouped together as follows:
          </Text>
          
          <View style={styles.bulletPoint}>
            <Text style={[styles.bullet, { color: theme.textSecondary }]}>•</Text>
            <Text style={[styles.bulletText, { color: theme.textSecondary }]}>
              <Text style={{ fontWeight: '700', color: theme.text }}>Identity Data</Text> includes first name, last name, username or similar identifier.
            </Text>
          </View>
          
          <View style={styles.bulletPoint}>
            <Text style={[styles.bullet, { color: theme.textSecondary }]}>•</Text>
            <Text style={[styles.bulletText, { color: theme.textSecondary }]}>
              <Text style={{ fontWeight: '700', color: theme.text }}>Contact Data</Text> includes email address and telephone numbers.
            </Text>
          </View>

          <View style={styles.bulletPoint}>
            <Text style={[styles.bullet, { color: theme.textSecondary }]}>•</Text>
            <Text style={[styles.bulletText, { color: theme.textSecondary }]}>
              <Text style={{ fontWeight: '700', color: theme.text }}>Technical Data</Text> includes internet protocol (IP) address, your login data, browser type and version, time zone setting and location, browser plug-in types and versions, operating system and platform and other technology on the devices you use to access this application.
            </Text>
          </View>
        </View>

        {/* 3. How We Use Your Data */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIconWrap, { backgroundColor: theme.primary + '15' }]}>
              <Ionicons name="settings-outline" size={18} color={theme.primary} />
            </View>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>3. How We Use Your Data</Text>
          </View>
          <Text style={[styles.paragraph, { color: theme.textSecondary }]}>
            We will only use your personal data when the law allows us to. Most commonly, we will use your personal data in the following circumstances:
          </Text>

          <View style={styles.bulletPoint}>
            <Text style={[styles.bullet, { color: theme.textSecondary }]}>•</Text>
            <Text style={[styles.bulletText, { color: theme.textSecondary }]}>
              Where we need to perform the contract we are about to enter into or have entered into with you.
            </Text>
          </View>

          <View style={styles.bulletPoint}>
            <Text style={[styles.bullet, { color: theme.textSecondary }]}>•</Text>
            <Text style={[styles.bulletText, { color: theme.textSecondary }]}>
              Where it is necessary for our legitimate interests (or those of a third party) and your interests and fundamental rights do not override those interests.
            </Text>
          </View>
        </View>

        {/* 4. Data Security */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIconWrap, { backgroundColor: theme.primary + '15' }]}>
              <Ionicons name="lock-closed-outline" size={18} color={theme.primary} />
            </View>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>4. Data Security</Text>
          </View>
          <Text style={[styles.paragraph, { color: theme.textSecondary }]}>
            We have put in place appropriate security measures to prevent your personal data from being accidentally lost, used or accessed in an unauthorized way, altered or disclosed. In addition, we limit access to your personal data to those employees, agents, contractors and other third parties who have a business need to know.
          </Text>
        </View>

        {/* 5. Contact Us */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIconWrap, { backgroundColor: theme.primary + '15' }]}>
              <Ionicons name="mail-outline" size={18} color={theme.primary} />
            </View>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>5. Contact Us</Text>
          </View>
          <Text style={[styles.paragraph, { color: theme.textSecondary }]}>
            If you have any questions about this privacy policy or our privacy practices, please contact us at:
          </Text>

          <TouchableOpacity
            onPress={() => Linking.openURL('mailto:TheSeeksAcademyFTA@gmail.com')}
            style={[styles.emailBtn, { backgroundColor: theme.primary + '10', borderColor: theme.primary + '30' }]}
            activeOpacity={0.7}
          >
            <Ionicons name="mail-unread-outline" size={16} color={theme.primary} />
            <Text style={[styles.emailText, { color: theme.primary }]}>TheSeeksAcademyFTA@gmail.com</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 36, height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', letterSpacing: -0.3 },

  scroll: { padding: 12, paddingBottom: 32, gap: 10 },

  lastUpdatedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  lastUpdatedText: { fontSize: 11, fontWeight: '600' },

  card: {
    borderRadius: 14, borderWidth: 1,
    padding: 16,
  },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  sectionIconWrap: {
    width: 32, height: 32, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', letterSpacing: -0.2 },
  paragraph: { fontSize: 13, lineHeight: 22, letterSpacing: 0.2 },

  bulletPoint: {
    flexDirection: 'row',
    paddingLeft: 4,
    marginTop: 6,
    gap: 8,
  },
  bullet: {
    fontSize: 13,
    lineHeight: 22,
  },
  bulletText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 22,
    letterSpacing: 0.2,
  },

  emailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 12,
  },
  emailText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
